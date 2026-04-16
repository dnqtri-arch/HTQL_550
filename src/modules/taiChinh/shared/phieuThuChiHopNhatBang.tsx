/**
 * Lưới thu+chi đã ghi sổ / sổ TM / sổ NH — giao diện giống Thu tiền (YC93).
 */
import React, { useState, useEffect, useCallback, useMemo, forwardRef } from 'react'
import { Eye, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { vi } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import { DataGrid, type DataGridColumn } from '../../../components/common/dataGrid'
import { matchSearchKeyword } from '../../../utils/stringUtils'
import { formatNumberDisplay, parseFloatVN } from '../../../utils/numberFormat'
import { htqlDatePickerPopperTop } from '../../../constants/datePickerPlacement'
import { DatePickerCustomHeader } from '../../../components/datePickerCustomHeader'
import {
  thuTienBangGetAll,
  thuTienBangGetChiTiet,
  getDefaultThuTienBangFilter,
  getDateRangeForKy,
  KY_OPTIONS,
  type ThuTienBangRecord,
  type ThuTienBangChiTiet,
  type ThuTienBangKyValue,
  type ThuTienBangFilter,
  HTQL_THU_TIEN_BANG_RELOAD_EVENT,
  thuTienBangApiImpl,
  TINH_TRANG_BG_DA_CHUYEN_DHB,
  TINH_TRANG_BG_DA_CHUYEN_HD,
  TINH_TRANG_BG_KH_KHONG_DONG_Y,
} from '../thuTien/thuTienBangApi'
import {
  chiTienBangGetAll,
  chiTienBangGetChiTiet,
  type ChiTienBangRecord,
  type ChiTienBangChiTiet,
  type ChiTienBangFilter,
  HTQL_CHI_TIEN_BANG_RELOAD_EVENT,
  ChiTienBangApiImpl,
} from '../chiTien/chiTienBangApi'
import { daGhiSoPhieuThu } from '../thuTien/ghiSoTaiChinhApi'
import { daGhiSoPhieuChi } from '../chiTien/ghiSoChiTienApi'
import { HTQL_TAI_CHINH_GHI_SO_RELOAD_EVENT } from '../thuTien/ghiSoTaiChinhApi'
import { ThuTienForm } from '../thuTien/thuTienForm'
import { ChiTienForm } from '../chiTien/chiTienForm'
import { useDraggable } from '../../../hooks/useDraggable'
import { ThuTienBangApiProvider } from '../thuTien/thuTienBangApiContext'
import { ChiTienBangApiProvider } from '../chiTien/chiTienBangApiContext'
import styles from '../thuTien/banHangDetailMirror.module.css'
import {
  phieuThuLaKenhTienMat,
  phieuThuLaKenhNganHang,
  phieuChiLaKenhTienMat,
  phieuChiLaKenhNganHang,
} from './phieuKenhLoc'

registerLocale('vi', vi)

export type PhieuHopNhatVariant = 'thuChiGhiSo' | 'soTienMat' | 'soNganHang'

export type HopNhatPhieuRow =
  | { loai: 'thu'; id: string; r: ThuTienBangRecord }
  | { loai: 'chi'; id: string; r: ChiTienBangRecord }

const PAGE_SIZE = 50

const PREFIX_THU_CT = '__PT_ROW__:'
const PREFIX_CHI_CT = '__PC_ROW__:'

function parseCtLine(noi_dung: string | undefined, prefix: string): {
  so_phai_thu?: string
  so_chua_thu?: string
  thu_lan_nay?: string
  noi_dung_thu?: string
} | null {
  const raw = (noi_dung ?? '').trim()
  if (!raw.startsWith(prefix)) return null
  try {
    return JSON.parse(raw.slice(prefix.length)) as {
      so_phai_thu?: string
      so_chua_thu?: string
      thu_lan_nay?: string
      noi_dung_thu?: string
    }
  } catch {
    return null
  }
}

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

function formatNgay(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

function ngaySapXepRow(row: HopNhatPhieuRow): string {
  if (row.loai === 'thu') {
    const x = row.r
    return (x.ngay_hach_toan ?? x.ngay_thu_tien_bang ?? '').trim() || x.ngay_thu_tien_bang
  }
  const x = row.r
  return (x.ngay_hach_toan ?? x.ngay_chi_tien_bang ?? '').trim() || x.ngay_chi_tien_bang
}

const FormattedDateInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { onBlurCommit?: (value: string) => void }>(
  function FormattedDateInput(props, ref) {
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
  },
)

const Pagination = React.memo(({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) => {
  if (total <= 1) return null
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        fontSize: 11,
      }}
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: page > 1 ? 'pointer' : 'default',
          color: page > 1 ? 'var(--accent)' : 'var(--text-muted)',
          padding: '1px 4px',
        }}
      >
        <ChevronLeft size={13} />
      </button>
      <span style={{ color: 'var(--text-muted)' }}>
        Trang {page}/{total}
      </span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= total}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: page < total ? 'pointer' : 'default',
          color: page < total ? 'var(--accent)' : 'var(--text-muted)',
          padding: '1px 4px',
        }}
      >
        <ChevronRight size={13} />
      </button>
    </div>
  )
})

function ThuTrangThaiBadge({ value }: { value: string }) {
  const cls =
    value === 'Đã chốt'
      ? styles.badgeDaChot
      : value === 'Chờ duyệt'
        ? styles.badgeChoDuyet
        : value === 'Hủy bỏ'
          ? styles.badgeDaHuy
          : value === 'Đã gửi khách'
            ? styles.badgeDangThucHien
            : value === TINH_TRANG_BG_DA_CHUYEN_DHB || value === TINH_TRANG_BG_DA_CHUYEN_HD
              ? styles.badgeDaChot
              : value === TINH_TRANG_BG_KH_KHONG_DONG_Y
                ? styles.badgeDaHuy
                : styles.badgeDefault
  return <span className={cls}>{value}</span>
}

function buildHopNhatRows(variant: PhieuHopNhatVariant, filter: ThuTienBangFilter): HopNhatPhieuRow[] {
  const chiFilter: ChiTienBangFilter = { ky: filter.ky as ChiTienBangFilter['ky'], tu: filter.tu, den: filter.den }
  const thuAll = thuTienBangGetAll(filter)
  const chiAll = chiTienBangGetAll(chiFilter)

  /** YC94: Thu/chi tiền — mọi phiếu có lý do (kể cả chưa ghi sổ). Sổ TM/NH — chỉ đã ghi sổ. */
  const chiGhiSoOnly = variant === 'soTienMat' || variant === 'soNganHang'

  const laPhieuThu = (r: ThuTienBangRecord) => {
    if ((r.tinh_trang ?? '').trim() === 'Hủy bỏ') return false
    if (!r.ly_do_thu_phieu) return false
    if (chiGhiSoOnly && !daGhiSoPhieuThu(r.id)) return false
    return true
  }
  const laPhieuChi = (r: ChiTienBangRecord) => {
    if ((r.tinh_trang ?? '').trim() === 'Hủy bỏ') return false
    if (!r.ly_do_chi_phieu) return false
    if (chiGhiSoOnly && !daGhiSoPhieuChi(r.id)) return false
    return true
  }

  let thuList = thuAll.filter(laPhieuThu)
  let chiList = chiAll.filter(laPhieuChi)

  if (variant === 'soTienMat') {
    thuList = thuList.filter(phieuThuLaKenhTienMat)
    chiList = chiList.filter(phieuChiLaKenhTienMat)
  } else if (variant === 'soNganHang') {
    thuList = thuList.filter(phieuThuLaKenhNganHang)
    chiList = chiList.filter(phieuChiLaKenhNganHang)
  }

  const merged: HopNhatPhieuRow[] = [
    ...thuList.map((r) => ({ loai: 'thu' as const, id: r.id, r })),
    ...chiList.map((r) => ({ loai: 'chi' as const, id: r.id, r })),
  ]

  merged.sort((a, b) => {
    const da = ngaySapXepRow(a)
    const db = ngaySapXepRow(b)
    if (da !== db) return da < db ? 1 : -1
    const ma = a.loai === 'thu' ? a.r.so_thu_tien_bang : a.r.so_chi_tien_bang
    const mb = b.loai === 'thu' ? b.r.so_thu_tien_bang : b.r.so_chi_tien_bang
    return mb.localeCompare(ma, 'vi')
  })
  return merged
}

function PhieuThuChiHopNhatInner({ variant }: { variant: PhieuHopNhatVariant }) {
  const isSoDayKe = variant === 'soTienMat' || variant === 'soNganHang'
  const [filter, setFilter] = useState<ThuTienBangFilter>(getDefaultThuTienBangFilter)
  const [rows, setRows] = useState<HopNhatPhieuRow[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showFormThu, setShowFormThu] = useState(false)
  const [showFormChi, setShowFormChi] = useState(false)
  const [formRecordThu, setFormRecordThu] = useState<ThuTienBangRecord | null>(null)
  const [formRecordChi, setFormRecordChi] = useState<ChiTienBangRecord | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [contextMenu, setContextMenu] = useState<{
    open: boolean
    x: number
    y: number
    row: HopNhatPhieuRow | null
  }>({ open: false, x: 0, y: 0, row: null })

  const dragThu = useDraggable()
  const dragChi = useDraggable()

  const loadData = useCallback(() => {
    setRows(buildHopNhatRows(variant, filter))
  }, [variant, filter])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const bump = () => loadData()
    window.addEventListener(HTQL_THU_TIEN_BANG_RELOAD_EVENT, bump)
    window.addEventListener(HTQL_CHI_TIEN_BANG_RELOAD_EVENT, bump)
    window.addEventListener(HTQL_TAI_CHINH_GHI_SO_RELOAD_EVENT, bump)
    return () => {
      window.removeEventListener(HTQL_THU_TIEN_BANG_RELOAD_EVENT, bump)
      window.removeEventListener(HTQL_CHI_TIEN_BANG_RELOAD_EVENT, bump)
      window.removeEventListener(HTQL_TAI_CHINH_GHI_SO_RELOAD_EVENT, bump)
    }
  }, [loadData])

  useEffect(() => {
    const h = () => {
      setContextMenu((m) => (m.open ? { ...m, open: false } : m))
    }
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [])

  const selected = useMemo(() => {
    if (!selectedKey) return null
    return rows.find((x) => `${x.loai}:${x.id}` === selectedKey) ?? null
  }, [selectedKey, rows])

  const chiTietThu = useMemo((): ThuTienBangChiTiet[] => {
    if (!selected || selected.loai !== 'thu') return []
    return thuTienBangGetChiTiet(selected.r.id)
  }, [selected])

  const chiTietChi = useMemo((): ChiTienBangChiTiet[] => {
    if (!selected || selected.loai !== 'chi') return []
    return chiTienBangGetChiTiet(selected.r.id)
  }, [selected])

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    return rows.filter((row) => {
      if (row.loai === 'thu') {
        const r = row.r
        return matchSearchKeyword(
          `${r.so_thu_tien_bang} ${r.so_chung_tu_cukcuk ?? ''} ${r.khach_hang} ${r.dien_giai ?? ''} Thu phiếu`,
          search,
        )
      }
      const r = row.r
      return matchSearchKeyword(
        `${r.so_chi_tien_bang} ${r.so_chung_tu_cukcuk ?? ''} ${r.khach_hang} ${r.dien_giai ?? ''} Chi phiếu`,
        search,
      )
    })
  }, [rows, search])

  useEffect(() => {
    setPage(1)
  }, [filter, search, variant])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page])

  const tongThu = useMemo(
    () => filtered.filter((x): x is HopNhatPhieuRow & { loai: 'thu' } => x.loai === 'thu').reduce((a, x) => a + x.r.tong_thanh_toan, 0),
    [filtered],
  )
  const tongChi = useMemo(
    () => filtered.filter((x): x is HopNhatPhieuRow & { loai: 'chi' } => x.loai === 'chi').reduce((a, x) => a + x.r.tong_thanh_toan, 0),
    [filtered],
  )

  const moFormXem = useCallback((row: HopNhatPhieuRow) => {
    setFormKey((k) => k + 1)
    if (row.loai === 'thu') {
      setFormRecordThu(row.r)
      setShowFormThu(true)
      setShowFormChi(false)
    } else {
      setFormRecordChi(row.r)
      setShowFormChi(true)
      setShowFormThu(false)
    }
  }, [])

  type HopNhatColRow = { key: string; loai: 'thu' | 'chi'; r: ThuTienBangRecord | ChiTienBangRecord }

  const colMaPhieu: DataGridColumn<HopNhatColRow> = {
    key: 'so_phieu',
    label: 'Mã phiếu',
    width: 96,
    align: 'right',
    renderCell: (_v, row) => (row.loai === 'thu' ? (row.r as ThuTienBangRecord).so_thu_tien_bang : (row.r as ChiTienBangRecord).so_chi_tien_bang),
  }
  const colLoai: DataGridColumn<HopNhatColRow> = {
    key: 'loai',
    label: 'Loại',
    width: 56,
    align: 'left',
    renderCell: (_v, row) => (row.loai === 'thu' ? 'Thu' : 'Chi'),
  }
  const colNv: DataGridColumn<HopNhatColRow> = {
    key: 'nv',
    label: 'Người TH/Chi',
    width: '10%',
    renderCell: (_v, row) => row.r.nv_ban_hang,
  }
  const colNgayThuChi: DataGridColumn<HopNhatColRow> = {
    key: 'ngay_thu_chi',
    label: 'Ngày thu/chi',
    width: 96,
    align: 'right',
    renderCell: (_v, row) =>
      formatNgay(
        row.loai === 'thu'
          ? (row.r as ThuTienBangRecord).ngay_hach_toan ?? (row.r as ThuTienBangRecord).ngay_thu_tien_bang
          : (row.r as ChiTienBangRecord).ngay_hach_toan ?? (row.r as ChiTienBangRecord).ngay_chi_tien_bang,
      ),
  }
  const colKh: DataGridColumn<HopNhatColRow> = { key: 'kh', label: 'Đối tượng', width: '20%', renderCell: (_v, row) => row.r.khach_hang }
  const colTong: DataGridColumn<HopNhatColRow> = {
    key: 'tong',
    label: 'Tổng tiền',
    width: 92,
    align: 'right',
    renderCell: (_v, row) => formatNumberDisplay(row.r.tong_thanh_toan, 0),
  }
  const colNd = (noTrang: boolean): DataGridColumn<HopNhatColRow> => ({
    key: 'dien_giai',
    label: noTrang ? 'Nội dung' : 'Nội dung',
    width: noTrang ? '24%' : '18%',
    renderCell: (_v, row) => (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          moFormXem(row.loai === 'thu' ? { loai: 'thu', id: row.r.id, r: row.r as ThuTienBangRecord } : { loai: 'chi', id: row.r.id, r: row.r as ChiTienBangRecord })
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
        title="Xem phiếu"
      >
        {String(row.r.dien_giai ?? '')}
      </button>
    ),
  })

  const columnsList = useMemo((): DataGridColumn<HopNhatColRow>[] => {
    if (isSoDayKe) {
      return [colMaPhieu, colLoai, colNv, colNgayThuChi, colKh, colTong, colNd(true)]
    }
    const colTgTao: DataGridColumn<HopNhatColRow> = {
      key: 'tg_tao',
      label: 'TG tạo',
      width: 88,
      align: 'right',
      renderCell: (_v, row) =>
        row.loai === 'thu'
          ? formatNgay((row.r as ThuTienBangRecord).ngay_thu_tien_bang)
          : formatNgay((row.r as ChiTienBangRecord).ngay_chi_tien_bang),
    }
    const colNgayHT: DataGridColumn<HopNhatColRow> = {
      key: 'ngay_ht',
      label: 'Ngày HT',
      width: 96,
      align: 'right',
      renderCell: (_v, row) =>
        formatNgay(
          row.loai === 'thu'
            ? (row.r as ThuTienBangRecord).ngay_hach_toan ?? (row.r as ThuTienBangRecord).ngay_giao_hang
            : (row.r as ChiTienBangRecord).ngay_hach_toan ?? (row.r as ChiTienBangRecord).ngay_giao_hang,
        ),
    }
    const colTrang: DataGridColumn<HopNhatColRow> = {
      key: 'trang',
      label: 'Trạng thái',
      width: 82,
      renderCell: (_v, row) =>
        row.loai === 'thu' ? (
          daGhiSoPhieuThu(row.r.id) ? (
            <span className={styles.badgeDaChot}>Ghi sổ</span>
          ) : (
            <ThuTrangThaiBadge value={String((row.r as ThuTienBangRecord).tinh_trang)} />
          )
        ) : daGhiSoPhieuChi(row.r.id) ? (
          <span className={styles.badgeDaChot}>Ghi sổ</span>
        ) : (
          <ThuTrangThaiBadge value={String((row.r as ChiTienBangRecord).tinh_trang)} />
        ),
    }
    return [colLoai, colMaPhieu, colNv, colTgTao, colNgayHT, colKh, colTong, colTrang, colNd(false)]
  }, [moFormXem, isSoDayKe])

  const gridData: HopNhatColRow[] = useMemo(
    () => paginated.map((x) => ({ key: `${x.loai}:${x.id}`, loai: x.loai, r: x.r })),
    [paginated],
  )

  const columnsChiTietUnified = useMemo((): DataGridColumn<ThuTienBangChiTiet | ChiTienBangChiTiet>[] => {
    const thuSel = selected?.loai === 'thu' ? selected.r : null
    const chiSel = selected?.loai === 'chi' ? selected.r : null
    const maPhieu = thuSel?.so_thu_tien_bang ?? chiSel?.so_chi_tien_bang ?? ''
    const ngayPhieu = formatNgay(thuSel?.ngay_thu_tien_bang ?? chiSel?.ngay_chi_tien_bang)
    const prefix = selected?.loai === 'thu' ? PREFIX_THU_CT : PREFIX_CHI_CT
    const dienHeader = (selected?.r.dien_giai ?? '').trim()

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
        label: selected?.loai === 'chi' ? 'Mã phiếu chi' : 'Mã phiếu thu',
        width: 84,
        align: 'right',
        renderCell: () => maPhieu,
      },
      {
        key: 'ngay_phieu',
        label: 'Ngày phiếu',
        width: 78,
        align: 'right',
        renderCell: () => ngayPhieu,
      },
      {
        key: 'noi_dung',
        label: selected?.loai === 'chi' ? 'Nội dung chi' : 'Nội dung thu',
        width: 220,
        align: 'left',
        renderCell: (_v, row) => {
          if (dienHeader) return dienHeader
          const j = parseCtLine(row.noi_dung, prefix)
          const nd = (j?.noi_dung_thu ?? '').trim()
          if (nd) return nd
          return (row.ten_hang ?? '').trim() || ''
        },
      },
      {
        key: 'so1',
        label: selected?.loai === 'chi' ? 'Số phải chi' : 'Số phải thu',
        width: 104,
        align: 'right',
        renderCell: (_v, row) => {
          const j = parseCtLine(row.noi_dung, prefix)
          if (j?.so_phai_thu != null && String(j.so_phai_thu).trim()) return String(j.so_phai_thu)
          return formatNumberDisplay(Math.round(Number(row.thanh_tien) || 0), 0)
        },
      },
      {
        key: 'so2',
        label: selected?.loai === 'chi' ? 'Số chưa chi' : 'Số chưa thu',
        width: 104,
        align: 'right',
        renderCell: (_v, row) => {
          const j = parseCtLine(row.noi_dung, prefix)
          if (j?.so_chua_thu != null && String(j.so_chua_thu).trim()) return String(j.so_chua_thu)
          return '—'
        },
      },
      {
        key: 'lan',
        label: selected?.loai === 'chi' ? 'Chi lần này' : 'Thu lần này',
        width: 104,
        align: 'right',
        renderCell: (_v, row) => {
          const j = parseCtLine(row.noi_dung, prefix)
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
          const j = parseCtLine(row.noi_dung, prefix)
          if (j) {
            const chua = parseFloatVN(j.so_chua_thu ?? '0')
            const thu = parseFloatVN(j.thu_lan_nay ?? '0')
            return formatNumberDisplay(Math.max(0, Math.round(chua - thu)), 0)
          }
          return '—'
        },
      },
    ]
  }, [selected])

  const chiTietRows = selected?.loai === 'thu' ? chiTietThu : chiTietChi
  const chiTietFooter = selected ? formatNumberDisplay(Math.round(selected.r.tong_thanh_toan ?? 0), 0) : null

  const toolbarHint =
    variant === 'thuChiGhiSo'
      ? 'Phiếu có lý do — đã ghi sổ và chưa ghi sổ.'
      : variant === 'soTienMat'
        ? 'Tiền mặt, chỉ đã ghi sổ — tick TM hoặc TK tiền mặt.'
        : 'Ngân hàng, chỉ đã ghi sổ — tick NH hoặc TK ngân hàng.'

  return (
    <div className={styles.root}>
      <div className={styles.toolbarWrap}>
        <div className={styles.filterWrap}>
          <span className={styles.filterLabel}>Kỳ</span>
          <select
            className={styles.filterInput}
            value={filter.ky}
            onChange={(e) => {
              const ky = e.target.value as ThuTienBangKyValue
              if (ky === 'tat-ca') {
                setFilter({ ky, tu: '', den: '' })
                return
              }
              const range = getDateRangeForKy(ky)
              setFilter({ ky, tu: range.tu, den: range.den })
            }}
          >
            {KY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
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
        <div style={{ position: 'relative', flex: 1, minWidth: 200, marginLeft: 8 }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            className={styles.searchInput}
            style={{ paddingLeft: 32, width: '100%' }}
            placeholder="Tìm mã phiếu, đối tượng, nội dung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-muted)', maxWidth: 200, textAlign: 'right' }}>
          {toolbarHint}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
          {filtered.length} bản ghi · trang {page}/{totalPages}
        </span>
      </div>

      <div className={styles.contentArea}>
        <div className={styles.gridWrap} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <DataGrid<HopNhatColRow>
              columns={columnsList}
              data={gridData}
              keyField="key"
              stripedRows
              compact
              height="100%"
              selectedRowId={selectedKey}
              onRowSelect={(r) => setSelectedKey(r.key)}
              onRowDoubleClick={(r) =>
                moFormXem(r.loai === 'thu' ? { loai: 'thu', id: r.r.id, r: r.r as ThuTienBangRecord } : { loai: 'chi', id: r.r.id, r: r.r as ChiTienBangRecord })
              }
              onRowContextMenu={(row, e) => {
                e.preventDefault()
                setSelectedKey(row.key)
                const raw = row.loai === 'thu' ? { loai: 'thu' as const, id: row.r.id, r: row.r as ThuTienBangRecord } : { loai: 'chi' as const, id: row.r.id, r: row.r as ChiTienBangRecord }
                setContextMenu({ open: true, x: e.clientX, y: e.clientY, row: raw })
              }}
              summary={
                filtered.length > 0
                  ? [
                      { label: 'Tổng thu', value: formatNumberDisplay(tongThu, 0) },
                      { label: 'Tổng chi', value: formatNumberDisplay(tongChi, 0) },
                    ]
                  : []
              }
            />
          </div>
          <Pagination page={page} total={totalPages} onChange={setPage} />
        </div>

        <div className={styles.detailWrap}>
          <div className={styles.detailTabBar}>
            <button type="button" className={styles.detailTabActive}>
              Chi tiết phiếu
            </button>
          </div>
          <div className={styles.detailTabPanel}>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <DataGrid<ThuTienBangChiTiet | ChiTienBangChiTiet>
                columns={columnsChiTietUnified}
                data={chiTietRows}
                keyField="id"
                stripedRows
                compact
                height="100%"
              />
            </div>
            {chiTietFooter && (
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
                <span>
                  Tổng ({selected?.loai === 'chi' ? 'chi' : 'thu'} phiếu): <strong>{chiTietFooter}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {contextMenu.open && contextMenu.row && (
        <div className={styles.contextMenu} style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={styles.contextMenuItem}
            onClick={() => {
              moFormXem(contextMenu.row!)
              setContextMenu((m) => ({ ...m, open: false }))
            }}
          >
            <Eye size={13} /> Xem
          </button>
        </div>
      )}

      {showFormThu && formRecordThu && (
        <div className={styles.modalOverlay}>
          <div
            ref={dragThu.containerRef}
            className={styles.modalBox}
            style={dragThu.containerStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <ThuTienForm
              key={`thu-${formKey}`}
              formTitle="Phiếu thu tiền"
              thuTienPhieu
              soDonLabel="Mã phiếu thu"
              readOnly
              initialDon={formRecordThu}
              initialChiTiet={thuTienBangGetChiTiet(formRecordThu.id)}
              onClose={() => { setShowFormThu(false); setFormRecordThu(null) }}
              onSaved={() => { setShowFormThu(false); setFormRecordThu(null); loadData() }}
              onHeaderPointerDown={dragThu.dragHandleProps.onMouseDown}
              headerDragStyle={dragThu.dragHandleProps.style}
            />
          </div>
        </div>
      )}

      {showFormChi && formRecordChi && (
        <div className={styles.modalOverlay}>
          <div
            ref={dragChi.containerRef}
            className={styles.modalBox}
            style={dragChi.containerStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <ChiTienForm
              key={`chi-${formKey}`}
              formTitle="Phiếu chi tiền"
              chiTienPhieu
              soDonLabel="Mã phiếu chi"
              readOnly
              initialDon={formRecordChi}
              initialChiTiet={chiTienBangGetChiTiet(formRecordChi.id)}
              onClose={() => { setShowFormChi(false); setFormRecordChi(null) }}
              onSaved={() => { setShowFormChi(false); setFormRecordChi(null); loadData() }}
              onHeaderPointerDown={dragChi.dragHandleProps.onMouseDown}
              headerDragStyle={dragChi.dragHandleProps.style}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/** Export dùng nội bộ: bọc Provider ở `thuChiTien` / `soTienMat` / `soNganHang`. */
export function PhieuThuChiHopNhatBang({ variant }: { variant: PhieuHopNhatVariant }) {
  return (
    <ThuTienBangApiProvider api={thuTienBangApiImpl}>
      <ChiTienBangApiProvider api={ChiTienBangApiImpl}>
        <PhieuThuChiHopNhatInner variant={variant} />
      </ChiTienBangApiProvider>
    </ThuTienBangApiProvider>
  )
}
