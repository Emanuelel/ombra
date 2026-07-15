import webpush from 'web-push'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/client.js'
import { pushCopy } from './push-copy.js'

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

/**
 * Broadcast one localized push to every user with at least one subscription. Used by the
 * daily cron jobs (see api/cron/*). Copy is resolved per-user from their `profiles.lang`.
 * Returns the recipient (distinct user) count. `tag` should be unique per campaign so a
 * morning and an evening push don't replace each other on the device.
 */
export async function broadcastPush(key: string, tag: string): Promise<number> {
  // One row per user that has a push subscription, with their language.
  const recipients = await db
    .selectDistinct({ userId: schema.pushSubscriptions.userId, lang: schema.profiles.lang })
    .from(schema.pushSubscriptions)
    .leftJoin(schema.profiles, eq(schema.profiles.userId, schema.pushSubscriptions.userId))

  // Bounded concurrency so a large audience doesn't overrun the function timeout.
  const CHUNK = 20
  for (let i = 0; i < recipients.length; i += CHUNK) {
    await Promise.all(
      recipients.slice(i, i + CHUNK).map((r) => {
        const copy = pushCopy(r.lang ?? null, key)
        return sendPushToUser(r.userId, { ...copy, url: '/', tag })
      }),
    )
  }
  return recipients.length
}
