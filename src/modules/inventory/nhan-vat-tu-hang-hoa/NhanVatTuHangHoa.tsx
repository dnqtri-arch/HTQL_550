import React, { useState, useEffect, useRef, forwardRef } from 'react'
import {
  Plus,
  Download,
  ChevronDown,
  Eye,
  Trash2,
  Mail,
  MessageCircle,
  ChevronRight,
  ChevronLeft,
  ListChecks,
  RotateCcw,
  Package,
  FileText,
  Paperclip,
} from 'lucide-react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { vi } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import { DatePickerCustomHeader } from '../../../components/DatePickerCustomHeader'
import { htqlDatePickerPopperTop } from '../../../constants/datePickerPlacement'

registerLocale('vi', vi)
import { DataGrid, type DataGridColumn, type DataGridSortState } from '../../../components/common/DataGrid'
import {
  type NhanVatTuHangHoaRecord,
  type NhanVatTuHangHoaChiTiet,
  type NhanVatTuHangHoaFilter,
  KY_OPTIONS,
  nhanVatTuHangHoaGetAll,
  nhanVatTuHangHoaGetChiTiet,
  nhanVatTuHangHoaDelete,
  getDefaultNhanVatTuHangHoaFilter,
  getDateRangeForKy,
  nhanVatTuHangHoaPost,
  nhanVatTuHangHoaPut,
  getNhanVatTuHangHoaDraft,
  setNhanVatTuHangHoaDraft,
  clearNhanVatTuHangHoaDraft,
  nhanVatTuHangHoaSoDonHangTiepTheo,
  nhanVatTuHangHoaBuildCreatePayloadFromRecord,
  type KyValue,
} from './nhanVatTuHangHoaApi'
import type { DonHangMuaRecord, DonHangMuaChiTiet } from '../../purchase/don-hang-mua/donHangMuaApi'
import {
  donHangMuaGetAll,
  donHangMuaGetChiTiet,
  donHangMuaDelete,
  donHangMuaPost,
  donHangMuaPut,
  getDefaultDonHangMuaFilter,
  getDateRangeForKy as donHangMuaGetDateRangeForKy,
  KY_OPTIONS as DON_HANG_MUA_KY_OPTIONS,
  donHangMuaSoDonHangTiepTheo,
  getDonHangMuaDraft,
  setDonHangMuaDraft,
  clearDonHangMuaDraft,
  TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG,
} from '../../purchase/don-hang-mua/donHangMuaApi'
import type { DonHangMuaApi } from '../../purchase/don-hang-mua/DonHangMuaApiContext'
import { DonHangMuaApiProvider } from '../../purchase/don-hang-mua/DonHangMuaApiContext'
import { DonHangMuaForm } from '../../purchase/don-hang-mua/DonHangMuaForm'
import { HTQL_MUA_HANG_TAB_EVENT } from '../../purchase/mua-hang/muaHangTabEvent'
import {
  NhanVatTuHangHoaApiProvider,
  useNhanVatTuHangHoaApi,
  type NhanVatTuHangHoaApi,
} from './NhanVatTuHangHoaApiContext'
import { Modal } from '../../../components/common/Modal'
import { NhanVatTuHangHoaFormModal } from './NhanVatTuHangHoaFormModal'
import { buildPrefillDonHeaderTuDhm, type NhanVatTuHangHoaPrefillPayload } from './nhanVatTuHangHoaPrefill'
import { donViTinhGetAll } from '../kho/donViTinhApi'
import { formatNumberDisplay, formatSoThapPhan } from '../../../utils/numberFormat'
import { exportCsv } from '../../../utils/exportCsv'
import styles from './NhanVatTuHangHoa.module.css'
import {
  MuaHangXoaModalBody,
  MUA_HANG_MODAL_FOOTER_HUY,
  MUA_HANG_MODAL_FOOTER_DONG_Y,
  MUA_HANG_MODAL_TITLE_XOA,
} from '../../../components/MuaHangXoaModalBody'

function dvtHienThiLabel(
  value: string | null | undefined,
  dvtList: { ma_dvt: string; ten_dvt: string; ky_hieu?: string }[]
): string {
  if (value == null || value === '') return ''
  const v = String(value).trim()
  const d = dvtList.find((x) => x.ma_dvt === v || x.ten_dvt === v || (x.ky_hieu != null && x.ky_hieu === v))
  return d ? (d.ky_hieu || d.ten_dvt || d.ma_dvt) : v
}

function renderCellNhaCungCapLineClamp(v: unknown): React.ReactNode {
  const s = v != null ? String(v) : ''
  if (!s) return ''
  return (
    <span className="htql-grid-cell-ncc-line-clamp" title={s}>
      {s}
    </span>
  )
}

function renderCellTenVthhTooltip(v: unknown): React.ReactNode {
  const s = v != null ? String(v) : ''
  return <span title={s || undefined}>{s}</span>
}

function formatIsoToDdMmYyyy(iso: string | null): string {
  if (!iso) return ''
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${m[3]}/${m[2]}/${m[1]}`
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

const API_DHM_XEM: DonHangMuaApi = {
  getAll: donHangMuaGetAll,
  getChiTiet: donHangMuaGetChiTiet,
  delete: donHangMuaDelete,
  getDefaultFilter: getDefaultDonHangMuaFilter,
  getDateRangeForKy: donHangMuaGetDateRangeForKy,
  KY_OPTIONS: DON_HANG_MUA_KY_OPTIONS,
  post: donHangMuaPost,
  put: donHangMuaPut,
  soDonHangTiepTheo: donHangMuaSoDonHangTiepTheo,
  getDraft: getDonHangMuaDraft,
  setDraft: setDonHangMuaDraft,
  clearDraft: clearDonHangMuaDraft,
}

const apiNvthh: NhanVatTuHangHoaApi = {
  getAll: nhanVatTuHangHoaGetAll,
  getChiTiet: nhanVatTuHangHoaGetChiTiet,
  delete: nhanVatTuHangHoaDelete,
  getDefaultFilter: getDefaultNhanVatTuHangHoaFilter,
  getDateRangeForKy,
  KY_OPTIONS,
  post: nhanVatTuHangHoaPost,
  put: nhanVatTuHangHoaPut,
  soDonHangTiepTheo: nhanVatTuHangHoaSoDonHangTiepTheo,
  getDraft: getNhanVatTuHangHoaDraft,
  setDraft: setNhanVatTuHangHoaDraft,
  clearDraft: clearNhanVatTuHangHoaDraft,
}

type NhanVatTuHangHoaProps = {
  prefillTuDonHangMua?: { don: DonHangMuaRecord; chiTiet: DonHangMuaChiTiet[] } | null
  onConsumedPrefillTuDonHangMua?: () => void
  /** Mở form xem phiếu (vd. từ Đơn hàng mua — phiếu liên kết). */
  xemPhieuNhanHangId?: string | null
  onConsumedXemPhieuNhanHang?: () => void
}

function NhanVatTuHangHoaContent({
  prefillTuDonHangMua,
  onConsumedPrefillTuDonHangMua,
  xemPhieuNhanHangId,
  onConsumedXemPhieuNhanHang,
}: NhanVatTuHangHoaProps) {
  const api = useNhanVatTuHangHoaApi()
  const [filter, setFilter] = useState<NhanVatTuHangHoaFilter>(api.getDefaultFilter)
  const [danhSach, setDanhSach] = useState<NhanVatTuHangHoaRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chiTiet, setChiTiet] = useState<NhanVatTuHangHoaChiTiet[]>([])
  const [dropdownXuatKhau, setDropdownXuatKhau] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [viewDon, setViewDon] = useState<NhanVatTuHangHoaRecord | null>(null)
  const [addFormKey, setAddFormKey] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<NhanVatTuHangHoaRecord | null>(null)
  const [formPrefillTuDhm, setFormPrefillTuDhm] = useState<NhanVatTuHangHoaPrefillPayload | null>(null)
  const refXuatKhau = useRef<HTMLDivElement>(null)
  const [dvtList, setDvtList] = useState<{ ma_dvt: string; ten_dvt: string; ky_hieu?: string }[]>([])
  const [sortState, setSortState] = useState<DataGridSortState[]>([{ key: 'so_don_hang', direction: 'desc' }])
  const [tinhTrangFilterSelected, setTinhTrangFilterSelected] = useState<string[]>([])
  const [contextMenu, setContextMenu] = useState<{ open: boolean; x: number; y: number; row: NhanVatTuHangHoaRecord | null }>({ open: false, x: 0, y: 0, row: null })
  const [dhmXemModal, setDhmXemModal] = useState<DonHangMuaRecord | null>(null)
  const [thaoTacSubmenuOpen, setThaoTacSubmenuOpen] = useState(false)
  const thaoTacHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const thaoTacCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const SUBMENU_HOVER_DELAY_MS = 200
  const [phucHoiTargetNvthh, setPhucHoiTargetNvthh] = useState<NhanVatTuHangHoaRecord | null>(null)
  const [huyBoTargetNvthh, setHuyBoTargetNvthh] = useState<NhanVatTuHangHoaRecord | null>(null)

  const loadData = () => setDanhSach(api.getAll(filter))

  const timDonMuaTheoId = (id: string) => {
    const all = donHangMuaGetAll({ ...getDefaultDonHangMuaFilter(), tu: '', den: '' })
    return all.find((d) => d.id === id) ?? null
  }

  const columnsDon: DataGridColumn<NhanVatTuHangHoaRecord>[] = [
    { key: 'so_don_hang', label: 'Mã phiếu', width: 56 },
    { key: 'nha_cung_cap', label: 'Nhà cung cấp', width: '22%', renderCell: renderCellNhaCungCapLineClamp },
    { key: 'ngay_don_hang', label: 'Ngày nhận', width: 58, renderCell: (v) => formatIsoToDdMmYyyy(v as string) },
    { key: 'ngay_giao_hang', label: 'Ngày GH', width: 58, renderCell: (v) => formatIsoToDdMmYyyy(v as string | null) },
    { key: 'gia_tri_don_hang', label: 'Giá trị đơn hàng', width: 70, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
    { key: 'tinh_trang', label: 'Tình trạng', width: 78, filterable: true },
    {
      key: 'so_chung_tu_cukcuk',
      label: 'Liên quan',
      width: '18%',
      align: 'left',
      renderCell: (v, row) => {
        const text = v != null ? String(v) : ''
        const idLk = row.doi_chieu_don_mua_id?.trim()
        if (!idLk) return text ? <span title={text}>{text}</span> : ''
        return (
          <span
            className={styles.lienQuanDhmLink}
            title={text ? `Xem đơn mua hàng — ${text}` : 'Xem đơn mua hàng'}
            role="link"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              const rec = timDonMuaTheoId(idLk)
              if (rec) setDhmXemModal(rec)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                const rec = timDonMuaTheoId(idLk)
                if (rec) setDhmXemModal(rec)
              }
            }}
          >
            {text || '—'}
          </span>
        )
      },
    },
    { key: 'dien_giai', label: 'Ghi chú', width: '12%' },
  ]

  const columnsChiTiet: DataGridColumn<NhanVatTuHangHoaChiTiet>[] = [
    { key: 'stt' as keyof NhanVatTuHangHoaChiTiet, label: 'STT', width: 36, align: 'center', renderCell: (_v, _r, idx) => idx != null ? String(idx + 1) : '' },
    { key: 'ma_hang', label: 'Mã VTHH', width: 72 },
    { key: 'ten_hang', label: 'Tên VTHH', width: 220, renderCell: renderCellTenVthhTooltip },
    { key: 'dvt', label: 'ĐVT', width: 48, renderCell: (v) => dvtHienThiLabel(v as string, dvtList) },
    { key: 'so_luong', label: 'Số lượng', width: 68, align: 'right', renderCell: (v) => formatSoThapPhan(Number(v), 2) },
    { key: 'don_gia', label: 'ĐG mua', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
    { key: 'thanh_tien', label: 'Thành tiền', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
    { key: 'pt_thue_gtgt', label: '% thuế GTGT', width: 90, align: 'right', renderCell: (v) => v != null ? formatSoThapPhan(Number(v), 0) : '' },
    { key: 'tien_thue_gtgt', label: 'Tiền thuế GTGT', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v ?? 0), 0) },
    { key: 'tong_tien' as keyof NhanVatTuHangHoaChiTiet, label: 'Tổng tiền', width: 100, align: 'right', renderCell: (_v, row) => formatNumberDisplay((row.thanh_tien ?? 0) + (row.tien_thue_gtgt ?? 0), 0) },
    { key: 'ghi_chu', label: 'Ghi chú', width: 260 },
  ]

  useEffect(() => {
    donViTinhGetAll().then(setDvtList)
  }, [])

  useEffect(() => {
    setDanhSach(api.getAll(filter))
  }, [filter, api])

  useEffect(() => {
    if (selectedId) setChiTiet(api.getChiTiet(selectedId))
    else setChiTiet([])
  }, [selectedId, api])

  const consumePrefillRef = useRef(onConsumedPrefillTuDonHangMua)
  consumePrefillRef.current = onConsumedPrefillTuDonHangMua

  useEffect(() => {
    if (!prefillTuDonHangMua) return
    api.clearDraft()
    setViewDon(null)
    setFormPrefillTuDhm({
      don: buildPrefillDonHeaderTuDhm(prefillTuDonHangMua.don),
      chiTiet: prefillTuDonHangMua.chiTiet,
    })
    setAddFormKey((k) => k + 1)
    setShowForm(true)
    consumePrefillRef.current?.()
  }, [prefillTuDonHangMua])

  useEffect(() => {
    const id = xemPhieuNhanHangId?.trim()
    if (!id) return
    const all = api.getAll({ ...getDefaultNhanVatTuHangHoaFilter(), tu: '', den: '' })
    const row = all.find((r) => r.id === id)
    if (row) {
      setFormPrefillTuDhm(null)
      setViewDon(row)
      setShowForm(true)
    }
    onConsumedXemPhieuNhanHang?.()
  }, [xemPhieuNhanHangId, api, onConsumedXemPhieuNhanHang])

  useEffect(() => {
    if (!refXuatKhau.current) return
    const h = (e: MouseEvent) => {
      if (refXuatKhau.current && !refXuatKhau.current.contains(e.target as Node)) setDropdownXuatKhau(false)
    }
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [])

  useEffect(() => {
    const onClick = () => setContextMenu((m) => (m.open ? { ...m, open: false, row: null } : m))
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [])

  useEffect(() => {
    if (!contextMenu.open) {
      if (thaoTacHoverTimeoutRef.current) {
        clearTimeout(thaoTacHoverTimeoutRef.current)
        thaoTacHoverTimeoutRef.current = null
      }
      if (thaoTacCloseTimeoutRef.current) {
        clearTimeout(thaoTacCloseTimeoutRef.current)
        thaoTacCloseTimeoutRef.current = null
      }
      setThaoTacSubmenuOpen(false)
    }
  }, [contextMenu.open])

  const thaoTacSubmenuOnLeft = contextMenu.open && (contextMenu.x + 180 + 2 + 180) > (typeof window !== 'undefined' ? window.innerWidth - 16 : 9999)

  const onKyChange = (ky: KyValue) => {
    const { tu, den } = api.getDateRangeForKy(ky)
    setFilter((f) => ({ ...f, ky, tu, den }))
  }

  const sortedDanhSach = [...danhSach].sort((a, b) => {
    const effectiveSort = sortState?.length ? sortState : [{ key: 'so_don_hang', direction: 'desc' } as DataGridSortState]
    for (const s of effectiveSort) {
      const key = s.key as keyof NhanVatTuHangHoaRecord
      const va = a[key]
      const vb = b[key]
      if (va == null && vb == null) continue
      if (va == null) return 1
      if (vb == null) return -1
      let cmp = 0
      if (key === 'so_don_hang') {
        const stripNum = (str: string) => {
          const after = str.length > 4 ? str.slice(4) : str
          const n = parseInt(after.replace(/\D/g, ''), 10)
          return Number.isNaN(n) ? 0 : n
        }
        cmp = stripNum(String(va)) - stripNum(String(vb))
      } else if (key === 'ngay_don_hang' || key === 'ngay_giao_hang') {
        cmp = String(va).localeCompare(String(vb))
      } else {
        cmp = String(va).localeCompare(String(vb), 'vi')
      }
      if (cmp !== 0) return s.direction === 'asc' ? cmp : -cmp
    }
    return 0
  })

  const tinhTrangFilterOptions = [...new Set(danhSach.map((d) => String(d.tinh_trang ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'))
  const filteredDanhSach = tinhTrangFilterSelected.length === 0
    ? sortedDanhSach
    : sortedDanhSach.filter((r) => tinhTrangFilterSelected.includes(String(r.tinh_trang ?? '').trim()))

  const tongGiaTri = filteredDanhSach.reduce((s, d) => s + d.gia_tri_don_hang, 0)
  const tongChiTiet = { so_luong: chiTiet.reduce((s, c) => s + c.so_luong, 0) }

  return (
    <div className={styles.root}>
      <div className={styles.toolbarWrap}>
        <button type="button" className={styles.toolbarBtn} onClick={() => { api.clearDraft(); setViewDon(null); setFormPrefillTuDhm(null); setAddFormKey((k) => k + 1); setShowForm(true); }}>
          <Plus size={14} />
          <span>Thêm</span>
        </button>
        <button
          type="button"
          className={styles.toolbarBtn}
          disabled={selectedId == null}
          title={selectedId == null ? 'Chọn một dòng trong danh sách' : 'Xóa phiếu đang chọn'}
          onClick={() => {
            const row = danhSach.find((d) => d.id === selectedId)
            if (row) setDeleteTarget(row)
          }}
        >
          <Trash2 size={14} />
          <span>Xóa</span>
        </button>
        <div ref={refXuatKhau} className={styles.dropdownWrap}>
          <button
            type="button"
            className={styles.toolbarBtn}
            onClick={() => setDropdownXuatKhau((v) => !v)}
          >
            <Download size={14} />
            <span>Xuất khẩu</span>
            <ChevronDown size={12} />
          </button>
          {dropdownXuatKhau && (
            <div className={styles.dropdownMenu}>
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => {
                  const header = columnsDon.map((c) => c.label)
                  const dataRows = danhSach.map((d) =>
                    columnsDon.map((col) => {
                      const v = d[col.key as keyof NhanVatTuHangHoaRecord]
                      if (col.key === 'ngay_don_hang' || col.key === 'ngay_giao_hang') return formatIsoToDdMmYyyy(v as string | null)
                      if (col.key === 'gia_tri_don_hang') return formatNumberDisplay(Number(v), 0)
                      return String(v ?? '')
                    })
                  )
                  exportCsv([header, ...dataRows], 'Nhan_hang_hoa_vat_tu.csv')
                  setDropdownXuatKhau(false)
                }}
              >
                Excel (danh sách phiếu)
              </button>
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => {
                  const header = columnsDon.map((c) => c.label)
                  const dataRows = danhSach.map((d) =>
                    columnsDon.map((col) => {
                      const v = d[col.key as keyof NhanVatTuHangHoaRecord]
                      if (col.key === 'ngay_don_hang' || col.key === 'ngay_giao_hang') return formatIsoToDdMmYyyy(v as string | null)
                      if (col.key === 'gia_tri_don_hang') return formatNumberDisplay(Number(v), 0)
                      return String(v ?? '')
                    })
                  )
                  exportCsv([header, ...dataRows], 'Nhan_hang_hoa_vat_tu.csv')
                  setDropdownXuatKhau(false)
                }}
              >
                CSV (danh sách phiếu)
              </button>
              <button
                type="button"
                className={styles.dropdownItem}
                disabled={chiTiet.length === 0}
                title={chiTiet.length === 0 ? 'Chọn phiếu để xem chi tiết' : 'Xuất chi tiết phiếu đang chọn'}
                onClick={() => {
                  if (chiTiet.length === 0) return
                  const header = columnsChiTiet.map((c) => c.label)
                  const dataRows = chiTiet.map((row, idx) =>
                    columnsChiTiet.map((col) => {
                      if (col.key === 'stt') return String(idx + 1)
                      if (col.key === 'tong_tien') return formatNumberDisplay((row.thanh_tien ?? 0) + (row.tien_thue_gtgt ?? 0), 0)
                      const v = row[col.key as keyof NhanVatTuHangHoaChiTiet]
                      if (col.key === 'dvt') return dvtHienThiLabel(v as string, dvtList)
                      if (col.key === 'so_luong') return formatSoThapPhan(Number(v), 2)
                      if (col.key === 'don_gia' || col.key === 'thanh_tien' || col.key === 'pt_thue_gtgt' || col.key === 'tien_thue_gtgt') return formatNumberDisplay(Number(v ?? 0), col.key === 'pt_thue_gtgt' ? 0 : 0)
                      return String(v ?? '')
                    })
                  )
                  const soDon = selectedId ? danhSach.find((d) => d.id === selectedId)?.so_don_hang ?? 'chi-tiet' : 'chi-tiet'
                  exportCsv([header, ...dataRows], `Nhan_hang_hoa_vat_tu_${soDon}_chi_tiet.csv`)
                  setDropdownXuatKhau(false)
                }}
              >
                CSV (chi tiết phiếu chọn)
              </button>
            </div>
          )}
        </div>
        <div className={styles.filterWrap} style={{ marginBottom: 0, marginRight: 4 }}>
          <span className={styles.filterLabel}>Kỳ</span>
          <select className={styles.filterInput} value={filter.ky} onChange={(e) => onKyChange(e.target.value as KyValue)}>
            {api.KY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className={styles.filterLabel}>Từ</span>
          <DatePicker
            selected={isoToDate(filter.tu)}
            onChange={(d: Date | null) => {
              const iso = toIsoDate(d)
              setFilter((f) => {
                const next = { ...f, tu: iso }
                if (iso && f.den && iso > f.den) next.den = iso
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
                  if (iso) setFilter((f) => {
                    const next = { ...f, tu: iso }
                    if (f.den && iso > f.den) next.den = iso
                    return next
                  })
                }}
              />
            }
          />
          <span className={styles.filterLabel}>Đến</span>
          <DatePicker
            {...htqlDatePickerPopperTop}
            selected={isoToDate(filter.den)}
            onChange={(d: Date | null) => {
              const iso = toIsoDate(d)
              setFilter((f) => {
                const next = { ...f, den: iso }
                if (iso && f.tu && iso < f.tu) next.tu = iso
                return next
              })
            }}
            maxDate={new Date()}
            dateFormat="dd/MM/yyyy"
            locale="vi"
            calendarClassName="htql-datepicker-ngay"
            renderCustomHeader={(p) => <DatePickerCustomHeader {...p} />}
            placeholderText="dd/mm/yyyy"
            className="htql-datepicker-inline"
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
                      const next = { ...f, den: iso }
                      if (f.tu && iso && iso < f.tu) next.tu = iso
                      return next
                    })
                  }
                }}
              />
            }
          />
        </div>
      </div>

      <div className={styles.contentArea}>
        <div className={styles.gridWrap}>
          <DataGrid<NhanVatTuHangHoaRecord>
            columns={columnsDon}
            data={filteredDanhSach}
            keyField="id"
            selectedRowId={selectedId}
            onRowSelect={(r) => setSelectedId(r.id)}
            onRowDoubleClick={(r) => {
              setViewDon(r)
              setShowForm(true)
            }}
            onRowContextMenu={(row, e) => {
              e.preventDefault()
              setContextMenu({ open: true, x: e.clientX, y: e.clientY, row })
            }}
            summary={[
              { label: 'Giá trị đơn hàng', value: formatNumberDisplay(tongGiaTri, 0) },
              { label: 'Số dòng', value: `= ${filteredDanhSach.length}` },
            ]}
            sortableColumns={['so_don_hang']}
            sortState={sortState}
            onSortChange={setSortState}
            columnFilterConfig={{
              tinh_trang: {
                options: tinhTrangFilterOptions,
                selected: tinhTrangFilterSelected,
                onChange: setTinhTrangFilterSelected,
              },
            }}
            emptyDueToFilter={filteredDanhSach.length === 0 && tinhTrangFilterSelected.length > 0}
            onClearAllFilters={() => setTinhTrangFilterSelected([])}
            height="100%"
            compact
          />
        </div>
        <div className={styles.detailWrap}>
          <div className={styles.detailTitle}>Chi tiết</div>
          <div className={styles.gridWrap}>
            <DataGrid<NhanVatTuHangHoaChiTiet>
              columns={columnsChiTiet}
              data={chiTiet}
              keyField="id"
              summary={[
                { label: 'Số lượng', value: formatSoThapPhan(tongChiTiet.so_luong, 2) },
                { label: 'Số dòng', value: `= ${chiTiet.length}` },
              ]}
              height="100%"
              compact
            />
          </div>
        </div>
      </div>

      {contextMenu.open && contextMenu.row && (() => {
        const MENU_MIN_WIDTH = 180
        const MENU_EST_HEIGHT = 320
        const PADDING = 8
        const w = typeof window !== 'undefined' ? window.innerWidth : 9999
        const h = typeof window !== 'undefined' ? window.innerHeight : 9999
        const menuLeft = Math.max(PADDING, Math.min(contextMenu.x, w - MENU_MIN_WIDTH - PADDING))
        const menuTop = Math.max(PADDING, Math.min(contextMenu.y, h - MENU_EST_HEIGHT - PADDING))
        const rowCtx = contextMenu.row
        const linkedDhm =
          rowCtx?.doi_chieu_don_mua_id?.trim() != null && rowCtx.doi_chieu_don_mua_id.trim() !== ''
            ? timDonMuaTheoId(rowCtx.doi_chieu_don_mua_id.trim())
            : null
        const isHuyBoPhieu = rowCtx?.tinh_trang === 'Hủy bỏ'
        const disNhanHang =
          !linkedDhm || linkedDhm.tinh_trang === 'Hủy bỏ' || linkedDhm.tinh_trang === TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG
        const disHuy = isHuyBoPhieu
        const disPhucHoi = !isHuyBoPhieu
        return (
        <div
          style={{
            position: 'fixed',
            left: menuLeft,
            top: menuTop,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-strong)',
            borderRadius: 4,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            zIndex: 2000,
            minWidth: MENU_MIN_WIDTH,
            padding: 4,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '6px 10px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--text-primary)',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => ((e.currentTarget.style.background = 'var(--row-selected-bg)'))}
            onMouseLeave={(e) => ((e.currentTarget.style.background = 'transparent'))}
            onClick={() => {
              const row = contextMenu.row
              if (!row) return
              setContextMenu((m) => ({ ...m, open: false, row: null }))
              setViewDon(row)
              setShowForm(true)
            }}
          >
            <Eye size={14} />
            <span>Xem</span>
          </button>
          <button
            type="button"
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '6px 10px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--text-primary)',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => ((e.currentTarget.style.background = 'var(--row-selected-bg)'))}
            onMouseLeave={(e) => ((e.currentTarget.style.background = 'transparent'))}
            onClick={() => {
              const row = contextMenu.row
              if (!row) return
              setContextMenu((m) => ({ ...m, open: false, row: null }))
              setDeleteTarget(row)
            }}
          >
            <Trash2 size={14} />
            <span>Xóa</span>
          </button>
          <div style={{ margin: '4px 0', borderTop: '1px solid var(--border)' }} />
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => {
              if (thaoTacCloseTimeoutRef.current) {
                clearTimeout(thaoTacCloseTimeoutRef.current)
                thaoTacCloseTimeoutRef.current = null
              }
              if (thaoTacHoverTimeoutRef.current) {
                clearTimeout(thaoTacHoverTimeoutRef.current)
                thaoTacHoverTimeoutRef.current = null
              }
              thaoTacHoverTimeoutRef.current = setTimeout(() => setThaoTacSubmenuOpen(true), SUBMENU_HOVER_DELAY_MS)
            }}
            onMouseLeave={() => {
              if (thaoTacHoverTimeoutRef.current) {
                clearTimeout(thaoTacHoverTimeoutRef.current)
                thaoTacHoverTimeoutRef.current = null
              }
              if (thaoTacCloseTimeoutRef.current) {
                clearTimeout(thaoTacCloseTimeoutRef.current)
                thaoTacCloseTimeoutRef.current = null
              }
              thaoTacCloseTimeoutRef.current = setTimeout(() => setThaoTacSubmenuOpen(false), SUBMENU_HOVER_DELAY_MS)
            }}
          >
            <button
              type="button"
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                background: thaoTacSubmenuOpen ? 'var(--row-selected-bg)' : 'transparent',
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--text-primary)',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              onMouseEnter={(e) => ((e.currentTarget.style.background = 'var(--row-selected-bg)'))}
              onMouseLeave={(e) => (!thaoTacSubmenuOpen && (e.currentTarget.style.background = 'transparent'))}
            >
              <ListChecks size={14} />
              <span>Thao tác</span>
              <span style={{ marginLeft: 'auto' }}>{thaoTacSubmenuOnLeft ? <ChevronLeft size={12} style={{ flexShrink: 0 }} /> : <ChevronRight size={12} style={{ flexShrink: 0 }} />}</span>
            </button>
            {thaoTacSubmenuOpen && (() => {
              const SUBMENU_WIDTH = 180
              const GAP = 2
              const PAD = 16
              const submenuRightEdge = menuLeft + MENU_MIN_WIDTH + GAP + SUBMENU_WIDTH
              const submenuOnLeft = submenuRightEdge > (w - PAD)
              const row = contextMenu.row
              const btnBase = { width: '100%' as const, textAlign: 'left' as const, padding: '6px 10px' as const, border: 'none' as const, borderRadius: 3, display: 'flex' as const, alignItems: 'center' as const, gap: 6 }
              return (
              <div
                style={{
                  position: 'absolute',
                  ...(submenuOnLeft
                    ? { right: '100%', left: 'auto', marginRight: GAP, marginLeft: 0, top: 0 }
                    : { left: '100%', right: 'auto', marginLeft: GAP, marginRight: 0, top: 0 }),
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 4,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  zIndex: 2001,
                  minWidth: SUBMENU_WIDTH,
                  padding: 4,
                }}
                onMouseEnter={() => {
                  if (thaoTacCloseTimeoutRef.current) {
                    clearTimeout(thaoTacCloseTimeoutRef.current)
                    thaoTacCloseTimeoutRef.current = null
                  }
                }}
                onMouseLeave={() => {
                  if (thaoTacCloseTimeoutRef.current) {
                    clearTimeout(thaoTacCloseTimeoutRef.current)
                    thaoTacCloseTimeoutRef.current = null
                  }
                  thaoTacCloseTimeoutRef.current = setTimeout(() => setThaoTacSubmenuOpen(false), SUBMENU_HOVER_DELAY_MS)
                }}
              >
                <button
                  type="button"
                  style={{
                    ...btnBase,
                    background: 'transparent',
                    cursor: disNhanHang ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                    color: disNhanHang ? 'var(--text-muted)' : 'var(--text-primary)',
                    opacity: disNhanHang ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => { if (!disNhanHang) e.currentTarget.style.background = 'var(--row-selected-bg)' }}
                  onMouseLeave={(e) => ((e.currentTarget.style.background = 'transparent'))}
                  disabled={disNhanHang}
                  title={
                    disNhanHang
                      ? !linkedDhm
                        ? 'Phiếu không liên kết đơn mua hàng'
                        : linkedDhm.tinh_trang === TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG
                          ? 'Đơn đã nhận hàng'
                          : 'Đơn đã hủy'
                      : undefined
                  }
                  onClick={() => {
                    if (!row || !linkedDhm || disNhanHang) return
                    setContextMenu((m) => ({ ...m, open: false, row: null }))
                    setThaoTacSubmenuOpen(false)
                    const chiTietTuDon = donHangMuaGetChiTiet(linkedDhm.id)
                    window.dispatchEvent(
                      new CustomEvent(HTQL_MUA_HANG_TAB_EVENT, {
                        detail: { tab: 'nhan-vat-tu-hang-hoa', nhanHangTuDonMua: { don: linkedDhm, chiTiet: chiTietTuDon } },
                      })
                    )
                  }}
                >
                  <Package size={14} />
                  <span>Nhận vật tư hàng hóa</span>
                </button>
                <button
                  type="button"
                  style={{
                    ...btnBase,
                    background: 'transparent',
                    cursor: disHuy ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                    color: disHuy ? 'var(--text-muted)' : 'var(--text-primary)',
                    opacity: disHuy ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => { if (!disHuy) e.currentTarget.style.background = 'var(--row-selected-bg)' }}
                  onMouseLeave={(e) => ((e.currentTarget.style.background = 'transparent'))}
                  disabled={disHuy}
                  title={disHuy ? 'Phiếu đã hủy' : undefined}
                  onClick={() => {
                    if (!row || disHuy) return
                    setContextMenu((m) => ({ ...m, open: false, row: null }))
                    setThaoTacSubmenuOpen(false)
                    setHuyBoTargetNvthh(row)
                  }}
                >
                  <Trash2 size={14} style={{ opacity: 0.7 }} />
                  <span>Hủy bỏ</span>
                </button>
                <button
                  type="button"
                  style={{
                    ...btnBase,
                    background: 'transparent',
                    cursor: disPhucHoi ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                    color: disPhucHoi ? 'var(--text-muted)' : 'var(--text-primary)',
                    opacity: disPhucHoi ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => { if (!disPhucHoi) e.currentTarget.style.background = 'var(--row-selected-bg)' }}
                  onMouseLeave={(e) => ((e.currentTarget.style.background = 'transparent'))}
                  disabled={disPhucHoi}
                  title={disPhucHoi ? 'Chỉ phục hồi khi phiếu đã hủy' : 'Khôi phục về Chưa thực hiện'}
                  onClick={() => {
                    if (!row || disPhucHoi) return
                    setContextMenu((m) => ({ ...m, open: false, row: null }))
                    setThaoTacSubmenuOpen(false)
                    setPhucHoiTargetNvthh(row)
                  }}
                >
                  <RotateCcw size={14} style={{ opacity: 0.7 }} />
                  <span>Phục hồi</span>
                </button>
              </div>
              )
            })()}
          </div>
          <div style={{ margin: '4px 0', borderTop: '1px solid var(--border)' }} />
          <button
            type="button"
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '6px 10px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--text-primary)',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => ((e.currentTarget.style.background = 'var(--row-selected-bg)'))}
            onMouseLeave={(e) => ((e.currentTarget.style.background = 'transparent'))}
            onClick={() => setContextMenu((m) => ({ ...m, open: false, row: null }))}
          >
            <Mail size={14} />
            <span>Gửi mail</span>
          </button>
          <button
            type="button"
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '6px 10px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--text-primary)',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => ((e.currentTarget.style.background = 'var(--row-selected-bg)'))}
            onMouseLeave={(e) => ((e.currentTarget.style.background = 'transparent'))}
            onClick={() => setContextMenu((m) => ({ ...m, open: false, row: null }))}
          >
            <MessageCircle size={14} />
            <span>Gửi Zalo</span>
          </button>
          <div style={{ margin: '4px 0', borderTop: '1px solid var(--border)' }} />
          <button
            type="button"
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '6px 10px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--text-primary)',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => ((e.currentTarget.style.background = 'var(--row-selected-bg)'))}
            onMouseLeave={(e) => ((e.currentTarget.style.background = 'transparent'))}
            onClick={() => setContextMenu((m) => ({ ...m, open: false, row: null }))}
          >
            <FileText size={14} />
            <span>Biểu mẫu</span>
          </button>
          <button
            type="button"
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '6px 10px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--text-primary)',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => ((e.currentTarget.style.background = 'var(--row-selected-bg)'))}
            onMouseLeave={(e) => ((e.currentTarget.style.background = 'transparent'))}
            onClick={() => setContextMenu((m) => ({ ...m, open: false, row: null }))}
          >
            <Paperclip size={14} />
            <span>Đính kèm</span>
          </button>
        </div>
        )
      })()}

      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title={MUA_HANG_MODAL_TITLE_XOA}
        size="sm"
        footer={
          <>
            <button
              type="button"
              className={styles.modalBtn}
              style={{ marginRight: 8 }}
              onClick={() => setDeleteTarget(null)}
            >
              {MUA_HANG_MODAL_FOOTER_HUY}
            </button>
            <button
              type="button"
              className={styles.modalBtnPrimary}
              onClick={() => {
                if (deleteTarget) {
                  api.delete(deleteTarget.id)
                  loadData()
                  setSelectedId(null)
                  setDeleteTarget(null)
                }
              }}
            >
              {MUA_HANG_MODAL_FOOTER_DONG_Y}
            </button>
          </>
        }
      >
        {deleteTarget ? (
          <MuaHangXoaModalBody variant="phieu_nhan_nvthh" soDonHang={deleteTarget.so_don_hang} nhaCungCap={deleteTarget.nha_cung_cap} />
        ) : null}
      </Modal>

      <Modal
        open={phucHoiTargetNvthh != null}
        onClose={() => setPhucHoiTargetNvthh(null)}
        title="Xác nhận phục hồi"
        size="sm"
        footer={
          <>
            <button type="button" className={styles.modalBtn} style={{ marginRight: 8 }} onClick={() => setPhucHoiTargetNvthh(null)}>
              Hủy
            </button>
            <button
              type="button"
              className={styles.modalBtnPrimary}
              onClick={() => {
                if (!phucHoiTargetNvthh) return
                const ct = api.getChiTiet(phucHoiTargetNvthh.id)
                const base = nhanVatTuHangHoaBuildCreatePayloadFromRecord(phucHoiTargetNvthh, ct)
                api.put(phucHoiTargetNvthh.id, { ...base, tinh_trang: 'Chưa thực hiện' })
                loadData()
                setPhucHoiTargetNvthh(null)
              }}
            >
              Đồng ý
            </button>
          </>
        }
      >
        {phucHoiTargetNvthh ? (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)' }}>
            Phục hồi phiếu <strong>{phucHoiTargetNvthh.so_don_hang}</strong> về tình trạng <strong>Chưa thực hiện</strong>?
          </p>
        ) : null}
      </Modal>

      <Modal
        open={huyBoTargetNvthh != null}
        onClose={() => setHuyBoTargetNvthh(null)}
        title="Xác nhận hủy bỏ"
        size="sm"
        footer={
          <>
            <button type="button" className={styles.modalBtn} style={{ marginRight: 8 }} onClick={() => setHuyBoTargetNvthh(null)}>
              Hủy
            </button>
            <button
              type="button"
              className={styles.modalBtnPrimary}
              onClick={() => {
                if (!huyBoTargetNvthh) return
                const ct = api.getChiTiet(huyBoTargetNvthh.id)
                const base = nhanVatTuHangHoaBuildCreatePayloadFromRecord(huyBoTargetNvthh, ct)
                api.put(huyBoTargetNvthh.id, { ...base, tinh_trang: 'Hủy bỏ' })
                loadData()
                setHuyBoTargetNvthh(null)
              }}
            >
              Đồng ý
            </button>
          </>
        }
      >
        {huyBoTargetNvthh ? (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>
            Hủy bỏ phiếu nhận <strong>{huyBoTargetNvthh.so_don_hang}</strong>
            {huyBoTargetNvthh.nha_cung_cap ? ` — ${huyBoTargetNvthh.nha_cung_cap}` : ''}?
            <br />
            <br />
            Tình trạng phiếu sẽ được đặt thành <strong>Hủy bỏ</strong>.
          </p>
        ) : null}
      </Modal>

      {dhmXemModal != null && (
        <div
          className={styles.modalOverlay}
          style={{ zIndex: 3500 }}
          onClick={() => setDhmXemModal(null)}
          role="presentation"
        >
          <div
            className={styles.modalBox}
            style={{
              width: 'min(960px, 96vw)',
              maxWidth: 'min(960px, 96vw)',
              maxHeight: '92vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <DonHangMuaApiProvider api={API_DHM_XEM}>
              <DonHangMuaForm
                key={dhmXemModal.id}
                readOnly
                initialDon={dhmXemModal}
                initialChiTiet={donHangMuaGetChiTiet(dhmXemModal.id)}
                onClose={() => setDhmXemModal(null)}
                formTitle="Đơn hàng mua"
              />
            </DonHangMuaApiProvider>
          </div>
        </div>
      )}

      <NhanVatTuHangHoaFormModal
        open={showForm}
        viewDon={viewDon}
        addFormKey={addFormKey}
        formPrefillTuDhm={formPrefillTuDhm}
        getChiTiet={(id) => api.getChiTiet(id)}
        onClose={() => {
          setViewDon(null)
          setFormPrefillTuDhm(null)
          setShowForm(false)
        }}
        onSaved={() => {
          setViewDon(null)
          setFormPrefillTuDhm(null)
          setShowForm(false)
          loadData()
        }}
        onSavedAndView={(don) => {
          setViewDon(don as NhanVatTuHangHoaRecord)
          setFormPrefillTuDhm(null)
          loadData()
        }}
      />
    </div>
  )
}

export function NhanVatTuHangHoa(props: NhanVatTuHangHoaProps) {
  return (
    <NhanVatTuHangHoaApiProvider api={apiNvthh}>
      <NhanVatTuHangHoaContent {...props} />
    </NhanVatTuHangHoaApiProvider>
  )
}
