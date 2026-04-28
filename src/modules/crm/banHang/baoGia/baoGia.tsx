/**
 * Danh sách Báo giá — YC23: Tách file, chỉ giữ logic List
 * Form được tách sang baoGiaForm.tsx
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { htqlEntityStorage } from '@/utils/htqlEntityStorage'
import {
  Plus, Trash2, Eye, Mail, MessageCircle, ChevronDown,
  ChevronLeft, ChevronRight, FileText, Search,
} from 'lucide-react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { vi } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import { DataGrid, type DataGridColumn, type DataGridSortState } from '../../../../components/common/dataGrid'
import { Modal } from '../../../../components/common/modal'
import { useToastOptional } from '../../../../context/toastContext'
import { matchSearchKeyword } from '../../../../utils/stringUtils'
import { formatNumberDisplay, formatSoThapPhan } from '../../../../utils/numberFormat'
import { htqlDatePickerPopperTop } from '../../../../constants/datePickerPlacement'
import { DatePickerCustomHeader } from '../../../../components/datePickerCustomHeader'

import {
  baoGiaGetAll,
  baoGiaGetChiTiet,
  baoGiaDelete,
  getDefaultBaoGiaFilter,
  getDateRangeForKy,
  KY_OPTIONS,
  type BaoGiaRecord,
  type BaoGiaChiTiet,
  type BaoGiaKyValue,
  type BaoGiaFilter,
  baoGiaPost,
  baoGiaPut,
  baoGiaBiKhoaChinhSuaTheoTinhTrang,
  getBaoGiaDraft,
  setBaoGiaDraft,
  clearBaoGiaDraft,
  baoGiaSoDonHangTiepTheo,
  baoGiaCapNhatTuMenuTaoGd,
  TINH_TRANG_BG_DA_CHUYEN_DHB,
  TINH_TRANG_BG_DA_CHUYEN_HD,
  TINH_TRANG_BG_KH_KHONG_DONG_Y,
  TINH_TRANG_BG_MOI_TAO,
  HTQL_BAO_GIA_RELOAD_EVENT,
  baoGiaBuildCreatePayloadFromRecord,
  baoGiaFetchBundleAndApply,
  BAO_GIA_BUNDLE_QUERY_KEY,
} from './baoGiaApi'
import { donViTinhGetAll } from '../../../kho/donViTinhApi'
import { dvtHienThiLabel, type DvtListItem } from '../../../../utils/dvtHienThiLabel'
import { ConfirmXoaCaptchaModal } from '../../../../components/common/confirmXoaCaptchaModal'
import { BaoGiaApiProvider, type BaoGiaApi } from './baoGiaApiContext'
import { BaoGiaForm } from './baoGiaForm'
import { DonHangBanForm } from '../donHangBan/donHangBanForm'
import { DonHangBanChungTuApiProvider } from '../donHangBan/donHangBanChungTuApiContext'
import {
  donHangBanChungTuApiImpl,
  donHangBanDelete,
  donHangBanGetAll,
  donHangBanGetChiTiet,
  donHangBanSoDonHangTiepTheo,
  donHangBanReloadFromStorage,
} from '../donHangBan/donHangBanChungTuApi'
import { buildDonHangBanChungTuPrefillFromBaoGia } from '../donHangBan/baoGiaToDonHangBanChungTuPrefill'
import { HopDongBanChungTuApiProvider } from '../hopDongBan/hopDongBanChungTuApiContext'
import {
  hopDongBanChungTuApiImpl,
  hopDongBanChungTuDelete,
  hopDongBanChungTuGetAll,
  hopDongBanChungTuGetChiTiet,
  hopDongBanSoHopDongTiepTheo,
  hopDongBanChungTuReloadFromStorage,
} from '../hopDongBan/hopDongBanChungTuApi'
import { buildHopDongBanChungTuPrefillFromBaoGia } from '../hopDongBan/baoGiaToHopDongBanChungTuPrefill'
import { HopDongBanForm } from '../hopDongBan/hopDongBanForm'
import type { DonHangBanChungTuChiTiet, DonHangBanChungTuRecord } from '../../../../types/donHangBanChungTu'
import type { HopDongBanChungTuChiTiet, HopDongBanChungTuRecord } from '../../../../types/hopDongBanChungTu'
import styles from '../BanHang.module.css'
import {
  HTQL_DON_HANG_BAN_LIST_REFRESH_EVENT,
  HTQL_HOP_DONG_BAN_LIST_REFRESH_EVENT,
  HTQL_PHU_LUC_HOP_DONG_BAN_LIST_REFRESH_EVENT,
} from '../banHangTabEvent'
import { useDraggable } from '../../../../hooks/useDraggable'
import { parseTrailingIntFromMa } from '../../../../utils/parseMaChungTuSuffix'
import { KV_POLL_INTERVAL_MS } from '../../../../utils/htqlKvSync'

registerLocale('vi', vi)

/** Khớp `htql_phu_luc_hop_dong_ban_chung_tu_list` (cùng key trong baoGiaApi). */
const LS_PHU_LUC_HDB_CT = 'htql_phu_luc_hop_dong_ban_chung_tu_list'

function baoGiaCoPhuLucHopDongLienKet(baoGiaId: string): boolean {
  const id = baoGiaId.trim()
  if (!id || typeof htqlEntityStorage === 'undefined') return false
  try {
    const raw = htqlEntityStorage.getItem(LS_PHU_LUC_HDB_CT)
    if (!raw) return false
    const arr = JSON.parse(raw) as { bao_gia_id?: string }[]
    return Array.isArray(arr) && arr.some((d) => (d.bao_gia_id ?? '').trim() === id)
  } catch {
    return false
  }
}

function baoGiaIdsCoPhuLucHopDongLienKet(): Set<string> {
  const out = new Set<string>()
  if (typeof htqlEntityStorage === 'undefined') return out
  try {
    const raw = htqlEntityStorage.getItem(LS_PHU_LUC_HDB_CT)
    if (!raw) return out
    const arr = JSON.parse(raw) as { bao_gia_id?: string }[]
    if (!Array.isArray(arr)) return out
    arr.forEach((row) => {
      const id = (row.bao_gia_id ?? '').trim()
      if (id) out.add(id)
    })
  } catch {
    return out
  }
  return out
}

/**
 * Sửa «Đã chuyển ĐHB/HĐ» khi không còn chứng từ gắn `bao_gia_id` (hoặc đổi cho khớp khi chỉ còn ĐHB hoặc chỉ còn HĐ/phụ lục).
 * Tránh hiển thị đã chuyển trong khi cột Giao dịch trống.
 */
function baoGiaDamBaoTinhTrangTheoLienKetDonHangHopDong(): void {
  const filterTatCa = { ky: 'tat-ca' as const, tu: '', den: '' }
  donHangBanReloadFromStorage()
  hopDongBanChungTuReloadFromStorage()

  const allDhb = donHangBanGetAll(filterTatCa)
  const allHdb = hopDongBanChungTuGetAll(filterTatCa)
  const bgCoDhb = new Set<string>()
  for (const d of allDhb) {
    const bid = (d.bao_gia_id ?? '').trim()
    if (bid) bgCoDhb.add(bid)
  }

  const allBg = baoGiaGetAll(filterTatCa)
  for (const row of allBg) {
    const t = (row.tinh_trang ?? '').trim()
    const id = row.id
    const hasD = bgCoDhb.has(id)
    const hasH =
      allHdb.some((h) => (h.bao_gia_id ?? '').trim() === id) || baoGiaCoPhuLucHopDongLienKet(id)

    let nextT: string | null = null
    if (t === TINH_TRANG_BG_DA_CHUYEN_DHB) {
      if (hasD) continue
      nextT = hasH ? TINH_TRANG_BG_DA_CHUYEN_HD : TINH_TRANG_BG_MOI_TAO
    } else if (t === TINH_TRANG_BG_DA_CHUYEN_HD) {
      if (hasH) continue
      nextT = hasD ? TINH_TRANG_BG_DA_CHUYEN_DHB : TINH_TRANG_BG_MOI_TAO
    } else if (t !== TINH_TRANG_BG_KH_KHONG_DONG_Y) {
      if (hasH) nextT = TINH_TRANG_BG_DA_CHUYEN_HD
      else if (hasD) nextT = TINH_TRANG_BG_DA_CHUYEN_DHB
      else continue
    } else {
      continue
    }

    const ct = baoGiaGetChiTiet(id)
    void baoGiaPut(id, { ...baoGiaBuildCreatePayloadFromRecord(row, ct), tinh_trang: nextT }).catch(() => {
      /* đồng bộ nền — lỗi ghi CSDL không chặn vòng lặp */
    })
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
function BaoGiaBadge({ value }: { value: string }) {
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

/** Hiệu lực đến: chỉ ngày (dd/mm/yyyy), bỏ giờ (YC51). */
function formatHieuLucDen(iso: string | null | undefined): string {
  if (!iso || !String(iso).trim()) return ''
  const s = String(iso).trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    const day = d.getDate()
    const mo = d.getMonth() + 1
    const y = d.getFullYear()
    return `${String(day).padStart(2, '0')}/${String(mo).padStart(2, '0')}/${y}`
  }
  return formatNgay(s)
}

function baoGiaDaChonTaoGd(row: BaoGiaRecord): boolean {
  const t = (row.tinh_trang ?? '').trim()
  return t === TINH_TRANG_BG_DA_CHUYEN_DHB || t === TINH_TRANG_BG_DA_CHUYEN_HD || t === TINH_TRANG_BG_KH_KHONG_DONG_Y
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

// ─── API instance cho Provider ──────────────────────────────────────────────
const apiBaoGia: BaoGiaApi = {
  getAll: baoGiaGetAll,
  getChiTiet: baoGiaGetChiTiet,
  delete: baoGiaDelete,
  getDefaultFilter: getDefaultBaoGiaFilter,
  getDateRangeForKy: getDateRangeForKy,
  KY_OPTIONS: KY_OPTIONS,
  post: baoGiaPost,
  put: baoGiaPut,
  soDonHangTiepTheo: baoGiaSoDonHangTiepTheo,
  getDraft: getBaoGiaDraft,
  setDraft: setBaoGiaDraft,
  clearDraft: clearBaoGiaDraft,
}

// ─── Màn hình danh sách Báo giá (Content) ────────────────────────────────────
function BaoGiaContent({ onNavigate: _onNavigate }: { onNavigate?: (tab: string) => void }) {
  const baoGiaBundleQ = useQuery({
    queryKey: BAO_GIA_BUNDLE_QUERY_KEY,
    queryFn: baoGiaFetchBundleAndApply,
    refetchInterval: KV_POLL_INTERVAL_MS,
  })
  const toast = useToastOptional()
  const [filter,      setFilter]      = useState<BaoGiaFilter>(getDefaultBaoGiaFilter)
  const [danhSach,    setDanhSach]    = useState<BaoGiaRecord[]>([])
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [chiTiet,     setChiTiet]     = useState<BaoGiaChiTiet[]>([])
  const [search,      setSearch]      = useState('')
  const [showForm,    setShowForm]    = useState(false)
  const [formMode,    setFormMode]    = useState<'add' | 'edit' | 'view'>('add')
  const [formRecord,  setFormRecord]  = useState<BaoGiaRecord | null>(null)
  const [xoaModalRow, setXoaModalRow] = useState<BaoGiaRecord | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    open: boolean; x: number; y: number; row: BaoGiaRecord | null
  }>({ open: false, x: 0, y: 0, row: null })
  const [formKey,      setFormKey]      = useState(0)
  const [dropdownGui, setDropdownGui] = useState(false)
  const [dropdownTaoGd, setDropdownTaoGd] = useState(false)
  const dropdownGuiRef = useRef<HTMLDivElement>(null)
  const dropdownTaoGdRef = useRef<HTMLDivElement>(null)
  const hoverTaoGdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverGuiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverCtxSubTaoGdRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const baoGiaFormDrag = useDraggable()
  const [ctxSubmenuTaoGd, setCtxSubmenuTaoGd] = useState(false)
  const [page, setPage] = useState(1)
  const [showDonHangTuBaoGia, setShowDonHangTuBaoGia] = useState(false)
  const [donHangTuBaoGiaKey, setDonHangTuBaoGiaKey] = useState(0)
  const [donHangTuBaoGiaPrefill, setDonHangTuBaoGiaPrefill] = useState<{
    prefillDhb: Partial<DonHangBanChungTuRecord>
    prefillChiTiet: DonHangBanChungTuChiTiet[]
  } | null>(null)
  const [showHopDongTuBaoGia, setShowHopDongTuBaoGia] = useState(false)
  const [hopDongTuBaoGiaKey, setHopDongTuBaoGiaKey] = useState(0)
  const [hopDongTuBaoGiaPrefill, setHopDongTuBaoGiaPrefill] = useState<{
    prefillHdbCt: Partial<HopDongBanChungTuRecord>
    prefillChiTiet: HopDongBanChungTuChiTiet[]
  } | null>(null)
  const [dvtList, setDvtList] = useState<DvtListItem[]>([])
  const [modalLyDoKhKhongDongY, setModalLyDoKhKhongDongY] = useState<BaoGiaRecord | null>(null)
  const [lyDoKhInput, setLyDoKhInput] = useState('')
  const [modalPhucHoiBg, setModalPhucHoiBg] = useState<BaoGiaRecord | null>(null)
  /** Chỉ cập nhật trạng thái BG «Đã chuyển ĐHB/HĐ» sau khi lưu thành công; đóng form không lưu → bỏ qua (YC51). */
  const pendingCapNhatBaoGiaDhbRef = useRef<string | null>(null)
  const pendingCapNhatBaoGiaHdbRef = useRef<string | null>(null)
  const [giaoDichEpoch, setGiaoDichEpoch] = useState(0)
  const [xemDhbTuBang, setXemDhbTuBang] = useState<DonHangBanChungTuRecord | null>(null)
  const [xemHdbTuBang, setXemHdbTuBang] = useState<HopDongBanChungTuRecord | null>(null)
  const [xemDhbKeyTuBang, setXemDhbKeyTuBang] = useState(0)
  const [xemHdbKeyTuBang, setXemHdbKeyTuBang] = useState(0)
  const [listSortState, setListSortState] = useState<DataGridSortState[]>([])
  const [tinhTrangFilterSelected, setTinhTrangFilterSelected] = useState<string[]>([])

  useEffect(() => {
    let c = false
    donViTinhGetAll().then((list) => {
      if (c || !Array.isArray(list)) return
      setDvtList(list)
    })
    return () => { c = true }
  }, [])

  const refreshLocalDanhSach = useCallback(() => {
    baoGiaDamBaoTinhTrangTheoLienKetDonHangHopDong()
    setDanhSach(baoGiaGetAll(filter))
  }, [filter, giaoDichEpoch])

  const loadData = useCallback(() => {
    refreshLocalDanhSach()
  }, [refreshLocalDanhSach])

  useEffect(() => {
    if (!baoGiaBundleQ.isSuccess) return
    refreshLocalDanhSach()
  }, [baoGiaBundleQ.isSuccess, baoGiaBundleQ.dataUpdatedAt, giaoDichEpoch, refreshLocalDanhSach])
  useEffect(() => {
    const sync = () => loadData()
    window.addEventListener(HTQL_BAO_GIA_RELOAD_EVENT, sync)
    return () => window.removeEventListener(HTQL_BAO_GIA_RELOAD_EVENT, sync)
  }, [loadData])
  useEffect(() => {
    const bump = () => setGiaoDichEpoch((e) => e + 1)
    window.addEventListener(HTQL_DON_HANG_BAN_LIST_REFRESH_EVENT, bump)
    window.addEventListener(HTQL_HOP_DONG_BAN_LIST_REFRESH_EVENT, bump)
    window.addEventListener(HTQL_PHU_LUC_HOP_DONG_BAN_LIST_REFRESH_EVENT, bump)
    return () => {
      window.removeEventListener(HTQL_DON_HANG_BAN_LIST_REFRESH_EVENT, bump)
      window.removeEventListener(HTQL_HOP_DONG_BAN_LIST_REFRESH_EVENT, bump)
      window.removeEventListener(HTQL_PHU_LUC_HOP_DONG_BAN_LIST_REFRESH_EVENT, bump)
    }
  }, [])
  useEffect(() => {
    if (!contextMenu.open) setCtxSubmenuTaoGd(false)
  }, [contextMenu.open])
  useEffect(() => {
    if (selectedId) setChiTiet(baoGiaGetChiTiet(selectedId))
    else setChiTiet([])
  }, [selectedId])

  const filtered = useMemo(() => {
    let result = danhSach
    if (search.trim()) {
      result = result.filter((r) =>
        matchSearchKeyword(
          `${r.so_bao_gia} ${r.so_chung_tu_cukcuk ?? ''} ${r.khach_hang} ${r.dien_giai ?? ''} ${r.tinh_trang}`,
          search,
        )
      )
    }
    return result
  }, [danhSach, search])

  const tinhTrangOptions = useMemo(() => {
    const set = new Set<string>()
    for (const r of filtered) {
      const t = (r.tinh_trang ?? '').trim()
      set.add(t || '(Trống)')
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'))
  }, [filtered])

  const filteredByTinhTrang = useMemo(() => {
    if (tinhTrangFilterSelected.length === 0) return filtered
    if (tinhTrangOptions.length > 0 && tinhTrangFilterSelected.length >= tinhTrangOptions.length) return filtered
    return filtered.filter((r) => {
      const t = (r.tinh_trang ?? '').trim() || '(Trống)'
      return tinhTrangFilterSelected.includes(t)
    })
  }, [filtered, tinhTrangFilterSelected, tinhTrangOptions])

  const sortedList = useMemo(() => {
    const sort = listSortState.find((s) => s.key === 'so_bao_gia')
    const arr = [...filteredByTinhTrang]
    if (!sort) return arr
    arr.sort((a, b) => {
      const na = parseTrailingIntFromMa(a.so_bao_gia)
      const nb = parseTrailingIntFromMa(b.so_bao_gia)
      const c = na - nb
      return sort.direction === 'asc' ? c : -c
    })
    return arr
  }, [filteredByTinhTrang, listSortState])

  useEffect(() => { setPage(1) }, [filter, search, tinhTrangFilterSelected, listSortState])

  const totalPages = Math.max(1, Math.ceil(sortedList.length / PAGE_SIZE))
  const paginated = useMemo(
    () => sortedList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sortedList, page],
  )

  const baoGiaTinhTrangColumnFilter = useMemo(
    () => ({
      tinh_trang: {
        options: tinhTrangOptions,
        selected: tinhTrangFilterSelected,
        onChange: setTinhTrangFilterSelected,
      },
    }),
    [tinhTrangOptions, tinhTrangFilterSelected],
  )

  const coLocTinhTrangHieuLuc =
    tinhTrangOptions.length > 0 &&
    tinhTrangFilterSelected.length > 0 &&
    tinhTrangFilterSelected.length < tinhTrangOptions.length

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownGuiRef.current && !dropdownGuiRef.current.contains(e.target as Node)) setDropdownGui(false)
      if (dropdownTaoGdRef.current && !dropdownTaoGdRef.current.contains(e.target as Node)) setDropdownTaoGd(false)
      setContextMenu((m) => m.open ? { ...m, open: false } : m)
    }
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [])

  const tongTien = useMemo(() => filteredByTinhTrang.reduce((s, r) => s + r.tong_thanh_toan, 0), [filteredByTinhTrang])
  const selectedRow = useMemo(() => selectedId ? danhSach.find((r) => r.id === selectedId) ?? null : null, [selectedId, danhSach])
  const baoGiaBiKhoaTheoLienKetIds = useMemo(() => {
    const ids = new Set<string>()
    const filterTatCa = { ky: 'tat-ca' as const, tu: '', den: '' }
    donHangBanGetAll(filterTatCa).forEach((d) => {
      const id = (d.bao_gia_id ?? '').trim()
      if (id) ids.add(id)
    })
    hopDongBanChungTuGetAll(filterTatCa).forEach((h) => {
      const id = (h.bao_gia_id ?? '').trim()
      if (id) ids.add(id)
    })
    baoGiaIdsCoPhuLucHopDongLienKet().forEach((id) => ids.add(id))
    return ids
  }, [giaoDichEpoch, danhSach.length])
  const baoGiaBiKhoaChinhSuaTheoLienKet = useCallback(
    (row: BaoGiaRecord | null | undefined) => {
      if (!row) return false
      return baoGiaBiKhoaTheoLienKetIds.has(row.id)
    },
    [baoGiaBiKhoaTheoLienKetIds],
  )
  const baoGiaBiKhoaThaoTac = useCallback(
    (row: BaoGiaRecord | null | undefined) => {
      if (!row) return true
      return (
        baoGiaBiKhoaChinhSuaTheoTinhTrang(row.tinh_trang ?? '') ||
        baoGiaBiKhoaChinhSuaTheoLienKet(row)
      )
    },
    [baoGiaBiKhoaChinhSuaTheoLienKet],
  )

  const columnsBaoGiaList = useMemo((): DataGridColumn<BaoGiaRecord>[] => {
    void giaoDichEpoch
    const allD = donHangBanGetAll({ ky: 'tat-ca', tu: '', den: '' })
    const allH = hopDongBanChungTuGetAll({ ky: 'tat-ca', tu: '', den: '' })
    const byBg = new Map<string, { d: DonHangBanChungTuRecord[]; h: HopDongBanChungTuRecord[] }>()
    for (const d of allD) {
      const bid = (d.bao_gia_id ?? '').trim()
      if (!bid) continue
      if (!byBg.has(bid)) byBg.set(bid, { d: [], h: [] })
      byBg.get(bid)!.d.push(d)
    }
    for (const h of allH) {
      const bid = (h.bao_gia_id ?? '').trim()
      if (!bid) continue
      if (!byBg.has(bid)) byBg.set(bid, { d: [], h: [] })
      byBg.get(bid)!.h.push(h)
    }
    return [
      { key: 'so_bao_gia', label: 'Mã BG', width: 88, align: 'right' },
      { key: 'nv_ban_hang', label: 'NV bán hàng', width: '10%' },
      { key: 'so_chung_tu_cukcuk', label: 'Tên báo giá', width: 140, renderCell: (v) => (v != null && String(v).trim() ? String(v) : '') },
      { key: 'ngay_bao_gia', label: 'Ngày BG', width: 76, align: 'right', renderCell: (v) => formatNgay(v as string) },
      { key: 'ngay_giao_hang', label: 'Hiệu lực đến', width: 88, align: 'right', renderCell: (v) => formatHieuLucDen(v as string | null) },
      { key: 'khach_hang', label: 'Khách hàng', width: '20%' },
      { key: 'tong_thanh_toan', label: 'Tổng tiền', width: 110, align: 'right',
        renderCell: (v) => formatNumberDisplay(Number(v), 0) },
      {
        key: 'tinh_trang',
        label: 'Tình trạng',
        width: 118,
        filterable: true,
        renderCell: (v) => <BaoGiaBadge value={String(v)} />,
      },
      {
        key: 'giao_dich',
        label: 'Giao dịch',
        width: 128,
        renderCell: (_v, row) => {
          const g = byBg.get(row.id)
          if (!g || (g.d.length === 0 && g.h.length === 0)) return ''
          return (
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              {g.d.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={styles.linkMaChungTu}
                  onClick={(e) => {
                    e.stopPropagation()
                    setXemDhbTuBang(d)
                    setXemDhbKeyTuBang((k) => k + 1)
                  }}
                >
                  {d.so_don_hang}
                </button>
              ))}
              {g.h.map((hdb) => (
                <button
                  key={hdb.id}
                  type="button"
                  className={styles.linkMaChungTu}
                  onClick={(e) => {
                    e.stopPropagation()
                    setXemHdbTuBang(hdb)
                    setXemHdbKeyTuBang((k) => k + 1)
                  }}
                >
                  {hdb.so_hop_dong}
                </button>
              ))}
            </span>
          )
        },
      },
      { key: 'dien_giai', label: 'Ghi chú', width: '18%' },
    ]
  }, [giaoDichEpoch, danhSach])

  const chiTietHienThiCoVat = selectedRow == null || selectedRow.ap_dung_vat_gtgt !== false

  const columnsChiTiet = useMemo((): DataGridColumn<BaoGiaChiTiet>[] => {
    const coBan: DataGridColumn<BaoGiaChiTiet>[] = [
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
    const cotThue: DataGridColumn<BaoGiaChiTiet>[] = chiTietHienThiCoVat
      ? [
          { key: 'pt_thue_gtgt', label: '% Thuế GTGT', width: 70, align: 'right',
            renderCell: (v) => v != null ? formatNumberDisplay(Number(v), 0) : '' },
          { key: 'tien_thue_gtgt', label: 'Tiền thuế GTGT', width: 100, align: 'right',
            renderCell: (v) => v != null ? formatNumberDisplay(Math.round(Number(v)), 0) : '' },
        ]
      : []
    const cotTong: DataGridColumn<BaoGiaChiTiet> = {
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
    clearBaoGiaDraft()
    setFormRecord(null)
    setFormMode('add')
    setFormKey((k) => k + 1)
    setShowForm(true)
  }
  const moFormXem  = (row: BaoGiaRecord) => { setFormRecord(row); setFormMode('view'); setFormKey((k) => k + 1); setShowForm(true) }
  const moFormSua  = (row: BaoGiaRecord) => {
    if (baoGiaBiKhoaThaoTac(row)) {
      toast?.showToast('Báo giá đã liên kết chứng từ, không cho phép chỉnh sửa.', 'error')
      return
    }
    setFormRecord(row); setFormMode('edit'); setFormKey((k) => k + 1); setShowForm(true)
  }

  const xacNhanXoa = (row: BaoGiaRecord) => {
    if (baoGiaBiKhoaThaoTac(row)) {
      toast?.showToast('Báo giá đã liên kết chứng từ, không cho phép xóa.', 'error')
      setXoaModalRow(null)
      return
    }
    const filterTatCa = { ky: 'tat-ca' as const, tu: '', den: '' }
    for (const d of donHangBanGetAll(filterTatCa)) {
      if ((d.bao_gia_id ?? '').trim() === row.id) donHangBanDelete(d.id)
    }
    for (const h of hopDongBanChungTuGetAll(filterTatCa)) {
      if ((h.bao_gia_id ?? '').trim() === row.id) hopDongBanChungTuDelete(h.id)
    }
    void baoGiaDelete(row.id)
      .then(() => {
        loadData()
        if (selectedId === row.id) setSelectedId(null)
        toast?.showToast(`Đã xóa báo giá ${row.so_bao_gia}.`, 'info')
        setXoaModalRow(null)
      })
      .catch(() => {
        toast?.showToast('Không xóa được báo giá (lỗi ghi CSDL hoặc mạng).', 'error')
        setXoaModalRow(null)
      })
  }

  // [YC23 Mục 8] Lập đơn hàng từ báo giá (toolbar / menu ngữ cảnh)
  const lapDonHangTuBaoGia = (row: BaoGiaRecord) => {
    if (baoGiaDaChonTaoGd(row)) return
    pendingCapNhatBaoGiaDhbRef.current = row.id
    const ct = baoGiaGetChiTiet(row.id)
    const so = donHangBanSoDonHangTiepTheo()
    const { prefillDhb, prefillChiTiet } = buildDonHangBanChungTuPrefillFromBaoGia(row, ct, so)
    setDonHangTuBaoGiaPrefill({ prefillDhb, prefillChiTiet })
    setDonHangTuBaoGiaKey((k) => k + 1)
    setShowDonHangTuBaoGia(true)
    toast?.showToast(`Đã mở form đơn hàng bán từ ${row.so_bao_gia}.`, 'success')
  }

  /** Tạo nháp hợp đồng bán (chứng từ đầy đủ) — cập nhật trạng thái BG sau khi Lưu thành công. */
  const lapHopDongTuBaoGia = (row: BaoGiaRecord) => {
    if (baoGiaDaChonTaoGd(row)) return
    pendingCapNhatBaoGiaHdbRef.current = row.id
    const ct = baoGiaGetChiTiet(row.id)
    const so = hopDongBanSoHopDongTiepTheo()
    const { prefillHdbCt, prefillChiTiet } = buildHopDongBanChungTuPrefillFromBaoGia(row, ct, so)
    setHopDongTuBaoGiaPrefill({ prefillHdbCt, prefillChiTiet })
    setHopDongTuBaoGiaKey((k) => k + 1)
    setShowHopDongTuBaoGia(true)
    toast?.showToast(`Đã mở form hợp đồng bán từ ${row.so_bao_gia}.`, 'success')
  }

  return (
    <div className={styles.root}>
      {/* Toolbar danh sách */}
      <div className={styles.toolbarWrap}>
        <button type="button" className={styles.toolbarBtn} onClick={moFormThem}>
          <Plus size={13} /><span>Thêm</span>
        </button>
        <button
          type="button"
          className={styles.toolbarBtnDanger}
          disabled={!selectedRow || baoGiaBiKhoaThaoTac(selectedRow)}
          onClick={() => selectedRow && setXoaModalRow(selectedRow)}
        >
          <Trash2 size={13} /><span>Xóa</span>
        </button>
        <div ref={dropdownTaoGdRef} className={styles.dropdownWrap} style={{ marginLeft: 0 }}
          onMouseEnter={() => {
            if (!selectedId) return
            if (hoverTaoGdTimeoutRef.current) clearTimeout(hoverTaoGdTimeoutRef.current)
            hoverTaoGdTimeoutRef.current = setTimeout(() => setDropdownTaoGd(true), 200)
          }}
          onMouseLeave={() => {
            if (hoverTaoGdTimeoutRef.current) clearTimeout(hoverTaoGdTimeoutRef.current)
            hoverTaoGdTimeoutRef.current = setTimeout(() => setDropdownTaoGd(false), 200)
          }}>
          <button type="button" className={styles.toolbarBtn} disabled={!selectedId}
            onClick={() => setDropdownTaoGd((v) => !v)}>
            <FileText size={13} /><span>Tạo giao dịch</span><ChevronDown size={12} style={{ marginLeft: 2 }} />
          </button>
          {dropdownTaoGd && (
            <div className={styles.dropdownMenu}>
              <button type="button" className={styles.dropdownItem}
                disabled={!selectedRow || baoGiaDaChonTaoGd(selectedRow)}
                style={{ opacity: !selectedRow || baoGiaDaChonTaoGd(selectedRow) ? 0.45 : 1 }}
                onClick={() => {
                  if (selectedRow && !baoGiaDaChonTaoGd(selectedRow)) lapDonHangTuBaoGia(selectedRow)
                  setDropdownTaoGd(false)
                }}>
                <FileText size={13} /> Đơn hàng bán
              </button>
              <button type="button" className={styles.dropdownItem}
                disabled={!selectedRow || baoGiaDaChonTaoGd(selectedRow)}
                style={{ opacity: !selectedRow || baoGiaDaChonTaoGd(selectedRow) ? 0.45 : 1 }}
                onClick={() => {
                  if (selectedRow && !baoGiaDaChonTaoGd(selectedRow)) lapHopDongTuBaoGia(selectedRow)
                  setDropdownTaoGd(false)
                }}>
                <FileText size={13} /> Hợp đồng bán
              </button>
              <button type="button" className={styles.dropdownItem}
                disabled={!selectedRow || baoGiaDaChonTaoGd(selectedRow)}
                style={{ opacity: !selectedRow || baoGiaDaChonTaoGd(selectedRow) ? 0.45 : 1 }}
                onClick={() => {
                  if (selectedRow && !baoGiaDaChonTaoGd(selectedRow)) {
                    setLyDoKhInput('')
                    setModalLyDoKhKhongDongY(selectedRow)
                  }
                  setDropdownTaoGd(false)
                }}>
                <FileText size={13} /> KH không đồng ý
              </button>
              <button type="button" className={styles.dropdownItem}
                disabled={!selectedRow || (selectedRow.tinh_trang ?? '').trim() !== TINH_TRANG_BG_KH_KHONG_DONG_Y}
                style={{ opacity: !selectedRow || (selectedRow.tinh_trang ?? '').trim() !== TINH_TRANG_BG_KH_KHONG_DONG_Y ? 0.45 : 1 }}
                onClick={() => {
                  if (selectedRow && (selectedRow.tinh_trang ?? '').trim() === TINH_TRANG_BG_KH_KHONG_DONG_Y) {
                    setModalPhucHoiBg(selectedRow)
                  }
                  setDropdownTaoGd(false)
                }}>
                <FileText size={13} /> Phục hồi
              </button>
            </div>
          )}
        </div>
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
              const ky = e.target.value as BaoGiaKyValue
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
                const next: BaoGiaFilter = { ...f, ky: 'tat-ca', tu: iso }
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
                      const next: BaoGiaFilter = { ...f, ky: 'tat-ca', tu: iso }
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
                const next: BaoGiaFilter = { ...f, ky: 'tat-ca', den: iso }
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
                      const next: BaoGiaFilter = { ...f, ky: 'tat-ca', den: iso }
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
            placeholder="Tìm kiếm mã BG, tên báo giá, KH, ghi chú..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
          {sortedList.length} bản ghi · trang {page}/{totalPages}
        </span>
      </div>

      {/* Nội dung */}
      <div className={styles.contentArea}>
        <div className={styles.gridWrap} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <DataGrid<BaoGiaRecord>
              columns={columnsBaoGiaList}
              data={paginated}
              keyField="id"
              stripedRows compact height="100%"
              sortableColumns={['so_bao_gia']}
              sortState={listSortState}
              onSortChange={setListSortState}
              columnFilterConfig={baoGiaTinhTrangColumnFilter}
              emptyDueToFilter={sortedList.length === 0 && filtered.length > 0 && coLocTinhTrangHieuLuc}
              onClearAllFilters={() => setTinhTrangFilterSelected([])}
              selectedRowId={selectedId}
              onRowSelect={(r) => setSelectedId(r.id)}
              onRowDoubleClick={(r) => moFormXem(r)}
              onRowContextMenu={(row, e) => {
                e.preventDefault()
                setSelectedId(row.id)
                setContextMenu({ open: true, x: e.clientX, y: e.clientY, row })
              }}
              summary={sortedList.length > 0 ? [
                { label: 'Tổng báo giá', value: formatNumberDisplay(tongTien, 0) },
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
              <DataGrid<BaoGiaChiTiet>
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
          <button
            type="button"
            className={styles.contextMenuItem}
            disabled={baoGiaBiKhoaThaoTac(contextMenu.row!)}
            style={{
              opacity: baoGiaBiKhoaThaoTac(contextMenu.row!) ? 0.45 : 1,
              cursor: baoGiaBiKhoaThaoTac(contextMenu.row!) ? 'default' : 'pointer',
            }}
            onClick={() => {
              if (baoGiaBiKhoaThaoTac(contextMenu.row!)) return
              moFormSua(contextMenu.row!)
              setContextMenu((m) => ({ ...m, open: false }))
            }}
          >
            <Plus size={13} /> Sửa
          </button>
          <hr className={styles.contextMenuSep} />
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => {
              if (hoverCtxSubTaoGdRef.current) clearTimeout(hoverCtxSubTaoGdRef.current)
              hoverCtxSubTaoGdRef.current = setTimeout(() => setCtxSubmenuTaoGd(true), 200)
            }}
            onMouseLeave={() => {
              if (hoverCtxSubTaoGdRef.current) clearTimeout(hoverCtxSubTaoGdRef.current)
              hoverCtxSubTaoGdRef.current = setTimeout(() => setCtxSubmenuTaoGd(false), 200)
            }}
          >
            <div
              className={styles.contextMenuItem}
              style={{ cursor: 'default', justifyContent: 'space-between' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <FileText size={13} /> Tạo giao dịch
              </span>
              <ChevronRight size={12} style={{ flexShrink: 0, opacity: 0.85 }} />
            </div>
            {ctxSubmenuTaoGd && contextMenu.row && (
              <div
                style={{
                  position: 'absolute',
                  left: '100%',
                  top: 0,
                  marginLeft: 4,
                  minWidth: 188,
                  zIndex: 4101,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 4,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
                  padding: 4,
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className={styles.contextMenuItem}
                  disabled={baoGiaDaChonTaoGd(contextMenu.row)}
                  style={{ opacity: baoGiaDaChonTaoGd(contextMenu.row) ? 0.45 : 1 }}
                  onClick={() => {
                    if (baoGiaDaChonTaoGd(contextMenu.row!)) return
                    lapDonHangTuBaoGia(contextMenu.row!)
                    setCtxSubmenuTaoGd(false)
                    setContextMenu((m) => ({ ...m, open: false }))
                  }}
                >
                  <FileText size={13} /> Đơn hàng bán
                </button>
                <button
                  type="button"
                  className={styles.contextMenuItem}
                  disabled={baoGiaDaChonTaoGd(contextMenu.row)}
                  style={{ opacity: baoGiaDaChonTaoGd(contextMenu.row) ? 0.45 : 1 }}
                  onClick={() => {
                    if (baoGiaDaChonTaoGd(contextMenu.row!)) return
                    lapHopDongTuBaoGia(contextMenu.row!)
                    setCtxSubmenuTaoGd(false)
                    setContextMenu((m) => ({ ...m, open: false }))
                  }}
                >
                  <FileText size={13} /> Hợp đồng bán
                </button>
                <button
                  type="button"
                  className={styles.contextMenuItem}
                  disabled={baoGiaDaChonTaoGd(contextMenu.row)}
                  style={{ opacity: baoGiaDaChonTaoGd(contextMenu.row) ? 0.45 : 1 }}
                  onClick={() => {
                    if (baoGiaDaChonTaoGd(contextMenu.row!)) return
                    setLyDoKhInput('')
                    setModalLyDoKhKhongDongY(contextMenu.row!)
                    setCtxSubmenuTaoGd(false)
                    setContextMenu((m) => ({ ...m, open: false }))
                  }}
                >
                  <FileText size={13} /> KH không đồng ý
                </button>
                <button
                  type="button"
                  className={styles.contextMenuItem}
                  disabled={(contextMenu.row!.tinh_trang ?? '').trim() !== TINH_TRANG_BG_KH_KHONG_DONG_Y}
                  style={{
                    opacity: (contextMenu.row!.tinh_trang ?? '').trim() !== TINH_TRANG_BG_KH_KHONG_DONG_Y ? 0.45 : 1,
                  }}
                  onClick={() => {
                    if ((contextMenu.row!.tinh_trang ?? '').trim() !== TINH_TRANG_BG_KH_KHONG_DONG_Y) return
                    setModalPhucHoiBg(contextMenu.row!)
                    setCtxSubmenuTaoGd(false)
                    setContextMenu((m) => ({ ...m, open: false }))
                  }}
                >
                  <FileText size={13} /> Phục hồi
                </button>
              </div>
            )}
          </div>
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
          <button
            type="button"
            className={styles.contextMenuItem}
            style={{
              color: '#dc2626',
              opacity: baoGiaBiKhoaThaoTac(contextMenu.row!) ? 0.45 : 1,
              cursor: baoGiaBiKhoaThaoTac(contextMenu.row!) ? 'default' : 'pointer',
            }}
            disabled={baoGiaBiKhoaThaoTac(contextMenu.row!)}
            onClick={() => {
              if (baoGiaBiKhoaThaoTac(contextMenu.row!)) return
              setXoaModalRow(contextMenu.row!)
              setContextMenu((m) => ({ ...m, open: false }))
            }}
          >
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
              Xóa báo giá <strong>{xoaModalRow.so_bao_gia}</strong> — <strong>{xoaModalRow.khach_hang}</strong>?<br />
              <span style={{ color: '#dc2626' }}>Thao tác này không thể hoàn tác.</span>
            </>
          ) : null
        }
      />

      <Modal
        open={modalLyDoKhKhongDongY != null}
        onClose={() => setModalLyDoKhKhongDongY(null)}
        title="KH không đồng ý — lý do"
        size="md"
        footer={
          <>
            <button type="button" className={styles.modalBtn} onClick={() => setModalLyDoKhKhongDongY(null)}>
              Hủy bỏ
            </button>
            <button
              type="button"
              className={styles.modalBtnPrimary}
              onClick={() => {
                const r = modalLyDoKhKhongDongY
                if (!r) return
                const ly = lyDoKhInput.trim()
                if (!ly) {
                  toast?.showToast('Vui lòng nhập lý do.', 'error')
                  return
                }
                baoGiaCapNhatTuMenuTaoGd(r.id, { tinh_trang: TINH_TRANG_BG_KH_KHONG_DONG_Y, dien_giai: ly })
                loadData()
                setModalLyDoKhKhongDongY(null)
                toast?.showToast('Đã cập nhật: KH không đồng ý.', 'success')
              }}
            >
              Lưu
            </button>
          </>
        }
      >
        <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-secondary)' }}>
          Nội dung sẽ hiển thị ở cột Ghi chú trên danh sách báo giá.
        </p>
        <textarea
          value={lyDoKhInput}
          onChange={(e) => setLyDoKhInput(e.target.value)}
          rows={4}
          placeholder="Nhập lý do khách hàng không đồng ý…"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            fontSize: 12,
            padding: 8,
            borderRadius: 4,
            border: '1px solid var(--border)',
            resize: 'vertical',
            minHeight: 80,
          }}
        />
      </Modal>

      <Modal
        open={modalPhucHoiBg != null}
        onClose={() => setModalPhucHoiBg(null)}
        title="Xác nhận phục hồi"
        size="sm"
        footer={
          <>
            <button type="button" className={styles.modalBtn} onClick={() => setModalPhucHoiBg(null)}>
              Hủy bỏ
            </button>
            <button
              type="button"
              className={styles.modalBtnDanger}
              onClick={() => {
                const r = modalPhucHoiBg
                if (!r) return
                baoGiaCapNhatTuMenuTaoGd(r.id, { tinh_trang: TINH_TRANG_BG_MOI_TAO, dien_giai: '' })
                loadData()
                setModalPhucHoiBg(null)
                toast?.showToast('Đã phục hồi báo giá về trạng thái ban đầu.', 'success')
              }}
            >
              Đồng ý
            </button>
          </>
        }
      >
        {modalPhucHoiBg && (
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
            Phục hồi báo giá <strong>{modalPhucHoiBg.so_bao_gia}</strong> về trạng thái <strong>Mới tạo</strong> và xóa
            nội dung ghi chú (lý do không đồng ý)?
          </p>
        )}
      </Modal>

      {/* Modal form - maskClosable={false} */}
      {showForm && (
        <div className={styles.modalOverlay}>
          <div
            ref={baoGiaFormDrag.containerRef}
            className={styles.modalBoxLarge}
            style={{ ...baoGiaFormDrag.containerStyle, height: '90vh', width: 'min(99vw, 1580px)', maxWidth: 'min(99vw, 1580px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <BaoGiaForm
              key={formKey}
              readOnly={formMode === 'view'}
              initialDon={formMode === 'view' || formMode === 'edit' ? (formRecord ?? undefined) : null}
              initialChiTiet={formRecord ? baoGiaGetChiTiet(formRecord.id) : undefined}
              onHeaderPointerDown={baoGiaFormDrag.dragHandleProps.onMouseDown}
              headerDragStyle={baoGiaFormDrag.dragHandleProps.style}
              onClose={() => setShowForm(false)}
              onSaved={() => { setShowForm(false); loadData() }}
            />
          </div>
        </div>
      )}

      {showDonHangTuBaoGia && donHangTuBaoGiaPrefill && (
        <div className={styles.modalOverlay}>
          <div
            className={styles.modalBoxLarge}
            style={{ height: '90vh', width: 'min(99vw, 1580px)', maxWidth: 'min(99vw, 1580px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <DonHangBanChungTuApiProvider api={donHangBanChungTuApiImpl}>
              <DonHangBanForm
                key={donHangTuBaoGiaKey}
                readOnly={false}
                initialDhb={null}
                prefillDhb={donHangTuBaoGiaPrefill.prefillDhb}
                prefillChiTiet={donHangTuBaoGiaPrefill.prefillChiTiet}
                onClose={() => {
                  pendingCapNhatBaoGiaDhbRef.current = null
                  setShowDonHangTuBaoGia(false)
                  setDonHangTuBaoGiaPrefill(null)
                }}
                onSaved={() => {
                  const bgId = pendingCapNhatBaoGiaDhbRef.current
                  if (bgId) {
                    baoGiaCapNhatTuMenuTaoGd(bgId, { tinh_trang: TINH_TRANG_BG_DA_CHUYEN_DHB })
                    pendingCapNhatBaoGiaDhbRef.current = null
                    loadData()
                  }
                  toast?.showToast('Đã lưu đơn hàng bán.', 'success')
                  setShowDonHangTuBaoGia(false)
                  setDonHangTuBaoGiaPrefill(null)
                }}
              />
            </DonHangBanChungTuApiProvider>
          </div>
        </div>
      )}

      {showHopDongTuBaoGia && hopDongTuBaoGiaPrefill && (
        <div className={styles.modalOverlay}>
          <div
            className={styles.modalBoxLarge}
            style={{ height: '90vh', width: 'min(99vw, 1580px)', maxWidth: 'min(99vw, 1580px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <HopDongBanChungTuApiProvider api={hopDongBanChungTuApiImpl}>
              <HopDongBanForm
                key={hopDongTuBaoGiaKey}
                readOnly={false}
                initialHdbCt={null}
                prefillHdbCt={hopDongTuBaoGiaPrefill.prefillHdbCt}
                prefillChiTiet={hopDongTuBaoGiaPrefill.prefillChiTiet}
                onClose={() => {
                  pendingCapNhatBaoGiaHdbRef.current = null
                  setShowHopDongTuBaoGia(false)
                  setHopDongTuBaoGiaPrefill(null)
                }}
                onSaved={() => {
                  const bgId = pendingCapNhatBaoGiaHdbRef.current
                  if (bgId) {
                    baoGiaCapNhatTuMenuTaoGd(bgId, { tinh_trang: TINH_TRANG_BG_DA_CHUYEN_HD })
                    pendingCapNhatBaoGiaHdbRef.current = null
                    loadData()
                  }
                  toast?.showToast('Đã lưu hợp đồng bán.', 'success')
                  setShowHopDongTuBaoGia(false)
                  setHopDongTuBaoGiaPrefill(null)
                }}
              />
            </HopDongBanChungTuApiProvider>
          </div>
        </div>
      )}

      {xemDhbTuBang && (
        <div className={styles.modalOverlay}>
          <div
            className={styles.modalBoxLarge}
            style={{ height: '90vh', width: 'min(99vw, 1580px)', maxWidth: 'min(99vw, 1580px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <DonHangBanChungTuApiProvider api={donHangBanChungTuApiImpl}>
              <DonHangBanForm
                key={xemDhbKeyTuBang}
                readOnly
                initialDhb={xemDhbTuBang}
                initialChiTiet={donHangBanGetChiTiet(xemDhbTuBang.id)}
                onClose={() => setXemDhbTuBang(null)}
                onSaved={() => {
                  setXemDhbTuBang(null)
                  loadData()
                  setGiaoDichEpoch((e) => e + 1)
                }}
              />
            </DonHangBanChungTuApiProvider>
          </div>
        </div>
      )}
      {xemHdbTuBang && (
        <div className={styles.modalOverlay}>
          <div
            className={styles.modalBoxLarge}
            style={{ height: '90vh', width: 'min(99vw, 1580px)', maxWidth: 'min(99vw, 1580px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <HopDongBanChungTuApiProvider api={hopDongBanChungTuApiImpl}>
              <HopDongBanForm
                key={xemHdbKeyTuBang}
                readOnly
                initialHdbCt={xemHdbTuBang}
                initialChiTiet={hopDongBanChungTuGetChiTiet(xemHdbTuBang.id)}
                onClose={() => setXemHdbTuBang(null)}
                onSaved={() => {
                  setXemHdbTuBang(null)
                  loadData()
                  setGiaoDichEpoch((e) => e + 1)
                }}
              />
            </HopDongBanChungTuApiProvider>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Export chính với Provider wrapper ────────────────────────────────────────
export function BaoGia({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  return (
    <BaoGiaApiProvider api={apiBaoGia}>
      <BaoGiaContent onNavigate={onNavigate} />
    </BaoGiaApiProvider>
  )
}
