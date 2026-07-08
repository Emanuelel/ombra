import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, schema } from '../src/db/client.js'

const { users, profiles, sessions } = schema

function parseCookies(header?: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

/**
 * Google OAuth callback: verify state, exchange the code for tokens, fetch the profile,
 * find-or-create the user by Google subject id, mint a session, and hand the token back to
 * the SPA in the URL hash (+ needsHandle=1 when the account still has to pick a handle).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
  const origin = `${proto}://${req.headers.host}`
  const redirect = (hash: string) => {
    res.setHeader('Set-Cookie', 'og_state=; Path=/; Max-Age=0')
    res.setHeader('Location', `${origin}/#${hash}`)
    res.statusCode = 302
    res.end()
  }
  const fail = (reason: string) => redirect(`authError=${reason}`)

  try {
    const code = typeof req.query.code === 'string' ? req.query.code : ''
    const state = typeof req.query.state === 'string' ? req.query.state : ''
    const cookies = parseCookies(req.headers.cookie)
    if (!code || !state || !cookies.og_state || cookies.og_state !== state) return fail('state')

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) return fail('google_setup')

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/api/auth-google-callback`,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) return fail('token')
    const tokens = (await tokenRes.json()) as { access_token?: string }
    if (!tokens.access_token) return fail('token')

    const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (!infoRes.ok) return fail('userinfo')
    const info = (await infoRes.json()) as { sub?: string; email?: string; name?: string; picture?: string }
    const sub = String(info.sub ?? '')
    if (!sub) return fail('userinfo')

    let userId: string
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.googleSub, sub))
    if (existing) {
      userId = existing.id
    } else {
      userId = randomUUID()
      await db.insert(users).values({
        id: userId,
        googleSub: sub,
        email: info.email ?? null,
        name: info.name ?? null,
        image: info.picture ?? null,
      })
    }

    const [profile] = await db.select({ id: profiles.userId }).from(profiles).where(eq(profiles.userId, userId))
    const needsHandle = profile ? 0 : 1

    const token = randomUUID() + randomUUID()
    await db.insert(sessions).values({ token, userId })
    return redirect(`ombra_token=${token}&needsHandle=${needsHandle}`)
  } catch {
    return fail('server')
  }
}
