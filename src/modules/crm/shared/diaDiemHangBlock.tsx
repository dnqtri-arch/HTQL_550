/**
 * Danh sách địa điểm (gợi ý địa chỉ VN) — dùng chung form Khách hàng / NCC.
 */
import type React from 'react'
import { suggestAddressVietnam, cleanAddressForDisplay } from './addressAutocompleteApi'

export const DIA_DIEM_DROPDOWN_Z = 4500

export function DiaDiemHangBlock(props: {
  lines: string[]
  setLines: (updater: (prev: string[]) => string[]) => void
  suggestions: string[]
  setSuggestions: React.Dispatch<React.SetStateAction<string[]>>
  rowIndex: number | null
  setRowIndex: React.Dispatch<React.SetStateAction<number | null>>
  loading: boolean
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  debounceRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  inputStyle: React.CSSProperties
  btnSecondary: React.CSSProperties
  formRowGap: number
}) {
  const {
    lines,
    setLines,
    suggestions,
    setSuggestions,
    rowIndex,
    setRowIndex,
    loading,
    setLoading,
    debounceRef,
    inputStyle,
    btnSecondary,
    formRowGap,
  } = props
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflow: 'visible', background: 'var(--bg-tab)' }}>
      {lines.length === 0 ? (
        <div
          style={{
            padding: 10,
            color: 'var(--text-muted)',
            cursor: 'pointer',
            background: 'rgba(250, 204, 21, 0.12)',
            borderBottom: '1px solid var(--border)',
            borderRadius: 4,
          }}
          onClick={() => setLines(() => [''])}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLines(() => ['']) } }}
        >
          Bấm vào đây để thêm mới
        </div>
      ) : (
        <>
          {lines.map((dd, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: formRowGap, padding: `${formRowGap / 2}px ${formRowGap}px`, borderBottom: '1px solid var(--border)', position: 'relative' }}>
              <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                <input
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                  value={dd}
                  onChange={(e) => {
                    const v = e.target.value
                    setLines((prev) => {
                      const next = [...prev]
                      next[idx] = v
                      return next
                    })
                    if (debounceRef.current) clearTimeout(debounceRef.current)
                    if (!v.trim()) {
                      setSuggestions([])
                      setRowIndex(null)
                      return
                    }
                    setRowIndex(idx)
                    debounceRef.current = setTimeout(() => {
                      debounceRef.current = null
                      setLoading(true)
                      suggestAddressVietnam(v)
                        .then((list) => {
                          setSuggestions(list.map((a) => cleanAddressForDisplay(a)))
                          setLoading(false)
                        })
                        .catch(() => setLoading(false))
                    }, 400)
                  }}
                  onFocus={() => {
                    if (dd.trim() && suggestions.length > 0) setRowIndex(idx)
                  }}
                  onClick={() => { if (rowIndex !== idx && dd.trim()) setRowIndex(idx) }}
                  onBlur={() => {
                    setTimeout(() => setRowIndex(null), 200)
                    setLines((prev) => {
                      const arr = [...prev]
                      if (arr[idx] != null) arr[idx] = cleanAddressForDisplay(arr[idx])
                      return arr
                    })
                  }}
                  placeholder="Nhập địa điểm (gợi ý tại Việt Nam)"
                />
                {rowIndex === idx && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: '100%',
                      marginTop: 2,
                      maxHeight: 320,
                      overflowY: 'auto',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: DIA_DIEM_DROPDOWN_Z,
                    }}
                  >
                    {loading ? (
                      <div style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 12 }}>Đang tải gợi ý...</div>
                    ) : suggestions.length === 0 ? (
                      <div style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 12 }}>Nhập từ khóa để gợi ý địa chỉ</div>
                    ) : (
                      suggestions.map((addr, i) => (
                        <div
                          key={i}
                          role="option"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setLines((prev) => {
                              const next = [...prev]
                              next[idx] = addr
                              return next
                            })
                            setSuggestions([])
                            setRowIndex(null)
                          }}
                          style={{
                            padding: '8px 10px',
                            cursor: 'pointer',
                            fontSize: 12,
                            lineHeight: 1.4,
                            borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : undefined,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {addr}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button type="button" style={{ ...btnSecondary, padding: '2px 6px' }} onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))} title="Xóa">✕</button>
            </div>
          ))}
          <div style={{ padding: `${formRowGap}px ${formRowGap}px`, borderTop: '1px solid var(--border)' }}>
            <button type="button" style={{ ...btnSecondary, fontSize: 10 }} onClick={() => setLines((prev) => [...prev, ''])}>+ Thêm dòng</button>
          </div>
        </>
      )}
    </div>
  )
}
