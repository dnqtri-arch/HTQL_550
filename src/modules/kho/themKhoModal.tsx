import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { suggestAddressVietnam } from '../crm/shared/addressAutocompleteApi'
import { formFooterButtonCancel, formFooterButtonSave, formFooterButtonSaveAndAdd } from '../../constants/formFooterButtons'

/** Giữ export để tương thích — không còn dùng Google Places */
export function MapsScriptPreloader() {
  return null
}

export interface KhoItem {
  id: string
  label: string
  tk_kho?: string
  dia_chi?: string
}

interface ThemKhoModalProps {
  onClose: () => void
  onSave: (item: KhoItem) => void
  onSaveAndAdd?: (item: KhoItem) => void
  /** Danh sách kho hiện có để tránh trùng mã */
  existingItems?: KhoItem[]
  /** Khi có giá trị: mở modal ở chế độ Sửa, mã không đổi */
  initialData?: KhoItem | null
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 4000,
  pointerEvents: 'none',
}

const box: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  minWidth: 360,
  maxWidth: '90vw',
  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
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

const bodyStyle: React.CSSProperties = {
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const footerStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderTop: '1px solid var(--border)',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: 4,
  display: 'block',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 8px',
  fontSize: 11,
  background: 'var(--bg-tab)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  color: 'var(--text-primary)',
  boxSizing: 'border-box',
  height: 28,
}

/** Lấy chữ cái đầu mỗi từ trong tên, viết hoa (vd: "Kho chính" → "KC") */
function maTuChuDauMoiTu(ten: string): string {
  return ten
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w[0].toUpperCase())
    .join('')
}

/** Đảm bảo mã không trùng: thêm _2, _3... nếu cần */
function maDocNhat(baseMa: string, existingItems: KhoItem[]): string {
  if (!baseMa) return baseMa
  const ids = new Set(existingItems.map((x) => x.id))
  if (!ids.has(baseMa)) return baseMa
  let n = 2
  while (ids.has(`${baseMa}_${n}`)) n++
  return `${baseMa}_${n}`
}

export function ThemKhoModal({ onClose, onSave, onSaveAndAdd, existingItems = [], initialData }: ThemKhoModalProps) {
  const isEditMode = initialData != null
  const [ten, setTen] = useState(isEditMode ? initialData.label : '')
  const [tkKho, setTkKho] = useState(isEditMode ? (initialData.tk_kho ?? '') : '')
  const [diaChi, setDiaChi] = useState(isEditMode ? (initialData.dia_chi ?? '') : '')
  const [loi, setLoi] = useState('')
  const refTen = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (initialData) {
      setTen(initialData.label)
      setTkKho(initialData.tk_kho ?? '')
      setDiaChi(initialData.dia_chi ?? '')
    }
  }, [initialData?.id])

  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([])
  const [addressSuggestionsLoading, setAddressSuggestionsLoading] = useState(false)
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetAddressRelated = useCallback(() => {
    setDiaChi('')
    setAddressSuggestions([])
  }, [])

  const handleAddressChange = useCallback((e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = (e.target as HTMLInputElement).value
    setDiaChi(v)
    if (!v.trim()) {
      resetAddressRelated()
      return
    }
    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current)
    addressDebounceRef.current = setTimeout(() => {
      addressDebounceRef.current = null
      setAddressSuggestionsLoading(true)
      suggestAddressVietnam(v)
        .then((list) => setAddressSuggestions(list.slice(0, 5)))
        .catch(() => setAddressSuggestions([]))
        .finally(() => setAddressSuggestionsLoading(false))
    }, 300)
  }, [resetAddressRelated])

  const handleAddressKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Backspace') {
      const t = e.currentTarget
      const isEmpty = !t.value || t.value.length <= 1
      if (isEmpty) {
        setDiaChi('')
        resetAddressRelated()
      }
    }
  }, [resetAddressRelated])

  const handleSelectAddressSuggestion = useCallback((addr: string) => {
    setDiaChi(addr)
    setAddressSuggestions([])
  }, [])

  const ma = useMemo(() => maTuChuDauMoiTu(ten), [ten])
  const existingExcludeSelf = useMemo(() => (existingItems ?? []).filter((x) => x.id !== initialData?.id), [existingItems, initialData?.id])
  const id = useMemo(() => (isEditMode && initialData ? initialData.id : maDocNhat(ma, existingExcludeSelf)), [isEditMode, initialData, ma, existingExcludeSelf])

  const handleLuu = () => {
    const tenTrim = ten.trim()
    if (!tenTrim) {
      setLoi('Tên kho là bắt buộc.')
      setTimeout(() => refTen.current?.focus(), 0)
      return
    }
    setLoi('')
    const item: KhoItem = { id, label: tenTrim, tk_kho: tkKho.trim(), dia_chi: diaChi.trim() }
    onSave(item)
    onClose()
  }

  const handleLuuVaTiepTuc = () => {
    const tenTrim = ten.trim()
    if (!tenTrim) {
      setLoi('Tên kho là bắt buộc.')
      setTimeout(() => refTen.current?.focus(), 0)
      return
    }
    setLoi('')
    const item: KhoItem = { id, label: tenTrim, tk_kho: tkKho.trim(), dia_chi: diaChi.trim() }
    if (onSaveAndAdd) onSaveAndAdd(item)
    else onSave(item)
    setTen('')
    setTkKho('')
    setDiaChi('')
  }

  return (
    <div style={overlay}>
      <div style={box}>
        <div style={{ ...headerStyle, gap: 12, flexWrap: 'nowrap' }}>
          <span style={{ flexShrink: 0 }}>{isEditMode ? 'Sửa kho' : 'Thêm Kho'}</span>
          <div style={{ flex: 1, minWidth: 0, height: 28, minHeight: 28, display: 'flex', alignItems: 'center', padding: '0 10px', background: loi ? 'rgba(255, 87, 34, 0.12)' : 'transparent', border: loi ? '1px solid var(--accent)' : '1px solid transparent', borderRadius: 4, fontSize: 11, color: 'var(--text-primary)', overflow: 'hidden', boxSizing: 'border-box' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loi || ' '}</span>
          </div>
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
            }}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div style={bodyStyle}>
          <div>
            <label style={labelStyle}>Mã (*)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={isEditMode ? id : ma}
                readOnly
                style={{
                  ...inputStyle,
                  background: 'var(--bg-primary)',
                  color: 'var(--text-muted)',
                  borderColor: 'var(--border-strong)',
                  cursor: 'default',
                }}
                title="Mã tự động theo chữ cái đầu mỗi từ ở ô Tên"
              />
              {!ma && !isEditMode && (
                <span
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    fontStyle: 'italic',
                  }}
                >
                  Mã tự động sinh
                </span>
              )}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Tên (*)</label>
            <input
              ref={refTen}
              type="text"
              value={ten}
              onChange={(e) => setTen(e.target.value)}
              style={inputStyle}
              placeholder="Nhập tên kho"
            />
          </div>
          <div>
            <label style={labelStyle}>TK kho</label>
            <input
              type="text"
              value={tkKho}
              onChange={(e) => setTkKho(e.target.value)}
              style={inputStyle}
              placeholder="152, 156..."
            />
          </div>
          <div>
            <label style={labelStyle}>Địa chỉ</label>
            <div className="htql-address-wrap">
              <input
                type="text"
                value={diaChi}
                onChange={handleAddressChange}
                onKeyDown={handleAddressKeyDown}
                onFocus={() => { if (diaChi.trim()) { setAddressSuggestionsLoading(true); suggestAddressVietnam(diaChi).then((list) => setAddressSuggestions(list.slice(0, 5))).catch(() => setAddressSuggestions([])).finally(() => setAddressSuggestionsLoading(false)) } }}
                onBlur={() => setTimeout(() => setAddressSuggestions([]), 200)}
                style={{ ...inputStyle, minHeight: 40, padding: '8px 10px', fontSize: 12 }}
                placeholder="Nhập địa chỉ (gợi ý tại Việt Nam)"
                className="htql-address-input"
              />
              {addressSuggestionsLoading && (
                <div className="htql-address-suggestions-loading">Đang tải gợi ý...</div>
              )}
              {!addressSuggestionsLoading && addressSuggestions.length > 0 && (
                <ul className="htql-address-suggestions" role="listbox">
                  {addressSuggestions.map((a, idx) => (
                    <li
                      key={idx}
                      role="option"
                      className="htql-address-suggestion-item"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectAddressSuggestion(a)}
                    >
                      {a}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div style={footerStyle}>
          <button type="button" style={formFooterButtonCancel} onClick={onClose}>Hủy bỏ</button>
          <button type="button" style={formFooterButtonSave} onClick={handleLuu}>Lưu</button>
          {!isEditMode && onSaveAndAdd && (
            <button type="button" style={formFooterButtonSaveAndAdd} onClick={handleLuuVaTiepTuc}>Lưu và tiếp tục</button>
          )}
        </div>
      </div>
    </div>
  )
}
