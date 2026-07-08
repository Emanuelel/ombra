import type { VercelRequest, VercelResponse } from '@vercel/node'
import { and, desc, eq, gt, sql } from 'drizzle-orm'
import { db, schema } from '../src/db/client.js'
import { cors } from '../src/lib/http.js'
import { CROWN_WINDOW_DAYS } from '../src/lib/scoring.js'

const { checkIns, terraces, profiles } = schema

/**
 * GET /api/leaderboard?scope=terrace|barri|city&id=<scopeId>&window=week|all
 * Rolling-window ranking by points (a plain GROUP BY — the reason for the SQL stack).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  const scope = String(req.query.scope ?? 'city')
  const id = req.query.id ? String(req.query.id) : null
  const windowParam = String(req.query.window ?? 'week')

  const filters = []
  if (windowParam === 'week') {
    filters.push(
      gt(checkIns.createdAt, sql`now() - interval '${sql.raw(String(CROWN_WINDOW_DAYS))} days'`),
    )
  }
  if (scope === 'terrace' && id) {
    filters.push(eq(checkIns.terraceId, id))
  } else if (scope === 'barri' && id) {
    filters.push(eq(terraces.barri, id))
  }

  const rows = await db
    .select({
      userId: checkIns.userId,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      points: sql<number>`sum(${checkIns.points})::int`,
      checkins: sql<number>`count(*)::int`,
    })
    .from(checkIns)
    .innerJoin(terraces, eq(terraces.id, checkIns.terraceId))
    .leftJoin(profiles, eq(profiles.userId, checkIns.userId))
    .where(filters.length ? and(...filters) : undefined)
    .groupBy(checkIns.userId, profiles.displayName, profiles.avatarUrl)
    .orderBy(desc(sql`sum(${checkIns.points})`))
    .limit(50)

  return res.status(200).json({ scope, id, window: windowParam, rows })
}
