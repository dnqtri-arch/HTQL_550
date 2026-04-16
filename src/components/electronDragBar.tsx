/**
 * Vùng kéo cửa sổ (Electron frameless). Không che titleBarOverlay — chỉ bổ sung vùng drag phía dưới nút hệ thống nếu cần.
 */
const dragBar: React.CSSProperties = {
  height: 36,
  minHeight: 36,
  flexShrink: 0,
  background: 'linear-gradient(180deg, #2d1f0f 0%, #1a1408 100%)',
  borderBottom: '1px solid rgba(212, 175, 55, 0.35)',
  WebkitAppRegion: 'drag',
} as React.CSSProperties & { WebkitAppRegion?: string }

const titleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.04em',
  color: '#f0d78c',
  textShadow: '0 1px 2px rgba(0,0,0,0.45)',
  userSelect: 'none',
}

export function ElectronDragBar() {
  if (typeof window === 'undefined' || !window.htqlDesktop?.isElectron) return null
  return (
    <div style={dragBar} data-htql-electron-drag>
      <div style={titleStyle}>HTQL_550 — Nam Bắc AD</div>
    </div>
  )
}
