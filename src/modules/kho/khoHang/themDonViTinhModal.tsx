import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { donViTinhPost, donViTinhMaTuDong } from './donViTinhApi'
import { formFooterButtonCancel, formFooterButtonSave } from '../../../constants/formFooterButtons'

interface ThemDonViTinhModalProps {
  onClose: () => void
  onSaved: () => void | Promise<void>
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 4000,
}

const box: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  minWidth: 320,
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

export function ThemDonViTinhModal({ onClose, onSaved }: ThemDonViTinhModalProps) {
  const overlayMouseDownRef = useRef(false)
  const [ma_dvt, setMaDvt] = useState('')
  const [ten_dvt, setTenDvt] = useState('')
  const [ky_hieu, setKyHieu] = useState('')
  const [dien_giai, setDienGiai] = useState('')
  const [loi, setLoi] = useState('')
  const [dangLuu, setDangLuu] = useState(false)
  const refTenDvt = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    donViTinhMaTuDong().then(setMaDvt)
  }, [])

  const handleLuu = async () => {
    const ten = ten_dvt.trim()
    if (!ten) {
      setLoi('Tên đơn vị tính là bắt buộc.')
      setTimeout(() => refTenDvt.current?.focus(), 0)
      return
    }
    setLoi('')
    setDangLuu(true)
    try {
      await donViTinhPost({
        ma_dvt: ma_dvt.trim() || (await donViTinhMaTuDong()),
        ten_dvt: ten,
        ky_hieu: ky_hieu.trim() || undefined,
        dien_giai: dien_giai.trim() || '',
      })
      await onSaved()
      onClose()
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Có lỗi xảy ra.')
    } finally {
      setDangLuu(false)
    }
  }

  return (
    <div
      style={overlay}
      onMouseDown={(e) => { if (e.target === e.currentTarget) overlayMouseDownRef.current = true }}
      onClick={(e) => { if (e.target === e.currentTarget && overlayMouseDownRef.current) onClose(); overlayMouseDownRef.current = false }}
    >
      <div style={box} onMouseDown={() => { overlayMouseDownRef.current = false }} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...headerStyle, gap: 12, flexWrap: 'nowrap' }}>
          <span style={{ flexShrink: 0 }}>Thêm đơn vị tính</span>
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
            <label style={labelStyle}>Mã đơn vị tính</label>
            <input
              type="text"
              value={ma_dvt}
              readOnly
              style={{
                ...inputStyle,
                background: 'var(--bg-primary)',
                color: 'var(--text-muted)',
                borderColor: 'var(--border-strong)',
                cursor: 'default',
              }}
              title="Tự động: 01, 02, 03..."
            />
          </div>
          <div>
            <label style={labelStyle}>Tên đơn vị tính (*)</label>
            <input
              ref={refTenDvt}
              type="text"
              value={ten_dvt}
              onChange={(e) => setTenDvt(e.target.value)}
              style={inputStyle}
              placeholder="Nhập tên đơn vị tính"
            />
          </div>
          <div>
            <label style={labelStyle}>Ký hiệu</label>
            <input
              type="text"
              value={ky_hieu}
              onChange={(e) => setKyHieu(e.target.value)}
              style={inputStyle}
              placeholder="VD: Cái, Kg, m"
            />
          </div>
          <div>
            <label style={labelStyle}>Diễn giải</label>
            <input
              type="text"
              value={dien_giai}
              onChange={(e) => setDienGiai(e.target.value)}
              style={inputStyle}
              placeholder="Tùy chọn"
            />
          </div>
        </div>

        <div style={footerStyle}>
          <button type="button" style={formFooterButtonCancel} onClick={onClose}>Hủy bỏ</button>
          <button type="button" style={formFooterButtonSave} onClick={handleLuu} disabled={dangLuu}>
            {dangLuu ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  )
}
