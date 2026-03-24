import { useState } from 'react'
import { X } from 'lucide-react'
import { formFooterButtonCancel, formFooterButtonSave } from '../../../constants/formFooterButtons'
import type { MauHoaDonItem } from './mauHoaDonApi'
import { mauHoaDonThemLuu } from './mauHoaDonApi'

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
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-primary)',
}

const bodyStyle: React.CSSProperties = { padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }

const footerStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderTop: '1px solid var(--border)',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 6,
}

const lbl: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: 4,
  display: 'block',
}

const inp: React.CSSProperties = {
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

export interface ThemMauHoaDonModalProps {
  onClose: () => void
  onSaved: (item: MauHoaDonItem) => void
}

export function ThemMauHoaDonModal({ onClose, onSaved }: ThemMauHoaDonModalProps) {
  const [maMau, setMaMau] = useState('')
  const [tenMau, setTenMau] = useState('')
  const [kyHieu, setKyHieu] = useState('')

  const handleLuu = () => {
    const ma = maMau.trim()
    const ten = tenMau.trim()
    const kh = kyHieu.trim()
    if (!ma || !ten) return
    const saved = mauHoaDonThemLuu({ ma_mau: ma, ten_mau: ten, ky_hieu: kh })
    onSaved(saved)
    onClose()
  }

  return (
    <div style={overlay} role="presentation" onMouseDown={onClose}>
      <div style={box} role="dialog" aria-labelledby="them-mau-hd-title" onMouseDown={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <span id="them-mau-hd-title">Thêm mẫu hóa đơn</span>
          <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }} onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>
        <div style={bodyStyle}>
          <div>
            <label style={lbl}>Mẫu HĐ</label>
            <input style={inp} value={maMau} onChange={(e) => setMaMau(e.target.value)} placeholder="Ví dụ: 1" />
          </div>
          <div>
            <label style={lbl}>Tên mẫu HĐ</label>
            <input style={inp} value={tenMau} onChange={(e) => setTenMau(e.target.value)} placeholder="Tên theo thông tư / kê khai" />
          </div>
          <div>
            <label style={lbl}>Ký hiệu HĐ (gợi ý)</label>
            <input style={inp} value={kyHieu} onChange={(e) => setKyHieu(e.target.value)} placeholder="Ví dụ: K25TYY" />
          </div>
        </div>
        <div style={footerStyle}>
          <button type="button" style={formFooterButtonCancel} onClick={onClose}>
            Hủy bỏ
          </button>
          <button type="button" style={formFooterButtonSave} onClick={handleLuu}>
            Lưu
          </button>
        </div>
      </div>
    </div>
  )
}
