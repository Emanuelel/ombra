import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq } from 'drizzle-orm'
import { db, schema } from '../../src/db/client.js'
import { sendPushToUser } from '../../src/lib/push-server.js'
import { pushCopy } from '../../src/lib/push-copy.js'

const { profiles, pushSubscriptions } = schema

/**
 * Pick today's FOMO variant. Fri/Sat/Sun get weekend copy; Mon-Thu rotate across three
 * weekday lines. `day` is UTC 0 (Sun) .. 6 (Sat) — good enough for a once-daily nudge.
 */
function variantKey(day: number): string {
  if (day === 5) return 'push.fomo.weekendA' // Fri: "the weekend hunt begins"
  if (day === 6 || day === 0) return 'push.fomo.weekendB' // Sat/Sun
  const weekday = ['push.fomo.weekdayA', 'push.fomo.weekdayB', 'push.fomo.weekdayC']
  return weekday[day % weekday.length]
}

/**
 * GET /api/cron/daily-fomo — daily broadcast nudge. Invoked by Vercel Cron (see vercel.json).
 * Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when the env var is set;
 * we reject anything else so the endpoint can't be triggered publicly.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const key = variantKey(new Date().getUTCDay())

  // One row per user that has at least one push subscription, with their language.
  const recipients = await db
    .selectDistinct({ userId: pushSubscriptions.userId, lang: profiles.lang })
    .from(pushSubscriptions)
    .leftJoin(profiles, eq(profiles.userId, pushSubscriptions.userId))

  // Bounded concurrency so a large audience doesn't overrun the function timeout.
  const CHUNK = 20
  for (let i = 0; i < recipients.length; i += CHUNK) {
    await Promise.all(
      recipients.slice(i, i + CHUNK).map((r) => {
        const copy = pushCopy(r.lang ?? null, key)
        return sendPushToUser(r.userId, { ...copy, url: '/', tag: 'ombra-daily' })
      }),
    )
  }

  return res.status(200).json({ ok: true, recipients: recipients.length, variant: key })
}
