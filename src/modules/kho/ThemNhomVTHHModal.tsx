import { useState, useMemo, useRef } from 'react'
import { X } from 'lucide-react'
import type { NhomVTHHItem } from './NhomVTHHLookupModal'
import { formFooterButtonCancel, formFooterButtonSave, formFooterButtonSaveAndAdd } from '../../constants/formFooterButtons'

/** Lấy ký tự đầu mỗi từ trong tên, viết hoa, nối lại (vd: "Công cụ dụng cụ" → "CCDC") */
function maTuChuDauMoiTu(ten: string): string {
  return ten
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w[0].toUpperCase())
    .join('')
}

/** Đảm bảo mã không trùng trong danh sách: thêm _2, _3... nếu cần */
function maDocNhat(baseMa: string, existingItems: NhomVTHHItem[]): string {
  if (!baseMa) return baseMa
  const ids = new Set(existingItems.map((o) => o.id))
  if (!ids.has(baseMa)) return baseMa
  let n = 2
  while (ids.has(`${baseMa}_${n}`)) n++
  return `${baseMa}_${n}`
}

interface ThemNhomVTHHModalProps {
  onClose: () => void
  onSave: (item: NhomVTHHItem) => void
  onSaveAndAdd?: (item: NhomVTHHItem) => void
  parentOptions?: NhomVTHHItem[]
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
  width: '95vw',
  maxWidth: 800,
  height: '90vh',
  maxHeight: 560,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
  overflow: 'hidden',
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
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: 12,
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
  maxWidth: 280,
  padding: '4px 8px',
  fontSize: 11,
  background: 'var(--bg-tab)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  color: 'var(--text-primary)',
  boxSizing: 'border-box',
  height: 28,
}

const inputRowHeight = 28

const footerStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderTop: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 8,
  background: 'var(--bg-tab)',
  flexShrink: 0,
}

export function ThemNhomVTHHModal({
  onClose,
  onSave,
  onSaveAndAdd,
  parentOptions = [],
}: ThemNhomVTHHModalProps) {
  const overlayMouseDownRef = useRef(false)
  const [ten, setTen] = useState('')
  const [thuoc, setThuoc] = useState('')

  const ma = useMemo(
    () => maDocNhat(maTuChuDauMoiTu(ten), parentOptions),
    [ten, parentOptions]
  )

  const handleLuu = () => {
    const trimmedTen = ten.trim()
    if (!ma || !trimmedTen) return
    onSave({ id: ma, ma, ten: trimmedTen })
    onClose()
  }

  const handleLuuVaTiepTuc = () => {
    const trimmedTen = ten.trim()
    if (!ma || !trimmedTen) return
    const item: NhomVTHHItem = { id: ma, ma, ten: trimmedTen }
    if (onSaveAndAdd) onSaveAndAdd(item)
    else onSave(item)
    setTen('')
    setThuoc('')
  }

  return (
    <div
      style={overlay}
      onMouseDown={(e) => { if (e.target === e.currentTarget) overlayMouseDownRef.current = true }}
      onClick={(e) => { if (e.target === e.currentTarget && overlayMouseDownRef.current) onClose(); overlayMouseDownRef.current = false }}
    >
      <div style={box} onMouseDown={() => { overlayMouseDownRef.current = false }} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <span>Thêm Nhóm vật tư, hàng hóa, dịch vụ</span>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 4, marginBottom: 16 }}>
            <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <label style={labelStyle}>Mã (*)</label>
              <input
                type="text"
                value={ma}
                readOnly
                style={{
                  ...inputStyle,
                  width: 120,
                  maxWidth: 120,
                  height: inputRowHeight,
                  cursor: 'default',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-muted)',
                  borderColor: 'var(--border-strong)',
                }}
                title="Mã tự động theo ký tự đầu mỗi từ ở ô Tên"
              />
            </div>
            <div style={{ flex: '1 1 200px', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
              <label style={labelStyle}>Tên (*)</label>
              <input
                type="text"
                value={ten}
                onChange={(e) => setTen(e.target.value)}
                style={{ ...inputStyle, maxWidth: 'none', width: '100%', height: inputRowHeight }}
                placeholder="Nhập tên nhóm"
              />
            </div>
            <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <label style={labelStyle}>Thuộc</label>
              <select
                value={thuoc}
                onChange={(e) => setThuoc(e.target.value)}
                style={{
                  ...inputStyle,
                  cursor: 'pointer',
                  width: 'auto',
                  minWidth: 200,
                  maxWidth: '100%',
                  height: inputRowHeight,
                }}
              >
                <option value="">-- Chọn nhóm cha --</option>
                {parentOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.ma} - {o.ten}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
            Danh sách vật tư, hàng hóa, dịch vụ
          </div>
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 4,
              overflow: 'auto',
              maxHeight: 240,
              background: 'var(--bg-tab)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ padding: '6px 8px', textAlign: 'left', background: 'var(--bg-tab-active)', color: 'var(--text-primary)', borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                    Mã
                  </th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', background: 'var(--bg-tab-active)', color: 'var(--text-primary)', borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                    Tên
                  </th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', background: 'var(--bg-tab-active)', color: 'var(--text-primary)', borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                    Tính chất
                  </th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', background: 'var(--bg-tab-active)', color: 'var(--text-primary)', borderBottom: '2px solid var(--border)' }}>
                    DVT
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                  }}
                  onClick={() => {}}
                >
                  <td colSpan={4} style={{ padding: '10px 8px', fontStyle: 'italic' }}>
                    Bấm vào đây để thêm mới
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            Số dòng = 0
          </div>
        </div>

        <div style={footerStyle}>
          <button type="button" style={formFooterButtonCancel} onClick={onClose}>Hủy bỏ</button>
          <button type="button" style={formFooterButtonSave} onClick={handleLuu} disabled={!ma || !ten.trim()}>Lưu</button>
          {onSaveAndAdd && (
            <button type="button" style={formFooterButtonSaveAndAdd} onClick={handleLuuVaTiepTuc} disabled={!ma || !ten.trim()}>Lưu và tiếp tục</button>
          )}
        </div>
      </div>
    </div>
  )
}
