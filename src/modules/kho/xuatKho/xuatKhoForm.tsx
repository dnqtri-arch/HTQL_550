import { useState, useEffect, useRef, forwardRef } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { vi as viLocale } from 'date-fns/locale'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import type { PhieuXuatKho, ChiTietXuatKho, TonKhoSnapshot } from './type'
import { autoGenSoPhieu, layTonKhoHienTai, tinhTongGiaTri } from './api'
import { loadKhoListFromStorage } from '../khoStorage'
import { htqlDatePickerPopper } from '../../../constants/datePickerPlacement'
import { DatePickerReadOnlyTriggerInput } from '../../../components/datePickerReadOnlyTriggerInput'
import { formatSoNguyen } from '../../../utils/numberFormat'
import {
  formFooterButtonCancel,
  formFooterButtonSave,
  formFooterButtonSaveAndAdd,
} from '../../../constants/formFooterButtons'
import 'react-datepicker/dist/react-datepicker.css'

registerLocale('vi', viLocale)

/* ── Types ──────────────────────────────────────────────────────── */
type Mode = 'add' | 'edit'

interface Props {
  mode: Mode
  phieu?: PhieuXuatKho
  onLuu: (phieu: Omit<PhieuXuatKho, 'id' | 'ngaytao'>) => void
  onClose: () => void
}

/* ── Helpers ────────────────────────────────────────────────────── */
function dateToIso(d: Date | null): string {
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function isoToDate(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/* ── Custom DatePicker input cho form ────────────────────────────── */
const FormDateInput = forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<'input'>>(
  function FormDateInput(props, ref) {
    return (
      <DatePickerReadOnlyTriggerInput
        {...props}
        ref={ref}
        style={{ width: '100%', height: 24, minHeight: 24 }}
      />
    )
  }
)

/* ── Styles ─────────────────────────────────────────────────────── */
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
const modal: React.CSSProperties = {
  background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)',
  borderRadius: 6, boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
  width: 'min(860px, 96vw)', maxHeight: '90vh',
  display: 'flex', flexDirection: 'column',
  pointerEvents: 'auto',
}
const headerSt: React.CSSProperties = {
  padding: '8px 14px', borderBottom: '1px solid var(--border-strong)',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
}
const bodySt: React.CSSProperties = {
  flex: 1, overflow: 'auto', padding: '10px 14px',
  display: 'flex', flexDirection: 'column', gap: 8,
}
const rowSt: React.CSSProperties = { display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }
const fieldSt: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 3 }
const labelSt: React.CSSProperties = { fontSize: 11, color: 'var(--text-secondary)', userSelect: 'none' }
const inputSt: React.CSSProperties = {
  height: 24, padding: '0 6px', fontSize: 11, boxSizing: 'border-box',
  border: '1px solid var(--border)', borderRadius: 3,
  background: 'var(--input-bg)', color: 'var(--text-primary)',
}
const inputErrSt: React.CSSProperties = { ...inputSt, borderColor: '#e53935', background: '#fff5f5' }
const footerSt: React.CSSProperties = {
  padding: '8px 14px', borderTop: '1px solid var(--border)',
  display: 'flex', justifyContent: 'flex-end', gap: 6,
}
const thSt: React.CSSProperties = {
  padding: '3px 5px', fontSize: 11, fontWeight: 600,
  background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)',
  textAlign: 'left', whiteSpace: 'nowrap', position: 'sticky', top: 0,
}

/* ── Component chính ─────────────────────────────────────────────── */
export function XuatKhoForm({ mode, phieu, onLuu, onClose }: Props) {
  const khoList = loadKhoListFromStorage()

  /* State form header */
  const [sophieu] = useState(() => mode === 'add' ? autoGenSoPhieu() : (phieu?.sophieu ?? ''))
  const [ngayxuatDate, setNgayxuatDate] = useState<Date | null>(() =>
    mode === 'edit' ? isoToDate(phieu?.ngayxuat ?? '') : new Date()
  )
  const [nguoinhan, setNguoinhan] = useState(phieu?.nguoinhan ?? '')
  const [khoxuat, setKhoxuat] = useState(phieu?.khoxuat ?? (khoList[0]?.id ?? ''))
  const [lenhsanxuat, setLenhsanxuat] = useState(phieu?.lenhsanxuat ?? '')
  const [ghichu, setGhichu] = useState(phieu?.ghichu ?? '')
  const [tinhtrang, setTinhtrang] = useState(phieu?.tinhtrang ?? 'Chờ duyệt' as const)

  /* State chi tiết */
  const [chitiet, setChitiet] = useState<ChiTietXuatKho[]>(
    phieu?.chitiet ?? []
  )

  /* Task 6: map tồn kho — dùng để cảnh báo */
  const [tonMap, setTonMap] = useState<Map<string, TonKhoSnapshot>>(new Map())
  useEffect(() => {
    setTonMap(layTonKhoHienTai(khoxuat || undefined))
  }, [khoxuat])

  const [error, setError] = useState('')

  /* Thêm dòng chi tiết mới */
  const themDong = () => {
    setChitiet((prev) => [
      ...prev,
      { id: `ct-${Date.now()}`, mavthh: '', tenvthh: '', dvt: '', soluongton: 0, soluong: 0, dongia: 0, thanhtien: 0 },
    ])
  }

  /* Xóa dòng chi tiết */
  const xoaDong = (id: string) => setChitiet((prev) => prev.filter((r) => r.id !== id))

  /* Cập nhật dòng chi tiết */
  const capNhatDong = (id: string, key: keyof ChiTietXuatKho, value: string | number) => {
    setChitiet((prev) => prev.map((r) => {
      if (r.id !== id) return r
      const updated = { ...r, [key]: value }
      /* Auto-fill từ tonMap khi nhập mã VTHH */
      if (key === 'mavthh') {
        const ma = String(value).trim().toUpperCase()
        const snap = tonMap.get(ma)
        if (snap) {
          updated.tenvthh = snap.tenvthh
          updated.dvt = snap.dvt
          updated.soluongton = snap.soluongton
        } else {
          updated.soluongton = 0
        }
        updated.mavthh = ma
      }
      /* Tính thành tiền */
      if (key === 'soluong' || key === 'dongia') {
        const sl = key === 'soluong' ? Number(value) : updated.soluong
        const dg = key === 'dongia' ? Number(value) : updated.dongia
        updated.thanhtien = sl * dg
      }
      return updated
    }))
  }

  const tongGiaTri = tinhTongGiaTri(chitiet)

  /* Task 6: kiểm tra cảnh báo tồn */
  const rowsVuotTon = chitiet.filter((ct) => {
    const snap = tonMap.get((ct.mavthh ?? '').toUpperCase())
    if (!snap) return false
    return ct.soluong > snap.soluongton
  })

  const handleLuu = (tiepTuc: boolean) => {
    if (!nguoinhan.trim()) { setError('Vui lòng nhập Người nhận.'); return }
    if (!khoxuat) { setError('Vui lòng chọn Kho xuất.'); return }
    if (chitiet.length === 0) { setError('Vui lòng thêm ít nhất 1 dòng vật tư.'); return }
    if (rowsVuotTon.length > 0) {
      if (!window.confirm(`Có ${rowsVuotTon.length} vật tư vượt tồn kho. Bạn vẫn muốn lưu không?`)) return
    }
    setError('')

    const data: Omit<PhieuXuatKho, 'id' | 'ngaytao'> = {
      sophieu,
      ngayxuat: dateToIso(ngayxuatDate),
      nguoinhan: nguoinhan.trim(),
      khoxuat,
      lenhsanxuat: lenhsanxuat.trim(),
      tonggiatri: tongGiaTri,
      tinhtrang,
      ghichu: ghichu.trim(),
      chitiet,
    }
    onLuu(data)

    if (tiepTuc) {
      /* Reset form — số phiếu sẽ được tạo mới khi mount lại form */
      onClose()
    } else {
      onClose()
    }
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleMaVthh = (id: string, val: string) => {
    const ma = val.toUpperCase()
    capNhatDong(id, 'mavthh', ma)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const snap = tonMap.get(ma)
      if (snap) capNhatDong(id, 'mavthh', ma)
    }, 200)
  }

  return (
    <div style={overlay}>
      <div style={modal}>

        {/* Header */}
        <div style={headerSt}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
            {mode === 'add' ? 'Thêm phiếu xuất kho' : `Chỉnh sửa: ${phieu?.sophieu}`}
          </span>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Body */}
        <div style={bodySt}>

          {/* Thông báo lỗi */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: '#fff5f5', border: '1px solid #e53935', borderRadius: 4, fontSize: 11, color: '#e53935' }}>
              <AlertTriangle size={13} />{error}
            </div>
          )}

          {/* Task 6: cảnh báo vượt tồn */}
          {rowsVuotTon.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: '#fff8e1', border: '1px solid #f57c00', borderRadius: 4, fontSize: 11, color: '#e65100' }}>
              <AlertTriangle size={13} />
              {rowsVuotTon.map((r) => `${r.mavthh}: xuất ${r.soluong} > tồn ${tonMap.get(r.mavthh)?.soluongton ?? 0}`).join(' | ')}
            </div>
          )}

          {/* Hàng 1: Số phiếu, Ngày xuất, Tình trạng */}
          <div style={rowSt}>
            <div style={{ ...fieldSt, minWidth: 160 }}>
              <span style={labelSt}>Số phiếu</span>
              <input value={sophieu} readOnly style={{ ...inputSt, background: 'var(--bg-tab)', color: 'var(--text-secondary)' }} />
            </div>
            <div style={{ ...fieldSt, minWidth: 130 }}>
              <span style={labelSt}>Ngày xuất</span>
              <div className="htql-datepicker-full-width" style={{ width: 130 }}>
                <DatePicker
                  selected={ngayxuatDate}
                  onChange={setNgayxuatDate}
                  dateFormat="dd/MM/yyyy"
                  locale="vi"
                  customInput={<FormDateInput />}
                  {...htqlDatePickerPopper}
                />
              </div>
            </div>
            <div style={{ ...fieldSt, minWidth: 130 }}>
              <span style={labelSt}>Tình trạng</span>
              <select value={tinhtrang} onChange={(e) => setTinhtrang(e.target.value as typeof tinhtrang)}
                style={{ ...inputSt, minWidth: 130 }}>
                <option value="Chờ duyệt">Chờ duyệt</option>
                <option value="Đã xuất kho">Đã xuất kho</option>
                <option value="Hủy bỏ">Hủy bỏ</option>
              </select>
            </div>
          </div>

          {/* Hàng 2: Người nhận, Kho xuất */}
          <div style={rowSt}>
            <div style={{ ...fieldSt, flex: '1 1 200px', minWidth: 160 }}>
              <span style={labelSt}>Người nhận <span style={{ color: '#e53935' }}>*</span></span>
              <input value={nguoinhan} onChange={(e) => setNguoinhan(e.target.value)}
                placeholder="Tên người nhận..." style={inputSt} />
            </div>
            <div style={{ ...fieldSt, minWidth: 180 }}>
              <span style={labelSt}>Kho xuất <span style={{ color: '#e53935' }}>*</span></span>
              <select value={khoxuat} onChange={(e) => setKhoxuat(e.target.value)} style={{ ...inputSt, minWidth: 180 }}>
                <option value="">-- Chọn kho --</option>
                {khoList.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </div>
          </div>

          {/* Task 4: Lệnh sản xuất / Công trình */}
          <div style={rowSt}>
            <div style={{ ...fieldSt, flex: '1 1 300px', minWidth: 200 }}>
              <span style={labelSt}>Lệnh sản xuất / Công trình</span>
              <input value={lenhsanxuat} onChange={(e) => setLenhsanxuat(e.target.value)}
                placeholder="Số lệnh SX, tên công trình..." style={inputSt} />
            </div>
            <div style={{ ...fieldSt, flex: '1 1 200px', minWidth: 160 }}>
              <span style={labelSt}>Ghi chú</span>
              <input value={ghichu} onChange={(e) => setGhichu(e.target.value)}
                placeholder="Ghi chú thêm..." style={inputSt} />
            </div>
          </div>

          {/* Chi tiết vật tư */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600 }}>Chi tiết vật tư xuất kho</span>
              <button type="button" onClick={themDong}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', fontSize: 11, height: 24, border: '1px solid var(--accent)', borderRadius: 3, background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
                <Plus size={12} />Thêm dòng
              </button>
            </div>
            <div style={{ overflow: 'auto', maxHeight: 280 }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%', minWidth: 700 }}>
                <thead>
                  <tr>
                    <th style={{ ...thSt, width: 32, textAlign: 'center' }}>STT</th>
                    <th style={{ ...thSt, width: 90 }}>Mã VTHH</th>
                    <th style={{ ...thSt, minWidth: 180 }}>Tên VTHH</th>
                    <th style={{ ...thSt, width: 52, textAlign: 'center' }}>ĐVT</th>
                    <th style={{ ...thSt, width: 78, textAlign: 'right' }}>Tồn kho</th>
                    <th style={{ ...thSt, width: 78, textAlign: 'right' }}>Số lượng</th>
                    <th style={{ ...thSt, width: 100, textAlign: 'right' }}>Đơn giá</th>
                    <th style={{ ...thSt, width: 110, textAlign: 'right' }}>Thành tiền</th>
                    <th style={{ ...thSt, width: 30 }} />
                  </tr>
                </thead>
                <tbody>
                  {chitiet.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: 11 }}>
                        Chưa có dòng nào. Nhấn "Thêm dòng" để bắt đầu.
                      </td>
                    </tr>
                  )}
                  {chitiet.map((ct, idx) => {
                    const snap = tonMap.get((ct.mavthh ?? '').toUpperCase())
                    const vuotTon = snap ? ct.soluong > snap.soluongton : false
                    const bg = idx % 2 === 0 ? '#fff' : '#f5f5f5'
                    return (
                      <tr key={ct.id} style={{ background: bg }}>
                        <td style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '0.5px solid var(--border)', color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ padding: '2px 3px', borderBottom: '0.5px solid var(--border)' }}>
                          <input
                            value={ct.mavthh}
                            onChange={(e) => handleMaVthh(ct.id, e.target.value)}
                            placeholder="Mã..."
                            style={{ ...inputSt, width: '100%', textTransform: 'uppercase' }}
                          />
                        </td>
                        <td style={{ padding: '2px 3px', borderBottom: '0.5px solid var(--border)' }}>
                          <input
                            value={ct.tenvthh}
                            onChange={(e) => capNhatDong(ct.id, 'tenvthh', e.target.value)}
                            placeholder="Tên vật tư..."
                            style={{ ...inputSt, width: '100%' }}
                          />
                        </td>
                        <td style={{ padding: '2px 3px', borderBottom: '0.5px solid var(--border)' }}>
                          <input
                            value={ct.dvt}
                            onChange={(e) => capNhatDong(ct.id, 'dvt', e.target.value)}
                            style={{ ...inputSt, width: '100%', textAlign: 'center' }}
                          />
                        </td>
                        {/* Tồn kho — hiển thị snapshot */}
                        <td style={{ padding: '2px 5px', textAlign: 'right', borderBottom: '0.5px solid var(--border)', fontVariantNumeric: 'tabular-nums', color: snap ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {snap ? formatSoNguyen(snap.soluongton) : '—'}
                        </td>
                        {/* Task 6: cảnh báo đỏ khi vượt tồn */}
                        <td style={{ padding: '2px 3px', borderBottom: '0.5px solid var(--border)' }}>
                          <input
                            type="number"
                            min={0}
                            value={ct.soluong || ''}
                            onChange={(e) => capNhatDong(ct.id, 'soluong', parseFloat(e.target.value) || 0)}
                            style={{ ...vuotTon ? inputErrSt : inputSt, width: '100%', textAlign: 'right' }}
                            title={vuotTon ? `Vượt tồn! Tồn hiện có: ${snap?.soluongton}` : undefined}
                          />
                        </td>
                        <td style={{ padding: '2px 3px', borderBottom: '0.5px solid var(--border)' }}>
                          <input
                            type="number"
                            min={0}
                            value={ct.dongia || ''}
                            onChange={(e) => capNhatDong(ct.id, 'dongia', parseFloat(e.target.value) || 0)}
                            style={{ ...inputSt, width: '100%', textAlign: 'right' }}
                          />
                        </td>
                        <td style={{ padding: '2px 5px', textAlign: 'right', borderBottom: '0.5px solid var(--border)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                          {ct.thanhtien > 0 ? `${formatSoNguyen(ct.thanhtien)} đ` : '—'}
                        </td>
                        <td style={{ padding: '2px 4px', textAlign: 'center', borderBottom: '0.5px solid var(--border)' }}>
                          <button type="button" onClick={() => xoaDong(ct.id)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#e53935', display: 'flex', alignItems: 'center', padding: 2 }}>
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {chitiet.length > 0 && (
                  <tfoot>
                    <tr style={{ background: '#e8e8e8' }}>
                      <td colSpan={7} style={{ padding: '3px 5px', textAlign: 'right', fontWeight: 700, fontSize: 11 }}>
                        Tổng cộng ({chitiet.length} dòng):
                      </td>
                      <td style={{ padding: '3px 5px', textAlign: 'right', fontWeight: 700, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                        {formatSoNguyen(tongGiaTri)} đ
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* Footer — per nut.mdc: Hủy bỏ | Lưu | Lưu và tiếp tục */}
        <div style={footerSt}>
          <button type="button" style={formFooterButtonCancel} onClick={onClose}>Hủy bỏ</button>
          <button type="button" style={formFooterButtonSave} onClick={() => handleLuu(false)}>Lưu</button>
          {mode === 'add' && (
            <button type="button" style={formFooterButtonSaveAndAdd} onClick={() => handleLuu(true)}>Lưu và tiếp tục</button>
          )}
        </div>
      </div>
    </div>
  )
}
