import { useState, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Filter } from 'lucide-react'
import dgStyles from './DataGrid.module.css'

export interface DataGridColumn<T> {
  key: keyof T | string
  label: string
  width?: number | string
  align?: 'left' | 'right' | 'center'
  type?: 'text' | 'number' | 'date'
  filterable?: boolean
  /** Tùy chỉnh nội dung ô (value, full row, rowIndex) */
  renderCell?: (value: unknown, row: T, rowIndex?: number) => ReactNode
}

export interface DataGridColumnFilterConfig {
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
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
  /** Cấu hình filter cho cột (funnel icon, popup checkboxes). Parent filter dữ liệu trước khi truyền vào data. */
  columnFilterConfig?: Record<string, DataGridColumnFilterConfig>
  /** Khi data rỗng do lọc (parent xác định), hiển thị thông báo + nút Hủy toàn bộ bộ lọc */
  emptyDueToFilter?: boolean
  onClearAllFilters?: () => void
  /** Dòng xen kẽ nền trắng / cam lợt + hover dòng */
  stripedRows?: boolean
  /** Class thêm vào wrapper ngoài (vd. scope style cột tùy chỉnh) */
  wrapClassName?: string
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
  columnFilterConfig,
  emptyDueToFilter = false,
  onClearAllFilters,
  stripedRows = false,
  wrapClassName,
}: DataGridProps<T>) {
  const [filterPopupColumn, setFilterPopupColumn] = useState<string | null>(null)
  const [filterSearchKeyword, setFilterSearchKeyword] = useState('')
  const [filterPendingSelected, setFilterPendingSelected] = useState<string[]>([])
  const filterAnchorRefs = useRef<Record<string, HTMLElement | null>>({})
  const filterPopupRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (filterPopupColumn && columnFilterConfig?.[filterPopupColumn]) {
      setFilterPendingSelected(columnFilterConfig[filterPopupColumn].selected)
      setFilterSearchKeyword('')
    }
  }, [filterPopupColumn])

  useEffect(() => {
    if (!filterPopupColumn) return
    const onMouseDown = (e: MouseEvent) => {
      if (filterPopupRef.current?.contains(e.target as Node)) return
      const insideAnyAnchor = Object.values(filterAnchorRefs.current).some((el) => el?.contains(e.target as Node))
      if (insideAnyAnchor) return
      setFilterPopupColumn(null)
    }
    window.addEventListener('mousedown', onMouseDown)
    return () => window.removeEventListener('mousedown', onMouseDown)
  }, [filterPopupColumn])

  const tableStyle = compact ? { ...tableStyles, fontSize: '11px' } : tableStyles
  const thStyle = compact ? { ...thStyles, padding: '2px 4px' } : thStyles
  const tdStyle = compact ? { ...tdStyles, padding: '2px 4px' } : tdStyles

  const filteredData = data

  const wrapStyle: React.CSSProperties = height != null
    ? { ...tableWrap, height, minHeight: 0, display: 'flex', flexDirection: 'column' }
    : { ...tableWrap, maxHeight: maxHeight + 2, display: 'flex', flexDirection: 'column' }

  const rootClassName = [wrapClassName, stripedRows ? dgStyles.stripedWrap : ''].filter(Boolean).join(' ')

  return (
    <div style={wrapStyle} className={rootClassName || undefined}>
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
                    activeSort != null ? (activeSort.direction === 'asc' ? '▴' : '▾') : '↕'
                  const isFilterable = col.filterable && columnFilterConfig?.[colKey]
                  return (
                <th
                  key={colKey}
                  ref={(el) => { if (isFilterable) filterAnchorRefs.current[colKey] = el }}
                  style={{
                    ...thStyle,
                    width: col.width ?? 'auto',
                    minWidth: typeof col.width === 'number' ? col.width : undefined,
                    textAlign: col.align ?? 'left',
                    cursor: isSortable || isFilterable ? 'pointer' : thStyle.cursor,
                  }}
                  onClick={() => {
                    if (isFilterable) {
                      setFilterPopupColumn((prev) => (prev === colKey ? null : colKey))
                      return
                    }
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, width: '100%' }}>
                    <span style={{ flex: 1, minWidth: 0 }}>{col.label}</span>
                    {isSortable && !isFilterable && (
                      <span
                        style={{
                          fontSize: 9,
                          lineHeight: 1,
                          letterSpacing: -1,
                          color: activeSort ? 'var(--accent)' : 'var(--text-muted)',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                        title={activeSort ? (activeSort.direction === 'asc' ? 'Tăng dần' : 'Giảm dần') : 'Sắp xếp'}
                      >
                        {sortIcon}
                      </span>
                    )}
                    {isFilterable && (
                      <span title="Bấm vào cột để lọc">
                        <Filter
                          size={12}
                          style={{
                            color: columnFilterConfig![colKey].selected.length > 0 ? 'var(--accent)' : 'var(--text-muted)',
                            flexShrink: 0,
                          }}
                        />
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
            {filteredData.length === 0 && emptyDueToFilter && onClearAllFilters ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                  <div style={{ marginBottom: 8 }}>Không tìm thấy dữ liệu phù hợp</div>
                  <button
                    type="button"
                    onClick={onClearAllFilters}
                    style={{
                      padding: '4px 12px',
                      fontSize: 11,
                      background: 'var(--accent)',
                      color: 'var(--accent-text)',
                      border: '1px solid var(--accent)',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    Hủy toàn bộ bộ lọc
                  </button>
                </td>
              </tr>
            ) : (
            filteredData.map((row, idx) => {
              const rowId = row[keyField as keyof T]
              const isSelected = selectedRowId != null && rowId === selectedRowId
              return (
                <tr
                  key={String(rowId ?? idx)}
                  data-htql-dg-row={stripedRows ? '' : undefined}
                  {...(stripedRows && isSelected ? { 'data-htql-dg-selected': '' } : {})}
                  style={{
                    ...(stripedRows
                      ? { cursor: onRowSelect || onRowDoubleClick ? 'pointer' : undefined }
                      : {
                          background: isSelected ? 'var(--row-selected-bg)' : undefined,
                          color: isSelected ? 'var(--row-selected-text)' : undefined,
                          boxShadow: isSelected ? 'inset 0 0 0 2px var(--row-selected-border)' : undefined,
                          cursor: onRowSelect || onRowDoubleClick ? 'pointer' : undefined,
                        }),
                  }}
                  onClick={() => onRowSelect?.(row)}
                  onDoubleClick={() => onRowDoubleClick?.(row)}
                  onContextMenu={(e) => onRowContextMenu?.(row, e)}
                >
                  {columns.map((col) => {
                    const cell = row[col.key as keyof T]
                    const content =
                      col.renderCell != null ? col.renderCell(cell, row, idx) : cell != null ? String(cell) : ''
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
            })
            )}
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
      {filterPopupColumn && columnFilterConfig?.[filterPopupColumn] && (() => {
        const config = columnFilterConfig[filterPopupColumn]
        const rect = filterAnchorRefs.current[filterPopupColumn]?.getBoundingClientRect()
        if (!rect || !config) return null
        const kw = filterSearchKeyword.trim().toLowerCase()
        const filteredOpts = kw
          ? config.options.filter((o) => o.toLowerCase().includes(kw))
          : config.options
        const allChecked = filteredOpts.length > 0 && (filterPendingSelected.length === 0 || filteredOpts.every((o) => filterPendingSelected.includes(o)))
        const someChecked = filteredOpts.some((o) => filterPendingSelected.includes(o))
        return (
          <div
            ref={filterPopupRef}
            style={{
              position: 'fixed',
              left: rect.left,
              top: rect.bottom + 4,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              zIndex: 4100,
              minWidth: 200,
              maxWidth: 280,
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={filterSearchKeyword}
              onChange={(e) => setFilterSearchKeyword(e.target.value)}
              style={{
                padding: '4px 6px',
                fontSize: 11,
                border: '1px solid var(--border)',
                borderRadius: 4,
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 4px', fontSize: 11, cursor: 'pointer', borderBottom: '1px solid var(--border-strong)', marginBottom: 2, color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => { if (el) (el as HTMLInputElement).indeterminate = someChecked && !allChecked }}
                onChange={() => {
                  const sel = allChecked
                    ? filterPendingSelected.filter((o) => !filteredOpts.includes(o))
                    : [...new Set([...filterPendingSelected, ...filteredOpts])]
                  setFilterPendingSelected(sel)
                  config.onChange(sel)
                }}
              />
              <span style={{ fontWeight: 700 }}>Tất cả</span>
            </label>
            <div style={{ maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
              {filteredOpts.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '8px 6px' }}>Không có kết quả</div>
              ) : (
                filteredOpts.map((opt) => (
                  <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', fontSize: 11, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={filterPendingSelected.length === 0 || filterPendingSelected.includes(opt)}
                      onChange={(e) => {
                        const isNowChecked = e.target.checked
                        const base = filterPendingSelected.length === 0 ? config.options : filterPendingSelected
                        const newSel = isNowChecked
                          ? (base.includes(opt) ? base : [...base, opt])
                          : (filterPendingSelected.length === 0 ? config.options : filterPendingSelected).filter((o) => o !== opt)
                        setFilterPendingSelected(newSel)
                        config.onChange(newSel)
                      }}
                    />
                    <span>{opt}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
