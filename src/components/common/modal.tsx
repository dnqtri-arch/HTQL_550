import type { ReactNode } from 'react'
import { useDraggable } from '../../hooks/useDraggable'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** Kích thước/kiểu: 'sm' | 'md' | 'lg' | 'full' */
  size?: 'sm' | 'md' | 'lg' | 'full'
  /** Click overlay để đóng (mặc định false — tránh đóng khi bấm ô rồi rê chuột ra ngoài) */
  closeOnOverlayClick?: boolean
}

const sizeStyles: Record<'sm' | 'md' | 'lg' | 'full', React.CSSProperties> = {
  sm: { minWidth: 320, maxWidth: '90vw' },
  md: { minWidth: 400, maxWidth: '90vw' },
  lg: { minWidth: 560, maxWidth: '90vw' },
  full: { width: '90vw', maxWidth: 820, height: '85vh', maxHeight: '85vh' },
}

/** Overlay trong suốt — chỉ để bắt click ngoài, không làm tối màn hình */
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 4000,
  pointerEvents: 'none',
}

const boxBase: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-strong)',
  borderRadius: '6px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
  display: 'flex',
  flexDirection: 'column',
  pointerEvents: 'auto',
}

const headerStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--border-strong)',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--accent)',
  cursor: 'move',
  userSelect: 'none',
}

const bodyStyle: React.CSSProperties = {
  padding: '12px',
  overflow: 'auto',
  flex: 1,
  minHeight: 0,
}

const footerStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderTop: '1px solid var(--border-strong)',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = false,
}: ModalProps) {
  const { containerRef, containerStyle, dragHandleProps } = useDraggable()

  if (!open) return null

  const handleOverlayClick = () => {
    if (closeOnOverlayClick) onClose()
  }

  return (
    <div style={overlayStyle} onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div
        ref={containerRef}
        style={{ ...boxBase, ...sizeStyles[size], ...containerStyle }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          id="modal-title"
          style={headerStyle}
          onMouseDown={dragHandleProps.onMouseDown}
        >
          {title}
        </div>
        <div style={bodyStyle}>
          {children}
        </div>
        {footer != null && <div style={footerStyle}>{footer}</div>}
      </div>
    </div>
  )
}
