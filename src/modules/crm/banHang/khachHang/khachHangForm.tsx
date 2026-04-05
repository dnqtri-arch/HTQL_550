import { useState, useEffect, useMemo, useRef } from 'react'
import { ChevronDown, Globe, Plus } from 'lucide-react'
import { Modal } from '../../../../components/common/modal'
import { useToastOptional } from '../../../../context/toastContext'
import {
  type KhachHangRecord,
  type LoaiKhachHang,
  type TaiKhoanNganHangKhItem,
  type NhomKhachHangItem,
  type DieuKhoanThanhToanKhItem,
  khachHangPost,
  khachHangPut,
  khachHangMaTuDong,
  khachHangTrungMa,
  khachHangValidateTrung,
  type KhachHangTrungField,
  loadNhomKhachHang,
  saveNhomKhachHang,
  loadDieuKhoanThanhToanKh,
  saveDieuKhoanThanhToanKh,
} from './khachHangApi'
import { NhomKhachHangInlinePicker } from './nhomKhachHangInlinePicker'
import { ThemNhomKhNccModal } from './themNhomKhNccModal'
import { ThemDieuKhoanThanhToanModal } from './themDieuKhoanThanhToanModal'
import { DANH_SACH_QUOC_GIA } from '../../../../constants/countries'
import { LOOKUP_CONTROL_HEIGHT, lookupInputWithChevronStyle, lookupChevronOverlayStyle, lookupActionButtonStyle } from '../../../../constants/lookupControlStyles'
import { formFooterButtonCancel, formFooterButtonSave, formFooterButtonSaveAndAdd } from '../../../../constants/formFooterButtons'
import { DANH_SACH_TINH_THANH_VIET_NAM, MA_TINH_THEO_TEN } from '../../../../constants/provincesVietnam'
import { getWardsByProvinceCode } from './wardsApi'
import { suggestAddressVietnam, cleanAddressForDisplay } from './addressAutocompleteApi'
import { DiaDiemHangBlock } from '../../shared/diaDiemHangBlock'
import { lookupTaxCode } from './taxLookupApi'
import { getBanksVietnam, type BankItem } from './banksApi'
import { formatSoNguyenInput, formatSoTien, parseFloatVN, isZeroDisplay } from '../../../../utils/numberFormat'
import DatePicker, { registerLocale } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { vi } from 'date-fns/locale'
import { DatePickerCustomHeader } from '../../../../components/datePickerCustomHeader'
import { htqlDatePickerPopperTop } from '../../../../constants/datePickerPlacement'

registerLocale('vi', vi)

/** Tự chèn "/" thành dd/mm/yyyy khi gõ (tối đa 10 ký tự). */
function formatNgayCapWithSlashes(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`
}

/** Parse dd/mm/yyyy thành Date (trả về null nếu không hợp lệ). */
function parseDdMmYyyy(s: string): Date | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const d = parseInt(m[1], 10)
  const mo = parseInt(m[2], 10) - 1
  const y = parseInt(m[3], 10)
  if (d < 1 || d > 31 || mo < 0 || mo > 11 || y < 1900 || y > 2100) return null
  const date = new Date(y, mo, d)
  if (date.getFullYear() !== y || date.getMonth() !== mo || date.getDate() !== d) return null
  return date
}

/** Format ngày ISO (yyyy-mm-dd) sang dd/mm/yyyy để hiển thị. */
function formatIsoToDdMmYyyy(iso: string): string {
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return ''
  return `${m[3]}/${m[2]}/${m[1]}`
}

/** Chuẩn hóa chuỗi tiếng Việt để lọc (bỏ dấu, lowercase). */
function normalizeForFilter(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/** Lọc danh sách theo từ khóa (có chuẩn hóa tiếng Việt). */
function filterByKeyword<T>(list: T[], getLabel: (item: T) => string, keyword: string): T[] {
  if (!keyword.trim()) return list
  const k = normalizeForFilter(keyword)
  return list.filter((item) => normalizeForFilter(getLabel(item)).includes(k))
}

const btnSecondary: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: '11px',
  background: 'var(--bg-tab)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  cursor: 'pointer',
}

/** Chiều cao chuẩn ô nhập (đồng bộ toàn form, trùng LOOKUP_CONTROL_HEIGHT) */
const FORM_FIELD_HEIGHT = LOOKUP_CONTROL_HEIGHT
/** Khoảng cách giữa các hàng trường trong form */
const FORM_ROW_GAP = 8
/** Khoảng cách giữa các block/section (paddingTop, marginBottom) */
const FORM_SECTION_GAP = 8
/** Khoảng cách cột trong grid 2 cột */
const FORM_GRID_GAP = '8px 20px'

/** Hàng ngang: nhãn bên trái, ô nhập bên phải */
const fieldRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minHeight: FORM_FIELD_HEIGHT,
}

const labelMinWidth = 120

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
  textAlign: 'right',
  display: 'inline-block',
}

const inputStyle: React.CSSProperties = {
  padding: '4px 6px',
  fontSize: '11px',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  color: 'var(--text-primary)',
  height: FORM_FIELD_HEIGHT,
  minHeight: FORM_FIELD_HEIGHT,
  boxSizing: 'border-box',
}

type FormState = {
  ma_kh: string
  ten_kh: string
  loai_kh: LoaiKhachHang
  isNhaCungCap: boolean
  dia_chi: string
  nhom_kh: string
  ma_so_thue: string
  ma_dvqhns: string
  dien_thoai: string
  fax: string
  email: string
  website: string
  dien_giai: string
  dieu_khoan_tt: string
  so_ngay_duoc_no: string
  han_muc_no_kh: string
  nv_ban_hang: string
  tk_ngan_hang: string
  ten_ngan_hang: string
  nguoi_lien_he: string
  ngung_theo_doi: boolean
  tai_khoan_ngan_hang: TaiKhoanNganHangKhItem[]
  quoc_gia: string
  tinh_tp: string
  xa_phuong: string
  xung_ho: string
  ho_va_ten_lien_he: string
  chuc_danh: string
  dt_di_dong: string
  dtdd_khac: string
  dt_co_dinh: string
  dia_chi_lien_he: string
  dai_dien_theo_pl: string
  dia_diem_giao_hang: string[]
  dia_diem_nhan_hang: string[]
  dia_diem_nhan_trung_giao: boolean
  so_ho_chieu: string
  so_cccd: string
  ngay_cap: string
  noi_cap: string
  quyen_huyen: string
  gioi_tinh: string
}

const emptyBankRow: TaiKhoanNganHangKhItem = { so_tai_khoan: '', ten_ngan_hang: '', chi_nhanh: '', tinh_tp_ngan_hang: '', loai_tk: 'cong_ty', ten_nguoi_nhan: '' }

const emptyForm: FormState = {
  ma_kh: '',
  ten_kh: '',
  loai_kh: 'to_chuc',
  isNhaCungCap: false,
  dia_chi: '',
  nhom_kh: '',
  ma_so_thue: '',
  ma_dvqhns: '',
  dien_thoai: '',
  fax: '',
  email: '',
  website: '',
  dien_giai: '',
  dieu_khoan_tt: '',
  so_ngay_duoc_no: '0',
  han_muc_no_kh: '0',
  nv_ban_hang: '',
  tk_ngan_hang: '',
  ten_ngan_hang: '',
  nguoi_lien_he: '',
  ngung_theo_doi: false,
  tai_khoan_ngan_hang: [],
  quoc_gia: 'Việt Nam',
  tinh_tp: '',
  xa_phuong: '',
  xung_ho: '',
  ho_va_ten_lien_he: '',
  chuc_danh: '',
  dt_di_dong: '',
  dtdd_khac: '',
  dt_co_dinh: '',
  dia_chi_lien_he: '',
  dai_dien_theo_pl: '',
  dia_diem_giao_hang: [],
  dia_diem_nhan_hang: [],
  dia_diem_nhan_trung_giao: false,
  so_ho_chieu: '',
  so_cccd: '',
  ngay_cap: '',
  noi_cap: '',
  quyen_huyen: '',
  gioi_tinh: '',
}

function recordToForm(r: KhachHangRecord): FormState {
  return {
    ma_kh: r.ma_kh,
    ten_kh: r.ten_kh,
    loai_kh: r.loai_kh ?? 'to_chuc',
    isNhaCungCap: Boolean(r.isNhaCungCap),
    dia_chi: cleanAddressForDisplay(r.dia_chi ?? ''),
    nhom_kh: r.nhom_kh ?? '',
    ma_so_thue: r.ma_so_thue ?? '',
    ma_dvqhns: r.ma_dvqhns ?? '',
    dien_thoai: r.dien_thoai ?? '',
    fax: r.fax ?? '',
    email: r.email ?? '',
    website: r.website ?? '',
    dien_giai: r.dien_giai ?? '',
    dieu_khoan_tt: r.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: r.so_ngay_duoc_no != null ? formatSoNguyenInput(String(r.so_ngay_duoc_no)) : '0',
    han_muc_no_kh: r.han_muc_no_kh != null ? formatSoTien(String(r.han_muc_no_kh)) : '0',
    nv_ban_hang: r.nv_ban_hang ?? '',
    tk_ngan_hang: r.tk_ngan_hang ?? '',
    ten_ngan_hang: r.ten_ngan_hang ?? '',
    nguoi_lien_he: r.nguoi_lien_he ?? '',
    ngung_theo_doi: Boolean(r.ngung_theo_doi),
    tai_khoan_ngan_hang: Array.isArray(r.tai_khoan_ngan_hang) && r.tai_khoan_ngan_hang.length > 0
      ? r.tai_khoan_ngan_hang.map((b) => ({ ...b, loai_tk: b.loai_tk ?? 'cong_ty', ten_nguoi_nhan: b.ten_nguoi_nhan ?? '' }))
      : [],
    quoc_gia: r.quoc_gia ?? 'Việt Nam',
    tinh_tp: r.tinh_tp ?? '',
    xa_phuong: r.xa_phuong ?? '',
    xung_ho: r.xung_ho ?? '',
    ho_va_ten_lien_he: r.ho_va_ten_lien_he ?? '',
    chuc_danh: r.chuc_danh ?? '',
    dt_di_dong: r.dt_di_dong ?? '',
    dtdd_khac: r.dtdd_khac ?? '',
    dt_co_dinh: r.dt_co_dinh ?? '',
    dia_chi_lien_he: cleanAddressForDisplay(r.dia_chi_lien_he ?? ''),
    dai_dien_theo_pl: r.dai_dien_theo_pl ?? '',
    dia_diem_giao_hang: Array.isArray(r.dia_diem_giao_hang) ? r.dia_diem_giao_hang : [],
    dia_diem_nhan_hang: Array.isArray(r.dia_diem_nhan_hang) ? r.dia_diem_nhan_hang : [],
    dia_diem_nhan_trung_giao: Boolean(r.dia_diem_nhan_trung_giao),
    so_ho_chieu: r.so_ho_chieu ?? '',
    so_cccd: r.so_cccd ?? '',
    ngay_cap: r.ngay_cap ?? '',
    noi_cap: r.noi_cap ?? '',
    quyen_huyen: r.quyen_huyen ?? '',
    gioi_tinh: r.gioi_tinh ?? '',
  }
}

function formToPayload(f: FormState): Omit<KhachHangRecord, 'id'> {
  const soNoToiDa = parseFloatVN(f.han_muc_no_kh)
  const soNgayNo = f.so_ngay_duoc_no.trim() ? Math.max(0, Math.floor(parseFloatVN(f.so_ngay_duoc_no))) : undefined
  const bankList = f.tai_khoan_ngan_hang.filter(
    (r) => (r.so_tai_khoan ?? '').trim() || (r.ten_ngan_hang ?? '').trim() || (r.chi_nhanh ?? '').trim() || (r.tinh_tp_ngan_hang ?? '').trim() || (r.ten_nguoi_nhan ?? '').trim()
  )
  const firstBank = bankList[0]
  const diaDiemGiaoHang = f.dia_diem_giao_hang.filter((s) => (s ?? '').trim() !== '')
  const nhanSrc =
    f.isNhaCungCap && f.dia_diem_nhan_trung_giao ? f.dia_diem_giao_hang : f.dia_diem_nhan_hang
  const diaDiemNhanHang = nhanSrc.filter((s) => (s ?? '').trim() !== '')
  return {
    ma_kh: f.ma_kh.trim(),
    ten_kh: f.ten_kh.trim(),
    loai_kh: f.loai_kh,
    isNhaCungCap: f.isNhaCungCap,
    dia_chi: f.dia_chi.trim() || undefined,
    nhom_kh: f.nhom_kh.trim() || undefined,
    ma_so_thue: f.ma_so_thue.trim() || undefined,
    ma_dvqhns: f.ma_dvqhns.trim() || undefined,
    dien_thoai: f.dien_thoai.trim() || undefined,
    fax: f.fax.trim() || undefined,
    email: f.email.trim() || undefined,
    website: f.website.trim() || undefined,
    dien_giai: f.dien_giai.trim() || undefined,
    dieu_khoan_tt: f.dieu_khoan_tt.trim() || undefined,
    so_ngay_duoc_no: soNgayNo,
    han_muc_no_kh: Number.isNaN(soNoToiDa) ? 0 : soNoToiDa,
    nv_ban_hang: f.nv_ban_hang.trim() || undefined,
    tk_ngan_hang: firstBank?.so_tai_khoan?.trim() || undefined,
    ten_ngan_hang: firstBank?.ten_ngan_hang?.trim() || undefined,
    nguoi_lien_he: f.nguoi_lien_he.trim() || undefined,
    ngung_theo_doi: f.ngung_theo_doi,
    tai_khoan_ngan_hang: bankList.length > 0 ? bankList : undefined,
    quoc_gia: f.quoc_gia.trim() || undefined,
    tinh_tp: f.tinh_tp.trim() || undefined,
    xa_phuong: f.xa_phuong.trim() || undefined,
    xung_ho: f.xung_ho.trim() || undefined,
    ho_va_ten_lien_he: f.ho_va_ten_lien_he.trim() || undefined,
    chuc_danh: f.chuc_danh.trim() || undefined,
    dt_di_dong: f.dt_di_dong.trim() || undefined,
    dtdd_khac: f.dtdd_khac.trim() || undefined,
    dt_co_dinh: f.dt_co_dinh.trim() || undefined,
    dia_chi_lien_he: f.dia_chi_lien_he.trim() || undefined,
    dai_dien_theo_pl: f.dai_dien_theo_pl.trim() || undefined,
    dia_diem_nhan_hang: diaDiemNhanHang.length > 0 ? diaDiemNhanHang : undefined,
    dia_diem_giao_hang: f.isNhaCungCap && diaDiemGiaoHang.length > 0 ? diaDiemGiaoHang : undefined,
    dia_diem_nhan_trung_giao: f.isNhaCungCap ? f.dia_diem_nhan_trung_giao : undefined,
    so_ho_chieu: f.so_ho_chieu.trim() || undefined,
    so_cccd: f.so_cccd.trim() || undefined,
    ngay_cap: f.ngay_cap.trim() || undefined,
    noi_cap: f.noi_cap.trim() || undefined,
    quyen_huyen: f.quyen_huyen.trim() || undefined,
    gioi_tinh: f.gioi_tinh.trim() || undefined,
  }
}

/** Ô nhập Ngày cấp: tự thêm "/" khi gõ, value ưu tiên từ state đang gõ. */
function NgayCapCustomInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & {
    ngayCapTyping: string | null
    setNgayCapTyping: (v: string | null) => void
    formNgayCap: string
    setForm: React.Dispatch<React.SetStateAction<FormState>>
  }
) {
  const { ngayCapTyping, setNgayCapTyping, formNgayCap, setForm, value: _libValue, onChange: _libOnChange, ...rest } = props
  const displayValue = ngayCapTyping !== null ? ngayCapTyping : (formNgayCap ? formatIsoToDdMmYyyy(formNgayCap) : (_libValue as string) ?? '')
  return (
    <input
      {...rest}
      type="text"
      className="htql-datepicker-input"
      style={{ width: '100%', height: 24, minHeight: 24, padding: '4px 6px', fontSize: 11, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)', boxSizing: 'border-box' }}
      value={displayValue}
      onChange={(e) => {
        const formatted = formatNgayCapWithSlashes(e.target.value)
        setNgayCapTyping(formatted)
        if (formatted.length === 10) {
          const parsed = parseDdMmYyyy(formatted)
          if (parsed) {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            if (parsed.getTime() <= today.getTime()) {
              setForm((f) => ({ ...f, ngay_cap: parsed.toISOString().slice(0, 10) }))
              setNgayCapTyping(null)
            }
          }
        } else if (formatted.length === 0) {
          setForm((f) => ({ ...f, ngay_cap: '' }))
          setNgayCapTyping(null)
        }
      }}
    />
  )
}

export type KhachHangFormProps = {
  /** add | edit | clone — null đóng */
  modalOpen: 'add' | 'edit' | 'clone' | null
  /** Bản ghi nguồn khi sửa / nhân bản */
  sourceRow: KhachHangRecord | null
  danhSachNhom: NhomKhachHangItem[]
  setDanhSachNhom: React.Dispatch<React.SetStateAction<NhomKhachHangItem[]>>
  embeddedAddMode?: boolean
  onAddSuccess?: (ncc: KhachHangRecord) => void
  onClose: () => void
  onSaved: () => void | Promise<void>
}

export function KhachHangForm({
  modalOpen,
  sourceRow,
  danhSachNhom,
  setDanhSachNhom,
  embeddedAddMode,
  onAddSuccess,
  onClose,
  onSaved,
}: KhachHangFormProps) {
  const toastApi = useToastOptional()
  const showError = toastApi ? (m: string) => toastApi.showToast(m, 'error') : (m: string) => alert(m)
  const [wardsList, setWardsList] = useState<string[]>([])
  const [wardsLoading, setWardsLoading] = useState(false)
  const wardsFetchCodeRef = useRef<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  /** Lưu riêng form Tổ chức và Cá nhân để khi chuyển qua lại vẫn giữ nội dung (vd: mã số thuế đã lấy thông tin). */
  const [_formToChuc, setFormToChuc] = useState<FormState>(() => ({ ...emptyForm, loai_kh: 'to_chuc' }))
  const [_formCaNhan, setFormCaNhan] = useState<FormState>(() => ({ ...emptyForm, loai_kh: 'ca_nhan' }))
  const [tinhTpFilter, setTinhTpFilter] = useState('')
  const [xaPhuongFilter, setXaPhuongFilter] = useState('')
  const [openTinhTp, setOpenTinhTp] = useState(false)
  const [openXaPhuong, setOpenXaPhuong] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([])
  const [addressDropdownOpen, setAddressDropdownOpen] = useState(false)
  const [addressLoading, setAddressLoading] = useState(false)
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Gợi ý địa chỉ cho ô Địa chỉ (Cá nhân - Thông tin chung), hiển thị giống Địa điểm nhận hàng */
  const [diaChiCaNhanSuggestions, setDiaChiCaNhanSuggestions] = useState<string[]>([])
  const [diaChiCaNhanDropdownOpen, setDiaChiCaNhanDropdownOpen] = useState(false)
  const [diaChiCaNhanLoading, setDiaChiCaNhanLoading] = useState(false)
  const diaChiCaNhanDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const diaChiCaNhanWrapRef = useRef<HTMLDivElement>(null)
  const [layThongTinLoading, setLayThongTinLoading] = useState(false)
  const [diaDiemGiaoSuggestions, setDiaDiemGiaoSuggestions] = useState<string[]>([])
  const [diaDiemGiaoRowIndex, setDiaDiemGiaoRowIndex] = useState<number | null>(null)
  const [diaDiemGiaoLoading, setDiaDiemGiaoLoading] = useState(false)
  const diaDiemGiaoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [diaDiemNhanSuggestions, setDiaDiemNhanSuggestions] = useState<string[]>([])
  const [diaDiemNhanRowIndex, setDiaDiemNhanRowIndex] = useState<number | null>(null)
  const [diaDiemNhanLoading, setDiaDiemNhanLoading] = useState(false)
  const diaDiemNhanDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [loi, setLoi] = useState('')
  const [formTab, setFormTab] = useState<'thong_tin_chung' | 'khac'>('thong_tin_chung')
  const [openNhomKhDropdown, setOpenNhomKhDropdown] = useState(false)
  const nhomKhWrapRef = useRef<HTMLDivElement>(null)
  const [showThemNhomKhModal, setShowThemNhomKhModal] = useState(false)
  const [banksList, setBanksList] = useState<BankItem[]>([])
  const [banksLoading, setBanksLoading] = useState(false)
  const [bankDropdownRow, setBankDropdownRow] = useState<number | null>(null)
  const [bankFilter, setBankFilter] = useState('')
  /** DKTT: dropdown (Tổ chức / Cá nhân) và modal Thêm */
  const [danhSachDKTT, setDanhSachDKTT] = useState<DieuKhoanThanhToanKhItem[]>(() => loadDieuKhoanThanhToanKh())
  const [openDkttDropdownToChuc, setOpenDkttDropdownToChuc] = useState(false)
  const [openDkttDropdownCaNhan, setOpenDkttDropdownCaNhan] = useState(false)
  const [showThemDieuKhoanTT, setShowThemDieuKhoanTT] = useState(false)
  const dkttToChucRef = useRef<HTMLDivElement>(null)
  const dkttCaNhanRef = useRef<HTMLDivElement>(null)
  const tinhTpWrapRef1 = useRef<HTMLDivElement>(null)
  const tinhTpWrapRef2 = useRef<HTMLDivElement>(null)
  const xaPhuongWrapRef1 = useRef<HTMLDivElement>(null)
  const xaPhuongWrapRef2 = useRef<HTMLDivElement>(null)
  const bankDropdownWrapRef = useRef<HTMLDivElement>(null)
  const bankDropdownSelectedOptionRef = useRef<HTMLDivElement>(null)
  /** Refs cho trường trùng (focus khi báo lỗi Lưu) */
  const refMaSoThue = useRef<HTMLInputElement | null>(null)
  /** Refs cho focus khi thiếu trường bắt buộc (*) */
  const refTenKh = useRef<HTMLInputElement | null>(null)
  const refMaKh = useRef<HTMLInputElement | null>(null)
  const refSoCccd = useRef<HTMLInputElement | null>(null)
  const refDtDiDong = useRef<HTMLInputElement | null>(null)
  const refDtCoDinh = useRef<HTMLInputElement | null>(null)
  const refEmail = useRef<HTMLInputElement | null>(null)
  const [errorFieldTrung, setErrorFieldTrung] = useState<KhachHangTrungField | null>(null)
  /** Ô Ngày cấp: chuỗi đang gõ (có tự thêm "/"). Null = đang dùng value từ lịch. */
  const [ngayCapTyping, setNgayCapTyping] = useState<string | null>(null)

  /** Tab Khác — Tổ chức: xưng hô Ông/Anh → Nam; Bà/Chị → Nữ */
  useEffect(() => {
    if (form.loai_kh !== 'to_chuc' || formTab !== 'khac') return
    const x = form.xung_ho
    if (x === 'Ông' || x === 'Anh') setForm((f) => ({ ...f, gioi_tinh: 'Nam' }))
    else if (x === 'Bà' || x === 'Chị') setForm((f) => ({ ...f, gioi_tinh: 'Nữ' }))
  }, [form.xung_ho, form.loai_kh, formTab])

  /** Đóng dropdown DKTT (Tổ chức) khi bấm ra ngoài */
  useEffect(() => {
    if (!openDkttDropdownToChuc) return
    const onMouseDown = (e: MouseEvent) => {
      if (dkttToChucRef.current && !dkttToChucRef.current.contains(e.target as Node)) {
        setOpenDkttDropdownToChuc(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [openDkttDropdownToChuc])

  /** Đóng dropdown DKTT (Cá nhân) khi bấm ra ngoài */
  useEffect(() => {
    if (!openDkttDropdownCaNhan) return
    const onMouseDown = (e: MouseEvent) => {
      if (dkttCaNhanRef.current && !dkttCaNhanRef.current.contains(e.target as Node)) {
        setOpenDkttDropdownCaNhan(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [openDkttDropdownCaNhan])

  /** Đóng dropdown Tỉnh/TP khi bấm ra ngoài */
  useEffect(() => {
    if (!openTinhTp) return
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (!tinhTpWrapRef1.current?.contains(target) && !tinhTpWrapRef2.current?.contains(target)) {
        setOpenTinhTp(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [openTinhTp])

  /** Đóng dropdown Xã/Phường khi bấm ra ngoài */
  useEffect(() => {
    if (!openXaPhuong) return
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (!xaPhuongWrapRef1.current?.contains(target) && !xaPhuongWrapRef2.current?.contains(target)) {
        setOpenXaPhuong(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [openXaPhuong])

  /** Đóng dropdown Tên ngân hàng (theo dòng) khi bấm ra ngoài */
  useEffect(() => {
    if (bankDropdownRow === null) return
    const onMouseDown = (e: MouseEvent) => {
      if (bankDropdownWrapRef.current && !bankDropdownWrapRef.current.contains(e.target as Node)) {
        setBankDropdownRow(null)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [bankDropdownRow])

  /** Focus vào trường bị trùng sau khi hiển thị lỗi (chuyển tab/loại nếu cần rồi focus) */
  const focusTrungField = (field: KhachHangTrungField) => {
    setFormTab('thong_tin_chung')
    if (field === 'ma_so_thue') {
      setForm((f) => ({ ...f, loai_kh: 'to_chuc' }))
    }
    if (field === 'so_cccd' || field === 'dt_di_dong' || field === 'dt_co_dinh') {
      setForm((f) => ({ ...f, loai_kh: 'ca_nhan' }))
    }
    const refMap = {
      ma_so_thue: refMaSoThue,
      so_cccd: refSoCccd,
      dt_di_dong: refDtDiDong,
      dt_co_dinh: refDtCoDinh,
      email: refEmail,
    }
    const ref = refMap[field]
    setTimeout(() => {
      ref.current?.focus()
      ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  /** Đóng dropdown Địa chỉ (Cá nhân) khi bấm ra ngoài */
  useEffect(() => {
    if (!diaChiCaNhanDropdownOpen) return
    const onMouseDown = (e: MouseEvent) => {
      if (diaChiCaNhanWrapRef.current && !diaChiCaNhanWrapRef.current.contains(e.target as Node)) {
        setDiaChiCaNhanDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [diaChiCaNhanDropdownOpen])

  /** Cuộn dropdown Tên ngân hàng tới dòng đang chọn khi mở */
  useEffect(() => {
    if (bankDropdownRow === null) return
    const t = requestAnimationFrame(() => {
      bankDropdownSelectedOptionRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
    })
    return () => cancelAnimationFrame(t)
  }, [bankDropdownRow])

  /** Hiển thị tại ô Nhóm khách hàng: các tên đã chọn */
  const displayNhomKhachHang = useMemo(() => {
    const parts = (form.nhom_kh || '').split(/[;,]/).map((s) => s.trim()).filter(Boolean)
    if (parts.length === 0) return ''
    return parts
      .map((tenStored) => {
        const item = danhSachNhom.find((n) => n.ten === tenStored)
        return item ? item.ten : tenStored
      })
      .join('; ')
  }, [form.nhom_kh, danhSachNhom])

  /** Danh sách tỉnh/thành phố đã lọc theo từ khóa (combobox Tỉnh/TP). */
  const tinhTpFiltered = useMemo(
    () => filterByKeyword(DANH_SACH_TINH_THANH_VIET_NAM, (t) => t, tinhTpFilter),
    [tinhTpFilter]
  )
  /** Danh sách xã/phường đã lọc theo từ khóa (combobox Xã/Phường). */
  const xaPhuongFiltered = useMemo(
    () => filterByKeyword(wardsList, (w) => w, xaPhuongFilter),
    [wardsList, xaPhuongFilter]
  )
  /** Danh sách ngân hàng đã lọc (gợi ý Tên ngân hàng). */
  const banksFiltered = useMemo(
    () => filterByKeyword(banksList, (b) => `${b.name} ${b.shortName} ${b.code}`, bankFilter),
    [banksList, bankFilter]
  )
  const banksForDropdown = useMemo(
    () => (bankFilter.trim() ? banksFiltered : banksList),
    [bankFilter, banksFiltered, banksList]
  )
  /** Hiển thị "Tên viết tắt - Tên đầy đủ" khi đã chọn ngân hàng (vẫn lưu full name vào ten_ngan_hang). */
  const getDisplayBankName = (name: string) => {
    const b = banksList.find((x) => x.name === name)
    return b ? (b.shortName ? `${b.shortName} - ${b.name}` : b.name) : name
  }

  /** Mở form: nạp state theo mode (add lấy mã tự động; edit/clone từ sourceRow). */
  useEffect(() => {
    if (!modalOpen) return
    let cancelled = false
    const run = async () => {
      setLoi('')
      setFormTab('thong_tin_chung')
      setErrorFieldTrung(null)
      setNgayCapTyping(null)
      if (modalOpen === 'add') {
        const ma = await khachHangMaTuDong()
        if (cancelled) return
        const baseToChuc: FormState = { ...emptyForm, loai_kh: 'to_chuc', ma_kh: ma }
        const baseCaNhan: FormState = { ...emptyForm, loai_kh: 'ca_nhan', ma_kh: ma }
        setFormToChuc(baseToChuc)
        setFormCaNhan(baseCaNhan)
        setForm(baseToChuc)
        return
      }
      const row = sourceRow
      if (!row) return
      if (modalOpen === 'edit') {
        const r = recordToForm(row)
        setForm(r)
        if (row.loai_kh === 'to_chuc') {
          setFormToChuc(r)
          setFormCaNhan({ ...emptyForm, loai_kh: 'ca_nhan', ma_kh: row.ma_kh } as FormState)
        } else {
          setFormCaNhan(r)
          setFormToChuc({ ...emptyForm, loai_kh: 'to_chuc', ma_kh: row.ma_kh } as FormState)
        }
        return
      }
      if (modalOpen === 'clone') {
        const newMa = await khachHangMaTuDong()
        if (cancelled) return
        const cloned = { ...recordToForm(row), ma_kh: newMa, ten_kh: row.ten_kh + ' (bản sao)' }
        if (row.loai_kh === 'to_chuc') {
          setFormToChuc(cloned)
          setFormCaNhan({ ...emptyForm, loai_kh: 'ca_nhan', ma_kh: newMa } as FormState)
          setForm(cloned)
        } else {
          setFormCaNhan(cloned)
          setFormToChuc({ ...emptyForm, loai_kh: 'to_chuc', ma_kh: newMa } as FormState)
          setForm(cloned)
        }
      }
    }
    void run()
    return () => { cancelled = true }
  }, [modalOpen, sourceRow?.id])

  useEffect(() => {
    setBanksLoading(true)
    getBanksVietnam()
      .then((list) => setBanksList(list))
      .finally(() => setBanksLoading(false))
  }, [])

  useEffect(() => {
    if (form.quoc_gia !== 'Việt Nam' || !form.tinh_tp) {
      setWardsList([])
      setWardsLoading(false)
      wardsFetchCodeRef.current = null
      return
    }
    const code = MA_TINH_THEO_TEN[form.tinh_tp]
    if (!code) {
      setWardsList([])
      setWardsLoading(false)
      wardsFetchCodeRef.current = null
      return
    }
    setWardsList([])
    setWardsLoading(true)
    wardsFetchCodeRef.current = code
    getWardsByProvinceCode(code)
      .then((list) => {
        if (wardsFetchCodeRef.current !== code) return
        setWardsList(list)
        setWardsLoading(false)
      })
      .catch(() => {
        if (wardsFetchCodeRef.current === code) setWardsLoading(false)
      })
  }, [form.quoc_gia, form.tinh_tp])

  const dongModal = () => {
    setLoi('')
    setFormTab('thong_tin_chung')
    setErrorFieldTrung(null)
    onClose()
  }

  const themDongNganHang = () => {
    setForm((f) => ({ ...f, tai_khoan_ngan_hang: [...f.tai_khoan_ngan_hang, { ...emptyBankRow }] }))
  }
  const capNhatDongNganHang = (index: number, field: keyof TaiKhoanNganHangKhItem, value: string) => {
    setForm((f) => ({
      ...f,
      tai_khoan_ngan_hang: f.tai_khoan_ngan_hang.map((r, i) =>
        i === index ? { ...r, [field]: value } : r
      ),
    }))
  }
  const xoaDongNganHang = (index: number) => {
    setForm((f) => ({ ...f, tai_khoan_ngan_hang: f.tai_khoan_ngan_hang.filter((_, i) => i !== index) }))
  }

  const validateForm = () => {
    const ma = form.ma_kh.trim()
    const ten = form.ten_kh.trim()
    if (!ten) {
      setLoi('Vui lòng nhập các trường bắt buộc (có dấu *). Tên khách hàng là bắt buộc.')
      setFormTab('thong_tin_chung')
      setTimeout(() => refTenKh.current?.focus(), 0)
      return null
    }
    if (!ma) {
      setLoi('Vui lòng nhập các trường bắt buộc (có dấu *). Mã khách hàng là bắt buộc.')
      setFormTab('thong_tin_chung')
      setTimeout(() => refMaKh.current?.focus(), 0)
      return null
    }
    const idBoQua = modalOpen === 'edit' ? sourceRow?.id : undefined
    if (khachHangTrungMa(ma, idBoQua)) {
      setLoi('Mã khách hàng đã tồn tại.')
      setFormTab('thong_tin_chung')
      setTimeout(() => refMaKh.current?.focus(), 0)
      return null
    }
    setLoi('')
    return true
  }

  const dongY = async () => {
    if (!validateForm()) return
    const payload = formToPayload(form)
    const trungResult = await khachHangValidateTrung(
      { ma_so_thue: payload.ma_so_thue, so_cccd: payload.so_cccd, dt_di_dong: payload.dt_di_dong, dt_co_dinh: payload.dt_co_dinh, dtdd_khac: payload.dtdd_khac, email: payload.email },
      modalOpen === 'edit' ? sourceRow?.id : undefined
    )
    if (!trungResult.valid && trungResult.field && trungResult.message) {
      setLoi(trungResult.message)
      setErrorFieldTrung(trungResult.field)
      focusTrungField(trungResult.field)
      showError(trungResult.message)
      return
    }
    setErrorFieldTrung(null)
    setLoi('')
    try {
      if (modalOpen === 'add' || modalOpen === 'clone') {
        const created = await khachHangPost(payload)
        if (embeddedAddMode && onAddSuccess) {
          onAddSuccess(created)
        }
      } else if (modalOpen === 'edit' && sourceRow) {
        await khachHangPut(sourceRow.id, payload)
      }
      await onSaved()
      dongModal()
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Có lỗi xảy ra.')
    }
  }

  const dongYVaThem = async () => {
    if (!validateForm()) return
    const payload = formToPayload(form)
    const trungResult = await khachHangValidateTrung(
      { ma_so_thue: payload.ma_so_thue, so_cccd: payload.so_cccd, dt_di_dong: payload.dt_di_dong, dt_co_dinh: payload.dt_co_dinh, dtdd_khac: payload.dtdd_khac, email: payload.email },
      undefined
    )
    if (!trungResult.valid && trungResult.field && trungResult.message) {
      setLoi(trungResult.message)
      setErrorFieldTrung(trungResult.field)
      focusTrungField(trungResult.field)
      showError(trungResult.message)
      return
    }
    setErrorFieldTrung(null)
    setLoi('')
    try {
      await khachHangPost(payload)
      await onSaved()
      const ma = await khachHangMaTuDong()
      const baseToChuc: FormState = { ...emptyForm, loai_kh: 'to_chuc', ma_kh: ma }
      const baseCaNhan: FormState = { ...emptyForm, loai_kh: 'ca_nhan', ma_kh: ma }
      setFormToChuc(baseToChuc)
      setFormCaNhan(baseCaNhan)
      setForm(baseToChuc)
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Có lỗi xảy ra.')
    }
  }

  return (
    <>
      <Modal
        open={!!modalOpen}
        onClose={dongModal}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 32 }}>
            <span style={{ flexShrink: 0 }}>{modalOpen === 'add' ? 'Thêm Khách hàng' : modalOpen === 'clone' ? 'Nhân bản khách hàng' : 'Sửa khách hàng'}</span>
            <div style={{ flex: 1, minWidth: 0, height: 28, minHeight: 28, display: 'flex', alignItems: 'center', padding: '0 10px', background: loi ? 'rgba(255, 87, 34, 0.12)' : 'transparent', border: loi ? '1px solid var(--accent)' : '1px solid transparent', borderRadius: 4, fontSize: 11, color: 'var(--text-primary)', overflow: 'hidden', boxSizing: 'border-box' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loi || ' '}</span>
            </div>
          </div>
        }
        size="full"
        footer={null}
        closeOnOverlayClick={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 400 }} data-error-field={errorFieldTrung ?? ''}>
          {/* Thông báo lỗi cho screen reader (toast vẫn hiển thị bình thường) */}
          {loi && <span role="alert" aria-live="assertive" style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}>{loi}</span>}
          {/* Loại: Tổ chức / Cá nhân + Khách hàng */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: FORM_SECTION_GAP, flexWrap: 'wrap' }}>
            <span style={labelStyle}>Loại:</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
              <input type="radio" name="loaiForm" checked={form.loai_kh === 'to_chuc'} onChange={() => {
                const ma = form.ma_kh.trim() || emptyForm.ma_kh
                const maSoThue = form.ma_so_thue.trim() || emptyForm.ma_so_thue
                const baseToChuc: FormState = { ...emptyForm, loai_kh: 'to_chuc', ma_kh: ma, ma_so_thue: maSoThue }
                const baseCaNhan: FormState = { ...emptyForm, loai_kh: 'ca_nhan', ma_kh: ma, ma_so_thue: maSoThue }
                setFormToChuc(baseToChuc)
                setFormCaNhan(baseCaNhan)
                setForm(baseToChuc)
                setFormTab('thong_tin_chung')
              }} />
              1. Tổ chức
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
              <input type="radio" name="loaiForm" checked={form.loai_kh === 'ca_nhan'} onChange={() => {
                const ma = form.ma_kh.trim() || emptyForm.ma_kh
                const maSoThue = form.ma_so_thue.trim() || emptyForm.ma_so_thue
                const baseToChuc: FormState = { ...emptyForm, loai_kh: 'to_chuc', ma_kh: ma, ma_so_thue: maSoThue }
                const baseCaNhan: FormState = { ...emptyForm, loai_kh: 'ca_nhan', ma_kh: ma, ma_so_thue: maSoThue }
                setFormToChuc(baseToChuc)
                setFormCaNhan(baseCaNhan)
                setForm(baseCaNhan)
                setFormTab('thong_tin_chung')
              }} />
              2. Cá nhân
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', marginLeft: 8 }}>
              <input
                type="checkbox"
                checked={form.isNhaCungCap}
                onChange={(e) => {
                  const v = e.target.checked
                  setForm((f) => {
                    if (!v) {
                      return {
                        ...f,
                        isNhaCungCap: false,
                        dia_diem_nhan_trung_giao: false,
                        dia_diem_giao_hang: [],
                      }
                    }
                    const giao =
                      f.dia_diem_giao_hang.length > 0 ? f.dia_diem_giao_hang : [...f.dia_diem_nhan_hang]
                    return {
                      ...f,
                      isNhaCungCap: true,
                      dia_diem_giao_hang: giao,
                      dia_diem_nhan_trung_giao:
                        f.dia_diem_nhan_trung_giao || (giao.length > 0 && f.dia_diem_nhan_hang.length === 0),
                    }
                  })
                }}
              />
              Nhà cung cấp
            </label>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: FORM_SECTION_GAP }}>
            <button
              type="button"
              onClick={() => setFormTab('thong_tin_chung')}
              style={{
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: formTab === 'thong_tin_chung' ? 'bold' : 'normal',
                background: formTab === 'thong_tin_chung' ? 'var(--accent)' : 'var(--bg-tab)',
                color: formTab === 'thong_tin_chung' ? 'var(--accent-text)' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              1. Thông tin chung
            </button>
            <button
              type="button"
              onClick={() => setFormTab('khac')}
              style={{
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: formTab === 'khac' ? 'bold' : 'normal',
                background: formTab === 'khac' ? 'var(--accent)' : 'var(--bg-tab)',
                color: formTab === 'khac' ? 'var(--accent-text)' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              2. Khác
            </button>
          </div>

          {formTab === 'thong_tin_chung' && form.loai_kh === 'to_chuc' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: FORM_ROW_GAP, marginBottom: FORM_SECTION_GAP, fontSize: 11 }}>
                {/* Mã + Mã số thuế + nút Lấy thông tin cùng dòng */}
                <div style={{ ...fieldRow, flexWrap: 'wrap' }}>
                  <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Mã (*)</label>
                  <input
                    ref={refMaKh}
                    style={{ ...(modalOpen === 'add' || modalOpen === 'clone' ? { ...inputStyle, background: 'var(--bg-tab)', color: 'var(--text-muted)' } : inputStyle), width: 160, flexShrink: 0 }}
                    value={form.ma_kh}
                    readOnly={modalOpen === 'add' || modalOpen === 'clone'}
                    onChange={modalOpen === 'edit' ? (e) => setForm((f) => ({ ...f, ma_kh: e.target.value })) : undefined}
                  />
                  <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Mã số thuế</label>
                  <div style={{ flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input style={{ ...inputStyle, flex: 1 }} value={form.ma_so_thue} ref={form.loai_kh === 'to_chuc' ? refMaSoThue : undefined} onChange={(e) => setForm((f) => ({ ...f, ma_so_thue: e.target.value }))} placeholder="" />
                    <button
                      type="button"
                      style={{ ...btnSecondary, padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0 }}
                      title="Lấy thông tin"
                      disabled={layThongTinLoading || !form.ma_so_thue.trim()}
                      onClick={async () => {
                        const mst = form.ma_so_thue.trim()
                        if (!mst) return
                        setLayThongTinLoading(true)
                        try {
                          const result = await lookupTaxCode(mst)
                          if (result) {
                            setForm((f) => ({
                              ...f,
                              ten_kh: result.name || f.ten_kh,
                              dia_chi: result.address ? cleanAddressForDisplay(result.address) : f.dia_chi,
                              dien_thoai: result.dien_thoai ?? f.dien_thoai,
                              email: result.email ?? f.email,
                              website: result.website ?? f.website,
                              tinh_tp: result.tinh_tp ?? f.tinh_tp,
                              xa_phuong: result.xa_phuong ?? f.xa_phuong,
                              dai_dien_theo_pl: result.dai_dien_theo_pl ?? f.dai_dien_theo_pl,
                              xung_ho: result.xung_ho ?? f.xung_ho,
                              gioi_tinh: (result as { gioi_tinh?: string }).gioi_tinh ?? f.gioi_tinh,
                              chuc_danh: result.chuc_danh ?? f.chuc_danh,
                              dt_co_dinh: result.dt_co_dinh ?? f.dt_co_dinh,
                              dt_di_dong: result.dt_di_dong ?? f.dt_di_dong,
                              dtdd_khac: result.dtdd_khac ?? f.dtdd_khac,
                              dia_chi_lien_he: result.dia_chi_lien_he ? cleanAddressForDisplay(result.dia_chi_lien_he) : f.dia_chi_lien_he,
                            }))
                          } else {
                            showError('Không tìm thấy thông tin cho mã số thuế này.')
                          }
                        } finally {
                          setLayThongTinLoading(false)
                        }
                      }}
                    >
                      <Globe size={16} />
                      <span>{layThongTinLoading ? 'Đang tra...' : 'Lấy thông tin'}</span>
                    </button>
                  </div>
                </div>
                {/* Tên công ty - full */}
                <div style={fieldRow}>
                  <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Tên công ty (*)</label>
                  <input ref={refTenKh} style={{ ...inputStyle, flex: 1, textTransform: 'uppercase' }} value={form.ten_kh} onChange={(e) => setForm((f) => ({ ...f, ten_kh: e.target.value.toUpperCase() }))} placeholder="" />
                </div>
                {/* Địa chỉ - ô nhập thường (không dự đoán) */}
                <div style={fieldRow}>
                  <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Địa chỉ</label>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={form.dia_chi}
                    onChange={(e) => setForm((f) => ({ ...f, dia_chi: e.target.value }))}
                    onBlur={() => setForm((f) => ({ ...f, dia_chi: cleanAddressForDisplay(f.dia_chi) }))}
                    placeholder="Địa chỉ"
                  />
                </div>
                {/* Người đại diện PL, Chức vụ - cùng dòng, dưới Địa chỉ */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: FORM_GRID_GAP }}>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Người đại diện PL</label>
                    <input style={{ ...inputStyle, flex: 1, textTransform: 'uppercase' }} value={form.dai_dien_theo_pl} onChange={(e) => setForm((f) => ({ ...f, dai_dien_theo_pl: e.target.value.toUpperCase() }))} placeholder="" />
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Chức vụ</label>
                    <input style={{ ...inputStyle, flex: 1 }} value={form.chuc_danh} onChange={(e) => setForm((f) => ({ ...f, chuc_danh: e.target.value }))} placeholder="" />
                  </div>
                </div>
                {/* Điện thoại, Website ngay dưới Địa chỉ */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: FORM_GRID_GAP }}>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Điện thoại</label>
                    <input style={{ ...inputStyle, flex: 1 }} value={form.dien_thoai} onChange={(e) => setForm((f) => ({ ...f, dien_thoai: e.target.value }))} placeholder="" />
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Website</label>
                    <input style={{ ...inputStyle, flex: 1 }} value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="" />
                  </div>
                </div>
                {/* Email | Nhóm khách hàng (Email đứng trước) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: FORM_GRID_GAP }}>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Email</label>
                    <input style={{ ...inputStyle, flex: 1 }} type="email" value={form.email} ref={form.loai_kh === 'to_chuc' ? refEmail : undefined} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="" />
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Nhóm khách hàng</label>
                    <div ref={nhomKhWrapRef} style={{ display: 'flex', gap: 2, flex: 1, minWidth: 0, alignItems: 'center' }}>
                      <div
                        style={{ flex: 1, minWidth: 0, position: 'relative', cursor: 'pointer', height: FORM_FIELD_HEIGHT }}
                        onClick={() => setOpenNhomKhDropdown(true)}
                      >
                        <input
                          readOnly
                          style={{ ...inputStyle, ...lookupInputWithChevronStyle, width: '100%', height: '100%', cursor: 'pointer', boxSizing: 'border-box' }}
                          value={displayNhomKhachHang}
                          placeholder="Chọn nhóm..."
                          onClick={(e) => { e.stopPropagation(); setOpenNhomKhDropdown(true) }}
                        />
                        <span style={lookupChevronOverlayStyle}>
                          <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                        </span>
                        <NhomKhachHangInlinePicker
                          open={openNhomKhDropdown}
                          anchorRef={nhomKhWrapRef}
                          items={danhSachNhom}
                          value={form.nhom_kh}
                          onCommit={(tens) => setForm((f) => ({ ...f, nhom_kh: tens.join('; ') }))}
                          onOpenChange={setOpenNhomKhDropdown}
                          onLiveSelectionChange={(tens) => setForm((f) => ({ ...f, nhom_kh: tens.join('; ') }))}
                        />
                      </div>
                      <button
                        type="button"
                        style={lookupActionButtonStyle}
                        title="Thêm nhóm khách hàng"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowThemNhomKhModal(true)
                        }}
                      >
                        <Plus size={12} style={{ color: 'var(--accent-text)' }} />
                      </button>
                    </div>
                  </div>
                </div>
                {/* Cột trái: Ghi chú (chiều cao = 3 dòng); Cột phải: DKTT, Số ngày được nợ, Số nợ tối đa */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: FORM_GRID_GAP, gridTemplateRows: 'auto auto auto' }}>
                  <div style={{ ...fieldRow, gridRow: '1 / span 3', alignItems: 'flex-start', minHeight: 3 * FORM_FIELD_HEIGHT + 2 * FORM_ROW_GAP }}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Ghi chú</label>
                    <textarea
                      style={{ ...inputStyle, flex: 1, height: '100%', minHeight: 3 * FORM_FIELD_HEIGHT + 2 * FORM_ROW_GAP, resize: 'vertical' }}
                      value={form.dien_giai}
                      onChange={(e) => setForm((f) => ({ ...f, dien_giai: e.target.value }))}
                      placeholder=""
                      rows={3}
                    />
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>DKTT</label>
                    <div style={{ display: 'flex', gap: 2, flex: 1, minWidth: 0, alignItems: 'center' }}>
                      <div
                        ref={dkttToChucRef}
                        style={{ flex: 1, minWidth: 0, position: 'relative', cursor: 'pointer', height: FORM_FIELD_HEIGHT }}
                        onClick={() => setOpenDkttDropdownToChuc((v) => !v)}
                      >
                        <input
                          readOnly
                          style={{ ...inputStyle, ...lookupInputWithChevronStyle, width: '100%', height: '100%', cursor: 'pointer' }}
                          value={form.dieu_khoan_tt}
                          placeholder="Chọn điều khoản..."
                          onClick={(e) => { e.stopPropagation(); if (!openDkttDropdownToChuc) setOpenDkttDropdownToChuc(true) }}
                        />
                        <span style={lookupChevronOverlayStyle}>
                          <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                        </span>
                        {openDkttDropdownToChuc && (
                          <div
                            style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 2, maxHeight: 200, overflowY: 'auto', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000 }}
                          >
                            {danhSachDKTT.length === 0 ? <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-muted)' }}>Không có hoặc bấm + để thêm</div> : danhSachDKTT.map((d) => (
                              <div
                                key={d.ma}
                                role="option"
                                onMouseDown={(e) => { e.preventDefault(); setForm((f) => ({ ...f, dieu_khoan_tt: d.ten, so_ngay_duoc_no: formatSoNguyenInput(String(d.so_ngay_duoc_no)), han_muc_no_kh: formatSoTien(String(d.so_cong_no_toi_da)) })); setOpenDkttDropdownToChuc(false) }}
                                style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border)', background: form.dieu_khoan_tt === d.ten ? 'var(--accent)' : undefined, color: form.dieu_khoan_tt === d.ten ? 'var(--accent-text)' : 'var(--text-primary)' }}
                              >{d.ma} — {d.ten}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button type="button" style={lookupActionButtonStyle} title="Thêm điều khoản" onClick={() => setShowThemDieuKhoanTT(true)}><Plus size={12} style={{ color: 'var(--accent-text)' }} /></button>
                    </div>
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Số ngày được nợ</label>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, minWidth: 0 }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="htql-no-spinner"
                        style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                        value={form.so_ngay_duoc_no}
                        onChange={(e) => setForm((f) => ({ ...f, so_ngay_duoc_no: formatSoNguyenInput(e.target.value) }))}
                        onFocus={() => { if (isZeroDisplay(form.so_ngay_duoc_no)) setForm((f) => ({ ...f, so_ngay_duoc_no: '' })) }}
                        onBlur={() => { if (form.so_ngay_duoc_no === '') setForm((f) => ({ ...f, so_ngay_duoc_no: '0' })) }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--text-primary)', flexShrink: 0 }}>ngày</span>
                    </div>
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Số nợ tối đa</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="htql-no-spinner"
                      style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                      value={form.han_muc_no_kh}
                      onChange={(e) => setForm((f) => ({ ...f, han_muc_no_kh: formatSoTien(e.target.value) }))}
                      onFocus={() => { if (isZeroDisplay(form.han_muc_no_kh)) setForm((f) => ({ ...f, han_muc_no_kh: '' })) }}
                      onBlur={() => { if (form.han_muc_no_kh === '') setForm((f) => ({ ...f, han_muc_no_kh: '0' })) }}
                    />
                  </div>
                </div>
              </div>

              {/* Tài khoản ngân hàng */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: FORM_SECTION_GAP, marginBottom: FORM_SECTION_GAP }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: FORM_ROW_GAP, color: 'var(--text-primary)' }}>Tài khoản ngân hàng</div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflow: 'visible', background: 'var(--bg-tab)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '4px 6px', textAlign: 'left', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)', fontWeight: 600, width: 140 }}>Loại</th>
                        <th style={{ padding: '4px 6px', textAlign: 'left', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)', fontWeight: 600, width: 130 }}>Số tài khoản</th>
                        <th style={{ padding: '4px 6px', textAlign: 'left', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Tên ngân hàng</th>
                        <th style={{ padding: '4px 6px', textAlign: 'left', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)', fontWeight: 600, width: 130 }}>Tên người nhận</th>
                        <th style={{ width: 40 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {form.tai_khoan_ngan_hang.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: 8, color: 'var(--text-muted)', cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onClick={themDongNganHang}>
                            Bấm vào đây để thêm mới
                          </td>
                        </tr>
                      ) : (
                        form.tai_khoan_ngan_hang.map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid var(--border)' }}>
                              <select
                                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', paddingRight: 26 }}
                                value={row.loai_tk ?? 'cong_ty'}
                                onChange={(e) => capNhatDongNganHang(idx, 'loai_tk', e.target.value as 'cong_ty' | 'ca_nhan')}
                              >
                                <option value="cong_ty">Công ty</option>
                                <option value="ca_nhan">Cá nhân</option>
                              </select>
                            </td>
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid var(--border)' }}>
                              <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} value={row.so_tai_khoan} onChange={(e) => capNhatDongNganHang(idx, 'so_tai_khoan', e.target.value)} />
                            </td>
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
                              <div ref={bankDropdownRow === idx ? bankDropdownWrapRef : undefined} style={{ position: 'relative' }}>
                              <input
                                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', paddingRight: 26 }}
                                value={bankDropdownRow === idx ? (bankFilter || getDisplayBankName(row.ten_ngan_hang)) : getDisplayBankName(row.ten_ngan_hang)}
                                onChange={(e) => {
                                  setBankFilter(e.target.value)
                                  setBankDropdownRow(idx)
                                }}
                                onFocus={() => {
                                  setBankFilter('')
                                  setBankDropdownRow(idx)
                                }}
                                onClick={() => {
                                  if (bankDropdownRow !== idx) {
                                    setBankFilter('')
                                    setBankDropdownRow(idx)
                                  }
                                }}
                                placeholder={banksLoading ? 'Đang tải...' : 'Nhập hoặc chọn ngân hàng'}
                                disabled={banksLoading}
                              />
                              <span style={{ position: 'absolute', right: 4, top: 4, bottom: 4, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)', borderRadius: '0 4px 4px 0' }}>
                                <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                              </span>
                              {bankDropdownRow === idx && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    top: '100%',
                                    marginTop: 2,
                                    height: 180,
                                    maxHeight: 180,
                                    overflowY: 'auto',
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 4,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    zIndex: 1000,
                                  }}
                                >
                                  {banksForDropdown.length === 0 ? (
                                    <div style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontSize: 12 }}>Không có kết quả</div>
                                  ) : (
                                    banksForDropdown.map((b) => (
                                      <div
                                        key={b.id}
                                        ref={bankDropdownRow === idx && row.ten_ngan_hang === b.name ? bankDropdownSelectedOptionRef : undefined}
                                        role="option"
                                        onMouseDown={(e) => {
                                          e.preventDefault()
                                          capNhatDongNganHang(idx, 'ten_ngan_hang', b.name)
                                          setBankFilter(b.name)
                                          setBankDropdownRow(null)
                                        }}
                                        style={{
                                          padding: '6px 10px',
                                          cursor: 'pointer',
                                          fontSize: 12,
                                          background: row.ten_ngan_hang === b.name ? 'var(--accent)' : undefined,
                                          color: row.ten_ngan_hang === b.name ? 'var(--accent-text)' : 'var(--text-primary)',
                                        }}
                                      >
                                        {b.shortName ? `${b.shortName} - ${b.name}` : b.name}
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                              </div>
                            </td>
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid var(--border)' }}>
                              <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} value={row.ten_nguoi_nhan ?? ''} onChange={(e) => capNhatDongNganHang(idx, 'ten_nguoi_nhan', e.target.value)} placeholder="Tên người nhận" />
                            </td>
                            <td style={{ padding: '4px', borderBottom: '1px solid var(--border)' }}>
                              <button type="button" style={{ ...btnSecondary, padding: '2px 6px' }} onClick={() => xoaDongNganHang(idx)} title="Xóa dòng">✕</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {form.tai_khoan_ngan_hang.length > 0 && (
                    <div style={{ padding: `${FORM_ROW_GAP}px ${FORM_ROW_GAP}px`, borderTop: '1px solid var(--border)' }}>
                      <button type="button" style={{ ...btnSecondary, fontSize: 10 }} onClick={themDongNganHang}>+ Thêm dòng</button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {formTab === 'thong_tin_chung' && form.loai_kh === 'ca_nhan' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: FORM_ROW_GAP, marginBottom: FORM_SECTION_GAP, fontSize: 11 }}>
                {/* Mã + Xưng hô dòng 1; Họ và tên + Giới tính dòng 2; Địa chỉ, ... */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: FORM_GRID_GAP }}>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Mã (*)</label>
                    <input
                      ref={refMaKh}
                      style={{ ...(modalOpen === 'add' || modalOpen === 'clone' ? { ...inputStyle, background: 'var(--bg-tab)', color: 'var(--text-muted)' } : inputStyle), flex: 1, minWidth: 0 }}
                      value={form.ma_kh}
                      readOnly={modalOpen === 'add' || modalOpen === 'clone'}
                      onChange={modalOpen === 'edit' ? (e) => setForm((f) => ({ ...f, ma_kh: e.target.value })) : undefined}
                    />
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Xưng hô</label>
                    <div style={{ flex: 1, position: 'relative', height: FORM_FIELD_HEIGHT }}>
                      <select
                        style={{ ...inputStyle, width: '100%', height: '100%', boxSizing: 'border-box', appearance: 'none', paddingRight: 26 }}
                        value={form.xung_ho}
                        onChange={(e) => {
                          const v = e.target.value
                          setForm((f) => ({
                            ...f,
                            xung_ho: v,
                            gioi_tinh: (v === 'Ông' || v === 'Anh') ? 'Nam' : (v === 'Bà' || v === 'Chị') ? 'Nữ' : f.gioi_tinh,
                          }))
                        }}
                      >
                        <option value="">-- Chọn --</option>
                        {['Ông', 'Bà', 'Anh', 'Chị'].map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)' }}>
                        <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: FORM_GRID_GAP }}>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Họ và tên (*)</label>
                    <input ref={refTenKh} style={{ ...inputStyle, flex: 1, textTransform: 'uppercase' }} value={form.ten_kh} onChange={(e) => setForm((f) => ({ ...f, ten_kh: e.target.value.toUpperCase() }))} placeholder="" />
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Giới tính</label>
                    <div style={{ flex: 1, position: 'relative', height: FORM_FIELD_HEIGHT }}>
                      <select
                        style={{ ...inputStyle, width: '100%', height: '100%', boxSizing: 'border-box', appearance: 'none', paddingRight: 26 }}
                        value={form.gioi_tinh}
                        onChange={(e) => setForm((f) => ({ ...f, gioi_tinh: e.target.value }))}
                      >
                        <option value="">Chọn</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                      <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)' }}>
                        <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                      </span>
                    </div>
                  </div>
                </div>
                <div style={fieldRow}>
                  <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Địa chỉ</label>
                  <div ref={diaChiCaNhanWrapRef} style={{ flex: 1, minWidth: 0, position: 'relative', height: FORM_FIELD_HEIGHT }}>
                    <input
                      style={{ ...inputStyle, width: '100%', height: '100%', minWidth: 0, boxSizing: 'border-box' }}
                      value={form.dia_chi}
                      onChange={(e) => {
                        const v = e.target.value
                        setForm((f) => ({ ...f, dia_chi: v }))
                        if (diaChiCaNhanDebounceRef.current) clearTimeout(diaChiCaNhanDebounceRef.current)
                        if (!v.trim()) {
                          setDiaChiCaNhanSuggestions([])
                          setDiaChiCaNhanDropdownOpen(false)
                          return
                        }
                        setDiaChiCaNhanDropdownOpen(true)
                        diaChiCaNhanDebounceRef.current = setTimeout(() => {
                          diaChiCaNhanDebounceRef.current = null
                          setDiaChiCaNhanLoading(true)
                          suggestAddressVietnam(v)
                            .then((list) => {
                              setDiaChiCaNhanSuggestions(list.map((a) => cleanAddressForDisplay(a)))
                              setDiaChiCaNhanLoading(false)
                            })
                            .catch(() => setDiaChiCaNhanLoading(false))
                        }, 400)
                      }}
                      onFocus={() => {
                        if (form.dia_chi.trim() && diaChiCaNhanSuggestions.length > 0) setDiaChiCaNhanDropdownOpen(true)
                      }}
                      onBlur={() => {
                        setTimeout(() => setDiaChiCaNhanDropdownOpen(false), 200)
                        setForm((f) => ({ ...f, dia_chi: cleanAddressForDisplay(f.dia_chi) }))
                      }}
                      onClick={() => { if (!diaChiCaNhanDropdownOpen && form.dia_chi.trim()) setDiaChiCaNhanDropdownOpen(true) }}
                      placeholder="Nhập địa chỉ (gợi ý tại Việt Nam)"
                    />
                    {diaChiCaNhanDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: '100%',
                          marginTop: 2,
                          maxHeight: 320,
                          overflowY: 'auto',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border)',
                          borderRadius: 4,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          zIndex: 1000,
                        }}
                      >
                        {diaChiCaNhanLoading ? (
                          <div style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 12 }}>Đang tải gợi ý...</div>
                        ) : diaChiCaNhanSuggestions.length === 0 ? (
                          <div style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 12 }}>Nhập từ khóa để gợi ý địa chỉ</div>
                        ) : (
                          diaChiCaNhanSuggestions.map((addr, i) => (
                            <div
                              key={i}
                              role="option"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                setForm((f) => ({ ...f, dia_chi: addr }))
                                setDiaChiCaNhanSuggestions([])
                                setDiaChiCaNhanDropdownOpen(false)
                              }}
                              style={{
                                padding: '8px 10px',
                                cursor: 'pointer',
                                fontSize: 12,
                                lineHeight: 1.4,
                                borderBottom: i < diaChiCaNhanSuggestions.length - 1 ? '1px solid var(--border)' : undefined,
                                color: 'var(--text-primary)',
                              }}
                            >
                              {addr}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: FORM_GRID_GAP }}>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>ĐTDD</label>
                    <input style={{ ...inputStyle, flex: 1 }} value={form.dt_di_dong} ref={refDtDiDong} onChange={(e) => setForm((f) => ({ ...f, dt_di_dong: e.target.value }))} placeholder="" />
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>ĐT khác</label>
                    <input style={{ ...inputStyle, flex: 1 }} value={form.dt_co_dinh} ref={refDtCoDinh} onChange={(e) => setForm((f) => ({ ...f, dt_co_dinh: e.target.value }))} placeholder="" />
                  </div>
                </div>
                {/* Hai cột: Hàng 1 Email | Nhóm KH,NCC; sau đó DKTT, Số ngày được nợ, Số nợ tối đa, Ghi chú (vị trí cũ NV mua hàng) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: FORM_GRID_GAP }}>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Email</label>
                    <input style={{ ...inputStyle, flex: 1 }} type="email" value={form.email} ref={form.loai_kh === 'ca_nhan' ? refEmail : undefined} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="" />
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Nhóm khách hàng</label>
                    <div ref={nhomKhWrapRef} style={{ display: 'flex', gap: 2, flex: 1, minWidth: 0, alignItems: 'center' }}>
                      <div
                        style={{ flex: 1, minWidth: 0, position: 'relative', cursor: 'pointer', height: FORM_FIELD_HEIGHT }}
                        onClick={() => setOpenNhomKhDropdown(true)}
                      >
                        <input
                          readOnly
                          style={{ ...inputStyle, ...lookupInputWithChevronStyle, width: '100%', height: '100%', cursor: 'pointer', boxSizing: 'border-box' }}
                          value={displayNhomKhachHang}
                          placeholder="Chọn nhóm..."
                          onClick={(e) => { e.stopPropagation(); setOpenNhomKhDropdown(true) }}
                        />
                        <span style={lookupChevronOverlayStyle}>
                          <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                        </span>
                        <NhomKhachHangInlinePicker
                          open={openNhomKhDropdown}
                          anchorRef={nhomKhWrapRef}
                          items={danhSachNhom}
                          value={form.nhom_kh}
                          onCommit={(tens) => setForm((f) => ({ ...f, nhom_kh: tens.join('; ') }))}
                          onOpenChange={setOpenNhomKhDropdown}
                          onLiveSelectionChange={(tens) => setForm((f) => ({ ...f, nhom_kh: tens.join('; ') }))}
                        />
                      </div>
                      <button
                        type="button"
                        style={lookupActionButtonStyle}
                        title="Thêm nhóm khách hàng"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowThemNhomKhModal(true)
                        }}
                      >
                        <Plus size={12} style={{ color: 'var(--accent-text)' }} />
                      </button>
                    </div>
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Số CCCD</label>
                    <input style={{ ...inputStyle, flex: 1 }} value={form.so_cccd} ref={refSoCccd} onChange={(e) => setForm((f) => ({ ...f, so_cccd: e.target.value }))} placeholder="" />
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>DKTT</label>
                    <div style={{ display: 'flex', gap: 2, flex: 1, minWidth: 0, alignItems: 'center' }}>
                      <div
                        ref={dkttCaNhanRef}
                        style={{ flex: 1, minWidth: 0, position: 'relative', cursor: 'pointer', height: FORM_FIELD_HEIGHT }}
                        onClick={() => setOpenDkttDropdownCaNhan((v) => !v)}
                      >
                        <input
                          readOnly
                          style={{ ...inputStyle, ...lookupInputWithChevronStyle, width: '100%', height: '100%', cursor: 'pointer' }}
                          value={form.dieu_khoan_tt}
                          placeholder="Chọn điều khoản..."
                          onClick={(e) => { e.stopPropagation(); if (!openDkttDropdownCaNhan) setOpenDkttDropdownCaNhan(true) }}
                        />
                        <span style={lookupChevronOverlayStyle}>
                          <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                        </span>
                        {openDkttDropdownCaNhan && (
                          <div
                            style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 2, maxHeight: 200, overflowY: 'auto', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000 }}
                          >
                            {danhSachDKTT.length === 0 ? <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-muted)' }}>Không có hoặc bấm + để thêm</div> : danhSachDKTT.map((d) => (
                              <div
                                key={d.ma}
                                role="option"
                                onMouseDown={(e) => { e.preventDefault(); setForm((f) => ({ ...f, dieu_khoan_tt: d.ten, so_ngay_duoc_no: formatSoNguyenInput(String(d.so_ngay_duoc_no)), han_muc_no_kh: formatSoTien(String(d.so_cong_no_toi_da)) })); setOpenDkttDropdownCaNhan(false) }}
                                style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border)', background: form.dieu_khoan_tt === d.ten ? 'var(--accent)' : undefined, color: form.dieu_khoan_tt === d.ten ? 'var(--accent-text)' : 'var(--text-primary)' }}
                              >{d.ma} — {d.ten}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button type="button" style={lookupActionButtonStyle} title="Thêm điều khoản" onClick={() => setShowThemDieuKhoanTT(true)}><Plus size={12} style={{ color: 'var(--accent-text)' }} /></button>
                    </div>
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Nơi cấp</label>
                    <input style={{ ...inputStyle, flex: 1 }} value={form.noi_cap} onChange={(e) => setForm((f) => ({ ...f, noi_cap: e.target.value }))} placeholder="" />
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Số ngày được nợ</label>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, minWidth: 0 }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="htql-no-spinner"
                        style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                        value={form.so_ngay_duoc_no}
                        onChange={(e) => setForm((f) => ({ ...f, so_ngay_duoc_no: formatSoNguyenInput(e.target.value) }))}
                        onFocus={() => { if (isZeroDisplay(form.so_ngay_duoc_no)) setForm((f) => ({ ...f, so_ngay_duoc_no: '' })) }}
                        onBlur={() => { if (form.so_ngay_duoc_no === '') setForm((f) => ({ ...f, so_ngay_duoc_no: '0' })) }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--text-primary)', flexShrink: 0 }}>ngày</span>
                    </div>
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Ngày cấp</label>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <DatePicker
                        {...htqlDatePickerPopperTop}
                        locale="vi"
                        dateFormat="dd/MM/yyyy"
                        placeholderText="dd/mm/yyyy"
                        calendarClassName="htql-datepicker-ngay"
                        renderCustomHeader={(p) => <DatePickerCustomHeader {...p} />}
                        maxDate={new Date()}
                        selected={form.ngay_cap ? new Date(form.ngay_cap + 'T12:00:00') : null}
                        onChange={(d: Date | null) => {
                          setNgayCapTyping(null)
                          setForm((f) => ({ ...f, ngay_cap: d ? d.toISOString().slice(0, 10) : '' }))
                        }}
                        customInput={
                          <NgayCapCustomInput
                            ngayCapTyping={ngayCapTyping}
                            setNgayCapTyping={setNgayCapTyping}
                            formNgayCap={form.ngay_cap}
                            setForm={setForm}
                          />
                        }
                        wrapperClassName="htql-datepicker-wrapper"
                      />
                    </div>
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Số nợ tối đa</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="htql-no-spinner"
                      style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                      value={form.han_muc_no_kh}
                      onChange={(e) => setForm((f) => ({ ...f, han_muc_no_kh: formatSoTien(e.target.value) }))}
                      onFocus={() => { if (isZeroDisplay(form.han_muc_no_kh)) setForm((f) => ({ ...f, han_muc_no_kh: '' })) }}
                      onBlur={() => { if (form.han_muc_no_kh === '') setForm((f) => ({ ...f, han_muc_no_kh: '0' })) }}
                    />
                  </div>
                  <div />
                  <div style={{ ...fieldRow, gridColumn: '1 / -1', minHeight: 2 * FORM_FIELD_HEIGHT + FORM_ROW_GAP, alignItems: 'flex-start' }}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Ghi chú</label>
                    <textarea
                      style={{ ...inputStyle, flex: 1, height: 'auto', minHeight: 2 * FORM_FIELD_HEIGHT, resize: 'vertical' }}
                      value={form.dien_giai}
                      onChange={(e) => setForm((f) => ({ ...f, dien_giai: e.target.value }))}
                      placeholder=""
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Tài khoản ngân hàng - giống Tổ chức (2 cột) */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: FORM_SECTION_GAP, marginBottom: FORM_SECTION_GAP }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: FORM_ROW_GAP, color: 'var(--text-primary)' }}>Tài khoản ngân hàng</div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflow: 'visible', background: 'var(--bg-tab)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '4px 6px', textAlign: 'left', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)', fontWeight: 600, width: 130 }}>Số tài khoản</th>
                        <th style={{ padding: '4px 6px', textAlign: 'left', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Tên ngân hàng</th>
                        <th style={{ padding: '4px 6px', textAlign: 'left', background: 'var(--bg-tab)', borderBottom: '1px solid var(--border)', fontWeight: 600, width: 130 }}>Tên người nhận</th>
                        <th style={{ width: 40 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {form.tai_khoan_ngan_hang.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: 8, color: 'var(--text-muted)', cursor: 'pointer', borderBottom: '1px solid var(--border)' }} onClick={themDongNganHang}>
                            Bấm vào đây để thêm mới
                          </td>
                        </tr>
                      ) : (
                        form.tai_khoan_ngan_hang.map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid var(--border)' }}>
                              <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} value={row.so_tai_khoan} onChange={(e) => capNhatDongNganHang(idx, 'so_tai_khoan', e.target.value)} />
                            </td>
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
                              <div ref={bankDropdownRow === idx ? bankDropdownWrapRef : undefined} style={{ position: 'relative' }}>
                              <input
                                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', paddingRight: 26 }}
                                value={bankDropdownRow === idx ? (bankFilter || getDisplayBankName(row.ten_ngan_hang)) : getDisplayBankName(row.ten_ngan_hang)}
                                onChange={(e) => { setBankFilter(e.target.value); setBankDropdownRow(idx) }}
                                onFocus={() => { setBankFilter(''); setBankDropdownRow(idx) }}
                                onClick={() => { if (bankDropdownRow !== idx) { setBankFilter(''); setBankDropdownRow(idx) } }}
                                placeholder={banksLoading ? 'Đang tải...' : 'Nhập hoặc chọn ngân hàng'}
                                disabled={banksLoading}
                              />
                              <span style={{ position: 'absolute', right: 4, top: 4, bottom: 4, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)', borderRadius: '0 4px 4px 0' }}><ChevronDown size={12} style={{ color: 'var(--accent-text)' }} /></span>
                              {bankDropdownRow === idx && (
                                <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 2, maxHeight: 180, overflowY: 'auto', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000 }}>
                                  {banksForDropdown.length === 0 ? <div style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontSize: 12 }}>Không có kết quả</div> : banksForDropdown.map((b) => (
                                    <div key={b.id} ref={bankDropdownRow === idx && row.ten_ngan_hang === b.name ? bankDropdownSelectedOptionRef : undefined} role="option" onMouseDown={(e) => { e.preventDefault(); capNhatDongNganHang(idx, 'ten_ngan_hang', b.name); setBankFilter(b.name); setBankDropdownRow(null) }} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12, background: row.ten_ngan_hang === b.name ? 'var(--accent)' : undefined, color: row.ten_ngan_hang === b.name ? 'var(--accent-text)' : 'var(--text-primary)' }}>{b.shortName ? `${b.shortName} - ${b.name}` : b.name}</div>
                                  ))}
                                </div>
                              )}
                              </div>
                            </td>
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid var(--border)' }}>
                              <input
                                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                                value={row.ten_nguoi_nhan ?? ''}
                                onChange={(e) => capNhatDongNganHang(idx, 'ten_nguoi_nhan', e.target.value)}
                                placeholder=""
                              />
                            </td>
                            <td style={{ padding: '4px', borderBottom: '1px solid var(--border)' }}>
                              <button type="button" style={{ ...btnSecondary, padding: '2px 6px' }} onClick={() => xoaDongNganHang(idx)} title="Xóa dòng">✕</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {form.tai_khoan_ngan_hang.length > 0 && (
                    <div style={{ padding: `${FORM_ROW_GAP}px ${FORM_ROW_GAP}px`, borderTop: '1px solid var(--border)' }}>
                      <button type="button" style={{ ...btnSecondary, fontSize: 10 }} onClick={themDongNganHang}>+ Thêm dòng</button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {formTab === 'khac' && form.loai_kh === 'to_chuc' && (
            <>
              {/* Vị trí địa lý */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: FORM_SECTION_GAP, marginBottom: FORM_SECTION_GAP }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: FORM_ROW_GAP, color: 'var(--text-primary)' }}>Vị trí địa lý</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: FORM_GRID_GAP }}>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Quốc gia</label>
                    <div style={{ flex: 1, position: 'relative', height: FORM_FIELD_HEIGHT }}>
                      <select
                        style={{ ...inputStyle, width: '100%', height: '100%', boxSizing: 'border-box', appearance: 'none', paddingRight: 26 }}
                        value={form.quoc_gia}
                        onChange={(e) => setForm((f) => ({ ...f, quoc_gia: e.target.value }))}
                      >
                        {form.quoc_gia && !DANH_SACH_QUOC_GIA.includes(form.quoc_gia) && (
                          <option value={form.quoc_gia}>{form.quoc_gia}</option>
                        )}
                        {DANH_SACH_QUOC_GIA.map((qg) => (
                          <option key={qg} value={qg}>{qg}</option>
                        ))}
                      </select>
                      <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)' }}>
                        <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                      </span>
                    </div>
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Tỉnh/TP</label>
                    <div ref={tinhTpWrapRef1} style={{ flex: 1, position: 'relative', height: FORM_FIELD_HEIGHT }}>
                      {form.quoc_gia === 'Việt Nam' ? (
                        <>
                          <input
                            style={{ ...inputStyle, width: '100%', height: '100%', boxSizing: 'border-box', paddingRight: 26 }}
                            value={openTinhTp ? tinhTpFilter : form.tinh_tp}
                            onChange={(e) => {
                              setTinhTpFilter(e.target.value)
                              setOpenTinhTp(true)
                            }}
                            onFocus={() => {
                              setTinhTpFilter(form.tinh_tp)
                              setOpenTinhTp(true)
                            }}
                            onClick={() => { if (!openTinhTp) { setTinhTpFilter(form.tinh_tp); setOpenTinhTp(true) } }}
                            placeholder="Nhập để lọc hoặc chọn tỉnh/thành phố"
                          />
                          <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)' }}>
                            <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                          </span>
                          {openTinhTp && (
                            <div
                              style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: '100%',
                                marginTop: 2,
                                maxHeight: 220,
                                overflowY: 'auto',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border)',
                                borderRadius: 4,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                zIndex: 1000,
                              }}
                            >
                              {tinhTpFiltered.length === 0 ? (
                                <div style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontSize: 12 }}>Không có kết quả</div>
                              ) : (
                                tinhTpFiltered.map((t) => (
                                  <div
                                    key={t}
                                    role="option"
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      setForm((f) => ({ ...f, tinh_tp: t, xa_phuong: '' }))
                                      setTinhTpFilter(t)
                                      setOpenTinhTp(false)
                                    }}
                                    style={{
                                      padding: '6px 10px',
                                      cursor: 'pointer',
                                      fontSize: 12,
                                      background: form.tinh_tp === t ? 'var(--accent)' : undefined,
                                      color: form.tinh_tp === t ? 'var(--accent-text)' : 'var(--text-primary)',
                                    }}
                                  >
                                    {t}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <input style={{ ...inputStyle, width: '100%', height: '100%', boxSizing: 'border-box', paddingRight: 26 }} value={form.tinh_tp} onChange={(e) => setForm((f) => ({ ...f, tinh_tp: e.target.value }))} placeholder="Tỉnh/Thành phố" />
                          <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)' }}>
                            <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Xã/Phường</label>
                    <div ref={xaPhuongWrapRef1} style={{ flex: 1, position: 'relative', height: FORM_FIELD_HEIGHT }}>
                      {form.quoc_gia === 'Việt Nam' && form.tinh_tp && MA_TINH_THEO_TEN[form.tinh_tp] ? (
                        <>
                          <input
                            style={{ ...inputStyle, width: '100%', height: '100%', boxSizing: 'border-box', paddingRight: 26 }}
                            value={openXaPhuong ? xaPhuongFilter : form.xa_phuong}
                            onChange={(e) => {
                              setXaPhuongFilter(e.target.value)
                              setOpenXaPhuong(true)
                            }}
                            onFocus={() => {
                              setXaPhuongFilter(form.xa_phuong)
                              setOpenXaPhuong(true)
                            }}
                            onClick={() => { if (!openXaPhuong) { setXaPhuongFilter(form.xa_phuong); setOpenXaPhuong(true) } }}
                            placeholder={wardsLoading ? 'Đang tải...' : 'Nhập để lọc hoặc chọn xã/phường'}
                            disabled={wardsLoading}
                          />
                          <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)' }}>
                            <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                          </span>
                          {openXaPhuong && !wardsLoading && (
                            <div
                              style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: '100%',
                                marginTop: 2,
                                maxHeight: 220,
                                overflowY: 'auto',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border)',
                                borderRadius: 4,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                zIndex: 1000,
                              }}
                            >
                              {xaPhuongFiltered.length === 0 ? (
                                <div style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontSize: 12 }}>Không có kết quả</div>
                              ) : (
                                xaPhuongFiltered.map((w) => (
                                  <div
                                    key={w}
                                    role="option"
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      setForm((f) => ({ ...f, xa_phuong: w }))
                                      setXaPhuongFilter(w)
                                      setOpenXaPhuong(false)
                                    }}
                                    style={{
                                      padding: '6px 10px',
                                      cursor: 'pointer',
                                      fontSize: 12,
                                      background: form.xa_phuong === w ? 'var(--accent)' : undefined,
                                      color: form.xa_phuong === w ? 'var(--accent-text)' : 'var(--text-primary)',
                                    }}
                                  >
                                    {w}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <input style={{ ...inputStyle, width: '100%', height: '100%', boxSizing: 'border-box', paddingRight: 26 }} value={form.xa_phuong} onChange={(e) => setForm((f) => ({ ...f, xa_phuong: e.target.value }))} placeholder="Xã/Phường" />
                          <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)' }}>
                            <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Thông tin liên hệ - khoảng cách dòng giống tab Thông tin chung (FORM_ROW_GAP) */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: FORM_SECTION_GAP, marginBottom: FORM_SECTION_GAP, width: '100%' }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: FORM_ROW_GAP, color: 'var(--text-primary)' }}>Thông tin liên hệ</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: `${FORM_ROW_GAP}px 20px` }}>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Xưng hô</label>
                    <div style={{ flex: 1, position: 'relative', height: FORM_FIELD_HEIGHT }}>
                      <select
                        style={{ ...inputStyle, width: '100%', height: '100%', boxSizing: 'border-box', appearance: 'none', paddingRight: 26 }}
                        value={form.xung_ho}
                        onChange={(e) => setForm((f) => ({ ...f, xung_ho: e.target.value }))}
                      >
                        <option value="">-- Chọn --</option>
                        {['Ông', 'Bà', 'Anh', 'Chị'].map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                        {form.xung_ho && !['Ông', 'Bà', 'Anh', 'Chị'].includes(form.xung_ho) && (
                          <option value={form.xung_ho}>{form.xung_ho}</option>
                        )}
                      </select>
                      <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)' }}>
                        <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                      </span>
                    </div>
                  </div>
                  <div style={fieldRow} />
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Người liên hệ</label>
                    <input style={{ ...inputStyle, flex: 1, textTransform: 'uppercase' }} value={form.ho_va_ten_lien_he} onChange={(e) => setForm((f) => ({ ...f, ho_va_ten_lien_he: e.target.value.toUpperCase() }))} />
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Giới tính</label>
                    <div style={{ flex: 1, position: 'relative', height: FORM_FIELD_HEIGHT }}>
                      <select
                        style={{ ...inputStyle, width: '100%', height: '100%', boxSizing: 'border-box', appearance: 'none', paddingRight: 26 }}
                        value={form.gioi_tinh}
                        onChange={(e) => setForm((f) => ({ ...f, gioi_tinh: e.target.value }))}
                      >
                        <option value="">Chọn</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                      <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)' }}>
                        <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                      </span>
                    </div>
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Chức danh</label>
                    <input style={{ ...inputStyle, flex: 1 }} value={form.chuc_danh} onChange={(e) => setForm((f) => ({ ...f, chuc_danh: e.target.value }))} />
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Email</label>
                    <input style={{ ...inputStyle, flex: 1 }} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>ĐTDD</label>
                    <input style={{ ...inputStyle, flex: 1 }} value={form.dt_di_dong} onChange={(e) => setForm((f) => ({ ...f, dt_di_dong: e.target.value }))} />
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>ĐT khác</label>
                    <input style={{ ...inputStyle, flex: 1 }} value={form.dt_co_dinh} onChange={(e) => setForm((f) => ({ ...f, dt_co_dinh: e.target.value }))} />
                  </div>
                </div>
                {/* Địa chỉ - dưới cùng mục Thông tin liên hệ, full width + gợi ý địa chỉ VN (chiều cao & khoảng cách giống Tên/Địa chỉ tab Thông tin chung) */}
                <div style={{ ...fieldRow, marginTop: FORM_ROW_GAP, width: '100%' }}>
                  <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Địa chỉ</label>
                  <div style={{ flex: '1 1 0%', minWidth: 0, position: 'relative', height: FORM_FIELD_HEIGHT }}>
                    <input
                      style={{ ...inputStyle, height: '100%', minHeight: FORM_FIELD_HEIGHT, width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                      value={form.dia_chi_lien_he}
                      onChange={(e) => {
                        const v = e.target.value
                        setForm((f) => ({ ...f, dia_chi_lien_he: v }))
                        if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current)
                        if (!v.trim()) {
                          setAddressSuggestions([])
                          setAddressDropdownOpen(false)
                          return
                        }
                        setAddressDropdownOpen(true)
                        addressDebounceRef.current = setTimeout(() => {
                          addressDebounceRef.current = null
                          setAddressLoading(true)
                          suggestAddressVietnam(v)
                            .then((list) => {
                              setAddressSuggestions(list.map((a) => cleanAddressForDisplay(a)))
                              setAddressLoading(false)
                            })
                            .catch(() => setAddressLoading(false))
                        }, 400)
                      }}
                      onFocus={() => {
                        if (form.dia_chi_lien_he.trim() && addressSuggestions.length > 0) setAddressDropdownOpen(true)
                      }}
                      onBlur={() => {
                        setTimeout(() => setAddressDropdownOpen(false), 200)
                        setForm((f) => ({ ...f, dia_chi_lien_he: cleanAddressForDisplay(f.dia_chi_lien_he) }))
                      }}
                      onClick={() => { if (!addressDropdownOpen && form.dia_chi_lien_he.trim()) setAddressDropdownOpen(true) }}
                      placeholder="Nhập địa chỉ liên hệ (gợi ý tại Việt Nam)"
                    />
                    {addressDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: '100%',
                          marginTop: 2,
                          maxHeight: 200,
                          overflowY: 'auto',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border)',
                          borderRadius: 4,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          zIndex: 1000,
                        }}
                      >
                        {addressLoading ? (
                          <div style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 12 }}>Đang tải gợi ý...</div>
                        ) : addressSuggestions.length === 0 ? (
                          <div style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 12 }}>Nhập từ khóa để gợi ý địa chỉ</div>
                        ) : (
                          addressSuggestions.map((addr, idx) => (
                            <div
                              key={idx}
                              role="option"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                setForm((f) => ({ ...f, dia_chi_lien_he: addr }))
                                setAddressSuggestions([])
                                setAddressDropdownOpen(false)
                              }}
                              style={{
                                padding: '6px 10px',
                                cursor: 'pointer',
                                fontSize: 12,
                                borderBottom: idx < addressSuggestions.length - 1 ? '1px solid var(--border)' : undefined,
                                color: 'var(--text-primary)',
                              }}
                            >
                              {addr}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Địa điểm: NCC → giao + nhận (trùng giao); chỉ KH → chỉ nhận */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: FORM_SECTION_GAP, marginBottom: FORM_SECTION_GAP }}>
                {form.isNhaCungCap && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer', marginBottom: FORM_ROW_GAP }}>
                    <input
                      type="checkbox"
                      checked={form.dia_diem_nhan_trung_giao}
                      onChange={(e) => setForm((f) => ({ ...f, dia_diem_nhan_trung_giao: e.target.checked }))}
                    />
                    Địa điểm nhận trùng giao
                  </label>
                )}
                {form.isNhaCungCap && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: FORM_ROW_GAP, color: 'var(--text-primary)' }}>Địa điểm giao</div>
                    <DiaDiemHangBlock
                      lines={form.dia_diem_giao_hang}
                      setLines={(u) => setForm((f) => ({ ...f, dia_diem_giao_hang: u(f.dia_diem_giao_hang) }))}
                      suggestions={diaDiemGiaoSuggestions}
                      setSuggestions={setDiaDiemGiaoSuggestions}
                      rowIndex={diaDiemGiaoRowIndex}
                      setRowIndex={setDiaDiemGiaoRowIndex}
                      loading={diaDiemGiaoLoading}
                      setLoading={setDiaDiemGiaoLoading}
                      debounceRef={diaDiemGiaoDebounceRef}
                      inputStyle={inputStyle}
                      btnSecondary={btnSecondary}
                      formRowGap={FORM_ROW_GAP}
                    />
                  </>
                )}
                <div style={{ fontSize: 11, fontWeight: 600, marginTop: form.isNhaCungCap ? FORM_SECTION_GAP : 0, marginBottom: FORM_ROW_GAP, color: 'var(--text-primary)' }}>Địa điểm nhận hàng</div>
                {form.isNhaCungCap && form.dia_diem_nhan_trung_giao ? (
                  <div style={{ padding: 10, fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-tab)', border: '1px solid var(--border)', borderRadius: 4 }}>
                    Đồng bộ với địa điểm giao
                    {form.dia_diem_giao_hang.filter((s) => (s ?? '').trim()).length === 0
                      ? ' — chưa có dòng'
                      : ` — ${form.dia_diem_giao_hang.filter((s) => (s ?? '').trim()).length} dòng`}
                  </div>
                ) : (
                  <DiaDiemHangBlock
                    lines={form.dia_diem_nhan_hang}
                    setLines={(u) => setForm((f) => ({ ...f, dia_diem_nhan_hang: u(f.dia_diem_nhan_hang) }))}
                    suggestions={diaDiemNhanSuggestions}
                    setSuggestions={setDiaDiemNhanSuggestions}
                    rowIndex={diaDiemNhanRowIndex}
                    setRowIndex={setDiaDiemNhanRowIndex}
                    loading={diaDiemNhanLoading}
                    setLoading={setDiaDiemNhanLoading}
                    debounceRef={diaDiemNhanDebounceRef}
                    inputStyle={inputStyle}
                    btnSecondary={btnSecondary}
                    formRowGap={FORM_ROW_GAP}
                  />
                )}
              </div>
            </>
          )}

          {formTab === 'khac' && form.loai_kh === 'ca_nhan' && (
            <>
              {/* Vị trí địa lý - giống Tổ chức: Quốc gia, Tỉnh/TP, Xã/Phường */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: FORM_SECTION_GAP, marginBottom: FORM_SECTION_GAP }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: FORM_ROW_GAP, color: 'var(--text-primary)' }}>Vị trí địa lý</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: FORM_GRID_GAP }}>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Quốc gia</label>
                    <div style={{ flex: 1, position: 'relative', height: FORM_FIELD_HEIGHT }}>
                      <select
                        style={{ ...inputStyle, width: '100%', height: '100%', boxSizing: 'border-box', appearance: 'none', paddingRight: 26 }}
                        value={form.quoc_gia}
                        onChange={(e) => setForm((f) => ({ ...f, quoc_gia: e.target.value }))}
                      >
                        {form.quoc_gia && !DANH_SACH_QUOC_GIA.includes(form.quoc_gia) && (
                          <option value={form.quoc_gia}>{form.quoc_gia}</option>
                        )}
                        {DANH_SACH_QUOC_GIA.map((qg) => (
                          <option key={qg} value={qg}>{qg}</option>
                        ))}
                      </select>
                      <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)' }}>
                        <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                      </span>
                    </div>
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Tỉnh/TP</label>
                    <div ref={tinhTpWrapRef2} style={{ flex: 1, position: 'relative', height: FORM_FIELD_HEIGHT }}>
                      {form.quoc_gia === 'Việt Nam' ? (
                        <>
                          <input
                            style={{ ...inputStyle, width: '100%', height: '100%', boxSizing: 'border-box', paddingRight: 26 }}
                            value={openTinhTp ? tinhTpFilter : form.tinh_tp}
                            onChange={(e) => {
                              setTinhTpFilter(e.target.value)
                              setOpenTinhTp(true)
                            }}
                            onFocus={() => {
                              setTinhTpFilter(form.tinh_tp)
                              setOpenTinhTp(true)
                            }}
                            onClick={() => { if (!openTinhTp) { setTinhTpFilter(form.tinh_tp); setOpenTinhTp(true) } }}
                            placeholder="Nhập để lọc hoặc chọn tỉnh/thành phố"
                          />
                          <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)' }}>
                            <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                          </span>
                          {openTinhTp && (
                            <div
                              style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: '100%',
                                marginTop: 2,
                                maxHeight: 220,
                                overflowY: 'auto',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border)',
                                borderRadius: 4,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                zIndex: 1000,
                              }}
                            >
                              {tinhTpFiltered.length === 0 ? (
                                <div style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontSize: 12 }}>Không có kết quả</div>
                              ) : (
                                tinhTpFiltered.map((t) => (
                                  <div
                                    key={t}
                                    role="option"
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      setForm((f) => ({ ...f, tinh_tp: t, xa_phuong: '' }))
                                      setTinhTpFilter(t)
                                      setOpenTinhTp(false)
                                    }}
                                    style={{
                                      padding: '6px 10px',
                                      cursor: 'pointer',
                                      fontSize: 12,
                                      background: form.tinh_tp === t ? 'var(--accent)' : undefined,
                                      color: form.tinh_tp === t ? 'var(--accent-text)' : 'var(--text-primary)',
                                    }}
                                  >
                                    {t}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <input style={{ ...inputStyle, width: '100%', height: '100%', boxSizing: 'border-box', paddingRight: 26 }} value={form.tinh_tp} onChange={(e) => setForm((f) => ({ ...f, tinh_tp: e.target.value }))} placeholder="Tỉnh/Thành phố" />
                          <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)' }}>
                            <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={fieldRow}>
                    <label style={{ ...labelStyle, minWidth: labelMinWidth }}>Xã/Phường</label>
                    <div ref={xaPhuongWrapRef2} style={{ flex: 1, position: 'relative', height: FORM_FIELD_HEIGHT }}>
                      {form.quoc_gia === 'Việt Nam' && form.tinh_tp && MA_TINH_THEO_TEN[form.tinh_tp] ? (
                        <>
                          <input
                            style={{ ...inputStyle, width: '100%', height: '100%', boxSizing: 'border-box', paddingRight: 26 }}
                            value={openXaPhuong ? xaPhuongFilter : form.xa_phuong}
                            onChange={(e) => {
                              setXaPhuongFilter(e.target.value)
                              setOpenXaPhuong(true)
                            }}
                            onFocus={() => {
                              setXaPhuongFilter(form.xa_phuong)
                              setOpenXaPhuong(true)
                            }}
                            onClick={() => { if (!openXaPhuong) { setXaPhuongFilter(form.xa_phuong); setOpenXaPhuong(true) } }}
                            placeholder={wardsLoading ? 'Đang tải...' : 'Nhập để lọc hoặc chọn xã/phường'}
                            disabled={wardsLoading}
                          />
                          <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)' }}>
                            <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                          </span>
                          {openXaPhuong && !wardsLoading && (
                            <div
                              style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: '100%',
                                marginTop: 2,
                                maxHeight: 220,
                                overflowY: 'auto',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border)',
                                borderRadius: 4,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                zIndex: 1000,
                              }}
                            >
                              {xaPhuongFiltered.length === 0 ? (
                                <div style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontSize: 12 }}>Không có kết quả</div>
                              ) : (
                                xaPhuongFiltered.map((w) => (
                                  <div
                                    key={w}
                                    role="option"
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      setForm((f) => ({ ...f, xa_phuong: w }))
                                      setXaPhuongFilter(w)
                                      setOpenXaPhuong(false)
                                    }}
                                    style={{
                                      padding: '6px 10px',
                                      cursor: 'pointer',
                                      fontSize: 12,
                                      background: form.xa_phuong === w ? 'var(--accent)' : undefined,
                                      color: form.xa_phuong === w ? 'var(--accent-text)' : 'var(--text-primary)',
                                    }}
                                  >
                                    {w}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <input style={{ ...inputStyle, width: '100%', height: '100%', boxSizing: 'border-box', paddingRight: 26 }} value={form.xa_phuong} onChange={(e) => setForm((f) => ({ ...f, xa_phuong: e.target.value }))} placeholder="Xã/Phường" />
                          <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)' }}>
                            <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Địa điểm — cùng logic Tổ chức */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: FORM_SECTION_GAP, marginBottom: FORM_SECTION_GAP }}>
                {form.isNhaCungCap && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer', marginBottom: FORM_ROW_GAP }}>
                    <input
                      type="checkbox"
                      checked={form.dia_diem_nhan_trung_giao}
                      onChange={(e) => setForm((f) => ({ ...f, dia_diem_nhan_trung_giao: e.target.checked }))}
                    />
                    Địa điểm nhận trùng giao
                  </label>
                )}
                {form.isNhaCungCap && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: FORM_ROW_GAP, color: 'var(--text-primary)' }}>Địa điểm giao</div>
                    <DiaDiemHangBlock
                      lines={form.dia_diem_giao_hang}
                      setLines={(u) => setForm((f) => ({ ...f, dia_diem_giao_hang: u(f.dia_diem_giao_hang) }))}
                      suggestions={diaDiemGiaoSuggestions}
                      setSuggestions={setDiaDiemGiaoSuggestions}
                      rowIndex={diaDiemGiaoRowIndex}
                      setRowIndex={setDiaDiemGiaoRowIndex}
                      loading={diaDiemGiaoLoading}
                      setLoading={setDiaDiemGiaoLoading}
                      debounceRef={diaDiemGiaoDebounceRef}
                      inputStyle={inputStyle}
                      btnSecondary={btnSecondary}
                      formRowGap={FORM_ROW_GAP}
                    />
                  </>
                )}
                <div style={{ fontSize: 11, fontWeight: 600, marginTop: form.isNhaCungCap ? FORM_SECTION_GAP : 0, marginBottom: FORM_ROW_GAP, color: 'var(--text-primary)' }}>Địa điểm nhận hàng</div>
                {form.isNhaCungCap && form.dia_diem_nhan_trung_giao ? (
                  <div style={{ padding: 10, fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-tab)', border: '1px solid var(--border)', borderRadius: 4 }}>
                    Đồng bộ với địa điểm giao
                    {form.dia_diem_giao_hang.filter((s) => (s ?? '').trim()).length === 0
                      ? ' — chưa có dòng'
                      : ` — ${form.dia_diem_giao_hang.filter((s) => (s ?? '').trim()).length} dòng`}
                  </div>
                ) : (
                  <DiaDiemHangBlock
                    lines={form.dia_diem_nhan_hang}
                    setLines={(u) => setForm((f) => ({ ...f, dia_diem_nhan_hang: u(f.dia_diem_nhan_hang) }))}
                    suggestions={diaDiemNhanSuggestions}
                    setSuggestions={setDiaDiemNhanSuggestions}
                    rowIndex={diaDiemNhanRowIndex}
                    setRowIndex={setDiaDiemNhanRowIndex}
                    loading={diaDiemNhanLoading}
                    setLoading={setDiaDiemNhanLoading}
                    debounceRef={diaDiemNhanDebounceRef}
                    inputStyle={inputStyle}
                    btnSecondary={btnSecondary}
                    formRowGap={FORM_ROW_GAP}
                  />
                )}
              </div>
            </>
          )}

          {/* Footer: link trái, nút phải */}
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: FORM_SECTION_GAP, borderTop: '1px solid var(--border)' }}>
            <a href="#video" style={{ fontSize: 11, color: 'var(--accent)' }} onClick={(e) => e.preventDefault()}>Xem video hướng dẫn</a>
            <div style={{ display: 'flex', gap: FORM_ROW_GAP }}>
              <button type="button" style={formFooterButtonCancel} onClick={dongModal}>Hủy bỏ</button>
              <button type="button" style={formFooterButtonSave} onClick={dongY}>Lưu</button>
              {(modalOpen === 'add' || modalOpen === 'clone') && (
                <button type="button" style={formFooterButtonSaveAndAdd} onClick={dongYVaThem}>Lưu và tiếp tục</button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {showThemNhomKhModal && (
        <ThemNhomKhNccModal
          parentOptions={danhSachNhom}
          onClose={() => setShowThemNhomKhModal(false)}
          onSave={(item) => {
            const list = loadNhomKhachHang()
            if (!list.some((x) => x.ma === item.ma)) {
              saveNhomKhachHang([...list, item])
              setDanhSachNhom(loadNhomKhachHang())
            }
            setShowThemNhomKhModal(false)
          }}
          onSaveAndAdd={(item) => {
            const list = loadNhomKhachHang()
            if (!list.some((x) => x.ma === item.ma)) {
              saveNhomKhachHang([...list, item])
              setDanhSachNhom(loadNhomKhachHang())
            }
          }}
        />
      )}

      {showThemDieuKhoanTT && (
        <ThemDieuKhoanThanhToanModal
          existingItems={danhSachDKTT}
          onClose={() => setShowThemDieuKhoanTT(false)}
          onSave={(item) => {
            const list = [...danhSachDKTT]
            if (!list.some((x) => x.ma === item.ma)) {
              list.push(item)
              saveDieuKhoanThanhToanKh(list)
              setDanhSachDKTT(list)
            }
            setForm((f) => ({ ...f, dieu_khoan_tt: item.ten, so_ngay_duoc_no: formatSoNguyenInput(String(item.so_ngay_duoc_no)), han_muc_no_kh: formatSoTien(String(item.so_cong_no_toi_da)) }))
            setShowThemDieuKhoanTT(false)
          }}
          onSaveAndAdd={(item) => {
            const list = [...danhSachDKTT]
            if (!list.some((x) => x.ma === item.ma)) {
              list.push(item)
              saveDieuKhoanThanhToanKh(list)
              setDanhSachDKTT(list)
            }
            setForm((f) => ({ ...f, dieu_khoan_tt: item.ten, so_ngay_duoc_no: formatSoNguyenInput(String(item.so_ngay_duoc_no)), han_muc_no_kh: formatSoTien(String(item.so_cong_no_toi_da)) }))
          }}
        />
      )}
    </>
  )
}
