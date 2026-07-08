import type { VercelRequest } from '@vercel/node'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/client.js'
import { bearer } from './http.js'

/** Resolve the authenticated user id from the request's Bearer session token. */
export async function getSessionUserId(req: VercelRequest): Promise<string | null> {
  const token = bearer(req)
  if (!token) return null
  const [s] = await db
    .select({ userId: schema.sessions.userId })
    .from(schema.sessions)
    .where(eq(schema.sessions.token, token))
  return s?.userId ?? null
}
