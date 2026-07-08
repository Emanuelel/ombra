import type { VercelRequest, VercelResponse } from '@vercel/node'
import { and, desc, eq } from 'drizzle-orm'
import { db, schema } from '../src/db/client.js'
import { getSessionUserId } from '../src/lib/auth-server.js'
import { cors } from '../src/lib/http.js'

const { favorites } = schema

/**
 * GET  /api/favorites            → this user's saved terraces/barris
 * POST /api/favorites { kind, ref, label, on } → add (on:true) or remove (on:false)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return
  const userId = await getSessionUserId(req)
  if (!userId) return res.status(401).json({ error: 'unauthenticated' })

  if (req.method === 'GET') {
    const rows = await db
      .select({ kind: favorites.kind, ref: favorites.ref, label: favorites.label })
      .from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt))
    return res.status(200).json({ favorites: rows })
  }

  if (req.method === 'POST') {
    const { kind, ref, label, on } = req.body ?? {}
    if ((kind !== 'terrace' && kind !== 'barri') || typeof ref !== 'string' || !ref) {
      return res.status(400).json({ error: 'bad_request' })
    }
    if (on) {
      await db
        .insert(favorites)
        .values({ userId, kind, ref, label: String(label ?? ref) })
        .onConflictDoUpdate({
          target: [favorites.userId, favorites.kind, favorites.ref],
          set: { label: String(label ?? ref) },
        })
    } else {
      await db
        .delete(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.kind, kind), eq(favorites.ref, ref)))
    }
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'method_not_allowed' })
}
