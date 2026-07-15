import type { VercelRequest, VercelResponse } from '@vercel/node'
import { broadcastPush } from '../../src/lib/push-server.js'

/**
 * Two daily nudges are served by this one function (the Hobby plan caps a deployment at 12
 * Serverless Functions, so we can't afford a second file). Both cron entries in vercel.json
 * point here; the evening one passes `?slot=vermut`. Each slot maps to its own copy family
 * and a distinct notification tag so the morning and evening pushes don't replace each other.
 */
const SLOTS = {
  fomo: {
    tag: 'ombra-daily', // ~13:00 Barcelona: "the terraces are filling up"
    weekday: ['push.fomo.weekdayA', 'push.fomo.weekdayB', 'push.fomo.weekdayC'],
    weekendFri: 'push.fomo.weekendA',
    weekendSat: 'push.fomo.weekendB',
  },
  vermut: {
    tag: 'ombra-vermut', // ~19:00 Barcelona: "vermut o'clock"
    weekday: ['push.vermut.weekdayA', 'push.vermut.weekdayB', 'push.vermut.weekdayC'],
    weekendFri: 'push.vermut.weekendA',
    weekendSat: 'push.vermut.weekendB',
  },
} as const

/**
 * Pick today's copy variant for a slot. Fri/Sat/Sun get weekend copy; Mon-Thu rotate across
 * three weekday lines. `day` is UTC 0 (Sun) .. 6 (Sat) — good enough for a once-daily nudge.
 */
function variantKey(slot: (typeof SLOTS)[keyof typeof SLOTS], day: number): string {
  if (day === 5) return slot.weekendFri // Fri
  if (day === 6 || day === 0) return slot.weekendSat // Sat/Sun
  return slot.weekday[day % slot.weekday.length]
}

/**
 * GET /api/cron/daily-fomo[?slot=vermut] — daily broadcast nudge. Invoked by Vercel Cron (see
 * vercel.json). Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when the env
 * var is set; we reject anything else so the endpoint can't be triggered publicly.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  // Explicit `?slot=vermut` selects the evening campaign; otherwise fall back to the UTC hour
  // (the evening cron fires at 17:00 UTC) so a missing/dropped query param can't misfire it.
  const evening = req.query.slot === 'vermut' || new Date().getUTCHours() >= 15
  const slotName = evening ? 'vermut' : 'fomo'
  const slot = SLOTS[slotName]

  const key = variantKey(slot, new Date().getUTCDay())
  const recipients = await broadcastPush(key, slot.tag)

  return res.status(200).json({ ok: true, recipients, slot: slotName, variant: key })
}
