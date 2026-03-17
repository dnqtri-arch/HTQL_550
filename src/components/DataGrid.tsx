import type { ReactNode } from 'react'

export interface DataGridColumn<T> {
  key: keyof T | string
  label: string
  width?: number | string
  align?: 'left' | 'right' | 'center'
  type?: 'text' | 'number' | 'date'
  filterable?: boolean
  /** Tùy chỉnh nội dung ô (value, full row) */
  renderCell?: (value: unknown, row: T) => ReactNode
}

export interface DataGridSortState {
  key: string
  direction: 'asc' | 'desc'
}

export interface DataGridProps<T extends object> {
  columns: DataGridColumn<T>[]
  data: T[]
  keyField: keyof T | string
  summary?: { label: string; value: string | number }[]
  maxHeight?: number
  /** Chiều cao cố định hoặc '100%' để lấp đầy container (dòng cuối/footer sát mép dưới) */
  height?: number | string
  selectedRowId?: string | number | null
  onRowSelect?: (row: T) => void
  /** Gọi khi double-click vào dòng (vd: mở form sửa) */
  onRowDoubleClick?: (row: T) => void
  /** Gọi khi chuột phải trên dòng (menu ngữ cảnh) */
  onRowContextMenu?: (row: T, e: React.MouseEvent<HTMLTableRowElement>) => void
  /** Chế độ bảng gọn: font nhỏ hơn, khoảng cách dòng hẹp */
  compact?: boolean
  /** Độ trễ (ms) trước khi áp dụng bộ lọc khi gõ (mặc định 200). Đặt 0 để tắt debounce. */
  filterDebounceMs?: number
  /** Các cột cho phép sort khi click tiêu đề. */
  sortableColumns?: string[]
  /** Trạng thái sắp xếp hiện tại (có thể nhiều cột). */
  sortState?: DataGridSortState[]
  /** Gọi khi người dùng click tiêu đề cột để đổi thứ tự sắp xếp. */
  onSortChange?: (next: DataGridSortState[]) => void
}

const tableWrap: React.CSSProperties = {
  border: '0.5px solid var(--border)',
  borderRadius: '4px',
  overflow: 'hidden',
  background: 'var(--bg-secondary)',
}

const tableStyles: React.CSSProperties = {
  width: '100%',
  minWidth: '100%',
  tableLayout: 'fixed',
  borderCollapse: 'collapse',
  fontSize: '12px',
}

const thStyles: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 1,
  background: 'var(--bg-tab)',
  color: 'var(--text-primary)',
  padding: '4px 6px',
  textAlign: 'left',
  borderBottom: '0.5px solid var(--border)',
  borderRight: '0.5px solid var(--border)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
}

const tdStyles: React.CSSProperties = {
  padding: '3px 6px',
  borderBottom: '0.5px solid var(--border)',
  borderRight: '0.5px solid var(--border)',
  color: 'var(--text-primary)',
}

const footerStyles: React.CSSProperties = {
  position: 'sticky',
  bottom: 0,
  background: 'var(--bg-tab)',
  borderTop: '0.5px solid var(--border)',
  padding: '4px 8px',
  fontSize: '11px',
  color: 'var(--accent)',
  fontWeight: 600,
  display: 'flex',
  gap: '16px',
  flexWrap: 'wrap',
}

export function DataGrid<T extends object>({
  columns,
  data,
  keyField,
  summary = [],
  maxHeight = 320,
  height,
  selectedRowId = null,
  onRowSelect,
  onRowDoubleClick,
  onRowContextMenu,
  compact = false,
  filterDebounceMs: _filterDebounceMs = 200,
  sortableColumns = [],
  sortState,
  onSortChange,
}: DataGridProps<T>) {
  const tableStyle = compact ? { ...tableStyles, fontSize: '11px' } : tableStyles
  const thStyle = compact ? { ...thStyles, padding: '2px 4px' } : thStyles
  const tdStyle = compact ? { ...tdStyles, padding: '2px 4px' } : tdStyles

  const filteredData = data

  const wrapStyle: React.CSSProperties = height != null
    ? { ...tableWrap, height, minHeight: 0, display: 'flex', flexDirection: 'column' }
    : { ...tableWrap, maxHeight: maxHeight + 2, display: 'flex', flexDirection: 'column' }

  return (
    <div style={wrapStyle}>
      <div style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {columns.map((col) => (
                (() => {
                  const colKey = String(col.key)
                  const isSortable = sortableColumns.includes(colKey)
                  const activeSort = sortState?.find((s) => s.key === colKey)
                  const sortIcon =
                    activeSort != null ? (activeSort.direction === 'asc' ? '▲' : '▼') : '⇅'
                  return (
                <th
                  key={colKey}
                  style={{
                    ...thStyle,
                    width: col.width ?? 'auto',
                    minWidth: typeof col.width === 'number' ? col.width : undefined,
                    textAlign: col.align ?? 'left',
                    cursor: isSortable ? 'pointer' : thStyle.cursor,
                  }}
                  onClick={() => {
                    if (!isSortable || !onSortChange) return
                    const current = sortState ?? []
                    const existing = current.find((s) => s.key === colKey)
                    let next: DataGridSortState[]
                    if (!existing) {
                      next = [{ key: colKey, direction: 'asc' }, ...current]
                    } else {
                      const newDir = existing.direction === 'asc' ? 'desc' : 'asc'
                      next = [{ key: colKey, direction: newDir }, ...current.filter((s) => s.key !== colKey)]
                    }
                    onSortChange(next)
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span>{col.label}</span>
                    {isSortable && (
                      <span
                        style={{
                          fontSize: 10,
                          color: activeSort ? 'var(--accent)' : 'var(--text-muted)',
                        }}
                      >
                        {sortIcon}
                      </span>
                    )}
                  </span>
                </th>
                  )
                })()
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, idx) => {
              const rowId = row[keyField as keyof T]
              const isSelected = selectedRowId != null && rowId === selectedRowId
              return (
                <tr
                  key={String(rowId ?? idx)}
                  style={{
                    background: isSelected ? 'var(--row-selected-bg)' : undefined,
                    color: isSelected ? 'var(--row-selected-text)' : undefined,
                    boxShadow: isSelected ? 'inset 0 0 0 2px var(--row-selected-border)' : undefined,
                    cursor: onRowSelect || onRowDoubleClick ? 'pointer' : undefined,
                  }}
                  onClick={() => onRowSelect?.(row)}
                  onDoubleClick={() => onRowDoubleClick?.(row)}
                  onContextMenu={(e) => onRowContextMenu?.(row, e)}
                >
                  {columns.map((col) => {
                    const cell = row[col.key as keyof T]
                    const content =
                      col.renderCell != null ? col.renderCell(cell, row) : cell != null ? String(cell) : ''
                    return (
                      <td
                        key={String(col.key)}
                        style={{
                          ...tdStyle,
                          textAlign: col.align ?? 'left',
                        }}
                      >
                        {content}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {summary.length > 0 && (
        <div style={footerStyles}>
          {summary.map((s, i) => (
            <span key={i}>
              {s.label}: {s.value}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
