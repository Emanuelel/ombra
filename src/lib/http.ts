import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Permissive CORS so the app works same-origin in production and from the local
 * dev preview (which points VITE_API_BASE at the deployed functions).
 * Returns true if the request was a preflight and has been answered.
 */
export function cors(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}

export function bearer(req: VercelRequest): string | null {
  const auth = req.headers['authorization']
  return typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : null
}
