import type { VercelRequest, VercelResponse } from '@vercel/node'
import { and, desc, eq, gt, sql } from 'drizzle-orm'
import { db, schema } from '../src/db/client.js'
import { cors } from '../src/lib/http.js'

const { profiles, users, checkIns, terraces, currentCrowns } = schema

/** GET /api/user?handle=X — public profile: stats, crowns, recent check-ins. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  const handle = String(req.query.handle ?? '').toLowerCase()
  if (!handle) return res.status(400).json({ error: 'bad_request' })

  const [u] = await db
    .select({ userId: profiles.userId, avatarUrl: profiles.avatarUrl, joinedAt: users.createdAt })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(eq(profiles.displayName, handle))
  if (!u) return res.status(404).json({ error: 'not_found' })

  const sumPts = sql<number>`coalesce(sum(${checkIns.points}),0)::int`
  const cnt = sql<number>`count(*)::int`

  const [p7] = await db
    .select({ pts: sumPts, n: cnt })
    .from(checkIns)
    .where(and(eq(checkIns.userId, u.userId), gt(checkIns.createdAt, sql`now() - interval '7 days'`)))

  const [pa] = await db.select({ pts: sumPts, n: cnt }).from(checkIns).where(eq(checkIns.userId, u.userId))

  const [cr] = await db
    .select({ n: cnt })
    .from(currentCrowns)
    .where(and(eq(currentCrowns.scope, 'terrace'), eq(currentCrowns.holderUserId, u.userId)))

  const [tb] = await db
    .select({ barri: terraces.barri, n: cnt })
    .from(checkIns)
    .innerJoin(terraces, eq(terraces.id, checkIns.terraceId))
    .where(eq(checkIns.userId, u.userId))
    .groupBy(terraces.barri)
    .orderBy(desc(sql`count(*)`))
    .limit(1)

  const recent = await db
    .select({
      terrace: terraces.name,
      barri: terraces.barri,
      points: checkIns.points,
      createdAt: checkIns.createdAt,
    })
    .from(checkIns)
    .innerJoin(terraces, eq(terraces.id, checkIns.terraceId))
    .where(eq(checkIns.userId, u.userId))
    .orderBy(desc(checkIns.createdAt))
    .limit(8)

  return res.status(200).json({
    handle,
    avatarUrl: u.avatarUrl,
    joinedAt: u.joinedAt,
    points7d: p7?.pts ?? 0,
    pointsAll: pa?.pts ?? 0,
    checkinsAll: pa?.n ?? 0,
    crowns: cr?.n ?? 0,
    topBarri: tb?.barri ?? null,
    recent,
  })
}
