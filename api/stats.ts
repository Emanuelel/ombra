import type { VercelRequest, VercelResponse } from '@vercel/node'
import { and, gt, gte, sql } from 'drizzle-orm'
import { db, schema } from '../src/db/client.js'
import { cors } from '../src/lib/http.js'

const { users, checkIns, follows, kudos, pushSubscriptions, profiles } = schema

// Time boundaries reused across queries. All timestamps are stored in UTC.
const TODAY = sql`date_trunc('day', now())`
const D7 = sql`now() - interval '7 days'`
const D30 = sql`now() - interval '30 days'`
const D14 = sql`now() - interval '14 days'`

/**
 * GET /api/stats — DB-derived activity & funnel dashboard for launch monitoring.
 *
 * Gated by a shared secret: send `Authorization: Bearer <STATS_SECRET>`. Mirrors the
 * cron auth pattern so the endpoint can't be scraped publicly. There is no admin-role
 * concept in the schema, so this is intentionally a single-key read-only endpoint.
 *
 *   curl -H "Authorization: Bearer $STATS_SECRET" https://<app>/api/stats
 *
 * Everything here is backend-observable (rows the server writes). Top-of-funnel screen
 * views / onboarding drop-off are NOT captured — that would need client event tracking.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  const secret = process.env.STATS_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const one = async (q: Promise<Array<{ c: number }>>): Promise<number> => (await q)[0]?.c ?? 0

  // count(*) over a table with optional time filters.
  const rows = (col: typeof users.createdAt | typeof checkIns.createdAt, ...filters: any[]) =>
    db.select({ c: sql<number>`count(*)::int` }).from(col === users.createdAt ? users : checkIns)
      .where(filters.length ? and(...filters) : undefined)

  // Distinct check-in users within a window (DAU/WAU/MAU).
  const activeUsers = (...filters: any[]) =>
    db.select({ c: sql<number>`count(distinct ${checkIns.userId})::int` }).from(checkIns)
      .where(filters.length ? and(...filters) : undefined)

  // Users who checked in on 2+ distinct days — a simple "came back" retention proxy.
  const returningSub = db
    .select({ userId: checkIns.userId })
    .from(checkIns)
    .groupBy(checkIns.userId)
    .having(sql`count(distinct date_trunc('day', ${checkIns.createdAt})) >= 2`)
    .as('returning')

  const [
    totalUsers,
    totalProfiles,
    totalCheckIns,
    terracesVisited,
    signupsToday,
    signups7d,
    signups30d,
    checkInsToday,
    checkIns7d,
    checkIns30d,
    dau,
    wau,
    mau,
    everCheckedIn,
    returningUsers,
    pushUsers,
    totalFollows,
    totalKudos,
    signupSeries,
    checkInSeries,
    languages,
  ] = await Promise.all([
    one(rows(users.createdAt)),
    one(db.select({ c: sql<number>`count(*)::int` }).from(profiles)),
    one(rows(checkIns.createdAt)),
    one(db.select({ c: sql<number>`count(distinct ${checkIns.terraceId})::int` }).from(checkIns)),
    one(rows(users.createdAt, gte(users.createdAt, TODAY))),
    one(rows(users.createdAt, gt(users.createdAt, D7))),
    one(rows(users.createdAt, gt(users.createdAt, D30))),
    one(rows(checkIns.createdAt, gte(checkIns.createdAt, TODAY))),
    one(rows(checkIns.createdAt, gt(checkIns.createdAt, D7))),
    one(rows(checkIns.createdAt, gt(checkIns.createdAt, D30))),
    one(activeUsers(gte(checkIns.createdAt, TODAY))),
    one(activeUsers(gt(checkIns.createdAt, D7))),
    one(activeUsers(gt(checkIns.createdAt, D30))),
    one(db.select({ c: sql<number>`count(distinct ${checkIns.userId})::int` }).from(checkIns)),
    one(db.select({ c: sql<number>`count(*)::int` }).from(returningSub)),
    one(db.select({ c: sql<number>`count(distinct ${pushSubscriptions.userId})::int` }).from(pushSubscriptions)),
    one(db.select({ c: sql<number>`count(*)::int` }).from(follows)),
    one(db.select({ c: sql<number>`count(*)::int` }).from(kudos)),
    // Daily new-signup series, last 14 days.
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${users.createdAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(users)
      .where(gt(users.createdAt, D14))
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    // Daily check-in series, last 14 days.
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${checkIns.createdAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(checkIns)
      .where(gt(checkIns.createdAt, D14))
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    // Language mix (null => 'es' default).
    db
      .select({
        lang: sql<string>`coalesce(${profiles.lang}, 'es')`,
        count: sql<number>`count(*)::int`,
      })
      .from(profiles)
      .groupBy(sql`coalesce(${profiles.lang}, 'es')`)
      .orderBy(sql`count(*) desc`),
  ])

  return res.status(200).json({
    generatedAt: new Date().toISOString(),
    note: 'Backend-observable metrics only. Onboarding/screen-view funnel is not tracked server-side.',
    totals: { users: totalUsers, profiles: totalProfiles, checkIns: totalCheckIns, terracesVisited },
    signups: { today: signupsToday, last7d: signups7d, last30d: signups30d },
    checkIns: { today: checkInsToday, last7d: checkIns7d, last30d: checkIns30d },
    active: { dau, wau, mau },
    retention: {
      everCheckedIn,
      returningUsers,
      returningRate: everCheckedIn ? +(returningUsers / everCheckedIn).toFixed(3) : 0,
      activationRate: totalUsers ? +(everCheckedIn / totalUsers).toFixed(3) : 0,
    },
    engagement: { pushUsers, follows: totalFollows, kudos: totalKudos },
    languages,
    timeseries: { signups: signupSeries, checkIns: checkInSeries },
  })
}
