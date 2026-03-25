const footerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '4px 12px',
  background: 'var(--bg-secondary)',
  borderTop: '2px solid var(--border-strong)',
  fontSize: '11px',
  color: 'var(--text-muted)',
}

export function AppFooter() {
  const now = new Date()
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('vi-VN')
  return (
    <footer style={footerStyles}>
      <div>
        <span>Máy chủ: HTQL_550</span>
        <span style={{ marginLeft: '16px' }}>Tên DLKT: HTQL_550_DL</span>
      </div>
      <div>
        <span>HTQL_550 - Hệ thống đa phân hệ</span>
        <span style={{ marginLeft: '16px' }}>{timeStr} {dateStr}</span>
      </div>
    </footer>
  )
}
