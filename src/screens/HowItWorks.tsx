import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { C, display } from '../ui/tokens'
import Crown from '../ui/Crown'
import GoogleG from '../ui/GoogleG'
import { isInAppBrowser, isAndroid } from '../lib/platform'
import { track } from '../lib/analytics'

// R2 "Learn" screen: a 4-beat, swipe-driven poster carousel. The hero is deliberately
// iconographic (never a realistic map) so nobody mistakes it for the live app and taps it
// instead of the CTA. The CTA is reachable on every beat.
const BEATS = 4
const SWIPE_MIN = 36 // px; below this a drag is treated as a tap, not a swipe

// One iconographic illustration per beat, drawn over the shared sun-ray disc.
function BeatArt({ beat }: { beat: number }) {
  if (beat === 0)
    // Sun half-eclipsed into shade.
    return (
      <div
        style={{
          position: 'relative',
          width: 130,
          height: 130,
          borderRadius: '50%',
          background: C.sun,
          border: `4px solid ${C.ink}`,
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', right: -30, bottom: -30, width: 120, height: 120, borderRadius: '50%', background: C.shadeDeep }} />
      </div>
    )
  if (beat === 1)
    // Location pin.
    return (
      <svg viewBox="0 0 100 130" width={120} height={156}>
        <path d="M50 6C26 6 8 24 8 48c0 30 42 76 42 76s42-46 42-76C92 24 74 6 50 6Z" fill={C.tomato} stroke={C.ink} strokeWidth={5} />
        <circle cx="50" cy="46" r="19" fill={C.cream} stroke={C.ink} strokeWidth={4} />
      </svg>
    )
  if (beat === 2)
    // Crown burst — disc pops in over a faint red ray-burst.
    return (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: '50%',
            opacity: 0.2,
            background: 'repeating-conic-gradient(#F4432B 0 11deg, transparent 11deg 24deg)',
            animation: 'ombraSpin 9s linear infinite',
          }}
        />
        <div
          style={{
            position: 'relative',
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: C.tomato,
            border: `4px solid ${C.ink}`,
            boxShadow: `7px 7px 0 ${C.ink}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'ombraPopIn .6s cubic-bezier(.2,1.3,.4,1) both',
          }}
        >
          <Crown size={74} fill={C.sun} />
        </div>
      </div>
    )
  // beat 3 — floating gold crown you have to defend.
  return (
    <div style={{ animation: 'ombraFloat 3.4s ease-in-out infinite', filter: `drop-shadow(6px 6px 0 ${C.ink})`, lineHeight: 0 }}>
      <Crown size={130} fill={C.sun} stroke={C.ink} />
    </div>
  )
}

// Shown in place of the Google CTA when we're inside an in-app WebView, where
// Google OAuth dead-ends with `Error 403: disallowed_useragent`. Routes the user
// out to a real browser: Android can force-launch Chrome via an `intent://` URL;
// iOS has no such hook, so we copy the link and point at the ⋯ → Open in Safari menu.
function InAppEscape({ onTryAnyway }: { onTryAnyway: () => void }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const android = isAndroid()

  function openInChrome() {
    track('auth_inapp_escape', { action: 'chrome' })
    // Strip the scheme; Android reconstructs it from `scheme=https` and hands the
    // URL to Chrome by package name.
    const target = window.location.href.replace(/^https?:\/\//, '')
    window.location.href = `intent://${target}#Intent;scheme=https;package=com.android.chrome;end`
  }

  async function copyLink() {
    track('auth_inapp_escape', { action: 'copy' })
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
    } catch {
      setCopied(true) // clipboard blocked; the ⋯ hint still gets them out
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
      <div style={{ background: C.creamCard, border: `2px solid ${C.ink}`, borderRadius: 15, padding: '16px 18px' }}>
        <div style={{ ...display(17, { lineHeight: 1.1 }), marginBottom: 8 }}>{t('howItWorks.inAppTitle')}</div>
        <div style={{ fontSize: 14, lineHeight: 1.45, color: C.subtext }}>{t('howItWorks.inAppBody')}</div>
        {!android && (
          <div style={{ fontSize: 13, lineHeight: 1.45, color: C.muted, marginTop: 10 }}>{t('howItWorks.inAppIosHint')}</div>
        )}
      </div>

      <button
        onClick={android ? openInChrome : copyLink}
        style={{
          width: '100%',
          background: C.ink,
          color: C.cream,
          border: 'none',
          borderRadius: 15,
          padding: 17,
          fontFamily: "'Archivo', sans-serif",
          fontWeight: 900,
          fontSize: 17,
          cursor: 'pointer',
        }}
      >
        {android ? t('howItWorks.inAppOpenChrome') : copied ? t('howItWorks.inAppCopied') : t('howItWorks.inAppCopyLink')}
      </button>

      {/* Safety valve for a false-positive detection: let the user try Google anyway. */}
      <button
        onClick={onTryAnyway}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted2, fontSize: 12, textDecoration: 'underline', padding: 2 }}
      >
        {t('howItWorks.inAppTryAnyway')}
      </button>
    </div>
  )
}

export default function HowItWorks({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { t } = useTranslation()
  const [beat, setBeat] = useState(0)
  const [inApp] = useState(isInAppBrowser)
  const downX = useRef<number | null>(null)

  // Record that a user hit the in-app-browser wall, so the funnel can size the
  // Instagram/WhatsApp-DM dropoff separately from ordinary sign-in abandonment.
  useEffect(() => {
    if (inApp) track('auth_inapp_blocked')
  }, [inApp])

  const goTo = (i: number) => setBeat(Math.max(0, Math.min(BEATS - 1, i)))
  const prev = () => setBeat((b) => Math.max(0, b - 1))
  const advance = () => setBeat((b) => Math.min(BEATS - 1, b + 1))

  // Keyboard access: ←/→ step through the beats.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function onPointerDown(e: ReactPointerEvent) {
    downX.current = e.clientX
  }
  function onPointerUp(e: ReactPointerEvent) {
    if (downX.current === null) return
    const dx = e.clientX - downX.current
    downX.current = null
    if (Math.abs(dx) < SWIPE_MIN) return // a tap, not a swipe
    if (dx < 0) advance()
    else prev()
  }

  const titles = [t('howItWorks.b1Title'), t('howItWorks.b2Title'), t('howItWorks.b3Title'), t('howItWorks.b4Title')]
  const subs = [t('howItWorks.b1Sub'), t('howItWorks.b2Sub'), t('howItWorks.b3Sub'), t('howItWorks.b4Sub')]

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      style={{
        position: 'absolute',
        inset: 0,
        background: C.cream,
        color: C.ink,
        display: 'flex',
        flexDirection: 'column',
        touchAction: 'pan-y',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* brand-red band behind the OS status bar, with a quiet back affordance */}
      <div style={{ flexShrink: 0, background: C.brand, height: 'max(52px, env(safe-area-inset-top))', display: 'flex', alignItems: 'flex-end' }}>
        <button
          onClick={onBack}
          aria-label={t('common.back')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.cream, padding: '2px 16px 6px', ...display(22) }}
        >
          ←
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 26px 22px', textAlign: 'center' }}>
        {/* poster hero */}
        <div style={{ flex: '0 0 auto', height: 210, marginTop: 64, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              position: 'absolute',
              width: 230,
              height: 230,
              borderRadius: '50%',
              background: 'repeating-conic-gradient(rgba(248,74,44,.14) 0 10deg, transparent 10deg 22deg)',
              animation: 'ombraSpin 16s linear infinite',
            }}
          />
          {/* keyed so the illustration replays its entrance on each beat change */}
          <div key={beat} style={{ position: 'relative', animation: 'ombraFadeUp .4s ease both' }}>
            <BeatArt beat={beat} />
          </div>
        </div>

        {/* headline block — re-animates on beat change */}
        <div key={`h-${beat}`} style={{ flexShrink: 0, marginTop: 28, animation: 'ombraFadeUp .4s ease both' }}>
          <div style={display(30, { lineHeight: 1.0 })}>{titles[beat]}</div>
          <div style={{ fontSize: 15, lineHeight: 1.4, marginTop: 12, color: C.subtext }}>{subs[beat]}</div>
        </div>

        {/* bottom group — dots sit at a fixed spot directly above the CTA */}
        <div style={{ flexShrink: 0, marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 7, justifyContent: 'center', marginBottom: 14 }}>
            {Array.from({ length: BEATS }, (_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`${i + 1}`}
                aria-current={i === beat}
                style={{
                  width: i === beat ? 30 : 8,
                  height: 6,
                  padding: 0,
                  border: 'none',
                  borderRadius: 99,
                  cursor: 'pointer',
                  background: i === beat ? C.tomato : C.dotOff,
                  transition: 'width .3s ease, background .3s ease',
                }}
              />
            ))}
          </div>

          {inApp ? (
            <InAppEscape onTryAnyway={onNext} />
          ) : (
            <button
              onClick={onNext}
              style={{
                width: '100%',
                background: C.ink,
                color: C.cream,
                border: 'none',
                borderRadius: 15,
                padding: 17,
                fontFamily: "'Archivo', sans-serif",
                fontWeight: 900,
                fontSize: 17,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 11,
              }}
            >
              <span style={{ background: '#fff', borderRadius: 4, padding: 2, display: 'flex', lineHeight: 0 }}>
                <GoogleG size={18} />
              </span>
              {t('howItWorks.continueGoogle')}
            </button>
          )}

          <div style={{ fontSize: 11, lineHeight: 1.4, color: C.muted2 }}>
            <Trans
              i18nKey="howItWorks.legal"
              components={{
                terms: <a href="/terms" style={{ color: C.blue, fontWeight: 600, textDecoration: 'none' }} />,
                privacy: <a href="/privacy" style={{ color: C.blue, fontWeight: 600, textDecoration: 'none' }} />,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
