import { useState, useEffect, useCallback, useRef, useMemo, forwardRef } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { vi as viLocale } from 'date-fns/locale'
import { Download, Search, X, Printer, Send, ChevronDown } from 'lucide-react'
import type { KhoVthh, KhoVthhFilter } from './type'
import { layDanhSachKhoVthh, layPhieuTheoMaVthh } from './api'
import { formatSoNguyen } from '../../../utils/numberFormat'
import { exportCsv } from '../../../utils/exportCsv'
import { donViTinhGetAll, type DonViTinhRecord } from '../khoHang/donViTinhApi'
import { loadKhoListFromStorage, type KhoStorageItem } from '../khoHang/khoStorage'
import { CURRENT_USER_ROLE, canXemGiaTri } from '../../../constants/userRole'
import { htqlDatePickerPopper } from '../../../constants/datePickerPlacement'
import { DatePickerReadOnlyTriggerInput } from '../../../components/datePickerReadOnlyTriggerInput'
import 'react-datepicker/dist/react-datepicker.css'

registerLocale('vi', viLocale)

/* ═══════════════════════════════════════════════════════════════
   Kích thước cột
══════════════════════════════════════════════════════════════════ */
const COL_STT = 34
const COL_MA = 70
const COL_TEN = 220
const COL_DVT = 52
const COL_SL = 72
const COL_GT = 108

const STICKY_MA_LEFT = COL_STT
const STICKY_TEN_LEFT = COL_STT + COL_MA
const STICKY_DVT_LEFT = COL_STT + COL_MA + COL_TEN

const H_ROW1 = 26
const H_ROW2 = 22

/* Đường kẻ 1px xuyên suốt */
const B1 = '1px solid var(--border-strong)'

const BG_EVEN = '#FFFFFF'
const BG_ODD  = '#F5F5F5'
const BG_HDR  = '#EEEEEE'
const BG_FTR  = '#E8E8E8'

const G = { dauky: '#1565C0', nhapkho: '#1B5E20', xuatkho: '#B71C1C', cuoiky: '#4A148C' }

const userrole = CURRENT_USER_ROLE
const showGiaTri = canXemGiaTri(userrole)

/* ── Helpers chuẩn hóa (fuzzy search) ────────────────────────── */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/* ── Chuyển Date → ISO yyyy-MM-dd ─────────────────────────────── */
function dateToIso(d: Date | null): string {
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/* ═══ Styles ════════════════════════════════════════════════════ */
const pageWrap: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', height: '100%', minHeight: 480,
  background: 'var(--bg-primary)', color: 'var(--text-primary)',
}
const inputBase: React.CSSProperties = {
  height: 26, padding: '0 6px', fontSize: 11, boxSizing: 'border-box',
  border: '0.5px solid var(--input-border)', borderRadius: 3,
  background: 'var(--input-bg)', color: 'var(--text-primary)',
}
const labelSt: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', userSelect: 'none',
}
const btnSt: React.CSSProperties = {
  height: 26, padding: '0 9px', fontSize: 11, borderRadius: 3, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
  boxSizing: 'border-box', flexShrink: 0, border: '0.5px solid var(--border-strong)',
  lineHeight: 1,
}
/* Header th */
const thBase: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 2, background: BG_HDR,
  color: 'var(--text-primary)', fontWeight: 600, fontSize: 11,
  padding: '3px 5px', borderBottom: '0.5px solid var(--border)',
  borderRight: '0.5px solid var(--border)', whiteSpace: 'nowrap',
  boxSizing: 'border-box', height: H_ROW1,
}
const thGroup: React.CSSProperties = { ...thBase, textAlign: 'center', background: '#E4E4E4', borderBottom: B1 }
const thSticky1: React.CSSProperties = { ...thBase, zIndex: 4, position: 'sticky' }
const thSub: React.CSSProperties = { ...thBase, top: H_ROW1, height: H_ROW2, textAlign: 'right', fontSize: 10, fontWeight: 500, zIndex: 2 }
/* Body td */
const tdBase: React.CSSProperties = {
  padding: '2px 5px', fontSize: 11, boxSizing: 'border-box',
  borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)',
  color: 'var(--text-primary)',
}
const tdNum: React.CSSProperties = { ...tdBase, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }

const NCOLS = 4 + (showGiaTri ? 8 : 4)
const initTong = { dkSl: 0, dkGt: 0, nkSl: 0, nkGt: 0, xkSl: 0, xkGt: 0, ckSl: 0, ckGt: 0 }

/* ── Helpers hiển thị ─────────────────────────────────────────── */
function numCell(n: number): React.ReactNode {
  if (n === 0) return <span style={{ color: 'var(--text-muted)' }}>0</span>
  return formatSoNguyen(n)
}
function dvtLabel(dvt: string, list: DonViTinhRecord[]): string {
  if (!dvt) return ''
  const r = list.find((d) => d.ma_dvt === dvt || d.ten_dvt === dvt || (d.ky_hieu != null && d.ky_hieu === dvt))
  return r ? (r.ky_hieu || r.ten_dvt || r.ma_dvt) : dvt
}
function isoToDdMm(iso: string): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso ?? '')
}

/* ── In báo cáo tồn kho ─────────────────────────────────────── */
function inBaoCaoTonKho(ds: KhoVthh[], tong: typeof initTong): void {
  const rows = ds.map((r, i) => {
    const ckSl = r.dauky.soluong + r.nhapkho.soluong - r.xuatkho.soluong
    const ckGt = r.dauky.giatri + r.nhapkho.giatri - r.xuatkho.giatri
    return `<tr>
      <td style="text-align:center;padding:2px 4px;border:1px solid #ddd">${i + 1}</td>
      <td style="padding:2px 4px;border:1px solid #ddd">${r.mavthh}</td>
      <td style="padding:2px 4px;border:1px solid #ddd">${r.tenvthh}</td>
      <td style="text-align:center;padding:2px 4px;border:1px solid #ddd">${r.dvt}</td>
      <td style="text-align:right;padding:2px 4px;border:1px solid #ddd">${r.dauky.soluong}</td>
      ${showGiaTri ? `<td style="text-align:right;padding:2px 4px;border:1px solid #ddd">${r.dauky.giatri.toLocaleString('vi-VN')}</td>` : ''}
      <td style="text-align:right;padding:2px 4px;border:1px solid #ddd">${r.nhapkho.soluong}</td>
      ${showGiaTri ? `<td style="text-align:right;padding:2px 4px;border:1px solid #ddd">${r.nhapkho.giatri.toLocaleString('vi-VN')}</td>` : ''}
      <td style="text-align:right;padding:2px 4px;border:1px solid #ddd">${r.xuatkho.soluong}</td>
      ${showGiaTri ? `<td style="text-align:right;padding:2px 4px;border:1px solid #ddd">${r.xuatkho.giatri.toLocaleString('vi-VN')}</td>` : ''}
      <td style="text-align:right;padding:2px 4px;border:1px solid #ddd">${ckSl}</td>
      ${showGiaTri ? `<td style="text-align:right;padding:2px 4px;border:1px solid #ddd">${ckGt.toLocaleString('vi-VN')}</td>` : ''}
    </tr>`
  }).join('')
  const sub = showGiaTri ? '<th>SL</th><th>GT</th>' : '<th>SL</th>'
  const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"/><title>Báo cáo Tồn kho</title>
<style>body{font-family:Arial,sans-serif;font-size:11pt;margin:12mm}h2{color:#1a3c6e}table{width:100%;border-collapse:collapse;font-size:10pt}th{background:#1a3c6e;color:#fff;padding:4px 5px;border:1px solid #1a3c6e;text-align:center}tfoot td{font-weight:700;background:#f0f0f0;border:1px solid #ddd}@media print{@page{size:A4 landscape;margin:10mm}}</style>
</head><body><h2>BÁO CÁO TỒN KHO VẬT TƯ HÀNG HÓA</h2>
<p style="font-size:10pt;color:#555">Ngày in: ${new Date().toLocaleDateString('vi-VN')} — ${ds.length} vật tư</p>
<table><thead>
<tr><th rowspan="2">STT</th><th rowspan="2">Mã VTHH</th><th rowspan="2">Tên VTHH</th><th rowspan="2">ĐVT</th>
<th colspan="${showGiaTri ? 2 : 1}">Đầu kỳ</th><th colspan="${showGiaTri ? 2 : 1}">Nhập kho</th><th colspan="${showGiaTri ? 2 : 1}">Xuất kho</th><th colspan="${showGiaTri ? 2 : 1}">Cuối kỳ</th></tr>
<tr>${sub}${sub}${sub}${sub}</tr>
</thead><tbody>${rows}</tbody>
<tfoot><tr><td colspan="4" style="text-align:right;padding:3px 5px">Tổng (${ds.length})</td>
<td style="text-align:right;padding:3px 5px">${tong.dkSl}</td>${showGiaTri ? `<td style="text-align:right">${tong.dkGt.toLocaleString('vi-VN')}</td>` : ''}
<td style="text-align:right;padding:3px 5px">${tong.nkSl}</td>${showGiaTri ? `<td style="text-align:right">${tong.nkGt.toLocaleString('vi-VN')}</td>` : ''}
<td style="text-align:right;padding:3px 5px">${tong.xkSl}</td>${showGiaTri ? `<td style="text-align:right">${tong.xkGt.toLocaleString('vi-VN')}</td>` : ''}
<td style="text-align:right;padding:3px 5px">${tong.ckSl}</td>${showGiaTri ? `<td style="text-align:right">${tong.ckGt.toLocaleString('vi-VN')}</td>` : ''}
</tr></tfoot></table>
<script>window.addEventListener('load',()=>window.print())</script></body></html>`
  const w = window.open('', '_blank', 'width=1000,height=700')
  if (!w) { alert('Vui lòng cho phép popup để in.'); return }
  w.document.open(); w.document.write(html); w.document.close()
}

/* ── Y5: CustomInput DatePicker cho filter bar (readOnly, click mở lịch) ─ */
const FilterDateInput = forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<'input'>>(
  function FilterDateInput(props, ref) {
    return (
      <DatePickerReadOnlyTriggerInput
        {...props}
        ref={ref}
        style={{ width: 106, height: 26, minHeight: 26, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
      />
    )
  }
)

/* ═══ Y4: Nút Gửi gộp — hover menu, z-index: 9999 ══════════════ */
function NutGui() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button type="button"
        style={{ ...btnSt, background: 'var(--bg-tab)', color: 'var(--text-primary)' }}
        onMouseEnter={() => setOpen(true)}
        onClick={() => setOpen((v) => !v)}>
        <Send size={12} />Gửi<ChevronDown size={10} style={{ marginLeft: 2 }} />
      </button>
      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          style={{
            position: 'absolute', top: '100%', left: 0,
            zIndex: 9999,          /* Y4: nổi lên trên bảng */
            background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)',
            borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: 120, padding: 4, marginTop: 2,
          }}>
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

/* ═══ Modal Thẻ kho ════════════════════════════════════════════ */
function ModalChiTiet({ row, dvtList, onClose }: { row: KhoVthh; dvtList: DonViTinhRecord[]; onClose: () => void }) {
  const { nhap, xuat } = layPhieuTheoMaVthh(row.mavthh)
  const all = [
    ...nhap.map((p) => ({ ...p, loai: 'Nhập kho' as const })),
    ...xuat.map((p) => ({ ...p, loai: 'Xuất kho' as const })),
  ].sort((a, b) => b.ngay.localeCompare(a.ngay))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }} onClick={onClose}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)', borderRadius: 6, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', width: 'min(960px, 96vw)', maxHeight: '82vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>

        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
            Theo dõi chi tiết: <span style={{ fontWeight: 700 }}>{row.mavthh}</span> — {row.tenvthh}
          </span>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2, color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, flexWrap: 'nowrap', overflowX: 'auto' }}>
          {([
            ['Đầu kỳ', row.dauky.soluong, row.dauky.giatri, G.dauky],
            ['Nhập kho', row.nhapkho.soluong, row.nhapkho.giatri, G.nhapkho],
            ['Xuất kho', row.xuatkho.soluong, row.xuatkho.giatri, G.xuatkho],
            ['Tồn cuối', row.cuoiky.soluong, row.cuoiky.giatri, G.cuoiky],
          ] as [string, number, number, string][]).map(([lbl, sl, gt, clr]) => (
            <div key={lbl} style={{ flex: '0 0 auto', minWidth: 130, textAlign: 'center', padding: '4px 10px', background: 'var(--bg-tab)', borderRadius: 4, border: `1px solid ${clr}22` }}>
              <div style={{ fontWeight: 700, fontSize: 10, color: clr, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{lbl}</div>
              <div style={{ fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{formatSoNguyen(sl)}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{dvtLabel(row.dvt, dvtList)}</span>
              </div>
              {showGiaTri && <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{formatSoNguyen(gt)} đ</div>}
            </div>
          ))}
          {showGiaTri && (
            <div style={{ flex: '0 0 auto', minWidth: 130, textAlign: 'center', padding: '4px 10px', background: 'var(--bg-tab)', borderRadius: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 10, color: '#607D8B', textTransform: 'uppercase' }}>Giá vốn BQ</div>
              <div style={{ fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                <span style={{ fontWeight: 600 }}>{formatSoNguyen(row.giavon)}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>đ</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '8px 14px' }}>
          {all.length === 0
            ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, padding: 24 }}>Chưa có phiếu nhập/xuất nào.</div>
            : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: BG_HDR }}>
                    {['Số phiếu', 'Ngày', 'Loại', 'Tình trạng', 'Đối tác', 'Số lượng', ...(showGiaTri ? ['Giá trị'] : [])].map((h) => (
                      <th key={h} style={{ ...tdBase, fontWeight: 600, background: BG_HDR, whiteSpace: 'nowrap', textAlign: (h === 'Số lượng' || h === 'Giá trị') ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {all.map((p, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? BG_EVEN : BG_ODD }}>
                      <td style={tdBase}>{p.sophieu}</td>
                      <td style={{ ...tdBase, textAlign: 'right' }}>{isoToDdMm(p.ngay)}</td>
                      <td style={{ ...tdBase, color: p.loai === 'Nhập kho' ? G.nhapkho : G.xuatkho, fontWeight: 600 }}>{p.loai}</td>
                      <td style={tdBase}>{p.tinh_trang}</td>
                      <td style={tdBase}>{p.ncc || '—'}</td>
                      <td style={tdNum}>{formatSoNguyen(p.soluong)}</td>
                      {showGiaTri && <td style={tdNum}>{formatSoNguyen(p.giatri)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>

        <div style={{ padding: '6px 14px', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
          <button type="button" onClick={onClose} style={{ ...btnSt, background: 'var(--bg-tab)', color: 'var(--text-primary)' }}>Đóng</button>
        </div>
      </div>
    </div>
  )
}

/* ═══ Component chính ════════════════════════════════════════════ */
export function KhoVthhPage() {
  const [danhSach, setDanhSach] = useState<KhoVthh[]>([])
  const [dangTai, setDangTai] = useState(false)
  const [dvtList, setDvtList] = useState<DonViTinhRecord[]>([])
  const [khoList, setKhoList] = useState<KhoStorageItem[]>([])
  const [modalRow, setModalRow] = useState<KhoVthh | null>(null)

  /* Y3+Y5: filter API (kho + ngày); timkiem tách riêng cho useMemo */
  const [filter, setFilter] = useState<Omit<KhoVthhFilter, 'timkiem'>>({ tungay: '', denngay: '', makho: '', nhomvthh: '' })
  const [tungayDate, setTungayDate] = useState<Date | null>(null)
  const [denngayDate, setDenngayDate] = useState<Date | null>(null)

  /* Y6+Y11: tìm kiếm client-side */
  const [timkiemRaw, setTimkiemRaw] = useState('')

  /* Scroll sync refs */
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const footerScrollRef = useRef<HTMLDivElement>(null)
  const syncingRef = useRef(false)
  const onTableScroll = () => {
    if (syncingRef.current || !footerScrollRef.current || !tableScrollRef.current) return
    syncingRef.current = true
    footerScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft
    syncingRef.current = false
  }

  useEffect(() => {
    donViTinhGetAll().then(setDvtList)
    setKhoList(loadKhoListFromStorage())
  }, [])

  const taiDuLieu = useCallback(async (f?: Partial<Omit<KhoVthhFilter, 'timkiem'>>) => {
    setDangTai(true)
    try { setDanhSach(await layDanhSachKhoVthh(f ?? filter)) }
    finally { setDangTai(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { taiDuLieu() }, [taiDuLieu])

  /* Y3: áp filter kho/ngày → gọi lại API */
  const applyFilter = useCallback((key: keyof Omit<KhoVthhFilter, 'timkiem'>, val: string) => {
    setFilter((prev) => { const f = { ...prev, [key]: val }; taiDuLieu(f); return f })
  }, [taiDuLieu])

  /* Y5: xử lý DatePicker */
  const handleTungay = (d: Date | null) => {
    setTungayDate(d)
    applyFilter('tungay', dateToIso(d))
  }
  const handleDenngay = (d: Date | null) => {
    setDenngayDate(d)
    applyFilter('denngay', dateToIso(d))
  }

  /* Y6+Y11: useMemo lọc tức thì, fuzzy + chuẩn hóa tiếng Việt */
  const danhSachHienThi = useMemo(() => {
    const kw = timkiemRaw.trim()
    if (!kw) return danhSach
    const kwNorm = normalize(kw)
    return danhSach.filter((r) =>
      normalize(r.mavthh).includes(kwNorm) || normalize(r.tenvthh).includes(kwNorm)
    )
  }, [danhSach, timkiemRaw])

  const tong = useMemo(() => danhSachHienThi.reduce(
    (acc, r) => ({ dkSl: acc.dkSl + r.dauky.soluong, dkGt: acc.dkGt + r.dauky.giatri, nkSl: acc.nkSl + r.nhapkho.soluong, nkGt: acc.nkGt + r.nhapkho.giatri, xkSl: acc.xkSl + r.xuatkho.soluong, xkGt: acc.xkGt + r.xuatkho.giatri, ckSl: acc.ckSl + r.cuoiky.soluong, ckGt: acc.ckGt + r.cuoiky.giatri }),
    { ...initTong },
  ), [danhSachHienThi])

  const handleXuatExcel = () => {
    const rows: string[][] = [
      ['STT', 'Mã VTHH', 'Tên VTHH', 'ĐVT', 'Đầu kỳ SL', ...(showGiaTri ? ['Đầu kỳ GT'] : []), 'Nhập kho SL', ...(showGiaTri ? ['Nhập kho GT'] : []), 'Xuất kho SL', ...(showGiaTri ? ['Xuất kho GT'] : []), 'Cuối kỳ SL', ...(showGiaTri ? ['Cuối kỳ GT', 'Đơn giá vốn'] : [])],
      ...danhSachHienThi.map((r, i) => {
        const ckSl = r.dauky.soluong + r.nhapkho.soluong - r.xuatkho.soluong
        const ckGt = r.dauky.giatri + r.nhapkho.giatri - r.xuatkho.giatri
        return [String(i + 1), r.mavthh, r.tenvthh, dvtLabel(r.dvt, dvtList), String(r.dauky.soluong), ...(showGiaTri ? [String(r.dauky.giatri)] : []), String(r.nhapkho.soluong), ...(showGiaTri ? [String(r.nhapkho.giatri)] : []), String(r.xuatkho.soluong), ...(showGiaTri ? [String(r.xuatkho.giatri)] : []), String(ckSl), ...(showGiaTri ? [String(ckGt), String(r.giavon)] : [])]
      }),
      [`Tổng (${danhSachHienThi.length})`, '', '', '', String(tong.dkSl), ...(showGiaTri ? [String(tong.dkGt)] : []), String(tong.nkSl), ...(showGiaTri ? [String(tong.nkGt)] : []), String(tong.xkSl), ...(showGiaTri ? [String(tong.xkGt)] : []), String(tong.ckSl), ...(showGiaTri ? [String(tong.ckGt), ''] : [])],
    ]
    exportCsv(rows, `TonKho_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.csv`)
  }

  const tableMinWidth = COL_STT + COL_MA + COL_TEN + COL_DVT + (showGiaTri ? COL_SL + COL_GT : COL_SL) * 4
  const groups: [string, string][] = [['Đầu kỳ', G.dauky], ['Nhập kho', G.nhapkho], ['Xuất kho', G.xuatkho], ['Cuối kỳ', G.cuoiky]]
  const tongRows = [[tong.dkSl, tong.dkGt, G.dauky], [tong.nkSl, tong.nkGt, G.nhapkho], [tong.xkSl, tong.xkGt, G.xuatkho], [tong.ckSl, tong.ckGt, G.cuoiky]] as [number, number, string][]

  return (
    <div style={pageWrap}>

      {/* ══ Filter Bar ═══════════════════════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 0', marginBottom: 4, flexWrap: 'nowrap', overflowX: 'auto' }}>

        <button type="button" style={{ ...btnSt, background: 'var(--bg-tab)', color: 'var(--text-primary)' }}
          onClick={() => inBaoCaoTonKho(danhSachHienThi, tong)} title="In báo cáo tồn kho">
          <Printer size={12} />In
        </button>

        {/* Y4: z-index 9999 */}
        <NutGui />

        <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />

        {/* Y3: Kho hàng — chỉ kho thực tế, auto-width */}
        <span style={labelSt}>Kho hàng</span>
        <select value={filter.makho} onChange={(e) => applyFilter('makho', e.target.value)}
          style={{ ...inputBase, minWidth: 80, maxWidth: 180, width: 'auto', flexShrink: 0 }}>
          <option value="">Tất cả</option>
          {khoList.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>

        {/* Y5: DatePicker chuẩn theo o-nhap.mdc */}
        <span style={labelSt}>Từ</span>
        <div style={{ width: 106, flexShrink: 0 }} className="htql-datepicker-full-width">
          <DatePicker
            selected={tungayDate}
            onChange={handleTungay}
            dateFormat="dd/MM/yyyy"
            locale="vi"
            customInput={<FilterDateInput />}
            isClearable={false}
            {...htqlDatePickerPopper}
          />
        </div>

        <span style={labelSt}>Đến</span>
        <div style={{ width: 106, flexShrink: 0 }} className="htql-datepicker-full-width">
          <DatePicker
            selected={denngayDate}
            onChange={handleDenngay}
            dateFormat="dd/MM/yyyy"
            locale="vi"
            customInput={<FilterDateInput />}
            isClearable={false}
            {...htqlDatePickerPopper}
          />
        </div>

        {/* Y6+Y11: Search — lọc client-side tức thì qua useMemo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '1 1 140px', minWidth: 120 }}>
          <Search size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input type="text" placeholder="Mã / tên VTHH..." value={timkiemRaw}
            onChange={(e) => setTimkiemRaw(e.target.value)}
            style={{ ...inputBase, width: '100%', minWidth: 0 }} />
        </div>

        {/* Y9: không có badge ADMIN */}
        <button type="button" style={{ ...btnSt, background: 'var(--accent)', color: '#fff', border: '0.5px solid var(--accent)', flexShrink: 0 }}
          onClick={handleXuatExcel} title="Xuất CSV — mở bằng Excel">
          <Download size={12} />Xuất Excel
        </button>
      </div>

      {/* ══ Bảng + Footer tách rời ═══════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, border: '0.5px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>

        {/* Y8: Sticky Header — overflow:auto trên div bọc, position:sticky trên thead */}
        <div ref={tableScrollRef} onScroll={onTableScroll} style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: tableMinWidth, width: '100%' }}>
            <colgroup>
              <col style={{ width: COL_STT }} />
              <col style={{ width: COL_MA }} />
              <col style={{ width: COL_TEN }} />
              <col style={{ width: COL_DVT }} />
              {Array.from({ length: 4 }).flatMap((_, gi) =>
                showGiaTri
                  ? [<col key={`${gi}sl`} style={{ width: COL_SL }} />, <col key={`${gi}gt`} style={{ width: COL_GT }} />]
                  : [<col key={`${gi}sl`} style={{ width: COL_SL }} />]
              )}
            </colgroup>

            {/* Y8: thead position:sticky theo từng ô */}
            <thead>
              <tr style={{ height: H_ROW1 }}>
                <th rowSpan={2} style={{ ...thSticky1, left: 0, textAlign: 'center', verticalAlign: 'middle' }}>STT</th>
                <th rowSpan={2} style={{ ...thSticky1, left: STICKY_MA_LEFT, verticalAlign: 'middle', borderRight: B1 }}>Mã VTHH</th>
                <th rowSpan={2} style={{ ...thSticky1, left: STICKY_TEN_LEFT, minWidth: COL_TEN, verticalAlign: 'middle', borderRight: B1 }}>Tên VTHH</th>
                <th rowSpan={2} style={{ ...thSticky1, left: STICKY_DVT_LEFT, textAlign: 'center', verticalAlign: 'middle', borderLeft: B1, borderRight: B1 }}>ĐVT</th>
                {groups.map(([lbl, clr]) => (
                  <th key={lbl} colSpan={showGiaTri ? 2 : 1} style={{ ...thGroup, color: clr }}>{lbl}</th>
                ))}
              </tr>
              <tr style={{ height: H_ROW2 }}>
                {Array.from({ length: 4 }).flatMap((_, gi) =>
                  showGiaTri
                    ? [<th key={`${gi}sl`} style={thSub}>Số lượng</th>, <th key={`${gi}gt`} style={thSub}>Giá trị</th>]
                    : [<th key={`${gi}sl`} style={thSub}>Số lượng</th>]
                )}
              </tr>
            </thead>

            <tbody>
              {dangTai && <tr><td colSpan={NCOLS} style={{ ...tdBase, textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Đang tải dữ liệu...</td></tr>}
              {/* Y10: thông báo trống rõ ràng */}
              {!dangTai && danhSachHienThi.length === 0 && (
                <tr>
                  <td colSpan={NCOLS} style={{ ...tdBase, textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    {timkiemRaw.trim()
                      ? `Không tìm thấy dữ liệu phù hợp với "${timkiemRaw}"`
                      : 'Không tìm thấy dữ liệu phù hợp'}
                  </td>
                </tr>
              )}
              {!dangTai && danhSachHienThi.map((row, idx) => {
                const bg = idx % 2 === 0 ? BG_EVEN : BG_ODD
                const ckSl = row.dauky.soluong + row.nhapkho.soluong - row.xuatkho.soluong
                const ckGt = row.dauky.giatri + row.nhapkho.giatri - row.xuatkho.giatri
                const tendvt = dvtLabel(row.dvt, dvtList)
                return (
                  <tr key={row.id} style={{ background: bg, cursor: 'pointer' }} onDoubleClick={() => setModalRow(row)}>
                    <td style={{ ...tdBase, position: 'sticky', left: 0, zIndex: 1, textAlign: 'center', background: bg }}>{idx + 1}</td>
                    <td style={{ ...tdBase, position: 'sticky', left: STICKY_MA_LEFT, zIndex: 1, fontWeight: 500, background: bg, borderRight: B1 }}>{row.mavthh.toUpperCase()}</td>
                    <td style={{ ...tdBase, position: 'sticky', left: STICKY_TEN_LEFT, zIndex: 1, minWidth: COL_TEN, background: bg, borderRight: B1 }} title={row.tenvthh}>
                      <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>{row.tenvthh}</div>
                    </td>
                    <td style={{ ...tdBase, position: 'sticky', left: STICKY_DVT_LEFT, zIndex: 1, textAlign: 'center', background: bg, borderLeft: B1, borderRight: B1 }}>{tendvt}</td>

                    <td style={tdNum}>{numCell(row.dauky.soluong)}</td>
                    {showGiaTri && <td style={tdNum}>{numCell(row.dauky.giatri)}</td>}
                    <td style={tdNum}>{numCell(row.nhapkho.soluong)}</td>
                    {showGiaTri && <td style={tdNum}>{numCell(row.nhapkho.giatri)}</td>}
                    <td style={tdNum}>{numCell(row.xuatkho.soluong)}</td>
                    {showGiaTri && <td style={tdNum}>{numCell(row.xuatkho.giatri)}</td>}
                    <td style={tdNum}>{numCell(ckSl)}</td>
                    {showGiaTri && <td style={tdNum} title={`Đơn giá vốn: ${formatSoNguyen(row.giavon)} đ`}>{numCell(ckGt)}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer ngoài vùng cuộn — sync scroll */}
        {!dangTai && danhSachHienThi.length > 0 && (
          <div ref={footerScrollRef} style={{ overflow: 'hidden', flexShrink: 0, borderTop: '1.5px solid var(--border-strong)' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: tableMinWidth, width: '100%' }}>
              <colgroup>
                <col style={{ width: COL_STT }} />
                <col style={{ width: COL_MA }} />
                <col style={{ width: COL_TEN }} />
                <col style={{ width: COL_DVT }} />
                {Array.from({ length: 4 }).flatMap((_, gi) =>
                  showGiaTri
                    ? [<col key={`${gi}sl`} style={{ width: COL_SL }} />, <col key={`${gi}gt`} style={{ width: COL_GT }} />]
                    : [<col key={`${gi}sl`} style={{ width: COL_SL }} />]
                )}
              </colgroup>
              <tbody>
                <tr style={{ background: BG_FTR }}>
                  <td colSpan={4} style={{ ...tdBase, position: 'sticky', left: 0, zIndex: 2, background: BG_FTR, fontWeight: 700, textAlign: 'right', borderRight: B1, padding: '4px 6px' }}>
                    Tổng cộng ({danhSachHienThi.length} VTHH)
                  </td>
                  {tongRows.flatMap(([sl, gt, clr], gi) => [
                    <td key={`${gi}sl`} style={{ ...tdNum, background: BG_FTR, fontWeight: 700 }}>{formatSoNguyen(sl)}</td>,
                    ...(showGiaTri ? [<td key={`${gi}gt`} style={{ ...tdNum, background: BG_FTR, fontWeight: 700, color: clr }}>{formatSoNguyen(gt)}</td>] : []),
                  ])}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dòng gợi ý đáy */}
      <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '3px 2px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span>{dangTai ? 'Đang tải...' : `${danhSachHienThi.length} / ${danhSach.length} vật tư — Double-click để xem theo dõi chi tiết`}</span>
        {showGiaTri && <span style={{ fontStyle: 'italic' }}>Giá vốn BQ = (GT đầu kỳ + GT nhập) ÷ (SL đầu kỳ + SL nhập)</span>}
      </div>

      {modalRow && <ModalChiTiet row={modalRow} dvtList={dvtList} onClose={() => setModalRow(null)} />}
    </div>
  )
}
