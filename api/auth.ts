import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, schema } from '../src/db/client.js'
import { cors, bearer } from '../src/lib/http.js'

const { users, profiles, sessions } = schema
const HANDLE_RE = /^[a-z0-9_.]{2,20}$/

async function userPayload(userId: string) {
  const [p] = await db
    .select({ handle: profiles.displayName, avatarUrl: profiles.avatarUrl, barri: profiles.homeBarri })
    .from(profiles)
    .where(eq(profiles.userId, userId))
  return p ? { userId, handle: p.handle, avatarUrl: p.avatarUrl, barri: p.barri } : null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return

  // GET ?handle=x  → availability check;  GET (Bearer) → current session
  if (req.method === 'GET') {
    const handleQ = req.query.handle
    if (typeof handleQ === 'string') {
      const handle = handleQ.toLowerCase()
      if (!HANDLE_RE.test(handle)) return res.status(200).json({ available: false, invalid: true })
      const [row] = await db.select({ id: profiles.userId }).from(profiles).where(eq(profiles.displayName, handle))
      return res.status(200).json({ available: !row })
    }
    const token = bearer(req)
    if (!token) return res.status(401).json({ error: 'unauthenticated' })
    const [s] = await db.select({ userId: sessions.userId }).from(sessions).where(eq(sessions.token, token))
    if (!s) return res.status(401).json({ error: 'unauthenticated' })
    const user = await userPayload(s.userId)
    if (user) return res.status(200).json({ user })
    // Authenticated but no profile yet (fresh Google sign-in) → the client should send
    // the user to pick a handle. Hand back the Google name/photo to pre-fill that screen.
    const [u] = await db
      .select({ name: users.name, image: users.image, email: users.email })
      .from(users)
      .where(eq(users.id, s.userId))
    return res.status(200).json({
      user: null,
      needsHandle: true,
      google: u ? { name: u.name, picture: u.image, email: u.email } : null,
    })
  }

  if (req.method === 'POST') {
    const { action } = req.body ?? {}

    if (action === 'logout') {
      const token = bearer(req)
      if (token) await db.delete(sessions).where(eq(sessions.token, token))
      return res.status(200).json({ ok: true })
    }

    if (action === 'signup') {
      const handle = String(req.body?.handle ?? '').toLowerCase()
      const avatarUrl = typeof req.body?.avatarUrl === 'string' ? req.body.avatarUrl : null
      const barri = typeof req.body?.barri === 'string' ? req.body.barri : null
      if (!HANDLE_RE.test(handle)) return res.status(400).json({ error: 'bad_handle' })
      if (avatarUrl && avatarUrl.length > 400_000) return res.status(413).json({ error: 'avatar_too_large' })

      const [taken] = await db.select({ id: profiles.userId }).from(profiles).where(eq(profiles.displayName, handle))
      if (taken) return res.status(409).json({ error: 'handle_taken' })

      const userId = randomUUID()
      await db.insert(users).values({ id: userId, name: handle })
      await db.insert(profiles).values({ userId, displayName: handle, avatarUrl, homeBarri: barri })
      const token = randomUUID() + randomUUID()
      await db.insert(sessions).values({ token, userId })
      return res.status(200).json({ token, user: await userPayload(userId) })
    }

    // Finish a Google sign-in: the user is already authenticated (session from the OAuth
    // callback) but has no profile yet — create it with their chosen handle.
    if (action === 'create-profile') {
      const token = bearer(req)
      if (!token) return res.status(401).json({ error: 'unauthenticated' })
      const [s] = await db.select({ userId: sessions.userId }).from(sessions).where(eq(sessions.token, token))
      if (!s) return res.status(401).json({ error: 'unauthenticated' })

      const [existing] = await db.select({ id: profiles.userId }).from(profiles).where(eq(profiles.userId, s.userId))
      if (existing) return res.status(200).json({ token, user: await userPayload(s.userId) })

      const handle = String(req.body?.handle ?? '').toLowerCase()
      const avatarUrl = typeof req.body?.avatarUrl === 'string' ? req.body.avatarUrl : null
      const barri = typeof req.body?.barri === 'string' ? req.body.barri : null
      if (!HANDLE_RE.test(handle)) return res.status(400).json({ error: 'bad_handle' })
      if (avatarUrl && avatarUrl.length > 400_000) return res.status(413).json({ error: 'avatar_too_large' })
      const [taken] = await db.select({ id: profiles.userId }).from(profiles).where(eq(profiles.displayName, handle))
      if (taken) return res.status(409).json({ error: 'handle_taken' })

      await db.insert(profiles).values({ userId: s.userId, displayName: handle, avatarUrl, homeBarri: barri })
      return res.status(200).json({ token, user: await userPayload(s.userId) })
    }

    return res.status(400).json({ error: 'unknown_action' })
  }

  return res.status(405).json({ error: 'method_not_allowed' })
}
