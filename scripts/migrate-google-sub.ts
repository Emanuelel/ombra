/**
 * Additive migration: add users.google_sub (nullable, unique) for Google sign-in.
 * Safe to run repeatedly. drizzle-kit push needs a TTY for this, so we apply it directly.
 * Run: set -a; . ./.env.local; set +a; npx tsx scripts/migrate-google-sub.ts
 */
import { sql } from 'drizzle-orm'
import { db } from '../src/db/client'

async function main() {
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub text`)
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_google_sub_unique') THEN
        ALTER TABLE users ADD CONSTRAINT users_google_sub_unique UNIQUE (google_sub);
      END IF;
    END $$;`)
  console.log('✓ users.google_sub ready')
}

main().catch((e) => {
  console.error('migration failed:', e)
  process.exit(1)
})
