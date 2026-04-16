import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { hinhThucPost, hinhThucPut, hinhThucMaLienSau, type HinhThucRecord } from './hinhThucApi'
import { formFooterButtonCancel, formFooterButtonSave } from '../../../constants/formFooterButtons'

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
  minWidth: 320,
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
  fontWeight: 600,
  color: 'var(--text-primary)',
}

const bodyStyle: React.CSSProperties = { padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }

const footerStyle: React.CSSProperties = { padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }

const toolbarBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '5px 10px',
  fontSize: 11,
  fontFamily: 'var(--font-misa), Tahoma, Arial, sans-serif',
  background: '#FFFFFF',
  border: '1px solid var(--border-strong)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  borderRadius: 4,
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: 4,
  display: 'block',
  minWidth: 100,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 8px',
  fontSize: 11,
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  color: 'var(--text-primary)',
  boxSizing: 'border-box',
  height: 28,
}

export interface ThemHinhThucModalProps {
  onClose: () => void
  onSave: (item: HinhThucRecord) => void
  initialData?: HinhThucRecord | null
}

export function ThemHinhThucModal({ onClose, onSave, initialData }: ThemHinhThucModalProps) {
  const isEditMode = !!initialData
  const [ma, setMa] = useState('')
  const [ten, setTen] = useState('')
  const [ghiChu, setGhiChu] = useState('')
  const [loi, setLoi] = useState('')
  const [valErrKey, setValErrKey] = useState<string | null>(null)
  const refTen = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialData) {
      setMa(initialData.ma)
      setTen(initialData.ten)
      setGhiChu(initialData.ghi_chu ?? '')
    } else {
      setMa(hinhThucMaLienSau())
      setTen('')
      setGhiChu('')
    }
  }, [initialData])

  const handleLuu = () => {
    setValErrKey(null)
    const tenTrim = ten.trim()
    const maTrim = ma.trim()
    if (!tenTrim) {
      setLoi('Tên hình thức không được để trống.')
      setValErrKey('ten')
      refTen.current?.focus()
      return
    }
    if (!isEditMode && !maTrim) {
      setLoi('Mã hình thức không được để trống.')
      setValErrKey('ma')
      return
    }
    try {
      if (isEditMode && initialData) {
        hinhThucPut(initialData.id, { ma: maTrim || initialData.ma, ten: tenTrim, ghi_chu: ghiChu.trim() })
        onSave({ ...initialData, ma: maTrim || initialData.ma, ten: tenTrim, ghi_chu: ghiChu.trim() })
      } else {
        const rec = hinhThucPost({ ma: maTrim, ten: tenTrim, ghi_chu: ghiChu.trim() })
        onSave(rec)
      }
      onClose()
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Có lỗi xảy ra.')
    }
  }

  return (
    <div style={overlay}>
      <div style={box}>
        <div style={headerStyle}>
          <span>{isEditMode ? 'Sửa hình thức' : 'Thêm mới hình thức'}</span>
          <button type="button" onClick={onClose} style={{ padding: 2, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex' }} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        <div style={bodyStyle}>
          {loi && <div style={{ fontSize: 11, color: 'var(--accent)' }}>{loi}</div>}
          <div>
            <label style={labelStyle}>Mã hình thức <span style={{ color: 'var(--accent)' }}>*</span></label>
            <input
              style={{ ...inputStyle, border: valErrKey === 'ma' ? '1px solid #dc2626' : inputStyle.border }}
              value={ma}
              onChange={(e) => { setMa(e.target.value); if (valErrKey === 'ma') setValErrKey(null) }}
              placeholder="HT1, HT2..."
              readOnly={isEditMode}
              disabled={isEditMode}
            />
          </div>
          <div>
            <label style={labelStyle}>Tên hình thức <span style={{ color: 'var(--accent)' }}>*</span></label>
            <input
              ref={refTen}
              style={{ ...inputStyle, border: valErrKey === 'ten' ? '1px solid #dc2626' : inputStyle.border }}
              value={ten}
              onChange={(e) => { setTen(e.target.value); if (valErrKey === 'ten') setValErrKey(null) }}
              placeholder="Mua hàng nhập kho, Mua hàng không nhập kho..."
            />
          </div>
          <div>
            <label style={labelStyle}>Ghi chú</label>
            <input style={inputStyle} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="Ghi chú (tùy chọn)" />
          </div>
        </div>
        <div style={footerStyle}>
          <button type="button" style={formFooterButtonCancel} onClick={onClose}>Hủy bỏ</button>
          <button type="button" style={{ ...toolbarBtn, ...formFooterButtonSave }} onClick={handleLuu}>Lưu</button>
        </div>
      </div>
    </div>
  )
}
