import { useState } from 'react'
import type { ReactNode } from 'react'
import { useDebouncedValue } from '../utils/useDebouncedValue'

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

export interface DataGridProps<T extends object> {
  columns: DataGridColumn<T>[]
  data: T[]
  keyField: keyof T | string
  summary?: { label: string; value: string | number }[]
  maxHeight?: number
  selectedRowId?: string | number | null
  onRowSelect?: (row: T) => void
  /** Gọi khi double-click vào dòng (vd: mở form sửa) */
  onRowDoubleClick?: (row: T) => void
  /** Chế độ bảng gọn: font nhỏ hơn, khoảng cách dòng hẹp */
  compact?: boolean
  /** Độ trễ (ms) trước khi áp dụng bộ lọc khi gõ (mặc định 200). Đặt 0 để tắt debounce. */
  filterDebounceMs?: number
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

const filterInputStyles: React.CSSProperties = {
  width: '100%',
  marginTop: '2px',
  padding: '2px 4px',
  fontSize: '10px',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: '2px',
  color: 'var(--text-primary)',
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
  selectedRowId = null,
  onRowSelect,
  onRowDoubleClick,
  compact = false,
  filterDebounceMs = 200,
}: DataGridProps<T>) {
  const [filterInputs, setFilterInputs] = useState<Record<string, string>>({})
  const debouncedFilters = useDebouncedValue(filterInputs, filterDebounceMs)

  const tableStyle = compact ? { ...tableStyles, fontSize: '11px' } : tableStyles
  const thStyle = compact ? { ...thStyles, padding: '2px 4px' } : thStyles
  const tdStyle = compact ? { ...tdStyles, padding: '2px 4px' } : tdStyles

  const filteredData = data.filter((row) => {
    return columns.every((col) => {
      const filterVal = debouncedFilters[String(col.key)]
      if (!filterVal) return true
      const cell = row[col.key as keyof T]
      const str = cell != null ? String(cell) : ''
      return str.toLowerCase().includes(filterVal.toLowerCase())
    })
  })

  return (
    <div style={{ ...tableWrap, maxHeight: maxHeight + 2, display: 'flex', flexDirection: 'column' }}>
      <div style={{ overflow: 'auto', flex: 1 }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  style={{
                    ...thStyle,
                    width: col.width ?? 'auto',
                    minWidth: typeof col.width === 'number' ? col.width : undefined,
                    textAlign: col.align ?? 'left',
                  }}
                >
                  {col.label}
                  {col.filterable !== false && (
                    <input
                      type="text"
                      placeholder="Lọc..."
                      style={filterInputStyles}
                      value={filterInputs[String(col.key)] ?? ''}
                      onChange={(e) =>
                        setFilterInputs((prev) => ({ ...prev, [String(col.key)]: e.target.value }))
                      }
                    />
                  )}
                </th>
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
