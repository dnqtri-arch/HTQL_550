import { useState, useMemo } from 'react'
import { X, HelpCircle, Plus, Check, Ban, Search } from 'lucide-react'
import type { NhomKhNccItem } from '../muaHang/nhaCungCap/nhaCungCapApi'
import { ThemNhomKhNccModal } from './themNhomKhNccModal'
import { useDraggable } from '../../../hooks/useDraggable'

interface NhomKhNccLookupModalProps {
  title?: string
  /** Danh sách nhóm (Mã + Tên) */
  items: NhomKhNccItem[]
  /** Giá trị hiện tại (các tên nhóm đã chọn, cách nhau bằng ; hoặc ,) */
  value?: string
  /** Trả về mảng tên nhóm đã chọn */
  onSelect: (tens: string[]) => void
  onClose: () => void
  /** Gọi khi thêm nhóm mới từ form Thêm Nhóm KH/NCC */
  onSaveNewGroup?: (item: NhomKhNccItem) => void
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
  width: 560,
  height: 440,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
  overflow: 'hidden',
  pointerEvents: 'auto',
}

/** Tiêu đề và nút đóng nổi bật (vàng/cam) */
const headerStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'var(--bg-tab)',
  fontSize: '13px',
  fontFamily: "var(--font-misa, 'Tahoma', Arial, sans-serif)",
  fontWeight: 600,
  color: 'var(--accent)',
}

const filterLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--accent)',
  flexShrink: 0,
  minWidth: 28,
}

const filterInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 24px 4px 8px',
  fontSize: 11,
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  color: 'var(--text-primary)',
  boxSizing: 'border-box',
  height: 28,
}

const filterIconStyle: React.CSSProperties = {
  position: 'absolute',
  right: 8,
  top: '50%',
  transform: 'translateY(-50%)',
  pointerEvents: 'none',
  color: 'var(--text-muted)',
}

const footerStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderTop: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  background: 'var(--bg-tab)',
  flexShrink: 0,
}

const btnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 12px',
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
  borderColor: 'var(--accent)',
}

/** Nút Giúp tròn, cam */
const btnHelpStyle: React.CSSProperties = {
  ...btnStyle,
  width: 32,
  height: 32,
  padding: 0,
  borderRadius: '50%',
  justifyContent: 'center',
  background: 'var(--accent)',
  color: 'var(--accent-text)',
  borderColor: 'var(--accent)',
}

export function NhomKhNccLookupModal({
  title = 'Chọn nhóm khách hàng, nhà cung cấp',
  items: itemsProp,
  value = '',
  onSelect,
  onClose,
  onSaveNewGroup,
}: NhomKhNccLookupModalProps) {
  const [items, setItems] = useState<NhomKhNccItem[]>(itemsProp)
  const [filterMa, setFilterMa] = useState('')
  const [filterTen, setFilterTen] = useState('')
  const [selectedTens, setSelectedTens] = useState<Set<string>>(() => {
    const parts = (value || '').split(/[;,]/).map((s) => s.trim()).filter(Boolean)
    return new Set(parts)
  })
  const [showThemNhomKhNcc, setShowThemNhomKhNcc] = useState(false)
  const { containerRef, containerStyle, dragHandleProps } = useDraggable()

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

  const toggleRow = (ten: string) => {
    setSelectedTens((prev) => {
      const next = new Set(prev)
      if (next.has(ten)) next.delete(ten)
      else next.add(ten)
      return next
    })
  }

  const handleOk = () => {
    onSelect(Array.from(selectedTens))
    onClose()
  }

  const handleSaveNewGroup = (item: NhomKhNccItem) => {
    onSaveNewGroup?.(item)
    setItems((prev) => [...prev, item])
    setSelectedTens((prev) => new Set([...prev, item.ten]))
    setShowThemNhomKhNcc(false)
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
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Ô tìm kiếm và bảng: hàng đầu là Mã/Tên, thẳng cột với dữ liệu */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ width: 40, padding: '6px 8px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }} />
                  <th style={{ width: '30%', padding: '6px 8px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={filterLabelStyle}>Mã</span>
                      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                        <input
                          type="text"
                          placeholder=""
                          value={filterMa}
                          onChange={(e) => setFilterMa(e.target.value)}
                          style={{ ...filterInputStyle, width: '100%' }}
                        />
                        <Search size={14} style={filterIconStyle} />
                      </div>
                    </div>
                  </th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={filterLabelStyle}>Tên</span>
                      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                        <input
                          type="text"
                          placeholder=""
                          value={filterTen}
                          onChange={(e) => setFilterTen(e.target.value)}
                          style={{ ...filterInputStyle, width: '100%' }}
                        />
                        <Search size={14} style={filterIconStyle} />
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const isSelected = selectedTens.has(row.ten)
                  return (
                    <tr
                      key={row.ma}
                      onClick={() => toggleRow(row.ten)}
                      style={{
                        background: isSelected ? 'var(--row-selected-bg)' : undefined,
                        color: isSelected ? 'var(--row-selected-text)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <td style={{ padding: '8px 10px', borderRight: '1px solid var(--border)', width: 40, verticalAlign: 'middle' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(row.ten)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px', borderRight: '1px solid var(--border)', width: '30%' }}>{row.ma}</td>
                      <td style={{ padding: '8px 10px' }}>{row.ten}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={footerStyle}>
          <button type="button" style={btnHelpStyle} title="Giúp">
            <HelpCircle size={16} style={{ color: 'var(--accent-text)' }} />
          </button>
          {onSaveNewGroup && (
            <button type="button" style={btnPrimary} onClick={() => setShowThemNhomKhNcc(true)}>
              <Plus size={14} />
              <span>Thêm nhanh</span>
            </button>
          )}
          <button type="button" style={btnPrimary} onClick={handleOk}>
            <Check size={14} />
            <span>Đồng ý</span>
          </button>
          <button type="button" style={{ ...btnStyle, color: 'var(--text-muted)' }} onClick={onClose}>
            <Ban size={14} />
            <span>Hủy bỏ</span>
          </button>
        </div>
      </div>

      {showThemNhomKhNcc && onSaveNewGroup && (
        <ThemNhomKhNccModal
          parentOptions={items}
          onClose={() => setShowThemNhomKhNcc(false)}
          onSave={handleSaveNewGroup}
          onSaveAndAdd={(item) => {
            onSaveNewGroup(item)
            setItems((prev) => [...prev, item])
            setSelectedTens((prev) => new Set([...prev, item.ten]))
          }}
        />
      )}
    </div>
  )
}
