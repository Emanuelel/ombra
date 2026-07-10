/**
 * Recomputes every terrace's stored crown holder in `current_crowns` by total
 * points over the rolling CROWN_WINDOW_DAYS window, matching /api/leaderboard and
 * the fixed crown assignment in api/check-in.ts (which formerly ranked by check-in
 * count, leaving stored holders out of sync with the crown shown in the UI).
 *
 * Idempotent: rows already pointing at the correct holder are left untouched.
 * Does NOT emit crown_stolen notifications or pushes; this is a silent reconcile.
 *
 * Run: DATABASE_URL="…" npx tsx scripts/backfill-crowns.ts
 */
import { and, desc, eq, gt, sql } from 'drizzle-orm'
import { db, schema } from '../src/db/client.js'
import { CROWN_WINDOW_DAYS } from '../src/lib/scoring.js'

const { checkIns, currentCrowns } = schema

async function main() {
  // Every terrace with at least one check-in inside the window is a candidate.
  const terraceIds = await db
    .selectDistinct({ terraceId: checkIns.terraceId })
    .from(checkIns)
    .where(gt(checkIns.createdAt, sql`now() - interval '${sql.raw(String(CROWN_WINDOW_DAYS))} days'`))

  let created = 0
  let updated = 0
  let unchanged = 0

  for (const { terraceId } of terraceIds) {
    // Top by total points in the window — identical ranking to api/check-in.ts.
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

    if (!top?.userId) continue
    const newHolder = top.userId

    const [prev] = await db
      .select()
      .from(currentCrowns)
      .where(and(eq(currentCrowns.scope, 'terrace'), eq(currentCrowns.scopeId, terraceId)))

    if (!prev) {
      await db.insert(currentCrowns).values({
        scope: 'terrace',
        scopeId: terraceId,
        holderUserId: newHolder,
      })
      created++
    } else if (prev.holderUserId !== newHolder) {
      await db
        .update(currentCrowns)
        .set({ holderUserId: newHolder })
        .where(and(eq(currentCrowns.scope, 'terrace'), eq(currentCrowns.scopeId, terraceId)))
      updated++
    } else {
      unchanged++
    }
  }

  console.log(
    `Backfill done: ${terraceIds.length} terrace(s) in window — ${created} created, ${updated} corrected, ${unchanged} already correct.`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
