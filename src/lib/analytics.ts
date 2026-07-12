// PostHog wrapper for the onboarding funnel. Every function no-ops until a
// VITE_POSTHOG_KEY is set at build time, so the app builds and runs unchanged
// without a key — dropping the env var in and redeploying activates tracking.
//
// The app is a single-page state machine (no route changes), so automatic
// pageviews are disabled and we send explicit `screen_view` events instead;
// the sequence of those is the funnel (welcome → howto → handle → perms → map …).
import posthog from 'posthog-js'

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
// Must match the region where the PostHog project was created (EU or US cloud).
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://eu.i.posthog.com'

let enabled = false

/** Call once at startup, before React renders. Safe to call with no key (no-op). */
export function initAnalytics(): void {
  if (enabled || !KEY) return
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false, // no routing to hang pageviews on; we emit screen_view manually
    persistence: 'localStorage',
  })
  enabled = true
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (!enabled) return
  posthog.capture(event, props)
}

/** Tie the anonymous funnel session to a known user once they authenticate. */
export function identify(distinctId: string, props?: Record<string, unknown>): void {
  if (!enabled) return
  posthog.identify(distinctId, props)
}

/** Clear identity on logout so the next user isn't merged into this one. */
export function resetAnalytics(): void {
  if (!enabled) return
  posthog.reset()
}
