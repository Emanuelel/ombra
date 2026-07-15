import type { VercelRequest, VercelResponse } from '@vercel/node'
import { broadcastPush } from '../../src/lib/push-server.js'

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
 * GET /api/cron/daily-fomo — morning broadcast nudge (~13:00 Barcelona). Invoked by Vercel
 * Cron (see vercel.json). Vercel automatically sends `Authorization: Bearer <CRON_SECRET>`
 * when the env var is set; we reject anything else so the endpoint can't be triggered publicly.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const key = variantKey(new Date().getUTCDay())
  const recipients = await broadcastPush(key, 'ombra-daily')

  return res.status(200).json({ ok: true, recipients, variant: key })
}
