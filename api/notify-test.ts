import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq } from 'drizzle-orm'
import { db, schema } from '../src/db/client.js'
import { getSessionUserId } from '../src/lib/auth-server.js'
import { cors } from '../src/lib/http.js'
import { sendPushToUser } from '../src/lib/push-server.js'
import { pushCopy } from '../src/lib/push-copy.js'

const { profiles, pushSubscriptions } = schema

/**
 * POST /api/notify-test — send a localized test push to the signed-in user's own devices.
 * Returns `count` (number of subscriptions) so the client can tell "sent" from
 * "no device subscribed yet" (e.g. iOS before the PWA is installed).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const userId = await getSessionUserId(req)
  if (!userId) return res.status(401).json({ error: 'unauthenticated' })

  const subs = await db
    .select({ endpoint: pushSubscriptions.endpoint })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
  if (subs.length === 0) return res.status(200).json({ ok: true, count: 0 })

  const [p] = await db.select({ lang: profiles.lang }).from(profiles).where(eq(profiles.userId, userId))
  const copy = pushCopy(p?.lang ?? null, 'push.test')
  const results = await sendPushToUser(userId, { ...copy, url: '/', tag: 'ombra-test' })

  // `results` (per-device push-service status) is temporary diagnostics for the Android issue.
  return res.status(200).json({ ok: true, count: subs.length, results })
}
