import { useRef } from 'react'
import { X } from 'lucide-react'

interface DanhMucLookupModalProps {
  title: string
  items: { id: string; label: string }[]
  onSelect: (id: string) => void
  onClose: () => void
}

export function DanhMucLookupModal({ title, items, onSelect, onClose }: DanhMucLookupModalProps) {
  const overlayMouseDownRef = useRef(false)
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) overlayMouseDownRef.current = true }}
      onClick={(e) => { if (e.target === e.currentTarget && overlayMouseDownRef.current) onClose(); overlayMouseDownRef.current = false }}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid #9ca3af',
          borderRadius: 4,
          width: 400,
          maxHeight: 400,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
        onMouseDown={() => { overlayMouseDownRef.current = false }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid #9ca3af',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f3f4f6',
            fontSize: 11,
            fontFamily: "'Tahoma', Arial, sans-serif",
            fontWeight: 'bold',
          }}
        >
          <span>{title}</span>
          <button type="button" onClick={onClose} style={{ padding: 2, background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, maxHeight: 320 }}>
          {items.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(item.id)}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(item.id)}
              style={{
                padding: '6px 12px',
                fontSize: 11,
                fontFamily: "'Tahoma', Arial, sans-serif",
                cursor: 'pointer',
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
