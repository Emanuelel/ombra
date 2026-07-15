import { useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { btnBlock, C, display, mono } from '../ui/tokens'
import Crown from '../ui/Crown'
import { installMode, promptInstall } from '../lib/platform'

const hl = { hl: <span style={{ color: '#b8860b', fontWeight: 800 }} /> }

function ShareGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 24 26" fill="none" stroke="#1A1408" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v13" />
      <path d="M8 7l4-4 4 4" />
      <path d="M6 12H4v12h16V12h-2" />
    </svg>
  )
}

function PlusGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#1A1408" strokeWidth={2.4} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function AppIcon() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 14,
          background: C.tomato,
          border: `3px solid ${C.sun}`,
          boxShadow: '0 4px 10px -3px rgba(0,0,0,.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'ombraPop .6s cubic-bezier(.2,1.3,.4,1) both',
        }}
      >
        <Crown size={30} fill={C.cream} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700 }}>Ombra</span>
    </div>
  )
}

function Step({ n, icon, text }: { n: string; icon: ReactNode; text: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginTop: 15 }}>
      <span style={display(15, { width: 18, textAlign: 'center' })}>{n}</span>
      <span
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          background: C.sun,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ fontSize: 15, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>{text}</span>
    </div>
  )
}

function LaterButton({ label, onDone, dark }: { label: string; onDone: () => void; dark?: boolean }) {
  return (
    <button
      onClick={onDone}
      style={{
        background: 'none',
        border: 'none',
        width: '100%',
        marginTop: 12,
        ...mono(12, { color: dark ? 'rgba(251,241,219,.7)' : C.muted }),
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

/* ── iOS Safari: coach-mark that points at the real Share button below ── */
function IosCoach({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,12,4,.62)', display: 'flex', flexDirection: 'column', padding: '0 20px' }}>
      <style>{`@keyframes ombraNudge{0%,100%{transform:translateY(0)}50%{transform:translateY(11px)}}`}</style>

      <div style={{ marginTop: '20%', background: C.cream, border: `3px solid ${C.ink}`, borderRadius: 22, padding: '22px 20px' }}>
        <div style={mono(11, { letterSpacing: '.22em', textTransform: 'uppercase', color: C.muted })}>{t('install.iosSafariKicker')}</div>
        <div style={display(24, { marginTop: 7, lineHeight: 1.02 })}>{t('install.getAlertsTitle')}</div>
        <div style={{ fontSize: 14.5, color: C.subtext, marginTop: 10, lineHeight: 1.4 }}>{t('install.getAlertsBody')}</div>
        <Step n="1" icon={<ShareGlyph />} text={<Trans i18nKey="install.step1" components={hl} />} />
        <Step n="2" icon={<PlusGlyph />} text={<Trans i18nKey="install.step2" components={hl} />} />
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 6 }}>
        <div style={{ animation: 'ombraNudge 1s ease-in-out infinite' }}>
          <svg width="46" height="80" viewBox="0 0 46 80" fill="none">
            <path d="M23 4 C 20 30, 26 48, 23 66" stroke={C.sun} strokeWidth="7" strokeLinecap="round" />
            <path d="M11 54 L23 70 L35 54" stroke={C.sun} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <LaterButton label={t('install.maybeLater')} onDone={onDone} dark />
    </div>
  )
}

/* ── iOS but not Safari (Chrome / in-app browser): can't install here ── */
function WrongBrowser({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard
      ?.writeText('https://ombra.wtf')
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2200)
      })
      .catch(() => {})
  }
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.cream, padding: '0 34px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: C.ink }}>
      <div style={{ width: 90, height: 90, borderRadius: '50%', background: C.tomato, border: `4px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 0 ${C.ink}` }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={C.cream} strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M15.5 8.5l-2 5-5 2 2-5z" fill={C.cream} stroke="none" />
        </svg>
      </div>
      <div style={display(26, { marginTop: 24, lineHeight: 1.05 })}>{t('install.wrongBrowserTitle')}</div>
      <div style={{ fontSize: 15, color: C.subtext, marginTop: 14, lineHeight: 1.45 }}>
        <Trans i18nKey="install.wrongBrowserBody" components={hl} />
      </div>
      <button
        onClick={copy}
        style={{ marginTop: 26, background: C.ink, color: C.cream, border: 'none', borderRadius: 16, padding: '16px 26px', ...display(16), display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.cream} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="12" height="12" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {copied ? t('install.copied') : t('install.copyLink')}
      </button>
      <div style={mono(12, { color: C.muted, marginTop: 16, lineHeight: 1.5 })}>{t('install.copyHint')}</div>
      <LaterButton label={t('install.maybeLater')} onDone={onDone} />
    </div>
  )
}

/* ── Android with a captured native prompt: one-tap install ── */
function AndroidPrompt({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  async function install() {
    await promptInstall()
    onDone()
  }
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.cream, padding: '56px 30px 34px', display: 'flex', flexDirection: 'column', color: C.ink }}>
      <div style={mono(12, { letterSpacing: '.22em', textTransform: 'uppercase', color: C.muted })}>{t('install.oneLastThing')}</div>
      <div style={display(34, { lineHeight: 0.98, marginTop: 8 })}>{t('install.getAlertsTitle')}</div>
      <div style={{ fontSize: 15, color: C.subtext, marginTop: 12, lineHeight: 1.4 }}>{t('install.getAlertsBody')}</div>

      <div style={{ marginTop: 24, background: '#FBF4DD', border: `2.5px solid ${C.ink}`, borderRadius: 20, padding: '18px 16px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 54px)', justifyContent: 'center', gap: 14 }}>
          {Array.from({ length: 8 }).map((_, i) =>
            i === 1 ? (
              <div key={i} style={{ display: 'flex', justifyContent: 'center' }}>
                <AppIcon />
              </div>
            ) : (
              <div key={i} style={{ width: 54, height: 54, borderRadius: 14, background: '#D9C89E' }} />
            ),
          )}
        </div>
      </div>

      <div style={mono(12, { textAlign: 'center', color: C.muted, marginTop: 16 })}>{t('install.noStore')}</div>

      <button
        onClick={install}
        style={{ ...btnBlock, marginTop: 'auto', background: C.tomato, color: C.cream, border: `2.5px solid ${C.ink}`, boxShadow: `5px 5px 0 ${C.ink}` }}
      >
        {t('install.addToHome')}
      </button>
      <LaterButton label={t('install.maybeLater')} onDone={onDone} />
    </div>
  )
}

/* ── Desktop / Android without a prompt: plain instructions ── */
function ManualOther({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.cream, padding: '56px 30px 34px', display: 'flex', flexDirection: 'column', color: C.ink }}>
      <div style={mono(12, { letterSpacing: '.22em', textTransform: 'uppercase', color: C.muted })}>{t('install.oneLastThing')}</div>
      <div style={display(34, { lineHeight: 0.98, marginTop: 8 })}>
        {t('install.title1')}
        <br />
        {t('install.title2')}
      </div>
      <div style={{ marginTop: 22, background: C.ink, color: C.cream, borderRadius: 16, padding: 16, fontWeight: 700, fontSize: 15, lineHeight: 1.35 }}>
        <Trans i18nKey="install.other" components={{ hl: <span style={{ color: C.sun }} /> }} />
      </div>
      <div style={mono(12, { textAlign: 'center', color: C.muted, marginTop: 16 })}>{t('install.noStore')}</div>
      <button
        onClick={onDone}
        style={{ ...btnBlock, marginTop: 'auto', background: C.tomato, color: C.cream, border: `2.5px solid ${C.ink}`, boxShadow: `5px 5px 0 ${C.ink}` }}
      >
        {t('install.done')}
      </button>
      <LaterButton label={t('install.maybeLater')} onDone={onDone} />
    </div>
  )
}

export default function Install({ onDone }: { onDone: () => void }) {
  const mode = installMode()
  if (mode === 'ios-safari') return <IosCoach onDone={onDone} />
  if (mode === 'ios-other') return <WrongBrowser onDone={onDone} />
  if (mode === 'android-prompt') return <AndroidPrompt onDone={onDone} />
  return <ManualOther onDone={onDone} />
}
