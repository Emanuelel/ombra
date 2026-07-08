import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq } from 'drizzle-orm'
import { db, schema } from '../src/db/client.js'
import { getSessionUserId } from '../src/lib/auth-server.js'
import { cors } from '../src/lib/http.js'

const { profiles } = schema

/**
 * POST /api/profile { avatarUrl } → set/replace the signed-in user's avatar.
 * avatarUrl is a data URL (client downscales it well under the 400 KB cap).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const userId = await getSessionUserId(req)
  if (!userId) return res.status(401).json({ error: 'unauthenticated' })

  const avatarUrl = typeof req.body?.avatarUrl === 'string' ? req.body.avatarUrl : null
  if (avatarUrl && avatarUrl.length > 400_000) return res.status(413).json({ error: 'avatar_too_large' })

  await db.update(profiles).set({ avatarUrl }).where(eq(profiles.userId, userId))
  return res.status(200).json({ ok: true })
}
