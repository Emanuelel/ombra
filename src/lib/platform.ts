// Platform detection + PWA install helpers.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null

/** Call once at startup (before React renders) to catch Android/Chrome's install event. */
export function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
  })
}

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function isIOS(): boolean {
  const ua = navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document)
}

export function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent)
}

/**
 * Real Safari — the only iOS browser that can "Add to Home Screen".
 * Chrome (CriOS), Firefox (FxiOS), Edge (EdgiOS) and in-app WebViews (Instagram,
 * Facebook, etc.) cannot. Genuine Safari carries a `Version/x` token; most in-app
 * WebViews omit it, which is the most reliable signal we have.
 */
export function isSafari(): boolean {
  const ua = navigator.userAgent
  if (!/AppleWebKit/.test(ua)) return false
  if (/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|YaBrowser/i.test(ua)) return false
  return /Version\/[\d.]+.*Safari/.test(ua)
}

/** Android/Chrome has captured a native install prompt we can fire. */
export function canPromptInstall(): boolean {
  return !!deferredPrompt
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false
  await deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  return outcome === 'accepted'
}

export type InstallMode = 'ios-safari' | 'ios-other' | 'android-prompt' | 'android-manual'

export function installMode(): InstallMode {
  if (isIOS()) return isSafari() ? 'ios-safari' : 'ios-other'
  return canPromptInstall() ? 'android-prompt' : 'android-manual'
}

/** Whether to show the install step at all (skip when already installed or on desktop). */
export function shouldOfferInstall(): boolean {
  if (isStandalone()) return false
  return isIOS() || isAndroid() || canPromptInstall()
}
