import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, type SetStateAction } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactDOM from 'react-dom'
import {
  Plus,
  Pencil,
  Save,
  Trash2,
  Paperclip,
  Loader2,
  FileText,
  Printer,
  Mail,
  Power,
  ChevronDown,
  Minus,
  Square,
  X,
} from 'lucide-react'
import { DatePickerCustomHeader } from '../../../components/datePickerCustomHeader'
import { htqlDatePickerPopperTop } from '../../../constants/datePickerPlacement'
import { DatePickerTgNhanInput } from '../../../components/datePickerTgNhanInput'
import { DatePickerReadOnlyTriggerInput } from '../../../components/datePickerReadOnlyTriggerInput'
import DatePicker, { registerLocale } from 'react-datepicker'
import { addDays, setHours, setMinutes } from 'date-fns'
import { vi } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import {
  LOOKUP_CONTROL_HEIGHT,
  lookupInputWithChevronStyle,
  lookupChevronOverlayStyle,
  lookupActionButtonStyle,
} from '../../../constants/lookupControlStyles'
import { loadDieuKhoanThanhToanKh, saveDieuKhoanThanhToanKh, khachHangGetAll, type DieuKhoanThanhToanKhItem } from '../../crm/banHang/khachHang/khachHangApi'
import { KhachHang } from '../../crm/banHang/khachHang/khachHang'
import type { KhachHangRecord } from '../../crm/banHang/khachHang/khachHangApi'
import type { VatTuHangHoaRecord } from '../../../types/vatTuHangHoa'
import { vatTuHangHoaGetForBanHang } from '../../kho/vatTuHangHoaApi'
import { donViTinhGetAll } from '../../kho/donViTinhApi'
import { matchSearchKeyword } from '../../../utils/stringUtils'
import { vietTatTenNganHang } from '../../../utils/nganHangDisplay'
import { mau_tt_bang_khongdongia, mau_tt_bang_codongia, mau_tt_bang_codongia_khong_vat } from './chiTienBangGridMau'
import {
  formatSoNguyenInput,
  formatNumberDisplay,
  formatSoTien,
  formatSoTienHienThi,
  formatSoTuNhienInput,
  formatSoThapPhan,
  formatTlCkBaoGiaInput,
  chuanHoaTlCkBaoGiaSauBlur,
  normalizeKichThuocInput,
  parseFloatVN,
  parseNumber,
} from '../../../utils/numberFormat'
import { dvtLaMetVuong } from '../../../utils/dvtLaMetVuong'
import {
  buildDvtOptionsForVthh,
  chiTietToLines,
  computeDonHangMuaFooterTotals,
  formatDonHangLineThanhTienDisplay,
  formatDonHangLineTienThueDisplay,
  formatDonHangLineTongTienDisplay,
  parsePctThueGtgtFromLine,
  type DonHangMuaGridLineRow,
} from '../../../utils/donHangMuaCalculations'
import {
  BAO_GIA_COL_TEN_SPHH,
  getDonGiaBanChiTienBangLine,
  migrateChiTienBangLinesToCoDonGia,
  enrichChiTienBangGridLinesWithVthh,
} from '../../../utils/chiTienBangDonGiaBan'
import {
  chiTienBangGetAll,
  chiTienBangGetChiTiet,
  getDefaultChiTienBangFilter,
  type ChiTienBangCreatePayload,
  type ChiTienBangRecord,
  type ChiTienBangChiTiet,
  type ChiTienBangAttachmentItem,
  TINH_TRANG_BAO_GIA_DA_GUI_KHACH,
  chiTienBangBiKhoaChinhSuaTheoTinhTrang,
  HTQL_CHI_TIEN_BANG_RELOAD_EVENT,
  dongBoLaiNoiDungPhieuChiTheoMaDonHang,
} from './chiTienBangApi'
import { daGhiSoPhieuChi } from './ghiSoChiTienApi'
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
} from '../../crm/muaHang/nhanVatTuHangHoa/nhanVatTuHangHoaApi'
import type { NhanVatTuHangHoaApi } from '../../crm/muaHang/nhanVatTuHangHoa/nhanVatTuHangHoaApiContext'
import { NhanVatTuHangHoaApiProvider } from '../../crm/muaHang/nhanVatTuHangHoa/nhanVatTuHangHoaApiContext'
import { NhanVatTuHangHoaFormModal } from '../../crm/muaHang/nhanVatTuHangHoa/nhanVatTuHangHoaFormModal'
import {
  ChiTienBangDinhKemModal,
  chuanHoaDuongDanDinhKemChiTienBang,
  partMccForPath,
  type ChiTienBangDinhKemPendingRow,
} from './chiTienBangDinhKemModal'
import { layLichSuChiTienChoKhach, coLichSuChiTien } from './lichSuChiTienKhach'
import {
  layChungTuConNoTheoKhach,
  demSoLanChiTruocDoChoMa,
  type ChungTuCongNoRow,
} from './chungTuCongNoChiTien'
import {
  taiKhoanGetAll,
  taiKhoanLaTkNganHang,
  taiKhoanLaTienMat,
} from '../taiKhoan/taiKhoanApi'
import type { TaiKhoanRecord } from '../../../types/taiKhoan'
import { buildDienGiaiPhieuChi } from '../../../utils/dienGiaiPhieuChi'
import { getCongTyTaiKhoanNganHang } from '../../../utils/congTyTaiKhoanNganHang'
import { useChiTienBangApi } from './chiTienBangApiContext'
import { TINH_TRANG_NVTHH_DA_NHAP_KHO } from './chiTienBangApi'
import { setUnsavedChanges } from '../../../context/unsavedChanges'
import { Modal } from '../../../components/common/modal'
import { useToastOptional } from '../../../context/toastContext'
import { HTQL_FORM_ERROR_BORDER, htqlFocusAndScrollIntoView } from '../../../utils/formValidationFocus'
import { preserveTimeWhenCalendarDayChanges } from '../../../utils/reactDatepickerPreserveTime'
import {
  loaiThuChiQueryKey,
  loaiThuChiQueryFn,
  loaiThuChiLyDoPhieuChiOptions,
  loaiThuChiChuanHoaLyDoPhieuChi,
  laLyDoPhieuChiTraKhachHang,
} from '../loaiThuChi/loaiThuChiApi'
import { ThemDieuKhoanThanhToanModal } from '../../crm/shared/themDieuKhoanThanhToanModal'
import { hinhThucGetAll, type HinhThucRecord } from '../../crm/shared/hinhThucApi'
import { getBanksVietnam, type BankItem } from '../../crm/shared/banksApi'
import { ThemHinhThucModal } from '../../crm/shared/themHinhThucModal'
import { mauHoaDonGetAll, type MauHoaDonItem } from '../../crm/shared/mauHoaDonApi'
import { ThemMauHoaDonModal } from '../../crm/shared/themMauHoaDonModal'
import {
  HTQL_DON_HANG_BAN_LIST_REFRESH_EVENT,
  HTQL_HOP_DONG_BAN_LIST_REFRESH_EVENT,
  HTQL_PHU_LUC_HOP_DONG_BAN_LIST_REFRESH_EVENT,
} from '../../crm/banHang/banHangTabEvent'
import ChiTienBangDetailStyles from './banHangDetailMirror.module.css'
import ChiTienBangChiTietStyles from './ChiTienBang.module.css'

type ChiTienBangGridLineRow = DonHangMuaGridLineRow & {
  'mD'?: string
  'mR'?: string
  'Lượng'?: string
}
type DieuKhoanThanhToanItem = DieuKhoanThanhToanKhItem

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

registerLocale('vi', vi)

/** Chi tiết phiếu thu — lưu trong `noi_dung` dòng chi tiết (prefix JSON). */
const PHIEU_CHI_ROW_PREFIX = '__PC_ROW__:'
type PhieuThuChiTietRow = {
  ma_chung_tu: string
  ngay_tao: string
  han_tt: string
  so_phai_thu: string
  so_chua_thu: string
  thu_lan_nay: string
  noi_dung_thu: string
}
function emptyPhieuThuRow(): PhieuThuChiTietRow {
  return {
    ma_chung_tu: '',
    ngay_tao: '',
    han_tt: '',
    so_phai_thu: '',
    so_chua_thu: '',
    thu_lan_nay: '',
    noi_dung_thu: '',
  }
}
function serializePhieuThuNoiDung(r: PhieuThuChiTietRow): string {
  return PHIEU_CHI_ROW_PREFIX + JSON.stringify(r)
}
/** Mã chứng từ bán (2026/BG/…, 2026/ĐHB/…) — lọc dòng chi tiết cũ nhầm mã hàng */
function looksLikeMaChungTuBan(ma: string): boolean {
  return /^\d{4}\//.test((ma ?? '').trim())
}

function parsePhieuThuFromChiTiet(ct: ChiTienBangChiTiet[]): PhieuThuChiTietRow[] {
  const rows: PhieuThuChiTietRow[] = []
  for (const c of ct) {
    const raw = (c.noi_dung ?? '').trim()
    if (raw.startsWith(PHIEU_CHI_ROW_PREFIX)) {
      try {
        const j = JSON.parse(raw.slice(PHIEU_CHI_ROW_PREFIX.length)) as Partial<PhieuThuChiTietRow>
        rows.push({
          ma_chung_tu: j.ma_chung_tu ?? c.ma_hang ?? '',
          ngay_tao: j.ngay_tao ?? '',
          han_tt: j.han_tt ?? '',
          so_phai_thu: j.so_phai_thu ?? '',
          so_chua_thu: j.so_chua_thu ?? '',
          thu_lan_nay: j.thu_lan_nay ?? formatSoTienHienThi((c.don_gia ?? 0) * (c.so_luong ?? 0)),
          noi_dung_thu: j.noi_dung_thu ?? c.ten_hang ?? '',
        })
      } catch {
        /* bỏ qua dòng lỗi */
      }
    } else {
      const ma = (c.ma_hang ?? '').trim()
      if (!looksLikeMaChungTuBan(ma)) continue
      rows.push({
        ma_chung_tu: ma,
        ngay_tao: '',
        han_tt: '',
        so_phai_thu: '',
        so_chua_thu: '',
        thu_lan_nay: formatSoTienHienThi((c.don_gia ?? 0) * (c.so_luong ?? 0)),
        noi_dung_thu: c.ten_hang,
      })
    }
  }
  const filtered = rows.filter((r) => {
    const ma = (r.ma_chung_tu ?? '').trim()
    return ma !== '' && ma !== '—'
  })
  return filtered.length > 0 ? filtered : [emptyPhieuThuRow()]
}

const FORM_FIELD_HEIGHT = LOOKUP_CONTROL_HEIGHT
/** Chiều rộng nhãn Thông tin chung — canh lề trái với Địa điểm GH (rule canh-le) */
const LABEL_MIN_WIDTH = 90
/** Khối Báo giá / Chứng từ / Hóa đơn (phiếu NVTHH): đồng bộ nhãn với hàng NV mua hàng */
const LABEL_DON_HANG_BOX = 82

/** ĐTDD (`dt_di_dong`) ưu tiên hơn ĐT khác (`dt_co_dinh`); nếu chỉ một trong hai có giá trị thì lấy giá trị đó; cuối cùng `dien_thoai`. */
function soDienThoaiUuTienTuKhachHang(kh: KhachHangRecord): string {
  const dd = (kh.dt_di_dong ?? '').trim()
  const dtKhac = (kh.dt_co_dinh ?? '').trim()
  if (dd && dtKhac) return dd
  if (dd) return dd
  if (dtKhac) return dtKhac
  return (kh.dien_thoai ?? '').trim()
}
/**
 * Tổng chiều rộng vùng giá trị phiếu NVTHH (ô + chevron trong ô + gap + nút +), cố định mép phải thẳng hàng.
 * 160 = (ô lookup co giãn) + gap 2 + nút 24 (LOOKUP_CONTROL_HEIGHT).
 */
const NVTHH_DON_HANG_BOX_VALUE_BAND_PX = 160

/** Wrapper ô đơn (input/select) trong khối chứng từ/HĐ phiếu — cùng band 160px với NV mua hàng */
const nvthhChungTuValueCellWrap: React.CSSProperties = {
  width: NVTHH_DON_HANG_BOX_VALUE_BAND_PX,
  minWidth: NVTHH_DON_HANG_BOX_VALUE_BAND_PX,
  maxWidth: NVTHH_DON_HANG_BOX_VALUE_BAND_PX,
  flex: 'none',
  boxSizing: 'border-box',
}

/**
 * Bọc `DatePicker` trong band `DonHangBoxValueLikeNvMuaHang`: `flex: 1` + cột `stretch`
 * để `.react-datepicker-wrapper` / `__input-container` / `input` rộng 100% — mép phải thẳng hàng hàng NV mua hàng (nút +).
 */
const donHangBoxDatePickerWrapStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  width: '100%',
  alignSelf: 'stretch',
  minHeight: FORM_FIELD_HEIGHT,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  justifyContent: 'center',
  boxSizing: 'border-box',
  borderRadius: 4,
}

/** Cùng hàng giá trị với NV mua hàng: ô co giãn + chỗ nút + (ẩn khi readOnly). */
const donHangBoxNvMuaHangValueRow: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 2,
}

function DonHangBoxValueLikeNvMuaHang({
  readOnly,
  trailingSlot,
  noTrailingPad,
  fixedBandWidth,
  children,
}: {
  readOnly: boolean
  /** Nút + thật (vd. NV mua hàng); nếu không có và không readOnly → giữ chỗ 24px như nút +. */
  trailingSlot?: React.ReactNode
  /** Bỏ vùng trống / nút sau ô (datepicker ngày xuất, TG nhận, TG chi). */
  noTrailingPad?: boolean
  /** Phiếu NVTHH: cố định tổng rộng band (ô + gap + nút), vd. 160px */
  fixedBandWidth?: number
  children: React.ReactNode
}) {
  const tail =
    noTrailingPad ? null : readOnly ? null : trailingSlot != null ? (
      trailingSlot
    ) : (
      <span
        style={{
          width: LOOKUP_CONTROL_HEIGHT,
          minWidth: LOOKUP_CONTROL_HEIGHT,
          height: LOOKUP_CONTROL_HEIGHT,
          flexShrink: 0,
          boxSizing: 'border-box',
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
        aria-hidden
      />
    )
  const rowStyle: React.CSSProperties = {
    ...donHangBoxNvMuaHangValueRow,
    ...(fixedBandWidth != null
      ? {
          width: fixedBandWidth,
          minWidth: fixedBandWidth,
          maxWidth: fixedBandWidth,
          flex: 'none',
        }
      : {}),
  }
  return (
    <div style={rowStyle}>
      <div style={{ flex: 1, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignSelf: 'stretch' }}>{children}</div>
      {tail}
    </div>
  )
}

/** NVTHH — TG nhập / Ngày chi: react-datepicker + `DatePickerTgNhanInput`; `noTrailingPad` + band 160px, mép phải trùng nút + (NV mua hàng). */
function NvthhChungTuDateTimeRow({
  label,
  fieldRowDyn,
  labelStyle,
  selected,
  onChange,
  pickerOpen,
  setPickerOpen,
  inputRef,
  valErrKey,
  errKey,
  ngayDonHang,
  readOnly,
}: {
  label: string
  fieldRowDyn: React.CSSProperties
  labelStyle: React.CSSProperties
  selected: Date | null
  onChange: (d: Date | null) => void
  pickerOpen: boolean
  setPickerOpen: (v: boolean) => void
  inputRef: React.RefObject<HTMLInputElement>
  valErrKey: string | null
  errKey: string
  ngayDonHang: Date | null
  readOnly: boolean
}) {
  return (
    <div style={fieldRowDyn}>
      <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>{label}</label>
      <DonHangBoxValueLikeNvMuaHang readOnly={readOnly} noTrailingPad fixedBandWidth={NVTHH_DON_HANG_BOX_VALUE_BAND_PX}>
        <div
          style={{
            ...donHangBoxDatePickerWrapStyle,
            border: valErrKey === errKey ? HTQL_FORM_ERROR_BORDER : '1px solid transparent',
          }}
        >
          <DatePicker
            {...htqlDatePickerPopperTop}
            selected={selected}
            onChange={(d: Date | null) => {
              const merged = preserveTimeWhenCalendarDayChanges(d, selected)
              if (merged && ngayDonHang && merged.getTime() < ngayDonHang.getTime()) return
              onChange(merged)
            }}
            open={pickerOpen}
            onClickOutside={() => setPickerOpen(false)}
            shouldCloseOnSelect={false}
            dateFormat="HH:mm dd/MM/yyyy"
            locale="vi"
            showMonthDropdown
            showYearDropdown
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={30}
            timeCaption="Thời gian"
            minDate={ngayDonHang ?? undefined}
            minTime={
              ngayDonHang &&
              selected &&
              selected.getFullYear() === ngayDonHang.getFullYear() &&
              selected.getMonth() === ngayDonHang.getMonth() &&
              selected.getDate() === ngayDonHang.getDate()
                ? ngayDonHang
                : setHours(setMinutes(new Date(), 0), 7)
            }
            maxTime={setHours(setMinutes(new Date(), 0), 19)}
            filterTime={(time) => {
              const hour = new Date(time).getHours()
              if (hour < 7 || hour > 19) return false
              if (!ngayDonHang) return true
              const tDay = new Date(time.getFullYear(), time.getMonth(), time.getDate())
              const nDay = new Date(ngayDonHang.getFullYear(), ngayDonHang.getMonth(), ngayDonHang.getDate())
              if (tDay.getTime() !== nDay.getTime()) return true
              return time.getHours() * 60 + time.getMinutes() >= ngayDonHang.getHours() * 60 + ngayDonHang.getMinutes()
            }}
            yearDropdownItemNumber={80}
            scrollableYearDropdown
            placeholderText="HH:mm dd/mm/yyyy"
            className="htql-datepicker-don-hang-box-full htql-datepicker-tg-nhan-input htql-datepicker-nvthh-band"
            calendarClassName="htql-datepicker-tg-nhan htql-datepicker-calendar"
            customInput={
              <DatePickerTgNhanInput
                ref={inputRef}
                onOpen={() => {
                  if (!selected) {
                    const now = new Date()
                    const min = now.getHours() * 60 + now.getMinutes()
                    if (min < 7 * 60 || min >= 19 * 60) {
                      let d = addDays(now, 1)
                      d = setHours(setMinutes(d, 0), 7)
                      if (ngayDonHang && d.getTime() < ngayDonHang.getTime()) {
                        d = setHours(setMinutes(ngayDonHang as Date, 0), 7)
                      }
                      onChange(d)
                    }
                  }
                  setPickerOpen(true)
                }}
              />
            }
            renderCustomHeader={(p) => <DatePickerCustomHeader {...p} />}
            disabled={readOnly}
          />
        </div>
      </DonHangBoxValueLikeNvMuaHang>
    </div>
  )
}

/** Đồng bộ với phiếu NVTHH (tab Phiếu nhập `gap: 2`). */
const FIELD_ROW_GAP = 2
/** MST: cố định chiều rộng, KH chiếm phần còn lại của dòng */
const MA_SO_THUE_FIELD_WIDTH = 118

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

/** Neo popover đính kèm + badge đếm file (flat) */
const toolbarDinhKemWrap: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  verticalAlign: 'middle',
}

const toolbarDinhKemBadge: React.CSSProperties = {
  position: 'absolute',
  top: -4,
  right: -4,
  minWidth: 16,
  height: 16,
  padding: '0 4px',
  borderRadius: 9999,
  background: '#e74c3c',
  color: '#fff',
  fontSize: 10,
  fontWeight: 700,
  lineHeight: '16px',
  textAlign: 'center',
  boxSizing: 'border-box',
  pointerEvents: 'none',
  border: '1px solid #fff',
  fontFamily: 'var(--font-misa), Tahoma, Arial, sans-serif',
}

/** Nút đính kèm cùng hàng ghi chú (phiếu NVTHH): icon + chữ một hàng, cao bằng ô nhập tiêu đề */
const inlineDinhKemPhieuBtn: React.CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  height: FORM_FIELD_HEIGHT,
  minHeight: FORM_FIELD_HEIGHT,
  maxHeight: FORM_FIELD_HEIGHT,
  padding: '0 8px',
  fontSize: 11,
  fontFamily: 'var(--font-misa), Tahoma, Arial, sans-serif',
  background: '#FFFFFF',
  border: '1px solid var(--border-strong)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  borderRadius: 4,
  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  boxSizing: 'border-box',
}

const phieuChiInlineLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  width: 'max-content',
  lineHeight: `${FORM_FIELD_HEIGHT}px`,
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
  marginBottom: 2,
  padding: '0 4px',
}

/** Tab Phiếu nhập / Phiếu chi / Hóa đơn — thấp hơn mặc định, sát khối thông tin chung */
const phieuTabBarBtnCompact: React.CSSProperties = { padding: '5px 12px', fontSize: 11 }

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

/** TG tạo / chuỗi thời gian chỉ đọc — canh phải (rule canh-le: Ngày, Giờ) */
const inputStyleDatetimeReadonlyDisplay: React.CSSProperties = {
  ...inputStyle,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
}

/** Số HĐ, số ngày được nợ, STK — canh phải (rule canh-le: Số) */
const inputStyleNumericField: React.CSSProperties = {
  ...inputStyle,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
}

const phieuChiStkInputBase = (chW: number): React.CSSProperties => ({
  ...inputStyle,
  width: `${chW}ch`,
  flex: 'none',
  flexGrow: 0,
  minWidth: 0,
  boxSizing: 'border-box',
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'right',
})
/** Cột NH — ưu tiên tên viết tắt (Short Name); rộng hơn để hiện đầy đủ gợi ý. */
const phieuChiBankFieldCompact: React.CSSProperties = {
  ...inputStyle,
  flex: '1 1 auto',
  minWidth: 80,
  maxWidth: 180,
  width: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
}
/** Nhãn NH (viết tắt). */
const phieuChiNganHangLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  width: 22,
  minWidth: 22,
  textAlign: 'right',
  lineHeight: `${FORM_FIELD_HEIGHT}px`,
}
/** Tên người gửi / nhận — vẫn rộng hơn cột NH. */
const phieuChiTenNguoiField: React.CSSProperties = {
  ...inputStyle,
  flex: '3 1 180px',
  minWidth: 100,
  maxWidth: '100%',
  boxSizing: 'border-box',
}

/** Bao bảng — giống DataGrid màn hình ngoài; chiều cao do flex (form) quyết định */
const gridWrap: React.CSSProperties = {
  border: '0.5px solid var(--border)',
  borderRadius: '4px',
  overflow: 'hidden',
  background: 'var(--bg-secondary)',
  minHeight: 120,
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

const footerSummaryItem: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--text-primary)',
}

const footerSummaryValue: React.CSSProperties = {
  color: 'var(--accent)',
  fontWeight: 700,
}

const hintBar: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 10,
  color: 'var(--text-muted)',
  background: 'var(--bg-secondary)',
  borderTop: '1px solid var(--border)',
}

type ChungTuMuaLoaiHdPhieu = 'gtgt' | 'hd_le'

function normalizeChungTuMuaPtttStored(raw: string | undefined): 'tien_mat' | 'chuyen_khoan' {
  if (raw === 'CK' || raw === 'chuyen_khoan') return 'chuyen_khoan'
  return 'tien_mat'
}

export interface ChiTienFormProps {
  onClose: () => void
  /** Sau khi lưu thành công; bản ghi mới/cập nhật (dùng liên kết Đơn hàng bán — YC62). */
  onSaved?: (savedRecord?: ChiTienBangRecord) => void
  /** Kéo form (giống form Vật tư hàng hóa) */
  onHeaderPointerDown?: (e: React.MouseEvent) => void
  /** Style handle kéo (vd. `useDraggable().dragHandleProps.style`) */
  headerDragStyle?: React.CSSProperties
  dragging?: boolean
  /** Thu nhỏ form (chỉ còn thanh tiêu đề) */
  onMinimize?: () => void
  /** Phóng to / khôi phục kích thước form */
  onMaximize?: () => void
  /** Chế độ xem: chỉ hiển thị, không sửa */
  readOnly?: boolean
  /** Dữ liệu đơn khi mở chế độ xem */
  initialDon?: ChiTienBangRecord | null
  initialChiTiet?: ChiTienBangChiTiet[] | null
  /** Dữ liệu đổ sẵn khi tạo mới (chuyển từ chứng từ khác), không phải chế độ xem */
  prefillDon?: Partial<ChiTienBangRecord> | null
  prefillChiTiet?: ChiTienBangChiTiet[] | null
  /** Sau khi bấm Lưu (chỉ lưu): chuyển form sang chế độ xem đơn vừa lưu, không đóng form */
  onSavedAndView?: (don: ChiTienBangRecord) => void
  formTitle?: string
  soDonLabel?: string
  // [ChiTienBang] Bỏ logic đối chiếu đơn mua - không áp dụng cho Báo giá
  // doiChieuSource?: 'don_mua_hang'
  /** Tạo phiếu nhận từ menu BG: prefill tiêu đề/HT/kho/ĐĐGH từ BG (HT/kho/ĐĐGH cho phép sửa lại); lưới chỉ sửa Số lượng; TG tạo = hiện tại; tiêu đề form = `_tieu_de_nguon_dhm`. */
  phieuNhanTuChiTienBang?: boolean
  /** Phiếu nhận mở từ «Thêm mới» danh sách (không prefill BG): lưới chi tiết giống form BG (thêm/xóa dòng, sửa đủ cột). */
  phieuNhanThemMoiTuDanhSach?: boolean
  /** Xem phiếu/đơn từ popup: luôn chỉ đọc, ẩn nút Sửa (dùng với readOnly + initialDon). */
  viewOnlyLocked?: boolean
  /** Form «Thu tiền» (Tài chính): nhãn/nghiệp vụ phiếu thu, không dùng UI báo giá. */
  chiTienPhieu?: boolean
  /** Mở từ menu Đơn hàng bán: ẩn bảng công nợ, focus «Thu lần này», mặc định theo số chưa thu (YC71). */
  phieuChiTuMenuBanHang?: boolean
}

/** Phiếu NVTHH: hiển thị «Đã nhập kho» thay cho cùng giá trị đồng bộ BG «Đã nhận hàng». */
function normalizeTinhTrangPhieuNvthhForForm(tinh: string | undefined, laPhieuNhan: boolean): string {
  const t = (tinh ?? '').trim()
  const base = t === '' ? 'Mới tạo' : t
  if (!laPhieuNhan) return base
  return base === TINH_TRANG_BAO_GIA_DA_GUI_KHACH ? TINH_TRANG_NVTHH_DA_NHAP_KHO : base
}

/** Các mức thuế suất GTGT thiết lập trước (dropdown % thuế GTGT) */
const THUE_SUAT_GTGT_OPTIONS = [
  { value: '', label: 'Chưa xác định' },
  { value: '0', label: '0%' },
  { value: '5', label: '5%' },
  { value: '8', label: '8%' },
  { value: '10', label: '10%' },
] as const


const mauBgCoDonGiaDisplay = [...mau_tt_bang_codongia, 'Ghi chú'] as const
const mauBgCoDonGiaKhongVatDisplay = [...mau_tt_bang_codongia_khong_vat, 'Ghi chú'] as const
const mauBgKhongDonGiaDisplay = [...mau_tt_bang_khongdongia] as const

/** Bản ghi cũ không có `ap_dung_vat_gtgt` → coi như có VAT; form thêm mới không có bản ghi → mặc định không VAT (YC44). */
function deriveApDungVatGtgtTuBanGhi(r: ChiTienBangRecord | Partial<ChiTienBangRecord> | null | undefined): boolean {
  if (r == null) return false
  const v = (r as ChiTienBangRecord).ap_dung_vat_gtgt
  if (typeof v === 'boolean') return v
  return true
}

/** [YC37] Một dòng trống theo mẫu — Lượng mặc định 1. */
function createEmptyChiTienBangLine(mau: 'codongia' | 'khongdongia'): ChiTienBangGridLineRow {
  const cols = mau === 'codongia' ? [...mauBgCoDonGiaDisplay] : [...mauBgKhongDonGiaDisplay]
  const acc: Record<string, string> = {}
  for (const c of cols) {
    if (c === 'Lượng') acc[c] = '1'
    else acc[c] = ''
  }
  return acc as unknown as ChiTienBangGridLineRow
}

/** Chi tiết BG → dòng lưới (SPHH + Đơn giá bán + kích thước). */
function chiTietToChiTienBangLines(ct: ChiTienBangChiTiet[]): ChiTienBangGridLineRow[] {
  const baseLines = chiTietToLines(ct as any)
  return baseLines.map((line, i) => {
    const c = ct[i]
    const row = { ...line } as Record<string, string>
    const ten = row['Tên VTHH'] ?? ''
    const dg = row['ĐG mua'] ?? ''
    delete row['Tên VTHH']
    delete row['ĐG mua']
    row[BAO_GIA_COL_TEN_SPHH] = ten
    row['Nội dung'] = (c as ChiTienBangChiTiet).noi_dung ?? ''
    row['Đơn giá'] = dg
    if (c) {
      if (c.chieu_dai != null && Number(c.chieu_dai) > 0) row['mD'] = formatSoThapPhan(String(c.chieu_dai), 2)
      if (c.chieu_rong != null && Number(c.chieu_rong) > 0) row['mR'] = formatSoThapPhan(String(c.chieu_rong), 2)
      if (c.luong != null && Number(c.luong) > 0) row['Lượng'] = formatSoNguyenInput(String(Math.max(1, Math.round(Number(c.luong)))))
      else row['Lượng'] = row['Lượng']?.trim() || '1'
    }
    return row as unknown as ChiTienBangGridLineRow
  })
}

/**
 * Khôi phục checkbox hình thức từ bản ghi đã lưu.
 * - `ca_hai`: cả nhập kho + không nhập kho.
 * - Bản ghi cũ chỉ có `nhap_kho` nhưng còn tên/địa chỉ CT → bật thêm hình thức không nhập kho.
 */
function deriveHinhThucSelectedIdsFromRecord(
  d: Partial<ChiTienBangRecord> & { hinh_thuc?: string; dia_chi_cong_trinh?: string } | null | undefined
): string[] {
  if (!d) return []
  const all = hinhThucGetAll()
  const htKho = all.find((x) => /nhập kho|nhap kho/i.test(x.ten) && !/không|khong/i.test(x.ten))
  const htCt = all.find((x) => /không nhập kho|khong nhap kho/i.test(x.ten))
  const mode = (d.hinh_thuc ?? '').trim()
  const coCt = Boolean((d.dia_chi_cong_trinh ?? '').trim())
  const ids: string[] = []
  if (mode === 'ca_hai') {
    if (htKho) ids.push(htKho.id)
    if (htCt) ids.push(htCt.id)
  } else if (mode === 'khong_nhap_kho') {
    if (htCt) ids.push(htCt.id)
  } else if (mode === 'nhap_kho') {
    if (htKho) ids.push(htKho.id)
    if (coCt && htCt && !ids.includes(htCt.id)) ids.push(htCt.id)
  } else {
    if (coCt && htCt && !ids.includes(htCt.id)) ids.push(htCt.id)
    if (ids.length === 0 && htKho) ids.push(htKho.id)
  }
  return ids
}

/** Phiếu nhận — mặc định chọn hình thức «nhập kho» (không «không nhập kho»). */
function defaultPhieuNhanHinhThucNhapKhoIds(): string[] {
  const all = hinhThucGetAll()
  const htKho = all.find((x) => /nhập kho|nhap kho/i.test(x.ten) && !/không|khong/i.test(x.ten))
  return htKho ? [htKho.id] : []
}

const PHIEU_CHUNG_TU_MUA_DEFAULT_TEXT = 'Mua hàng nhập kho'
/** Lưới chi tiết SPHH: cao theo nội dung (bảng + nút Thêm dòng), trần cuộn dọc khi vượt quá */

/** Tab Khách hàng: «Người liên hệ» lưu `ho_va_ten_lien_he`; đồng bộ ưu tiên trước `nguoi_lien_he`. */
function tenNguoiLienHeTuDanhBaKh(kh: KhachHangRecord): string {
  return (kh.ho_va_ten_lien_he ?? kh.nguoi_lien_he ?? '').trim()
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

/** Độ rộng cột cố định (rule mau_gia: STT, Mã, Tên, ĐVT, Kích thước, Số lượng giữ nguyên khi chuyển mẫu). */
const COL_WIDTH_STT = 36
const COL_WIDTH_MA = 88
const COL_WIDTH_TEN = 220
const COL_WIDTH_NOI_DUNG = 208
const COL_WIDTH_DVT = 76
const COL_WIDTH_CHIEU_DAI = 68
const COL_WIDTH_CHIEU_RONG = 68
const COL_WIDTH_LUONG = 68
const COL_WIDTH_SO_LUONG = 68
const COL_WIDTH_ACTION = 28
/** Căn trái nút Thêm dòng với cạnh trái nội dung cột Mã SPHH (cột xóa + STT + padding ô Mã). */
const OFFSET_TRAI_COT_MA_SPHH = COL_WIDTH_ACTION + COL_WIDTH_STT + 5

function colWidthStyle(col: string, ghiChuFill?: boolean): React.CSSProperties {
  if (col === 'Mã') return { width: COL_WIDTH_MA, minWidth: COL_WIDTH_MA, maxWidth: COL_WIDTH_MA }
  if (col === BAO_GIA_COL_TEN_SPHH) return { width: COL_WIDTH_TEN, minWidth: COL_WIDTH_TEN, maxWidth: COL_WIDTH_TEN }
  if (col === 'Nội dung') return { width: COL_WIDTH_NOI_DUNG, minWidth: COL_WIDTH_NOI_DUNG, maxWidth: COL_WIDTH_NOI_DUNG }
  if (col === 'ĐVT') return { width: COL_WIDTH_DVT, minWidth: COL_WIDTH_DVT, maxWidth: COL_WIDTH_DVT }
  if (col === 'mD') return { width: COL_WIDTH_CHIEU_DAI, minWidth: COL_WIDTH_CHIEU_DAI, maxWidth: COL_WIDTH_CHIEU_DAI }
  if (col === 'mR') return { width: COL_WIDTH_CHIEU_RONG, minWidth: COL_WIDTH_CHIEU_RONG, maxWidth: COL_WIDTH_CHIEU_RONG }
  if (col === 'Lượng') return { width: COL_WIDTH_LUONG, minWidth: COL_WIDTH_LUONG, maxWidth: COL_WIDTH_LUONG }
  if (col === 'Số lượng') return { width: COL_WIDTH_SO_LUONG, minWidth: COL_WIDTH_SO_LUONG, maxWidth: COL_WIDTH_SO_LUONG }
  if (col === 'Ghi chú') return ghiChuFill ? { width: '100%', minWidth: 72 } : { width: 104, minWidth: 72 }
  if (col === 'Đơn giá') return { width: 100, minWidth: 88 }
  if (col === 'Thành tiền') return { width: 100, minWidth: 88 }
  if (col === '% thuế GTGT') return { width: 78, minWidth: 78, maxWidth: 78 }
  if (col === 'Tiền thuế GTGT') return { width: 96, minWidth: 88, maxWidth: 112 }
  if (col === 'Tổng tiền') return { width: 100, minWidth: 88 }
  return {}
}

const STICKY_Z_TH_TOP = 5
const STICKY_Z_TH_CORNER = 6
const STICKY_Z_TD_LEFT = 4

type StickyTraiKind = 'action' | 'stt' | 'ma' | 'ten' | 'noi_dung' | 'dvt'

function gridStickyTraiPx(kind: StickyTraiKind): number {
  switch (kind) {
    case 'action':
      return 0
    case 'stt':
      return COL_WIDTH_ACTION
    case 'ma':
      return COL_WIDTH_ACTION + COL_WIDTH_STT
    case 'ten':
      return COL_WIDTH_ACTION + COL_WIDTH_STT + COL_WIDTH_MA
    case 'noi_dung':
      return COL_WIDTH_ACTION + COL_WIDTH_STT + COL_WIDTH_MA + COL_WIDTH_TEN
    case 'dvt':
      return COL_WIDTH_ACTION + COL_WIDTH_STT + COL_WIDTH_MA + COL_WIDTH_TEN + COL_WIDTH_NOI_DUNG
  }
}

function cotChiTietLaCotTraiCoDinh(col: string): StickyTraiKind | null {
  if (col === 'Mã') return 'ma'
  if (col === BAO_GIA_COL_TEN_SPHH) return 'ten'
  if (col === 'Nội dung') return 'noi_dung'
  if (col === 'ĐVT') return 'dvt'
  return null
}

function mergeThStickyGocTrai(kind: StickyTraiKind): React.CSSProperties {
  return {
    position: 'sticky',
    top: 0,
    left: gridStickyTraiPx(kind),
    zIndex: STICKY_Z_TH_CORNER,
    background: 'var(--bg-tab)',
    boxShadow: '2px 2px 4px -2px rgba(0,0,0,0.12)',
  }
}

function mergeThStickyChiTop(): React.CSSProperties {
  return {
    position: 'sticky',
    top: 0,
    zIndex: STICKY_Z_TH_TOP,
    background: 'var(--bg-tab)',
  }
}

function mergeTdStickyTrai(kind: StickyTraiKind): React.CSSProperties {
  return {
    position: 'sticky',
    left: gridStickyTraiPx(kind),
    zIndex: STICKY_Z_TD_LEFT,
    background: 'var(--bg-secondary)',
    boxShadow: '2px 0 4px -2px rgba(0,0,0,0.08)',
  }
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

/** [YC30] Cột số / tiền / thuế / kích thước trong lưới chi tiết BG — canh phải (rule canh-le) */
const CHI_TIET_COLS_NUMERIC = new Set([
  'mD',
  'mR',
  'Lượng',
  'Số lượng',
  'Đơn giá',
  '% thuế GTGT',
  'Thành tiền',
  'Tiền thuế GTGT',
  'Tổng tiền',
])

function chiTietNumericInputStyle(col: string): React.CSSProperties {
  return CHI_TIET_COLS_NUMERIC.has(col) ? { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } : {}
}

function chiTietNumericThTdStyle(col: string): React.CSSProperties {
  return CHI_TIET_COLS_NUMERIC.has(col) ? { textAlign: 'right' as const } : {}
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

const titleBarBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 28,
  padding: 0,
  background: 'transparent',
  border: 'none',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  borderRadius: 2,
}

function parseIsoToDate(iso: string | null): Date | null {
  if (!iso || !iso.trim()) return null
  const d = new Date(iso.trim())
  return Number.isNaN(d.getTime()) ? null : d
}

/** Ngày hạch toán — chỉ phần yyyy-mm-dd, tránh lệch múi giờ. */
function parseYyyyMmDdToLocalDate(iso: string | null | undefined): Date | null {
  const t = (iso ?? '').trim()
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function formatIsoToDdMmYyyy(iso: string | null): string {
  if (!iso) return ''
  const m = (iso || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${m[3]}/${m[2]}/${m[1]}`
}

/** Đối chiếu Phiếu nhận hàng: mọi BG trừ Hủy bỏ */
function ChiTienBangListForDoiChieuNhanHang(): ChiTienBangRecord[] {
  const all = chiTienBangGetAll({ ...getDefaultChiTienBangFilter(), tu: '', den: '' })
  return all.filter((bg) => bg.tinh_trang !== 'Hủy bỏ')
}

/** Hiển thị ô «Nhận hàng từ»: `mã BG: tiêu đề` (tiêu đề = so_chung_tu_cukcuk). */
function formatNhanHangTuTuChiTienBang(bg: ChiTienBangRecord): string {
  const ma = (bg.so_chi_tien_bang ?? '').trim()
  const td = (bg.so_chung_tu_cukcuk ?? '').trim()
  let s: string
  if (ma && td) s = `${ma}: ${td}`
  else if (ma) s = ma
  else s = td
  return s.toUpperCase()
}

/** Điền tab Phiếu chi (TK nhận đối tác) từ danh bạ KH — `tai_khoan_ngan_hang` / `tk_ngan_hang`. */
function getPhieuChiNhanFieldsTuKh(kh: KhachHangRecord): { stk: string; nganHang: string; tenChuTk: string } {
  const arr = kh.tai_khoan_ngan_hang
  const tk = Array.isArray(arr) && arr.length > 0 ? arr[0] : null
  if (tk) {
    const bank = String(tk.ten_ngan_hang ?? '').trim()
    return {
      stk: (tk.so_tai_khoan ?? '').trim(),
      nganHang: bank,
      tenChuTk: (tk.ten_nguoi_nhan ?? kh.ten_kh ?? '').trim(),
    }
  }
  return {
    stk: (kh.tk_ngan_hang ?? '').trim(),
    nganHang: (kh.ten_ngan_hang ?? '').trim(),
    tenChuTk: (kh.ten_kh ?? '').trim(),
  }
}

/** Phiếu NVTHH — popup «Nhận hàng từ»: chỉ BG tình trạng Chưa thực hiện. */
function ChiTienBangListChoPhieuNhanTuChiTienBang(): ChiTienBangRecord[] {
  const all = chiTienBangGetAll({ ...getDefaultChiTienBangFilter(), tu: '', den: '' })
  return all.filter((bg) => bg.tinh_trang === 'Chờ duyệt')
}

function gridColumnHeaderLabel(col: string): React.ReactNode {
  if (col === 'Mã') return 'Mã SPHH'
  if (col === '% thuế GTGT') return (<>% thuế<br />GTGT</>)
  return col
}

/** Mẫu không đơn giá — [YC37] mặc định 1 dòng. */
function mauKhongDonGiaLines(): ChiTienBangGridLineRow[] {
  return [createEmptyChiTienBangLine('khongdongia')]
}

/** Mẫu có đơn giá — [YC37] mặc định 1 dòng. */
function mauCoDonGiaLines(): ChiTienBangGridLineRow[] {
  return [createEmptyChiTienBangLine('codongia')]
}

export function ChiTienForm({ onClose, onSaved, onHeaderPointerDown, headerDragStyle, dragging, readOnly = false, initialDon, initialChiTiet, prefillDon, prefillChiTiet, onMinimize, onMaximize, onSavedAndView: _onSavedAndView, formTitle: _formTitle, soDonLabel: soDonLabelProp, phieuNhanTuChiTienBang = false, phieuNhanThemMoiTuDanhSach = false, viewOnlyLocked = false, chiTienPhieu = false, phieuChiTuMenuBanHang = false }: ChiTienFormProps) {
  const api = useChiTienBangApi()
  const toastApi = useToastOptional()
  const soDonLabel = soDonLabelProp ?? 'Số TT'
  const isViewMode = readOnly && initialDon != null
  const [editingFromView, setEditingFromView] = useState(false)
  // [ChiTienBang] Bỏ logic đối chiếu - chỉ dùng phieuNhanTuChiTienBang
  const laPhieuNhanNvthh = Boolean(phieuNhanTuChiTienBang)
  const donDaNhanHangXem =
    readOnly &&
    initialDon != null &&
    (initialDon.tinh_trang === TINH_TRANG_BAO_GIA_DA_GUI_KHACH ||
      initialDon.tinh_trang === TINH_TRANG_NVTHH_DA_NHAP_KHO)
  const donHuyBoChiXem = initialDon != null && initialDon.tinh_trang === 'Hủy bỏ'
  const khoaSauTaoGd = initialDon != null && chiTienBangBiKhoaChinhSuaTheoTinhTrang(initialDon.tinh_trang ?? '')
  const khoaGhiSoPhieuThu = Boolean(chiTienPhieu && initialDon?.id && daGhiSoPhieuChi(initialDon.id))
  const effectiveReadOnly =
    (readOnly && !editingFromView) ||
    donDaNhanHangXem ||
    donHuyBoChiXem ||
    viewOnlyLocked ||
    khoaSauTaoGd ||
    khoaGhiSoPhieuThu
  /** Chi tiết VTHH chỉ đọc khi form ở chế độ xem (readOnly). */
  const chiTietReadOnly = effectiveReadOnly
  /** Phiếu nhận từ BG: không thêm/xóa dòng; chỉ sửa cột Số lượng — trừ khi «Thêm mới» từ danh sách (không prefill BG). */
  const chiTietGridLocked = Boolean(phieuNhanTuChiTienBang) && !effectiveReadOnly && !phieuNhanThemMoiTuDanhSach
  const [khachHangDisplay, setKhachHangDisplay] = useState(() => {
    if (isViewMode && initialDon) return initialDon.khach_hang
    if (prefillDon?.khach_hang) return prefillDon.khach_hang
    return ''
  })
  const [khachHangId, setKhachHangId] = useState<number | null>(null)
  const [lichSuMoRong, setLichSuMoRong] = useState<Record<string, boolean>>({})
  /** Mã KH (ma_kh) — dùng đặt tên file đính kèm theo rule hệ thống. */
  const [khachHangMa, setKhachHangMa] = useState('')
  const khPartDinhKem = useMemo(() => partMccForPath(khachHangMa), [khachHangMa])
  const [attachments, setAttachments] = useState<ChiTienBangAttachmentItem[]>(() => {
    if (initialDon?.attachments?.length) return initialDon.attachments.map((a) => ({ ...a }))
    if (prefillDon && 'attachments' in prefillDon && Array.isArray(prefillDon.attachments) && prefillDon.attachments.length > 0) {
      return prefillDon.attachments.map((a) => ({ ...a }))
    }
    return []
  })
  /** User đổi đính kèm so với bản đã lưu — dùng nhãn «Chờ lưu» trong modal dktk. */
  const [attachmentsDirty, setAttachmentsDirty] = useState(false)
  /** Tiến trình đọc file đính kèm thiết kế — giữ ở form để đóng popover vẫn thấy trên nút Đính kèm. */
  const [dktkPendingUploadRows, setDktkPendingUploadRows] = useState<ChiTienBangDinhKemPendingRow[]>([])
  const [phieuChiDktkPendingRows, setPhieuChiDktkPendingRows] = useState<ChiTienBangDinhKemPendingRow[]>([])
  const patchAttachmentsFromUser = useCallback((next: SetStateAction<ChiTienBangAttachmentItem[]>) => {
    setAttachments(next)
    setAttachmentsDirty(true)
  }, [])
  const daDongBoLuuCsdlDktk = useMemo(
    () => Boolean(initialDon && !attachmentsDirty),
    [initialDon, attachmentsDirty],
  )
  const [showDinhKemModal, setShowDinhKemModal] = useState(false)
  const [dinhKemModalAnchor, setDinhKemModalAnchor] = useState<'toolbar' | 'duoi-ghi-chu'>('toolbar')
  const [popupXemPhieuNvthh, setPopupXemPhieuNvthh] = useState<NhanVatTuHangHoaRecord | null>(null)
  const [diaChi, setDiaChi] = useState(() => {
    if (isViewMode && initialDon) return initialDon.dia_chi ?? ''
    if (prefillDon?.dia_chi != null) return prefillDon.dia_chi
    return ''
  })
  const [nguoiGiaoHang, setNguoiGiaoHang] = useState(() => {
    if (isViewMode && initialDon) return initialDon.nguoi_giao_hang ?? ''
    if (prefillDon?.nguoi_giao_hang != null) return prefillDon.nguoi_giao_hang
    return ''
  })
  const [maSoThue, setMaSoThue] = useState(() => {
    if (isViewMode && initialDon) return initialDon.ma_so_thue ?? ''
    if (prefillDon?.ma_so_thue != null) return prefillDon.ma_so_thue
    return ''
  })
  const [dienGiai, setDienGiai] = useState(() => {
    if (isViewMode && initialDon) return initialDon.dien_giai ?? ''
    if (prefillDon?.dien_giai != null) return prefillDon.dien_giai
    return ''
  })
  const [nvMuaHang, setNvMuaHang] = useState(() => {
    if (isViewMode && initialDon) return initialDon.nv_ban_hang ?? ''
    if (prefillDon?.nv_ban_hang != null) return prefillDon.nv_ban_hang
    return ''
  })
  const [dieuKhoanTT, setDieuKhoanTT] = useState(() => {
    if (isViewMode && initialDon) return initialDon.dieu_khoan_tt ?? ''
    if (prefillDon?.dieu_khoan_tt != null) return prefillDon.dieu_khoan_tt
    return ''
  })
  const [soNgayDuocNo, setSoNgayDuocNo] = useState(() => {
    if (isViewMode && initialDon) return initialDon.so_ngay_duoc_no ?? '0'
    if (prefillDon?.so_ngay_duoc_no != null) return prefillDon.so_ngay_duoc_no
    return '0'
  })
  const [hinhThucList, setHinhThucList] = useState<HinhThucRecord[]>(() => hinhThucGetAll())
  const [hinhThucSelectedIds, setHinhThucSelectedIds] = useState<string[]>(() => {
    const fromRec = deriveHinhThucSelectedIdsFromRecord((initialDon ?? prefillDon) as ChiTienBangRecord | null | undefined)
    if (fromRec.length > 0) return fromRec
    if (phieuNhanTuChiTienBang && initialDon == null && prefillDon == null) return defaultPhieuNhanHinhThucNhapKhoIds()
    return fromRec
  })
  const [showThemHinhThucModal, setShowThemHinhThucModal] = useState(false)
  const hasNhapKho = hinhThucSelectedIds.some((id) => {
    const h = hinhThucList.find((x) => x.id === id)
    return h?.ten ? /nhập kho|nhap kho/i.test(h.ten) && !/không|khong/i.test(h.ten) : false
  })
  const hasKhongNhapKho = hinhThucSelectedIds.some((id) => {
    const h = hinhThucList.find((x) => x.id === id)
    return h?.ten ? /không nhập kho|khong nhap kho/i.test(h.ten) : false
  })
  const [dieuKhoanKhac, setDieuKhoanKhac] = useState(() => {
    if (isViewMode && initialDon) return initialDon.dieu_khoan_khac ?? ''
    if (prefillDon?.dieu_khoan_khac != null) return prefillDon.dieu_khoan_khac
    return ''
  })
  const [thamChieu, setThamChieu] = useState(() => {
    if (isViewMode && initialDon) {
      if (phieuNhanTuChiTienBang) {
        const lk = initialDon.doi_chieu_don_mua_id
        if (lk) {
          const all = chiTienBangGetAll({ ...getDefaultChiTienBangFilter(), tu: '', den: '' })
          const d = all.find((x) => x.id === lk)
          if (d) return formatNhanHangTuTuChiTienBang(d)
        }
        return (initialDon.so_chung_tu_cukcuk ?? '').toUpperCase()
      }
      return initialDon.so_chung_tu_cukcuk ?? ''
    }
    if (prefillDon && phieuNhanTuChiTienBang) {
      const pd = prefillDon as ChiTienBangRecord
      if ((pd.so_chi_tien_bang ?? '').trim()) return formatNhanHangTuTuChiTienBang(pd)
    }
    if (prefillDon?.so_chung_tu_cukcuk != null) {
      return phieuNhanTuChiTienBang
        ? String(prefillDon.so_chung_tu_cukcuk).toUpperCase()
        : prefillDon.so_chung_tu_cukcuk
    }
    return ''
  })
  const [ngayDonHang, setNgayDonHang] = useState<Date | null>(() => {
    if (isViewMode && initialDon) return parseIsoToDate(initialDon.ngay_chi_tien_bang)
    if (phieuNhanTuChiTienBang) return new Date()
    if (prefillDon?.ngay_chi_tien_bang) return parseIsoToDate(prefillDon.ngay_chi_tien_bang)
    return new Date()
  })
  const [soDonHang, setSoDonHang] = useState(() => (isViewMode && initialDon ? initialDon.so_chi_tien_bang : api.soDonHangTiepTheo()))
  const [tinhTrang, setTinhTrang] = useState(() => {
    const raw = isViewMode && initialDon ? initialDon.tinh_trang : prefillDon?.tinh_trang
    return normalizeTinhTrangPhieuNvthhForForm(raw, laPhieuNhanNvthh)
  })
  const [tgNhanHangPickerOpen, setTgNhanHangPickerOpen] = useState(false)
  const [tgNhapPickerOpen, setTgNhapPickerOpen] = useState(false)
  const [phieuChiNgayPickerOpen, setPhieuChiNgayPickerOpen] = useState(false)
  const [ngayHoaDonPickerOpen, setNgayHoaDonPickerOpen] = useState(false)
  const [ngayGiaoHang, setNgayGiaoHang] = useState<Date | null>(() => {
    if (isViewMode && initialDon) return parseIsoToDate(initialDon.ngay_giao_hang)
    if (prefillDon?.ngay_giao_hang !== undefined) return parseIsoToDate(prefillDon.ngay_giao_hang ?? null)
    return null
  })
  const [ngayHachToan, setNgayHachToan] = useState<Date | null>(() => {
    if (!chiTienPhieu) return null
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    const isoHt = r?.ngay_hach_toan?.trim()
    if (isoHt) {
      const d = parseYyyyMmDdToLocalDate(isoHt)
      if (d) return d
    }
    const nd =
      isViewMode && initialDon
        ? parseIsoToDate(initialDon.ngay_chi_tien_bang)
        : prefillDon?.ngay_chi_tien_bang
          ? parseIsoToDate(prefillDon.ngay_chi_tien_bang)
          : new Date()
    const base = nd ?? new Date()
    return new Date(base.getFullYear(), base.getMonth(), base.getDate())
  })
  const [ngayHachToanPickerOpen, setNgayHachToanPickerOpen] = useState(false)
  const [phieuChiNgay, setPhieuChiNgay] = useState<Date | null>(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    const iso = r?.phieu_chi_ngay?.trim()
    return iso ? parseIsoToDate(iso) : null
  })
  const [tenNguoiLienHe, setTenNguoiLienHe] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    return (r?.ten_nguoi_lien_he ?? '').trim()
  })
  const [soDienThoaiLienHe, setSoDienThoaiLienHe] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    return (r?.so_dien_thoai_lien_he ?? '').trim()
  })
  const [soDienThoaiCaNhan, setSoDienThoaiCaNhan] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    return (r?.so_dien_thoai ?? '').trim()
  })
  const [tlCkInput, setTlCkInput] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    const v = r?.tl_ck
    if (v != null && typeof v === 'number' && Number.isFinite(v)) return v === 0 ? '0' : formatSoThapPhan(v, 3)
    return '0'
  })
  const [tienCkInput, setTienCkInput] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    const v = r?.tien_ck
    return v != null && typeof v === 'number' && Number.isFinite(v) ? formatSoTienHienThi(v) : formatSoTienHienThi(0)
  })
  const [apDungVatGtgt, setApDungVatGtgt] = useState(() => deriveApDungVatGtgtTuBanGhi((initialDon ?? prefillDon) as ChiTienBangRecord | null))
  const chietKhauLastEditRef = useRef<'tl' | 'tien' | null>(null)
  const tlCkInputRef = useRef('')
  const tienCkInputRef = useRef('')
  const prevTongHangCkRef = useRef<number | null>(null)
  /** Dòng grid: các key cột là string; _dvtOptions khi VTHH có đơn vị quy đổi; _vthh để lấy đơn giá bán theo ĐVT khi đổi ĐVT */
  const [lines, setLines] = useState<ChiTienBangGridLineRow[]>(() => {
    if (chiTienPhieu) return []
    if (isViewMode && initialChiTiet && initialChiTiet.length > 0) return chiTietToChiTienBangLines(initialChiTiet)
    if (prefillChiTiet && prefillChiTiet.length > 0) return chiTietToChiTienBangLines(prefillChiTiet)
    if (!isViewMode && initialDon == null && (!prefillChiTiet || prefillChiTiet.length === 0)) {
      return [createEmptyChiTienBangLine('codongia')]
    }
    return []
  })
  const [vatTuList, setVatTuList] = useState<VatTuHangHoaRecord[]>([])
  const [dvtList, setDvtList] = useState<{ ma_dvt: string; ten_dvt: string; ky_hieu?: string }[]>([])
  const [vthhDropdownRowIndex, setVthhDropdownRowIndex] = useState<number | null>(null)
  const [vthhDropdownRect, setVthhDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const vthhDropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownEmail, setDropdownEmail] = useState(false)
  const [dropdownMau, setDropdownMau] = useState(false)
  /** Mẫu hiện tại — codongia khi có initialDon (dữ liệu đủ cột), else theo lựa chọn user (rule mau_gia.mdc) */
  const [mauHienTai, setMauHienTai] = useState<'codongia' | 'khongdongia'>('codongia')
  const [phieuThuChiTietLines, setPhieuThuChiTietLines] = useState<PhieuThuChiTietRow[]>(() => {
    if (chiTienPhieu && initialChiTiet && initialChiTiet.length > 0) {
      return parsePhieuThuFromChiTiet(initialChiTiet)
    }
    if (chiTienPhieu && prefillChiTiet && prefillChiTiet.length > 0) {
      return parsePhieuThuFromChiTiet(prefillChiTiet)
    }
    if (chiTienPhieu) return [emptyPhieuThuRow()]
    return []
  })
  /** Dòng được chọn trong bảng «Chứng từ còn công nợ» (phiếu thu). */
  const [chungTuCongNoSelectedKey, setChungTuCongNoSelectedKey] = useState<string | null>(null)
  const refThuLanNayPhieu0 = useRef<HTMLInputElement | null>(null)
  /** Làm mới danh sách công nợ khi ĐHB/HĐ/thu tiền thay đổi ở module khác. */
  const [chungTuCongNoTick, setChungTuCongNoTick] = useState(0)
  const [lyDoThuPhieu, setLyDoThuPhieu] = useState(() =>
    loaiThuChiChuanHoaLyDoPhieuChi((initialDon ?? prefillDon)?.ly_do_chi_phieu),
  )
  const [thuTienMatPhieu, setThuTienMatPhieu] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    if (typeof r?.chi_tien_mat === 'boolean') return r.chi_tien_mat
    return true
  })
  const [thuQuaNHPhieu, setThuQuaNHPhieu] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    return Boolean(r?.chi_qua_ngan_hang)
  })
  const [congTyTkHienThi, setCongTyTkHienThi] = useState(() => getCongTyTaiKhoanNganHang())
  /** Chọn TK NH khi có nhiều dòng «Chi qua NH» trong module Tài khoản. */
  const [tknhThuQuaNhId, setTknhThuQuaNhId] = useState<string | null>(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    return r?.phieu_tai_khoan_id?.trim() || null
  })
  const tkThuQuaNhCandidates = useMemo((): TaiKhoanRecord[] => {
    return taiKhoanGetAll().filter((r) => taiKhoanLaTkNganHang(r))
  }, [])
  const [khList, setkhList] = useState<KhachHangRecord[]>([])
  /** Phiếu thu + thu KH: chỉ gợi ý KH còn chứng từ có công nợ (YC82). */
  const khListPhieuThuLocCongNo = useMemo(() => {
    if (!chiTienPhieu || !laLyDoPhieuChiTraKhachHang(lyDoThuPhieu)) return khList
    const ex = initialDon?.id
    return khList.filter((kh) =>
      layChungTuConNoTheoKhach((kh.ten_kh ?? '').trim(), { excludeChiTienBangId: ex }).length > 0,
    )
  }, [chiTienPhieu, lyDoThuPhieu, khList, initialDon?.id])
  const loaiKhachHangHienThi = useMemo((): 'ca_nhan' | 'doanh_nghiep' | null => {
    if (khachHangId != null) {
      const kh = khList.find((k) => k.id === khachHangId)
      if (kh) return kh.loai_kh === 'ca_nhan' ? 'ca_nhan' : 'doanh_nghiep'
    }
    const t = khachHangDisplay.trim()
    if (t) {
      const kh = khList.find((k) => (k.ten_kh || '').trim() === t)
      if (kh) return kh.loai_kh === 'ca_nhan' ? 'ca_nhan' : 'doanh_nghiep'
    }
    const saved = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    if (saved?.loai_khach_hang === 'ca_nhan' || saved?.loai_khach_hang === 'doanh_nghiep') return saved.loai_khach_hang
    return null
  }, [khachHangId, khList, khachHangDisplay, initialDon?.loai_khach_hang, (prefillDon as ChiTienBangRecord | undefined)?.loai_khach_hang])
  const [khDropdownOpen, setkhDropdownOpen] = useState(false)
  const [khSearchKeyword, setKhSearchKeyword] = useState('')
  const [khDropdownRect, setKhDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const [showThemKHForm, setShowThemKHForm] = useState(false)
  const [showThemDkttModal, setShowThemDkttModal] = useState(false)
  const [danhSachDKTT, setDanhSachDKTT] = useState<DieuKhoanThanhToanItem[]>([])
  const [dangLuu, setDangLuu] = useState(false)
  const [loi, setLoi] = useState('')
  const [deleteRowIndex, setDeleteRowIndex] = useState<number | null>(null)
  const [hinhThucDropdownOpen, setHinhThucDropdownOpen] = useState(false)
  const [hinhThucDropdownRect, setHinhThucDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const refHinhThucWrap = useRef<HTMLDivElement>(null)
  const [diaChiCongTrinh, setDiaChiCongTrinh] = useState(() => {
    const d = (initialDon ?? prefillDon) as { dia_chi_cong_trinh?: string } | null | undefined
    return d?.dia_chi_cong_trinh ?? ''
  })
  const [chungTuMuaCachThanhToan, setChungTuMuaCachThanhToan] = useState<'chua_thanh_toan' | 'thanh_toan_ngay'>(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    if (r?.chung_tu_mua_chua_thanh_toan) return 'chua_thanh_toan'
    if (r?.chung_tu_mua_thanh_toan_ngay) return 'thanh_toan_ngay'
    return 'thanh_toan_ngay'
  })
  const [chungTuMuaPttt, setChungTuMuaPttt] = useState<'tien_mat' | 'chuyen_khoan'>(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    return normalizeChungTuMuaPtttStored(r?.chung_tu_mua_pttt)
  })
  const [chungTuMuaLoaiHd, setChungTuMuaLoaiHd] = useState<ChungTuMuaLoaiHdPhieu>(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    const v = r?.chung_tu_mua_loai_hd
    if (v === 'gtgt') return 'gtgt'
    return 'hd_le'
  })
  // [ChiTienBang] Logic phiếu NVTHH - chỉ dùng khi phieuNhanTuChiTienBang = true
  const [phieuNhanTabChung, setPhieuNhanTabChung] = useState<'phieu-nhap' | 'phieu-chi' | 'hoa-don'>('phieu-nhap')
  const [phieuSoHoaDon, setPhieuSoHoaDon] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    return (r?.chung_tu_mua_so_hoa_don ?? '').trim()
  })
  const [hoaDonNgay, setHoaDonNgay] = useState<Date | null>(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    const iso = r?.hoa_don_ngay?.trim()
    if (!iso) return null
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!m) return parseIsoToDate(iso)
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  })
  const [hoaDonKyHieu, setHoaDonKyHieu] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    return (r?.hoa_don_ky_hieu ?? '').trim()
  })
  const [mauHoaDonMa, setMauHoaDonMa] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    return (r?.mau_hoa_don_ma ?? '').trim()
  })
  const [mauHoaDonTen, setMauHoaDonTen] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    return (r?.mau_hoa_don_ten ?? '').trim()
  })
  const [mauHoaDonList, setMauHoaDonList] = useState<MauHoaDonItem[]>([])
  const [mauHoaDonDropdownOpen, setMauHoaDonDropdownOpen] = useState(false)
  const [mauHoaDonDropdownRect, setMauHoaDonDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const [showThemMauHoaDonModal, setShowThemMauHoaDonModal] = useState(false)
  const refMauHoaDonWrap = useRef<HTMLDivElement>(null)
  const [phieuChiKH, setPhieuChiKH] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    return r?.phieu_chi_nha_cung_cap ?? ''
  })
  const [phieuChiDiaChi, setPhieuChiDiaChi] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    return r?.phieu_chi_dia_chi ?? ''
  })
  const [phieuChiNguoiNhanTien, setPhieuChiNguoiNhanTien] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    return r?.phieu_chi_nguoi_nhan_tien ?? ''
  })
  const [phieuChiLyDo, setPhieuChiLyDo] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    return r?.phieu_chi_ly_do ?? ''
  })
  const [phieuChiTaiKhoanChi, setPhieuChiTaiKhoanChi] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    return r?.phieu_chi_tai_khoan_chi ?? ''
  })
  const [phieuChiNganHangChi, setPhieuChiNganHangChi] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    return r?.phieu_chi_ngan_hang_chi ?? r?.phieu_chi_ngan_hang ?? ''
  })
  const [phieuChiTenNguoiGui, setPhieuChiTenNguoiGui] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    return r?.phieu_chi_ten_nguoi_gui ?? ''
  })
  const [phieuChiTaiKhoanNhan, setPhieuChiTaiKhoanNhan] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    return r?.phieu_chi_tai_khoan_nhan ?? ''
  })
  const [phieuChiNganHangNhan, setPhieuChiNganHangNhan] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    return r?.phieu_chi_ngan_hang_nhan ?? ''
  })
  const [phieuChiTenChuTkNhan, setPhieuChiTenChuTkNhan] = useState(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    return r?.phieu_chi_ten_chu_tk_nhan ?? r?.phieu_chi_ten_nguoi_nhan_ck ?? ''
  })
  const [phieuChiAttachments, setPhieuChiAttachments] = useState<ChiTienBangAttachmentItem[]>(() => {
    const r = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
    const a = r?.phieu_chi_attachments
    return Array.isArray(a) && a.length ? a.map((x) => ({ ...x })) : []
  })
  const patchPhieuChiAttachmentsFromUser = useCallback((next: SetStateAction<ChiTienBangAttachmentItem[]>) => {
    setPhieuChiAttachments(next)
    setAttachmentsDirty(true)
  }, [])
  const [showDinhKemPhieuChiModal, setShowDinhKemPhieuChiModal] = useState(false)
  const [bankSuggestList, setBankSuggestList] = useState<BankItem[]>([])
  const refEmail = useRef<HTMLDivElement>(null)
  const refKhWrap = useRef<HTMLDivElement>(null)
  const refDinhKemBtn = useRef<HTMLButtonElement>(null)
  const refDinhKemDuoiGhiChu = useRef<HTMLButtonElement>(null)
  const refPhieuChiDinhKemBtn = useRef<HTMLButtonElement>(null)
  const dienGiaiPhieuTuChinhRef = useRef(false)
  const refTieuDeInput = useRef<HTMLInputElement>(null)
  const refNhanHangTuWrap = useRef<HTMLDivElement>(null)
  const SUBMENU_HOVER_DELAY_MS = 200
  const emailSubmenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mauSubmenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draftLoadedRef = useRef(false)
  const editingEnrichedRef = useRef(false)
  const prefillEnrichedRef = useRef(false)
  const didSetSoDonRef = useRef(false)
  const didPrefillRef = useRef(false)
  const [valErrKey, setValErrKey] = useState<string | null>(null)
  const refTgNhanBGInput = useRef<HTMLInputElement>(null)
  const refTgNhapNvthhInput = useRef<HTMLInputElement>(null)
  const refPhieuChiNgayInput = useRef<HTMLInputElement>(null)
  const refBGChiTietSection = useRef<HTMLDivElement>(null)
  const refChiTietGridScroll = useRef<HTMLDivElement>(null)
  const scrollChiTietSauThemDongRef = useRef(false)

  // [ChiTienBang] Bỏ logic đối chiếu đơn mua - không áp dụng cho Báo giá thông thường
  // const [selectedDoiChieuDonMuaId, setSelectedDoiChieuDonMuaId] = useState<string | null>(null)
  // const lienKetDonMuaId = null
  // const [showTimDonMuaHangPopup, setShowTimDonMuaHangPopup] = useState(false)
  const [nhanHangTuDropdownOpen, setNhanHangTuDropdownOpen] = useState(false)
  const [nhanHangTuDropdownRect, setNhanHangTuDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  // const [showDonMuaHangPopup, setShowDonMuaHangPopup] = useState(false)
  // const [viewChiTienBangRecord, setViewChiTienBangRecord] = useState<ChiTienBangRecord | null>(null)

  /** Phiếu NVTHH: bỏ margin dưới từng dòng — khoảng cách dọc = `gap` tab panel (cùng kho nhập → ĐĐGH 1). */
  const fieldRowDyn = useMemo(
    (): React.CSSProperties => ({ ...fieldRow, marginBottom: phieuNhanTuChiTienBang ? 0 : FIELD_ROW_GAP }),
    [phieuNhanTuChiTienBang]
  )

  const phieuChiStkInputCh = useMemo(() => {
    const a = phieuChiTaiKhoanChi.trim().length
    const b = phieuChiTaiKhoanNhan.trim().length
    return Math.min(28, Math.max(11, Math.max(a, b, 10) + 2))
  }, [phieuChiTaiKhoanChi, phieuChiTaiKhoanNhan])

  const { data: loaiThuChiQueryData } = useQuery({
    queryKey: loaiThuChiQueryKey,
    queryFn: loaiThuChiQueryFn,
  })
  const loaiThuChiRows = loaiThuChiQueryData?.rows ?? []

  const lyDoPhieuChiOptions = useMemo(
    () => loaiThuChiLyDoPhieuChiOptions(loaiThuChiRows),
    [loaiThuChiRows],
  )

  const phieuChiLyDoOptions = useMemo(() => {
    const base = loaiThuChiLyDoPhieuChiOptions(loaiThuChiRows)
    const v = phieuChiLyDo.trim()
    if (v && !base.includes(v)) return [v, ...base]
    return base
  }, [phieuChiLyDo, loaiThuChiRows])

  const soDonLabelHienThi = useMemo(() => {
    if (!phieuNhanTuChiTienBang) return soDonLabel
    if (phieuNhanTabChung === 'phieu-nhap') return 'Mã phiếu nhập'
    if (phieuNhanTabChung === 'phieu-chi') return 'Mã phiếu chi'
    return 'Mã phiếu NVTHH'
  }, [phieuNhanTuChiTienBang, phieuNhanTabChung, soDonLabel])

  const mauHoaDonHienThi = useMemo(() => {
    if (mauHoaDonMa && mauHoaDonTen) return `${mauHoaDonMa} — ${mauHoaDonTen}`
    if (mauHoaDonMa) return mauHoaDonMa
    return mauHoaDonTen
  }, [mauHoaDonMa, mauHoaDonTen])

  const tieuDePhieuNvthhDayDu = useMemo(() => {
    if (!phieuNhanTuChiTienBang) return ''
    const chungTu =
      hinhThucSelectedIds.length > 0
        ? hinhThucSelectedIds
            .map((id) => hinhThucList.find((x) => x.id === id)?.ten)
            .filter(Boolean)
            .join(', ')
        : PHIEU_CHUNG_TU_MUA_DEFAULT_TEXT
    const pttt = chungTuMuaPttt === 'chuyen_khoan' ? 'Chuyển khoản' : 'Tiền mặt'
    const loaiHd = chungTuMuaLoaiHd === 'gtgt' ? 'HĐ GTGT' : 'HĐ lẻ'
    const KH = (khachHangDisplay || '').trim() || '—'
    return `Nhận vật tư hàng hóa - ${chungTu} - ${pttt} - ${loaiHd} - ${KH}`
  }, [phieuNhanTuChiTienBang, hinhThucSelectedIds, hinhThucList, chungTuMuaPttt, chungTuMuaLoaiHd, khachHangDisplay])

  const dienGiaiPhieuMacDinh = useMemo(() => {
    if (!phieuNhanTuChiTienBang) return ''
    const t = thamChieu.trim()
    if (!t) return ''
    const so = phieuSoHoaDon.trim()
    return so ? `Nhập hàng ${t} theo hóa đơn số ${so}` : `Nhập hàng ${t}`
  }, [phieuNhanTuChiTienBang, thamChieu, phieuSoHoaDon])

  useEffect(() => {
    dienGiaiPhieuTuChinhRef.current = false
  }, [initialDon?.id, phieuNhanTuChiTienBang])

  useEffect(() => {
    if (!phieuNhanTuChiTienBang || initialDon != null) return
    if (dienGiaiPhieuTuChinhRef.current) return
    setDienGiai(dienGiaiPhieuMacDinh)
  }, [phieuNhanTuChiTienBang, initialDon, dienGiaiPhieuMacDinh])

  useEffect(() => {
    if (!phieuNhanTuChiTienBang || phieuNhanTabChung !== 'phieu-chi' || initialDon != null) return
    setPhieuChiKH(khachHangDisplay)
    setPhieuChiDiaChi(diaChi)
  }, [phieuNhanTuChiTienBang, phieuNhanTabChung, khachHangDisplay, diaChi, initialDon])

  useEffect(() => {
    if (!phieuNhanTuChiTienBang) return
    let cancelled = false
    mauHoaDonGetAll().then((list) => {
      if (!cancelled) setMauHoaDonList(list)
    })
    return () => {
      cancelled = true
    }
  }, [phieuNhanTuChiTienBang])

  useEffect(() => {
    if (mauHoaDonDropdownOpen && refMauHoaDonWrap.current) {
      const r = refMauHoaDonWrap.current.getBoundingClientRect()
      setMauHoaDonDropdownRect({ top: r.bottom, left: r.left, width: Math.max(r.width, 320) })
    } else {
      setMauHoaDonDropdownRect(null)
    }
  }, [mauHoaDonDropdownOpen])

  useEffect(() => {
    if (!mauHoaDonDropdownOpen) return
    const onMouseDown = (e: MouseEvent) => {
      const el = e.target as Node
      if (refMauHoaDonWrap.current?.contains(el)) return
      const drop = document.querySelector('[data-mau-hoa-don-dropdown]')
      if (drop?.contains(el)) return
      setMauHoaDonDropdownOpen(false)
    }
    window.addEventListener('mousedown', onMouseDown)
    return () => window.removeEventListener('mousedown', onMouseDown)
  }, [mauHoaDonDropdownOpen])

  // Smart Suggest ngân hàng — load 1 lần khi form mở
  useEffect(() => {
    getBanksVietnam().then((list) => {
      if (list.length > 0) setBankSuggestList(list)
    })
  }, [])

  const toIsoDate = (d: Date | null): string => {
    if (!d) return ''
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const toIsoDateTime = (d: Date | null): string => {
    if (!d) return ''
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const day = d.getDate()
    const h = d.getHours()
    const min = d.getMinutes()
    const sec = d.getSeconds()
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  useEffect(() => {
    setDanhSachDKTT(loadDieuKhoanThanhToanKh())
  }, [])

  useEffect(() => {
    if (!chiTienPhieu) return
    if (ngayDonHang) setNgayGiaoHang(new Date(ngayDonHang.getTime()))
  }, [chiTienPhieu, ngayDonHang, initialDon?.id])

  useEffect(() => {
    if (!chiTienPhieu || !thuQuaNHPhieu) return
    const list = tkThuQuaNhCandidates
    if (list.length === 0) {
      setCongTyTkHienThi(getCongTyTaiKhoanNganHang())
      return
    }
    if (!tknhThuQuaNhId && list[0]) setTknhThuQuaNhId(list[0].id)
    const pick = tknhThuQuaNhId ? list.find((x) => x.id === tknhThuQuaNhId) : list[0]
    const r = pick ?? list[0]
    setCongTyTkHienThi({ so_tai_khoan: r.so_tai_khoan, ten_ngan_hang: r.ten_ngan_hang })
  }, [chiTienPhieu, thuQuaNHPhieu, tkThuQuaNhCandidates, tknhThuQuaNhId])

  useEffect(() => {
    if (!chiTienPhieu || effectiveReadOnly) return
    const kh = khachHangDisplay.trim()
    const line0 = phieuThuChiTietLines[0]
    if (!line0?.ma_chung_tu?.trim()) return
    const ma = line0.ma_chung_tu.trim()
    const soPhai = parseFloatVN(line0.so_phai_thu)
    const soChua = parseFloatVN(line0.so_chua_thu)
    const thuNay = parseFloatVN(line0.thu_lan_nay)
    const exclude = initialDon?.id
    const lanTruoc = demSoLanChiTruocDoChoMa(kh, ma, exclude)
    const lanChi = lanTruoc + 1
    setDienGiai(
      buildDienGiaiPhieuChi({
        khachHang: kh,
        maDon: ma,
        soPhaiChi: soPhai,
        soChuaChiTruocLanNay: soChua,
        chiLanNay: thuNay,
        lanChi,
      }),
    )
  }, [chiTienPhieu, effectiveReadOnly, khachHangDisplay, phieuThuChiTietLines, initialDon?.id])

  /** Từ menu ĐHB: focus ô «Thu lần này» sau khi form mở. */
  useEffect(() => {
    if (!chiTienPhieu || !phieuChiTuMenuBanHang || effectiveReadOnly) return
    if (!khachHangDisplay.trim()) return
    const t = window.setTimeout(() => {
      refThuLanNayPhieu0.current?.focus()
      refThuLanNayPhieu0.current?.select()
    }, 120)
    return () => window.clearTimeout(t)
  }, [chiTienPhieu, phieuChiTuMenuBanHang, effectiveReadOnly, khachHangDisplay])

  /** Đánh dấu form đang nhập dở để cảnh báo khi refresh (F5). Clean khi đóng hoặc lưu. */
  useEffect(() => {
    if (!effectiveReadOnly) setUnsavedChanges(true)
    return () => setUnsavedChanges(false)
  }, [effectiveReadOnly])

  /** Khi mở form thêm mới: gán số Báo giá tiếp theo (chỉ một lần). */
  useEffect(() => {
    if (initialDon != null || didSetSoDonRef.current) return
    didSetSoDonRef.current = true
    setSoDonHang(api.soDonHangTiepTheo())
  }, [initialDon, api])

  /** Khi tạo mới từ chứng từ khác (prefill): đổ dữ liệu một lần khi mount. */
  useEffect(() => {
    if (isViewMode) return
    if (didPrefillRef.current) return
    if (!prefillDon && (!prefillChiTiet || prefillChiTiet.length === 0)) return
    didPrefillRef.current = true

    if (prefillDon) {
      if (prefillDon.khach_hang != null) setKhachHangDisplay(prefillDon.khach_hang)
      if (prefillDon.dia_chi != null) setDiaChi(prefillDon.dia_chi)
      if (prefillDon.nguoi_giao_hang != null) setNguoiGiaoHang(prefillDon.nguoi_giao_hang)
      if (prefillDon.ma_so_thue != null) setMaSoThue(prefillDon.ma_so_thue)
      if (prefillDon.dien_giai != null) setDienGiai(prefillDon.dien_giai)
      if (prefillDon.nv_ban_hang != null) setNvMuaHang(prefillDon.nv_ban_hang)
      if (prefillDon.dieu_khoan_tt != null) setDieuKhoanTT(prefillDon.dieu_khoan_tt)
      if (prefillDon.so_ngay_duoc_no != null) setSoNgayDuocNo(prefillDon.so_ngay_duoc_no)
      if (prefillDon.dieu_khoan_khac != null) setDieuKhoanKhac(prefillDon.dieu_khoan_khac)
      if (phieuNhanTuChiTienBang) {
        const pd = prefillDon as ChiTienBangRecord
        // [ChiTienBang] Bỏ setSelectedDoiChieuDonMuaId
        // if ((pd.id ?? '').trim()) setSelectedDoiChieuDonMuaId(pd.id)
        if ((pd.so_chi_tien_bang ?? '').trim()) setThamChieu(formatNhanHangTuTuChiTienBang(pd))
        else if (prefillDon.so_chung_tu_cukcuk != null) setThamChieu(prefillDon.so_chung_tu_cukcuk)
      } else if (prefillDon.so_chung_tu_cukcuk != null) {
        setThamChieu(prefillDon.so_chung_tu_cukcuk)
      }
      if (prefillDon.tinh_trang != null) {
        setTinhTrang(normalizeTinhTrangPhieuNvthhForForm(prefillDon.tinh_trang, laPhieuNhanNvthh))
      }
      if (prefillDon.ngay_chi_tien_bang != null && (!phieuNhanTuChiTienBang || chiTienPhieu))
        setNgayDonHang(parseIsoToDate(prefillDon.ngay_chi_tien_bang))
      if (chiTienPhieu && prefillDon) {
        const ext = prefillDon as ChiTienBangRecord
        if (ext.ngay_hach_toan?.trim()) {
          const dh = parseYyyyMmDdToLocalDate(ext.ngay_hach_toan)
          if (dh) setNgayHachToan(dh)
        } else if (prefillDon.ngay_chi_tien_bang) {
          const d0 = parseIsoToDate(prefillDon.ngay_chi_tien_bang)
          if (d0) setNgayHachToan(new Date(d0.getFullYear(), d0.getMonth(), d0.getDate()))
        }
      }
      if (prefillDon.ngay_giao_hang !== undefined) setNgayGiaoHang(parseIsoToDate(prefillDon.ngay_giao_hang ?? null))
      const ext = prefillDon as ChiTienBangRecord
      if (ext.phieu_chi_ngay != null) setPhieuChiNgay(parseIsoToDate(ext.phieu_chi_ngay))
      setHinhThucSelectedIds(deriveHinhThucSelectedIdsFromRecord(ext))
      if (ext.dia_chi_cong_trinh != null) setDiaChiCongTrinh(ext.dia_chi_cong_trinh)
      if (prefillDon.attachments?.length) {
        setAttachments(prefillDon.attachments.map((a) => ({ ...a })))
      }
      {
        const pd = prefillDon as ChiTienBangRecord
        if (pd.ten_nguoi_lien_he != null) setTenNguoiLienHe(String(pd.ten_nguoi_lien_he))
        if (pd.so_dien_thoai_lien_he != null) setSoDienThoaiLienHe(String(pd.so_dien_thoai_lien_he))
        if (pd.so_dien_thoai != null) setSoDienThoaiCaNhan(String(pd.so_dien_thoai))
        if (pd.tl_ck != null && typeof pd.tl_ck === 'number')
          setTlCkInput(pd.tl_ck === 0 ? '0' : formatSoThapPhan(pd.tl_ck, 3))
        if (pd.tien_ck != null && typeof pd.tien_ck === 'number') setTienCkInput(formatSoTienHienThi(pd.tien_ck))
      }
      // so_chi_tien_bang: luôn dùng số tự sinh của báo giá / phiếu nhận
    }

    if (prefillChiTiet && prefillChiTiet.length > 0) {
      if (chiTienPhieu) {
        setPhieuThuChiTietLines(parsePhieuThuFromChiTiet(prefillChiTiet))
      } else {
        setLines(chiTietToChiTienBangLines(prefillChiTiet))
      }
    }
  }, [isViewMode, prefillDon, prefillChiTiet, laPhieuNhanNvthh, phieuNhanTuChiTienBang, chiTienPhieu])

  useEffect(() => {
    if (hinhThucDropdownOpen && refHinhThucWrap.current) {
      const r = refHinhThucWrap.current.getBoundingClientRect()
      setHinhThucDropdownRect({ top: r.bottom, left: r.left, width: Math.max(r.width, 200) })
    } else {
      setHinhThucDropdownRect(null)
    }
  }, [hinhThucDropdownOpen])

  useEffect(() => {
    if (!hinhThucDropdownOpen) return
    const onMouseDown = (e: MouseEvent) => {
      if (refHinhThucWrap.current?.contains(e.target as Node)) return
      if ((e.target as HTMLElement).closest('[data-hinh-thuc-dropdown]')) return
      setHinhThucDropdownOpen(false)
    }
    window.addEventListener('mousedown', onMouseDown)
    return () => window.removeEventListener('mousedown', onMouseDown)
  }, [hinhThucDropdownOpen])

  useEffect(() => {
    let cancelled = false
    khachHangGetAll().then((data) => {
      if (!cancelled && Array.isArray(data)) setkhList(data)
    })
    return () => { cancelled = true }
  }, [])

  const applyChonChiTienBangDoiChieu = useCallback(
    (bg: ChiTienBangRecord) => {
      const label = (bg.so_chi_tien_bang ?? '').trim()
      setThamChieu(phieuNhanTuChiTienBang ? formatNhanHangTuTuChiTienBang(bg) : label)
      // [ChiTienBang] Bỏ setSelectedDoiChieuDonMuaId
      // setSelectedDoiChieuDonMuaId(bg.id)
      setValErrKey((k) => (k === 'doi_chieu' ? null : k))
      setKhachHangDisplay(bg.khach_hang ?? '')
      const ten = (bg.khach_hang ?? '').trim()
      const hit = khList.find((n) => (n.ten_kh || '').trim() === ten)
      if (hit != null) {
        setKhachHangId(hit.id)
        setKhachHangMa((hit.ma_kh ?? '').trim())
        if (phieuNhanTuChiTienBang && chungTuMuaPttt === 'chuyen_khoan') {
          const v = getPhieuChiNhanFieldsTuKh(hit)
          setPhieuChiTaiKhoanNhan(v.stk)
          setPhieuChiNganHangNhan(v.nganHang)
          setPhieuChiTenChuTkNhan(v.tenChuTk)
        }
      }
      setDiaChi(bg.dia_chi ?? '')
      setNguoiGiaoHang(bg.nguoi_giao_hang ?? '')
      setHinhThucSelectedIds(deriveHinhThucSelectedIdsFromRecord(bg))
      setDiaChiCongTrinh((bg as ChiTienBangRecord & { dia_chi_cong_trinh?: string }).dia_chi_cong_trinh ?? '')
      setMaSoThue(bg.ma_so_thue ?? '')
      setDienGiai(bg.dien_giai ?? '')
      setNvMuaHang(bg.nv_ban_hang ?? '')
      setDieuKhoanTT(bg.dieu_khoan_tt ?? '')
      setSoNgayDuocNo(bg.so_ngay_duoc_no ?? '0')
      setDieuKhoanKhac(bg.dieu_khoan_khac ?? '')
      setNgayDonHang(parseIsoToDate(bg.ngay_chi_tien_bang))
      setNgayGiaoHang(parseIsoToDate(bg.ngay_giao_hang ?? null))
      const ct = chiTienBangGetChiTiet(bg.id)
      setLines(chiTietToChiTienBangLines(ct))
    },
    [phieuNhanTuChiTienBang, khList, chungTuMuaPttt],
  )

  useEffect(() => {
    if (!phieuNhanTuChiTienBang || chungTuMuaPttt !== 'chuyen_khoan' || effectiveReadOnly) return
    if (khachHangId == null) return
    const hit = khList.find((n) => n.id === khachHangId)
    if (!hit) return
    const v = getPhieuChiNhanFieldsTuKh(hit)
    setPhieuChiTaiKhoanNhan((prev) => (prev.trim() ? prev : v.stk))
    setPhieuChiNganHangNhan((prev) => (prev.trim() ? prev : v.nganHang))
    setPhieuChiTenChuTkNhan((prev) => (prev.trim() ? prev : v.tenChuTk))
  }, [phieuNhanTuChiTienBang, chungTuMuaPttt, khachHangId, khList, effectiveReadOnly])

  useEffect(() => {
    if (nhanHangTuDropdownOpen && refNhanHangTuWrap.current) {
      const r = refNhanHangTuWrap.current.getBoundingClientRect()
      setNhanHangTuDropdownRect({ top: r.bottom, left: r.left, width: r.width })
    } else {
      setNhanHangTuDropdownRect(null)
    }
  }, [nhanHangTuDropdownOpen, thamChieu])

  useEffect(() => {
    if (!nhanHangTuDropdownOpen) return
    const onMouseDown = (e: MouseEvent) => {
      if (refNhanHangTuWrap.current?.contains(e.target as Node)) return
      if ((e.target as HTMLElement).closest('[data-nhan-hang-tu-dropdown]')) return
      setNhanHangTuDropdownOpen(false)
    }
    window.addEventListener('mousedown', onMouseDown)
    return () => window.removeEventListener('mousedown', onMouseDown)
  }, [nhanHangTuDropdownOpen])

  useEffect(() => {
    if (phieuNhanTuChiTienBang) setNhanHangTuDropdownOpen(false)
    setMauHoaDonDropdownOpen(false)
    setTgNhapPickerOpen(false)
    setPhieuChiNgayPickerOpen(false)
    setNgayHoaDonPickerOpen(false)
    setTgNhanHangPickerOpen(false)
  }, [phieuNhanTabChung, phieuNhanTuChiTienBang])

  /** Đồng bộ id + mã KH từ danh bạ (tên / chuỗi «mã - tên» cũ). Phiếu: chuẩn về chỉ tên khi khớp. */
  useEffect(() => {
    const raw = (initialDon?.khach_hang ?? prefillDon?.khach_hang ?? '').trim()
    if (!raw || khList.length === 0) return
    const found =
      khList.find((n) => (n.ten_kh || '').trim() === raw) ||
      khList.find((n) => {
        const ma = (n.ma_kh ?? '').trim()
        const ten = (n.ten_kh ?? '').trim()
        return ma && ten && `${ma} - ${ten}` === raw
      }) ||
      khList.find((n) => {
        const ma = (n.ma_kh ?? '').trim()
        return ma !== '' && (raw === ma || raw.startsWith(`${ma} -`))
      })
    if (found != null) {
      setKhachHangId(found.id)
      setKhachHangMa((found.ma_kh ?? '').trim())
      if (laPhieuNhanNvthh) setKhachHangDisplay((found.ten_kh || '').trim())
      if (found.loai_kh === 'to_chuc') {
        const saved = (initialDon ?? prefillDon) as ChiTienBangRecord | undefined
        if (!saved?.ten_nguoi_lien_he?.trim()) {
          setTenNguoiLienHe(tenNguoiLienHeTuDanhBaKh(found))
          setSoDienThoaiLienHe(soDienThoaiUuTienTuKhachHang(found))
        }
      }
    }
  }, [initialDon?.khach_hang, prefillDon?.khach_hang, khList, laPhieuNhanNvthh, initialDon, prefillDon])

  /** Đổi đơn (id): nạp file đính kèm từ bản ghi và chuẩn hóa `name`/`virtual_path` theo Mã BG + KH hiện tại (dữ liệu cũ có thể còn `KH_unknown` trong tên file). */
  useEffect(() => {
    if (initialDon?.id == null) return
    const a = initialDon.attachments
    const raw = Array.isArray(a) ? a.map((x) => ({ ...x })) : []
    if (raw.length === 0) {
      setAttachments([])
      setAttachmentsDirty(false)
      return
    }
    const so = (initialDon.so_chi_tien_bang ?? '').trim() || 'BG'
    const khPart = partMccForPath('')
    setAttachments(chuanHoaDuongDanDinhKemChiTienBang(raw, so, khPart))
    setAttachmentsDirty(false)
  }, [initialDon?.id])

  /** Đồng bộ `name` + `virtual_path` khi đổi Mã BG / KH (đính kèm trước, nhập KH sau — tránh tên file vẫn `KH_unknown`). */
  useEffect(() => {
    const so = soDonHang.trim() || 'DHM'
    setAttachments((prev) => {
      if (prev.length === 0) return prev
      const next = chuanHoaDuongDanDinhKemChiTienBang(prev, so, khPartDinhKem)
      const same = next.every(
        (n: ChiTienBangAttachmentItem, i: number) => n.virtual_path === prev[i]?.virtual_path && n.name === (prev[i]?.name ?? '')
      )
      return same ? prev : next
    })
  }, [soDonHang, khPartDinhKem])

  useEffect(() => {
    if (!phieuNhanTuChiTienBang) return
    const so = soDonHang.trim() || 'DHM'
    setPhieuChiAttachments((prev) => {
      if (prev.length === 0) return prev
      const next = chuanHoaDuongDanDinhKemChiTienBang(prev, so, khPartDinhKem)
      const same = next.every(
        (n: ChiTienBangAttachmentItem, i: number) => n.virtual_path === prev[i]?.virtual_path && n.name === (prev[i]?.name ?? '')
      )
      return same ? prev : next
    })
  }, [phieuNhanTuChiTienBang, soDonHang, khPartDinhKem])

  /** Khi chuyển sang xem đơn khác (initialDon/initialChiTiet đổi) mà form vẫn mở: đồng bộ toàn bộ state từ props để hiển thị đúng đơn mới. */
  useEffect(() => {
    if (!readOnly || initialDon == null) return
    const d = initialDon as ChiTienBangRecord & { hinh_thuc?: string; dia_chi_cong_trinh?: string }
    setApDungVatGtgt(deriveApDungVatGtgtTuBanGhi(initialDon))
    setTenNguoiLienHe((initialDon.ten_nguoi_lien_he ?? '').trim())
    setSoDienThoaiLienHe((initialDon.so_dien_thoai_lien_he ?? '').trim())
    setSoDienThoaiCaNhan((initialDon.so_dien_thoai ?? '').trim())
    setTlCkInput(
      initialDon.tl_ck != null && typeof initialDon.tl_ck === 'number' && Number.isFinite(initialDon.tl_ck)
        ? initialDon.tl_ck === 0
          ? '0'
          : formatSoThapPhan(initialDon.tl_ck, 3)
        : '0',
    )
    setTienCkInput(
      initialDon.tien_ck != null && typeof initialDon.tien_ck === 'number' && Number.isFinite(initialDon.tien_ck)
        ? formatSoTienHienThi(initialDon.tien_ck)
        : formatSoTienHienThi(0),
    )
    setKhachHangDisplay(initialDon.khach_hang ?? '')
    setDiaChi(initialDon.dia_chi ?? '')
    setNguoiGiaoHang(initialDon.nguoi_giao_hang ?? '')
    setMaSoThue(initialDon.ma_so_thue ?? '')
    setDienGiai(initialDon.dien_giai ?? '')
    setNvMuaHang(initialDon.nv_ban_hang ?? '')
    setDieuKhoanTT(initialDon.dieu_khoan_tt ?? '')
    setSoNgayDuocNo(initialDon.so_ngay_duoc_no ?? '0')
    setHinhThucSelectedIds(deriveHinhThucSelectedIdsFromRecord(d))
    setDiaChiCongTrinh(d.dia_chi_cong_trinh ?? '')
    setDieuKhoanKhac(initialDon.dieu_khoan_khac ?? '')
    // [ChiTienBang] Bỏ setSelectedDoiChieuDonMuaId
    // setSelectedDoiChieuDonMuaId(initialDon.doi_chieu_don_mua_id ?? null)
    if (phieuNhanTuChiTienBang && initialDon.doi_chieu_don_mua_id) {
      const linked = chiTienBangGetAll({ ...getDefaultChiTienBangFilter(), tu: '', den: '' }).find((x) => x.id === initialDon.doi_chieu_don_mua_id)
      setThamChieu(
        linked ? formatNhanHangTuTuChiTienBang(linked) : (initialDon.so_chung_tu_cukcuk ?? '').toUpperCase(),
      )
    } else {
      setThamChieu(initialDon.so_chung_tu_cukcuk ?? '')
    }
    setNgayDonHang(parseIsoToDate(initialDon.ngay_chi_tien_bang))
    if (chiTienPhieu) {
      const isoHt = (initialDon as ChiTienBangRecord).ngay_hach_toan?.trim()
      if (isoHt) {
        const dh = parseYyyyMmDdToLocalDate(isoHt)
        if (dh) setNgayHachToan(dh)
      } else {
        const d0 = parseIsoToDate(initialDon.ngay_chi_tien_bang)
        if (d0) setNgayHachToan(new Date(d0.getFullYear(), d0.getMonth(), d0.getDate()))
      }
    }
    setSoDonHang(initialDon.so_chi_tien_bang)
    setTinhTrang(normalizeTinhTrangPhieuNvthhForForm(initialDon.tinh_trang, laPhieuNhanNvthh))
    setNgayGiaoHang(parseIsoToDate(initialDon.ngay_giao_hang))
    if (initialDon.chung_tu_mua_chua_thanh_toan) setChungTuMuaCachThanhToan('chua_thanh_toan')
    else if (initialDon.chung_tu_mua_thanh_toan_ngay) setChungTuMuaCachThanhToan('thanh_toan_ngay')
    else setChungTuMuaCachThanhToan('thanh_toan_ngay')
    setChungTuMuaPttt(normalizeChungTuMuaPtttStored(initialDon.chung_tu_mua_pttt))
    setChungTuMuaLoaiHd(initialDon.chung_tu_mua_loai_hd === 'gtgt' ? 'gtgt' : 'hd_le')
    setPhieuSoHoaDon((initialDon.chung_tu_mua_so_hoa_don ?? '').trim())
    {
      const iso = (initialDon.hoa_don_ngay ?? '').trim()
      if (iso) {
        const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
        setHoaDonNgay(
          m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : parseIsoToDate(iso),
        )
      } else {
        setHoaDonNgay(null)
      }
    }
    setHoaDonKyHieu((initialDon.hoa_don_ky_hieu ?? '').trim())
    setMauHoaDonMa((initialDon.mau_hoa_don_ma ?? '').trim())
    setMauHoaDonTen((initialDon.mau_hoa_don_ten ?? '').trim())
    setPhieuChiKH(initialDon.phieu_chi_nha_cung_cap ?? '')
    setPhieuChiDiaChi(initialDon.phieu_chi_dia_chi ?? '')
    setPhieuChiNguoiNhanTien(initialDon.phieu_chi_nguoi_nhan_tien ?? '')
    setPhieuChiLyDo(initialDon.phieu_chi_ly_do ?? '')
    setPhieuChiNgay(parseIsoToDate(initialDon.phieu_chi_ngay ?? null))
    setPhieuChiTaiKhoanChi(initialDon.phieu_chi_tai_khoan_chi ?? '')
    setPhieuChiNganHangChi(initialDon.phieu_chi_ngan_hang_chi ?? initialDon.phieu_chi_ngan_hang ?? '')
    setPhieuChiTenNguoiGui(initialDon.phieu_chi_ten_nguoi_gui ?? '')
    setPhieuChiTaiKhoanNhan(initialDon.phieu_chi_tai_khoan_nhan ?? '')
    setPhieuChiNganHangNhan(initialDon.phieu_chi_ngan_hang_nhan ?? '')
    setPhieuChiTenChuTkNhan(initialDon.phieu_chi_ten_chu_tk_nhan ?? initialDon.phieu_chi_ten_nguoi_nhan_ck ?? '')
    const pca = initialDon.phieu_chi_attachments
    setPhieuChiAttachments(Array.isArray(pca) && pca.length ? pca.map((x) => ({ ...x })) : [])
    dienGiaiPhieuTuChinhRef.current = true
    if (initialChiTiet && initialChiTiet.length > 0) {
      if (chiTienPhieu) setPhieuThuChiTietLines(parsePhieuThuFromChiTiet(initialChiTiet))
      else setLines(chiTietToChiTienBangLines(initialChiTiet))
    } else {
      if (!chiTienPhieu) setLines([])
    }
    const att = initialDon.attachments
    const rawAtt = Array.isArray(att) ? att.map((x) => ({ ...x })) : []
    if (rawAtt.length === 0) setAttachments([])
    else {
      const so = (initialDon.so_chi_tien_bang ?? '').trim() || 'BG'
      const khPart = partMccForPath('')
      setAttachments(chuanHoaDuongDanDinhKemChiTienBang(rawAtt, so, khPart))
    }
    setAttachmentsDirty(false)
    setEditingFromView(false)
  }, [readOnly, initialDon?.id, initialDon, initialChiTiet, laPhieuNhanNvthh, phieuNhanTuChiTienBang, chiTienPhieu])

  useEffect(() => {
    if (!chiTienPhieu) return
    const id = initialDon?.phieu_tai_khoan_id?.trim()
    if (id) setTknhThuQuaNhId(id)
  }, [chiTienPhieu, initialDon?.id, initialDon?.phieu_tai_khoan_id])

  /** Đồng bộ «chưa thu»/«còn lại» trong JSON dòng khi mở phiếu hoặc có thay đổi phiếu khác (vd. xóa phiếu trước). */
  useEffect(() => {
    if (!chiTienPhieu || !initialDon?.id) return
    const ma = (initialDon.so_chung_tu_cukcuk ?? '').trim()
    const kh = (initialDon.khach_hang ?? '').trim()
    if (!ma || !kh) return
    dongBoLaiNoiDungPhieuChiTheoMaDonHang(kh, ma)
    const ct = chiTienBangGetChiTiet(initialDon.id)
    if (ct.length) setPhieuThuChiTietLines(parsePhieuThuFromChiTiet(ct))
  }, [
    chiTienPhieu,
    initialDon?.id,
    initialDon?.so_chung_tu_cukcuk,
    initialDon?.khach_hang,
    chungTuCongNoTick,
  ])

  useEffect(() => {
    if (khDropdownOpen && refKhWrap.current) {
      const r = refKhWrap.current.getBoundingClientRect()
      setKhDropdownRect({ top: r.bottom, left: r.left, width: Math.max(r.width, 280) })
    } else {
      setKhDropdownRect(null)
    }
  }, [khDropdownOpen])

  useEffect(() => {
    if (!khDropdownOpen) return
    const onMouseDown = (e: MouseEvent) => {
      if (refKhWrap.current?.contains(e.target as Node)) return
      setkhDropdownOpen(false)
    }
    window.addEventListener('mousedown', onMouseDown)
    return () => window.removeEventListener('mousedown', onMouseDown)
  }, [khDropdownOpen])

  useLayoutEffect(() => {
    if (!scrollChiTietSauThemDongRef.current) return
    scrollChiTietSauThemDongRef.current = false
    const el = refChiTietGridScroll.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [lines])

  useEffect(() => {
    let cancelled = false
    vatTuHangHoaGetForBanHang().then((data) => {
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

  const handleChonKh = (kh: KhachHangRecord) => {
    setKhachHangId(kh.id)
    setKhachHangMa((kh.ma_kh ?? '').trim())
    setKhachHangDisplay(kh.ten_kh || '')
    setDiaChi(kh.dia_chi || '')
    const sdtUuTien = soDienThoaiUuTienTuKhachHang(kh)
    if (kh.loai_kh === 'ca_nhan') {
      setMaSoThue('')
      setSoDienThoaiCaNhan(sdtUuTien)
      setTenNguoiLienHe('')
      setSoDienThoaiLienHe('')
    } else {
      setMaSoThue(kh.ma_so_thue || '')
      setTenNguoiLienHe(tenNguoiLienHeTuDanhBaKh(kh))
      setSoDienThoaiLienHe(sdtUuTien)
      setSoDienThoaiCaNhan('')
    }
    setDieuKhoanTT(kh.dieu_khoan_tt || '')
    const dktt = danhSachDKTT.find((d) => d.ma === kh.dieu_khoan_tt || d.ten === kh.dieu_khoan_tt)
    if (dktt) setSoNgayDuocNo(String(dktt.so_ngay_duoc_no))
    if (phieuNhanTuChiTienBang && chungTuMuaPttt === 'chuyen_khoan') {
      const v = getPhieuChiNhanFieldsTuKh(kh)
      setPhieuChiTaiKhoanNhan(v.stk)
      setPhieuChiNganHangNhan(v.nganHang)
      setPhieuChiTenChuTkNhan(v.tenChuTk)
    }
  }

  const applyChungTuConNoVaoPhieu = useCallback((row: ChungTuCongNoRow) => {
    setChungTuCongNoSelectedKey(row.key)
    setPhieuThuChiTietLines([
      {
        ma_chung_tu: row.ma_chung_tu,
        ngay_tao: row.ngay_tao,
        han_tt: row.han_tt,
        so_phai_thu: formatSoTienHienThi(row.so_phai_thu),
        so_chua_thu: formatSoTienHienThi(row.con_lai),
        thu_lan_nay: formatSoTienHienThi(row.con_lai),
        noi_dung_thu: '',
      },
    ])
    window.setTimeout(() => {
      refThuLanNayPhieu0.current?.focus()
      refThuLanNayPhieu0.current?.select()
    }, 0)
  }, [])

  const huyChonChungTuCongNo = useCallback(() => {
    setChungTuCongNoSelectedKey(null)
    setPhieuThuChiTietLines([emptyPhieuThuRow()])
  }, [])

  /** Nạp draft chỉ khi form thêm mới (không có initialDon), không ở chế độ xem. */
  useEffect(() => {
    if (initialDon != null || effectiveReadOnly || draftLoadedRef.current || vatTuList.length === 0) return
    const d = api.getDraft()
    if (!d || d.length === 0) return
    draftLoadedRef.current = true
    const LEGACY_TEN_COL = 'Tên sản phẩm, hàng hóa' as const
    const enriched = d.map((l) => {
      const row = { ...(l as Record<string, string>) }
      const legacyTen = row[LEGACY_TEN_COL]
      if (legacyTen != null && (row[BAO_GIA_COL_TEN_SPHH] ?? '').trim() === '') {
        row[BAO_GIA_COL_TEN_SPHH] = legacyTen
      }
      delete row[LEGACY_TEN_COL]
      const legVthh = row['Tên VTHH']
      if (legVthh != null && (row[BAO_GIA_COL_TEN_SPHH] ?? '').trim() === '') {
        row[BAO_GIA_COL_TEN_SPHH] = legVthh
      }
      delete row['Tên VTHH']
      const v = vatTuList.find((vt) => vt.ma === (row['Mã'] ?? '').trim())
      return {
        ...row,
        _vthh: v,
        _dvtOptions: v ? buildDvtOptionsForVthh(v) : undefined,
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
        return { ...l, _vthh: v, _dvtOptions: v ? buildDvtOptionsForVthh(v) : undefined } as typeof prev[0]
      })
    )
  }, [editingFromView, vatTuList])

  /** Prefill chi tiết (vd. từ BG): tra cứu VTHH để điền ĐG mua, % thuế GTGT và tính tiền. */
  useEffect(() => {
    if (!prefillChiTiet || prefillChiTiet.length === 0) return
    if (prefillEnrichedRef.current || vatTuList.length === 0) return
    prefillEnrichedRef.current = true
    setLines((prev) => enrichChiTienBangGridLinesWithVthh(prev, vatTuList))
  }, [vatTuList, prefillChiTiet])

  // [ChiTienBang] Bỏ logic đối chiếu - không cần enrich từ selectedDoiChieuDonMuaId
  // const dropdownEnrichedRef = useRef<string | null>(null)
  // useEffect(() => {
  //   if (!selectedDoiChieuDonMuaId) { dropdownEnrichedRef.current = null; return }
  //   if (vatTuList.length === 0 || lines.length === 0) return
  //   if (dropdownEnrichedRef.current === selectedDoiChieuDonMuaId) return
  //   dropdownEnrichedRef.current = selectedDoiChieuDonMuaId
  //   setLines((prev) => enrichChiTienBangGridLinesWithVthh(prev, vatTuList))
  // }, [selectedDoiChieuDonMuaId, vatTuList.length, lines.length])

  /** [YC30] Tính Số lượng từ Kích thước nếu VTHH có công thức */
  const calculateSoLuongFromKichThuoc = (line: ChiTienBangGridLineRow): string => {
    const dvtRaw = (line['ĐVT'] ?? '').trim()
    if (!dvtLaMetVuong(dvtRaw, dvtList)) return line['Số lượng'] ?? ''
    const vthh = line._vthh
    if (!vthh?.cong_thuc_tinh_so_luong) return line['Số lượng'] ?? ''
    const formula = vthh.cong_thuc_tinh_so_luong.toLowerCase()
    if (!formula.includes('dài') || !formula.includes('rộng') || !formula.includes('lượng')) {
      return line['Số lượng'] ?? ''
    }
    const dai = parseFloatVN(line['mD'] ?? '') || 0
    const rong = parseFloatVN(line['mR'] ?? '') || 0
    const luong = parseFloatVN(line['Lượng'] ?? '1') || 1
    const result = dai * rong * luong
    return result > 0 ? formatSoTienHienThi(result) : ''
  }

  /** Sau khi đổi Số lượng (trực tiếp hoặc qua kích thước): áp lại đơn giá theo bậc giá + ĐVT. */
  const syncDonGiaTheoBacVaSl = (row: ChiTienBangGridLineRow): ChiTienBangGridLineRow => {
    if (!row._vthh || !(initialDon != null || mauHienTai === 'codongia')) return row
    const sl = Math.max(0, parseFloatVN(row['Số lượng'] ?? '')) || 1
    const dvt = (row['ĐVT'] ?? '').trim() || (row._vthh.dvt_chinh ?? '')
    return { ...row, 'Đơn giá': getDonGiaBanChiTienBangLine(row._vthh, dvt, sl) } as unknown as ChiTienBangGridLineRow
  }

  const handleChonVthh = (vthh: VatTuHangHoaRecord, rowIndex: number) => {
    const next = [...lines]
    if (rowIndex < 0 || rowIndex >= next.length) return
    const row = { ...next[rowIndex] } as Record<string, string> & { _dvtOptions?: string[]; _vthh?: VatTuHangHoaRecord }
    row['Mã'] = vthh.ma
    row[BAO_GIA_COL_TEN_SPHH] = vthh.ten ?? ''
    row['ĐVT'] = vthh.dvt_chinh ?? ''
    row._vthh = vthh
    const isCodongia = initialDon != null || mauHienTai === 'codongia'
    if (isCodongia) {
      if (apDungVatGtgt) row['% thuế GTGT'] = vthh.thue_suat_gtgt ?? ''
      else row['% thuế GTGT'] = ''
      const sl = Math.max(0, parseFloatVN(row['Số lượng'] ?? '')) || 1
      row['Đơn giá'] = getDonGiaBanChiTienBangLine(vthh, (row['ĐVT'] ?? '').trim() || (vthh.dvt_chinh ?? ''), sl)
    }
    const opts = buildDvtOptionsForVthh(vthh)
    if (opts) row._dvtOptions = opts
    else delete row._dvtOptions
    next[rowIndex] = row
    setLines(next)
    setVthhDropdownRowIndex(null)
    setVthhDropdownRect(null)
  }

  const buildPayload = (): ChiTienBangCreatePayload => {
    const coBang =
      !chiTienPhieu &&
      (initialDon != null || Boolean(prefillChiTiet && prefillChiTiet.length > 0) || mauHienTai === 'codongia')
    const apVat = coBang && apDungVatGtgt
    const { tongTienHang, tienThue: tienThueRaw } = computeDonHangMuaFooterTotals(lines, { apDungVatGtgt: apVat })
    const phieuThuLinesLuu = chiTienPhieu
      ? phieuThuChiTietLines.filter((r) => {
          const ma = (r.ma_chung_tu ?? '').trim()
          return ma !== '' && ma !== '—'
        })
      : []
    const tongPhieuThu = chiTienPhieu
      ? phieuThuLinesLuu.reduce((s, r) => s + Math.max(0, parseFloatVN(r.thu_lan_nay)), 0)
      : 0
    const tongTienHangEff = chiTienPhieu ? tongPhieuThu : tongTienHang
    const tienThue = chiTienPhieu ? 0 : apVat ? tienThueRaw : 0
    const tienCkTinh = chiTienPhieu ? 0 : Math.max(0, parseFloatVN(tienCkInput || '0'))
    const ttTongThanhToan = tongTienHangEff + tienThue - tienCkTinh
    const loaiKhDer = loaiKhachHangHienThi ?? 'doanh_nghiep'
    const laCaNhan = loaiKhDer === 'ca_nhan'
    const isCodongia = initialDon != null || mauHienTai === 'codongia'
    const chiTiet = chiTienPhieu
      ? phieuThuLinesLuu.map((r) => {
          const dg = Math.max(0, parseFloatVN(r.thu_lan_nay))
          return {
            ma_hang: r.ma_chung_tu.trim() || '—',
            ten_hang: dienGiai.trim() || r.ma_chung_tu.trim() || '—',
            noi_dung: serializePhieuThuNoiDung(r),
            dvt: '',
            so_luong: 1,
            don_gia: dg,
            thanh_tien: dg,
            pt_thue_gtgt: null as number | null,
            tien_thue_gtgt: null as number | null,
          }
        })
      : lines
          .filter((line) => (line['Mã'] ?? '').trim() !== '')
          .map((line) => {
            const donGia = isCodongia ? parseFloatVN(line['Đơn giá'] ?? '') : 0
            const soLuong = Math.max(0, parseFloatVN(line['Số lượng'] ?? ''))
            const thanhTien = isCodongia ? donGia * soLuong : 0
            const pt = isCodongia && apVat ? parsePctThueGtgtFromLine(line['% thuế GTGT'] ?? '') : null
            const tienThueLine = pt != null ? (thanhTien * pt) / 100 : 0
            return {
              ma_hang: (line['Mã'] ?? '').trim(),
              ten_hang: (line[BAO_GIA_COL_TEN_SPHH] ?? '').trim(),
              noi_dung: (line['Nội dung'] ?? '').trim(),
              dvt: (line['ĐVT'] ?? '').trim(),
              so_luong: soLuong,
              don_gia: donGia,
              thanh_tien: thanhTien,
              pt_thue_gtgt: pt,
              tien_thue_gtgt: pt != null ? tienThueLine : null,
              ...(isCodongia ? { ghi_chu: (line['Ghi chú'] ?? '').trim() } : {}),
            }
          })
    const ngayGiaoHangPayload =
      phieuNhanTuChiTienBang ? ngayGiaoHang ?? ngayDonHang : ngayGiaoHang
    const ngayGiaoHangIso =
      phieuNhanTuChiTienBang
        ? ngayGiaoHangPayload
          ? toIsoDateTime(ngayGiaoHangPayload)
          : null
        : chiTienPhieu
          ? ngayDonHang
            ? toIsoDateTime(ngayDonHang)
            : null
          : ngayGiaoHang
            ? toIsoDateTime(ngayGiaoHang)
            : null
    const payload: ChiTienBangCreatePayload = {
      loai_khach_hang: loaiKhDer,
      ten_nguoi_lien_he: !laCaNhan ? tenNguoiLienHe.trim() || undefined : undefined,
      so_dien_thoai_lien_he: !laCaNhan ? soDienThoaiLienHe.trim() || undefined : undefined,
      so_dien_thoai: laCaNhan ? soDienThoaiCaNhan.trim() || undefined : undefined,
      tinh_trang: tinhTrang,
      ngay_chi_tien_bang: toIsoDate(ngayDonHang) || toIsoDate(new Date()),
      so_chi_tien_bang: soDonHang.trim() || 'BG',
      ngay_giao_hang: ngayGiaoHangIso,
      khach_hang: khachHangDisplay.trim(),
      dia_chi: diaChi.trim(),
      ...(laPhieuNhanNvthh ? { nguoi_giao_hang: nguoiGiaoHang.trim() } : {}),
      ma_so_thue: laCaNhan ? '' : maSoThue.trim(),
      dien_giai: dienGiai.trim(),
      nv_ban_hang: nvMuaHang.trim(),
      dieu_khoan_tt: chiTienPhieu ? '' : dieuKhoanTT.trim(),
      so_ngay_duoc_no: chiTienPhieu ? '0' : soNgayDuocNo.trim() || '0',
      dieu_khoan_khac: dieuKhoanKhac.trim(),
      tong_tien_hang: tongTienHangEff,
      tong_thue_gtgt: tienThue,
      tong_thanh_toan: ttTongThanhToan,
      ap_dung_vat_gtgt: chiTienPhieu ? false : apVat,
      tl_ck: chiTienPhieu
        ? undefined
        : (() => {
            const t = parseFloatVN(tlCkInput || '')
            return Number.isFinite(t) && t >= 0 ? t : undefined
          })(),
      tien_ck: chiTienPhieu ? undefined : tienCkTinh > 0 ? tienCkTinh : undefined,
      ly_do_chi_phieu: chiTienPhieu ? lyDoThuPhieu : undefined,
      chi_tien_mat: chiTienPhieu ? thuTienMatPhieu : undefined,
      chi_qua_ngan_hang: chiTienPhieu ? thuQuaNHPhieu : undefined,
      ngay_hach_toan: chiTienPhieu && ngayHachToan ? toIsoDate(ngayHachToan) : undefined,
      phieu_tai_khoan_id: (() => {
        if (!chiTienPhieu) return undefined
        if (thuQuaNHPhieu) {
          const id = (tknhThuQuaNhId ?? tkThuQuaNhCandidates[0]?.id)?.trim()
          return id || undefined
        }
        if (thuTienMatPhieu && !thuQuaNHPhieu) {
          const tms = taiKhoanGetAll().filter((x) => taiKhoanLaTienMat(x))
          if (tms.length === 1) return tms[0].id
        }
        return undefined
      })(),
      so_chung_tu_cukcuk: chiTienPhieu ? '' : thamChieu.trim(),
      // [ChiTienBang] Bỏ logic đối chiếu đơn mua
      // doi_chieu_don_mua_id: undefined,
      chiTiet,
      hinh_thuc:
        hasNhapKho && hasKhongNhapKho ? 'ca_hai' : hasKhongNhapKho && !hasNhapKho ? 'khong_nhap_kho' : 'nhap_kho',
      dia_chi_cong_trinh: diaChiCongTrinh?.trim() || undefined,
      attachments:
        attachments.length > 0
          ? chuanHoaDuongDanDinhKemChiTienBang(attachments, soDonHang.trim() || 'DHM', khPartDinhKem)
          : undefined,
      ...(phieuNhanTuChiTienBang
        ? {
            chung_tu_mua_chua_thanh_toan: chungTuMuaCachThanhToan === 'chua_thanh_toan',
            chung_tu_mua_thanh_toan_ngay: chungTuMuaCachThanhToan === 'thanh_toan_ngay',
            chung_tu_mua_pttt: chungTuMuaPttt,
            chung_tu_mua_loai_hd: chungTuMuaLoaiHd,
            chung_tu_mua_so_hoa_don: phieuSoHoaDon.trim() || undefined,
            hoa_don_ngay: toIsoDate(hoaDonNgay) || undefined,
            hoa_don_ky_hieu: hoaDonKyHieu.trim() || undefined,
            mau_hoa_don_ma: mauHoaDonMa.trim() || undefined,
            mau_hoa_don_ten: mauHoaDonTen.trim() || undefined,
            phieu_chi_nha_cung_cap: phieuChiKH.trim() || undefined,
            phieu_chi_dia_chi: phieuChiDiaChi.trim() || undefined,
            phieu_chi_nguoi_nhan_tien: phieuChiNguoiNhanTien.trim() || undefined,
            phieu_chi_ly_do: phieuChiLyDo.trim() || undefined,
            phieu_chi_ngay: phieuChiNgay ? toIsoDateTime(phieuChiNgay) : undefined,
            ...(chungTuMuaPttt === 'chuyen_khoan'
              ? {
                  phieu_chi_tai_khoan_chi: phieuChiTaiKhoanChi.trim() || undefined,
                  phieu_chi_ngan_hang_chi: phieuChiNganHangChi.trim() || undefined,
                  phieu_chi_ten_nguoi_gui: phieuChiTenNguoiGui.trim() || undefined,
                  phieu_chi_tai_khoan_nhan: phieuChiTaiKhoanNhan.trim() || undefined,
                  phieu_chi_ngan_hang_nhan: phieuChiNganHangNhan.trim() || undefined,
                  phieu_chi_ten_chu_tk_nhan: phieuChiTenChuTkNhan.trim() || undefined,
                  phieu_chi_ngan_hang: phieuChiNganHangNhan.trim() || undefined,
                  phieu_chi_ten_nguoi_nhan_ck: phieuChiTenChuTkNhan.trim() || undefined,
                }
              : {
                  phieu_chi_tai_khoan_chi: undefined,
                  phieu_chi_ngan_hang_chi: undefined,
                  phieu_chi_ten_nguoi_gui: undefined,
                  phieu_chi_tai_khoan_nhan: undefined,
                  phieu_chi_ngan_hang_nhan: undefined,
                  phieu_chi_ten_chu_tk_nhan: undefined,
                  phieu_chi_ngan_hang: undefined,
                  phieu_chi_ten_nguoi_nhan_ck: undefined,
                }),
            phieu_chi_attachments:
              phieuChiAttachments.length > 0
                ? chuanHoaDuongDanDinhKemChiTienBang(phieuChiAttachments, soDonHang.trim() || 'DHM', khPartDinhKem)
                : undefined,
          }
        : {}),
    }
    return payload
  }

  /** Kiểm tra trước khi lưu — highlight + toast + focus (form-validation-focus). */
  const validateBeforeSave = (): boolean => {
    setValErrKey(null)
    const toastErr = (msg: string) => toastApi?.showToast(msg, 'error')
    const fail = (key: string, msg: string, focusEl: HTMLElement | null) => {
      setValErrKey(key)
      setLoi(msg)
      toastErr(msg)
      setTimeout(() => htqlFocusAndScrollIntoView(focusEl), 0)
      return false
    }
    if (!chiTienPhieu && !thamChieu.trim()) {
      return fail(
        'doi_chieu',
        laPhieuNhanNvthh
          ? phieuNhanTuChiTienBang
            ? 'Vui lòng chọn hoặc nhập báo giá (Nhận hàng từ).'
            : 'Vui lòng chọn hoặc nhập mã báo giá đối chiếu.'
          : 'Vui lòng nhập Tên báo giá.',
        refTieuDeInput.current,
      )
    }
    if (!khachHangDisplay.trim()) {
      return fail('kh', 'Vui lòng chọn Khách hàng.', refKhWrap.current?.querySelector('input') ?? refKhWrap.current)
    }
    const tgGiaoHangTenLoi =
      phieuNhanTuChiTienBang && phieuNhanTabChung === 'phieu-chi' ? 'TG chi' : 'TG nhận hàng'
    if (phieuNhanTuChiTienBang) {
      if (!ngayGiaoHang) {
        return fail('tg_nhap', 'Vui lòng chọn TG nhập.', refTgNhapNvthhInput.current)
      }
      if (ngayDonHang && ngayGiaoHang.getTime() < ngayDonHang.getTime()) {
        return fail('tg_nhap', 'TG nhập không được nhỏ hơn TG tạo.', refTgNhapNvthhInput.current)
      }
      if (!phieuChiNgay) {
        return fail('phieu_chi_ngay', 'Vui lòng chọn ngày chi.', refPhieuChiNgayInput.current)
      }
      if (ngayDonHang && phieuChiNgay.getTime() < ngayDonHang.getTime()) {
        return fail('phieu_chi_ngay', 'Ngày chi không được nhỏ hơn TG tạo.', refPhieuChiNgayInput.current)
      }
    } else if (!chiTienPhieu && !ngayGiaoHang) {
      return fail(
        'tg_nhan',
        `Vui lòng chọn ${tgGiaoHangTenLoi}.`,
        refTgNhanBGInput.current,
      )
    }
    if (!soDonHang.trim()) {
      return fail('so_don', `${soDonLabelHienThi} không được để trống.`, null)
    }
    if (chiTienPhieu) {
      const phieuLines = phieuThuChiTietLines.filter((r) => {
        const ma = (r.ma_chung_tu ?? '').trim()
        return ma !== '' && ma !== '—'
      })
      if (phieuLines.length === 0) {
        return fail('chi_tiet', 'Phải có ít nhất một dòng chi tiết phiếu chi có mã chứng từ.', refBGChiTietSection.current)
      }
      const badThu = phieuThuChiTietLines.some((r) => {
        const ma = (r.ma_chung_tu ?? '').trim()
        if (!ma || ma === '—') return false
        return parseFloatVN(r.thu_lan_nay) <= 0
      })
      if (badThu) {
        return fail('thu_lan_nay', '«Chi lần này» mỗi dòng phải lớn hơn 0.', refThuLanNayPhieu0.current)
      }
    }
    if (!chiTienPhieu) {
      const detailLines = lines.filter((line) => (line['Mã'] ?? '').trim() !== '')
      if (detailLines.length === 0) {
        return fail('chi_tiet', 'Phải có ít nhất một dòng chi tiết VTHH.', refBGChiTietSection.current)
      }
      const badSlIdx = lines.findIndex((line) => {
        if (!(line['Mã'] ?? '').trim()) return false
        return parseFloatVN(line['Số lượng'] ?? '') <= 0
      })
      if (badSlIdx >= 0) {
        const el = document.querySelector(`[data-BG-sl-idx="${badSlIdx}"]`) as HTMLElement | null
        return fail(`so_luong_${badSlIdx}`, 'Số lượng từng dòng VTHH phải lớn hơn 0.', el)
      }
    }
    if (!phieuNhanTuChiTienBang && !chiTienPhieu && ngayGiaoHang && ngayDonHang) {
      const gioiHan = ngayGiaoHang.getTime() < ngayDonHang.getTime()
      if (gioiHan) {
        return fail(
          'tg_nhan',
          `${tgGiaoHangTenLoi} không được nhỏ hơn TG tạo.`,
          refTgNhanBGInput.current,
        )
      }
    }
    setLoi('')
    return true
  }

  /** Lưu toàn bộ dữ liệu đang hiển thị và đóng form. */
  const handleLuuVaDong = async () => {
    setLoi('')
    if (!validateBeforeSave()) return
    setDangLuu(true)
    try {
      const payload = buildPayload()
      let savedRecord: ChiTienBangRecord | undefined
      if (initialDon) {
        api.put(initialDon.id, payload)
        savedRecord = chiTienBangGetAll({ ...getDefaultChiTienBangFilter(), tu: '', den: '' }).find((x) => x.id === initialDon.id)
      } else {
        savedRecord = await api.post(payload)
      }
      api.clearDraft()
      setUnsavedChanges(false)
      setAttachmentsDirty(false)
      onSaved?.(savedRecord)
      onClose()
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Có lỗi xảy ra.')
    } finally {
      setDangLuu(false)
    }
  }

  const formatHanDateLocal = (d: Date) => {
    const day = d.getDate()
    const mo = d.getMonth() + 1
    const y = d.getFullYear()
    return `${String(day).padStart(2, '0')}/${String(mo).padStart(2, '0')}/${y}`
  }
  /** [YC32] Hạn thanh toán = TG tạo báo giá (ngayDonHang) + số ngày được nợ */
  const hanThanhToanDayDu = Boolean(ngayDonHang && String(soNgayDuocNo ?? '').replace(/\D/g, '') !== '')
  const hanThanhToanHienThi = (() => {
    const todayStr = formatHanDateLocal(new Date())
    if (!ngayDonHang) return todayStr
    const raw = String(soNgayDuocNo ?? '').replace(/\D/g, '')
    if (raw === '') return todayStr
    const n = parseInt(raw, 10)
    const days = Number.isFinite(n) && n >= 0 ? n : 0
    return formatHanDateLocal(addDays(ngayDonHang, days))
  })()

  tlCkInputRef.current = tlCkInput
  tienCkInputRef.current = tienCkInput
  const coBangCoDonGiaTuDau =
    initialDon != null || Boolean(prefillChiTiet && prefillChiTiet.length > 0)
  const hienThiFooterTongTien = coBangCoDonGiaTuDau || mauHienTai === 'codongia'
  const currentColumns = useMemo((): readonly string[] => {
    if (!hienThiFooterTongTien) return mauBgKhongDonGiaDisplay as readonly string[]
    return (apDungVatGtgt ? mauBgCoDonGiaDisplay : mauBgCoDonGiaKhongVatDisplay) as readonly string[]
  }, [hienThiFooterTongTien, apDungVatGtgt])
  const { tongTienHang, tienThue } = useMemo(
    () =>
      computeDonHangMuaFooterTotals(lines, {
        apDungVatGtgt: hienThiFooterTongTien ? apDungVatGtgt : true,
      }),
    [lines, apDungVatGtgt, hienThiFooterTongTien],
  )
  const tienCkNum = Math.max(0, parseFloatVN(tienCkInput || '0'))
  const tongTienThanhToan = tongTienHang + tienThue - tienCkNum
  const soDong = lines.length

  useEffect(() => {
    const prev = prevTongHangCkRef.current
    prevTongHangCkRef.current = tongTienHang
    if (prev == null) return
    if (prev === tongTienHang) return
    const last = chietKhauLastEditRef.current
    if (last == null) return
    if (last === 'tl') {
      const tl = parseFloatVN(tlCkInputRef.current)
      if (Number.isFinite(tl) && tl >= 0) setTienCkInput(formatSoTienHienThi((tongTienHang * tl) / 100))
    } else if (last === 'tien') {
      const tc = parseFloatVN(tienCkInputRef.current)
      if (Number.isFinite(tc) && tc >= 0 && tongTienHang > 0) setTlCkInput(formatSoThapPhan((tc * 100) / tongTienHang, 3))
    }
  }, [tongTienHang])

  const tongSoKienHangText = useMemo(() => {
    const map = new Map<string, number>()
    for (const line of lines) {
      if (!(line['Mã'] ?? '').trim()) continue
      const sl = parseFloatVN(line['Số lượng'] ?? '')
      if (!Number.isFinite(sl) || sl <= 0) continue
      const dvtRaw = (line['ĐVT'] ?? '').trim()
      const label = dvtRaw ? dvtHienThiLabel(dvtRaw, dvtList) : ''
      const key = label || '—'
      map.set(key, (map.get(key) ?? 0) + sl)
    }
    if (map.size === 0) return '—'
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'vi'))
      .map(([dvt, sum]) => `${formatSoThapPhan(sum, 2)} ${dvt}`)
      .join(', ')
  }, [lines, dvtList])

  const phieuNhanLienKetTuDonMua = useMemo(() => {
    if (!initialDon?.id || phieuNhanTuChiTienBang) return []
    const all = nhanVatTuHangHoaGetAll({ ...getDefaultNhanVatTuHangHoaFilter(), tu: '', den: '' })
    return all.filter((p) => (p.doi_chieu_don_mua_id ?? '').trim() === initialDon.id)
  }, [initialDon?.id, phieuNhanTuChiTienBang])

  const lichSuData = useMemo(() => {
    if (phieuNhanTuChiTienBang) return null
    return layLichSuChiTienChoKhach(khachHangDisplay, { excludeChiTienBangId: initialDon?.id })
  }, [khachHangDisplay, initialDon?.id, phieuNhanTuChiTienBang])

  const chungTuCongNoList = useMemo(() => {
    if (!chiTienPhieu || phieuNhanTuChiTienBang) return []
    const t = khachHangDisplay.trim()
    if (!t) return []
    void chungTuCongNoTick
    return layChungTuConNoTheoKhach(t, { excludeChiTienBangId: initialDon?.id })
  }, [chiTienPhieu, phieuNhanTuChiTienBang, khachHangDisplay, initialDon?.id, chungTuCongNoTick])

  const prevKhachHangIdPhieuRef = useRef<number | null>(null)
  useEffect(() => {
    if (!chiTienPhieu) return
    const prev = prevKhachHangIdPhieuRef.current
    if (prev !== null && khachHangId !== null && khachHangId !== prev) {
      setChungTuCongNoSelectedKey(null)
    }
    prevKhachHangIdPhieuRef.current = khachHangId
  }, [khachHangId, chiTienPhieu])

  useEffect(() => {
    const bump = () => setChungTuCongNoTick((n) => n + 1)
    window.addEventListener(HTQL_CHI_TIEN_BANG_RELOAD_EVENT, bump)
    window.addEventListener(HTQL_DON_HANG_BAN_LIST_REFRESH_EVENT, bump)
    window.addEventListener(HTQL_HOP_DONG_BAN_LIST_REFRESH_EVENT, bump)
    window.addEventListener(HTQL_PHU_LUC_HOP_DONG_BAN_LIST_REFRESH_EVENT, bump)
    return () => {
      window.removeEventListener(HTQL_CHI_TIEN_BANG_RELOAD_EVENT, bump)
      window.removeEventListener(HTQL_DON_HANG_BAN_LIST_REFRESH_EVENT, bump)
      window.removeEventListener(HTQL_HOP_DONG_BAN_LIST_REFRESH_EVENT, bump)
      window.removeEventListener(HTQL_PHU_LUC_HOP_DONG_BAN_LIST_REFRESH_EVENT, bump)
    }
  }, [])

  const showLichSuPanel = !chiTienPhieu && !phieuNhanTuChiTienBang && coLichSuChiTien(lichSuData)

  const showLienQuanPhieuNhanHang =
    !phieuNhanTuChiTienBang &&
    Boolean(initialDon?.id) &&
    tinhTrang === TINH_TRANG_BAO_GIA_DA_GUI_KHACH

  const ghiChuLaCotCuoi = currentColumns.length > 0 && currentColumns[currentColumns.length - 1] === 'Ghi chú'
  const ghiChuFill = ghiChuLaCotCuoi
  const tableMinWidth = COL_WIDTH_STT + COL_WIDTH_ACTION + currentColumns.reduce((sum, c) => {
    const s = colWidthStyle(c, c === 'Ghi chú' ? ghiChuFill : undefined)
    return sum + (typeof (s.width as number) === 'number' ? (s.width as number) : (s.minWidth as number) ?? 0)
  }, 0)

  const hinhThucLocked = effectiveReadOnly

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--bg-primary)' }}>
      <div style={titleBarWrap}>
        <div
          onMouseDown={onHeaderPointerDown}
          style={{
            ...titleBarDrag,
            ...headerDragStyle,
            cursor: onHeaderPointerDown && dragging ? 'grabbing' : onHeaderPointerDown ? 'grab' : 'default',
          }}
        >
          {phieuNhanTuChiTienBang
            ? tieuDePhieuNvthhDayDu
            : (() => {
                const mode = initialDon ? (effectiveReadOnly ? 'XEM' : 'SỬA') : 'THÊM'
                const khPart = khachHangDisplay ? ` - ${khachHangDisplay.toUpperCase()}` : ''
                if (chiTienPhieu) return `${mode} PHIẾU CHI TIỀN${khPart}`
                const tc = (thamChieu ?? '').trim()
                const tieuDePart = tc ? ` - "${tc.toUpperCase()}"` : ''
                return `${mode} BÁO GIÁ${tieuDePart}${khPart}`
              })()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {onMinimize && (
            <button type="button" style={titleBarBtn} title="Thu nhỏ" onClick={(e) => { e.stopPropagation(); onMinimize() }} aria-label="Thu nhỏ">
              <Minus size={14} />
            </button>
          )}
          {onMaximize && (
            <button type="button" style={titleBarBtn} title="Phóng to / Khôi phục" onClick={(e) => { e.stopPropagation(); onMaximize() }} aria-label="Phóng to">
              <Square size={12} />
            </button>
          )}
          <button type="button" style={titleBarBtn} title="Đóng" onClick={(e) => { e.stopPropagation(); onClose() }} aria-label="Đóng">
            <X size={14} />
          </button>
        </div>
      </div>
      <div style={toolbarWrap}>
        {readOnly && effectiveReadOnly && !donDaNhanHangXem && !donHuyBoChiXem && !viewOnlyLocked && !khoaSauTaoGd && !khoaGhiSoPhieuThu && (
          <button type="button" style={toolbarBtnAccent} onClick={() => setEditingFromView(true)}><Pencil size={14} /> Sửa</button>
        )}
        {!effectiveReadOnly && (
          <button type="button" style={toolbarBtnAccent} onClick={handleLuuVaDong} disabled={dangLuu}><Save size={14} /> {dangLuu ? 'Đang lưu...' : 'Lưu'}</button>
        )}
        {!phieuNhanTuChiTienBang && (
          <div style={toolbarDinhKemWrap}>
            <button
              ref={refDinhKemBtn}
              type="button"
              style={toolbarBtn}
              title={dktkPendingUploadRows.length > 0 ? 'Đang đọc file đính kèm vào bộ nhớ…' : 'Đính kèm chứng từ'}
              onClick={() => {
                setShowDinhKemModal((o) => {
                  const next = !o
                  if (next) setDinhKemModalAnchor('toolbar')
                  return next
                })
              }}
            >
              {dktkPendingUploadRows.length > 0 ? (
                <Loader2 size={14} className="htql-spin" aria-hidden />
              ) : (
                <Paperclip size={14} aria-hidden />
              )}
              Đính kèm chứng từ
            </button>
            {attachments.length > 0 && (
              <span style={toolbarDinhKemBadge} aria-label={`${attachments.length} file đính kèm`}>
                {attachments.length > 99 ? '99+' : attachments.length}
              </span>
            )}
          </div>
        )}
        {!chiTienPhieu && (
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => {
            if (mauSubmenuTimeoutRef.current) {
              clearTimeout(mauSubmenuTimeoutRef.current)
              mauSubmenuTimeoutRef.current = null
            }
            mauSubmenuTimeoutRef.current = setTimeout(() => setDropdownMau(true), SUBMENU_HOVER_DELAY_MS)
          }}
          onMouseLeave={() => {
            if (mauSubmenuTimeoutRef.current) {
              clearTimeout(mauSubmenuTimeoutRef.current)
              mauSubmenuTimeoutRef.current = null
            }
            setDropdownMau(false)
          }}
        >
          <button type="button" style={toolbarBtn} disabled={effectiveReadOnly || initialDon != null || phieuNhanTuChiTienBang}>
            <FileText size={14} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>Mẫu <ChevronDown size={10} /></span>
          </button>
          {dropdownMau && !effectiveReadOnly && initialDon == null && !phieuNhanTuChiTienBang && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 0, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10, minWidth: 180, padding: '2px 0' }}>
              {[
                { key: 'codongia' as const, label: 'Mẫu có đơn giá' },
                { key: 'khongdongia' as const, label: 'Mẫu không đơn giá' },
              ].map(({ key, label }) => (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  style={{
                    padding: '6px 10px',
                    fontSize: 11,
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--row-selected-bg)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setMauHienTai(key)
                    if (key === 'codongia') {
                      if (mauHienTai === 'khongdongia') {
                        setLines((prev) => (prev.length > 0 ? migrateChiTienBangLinesToCoDonGia(prev, vatTuList) : mauCoDonGiaLines()))
                      } else {
                        setLines((prev) => (prev.length === 0 ? mauCoDonGiaLines() : prev))
                      }
                    } else {
                      setLines((prev) => (prev.length === 0 ? mauKhongDonGiaLines() : prev))
                    }
                    setDropdownMau(false)
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>
        )}
        <button type="button" style={toolbarBtn}><Printer size={14} /> In</button>
        <div
          ref={refEmail}
          style={{ position: 'relative' }}
          onMouseEnter={() => {
            if (emailSubmenuTimeoutRef.current) {
              clearTimeout(emailSubmenuTimeoutRef.current)
              emailSubmenuTimeoutRef.current = null
            }
            emailSubmenuTimeoutRef.current = setTimeout(() => setDropdownEmail(true), SUBMENU_HOVER_DELAY_MS)
          }}
          onMouseLeave={() => {
            if (emailSubmenuTimeoutRef.current) {
              clearTimeout(emailSubmenuTimeoutRef.current)
              emailSubmenuTimeoutRef.current = null
            }
            setDropdownEmail(false)
          }}
        >
          <button type="button" style={toolbarBtn}>
            <Mail size={14} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>Gửi email, Zalo <ChevronDown size={10} /></span>
          </button>
          {dropdownEmail && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 0, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10, minWidth: 120 }}>
              <button type="button" style={{ ...toolbarBtn, width: '100%', justifyContent: 'flex-start', border: 'none' }}>Email</button>
              <button type="button" style={{ ...toolbarBtn, width: '100%', justifyContent: 'flex-start', border: 'none' }}>Zalo</button>
            </div>
          )}
        </div>
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

      {/* [ChiTienBang] Bỏ modal chọn báo giá đối chiếu - không áp dụng cho Báo giá */}
      {false && (
        <Modal
          open={false}
          onClose={() => {}}
          title="Chọn báo giá"
          size="md"
        >
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {(() => {
              const bgChonTuDonList = ChiTienBangListForDoiChieuNhanHang()
              return (
                <>
                  {bgChonTuDonList.map((bg) => {
                    const ngayDdMm = formatIsoToDdMmYyyy(bg.ngay_chi_tien_bang)
                    return (
                      <div
                        key={bg.id}
                        role="button"
                        tabIndex={0}
                        style={{
                          padding: '8px 10px',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          fontSize: 11,
                          color: 'var(--text-primary)',
                          display: 'grid',
                          gridTemplateColumns: '72px 1fr 80px',
                          gap: 8,
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          applyChonChiTienBangDoiChieu(bg)
                          // [ChiTienBang] Bỏ setShowTimDonMuaHangPopup
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{bg.so_chi_tien_bang}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bg.khach_hang || ''}</span>
                        <span style={{ color: 'var(--text-muted)', textAlign: 'right' }}>{ngayDdMm}</span>
                      </div>
                    )
                  })}
                  {bgChonTuDonList.length === 0 && (
                    <div style={{ padding: 16, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                      Không có báo giá đủ điều kiện đối chiếu.
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </Modal>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', minHeight: 0, padding: '8px 12px', gap: 0, alignItems: 'stretch' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {phieuNhanTuChiTienBang && (
          <div
            style={{
              width: '100%',
              maxWidth: '100%',
              marginBottom: 6,
              paddingBottom: 4,
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', minWidth: 0 }}>
              {(() => {
                const chungTuMuaHienThi =
                  hinhThucSelectedIds.length > 0
                    ? hinhThucSelectedIds.map((id) => hinhThucList.find((x) => x.id === id)?.ten).filter(Boolean).join(', ')
                    : PHIEU_CHUNG_TU_MUA_DEFAULT_TEXT
                const chungTuInputStyle: React.CSSProperties = {
                  ...inputStyle,
                  ...lookupInputWithChevronStyle,
                  width: '100%',
                  minWidth: 0,
                  flex: 1,
                  maxWidth: 'none',
                  cursor: hinhThucLocked ? 'default' : 'pointer',
                  height: LOOKUP_CONTROL_HEIGHT,
                  minHeight: LOOKUP_CONTROL_HEIGHT,
                  fontSize: 11,
                  boxSizing: 'border-box',
                }
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: 'var(--text-primary)',
                          lineHeight: `${LOOKUP_CONTROL_HEIGHT}px`,
                          flexShrink: 0,
                          letterSpacing: '0.02em',
                        }}
                      >
                        Chứng từ mua hàng
                      </span>
                      <div
                        ref={refHinhThucWrap}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          height: LOOKUP_CONTROL_HEIGHT,
                          minHeight: LOOKUP_CONTROL_HEIGHT,
                          borderRadius: 4,
                          border: '1px solid transparent',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div
                          style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT, cursor: hinhThucLocked ? 'default' : 'pointer' }}
                          onClick={() => { if (!hinhThucLocked) setHinhThucDropdownOpen(true) }}
                        >
                          <input
                            style={chungTuInputStyle}
                            value={chungTuMuaHienThi}
                            readOnly
                            disabled={hinhThucLocked}
                            aria-label="Chọn chứng từ mua hàng"
                          />
                          <span style={{ ...lookupChevronOverlayStyle, top: 0, bottom: 0 }} aria-hidden><ChevronDown size={12} style={{ color: 'var(--accent-text)' }} /></span>
                        </div>
                        {!hinhThucLocked && (
                          <button type="button" style={lookupActionButtonStyle} title="Thêm hình thức" onClick={() => setShowThemHinhThucModal(true)} aria-label="Thêm hình thức">
                            <Plus size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, width: '100%', minWidth: 0 }}>
                      <div role="radiogroup" aria-label="Thanh toán chứng từ mua hàng" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: effectiveReadOnly ? 'default' : 'pointer', color: 'var(--text-primary)', userSelect: 'none' }}>
                          <input
                            type="radio"
                            name="htql_phieu_chung_tu_tt"
                            checked={chungTuMuaCachThanhToan === 'chua_thanh_toan'}
                            disabled={effectiveReadOnly}
                            onChange={() => setChungTuMuaCachThanhToan('chua_thanh_toan')}
                          />
                          Chưa thanh toán
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: effectiveReadOnly ? 'default' : 'pointer', color: 'var(--text-primary)', userSelect: 'none' }}>
                          <input
                            type="radio"
                            name="htql_phieu_chung_tu_tt"
                            checked={chungTuMuaCachThanhToan === 'thanh_toan_ngay'}
                            disabled={effectiveReadOnly}
                            onChange={() => setChungTuMuaCachThanhToan('thanh_toan_ngay')}
                          />
                          Thanh toán ngay
                        </label>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
                        <span style={{ ...labelStyle, minWidth: 36, width: 'auto', textAlign: 'left' }}>PTTT</span>
                        <div style={{ position: 'relative', display: 'flex', width: 130, minWidth: 120, flexShrink: 0, height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}>
                          <select
                            style={{
                              ...inputStyle,
                              ...lookupInputWithChevronStyle,
                              flex: 1,
                              minWidth: 0,
                              width: '100%',
                              appearance: 'none',
                              height: LOOKUP_CONTROL_HEIGHT,
                              minHeight: LOOKUP_CONTROL_HEIGHT,
                              cursor: effectiveReadOnly ? 'default' : 'pointer',
                            }}
                            value={chungTuMuaPttt}
                            onChange={(e) => setChungTuMuaPttt(e.target.value as 'tien_mat' | 'chuyen_khoan')}
                            disabled={effectiveReadOnly}
                          >
                            <option value="tien_mat">Tiền mặt</option>
                            <option value="chuyen_khoan">Chuyển khoản</option>
                          </select>
                          <span style={lookupChevronOverlayStyle} aria-hidden><ChevronDown size={12} style={{ color: 'var(--accent-text)' }} /></span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
                        <span style={{ ...labelStyle, minWidth: 52, width: 'auto', textAlign: 'left' }}>Hóa đơn</span>
                        <div style={{ position: 'relative', display: 'flex', width: 130, minWidth: 120, flexShrink: 0, height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}>
                          <select
                            style={{
                              ...inputStyle,
                              ...lookupInputWithChevronStyle,
                              flex: 1,
                              minWidth: 0,
                              width: '100%',
                              appearance: 'none',
                              height: LOOKUP_CONTROL_HEIGHT,
                              minHeight: LOOKUP_CONTROL_HEIGHT,
                              cursor: effectiveReadOnly ? 'default' : 'pointer',
                            }}
                            value={chungTuMuaLoaiHd}
                            onChange={(e) => setChungTuMuaLoaiHd(e.target.value as ChungTuMuaLoaiHdPhieu)}
                            disabled={effectiveReadOnly}
                          >
                            <option value="gtgt">HĐ GTGT</option>
                            <option value="hd_le">HĐ lẻ</option>
                          </select>
                          <span style={lookupChevronOverlayStyle} aria-hidden><ChevronDown size={12} style={{ color: 'var(--accent-text)' }} /></span>
                        </div>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
            {hinhThucDropdownOpen && hinhThucDropdownRect && (
              <div
                data-hinh-thuc-dropdown
                style={{ position: 'fixed', top: hinhThucDropdownRect.top, left: hinhThucDropdownRect.left, width: Math.max(hinhThucDropdownRect.width, 220), maxHeight: 180, overflowY: 'auto', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1050 }}
              >
                {hinhThucList.map((ht) => {
                  const sel = hinhThucSelectedIds.includes(ht.id)
                  return (
                    <div
                      key={ht.id}
                      role="option"
                      tabIndex={0}
                      style={{ padding: '6px 10px', fontSize: 11, cursor: 'pointer', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', background: sel ? 'var(--row-selected-bg)' : undefined }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setHinhThucSelectedIds((prev) => {
                          const next = sel ? prev.filter((x) => x !== ht.id) : [...prev, ht.id]
                          const allOn = hinhThucList.length > 0 && hinhThucList.every((h) => next.includes(h.id))
                          if (allOn) queueMicrotask(() => setHinhThucDropdownOpen(false))
                          return next
                        })
                      }}
                    >
                      {sel && '✓ '}{ht.ten}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', minHeight: 0, gap: 2, marginBottom: 2 }}>
          <div style={{ display: 'flex', flexDirection: 'row', gap: 16, flexWrap: 'wrap', alignItems: 'stretch', flexShrink: 0, width: '100%', minWidth: 0 }}>
          {(() => {
            const laCaNhanKh = loaiKhachHangHienThi === 'ca_nhan'
            const laToChucKh = loaiKhachHangHienThi === 'doanh_nghiep'
            const daChonKhachHangPhieu = khachHangId != null || (initialDon?.khach_hang ?? '').trim() !== ''
            const thongTinChungFields = (
              <>
            {!chiTienPhieu && (!effectiveReadOnly || phieuNhanTuChiTienBang || (thamChieu ?? '').trim() !== '') && (
            <div style={{ ...fieldRowDyn, alignItems: 'center' }}>
              <label style={labelStyle}>{phieuNhanTuChiTienBang ? 'Nhận hàng từ:' : 'Tên báo giá'}</label>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                {effectiveReadOnly ? (
                  <div
                    style={{
                      flex: 1, minWidth: 0, fontSize: 11,
                      padding: '2px 6px', height: FORM_FIELD_HEIGHT, minHeight: FORM_FIELD_HEIGHT,
                      display: 'flex', alignItems: 'center', borderRadius: 4,
                      background: 'var(--bg-primary)', border: '1px solid transparent',
                      overflow: 'hidden',
                    }}
                  >
                    {/* [ChiTienBang] Bỏ logic link xem báo giá đối chiếu */}
                    {false ? null : (
                      <span
                        style={{
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          textTransform: 'uppercase',
                        }}
                      >
                        {thamChieu || ''}
                      </span>
                    )}
                  </div>
                ) : (
                  <div
                    ref={undefined}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      height: LOOKUP_CONTROL_HEIGHT,
                      minHeight: LOOKUP_CONTROL_HEIGHT,
                      borderRadius: 4,
                      boxSizing: 'border-box',
                      border: valErrKey === 'doi_chieu' ? HTQL_FORM_ERROR_BORDER : '1px solid transparent',
                      position: undefined,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}>
                      <input
                        ref={refTieuDeInput}
                        style={{
                          ...inputStyle,
                          flex: 1,
                          minWidth: 0,
                          height: LOOKUP_CONTROL_HEIGHT,
                          minHeight: LOOKUP_CONTROL_HEIGHT,
                          textTransform: 'uppercase' as const,
                        }}
                        value={thamChieu}
                        onChange={(e) => {
                          const raw = e.target.value
                          setThamChieu(raw.toUpperCase())
                          if (valErrKey === 'doi_chieu') setValErrKey(null)
                        }}
                        onFocus={() => {
                          // [ChiTienBang] Bỏ logic đối chiếu - không mở dropdown tự động
                        }}
                        onClick={() => {
                          // [ChiTienBang] Bỏ logic đối chiếu
                        }}
                        readOnly={false}
                        disabled={false}
                        placeholder={
                          phieuNhanTuChiTienBang ? 'Bấm để chọn đơn Chưa thực hiện…' : 'Nhập tên báo giá'
                        }
                      />
                    </div>
                  </div>
                )}
                {hienThiFooterTongTien && !chiTienPhieu && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 8 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, cursor: effectiveReadOnly ? 'default' : 'pointer', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                      <input type="checkbox" checked={apDungVatGtgt} disabled={effectiveReadOnly} onChange={() => setApDungVatGtgt(true)} />
                      Có VAT
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, cursor: effectiveReadOnly ? 'default' : 'pointer', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                      <input type="checkbox" checked={!apDungVatGtgt} disabled={effectiveReadOnly} onChange={() => setApDungVatGtgt(false)} />
                      Không VAT
                    </label>
                  </div>
                )}
              </div>
            </div>
            )}
            {/* [ChiTienBang] Bỏ logic dropdown đối chiếu đơn mua */}
            {false
              ? ReactDOM.createPortal(
                  (() => {
                    const q = thamChieu.trim().toLowerCase()
                    const listNvthhNhanTu = ChiTienBangListChoPhieuNhanTuChiTienBang().filter((bg) => {
                      if (!q) return true
                      const ma = (bg.so_chi_tien_bang ?? '').toLowerCase()
                      const ten = (bg.so_chung_tu_cukcuk ?? '').toLowerCase()
                      const kh = (bg.khach_hang ?? '').toLowerCase()
                      return ma.includes(q) || ten.includes(q) || kh.includes(q)
                    })
                    return (
                      <div
                        data-nhan-hang-tu-dropdown
                        style={{
                          position: 'fixed',
                          top: nhanHangTuDropdownRect?.top ?? 0,
                          left: nhanHangTuDropdownRect?.left ?? 0,
                          width: nhanHangTuDropdownRect?.width ?? 360,
                          maxHeight: 240,
                          overflowY: 'auto',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-strong)',
                          borderRadius: 4,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          zIndex: 1060,
                        }}
                      >
                        {listNvthhNhanTu.map((bg) => {
                          const tenBg = (bg.so_chung_tu_cukcuk ?? '').trim() || '—'
                          const ma = (bg.so_chi_tien_bang ?? '').trim()
                          return (
                            <div
                              key={bg.id}
                              role="option"
                              tabIndex={0}
                              style={{
                                padding: '6px 10px',
                                fontSize: 11,
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                                borderBottom: '1px solid var(--border)',
                                display: 'grid',
                                gridTemplateColumns: '88px minmax(0,1fr) minmax(0,1fr)',
                                gap: 8,
                                alignItems: 'center',
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                applyChonChiTienBangDoiChieu(bg)
                                setNhanHangTuDropdownOpen(false)
                              }}
                            >
                              <span style={{ fontWeight: 600 }}>{ma}</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }} title={tenBg}>
                                {tenBg}
                              </span>
                              <span
                                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}
                                title={bg.khach_hang || ''}
                              >
                                {bg.khach_hang || ''}
                              </span>
                            </div>
                          )
                        })}
                        {listNvthhNhanTu.length === 0 && (
                          <div style={{ padding: 12, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                            Không có báo giá ở tình trạng Chờ duyệt.
                          </div>
                        )}
                      </div>
                    )
                  })(),
                  document.body,
                )
              : null}
            {chiTienPhieu && !laPhieuNhanNvthh && (
              <>
                <div style={{ ...fieldRowDyn, alignItems: 'center', width: '100%', minWidth: 0, flexWrap: 'wrap', gap: '6px 10px' }}>
                  <label style={labelStyle}>Lý do chi</label>
                  <div style={{ flex: '0 1 200px', minWidth: 140, maxWidth: 280, position: 'relative', display: 'flex', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}>
                    <select
                      style={{ ...inputStyle, ...lookupInputWithChevronStyle, flex: 1, minWidth: 0, appearance: 'none', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}
                      value={
                        lyDoPhieuChiOptions.length === 0
                          ? lyDoThuPhieu
                          : lyDoPhieuChiOptions.includes(lyDoThuPhieu)
                            ? lyDoThuPhieu
                            : (lyDoPhieuChiOptions[0] ?? '')
                      }
                      onChange={(e) => setLyDoThuPhieu(e.target.value)}
                      disabled={effectiveReadOnly}
                    >
                      {lyDoPhieuChiOptions.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                    <span style={lookupChevronOverlayStyle} aria-hidden>
                      <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                    </span>
                  </div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, cursor: effectiveReadOnly ? 'default' : 'pointer', color: 'var(--text-primary)', flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={thuTienMatPhieu}
                      disabled={effectiveReadOnly}
                      onChange={(e) => {
                        const v = e.target.checked
                        setThuTienMatPhieu(v)
                        if (v) setThuQuaNHPhieu(false)
                      }}
                    />
                    Chi tiền mặt
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, cursor: effectiveReadOnly ? 'default' : 'pointer', color: 'var(--text-primary)', flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={thuQuaNHPhieu}
                      disabled={effectiveReadOnly}
                      onChange={(e) => {
                        const v = e.target.checked
                        setThuQuaNHPhieu(v)
                        if (v) setThuTienMatPhieu(false)
                      }}
                    />
                    Chi qua NH
                  </label>
                </div>
              </>
            )}
            <div style={{ ...fieldRowDyn, alignItems: 'center', width: '100%', minWidth: 0 }}>
              <label style={labelStyle}>Khách hàng</label>
              <div
                ref={refKhWrap}
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  gap: 2,
                  alignItems: 'center',
                  position: 'relative',
                  height: LOOKUP_CONTROL_HEIGHT,
                  minHeight: LOOKUP_CONTROL_HEIGHT,
                  borderRadius: 4,
                  boxSizing: 'border-box',
                  border: valErrKey === 'kh' ? HTQL_FORM_ERROR_BORDER : '1px solid transparent',
                }}
              >
                <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}>
                  <input
                    style={{ ...inputStyle, ...lookupInputWithChevronStyle, flex: 1, minWidth: 0, cursor: effectiveReadOnly ? 'default' : 'pointer', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}
                    value={khDropdownOpen ? khSearchKeyword : khachHangDisplay}
                    onChange={(e) => {
                      if (effectiveReadOnly) return
                      setKhSearchKeyword(e.target.value)
                      if (!khDropdownOpen) setkhDropdownOpen(true)
                      if (valErrKey === 'kh') setValErrKey(null)
                    }}
                    onFocus={(e) => {
                      if (effectiveReadOnly) return
                      setKhSearchKeyword(khachHangDisplay)
                      setkhDropdownOpen(true)
                      e.currentTarget.select()
                    }}
                    onClick={(e) => {
                      if (!effectiveReadOnly) e.currentTarget.select()
                    }}
                    placeholder="Nhập để tìm hoặc chọn Khách hàng..."
                    readOnly={effectiveReadOnly}
                    disabled={effectiveReadOnly}
                  />
                  <span style={lookupChevronOverlayStyle} aria-hidden><ChevronDown size={12} style={{ color: 'var(--accent-text)' }} /></span>
                </div>
                <button type="button" style={lookupActionButtonStyle} title="Thêm Khách hàng" onClick={() => setShowThemKHForm(true)} disabled={effectiveReadOnly} aria-disabled={effectiveReadOnly}><Plus size={12} /></button>
              </div>
              <label style={{ ...labelStyle, minWidth: 82, width: 82, flexShrink: 0, textAlign: 'right' }}>{laCaNhanKh ? 'Số điện thoại' : 'Mã số thuế'}</label>
              <input
                style={{
                  ...inputStyle,
                  flex: '0 0 auto',
                  width: MA_SO_THUE_FIELD_WIDTH,
                  minWidth: MA_SO_THUE_FIELD_WIDTH,
                  maxWidth: MA_SO_THUE_FIELD_WIDTH,
                  boxSizing: 'border-box',
                  fontVariantNumeric: laCaNhanKh ? 'tabular-nums' : undefined,
                }}
                value={laCaNhanKh ? soDienThoaiCaNhan : maSoThue}
                onChange={(e) => (laCaNhanKh ? setSoDienThoaiCaNhan(e.target.value) : setMaSoThue(e.target.value))}
                readOnly={effectiveReadOnly}
                disabled={effectiveReadOnly}
                inputMode={laCaNhanKh ? 'tel' : undefined}
                autoComplete={laCaNhanKh ? 'tel' : undefined}
              />
              {khDropdownOpen && khDropdownRect && (
                <div
                  style={{
                    position: 'fixed',
                    top: khDropdownRect.top,
                    left: khDropdownRect.left,
                    width: khDropdownRect.width,
                    maxHeight: 220,
                    overflowY: 'auto',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 4,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1050,
                  }}
                >
                  {khListPhieuThuLocCongNo
                    .filter((kh) => matchSearchKeyword(`${kh.ma_kh} ${kh.ten_kh}`, khSearchKeyword))
                    .slice(0, 100)
                    .map((kh) => (
                      <div
                        key={kh.id}
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
                          handleChonKh(kh)
                          setKhSearchKeyword(kh.ten_kh || '')
                          setkhDropdownOpen(false)
                          if (valErrKey === 'kh') setValErrKey(null)
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{kh.ma_kh}</span>
                        {kh.ten_kh ? ` – ${kh.ten_kh}` : ''}
                      </div>
                    ))}
                  {khListPhieuThuLocCongNo.filter((kh) => matchSearchKeyword(`${kh.ma_kh} ${kh.ten_kh}`, khSearchKeyword)).length === 0 && (
                    <div style={{ padding: '10px', fontSize: 11, color: 'var(--text-muted)' }}>
                      {chiTienPhieu && laLyDoPhieuChiTraKhachHang(lyDoThuPhieu)
                        ? 'Không có khách hàng nào còn chứng từ công nợ (hoặc không khớp từ khóa).'
                        : 'Không tìm thấy Khách hàng phù hợp.'}
                    </div>
                  )}
                </div>
              )}
            </div>
            {!chiTienPhieu && !phieuNhanTuChiTienBang && laToChucKh ? (
              <div style={{ ...fieldRowDyn, alignItems: 'center', width: '100%', minWidth: 0 }}>
                <label style={labelStyle}>Người liên hệ</label>
                <input
                  style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                  value={tenNguoiLienHe}
                  onChange={(e) => setTenNguoiLienHe(e.target.value)}
                  readOnly={effectiveReadOnly}
                  disabled={effectiveReadOnly}
                  placeholder="Tên người liên hệ"
                />
                <label style={{ ...labelStyle, minWidth: 100, width: 100, flexShrink: 0, textAlign: 'right' }}>SĐT người LH</label>
                <input
                  style={{
                    ...inputStyle,
                    flex: '0 0 auto',
                    width: MA_SO_THUE_FIELD_WIDTH,
                    minWidth: MA_SO_THUE_FIELD_WIDTH,
                    maxWidth: MA_SO_THUE_FIELD_WIDTH,
                    boxSizing: 'border-box',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                  value={soDienThoaiLienHe}
                  onChange={(e) => setSoDienThoaiLienHe(e.target.value)}
                  readOnly={effectiveReadOnly}
                  disabled={effectiveReadOnly}
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
            ) : null}
            {laPhieuNhanNvthh ? (
              <div
                style={{
                  ...fieldRowDyn,
                  alignItems: 'center',
                  width: '100%',
                  minWidth: 0,
                  flexWrap: 'nowrap',
                }}
              >
                <label style={{ ...labelStyle, flexShrink: 0 }}>Người giao hàng</label>
                <input
                  style={{
                    ...inputStyle,
                    flex: '0 0 165px',
                    width: 165,
                    minWidth: 165,
                    maxWidth: 165,
                    boxSizing: 'border-box',
                  }}
                  value={nguoiGiaoHang}
                  onChange={(e) => setNguoiGiaoHang(e.target.value)}
                  readOnly={effectiveReadOnly}
                  disabled={effectiveReadOnly}
                />
                <label style={{ ...labelStyle, minWidth: 72, flexShrink: 0 }}>Địa chỉ</label>
                <input
                  style={{ ...inputStyle, flex: 1, minWidth: 0, width: '100%', boxSizing: 'border-box' }}
                  value={diaChi}
                  onChange={(e) => setDiaChi(e.target.value)}
                  readOnly={effectiveReadOnly}
                  disabled={effectiveReadOnly}
                />
              </div>
            ) : (
              <div style={fieldRowDyn}>
                <label style={labelStyle}>Địa chỉ</label>
                <input style={inputStyle} value={diaChi} onChange={(e) => setDiaChi(e.target.value)} readOnly={effectiveReadOnly} disabled={effectiveReadOnly} />
              </div>
            )}
            {chiTienPhieu && !laPhieuNhanNvthh && (
              <div style={{ ...fieldRowDyn, alignItems: 'center', width: '100%', minWidth: 0 }}>
                <label style={labelStyle}>Nội dung chi</label>
                <input
                  style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                  value={dienGiai}
                  readOnly
                  disabled={effectiveReadOnly}
                  title="Tự động theo lần chi và số tiền"
                />
              </div>
            )}
            {chiTienPhieu && !laPhieuNhanNvthh && !laCaNhanKh && daChonKhachHangPhieu && (
              <div style={{ ...fieldRowDyn, alignItems: 'center', width: '100%', minWidth: 0 }}>
                <label style={labelStyle}>Người nhận tiền</label>
                <input
                  style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                  value={tenNguoiLienHe}
                  onChange={(e) => setTenNguoiLienHe(e.target.value)}
                  readOnly={effectiveReadOnly}
                  disabled={effectiveReadOnly}
                  placeholder="Họ tên người nhận"
                />
                <label style={{ ...labelStyle, minWidth: 100, width: 100, flexShrink: 0, textAlign: 'right' }}>SĐT liên hệ</label>
                <input
                  style={{
                    ...inputStyle,
                    flex: '0 0 auto',
                    width: MA_SO_THUE_FIELD_WIDTH,
                    minWidth: MA_SO_THUE_FIELD_WIDTH,
                    maxWidth: MA_SO_THUE_FIELD_WIDTH,
                    boxSizing: 'border-box',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                  value={laCaNhanKh ? soDienThoaiCaNhan : soDienThoaiLienHe}
                  onChange={(e) => (laCaNhanKh ? setSoDienThoaiCaNhan(e.target.value) : setSoDienThoaiLienHe(e.target.value))}
                  readOnly={effectiveReadOnly}
                  disabled={effectiveReadOnly}
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
            )}
            {phieuNhanTuChiTienBang ? (
              <div style={{ ...fieldRowDyn, alignItems: 'center', width: '100%', minWidth: 0 }}>
                <label style={labelStyle}>Ghi chú</label>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    style={{
                      ...inputStyle,
                      flex: 1,
                      minWidth: 0,
                      height: FORM_FIELD_HEIGHT,
                      minHeight: FORM_FIELD_HEIGHT,
                      boxSizing: 'border-box',
                    }}
                    value={dienGiai}
                    onChange={(e) => {
                      dienGiaiPhieuTuChinhRef.current = true
                      setDienGiai(e.target.value)
                    }}
                    readOnly={effectiveReadOnly}
                    disabled={effectiveReadOnly}
                  />
                  <div style={toolbarDinhKemWrap}>
                    <button
                      ref={refDinhKemDuoiGhiChu}
                      type="button"
                      style={inlineDinhKemPhieuBtn}
                      title="Đính kèm chứng từ nhập"
                      onClick={() => {
                        setShowDinhKemModal((o) => {
                          const next = !o
                          if (next) setDinhKemModalAnchor('duoi-ghi-chu')
                          return next
                        })
                      }}
                    >
                      <Paperclip size={14} style={{ flexShrink: 0 }} /> Đính kèm chứng từ nhập
                    </button>
                    {attachments.length > 0 && (
                      <span style={toolbarDinhKemBadge} aria-label={`${attachments.length} file đính kèm`}>
                        {attachments.length > 99 ? '99+' : attachments.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : chiTienPhieu ? (
              <>
                {thuQuaNHPhieu && (
                  <div style={{ ...fieldRowDyn, alignItems: 'center', width: '100%', minWidth: 0, flexWrap: 'wrap', gap: 8 }}>
                    <label style={labelStyle}>Tài khoản chi</label>
                    <input style={{ ...inputStyle, flex: 1, minWidth: 120 }} value={congTyTkHienThi.so_tai_khoan} readOnly tabIndex={-1} />
                    <label style={{ ...labelStyle, minWidth: 100, flexShrink: 0, textAlign: 'right' }}>Tên ngân hàng</label>
                    {tkThuQuaNhCandidates.length === 0 ? (
                      <input style={{ ...inputStyle, flex: 1, minWidth: 160 }} value={congTyTkHienThi.ten_ngan_hang} readOnly tabIndex={-1} />
                    ) : tkThuQuaNhCandidates.length === 1 ? (
                      <input style={{ ...inputStyle, flex: 1, minWidth: 160 }} value={congTyTkHienThi.ten_ngan_hang} readOnly tabIndex={-1} />
                    ) : tkThuQuaNhCandidates.length === 2 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, flex: 1, minWidth: 160 }}>
                        {tkThuQuaNhCandidates.map((r) => (
                          <label
                            key={r.id}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: effectiveReadOnly ? 'default' : 'pointer' }}
                          >
                            <input
                              type="radio"
                              name="tknh-chi-qua-nh"
                              checked={(tknhThuQuaNhId ?? tkThuQuaNhCandidates[0]?.id) === r.id}
                              disabled={effectiveReadOnly}
                              onChange={() => setTknhThuQuaNhId(r.id)}
                            />
                            <span>{r.ten_ngan_hang}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div style={{ flex: 1, minWidth: 160, position: 'relative', display: 'flex', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}>
                        <select
                          style={{ ...inputStyle, ...lookupInputWithChevronStyle, flex: 1, minWidth: 0, appearance: 'none', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}
                          value={tknhThuQuaNhId ?? tkThuQuaNhCandidates[0]?.id ?? ''}
                          onChange={(e) => setTknhThuQuaNhId(e.target.value || null)}
                          disabled={effectiveReadOnly}
                        >
                          {tkThuQuaNhCandidates.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.ten_ngan_hang} — {r.so_tai_khoan}
                            </option>
                          ))}
                        </select>
                        <span style={lookupChevronOverlayStyle} aria-hidden>
                          <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div style={fieldRowDyn}>
                <label style={labelStyle}>Ghi chú</label>
                <input
                  style={inputStyle}
                  value={dienGiai}
                  onChange={(e) => {
                    setDienGiai(e.target.value)
                  }}
                  readOnly={effectiveReadOnly}
                  disabled={effectiveReadOnly}
                />
              </div>
            )}
            {!chiTienPhieu && (!phieuNhanTuChiTienBang || chungTuMuaCachThanhToan === 'chua_thanh_toan') && (
            <div style={{ ...fieldRowDyn, flexWrap: 'wrap', gap: 8, width: '100%', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 200px', minWidth: 0 }}>
                <label style={labelStyle}>ĐKTT</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 160 }}>
                  <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}>
                    <select style={{ ...inputStyle, ...lookupInputWithChevronStyle, flex: 1, minWidth: 0, appearance: 'none', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }} value={dieuKhoanTT} onChange={(e) => { const val = e.target.value; setDieuKhoanTT(val); const d = danhSachDKTT.find((x) => x.ten === val || x.ma === val); if (d) setSoNgayDuocNo(String(d.so_ngay_duoc_no)); }} disabled={effectiveReadOnly}>
                      <option value="">-- Chọn --</option>
                      {danhSachDKTT.map((d) => <option key={d.ma + d.ten} value={d.ten}>{d.ten}</option>)}
                    </select>
                    <span style={lookupChevronOverlayStyle} aria-hidden><ChevronDown size={12} style={{ color: 'var(--accent-text)' }} /></span>
                  </div>
                  {!effectiveReadOnly && (
                    <button type="button" style={lookupActionButtonStyle} title="Thêm mới ĐKTT" onClick={() => setShowThemDkttModal(true)} aria-label="Thêm mới ĐKTT">
                      <Plus size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto', flexWrap: 'wrap' }}>
                <label style={{ ...labelStyle, minWidth: 90 }}>Số ngày được nợ</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="text" inputMode="numeric" className="htql-no-spinner" style={{ ...inputStyleNumericField, width: 52, minWidth: 52, maxWidth: 52, boxSizing: 'border-box' }} value={soNgayDuocNo} onChange={(e) => setSoNgayDuocNo(formatSoNguyenInput(e.target.value))} readOnly={effectiveReadOnly} disabled={effectiveReadOnly} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>ngày</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto', minWidth: 0 }}>
                <label style={{ ...labelStyle, minWidth: 100 }}>Hạn thanh toán</label>
                <input
                  style={{ ...inputStyleDatetimeReadonlyDisplay, width: 112, minWidth: 112, flex: '0 0 auto', cursor: 'default', color: hanThanhToanDayDu ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  value={hanThanhToanHienThi}
                  readOnly
                  disabled
                  tabIndex={-1}
                  title={hanThanhToanDayDu ? 'TG tạo báo giá + số ngày được nợ' : 'Chưa đủ TG tạo hoặc số ngày được nợ — đang hiển thị ngày hiện tại'}
                />
              </div>
            </div>
            )}
            </>
            )
            return phieuNhanTuChiTienBang ? (
              <div style={{ flex: '1 1 320px', minWidth: 280, display: 'flex', flexDirection: 'column', alignSelf: 'stretch', marginBottom: 0, minHeight: 0 }}>
                <div className={ChiTienBangDetailStyles.detailTabBar} role="tablist" aria-label="Thông tin chứng từ">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={phieuNhanTabChung === 'phieu-nhap'}
                    className={phieuNhanTabChung === 'phieu-nhap' ? ChiTienBangDetailStyles.detailTabActive : ChiTienBangDetailStyles.detailTab}
                    style={phieuTabBarBtnCompact}
                    onClick={() => setPhieuNhanTabChung('phieu-nhap')}
                  >
                    Phiếu nhập
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={phieuNhanTabChung === 'phieu-chi'}
                    className={phieuNhanTabChung === 'phieu-chi' ? ChiTienBangDetailStyles.detailTabActive : ChiTienBangDetailStyles.detailTab}
                    style={phieuTabBarBtnCompact}
                    onClick={() => setPhieuNhanTabChung('phieu-chi')}
                  >
                    Phiếu chi
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={phieuNhanTabChung === 'hoa-don'}
                    className={phieuNhanTabChung === 'hoa-don' ? ChiTienBangDetailStyles.detailTabActive : ChiTienBangDetailStyles.detailTab}
                    style={phieuTabBarBtnCompact}
                    onClick={() => setPhieuNhanTabChung('hoa-don')}
                  >
                    Hóa đơn
                  </button>
                </div>
                <div
                  className={ChiTienBangDetailStyles.detailTabPanel}
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      minWidth: 0,
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr)',
                      gridTemplateRows: 'minmax(0, max-content)',
                      alignContent: 'start',
                      position: 'relative',
                    }}
                  >
                  <div
                    role="tabpanel"
                    id="htql-tab-phieu-nhap"
                    aria-hidden={phieuNhanTabChung !== 'phieu-nhap'}
                    style={{
                      gridColumn: 1,
                      gridRow: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '4px 8px 6px',
                      gap: 2,
                      overflow: phieuNhanTabChung === 'phieu-nhap' ? 'auto' : 'hidden',
                      visibility: phieuNhanTabChung === 'phieu-nhap' ? 'visible' : 'hidden',
                      pointerEvents: phieuNhanTabChung === 'phieu-nhap' ? 'auto' : 'none',
                      zIndex: phieuNhanTabChung === 'phieu-nhap' ? 1 : 0,
                    }}
                  >
                    {thongTinChungFields}
                  </div>
                  <div
                    role="tabpanel"
                    id="htql-tab-phieu-chi"
                    aria-hidden={phieuNhanTabChung !== 'phieu-chi'}
                    style={{
                      gridColumn: 1,
                      gridRow: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '4px 8px 6px',
                      gap: 2,
                      overflow: phieuNhanTabChung === 'phieu-chi' ? 'auto' : 'hidden',
                      visibility: phieuNhanTabChung === 'phieu-chi' ? 'visible' : 'hidden',
                      pointerEvents: phieuNhanTabChung === 'phieu-chi' ? 'auto' : 'none',
                      zIndex: phieuNhanTabChung === 'phieu-chi' ? 1 : 0,
                    }}
                  >
                    {chungTuMuaPttt === 'chuyen_khoan' && (
                      <div style={fieldRowDyn}>
                        <label style={labelStyle}>Tài khoản chi</label>
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            columnGap: 12,
                            rowGap: 6,
                          }}
                        >
                          <input
                            style={phieuChiStkInputBase(phieuChiStkInputCh)}
                            value={phieuChiTaiKhoanChi}
                            onChange={(e) => setPhieuChiTaiKhoanChi(e.target.value)}
                            readOnly={effectiveReadOnly}
                            disabled={effectiveReadOnly}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
                            <span style={phieuChiNganHangLabel} title="Ngân hàng">
                              NH
                            </span>
                            <input
                              style={phieuChiBankFieldCompact}
                              value={phieuChiNganHangChi}
                              onChange={(e) => setPhieuChiNganHangChi(e.target.value)}
                              readOnly={effectiveReadOnly}
                              disabled={effectiveReadOnly}
                              title={phieuChiNganHangChi.trim() || 'Nhập tên ngân hàng — chọn từ gợi ý'}
                              list="htql-bank-suggest-list"
                              placeholder="Tên NH..."
                            />
                            {bankSuggestList.length > 0 && (
                              <datalist id="htql-bank-suggest-list">
                                {bankSuggestList.map((b) => (
                                  <option key={b.id} value={b.shortName}>{b.name}</option>
                                ))}
                              </datalist>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '3 1 200px', minWidth: 120 }}>
                            <span style={phieuChiInlineLabel}>Tên người gửi</span>
                            <input
                              style={phieuChiTenNguoiField}
                              value={phieuChiTenNguoiGui}
                              onChange={(e) => setPhieuChiTenNguoiGui(e.target.value)}
                              readOnly={effectiveReadOnly}
                              disabled={effectiveReadOnly}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    <div style={fieldRowDyn}>
                      <label style={labelStyle}>Khách hàng</label>
                      <input
                        style={inputStyle}
                        value={phieuChiKH}
                        onChange={(e) => setPhieuChiKH(e.target.value)}
                        readOnly={effectiveReadOnly}
                        disabled={effectiveReadOnly}
                      />
                    </div>
                    <div style={fieldRowDyn}>
                      <label style={labelStyle}>Địa chỉ</label>
                      <input
                        style={inputStyle}
                        value={phieuChiDiaChi}
                        onChange={(e) => setPhieuChiDiaChi(e.target.value)}
                        readOnly={effectiveReadOnly}
                        disabled={effectiveReadOnly}
                      />
                    </div>
                    <div style={fieldRowDyn}>
                      <label style={labelStyle}>Người nhận tiền</label>
                      <input
                        style={inputStyle}
                        value={phieuChiNguoiNhanTien}
                        onChange={(e) => setPhieuChiNguoiNhanTien(e.target.value)}
                        readOnly={effectiveReadOnly}
                        disabled={effectiveReadOnly}
                      />
                    </div>
                    {chungTuMuaPttt === 'chuyen_khoan' && (
                      <div style={fieldRowDyn}>
                        <label style={labelStyle}>Tài khoản nhận</label>
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            columnGap: 12,
                            rowGap: 6,
                          }}
                        >
                          <input
                            style={phieuChiStkInputBase(phieuChiStkInputCh)}
                            value={phieuChiTaiKhoanNhan}
                            readOnly
                            disabled={effectiveReadOnly}
                            title="Điền tự động từ danh bạ Khách hàng"
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
                            <span style={phieuChiNganHangLabel} title="Ngân hàng">
                              NH
                            </span>
                            <input
                              style={phieuChiBankFieldCompact}
                              value={vietTatTenNganHang(phieuChiNganHangNhan)}
                              readOnly
                              disabled={effectiveReadOnly}
                              title={(phieuChiNganHangNhan || '').trim() || 'Điền tự động từ danh bạ Khách hàng'}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '3 1 200px', minWidth: 120 }}>
                            <span style={phieuChiInlineLabel}>Tên người nhận</span>
                            <input
                              style={phieuChiTenNguoiField}
                              value={phieuChiTenChuTkNhan}
                              readOnly
                              disabled={effectiveReadOnly}
                              title="Điền tự động từ danh bạ Khách hàng"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    <div style={{ ...fieldRowDyn, alignItems: 'center', width: '100%', minWidth: 0 }}>
                      <label style={labelStyle}>Lý do chi</label>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, position: 'relative', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}>
                        <select
                          style={{
                            ...inputStyle,
                            ...lookupInputWithChevronStyle,
                            flex: 1,
                            minWidth: 0,
                            appearance: 'none',
                            height: LOOKUP_CONTROL_HEIGHT,
                            minHeight: LOOKUP_CONTROL_HEIGHT,
                            boxSizing: 'border-box',
                          }}
                          value={
                            phieuChiLyDo.trim() === ''
                              ? ''
                              : phieuChiLyDoOptions.includes(phieuChiLyDo)
                                ? phieuChiLyDo
                                : phieuChiLyDo
                          }
                          onChange={(e) => setPhieuChiLyDo(e.target.value)}
                          disabled={effectiveReadOnly}
                        >
                          <option value="">— Chọn lý do —</option>
                          {phieuChiLyDoOptions.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                        <span style={lookupChevronOverlayStyle} aria-hidden>
                          <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                        </span>
                        <div style={toolbarDinhKemWrap}>
                          <button
                            ref={refPhieuChiDinhKemBtn}
                            type="button"
                            style={inlineDinhKemPhieuBtn}
                            title="Đính kèm chứng từ chi"
                            onClick={() => setShowDinhKemPhieuChiModal((o) => !o)}
                          >
                            <Paperclip size={14} style={{ flexShrink: 0 }} /> Đính kèm chứng từ chi
                          </button>
                          {phieuChiAttachments.length > 0 && (
                            <span style={toolbarDinhKemBadge} aria-label={`${phieuChiAttachments.length} file phiếu chi`}>
                              {phieuChiAttachments.length > 99 ? '99+' : phieuChiAttachments.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    role="tabpanel"
                    id="htql-tab-hoa-don"
                    aria-hidden={phieuNhanTabChung !== 'hoa-don'}
                    style={{
                      gridColumn: 1,
                      gridRow: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '4px 8px 6px',
                      gap: 2,
                      overflow: phieuNhanTabChung === 'hoa-don' ? 'auto' : 'hidden',
                      visibility: phieuNhanTabChung === 'hoa-don' ? 'visible' : 'hidden',
                      pointerEvents: phieuNhanTabChung === 'hoa-don' ? 'auto' : 'none',
                      zIndex: phieuNhanTabChung === 'hoa-don' ? 1 : 0,
                    }}
                  >
                    <div style={{ ...fieldRowDyn, flexWrap: 'wrap', alignItems: 'center' }}>
                      <label style={labelStyle}>Khách hàng</label>
                      <input
                        style={{ ...inputStyle, flex: '1 1 160px', minWidth: 120 }}
                        value={khachHangDisplay}
                        onChange={(e) => setKhachHangDisplay(e.target.value)}
                        readOnly={effectiveReadOnly}
                        disabled={effectiveReadOnly}
                      />
                      <label style={{ ...labelStyle, minWidth: 88 }}>Mã số thuế</label>
                      <input
                        style={{ ...inputStyle, flex: '0 1 160px', width: 160, maxWidth: '100%', boxSizing: 'border-box' }}
                        value={maSoThue}
                        onChange={(e) => setMaSoThue(e.target.value)}
                        readOnly={effectiveReadOnly}
                        disabled={effectiveReadOnly}
                      />
                    </div>
                    <div style={fieldRowDyn}>
                      <label style={labelStyle}>Địa chỉ</label>
                      <input
                        style={inputStyle}
                        value={diaChi}
                        onChange={(e) => setDiaChi(e.target.value)}
                        readOnly={effectiveReadOnly}
                        disabled={effectiveReadOnly}
                      />
                    </div>
                    <div style={fieldRowDyn}>
                      <label style={labelStyle}>Số tài khoản</label>
                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          columnGap: 12,
                          rowGap: 6,
                        }}
                      >
                        <input
                          style={phieuChiStkInputBase(phieuChiStkInputCh)}
                          value={phieuChiTaiKhoanNhan}
                          readOnly
                          disabled={effectiveReadOnly}
                          title="Điền tự động từ danh bạ Khách hàng (phiếu chi CK)"
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
                          <span style={phieuChiNganHangLabel} title="Ngân hàng">
                            NH
                          </span>
                          <input
                            style={phieuChiBankFieldCompact}
                            value={vietTatTenNganHang(phieuChiNganHangNhan)}
                            readOnly
                            disabled={effectiveReadOnly}
                            title={
                              (phieuChiNganHangNhan || '').trim() || 'Điền tự động từ danh bạ Khách hàng (phiếu chi CK)'
                            }
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '3 1 200px', minWidth: 120 }}>
                          <span style={phieuChiInlineLabel}>Tên người nhận</span>
                          <input
                            style={phieuChiTenNguoiField}
                            value={phieuChiTenChuTkNhan}
                            readOnly
                            disabled={effectiveReadOnly}
                            title="Điền tự động từ danh bạ Khách hàng (phiếu chi CK)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  ...groupBox,
                  flex: '1 1 360px',
                  minWidth: 0,
                  width: '100%',
                  maxWidth: '100%',
                  marginBottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignSelf: 'stretch',
                }}
              >
                <div
                  className={ChiTienBangDetailStyles.detailTabPanel}
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'auto',
                    padding: '8px 0 0',
                  }}
                >
                  {thongTinChungFields}
                </div>
              </div>
            )
          })()}

          <div
            style={{
              ...groupBox,
              width: phieuNhanTuChiTienBang ? 266 : 268,
              minWidth: phieuNhanTuChiTienBang ? 266 : 268,
              marginBottom: 0,
              flexShrink: 0,
              ...(phieuNhanTuChiTienBang ? { padding: '6px 8px', gap: FIELD_ROW_GAP } : {}),
              display: 'flex',
              flexDirection: 'column',
              alignSelf: 'stretch',
              minHeight: 0,
            }}
          >
            <div style={{ ...groupBoxTitle, ...(phieuNhanTuChiTienBang ? { marginBottom: 4 } : {}) }}>
              {phieuNhanTuChiTienBang ? (phieuNhanTabChung === 'hoa-don' ? 'Hóa đơn' : 'Chứng từ') : 'Thu tiền'}
            </div>
            {phieuNhanTuChiTienBang && phieuNhanTabChung === 'hoa-don' ? (
              <>
                <div style={fieldRowDyn}>
                  <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>Mẫu HĐ</label>
                  <div
                    ref={refMauHoaDonWrap}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      height: LOOKUP_CONTROL_HEIGHT,
                      minHeight: LOOKUP_CONTROL_HEIGHT,
                      borderRadius: 4,
                      boxSizing: 'border-box',
                      ...nvthhChungTuValueCellWrap,
                    }}
                  >
                    <div
                      style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT, cursor: effectiveReadOnly ? 'default' : 'pointer' }}
                      onClick={() => {
                        if (!effectiveReadOnly) setMauHoaDonDropdownOpen((o) => !o)
                      }}
                    >
                      <input
                        style={{
                          ...inputStyle,
                          ...lookupInputWithChevronStyle,
                          flex: 1,
                          minWidth: 0,
                          height: LOOKUP_CONTROL_HEIGHT,
                          minHeight: LOOKUP_CONTROL_HEIGHT,
                          cursor: effectiveReadOnly ? 'default' : 'pointer',
                        }}
                        value={mauHoaDonHienThi}
                        readOnly
                        disabled={effectiveReadOnly}
                        placeholder="Chọn mẫu hóa đơn"
                        aria-label="Chọn mẫu hóa đơn"
                      />
                      <span style={{ ...lookupChevronOverlayStyle, top: 0, bottom: 0 }} aria-hidden>
                        <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                      </span>
                    </div>
                    {!effectiveReadOnly && (
                      <button type="button" style={lookupActionButtonStyle} title="Thêm mẫu hóa đơn" aria-label="Thêm mẫu hóa đơn" onClick={() => setShowThemMauHoaDonModal(true)}>
                        <Plus size={12} />
                      </button>
                    )}
                  </div>
                </div>
                {mauHoaDonDropdownOpen && mauHoaDonDropdownRect
                  ? ReactDOM.createPortal(
                      <div
                        data-mau-hoa-don-dropdown
                        style={{
                          position: 'fixed',
                          top: mauHoaDonDropdownRect.top,
                          left: mauHoaDonDropdownRect.left,
                          width: mauHoaDonDropdownRect.width,
                          maxHeight: 260,
                          overflowY: 'auto',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-strong)',
                          borderRadius: 4,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          zIndex: 1060,
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '56px minmax(0,1fr)',
                            gap: 8,
                            padding: '6px 10px',
                            fontSize: 10,
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            borderBottom: '1px solid var(--border)',
                            position: 'sticky',
                            top: 0,
                            background: 'var(--bg-tab)',
                          }}
                        >
                          <span>Mẫu HĐ</span>
                          <span>Tên mẫu HĐ</span>
                        </div>
                        {mauHoaDonList.map((mau) => (
                          <div
                            key={mau.id}
                            role="option"
                            tabIndex={0}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '56px minmax(0,1fr)',
                              gap: 8,
                              padding: '6px 10px',
                              fontSize: 11,
                              cursor: 'pointer',
                              color: 'var(--text-primary)',
                              borderBottom: '1px solid var(--border)',
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setMauHoaDonMa(mau.ma_mau)
                              setMauHoaDonTen(mau.ten_mau)
                              setHoaDonKyHieu(mau.ky_hieu)
                              setMauHoaDonDropdownOpen(false)
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{mau.ma_mau}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={mau.ten_mau}>
                              {mau.ten_mau}
                            </span>
                          </div>
                        ))}
                        {mauHoaDonList.length === 0 && (
                          <div style={{ padding: 12, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>Chưa có mẫu hóa đơn.</div>
                        )}
                      </div>,
                      document.body,
                    )
                  : null}
                <div style={fieldRowDyn}>
                  <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>Ký hiệu HĐ</label>
                  <div style={nvthhChungTuValueCellWrap}>
                    <input
                      style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                      value={hoaDonKyHieu}
                      onChange={(e) => setHoaDonKyHieu(e.target.value)}
                      readOnly={effectiveReadOnly}
                      disabled={effectiveReadOnly}
                      placeholder="Theo mẫu đã chọn"
                    />
                  </div>
                </div>
                <div style={fieldRowDyn}>
                  <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>Ngày xuất</label>
                  <DonHangBoxValueLikeNvMuaHang readOnly={effectiveReadOnly} noTrailingPad fixedBandWidth={NVTHH_DON_HANG_BOX_VALUE_BAND_PX}>
                    <div style={donHangBoxDatePickerWrapStyle}>
                      <DatePicker
                        {...htqlDatePickerPopperTop}
                        selected={hoaDonNgay}
                        onChange={(d: Date | null) => {
                          setHoaDonNgay(d)
                          setNgayHoaDonPickerOpen(false)
                        }}
                        open={ngayHoaDonPickerOpen}
                        onInputClick={() => {
                          if (!effectiveReadOnly) setNgayHoaDonPickerOpen(true)
                        }}
                        onClickOutside={() => setNgayHoaDonPickerOpen(false)}
                        shouldCloseOnSelect
                        dateFormat="dd/MM/yyyy"
                        locale="vi"
                        showMonthDropdown
                        showYearDropdown
                        placeholderText="dd/mm/yyyy"
                        className="htql-datepicker-don-hang-box-full htql-datepicker-nvthh-band"
                        calendarClassName="htql-datepicker-ngay htql-datepicker-calendar"
                        disabled={effectiveReadOnly}
                        customInput={<DatePickerReadOnlyTriggerInput />}
                        renderCustomHeader={(p) => <DatePickerCustomHeader {...p} />}
                      />
                    </div>
                  </DonHangBoxValueLikeNvMuaHang>
                </div>
                <div style={fieldRowDyn}>
                  <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>Số hóa đơn</label>
                  <div style={nvthhChungTuValueCellWrap}>
                    <input
                      style={{ ...inputStyleNumericField, width: '100%', boxSizing: 'border-box' }}
                      value={phieuSoHoaDon}
                      onChange={(e) => setPhieuSoHoaDon(e.target.value)}
                      readOnly={effectiveReadOnly}
                      disabled={effectiveReadOnly}
                    />
                  </div>
                </div>
                <div style={fieldRowDyn}>
                  <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>Tình trạng</label>
                  <div style={nvthhChungTuValueCellWrap}>
                    <input
                      className="misa-input-solo"
                      style={{ ...inputStyle, width: '100%', paddingRight: 6, boxSizing: 'border-box', textAlign: 'right', cursor: 'default' }}
                      value={tinhTrang}
                      readOnly
                      tabIndex={-1}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {phieuNhanTuChiTienBang ? (
                  phieuNhanTabChung === 'phieu-chi' ? (
                    <>
                      <div style={fieldRowDyn}>
                        <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>{soDonLabelHienThi}</label>
                        <div style={nvthhChungTuValueCellWrap}>
                          <input
                            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', cursor: 'default', textAlign: 'right' }}
                            value={soDonHang}
                            readOnly
                            disabled
                            tabIndex={-1}
                          />
                        </div>
                      </div>
                      <NvthhChungTuDateTimeRow
                        label="Ngày chi"
                        fieldRowDyn={fieldRowDyn}
                        labelStyle={labelStyle}
                        selected={phieuChiNgay}
                        onChange={(d) => {
                          setPhieuChiNgay(d)
                          if (d && valErrKey === 'phieu_chi_ngay') setValErrKey(null)
                        }}
                        pickerOpen={phieuChiNgayPickerOpen}
                        setPickerOpen={setPhieuChiNgayPickerOpen}
                        inputRef={refPhieuChiNgayInput}
                        valErrKey={valErrKey}
                        errKey="phieu_chi_ngay"
                        ngayDonHang={ngayDonHang}
                        readOnly={effectiveReadOnly}
                      />
                      <div style={fieldRowDyn}>
                        <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>Tình trạng</label>
                        <div style={nvthhChungTuValueCellWrap}>
                          <input
                            className="misa-input-solo"
                            style={{ ...inputStyle, width: '100%', paddingRight: 6, boxSizing: 'border-box', textAlign: 'right', cursor: 'default' }}
                            value={tinhTrang}
                            readOnly
                            tabIndex={-1}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={fieldRowDyn}>
                        <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>{soDonLabelHienThi}</label>
                        <div style={nvthhChungTuValueCellWrap}>
                          <input
                            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', cursor: 'default', textAlign: 'right' }}
                            value={soDonHang}
                            readOnly
                            disabled
                            tabIndex={-1}
                          />
                        </div>
                      </div>
                      <div style={fieldRowDyn}>
                        <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>TG tạo</label>
                        <div style={nvthhChungTuValueCellWrap}>
                          <input
                            style={{ ...inputStyleDatetimeReadonlyDisplay, width: '100%', boxSizing: 'border-box', cursor: 'default' }}
                            value={
                              ngayDonHang
                                ? (() => {
                                    const h = ngayDonHang.getHours()
                                    const m = ngayDonHang.getMinutes()
                                    const d = ngayDonHang.getDate()
                                    const mo = ngayDonHang.getMonth() + 1
                                    const y = ngayDonHang.getFullYear()
                                    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${String(d).padStart(2, '0')}/${String(mo).padStart(2, '0')}/${y}`
                                  })()
                                : ''
                            }
                            readOnly
                            disabled
                            tabIndex={-1}
                          />
                        </div>
                      </div>
                      <NvthhChungTuDateTimeRow
                        label="TG nhập"
                        fieldRowDyn={fieldRowDyn}
                        labelStyle={labelStyle}
                        selected={ngayGiaoHang}
                        onChange={(d) => {
                          setNgayGiaoHang(d)
                          if (d && valErrKey === 'tg_nhap') setValErrKey(null)
                        }}
                        pickerOpen={tgNhapPickerOpen}
                        setPickerOpen={setTgNhapPickerOpen}
                        inputRef={refTgNhapNvthhInput}
                        valErrKey={valErrKey}
                        errKey="tg_nhap"
                        ngayDonHang={ngayDonHang}
                        readOnly={effectiveReadOnly}
                      />
                      <div style={fieldRowDyn}>
                        <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>Tình trạng</label>
                        <div style={nvthhChungTuValueCellWrap}>
                          <input
                            className="misa-input-solo"
                            style={{ ...inputStyle, width: '100%', paddingRight: 6, boxSizing: 'border-box', textAlign: 'right', cursor: 'default' }}
                            value={tinhTrang}
                            readOnly
                            tabIndex={-1}
                          />
                        </div>
                      </div>
                    </>
                  )
                ) : chiTienPhieu ? (
                  <>
                    <div style={fieldRowDyn}>
                      <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>TG tạo</label>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input
                          style={{ ...inputStyleDatetimeReadonlyDisplay, width: '100%', boxSizing: 'border-box', cursor: 'default' }}
                          value={
                            ngayDonHang
                              ? (() => {
                                  const h = ngayDonHang.getHours()
                                  const m = ngayDonHang.getMinutes()
                                  const d = ngayDonHang.getDate()
                                  const mo = ngayDonHang.getMonth() + 1
                                  const y = ngayDonHang.getFullYear()
                                  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${String(d).padStart(2, '0')}/${String(mo).padStart(2, '0')}/${y}`
                                })()
                              : ''
                          }
                          readOnly
                          disabled
                          tabIndex={-1}
                        />
                      </div>
                    </div>
                    <div style={fieldRowDyn}>
                      <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>Ngày hạch toán</label>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...donHangBoxDatePickerWrapStyle, width: '100%' }}>
                          <DatePicker
                            {...htqlDatePickerPopperTop}
                            selected={ngayHachToan}
                            onChange={(d: Date | null) => {
                              setNgayHachToan(d)
                              setNgayHachToanPickerOpen(false)
                            }}
                            open={ngayHachToanPickerOpen}
                            onInputClick={() => {
                              if (!effectiveReadOnly) setNgayHachToanPickerOpen(true)
                            }}
                            onClickOutside={() => setNgayHachToanPickerOpen(false)}
                            shouldCloseOnSelect
                            dateFormat="dd/MM/yyyy"
                            locale="vi"
                            showMonthDropdown
                            showYearDropdown
                            placeholderText="dd/mm/yyyy"
                            className="htql-datepicker-don-hang-box-full htql-datepicker-nvthh-band"
                            calendarClassName="htql-datepicker-ngay htql-datepicker-calendar"
                            disabled={effectiveReadOnly}
                            customInput={<DatePickerReadOnlyTriggerInput />}
                            renderCustomHeader={(p) => <DatePickerCustomHeader {...p} />}
                          />
                        </div>
                      </div>
                    </div>
                    <div style={fieldRowDyn}>
                      <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>{soDonLabel}</label>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', cursor: 'default', textAlign: 'right' }} value={soDonHang} readOnly disabled tabIndex={-1} />
                      </div>
                    </div>
                    <div style={fieldRowDyn}>
                      <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>Tình trạng</label>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input
                          className="misa-input-solo"
                          style={{ ...inputStyle, width: '100%', paddingRight: 6, boxSizing: 'border-box', textAlign: 'right', cursor: 'default' }}
                          value={tinhTrang}
                          readOnly
                          tabIndex={-1}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={fieldRowDyn}>
                      <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>TG tạo</label>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input
                          style={{ ...inputStyleDatetimeReadonlyDisplay, width: '100%', boxSizing: 'border-box', cursor: 'default' }}
                          value={
                            ngayDonHang
                              ? (() => {
                                  const h = ngayDonHang.getHours()
                                  const m = ngayDonHang.getMinutes()
                                  const d = ngayDonHang.getDate()
                                  const mo = ngayDonHang.getMonth() + 1
                                  const y = ngayDonHang.getFullYear()
                                  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${String(d).padStart(2, '0')}/${String(mo).padStart(2, '0')}/${y}`
                                })()
                              : ''
                          }
                          readOnly
                          disabled
                          tabIndex={-1}
                        />
                      </div>
                    </div>
                    <div style={fieldRowDyn}>
                      <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>{soDonLabel}</label>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', cursor: 'default', textAlign: 'right' }} value={soDonHang} readOnly disabled tabIndex={-1} />
                      </div>
                    </div>
                    <div style={fieldRowDyn}>
                      <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>Tình trạng</label>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input
                          className="misa-input-solo"
                          style={{ ...inputStyle, width: '100%', paddingRight: 6, boxSizing: 'border-box', textAlign: 'right', cursor: 'default' }}
                          value={tinhTrang}
                          readOnly
                          tabIndex={-1}
                        />
                      </div>
                    </div>
                    <div style={fieldRowDyn}>
                      <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>Hiệu lực đến</label>
                      <DonHangBoxValueLikeNvMuaHang readOnly={effectiveReadOnly} noTrailingPad>
                        <div
                          style={{
                            ...donHangBoxDatePickerWrapStyle,
                            border: valErrKey === 'tg_nhan' ? HTQL_FORM_ERROR_BORDER : '1px solid transparent',
                          }}
                        >
                          <DatePicker
                            {...htqlDatePickerPopperTop}
                            selected={ngayGiaoHang}
                            onChange={(d: Date | null) => {
                              const merged = preserveTimeWhenCalendarDayChanges(d, ngayGiaoHang)
                              if (merged && ngayDonHang && merged.getTime() < ngayDonHang.getTime()) return
                              setNgayGiaoHang(merged)
                              if (merged && valErrKey === 'tg_nhan') setValErrKey(null)
                            }}
                            open={tgNhanHangPickerOpen}
                            onClickOutside={() => setTgNhanHangPickerOpen(false)}
                            shouldCloseOnSelect={false}
                            dateFormat="HH:mm dd/MM/yyyy"
                            locale="vi"
                            showMonthDropdown
                            showYearDropdown
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={30}
                            timeCaption="Thời gian"
                            minDate={ngayDonHang ?? undefined}
                            minTime={ngayDonHang && ngayGiaoHang && ngayGiaoHang.getFullYear() === ngayDonHang.getFullYear() && ngayGiaoHang.getMonth() === ngayDonHang.getMonth() && ngayGiaoHang.getDate() === ngayDonHang.getDate() ? ngayDonHang : setHours(setMinutes(new Date(), 0), 7)}
                            maxTime={setHours(setMinutes(new Date(), 0), 19)}
                            filterTime={(time) => {
                              const hour = new Date(time).getHours()
                              if (hour < 7 || hour > 19) return false
                              if (!ngayDonHang) return true
                              const tDay = new Date(time.getFullYear(), time.getMonth(), time.getDate())
                              const nDay = new Date(ngayDonHang.getFullYear(), ngayDonHang.getMonth(), ngayDonHang.getDate())
                              if (tDay.getTime() !== nDay.getTime()) return true
                              return time.getHours() * 60 + time.getMinutes() >= ngayDonHang.getHours() * 60 + ngayDonHang.getMinutes()
                            }}
                            yearDropdownItemNumber={80}
                            scrollableYearDropdown
                            placeholderText="HH:mm dd/mm/yyyy"
                            className="htql-datepicker-don-hang-box-full htql-datepicker-tg-nhan-input"
                            calendarClassName="htql-datepicker-tg-nhan htql-datepicker-calendar"
                            customInput={
                              <DatePickerTgNhanInput
                                ref={refTgNhanBGInput}
                                onOpen={() => {
                                  if (!ngayGiaoHang) {
                                    const now = new Date()
                                    const min = now.getHours() * 60 + now.getMinutes()
                                    if (min < 7 * 60 || min >= 19 * 60) {
                                      let d = addDays(now, 1)
                                      d = setHours(setMinutes(d, 0), 7)
                                      if (ngayDonHang && d.getTime() < ngayDonHang.getTime()) {
                                        d = setHours(setMinutes(ngayDonHang as Date, 0), 7)
                                      }
                                      setNgayGiaoHang(d)
                                    }
                                  }
                                  setTgNhanHangPickerOpen(true)
                                }}
                              />
                            }
                            renderCustomHeader={(p) => <DatePickerCustomHeader {...p} />}
                            disabled={effectiveReadOnly}
                          />
                        </div>
                      </DonHangBoxValueLikeNvMuaHang>
                    </div>
                  </>
                )}
              </>
            )}
            <div style={fieldRowDyn}>
              <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>{chiTienPhieu ? 'Người chi' : 'NV bán hàng'}</label>
              <DonHangBoxValueLikeNvMuaHang
                readOnly={effectiveReadOnly}
                fixedBandWidth={phieuNhanTuChiTienBang ? NVTHH_DON_HANG_BOX_VALUE_BAND_PX : undefined}
                trailingSlot={
                  !effectiveReadOnly ? (
                    <button type="button" style={lookupActionButtonStyle} title="Thêm">
                      <Plus size={12} />
                    </button>
                  ) : undefined
                }
              >
                <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', width: '100%' }}>
                  <input
                    style={{ ...inputStyle, ...lookupInputWithChevronStyle, width: '100%', minWidth: 0, textAlign: 'right' }}
                    value={nvMuaHang}
                    onChange={(e) => setNvMuaHang(e.target.value)}
                    readOnly={effectiveReadOnly}
                    disabled={effectiveReadOnly}
                  />
                  <span style={lookupChevronOverlayStyle} aria-hidden>
                    <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                  </span>
                </div>
              </DonHangBoxValueLikeNvMuaHang>
            </div>
            {showLienQuanPhieuNhanHang && (
              <>
                <div className={ChiTienBangDetailStyles.lienQuanPhieuNhanTitle}>Liên quan</div>
                <div style={{ padding: '0 4px 8px', textAlign: 'left' }}>
                  {phieuNhanLienKetTuDonMua.length === 0 ? (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Chưa có phiếu nhận liên kết.</span>
                  ) : (
                    phieuNhanLienKetTuDonMua.map((p) => {
                      const ma = (p.so_don_hang ?? '').trim() || '—'
                      return (
                        <div key={p.id} style={{ marginBottom: 6, fontSize: 11, textAlign: 'left', lineHeight: 1.35 }}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Nhận VTHH: </span>
                          <button
                            type="button"
                            className={ChiTienBangDetailStyles.lienQuanPhieuNhanLink}
                            onClick={() => setPopupXemPhieuNvthh(p)}
                          >
                            {ma}
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </>
            )}
          </div>
          </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            width: '100%',
          }}
        >
          <div
            ref={refBGChiTietSection}
            style={{
              ...gridWrap,
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              border:
                valErrKey === 'chi_tiet' || (valErrKey != null && valErrKey.startsWith('so_luong_'))
                  ? HTQL_FORM_ERROR_BORDER
                  : gridWrap.border,
            }}
          >
            {chiTienPhieu ? (
            <>
            {!phieuChiTuMenuBanHang && !phieuNhanTuChiTienBang && khachHangDisplay.trim() !== '' && !(chiTienPhieu && isViewMode) && (
              <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700 }}>Chứng từ còn số phải chi (đơn hàng / HĐ bán)</div>
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 220 }}>
                  {chungTuCongNoList.length === 0 ? (
                    <div style={{ padding: '12px 10px', fontSize: 10, color: 'var(--text-muted)' }}>
                      Không có chứng từ còn số phải chi (còn lại &gt; 0) cho khách hàng này.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 11, tableLayout: 'fixed', minWidth: 720 }}>
                      <colgroup>
                        <col style={{ width: 40 }} />
                        <col style={{ width: 120 }} />
                        <col style={{ width: 88 }} />
                        <col style={{ width: 88 }} />
                        <col style={{ width: 100 }} />
                        <col style={{ width: 100 }} />
                        <col style={{ width: 100 }} />
                        <col style={{ width: 88 }} />
                      </colgroup>
                      <thead>
                        <tr>
                          {(['STT', 'Mã chứng từ', 'Ngày tạo', 'Hạn thanh toán', 'Số phải chi', 'Số đã chi', 'Còn lại', ''] as const).map((h) => (
                            <th
                              key={h || 'act'}
                              style={{
                                ...gridThStyle,
                                textAlign:
                                  h === 'STT'
                                    ? 'center'
                                    : ['Số phải chi', 'Số đã chi', 'Còn lại'].includes(h)
                                      ? 'right'
                                      : h === ''
                                        ? 'center'
                                        : 'left',
                                paddingLeft: 5,
                                paddingRight: 6,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {h === '' ? ' ' : h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {chungTuCongNoList.map((r, i) => {
                          const sel = chungTuCongNoSelectedKey === r.key
                          return (
                            <tr key={r.key} style={{ background: sel ? 'var(--row-selected-bg)' : undefined }}>
                              <td style={{ ...gridTdStyle, textAlign: 'center' }}>{i + 1}</td>
                              <td style={gridTdStyle}>{r.ma_chung_tu}</td>
                              <td style={{ ...gridTdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.ngay_tao}</td>
                              <td style={{ ...gridTdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.han_tt}</td>
                              <td style={{ ...gridTdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatSoTienHienThi(r.so_phai_thu)}</td>
                              <td style={{ ...gridTdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatSoTienHienThi(r.so_da_thu)}</td>
                              <td style={{ ...gridTdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatSoTienHienThi(r.con_lai)}</td>
                              <td style={{ ...gridTdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <button
                                  type="button"
                                  disabled={effectiveReadOnly}
                                  style={{
                                    padding: '2px 8px',
                                    fontSize: 10,
                                    cursor: effectiveReadOnly ? 'not-allowed' : 'pointer',
                                    border: '1px solid var(--border-strong)',
                                    borderRadius: 4,
                                    background: sel ? 'var(--bg-tab-active)' : 'var(--bg-primary)',
                                    fontFamily: 'inherit',
                                  }}
                                  onClick={() => {
                                    if (effectiveReadOnly) return
                                    if (sel) huyChonChungTuCongNo()
                                    else applyChungTuConNoVaoPhieu(r)
                                  }}
                                >
                                  {sel ? 'Hủy chọn' : 'Chọn'}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
            <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <span>Chi tiết phiếu chi</span>
            </div>
            <div
              ref={refChiTietGridScroll}
              style={{
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                maxHeight: 'min(480px, calc(100vh - 280px))',
                overflowY: 'auto',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 11, tableLayout: 'fixed', minWidth: 620 }}>
                <colgroup>
                  <col style={{ width: 34 }} />
                  <col style={{ width: 108 }} />
                  <col style={{ width: 86 }} />
                  <col style={{ width: 86 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 120 }} />
                </colgroup>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    {(
                      [
                        'STT',
                        'Mã chứng từ',
                        'Ngày tạo',
                        'Hạn thanh toán',
                        'Số phải chi',
                        'Số chưa chi',
                        'Chi lần này',
                        'Còn lại sau lần chi',
                      ] as const
                    ).map((h) => (
                      <th
                        key={h}
                        style={{
                          ...gridThStyle,
                          textAlign:
                            h === 'STT'
                              ? 'center'
                              : ['Số phải chi', 'Số chưa chi', 'Chi lần này', 'Còn lại sau lần chi'].includes(h)
                                ? 'right'
                                : 'left',
                          paddingLeft: 5,
                          paddingRight: 6,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {phieuThuChiTietLines.map((row, idx) => {
                    const congNoLan = Math.max(0, parseFloatVN(row.so_chua_thu) - parseFloatVN(row.thu_lan_nay))
                    return (
                    <tr key={`${row.ma_chung_tu}-${idx}`}>
                      <td style={{ ...gridTdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span style={{ marginRight: 4 }}>{idx + 1}</span>
                        {!effectiveReadOnly && phieuThuChiTietLines.length > 1 ? (
                          <button
                            type="button"
                            title="Xóa dòng"
                            onClick={() => {
                              setPhieuThuChiTietLines((prev) => {
                                const next = prev.filter((_, i) => i !== idx)
                                return next.length > 0 ? next : [emptyPhieuThuRow()]
                              })
                              setChungTuCongNoSelectedKey(null)
                            }}
                            style={{
                              verticalAlign: 'middle',
                              padding: 0,
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                            }}
                            aria-label="Xóa dòng phiếu chi"
                          >
                            <Trash2 size={12} />
                          </button>
                        ) : null}
                      </td>
                      <td style={gridTdStyle}>
                        <input className="misa-input-solo" style={{ ...inputStyle, width: '100%', minHeight: 22, height: 22, border: '1px solid transparent' }} value={row.ma_chung_tu} readOnly tabIndex={-1} />
                      </td>
                      <td style={{ ...gridTdStyle, textAlign: 'right' }}>
                        <input className="misa-input-solo" style={{ ...inputStyle, width: '100%', minHeight: 22, height: 22, border: '1px solid transparent', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} value={row.ngay_tao} readOnly tabIndex={-1} />
                      </td>
                      <td style={{ ...gridTdStyle, textAlign: 'right' }}>
                        <input className="misa-input-solo" style={{ ...inputStyle, width: '100%', minHeight: 22, height: 22, border: '1px solid transparent', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} value={row.han_tt} readOnly tabIndex={-1} />
                      </td>
                      <td style={{ ...gridTdStyle, textAlign: 'right' }}>
                        <input className="misa-input-solo" style={{ ...inputStyle, width: '100%', minHeight: 22, height: 22, border: '1px solid transparent', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} value={row.so_phai_thu} readOnly tabIndex={-1} />
                      </td>
                      <td style={{ ...gridTdStyle, textAlign: 'right' }}>
                        <input className="misa-input-solo" style={{ ...inputStyle, width: '100%', minHeight: 22, height: 22, border: '1px solid transparent', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} value={row.so_chua_thu} readOnly tabIndex={-1} />
                      </td>
                      <td style={{ ...gridTdStyle, textAlign: 'right' }}>
                        <input
                          ref={idx === 0 ? refThuLanNayPhieu0 : undefined}
                          className="misa-input-solo"
                          style={{
                            ...inputStyle,
                            width: '100%',
                            minHeight: 22,
                            height: 22,
                            border: '1px solid transparent',
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            background: 'transparent',
                          }}
                          value={row.thu_lan_nay}
                          readOnly={effectiveReadOnly}
                          disabled={effectiveReadOnly}
                          onChange={(e) => {
                            const formatted = formatSoTien(e.target.value)
                            setPhieuThuChiTietLines((prev) =>
                              prev.map((r, i) => {
                                if (i !== idx) return r
                                let v = parseFloatVN(formatted)
                                const maxV = Math.max(0, parseFloatVN(r.so_chua_thu))
                                if (v > maxV) v = maxV
                                if (v < 0) v = 0
                                return { ...r, thu_lan_nay: formatSoTienHienThi(v) }
                              }),
                            )
                          }}
                        />
                      </td>
                      <td style={{ ...gridTdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {formatSoTienHienThi(congNoLan)}
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            </>
            ) : (
            <div
              ref={refChiTietGridScroll}
              style={{
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                maxHeight: 'min(480px, calc(100vh - 280px))',
                overflowY: 'auto',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 11, tableLayout: 'auto', minWidth: tableMinWidth }}>
                <colgroup>
                  <col style={{ width: COL_WIDTH_ACTION, minWidth: COL_WIDTH_ACTION, maxWidth: COL_WIDTH_ACTION }} />
                  <col style={{ width: COL_WIDTH_STT, minWidth: COL_WIDTH_STT, maxWidth: COL_WIDTH_STT }} />
                  {currentColumns.map((col) => (
                    <col key={col} style={colWidthStyle(col, col === 'Ghi chú' ? ghiChuFill : undefined)} />
                  ))}
                </colgroup>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  {/* [YC32] Hàng 1: Cột mẹ "Kích thước" */}
                  <tr>
                    <th
                      rowSpan={2}
                      style={{
                        ...gridThStyle,
                        ...mergeThStickyGocTrai('action'),
                        textAlign: 'center',
                        width: COL_WIDTH_ACTION,
                        minWidth: COL_WIDTH_ACTION,
                        maxWidth: COL_WIDTH_ACTION,
                        borderRight: '0.5px solid var(--border)',
                      }}
                      title="Xóa dòng"
                    />
                    <th
                      rowSpan={2}
                      style={{
                        ...gridThStyle,
                        ...mergeThStickyGocTrai('stt'),
                        textAlign: 'center',
                        width: COL_WIDTH_STT,
                        minWidth: COL_WIDTH_STT,
                        maxWidth: COL_WIDTH_STT,
                      }}
                    >
                      STT
                    </th>
                    {currentColumns.map((col) => {
                      const isKichThuoc = ['mD', 'mR', 'Lượng'].includes(col)
                      if (isKichThuoc && col !== 'mD') return null
                      const stickyTrai = cotChiTietLaCotTraiCoDinh(col)
                      const kichThuocColspan = col === 'mD' ? 3 : undefined
                      return (
                        <th
                          key={col}
                          colSpan={kichThuocColspan}
                          rowSpan={isKichThuoc ? 1 : 2}
                          style={{
                            ...gridThStyle,
                            ...(stickyTrai ? mergeThStickyGocTrai(stickyTrai) : mergeThStickyChiTop()),
                            ...colWidthStyle(col, col === 'Ghi chú' ? ghiChuFill : undefined),
                            paddingLeft: CHI_TIET_COLS_NUMERIC.has(col) ? 2 : 5,
                            paddingRight: CHI_TIET_COLS_NUMERIC.has(col) ? 6 : undefined,
                            ...chiTietNumericThTdStyle(col),
                            ...(col === currentColumns[currentColumns.length - 1] ? { borderRight: 'none' } : {}),
                            textAlign: isKichThuoc ? 'center' : (CHI_TIET_COLS_NUMERIC.has(col) ? 'right' : 'left'),
                          }}
                        >
                          {isKichThuoc ? 'Kích thước' : gridColumnHeaderLabel(col)}
                        </th>
                      )
                    })}
                  </tr>
                  {/* [YC32] Hàng 2: 3 cột con của Kích thước */}
                  <tr>
                    {['mD', 'mR', 'Lượng'].map((subCol) => (
                      <th
                        key={subCol}
                        style={{
                          ...gridThStyle,
                          ...mergeThStickyChiTop(),
                          ...colWidthStyle(subCol as any, undefined),
                          paddingLeft: 2,
                          paddingRight: 6,
                          textAlign: 'right',
                          fontSize: 10,
                        }}
                      >
                        {subCol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={currentColumns.length + 2} style={{ ...gridTdStyle, background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: 10, textAlign: 'center' }}>{chiTietReadOnly ? 'Chưa có dòng.' : chiTietGridLocked ? 'Chưa có dòng.' : 'Chưa có dòng. Bấm "Thêm dòng" để thêm.'}</td>
                    </tr>
                  ) : (
                    lines.map((line, idx) => (
                      <tr key={idx} className={ChiTienBangChiTietStyles.chiTietDataRow}>
                        <td
                          style={{
                            ...gridTdStyle,
                            ...mergeTdStickyTrai('action'),
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            width: COL_WIDTH_ACTION,
                            minWidth: COL_WIDTH_ACTION,
                            maxWidth: COL_WIDTH_ACTION,
                            borderRight: '0.5px solid var(--border)',
                          }}
                        >
                          {!chiTietReadOnly && !chiTietGridLocked && (
                            <button type="button" onClick={() => setDeleteRowIndex(idx)} style={{ padding: 2, background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title="Xóa dòng">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                        <td
                          style={{
                            ...gridTdStyle,
                            ...mergeTdStickyTrai('stt'),
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            width: COL_WIDTH_STT,
                            minWidth: COL_WIDTH_STT,
                            maxWidth: COL_WIDTH_STT,
                          }}
                        >
                          {idx + 1}
                        </td>
                        {currentColumns.map((col) => {
                          const showColAsReadOnly = chiTietReadOnly || (chiTietGridLocked && col !== 'Số lượng')
                          const stickyTrai = cotChiTietLaCotTraiCoDinh(col)
                          return (
                          <td
                            key={col}
                            style={{
                              ...gridTdStyle,
                              ...(stickyTrai ? mergeTdStickyTrai(stickyTrai) : {}),
                              ...colWidthStyle(col, col === 'Ghi chú' ? ghiChuFill : undefined),
                              whiteSpace: col === 'Ghi chú' ? 'normal' : 'nowrap',
                              ...chiTietNumericThTdStyle(col),
                              ...(col === currentColumns[currentColumns.length - 1] ? { borderRight: 'none' } : {}),
                            }}
                            {...(col === 'Mã' && !showColAsReadOnly ? { 'data-vthh-cell': true } : {})}
                          >
                            {showColAsReadOnly ? (
                              <input
                                readOnly
                                tabIndex={-1}
                                className="misa-input-solo"
                                style={{ ...inputStyle, ...chiTietNumericInputStyle(col), width: '100%', border: '1px solid transparent', minHeight: 22, height: 22, cursor: 'default' }}
                                value={
                                  col === 'ĐVT'
                                    ? dvtHienThiLabel(line['ĐVT'], dvtList)
                                    : col === 'Thành tiền'
                                      ? formatDonHangLineThanhTienDisplay(line)
                                      : col === 'Tiền thuế GTGT'
                                        ? formatDonHangLineTienThueDisplay(line)
                                        : col === 'Tổng tiền'
                                          ? formatDonHangLineTongTienDisplay(line)
                                          : (line[col] ?? '')
                                }
                              />
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
                                    const prev = r[idx] as ChiTienBangGridLineRow
                                    const nextRow = {
                                      ...prev,
                                      [col]: ma,
                                      [BAO_GIA_COL_TEN_SPHH]: cleared ? '' : (item ? item.ten : prev[BAO_GIA_COL_TEN_SPHH]),
                                      'ĐVT': cleared ? '' : (item ? (item.dvt_chinh ?? '') : prev['ĐVT']),
                                    } as unknown as ChiTienBangGridLineRow
                                    const isCodongia = initialDon != null || mauHienTai === 'codongia'
                                    if (cleared || !item) {
                                      delete nextRow._dvtOptions
                                      delete nextRow._vthh
                                      if (cleared && isCodongia) {
                                        nextRow['Đơn giá'] = ''
                                        nextRow['% thuế GTGT'] = ''
                                      }
                                    } else {
                                      nextRow._vthh = item
                                      const opts = buildDvtOptionsForVthh(item)
                                      if (opts) nextRow._dvtOptions = opts
                                      else delete nextRow._dvtOptions
                                      if (isCodongia) {
                                        const sl = Math.max(0, parseFloatVN(nextRow['Số lượng'] ?? '')) || 1
                                        nextRow['Đơn giá'] = getDonGiaBanChiTienBangLine(item, (nextRow['ĐVT'] ?? '').trim() || (item.dvt_chinh ?? ''), sl)
                                        nextRow['% thuế GTGT'] = apDungVatGtgt ? (item.thue_suat_gtgt ?? '') : ''
                                      }
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
                                  placeholder="Mã SPHH"
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
                            ) : col === BAO_GIA_COL_TEN_SPHH ? (
                              <input readOnly tabIndex={-1} className="misa-input-solo" style={{ ...inputStyle, width: '100%', cursor: 'default', border: '1px solid transparent', minHeight: 22, height: 22 }} value={line[col] ?? ''} />
                            ) : col === 'Nội dung' ? (
                              <input
                                className="misa-input-solo"
                                style={{ ...inputStyle, width: '100%', border: '1px solid transparent', minHeight: 22, height: 22 }}
                                value={line['Nội dung'] ?? ''}
                                readOnly={showColAsReadOnly}
                                disabled={showColAsReadOnly}
                                tabIndex={showColAsReadOnly ? -1 : undefined}
                                onChange={(e) => {
                                  const r = [...lines]
                                  r[idx] = { ...r[idx], 'Nội dung': e.target.value } as unknown as ChiTienBangGridLineRow
                                  setLines(r)
                                }}
                              />
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
                                        const row = r[idx] as ChiTienBangGridLineRow
                                        const newDvt = e.target.value
                                        const updates = { ...row, 'ĐVT': newDvt } as unknown as ChiTienBangGridLineRow
                                        updates['Số lượng'] = calculateSoLuongFromKichThuoc(updates)
                                        if ((initialDon != null || mauHienTai === 'codongia') && row._vthh) {
                                          const sl = Math.max(0, parseFloatVN(updates['Số lượng'] ?? '')) || 1
                                          updates['Đơn giá'] = getDonGiaBanChiTienBangLine(row._vthh, newDvt, sl)
                                        }
                                        r[idx] = updates
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
                            ) : col === 'mD' ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                className="misa-input-solo htql-no-spinner"
                                style={{ ...inputStyle, ...chiTietNumericInputStyle('mD'), width: '100%', boxSizing: 'border-box', border: '1px solid transparent', minHeight: 22, height: 22 }}
                                value={line['mD'] ?? ''}
                                onChange={(e) => {
                                  const r = [...lines]
                                  const raw = formatSoTien(normalizeKichThuocInput(e.target.value))
                                  const updated = { ...r[idx], 'mD': raw } as unknown as ChiTienBangGridLineRow
                                  updated['Số lượng'] = calculateSoLuongFromKichThuoc(updated)
                                  r[idx] = syncDonGiaTheoBacVaSl(updated)
                                  setLines(r)
                                }}
                                onBlur={() => {
                                  const raw = (lines[idx]?.['mD'] ?? '').trim()
                                  if (raw === '') return
                                  const n = parseFloatVN(raw)
                                  if (n <= 0) {
                                    toastApi?.showToast('Chiều dài (mD) phải là số thực > 0.', 'info')
                                    const r = [...lines]
                                    let row = { ...r[idx], 'mD': '' } as unknown as ChiTienBangGridLineRow
                                    row['Số lượng'] = calculateSoLuongFromKichThuoc(row)
                                    row = syncDonGiaTheoBacVaSl(row)
                                    r[idx] = row
                                    setLines(r)
                                  }
                                }}
                                disabled={chiTietReadOnly || chiTietGridLocked}
                              />
                            ) : col === 'mR' ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                className="misa-input-solo htql-no-spinner"
                                style={{ ...inputStyle, ...chiTietNumericInputStyle('mR'), width: '100%', boxSizing: 'border-box', border: '1px solid transparent', minHeight: 22, height: 22 }}
                                value={line['mR'] ?? ''}
                                onChange={(e) => {
                                  const r = [...lines]
                                  const raw = formatSoTien(normalizeKichThuocInput(e.target.value))
                                  const updated = { ...r[idx], 'mR': raw } as unknown as ChiTienBangGridLineRow
                                  updated['Số lượng'] = calculateSoLuongFromKichThuoc(updated)
                                  r[idx] = syncDonGiaTheoBacVaSl(updated)
                                  setLines(r)
                                }}
                                onBlur={() => {
                                  const raw = (lines[idx]?.['mR'] ?? '').trim()
                                  if (raw === '') return
                                  const n = parseFloatVN(raw)
                                  if (n <= 0) {
                                    toastApi?.showToast('Chiều rộng (mR) phải là số thực > 0.', 'info')
                                    const r = [...lines]
                                    let row = { ...r[idx], 'mR': '' } as unknown as ChiTienBangGridLineRow
                                    row['Số lượng'] = calculateSoLuongFromKichThuoc(row)
                                    row = syncDonGiaTheoBacVaSl(row)
                                    r[idx] = row
                                    setLines(r)
                                  }
                                }}
                                disabled={chiTietReadOnly || chiTietGridLocked}
                              />
                            ) : col === 'Lượng' ? (
                              <input
                                type="text"
                                inputMode="numeric"
                                className="misa-input-solo htql-no-spinner"
                                style={{ ...inputStyle, ...chiTietNumericInputStyle('Lượng'), width: '100%', boxSizing: 'border-box', border: '1px solid transparent', minHeight: 22, height: 22 }}
                                value={line['Lượng'] ?? '1'}
                                onChange={(e) => {
                                  const r = [...lines]
                                  const updated = { ...r[idx], 'Lượng': formatSoNguyenInput(e.target.value) } as unknown as ChiTienBangGridLineRow
                                  updated['Số lượng'] = calculateSoLuongFromKichThuoc(updated)
                                  r[idx] = syncDonGiaTheoBacVaSl(updated)
                                  setLines(r)
                                }}
                                onBlur={() => {
                                  const r = [...lines]
                                  const raw = (r[idx]['Lượng'] ?? '').trim()
                                  let n = parseInt(parseNumber(raw), 10)
                                  if (!Number.isFinite(n) || n < 1) n = 1
                                  const updated = { ...r[idx], 'Lượng': formatSoNguyenInput(String(n)) } as unknown as ChiTienBangGridLineRow
                                  updated['Số lượng'] = calculateSoLuongFromKichThuoc(updated)
                                  r[idx] = syncDonGiaTheoBacVaSl(updated)
                                  setLines(r)
                                }}
                                disabled={chiTietReadOnly || chiTietGridLocked}
                              />
                            ) : col === 'Số lượng' ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                data-BG-sl-idx={idx}
                                className="misa-input-solo htql-no-spinner"
                                style={{
                                  ...inputStyle,
                                  ...chiTietNumericInputStyle('Số lượng'),
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  border: valErrKey === `so_luong_${idx}` ? HTQL_FORM_ERROR_BORDER : '1px solid transparent',
                                  minHeight: 22,
                                  height: 22,
                                }}
                                value={line[col] ?? ''}
                                onChange={(e) => {
                                  const r = [...lines]
                                  const val = formatSoTuNhienInput(e.target.value)
                                  let row = { ...r[idx], [col]: val } as unknown as ChiTienBangGridLineRow
                                  if (row._vthh && (initialDon != null || mauHienTai === 'codongia')) {
                                    const sl = Math.max(0, parseFloatVN(val)) || 1
                                    row['Đơn giá'] = getDonGiaBanChiTienBangLine(
                                      row._vthh,
                                      (row['ĐVT'] ?? '').trim() || (row._vthh.dvt_chinh ?? ''),
                                      sl
                                    )
                                  }
                                  r[idx] = row
                                  setLines(r)
                                  if (valErrKey === `so_luong_${idx}`) setValErrKey(null)
                                }}
                                onBlur={() => {
                                  const raw = (line[col] ?? '').trim()
                                  if (raw === '') return
                                  const n = parseFloatVN(raw)
                                  const val = Number.isNaN(n) || n < 0 ? 0 : n
                                  const r = [...lines]
                                  let next = { ...r[idx], [col]: formatSoTienHienThi(val) } as unknown as ChiTienBangGridLineRow
                                  next = syncDonGiaTheoBacVaSl(next)
                                  r[idx] = next
                                  setLines(r)
                                }}
                              />
                            ) : col === 'Đơn giá' ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                className="misa-input-solo htql-no-spinner"
                                style={{ ...inputStyle, ...chiTietNumericInputStyle('Đơn giá'), width: '100%', boxSizing: 'border-box', border: '1px solid transparent', minHeight: 22, height: 22 }}
                                value={line['Đơn giá'] ?? ''}
                                onChange={(e) => {
                                  const r = [...lines]
                                  r[idx] = { ...r[idx], 'Đơn giá': formatSoTien(e.target.value) } as unknown as ChiTienBangGridLineRow
                                  setLines(r)
                                }}
                              />
                            ) : col === 'Thành tiền' ? (
                              <input
                                readOnly
                                tabIndex={-1}
                                className="misa-input-solo"
                                style={{ ...inputStyle, ...chiTietNumericInputStyle('Thành tiền'), width: '100%', cursor: 'default', border: '1px solid transparent', minHeight: 22, height: 22 }}
                                value={formatDonHangLineThanhTienDisplay(line)}
                              />
                            ) : col === 'Tiền thuế GTGT' ? (
                              <input
                                readOnly
                                tabIndex={-1}
                                className="misa-input-solo"
                                style={{ ...inputStyle, ...chiTietNumericInputStyle('Tiền thuế GTGT'), width: '100%', cursor: 'default', border: '1px solid transparent', minHeight: 22, height: 22 }}
                                value={formatDonHangLineTienThueDisplay(line)}
                              />
                            ) : col === 'Tổng tiền' ? (
                              <input
                                readOnly
                                tabIndex={-1}
                                className="misa-input-solo"
                                style={{ ...inputStyle, ...chiTietNumericInputStyle('Tổng tiền'), width: '100%', cursor: 'default', border: '1px solid transparent', minHeight: 22, height: 22 }}
                                value={formatDonHangLineTongTienDisplay(line)}
                              />
                            ) : col === '% thuế GTGT' ? (
                              <select
                                className="misa-input-solo"
                                style={{ ...inputStyle, ...chiTietNumericInputStyle('% thuế GTGT'), width: '100%', minHeight: 22, height: 22, cursor: 'pointer' }}
                                value={line['% thuế GTGT'] ?? ''}
                                onChange={(e) => {
                                  const r = [...lines]
                                  r[idx] = { ...r[idx], '% thuế GTGT': e.target.value } as unknown as ChiTienBangGridLineRow
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
                                onChange={(e) => { const r = [...lines]; r[idx] = { ...r[idx], [col]: e.target.value } as unknown as ChiTienBangGridLineRow; setLines(r) }}
                              />
                            )}
                          </td>
                        )
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            )}
              {!chiTietReadOnly && !chiTietGridLocked && !chiTienPhieu && (
                <div style={{ flexShrink: 0, padding: '4px 8px', fontSize: 11, borderTop: '0.5px solid var(--border)', background: 'var(--bg-tab)', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ marginLeft: OFFSET_TRAI_COT_MA_SPHH, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        scrollChiTietSauThemDongRef.current = true
                        setLines([
                          ...lines,
                          createEmptyChiTienBangLine(mauHienTai === 'codongia' ? 'codongia' : 'khongdongia'),
                        ])
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', fontSize: 10, background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                    >
                      <Plus size={12} /> Thêm dòng
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
        </div>
        </div>

        {!chiTienPhieu && (
        <div style={{ ...footerWrap, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Tổng chủng loại VT: {soDong}</span>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Tổng số lượng: {tongSoKienHangText}</span>
          </div>
          {hienThiFooterTongTien && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 14,
                flexWrap: 'nowrap',
                maxWidth: '100%',
                overflowX: 'auto',
                paddingBottom: 2,
              }}
            >
              <span style={{ ...footerSummaryItem, whiteSpace: 'nowrap' }}>
                Tổng tiền hàng: <span style={footerSummaryValue}>{formatNumberDisplay(tongTienHang, 0)}</span>
              </span>
              <label style={{ ...footerSummaryItem, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                TLCK (%)
                <input
                  type="text"
                  inputMode="decimal"
                  className="misa-input-solo"
                  style={{
                    width: 72,
                    height: 22,
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    padding: '0 6px',
                  }}
                  value={tlCkInput}
                  onChange={(e) => {
                    chietKhauLastEditRef.current = 'tl'
                    const next = formatTlCkBaoGiaInput(e.target.value)
                    setTlCkInput(next)
                    const tl = parseFloatVN(next)
                    const hang = tongTienHang
                    if (Number.isFinite(tl) && tl >= 0 && hang > 0) setTienCkInput(formatSoTienHienThi((hang * tl) / 100))
                  }}
                  onBlur={() => {
                    const norm = chuanHoaTlCkBaoGiaSauBlur(tlCkInput)
                    setTlCkInput(norm)
                    const hang = tongTienHang
                    const tl = parseFloatVN(norm)
                    if (Number.isFinite(tl) && tl >= 0 && hang > 0) setTienCkInput(formatSoTienHienThi((hang * tl) / 100))
                  }}
                  readOnly={effectiveReadOnly}
                  disabled={effectiveReadOnly}
                />
              </label>
              <label style={{ ...footerSummaryItem, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                Tiền CK
                <input
                  type="text"
                  inputMode="decimal"
                  className="misa-input-solo"
                  style={{
                    width: 120,
                    height: 22,
                    fontSize: 12,
                    fontWeight: 700,
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    padding: '0 6px',
                  }}
                  value={tienCkInput}
                  onChange={(e) => {
                    chietKhauLastEditRef.current = 'tien'
                    const raw = formatSoTien(e.target.value)
                    setTienCkInput(raw)
                    const tc = parseFloatVN(raw)
                    const hang = tongTienHang
                    if (Number.isFinite(tc) && tc >= 0 && hang > 0) setTlCkInput(formatSoThapPhan((tc * 100) / hang, 3))
                  }}
                  onBlur={() => {
                    const tc = parseFloatVN(tienCkInput)
                    const hang = tongTienHang
                    if (Number.isFinite(tc) && tc >= 0 && hang > 0) setTlCkInput(formatSoThapPhan((tc * 100) / hang, 3))
                  }}
                  readOnly={effectiveReadOnly}
                  disabled={effectiveReadOnly}
                />
              </label>
              {apDungVatGtgt && (
                <span style={{ ...footerSummaryItem, whiteSpace: 'nowrap' }}>
                  Tiền thuế GTGT: <span style={footerSummaryValue}>{formatNumberDisplay(tienThue, 0)}</span>
                </span>
              )}
              <span style={{ ...footerSummaryItem, whiteSpace: 'nowrap' }}>
                Tổng tiền thanh toán: <span style={footerSummaryValue}>{formatNumberDisplay(tongTienThanhToan, 0)}</span>
              </span>
            </div>
          )}
        </div>
        )}
        </div>
        {showLichSuPanel && lichSuData && (
          <aside
            style={{
              width: 228,
              minWidth: 200,
              maxWidth: 260,
              flexShrink: 0,
              borderLeft: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '8px 10px',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--accent)',
                borderBottom: '1px solid var(--border)',
                flexShrink: 0,
              }}
            >
              Lịch sử bán
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 8px', fontSize: 10 }}>
              {([
                { key: 'bg', title: 'Thu tiền', list: lichSuData.ChiTienBang },
                { key: 'dhb', title: 'Đơn hàng bán', list: lichSuData.donHangBan },
                { key: 'hd', title: 'Hợp đồng bán', list: lichSuData.hopDong },
              ] as const).map((sec) =>
                sec.list.length === 0 ? null : (
                  <div key={sec.key} style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{sec.title}</div>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {sec.list.map((row) => {
                        const idKey = `${sec.key}-${row.id}`
                        const mo = Boolean(lichSuMoRong[idKey])
                        return (
                          <li key={row.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 6 }}>
                            <button
                              type="button"
                              onClick={() => setLichSuMoRong((prev) => ({ ...prev, [idKey]: !mo }))}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                textAlign: 'left',
                                width: '100%',
                                fontSize: 10,
                                fontWeight: 600,
                              }}
                            >
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '14px minmax(0,1fr) auto',
                                  alignItems: 'start',
                                  columnGap: 8,
                                  rowGap: 2,
                                }}
                              >
                                <span style={{ color: 'var(--accent)', paddingTop: 1 }}>{mo ? '▼' : '▶'}</span>
                                <span
                                  style={{
                                    color: 'var(--accent)',
                                    fontWeight: 600,
                                    textAlign: 'left',
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {row.tenHienThi}
                                </span>
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'baseline',
                                    justifyContent: 'flex-end',
                                    gap: 6,
                                    minWidth: 0,
                                    flexShrink: 0,
                                  }}
                                >
                                  <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>TT</span>
                                  <span
                                    style={{
                                      fontWeight: 800,
                                      color: 'var(--text-primary)',
                                      fontVariantNumeric: 'tabular-nums',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {formatNumberDisplay(row.tongThanhToan, 0)}
                                  </span>
                                </div>
                              </div>
                            </button>
                            {mo && (
                              <div
                                style={{
                                  marginTop: 6,
                                  paddingLeft: 22,
                                  color: 'var(--text-primary)',
                                  lineHeight: 1.5,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 4,
                                }}
                              >
                                {row.chiTiet.slice(0, 20).map((ct, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: 'minmax(0,1fr) 40px 40px 68px',
                                      columnGap: 6,
                                      alignItems: 'center',
                                      fontVariantNumeric: 'tabular-nums',
                                      fontSize: 10,
                                    }}
                                  >
                                    <span
                                      style={{
                                        color: 'var(--text-primary)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        minWidth: 0,
                                      }}
                                      title={ct.ten_hang}
                                    >
                                      {ct.ten_hang}
                                    </span>
                                    <span style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                                      {dvtHienThiLabel(ct.dvt, dvtList)}
                                    </span>
                                    <span style={{ textAlign: 'right' }}>SL {formatSoTienHienThi(ct.so_luong)}</span>
                                    <span style={{ textAlign: 'right', fontWeight: 600 }}>
                                      {formatNumberDisplay(ct.don_gia, 0)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              )}
            </div>
          </aside>
        )}
      </div>

      <div style={hintBar}>F9 - Thêm nhanh, F3 - Tìm nhanh</div>

      {typeof document !== 'undefined' &&
        ReactDOM.createPortal(
          <NhanVatTuHangHoaApiProvider api={apiNvthhPopup}>
            <NhanVatTuHangHoaFormModal
              open={popupXemPhieuNvthh != null}
              viewDon={popupXemPhieuNvthh}
              addFormKey={0}
              formPrefillTuDhm={null}
              getChiTiet={(id) => nhanVatTuHangHoaGetChiTiet(id)}
              onClose={() => setPopupXemPhieuNvthh(null)}
              onSaved={() => setPopupXemPhieuNvthh(null)}
              onSavedAndView={() => {}}
              chiXemKhongSua
              overlayZIndex={5200}
            />
          </NhanVatTuHangHoaApiProvider>,
          document.body
        )}

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
            /* Trên overlay modal Báo giá (BanHang.module.css .modalOverlay z-index: 4000); thấp hơn 4000 thì list bị che, tưởng «không lọc được». */
            zIndex: 4100,
            fontSize: 11,
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {(() => {
                const currentRowIdx = vthhDropdownRowIndex
                const searchText = (lines[currentRowIdx]?.['Mã'] ?? '').trim()
                // Loại trừ mã đã chọn ở các dòng khác
                let available = vatTuList.slice()
                // Khi đã chọn rồi bấm xổ xuống lại: không hiển thị lại mã đang chọn ở dòng này, chỉ hiển thị các lựa chọn khác để đổi
                const currentRowMa = (lines[currentRowIdx]?.['Mã'] ?? '').trim()
                if (currentRowMa) {
                  available = available.filter((item) => item.ma !== currentRowMa)
                }
                // Lọc theo từ khóa nhập (chỉ khi đang tìm kiếm, không trùng với mã hiện tại) - top 20
                if (searchText && searchText !== currentRowMa) {
                  available = available.filter((item) => matchSearchKeyword(item.ma ?? '', searchText) || matchSearchKeyword(item.ten ?? '', searchText)).slice(0, 20)
                } else {
                  available = available.slice(0, 20)
                }
                return available.length === 0 ? (
                  <tr><td colSpan={2} style={{ ...tdChietKhau, padding: 8, color: 'var(--text-muted)' }}>{searchText ? 'Không tìm thấy NVL phù hợp' : 'Không còn NVL nào để chọn'}</td></tr>
                ) : (
                  available.map((item) => (
                    <tr
                      key={item.id}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--row-selected-bg)' }}
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

      <ChiTienBangDinhKemModal
        open={showDinhKemModal}
        onClose={() => setShowDinhKemModal(false)}
        anchorRef={dinhKemModalAnchor === 'toolbar' ? refDinhKemBtn : refDinhKemDuoiGhiChu}
        attachments={attachments}
        onChange={patchAttachmentsFromUser}
        readOnly={effectiveReadOnly}
        soChiTienBang={soDonHang}
        maKhPathPart={khPartDinhKem}
        ngayGiaoHang={ngayGiaoHang}
        ngayChiTienBang={ngayDonHang}
        daDongBoLuuCsdl={daDongBoLuuCsdlDktk}
        pendingUploadRows={dktkPendingUploadRows}
        onPendingUploadRowsChange={setDktkPendingUploadRows}
      />

      <ChiTienBangDinhKemModal
        open={showDinhKemPhieuChiModal}
        onClose={() => setShowDinhKemPhieuChiModal(false)}
        anchorRef={refPhieuChiDinhKemBtn}
        attachments={phieuChiAttachments}
        onChange={patchPhieuChiAttachmentsFromUser}
        readOnly={effectiveReadOnly}
        soChiTienBang={soDonHang}
        maKhPathPart={khPartDinhKem}
        ngayGiaoHang={ngayGiaoHang}
        ngayChiTienBang={ngayDonHang}
        daDongBoLuuCsdl={daDongBoLuuCsdlDktk}
        pendingUploadRows={phieuChiDktkPendingRows}
        onPendingUploadRowsChange={setPhieuChiDktkPendingRows}
      />

      {showThemKHForm && (
        <KhachHang
          embeddedAddMode
          onAddSuccess={(kh) => {
            handleChonKh(kh)
            setShowThemKHForm(false)
          }}
          onClose={() => setShowThemKHForm(false)}
        />
      )}

      {showThemDkttModal && (
        <ThemDieuKhoanThanhToanModal
          existingItems={danhSachDKTT}
          onClose={() => setShowThemDkttModal(false)}
          onSave={(item) => {
            const list = [...danhSachDKTT]
            if (!list.some((x) => x.ma === item.ma)) {
              list.push(item)
              saveDieuKhoanThanhToanKh(list)
              setDanhSachDKTT(list)
            }
            setDieuKhoanTT(item.ten)
            setSoNgayDuocNo(String(item.so_ngay_duoc_no))
          }}
          onSaveAndAdd={(item) => {
            const list = [...danhSachDKTT]
            if (!list.some((x) => x.ma === item.ma)) {
              list.push(item)
              saveDieuKhoanThanhToanKh(list)
              setDanhSachDKTT(list)
            }
            setDieuKhoanTT(item.ten)
            setSoNgayDuocNo(String(item.so_ngay_duoc_no))
          }}
        />
      )}

      {showThemHinhThucModal && (
        <ThemHinhThucModal
          onClose={() => setShowThemHinhThucModal(false)}
          onSave={(rec) => {
            setHinhThucList(hinhThucGetAll())
            setHinhThucSelectedIds((prev) => (prev.includes(rec.id) ? prev : [...prev, rec.id]))
            setShowThemHinhThucModal(false)
          }}
        />
      )}

      {showThemMauHoaDonModal && (
        <ThemMauHoaDonModal
          onClose={() => setShowThemMauHoaDonModal(false)}
          onSaved={(item) => {
            mauHoaDonGetAll().then(setMauHoaDonList)
            setMauHoaDonMa(item.ma_mau)
            setMauHoaDonTen(item.ten_mau)
            setHoaDonKyHieu(item.ky_hieu)
          }}
        />
      )}

    </div>
  )
}
