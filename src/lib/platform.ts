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

export type InstallMode = 'ios' | 'android-prompt' | 'android-manual'

export function installMode(): InstallMode {
  if (isIOS()) return 'ios'
  return canPromptInstall() ? 'android-prompt' : 'android-manual'
}

/** Whether to show the install step at all (skip when already installed or on desktop). */
export function shouldOfferInstall(): boolean {
  if (isStandalone()) return false
  return isIOS() || isAndroid() || canPromptInstall()
}
