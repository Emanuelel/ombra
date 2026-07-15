import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq } from 'drizzle-orm'
import { db, schema } from '../src/db/client.js'
import { getSessionUserId } from '../src/lib/auth-server.js'
import { cors } from '../src/lib/http.js'
import { sendPushToUser } from '../src/lib/push-server.js'
import { pushCopy } from '../src/lib/push-copy.js'

const { profiles, pushSubscriptions } = schema
const LANGS = ['es', 'ca', 'en']

/**
 * Push endpoint, multiplexed by `?action=` so device subscription and the self-test share one
 * Serverless Function (the Hobby plan caps a deployment at 12).
 *   POST /api/push?action=subscribe { subscription, lang? } — store this device's subscription.
 *   POST /api/push?action=test                              — send a test push to the user's devices.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const userId = await getSessionUserId(req)
  if (!userId) return res.status(401).json({ error: 'unauthenticated' })

  switch (req.query.action) {
    case 'subscribe':
      return subscribe(req, res, userId)
    case 'test':
      return sendTest(res, userId)
    default:
      return res.status(400).json({ error: 'unknown_action' })
  }
}

/** Store (upsert) this device's push subscription, and remember its language for localized push. */
async function subscribe(req: VercelRequest, res: VercelResponse, userId: string) {
  const sub = req.body?.subscription
  const endpoint: unknown = sub?.endpoint
  const p256dh: unknown = sub?.keys?.p256dh
  const auth: unknown = sub?.keys?.auth
  if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') {
    return res.status(400).json({ error: 'bad_subscription' })
  }

  await db
    .insert(pushSubscriptions)
    .values({ endpoint, userId, p256dh, auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh, auth },
    })

  const lang = req.body?.lang
  if (typeof lang === 'string' && LANGS.includes(lang)) {
    await db.update(profiles).set({ lang }).where(eq(profiles.userId, userId))
  }

  return res.status(200).json({ ok: true })
}

/**
 * Send a localized test push to the signed-in user's own devices. Returns `count` (number of
 * subscriptions) so the client can tell "sent" from "no device subscribed yet" (e.g. iOS before
 * the PWA is installed).
 */
async function sendTest(res: VercelResponse, userId: string) {
  const subs = await db
    .select({ endpoint: pushSubscriptions.endpoint })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
  if (subs.length === 0) return res.status(200).json({ ok: true, count: 0 })

  const [p] = await db.select({ lang: profiles.lang }).from(profiles).where(eq(profiles.userId, userId))
  const copy = pushCopy(p?.lang ?? null, 'push.test')
  await sendPushToUser(userId, { ...copy, url: '/', tag: 'ombra-test' })

  return res.status(200).json({ ok: true, count: subs.length })
}
