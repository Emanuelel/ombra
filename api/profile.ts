import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq } from 'drizzle-orm'
import { db, schema } from '../src/db/client.js'
import { getSessionUserId } from '../src/lib/auth-server.js'
import { cors } from '../src/lib/http.js'

const { profiles } = schema

const LANGS = ['es', 'ca', 'en']

/**
 * POST /api/profile { avatarUrl?, lang? } → update the signed-in user's profile.
 * Only the fields present in the body are touched (so a lang-only update keeps the avatar,
 * and vice versa). avatarUrl is a data URL (client downscales it well under the 400 KB cap).
 * lang localizes server-sent push (see src/lib/push-copy.ts).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const userId = await getSessionUserId(req)
  if (!userId) return res.status(401).json({ error: 'unauthenticated' })

  const body = req.body ?? {}
  const set: { avatarUrl?: string | null; lang?: string } = {}

  if ('avatarUrl' in body) {
    const avatarUrl = typeof body.avatarUrl === 'string' ? body.avatarUrl : null
    if (avatarUrl && avatarUrl.length > 400_000) return res.status(413).json({ error: 'avatar_too_large' })
    set.avatarUrl = avatarUrl
  }
  if (typeof body.lang === 'string' && LANGS.includes(body.lang)) set.lang = body.lang

  if (Object.keys(set).length === 0) return res.status(400).json({ error: 'nothing_to_update' })

  await db.update(profiles).set(set).where(eq(profiles.userId, userId))
  return res.status(200).json({ ok: true })
}
