import { useState, useMemo } from 'react'
import { X, HelpCircle, Plus, Check, Ban, Search } from 'lucide-react'
import { ThemNhomVTHHModal } from './themNhomVTHHModal'
import { useDraggable } from '../../hooks/useDraggable'

export interface NhomVTHHItem {
  id: string
  ma: string
  ten: string
}

interface NhomVTHHLookupModalProps {
  title?: string
  items: NhomVTHHItem[]
  /** Giá trị hiện tại (các mã cách nhau bằng ;) để pre-chọn */
  value?: string
  onSelect: (ids: string[]) => void
  onClose: () => void
  onThemNhanh?: () => void
  onSaveNewGroup?: (item: NhomVTHHItem) => void
}

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 4000,
  pointerEvents: 'none',
}

const modalBox: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  width: 640,
  height: 480,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
  overflow: 'hidden',
  pointerEvents: 'auto',
}

const headerStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'var(--bg-tab)',
  fontSize: '12px',
  fontFamily: "var(--font-misa, 'Tahoma', Arial, sans-serif)",
  fontWeight: 600,
  color: 'var(--text-primary)',
}

const tableWrap: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '11px',
  fontFamily: "var(--font-misa, 'Tahoma', Arial, sans-serif)",
  tableLayout: 'fixed',
}

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  background: 'var(--bg-tab-active)',
  color: 'var(--text-primary)',
  borderBottom: '2px solid var(--border)',
  borderRight: '1px solid var(--border)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
}

const thRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  width: '100%',
}

const filterInputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  width: '100%',
  padding: '2px 20px 2px 6px',
  fontSize: '11px',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 2,
  color: 'var(--text-primary)',
  boxSizing: 'border-box',
}

const filterWrapStyle: React.CSSProperties = {
  position: 'relative',
  flex: 1,
  minWidth: 0,
  width: 0,
}

const filterWrapStyleMa: React.CSSProperties = {
  position: 'relative',
  flex: 1,
  minWidth: 0,
}

const filterIconStyle: React.CSSProperties = {
  position: 'absolute',
  right: 2,
  top: '50%',
  transform: 'translateY(-50%)',
  marginTop: 2,
  pointerEvents: 'none',
  color: 'var(--text-muted)',
}

const footerStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderTop: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: 'var(--bg-tab)',
  flexShrink: 0,
}

const btnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 10px',
  fontSize: 11,
  fontFamily: "var(--font-misa, 'Tahoma', Arial, sans-serif)",
  border: '1px solid var(--border)',
  borderRadius: 4,
  cursor: 'pointer',
  background: 'var(--bg-tab-active)',
  color: 'var(--text-primary)',
}

const btnPrimary: React.CSSProperties = {
  ...btnStyle,
  background: 'var(--accent)',
  color: 'var(--accent-text)',
  borderColor: 'var(--connector)',
}

const btnDanger: React.CSSProperties = {
  ...btnStyle,
  color: 'var(--text-muted)',
}

export function NhomVTHHLookupModal({
  title = 'Chọn nhóm vật tư, hàng hóa, dịch vụ',
  items,
  value = '',
  onSelect,
  onClose,
  onThemNhanh: _onThemNhanh,
  onSaveNewGroup,
}: NhomVTHHLookupModalProps) {
  const [filterMa, setFilterMa] = useState('')
  const [filterTen, setFilterTen] = useState('')
  const { containerRef, containerStyle, dragHandleProps } = useDraggable()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const ids = value.split(';').map((s) => s.trim()).filter(Boolean)
    return new Set(ids)
  })
  const [showThemNhom, setShowThemNhom] = useState(false)

  const filtered = useMemo(() => {
    const ma = filterMa.trim().toLowerCase()
    const ten = filterTen.trim().toLowerCase()
    if (!ma && !ten) return items
    return items.filter(
      (row) =>
        (!ma || row.ma.toLowerCase().includes(ma)) &&
        (!ten || row.ten.toLowerCase().includes(ten))
    )
  }, [items, filterMa, filterTen])

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleOk = () => {
    const ids = Array.from(selectedIds)
    onSelect(ids)
    onClose()
  }

  return (
    <div style={modalOverlay}>
      <div ref={containerRef} style={{ ...modalBox, ...containerStyle }}>
        <div style={{ ...headerStyle, ...dragHandleProps.style }} onMouseDown={dragHandleProps.onMouseDown}>
          <span>{title}</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: 2,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div style={tableWrap}>
          <table style={tableStyle}>
            <colgroup>
              <col style={{ width: 36 }} />
              <col style={{ width: 155 }} />
              <col style={{ width: 'calc(100% - 191px)' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 36 }} />
                <th style={{ ...thStyle, width: 155, boxSizing: 'border-box', overflow: 'hidden' }}>
                  <div style={{ ...thRowStyle, minWidth: 0 }}>
                    <span style={{ flexShrink: 0 }}>Mã</span>
                    <div style={filterWrapStyleMa}>
                      <input
                        type="text"
                        placeholder=""
                        value={filterMa}
                        onChange={(e) => setFilterMa(e.target.value)}
                        style={filterInputStyle}
                      />
                      <Search size={12} style={filterIconStyle} />
                    </div>
                  </div>
                </th>
                <th style={{ ...thStyle, borderRight: 'none', width: 'calc(100% - 191px)', boxSizing: 'border-box', overflow: 'hidden' }}>
                  <div style={{ ...thRowStyle, minWidth: 0 }}>
                    <span style={{ flexShrink: 0 }}>Tên</span>
                    <div style={filterWrapStyle}>
                      <input
                        type="text"
                        placeholder=""
                        value={filterTen}
                        onChange={(e) => setFilterTen(e.target.value)}
                        style={filterInputStyle}
                      />
                      <Search size={12} style={filterIconStyle} />
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const isSelected = selectedIds.has(row.id)
                return (
                  <tr
                    key={row.id}
                    onClick={() => toggleRow(row.id)}
                    style={{
                      background: isSelected ? 'var(--row-selected-bg)' : undefined,
                      color: isSelected ? 'var(--row-selected-text)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <td style={{ padding: '4px 8px', borderRight: '1px solid var(--border)' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(row.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '4px 8px', borderRight: '1px solid var(--border)' }}>
                      {row.ma}
                    </td>
                    <td style={{ padding: '4px 8px' }}>{row.ten}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={footerStyle}>
          <button type="button" style={btnStyle} title="Giúp">
            <HelpCircle size={14} color="var(--accent)" />
            <span>Giúp</span>
          </button>
          {onSaveNewGroup && (
            <button type="button" style={btnPrimary} onClick={() => setShowThemNhom(true)}>
              <Plus size={14} />
              <span>Thêm nhanh</span>
            </button>
          )}
          <button
            type="button"
            style={btnPrimary}
            onClick={handleOk}
          >
            <Check size={14} />
            <span>Đồng ý</span>
          </button>
          <button type="button" style={btnDanger} onClick={onClose}>
            <Ban size={14} />
            <span>Hủy bỏ</span>
          </button>
        </div>
      </div>

      {showThemNhom && onSaveNewGroup && (
        <ThemNhomVTHHModal
          parentOptions={items}
          onClose={() => setShowThemNhom(false)}
          onSave={(item) => {
            onSaveNewGroup(item)
            setShowThemNhom(false)
          }}
          onSaveAndAdd={(item) => {
            onSaveNewGroup(item)
          }}
        />
      )}
    </div>
  )
}
