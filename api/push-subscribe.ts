import type { VercelRequest, VercelResponse } from '@vercel/node'
import { db, schema } from '../src/db/client.js'
import { getSessionUserId } from '../src/lib/auth-server.js'
import { cors } from '../src/lib/http.js'

/** POST /api/push-subscribe { subscription } — store this device's push subscription. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const userId = await getSessionUserId(req)
  if (!userId) return res.status(401).json({ error: 'unauthenticated' })

  const sub = req.body?.subscription
  const endpoint: unknown = sub?.endpoint
  const p256dh: unknown = sub?.keys?.p256dh
  const auth: unknown = sub?.keys?.auth
  if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') {
    return res.status(400).json({ error: 'bad_subscription' })
  }

  await db
    .insert(schema.pushSubscriptions)
    .values({ endpoint, userId, p256dh, auth })
    .onConflictDoUpdate({
      target: schema.pushSubscriptions.endpoint,
      set: { userId, p256dh, auth },
    })

  return res.status(200).json({ ok: true })
}
