import type { ReactNode } from 'react'

export interface ToolbarButton {
  icon: ReactNode
  label: string
  onClick?: () => void
  disabled?: boolean
  title?: string
}

export interface ListPageToolbarProps {
  buttons: ToolbarButton[]
  /** Nút "Quay lại" hiển thị bên phải (marginLeft: auto) */
  onQuayLai?: () => void
  quayLaiLabel?: string
}

const toolbarWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 0 6px',
  borderBottom: '1px solid var(--border-strong)',
  marginBottom: '6px',
  flexWrap: 'wrap',
}

const toolbarBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 10px',
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  borderRadius: '4px',
  fontSize: '11px',
  fontFamily: 'inherit',
}

export function ListPageToolbar({ buttons, onQuayLai, quayLaiLabel = '← Quay lại Quy trình' }: ListPageToolbarProps) {
  return (
    <div style={toolbarWrap}>
      {buttons.map((btn, i) => (
        <button
          key={i}
          type="button"
          className="htql-toolbar-btn"
          style={toolbarBtn}
          title={btn.title ?? btn.label}
          onClick={btn.onClick}
          disabled={btn.disabled}
        >
          {btn.icon}
          <span>{btn.label}</span>
        </button>
      ))}
      {onQuayLai != null && (
        <button
          type="button"
          className="htql-toolbar-btn"
          style={{ ...toolbarBtn, marginLeft: 'auto' }}
          onClick={onQuayLai}
        >
          {quayLaiLabel}
        </button>
      )}
    </div>
  )
}
