import { useState } from 'react'
import { X, HelpCircle } from 'lucide-react'
import type { DieuKhoanThanhToanItem } from './nhaCungCapApi'
import { formFooterButtonCancel, formFooterButtonSave, formFooterButtonSaveAndAdd } from '../../constants/formFooterButtons'
import { formatSoNguyenInput, formatSoTien, isZeroDisplay, parseFloatVN } from '../../utils/numberFormat'

interface ThemDieuKhoanThanhToanModalProps {
  onClose: () => void
  onSave: (item: DieuKhoanThanhToanItem) => void
  onSaveAndAdd?: (item: DieuKhoanThanhToanItem) => void
  /** Danh sách hiện có để kiểm tra trùng mã */
  existingItems?: DieuKhoanThanhToanItem[]
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2100,
}

const boxStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  width: 420,
  maxWidth: '95vw',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
  overflow: 'hidden',
}

const headerStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'var(--bg-tab)',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-primary)',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: 4,
  display: 'block',
  minWidth: 140,
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

const btnSecondary: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 11,
  border: '1px solid var(--border)',
  borderRadius: 4,
  cursor: 'pointer',
  background: 'var(--bg-tab)',
  color: 'var(--text-primary)',
}

export function ThemDieuKhoanThanhToanModal({
  onClose,
  onSave,
  onSaveAndAdd,
  existingItems = [],
}: ThemDieuKhoanThanhToanModalProps) {
  const [ten, setTen] = useState('')
  /** Số ngày công nợ — hiển thị/ nhập theo số nguyên dương >= 0 (formatSoNguyenInput) */
  const [soNgayDisplay, setSoNgayDisplay] = useState('0')
  /** Số công nợ tối đa — hiển thị/nhập theo số tiền (formatSoTien) */
  const [soCongNoDisplay, setSoCongNoDisplay] = useState('0')
  const [loi, setLoi] = useState('')

  /** Mã = chữ cái đầu tiên của ô Tên (khóa, không cho sửa) */
  const maHienThi = ten.trim().charAt(0).toUpperCase()

  const handleCất = () => {
    const tenTrim = ten.trim()
    const maTrim = maHienThi
    if (!tenTrim) {
      setLoi('Tên là bắt buộc.')
      return
    }
    if (!maTrim) {
      setLoi('Tên phải có ít nhất một ký tự để tạo Mã.')
      return
    }
    if (existingItems.some((x) => x.ma === maTrim && x.ten === tenTrim)) {
      setLoi('Điều khoản này đã tồn tại.')
      return
    }
    setLoi('')
    const soNgayCongNo = Math.max(0, Math.floor(parseFloatVN(soNgayDisplay)))
    const soCongNoToiDa = parseFloatVN(soCongNoDisplay)
    const item: DieuKhoanThanhToanItem = {
      ma: maTrim,
      ten: tenTrim,
      so_ngay_duoc_no: soNgayCongNo,
      so_cong_no_toi_da: soCongNoToiDa,
    }
    onSave(item)
    onClose()
  }

  const handleCấtVaThem = () => {
    const tenTrim = ten.trim()
    const maTrim = maHienThi
    if (!tenTrim) {
      setLoi('Tên là bắt buộc.')
      return
    }
    if (!maTrim) {
      setLoi('Tên phải có ít nhất một ký tự để tạo Mã.')
      return
    }
    if (existingItems.some((x) => x.ma === maTrim && x.ten === tenTrim)) {
      setLoi('Điều khoản này đã tồn tại.')
      return
    }
    setLoi('')
    const soNgayCongNo = Math.max(0, Math.floor(parseFloatVN(soNgayDisplay)))
    const soCongNoToiDa = parseFloatVN(soCongNoDisplay)
    const item: DieuKhoanThanhToanItem = {
      ma: maTrim,
      ten: tenTrim,
      so_ngay_duoc_no: soNgayCongNo,
      so_cong_no_toi_da: soCongNoToiDa,
    }
    onSaveAndAdd?.(item)
    setTen('')
    setSoNgayDisplay('0')
    setSoCongNoDisplay('0')
    setLoi('')
  }

  return (
    <div
      style={overlayStyle}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={boxStyle} onMouseDown={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <span>Thêm Điều khoản thanh toán</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button type="button" style={{ ...btnSecondary, padding: 4, minWidth: 28 }} title="Giúp" aria-label="Giúp">
              <HelpCircle size={16} />
            </button>
            <button type="button" style={{ ...btnSecondary, padding: 4, minWidth: 28 }} onClick={onClose} aria-label="Đóng">
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={labelStyle}>Mã (*)</label>
            <input readOnly style={{ ...inputStyle, borderColor: !maHienThi ? 'var(--accent)' : undefined, background: 'var(--bg-tab)', cursor: 'not-allowed' }} value={maHienThi} placeholder="Tự điền từ tên" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={labelStyle}>Tên (*)</label>
            <input style={{ ...inputStyle, borderColor: !ten.trim() ? 'var(--accent)' : undefined }} value={ten} onChange={(e) => setTen(e.target.value)} placeholder="" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={labelStyle}>Số ngày công nợ</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
              <input
                type="text"
                inputMode="numeric"
                className="htql-no-spinner"
                style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                value={soNgayDisplay}
                onChange={(e) => setSoNgayDisplay(formatSoNguyenInput(e.target.value))}
                onFocus={() => { if (isZeroDisplay(soNgayDisplay)) setSoNgayDisplay('') }}
                onBlur={() => { if (soNgayDisplay === '') setSoNgayDisplay('0') }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-primary)', flexShrink: 0 }}>ngày</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={labelStyle}>Số công nợ tối đa</label>
            <input
              type="text"
              inputMode="decimal"
              className="htql-no-spinner"
              style={{ ...inputStyle, flex: 1, minWidth: 0 }}
              value={soCongNoDisplay}
              onChange={(e) => setSoCongNoDisplay(formatSoTien(e.target.value))}
              onFocus={() => { if (isZeroDisplay(soCongNoDisplay)) setSoCongNoDisplay('') }}
              onBlur={() => { if (soCongNoDisplay === '') setSoCongNoDisplay('0') }}
            />
          </div>

          {loi && <p style={{ fontSize: 11, color: 'var(--accent)', margin: 0 }}>{loi}</p>}

          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <a href="#video" style={{ fontSize: 11, color: 'var(--accent)' }} onClick={(e) => e.preventDefault()}>Xem video hướng dẫn</a>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" style={formFooterButtonCancel} onClick={onClose}>Hủy bỏ</button>
              <button type="button" style={formFooterButtonSave} onClick={handleCất}>Lưu</button>
              {onSaveAndAdd && (
                <button type="button" style={formFooterButtonSaveAndAdd} onClick={handleCấtVaThem}>Lưu và tiếp tục</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
