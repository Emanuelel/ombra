import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'node:crypto'

/**
 * Kick off Google OAuth: 302 to Google's consent screen. A random `state` is stored in a
 * short-lived HttpOnly cookie and checked in the callback (CSRF protection). Requires
 * GOOGLE_CLIENT_ID (server env); if unset, bounces back with a friendly error flag.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
  const origin = `${proto}://${req.headers.host}`
  const clientId = process.env.GOOGLE_CLIENT_ID

  if (!clientId) {
    res.setHeader('Location', `${origin}/#authError=google_setup`)
    res.statusCode = 302
    return res.end()
  }

  const state = randomUUID()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth-google-callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'online',
  })
  res.setHeader('Set-Cookie', `og_state=${state}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=600`)
  res.setHeader('Location', `https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  res.statusCode = 302
  res.end()
}
