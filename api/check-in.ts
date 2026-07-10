import type { VercelRequest, VercelResponse } from '@vercel/node'
import { and, desc, eq, gt, sql } from 'drizzle-orm'
import Ably from 'ably'
import { db, schema } from '../src/db/client.js'
import { getSessionUserId } from '../src/lib/auth-server.js'
import { sendPushToUser } from '../src/lib/push-server.js'
import { cors } from '../src/lib/http.js'
import { distM } from '../src/lib/sun.js'
import {
  scoreCheckIn,
  PROXIMITY_M,
  ACCURACY_SLACK_M,
  COOLDOWN_MS,
  GLOBAL_COOLDOWN_MS,
  MAX_ACCURACY_M,
  MAX_SPEED_KMH,
  CROWN_WINDOW_DAYS,
} from '../src/lib/scoring.js'

const { checkIns, terraces, currentCrowns, notifications, profiles } = schema

/**
 * POST /api/check-in  { terraceId, lat, lon, shadeStatus? }
 * Validates proximity + cooldown, scores server-side, records the check-in,
 * recomputes the rolling-7-day crown, and fires a steal notification via Ably.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const userId = await getSessionUserId(req)
  if (!userId) return res.status(401).json({ error: 'unauthenticated' })

  const { terraceId, lat, lon, shadeStatus, accuracy } = req.body ?? {}
  if (typeof terraceId !== 'string' || typeof lat !== 'number' || typeof lon !== 'number') {
    return res.status(400).json({ error: 'bad_request' })
  }

  const [terrace] = await db.select().from(terraces).where(eq(terraces.id, terraceId))
  if (!terrace) return res.status(404).json({ error: 'terrace_not_found' })

  // 1. Proximity gate — must actually be at the terrace. Forgive the device's reported
  //    GPS accuracy (capped) so people genuinely on the terrace aren't blocked by urban drift.
  const dist = distM(lon, lat, terrace.lon, terrace.lat)
  const slack = Math.min(typeof accuracy === 'number' ? accuracy : 0, ACCURACY_SLACK_M)
  if (dist > PROXIMITY_M + slack) {
    return res.status(403).json({ error: 'too_far', distance: Math.round(dist) })
  }

  // 2. Reject GPS too imprecise to trust (a spoof/farm signal).
  if (typeof accuracy === 'number' && accuracy > MAX_ACCURACY_M) {
    return res.status(422).json({ error: 'poor_gps' })
  }

  // 3. Global cooldown + "teleport" check vs the user's most recent check-in anywhere.
  const [last] = await db
    .select({ createdAt: checkIns.createdAt, lat: checkIns.lat, lon: checkIns.lon })
    .from(checkIns)
    .where(eq(checkIns.userId, userId))
    .orderBy(desc(checkIns.createdAt))
    .limit(1)
  if (last) {
    const dtMs = Date.now() - last.createdAt.getTime()
    if (dtMs < GLOBAL_COOLDOWN_MS) {
      return res.status(429).json({ error: 'slow_down', waitMin: Math.ceil((GLOBAL_COOLDOWN_MS - dtMs) / 60000) })
    }
    const km = distM(lon, lat, last.lon, last.lat) / 1000
    const hours = dtMs / 3_600_000
    if (hours > 0 && km / hours > MAX_SPEED_KMH) {
      return res.status(403).json({ error: 'impossible_travel' })
    }
  }

  // 4. Per-terrace cooldown — one scoring check-in per terrace per user per window.
  const [recent] = await db
    .select({ createdAt: checkIns.createdAt })
    .from(checkIns)
    .where(and(eq(checkIns.userId, userId), eq(checkIns.terraceId, terraceId)))
    .orderBy(desc(checkIns.createdAt))
    .limit(1)
  if (recent && Date.now() - recent.createdAt.getTime() < COOLDOWN_MS) {
    return res.status(409).json({ error: 'cooldown' })
  }

  // 3. Score authoritatively from the sun's position now (client cannot inflate).
  const now = new Date()
  const { sunAltitude, points, bonus } = scoreCheckIn(now, terrace.lat, terrace.lon)

  const [inserted] = await db
    .insert(checkIns)
    .values({
      userId,
      terraceId,
      sunAltitude,
      shadeStatus: typeof shadeStatus === 'string' ? shadeStatus : 'sun',
      points,
      lat,
      lon,
    })
    .returning({ id: checkIns.id })

  await db
    .update(profiles)
    .set({ pointsTotal: sql`${profiles.pointsTotal} + ${points}` })
    .where(eq(profiles.userId, userId))

  // 4. Recompute the terrace crown over the rolling window.
  //    Rank by total points (matches /api/leaderboard, which drives the crown
  //    shown in the UI). Ranking by check-in count here would let the stored
  //    holder diverge from who the app draws the crown on.
  const [top] = await db
    .select({ userId: checkIns.userId, pts: sql<number>`sum(${checkIns.points})::int` })
    .from(checkIns)
    .where(
      and(
        eq(checkIns.terraceId, terraceId),
        gt(checkIns.createdAt, sql`now() - interval '${sql.raw(String(CROWN_WINDOW_DAYS))} days'`),
      ),
    )
    .groupBy(checkIns.userId)
    .orderBy(desc(sql`sum(${checkIns.points})`))
    .limit(1)

  const newHolder = top?.userId ?? userId
  const [prev] = await db
    .select()
    .from(currentCrowns)
    .where(and(eq(currentCrowns.scope, 'terrace'), eq(currentCrowns.scopeId, terraceId)))

  let stolen = false
  if (!prev) {
    await db.insert(currentCrowns).values({
      scope: 'terrace',
      scopeId: terraceId,
      holderUserId: newHolder,
    })
  } else if (prev.holderUserId !== newHolder) {
    stolen = true
    await db
      .update(currentCrowns)
      .set({ holderUserId: newHolder, since: now })
      .where(and(eq(currentCrowns.scope, 'terrace'), eq(currentCrowns.scopeId, terraceId)))

    if (prev.holderUserId) {
      const heldMs = now.getTime() - prev.since.getTime()
      const payload = {
        terraceId,
        terraceName: terrace.name,
        newHolder,
        heldDays: Math.floor(heldMs / 86_400_000),
      }
      await db.insert(notifications).values({
        userId: prev.holderUserId,
        type: 'crown_stolen',
        payload,
      })
      await publishSteal(prev.holderUserId, payload)

      const [nh] = await db
        .select({ handle: profiles.displayName })
        .from(profiles)
        .where(eq(profiles.userId, newHolder))
      await sendPushToUser(prev.holderUserId, {
        title: '👑 Crown stolen!',
        body: `${nh?.handle ? '@' + nh.handle : 'Someone'} took your crown at ${terrace.name}`,
        url: '/',
      })
    }
  }

  return res.status(200).json({
    checkInId: inserted.id,
    points,
    bonus,
    sunAltitude: Math.round(sunAltitude),
    crownHolder: newHolder,
    youHoldCrown: newHolder === userId,
    stolenFromSomeone: stolen,
  })
}

async function publishSteal(exHolderId: string, payload: unknown) {
  const key = process.env.ABLY_API_KEY
  if (!key) return // realtime is optional; notification row is still persisted
  try {
    const ably = new Ably.Rest(key)
    await ably.channels.get(`user:${exHolderId}`).publish('crown_stolen', payload)
  } catch {
    // best-effort; the persisted notification is the source of truth
  }
}
