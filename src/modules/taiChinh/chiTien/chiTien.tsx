/**
 * Chi tiền — danh sách + form (module độc lập, cấu trúc tương tự Thu tiền).
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
import { formatNumberDisplay, parseFloatVN } from '../../../utils/numberFormat'
import { htqlDatePickerPopperTop } from '../../../constants/datePickerPlacement'
import { DatePickerCustomHeader } from '../../../components/datePickerCustomHeader'

import {
  chiTienBangGetAll,
  chiTienBangGetChiTiet,
  chiTienBangDelete,
  getDefaultChiTienBangFilter,
  getDateRangeForKy,
  KY_OPTIONS,
  type ChiTienBangRecord,
  type ChiTienBangChiTiet,
  type ChiTienBangKyValue,
  type ChiTienBangFilter,
  clearChiTienBangDraft,
  chiTienBangBiKhoaChinhSuaTheoTinhTrang,
  TINH_TRANG_BG_DA_CHUYEN_DHB,
  TINH_TRANG_BG_DA_CHUYEN_HD,
  TINH_TRANG_BG_KH_KHONG_DONG_Y,
  HTQL_CHI_TIEN_BANG_RELOAD_EVENT,
  ChiTienBangApiImpl,
} from './chiTienBangApi'
import { ConfirmXoaCaptchaModal } from '../../../components/common/confirmXoaCaptchaModal'
import { useDraggable } from '../../../hooks/useDraggable'
import { ChiTienBangApiProvider } from './chiTienBangApiContext'
import { ChiTienForm } from './chiTienForm'
import styles from './banHangDetailMirror.module.css'
import { daGhiSoPhieuChi, ghiSoTuPhieuChi, huyGhiSoPhieuChi } from './ghiSoChiTienApi'
import {
  donHangBanChiTienBangIdsLinked,
  donHangBanGetAll,
  donHangBanKhiPhieuChiGhiSo,
  donHangBanKhiPhieuChiHuyGhiSo,
} from '../../crm/banHang/donHangBan/donHangBanChungTuApi'
import {
  hopDongBanChiTienBangIdsLinked,
  hopDongBanChungTuGetAll,
  hopDongBanKhiPhieuChiGhiSo,
  hopDongBanKhiPhieuChiHuyGhiSo,
} from '../../crm/banHang/hopDongBan/hopDongBanChungTuApi'
import {
  phuLucHopDongBanChiTienBangIdsLinked,
  phuLucHopDongBanChungTuGetAll,
  phuLucHopDongBanKhiPhieuChiGhiSo,
  phuLucHopDongBanKhiPhieuChiHuyGhiSo,
} from '../../crm/banHang/phuLucHopDongBan/phuLucHopDongBanChungTuApi'

registerLocale('vi', vi)

const PHIEU_CT_ROW_PREFIX = '__PC_ROW__:'

function parsePhieuThuJsonNoiDung(noi_dung: string | undefined): {
  so_phai_thu?: string
  so_chua_thu?: string
  thu_lan_nay?: string
  noi_dung_thu?: string
} | null {
  const raw = (noi_dung ?? '').trim()
  if (!raw.startsWith(PHIEU_CT_ROW_PREFIX)) return null
  try {
    return JSON.parse(raw.slice(PHIEU_CT_ROW_PREFIX.length)) as {
      so_phai_thu?: string
      so_chua_thu?: string
      thu_lan_nay?: string
      noi_dung_thu?: string
    }
  } catch {
    return null
  }
}

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
function ChiTienBangBadge({ value }: { value: string }) {
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
function ChiTienBangContent({ onNavigate: _onNavigate }: { onNavigate?: (tab: string) => void }) {
  const toast = useToastOptional()
  const [filter,      setFilter]      = useState<ChiTienBangFilter>(getDefaultChiTienBangFilter)
  const [danhSach,    setDanhSach]    = useState<ChiTienBangRecord[]>([])
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [chiTiet,     setChiTiet]     = useState<ChiTienBangChiTiet[]>([])
  const [search,      setSearch]      = useState('')
  const [showForm,    setShowForm]    = useState(false)
  const [formMode,    setFormMode]    = useState<'add' | 'edit' | 'view'>('add')
  const [formRecord,  setFormRecord]  = useState<ChiTienBangRecord | null>(null)
  const [xoaModalRow, setXoaModalRow] = useState<ChiTienBangRecord | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    open: boolean; x: number; y: number; row: ChiTienBangRecord | null
  }>({ open: false, x: 0, y: 0, row: null })
  const [formKey,      setFormKey]      = useState(0)
  const [dropdownGui, setDropdownGui] = useState(false)
  const dropdownGuiRef = useRef<HTMLDivElement>(null)
  const hoverGuiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [page, setPage] = useState(1)
  const ChiTienFormDrag = useDraggable()

  const loadData = useCallback(() => {
    setDanhSach(chiTienBangGetAll(filter))
  }, [filter])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    const sync = () => loadData()
    window.addEventListener(HTQL_CHI_TIEN_BANG_RELOAD_EVENT, sync)
    return () => window.removeEventListener(HTQL_CHI_TIEN_BANG_RELOAD_EVENT, sync)
  }, [loadData])
  useEffect(() => {
    if (selectedId) setChiTiet(chiTienBangGetChiTiet(selectedId))
    else setChiTiet([])
  }, [selectedId])

  const filtered = useMemo(() => {
    let result = danhSach
    if (search.trim()) {
      result = result.filter((r) =>
        matchSearchKeyword(
          `${r.so_chi_tien_bang} ${r.so_chung_tu_cukcuk ?? ''} ${r.khach_hang} ${r.dien_giai ?? ''} ${r.tinh_trang}`,
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
  const phieuChiLienKetNguonIds = useMemo(() => {
    const ids = new Set<string>()
    const filterTatCa = { ky: 'tat-ca' as const, tu: '', den: '' }
    donHangBanGetAll(filterTatCa).forEach((row) => {
      donHangBanChiTienBangIdsLinked(row).forEach((id) => { if (id) ids.add(id) })
    })
    hopDongBanChungTuGetAll(filterTatCa).forEach((row) => {
      hopDongBanChiTienBangIdsLinked(row).forEach((id) => { if (id) ids.add(id) })
    })
    phuLucHopDongBanChungTuGetAll(filterTatCa).forEach((row) => {
      phuLucHopDongBanChiTienBangIdsLinked(row).forEach((id) => { if (id) ids.add(id) })
    })
    return ids
  }, [danhSach.length])
  const phieuChiDangLienKetNguon = useCallback(
    (id: string) => phieuChiLienKetNguonIds.has(id),
    [phieuChiLienKetNguonIds],
  )

  const columnsChiTiet = useMemo((): DataGridColumn<ChiTienBangChiTiet>[] => {
    const maPhieu = selectedRow?.so_chi_tien_bang ?? ''
    const ngayThuStr = formatNgay(selectedRow?.ngay_chi_tien_bang)
    return [
      {
        key: 'stt',
        label: 'STT',
        width: 36,
        align: 'center',
        renderCell: (_v, _r, idx) => String((idx ?? 0) + 1),
      },
      {
        key: 'ma_phieu',
        label: 'Mã phiếu chi',
        width: 84,
        align: 'right',
        renderCell: () => maPhieu,
      },
      {
        key: 'ngay_thu',
        label: 'Ngày phiếu',
        width: 78,
        align: 'right',
        renderCell: () => ngayThuStr,
      },
      {
        key: 'noi_dung_thu',
        label: 'Nội dung chi',
        width: 220,
        align: 'left',
        renderCell: (_v, row) => {
          const headerNd = (selectedRow?.dien_giai ?? '').trim()
          if (headerNd) return headerNd
          const j = parsePhieuThuJsonNoiDung(row.noi_dung)
          const nd = (j?.noi_dung_thu ?? '').trim()
          if (nd) return nd
          return (row.ten_hang ?? '').trim() || ''
        },
      },
      {
        key: 'so_phai_thu',
        label: 'Số phải chi',
        width: 104,
        align: 'right',
        renderCell: (_v, row) => {
          const j = parsePhieuThuJsonNoiDung(row.noi_dung)
          if (j?.so_phai_thu != null && String(j.so_phai_thu).trim()) return String(j.so_phai_thu)
          return formatNumberDisplay(Math.round(Number(row.thanh_tien) || 0), 0)
        },
      },
      {
        key: 'so_chua_thu',
        label: 'Số chưa chi',
        width: 104,
        align: 'right',
        renderCell: (_v, row) => {
          const j = parsePhieuThuJsonNoiDung(row.noi_dung)
          if (j?.so_chua_thu != null && String(j.so_chua_thu).trim()) return String(j.so_chua_thu)
          return '—'
        },
      },
      {
        key: 'thu_lan_nay',
        label: 'Chi lần này',
        width: 104,
        align: 'right',
        renderCell: (_v, row) => {
          const j = parsePhieuThuJsonNoiDung(row.noi_dung)
          if (j?.thu_lan_nay != null && String(j.thu_lan_nay).trim()) return String(j.thu_lan_nay)
          return formatNumberDisplay(Math.round(Number(row.don_gia) || 0), 0)
        },
      },
      {
        key: 'con_lai',
        label: 'Còn lại',
        width: 104,
        align: 'right',
        renderCell: (_v, row) => {
          const j = parsePhieuThuJsonNoiDung(row.noi_dung)
          if (j) {
            const chua = parseFloatVN(j.so_chua_thu ?? '0')
            const thu = parseFloatVN(j.thu_lan_nay ?? '0')
            return formatNumberDisplay(Math.max(0, Math.round(chua - thu)), 0)
          }
          return '—'
        },
      },
    ]
  }, [selectedRow])

  const chiTietFooterTong = useMemo(() => {
    if (!selectedRow) return null
    return formatNumberDisplay(Math.round(selectedRow.tong_thanh_toan ?? 0), 0)
  }, [selectedRow])

  const moFormThem = () => {
    clearChiTienBangDraft()
    setFormRecord(null)
    setFormMode('add')
    setFormKey((k) => k + 1)
    setShowForm(true)
  }
  const moFormXem  = (row: ChiTienBangRecord) => { setFormRecord(row); setFormMode('view'); setFormKey((k) => k + 1); setShowForm(true) }
  const moFormSua  = (row: ChiTienBangRecord) => { setFormRecord(row); setFormMode('edit'); setFormKey((k) => k + 1); setShowForm(true) }

  const columnsChiTienBangList = useMemo((): DataGridColumn<ChiTienBangRecord>[] => {
    return [
      { key: 'so_chi_tien_bang', label: 'Mã phiếu chi', width: 96, align: 'right' },
      { key: 'nv_ban_hang', label: 'Người chi', width: '10%' },
      { key: 'ngay_chi_tien_bang', label: 'TG tạo', width: 88, align: 'right', renderCell: (v) => formatNgay(v as string) },
      {
        key: 'ngay_hach_toan',
        label: 'Ngày thu',
        width: 96,
        align: 'right',
        renderCell: (_v, row) =>
          formatNgay((row as ChiTienBangRecord).ngay_hach_toan ?? (row as ChiTienBangRecord).ngay_giao_hang),
      },
      { key: 'khach_hang', label: 'Khách hàng', width: '22%' },
      {
        key: 'tong_thanh_toan',
        label: 'Tổng tiền',
        width: 92,
        align: 'right',
        renderCell: (v) => formatNumberDisplay(Number(v), 0),
      },
      {
        key: 'tinh_trang',
        label: 'Trạng thái',
        width: 82,
        renderCell: (_v, row) =>
          daGhiSoPhieuChi((row as ChiTienBangRecord).id) ? (
            <span className={styles.badgeDaChot}>Ghi sổ</span>
          ) : (
            <ChiTienBangBadge value={String((row as ChiTienBangRecord).tinh_trang)} />
          ),
      },
      {
        key: 'dien_giai',
        label: 'Nội dung chi',
        width: '18%',
        renderCell: (v, row) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              moFormXem(row as ChiTienBangRecord)
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
            title="Xem phiếu chi"
          >
            {String(v ?? '')}
          </button>
        ),
      },
    ]
  }, [])

  const xacNhanXoa = (row: ChiTienBangRecord) => {
    if (phieuChiDangLienKetNguon(row.id)) {
      toast?.showToast('Phiếu chi đã liên kết chứng từ nguồn, không cho phép xóa.', 'error')
      setXoaModalRow(null)
      return
    }
    try {
      huyGhiSoPhieuChi(row.id)
      chiTienBangDelete(row.id)
      loadData()
      if (selectedId === row.id) setSelectedId(null)
      toast?.showToast(`Đã xóa phiếu chi ${row.so_chi_tien_bang}.`, 'info')
    } catch (e) {
      toast?.showToast(e instanceof Error ? e.message : 'Không thể xóa phiếu chi.', 'error')
    }
    setXoaModalRow(null)
  }

  return (
    <div className={styles.root}>
      {/* Toolbar danh sách */}
      <div className={styles.toolbarWrap}>
        <button type="button" className={styles.toolbarBtn} onClick={moFormThem}>
          <Plus size={13} /><span>Thêm</span>
        </button>
        <button type="button" className={styles.toolbarBtnDanger}
          disabled={
            !selectedId ||
            (selectedRow != null && (daGhiSoPhieuChi(selectedRow.id) || phieuChiDangLienKetNguon(selectedRow.id)))
          }
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
              const ky = e.target.value as ChiTienBangKyValue
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
                const next: ChiTienBangFilter = { ...f, ky: 'tat-ca', tu: iso }
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
                      const next: ChiTienBangFilter = { ...f, ky: 'tat-ca', tu: iso }
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
                const next: ChiTienBangFilter = { ...f, ky: 'tat-ca', den: iso }
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
                      const next: ChiTienBangFilter = { ...f, ky: 'tat-ca', den: iso }
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
            placeholder="Tìm mã phiếu chi, khách hàng, lý do chi..."
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
            <DataGrid<ChiTienBangRecord>
              columns={columnsChiTienBangList}
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
                { label: 'Tổng chi', value: formatNumberDisplay(tongTien, 0) },
              ] : []}
            />
          </div>
          <Pagination page={page} total={totalPages} onChange={setPage} />
        </div>

        <div className={styles.detailWrap}>
          <div className={styles.detailTabBar}>
            <button type="button" className={styles.detailTabActive}>Chi tiết phiếu chi</button>
          </div>
          <div className={styles.detailTabPanel}>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <DataGrid<ChiTienBangChiTiet>
                columns={columnsChiTiet}
                data={chiTiet}
                keyField="id"
                stripedRows compact height="100%"
              />
            </div>
            {chiTietFooterTong && (
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 10,
                  padding: '8px 10px',
                  fontSize: 11,
                  borderTop: '1px solid var(--border)',
                  background: 'var(--bg-tab)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <span>Tổng chi (phiếu): <strong>{chiTietFooterTong}</strong></span>
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
            disabled={
              chiTienBangBiKhoaChinhSuaTheoTinhTrang(contextMenu.row!.tinh_trang)
              || daGhiSoPhieuChi(contextMenu.row!.id)
              || phieuChiDangLienKetNguon(contextMenu.row!.id)
            }
            style={{
              opacity:
                chiTienBangBiKhoaChinhSuaTheoTinhTrang(contextMenu.row!.tinh_trang) || daGhiSoPhieuChi(contextMenu.row!.id) || phieuChiDangLienKetNguon(contextMenu.row!.id)
                  ? 0.45
                  : 1,
              cursor:
                chiTienBangBiKhoaChinhSuaTheoTinhTrang(contextMenu.row!.tinh_trang) || daGhiSoPhieuChi(contextMenu.row!.id) || phieuChiDangLienKetNguon(contextMenu.row!.id)
                  ? 'default'
                  : 'pointer',
            }}
            onClick={() => {
              if (chiTienBangBiKhoaChinhSuaTheoTinhTrang(contextMenu.row!.tinh_trang) || daGhiSoPhieuChi(contextMenu.row!.id) || phieuChiDangLienKetNguon(contextMenu.row!.id))
                return
              moFormSua(contextMenu.row!)
              setContextMenu((m) => ({ ...m, open: false }))
            }}>
            <Plus size={13} /> Sửa
          </button>
          <hr className={styles.contextMenuSep} />
          <button
            type="button"
            className={styles.contextMenuItem}
            disabled={daGhiSoPhieuChi(contextMenu.row!.id)}
            style={{
              opacity: daGhiSoPhieuChi(contextMenu.row!.id) ? 0.45 : 1,
              cursor: daGhiSoPhieuChi(contextMenu.row!.id) ? 'default' : 'pointer',
            }}
            onClick={() => {
              const r = contextMenu.row!
              if (daGhiSoPhieuChi(r.id)) return
              ghiSoTuPhieuChi(r, Math.round(Number(r.tong_thanh_toan) || 0))
              donHangBanKhiPhieuChiGhiSo(r.id)
              hopDongBanKhiPhieuChiGhiSo(r.id)
              phuLucHopDongBanKhiPhieuChiGhiSo(r.id)
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
            disabled={!daGhiSoPhieuChi(contextMenu.row!.id)}
            style={{
              opacity: !daGhiSoPhieuChi(contextMenu.row!.id) ? 0.45 : 1,
              cursor: !daGhiSoPhieuChi(contextMenu.row!.id) ? 'default' : 'pointer',
            }}
            onClick={() => {
              const r = contextMenu.row!
              if (!daGhiSoPhieuChi(r.id)) return
              huyGhiSoPhieuChi(r.id)
              donHangBanKhiPhieuChiHuyGhiSo(r.id)
              hopDongBanKhiPhieuChiHuyGhiSo(r.id)
              phuLucHopDongBanKhiPhieuChiHuyGhiSo(r.id)
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
            disabled={daGhiSoPhieuChi(contextMenu.row!.id) || phieuChiDangLienKetNguon(contextMenu.row!.id)}
            onClick={() => {
              const r = contextMenu.row!
              if (daGhiSoPhieuChi(r.id) || phieuChiDangLienKetNguon(r.id)) return
              setXoaModalRow(r)
              setContextMenu((m) => ({ ...m, open: false }))
            }}>
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
              Xóa phiếu chi <strong>{xoaModalRow.so_chi_tien_bang}</strong> — <strong>{xoaModalRow.khach_hang}</strong>?<br />
              <span style={{ color: '#dc2626' }}>Thao tác này không thể hoàn tác.</span>
            </>
          ) : null
        }
      />

      {/* Modal form - maskClosable={false} */}
      {showForm && (
        <div className={styles.modalOverlay}>
          <div
            ref={ChiTienFormDrag.containerRef}
            className={styles.modalBox}
            style={ChiTienFormDrag.containerStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <ChiTienForm
              key={formKey}
              formTitle="Phiếu chi tiền"
              chiTienPhieu
              soDonLabel="Mã phiếu chi"
              readOnly={
                formMode === 'view'
                || (formRecord != null && chiTienBangBiKhoaChinhSuaTheoTinhTrang(formRecord.tinh_trang))
                || (formRecord != null && daGhiSoPhieuChi(formRecord.id))
                || (formRecord != null && phieuChiDangLienKetNguon(formRecord.id))
              }
              initialDon={formMode === 'view' || formMode === 'edit' ? (formRecord ?? undefined) : null}
              initialChiTiet={formRecord ? chiTienBangGetChiTiet(formRecord.id) : undefined}
              onClose={() => setShowForm(false)}
              onSaved={() => { setShowForm(false); loadData() }}
              onHeaderPointerDown={ChiTienFormDrag.dragHandleProps.onMouseDown}
              headerDragStyle={ChiTienFormDrag.dragHandleProps.style}
            />
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Export chính với Provider wrapper ────────────────────────────────────────
export function ChiTien({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  return (
    <ChiTienBangApiProvider api={ChiTienBangApiImpl}>
      <ChiTienBangContent onNavigate={onNavigate} />
    </ChiTienBangApiProvider>
  )
}
