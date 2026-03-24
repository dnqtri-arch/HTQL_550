/**
 * Danh mục Khách hàng — Phân hệ Bán hàng.
 * Module độc lập, không import component/logic từ purchase/muahang.
 * Tuân thủ htql-core-standards.mdc: viết liền, zIndex 4000, Toast 3200ms.
 */
import { useState, useCallback } from 'react'
import { Trash2, Plus, X, Search } from 'lucide-react'
import {
  khachHangGetAll,
  khachHangCreate,
  khachHangUpdate,
  khachHangDelete,
  khachHangSinhMa,
  type KhachHangRecord,
} from './khachHangApi'
import { formFooterButtonCancel, formFooterButtonSave, formFooterButtonSaveAndAdd } from '../../../constants/formFooterButtons'

// ─── Styles nội bộ ──────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  height: 24, lineHeight: '22px', padding: '0 4px', fontSize: 11,
  fontFamily: 'inherit', background: 'var(--bg-tab)',
  border: '1px solid var(--border)', color: 'var(--text-primary)',
  boxSizing: 'border-box', width: '100%',
}
const lbl: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2, display: 'block',
}
const fieldWrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', marginBottom: 8 }
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 4000,
}
const dialogStyle: React.CSSProperties = {
  background: 'var(--bg-tab)', border: '1px solid var(--border)',
  borderRadius: 8, width: 520, maxWidth: '95vw',
  boxShadow: '0 8px 32px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column',
}

// ─── Form thêm / sửa Khách hàng ─────────────────────────────────────────────
interface KhachHangFormProps {
  mode: 'add' | 'edit'
  initial?: KhachHangRecord
  onClose: () => void
  onSaved: (record: KhachHangRecord) => void
  onSavedAndAdd?: () => void
}

function KhachHangForm({ mode, initial, onClose, onSaved, onSavedAndAdd }: KhachHangFormProps) {
  const [maKh, setMaKh] = useState(initial?.ma_kh ?? khachHangSinhMa())
  const [tenKh, setTenKh] = useState(initial?.ten_kh ?? '')
  const [diaChi, setDiaChi] = useState(initial?.dia_chi ?? '')
  const [maSoThue, setMaSoThue] = useState(initial?.ma_so_thue ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [dienThoai, setDienThoai] = useState(initial?.dien_thoai ?? '')
  const [soNgayDuocNo, setSoNgayDuocNo] = useState(initial?.so_ngay_duoc_no ?? '')
  const [soNoToiDa, setSoNoToiDa] = useState(initial?.so_no_toi_da ?? '')
  const [ghiChu, setGhiChu] = useState(initial?.ghi_chu ?? '')
  const [isNhaCungCap, setIsNhaCungCap] = useState(initial?.isNhaCungCap ?? false)
  const [err, setErr] = useState('')

  const buildPayload = (): Omit<KhachHangRecord, 'id'> => ({
    ma_kh: maKh.trim(),
    ten_kh: tenKh.trim(),
    dia_chi: diaChi.trim() || undefined,
    ma_so_thue: maSoThue.trim() || undefined,
    email: email.trim() || undefined,
    dien_thoai: dienThoai.trim() || undefined,
    so_ngay_duoc_no: soNgayDuocNo.trim() || undefined,
    so_no_toi_da: soNoToiDa.trim() || undefined,
    ghi_chu: ghiChu.trim() || undefined,
    isNhaCungCap,
  })

  const validate = (): boolean => {
    if (!maKh.trim()) { setErr('Mã khách hàng không được để trống.'); return false }
    if (!tenKh.trim()) { setErr('Tên khách hàng không được để trống.'); return false }
    setErr('')
    return true
  }

  const handleLuu = () => {
    if (!validate()) return
    const payload = buildPayload()
    let saved: KhachHangRecord
    if (mode === 'edit' && initial) {
      saved = khachHangUpdate(initial.id, payload) ?? { ...initial, ...payload }
    } else {
      saved = khachHangCreate(payload)
    }
    onSaved(saved)
    onClose()
  }

  const handleLuuVaTiepTuc = () => {
    if (!validate()) return
    const payload = buildPayload()
    const saved = khachHangCreate(payload)
    onSaved(saved)
    onSavedAndAdd?.()
    setMaKh(khachHangSinhMa())
    setTenKh('')
    setDiaChi('')
    setMaSoThue('')
    setEmail('')
    setDienThoai('')
    setSoNgayDuocNo('')
    setSoNoToiDa('')
    setGhiChu('')
    setIsNhaCungCap(false)
    setErr('')
  }

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={dialogStyle}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
            {mode === 'add' ? 'Thêm khách hàng' : 'Sửa khách hàng'}
          </span>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 2 }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '12px 16px', overflowY: 'auto', maxHeight: '70vh' }}>
          {err && (
            <div style={{ color: '#dc2626', fontSize: 11, marginBottom: 8, padding: '4px 8px', background: '#fef2f2', borderRadius: 4 }}>
              {err}
            </div>
          )}

          {/* Grid 2 cột */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div style={fieldWrap}>
              <label style={lbl}>Mã khách hàng <span style={{ color: '#dc2626' }}>*</span></label>
              <input style={inp} value={maKh} onChange={(e) => setMaKh(e.target.value)} />
            </div>
            <div style={fieldWrap}>
              <label style={lbl}>Tên khách hàng <span style={{ color: '#dc2626' }}>*</span></label>
              <input style={inp} value={tenKh} onChange={(e) => setTenKh(e.target.value)} />
            </div>
            <div style={{ ...fieldWrap, gridColumn: '1 / -1' }}>
              <label style={lbl}>Địa chỉ</label>
              <input style={inp} value={diaChi} onChange={(e) => setDiaChi(e.target.value)} />
            </div>
            <div style={fieldWrap}>
              <label style={lbl}>Mã số thuế</label>
              <input style={inp} value={maSoThue} onChange={(e) => setMaSoThue(e.target.value)} />
            </div>
            <div style={fieldWrap}>
              <label style={lbl}>Điện thoại</label>
              <input style={inp} value={dienThoai} onChange={(e) => setDienThoai(e.target.value)} />
            </div>
            <div style={fieldWrap}>
              <label style={lbl}>Email</label>
              <input style={{ ...inp, gridColumn: '1 / -1' }} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div style={fieldWrap}>
              <label style={lbl}>Số ngày được nợ</label>
              <input style={inp} type="number" min={0} value={soNgayDuocNo} onChange={(e) => setSoNgayDuocNo(e.target.value)} />
            </div>
            <div style={fieldWrap}>
              <label style={lbl}>Số nợ tối đa</label>
              <input style={inp} type="number" min={0} value={soNoToiDa} onChange={(e) => setSoNoToiDa(e.target.value)} />
            </div>
            <div style={{ ...fieldWrap, gridColumn: '1 / -1' }}>
              <label style={lbl}>Ghi chú</label>
              <textarea style={{ ...inp, height: 48, resize: 'vertical' }}
                value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
            </div>
          </div>

          {/* Checkbox: Là Nhà cung cấp */}
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', marginTop: 4 }}>
            <input
              type="checkbox"
              checked={isNhaCungCap}
              onChange={(e) => setIsNhaCungCap(e.target.checked)}
              style={{ width: 14, height: 14 }}
            />
            <span style={{ color: 'var(--text-primary)' }}>Là Nhà cung cấp</span>
          </label>
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button type="button" style={formFooterButtonCancel} onClick={onClose}>Hủy bỏ</button>
          <button type="button" style={formFooterButtonSave} onClick={handleLuu}>Lưu</button>
          {mode === 'add' && (
            <button type="button" style={formFooterButtonSaveAndAdd} onClick={handleLuuVaTiepTuc}>Lưu và tiếp tục</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Danh sách Khách hàng ────────────────────────────────────────────────────
interface KhachHangProps {
  onQuayLai?: () => void
}

export function KhachHang({ onQuayLai }: KhachHangProps) {
  const [list, setList] = useState<KhachHangRecord[]>(() => khachHangGetAll())
  const [selected, setSelected] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editRecord, setEditRecord] = useState<KhachHangRecord | undefined>(undefined)
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add')
  const [timKiem, setTimKiem] = useState('')

  const reload = useCallback(() => setList(khachHangGetAll()), [])

  const danhSachFilter = list.filter((r) => {
    if (!timKiem.trim()) return true
    const q = timKiem.toLowerCase()
    return (
      r.ma_kh.toLowerCase().includes(q) ||
      r.ten_kh.toLowerCase().includes(q) ||
      (r.dien_thoai ?? '').toLowerCase().includes(q)
    )
  })

  const handleThem = () => {
    setEditRecord(undefined)
    setFormMode('add')
    setShowForm(true)
  }

  const handleSua = (r: KhachHangRecord) => {
    setEditRecord(r)
    setFormMode('edit')
    setShowForm(true)
  }

  const handleXoa = () => {
    if (!selected) return
    const r = list.find((x) => x.id === selected)
    if (!r) return
    if (!window.confirm(`Xóa khách hàng "${r.ten_kh}" (${r.ma_kh})?\n\nThao tác này không thể hoàn tác.`)) return
    khachHangDelete(selected)
    setSelected(null)
    reload()
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
        borderBottom: '1px solid var(--border)', flexWrap: 'wrap',
      }}>
        {onQuayLai && (
          <button type="button"
            style={{ fontSize: 11, padding: '3px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit' }}
            onClick={onQuayLai}>
            ← Quay lại
          </button>
        )}
        <button type="button"
          style={{ fontSize: 11, padding: '3px 8px', background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={handleThem}>
          <Plus size={12} /> Thêm
        </button>
        <button type="button"
          style={{ fontSize: 11, padding: '3px 8px', background: selected ? '#dc2626' : 'var(--bg-secondary)', color: selected ? '#fff' : 'var(--text-muted)', border: `1px solid ${selected ? '#dc2626' : 'var(--border)'}`, borderRadius: 3, cursor: selected ? 'pointer' : 'default', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={handleXoa}
          disabled={!selected}>
          <Trash2 size={12} /> Xóa
        </button>

        {/* Tìm kiếm */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, border: '1px solid var(--border)', borderRadius: 3, padding: '0 6px', height: 24, background: 'var(--bg-tab)' }}>
          <Search size={11} color="var(--text-secondary)" />
          <input
            style={{ border: 'none', background: 'transparent', fontSize: 11, color: 'var(--text-primary)', outline: 'none', width: 160 }}
            placeholder="Tìm kiếm..."
            value={timKiem}
            onChange={(e) => setTimKiem(e.target.value)}
          />
        </div>
      </div>

      {/* Bảng danh sách */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th style={{ padding: '6px 8px', textAlign: 'left', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)', fontWeight: 600, width: 80 }}>Mã KH</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Tên khách hàng</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)', fontWeight: 600, width: 120 }}>Điện thoại</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)', fontWeight: 600, width: 120 }}>Mã số thuế</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)', fontWeight: 600, width: 80 }}>Là NCC</th>
            </tr>
          </thead>
          <tbody>
            {danhSachFilter.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '16px 10px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  {timKiem ? 'Không tìm thấy kết quả.' : 'Chưa có khách hàng. Bấm Thêm để tạo mới.'}
                </td>
              </tr>
            ) : (
              danhSachFilter.map((r) => (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: selected === r.id ? 'var(--bg-tab-active)' : 'transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelected(selected === r.id ? null : r.id)}
                  onDoubleClick={() => handleSua(r)}
                >
                  <td style={{ padding: '5px 8px' }}>{r.ma_kh}</td>
                  <td style={{ padding: '5px 8px', fontWeight: 500 }}>{r.ten_kh}</td>
                  <td style={{ padding: '5px 8px', color: 'var(--text-secondary)' }}>{r.dien_thoai ?? '—'}</td>
                  <td style={{ padding: '5px 8px', color: 'var(--text-secondary)' }}>{r.ma_so_thue ?? '—'}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                    {r.isNhaCungCap ? (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>✓</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer đếm */}
      <div style={{ padding: '3px 8px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)' }}>
        {danhSachFilter.length} / {list.length} bản ghi
      </div>

      {/* Form thêm / sửa */}
      {showForm && (
        <KhachHangForm
          mode={formMode}
          initial={editRecord}
          onClose={() => setShowForm(false)}
          onSaved={() => reload()}
          onSavedAndAdd={() => { /* form tự reset */ }}
        />
      )}
    </div>
  )
}
