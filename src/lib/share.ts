// Steal-my-crown share loop: build the invite link and hand it to the native share sheet
// (Web Share API), falling back to a clipboard copy on desktop where sharing isn't available.

/** The shareable deep link. `ref` (the sharer's handle) is analytics-only attribution. */
export function buildShareUrl(terraceId: string, ref?: string): string {
  const base = `${location.origin}/?t=${encodeURIComponent(terraceId)}`
  return ref ? `${base}&ref=${encodeURIComponent(ref)}` : base
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

/**
 * Open the native share sheet, or copy the link if the platform can't share.
 * MUST be called synchronously from a click handler: `navigator.share` requires transient
 * activation, so nothing may be awaited before it.
 */
export async function shareCrown(opts: { url: string; title: string; text: string }): Promise<ShareResult> {
  const data: ShareData = { title: opts.title, text: opts.text, url: opts.url }
  const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean }
  if (typeof nav.share === 'function' && (!nav.canShare || nav.canShare(data))) {
    try {
      await nav.share(data)
      return 'shared'
    } catch (err) {
      // A user dismissing the sheet is not a failure; anything else falls back to clipboard.
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
    }
  }
  try {
    await navigator.clipboard.writeText(`${opts.text} ${opts.url}`)
    return 'copied'
  } catch {
    return 'failed'
  }
}
