import React, { useState, useEffect, useRef, forwardRef, useMemo } from 'react'
import ReactDOM from 'react-dom'
import { Plus, Download, ChevronDown, Eye, Trash2, Mail, MessageCircle, ChevronRight, ChevronLeft, ListChecks, RotateCcw, Package, FileText, Paperclip } from 'lucide-react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { vi } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import { DatePickerCustomHeader } from '../../../../components/datePickerCustomHeader'
import { htqlDatePickerPopperTop } from '../../../../constants/datePickerPlacement'

registerLocale('vi', vi)
import type { DonHangMuaChiTiet } from '../../../../types/donHangMua'
import { DataGrid, type DataGridColumn, type DataGridSortState } from '../../../../components/common/dataGrid'
import {
  type HopDongMuaRecord,
  type HopDongMuaChiTiet,
  type HopDongMuaFilter,
  KY_OPTIONS,
  hopDongMuaGetAll,
  hopDongMuaGetChiTiet,
  hopDongMuaDelete,
  getDefaultHopDongMuaFilter,
  getDateRangeForKy,
  hopDongMuaPost,
  hopDongMuaPut,
  getHopDongMuaDraft,
  setHopDongMuaDraft,
  clearHopDongMuaDraft,
  hopDongMuaSoDonHangTiepTheo,
  type KyValue,
  hopDongMuaBuildCreatePayloadFromRecord,
  TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG,
} from './hopDongMuaApi'
import {
  MuaHangXoaModalBody,
  MUA_HANG_MODAL_FOOTER_HUY,
  MUA_HANG_MODAL_FOOTER_DONG_Y,
  MUA_HANG_MODAL_TITLE_XOA,
} from '../../../../components/muaHangXoaModalBody'
import { HTQL_MUA_HANG_TAB_EVENT } from '../muaHangTabEvent'
import { HopDongMuaApiProvider, useHopDongMuaApi, type HopDongMuaApi } from './hopDongMuaApiContext'
import { Modal } from '../../../../components/common/modal'
import {
  nhanVatTuHangHoaGetAll,
  getDefaultNhanVatTuHangHoaFilter,
  nhanVatTuHangHoaGetChiTiet,
  nhanVatTuHangHoaDelete,
  getDateRangeForKy as nvthhGetDateRangeForKy,
  KY_OPTIONS as NVTHH_KY_OPTIONS,
  nhanVatTuHangHoaPost,
  nhanVatTuHangHoaPut,
  nhanVatTuHangHoaSoDonHangTiepTheo,
  getNhanVatTuHangHoaDraft,
  setNhanVatTuHangHoaDraft,
  clearNhanVatTuHangHoaDraft,
  type NhanVatTuHangHoaRecord,
} from '../nhanVatTuHangHoa/nhanVatTuHangHoaApi'
import type { NhanVatTuHangHoaApi } from '../nhanVatTuHangHoa/nhanVatTuHangHoaApiContext'
import { NhanVatTuHangHoaApiProvider } from '../nhanVatTuHangHoa/nhanVatTuHangHoaApiContext'
import { NhanVatTuHangHoaFormModal } from '../nhanVatTuHangHoa/nhanVatTuHangHoaFormModal'
import { HopDongMuaForm } from './hopDongMuaForm'
import type { HopDongMuaAttachmentItem } from './hopDongMuaAttachmentTypes'
import { duongDanHienThi, formatDungLuongHienThi, partMccForPath, rebuildDhmAttachmentStoredFileName, uocLuongByteTuDataUrl } from './hopDongMuaDinhKemModal'
import { donViTinhGetAll } from '../../../kho/khoHang/donViTinhApi'
import { nhaCungCapGetAll } from '../nhaCungCap/nhaCungCapApi'
import { formatNumberDisplay, formatSoThapPhan } from '../../../../utils/numberFormat'
import { exportCsv } from '../../../../utils/exportCsv'
import styles from './HopDongMua.module.css'

function HopDongMuaAttachmentListPanel({ don }: { don: HopDongMuaRecord | null }) {
  const [maNccTuDanhBa, setMaNccTuDanhBa] = useState('')
  useEffect(() => {
    if (!don?.nha_cung_cap?.trim()) {
      setMaNccTuDanhBa('')
      return
    }
    let cancelled = false
    const ten = don.nha_cung_cap.trim()
    nhaCungCapGetAll().then((list) => {
      if (cancelled || !Array.isArray(list)) return
      const hit = list.find((n) => (n.ten_ncc || '').trim() === ten)
      setMaNccTuDanhBa((hit?.ma_ncc ?? '').trim())
    })
    return () => {
      cancelled = true
    }
  }, [don?.id, don?.nha_cung_cap])

  const files: HopDongMuaAttachmentItem[] = don?.attachments?.length ? don.attachments : []
  const soDon = (don?.so_don_hang ?? '').trim() || 'HDM'
  const maNccPath = partMccForPath(maNccTuDanhBa)

  if (!don) {
    return (
      <div className={styles.attachmentsTabBody}>
        <div className={styles.attachmentsEmpty}>Chọn một đơn trong danh sách để xem file đính kèm.</div>
      </div>
    )
  }
  if (files.length === 0) {
    return (
      <div className={styles.attachmentsTabBody}>
        <div className={styles.attachmentsEmpty}>Đơn &quot;{don.so_don_hang}&quot; chưa có file đính kèm.</div>
      </div>
    )
  }

  return (
    <div className={styles.attachmentsTabBody}>
      <div className={styles.attachmentsScroll}>
      <table className={styles.attachmentsTable}>
        <thead>
          <tr>
            <th>Tên file</th>
            <th>Dung lượng</th>
            <th>Thư mục chứa</th>
          </tr>
        </thead>
        <tbody>
          {files.map((a, i) => {
            const bytes = uocLuongByteTuDataUrl(a.data)
            const folder = duongDanHienThi(a, soDon, maNccPath)
            const tenHienThi = rebuildDhmAttachmentStoredFileName(a.name, soDon, maNccPath)
            return (
              <tr key={`${a.name}-${i}`}>
                <td>{tenHienThi}</td>
                <td className={styles.attachmentsTdNum}>{formatDungLuongHienThi(bytes)}</td>
                <td className={styles.attachmentsTdPath}>{folder}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </div>
  )
}

/** Hiển thị ĐVT theo nguyên tắc ĐVT chính: ky_hieu || ten_dvt, không hiển thị mã */
function dvtHienThiLabel(
  value: string | null | undefined,
  dvtList: { ma_dvt: string; ten_dvt: string; ky_hieu?: string }[]
): string {
  if (value == null || value === '') return ''
  const v = String(value).trim()
  const d = dvtList.find((x) => x.ma_dvt === v || x.ten_dvt === v || (x.ky_hieu != null && x.ky_hieu === v))
  return d ? (d.ky_hieu || d.ten_dvt || d.ma_dvt) : v
}

/** Cột NCC: tối đa 1 dòng + ellipsis (CSS `.htql-grid-cell-ncc-line-clamp`). Tooltip = toàn bộ chuỗi. */
function renderCellNhaCungCapLineClamp(v: unknown): React.ReactNode {
  const s = v != null ? String(v) : ''
  if (!s) return ''
  return (
    <span className="htql-grid-cell-ncc-line-clamp" title={s}>
      {s}
    </span>
  )
}

/** Cột Tên VTHH: tooltip native (Ant Design/Radix chưa có trong dự án). */
function renderCellTenVthhTooltip(v: unknown): React.ReactNode {
  const s = v != null ? String(v) : ''
  return <span title={s || undefined}>{s}</span>
}

/** ISO date (yyyy-mm-dd) -> dd/MM/yyyy */
function formatIsoToDdMmYyyy(iso: string | null): string {
  if (!iso) return ''
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${m[3]}/${m[2]}/${m[1]}`
}

/** Tự chèn "/" thành dd/mm/yyyy khi gõ. */
function formatDdMmYyyyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`
}

/** Parse dd/mm/yyyy -> YYYY-MM-DD. */
function parseDdMmYyyyToIso(s: string): string {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return ''
  const d = parseInt(m[1], 10)
  const mo = parseInt(m[2], 10)
  const y = parseInt(m[3], 10)
  if (d < 1 || d > 31 || mo < 1 || mo > 12 || y < 1900 || y > 2100) return ''
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** YYYY-MM-DD -> Date. */
function isoToDate(iso: string | null): Date | null {
  if (!iso || !iso.trim()) return null
  const d = new Date(iso.trim())
  return Number.isNaN(d.getTime()) ? null : d
}

/** Date -> YYYY-MM-DD. */
function toIsoDate(d: Date | null): string {
  if (!d) return ''
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Input cho DatePicker: nhập 19032026 -> 19/03/2026; blur parse và cập nhật filter */
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

const apiHopDongMua: HopDongMuaApi = {
  getAll: hopDongMuaGetAll,
  getChiTiet: hopDongMuaGetChiTiet,
  delete: hopDongMuaDelete,
  getDefaultFilter: getDefaultHopDongMuaFilter,
  getDateRangeForKy,
  KY_OPTIONS,
  post: hopDongMuaPost,
  put: hopDongMuaPut,
  soDonHangTiepTheo: hopDongMuaSoDonHangTiepTheo,
  getDraft: getHopDongMuaDraft,
  setDraft: setHopDongMuaDraft,
  clearDraft: clearHopDongMuaDraft,
}

const apiNvthhPopup: NhanVatTuHangHoaApi = {
  getAll: nhanVatTuHangHoaGetAll,
  getChiTiet: nhanVatTuHangHoaGetChiTiet,
  delete: nhanVatTuHangHoaDelete,
  getDefaultFilter: getDefaultNhanVatTuHangHoaFilter,
  getDateRangeForKy: nvthhGetDateRangeForKy,
  KY_OPTIONS: NVTHH_KY_OPTIONS,
  post: nhanVatTuHangHoaPost,
  put: nhanVatTuHangHoaPut,
  soDonHangTiepTheo: nhanVatTuHangHoaSoDonHangTiepTheo,
  getDraft: getNhanVatTuHangHoaDraft,
  setDraft: setNhanVatTuHangHoaDraft,
  clearDraft: clearNhanVatTuHangHoaDraft,
}

const LABEL_XUAT_LIEN_QUAN_NVTHH = 'Phiếu nhận VTHH'

function formatLienQuanNvthhXuat(
  d: HopDongMuaRecord,
  phieuTheoDon: Map<string, NhanVatTuHangHoaRecord[]>
): string {
  if (d.tinh_trang !== TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG) return ''
  const list = phieuTheoDon.get(d.id) ?? []
  if (list.length === 0) return ''
  return list.map((p) => `Nhận VTHH: ${(p.so_don_hang ?? '').trim() || '—'}`).join('; ')
}

function HopDongMuaContent() {
  const api = useHopDongMuaApi()
  const [filter, setFilter] = useState<HopDongMuaFilter>(api.getDefaultFilter)
  const [danhSach, setDanhSach] = useState<HopDongMuaRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chiTiet, setChiTiet] = useState<HopDongMuaChiTiet[]>([])
  const [dropdownXuatKhau, setDropdownXuatKhau] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [viewDon, setViewDon] = useState<HopDongMuaRecord | null>(null)
  /** Tăng mỗi lần bấm Thêm để form remount → reset tab và nội dung phía dưới. */
  const [addFormKey, setAddFormKey] = useState(0)
  const [phucHoiTarget, setPhucHoiTarget] = useState<HopDongMuaRecord | null>(null)
  const [thaoTacSubmenuOpen, setThaoTacSubmenuOpen] = useState(false)
  const thaoTacHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const thaoTacCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const SUBMENU_HOVER_DELAY_MS = 200
  const refXuatKhau = useRef<HTMLDivElement>(null)
  const modalBoxRef = useRef<HTMLDivElement>(null)
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | null>(null)
  const [dragStart, setDragStart] = useState<{ clientX: number; clientY: number; startX: number; startY: number } | null>(null)
  const [formMinimized, setFormMinimized] = useState(false)
  const [formMaximized, setFormMaximized] = useState(false)
  const [dvtList, setDvtList] = useState<{ ma_dvt: string; ten_dvt: string; ky_hieu?: string }[]>([])
  const [sortState, setSortState] = useState<DataGridSortState[]>([{ key: 'so_don_hang', direction: 'desc' }])
  const [tinhTrangFilterSelected, setTinhTrangFilterSelected] = useState<string[]>([])
  const [contextMenu, setContextMenu] = useState<{ open: boolean; x: number; y: number; row: HopDongMuaRecord | null }>({ open: false, x: 0, y: 0, row: null })
  const [tabChiTietDuoi, setTabChiTietDuoi] = useState<'chi-tiet-vthh' | 'lien-quan-nvthh' | 'file-dinh-kem'>('chi-tiet-vthh')
  const [xoaDonModalRow, setXoaDonModalRow] = useState<HopDongMuaRecord | null>(null)
  const [huyBoModalRow, setHuyBoModalRow] = useState<HopDongMuaRecord | null>(null)
  const [popupXemNvthh, setPopupXemNvthh] = useState<NhanVatTuHangHoaRecord | null>(null)

  const loadData = () => setDanhSach(api.getAll(filter))

  const phieuNhanTheoDonMuaId = useMemo(() => {
    const all = nhanVatTuHangHoaGetAll({ ...getDefaultNhanVatTuHangHoaFilter(), tu: '', den: '' })
    const m = new Map<string, NhanVatTuHangHoaRecord[]>()
    for (const p of all) {
      const id = (p.doi_chieu_don_mua_id ?? '').trim()
      if (!id) continue
      const cur = m.get(id)
      if (cur) cur.push(p)
      else m.set(id, [p])
    }
    return m
  }, [danhSach])

  const thucHienXoaDon = (row: HopDongMuaRecord) => {
    api.delete(row.id)
    loadData()
    if (selectedId === row.id) setSelectedId(null)
  }

  const columnsDon: DataGridColumn<HopDongMuaRecord>[] = [
    { key: 'so_don_hang', label: 'Mã HĐM', width: 56 },
    { key: 'so_chung_tu_cukcuk', label: 'Tiêu đề', width: '18%', align: 'left' },
    { key: 'ngay_don_hang', label: 'Ngày MH', width: 58, renderCell: (v) => formatIsoToDdMmYyyy(v as string) },
    { key: 'ngay_giao_hang', label: 'Ngày GH', width: 58, renderCell: (v) => formatIsoToDdMmYyyy(v as string | null) },
    { key: 'gia_tri_don_hang', label: 'Giá trị hợp đồng', width: 70, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
    { key: 'tinh_trang', label: 'Tình trạng', width: 78, filterable: true },
    { key: 'nha_cung_cap', label: 'Nhà cung cấp', width: '22%', renderCell: renderCellNhaCungCapLineClamp },
    { key: 'dien_giai', label: 'Ghi chú', width: '12%' },
  ]

  /** Cột cố định từ mẫu có đơn giá (rule mau_gia: STT, Mã, Tên, ĐVT, Số lượng giữ nguyên khi chuyển mẫu) */
  const COL_STT = 36
  const COL_MA = 88
  const COL_TEN = 220
  const COL_DVT = 64
  const COL_SO_LUONG = 68

  /** Mẫu có đơn giá: đủ cột, chiều rộng cố định */
  const columnsChiTietCodongia: DataGridColumn<HopDongMuaChiTiet>[] = [
    { key: 'stt' as keyof HopDongMuaChiTiet, label: 'STT', width: COL_STT, align: 'center', renderCell: (_v, _r, idx) => idx != null ? String(idx + 1) : '' },
    { key: 'ma_hang', label: 'Mã VTHH', width: COL_MA },
    { key: 'ten_hang', label: 'Tên VTHH', width: COL_TEN, renderCell: renderCellTenVthhTooltip },
    { key: 'dvt', label: 'ĐVT', width: COL_DVT, renderCell: (v) => dvtHienThiLabel(v as string, dvtList) },
    { key: 'so_luong', label: 'Số lượng', width: COL_SO_LUONG, align: 'right', renderCell: (v) => formatSoThapPhan(Number(v), 2) },
    { key: 'don_gia', label: 'ĐG mua', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
    { key: 'thanh_tien', label: 'Thành tiền', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
    { key: 'pt_thue_gtgt', label: '% thuế GTGT', width: 90, align: 'right', renderCell: (v) => v != null ? formatSoThapPhan(Number(v), 0) : '' },
    { key: 'tien_thue_gtgt', label: 'Tiền thuế GTGT', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v ?? 0), 0) },
    { key: 'tong_tien' as keyof HopDongMuaChiTiet, label: 'Tổng tiền', width: 100, align: 'right', renderCell: (_v, row) => formatNumberDisplay((row.thanh_tien ?? 0) + (row.tien_thue_gtgt ?? 0), 0) },
    { key: 'ghi_chu', label: 'Ghi chú', width: 260 },
  ]

  /** Mẫu không đơn giá: STT, Mã, Tên, ĐVT, Số lượng giữ nguyên; Ghi chú mở rộng full form (width auto = còn lại) */
  const columnsChiTietKhongdongia: DataGridColumn<HopDongMuaChiTiet>[] = [
    { key: 'stt' as keyof HopDongMuaChiTiet, label: 'STT', width: COL_STT, align: 'center', renderCell: (_v, _r, idx) => idx != null ? String(idx + 1) : '' },
    { key: 'ma_hang', label: 'Mã VTHH', width: COL_MA },
    { key: 'ten_hang', label: 'Tên VTHH', width: COL_TEN, renderCell: renderCellTenVthhTooltip },
    { key: 'dvt', label: 'ĐVT', width: COL_DVT, renderCell: (v) => dvtHienThiLabel(v as string, dvtList) },
    { key: 'so_luong', label: 'Số lượng', width: COL_SO_LUONG, align: 'right', renderCell: (v) => formatSoThapPhan(Number(v), 2) },
    { key: 'ghi_chu', label: 'Ghi chú', renderCell: (v) => String(v ?? '') },
  ]

  /** Xác định mẫu theo dữ liệu: không đơn giá khi giá trị đơn = 0 và chi tiết toàn don_gia/thanh_tien = 0 */
  const isKhongdongia = selectedId != null && (() => {
    const don = danhSach.find((d) => d.id === selectedId)
    if (!don || don.gia_tri_don_hang !== 0) return false
    return chiTiet.every((c) => (c.don_gia ?? 0) === 0 && (c.thanh_tien ?? 0) === 0)
  })()

  const columnsChiTiet = isKhongdongia ? columnsChiTietKhongdongia : columnsChiTietCodongia

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showForm) setShowForm(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showForm])

  useEffect(() => {
    if (showForm) {
      setModalPosition(null)
      setFormMinimized(false)
      setFormMaximized(false)
    }
  }, [showForm])

  useEffect(() => {
    if (!dragStart) return
    const onMove = (e: MouseEvent) => {
      setModalPosition({
        x: dragStart.startX + (e.clientX - dragStart.clientX),
        y: dragStart.startY + (e.clientY - dragStart.clientY),
      })
    }
    const onUp = () => setDragStart(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragStart])

  const handleHeaderPointerDown = (e: React.MouseEvent) => {
    if (!modalBoxRef.current) return
    const rect = modalBoxRef.current.getBoundingClientRect()
    setModalPosition({ x: rect.left, y: rect.top })
    setDragStart({ clientX: e.clientX, clientY: e.clientY, startX: rect.left, startY: rect.top })
  }

  const dongModal = () => setShowForm(false)

  const onKyChange = (ky: KyValue) => {
    const { tu, den } = api.getDateRangeForKy(ky)
    setFilter((f) => ({ ...f, ky, tu, den }))
  }

  const sortedDanhSach = [...danhSach].sort((a, b) => {
    const effectiveSort = sortState?.length ? sortState : [{ key: 'so_don_hang', direction: 'desc' } as DataGridSortState]
    for (const s of effectiveSort) {
      const key = s.key as keyof HopDongMuaRecord
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
  const selectedRow = selectedId ? danhSach.find((d) => d.id === selectedId) : null
  const selectedDaNhanHang = selectedRow?.tinh_trang === TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG

  return (
    <div className={styles.root}>
      <div className={styles.toolbarWrap}>
        <button type="button" className={styles.toolbarBtn} onClick={() => { api.clearDraft(); setViewDon(null); setAddFormKey((k) => k + 1); setShowForm(true); }}>
          <Plus size={14} />
          <span>Thêm</span>
        </button>
        <button
          type="button"
          className={styles.toolbarBtn}
          disabled={selectedId == null || selectedDaNhanHang}
          title={
            selectedId == null
              ? 'Chọn một dòng trong danh sách'
              : selectedDaNhanHang
                ? 'Đơn đã nhận hàng — không xóa được'
                : 'Xóa đơn đang chọn'
          }
          onClick={() => {
            const row = danhSach.find((d) => d.id === selectedId)
            if (row && row.tinh_trang !== TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG) setXoaDonModalRow(row)
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
                  const header = [...columnsDon.map((c) => c.label), LABEL_XUAT_LIEN_QUAN_NVTHH]
                  const dataRows = danhSach.map((d) => [
                    ...columnsDon.map((col) => {
                      const v = d[col.key as keyof HopDongMuaRecord]
                      if (col.key === 'ngay_don_hang' || col.key === 'ngay_giao_hang') return formatIsoToDdMmYyyy(v as string | null)
                      if (col.key === 'gia_tri_don_hang') return formatNumberDisplay(Number(v), 0)
                      return String(v ?? '')
                    }),
                    formatLienQuanNvthhXuat(d, phieuNhanTheoDonMuaId),
                  ])
                  exportCsv([header, ...dataRows], 'Don_hang_mua.csv')
                  setDropdownXuatKhau(false)
                }}
              >
                Excel (danh sách hợp đồng)
              </button>
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => {
                  const header = [...columnsDon.map((c) => c.label), LABEL_XUAT_LIEN_QUAN_NVTHH]
                  const dataRows = danhSach.map((d) => [
                    ...columnsDon.map((col) => {
                      const v = d[col.key as keyof HopDongMuaRecord]
                      if (col.key === 'ngay_don_hang' || col.key === 'ngay_giao_hang') return formatIsoToDdMmYyyy(v as string | null)
                      if (col.key === 'gia_tri_don_hang') return formatNumberDisplay(Number(v), 0)
                      return String(v ?? '')
                    }),
                    formatLienQuanNvthhXuat(d, phieuNhanTheoDonMuaId),
                  ])
                  exportCsv([header, ...dataRows], 'Don_hang_mua.csv')
                  setDropdownXuatKhau(false)
                }}
              >
                CSV (danh sách hợp đồng)
              </button>
              <button
                type="button"
                className={styles.dropdownItem}
                disabled={chiTiet.length === 0}
                title={chiTiet.length === 0 ? 'Chọn đơn để xem chi tiết' : 'Xuất chi tiết đơn đang chọn'}
                onClick={() => {
                  if (chiTiet.length === 0) return
                  const header = columnsChiTiet.map((c) => c.label)
                  const dataRows = chiTiet.map((row, idx) =>
                    columnsChiTiet.map((col) => {
                      if (col.key === 'stt') return String(idx + 1)
                      if (col.key === 'tong_tien') return formatNumberDisplay((row.thanh_tien ?? 0) + (row.tien_thue_gtgt ?? 0), 0)
                      const v = row[col.key as keyof HopDongMuaChiTiet]
                      if (col.key === 'dvt') return dvtHienThiLabel(v as string, dvtList)
                      if (col.key === 'so_luong') return formatSoThapPhan(Number(v), 2)
                      if (col.key === 'don_gia' || col.key === 'thanh_tien' || col.key === 'pt_thue_gtgt' || col.key === 'tien_thue_gtgt') return formatNumberDisplay(Number(v ?? 0), col.key === 'pt_thue_gtgt' ? 0 : 0)
                      return String(v ?? '')
                    })
                  )
                  const soDon = selectedId ? danhSach.find((d) => d.id === selectedId)?.so_don_hang ?? 'chi-tiet' : 'chi-tiet'
                  exportCsv([header, ...dataRows], `Don_hang_mua_${soDon}_chi_tiet.csv`)
                  setDropdownXuatKhau(false)
                }}
              >
                CSV (chi tiết đơn chọn)
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
            {...htqlDatePickerPopperTop}
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
          <DataGrid<HopDongMuaRecord>
            columns={columnsDon}
            data={filteredDanhSach}
            keyField="id"
            stripedRows
            selectedRowId={selectedId}
            onRowSelect={(r) => setSelectedId(r.id)}
            onRowDoubleClick={(r) => {
              setViewDon(r)
              setShowForm(true)
            }}
            onRowContextMenu={(row, e) => {
              e.preventDefault()
              setSelectedId(row.id)
              setContextMenu({ open: true, x: e.clientX, y: e.clientY, row })
            }}
            summary={[
              { label: 'Giá trị hợp đồng', value: formatNumberDisplay(tongGiaTri, 0) },
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
          <div className={styles.detailTabBar}>
            <button
              type="button"
              className={tabChiTietDuoi === 'chi-tiet-vthh' ? styles.detailTabActive : styles.detailTab}
              onClick={() => setTabChiTietDuoi('chi-tiet-vthh')}
            >
              Chi tiết VTHH
            </button>
            <button
              type="button"
              className={tabChiTietDuoi === 'lien-quan-nvthh' ? styles.detailTabActive : styles.detailTab}
              onClick={() => setTabChiTietDuoi('lien-quan-nvthh')}
            >
              Liên quan
            </button>
            <button
              type="button"
              className={tabChiTietDuoi === 'file-dinh-kem' ? styles.detailTabActive : styles.detailTab}
              onClick={() => setTabChiTietDuoi('file-dinh-kem')}
            >
              File đính kèm
            </button>
          </div>
          <div className={styles.detailTabPanel}>
            {tabChiTietDuoi === 'chi-tiet-vthh' ? (
              <div className={styles.gridWrap}>
                <DataGrid<HopDongMuaChiTiet>
                  columns={columnsChiTiet}
                  data={chiTiet}
                  keyField="id"
                  stripedRows
                  summary={[
                    { label: 'Số lượng', value: formatSoThapPhan(tongChiTiet.so_luong, 2) },
                    { label: 'Số dòng', value: `= ${chiTiet.length}` },
                  ]}
                  height="100%"
                  compact
                />
              </div>
            ) : tabChiTietDuoi === 'lien-quan-nvthh' ? (
              <div style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-primary)', overflow: 'auto', height: '100%', boxSizing: 'border-box' }}>
                {selectedRow == null ? (
                  <span style={{ color: 'var(--text-muted)' }}>Chọn một đơn trong danh sách để xem phiếu nhận vật tư hàng hóa liên quan.</span>
                ) : selectedRow.tinh_trang !== TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG ? (
                  <span style={{ color: 'var(--text-muted)' }}>
                    Đơn <strong>{selectedRow.so_don_hang}</strong> chưa ở tình trạng «Đã nhận hàng» — không có phiếu liên kết theo nghiệp vụ.
                  </span>
                ) : (() => {
                  const list = phieuNhanTheoDonMuaId.get(selectedRow.id) ?? []
                  if (list.length === 0) {
                    return <span style={{ color: 'var(--text-muted)' }} title="Chưa có phiếu liên kết">Chưa có phiếu nhận vật tư hàng hóa liên kết với đơn này.</span>
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 600, fontSize: 11 }}>Đơn {selectedRow.so_don_hang}</div>
                      {list.map((p) => (
                        <div key={p.id} style={{ fontSize: 11, lineHeight: 1.35, textAlign: 'left' }}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Nhận VTHH: </span>
                          <button
                            type="button"
                            className={styles.lienQuanNvthhTabLink}
                            onClick={() => setPopupXemNvthh(p)}
                          >
                            {(p.so_don_hang ?? '').trim() || '—'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            ) : (
              <HopDongMuaAttachmentListPanel
                don={selectedId ? danhSach.find((d) => d.id === selectedId) ?? null : null}
              />
            )}
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
        const ctxDaNhanHang = contextMenu.row.tinh_trang === TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG
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
              cursor: ctxDaNhanHang ? 'not-allowed' : 'pointer',
              fontSize: 12,
              color: ctxDaNhanHang ? 'var(--text-muted)' : 'var(--text-primary)',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: ctxDaNhanHang ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!ctxDaNhanHang) e.currentTarget.style.background = 'var(--row-selected-bg)'
            }}
            onMouseLeave={(e) => ((e.currentTarget.style.background = 'transparent'))}
            disabled={ctxDaNhanHang}
            title={ctxDaNhanHang ? 'Đơn đã nhận hàng — không xóa được' : undefined}
            onClick={() => {
              const row = contextMenu.row
              if (!row || row.tinh_trang === TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG) return
              setContextMenu((m) => ({ ...m, open: false, row: null }))
              setXoaDonModalRow(row)
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
              const isHuyBo = !!(row && row.tinh_trang === 'Hủy bỏ')
              const isDaNhanHangRow = !!(row && row.tinh_trang === TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG)
              const disNhanHang = isHuyBo || isDaNhanHangRow
              const disHuy = isHuyBo || isDaNhanHangRow
              const disPhucHoi = !isHuyBo || isDaNhanHangRow
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
                  title={disNhanHang ? (isDaNhanHangRow ? 'Đơn đã nhận hàng' : 'Đơn đã hủy') : undefined}
                  onClick={() => {
                    if (!row || disNhanHang) return
                    setContextMenu((m) => ({ ...m, open: false, row: null }))
                    setThaoTacSubmenuOpen(false)
                    const chiTietTuDon = api.getChiTiet(row.id)
                    window.dispatchEvent(
                      new CustomEvent(HTQL_MUA_HANG_TAB_EVENT, {
                        detail: { tab: 'nhanvattuhanghoa', nhanHangTuDonMua: { don: row, chiTiet: chiTietTuDon } },
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
                  title={disHuy ? (isDaNhanHangRow ? 'Đơn đã nhận hàng' : 'Đơn đã hủy') : undefined}
                  onClick={() => {
                    if (!row || disHuy) return
                    setContextMenu((m) => ({ ...m, open: false, row: null }))
                    setThaoTacSubmenuOpen(false)
                    setHuyBoModalRow(row)
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
                  title={
                    disPhucHoi
                      ? isDaNhanHangRow
                        ? 'Đơn đã nhận hàng'
                        : 'Chỉ phục hồi khi đơn đã hủy'
                      : 'Khôi phục về Chưa thực hiện'
                  }
                  onClick={() => {
                    if (!row || disPhucHoi) return
                    setContextMenu((m) => ({ ...m, open: false, row: null }))
                    setThaoTacSubmenuOpen(false)
                    setPhucHoiTarget(row)
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
        open={phucHoiTarget != null}
        onClose={() => setPhucHoiTarget(null)}
        title="Xác nhận phục hồi"
        size="sm"
        footer={
          <>
            <button type="button" className={styles.modalBtn} style={{ marginRight: 8 }} onClick={() => setPhucHoiTarget(null)}>
              Hủy
            </button>
            <button
              type="button"
              className={styles.modalBtnPrimary}
              onClick={() => {
                if (!phucHoiTarget) return
                const ct = api.getChiTiet(phucHoiTarget.id)
                const base = hopDongMuaBuildCreatePayloadFromRecord(phucHoiTarget, ct)
                api.put(phucHoiTarget.id, { ...base, tinh_trang: 'Chưa thực hiện' })
                loadData()
                setPhucHoiTarget(null)
              }}
            >
              Đồng ý
            </button>
          </>
        }
      >
        {phucHoiTarget ? (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)' }}>
            Phục hồi đơn <strong>{phucHoiTarget.so_don_hang}</strong> về tình trạng <strong>Chưa thực hiện</strong>?
          </p>
        ) : null}
      </Modal>

      <Modal
        open={xoaDonModalRow != null}
        onClose={() => setXoaDonModalRow(null)}
        title={MUA_HANG_MODAL_TITLE_XOA}
        size="sm"
        footer={
          <>
            <button type="button" className={styles.modalBtn} style={{ marginRight: 8 }} onClick={() => setXoaDonModalRow(null)}>
              {MUA_HANG_MODAL_FOOTER_HUY}
            </button>
            <button
              type="button"
              className={styles.modalBtnPrimary}
              onClick={() => {
                if (!xoaDonModalRow) return
                thucHienXoaDon(xoaDonModalRow)
                setXoaDonModalRow(null)
              }}
            >
              {MUA_HANG_MODAL_FOOTER_DONG_Y}
            </button>
          </>
        }
      >
        {xoaDonModalRow ? (
          <MuaHangXoaModalBody variant="don_hang_mua" soDonHang={xoaDonModalRow.so_don_hang} nhaCungCap={xoaDonModalRow.nha_cung_cap} />
        ) : null}
      </Modal>

      <Modal
        open={huyBoModalRow != null}
        onClose={() => setHuyBoModalRow(null)}
        title="Xác nhận hủy bỏ"
        size="sm"
        footer={
          <>
            <button type="button" className={styles.modalBtn} style={{ marginRight: 8 }} onClick={() => setHuyBoModalRow(null)}>
              Hủy
            </button>
            <button
              type="button"
              className={styles.modalBtnPrimary}
              onClick={() => {
                if (!huyBoModalRow) return
                const ct = api.getChiTiet(huyBoModalRow.id)
                const base = hopDongMuaBuildCreatePayloadFromRecord(huyBoModalRow, ct)
                api.put(huyBoModalRow.id, { ...base, tinh_trang: 'Hủy bỏ' })
                loadData()
                setHuyBoModalRow(null)
              }}
            >
              Đồng ý
            </button>
          </>
        }
      >
        {huyBoModalRow ? (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>
            Hủy bỏ hợp đồng mua <strong>{huyBoModalRow.so_don_hang}</strong>
            {huyBoModalRow.nha_cung_cap ? ` — ${huyBoModalRow.nha_cung_cap}` : ''}?
            <br />
            <br />
            Tình trạng đơn sẽ được đặt thành <strong>Hủy bỏ</strong>.
          </p>
        ) : null}
      </Modal>

      {showForm && (
        <div className={styles.modalOverlay}>
          <div
            ref={modalBoxRef}
            className={styles.modalBox}
            style={{
              ...(formMaximized ? { width: '100vw', maxWidth: '100vw', height: '100vh', maxHeight: '100vh', borderRadius: 0 } : {}),
              ...(formMinimized ? { height: 'auto', maxHeight: 40, minHeight: 40 } : {}),
              ...(modalPosition != null ? { position: 'fixed' as const, left: modalPosition.x, top: modalPosition.y } : {}),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <HopDongMuaForm
              key={viewDon ? viewDon.id : `add-${addFormKey}`}
              onClose={() => { setViewDon(null); dongModal() }}
              onSaved={() => { setViewDon(null); dongModal(); loadData(); }}
              onSavedAndView={(don) => { setViewDon(don); loadData(); }}
              onHeaderPointerDown={handleHeaderPointerDown}
              dragging={dragStart != null}
              readOnly={viewDon != null}
              initialDon={viewDon ?? undefined}
              initialChiTiet={viewDon ? api.getChiTiet(viewDon.id) : undefined}
              formTitle="Hợp đồng mua"
              onMinimize={() => setFormMinimized((v) => !v)}
              onMaximize={() => setFormMaximized((v) => !v)}
            />
          </div>
        </div>
      )}

      {typeof document !== 'undefined' &&
        ReactDOM.createPortal(
          <NhanVatTuHangHoaApiProvider api={apiNvthhPopup}>
            <NhanVatTuHangHoaFormModal
              open={popupXemNvthh != null}
              viewDon={popupXemNvthh}
              addFormKey={0}
              formPrefillTuDhm={null}
              getChiTiet={(id) => nhanVatTuHangHoaGetChiTiet(id) as unknown as DonHangMuaChiTiet[]}
              onClose={() => setPopupXemNvthh(null)}
              onSaved={() => setPopupXemNvthh(null)}
              onSavedAndView={() => {}}
              chiXemKhongSua
              overlayZIndex={5200}
            />
          </NhanVatTuHangHoaApiProvider>,
          document.body
        )}
    </div>
  )
}

export function HopDongMua() {
  return (
    <HopDongMuaApiProvider api={apiHopDongMua}>
      <HopDongMuaContent />
    </HopDongMuaApiProvider>
  )
}
