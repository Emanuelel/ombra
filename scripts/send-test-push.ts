/**
 * Send a test push to a single user's devices, by email or @handle. Reuses the app's
 * own `sendPushToUser` + `pushCopy`, so it exercises the exact production delivery path.
 *
 * Needs VAPID_* keys in the environment (Production has them), so run with the prod env:
 *   npx tsx --env-file=.env.production.local scripts/send-test-push.ts you@example.com
 *   npx tsx --env-file=.env.production.local scripts/send-test-push.ts @yourhandle
 */
import { eq } from 'drizzle-orm'
import { db, schema } from '../src/db/client.js'
import { sendPushToUser } from '../src/lib/push-server.js'
import { pushCopy } from '../src/lib/push-copy.js'

const { users, profiles, pushSubscriptions } = schema

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('usage: tsx scripts/send-test-push.ts <email|@handle>')
    process.exit(1)
  }

  const isEmail = arg.includes('@') && arg.includes('.') && !arg.startsWith('@')
  let userId: string | undefined
  let lang: string | null = null

  if (isEmail) {
    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, arg))
    userId = u?.id
    if (userId) {
      const [p] = await db.select({ lang: profiles.lang }).from(profiles).where(eq(profiles.userId, userId))
      lang = p?.lang ?? null
    }
  } else {
    const handle = arg.replace(/^@/, '').toLowerCase()
    const [p] = await db
      .select({ id: profiles.userId, lang: profiles.lang })
      .from(profiles)
      .where(eq(profiles.displayName, handle))
    userId = p?.id
    lang = p?.lang ?? null
  }

  if (!userId) {
    console.error(`No user found for "${arg}".`)
    process.exit(1)
  }

  const subs = await db
    .select({ endpoint: pushSubscriptions.endpoint })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
  if (subs.length === 0) {
    console.error(`User ${userId} has no push subscriptions. Enable notifications in the app first (iOS: installed PWA).`)
    process.exit(1)
  }

  const copy = pushCopy(lang, 'push.test')
  await sendPushToUser(userId, { ...copy, url: '/', tag: 'ombra-test' })
  console.log(`Sent test push to ${arg} (${subs.length} device(s), lang=${lang ?? 'es'}).`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('send-test-push failed:', e)
    process.exit(1)
  })
