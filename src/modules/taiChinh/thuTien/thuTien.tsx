/**
 * Thu tiền — danh sách + form (cấu trúc tách biệt từ Báo giá, thuTienBang*).
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef } from 'react'
import {
  Plus, Trash2, Eye, Mail, MessageCircle, ChevronDown,
  ChevronLeft, ChevronRight, Search, BookOpen, BookX,
} from 'lucide-react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { vi } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import { DataGrid, type DataGridColumn } from '../../../components/common/dataGrid'
import { useToastOptional } from '../../../context/toastContext'
import { matchSearchKeyword } from '../../../utils/stringUtils'
import { formatNumberDisplay, formatSoThapPhan } from '../../../utils/numberFormat'
import { htqlDatePickerPopperTop } from '../../../constants/datePickerPlacement'
import { DatePickerCustomHeader } from '../../../components/datePickerCustomHeader'

import {
  thuTienBangGetAll,
  thuTienBangGetChiTiet,
  thuTienBangDelete,
  getDefaultThuTienBangFilter,
  getDateRangeForKy,
  KY_OPTIONS,
  type ThuTienBangRecord,
  type ThuTienBangChiTiet,
  type ThuTienBangKyValue,
  type ThuTienBangFilter,
  clearThuTienBangDraft,
  thuTienBangBiKhoaChinhSuaTheoTinhTrang,
  TINH_TRANG_BG_DA_CHUYEN_DHB,
  TINH_TRANG_BG_DA_CHUYEN_HD,
  TINH_TRANG_BG_KH_KHONG_DONG_Y,
  HTQL_THU_TIEN_BANG_RELOAD_EVENT,
  thuTienBangApiImpl,
} from './thuTienBangApi'
import { donViTinhGetAll } from '../../kho/khoHang/donViTinhApi'
import { dvtHienThiLabel, type DvtListItem } from '../../../utils/dvtHienThiLabel'
import { ConfirmXoaCaptchaModal } from '../../../components/common/confirmXoaCaptchaModal'
import { useDraggable } from '../../../hooks/useDraggable'
import { ThuTienBangApiProvider } from './thuTienBangApiContext'
import { ThuTienForm } from './thuTienForm'
import { donHangBanHoanTacKhiXoaThuTien } from '../../crm/banHang/donHangBan/donHangBanChungTuApi'
import styles from './banHangDetailMirror.module.css'
import { daGhiSoPhieuThu, ghiSoTuPhieuThu, huyGhiSoPhieuThu } from './ghiSoTaiChinhApi'

registerLocale('vi', vi)

/** Tự chèn "/" thành dd/mm/yyyy khi gõ (đồng bộ Đơn hàng mua — YC34). */
function formatDdMmYyyyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`
}

function parseDdMmYyyyToIso(s: string): string {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return ''
  const d = parseInt(m[1], 10)
  const mo = parseInt(m[2], 10)
  const y = parseInt(m[3], 10)
  if (d < 1 || d > 31 || mo < 1 || mo > 12 || y < 1900 || y > 2100) return ''
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function isoToDate(iso: string | null): Date | null {
  if (!iso || !iso.trim()) return null
  const d = new Date(iso.trim())
  return Number.isNaN(d.getTime()) ? null : d
}

function toIsoDate(d: Date | null): string {
  if (!d) return ''
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

interface FormattedDateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onBlurCommit?: (value: string) => void
}

const FormattedDateInput = forwardRef<HTMLInputElement, FormattedDateInputProps>(function FormattedDateInput(props, ref) {
  const { onChange, onBlur, onBlurCommit, ...rest } = props
  return (
    <input
      ref={ref}
      {...rest}
      onChange={(e) => {
        const formatted = formatDdMmYyyyInput(e.target.value)
        e.target.value = formatted
        onChange?.(e)
      }}
      onBlur={(e) => {
        const raw = e.target.value
        const iso = parseDdMmYyyyToIso(raw)
        if (iso) onBlurCommit?.(raw)
        onBlur?.(e)
      }}
    />
  )
})

// ─── Badge trạng thái ──────────────────────────────────────────────────────
function ThuTienBangBadge({ value }: { value: string }) {
  const cls =
    value === 'Đã chốt'      ? styles.badgeDaChot
    : value === 'Chờ duyệt'  ? styles.badgeChoDuyet
    : value === 'Hủy bỏ'     ? styles.badgeDaHuy
    : value === 'Đã gửi khách' ? styles.badgeDangThucHien
    : value === TINH_TRANG_BG_DA_CHUYEN_DHB || value === TINH_TRANG_BG_DA_CHUYEN_HD ? styles.badgeDaChot
    : value === TINH_TRANG_BG_KH_KHONG_DONG_Y ? styles.badgeDaHuy
    : styles.badgeDefault
  return <span className={cls}>{value}</span>
}

function formatNgay(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

// ─── [YC23] Phân trang ──────────────────────────────────────────────────────
const PAGE_SIZE = 50

const Pagination = React.memo(({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) => {
  if (total <= 1) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
      borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', fontSize: 11,
    }}>
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1}
        style={{
          background: 'transparent', border: 'none',
          cursor: page > 1 ? 'pointer' : 'default',
          color: page > 1 ? 'var(--accent)' : 'var(--text-muted)', padding: '1px 4px',
        }}>
        <ChevronLeft size={13} />
      </button>
      <span style={{ color: 'var(--text-muted)' }}>Trang {page}/{total}</span>
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= total}
        style={{
          background: 'transparent', border: 'none',
          cursor: page < total ? 'pointer' : 'default',
          color: page < total ? 'var(--accent)' : 'var(--text-muted)', padding: '1px 4px',
        }}>
        <ChevronRight size={13} />
      </button>
    </div>
  )
})

// ─── Màn hình danh sách Báo giá (Content) ────────────────────────────────────
function ThuTienBangContent({ onNavigate: _onNavigate }: { onNavigate?: (tab: string) => void }) {
  const toast = useToastOptional()
  const [filter,      setFilter]      = useState<ThuTienBangFilter>(getDefaultThuTienBangFilter)
  const [danhSach,    setDanhSach]    = useState<ThuTienBangRecord[]>([])
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [chiTiet,     setChiTiet]     = useState<ThuTienBangChiTiet[]>([])
  const [search,      setSearch]      = useState('')
  const [showForm,    setShowForm]    = useState(false)
  const [formMode,    setFormMode]    = useState<'add' | 'edit' | 'view'>('add')
  const [formRecord,  setFormRecord]  = useState<ThuTienBangRecord | null>(null)
  const [xoaModalRow, setXoaModalRow] = useState<ThuTienBangRecord | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    open: boolean; x: number; y: number; row: ThuTienBangRecord | null
  }>({ open: false, x: 0, y: 0, row: null })
  const [formKey,      setFormKey]      = useState(0)
  const [dropdownGui, setDropdownGui] = useState(false)
  const dropdownGuiRef = useRef<HTMLDivElement>(null)
  const hoverGuiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [page, setPage] = useState(1)
  const [dvtList, setDvtList] = useState<DvtListItem[]>([])
  const thuTienFormDrag = useDraggable()

  useEffect(() => {
    let c = false
    donViTinhGetAll().then((list) => {
      if (c || !Array.isArray(list)) return
      setDvtList(list)
    })
    return () => { c = true }
  }, [])

  const loadData = useCallback(() => {
    setDanhSach(thuTienBangGetAll(filter))
  }, [filter])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    const sync = () => loadData()
    window.addEventListener(HTQL_THU_TIEN_BANG_RELOAD_EVENT, sync)
    return () => window.removeEventListener(HTQL_THU_TIEN_BANG_RELOAD_EVENT, sync)
  }, [loadData])
  useEffect(() => {
    if (selectedId) setChiTiet(thuTienBangGetChiTiet(selectedId))
    else setChiTiet([])
  }, [selectedId])

  const filtered = useMemo(() => {
    let result = danhSach
    if (search.trim()) {
      result = result.filter((r) =>
        matchSearchKeyword(
          `${r.so_thu_tien_bang} ${r.so_chung_tu_cukcuk ?? ''} ${r.khach_hang} ${r.dien_giai ?? ''} ${r.tinh_trang}`,
          search,
        )
      )
    }
    return result
  }, [danhSach, search])

  useEffect(() => { setPage(1) }, [filter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = useMemo(() => 
    filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  )

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownGuiRef.current && !dropdownGuiRef.current.contains(e.target as Node)) setDropdownGui(false)
      setContextMenu((m) => m.open ? { ...m, open: false } : m)
    }
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [])

  const tongTien   = useMemo(() => filtered.reduce((s, r) => s + r.tong_thanh_toan, 0), [filtered])
  const selectedRow = useMemo(() => selectedId ? danhSach.find((r) => r.id === selectedId) ?? null : null, [selectedId, danhSach])

  const chiTietHienThiCoVat = selectedRow == null || selectedRow.ap_dung_vat_gtgt !== false

  const columnsChiTiet = useMemo((): DataGridColumn<ThuTienBangChiTiet>[] => {
    const coBan: DataGridColumn<ThuTienBangChiTiet>[] = [
      { key: 'stt', label: 'STT', width: 36, align: 'center', renderCell: (_v, _r, idx) => String((idx ?? 0) + 1) },
      { key: 'ma_hang', label: 'Mã SPHH', width: 88 },
      { key: 'ten_hang', label: 'Tên Sản phẩm, Hàng hóa', width: 180 },
      { key: 'noi_dung', label: 'Nội dung', width: 140, renderCell: (v) => (v != null && String(v).trim() ? String(v) : '') },
      { key: 'dvt', label: 'ĐVT', width: 72, renderCell: (v) => dvtHienThiLabel(v as string, dvtList) },
      { key: 'so_luong', label: 'Số lượng', width: 70, align: 'right',
        renderCell: (v) => formatNumberDisplay(Number(v), 2) },
      { key: 'don_gia', label: 'Đơn giá', width: 100, align: 'right',
        renderCell: (v) => formatNumberDisplay(Number(v), 0) },
      { key: 'thanh_tien', label: 'Thành tiền', width: 100, align: 'right',
        renderCell: (v) => formatNumberDisplay(Math.round(Number(v)), 0) },
    ]
    const cotThue: DataGridColumn<ThuTienBangChiTiet>[] = chiTietHienThiCoVat
      ? [
          { key: 'pt_thue_gtgt', label: '% Thuế GTGT', width: 70, align: 'right',
            renderCell: (v) => v != null ? formatNumberDisplay(Number(v), 0) : '' },
          { key: 'tien_thue_gtgt', label: 'Tiền thuế GTGT', width: 100, align: 'right',
            renderCell: (v) => v != null ? formatNumberDisplay(Math.round(Number(v)), 0) : '' },
        ]
      : []
    const cotTong: DataGridColumn<ThuTienBangChiTiet> = {
      key: 'tong_tien',
      label: 'Tổng tiền',
      width: 100,
      align: 'right',
      renderCell: (_v, row) => {
        const thue = chiTietHienThiCoVat ? (Number(row.tien_thue_gtgt) || 0) : 0
        const tong = Math.round((Number(row.thanh_tien) || 0) + thue)
        return <span style={{ fontWeight: 600, color: '#1e40af' }}>{formatNumberDisplay(tong, 0)}</span>
      },
    }
    return [...coBan, ...cotThue, cotTong, { key: 'ghi_chu', label: 'Ghi chú', width: 140 }]
  }, [dvtList, chiTietHienThiCoVat])

  const chiTietFooterDong = useMemo(() => {
    if (!selectedRow) return null
    const maSet = new Set<string>()
    for (const c of chiTiet) {
      const m = (c.ma_hang ?? '').trim()
      if (m) maSet.add(m)
    }
    const mapDvt = new Map<string, number>()
    for (const c of chiTiet) {
      const m = (c.ma_hang ?? '').trim()
      if (!m) continue
      const sl = Number(c.so_luong) || 0
      if (sl <= 0) continue
      const lab = dvtHienThiLabel(c.dvt, dvtList)
      mapDvt.set(lab, (mapDvt.get(lab) ?? 0) + sl)
    }
    const tongSlTxt = mapDvt.size === 0
      ? '—'
      : Array.from(mapDvt.entries())
        .sort((a, b) => a[0].localeCompare(b[0], 'vi'))
        .map(([k, v]) => `${formatSoThapPhan(v, 2)} ${k}`)
        .join(', ')
    const coVat = selectedRow.ap_dung_vat_gtgt !== false
    const tlCk = selectedRow.tl_ck != null && Number.isFinite(Number(selectedRow.tl_ck))
      ? formatSoThapPhan(Number(selectedRow.tl_ck), 3)
      : '0'
    const tienCk = formatNumberDisplay(Math.round(Number(selectedRow.tien_ck) || 0), 0)
    return {
      chungLoaiVt: maSet.size,
      tongSoLuongText: tongSlTxt,
      tongTienHang: formatNumberDisplay(selectedRow.tong_tien_hang ?? 0, 0),
      tlCk,
      tienCk,
      tienThue: formatNumberDisplay(Math.round(selectedRow.tong_thue_gtgt ?? 0), 0),
      tongThanhToan: formatNumberDisplay(Math.round(selectedRow.tong_thanh_toan ?? 0), 0),
      coVat,
    }
  }, [selectedRow, chiTiet, dvtList])

  const moFormThem = () => {
    clearThuTienBangDraft()
    setFormRecord(null)
    setFormMode('add')
    setFormKey((k) => k + 1)
    setShowForm(true)
  }
  const moFormXem  = (row: ThuTienBangRecord) => { setFormRecord(row); setFormMode('view'); setFormKey((k) => k + 1); setShowForm(true) }
  const moFormSua  = (row: ThuTienBangRecord) => { setFormRecord(row); setFormMode('edit'); setFormKey((k) => k + 1); setShowForm(true) }

  const columnsThuTienBangList = useMemo((): DataGridColumn<ThuTienBangRecord>[] => {
    return [
      { key: 'so_thu_tien_bang', label: 'Mã phiếu thu', width: 96, align: 'right' },
      { key: 'nv_ban_hang', label: 'Người thu', width: '10%' },
      { key: 'ngay_thu_tien_bang', label: 'TG tạo', width: 88, align: 'right', renderCell: (v) => formatNgay(v as string) },
      {
        key: 'ngay_hach_toan',
        label: 'Ngày thu',
        width: 96,
        align: 'right',
        renderCell: (_v, row) =>
          formatNgay((row as ThuTienBangRecord).ngay_hach_toan ?? (row as ThuTienBangRecord).ngay_giao_hang),
      },
      { key: 'khach_hang', label: 'Khách hàng', width: '22%' },
      {
        key: 'tong_thanh_toan',
        label: 'Tổng tiền',
        width: 110,
        align: 'right',
        renderCell: (v) => formatNumberDisplay(Number(v), 0),
      },
      {
        key: 'tinh_trang',
        label: 'Trạng thái',
        width: 130,
        renderCell: (v) => <ThuTienBangBadge value={String(v)} />,
      },
      {
        key: 'dien_giai',
        label: 'Nội dung thu',
        width: '18%',
        renderCell: (v, row) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              moFormXem(row as ThuTienBangRecord)
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              textAlign: 'left',
              color: 'var(--accent)',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title="Xem phiếu thu"
          >
            {String(v ?? '')}
          </button>
        ),
      },
    ]
  }, [])

  const xacNhanXoa = (row: ThuTienBangRecord) => {
    donHangBanHoanTacKhiXoaThuTien(row.id)
    huyGhiSoPhieuThu(row.id)
    thuTienBangDelete(row.id)
    loadData()
    if (selectedId === row.id) setSelectedId(null)
    toast?.showToast(`Đã xóa phiếu thu ${row.so_thu_tien_bang}.`, 'info')
    setXoaModalRow(null)
  }

  return (
    <div className={styles.root}>
      {/* Toolbar danh sách */}
      <div className={styles.toolbarWrap}>
        <button type="button" className={styles.toolbarBtn} onClick={moFormThem}>
          <Plus size={13} /><span>Thêm</span>
        </button>
        <button type="button" className={styles.toolbarBtnDanger} disabled={!selectedId}
          onClick={() => selectedRow && setXoaModalRow(selectedRow)}>
          <Trash2 size={13} /><span>Xóa</span>
        </button>
        <div
          ref={dropdownGuiRef}
          className={styles.dropdownWrap}
          style={{ marginLeft: 8 }}
          onMouseEnter={() => {
            if (hoverGuiTimeoutRef.current) clearTimeout(hoverGuiTimeoutRef.current)
            hoverGuiTimeoutRef.current = setTimeout(() => setDropdownGui(true), 200)
          }}
          onMouseLeave={() => {
            if (hoverGuiTimeoutRef.current) clearTimeout(hoverGuiTimeoutRef.current)
            hoverGuiTimeoutRef.current = setTimeout(() => setDropdownGui(false), 200)
          }}
        >
          <button type="button" className={styles.toolbarBtn} onClick={() => setDropdownGui((v) => !v)}>
            <ChevronDown size={12} /><span>Gửi</span>
          </button>
          {dropdownGui && (
            <div className={styles.dropdownMenu}>
              <button type="button" className={styles.dropdownItem}
                onClick={() => { toast?.showToast('Đã gửi email báo giá.', 'success'); setDropdownGui(false) }}>
                <Mail size={13} /> Gửi Email
              </button>
              <button type="button" className={styles.dropdownItem}
                onClick={() => { toast?.showToast('Đã gửi Zalo báo giá.', 'success'); setDropdownGui(false) }}>
                <MessageCircle size={13} /> Gửi Zalo
              </button>
            </div>
          )}
        </div>
        <div className={styles.filterWrap} style={{ marginLeft: 8 }}>
          <span className={styles.filterLabel}>Kỳ</span>
          <select className={styles.filterInput} value={filter.ky}
            onChange={(e) => {
              const ky = e.target.value as ThuTienBangKyValue
              if (ky === 'tat-ca') {
                setFilter({ ky, tu: '', den: '' })
                return
              }
              const range = getDateRangeForKy(ky)
              setFilter({ ky, tu: range.tu, den: range.den })
            }}>
            {KY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Từ</span>
          <DatePicker
            {...htqlDatePickerPopperTop}
            selected={isoToDate(filter.tu)}
            onChange={(d: Date | null) => {
              const iso = toIsoDate(d)
              setFilter((f) => {
                const next: ThuTienBangFilter = { ...f, ky: 'tat-ca', tu: iso }
                if (iso && f.den && iso > f.den) next.den = iso
                if (iso && !f.den) next.den = iso
                return next
              })
            }}
            maxDate={filter.den ? isoToDate(filter.den) ?? undefined : undefined}
            dateFormat="dd/MM/yyyy"
            locale="vi"
            calendarClassName="htql-datepicker-ngay"
            renderCustomHeader={(p) => <DatePickerCustomHeader {...p} />}
            placeholderText="dd/mm/yyyy"
            className="htql-datepicker-inline"
            onFocus={(e) => (e.target as HTMLInputElement).select()}
            customInput={
              <FormattedDateInput
                className={styles.filterInput}
                style={{ textAlign: 'right' }}
                onBlurCommit={(v: string) => {
                  const iso = parseDdMmYyyyToIso(v)
                  if (iso) {
                    setFilter((f) => {
                      const next: ThuTienBangFilter = { ...f, ky: 'tat-ca', tu: iso }
                      if (f.den && iso > f.den) next.den = iso
                      if (!f.den) next.den = iso
                      return next
                    })
                  }
                }}
              />
            }
          />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Đến</span>
          <DatePicker
            {...htqlDatePickerPopperTop}
            selected={isoToDate(filter.den)}
            onChange={(d: Date | null) => {
              const iso = toIsoDate(d)
              setFilter((f) => {
                const next: ThuTienBangFilter = { ...f, ky: 'tat-ca', den: iso }
                if (iso && f.tu && iso < f.tu) next.tu = iso
                return next
              })
            }}
            minDate={filter.tu ? isoToDate(filter.tu) ?? undefined : undefined}
            dateFormat="dd/MM/yyyy"
            locale="vi"
            calendarClassName="htql-datepicker-ngay"
            renderCustomHeader={(p) => <DatePickerCustomHeader {...p} />}
            placeholderText="dd/mm/yyyy"
            className="htql-datepicker-inline"
            onFocus={(e) => (e.target as HTMLInputElement).select()}
            customInput={
              <FormattedDateInput
                className={styles.filterInput}
                style={{ textAlign: 'right' }}
                onBlurCommit={(v: string) => {
                  let iso = parseDdMmYyyyToIso(v)
                  if (iso) {
                    const today = toIsoDate(new Date())
                    if (iso > today) iso = today
                    setFilter((f) => {
                      const next: ThuTienBangFilter = { ...f, ky: 'tat-ca', den: iso }
                      if (f.tu && iso < f.tu) next.tu = iso
                      return next
                    })
                  }
                }}
              />
            }
          />
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }} />
          <input type="text" className={styles.searchInput}
            style={{ paddingLeft: 32, width: '100%' }}
            placeholder="Tìm mã phiếu thu, khách hàng, lý do nộp..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
          {filtered.length} bản ghi · trang {page}/{totalPages}
        </span>
      </div>

      {/* Nội dung */}
      <div className={styles.contentArea}>
        <div className={styles.gridWrap} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <DataGrid<ThuTienBangRecord>
              columns={columnsThuTienBangList}
              data={paginated}
              keyField="id"
              stripedRows compact height="100%"
              selectedRowId={selectedId}
              onRowSelect={(r) => setSelectedId(r.id)}
              onRowDoubleClick={(r) => moFormXem(r)}
              onRowContextMenu={(row, e) => {
                e.preventDefault()
                setSelectedId(row.id)
                setContextMenu({ open: true, x: e.clientX, y: e.clientY, row })
              }}
              summary={filtered.length > 0 ? [
                { label: 'Tổng thu', value: formatNumberDisplay(tongTien, 0) },
              ] : []}
            />
          </div>
          <Pagination page={page} total={totalPages} onChange={setPage} />
        </div>

        <div className={styles.detailWrap}>
          <div className={styles.detailTabBar}>
            <button type="button" className={styles.detailTabActive}>Chi tiết SPHH</button>
          </div>
          <div className={styles.detailTabPanel}>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <DataGrid<ThuTienBangChiTiet>
                columns={columnsChiTiet}
                data={chiTiet}
                keyField="id"
                stripedRows compact height="100%"
              />
            </div>
            {chiTietFooterDong && (
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                  padding: '8px 10px',
                  fontSize: 11,
                  borderTop: '1px solid var(--border)',
                  background: 'var(--bg-tab)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <div style={{ textAlign: 'left', color: 'var(--accent)', fontWeight: 600, lineHeight: 1.5 }}>
                  <span>Tổng chủng loại vật VT: {chiTietFooterDong.chungLoaiVt}</span>
                  <span style={{ marginLeft: 16 }}>Tổng số lượng: {chiTietFooterDong.tongSoLuongText}</span>
                </div>
                <div style={{ textAlign: 'right', marginLeft: 'auto', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span>Tổng tiền hàng: <strong>{chiTietFooterDong.tongTienHang}</strong></span>
                  <span>TLCK (%): <strong>{chiTietFooterDong.tlCk}</strong></span>
                  <span>Tiền CK: <strong>{chiTietFooterDong.tienCk}</strong></span>
                  {chiTietFooterDong.coVat && (
                    <span>Tiền thuế GTGT: <strong>{chiTietFooterDong.tienThue}</strong></span>
                  )}
                  <span>Tổng tiền thanh toán: <strong>{chiTietFooterDong.tongThanhToan}</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu.open && contextMenu.row && (
        <div className={styles.contextMenu} style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}>
          <button type="button" className={styles.contextMenuItem}
            onClick={() => { moFormXem(contextMenu.row!); setContextMenu((m) => ({ ...m, open: false })) }}>
            <Eye size={13} /> Xem
          </button>
          <button type="button" className={styles.contextMenuItem}
            disabled={thuTienBangBiKhoaChinhSuaTheoTinhTrang(contextMenu.row!.tinh_trang)}
            style={{
              opacity: thuTienBangBiKhoaChinhSuaTheoTinhTrang(contextMenu.row!.tinh_trang) ? 0.45 : 1,
              cursor: thuTienBangBiKhoaChinhSuaTheoTinhTrang(contextMenu.row!.tinh_trang) ? 'default' : 'pointer',
            }}
            onClick={() => {
              if (thuTienBangBiKhoaChinhSuaTheoTinhTrang(contextMenu.row!.tinh_trang)) return
              moFormSua(contextMenu.row!)
              setContextMenu((m) => ({ ...m, open: false }))
            }}>
            <Plus size={13} /> Sửa
          </button>
          <hr className={styles.contextMenuSep} />
          <button
            type="button"
            className={styles.contextMenuItem}
            disabled={daGhiSoPhieuThu(contextMenu.row!.id)}
            style={{
              opacity: daGhiSoPhieuThu(contextMenu.row!.id) ? 0.45 : 1,
              cursor: daGhiSoPhieuThu(contextMenu.row!.id) ? 'default' : 'pointer',
            }}
            onClick={() => {
              const r = contextMenu.row!
              if (daGhiSoPhieuThu(r.id)) return
              ghiSoTuPhieuThu(r, Math.round(Number(r.tong_thanh_toan) || 0))
              loadData()
              toast?.showToast('Đã ghi sổ — ghi nhận doanh thu và sổ chi tiết tương ứng.', 'success')
              setContextMenu((m) => ({ ...m, open: false }))
            }}
          >
            <BookOpen size={13} /> Ghi sổ
          </button>
          <button
            type="button"
            className={styles.contextMenuItem}
            disabled={!daGhiSoPhieuThu(contextMenu.row!.id)}
            style={{
              opacity: !daGhiSoPhieuThu(contextMenu.row!.id) ? 0.45 : 1,
              cursor: !daGhiSoPhieuThu(contextMenu.row!.id) ? 'default' : 'pointer',
            }}
            onClick={() => {
              const r = contextMenu.row!
              if (!daGhiSoPhieuThu(r.id)) return
              huyGhiSoPhieuThu(r.id)
              loadData()
              toast?.showToast('Đã hủy ghi sổ.', 'info')
              setContextMenu((m) => ({ ...m, open: false }))
            }}
          >
            <BookX size={13} /> Hủy ghi
          </button>
          <hr className={styles.contextMenuSep} />
          <button type="button" className={styles.contextMenuItem}
            onClick={() => { toast?.showToast('Đã gửi email.', 'success'); setContextMenu((m) => ({ ...m, open: false })) }}>
            <Mail size={13} /> Gửi Email
          </button>
          <button type="button" className={styles.contextMenuItem}
            onClick={() => { toast?.showToast('Đã gửi Zalo.', 'success'); setContextMenu((m) => ({ ...m, open: false })) }}>
            <MessageCircle size={13} /> Gửi Zalo
          </button>
          <hr className={styles.contextMenuSep} />
          <button type="button" className={styles.contextMenuItem} style={{ color: '#dc2626' }}
            onClick={() => { setXoaModalRow(contextMenu.row!); setContextMenu((m) => ({ ...m, open: false })) }}>
            <Trash2 size={13} /> Xóa
          </button>
        </div>
      )}

      <ConfirmXoaCaptchaModal
        open={xoaModalRow != null}
        onClose={() => setXoaModalRow(null)}
        onConfirm={() => xoaModalRow && xacNhanXoa(xoaModalRow)}
        message={
          xoaModalRow ? (
            <>
              Xóa báo giá <strong>{xoaModalRow.so_thu_tien_bang}</strong> — <strong>{xoaModalRow.khach_hang}</strong>?<br />
              <span style={{ color: '#dc2626' }}>Thao tác này không thể hoàn tác.</span>
            </>
          ) : null
        }
      />

      {/* Modal form - maskClosable={false} */}
      {showForm && (
        <div className={styles.modalOverlay}>
          <div
            ref={thuTienFormDrag.containerRef}
            className={styles.modalBox}
            style={thuTienFormDrag.containerStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <ThuTienForm
              key={formKey}
              formTitle="Phiếu thu tiền"
              thuTienPhieu
              soDonLabel="Mã phiếu thu"
              readOnly={
                formMode === 'view'
                || (formRecord != null && thuTienBangBiKhoaChinhSuaTheoTinhTrang(formRecord.tinh_trang))
              }
              initialDon={formMode === 'view' || formMode === 'edit' ? (formRecord ?? undefined) : null}
              initialChiTiet={formRecord ? thuTienBangGetChiTiet(formRecord.id) : undefined}
              onClose={() => setShowForm(false)}
              onSaved={() => { setShowForm(false); loadData() }}
              onHeaderPointerDown={thuTienFormDrag.dragHandleProps.onMouseDown}
              headerDragStyle={thuTienFormDrag.dragHandleProps.style}
            />
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Export chính với Provider wrapper ────────────────────────────────────────
export function ThuTien({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  return (
    <ThuTienBangApiProvider api={thuTienBangApiImpl}>
      <ThuTienBangContent onNavigate={onNavigate} />
    </ThuTienBangApiProvider>
  )
}
