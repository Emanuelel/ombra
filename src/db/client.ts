import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema.js'

/**
 * Pooled Postgres connection string. Vercel's native Neon integration injects
 * `DATABASE_URL` (pooled) automatically; we also accept the legacy Vercel Postgres
 * name and the unpooled URL as fallbacks. Server-only - never import into client code.
 */
const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED

if (!url) {
  throw new Error(
    'No database URL found. Set DATABASE_URL (or connect the Vercel–Neon integration, which injects it).',
  )
}

const sql = neon(url)
export const db = drizzle(sql, { schema })
export { schema }
