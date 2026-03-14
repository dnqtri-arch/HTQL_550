import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import usePlacesAutocompleteService from 'react-google-autocomplete/lib/usePlacesAutocompleteService'
import { mapsApiKey, mapsReady } from '../../config/htql_550_map'
import { formFooterButtonCancel, formFooterButtonSave, formFooterButtonSaveAndAdd } from '../../constants/formFooterButtons'

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
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2100,
}

const box: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  minWidth: 360,
  maxWidth: '90vw',
  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
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

/**
 * Gọi hook để load sớm script Google Maps/Places khi vào form (trước khi mở modal Thêm Kho).
 * Render null; chỉ cần mount để script được load sẵn.
 */
export function MapsScriptPreloader() {
  usePlacesAutocompleteService({
    apiKey: mapsApiKey,
    options: { componentRestrictions: { country: 'vn' } },
    debounce: 300,
  })
  return null
}

export function ThemKhoModal({ onClose, onSave, onSaveAndAdd, existingItems = [], initialData }: ThemKhoModalProps) {
  const isEditMode = initialData != null
  const overlayMouseDownRef = useRef(false)
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

  const {
    placePredictions,
    getPlacePredictions,
    placesService,
    isPlacePredictionsLoading,
  } = usePlacesAutocompleteService({
    apiKey: mapsApiKey,
    options: { componentRestrictions: { country: 'vn' } },
    debounce: 300,
  })

  const resetAddressRelated = useCallback(() => {
    setDiaChi('')
  }, [])

  const handleAddressChange = useCallback((e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = (e.target as HTMLInputElement).value
    setDiaChi(v)
    if (!v.trim()) resetAddressRelated()
    if (mapsReady) getPlacePredictions({ input: v })
  }, [resetAddressRelated, mapsReady, getPlacePredictions])

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

  const handleSelectAddressSuggestion = useCallback(
    (placeId: string) => {
      if (!placesService) return
      placesService.getDetails(
        { placeId },
        (place: { formatted_address?: string } | null, status: string) => {
          if (status === 'OK' && place?.formatted_address) {
            setDiaChi(place.formatted_address)
          }
          getPlacePredictions({ input: '' })
        }
      )
    },
    [placesService, getPlacePredictions]
  )

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
    <div
      style={overlay}
      onMouseDown={(e) => { if (e.target === e.currentTarget) overlayMouseDownRef.current = true }}
      onClick={(e) => { if (e.target === e.currentTarget && overlayMouseDownRef.current) onClose(); overlayMouseDownRef.current = false }}
    >
      <div style={box} onMouseDown={() => { overlayMouseDownRef.current = false }} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...headerStyle, gap: 12, flexWrap: 'nowrap' }}>
          <span style={{ flexShrink: 0 }}>{isEditMode ? 'Sửa kho' : 'Thêm Kho'}</span>
          <div style={{ flex: 1, minWidth: 0, height: 28, minHeight: 28, display: 'flex', alignItems: 'center', padding: '0 10px', background: loi ? 'rgba(255, 87, 34, 0.12)' : 'transparent', border: loi ? '1px solid var(--accent)' : '1px solid transparent', borderRadius: 4, fontSize: 11, color: 'var(--text-primary)', overflow: 'hidden', boxSizing: 'border-box' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loi || '\u00A0'}</span>
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
              {mapsReady ? (
                <>
                  <input
                    type="text"
                    value={diaChi}
                    onChange={handleAddressChange}
                    onKeyDown={handleAddressKeyDown}
                    style={{ ...inputStyle, minHeight: 40, padding: '8px 10px', fontSize: 12 }}
                    placeholder="Nhập địa chỉ (gợi ý từ bản đồ)"
                    className="htql-address-input"
                  />
                  {isPlacePredictionsLoading && (
                    <div className="htql-address-suggestions-loading">Đang tải gợi ý...</div>
                  )}
                  {!isPlacePredictionsLoading && placePredictions.length > 0 && (
                    <ul className="htql-address-suggestions" role="listbox">
                      {placePredictions.map((p) => (
                        <li
                          key={p.place_id}
                          role="option"
                          className="htql-address-suggestion-item"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectAddressSuggestion(p.place_id)}
                        >
                          {p.description}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <textarea
                  value={diaChi}
                  onChange={handleAddressChange}
                  onKeyDown={handleAddressKeyDown}
                  style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                  placeholder="Nhập địa chỉ"
                  rows={3}
                />
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
