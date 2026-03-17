import { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Save,
  Trash2,
  Paperclip,
  FileText,
  Printer,
  Mail,
  HelpCircle,
  Power,
  ChevronDown,
} from 'lucide-react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { vi } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import {
  LOOKUP_CONTROL_HEIGHT,
  lookupInputWithChevronStyle,
  lookupChevronOverlayStyle,
  lookupActionButtonStyle,
} from '../../constants/lookupControlStyles'
import { loadDieuKhoanThanhToan, nhaCungCapGetAll, type DieuKhoanThanhToanItem } from './nhaCungCapApi'
import { NhaCungCap } from './NhaCungCap'
import type { NhaCungCapRecord } from './nhaCungCapApi'
import type { VatTuHangHoaRecord } from '../kho/vatTuHangHoaApi'
import { vatTuHangHoaGetAll } from '../kho/vatTuHangHoaApi'
import { donViTinhGetAll } from '../kho/donViTinhApi'
import { matchSearchKeyword } from '../../utils/stringUtils'
import { formatSoNguyenInput, formatSoTienHienThi, formatSoTuNhienInput, parseFloatVN } from '../../utils/numberFormat'
import type { DeXuatMuaHangCreatePayload, DeXuatMuaHangRecord, DeXuatMuaHangChiTiet } from './deXuatMuaHangApi'
import { useDeXuatMuaHangApi } from './DeXuatMuaHangApiContext'
import { setUnsavedChanges } from '../../context/unsavedChanges'
import { Modal } from '../../components/Modal'

registerLocale('vi', vi)

const FORM_FIELD_HEIGHT = LOOKUP_CONTROL_HEIGHT
const LABEL_MIN_WIDTH = 100
const FIELD_ROW_GAP = 6

const toolbarWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 10px',
  background: 'var(--bg-tab)',
  borderBottom: '1px solid var(--border-strong)',
  flexWrap: 'wrap',
}

/** Nút thường: nền trắng, viền rõ, nổi bật so với nền toolbar xám */
const toolbarBtn: React.CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  padding: '5px 10px',
  fontSize: 11,
  fontFamily: 'var(--font-misa), Tahoma, Arial, sans-serif',
  background: '#FFFFFF',
  border: '1px solid var(--border-strong)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  borderRadius: 4,
  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
}

/** Nút nhấn mạnh (Lưu, Sửa, Đóng): màu accent cam, nổi bật */
const toolbarBtnAccent: React.CSSProperties = {
  ...toolbarBtn,
  background: 'var(--accent)',
  color: 'var(--accent-text)',
  borderColor: 'var(--accent)',
  boxShadow: '0 1px 3px rgba(230, 126, 34, 0.4)',
}

const groupBox: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '8px 10px',
  background: 'var(--bg-secondary)',
  marginBottom: 8,
}

const groupBoxTitle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-primary)',
  marginBottom: 6,
  padding: '0 4px',
}

const fieldRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minHeight: FORM_FIELD_HEIGHT,
  marginBottom: FIELD_ROW_GAP,
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted)',
  textAlign: 'right',
  minWidth: LABEL_MIN_WIDTH,
  flexShrink: 0,
}

const inputStyle: React.CSSProperties = {
  padding: '2px 6px',
  fontSize: 11,
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  color: 'var(--text-primary)',
  height: FORM_FIELD_HEIGHT,
  minHeight: FORM_FIELD_HEIGHT,
  boxSizing: 'border-box',
  flex: 1,
  minWidth: 0,
}

/** Bao bảng — giống DataGrid màn hình ngoài (đơn mua hàng) */
const gridWrap: React.CSSProperties = {
  border: '0.5px solid var(--border)',
  borderRadius: '4px',
  overflow: 'hidden',
  background: 'var(--bg-secondary)',
  minHeight: 120,
  maxHeight: 280,
  display: 'flex',
  flexDirection: 'column',
}

const footerWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  background: 'var(--bg-tab)',
  borderTop: '1px solid var(--border)',
  fontSize: 11,
  flexWrap: 'wrap',
  gap: 8,
}

export interface DeXuatMuaHangFormProps {
  onClose: () => void
  onSaved?: () => void
  onHeaderPointerDown?: (e: React.MouseEvent) => void
  dragging?: boolean
  onMinimize?: () => void
  onMaximize?: () => void
  readOnly?: boolean
  initialDon?: DeXuatMuaHangRecord | null
  initialChiTiet?: DeXuatMuaHangChiTiet[] | null
  onSavedAndView?: (don: DeXuatMuaHangRecord) => void
  /** Gọi khi Lưu và tiếp tục xong — chỉ refresh danh sách, không đóng form */
  onSavedAndContinue?: () => void
  formTitle?: string
  soDonLabel?: string
}

const TINH_TRANG_OPTIONS = [
  { value: 'Đề xuất mới', label: 'Đề xuất mới' },
  { value: 'Chuyển ĐMH', label: 'Chuyển ĐMH' },
  { value: 'Hoàn thành', label: 'Hoàn thành' },
  { value: 'Hủy bỏ', label: 'Hủy bỏ' },
]

/** Các cột bảng chi tiết đề xuất mua hàng */
const GRID_COLUMNS_VTHH = [
  'Mã',
  'Tên VTHH',
  'ĐVT',
  'Số lượng',
  'Ghi chú',
] as const

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

/** Độ rộng cột cố định: tránh dịch chuyển khi thêm dòng (dùng với tableLayout: fixed). */
function colWidthStyle(col: string): React.CSSProperties {
  if (col === 'Mã') return { width: 64, minWidth: 64 }
  if (col === 'Tên VTHH') return { width: 220, minWidth: 220 }
  if (col === 'ĐVT') return { width: 64, minWidth: 64 }
  if (col === 'Số lượng') return { width: 68, minWidth: 68 }
  if (col === 'Ghi chú') return { width: 260, minWidth: 180 }
  return {}
}

const tdChietKhau: React.CSSProperties = {
  padding: '2px 4px',
  borderBottom: '1px solid var(--border)',
  borderRight: '1px solid var(--border)',
  color: 'var(--text-primary)',
  verticalAlign: 'middle',
}

/** Header ô bảng — ô sát nhau, khoảng cách 1px */
const gridThStyle: React.CSSProperties = {
  padding: 1,
  textAlign: 'left',
  background: 'var(--bg-tab)',
  color: 'var(--text-primary)',
  borderBottom: '0.5px solid var(--border)',
  borderRight: '0.5px solid var(--border)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
}

/** Ô dữ liệu bảng — ô sát nhau, khoảng cách giữa các ô nhập 1px */
const gridTdStyle: React.CSSProperties = {
  padding: 1,
  borderBottom: '0.5px solid var(--border)',
  borderRight: '0.5px solid var(--border)',
  color: 'var(--text-primary)',
  verticalAlign: 'middle',
}

const titleBarWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 4px 0 12px',
  borderBottom: '1px solid var(--border)',
  background: 'var(--bg-tab)',
  flexShrink: 0,
  minHeight: 36,
}

const titleBarDrag: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: '6px 0',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-primary)',
  cursor: 'grab',
  userSelect: 'none',
}

function parseIsoToDate(iso: string | null): Date | null {
  if (!iso || !iso.trim()) return null
  const d = new Date(iso.trim())
  return Number.isNaN(d.getTime()) ? null : d
}

/** Kiểu một dòng grid: cột là string, thêm _dvtOptions và _vthh cho ĐVT quy đổi và ĐG mua */
type GridLineRow = Record<string, string> & { _dvtOptions?: string[]; _vthh?: VatTuHangHoaRecord }

function chiTietToLines(ct: DeXuatMuaHangChiTiet[]): GridLineRow[] {
  return ct.map((c) => ({
    'Mã': c.ma_hang,
    'Tên VTHH': c.ten_hang,
    'ĐVT': c.dvt,
    'Số lượng': formatSoTienHienThi(c.so_luong),
    'Ghi chú': c.ghi_chu ?? '',
  }))
}

export function DeXuatMuaHangForm({ onClose, onSaved, onHeaderPointerDown, dragging, readOnly = false, initialDon, initialChiTiet, onMinimize: _onMinimize, onMaximize: _onMaximize, onSavedAndView: _onSavedAndView, onSavedAndContinue, formTitle: formTitleProp, soDonLabel: soDonLabelProp }: DeXuatMuaHangFormProps) {
  const api = useDeXuatMuaHangApi()
  const formTitle = formTitleProp ?? 'Đề xuất mua hàng'
  const soDonLabel = soDonLabelProp ?? 'Mã ĐX'
  const isViewMode = readOnly && initialDon != null
  const [editingFromView, setEditingFromView] = useState(false)
  const effectiveReadOnly = readOnly && !editingFromView
  const [nhaCungCapDisplay, setNhaCungCapDisplay] = useState(() => (isViewMode && initialDon ? initialDon.nha_cung_cap : ''))
  const [_nhaCungCapId, setNhaCungCapId] = useState<number | null>(null)
  const [diaChi, setDiaChi] = useState(() => (isViewMode && initialDon ? (initialDon.dia_chi ?? '') : ''))
  const [maSoThue, setMaSoThue] = useState(() => (isViewMode && initialDon ? (initialDon.ma_so_thue ?? '') : ''))
  const [dienGiai, setDienGiai] = useState(() => (isViewMode && initialDon ? (initialDon.dien_giai ?? '') : ''))
  const [nvMuaHang, setNvMuaHang] = useState(() => (isViewMode && initialDon ? (initialDon.nv_mua_hang ?? '') : ''))
  const [dieuKhoanTT, setDieuKhoanTT] = useState(() => (isViewMode && initialDon ? (initialDon.dieu_khoan_tt ?? '') : ''))
  const [soNgayDuocNo, setSoNgayDuocNo] = useState(() => (isViewMode && initialDon ? (initialDon.so_ngay_duoc_no ?? '0') : '0'))
  const [diaDiemGiaoHang, setDiaDiemGiaoHang] = useState(() => (isViewMode && initialDon ? (initialDon.dia_diem_giao_hang ?? '') : ''))
  const [dieuKhoanKhac, setDieuKhoanKhac] = useState(() => (isViewMode && initialDon ? (initialDon.dieu_khoan_khac ?? '') : ''))
  const [loaiDeXuat, setLoaiDeXuat] = useState(() => (isViewMode && initialDon ? (initialDon.so_chung_tu_cukcuk || 'Bổ sung VTHH') : 'Bổ sung VTHH'))
  const [tenDeXuatTu, setTenDeXuatTu] = useState(() => (isViewMode && initialDon ? (initialDon.de_xuat_tu_ten ?? '') : ''))
  const [ngayDonHang, setNgayDonHang] = useState<Date | null>(() => (isViewMode && initialDon ? parseIsoToDate(initialDon.ngay_don_hang) : new Date()))
  const [soDonHang, setSoDonHang] = useState(() => (isViewMode && initialDon ? initialDon.so_don_hang : api.soDonHangTiepTheo()))
  const [tinhTrang, setTinhTrang] = useState(() => (isViewMode && initialDon ? initialDon.tinh_trang : 'Đề xuất mới'))
  const [ngayGiaoHang, setNgayGiaoHang] = useState<Date | null>(() => (isViewMode && initialDon ? parseIsoToDate(initialDon.ngay_giao_hang) : null))
  /** Dòng grid: các key cột là string; _dvtOptions khi VTHH có đơn vị quy đổi; _vthh để lấy ĐG mua theo ĐVT khi đổi ĐVT */
  const [lines, setLines] = useState<GridLineRow[]>(() => (isViewMode && initialChiTiet && initialChiTiet.length > 0 ? chiTietToLines(initialChiTiet) : []))
  const [vatTuList, setVatTuList] = useState<VatTuHangHoaRecord[]>([])
  const [dvtList, setDvtList] = useState<{ ma_dvt: string; ten_dvt: string; ky_hieu?: string }[]>([])
  const [vthhDropdownRowIndex, setVthhDropdownRowIndex] = useState<number | null>(null)
  const [vthhDropdownRect, setVthhDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const vthhDropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownEmail, setDropdownEmail] = useState(false)
  const [nccList, setNccList] = useState<NhaCungCapRecord[]>([])
  const [nccDropdownOpen, setNccDropdownOpen] = useState(false)
  const [nccSearchKeyword, setNccSearchKeyword] = useState('')
  const [nccDropdownRect, setNccDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const [showThemNccForm, setShowThemNccForm] = useState(false)
  const [danhSachDKTT, setDanhSachDKTT] = useState<DieuKhoanThanhToanItem[]>([])
  const [dangLuu, setDangLuu] = useState(false)
  const [loi, setLoi] = useState('')
  const [deleteRowIndex, setDeleteRowIndex] = useState<number | null>(null)
  const [diaDiemGiaoHangDropdownOpen, setDiaDiemGiaoHangDropdownOpen] = useState(false)
  const [diaDiemGiaoHangDropdownRect, setDiaDiemGiaoHangDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const refDiaDiemGiaoHangWrap = useRef<HTMLDivElement>(null)
  const refEmail = useRef<HTMLDivElement>(null)
  const refNccWrap = useRef<HTMLDivElement>(null)
  const refNccInput = useRef<HTMLInputElement>(null)
  const focusNccWithoutDropdownRef = useRef(false)
  const draftLoadedRef = useRef(false)
  const editingEnrichedRef = useRef(false)
  const didSetSoDonRef = useRef(false)

  const toIsoDate = (d: Date | null): string => {
    if (!d) return ''
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  useEffect(() => {
    setDanhSachDKTT(loadDieuKhoanThanhToan())
  }, [])

  /** Đánh dấu form đang nhập dở để cảnh báo khi refresh (F5). Clean khi đóng hoặc lưu. */
  useEffect(() => {
    if (!effectiveReadOnly) setUnsavedChanges(true)
    return () => setUnsavedChanges(false)
  }, [effectiveReadOnly])

  /** Khi mở form thêm mới: gán số đơn hàng tiếp theo (chỉ một lần). */
  useEffect(() => {
    if (initialDon != null || didSetSoDonRef.current) return
    didSetSoDonRef.current = true
    setSoDonHang(api.soDonHangTiepTheo())
  }, [initialDon, api])

  /** Khi mở form thêm mới: đảm bảo reset toàn bộ (phòng form reuse state / key không đổi). Chạy một lần khi mount ở chế độ thêm. */
  useEffect(() => {
    if (initialDon != null) return
    api.clearDraft()
    draftLoadedRef.current = false
    setNhaCungCapDisplay('')
    setNhaCungCapId(null)
    setDiaChi('')
    setMaSoThue('')
    setDienGiai('')
    setNvMuaHang('')
    setDieuKhoanTT('')
    setSoNgayDuocNo('0')
    setDiaDiemGiaoHang('')
    setDieuKhoanKhac('')
    setLoaiDeXuat('Bổ sung VTHH')
    setTenDeXuatTu('')
    setNgayDonHang(new Date())
    setSoDonHang(api.soDonHangTiepTheo())
    setTinhTrang('Đề xuất mới')
    setNgayGiaoHang(null)
    setLines([])
    setLoi('')
    setNccSearchKeyword('')
    setNccDropdownOpen(false)
    setVthhDropdownRowIndex(null)
    setVthhDropdownRect(null)
  // Chỉ chạy một lần khi mount; initialDon null = chế độ thêm mới
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    nhaCungCapGetAll().then((data) => {
      if (!cancelled && Array.isArray(data)) setNccList(data)
    })
    return () => { cancelled = true }
  }, [])

  /** Khi mở đơn xem/sửa: đồng bộ _nhaCungCapId từ nccList theo tên NCC trong initialDon để dropdown địa điểm giao hàng tìm đúng. */
  useEffect(() => {
    if (!initialDon?.nha_cung_cap?.trim() || nccList.length === 0) return
    const name = (initialDon.nha_cung_cap ?? '').trim()
    const found = nccList.find((n) => (n.ten_ncc || '').trim() === name)
    if (found != null) setNhaCungCapId(found.id)
  }, [initialDon?.nha_cung_cap, nccList])

  /** Khi chuyển sang xem đơn khác (initialDon/initialChiTiet đổi) mà form vẫn mở: đồng bộ toàn bộ state từ props để hiển thị đúng đơn mới. */
  useEffect(() => {
    if (!readOnly || initialDon == null) return
    setNhaCungCapDisplay(initialDon.nha_cung_cap ?? '')
    setDiaChi(initialDon.dia_chi ?? '')
    setMaSoThue(initialDon.ma_so_thue ?? '')
    setDienGiai(initialDon.dien_giai ?? '')
    setNvMuaHang(initialDon.nv_mua_hang ?? '')
    setDieuKhoanTT(initialDon.dieu_khoan_tt ?? '')
    setSoNgayDuocNo(initialDon.so_ngay_duoc_no ?? '0')
    setDiaDiemGiaoHang(initialDon.dia_diem_giao_hang ?? '')
    setDieuKhoanKhac(initialDon.dieu_khoan_khac ?? '')
    setLoaiDeXuat(initialDon.so_chung_tu_cukcuk || 'Bổ sung VTHH')
    setTenDeXuatTu(initialDon.de_xuat_tu_ten ?? '')
    setNgayDonHang(parseIsoToDate(initialDon.ngay_don_hang))
    setSoDonHang(initialDon.so_don_hang)
    setTinhTrang(initialDon.tinh_trang)
    setNgayGiaoHang(parseIsoToDate(initialDon.ngay_giao_hang))
    if (initialChiTiet && initialChiTiet.length > 0) setLines(chiTietToLines(initialChiTiet))
    else setLines([])
    setEditingFromView(false)
  }, [readOnly, initialDon?.id, initialDon, initialChiTiet])

  useEffect(() => {
    if (nccDropdownOpen && refNccWrap.current) {
      const r = refNccWrap.current.getBoundingClientRect()
      setNccDropdownRect({ top: r.bottom, left: r.left, width: Math.max(r.width, 280) })
    } else {
      setNccDropdownRect(null)
    }
  }, [nccDropdownOpen])

  useEffect(() => {
    if (!nccDropdownOpen) return
    const onMouseDown = (e: MouseEvent) => {
      if (refNccWrap.current?.contains(e.target as Node)) return
      setNccDropdownOpen(false)
    }
    window.addEventListener('mousedown', onMouseDown)
    return () => window.removeEventListener('mousedown', onMouseDown)
  }, [nccDropdownOpen])

  useEffect(() => {
    if (diaDiemGiaoHangDropdownOpen && refDiaDiemGiaoHangWrap.current) {
      const r = refDiaDiemGiaoHangWrap.current.getBoundingClientRect()
      setDiaDiemGiaoHangDropdownRect({ top: r.bottom, left: r.left, width: Math.max(r.width, 280) })
    } else {
      setDiaDiemGiaoHangDropdownRect(null)
    }
  }, [diaDiemGiaoHangDropdownOpen])

  useEffect(() => {
    if (!diaDiemGiaoHangDropdownOpen) return
    const onMouseDown = (e: MouseEvent) => {
      if (refDiaDiemGiaoHangWrap.current?.contains(e.target as Node)) return
      setDiaDiemGiaoHangDropdownOpen(false)
    }
    window.addEventListener('mousedown', onMouseDown)
    return () => window.removeEventListener('mousedown', onMouseDown)
  }, [diaDiemGiaoHangDropdownOpen])

  useEffect(() => {
    let cancelled = false
    vatTuHangHoaGetAll().then((data) => {
      if (!cancelled && Array.isArray(data)) setVatTuList(data)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    donViTinhGetAll().then((data) => {
      if (!cancelled && Array.isArray(data)) setDvtList(data.map((r) => ({ ma_dvt: r.ma_dvt, ten_dvt: r.ten_dvt, ky_hieu: r.ky_hieu })))
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (vthhDropdownRef.current?.contains(e.target as Node)) return
      if ((e.target as HTMLElement).closest('[data-vthh-cell]')) return
      setVthhDropdownRowIndex(null)
      setVthhDropdownRect(null)
    }
    window.addEventListener('mousedown', onMouseDown)
    return () => window.removeEventListener('mousedown', onMouseDown)
  }, [vthhDropdownRowIndex])

  useEffect(() => {
    if (!refEmail.current) return
    const h = (e: MouseEvent) => {
      if (refEmail.current && !refEmail.current.contains(e.target as Node)) setDropdownEmail(false)
    }
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [])

  const handleChonNcc = (ncc: NhaCungCapRecord) => {
    setNhaCungCapId(ncc.id)
    setNhaCungCapDisplay(ncc.ten_ncc || '')
    setDiaChi(ncc.dia_chi || '')
    setMaSoThue(ncc.ma_so_thue || '')
    setDieuKhoanTT(ncc.dieu_khoan_tt || '')
    const dktt = danhSachDKTT.find((d) => d.ma === ncc.dieu_khoan_tt || d.ten === ncc.dieu_khoan_tt)
    if (dktt) setSoNgayDuocNo(String(dktt.so_ngay_duoc_no))
    const ddh = ncc.dia_diem_giao_hang
    setDiaDiemGiaoHang(Array.isArray(ddh) && ddh.length > 0 ? ddh[0] : (typeof ddh === 'string' ? ddh : '') || '')
  }

  /** ĐG mua theo ĐVT (tab ngầm định hoặc đơn vị quy đổi):
   * - Nếu ĐVT trùng ĐVT chính: lấy ở tab ngầm định — ĐG mua gần nhất = 0 thì lấy ĐG mua cố định, ngược lại > 0 thì lấy ĐG mua gần nhất.
   * - Nếu ĐVT trùng ĐV quy đổi: lấy ĐG mua trong dòng đơn vị quy đổi tương ứng (hoặc tính từ tỉ lệ nếu chưa nhập).
   */
  // (đã bỏ) helper tính ĐG mua theo ĐVT — hiện không dùng trong form đề xuất
  /** Build danh sách mã ĐVT để chọn: ĐVT chính + các đơn vị quy đổi (unique, giữ thứ tự) */
  const buildDvtOptions = (vthh: VatTuHangHoaRecord): string[] | undefined => {
    const main = (vthh.dvt_chinh ?? '').trim()
    const quyDoi = vthh.don_vi_quy_doi
    if (!Array.isArray(quyDoi) || quyDoi.length === 0) return undefined
    const codes = new Set<string>()
    if (main) codes.add(main)
    quyDoi.forEach((r) => { const d = (r.dvt ?? '').trim(); if (d) codes.add(d) })
    const arr = Array.from(codes)
    return arr.length > 1 ? arr : undefined
  }

  /** Nạp draft chỉ khi form thêm mới (không có initialDon), không ở chế độ xem. */
  useEffect(() => {
    if (initialDon != null || effectiveReadOnly || draftLoadedRef.current || vatTuList.length === 0) return
    const d = api.getDraft()
    if (!d || d.length === 0) return
    draftLoadedRef.current = true
    const enriched = d.map((l) => {
      const v = vatTuList.find((vt) => vt.ma === (l['Mã'] ?? '').trim())
      return {
        ...l,
        _vthh: v,
        _dvtOptions: v ? buildDvtOptions(v) : undefined,
      } as Record<string, string> & { _dvtOptions?: string[]; _vthh?: VatTuHangHoaRecord }
    })
    setLines(enriched)
  }, [vatTuList, effectiveReadOnly, initialDon])

  /** Lưu draft chỉ khi form thêm mới (không sửa đơn có sẵn), mỗi khi các dòng thay đổi. */
  useEffect(() => {
    if (initialDon != null || effectiveReadOnly || lines.length === 0) return
    api.setDraft(lines)
  }, [lines, effectiveReadOnly, initialDon])

  /** Khi bấm Sửa từ chế độ xem: gán _vthh và _dvtOptions cho từng dòng một lần (để đổi ĐVT cập nhật ĐG mua). */
  useEffect(() => {
    if (!editingFromView || editingEnrichedRef.current || vatTuList.length === 0) return
    editingEnrichedRef.current = true
    setLines((prev) =>
      prev.map((l) => {
        const v = vatTuList.find((vt) => vt.ma === (l['Mã'] ?? '').trim())
        return { ...l, _vthh: v, _dvtOptions: v ? buildDvtOptions(v) : undefined } as typeof prev[0]
      })
    )
  }, [editingFromView, vatTuList])

  const handleChonVthh = (vthh: VatTuHangHoaRecord, rowIndex: number) => {
    const next = [...lines]
    if (rowIndex < 0 || rowIndex >= next.length) return
    const row = { ...next[rowIndex] } as Record<string, string> & { _dvtOptions?: string[]; _vthh?: VatTuHangHoaRecord }
    row['Mã'] = vthh.ma
    row['Tên VTHH'] = vthh.ten ?? ''
    row['ĐVT'] = vthh.dvt_chinh ?? ''
    row._vthh = vthh
    const opts = buildDvtOptions(vthh)
    if (opts) row._dvtOptions = opts
    else delete row._dvtOptions
    next[rowIndex] = row
    setLines(next)
    setVthhDropdownRowIndex(null)
    setVthhDropdownRect(null)
  }

  const buildPayload = (): DeXuatMuaHangCreatePayload => {
    const chiTiet = lines
      .filter((line) => (line['Mã'] ?? '').trim() !== '')
      .map((line) => ({
        ma_hang: (line['Mã'] ?? '').trim(),
        ten_hang: (line['Tên VTHH'] ?? '').trim(),
        dvt: (line['ĐVT'] ?? '').trim(),
        so_luong: Math.max(0, parseFloatVN(line['Số lượng'] ?? '')),
        don_gia: 0,
        thanh_tien: 0,
        pt_thue_gtgt: null as number | null,
        tien_thue_gtgt: null as number | null,
        ghi_chu: (line['Ghi chú'] ?? '').trim(),
      }))
    return {
      tinh_trang: tinhTrang,
      ngay_don_hang: toIsoDate(ngayDonHang) || toIsoDate(new Date()),
      so_don_hang: soDonHang.trim() || 'DXMH',
      ngay_giao_hang: ngayGiaoHang ? toIsoDate(ngayGiaoHang) : null,
      nha_cung_cap: nhaCungCapDisplay.trim(),
      dia_chi: diaChi.trim(),
      ma_so_thue: maSoThue.trim(),
      dien_giai: dienGiai.trim(),
      nv_mua_hang: nvMuaHang.trim(),
      dieu_khoan_tt: dieuKhoanTT.trim(),
      so_ngay_duoc_no: soNgayDuocNo.trim() || '0',
      dia_diem_giao_hang: diaDiemGiaoHang.trim(),
      dieu_khoan_khac: dieuKhoanKhac.trim(),
      gia_tri_don_hang: 0,
      so_chung_tu_cukcuk: loaiDeXuat.trim(),
      de_xuat_tu_ten: tenDeXuatTu.trim(),
      chiTiet,
    }
  }

  /** Kiểm tra trước khi lưu: Nhà cung cấp bắt buộc, ít nhất một dòng chi tiết có Mã VTHH. */
  const validateBeforeSave = (): boolean => {
    if (!loaiDeXuat.trim()) {
      setLoi('Vui lòng chọn Loại đề xuất.')
      return false
    }
    if (!nhaCungCapDisplay.trim()) {
      setLoi('Vui lòng chọn Nhà cung cấp.')
      return false
    }
    if (!soDonHang.trim()) {
      setLoi(`${soDonLabel} không được để trống.`)
      return false
    }
    if (api.soDonHangExists(soDonHang.trim(), initialDon?.id)) {
      setLoi(`${soDonLabel} đã tồn tại trong hệ thống, không được trùng.`)
      return false
    }
    const hasDetail = lines.some((line) => (line['Mã'] ?? '').trim() !== '')
    if (!hasDetail) {
      setLoi('Đơn hàng phải có ít nhất một dòng vật tư hàng hóa.')
      return false
    }
    return true
  }

  /** Lưu toàn bộ dữ liệu đang hiển thị và đóng form. */
  const handleLuuVaDong = async () => {
    setLoi('')
    if (!validateBeforeSave()) return
    setDangLuu(true)
    try {
      const payload = buildPayload()
      if (initialDon) {
        api.put(initialDon.id, payload)
      } else {
        api.post(payload)
      }
      api.clearDraft()
      setUnsavedChanges(false)
      onSaved?.()
      onClose()
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Có lỗi xảy ra.')
    } finally {
      setDangLuu(false)
    }
  }

  /**
   * Lưu và tiếp tục (chỉ chế độ thêm mới):
   * 1. Lưu dữ liệu vào hệ thống
   * 2. Reset toàn bộ form như khi bấm Thêm mới
   * 3. Cho người dùng nhập tiếp dữ liệu đề xuất tiếp theo
   */
  const handleLuuVaTiepTuc = async () => {
    if (initialDon != null) return
    setLoi('')
    if (!validateBeforeSave()) return
    setDangLuu(true)
    try {
      const payload = buildPayload()
      api.post(payload)
      api.clearDraft()
      setUnsavedChanges(false)
      onSavedAndContinue?.()
      draftLoadedRef.current = false
      setNhaCungCapDisplay('')
      setNhaCungCapId(null)
      setDiaChi('')
      setMaSoThue('')
      setDienGiai('')
      setNvMuaHang('')
      setDieuKhoanTT('')
      setSoNgayDuocNo('0')
      setDiaDiemGiaoHang('')
      setDieuKhoanKhac('')
      setLoaiDeXuat('Bổ sung VTHH')
      setTenDeXuatTu('')
      setNgayDonHang(new Date())
      setSoDonHang(api.soDonHangTiepTheo())
      setTinhTrang('Đề xuất mới')
      setNgayGiaoHang(null)
      setLines([])
      setLoi('')
      setNccSearchKeyword('')
      setNccDropdownOpen(false)
      setVthhDropdownRowIndex(null)
      setVthhDropdownRect(null)
      focusNccWithoutDropdownRef.current = true
      setTimeout(() => refNccInput.current?.focus(), 100)
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Có lỗi xảy ra.')
    } finally {
      setDangLuu(false)
    }
  }

  const soDong = lines.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--bg-primary)' }}>
      <div style={titleBarWrap}>
        <div
          onMouseDown={onHeaderPointerDown}
          style={{ ...titleBarDrag, cursor: onHeaderPointerDown && dragging ? 'grabbing' : onHeaderPointerDown ? 'grab' : 'default' }}
        >
          {formTitle}{effectiveReadOnly ? ' - Chế độ xem' : ''}{nhaCungCapDisplay ? ` - ${nhaCungCapDisplay}` : ''}
        </div>
      </div>
      <div style={toolbarWrap}>
        <button type="button" style={toolbarBtn} title="Trước"><ChevronLeft size={14} /> Trước</button>
        <button type="button" style={toolbarBtn} title="Sau"><ChevronRight size={14} /> Sau</button>
        {readOnly && effectiveReadOnly && (
          <button type="button" style={toolbarBtnAccent} onClick={() => setEditingFromView(true)}><Pencil size={14} /> Sửa</button>
        )}
        {!effectiveReadOnly && (
          <>
            <button type="button" style={toolbarBtnAccent} onClick={handleLuuVaDong} disabled={dangLuu}><Save size={14} /> {dangLuu ? 'Đang lưu...' : 'Lưu'}</button>
            {initialDon == null && (
              <button type="button" style={toolbarBtn} onClick={handleLuuVaTiepTuc} disabled={dangLuu}><Save size={14} /> Lưu và tiếp tục</button>
            )}
          </>
        )}
        <button type="button" style={toolbarBtn} title="Đính kèm"><Paperclip size={14} /> Đính kèm</button>
        <button type="button" style={toolbarBtn}><FileText size={14} /> Mẫu</button>
        <button type="button" style={toolbarBtn}><Printer size={14} /> In</button>
        <div ref={refEmail} style={{ position: 'relative' }}>
          <button type="button" style={toolbarBtn} onClick={() => setDropdownEmail((v) => !v)}>
            <Mail size={14} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>Gửi email, Zalo <ChevronDown size={10} /></span>
          </button>
          {dropdownEmail && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 2, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10, minWidth: 120 }}>
              <button type="button" style={{ ...toolbarBtn, width: '100%', justifyContent: 'flex-start', border: 'none' }}>Email</button>
              <button type="button" style={{ ...toolbarBtn, width: '100%', justifyContent: 'flex-start', border: 'none' }}>Zalo</button>
            </div>
          )}
        </div>
        <button type="button" style={toolbarBtn}><HelpCircle size={14} /> Giúp</button>
        <button type="button" style={{ ...toolbarBtn, marginLeft: 'auto', color: 'var(--accent)' }} onClick={onClose} disabled={dangLuu}><Power size={14} /> Đóng</button>
      </div>
      {loi && (
        <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--accent)', background: 'rgba(255, 87, 34, 0.08)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
          {loi}
        </div>
      )}

      <Modal
        open={deleteRowIndex !== null}
        onClose={() => setDeleteRowIndex(null)}
        title="Xác nhận xóa"
        size="sm"
        footer={
          <>
            <button type="button" style={toolbarBtn} onClick={() => setDeleteRowIndex(null)}>Hủy</button>
            <button type="button" style={{ ...toolbarBtn, background: 'var(--accent)', color: 'var(--accent-text)', borderColor: 'var(--accent)' }} onClick={() => {
              const idx = deleteRowIndex
              if (idx === null) return
              setLines((prev) => prev.filter((_, i) => i !== idx))
              setDeleteRowIndex(null)
            }}>Đồng ý</button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)' }}>
          Bạn có chắc chắn muốn xóa dòng này?
        </p>
      </Modal>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '8px 12px' }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'row', gap: 16, marginBottom: 2, flexWrap: 'wrap' }}>
          <div style={{ ...groupBox, flex: 1, minWidth: 560 }}>
            <div style={groupBoxTitle}>Thông tin chung</div>
            <div style={fieldRow}>
              <label style={labelStyle}>Loại đề xuất</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                <div style={{ width: 'fit-content', flexShrink: 0 }}>
                  <select
                    style={{ ...inputStyle, width: 'auto', minWidth: 0 }}
                    value={loaiDeXuat}
                    onChange={(e) => setLoaiDeXuat(e.target.value)}
                    disabled={effectiveReadOnly}
                  >
                    <option value="Bổ sung VTHH">Bổ sung VTHH</option>
                    <option value="Báo giá">Báo giá</option>
                  </select>
                </div>
                <label style={{ ...labelStyle, minWidth: 80 }}>Tên đề xuất</label>
                <input
                  style={{ ...inputStyle, flex: 1, minWidth: 160 }}
                  value={tenDeXuatTu}
                  onChange={(e) => setTenDeXuatTu(e.target.value)}
                  readOnly={effectiveReadOnly}
                  disabled={effectiveReadOnly}
                  placeholder="Tên đề xuất"
                />
              </div>
            </div>
            <div style={fieldRow}>
              <label style={labelStyle}>Nhà cung cấp</label>
              <div ref={refNccWrap} style={{ flex: 1, minWidth: 0, display: 'flex', gap: 2, alignItems: 'center', position: 'relative', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}>
                <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}>
                  <input
                    ref={refNccInput}
                    style={{ ...inputStyle, ...lookupInputWithChevronStyle, flex: 1, minWidth: 0, cursor: effectiveReadOnly ? 'default' : 'pointer', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}
                    value={nccDropdownOpen ? nccSearchKeyword : nhaCungCapDisplay}
                    onChange={(e) => {
                      if (effectiveReadOnly) return
                      setNccSearchKeyword(e.target.value)
                      if (!nccDropdownOpen) setNccDropdownOpen(true)
                    }}
                    onFocus={() => {
                      if (effectiveReadOnly) return
                      if (focusNccWithoutDropdownRef.current) {
                        focusNccWithoutDropdownRef.current = false
                        return
                      }
                      setNccSearchKeyword(nhaCungCapDisplay)
                      setNccDropdownOpen(true)
                    }}
                    placeholder="Nhập để tìm hoặc chọn nhà cung cấp..."
                    readOnly={effectiveReadOnly}
                    disabled={effectiveReadOnly}
                  />
                  <span style={lookupChevronOverlayStyle} aria-hidden><ChevronDown size={12} style={{ color: 'var(--accent-text)' }} /></span>
                </div>
                <button type="button" style={lookupActionButtonStyle} title="Thêm nhà cung cấp" onClick={() => setShowThemNccForm(true)}><Plus size={12} /></button>
              </div>
              {nccDropdownOpen && nccDropdownRect && (
                <div
                  style={{
                    position: 'fixed',
                    top: nccDropdownRect.top,
                    left: nccDropdownRect.left,
                    width: nccDropdownRect.width,
                    maxHeight: 220,
                    overflowY: 'auto',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 4,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1050,
                  }}
                >
                  {nccList
                    .filter((ncc) => matchSearchKeyword(`${ncc.ma_ncc} ${ncc.ten_ncc}`, nccSearchKeyword))
                    .slice(0, 100)
                    .map((ncc) => (
                      <div
                        key={ncc.id}
                        role="option"
                        tabIndex={0}
                        style={{
                          padding: '6px 10px',
                          fontSize: 11,
                          cursor: 'pointer',
                          color: 'var(--text-primary)',
                          borderBottom: '1px solid var(--border)',
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          handleChonNcc(ncc)
                          setNccSearchKeyword(ncc.ten_ncc || '')
                          setNccDropdownOpen(false)
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{ncc.ma_ncc}</span>
                        {ncc.ten_ncc ? ` – ${ncc.ten_ncc}` : ''}
                      </div>
                    ))}
                  {nccList.filter((ncc) => matchSearchKeyword(`${ncc.ma_ncc} ${ncc.ten_ncc}`, nccSearchKeyword)).length === 0 && (
                    <div style={{ padding: '10px', fontSize: 11, color: 'var(--text-muted)' }}>Không tìm thấy nhà cung cấp phù hợp.</div>
                  )}
                </div>
              )}
            </div>
            <div style={fieldRow}><label style={labelStyle}>Địa chỉ</label><input style={inputStyle} value={diaChi} onChange={(e) => setDiaChi(e.target.value)} readOnly={effectiveReadOnly} disabled={effectiveReadOnly} /></div>
            <div style={fieldRow}><label style={labelStyle}>Mã số thuế</label><input style={inputStyle} value={maSoThue} onChange={(e) => setMaSoThue(e.target.value)} readOnly={effectiveReadOnly} disabled={effectiveReadOnly} /></div>
            <div style={fieldRow}><label style={labelStyle}>Ghi chú</label><input style={inputStyle} value={dienGiai} onChange={(e) => setDienGiai(e.target.value)} readOnly={effectiveReadOnly} disabled={effectiveReadOnly} /></div>
            <div style={{ ...fieldRow, flexWrap: 'nowrap', gap: 8, width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto', width: 'fit-content' }}>
                <label style={labelStyle}>NV mua hàng</label>
                <div style={{ width: 246, minWidth: 200, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex' }}>
                    <input style={{ ...inputStyle, ...lookupInputWithChevronStyle, minWidth: 120, flex: 1 }} value={nvMuaHang} onChange={(e) => setNvMuaHang(e.target.value)} readOnly={effectiveReadOnly} disabled={effectiveReadOnly} />
                    <span style={lookupChevronOverlayStyle} aria-hidden><ChevronDown size={12} style={{ color: 'var(--accent-text)' }} /></span>
                  </div>
                  <button type="button" style={lookupActionButtonStyle} title="Thêm"><Plus size={12} /></button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
                <label style={{ ...labelStyle, minWidth: 44 }}>ĐKTT</label>
                <div style={{ width: 140, minWidth: 100, position: 'relative', display: 'flex' }}>
                  <select style={{ ...inputStyle, ...lookupInputWithChevronStyle, flex: 1, minWidth: 0, appearance: 'none' }} value={dieuKhoanTT} onChange={(e) => { const val = e.target.value; setDieuKhoanTT(val); const d = danhSachDKTT.find((x) => x.ten === val || x.ma === val); if (d) setSoNgayDuocNo(String(d.so_ngay_duoc_no)); }} disabled={effectiveReadOnly}>
                    <option value="">-- Chọn --</option>
                    {danhSachDKTT.map((d) => <option key={d.ma + d.ten} value={d.ten}>{d.ten}</option>)}
                  </select>
                  <span style={lookupChevronOverlayStyle} aria-hidden><ChevronDown size={12} style={{ color: 'var(--accent-text)' }} /></span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto', marginLeft: 'auto' }}>
                <label style={{ ...labelStyle, minWidth: 90 }}>Số ngày được nợ</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 100 }}>
                  <input type="text" inputMode="numeric" className="htql-no-spinner" style={{ ...inputStyle, width: 80, minWidth: 80, maxWidth: 120, flex: 1, boxSizing: 'border-box' }} value={soNgayDuocNo} onChange={(e) => setSoNgayDuocNo(formatSoNguyenInput(e.target.value))} readOnly={effectiveReadOnly} disabled={effectiveReadOnly} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>ngày</span>
                </div>
              </div>
            </div>
            <div style={fieldRow}>
              <label style={labelStyle}>Địa điểm giao hàng</label>
              <div
                ref={refDiaDiemGiaoHangWrap}
                style={{ position: 'relative', flex: 1, display: 'flex', minWidth: 0 }}
                onClick={() => {
                  if (effectiveReadOnly) return
                  setDiaDiemGiaoHangDropdownOpen((v) => !v)
                }}
              >
                <input
                  className="misa-input-solo"
                  style={{ ...inputStyle, width: '100%', paddingRight: 28, boxSizing: 'border-box' }}
                  value={diaDiemGiaoHang}
                  onChange={(e) => setDiaDiemGiaoHang(e.target.value)}
                  onFocus={() => !effectiveReadOnly && setDiaDiemGiaoHangDropdownOpen(true)}
                  onClick={(e) => {
                    if (effectiveReadOnly) return
                    e.stopPropagation()
                    if (!diaDiemGiaoHangDropdownOpen) setDiaDiemGiaoHangDropdownOpen(true)
                  }}
                  readOnly={effectiveReadOnly}
                  disabled={effectiveReadOnly}
                  placeholder="Chọn từ nhà cung cấp hoặc nhập"
                />
                <span style={{ ...lookupChevronOverlayStyle, pointerEvents: 'none' }} aria-hidden>
                  <ChevronDown size={12} />
                </span>
              </div>
            </div>
          </div>

          <div style={{ ...groupBox, width: 240, flexShrink: 0 }}>
            <div style={groupBoxTitle}>Đơn hàng</div>
            <div style={fieldRow}>
              <label style={{ ...labelStyle, minWidth: 82 }}>Ngày tạo</label>
              <div style={{ width: 120, minWidth: 120, flex: '0 0 auto' }}>
                <DatePicker selected={ngayDonHang} onChange={(d: Date | null) => setNgayDonHang(d)} dateFormat="dd/MM/yyyy" locale="vi" showMonthDropdown showYearDropdown yearDropdownItemNumber={80} scrollableYearDropdown maxDate={new Date()} placeholderText="dd/mm/yyyy" className="htql-datepicker-inline" readOnly={effectiveReadOnly} disabled={effectiveReadOnly} />
              </div>
            </div>
            <div style={fieldRow}>
              <label style={{ ...labelStyle, minWidth: 82 }}>{soDonLabel}</label>
              <div style={{ width: 120, minWidth: 120, flex: '0 0 auto' }}>
                <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', cursor: 'default' }} value={soDonHang} readOnly disabled tabIndex={-1} />
              </div>
            </div>
            <div style={fieldRow}>
              <label style={{ ...labelStyle, minWidth: 82 }}>Tình trạng</label>
              <div style={{ flex: '0 0 auto' }}>
                <select className="htql-don-hang-select" style={{ ...inputStyle, width: 120, minWidth: 120, paddingRight: 6, boxSizing: 'border-box' }} value={tinhTrang} onChange={(e) => setTinhTrang(e.target.value)} disabled={effectiveReadOnly}>
                  {TINH_TRANG_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div style={fieldRow}>
              <label style={{ ...labelStyle, minWidth: 82 }}>Ngày giao hàng</label>
              <div style={{ width: 120, minWidth: 120, flex: '0 0 auto', marginLeft: -2 }}>
                <DatePicker selected={ngayGiaoHang} onChange={(d: Date | null) => setNgayGiaoHang(d)} dateFormat="dd/MM/yyyy" locale="vi" showMonthDropdown showYearDropdown yearDropdownItemNumber={80} scrollableYearDropdown placeholderText="dd/mm/yyyy" className="htql-datepicker-inline" readOnly={effectiveReadOnly} disabled={effectiveReadOnly} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 200 }}>
          <div style={gridWrap}>
            <div style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 36 }} />
                  {GRID_COLUMNS_VTHH.map((col) => (
                    <col key={col} style={colWidthStyle(col)} />
                  ))}
                  <col style={{ width: 28 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...gridThStyle, textAlign: 'center', width: 36 }}>STT</th>
                    {GRID_COLUMNS_VTHH.map((col) => (
                      <th key={col} style={{ ...gridThStyle, ...colWidthStyle(col), paddingLeft: 5, ...(col === 'Ghi chú' ? { borderRight: 'none' } : {}) }}>{col}</th>
                    ))}
                    <th style={{ ...gridThStyle, paddingLeft: 5, width: 28, borderLeft: 'none' }} />
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={GRID_COLUMNS_VTHH.length + 2} style={{ ...gridTdStyle, background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: 10, textAlign: 'center' }}>{effectiveReadOnly ? 'Chưa có dòng.' : 'Chưa có dòng. Bấm "Thêm dòng" để thêm.'}</td>
                    </tr>
                  ) : (
                    lines.map((line, idx) => (
                      <tr key={idx}>
                        <td style={{ ...gridTdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>{idx + 1}</td>
                        {GRID_COLUMNS_VTHH.map((col) => (
                          <td key={col} style={{ ...gridTdStyle, ...colWidthStyle(col), whiteSpace: col === 'Ghi chú' ? 'normal' : 'nowrap', ...(col === 'Ghi chú' ? { borderRight: 'none' } : {}) }} {...(col === 'Mã' && !effectiveReadOnly ? { 'data-vthh-cell': true } : {})}>
                            {effectiveReadOnly ? (
                              <input readOnly tabIndex={-1} className="misa-input-solo" style={{ ...inputStyle, width: '100%', border: '1px solid transparent', minHeight: 22, height: 22, cursor: 'default' }} value={col === 'ĐVT' ? dvtHienThiLabel(line['ĐVT'], dvtList) : (line[col] ?? '')} />
                            ) : col === 'Mã' ? (
                              <div style={{ position: 'relative', width: '100%', display: 'inline-block' }}>
                                <input
                                  className="misa-input-solo"
                                  style={{ ...inputStyle, width: '100%', paddingRight: 26, boxSizing: 'border-box', border: '1px solid transparent', minHeight: 22, height: 22 }}
                                  value={line[col] ?? ''}
                                  onChange={(e) => {
                                    const ma = e.target.value
                                    const r = [...lines]
                                    const item = vatTuList.find((o) => o.ma === ma)
                                    const cleared = !ma.trim()
                                    const prev = r[idx] as GridLineRow
                                    const nextRow = { ...prev, [col]: ma, 'Tên VTHH': cleared ? '' : (item ? item.ten : prev['Tên VTHH']), 'ĐVT': cleared ? '' : (item ? (item.dvt_chinh ?? '') : prev['ĐVT']) } as unknown as GridLineRow
                                    if (cleared || !item) {
                                      delete nextRow._dvtOptions
                                      delete nextRow._vthh
                                    } else {
                                      nextRow._vthh = item
                                      const opts = buildDvtOptions(item)
                                      if (opts) nextRow._dvtOptions = opts
                                      else delete nextRow._dvtOptions
                                    }
                                    r[idx] = nextRow
                                    setLines(r)
                                  }}
                                  onFocus={(e) => {
                                    const td = (e.target as HTMLElement).closest('td')
                                    if (td) {
                                      const rect = (td as HTMLElement).getBoundingClientRect()
                                      setVthhDropdownRect({ top: rect.bottom, left: rect.left, width: rect.width })
                                      setVthhDropdownRowIndex(idx)
                                    }
                                  }}
                                  onClick={(e) => {
                                    const td = (e.target as HTMLElement).closest('td')
                                    if (td) {
                                      const rect = (td as HTMLElement).getBoundingClientRect()
                                      setVthhDropdownRect({ top: rect.bottom, left: rect.left, width: rect.width })
                                      setVthhDropdownRowIndex(idx)
                                    }
                                  }}
                                  placeholder="Mã"
                                />
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    const td = (e.target as HTMLElement).closest('td')
                                    if (td) {
                                      const rect = (td as HTMLElement).getBoundingClientRect()
                                      setVthhDropdownRect({ top: rect.bottom, left: rect.left, width: rect.width })
                                      setVthhDropdownRowIndex(idx)
                                    }
                                  }}
                                  style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
                                  aria-hidden
                                >
                                  <ChevronDown size={12} />
                                </span>
                              </div>
                            ) : col === 'Tên VTHH' ? (
                              <input readOnly tabIndex={-1} className="misa-input-solo" style={{ ...inputStyle, width: '100%', cursor: 'default', border: '1px solid transparent', minHeight: 22, height: 22 }} value={line[col] ?? ''} />
                            ) : col === 'ĐVT' ? (
                              (() => {
                                const opts = line._dvtOptions
                                const hasDvtDropdown = Array.isArray(opts) && opts.length > 1
                                if (hasDvtDropdown) {
                                  return (
                                    <select
                                      className="misa-input-solo"
                                      style={{ ...inputStyle, width: '100%', minHeight: 22, height: 22, cursor: 'pointer' }}
                                      value={line['ĐVT'] ?? ''}
                                      onChange={(e) => {
                                        const r = [...lines]
                                        const row = r[idx] as GridLineRow
                                        r[idx] = { ...row, 'ĐVT': e.target.value } as unknown as GridLineRow
                                        setLines(r)
                                      }}
                                    >
                                      {opts.map((ma) => (
                                        <option key={ma} value={ma}>{dvtHienThiLabel(ma, dvtList)}</option>
                                      ))}
                                    </select>
                                  )
                                }
                                return (
                                  <input readOnly tabIndex={-1} className="misa-input-solo" style={{ ...inputStyle, width: '100%', cursor: 'default', border: '1px solid transparent', minHeight: 22, height: 22 }} value={dvtHienThiLabel(line['ĐVT'], dvtList)} />
                                )
                              })()
                            ) : col === 'Số lượng' ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                className="misa-input-solo htql-no-spinner"
                                style={{ ...inputStyle, width: 80, minWidth: 80, maxWidth: 80, boxSizing: 'border-box', border: '1px solid transparent', minHeight: 22, height: 22 }}
                                value={line[col] ?? ''}
                                onChange={(e) => {
                                  const r = [...lines]
                                  r[idx] = { ...r[idx], [col]: formatSoTuNhienInput(e.target.value) } as unknown as GridLineRow
                                  setLines(r)
                                }}
                                onBlur={() => {
                                  const raw = (line[col] ?? '').trim()
                                  if (raw === '') return
                                  const n = parseFloatVN(raw)
                                  const val = Number.isNaN(n) || n < 0 ? 0 : n
                                  const r = [...lines]
                                  r[idx] = { ...r[idx], [col]: formatSoTienHienThi(val) } as unknown as GridLineRow
                                  setLines(r)
                                }}
                              />
                            ) : col === 'Ghi chú' ? (
                              <input
                                className="misa-input-solo"
                                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', border: '1px solid transparent', minHeight: 22, height: 22 }}
                                value={line['Ghi chú'] ?? ''}
                                onChange={(e) => { const r = [...lines]; r[idx] = { ...r[idx], 'Ghi chú': e.target.value } as unknown as GridLineRow; setLines(r) }}
                                readOnly={effectiveReadOnly}
                                disabled={effectiveReadOnly}
                                placeholder="Ghi chú"
                              />
                            ) : (
                              <input
                                className="misa-input-solo"
                                style={{ ...inputStyle, width: '100%', border: '1px solid transparent', minHeight: 22, height: 22 }}
                                value={line[col] ?? ''}
                                onChange={(e) => { const r = [...lines]; r[idx] = { ...r[idx], [col]: e.target.value } as unknown as GridLineRow; setLines(r) }}
                              />
                            )}
                          </td>
                        ))}
                        <td style={{ ...gridTdStyle, textAlign: 'center', whiteSpace: 'nowrap', borderLeft: 'none' }}>
                          {!effectiveReadOnly && (
                            <button type="button" onClick={() => setDeleteRowIndex(idx)} style={{ padding: 2, background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title="Xóa dòng">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div style={{ padding: '4px 8px', fontSize: 11, color: 'var(--accent)', fontWeight: 600, borderTop: '0.5px solid var(--border)', background: 'var(--bg-tab)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                {!effectiveReadOnly && (
                  <button type="button" onClick={() => setLines([...lines, GRID_COLUMNS_VTHH.reduce<Record<string, string>>((acc, c) => ({ ...acc, [c]: '' }), {}) as unknown as GridLineRow])} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', fontSize: 10, background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                    <Plus size={12} /> Thêm dòng
                  </button>
                )}
                <span style={{ marginLeft: 'auto' }}>Số dòng = {lines.length}</span>
              </div>
            </div>
          </div>
        </div>
        </div>

        <div style={{ ...footerWrap, flexShrink: 0 }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Số chủng loại vật tư: {soDong}</span>
        </div>
      </div>


      {vthhDropdownRowIndex !== null && vthhDropdownRect && ReactDOM.createPortal(
        <div
          ref={vthhDropdownRef}
          style={{
            position: 'fixed',
            top: vthhDropdownRect.top,
            left: vthhDropdownRect.left,
            width: Math.max(vthhDropdownRect.width, 320),
            maxHeight: 240,
            overflow: 'auto',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1100,
            fontSize: 11,
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {(() => {
                const currentRowIdx = vthhDropdownRowIndex
                const searchText = (lines[currentRowIdx]?.['Mã'] ?? '').trim()
                // Loại trừ mã đã chọn ở các dòng khác
                let available = vatTuList.filter((item) => !lines.some((row, i) => i !== currentRowIdx && row['Mã'] === item.ma))
                // Khi đã chọn rồi bấm xổ xuống lại: không hiển thị lại mã đang chọn ở dòng này, chỉ hiển thị các lựa chọn khác để đổi
                const currentRowMa = (lines[currentRowIdx]?.['Mã'] ?? '').trim()
                if (currentRowMa) {
                  available = available.filter((item) => item.ma !== currentRowMa)
                }
                // Lọc theo từ khóa nhập (chỉ khi đang tìm kiếm, không trùng với mã hiện tại)
                if (searchText && searchText !== currentRowMa) {
                  available = available.filter((item) => matchSearchKeyword(item.ma ?? '', searchText) || matchSearchKeyword(item.ten ?? '', searchText))
                }
                return available.length === 0 ? (
                  <tr><td colSpan={2} style={{ ...tdChietKhau, padding: 8, color: 'var(--text-muted)' }}>{searchText ? 'Không tìm thấy NVL phù hợp' : 'Không còn NVL nào để chọn'}</td></tr>
                ) : (
                  available.map((item) => (
                    <tr
                      key={item.id}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-tab)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      onMouseDown={() => handleChonVthh(item, currentRowIdx)}
                    >
                      <td style={{ ...tdChietKhau, padding: '4px 8px' }}>{item.ma}</td>
                      <td style={{ ...tdChietKhau, padding: '4px 8px' }}>{item.ten}</td>
                    </tr>
                  ))
                )
              })()}
            </tbody>
          </table>
        </div>,
        document.body
      )}
      {diaDiemGiaoHangDropdownOpen && diaDiemGiaoHangDropdownRect && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            top: diaDiemGiaoHangDropdownRect.top,
            left: diaDiemGiaoHangDropdownRect.left,
            width: Math.max(diaDiemGiaoHangDropdownRect.width, 280),
            maxHeight: 220,
            overflowY: 'auto',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            zIndex: 1100,
            fontSize: 11,
          }}
        >
          {(() => {
            const currentNcc = nccList.find((n) => n.id === _nhaCungCapId || (n.ten_ncc || '').trim() === (nhaCungCapDisplay || '').trim())
            const options: string[] = Array.isArray(currentNcc?.dia_diem_giao_hang) ? currentNcc!.dia_diem_giao_hang! : []
            if (options.length === 0) {
              return (
                <div style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                  {currentNcc ? 'Nhà cung cấp chưa có địa điểm giao hàng. Nhập trực tiếp ở ô trên.' : 'Chọn nhà cung cấp để xem địa điểm giao hàng hoặc nhập tay.'}
                </div>
              )
            }
            return (
              <ul style={{ listStyle: 'none', margin: 0, padding: '4px 0' }}>
                {options.map((item, idx) => (
                  <li
                    key={idx}
                    style={{ padding: '6px 10px', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tab)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    onMouseDown={() => { setDiaDiemGiaoHang(item); setDiaDiemGiaoHangDropdownOpen(false) }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )
          })()}
        </div>,
        document.body
      )}
      {showThemNccForm && (
        <NhaCungCap
          embeddedAddMode
          onAddSuccess={(ncc) => {
            handleChonNcc(ncc)
            setShowThemNccForm(false)
          }}
          onClose={() => setShowThemNccForm(false)}
        />
      )}
    </div>
  )
}
