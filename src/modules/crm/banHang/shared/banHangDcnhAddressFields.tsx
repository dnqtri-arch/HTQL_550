/**
 * Cụm ô Địa chỉ nhận hàng (ĐCNH) + gợi ý địa chỉ VN (rule diachi.mdc / htql550 z-index).
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { Plus } from 'lucide-react'
import { suggestAddressVietnam } from '../../shared/addressAutocompleteApi'
import {
  dcnhFormRowLabel,
  joinDiaChiNhanHangLines,
  splitDiaChiNhanHangLines,
} from '../../../../utils/banHangDcnhStorage'

const DCNH_SUGGEST_Z = 4100
const DEBOUNCE_MS = 300

/** Căn như nhãn «Khách hàng» trên form báo giá / ĐHB / HĐ bán (YC81). */
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted)',
  textAlign: 'right',
  flexShrink: 0,
}

export interface BanHangDcnhAddressFieldsProps {
  /** Chuỗi nhiều dòng (\n) đồng bộ với bản ghi / payload */
  valueJoined: string
  onChangeJoined: (joined: string) => void
  readOnly: boolean
  /** Căn nhãn với các trường cùng khối (vd. LABEL_MIN_WIDTH) */
  labelMinWidth?: number
  inputStyle: React.CSSProperties
  showToastInfo?: (message: string) => void
}

export function BanHangDcnhAddressFields({
  valueJoined,
  onChangeJoined,
  readOnly,
  labelMinWidth = 90,
  inputStyle,
  showToastInfo,
}: BanHangDcnhAddressFieldsProps) {
  const lines = splitDiaChiNhanHangLines(valueJoined)

  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refWrapActive = useRef<HTMLDivElement | null>(null)
  const [suggestRect, setSuggestRect] = useState<{ top: number; left: number; width: number } | null>(null)

  const handleChangeLine = useCallback(
    (index: number, raw: string) => {
      const prev = splitDiaChiNhanHangLines(valueJoined)
      const n = [...prev]
      n[index] = raw
      onChangeJoined(joinDiaChiNhanHangLines(n))
      setActiveIndex(index)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (!raw.trim()) {
        setSuggestions([])
        return
      }
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        suggestAddressVietnam(raw)
          .then((list) => setSuggestions(list.slice(0, 8)))
          .catch(() => setSuggestions([]))
      }, DEBOUNCE_MS)
    },
    [onChangeJoined, valueJoined],
  )

  const handleSelectSuggestion = useCallback(
    (index: number, addr: string) => {
      const prev = splitDiaChiNhanHangLines(valueJoined)
      const n = [...prev]
      n[index] = addr
      onChangeJoined(joinDiaChiNhanHangLines(n))
      setSuggestions([])
    },
    [onChangeJoined, valueJoined],
  )

  useLayoutEffect(() => {
    if (activeIndex != null && suggestions.length > 0 && refWrapActive.current) {
      const r = refWrapActive.current.getBoundingClientRect()
      setSuggestRect({ top: r.bottom, left: r.left, width: Math.max(r.width, 200) })
    } else {
      setSuggestRect(null)
    }
  }, [activeIndex, suggestions.length])

  useEffect(() => {
    if (activeIndex == null) return
    const onMouseDown = (e: MouseEvent) => {
      if (refWrapActive.current?.contains(e.target as Node)) return
      if ((e.target as HTMLElement).closest('[data-dcnh-suggest-dropdown]')) return
      setActiveIndex(null)
    }
    window.addEventListener('mousedown', onMouseDown)
    return () => window.removeEventListener('mousedown', onMouseDown)
  }, [activeIndex])

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', minWidth: 0 }}>
        {lines.map((addr, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0, width: '100%' }}>
            <label style={{ ...labelStyle, minWidth: labelMinWidth, paddingTop: 4 }}>{dcnhFormRowLabel(i)}</label>
            <div
              ref={i === activeIndex ? refWrapActive : undefined}
              className="htql-address-wrap"
              style={{ position: 'relative', flex: 1, minWidth: 0 }}
            >
              <input
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                value={addr}
                onChange={(e) => handleChangeLine(i, e.target.value)}
                onFocus={(e) => {
                  setActiveIndex(i)
                  const v = e.target.value
                  if (debounceRef.current) clearTimeout(debounceRef.current)
                  if (v.trim()) {
                    suggestAddressVietnam(v)
                      .then((list) => setSuggestions(list.slice(0, 8)))
                      .catch(() => setSuggestions([]))
                  }
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setActiveIndex(null)
                    setSuggestions([])
                  }, 200)
                }}
                onClick={(e) => {
                  const el = e.target as HTMLInputElement
                  el.select()
                }}
                readOnly={readOnly}
                disabled={readOnly}
                placeholder="Nhập địa chỉ nhận hàng (gợi ý VN)"
              />
            </div>
          </div>
        ))}
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              const lastVal = lines[lines.length - 1]?.trim()
              if (!lastVal) {
                showToastInfo?.('Vui lòng nhập địa chỉ nhận hàng dòng trên trước khi thêm dòng mới.')
                return
              }
              onChangeJoined(joinDiaChiNhanHangLines([...lines, '']))
            }}
            style={{
              alignSelf: 'flex-start',
              marginLeft: labelMinWidth + 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              fontSize: 10,
              background: 'var(--accent)',
              color: 'var(--accent-text)',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            <Plus size={12} /> Thêm địa chỉ NH
          </button>
        )}
      </div>
      {activeIndex != null &&
        suggestRect &&
        suggestions.length > 0 &&
        ReactDOM.createPortal(
          <div
            data-dcnh-suggest-dropdown
            style={{
              position: 'fixed',
              top: suggestRect.top,
              left: suggestRect.left,
              width: suggestRect.width,
              maxHeight: 220,
              overflowY: 'auto',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 6,
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              zIndex: DCNH_SUGGEST_Z,
            }}
          >
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} role="listbox">
              {suggestions.map((a, idx) => (
                <li
                  key={idx}
                  role="option"
                  style={{
                    padding: '10px 12px',
                    fontSize: 12,
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    borderBottom: '1px solid var(--border)',
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectSuggestion(activeIndex, a)}
                >
                  {a}
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </>
  )
}
