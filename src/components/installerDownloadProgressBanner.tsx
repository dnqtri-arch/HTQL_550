/**
 * May tram Electron: popup tien trinh tai ban cai (IPC tu main).
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

function formatBytesVi(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B'
  if (n < 1024) return `${Math.round(n)} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function formatSpeedVi(bps: number): string {
  if (!Number.isFinite(bps) || bps <= 0) return '—'
  return `${formatBytesVi(bps)}/s`
}

export function InstallerDownloadProgressBanner() {
  const [state, setState] = useState<{
    received: number
    total: number | null
    bytesPerSecond: number
  } | null>(null)

  useEffect(() => {
    const d = typeof window !== 'undefined' ? window.htqlDesktop : undefined
    if (!d?.onInstallerDownloadProgress) return undefined
    return d.onInstallerDownloadProgress((p) => {
      if (p.done) {
        setState(null)
        return
      }
      setState({
        received: p.received,
        total: p.total,
        bytesPerSecond: typeof p.bytesPerSecond === 'number' ? p.bytesPerSecond : 0,
      })
    })
  }, [])

  if (!state || typeof document === 'undefined') return null

  const pct =
    state.total != null && state.total > 0
      ? Math.min(100, Math.round((100 * state.received) / state.total))
      : null

  const panel = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="htql-installer-dl-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        boxSizing: 'border-box',
        background: 'rgba(15, 12, 6, 0.14)',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          width: 420,
          maxWidth: '100%',
          padding: '18px 20px',
          borderRadius: 10,
          border: '1px solid #d97706',
          background: 'linear-gradient(165deg, #fffbeb 0%, #fef3c7 100%)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        }}
      >
        <div
          id="htql-installer-dl-title"
          style={{ fontSize: 13, fontWeight: 700, color: '#1a1408', marginBottom: 12, textAlign: 'center' }}
        >
          {'\u0110ang t\u1ea3i b\u1ea3n c\u00e0i \u0111\u1eb7t'}
        </div>
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            fontSize: 12,
            fontWeight: 600,
            color: '#292524',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            {pct != null ? (
              <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 15 }}>{pct}%</span>
            ) : (
              <span>{'\u0110ang t\u1ea3i\u2026'}</span>
            )}
            <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.9 }}>
              {formatBytesVi(state.received)}
              {state.total != null && state.total > 0 ? ` / ${formatBytesVi(state.total)}` : ''}
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }} title={'T\u1ed1c \u0111\u1ed9 t\u1ea3i'}>
              {formatSpeedVi(state.bytesPerSecond)}
            </span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: 'rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: pct != null ? `${pct}%` : '36%',
                background: 'linear-gradient(90deg, #d97706, #b45309)',
                transition: 'width 0.18s ease-out',
              }}
            />
          </div>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#57534e', textAlign: 'center' }}>
            {'Vui l\u00f2ng kh\u00f4ng \u0111\u00f3ng c\u1eeda s\u1ed5 cho t\u1edbi khi t\u1ea3i xong.'}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(panel, document.body)
}
