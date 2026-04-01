import { useState, useMemo, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import type { NhomKhachHangItem } from './khachHangApi'

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

const dkttRowStyle = (selected: boolean): React.CSSProperties => ({
  padding: '6px 10px',
  cursor: 'pointer',
  fontSize: 12,
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: selected ? 'var(--row-selected-bg)' : undefined,
  color: selected ? 'var(--row-selected-text)' : 'var(--text-primary)',
})

export interface NhomKhachHangInlinePickerProps {
  open: boolean
  /** Vùng neo (ô + chevron + nút +): bấm ra ngoài vùng này thì ghi nhận chọn và đóng. */
  anchorRef: React.RefObject<HTMLElement | null>
  items: NhomKhachHangItem[]
  value: string
  onCommit: (tens: string[]) => void
  onOpenChange: (open: boolean) => void
  /** Mỗi lần tick/bỏ tick: cập nhật ô hiển thị ngay (dropdown vẫn mở). */
  onLiveSelectionChange?: (tens: string[]) => void
}

/** Dropdown neo dưới ô — không nút Đồng ý/Hủy; bấm ra ngoài anchor thì áp dụng. z-index > 4000 trong modal. */
export function NhomKhachHangInlinePicker({
  open,
  anchorRef,
  items: itemsProp,
  value,
  onCommit,
  onOpenChange,
  onLiveSelectionChange,
}: NhomKhachHangInlinePickerProps) {
  const [items, setItems] = useState<NhomKhachHangItem[]>(itemsProp)
  const [filterText, setFilterText] = useState('')
  const [selectedTens, setSelectedTens] = useState<Set<string>>(new Set())
  const selectedTensRef = useRef(selectedTens)
  selectedTensRef.current = selectedTens

  useEffect(() => {
    if (open) {
      const parts = (value || '').split(/[;,]/).map((s) => s.trim()).filter(Boolean)
      setSelectedTens(new Set(parts))
      setFilterText('')
      setItems(itemsProp)
    }
  }, [open, value, itemsProp])

  const filtered = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (row) =>
        row.ma.toLowerCase().includes(q) ||
        row.ten.toLowerCase().includes(q)
    )
  }, [items, filterText])

  const toggleRow = (ten: string) => {
    setSelectedTens((prev) => {
      const next = new Set(prev)
      if (next.has(ten)) next.delete(ten)
      else next.add(ten)
      const arr = Array.from(next)
      onLiveSelectionChange?.(arr)
      return next
    })
  }

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      const el = anchorRef.current
      if (el && !el.contains(e.target as Node)) {
        onCommit(Array.from(selectedTensRef.current))
        onOpenChange(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open, anchorRef, onCommit, onOpenChange])

  if (!open) return null

  return (
    <div
      data-nhom-kh-dropdown
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '100%',
        marginTop: 2,
        zIndex: 4100,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 280,
        overflow: 'hidden',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Lọc mã hoặc tên..."
            style={{ ...filterInputStyle, width: '100%' }}
          />
          <Search size={14} style={filterIconStyle} />
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', maxHeight: 220 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
            Không có dòng phù hợp.
          </div>
        ) : (
          filtered.map((row) => {
            const isSelected = selectedTens.has(row.ten)
            return (
              <div
                key={row.ma}
                role="option"
                onClick={() => toggleRow(row.ten)}
                style={dkttRowStyle(isSelected)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleRow(row.ten)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ flex: 1, minWidth: 0 }}>
                  {row.ma} — {row.ten}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
