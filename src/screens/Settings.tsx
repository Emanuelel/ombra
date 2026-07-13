import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { C, display, mono } from '../ui/tokens'
import { shouldOfferInstall } from '../lib/platform'
import { LANGS, setLang } from '../i18n/lang'
import Install from './Install'

function BackChevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke={C.ink}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={C.ink} strokeWidth={2} strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  )
}

const sectionLabel = {
  ...mono(11, { letterSpacing: '.14em', textTransform: 'uppercase' as const, color: C.muted2 }),
}

/**
 * Settings = the cold utility bucket pushed from the Profile gear: language,
 * support, legal, logout, attribution. Standard push/back.
 */
export default function Settings({
  onBack,
  onLogout,
}: {
  onBack: () => void
  onLogout: () => void
}) {
  const { t, i18n } = useTranslation()
  const [showInstall, setShowInstall] = useState(false)

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: C.cream,
        color: C.ink,
        display: 'flex',
        flexDirection: 'column',
        animation: 'ombraSlideIn .3s both',
      }}
    >
      {/* Red status band behind the OS status bar / dynamic island. */}
      <div style={{ flexShrink: 0, height: 'max(52px, env(safe-area-inset-top))', background: C.brand }} />

      {/* Header: back chevron + title */}
      <div style={{ flexShrink: 0, padding: '16px 22px 4px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onBack}
          aria-label={t('common.back')}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            margin: '-6px -4px -6px -6px',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <BackChevron />
        </button>
        <div style={display(26)}>{t('settings.title')}</div>
      </div>

      <div className="ombra-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px 22px 0', display: 'flex', flexDirection: 'column' }}>
        {/* Language */}
        <div style={sectionLabel}>{t('profile.language')}</div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          {LANGS.map((l) => {
            const active = i18n.resolvedLanguage === l.code
            return (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                aria-pressed={active}
                style={{
                  flex: 1,
                  background: active ? C.ink : C.creamCard,
                  color: active ? C.sun : C.ink,
                  border: `2px solid ${C.ink}`,
                  borderRadius: 12,
                  padding: '11px 8px',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {l.label}
              </button>
            )
          })}
        </div>

        {/* Support */}
        <div style={{ ...sectionLabel, marginTop: 24 }}>{t('profile.support')}</div>
        <a
          href={`mailto:selene.app.studio@outlook.com?subject=${encodeURIComponent(t('profile.contactSubject'))}`}
          style={{
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 13,
            width: '100%',
            background: C.creamCard,
            border: `2px solid ${C.ink}`,
            borderRadius: 14,
            padding: '14px 15px',
            textDecoration: 'none',
            color: C.ink,
          }}
        >
          <MailIcon />
          <span style={{ flex: 1, lineHeight: 1.25, minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 800, fontSize: 15 }}>{t('profile.contactUs')}</span>
            <span style={mono(12, { color: C.muted2 })}>{t('profile.contactSub')}</span>
          </span>
          <span style={display(15, { color: C.muted })}>›</span>
        </a>
        <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
          <a
            href="/privacy"
            style={{
              flex: 1,
              background: C.creamCard,
              border: `2px solid ${C.ink}`,
              borderRadius: 12,
              padding: 12,
              textAlign: 'center',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
              color: C.ink,
            }}
          >
            {t('profile.privacy')}
          </a>
          <a
            href="/terms"
            style={{
              flex: 1,
              background: C.creamCard,
              border: `2px solid ${C.ink}`,
              borderRadius: 12,
              padding: 12,
              textAlign: 'center',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
              color: C.ink,
            }}
          >
            {t('profile.terms')}
          </a>
        </div>

        {/* Add to home screen (PWA install) — only when the platform can install. */}
        {shouldOfferInstall() && (
          <button
            onClick={() => setShowInstall(true)}
            style={{
              marginTop: 24,
              width: '100%',
              background: C.sun,
              border: `2.5px solid ${C.ink}`,
              borderRadius: 14,
              padding: 14,
              ...display(15, { textTransform: 'uppercase' }),
              boxShadow: `4px 4px 0 ${C.ink}`,
              cursor: 'pointer',
            }}
          >
            {t('profile.addToHome')}
          </button>
        )}

        {/* Log out */}
        <button
          onClick={onLogout}
          style={{
            marginTop: 24,
            width: '100%',
            background: 'none',
            border: `2px solid ${C.logout}`,
            borderRadius: 14,
            padding: 15,
            ...display(15, { textTransform: 'uppercase', color: C.logout }),
            cursor: 'pointer',
          }}
        >
          {t('profile.logout')}
        </button>

        {/* Attribution — pinned to the bottom. Legal text, kept verbatim. */}
        {/* i18n-ignore: data attribution / credit line, kept verbatim across languages */}
        <div style={mono(10, { color: C.muted3b, textAlign: 'center', marginTop: 'auto', padding: '16px 0 14px', lineHeight: 1.5 })}>
          Terrace & places data © OpenStreetMap contributors, Overture Maps. Licensed terraces: Ajuntament de Barcelona
          open data.
        </div>
      </div>

      {showInstall && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000 }}>
          <Install onDone={() => setShowInstall(false)} />
        </div>
      )}
    </div>
  )
}
