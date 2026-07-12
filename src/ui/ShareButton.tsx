import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { btnBlock, C } from './tokens'
import { track } from '../lib/analytics'
import { buildShareUrl, shareCrown } from '../lib/share'

// The "steal my crown" share trigger. `primary` is the loud CTA on the win screen; `compact`
// is the pill shown on a leaderboard the viewer currently holds.
export default function ShareButton({
  terraceId,
  terraceName,
  handle,
  label,
  variant = 'primary',
}: {
  terraceId: string
  terraceName: string
  handle: string
  label: string
  variant?: 'primary' | 'compact'
}) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  // Called straight from onClick (no prior await) so navigator.share keeps its activation.
  function onShare() {
    const url = buildShareUrl(terraceId, handle)
    const text = t('share.text', { terrace: terraceName })
    void shareCrown({ url, title: t('share.title'), text }).then((result) => {
      track('crown_share', { terrace: terraceId, result })
      if (result === 'copied') {
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      }
    })
  }

  const text = copied ? t('share.copied') : label

  if (variant === 'compact') {
    return (
      <button
        onClick={onShare}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          background: C.tomato,
          color: C.cream,
          border: `2px solid ${C.ink}`,
          borderRadius: 999,
          padding: '5px 11px',
          fontWeight: 800,
          fontSize: 12,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </button>
    )
  }

  return (
    <button
      onClick={onShare}
      style={{ ...btnBlock, borderRadius: 16, padding: 17, fontSize: 17, background: C.tomato, color: C.cream, marginBottom: 8 }}
    >
      {text}
    </button>
  )
}
