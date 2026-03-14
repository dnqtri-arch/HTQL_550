import { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Save,
  Trash2,
  RotateCcw,
  RefreshCw,
  Wrench,
  FileText,
  Printer,
  Mail,
  HelpCircle,
  Power,
  ChevronDown,
  Search,
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
import { formatSoNguyenInput, formatNumberDisplay, formatSoTien, formatSoTienHienThi, formatSoTuNhienInput, parseFloatVN } from '../../utils/numberFormat'
import { donMuaHangPost, donMuaHangPut, getDonMuaHangDraft, setDonMuaHangDraft, clearDonMuaHangDraft, type DonMuaHangCreatePayload, type DonMuaHangRecord, type DonMuaHangChiTiet } from './donMuaHangApi'
import { Modal } from '../../components/Modal'

registerLocale('vi', vi)

const FORM_FIELD_HEIGHT = LOOKUP_CONTROL_HEIGHT
const LABEL_MIN_WIDTH = 100
const FIELD_ROW_GAP = 6

const toolbarWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  padding: '6px 8px',
  background: 'var(--bg-tab)',
  borderBottom: '1px solid var(--border-strong)',
  flexWrap: 'wrap',
}

const toolbarBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 10px',
  fontSize: 11,
  fontFamily: 'var(--font-misa), Tahoma, Arial, sans-serif',
  background: 'var(--bg-tab)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  borderRadius: 4,
}

const toolbarBtnAccent: React.CSSProperties = {
  ...toolbarBtn,
  background: 'var(--accent)',
  color: 'var(--accent-text)',
  borderColor: 'var(--accent)',
}

const formTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: 'var(--text-primary)',
  marginBottom: 8,
  padding: '0 4px',
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

const tabsWrap: React.CSSProperties = {
  display: 'flex',
  gap: 0,
  borderBottom: '1px solid var(--border)',
  marginBottom: 0,
  flexShrink: 0,
}

const tabBtn: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: 11,
  fontFamily: 'var(--font-misa), Tahoma, Arial, sans-serif',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderBottom: 'none',
  marginBottom: -1,
  color: 'var(--text-primary)',
  cursor: 'pointer',
  borderRadius: '4px 4px 0 0',
  fontWeight: 500,
}

const tabBtnActive: React.CSSProperties = {
  ...tabBtn,
  background: 'var(--bg-tab-active)',
  color: 'var(--accent)',
  fontWeight: 700,
  borderColor: 'var(--border-strong)',
  boxShadow: '0 -1px 2px rgba(0,0,0,0.06)',
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
  padding: '6px 10px',
  background: 'var(--bg-tab)',
  borderTop: '1px solid var(--border)',
  fontSize: 11,
  flexWrap: 'wrap',
  gap: 8,
}

const hintBar: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 10,
  color: 'var(--text-muted)',
  background: 'var(--bg-secondary)',
  borderTop: '1px solid var(--border)',
}

export interface DonMuaHangFormProps {
  onClose: () => void
  onSaved?: () => void
  /** Kéo form (giống form Vật tư hàng hóa) */
  onHeaderPointerDown?: (e: React.MouseEvent) => void
  dragging?: boolean
  /** Chế độ xem: chỉ hiển thị, không sửa */
  readOnly?: boolean
  /** Dữ liệu đơn khi mở chế độ xem */
  initialDon?: DonMuaHangRecord | null
  initialChiTiet?: DonMuaHangChiTiet[] | null
}

const TINH_TRANG_OPTIONS = [
  { value: 'Chưa thực hiện', label: 'Chưa thực hiện' },
  { value: 'Đang thực hiện', label: 'Đang thực hiện' },
  { value: 'Hoàn thành', label: 'Hoàn thành' },
  { value: 'Hủy bỏ', label: 'Hủy bỏ' },
]

/** Các mức thuế suất GTGT thiết lập trước (dropdown % thuế GTGT) */
const THUE_SUAT_GTGT_OPTIONS = [
  { value: '', label: 'Chưa xác định' },
  { value: '0', label: '0%' },
  { value: '5', label: '5%' },
  { value: '8', label: '8%' },
  { value: '10', label: '10%' },
] as const

/** Các cột tab Vật tư hàng hóa (đủ theo yêu cầu) */
const GRID_COLUMNS_VTHH = [
  'Mã',
  'Tên VTHH',
  'ĐVT',
  'Số lượng',
  'ĐG mua',
  'Thành tiền',
  '% thuế GTGT',
  'Tiền thuế GTGT',
  'Tổng tiền',
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

/** Độ rộng cột: Mã/Tên VTHH/ĐVT rộng hơn; ĐG mua, Thành tiền, thuế, tổng tiền nhỏ lại */
function colWidthStyle(col: string): React.CSSProperties {
  if (col === 'Mã') return { width: 88, minWidth: 88 }
  if (col === 'Tên VTHH') return { minWidth: 220 }
  if (col === 'ĐVT') return { width: 64, minWidth: 64, maxWidth: 64 }
  if (col === 'Số lượng') return { width: 68, minWidth: 68 }
  if (col === 'ĐG mua') return { width: 100, minWidth: 100 }
  if (col === 'Thành tiền') return { width: 100, minWidth: 100 }
  if (col === '% thuế GTGT') return { width: 72, minWidth: 72 }
  if (col === 'Tiền thuế GTGT') return { width: 80, minWidth: 80 }
  if (col === 'Tổng tiền') return { width: 100, minWidth: 100 }
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

const titleBarStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderBottom: '1px solid var(--border)',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-primary)',
  background: 'var(--bg-tab)',
  cursor: 'grab',
  userSelect: 'none',
  flexShrink: 0,
}

function parseIsoToDate(iso: string | null): Date | null {
  if (!iso || !iso.trim()) return null
  const d = new Date(iso.trim())
  return Number.isNaN(d.getTime()) ? null : d
}

/** Kiểu một dòng grid: cột là string, thêm _dvtOptions và _vthh cho ĐVT quy đổi và ĐG mua */
type GridLineRow = Record<string, string> & { _dvtOptions?: string[]; _vthh?: VatTuHangHoaRecord }

function chiTietToLines(ct: DonMuaHangChiTiet[]): GridLineRow[] {
  return ct.map((c) => {
    const thanhTien = c.thanh_tien
    const tienThue = c.tien_thue_gtgt ?? 0
    return {
      'Mã': c.ma_hang,
      'Tên VTHH': c.ten_hang,
      'ĐVT': c.dvt,
      'Số lượng': formatSoTienHienThi(c.so_luong),
      'ĐG mua': formatSoTienHienThi(c.don_gia),
      'Thành tiền': formatSoTienHienThi(thanhTien),
      '% thuế GTGT': c.pt_thue_gtgt != null ? String(c.pt_thue_gtgt) : '',
      'Tiền thuế GTGT': formatSoTienHienThi(tienThue),
      'Tổng tiền': formatSoTienHienThi(thanhTien + tienThue),
    }
  })
}

export function DonMuaHangForm({ onClose, onSaved, onHeaderPointerDown, dragging, readOnly = false, initialDon, initialChiTiet }: DonMuaHangFormProps) {
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
  const [thamChieu, setThamChieu] = useState(() => (isViewMode && initialDon ? (initialDon.so_chung_tu_cukcuk ?? '') : ''))
  const [ngayDonHang, setNgayDonHang] = useState<Date | null>(() => (isViewMode && initialDon ? parseIsoToDate(initialDon.ngay_don_hang) : new Date()))
  const [soDonHang, setSoDonHang] = useState(() => (isViewMode && initialDon ? initialDon.so_don_hang : 'ĐMH00002'))
  const [tinhTrang, setTinhTrang] = useState(() => (isViewMode && initialDon ? initialDon.tinh_trang : 'Chưa thực hiện'))
  const [ngayGiaoHang, setNgayGiaoHang] = useState<Date | null>(() => (isViewMode && initialDon ? parseIsoToDate(initialDon.ngay_giao_hang) : null))
  const [tabActive, setTabActive] = useState<'hang-tien' | 'khac'>('hang-tien')
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
  const refEmail = useRef<HTMLDivElement>(null)
  const refNccWrap = useRef<HTMLDivElement>(null)
  const draftLoadedRef = useRef(false)
  const editingEnrichedRef = useRef(false)

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

  useEffect(() => {
    let cancelled = false
    nhaCungCapGetAll().then((data) => {
      if (!cancelled && Array.isArray(data)) setNccList(data)
    })
    return () => { cancelled = true }
  }, [])

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
  }

  /** ĐG mua theo ĐVT (tab ngầm định hoặc đơn vị quy đổi):
   * - Nếu ĐVT trùng ĐVT chính: lấy ở tab ngầm định — ĐG mua gần nhất = 0 thì lấy ĐG mua cố định, ngược lại > 0 thì lấy ĐG mua gần nhất.
   * - Nếu ĐVT trùng ĐV quy đổi: lấy ĐG mua trong dòng đơn vị quy đổi tương ứng (hoặc tính từ tỉ lệ nếu chưa nhập).
   */
  const getDonGiaMuaTheoDvt = (vthh: VatTuHangHoaRecord, dvtMa: string): string => {
    const dvtChinh = (vthh.dvt_chinh ?? '').trim()
    if (dvtMa === dvtChinh) {
      const latest = Number(vthh.gia_mua_gan_nhat) || 0
      const fixed = Number(vthh.don_gia_mua_co_dinh) || 0
      if (latest === 0) return fixed > 0 ? formatSoTienHienThi(fixed) : ''
      return formatSoTienHienThi(latest)
    }
    const quyDoi = vthh.don_vi_quy_doi ?? []
    const row = quyDoi.find((r) => (r.dvt ?? '').trim() === dvtMa)
    if (!row) return ''
    const giaMuaInput = (row.gia_mua ?? '').toString().trim()
    if (giaMuaInput) return formatSoTienHienThi(parseFloatVN(giaMuaInput))
    const base = Number(vthh.gia_mua_gan_nhat) || Number(vthh.don_gia_mua_co_dinh) || 0
    const tiLe = parseFloatVN(row.ti_le_quy_doi ?? '1')
    const phep = row.phep_tinh
    if (tiLe <= 0) return base > 0 ? formatSoTienHienThi(base) : ''
    let calculated = base
    if (phep === 'nhan') calculated = base * tiLe
    else if (phep === 'chia') calculated = base / tiLe
    return calculated > 0 ? formatSoTienHienThi(calculated) : ''
  }

  /** ĐG mua khi ĐVT là ĐVT chính (gọi từ handleChonVthh lúc mới chọn). */
  const getDonGiaHienThiWhenDvtChinh = (vthh: VatTuHangHoaRecord): string => {
    return getDonGiaMuaTheoDvt(vthh, vthh.dvt_chinh ?? '')
  }

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
    const d = getDonMuaHangDraft()
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
    setDonMuaHangDraft(lines)
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
    row['% thuế GTGT'] = vthh.thue_suat_gtgt ?? ''
    row['ĐG mua'] = getDonGiaHienThiWhenDvtChinh(vthh)
    row._vthh = vthh
    const opts = buildDvtOptions(vthh)
    if (opts) row._dvtOptions = opts
    else delete row._dvtOptions
    next[rowIndex] = row
    setLines(next)
    setVthhDropdownRowIndex(null)
    setVthhDropdownRect(null)
  }

  const buildPayload = (): DonMuaHangCreatePayload => {
    let giaTriDonHang = 0
    const chiTiet = lines
      .filter((line) => (line['Mã'] ?? '').trim() !== '')
      .map((line) => {
        const thanhTien = parseFloatVN(line['ĐG mua'] ?? '') * parseFloatVN(line['Số lượng'] ?? '')
        const ptRaw = (line['% thuế GTGT'] ?? '').trim()
        const pt = ptRaw === '' || ptRaw === 'Chưa xác định' ? null : parseFloatVN(ptRaw)
        const tienThue = pt != null ? (thanhTien * pt) / 100 : 0
        giaTriDonHang += thanhTien + tienThue
        return {
          ma_hang: (line['Mã'] ?? '').trim(),
          ten_hang: (line['Tên VTHH'] ?? '').trim(),
          dvt: (line['ĐVT'] ?? '').trim(),
          so_luong: Math.max(0, parseFloatVN(line['Số lượng'] ?? '')),
          don_gia: parseFloatVN(line['ĐG mua'] ?? ''),
          thanh_tien: thanhTien,
          pt_thue_gtgt: pt,
          tien_thue_gtgt: pt != null ? tienThue : null,
        }
      })
    return {
      tinh_trang: tinhTrang,
      ngay_don_hang: toIsoDate(ngayDonHang) || toIsoDate(new Date()),
      so_don_hang: soDonHang.trim() || 'DMH',
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
      gia_tri_don_hang: giaTriDonHang,
      so_chung_tu_cukcuk: thamChieu.trim(),
      chiTiet,
    }
  }

  /** Lưu toàn bộ dữ liệu đang hiển thị tại các trường. Đóng form sau khi lưu. */
  const handleLuu = async () => {
    setLoi('')
    if (!soDonHang.trim()) {
      setLoi('Số đơn hàng không được để trống.')
      return
    }
    setDangLuu(true)
    try {
      const payload = buildPayload()
      if (initialDon) {
        donMuaHangPut(initialDon.id, payload)
      } else {
        donMuaHangPost(payload)
      }
      clearDonMuaHangDraft()
      onSaved?.()
      onClose()
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Có lỗi xảy ra.')
    } finally {
      setDangLuu(false)
    }
  }

  /** Lưu toàn bộ dữ liệu đang hiển thị, không đóng form (tiếp tục nhập). */
  const handleLuuVaCat = async () => {
    setLoi('')
    if (!soDonHang.trim()) {
      setLoi('Số đơn hàng không được để trống.')
      return
    }
    setDangLuu(true)
    try {
      const payload = buildPayload()
      if (initialDon) {
        donMuaHangPut(initialDon.id, payload)
      } else {
        donMuaHangPost(payload)
      }
      clearDonMuaHangDraft()
      onSaved?.()
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Có lỗi xảy ra.')
    } finally {
      setDangLuu(false)
    }
  }

  const tongTienHang = 0
  const tienThue = 0
  const tienChietKhau = 0
  const tongTienThanhToan = tongTienHang + tienThue - tienChietKhau
  const soDong = lines.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--bg-primary)' }}>
      {onHeaderPointerDown && (
        <div
          onMouseDown={onHeaderPointerDown}
          style={{ ...titleBarStyle, cursor: dragging ? 'grabbing' : 'grab' }}
        >
          Đơn mua hàng{effectiveReadOnly ? ' - Chế độ xem' : ''}{nhaCungCapDisplay ? ` - ${nhaCungCapDisplay}` : ''}
        </div>
      )}
      <div style={toolbarWrap}>
        <button type="button" style={toolbarBtn} title="Trước"><ChevronLeft size={14} /> Trước</button>
        <button type="button" style={toolbarBtn} title="Sau"><ChevronRight size={14} /> Sau</button>
        <button type="button" style={toolbarBtn}><Plus size={14} /> Thêm</button>
        <button type="button" style={toolbarBtn}><Pencil size={14} /> Sửa</button>
        {readOnly && effectiveReadOnly && (
          <button type="button" style={toolbarBtnAccent} onClick={() => setEditingFromView(true)}><Pencil size={14} /> Sửa</button>
        )}
        {!effectiveReadOnly && (
          <>
            <button type="button" style={toolbarBtnAccent} onClick={handleLuu} disabled={dangLuu}><Save size={14} /> {dangLuu ? 'Đang lưu...' : 'Lưu'}</button>
            <button type="button" style={toolbarBtn} onClick={handleLuuVaCat} disabled={dangLuu}><Save size={14} /> Lưu và cất</button>
          </>
        )}
        <button type="button" style={toolbarBtn}><Trash2 size={14} /> Xóa</button>
        <button type="button" style={toolbarBtn}><RotateCcw size={14} /> Hoãn</button>
        <button type="button" style={toolbarBtn}><RefreshCw size={14} /> Nạp</button>
        <button type="button" style={toolbarBtn}><Wrench size={14} /> Tiện ích</button>
        <button type="button" style={toolbarBtn}><FileText size={14} /> Mẫu</button>
        <button type="button" style={toolbarBtn}><Printer size={14} /> In</button>
        <div ref={refEmail} style={{ position: 'relative' }}>
          <button type="button" style={toolbarBtn} onClick={() => setDropdownEmail((v) => !v)}>
            <Mail size={14} /> Gửi email, Zalo <ChevronDown size={12} />
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

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
        <h2 style={formTitle}>Đơn mua hàng</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, marginBottom: 12 }}>
          <div style={groupBox}>
            <div style={groupBoxTitle}>Thông tin chung</div>
            <div style={fieldRow}>
              <label style={labelStyle}>Nhà cung cấp</label>
              <div ref={refNccWrap} style={{ flex: 1, minWidth: 0, display: 'flex', gap: 2, alignItems: 'center', position: 'relative', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}>
                <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}>
                  <input
                    style={{ ...inputStyle, ...lookupInputWithChevronStyle, flex: 1, minWidth: 0, cursor: effectiveReadOnly ? 'default' : 'pointer', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}
                    value={nccDropdownOpen ? nccSearchKeyword : nhaCungCapDisplay}
                    onChange={(e) => {
                      if (effectiveReadOnly) return
                      setNccSearchKeyword(e.target.value)
                      if (!nccDropdownOpen) setNccDropdownOpen(true)
                    }}
                    onFocus={() => {
                      if (effectiveReadOnly) return
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
            <div style={fieldRow}><label style={labelStyle}>Diễn giải</label><input style={inputStyle} value={dienGiai} onChange={(e) => setDienGiai(e.target.value)} readOnly={effectiveReadOnly} disabled={effectiveReadOnly} /></div>
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
              <label style={labelStyle}>Tham chiếu</label>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 2, alignItems: 'center' }}>
                <input style={inputStyle} value={thamChieu} onChange={(e) => setThamChieu(e.target.value)} readOnly={effectiveReadOnly} disabled={effectiveReadOnly} />
                <button type="button" style={lookupActionButtonStyle} title="Tìm"><Search size={12} /></button>
                <button type="button" style={lookupActionButtonStyle}><Plus size={12} /></button>
              </div>
            </div>
          </div>

          <div style={{ ...groupBox, minWidth: 0, width: 'max-content', maxWidth: '100%' }}>
            <div style={groupBoxTitle}>Đơn hàng</div>
            <div style={fieldRow}>
              <label style={{ ...labelStyle, minWidth: 82 }}>Ngày tạo</label>
              <div style={{ width: 120, minWidth: 120, flex: '0 0 auto' }}>
                <DatePicker selected={ngayDonHang} onChange={(d: Date | null) => setNgayDonHang(d)} dateFormat="dd/MM/yyyy" locale="vi" showMonthDropdown showYearDropdown yearDropdownItemNumber={80} scrollableYearDropdown maxDate={new Date()} placeholderText="dd/mm/yyyy" className="htql-datepicker-inline" readOnly={effectiveReadOnly} disabled={effectiveReadOnly} />
              </div>
            </div>
            <div style={fieldRow}>
              <label style={{ ...labelStyle, minWidth: 82 }}>Số đơn hàng</label>
              <div style={{ width: 120, minWidth: 120, flex: '0 0 auto' }}>
                <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} value={soDonHang} onChange={(e) => setSoDonHang(e.target.value)} readOnly={effectiveReadOnly} disabled={effectiveReadOnly} />
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
          <div style={tabsWrap}>
            <button type="button" style={tabActive === 'hang-tien' ? tabBtnActive : tabBtn} onClick={() => setTabActive('hang-tien')}>1. Vật tư hàng hóa</button>
            <button type="button" style={tabActive === 'khac' ? tabBtnActive : tabBtn} onClick={() => setTabActive('khac')}>2. Khác</button>
          </div>
          <div style={gridWrap}>
            <div style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
              {tabActive === 'hang-tien' ? (
              <>
              <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th style={{ ...gridThStyle, textAlign: 'center' }}>STT</th>
                    {GRID_COLUMNS_VTHH.map((col) => (
                      <th key={col} style={{ ...gridThStyle, ...colWidthStyle(col), paddingLeft: 5 }}>{col}</th>
                    ))}
                    <th style={{ ...gridThStyle, paddingLeft: 5 }} />
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
                          <td key={col} style={{ ...gridTdStyle, ...colWidthStyle(col), whiteSpace: 'nowrap' }} {...(col === 'Mã' && !effectiveReadOnly ? { 'data-vthh-cell': true } : {})}>
                            {effectiveReadOnly ? (
                              <input readOnly tabIndex={-1} className="misa-input-solo" style={{ ...inputStyle, width: '100%', border: '1px solid transparent', minHeight: 22, height: 22, cursor: 'default' }} value={line[col] ?? ''} />
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
                                      if (cleared) nextRow['ĐG mua'] = ''
                                    } else {
                                      nextRow._vthh = item
                                      const opts = buildDvtOptions(item)
                                      if (opts) nextRow._dvtOptions = opts
                                      else delete nextRow._dvtOptions
                                      nextRow['ĐG mua'] = getDonGiaHienThiWhenDvtChinh(item)
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
                                        const newDvt = e.target.value
                                        let newDgMua = row['ĐG mua'] ?? ''
                                        if (row._vthh) newDgMua = getDonGiaMuaTheoDvt(row._vthh, newDvt)
                                        r[idx] = { ...row, 'ĐVT': newDvt, 'ĐG mua': newDgMua } as unknown as GridLineRow
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
                            ) : col === 'ĐG mua' ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                className="misa-input-solo htql-no-spinner"
                                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', border: '1px solid transparent', minHeight: 22, height: 22 }}
                                value={line['ĐG mua'] ?? ''}
                                onChange={(e) => {
                                  const r = [...lines]
                                  r[idx] = { ...r[idx], 'ĐG mua': formatSoTien(e.target.value) } as unknown as GridLineRow
                                  setLines(r)
                                }}
                              />
                            ) : col === 'Thành tiền' ? (
                              <input
                                readOnly
                                tabIndex={-1}
                                className="misa-input-solo"
                                style={{ ...inputStyle, width: '100%', cursor: 'default', border: '1px solid transparent', minHeight: 22, height: 22 }}
                                value={formatSoTienHienThi(parseFloatVN(line['ĐG mua'] ?? '') * parseFloatVN(line['Số lượng'] ?? ''))}
                              />
                            ) : col === 'Tiền thuế GTGT' ? (
                              <input
                                readOnly
                                tabIndex={-1}
                                className="misa-input-solo"
                                style={{ ...inputStyle, width: '100%', cursor: 'default', border: '1px solid transparent', minHeight: 22, height: 22 }}
                                value={formatSoTienHienThi((parseFloatVN(line['ĐG mua'] ?? '') * parseFloatVN(line['Số lượng'] ?? '') * parseFloatVN(line['% thuế GTGT'] ?? '')) / 100)}
                              />
                            ) : col === 'Tổng tiền' ? (
                              <input
                                readOnly
                                tabIndex={-1}
                                className="misa-input-solo"
                                style={{ ...inputStyle, width: '100%', cursor: 'default', border: '1px solid transparent', minHeight: 22, height: 22 }}
                                value={formatSoTienHienThi((() => {
                                  const thanhTien = parseFloatVN(line['ĐG mua'] ?? '') * parseFloatVN(line['Số lượng'] ?? '')
                                  const tienThueGTGT = (thanhTien * parseFloatVN(line['% thuế GTGT'] ?? '')) / 100
                                  return thanhTien + tienThueGTGT
                                })())}
                              />
                            ) : col === '% thuế GTGT' ? (
                              <select
                                className="misa-input-solo"
                                style={{ ...inputStyle, width: '100%', minHeight: 22, height: 22, cursor: 'pointer' }}
                                value={line['% thuế GTGT'] ?? ''}
                                onChange={(e) => {
                                  const r = [...lines]
r[idx] = { ...r[idx], '% thuế GTGT': e.target.value } as unknown as GridLineRow
                                setLines(r)
                              }}
                              >
                                {THUE_SUAT_GTGT_OPTIONS.map((o) => (
                                  <option key={o.value || 'empty'} value={o.value}>{o.label}</option>
                                ))}
                              </select>
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
                        <td style={{ ...gridTdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
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
                <span>Số dòng = {lines.length}</span>
                {!effectiveReadOnly && (
                  <button type="button" onClick={() => setLines([...lines, GRID_COLUMNS_VTHH.reduce<Record<string, string>>((acc, c) => ({ ...acc, [c]: '' }), {}) as unknown as GridLineRow])} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', fontSize: 10, background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                    <Plus size={12} /> Thêm dòng
                  </button>
                )}
              </div>
              </>
              ) : (
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={fieldRow}>
                  <label style={labelStyle}>Địa điểm giao hàng</label>
                  <div style={{ position: 'relative', flex: 1, display: 'flex', minWidth: 0 }}>
                    <input
                      className="misa-input-solo"
                      style={{ ...inputStyle, width: '100%', paddingRight: 28, boxSizing: 'border-box' }}
                      value={diaDiemGiaoHang}
                      onChange={(e) => setDiaDiemGiaoHang(e.target.value)}
                      readOnly={effectiveReadOnly}
                      disabled={effectiveReadOnly}
                      placeholder="Nhập địa điểm giao hàng"
                    />
                    <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: 'var(--text-muted)' }} aria-hidden>
                      <ChevronDown size={12} />
                    </span>
                  </div>
                </div>
                <div style={fieldRow}>
                  <label style={labelStyle}>Điều khoản khác</label>
                  <input
                    className="misa-input-solo"
                    style={inputStyle}
                    value={dieuKhoanKhac}
                    onChange={(e) => setDieuKhoanKhac(e.target.value)}
                    readOnly={effectiveReadOnly}
                    disabled={effectiveReadOnly}
                    placeholder="Nhập điều khoản khác"
                  />
                </div>
              </div>
              )}
            </div>
          </div>
        </div>

        <div style={footerWrap}>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Số dòng = {soDong}</span>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span>Tổng tiền hàng: <strong>{formatNumberDisplay(tongTienHang, 0)}</strong></span>
            <span>Tiền thuế: <strong>{formatNumberDisplay(tienThue, 0)}</strong></span>
            <span>Tiền chiết khấu: <strong>{formatNumberDisplay(tienChietKhau, 0)}</strong></span>
            <span>Tổng tiền thanh toán: <strong>{formatNumberDisplay(tongTienThanhToan, 0)}</strong></span>
          </div>
        </div>
      </div>

      <div style={hintBar}>F9 - Thêm nhanh, F3 - Tìm nhanh</div>

      {vthhDropdownRowIndex !== null && vthhDropdownRect && tabActive === 'hang-tien' && ReactDOM.createPortal(
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
