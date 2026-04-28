import { useState, useEffect, useCallback, useRef, useMemo, forwardRef } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { vi as viLocale } from 'date-fns/locale'
import { Plus, Search, Printer, Send, ChevronDown, Trash2 } from 'lucide-react'
import type { PhieuXuatKho, TinhTrangXuatKho } from './type'
import { xuatKhoGetAll, xuatKhoCreate, xuatKhoUpdate, xuatKhoDelete } from './api'
import { XuatKhoForm } from './xuatKhoForm'
import { loadKhoListFromStorage, type KhoStorageItem } from '../khoStorage'
import { formatSoNguyen } from '../../../utils/numberFormat'
import { ConfirmXoaCaptchaModal } from '../../../components/common/confirmXoaCaptchaModal'
import { htqlDatePickerPopper } from '../../../constants/datePickerPlacement'
import { DatePickerReadOnlyTriggerInput } from '../../../components/datePickerReadOnlyTriggerInput'
import 'react-datepicker/dist/react-datepicker.css'

registerLocale('vi', viLocale)

/* ── Task 9: Normalize fuzzy search ─────────────────────────────── */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/* ── Task 10: Màu tình trạng ────────────────────────────────────── */
function mauTinhTrang(tt: TinhTrangXuatKho): React.CSSProperties {
  if (tt === 'Đã xuất kho') return { color: '#fff', background: '#1B5E20', padding: '1px 6px', borderRadius: 10, fontSize: 10, whiteSpace: 'nowrap' }
  if (tt === 'Hủy bỏ') return { color: '#fff', background: '#B71C1C', padding: '1px 6px', borderRadius: 10, fontSize: 10, whiteSpace: 'nowrap' }
  return { color: '#fff', background: '#F57C00', padding: '1px 6px', borderRadius: 10, fontSize: 10, whiteSpace: 'nowrap' }
}

/* ── DatePicker filter input ─────────────────────────────────────── */
const FilterDateInput = forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<'input'>>(
  function FilterDateInput(props, ref) {
    return <DatePickerReadOnlyTriggerInput {...props} ref={ref} style={{ width: 106, height: 26, minHeight: 26 }} />
  }
)

/* ── Date helpers ────────────────────────────────────────────────── */
function dateToIso(d: Date | null): string {
  if (!d) return ''
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

/* ── Styles ──────────────────────────────────────────────────────── */
const inputBase: React.CSSProperties = {
  height: 26, padding: '0 6px', fontSize: 11, boxSizing: 'border-box',
  border: '0.5px solid var(--input-border)', borderRadius: 3,
  background: 'var(--input-bg)', color: 'var(--text-primary)',
}
const btnSt: React.CSSProperties = {
  height: 26, padding: '0 9px', fontSize: 11, borderRadius: 3, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
  boxSizing: 'border-box', flexShrink: 0, border: '0.5px solid var(--border-strong)',
}
const labelSt: React.CSSProperties = { fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', userSelect: 'none' }
/* Task 8: Sticky header */
const thSt: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 2,
  background: '#EEEEEE', color: 'var(--text-primary)',
  fontWeight: 600, fontSize: 11, padding: '3px 6px',
  borderBottom: '1px solid var(--border-strong)',
  borderRight: '0.5px solid var(--border)',
  whiteSpace: 'nowrap', boxSizing: 'border-box',
}
const tdSt: React.CSSProperties = {
  padding: '2px 6px', fontSize: 11, borderBottom: '0.5px solid var(--border)',
  borderRight: '0.5px solid var(--border)', color: 'var(--text-primary)',
}
const tdNumSt: React.CSSProperties = { ...tdSt, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }

/* ── Nút Gửi gộp (tái sử dụng pattern từ khovthh/Page.tsx) ─────── */
function NutGui() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button type="button" style={{ ...btnSt, background: 'var(--bg-tab)', color: 'var(--text-primary)' }}
        onMouseEnter={() => setOpen(true)} onClick={() => setOpen((v) => !v)}>
        <Send size={12} />Gửi<ChevronDown size={10} style={{ marginLeft: 2 }} />
      </button>
      {open && (
        <div onMouseLeave={() => setOpen(false)}
          style={{ position: 'absolute', top: '100%', left: 0, zIndex: 9999, background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 120, padding: 4, marginTop: 2 }}>
          {[
            { label: '✉ Gửi Email', action: () => { setOpen(false); alert('Tính năng Gửi Email đang phát triển.') } },
            { label: '💬 Gửi Zalo', action: () => { setOpen(false); alert('Tính năng Gửi Zalo đang phát triển.') } },
          ].map(({ label, action }) => (
            <button key={label} type="button" onClick={action}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 10px', fontSize: 11, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 3, color: 'var(--text-primary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--row-selected-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Context menu ─────────────────────────────────────────────────── */
interface ContextMenu { x: number; y: number; phieu: PhieuXuatKho }

/* ── Component chính ──────────────────────────────────────────────── */
export function XuatKhoList() {
  const [danhSach, setDanhSach] = useState<PhieuXuatKho[]>([])
  const [khoList, setKhoList] = useState<KhoStorageItem[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null)
  const [editPhieu, setEditPhieu] = useState<PhieuXuatKho | undefined>()
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [deleteCaptchaOpen, setDeleteCaptchaOpen] = useState(false)
  const [phieuDangXoa, setPhieuDangXoa] = useState<PhieuXuatKho | null>(null)

  /* Filter */
  const [filterKho, setFilterKho] = useState('')
  const [filterTinh, setFilterTinh] = useState<TinhTrangXuatKho | ''>('')
  const [tungayDate, setTungayDate] = useState<Date | null>(null)
  const [denngayDate, setDenngayDate] = useState<Date | null>(null)
  const [timkiem, setTimkiem] = useState('')

  /* Scroll sync */
  const tableRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const syncing = useRef(false)
  const onScroll = () => {
    if (syncing.current || !tableRef.current || !footerRef.current) return
    syncing.current = true
    footerRef.current.scrollLeft = tableRef.current.scrollLeft
    syncing.current = false
  }

  const taiDuLieu = useCallback(() => {
    setDanhSach(xuatKhoGetAll())
    setKhoList(loadKhoListFromStorage())
  }, [])

  useEffect(() => { taiDuLieu() }, [taiDuLieu])

  /* Đóng context menu khi click ngoài */
  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [contextMenu])

  /* Task 9+11: useMemo filter + fuzzy search */
  const danhSachHienThi = useMemo(() => {
    const tungay = dateToIso(tungayDate)
    const denngay = dateToIso(denngayDate)
    const kwNorm = normalize(timkiem.trim())
    return danhSach.filter((p) => {
      if (filterKho && p.khoxuat !== filterKho) return false
      if (filterTinh && p.tinhtrang !== filterTinh) return false
      if (tungay && p.ngayxuat < tungay) return false
      if (denngay && p.ngayxuat > denngay) return false
      if (kwNorm) {
        return normalize(p.sophieu).includes(kwNorm)
          || normalize(p.nguoinhan).includes(kwNorm)
          || normalize(p.lenhsanxuat).includes(kwNorm)
      }
      return true
    })
  }, [danhSach, filterKho, filterTinh, tungayDate, denngayDate, timkiem])

  const tongGiaTri = useMemo(() => danhSachHienThi.reduce((s, p) => s + p.tonggiatri, 0), [danhSachHienThi])

  /* Tên kho */
  function tenKho(id: string): string {
    return khoList.find((k) => k.id === id)?.label ?? id
  }

  /* Format ngày dd/mm/yyyy */
  function fmtNgay(iso: string): string {
    const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/)
    return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso ?? '')
  }

  /* ── Actions ──────────────────────────────────────────────────── */
  const handleLuu = useCallback((data: Omit<PhieuXuatKho, 'id' | 'ngaytao'>) => {
    if (formMode === 'add') {
      xuatKhoCreate(data)
    } else if (editPhieu) {
      xuatKhoUpdate({ ...editPhieu, ...data })
    }
    taiDuLieu()
    setFormMode(null)
    setEditPhieu(undefined)
  }, [formMode, editPhieu, taiDuLieu])

  const handleXuatKho = (phieu: PhieuXuatKho) => {
    if (phieu.tinhtrang === 'Đã xuất kho') { alert('Phiếu đã xuất kho rồi.'); return }
    if (!window.confirm(`Xác nhận xuất kho phiếu ${phieu.sophieu}?`)) return
    xuatKhoUpdate({ ...phieu, tinhtrang: 'Đã xuất kho' })
    taiDuLieu()
  }

  const handleHuy = (phieu: PhieuXuatKho) => {
    if (!window.confirm(`Hủy bỏ phiếu ${phieu.sophieu}? Thao tác này không thể hoàn tác.`)) return
    xuatKhoUpdate({ ...phieu, tinhtrang: 'Hủy bỏ' })
    taiDuLieu()
  }

  const moXoaPhieu = (phieu: PhieuXuatKho) => {
    setPhieuDangXoa(phieu)
    setDeleteCaptchaOpen(true)
  }

  const xoaVinhVienSauCaptcha = () => {
    if (!phieuDangXoa) return
    xuatKhoDelete(phieuDangXoa.id)
    if (selected === phieuDangXoa.id) setSelected(null)
    setDeleteCaptchaOpen(false)
    setPhieuDangXoa(null)
    taiDuLieu()
  }

  const selectedPhieu = danhSach.find((p) => p.id === selected)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 400, background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* ── Filter Bar ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 0', marginBottom: 4, flexWrap: 'nowrap', overflowX: 'auto' }}>

        <button type="button" style={{ ...btnSt, background: 'var(--accent)', color: '#fff', border: '0.5px solid var(--accent)' }}
          onClick={() => { setFormMode('add'); setEditPhieu(undefined) }}>
          <Plus size={12} />Thêm phiếu
        </button>

        <button type="button" style={{ ...btnSt, background: 'var(--bg-tab)', color: 'var(--text-primary)' }}
          title="In danh sách phiếu xuất kho"
          onClick={() => alert('Tính năng In đang phát triển.')}>
          <Printer size={12} />In
        </button>

        {/* Task 7: NutGui tái sử dụng */}
        <NutGui />

        {/* Nút Xóa per nut.mdc */}
        <button type="button"
          style={{ ...btnSt, background: 'var(--bg-tab)', color: selected ? '#e53935' : 'var(--text-muted)', border: `0.5px solid ${selected ? '#e53935' : 'var(--border)'}` }}
          disabled={!selected}
          onClick={() => selectedPhieu && moXoaPhieu(selectedPhieu)}>
          <Trash2 size={12} />Xóa
        </button>

        <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />

        <span style={labelSt}>Kho</span>
        <select value={filterKho} onChange={(e) => setFilterKho(e.target.value)}
          style={{ ...inputBase, minWidth: 80, maxWidth: 180, width: 'auto', flexShrink: 0 }}>
          <option value="">Tất cả</option>
          {khoList.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>

        <span style={labelSt}>Tình trạng</span>
        <select value={filterTinh} onChange={(e) => setFilterTinh(e.target.value as TinhTrangXuatKho | '')}
          style={{ ...inputBase, minWidth: 100, flexShrink: 0 }}>
          <option value="">Tất cả</option>
          <option value="Chờ duyệt">Chờ duyệt</option>
          <option value="Đã xuất kho">Đã xuất kho</option>
          <option value="Hủy bỏ">Hủy bỏ</option>
        </select>

        {/* Task 8: DatePicker chuẩn */}
        <span style={labelSt}>Từ</span>
        <div style={{ width: 106, flexShrink: 0 }} className="htql-datepicker-full-width">
          <DatePicker selected={tungayDate} onChange={setTungayDate} dateFormat="dd/MM/yyyy" locale="vi"
            customInput={<FilterDateInput />} {...htqlDatePickerPopper} />
        </div>
        <span style={labelSt}>Đến</span>
        <div style={{ width: 106, flexShrink: 0 }} className="htql-datepicker-full-width">
          <DatePicker selected={denngayDate} onChange={setDenngayDate} dateFormat="dd/MM/yyyy" locale="vi"
            customInput={<FilterDateInput />} {...htqlDatePickerPopper} />
        </div>

        {/* Task 9: Fuzzy search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '1 1 140px', minWidth: 120 }}>
          <Search size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input type="text" placeholder="Số phiếu, người nhận, lệnh SX..." value={timkiem}
            onChange={(e) => setTimkiem(e.target.value)}
            style={{ ...inputBase, width: '100%', minWidth: 0 }} />
        </div>
      </div>

      {/* ── Bảng ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, border: '0.5px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div ref={tableRef} onScroll={onScroll} style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%', minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ ...thSt, width: 34, textAlign: 'center' }}>STT</th>
                <th style={{ ...thSt, width: 120 }}>Số phiếu</th>
                <th style={{ ...thSt, width: 80, textAlign: 'right' }}>Ngày xuất</th>
                <th style={{ ...thSt, minWidth: 120 }}>Người nhận</th>
                <th style={{ ...thSt, minWidth: 100 }}>Kho xuất</th>
                <th style={{ ...thSt, minWidth: 130 }}>Lệnh SX / Công trình</th>
                <th style={{ ...thSt, width: 90, textAlign: 'center' }}>Tình trạng</th>
                <th style={{ ...thSt, width: 110, textAlign: 'right' }}>Giá trị</th>
                <th style={{ ...thSt, minWidth: 120 }}>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {danhSachHienThi.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 11 }}>
                    {timkiem.trim() ? `Không tìm thấy dữ liệu phù hợp với "${timkiem}"` : 'Không tìm thấy dữ liệu phù hợp'}
                  </td>
                </tr>
              )}
              {danhSachHienThi.map((p, idx) => {
                const bg = idx % 2 === 0 ? '#fff' : '#f5f5f5'
                const bgSel = selected === p.id ? 'var(--row-selected-bg)' : bg
                return (
                  <tr key={p.id}
                    style={{ background: bgSel, cursor: 'pointer' }}
                    onClick={() => setSelected(p.id === selected ? null : p.id)}
                    onDoubleClick={() => { setEditPhieu(p); setFormMode('edit') }}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, phieu: p }) }}>
                    <td style={{ ...tdSt, textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ ...tdSt, fontWeight: 500, color: 'var(--accent)' }}>{p.sophieu}</td>
                    <td style={{ ...tdSt, textAlign: 'right' }}>{fmtNgay(p.ngayxuat)}</td>
                    <td style={tdSt}>{p.nguoinhan}</td>
                    <td style={tdSt}>{tenKho(p.khoxuat)}</td>
                    <td style={tdSt}>{p.lenhsanxuat || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      <span style={mauTinhTrang(p.tinhtrang)}>{p.tinhtrang}</span>
                    </td>
                    {/* Task 10: Giá trị căn phải, dấu chấm, đ */}
                    <td style={tdNumSt}>
                      {p.tonggiatri > 0 ? `${formatSoNguyen(p.tonggiatri)} đ` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    {/* Task 11: Tooltip ghi chú */}
                    <td style={{ ...tdSt, maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.ghichu || undefined}>
                        {p.ghichu || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer sticky */}
        {danhSachHienThi.length > 0 && (
          <div ref={footerRef} style={{ overflow: 'hidden', flexShrink: 0, borderTop: '1.5px solid var(--border-strong)' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%', minWidth: 900 }}>
              <tbody>
                <tr style={{ background: '#e8e8e8' }}>
                  <td colSpan={7} style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, fontSize: 11 }}>
                    Tổng cộng ({danhSachHienThi.length} phiếu):
                  </td>
                  <td style={{ ...tdNumSt, background: '#e8e8e8', fontWeight: 700 }}>
                    {formatSoNguyen(tongGiaTri)} đ
                  </td>
                  <td style={{ background: '#e8e8e8', borderBottom: '0.5px solid var(--border)' }} />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dòng gợi ý */}
      <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '3px 2px 0', flexShrink: 0 }}>
        {danhSachHienThi.length} / {danhSach.length} phiếu — Double-click để chỉnh sửa · Chuột phải để thao tác nhanh
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 9999, background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', minWidth: 160, padding: 4 }}>
          {[
            {
              label: '✏️ Chỉnh sửa',
              action: () => { setEditPhieu(contextMenu.phieu); setFormMode('edit'); setContextMenu(null) },
            },
            {
              label: '✅ Xuất kho',
              disabled: contextMenu.phieu.tinhtrang === 'Đã xuất kho' || contextMenu.phieu.tinhtrang === 'Hủy bỏ',
              action: () => { handleXuatKho(contextMenu.phieu); setContextMenu(null) },
            },
            {
              label: '❌ Hủy bỏ phiếu',
              disabled: contextMenu.phieu.tinhtrang === 'Hủy bỏ',
              action: () => { handleHuy(contextMenu.phieu); setContextMenu(null) },
            },
            {
              label: '🗑️ Xóa',
              danger: true,
              action: () => { moXoaPhieu(contextMenu.phieu); setContextMenu(null) },
            },
          ].map(({ label, action, disabled, danger }) => (
            <button key={label} type="button"
              disabled={disabled}
              onClick={action}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 10px', fontSize: 11, border: 'none', background: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer', borderRadius: 3, color: disabled ? 'var(--text-muted)' : danger ? '#e53935' : 'var(--text-primary)', opacity: disabled ? 0.5 : 1 }}
              onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = 'var(--row-selected-bg)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
              {label}
            </button>
          ))}
        </div>
      )}

      <ConfirmXoaCaptchaModal
        open={deleteCaptchaOpen}
        onClose={() => { setDeleteCaptchaOpen(false); setPhieuDangXoa(null) }}
        onConfirm={xoaVinhVienSauCaptcha}
        title="Xóa phiếu xuất kho"
        message={
          <div>
            Bạn sắp xóa vĩnh viễn phiếu <strong>{phieuDangXoa?.sophieu}</strong>.
            <br />
            Thao tác không hoàn tác.
          </div>
        }
      />

      {/* Form modal */}
      {formMode && (
        <XuatKhoForm
          mode={formMode}
          phieu={editPhieu}
          onLuu={handleLuu}
          onClose={() => { setFormMode(null); setEditPhieu(undefined) }}
        />
      )}
    </div>
  )
}
