import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Avatar from '../ui/Avatar'
import { checkHandle } from '../lib/api'
import { fileToDataUrl } from '../lib/image'
import { btnBlock, C, display, mono } from '../ui/tokens'

export default function Handle({
  handle,
  setHandle,
  avatar,
  setAvatar,
  busy,
  error,
  onBack,
  onContinue,
}: {
  handle: string
  setHandle: (v: string) => void
  avatar: string | null
  setAvatar: (v: string | null) => void
  busy: boolean
  error: string | null
  onBack: () => void
  onContinue: () => void
}) {
  const { t } = useTranslation()
  const clean = handle.replace(/[^a-z0-9_.]/gi, '').toLowerCase()

  const [avail, setAvail] = useState<null | boolean>(null)
  const [checking, setChecking] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    if (clean.length < 2) {
      setAvail(null)
      return
    }
    setChecking(true)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setAvail(await checkHandle(clean))
      setChecking(false)
    }, 350)
    return () => clearTimeout(debounce.current)
  }, [clean])

  const canContinue = clean.length >= 2 && avail !== false && !checking && !busy

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setAvatar(await fileToDataUrl(f))
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: C.cream,
        padding: '56px 30px 34px',
        display: 'flex',
        flexDirection: 'column',
        color: C.ink,
      }}
    >
      <button
        onClick={onBack}
        style={{
          alignSelf: 'flex-start',
          background: 'none',
          border: 'none',
          ...display(22),
          cursor: 'pointer',
        }}
      >
        ←
      </button>
      <div style={mono(12, { letterSpacing: '.22em', textTransform: 'uppercase', color: C.muted, marginTop: 14 })}>
        {t('handle.step')}
      </div>
      <div style={display(38, { lineHeight: 0.95, marginTop: 8 })}>
        {t('handle.title1')}
        <br />
        {t('handle.title2')}
      </div>

      <div style={{ marginTop: 34, display: 'flex', alignItems: 'center', gap: 16 }}>
        <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0, lineHeight: 0 }}>
          <Avatar name={clean || 'm'} src={avatar} size={72} ring={C.ink} />
          <span
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: C.ink,
              color: C.sun,
              border: `2px solid ${C.cream}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            +
          </span>
          <input type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
        </label>
        <label
          style={{
            flex: 1,
            minWidth: 0,
            background: '#fff',
            border: `2.5px solid ${C.ink}`,
            borderRadius: 14,
            padding: '15px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            boxShadow: `4px 4px 0 ${C.ink}`,
          }}
        >
          <span style={display(22, { color: C.muted })}>@</span>
          <input
            value={clean}
            onChange={(e) => setHandle(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={20}
            placeholder={t('handle.placeholder')}
            style={{
              ...display(22),
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              padding: 0,
              caretColor: C.tomato,
            }}
          />
        </label>
      </div>

      <div
        style={mono(12, {
          color: error || avail === false ? C.tomato : avail ? C.greenText : C.muted,
          marginTop: 12,
        })}
      >
        {error
          ? t('handle.errPrefix', { error })
          : clean.length < 2
            ? t('handle.typeToClaim')
            : checking
              ? t('handle.checking')
              : avail === false
                ? t('handle.taken', { name: clean })
                : t('handle.upForGrabs', { name: clean })}
      </div>

      <button
        onClick={onContinue}
        disabled={!canContinue}
        style={{
          ...btnBlock,
          marginTop: 'auto',
          background: C.ink,
          color: C.cream,
          opacity: canContinue ? 1 : 0.4,
        }}
      >
        {busy ? t('handle.creating') : t('handle.continue')}
      </button>
    </div>
  )
}
