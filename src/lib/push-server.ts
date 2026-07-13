import webpush from 'web-push'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/client.js'

let configured = false
function ensure(): boolean {
  if (configured) return true
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:hi@ombra.app', pub, priv)
  configured = true
  return true
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

/** Best-effort web push to every device a user has subscribed. Prunes dead subs. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!ensure()) return
  const subs = await db
    .select()
    .from(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.userId, userId))
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        )
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) {
          await db
            .delete(schema.pushSubscriptions)
            .where(eq(schema.pushSubscriptions.endpoint, s.endpoint))
        }
      }
    }),
  )
}
