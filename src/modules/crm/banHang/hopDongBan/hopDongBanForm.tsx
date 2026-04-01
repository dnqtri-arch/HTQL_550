import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, type SetStateAction } from 'react'
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
import { DatePickerCustomHeader } from '../../../../components/datePickerCustomHeader'
import { htqlDatePickerPopperTop } from '../../../../constants/datePickerPlacement'
import { DatePickerTgNhanInput } from '../../../../components/datePickerTgNhanInput'
import { DatePickerReadOnlyTriggerInput } from '../../../../components/datePickerReadOnlyTriggerInput'
import DatePicker, { registerLocale } from 'react-datepicker'
import { addDays, setHours, setMinutes } from 'date-fns'
import { vi } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import {
  LOOKUP_CONTROL_HEIGHT,
  lookupInputWithChevronStyle,
  lookupChevronOverlayStyle,
  lookupActionButtonStyle,
} from '../../../../constants/lookupControlStyles'
import { loadDieuKhoanThanhToanKh, saveDieuKhoanThanhToanKh, khachHangGetAll, type DieuKhoanThanhToanKhItem } from '../khachHang/khachHangApi'
import { KhachHang } from '../khachHang/khachHang'
import type { KhachHangRecord } from '../khachHang/khachHangApi'
import type { VatTuHangHoaRecord } from '../../../../types/vatTuHangHoa'
import { vatTuHangHoaGetForBanHang } from '../../../kho/khoHang/vatTuHangHoaApi'
import { donViTinhGetAll } from '../../../kho/khoHang/donViTinhApi'
import { matchSearchKeyword } from '../../../../utils/stringUtils'
import { vietTatTenNganHang } from '../../../../utils/nganHangDisplay'
import { mau_hdbctkhongdongia, mau_hdbctcodongia, mau_hdbctcodongia_khong_vat } from './hopDongBanGridMauFull'
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
} from '../../../../utils/numberFormat'
import { dvtLaMetVuong } from '../../../../utils/dvtLaMetVuong'
import {
  COL_DD_GH,
  buildDvtOptionsForVthh,
  chiTietToLines,
  computeDonHangMuaFooterTotals,
  formatDonHangLineThanhTienDisplay,
  formatDonHangLineTienThueDisplay,
  formatDonHangLineTongTienDisplay,
  parsePctThueGtgtFromLine,
  type DonHangMuaGridLineRow,
} from '../../../../utils/donHangMuaCalculations'
import {
  DON_HANG_BAN_COL_TEN_SPHH,
  getDonGiaBanDonHangBanLine,
  migrateDonHangBanLinesToCoDonGia,
  enrichDonHangBanGridLinesWithVthh,
} from '../../../../utils/donHangBanDonGiaBan'
import {
  hopDongBanChungTuGetAll,
  hopDongBanChungTuGetChiTiet,
  getDefaultHopDongBanChungTuFilter,
  type HopDongBanChungTuCreatePayload,
  type HopDongBanChungTuRecord,
  type HopDongBanChungTuChiTiet,
  type HopDongBanChungTuAttachmentItem,
  TINH_TRANG_HOP_DONG_BAN_CT,
  TINH_TRANG_HOP_DONG_BAN_CT_DA_GUI_KHACH,
  TINH_TRANG_HOP_DONG_BAN_CHUNG_TU_DA_NHAN_HANG,
} from './hopDongBanChungTuApi'
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
} from '../../muaHang/nhanVatTuHangHoa/nhanVatTuHangHoaApi'
import type { NhanVatTuHangHoaApi } from '../../muaHang/nhanVatTuHangHoa/nhanVatTuHangHoaApiContext'
import { NhanVatTuHangHoaApiProvider } from '../../muaHang/nhanVatTuHangHoa/nhanVatTuHangHoaApiContext'
import { NhanVatTuHangHoaFormModal } from '../../muaHang/nhanVatTuHangHoa/nhanVatTuHangHoaFormModal'
import {
  HopDongBanChungTuDinhKemModal,
  chuanHoaDuongDanDinhKemHopDongBanChungTu,
  partMccForPath,
  type HopDongBanChungTuDinhKemPendingRow,
} from './hopDongBanDinhKemModalFull'
import { useHopDongBanChungTuApi } from './hopDongBanChungTuApiContext'
import { TINH_TRANG_NVTHH_DA_NHAP_KHO } from './hopDongBanChungTuApi'
import { setUnsavedChanges } from '../../../../context/unsavedChanges'
import { Modal } from '../../../../components/common/modal'
import { useToastOptional } from '../../../../context/toastContext'
import { HTQL_FORM_ERROR_BORDER, htqlFocusAndScrollIntoView } from '../../../../utils/formValidationFocus'
import { preserveTimeWhenCalendarDayChanges } from '../../../../utils/reactDatepickerPreserveTime'
import { ThemDieuKhoanThanhToanModal } from '../../shared/themDieuKhoanThanhToanModal'
import { hinhThucGetAll, type HinhThucRecord } from '../../shared/hinhThucApi'
import { getBanksVietnam, type BankItem } from '../../shared/banksApi'
import { ThemHinhThucModal } from '../../shared/themHinhThucModal'
import { mauHoaDonGetAll, type MauHoaDonItem } from '../../shared/mauHoaDonApi'
import { ThemMauHoaDonModal } from '../../shared/themMauHoaDonModal'
import { suggestAddressVietnam } from '../../shared/addressAutocompleteApi'
import bgDetailStyles from '../BanHang.module.css'
import baoGiaChiTietStyles from './HopDongBanChungTu.module.css'

type HopDongBanChungTuGridLineRow = DonHangMuaGridLineRow & {
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

const FORM_FIELD_HEIGHT = LOOKUP_CONTROL_HEIGHT
/** Chiều rộng nhãn Thông tin chung — canh lề trái với Địa điểm NH (rule canh-le) */
const LABEL_MIN_WIDTH = 90
/** Khối Hợp đồng bán / Chứng từ / Hóa đơn (phiếu NVTHH): đồng bộ nhãn với hàng NV mua hàng */
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

export interface HopDongBanFormProps {
  onClose: () => void
  onSaved?: () => void
  /** Kéo form (giống form Vật tư hàng hóa) */
  onHeaderPointerDown?: (e: React.MouseEvent) => void
  dragging?: boolean
  /** Thu nhỏ form (chỉ còn thanh tiêu đề) */
  onMinimize?: () => void
  /** Phóng to / khôi phục kích thước form */
  onMaximize?: () => void
  /** Chế độ xem: chỉ hiển thị, không sửa */
  readOnly?: boolean
  /** Dữ liệu đơn khi mở chế độ xem */
  initialHdbCt?: HopDongBanChungTuRecord | null
  initialChiTiet?: HopDongBanChungTuChiTiet[] | null
  /** Dữ liệu đổ sẵn khi tạo mới (chuyển từ chứng từ khác), không phải chế độ xem */
  prefillHdbCt?: Partial<HopDongBanChungTuRecord> | null
  prefillChiTiet?: HopDongBanChungTuChiTiet[] | null
  /** Sau khi bấm Lưu (chỉ lưu): chuyển form sang chế độ xem đơn vừa lưu, không đóng form */
  onSavedAndView?: (don: HopDongBanChungTuRecord) => void
  formTitle?: string
  soDonLabel?: string
  // [BaoGia] Bỏ logic đối chiếu đơn mua - không áp dụng cho Hợp đồng bán
  // doiChieuSource?: 'don_mua_hang'
  /** Tạo phiếu nhận từ menu BG: prefill tiêu đề/HT/kho/ĐĐTH từ ĐHB (HT/kho/ĐĐTH cho phép sửa lại); lưới chỉ sửa Số lượng; TG tạo = hiện tại; tiêu đề form = `_tieu_de_nguon_dhm`. */
  phieuNhanTuBaoGia?: boolean
  /** Phiếu nhận mở từ «Thêm mới» danh sách (không prefill BG): lưới chi tiết giống form ĐHB (thêm/xóa dòng, sửa đủ cột). */
  phieuNhanThemMoiTuDanhSach?: boolean
  /** Xem phiếu/đơn từ popup: luôn chỉ đọc, ẩn nút Sửa (dùng với readOnly + initialHdbCt). */
  viewOnlyLocked?: boolean
}

/** [YC30] Trạng thái hợp đồng bán — thêm «Đã nhận hàng» khi đồng bộ từ phiếu GNDT. */
const TINH_TRANG_OPTIONS_FORM = [
  ...TINH_TRANG_HOP_DONG_BAN_CT.map((tt) => ({ value: tt, label: tt })),
  { value: TINH_TRANG_HOP_DONG_BAN_CHUNG_TU_DA_NHAN_HANG, label: TINH_TRANG_HOP_DONG_BAN_CHUNG_TU_DA_NHAN_HANG },
]

/** Phiếu NVTHH: hiển thị «Đã nhập kho» thay cho cùng giá trị đồng bộ ĐHB «Đã nhận hàng». */
function normalizeTinhTrangPhieuNvthhForForm(tinh: string | undefined, laPhieuNhan: boolean): string {
  const t = (tinh ?? '').trim()
  const base = t === '' ? 'Mới tạo' : t
  if (!laPhieuNhan) return base
  return base === TINH_TRANG_HOP_DONG_BAN_CT_DA_GUI_KHACH ? TINH_TRANG_NVTHH_DA_NHAP_KHO : base
}

/** Các mức thuế suất GTGT thiết lập trước (dropdown % thuế GTGT) */
const THUE_SUAT_GTGT_OPTIONS = [
  { value: '', label: 'Chưa xác định' },
  { value: '0', label: '0%' },
  { value: '5', label: '5%' },
  { value: '8', label: '8%' },
  { value: '10', label: '10%' },
] as const


/** Cột ĐĐTH — hằng COL_DD_GH từ utils/donHangMuaCalculations (utils chung) */
const mauHdbCtCoDonGiaDisplay = [...mau_hdbctcodongia, COL_DD_GH, 'Ghi chú'] as const
const mauHdbCtCoDonGiaKhongVatDisplay = [...mau_hdbctcodongia_khong_vat, COL_DD_GH, 'Ghi chú'] as const
const mauHdbCtKhongDonGiaDisplay = [...mau_hdbctkhongdongia, COL_DD_GH] as const

/** Bản ghi cũ không có `ap_dung_vat_gtgt` → coi như có VAT; form thêm mới không có bản ghi → mặc định không VAT (YC44). */
function deriveApDungVatGtgtTuBanGhi(r: HopDongBanChungTuRecord | Partial<HopDongBanChungTuRecord> | null | undefined): boolean {
  if (r == null) return false
  const v = (r as HopDongBanChungTuRecord).ap_dung_vat_gtgt
  if (typeof v === 'boolean') return v
  return true
}

/** [YC37] Một dòng trống theo mẫu — Lượng mặc định 1. */
function createEmptyBaoGiaLine(mau: 'codongia' | 'khongdongia'): HopDongBanChungTuGridLineRow {
  const cols = mau === 'codongia' ? [...mauHdbCtCoDonGiaDisplay] : [...mauHdbCtKhongDonGiaDisplay]
  const acc: Record<string, string> = {}
  for (const c of cols) {
    if (c === 'Lượng') acc[c] = '1'
    else acc[c] = ''
  }
  return acc as unknown as HopDongBanChungTuGridLineRow
}

/** Chi tiết ĐHB → dòng lưới (SPHH + Đơn giá bán + kích thước). */
function chiTietToBaoGiaLines(ct: HopDongBanChungTuChiTiet[]): HopDongBanChungTuGridLineRow[] {
  const baseLines = chiTietToLines(ct as any)
  return baseLines.map((line, i) => {
    const c = ct[i]
    const row = { ...line } as Record<string, string>
    const ten = row['Tên VTHH'] ?? ''
    const dg = row['ĐG mua'] ?? ''
    delete row['Tên VTHH']
    delete row['ĐG mua']
    row[DON_HANG_BAN_COL_TEN_SPHH] = ten
    row['Nội dung'] = c?.noi_dung ?? ''
    row['Đơn giá'] = dg
    if (c) {
      if (c.chieu_dai != null && Number(c.chieu_dai) > 0) row['mD'] = formatSoThapPhan(String(c.chieu_dai), 4)
      if (c.chieu_rong != null && Number(c.chieu_rong) > 0) row['mR'] = formatSoThapPhan(String(c.chieu_rong), 4)
      if (c.luong != null && Number(c.luong) > 0) row['Lượng'] = formatSoNguyenInput(String(Math.max(1, Math.round(Number(c.luong)))))
      else row['Lượng'] = row['Lượng']?.trim() || '1'
    }
    return row as unknown as HopDongBanChungTuGridLineRow
  })
}

/** Thứ tự ô Địa điểm NH theo hình thức (đã bỏ trường Kho nhập — mỗi slot tương ứng một dòng ĐĐTH / địa chỉ). */
function buildHinhThucDiaDiemOrder(
  hinhThucSelectedIds: string[],
  hinhThucList: { id: string; ten: string }[]
): { type: 'dia_chi_dd' }[] {
  const slots: { type: 'dia_chi_dd' }[] = []
  for (const id of hinhThucSelectedIds) {
    const h = hinhThucList.find((x) => x.id === id)
    if (!h?.ten) continue
    if (/không nhập kho|khong nhap kho/i.test(h.ten)) slots.push({ type: 'dia_chi_dd' })
    else if (/nhập kho|nhap kho/i.test(h.ten) && !/không|khong/i.test(h.ten)) slots.push({ type: 'dia_chi_dd' })
  }
  return slots
}

/**
 * Khôi phục checkbox hình thức từ bản ghi đã lưu.
 * - `ca_hai`: cả nhập kho + không nhập kho.
 * - Bản ghi cũ chỉ có `nhap_kho` nhưng còn tên/địa chỉ CT → bật thêm hình thức không nhập kho.
 */
function deriveHinhThucSelectedIdsFromRecord(
  d: Partial<HopDongBanChungTuRecord> & { hinh_thuc?: string; dia_chi_cong_trinh?: string } | null | undefined
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

/** Danh sách option ĐĐgh theo các dòng địa điểm GH đang có nội dung. */
function getDiaDiemNhOptions(list: string[], effectiveFirst: string): { idx: number; label: string }[] {
  const opts: { idx: number; label: string }[] = []
  for (let i = 0; i < list.length; i++) {
    const text = i === 0 ? effectiveFirst : (list[i] ?? '')
    if (text.trim()) opts.push({ idx: i, label: `ĐĐTH ${i + 1}` })
  }
  if (opts.length === 0) opts.push({ idx: 0, label: 'ĐĐTH 1' })
  return opts
}

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
  if (col === DON_HANG_BAN_COL_TEN_SPHH) return { width: COL_WIDTH_TEN, minWidth: COL_WIDTH_TEN, maxWidth: COL_WIDTH_TEN }
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
  if (col === COL_DD_GH) return { width: 88, minWidth: 80, maxWidth: 100 }
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
  if (col === DON_HANG_BAN_COL_TEN_SPHH) return 'ten'
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

/** [YC30] Cột số / tiền / thuế / kích thước trong lưới chi tiết ĐHB — canh phải (rule canh-le) */
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

function formatIsoToDdMmYyyy(iso: string | null): string {
  if (!iso) return ''
  const m = (iso || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${m[3]}/${m[2]}/${m[1]}`
}

/** Đối chiếu Phiếu nhận hàng: mọi ĐHB trừ Hủy bỏ */
function baoGiaListForDoiChieuNhanHang(): HopDongBanChungTuRecord[] {
  const all = hopDongBanChungTuGetAll({ ...getDefaultHopDongBanChungTuFilter(), tu: '', den: '' })
  return all.filter((bg) => bg.tinh_trang !== 'Hủy bỏ')
}

/** Hiển thị ô «Nhận hàng từ»: `mã BG: tiêu đề` (tiêu đề = so_chung_tu_cukcuk). */
function formatNhanHangTuTuBaoGia(bg: HopDongBanChungTuRecord): string {
  const ma = (bg.so_hop_dong ?? '').trim()
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
    const bank = [tk.ten_ngan_hang, tk.chi_nhanh].map((x) => String(x ?? '').trim()).filter(Boolean).join(' — ')
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

/** Phiếu NVTHH — popup «Nhận hàng từ»: chỉ ĐHB tình trạng Chưa thực hiện. */
function baoGiaListChoPhieuNhanTuBaoGia(): HopDongBanChungTuRecord[] {
  const all = hopDongBanChungTuGetAll({ ...getDefaultHopDongBanChungTuFilter(), tu: '', den: '' })
  return all.filter((bg) => bg.tinh_trang === 'Chờ duyệt')
}

function gridColumnHeaderLabel(col: string): React.ReactNode {
  if (col === 'Mã') return 'Mã SPHH'
  if (col === COL_DD_GH) return 'ĐĐTH'
  if (col === '% thuế GTGT') return (<>% thuế<br />GTGT</>)
  return col
}

/** Mẫu không đơn giá — [YC37] mặc định 1 dòng. */
function mauKhongDonGiaLines(): HopDongBanChungTuGridLineRow[] {
  return [createEmptyBaoGiaLine('khongdongia')]
}

/** Mẫu có đơn giá — [YC37] mặc định 1 dòng. */
function mauCoDonGiaLines(): HopDongBanChungTuGridLineRow[] {
  return [createEmptyBaoGiaLine('codongia')]
}

export function HopDongBanForm({ onClose, onSaved, onHeaderPointerDown, dragging, readOnly = false, initialHdbCt, initialChiTiet, prefillHdbCt, prefillChiTiet, onMinimize, onMaximize, onSavedAndView: _onSavedAndView, formTitle: _formTitle, soDonLabel: soDonLabelProp, phieuNhanTuBaoGia = false, phieuNhanThemMoiTuDanhSach = false, viewOnlyLocked = false }: HopDongBanFormProps) {
  const api = useHopDongBanChungTuApi()
  const toastApi = useToastOptional()
  const soDonLabel = soDonLabelProp ?? 'Số hợp đồng'
  const isViewMode = readOnly && initialHdbCt != null
  const [editingFromView, setEditingFromView] = useState(false)
  // [BaoGia] Bỏ logic đối chiếu - chỉ dùng phieuNhanTuBaoGia
  const laPhieuNhanNvthh = Boolean(phieuNhanTuBaoGia)
  const donDaNhanHangXem =
    readOnly &&
    initialHdbCt != null &&
    (initialHdbCt.tinh_trang === TINH_TRANG_HOP_DONG_BAN_CT_DA_GUI_KHACH ||
      initialHdbCt.tinh_trang === TINH_TRANG_NVTHH_DA_NHAP_KHO)
  const donHuyBoChiXem = initialHdbCt != null && initialHdbCt.tinh_trang === 'Hủy bỏ'
  const effectiveReadOnly = (readOnly && !editingFromView) || donDaNhanHangXem || donHuyBoChiXem || viewOnlyLocked
  /** Chi tiết VTHH chỉ đọc khi form ở chế độ xem (readOnly). */
  const chiTietReadOnly = effectiveReadOnly
  /** Phiếu nhận từ BG: không thêm/xóa dòng; chỉ sửa cột Số lượng — trừ khi «Thêm mới» từ danh sách (không prefill BG). */
  const chiTietGridLocked = Boolean(phieuNhanTuBaoGia) && !effectiveReadOnly && !phieuNhanThemMoiTuDanhSach
  const [khachHangDisplay, setKhachHangDisplay] = useState(() => {
    if (isViewMode && initialHdbCt) return initialHdbCt.khach_hang
    if (prefillHdbCt?.khach_hang) return prefillHdbCt.khach_hang
    return ''
  })
  const [khachHangId, setKhachHangId] = useState<number | null>(null)
  /** Mã KH (ma_kh) — dùng đặt tên file đính kèm theo rule hệ thống. */
  const [khachHangMa, setKhachHangMa] = useState('')
  const khPartDinhKem = useMemo(() => partMccForPath(khachHangMa), [khachHangMa])
  const [attachments, setAttachments] = useState<HopDongBanChungTuAttachmentItem[]>(() => {
    if (initialHdbCt?.attachments?.length) return initialHdbCt.attachments.map((a) => ({ ...a }))
    if (prefillHdbCt && 'attachments' in prefillHdbCt && Array.isArray(prefillHdbCt.attachments) && prefillHdbCt.attachments.length > 0) {
      return prefillHdbCt.attachments.map((a) => ({ ...a }))
    }
    return []
  })
  /** User đổi đính kèm so với bản đã lưu — dùng nhãn «Chờ lưu» trong modal dktk. */
  const [attachmentsDirty, setAttachmentsDirty] = useState(false)
  /** Tiến trình đọc file đính kèm thiết kế — giữ ở form để đóng popover vẫn thấy trên nút Đính kèm. */
  const [dktkPendingUploadRows, setDktkPendingUploadRows] = useState<HopDongBanChungTuDinhKemPendingRow[]>([])
  const [phieuChiDktkPendingRows, setPhieuChiDktkPendingRows] = useState<HopDongBanChungTuDinhKemPendingRow[]>([])
  const patchAttachmentsFromUser = useCallback((next: SetStateAction<HopDongBanChungTuAttachmentItem[]>) => {
    setAttachments(next)
    setAttachmentsDirty(true)
  }, [])
  const daDongBoLuuCsdlDktk = useMemo(
    () => Boolean(initialHdbCt && !attachmentsDirty),
    [initialHdbCt, attachmentsDirty],
  )
  const [showDinhKemModal, setShowDinhKemModal] = useState(false)
  const [dinhKemModalAnchor, setDinhKemModalAnchor] = useState<'toolbar' | 'duoi-ghi-chu'>('toolbar')
  const [popupXemPhieuNvthh, setPopupXemPhieuNvthh] = useState<NhanVatTuHangHoaRecord | null>(null)
  const [diaChi, setDiaChi] = useState(() => {
    if (isViewMode && initialHdbCt) return initialHdbCt.dia_chi ?? ''
    if (prefillHdbCt?.dia_chi != null) return prefillHdbCt.dia_chi
    return ''
  })
  const [nguoiGiaoHang, setNguoiGiaoHang] = useState(() => {
    if (isViewMode && initialHdbCt) return initialHdbCt.nguoi_giao_hang ?? ''
    if (prefillHdbCt?.nguoi_giao_hang != null) return prefillHdbCt.nguoi_giao_hang
    return ''
  })
  const [maSoThue, setMaSoThue] = useState(() => {
    if (isViewMode && initialHdbCt) return initialHdbCt.ma_so_thue ?? ''
    if (prefillHdbCt?.ma_so_thue != null) return prefillHdbCt.ma_so_thue
    return ''
  })
  const [dienGiai, setDienGiai] = useState(() => {
    if (isViewMode && initialHdbCt) return initialHdbCt.dien_giai ?? ''
    if (prefillHdbCt?.dien_giai != null) return prefillHdbCt.dien_giai
    return ''
  })
  const [nvMuaHang, setNvMuaHang] = useState(() => {
    if (isViewMode && initialHdbCt) return initialHdbCt.nv_ban_hang ?? ''
    if (prefillHdbCt?.nv_ban_hang != null) return prefillHdbCt.nv_ban_hang
    return ''
  })
  const [dieuKhoanTT, setDieuKhoanTT] = useState(() => {
    if (isViewMode && initialHdbCt) return initialHdbCt.dieu_khoan_tt ?? ''
    if (prefillHdbCt?.dieu_khoan_tt != null) return prefillHdbCt.dieu_khoan_tt
    return ''
  })
  const [soNgayDuocNo, setSoNgayDuocNo] = useState(() => {
    if (isViewMode && initialHdbCt) return initialHdbCt.so_ngay_duoc_no ?? '0'
    if (prefillHdbCt?.so_ngay_duoc_no != null) return prefillHdbCt.so_ngay_duoc_no
    return '0'
  })
  const [hinhThucList, setHinhThucList] = useState<HinhThucRecord[]>(() => hinhThucGetAll())
  const [hinhThucSelectedIds, setHinhThucSelectedIds] = useState<string[]>(() => {
    const fromRec = deriveHinhThucSelectedIdsFromRecord((initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | null | undefined)
    if (fromRec.length > 0) return fromRec
    if (phieuNhanTuBaoGia && initialHdbCt == null && prefillHdbCt == null) return defaultPhieuNhanHinhThucNhapKhoIds()
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
  const [diaDiemGiaoHangList, setDiaDiemGiaoHangList] = useState<string[]>(() => {
    const raw = (initialHdbCt ?? prefillHdbCt) as { dia_diem_giao_hang?: string } | null | undefined
    const s = raw?.dia_diem_giao_hang ?? ''
    if (!s.trim()) return ['']
    return s.split(/\r?\n/).filter(Boolean).length > 0 ? s.split(/\r?\n/).map((x) => x.trim()) : ['']
  })
  const [dieuKhoanKhac, setDieuKhoanKhac] = useState(() => {
    if (isViewMode && initialHdbCt) return initialHdbCt.dieu_khoan_khac ?? ''
    if (prefillHdbCt?.dieu_khoan_khac != null) return prefillHdbCt.dieu_khoan_khac
    return ''
  })
  const [thamChieu, setThamChieu] = useState(() => {
    if (isViewMode && initialHdbCt) {
      if (phieuNhanTuBaoGia) {
        const lk = initialHdbCt.doi_chieu_don_mua_id
        if (lk) {
          const all = hopDongBanChungTuGetAll({ ...getDefaultHopDongBanChungTuFilter(), tu: '', den: '' })
          const d = all.find((x) => x.id === lk)
          if (d) return formatNhanHangTuTuBaoGia(d)
        }
        return (initialHdbCt.so_chung_tu_cukcuk ?? '').toUpperCase()
      }
      return initialHdbCt.so_chung_tu_cukcuk ?? ''
    }
    if (prefillHdbCt && phieuNhanTuBaoGia) {
      const pd = prefillHdbCt as HopDongBanChungTuRecord
      if ((pd.so_hop_dong ?? '').trim()) return formatNhanHangTuTuBaoGia(pd)
    }
    if (prefillHdbCt?.so_chung_tu_cukcuk != null) {
      return phieuNhanTuBaoGia
        ? String(prefillHdbCt.so_chung_tu_cukcuk).toUpperCase()
        : prefillHdbCt.so_chung_tu_cukcuk
    }
    return ''
  })
  const [ngayDonHang, setNgayDonHang] = useState<Date | null>(() => {
    if (isViewMode && initialHdbCt) return parseIsoToDate(initialHdbCt.ngay_lap_hop_dong)
    if (phieuNhanTuBaoGia) return new Date()
    if (prefillHdbCt?.ngay_lap_hop_dong) return parseIsoToDate(prefillHdbCt.ngay_lap_hop_dong)
    return new Date()
  })
  const [soDonHang, setSoDonHang] = useState(() => (isViewMode && initialHdbCt ? initialHdbCt.so_hop_dong : api.soHopDongTiepTheo()))
  const [tinhTrang, setTinhTrang] = useState(() => {
    const raw = isViewMode && initialHdbCt ? initialHdbCt.tinh_trang : prefillHdbCt?.tinh_trang
    return normalizeTinhTrangPhieuNvthhForForm(raw, laPhieuNhanNvthh)
  })
  const [tgNhanHangPickerOpen, setTgNhanHangPickerOpen] = useState(false)
  const [tgNhapPickerOpen, setTgNhapPickerOpen] = useState(false)
  const [phieuChiNgayPickerOpen, setPhieuChiNgayPickerOpen] = useState(false)
  const [ngayHoaDonPickerOpen, setNgayHoaDonPickerOpen] = useState(false)
  const [ngayGiaoHang, setNgayGiaoHang] = useState<Date | null>(() => {
    if (isViewMode && initialHdbCt) return parseIsoToDate(initialHdbCt.ngay_cam_ket_giao)
    if (prefillHdbCt?.ngay_cam_ket_giao !== undefined) return parseIsoToDate(prefillHdbCt.ngay_cam_ket_giao ?? null)
    return null
  })
  const [phieuChiNgay, setPhieuChiNgay] = useState<Date | null>(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    const iso = r?.phieu_chi_ngay?.trim()
    return iso ? parseIsoToDate(iso) : null
  })
  const [tenNguoiLienHe, setTenNguoiLienHe] = useState(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    return (r?.ten_nguoi_lien_he ?? '').trim()
  })
  const [soDienThoaiLienHe, setSoDienThoaiLienHe] = useState(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    return (r?.so_dien_thoai_lien_he ?? '').trim()
  })
  const [soDienThoaiCaNhan, setSoDienThoaiCaNhan] = useState(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    return (r?.so_dien_thoai ?? '').trim()
  })
  const [tlCkInput, setTlCkInput] = useState(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    const v = r?.tl_ck
    if (v != null && typeof v === 'number' && Number.isFinite(v)) return v === 0 ? '0' : formatSoThapPhan(v, 3)
    return '0'
  })
  const [tienCkInput, setTienCkInput] = useState(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    const v = r?.tien_ck
    return v != null && typeof v === 'number' && Number.isFinite(v) ? formatSoTienHienThi(v) : formatSoTienHienThi(0)
  })
  const [apDungVatGtgt, setApDungVatGtgt] = useState(() => deriveApDungVatGtgtTuBanGhi((initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | null))
  const chietKhauLastEditRef = useRef<'tl' | 'tien' | null>(null)
  const tlCkInputRef = useRef('')
  const tienCkInputRef = useRef('')
  const prevTongHangCkRef = useRef<number | null>(null)
  /** Dòng grid: các key cột là string; _dvtOptions khi VTHH có đơn vị quy đổi; _vthh để lấy đơn giá bán theo ĐVT khi đổi ĐVT */
  const [lines, setLines] = useState<HopDongBanChungTuGridLineRow[]>(() => {
    if (isViewMode && initialChiTiet && initialChiTiet.length > 0) return chiTietToBaoGiaLines(initialChiTiet)
    if (prefillChiTiet && prefillChiTiet.length > 0) return chiTietToBaoGiaLines(prefillChiTiet)
    if (!isViewMode && initialHdbCt == null && (!prefillChiTiet || prefillChiTiet.length === 0)) {
      return [createEmptyBaoGiaLine('codongia')]
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
  /** Mẫu hiện tại — codongia khi có initialHdbCt (dữ liệu đủ cột), else theo lựa chọn user (rule mau_gia.mdc) */
  const [mauHienTai, setMauHienTai] = useState<'codongia' | 'khongdongia'>('codongia')
  const [khList, setkhList] = useState<KhachHangRecord[]>([])
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
    const saved = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    if (saved?.loai_khach_hang === 'ca_nhan' || saved?.loai_khach_hang === 'doanh_nghiep') return saved.loai_khach_hang
    return null
  }, [khachHangId, khList, khachHangDisplay, initialHdbCt?.loai_khach_hang, (prefillHdbCt as HopDongBanChungTuRecord | undefined)?.loai_khach_hang])
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
  const [deleteDiaDiemModal, setDeleteDiaDiemModal] = useState<{ index: number; content: string } | null>(null)
  const [activeDiaDiemIndex, setActiveDiaDiemIndex] = useState<number | null>(null)
  const [diaChiCongTrinh, setDiaChiCongTrinh] = useState(() => {
    const d = (initialHdbCt ?? prefillHdbCt) as { dia_chi_cong_trinh?: string } | null | undefined
    return d?.dia_chi_cong_trinh ?? ''
  })
  const [chungTuMuaCachThanhToan, setChungTuMuaCachThanhToan] = useState<'chua_thanh_toan' | 'thanh_toan_ngay'>(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    if (r?.chung_tu_mua_chua_thanh_toan) return 'chua_thanh_toan'
    if (r?.chung_tu_mua_thanh_toan_ngay) return 'thanh_toan_ngay'
    return 'thanh_toan_ngay'
  })
  const [chungTuMuaPttt, setChungTuMuaPttt] = useState<'tien_mat' | 'chuyen_khoan'>(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    return normalizeChungTuMuaPtttStored(r?.chung_tu_mua_pttt)
  })
  const [chungTuMuaLoaiHd, setChungTuMuaLoaiHd] = useState<ChungTuMuaLoaiHdPhieu>(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    const v = r?.chung_tu_mua_loai_hd
    if (v === 'gtgt') return 'gtgt'
    return 'hd_le'
  })
  // [BaoGia] Logic phiếu NVTHH - chỉ dùng khi phieuNhanTuBaoGia = true
  const [phieuNhanTabChung, setPhieuNhanTabChung] = useState<'phieu-nhap' | 'phieu-chi' | 'hoa-don'>('phieu-nhap')
  const [phieuSoHoaDon, setPhieuSoHoaDon] = useState(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    return (r?.chung_tu_mua_so_hoa_don ?? '').trim()
  })
  const [hoaDonNgay, setHoaDonNgay] = useState<Date | null>(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    const iso = r?.hoa_don_ngay?.trim()
    if (!iso) return null
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!m) return parseIsoToDate(iso)
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  })
  const [hoaDonKyHieu, setHoaDonKyHieu] = useState(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    return (r?.hoa_don_ky_hieu ?? '').trim()
  })
  const [mauHoaDonMa, setMauHoaDonMa] = useState(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    return (r?.mau_hoa_don_ma ?? '').trim()
  })
  const [mauHoaDonTen, setMauHoaDonTen] = useState(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    return (r?.mau_hoa_don_ten ?? '').trim()
  })
  const [mauHoaDonList, setMauHoaDonList] = useState<MauHoaDonItem[]>([])
  const [mauHoaDonDropdownOpen, setMauHoaDonDropdownOpen] = useState(false)
  const [mauHoaDonDropdownRect, setMauHoaDonDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const [showThemMauHoaDonModal, setShowThemMauHoaDonModal] = useState(false)
  const refMauHoaDonWrap = useRef<HTMLDivElement>(null)
  const [phieuChiKH, setPhieuChiKH] = useState(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    return r?.phieu_chi_nha_cung_cap ?? ''
  })
  const [phieuChiDiaChi, setPhieuChiDiaChi] = useState(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    return r?.phieu_chi_dia_chi ?? ''
  })
  const [phieuChiNguoiNhanTien, setPhieuChiNguoiNhanTien] = useState(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    return r?.phieu_chi_nguoi_nhan_tien ?? ''
  })
  const [phieuChiLyDo, setPhieuChiLyDo] = useState(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    return r?.phieu_chi_ly_do ?? ''
  })
  const [phieuChiTaiKhoanChi, setPhieuChiTaiKhoanChi] = useState(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    return r?.phieu_chi_tai_khoan_chi ?? ''
  })
  const [phieuChiNganHangChi, setPhieuChiNganHangChi] = useState(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    return r?.phieu_chi_ngan_hang_chi ?? r?.phieu_chi_ngan_hang ?? ''
  })
  const [phieuChiTenNguoiGui, setPhieuChiTenNguoiGui] = useState(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    return r?.phieu_chi_ten_nguoi_gui ?? ''
  })
  const [phieuChiTaiKhoanNhan, setPhieuChiTaiKhoanNhan] = useState(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    return r?.phieu_chi_tai_khoan_nhan ?? ''
  })
  const [phieuChiNganHangNhan, setPhieuChiNganHangNhan] = useState(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    return r?.phieu_chi_ngan_hang_nhan ?? ''
  })
  const [phieuChiTenChuTkNhan, setPhieuChiTenChuTkNhan] = useState(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    return r?.phieu_chi_ten_chu_tk_nhan ?? r?.phieu_chi_ten_nguoi_nhan_ck ?? ''
  })
  const [phieuChiAttachments, setPhieuChiAttachments] = useState<HopDongBanChungTuAttachmentItem[]>(() => {
    const r = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
    const a = r?.phieu_chi_attachments
    return Array.isArray(a) && a.length ? a.map((x) => ({ ...x })) : []
  })
  const patchPhieuChiAttachmentsFromUser = useCallback((next: SetStateAction<HopDongBanChungTuAttachmentItem[]>) => {
    setPhieuChiAttachments(next)
    setAttachmentsDirty(true)
  }, [])
  const [showDinhKemPhieuChiModal, setShowDinhKemPhieuChiModal] = useState(false)
  const [bankSuggestList, setBankSuggestList] = useState<BankItem[]>([])
  const [diaDiemSuggestions, setDiaDiemSuggestions] = useState<string[]>([])
  const [diaDiemSuggestionRect, setDiaDiemSuggestionRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const diaDiemDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refDiaDiemGiaoHangWrap = useRef<HTMLDivElement>(null)
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

  // [BaoGia] Bỏ logic đối chiếu đơn mua - không áp dụng cho Hợp đồng bán thông thường
  // const [selectedDoiChieuDonMuaId, setSelectedDoiChieuDonMuaId] = useState<string | null>(null)
  // const lienKetDonMuaId = null
  // const [showTimDonMuaHangPopup, setShowTimDonMuaHangPopup] = useState(false)
  const [nhanHangTuDropdownOpen, setNhanHangTuDropdownOpen] = useState(false)
  const [nhanHangTuDropdownRect, setNhanHangTuDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  // const [showDonMuaHangPopup, setShowDonMuaHangPopup] = useState(false)
  // const [viewHopDongBanChungTuRecord, setViewHopDongBanChungTuRecord] = useState<HopDongBanChungTuRecord | null>(null)

  /** Phiếu NVTHH: bỏ margin dưới từng dòng — khoảng cách dọc = `gap` tab panel (cùng kho nhập → ĐĐTH 1). */
  const fieldRowDyn = useMemo(
    (): React.CSSProperties => ({ ...fieldRow, marginBottom: phieuNhanTuBaoGia ? 0 : FIELD_ROW_GAP }),
    [phieuNhanTuBaoGia]
  )

  const phieuChiStkInputCh = useMemo(() => {
    const a = phieuChiTaiKhoanChi.trim().length
    const b = phieuChiTaiKhoanNhan.trim().length
    return Math.min(28, Math.max(11, Math.max(a, b, 10) + 2))
  }, [phieuChiTaiKhoanChi, phieuChiTaiKhoanNhan])

  const soDonLabelHienThi = useMemo(() => {
    if (!phieuNhanTuBaoGia) return soDonLabel
    if (phieuNhanTabChung === 'phieu-nhap') return 'Mã phiếu nhập'
    if (phieuNhanTabChung === 'phieu-chi') return 'Mã phiếu chi'
    return 'Mã phiếu NVTHH'
  }, [phieuNhanTuBaoGia, phieuNhanTabChung, soDonLabel])

  const mauHoaDonHienThi = useMemo(() => {
    if (mauHoaDonMa && mauHoaDonTen) return `${mauHoaDonMa} — ${mauHoaDonTen}`
    if (mauHoaDonMa) return mauHoaDonMa
    return mauHoaDonTen
  }, [mauHoaDonMa, mauHoaDonTen])

  const tieuDePhieuNvthhDayDu = useMemo(() => {
    if (!phieuNhanTuBaoGia) return ''
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
  }, [phieuNhanTuBaoGia, hinhThucSelectedIds, hinhThucList, chungTuMuaPttt, chungTuMuaLoaiHd, khachHangDisplay])

  const dienGiaiPhieuMacDinh = useMemo(() => {
    if (!phieuNhanTuBaoGia) return ''
    const t = thamChieu.trim()
    if (!t) return ''
    const so = phieuSoHoaDon.trim()
    return so ? `Nhập hàng ${t} theo hóa đơn số ${so}` : `Nhập hàng ${t}`
  }, [phieuNhanTuBaoGia, thamChieu, phieuSoHoaDon])

  useEffect(() => {
    dienGiaiPhieuTuChinhRef.current = false
  }, [initialHdbCt?.id, phieuNhanTuBaoGia])

  useEffect(() => {
    if (!phieuNhanTuBaoGia || initialHdbCt != null) return
    if (dienGiaiPhieuTuChinhRef.current) return
    setDienGiai(dienGiaiPhieuMacDinh)
  }, [phieuNhanTuBaoGia, initialHdbCt, dienGiaiPhieuMacDinh])

  useEffect(() => {
    if (!phieuNhanTuBaoGia || phieuNhanTabChung !== 'phieu-chi' || initialHdbCt != null) return
    setPhieuChiKH(khachHangDisplay)
    setPhieuChiDiaChi(diaChi)
  }, [phieuNhanTuBaoGia, phieuNhanTabChung, khachHangDisplay, diaChi, initialHdbCt])

  useEffect(() => {
    if (!phieuNhanTuBaoGia) return
    let cancelled = false
    mauHoaDonGetAll().then((list) => {
      if (!cancelled) setMauHoaDonList(list)
    })
    return () => {
      cancelled = true
    }
  }, [phieuNhanTuBaoGia])

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

  /** Đánh dấu form đang nhập dở để cảnh báo khi refresh (F5). Clean khi đóng hoặc lưu. */
  useEffect(() => {
    if (!effectiveReadOnly) setUnsavedChanges(true)
    return () => setUnsavedChanges(false)
  }, [effectiveReadOnly])

  /** Khi mở form thêm mới: gán số Hợp đồng bán tiếp theo (chỉ một lần). */
  useEffect(() => {
    if (initialHdbCt != null || didSetSoDonRef.current) return
    didSetSoDonRef.current = true
    setSoDonHang(api.soHopDongTiepTheo())
  }, [initialHdbCt, api])

  /** Khi tạo mới từ chứng từ khác (prefill): đổ dữ liệu một lần khi mount. */
  useEffect(() => {
    if (isViewMode) return
    if (didPrefillRef.current) return
    if (!prefillHdbCt && (!prefillChiTiet || prefillChiTiet.length === 0)) return
    didPrefillRef.current = true

    if (prefillHdbCt) {
      if (prefillHdbCt.khach_hang != null) setKhachHangDisplay(prefillHdbCt.khach_hang)
      if (prefillHdbCt.dia_chi != null) setDiaChi(prefillHdbCt.dia_chi)
      if (prefillHdbCt.nguoi_giao_hang != null) setNguoiGiaoHang(prefillHdbCt.nguoi_giao_hang)
      if (prefillHdbCt.ma_so_thue != null) setMaSoThue(prefillHdbCt.ma_so_thue)
      if (prefillHdbCt.dien_giai != null) setDienGiai(prefillHdbCt.dien_giai)
      if (prefillHdbCt.nv_ban_hang != null) setNvMuaHang(prefillHdbCt.nv_ban_hang)
      if (prefillHdbCt.dieu_khoan_tt != null) setDieuKhoanTT(prefillHdbCt.dieu_khoan_tt)
      if (prefillHdbCt.so_ngay_duoc_no != null) setSoNgayDuocNo(prefillHdbCt.so_ngay_duoc_no)
      if (prefillHdbCt.dia_diem_giao_hang != null) {
        const parts = String(prefillHdbCt.dia_diem_giao_hang).split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
        setDiaDiemGiaoHangList(parts.length > 0 ? parts : [''])
      }
      if (prefillHdbCt.dieu_khoan_khac != null) setDieuKhoanKhac(prefillHdbCt.dieu_khoan_khac)
      if (phieuNhanTuBaoGia) {
        const pd = prefillHdbCt as HopDongBanChungTuRecord
        // [BaoGia] Bỏ setSelectedDoiChieuDonMuaId
        // if ((pd.id ?? '').trim()) setSelectedDoiChieuDonMuaId(pd.id)
        if ((pd.so_hop_dong ?? '').trim()) setThamChieu(formatNhanHangTuTuBaoGia(pd))
        else if (prefillHdbCt.so_chung_tu_cukcuk != null) setThamChieu(prefillHdbCt.so_chung_tu_cukcuk)
      } else if (prefillHdbCt.so_chung_tu_cukcuk != null) {
        setThamChieu(prefillHdbCt.so_chung_tu_cukcuk)
      }
      if (prefillHdbCt.tinh_trang != null) {
        setTinhTrang(normalizeTinhTrangPhieuNvthhForForm(prefillHdbCt.tinh_trang, laPhieuNhanNvthh))
      }
      if (prefillHdbCt.ngay_lap_hop_dong != null && !phieuNhanTuBaoGia) setNgayDonHang(parseIsoToDate(prefillHdbCt.ngay_lap_hop_dong))
      if (prefillHdbCt.ngay_cam_ket_giao !== undefined) setNgayGiaoHang(parseIsoToDate(prefillHdbCt.ngay_cam_ket_giao ?? null))
      const ext = prefillHdbCt as HopDongBanChungTuRecord
      if (ext.phieu_chi_ngay != null) setPhieuChiNgay(parseIsoToDate(ext.phieu_chi_ngay))
      setHinhThucSelectedIds(deriveHinhThucSelectedIdsFromRecord(ext))
      if (ext.dia_chi_cong_trinh != null) setDiaChiCongTrinh(ext.dia_chi_cong_trinh)
      if (prefillHdbCt.attachments?.length) {
        setAttachments(prefillHdbCt.attachments.map((a) => ({ ...a })))
      }
      {
        const pd = prefillHdbCt as HopDongBanChungTuRecord
        if (pd.ten_nguoi_lien_he != null) setTenNguoiLienHe(String(pd.ten_nguoi_lien_he))
        if (pd.so_dien_thoai_lien_he != null) setSoDienThoaiLienHe(String(pd.so_dien_thoai_lien_he))
        if (pd.so_dien_thoai != null) setSoDienThoaiCaNhan(String(pd.so_dien_thoai))
        if (pd.tl_ck != null && typeof pd.tl_ck === 'number')
          setTlCkInput(pd.tl_ck === 0 ? '0' : formatSoThapPhan(pd.tl_ck, 3))
        if (pd.tien_ck != null && typeof pd.tien_ck === 'number') setTienCkInput(formatSoTienHienThi(pd.tien_ck))
      }
      // so_hop_dong: luôn dùng số tự sinh của hợp đồng bán / phiếu nhận
    }

    if (prefillChiTiet && prefillChiTiet.length > 0) {
      setLines(chiTietToBaoGiaLines(prefillChiTiet))
    }
  }, [isViewMode, prefillHdbCt, prefillChiTiet, laPhieuNhanNvthh, phieuNhanTuBaoGia])

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

  const applyChonBaoGiaDoiChieu = useCallback(
    (bg: HopDongBanChungTuRecord) => {
      const label = (bg.so_hop_dong ?? '').trim()
      setThamChieu(phieuNhanTuBaoGia ? formatNhanHangTuTuBaoGia(bg) : label)
      // [BaoGia] Bỏ setSelectedDoiChieuDonMuaId
      // setSelectedDoiChieuDonMuaId(bg.id)
      setValErrKey((k) => (k === 'doi_chieu' ? null : k))
      setKhachHangDisplay(bg.khach_hang ?? '')
      const ten = (bg.khach_hang ?? '').trim()
      const hit = khList.find((n) => (n.ten_kh || '').trim() === ten)
      if (hit != null) {
        setKhachHangId(hit.id)
        setKhachHangMa((hit.ma_kh ?? '').trim())
        if (phieuNhanTuBaoGia && chungTuMuaPttt === 'chuyen_khoan') {
          const v = getPhieuChiNhanFieldsTuKh(hit)
          setPhieuChiTaiKhoanNhan(v.stk)
          setPhieuChiNganHangNhan(v.nganHang)
          setPhieuChiTenChuTkNhan(v.tenChuTk)
        }
      }
      setDiaChi(bg.dia_chi ?? '')
      setNguoiGiaoHang(bg.nguoi_giao_hang ?? '')
      setHinhThucSelectedIds(deriveHinhThucSelectedIdsFromRecord(bg))
      setDiaChiCongTrinh((bg as HopDongBanChungTuRecord & { dia_chi_cong_trinh?: string }).dia_chi_cong_trinh ?? '')
      setMaSoThue(bg.ma_so_thue ?? '')
      setDienGiai(bg.dien_giai ?? '')
      setNvMuaHang(bg.nv_ban_hang ?? '')
      setDieuKhoanTT(bg.dieu_khoan_tt ?? '')
      setSoNgayDuocNo(bg.so_ngay_duoc_no ?? '0')
      setDiaDiemGiaoHangList((() => {
        const s = (bg.dia_diem_giao_hang ?? '').trim()
        return s ? s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean) : ['']
      })())
      setDieuKhoanKhac(bg.dieu_khoan_khac ?? '')
      setNgayDonHang(parseIsoToDate(bg.ngay_lap_hop_dong))
      setNgayGiaoHang(parseIsoToDate(bg.ngay_cam_ket_giao ?? null))
      const ct = hopDongBanChungTuGetChiTiet(bg.id)
      setLines(chiTietToBaoGiaLines(ct))
    },
    [phieuNhanTuBaoGia, khList, chungTuMuaPttt],
  )

  useEffect(() => {
    if (!phieuNhanTuBaoGia || chungTuMuaPttt !== 'chuyen_khoan' || effectiveReadOnly) return
    if (khachHangId == null) return
    const hit = khList.find((n) => n.id === khachHangId)
    if (!hit) return
    const v = getPhieuChiNhanFieldsTuKh(hit)
    setPhieuChiTaiKhoanNhan((prev) => (prev.trim() ? prev : v.stk))
    setPhieuChiNganHangNhan((prev) => (prev.trim() ? prev : v.nganHang))
    setPhieuChiTenChuTkNhan((prev) => (prev.trim() ? prev : v.tenChuTk))
  }, [phieuNhanTuBaoGia, chungTuMuaPttt, khachHangId, khList, effectiveReadOnly])

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
    if (phieuNhanTuBaoGia) setNhanHangTuDropdownOpen(false)
    setMauHoaDonDropdownOpen(false)
    setTgNhapPickerOpen(false)
    setPhieuChiNgayPickerOpen(false)
    setNgayHoaDonPickerOpen(false)
    setTgNhanHangPickerOpen(false)
  }, [phieuNhanTabChung, phieuNhanTuBaoGia])

  /** Đồng bộ id + mã KH từ danh bạ (tên / chuỗi «mã - tên» cũ). Phiếu: chuẩn về chỉ tên khi khớp. */
  useEffect(() => {
    const raw = (initialHdbCt?.khach_hang ?? prefillHdbCt?.khach_hang ?? '').trim()
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
        const saved = (initialHdbCt ?? prefillHdbCt) as HopDongBanChungTuRecord | undefined
        if (!saved?.ten_nguoi_lien_he?.trim()) {
          setTenNguoiLienHe(tenNguoiLienHeTuDanhBaKh(found))
          setSoDienThoaiLienHe(soDienThoaiUuTienTuKhachHang(found))
        }
      }
    }
  }, [initialHdbCt?.khach_hang, prefillHdbCt?.khach_hang, khList, laPhieuNhanNvthh, initialHdbCt, prefillHdbCt])

  /** Đổi đơn (id): nạp file đính kèm từ bản ghi và chuẩn hóa `name`/`virtual_path` theo Mã HĐ + KH hiện tại (dữ liệu cũ có thể còn `KH_unknown` trong tên file). */
  useEffect(() => {
    if (initialHdbCt?.id == null) return
    const a = initialHdbCt.attachments
    const raw = Array.isArray(a) ? a.map((x) => ({ ...x })) : []
    if (raw.length === 0) {
      setAttachments([])
      setAttachmentsDirty(false)
      return
    }
    const so = (initialHdbCt.so_hop_dong ?? '').trim() || 'BG'
    const khPart = partMccForPath('')
    setAttachments(chuanHoaDuongDanDinhKemHopDongBanChungTu(raw, so, khPart))
    setAttachmentsDirty(false)
  }, [initialHdbCt?.id])

  /** Đồng bộ `name` + `virtual_path` khi đổi Mã HĐ / KH (đính kèm trước, nhập KH sau — tránh tên file vẫn `KH_unknown`). */
  useEffect(() => {
    const so = soDonHang.trim() || 'DHM'
    setAttachments((prev) => {
      if (prev.length === 0) return prev
      const next = chuanHoaDuongDanDinhKemHopDongBanChungTu(prev, so, khPartDinhKem)
      const same = next.every(
        (n: HopDongBanChungTuAttachmentItem, i: number) => n.virtual_path === prev[i]?.virtual_path && n.name === (prev[i]?.name ?? '')
      )
      return same ? prev : next
    })
  }, [soDonHang, khPartDinhKem])

  useEffect(() => {
    if (!phieuNhanTuBaoGia) return
    const so = soDonHang.trim() || 'DHM'
    setPhieuChiAttachments((prev) => {
      if (prev.length === 0) return prev
      const next = chuanHoaDuongDanDinhKemHopDongBanChungTu(prev, so, khPartDinhKem)
      const same = next.every(
        (n: HopDongBanChungTuAttachmentItem, i: number) => n.virtual_path === prev[i]?.virtual_path && n.name === (prev[i]?.name ?? '')
      )
      return same ? prev : next
    })
  }, [phieuNhanTuBaoGia, soDonHang, khPartDinhKem])

  /** Khi chuyển sang xem đơn khác (initialHdbCt/initialChiTiet đổi) mà form vẫn mở: đồng bộ toàn bộ state từ props để hiển thị đúng đơn mới. */
  useEffect(() => {
    if (!readOnly || initialHdbCt == null) return
    const d = initialHdbCt as HopDongBanChungTuRecord & { hinh_thuc?: string; dia_chi_cong_trinh?: string }
    setApDungVatGtgt(deriveApDungVatGtgtTuBanGhi(initialHdbCt))
    setTenNguoiLienHe((initialHdbCt.ten_nguoi_lien_he ?? '').trim())
    setSoDienThoaiLienHe((initialHdbCt.so_dien_thoai_lien_he ?? '').trim())
    setSoDienThoaiCaNhan((initialHdbCt.so_dien_thoai ?? '').trim())
    setTlCkInput(
      initialHdbCt.tl_ck != null && typeof initialHdbCt.tl_ck === 'number' && Number.isFinite(initialHdbCt.tl_ck)
        ? initialHdbCt.tl_ck === 0
          ? '0'
          : formatSoThapPhan(initialHdbCt.tl_ck, 3)
        : '0',
    )
    setTienCkInput(
      initialHdbCt.tien_ck != null && typeof initialHdbCt.tien_ck === 'number' && Number.isFinite(initialHdbCt.tien_ck)
        ? formatSoTienHienThi(initialHdbCt.tien_ck)
        : formatSoTienHienThi(0),
    )
    setKhachHangDisplay(initialHdbCt.khach_hang ?? '')
    setDiaChi(initialHdbCt.dia_chi ?? '')
    setNguoiGiaoHang(initialHdbCt.nguoi_giao_hang ?? '')
    setMaSoThue(initialHdbCt.ma_so_thue ?? '')
    setDienGiai(initialHdbCt.dien_giai ?? '')
    setNvMuaHang(initialHdbCt.nv_ban_hang ?? '')
    setDieuKhoanTT(initialHdbCt.dieu_khoan_tt ?? '')
    setSoNgayDuocNo(initialHdbCt.so_ngay_duoc_no ?? '0')
    setHinhThucSelectedIds(deriveHinhThucSelectedIdsFromRecord(d))
    setDiaChiCongTrinh(d.dia_chi_cong_trinh ?? '')
    const dgh = (initialHdbCt.dia_diem_giao_hang ?? '').trim()
    setDiaDiemGiaoHangList(dgh ? dgh.split(/\r?\n/).map((x) => x.trim()).filter(Boolean) : [''])
    setDieuKhoanKhac(initialHdbCt.dieu_khoan_khac ?? '')
    // [BaoGia] Bỏ setSelectedDoiChieuDonMuaId
    // setSelectedDoiChieuDonMuaId(initialHdbCt.doi_chieu_don_mua_id ?? null)
    if (phieuNhanTuBaoGia && initialHdbCt.doi_chieu_don_mua_id) {
      const linked = hopDongBanChungTuGetAll({ ...getDefaultHopDongBanChungTuFilter(), tu: '', den: '' }).find((x) => x.id === initialHdbCt.doi_chieu_don_mua_id)
      setThamChieu(
        linked ? formatNhanHangTuTuBaoGia(linked) : (initialHdbCt.so_chung_tu_cukcuk ?? '').toUpperCase(),
      )
    } else {
      setThamChieu(initialHdbCt.so_chung_tu_cukcuk ?? '')
    }
    setNgayDonHang(parseIsoToDate(initialHdbCt.ngay_lap_hop_dong))
    setSoDonHang(initialHdbCt.so_hop_dong)
    setTinhTrang(normalizeTinhTrangPhieuNvthhForForm(initialHdbCt.tinh_trang, laPhieuNhanNvthh))
    setNgayGiaoHang(parseIsoToDate(initialHdbCt.ngay_cam_ket_giao))
    if (initialHdbCt.chung_tu_mua_chua_thanh_toan) setChungTuMuaCachThanhToan('chua_thanh_toan')
    else if (initialHdbCt.chung_tu_mua_thanh_toan_ngay) setChungTuMuaCachThanhToan('thanh_toan_ngay')
    else setChungTuMuaCachThanhToan('thanh_toan_ngay')
    setChungTuMuaPttt(normalizeChungTuMuaPtttStored(initialHdbCt.chung_tu_mua_pttt))
    setChungTuMuaLoaiHd(initialHdbCt.chung_tu_mua_loai_hd === 'gtgt' ? 'gtgt' : 'hd_le')
    setPhieuSoHoaDon((initialHdbCt.chung_tu_mua_so_hoa_don ?? '').trim())
    {
      const iso = (initialHdbCt.hoa_don_ngay ?? '').trim()
      if (iso) {
        const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
        setHoaDonNgay(
          m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : parseIsoToDate(iso),
        )
      } else {
        setHoaDonNgay(null)
      }
    }
    setHoaDonKyHieu((initialHdbCt.hoa_don_ky_hieu ?? '').trim())
    setMauHoaDonMa((initialHdbCt.mau_hoa_don_ma ?? '').trim())
    setMauHoaDonTen((initialHdbCt.mau_hoa_don_ten ?? '').trim())
    setPhieuChiKH(initialHdbCt.phieu_chi_nha_cung_cap ?? '')
    setPhieuChiDiaChi(initialHdbCt.phieu_chi_dia_chi ?? '')
    setPhieuChiNguoiNhanTien(initialHdbCt.phieu_chi_nguoi_nhan_tien ?? '')
    setPhieuChiLyDo(initialHdbCt.phieu_chi_ly_do ?? '')
    setPhieuChiNgay(parseIsoToDate(initialHdbCt.phieu_chi_ngay ?? null))
    setPhieuChiTaiKhoanChi(initialHdbCt.phieu_chi_tai_khoan_chi ?? '')
    setPhieuChiNganHangChi(initialHdbCt.phieu_chi_ngan_hang_chi ?? initialHdbCt.phieu_chi_ngan_hang ?? '')
    setPhieuChiTenNguoiGui(initialHdbCt.phieu_chi_ten_nguoi_gui ?? '')
    setPhieuChiTaiKhoanNhan(initialHdbCt.phieu_chi_tai_khoan_nhan ?? '')
    setPhieuChiNganHangNhan(initialHdbCt.phieu_chi_ngan_hang_nhan ?? '')
    setPhieuChiTenChuTkNhan(initialHdbCt.phieu_chi_ten_chu_tk_nhan ?? initialHdbCt.phieu_chi_ten_nguoi_nhan_ck ?? '')
    const pca = initialHdbCt.phieu_chi_attachments
    setPhieuChiAttachments(Array.isArray(pca) && pca.length ? pca.map((x) => ({ ...x })) : [])
    dienGiaiPhieuTuChinhRef.current = true
    if (initialChiTiet && initialChiTiet.length > 0) setLines(chiTietToBaoGiaLines(initialChiTiet))
    else setLines([])
    const att = initialHdbCt.attachments
    const rawAtt = Array.isArray(att) ? att.map((x) => ({ ...x })) : []
    if (rawAtt.length === 0) setAttachments([])
    else {
      const so = (initialHdbCt.so_hop_dong ?? '').trim() || 'BG'
      const khPart = partMccForPath('')
      setAttachments(chuanHoaDuongDanDinhKemHopDongBanChungTu(rawAtt, so, khPart))
    }
    setAttachmentsDirty(false)
    setEditingFromView(false)
  }, [readOnly, initialHdbCt?.id, initialHdbCt, initialChiTiet, laPhieuNhanNvthh, phieuNhanTuBaoGia])

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
    if (activeDiaDiemIndex != null && diaDiemSuggestions.length > 0 && refDiaDiemGiaoHangWrap.current) {
      const r = refDiaDiemGiaoHangWrap.current.getBoundingClientRect()
      setDiaDiemSuggestionRect({ top: r.bottom, left: r.left, width: Math.max(r.width, 200) })
    } else {
      setDiaDiemSuggestionRect(null)
    }
  }, [activeDiaDiemIndex, diaDiemSuggestions.length])

  useLayoutEffect(() => {
    if (!scrollChiTietSauThemDongRef.current) return
    scrollChiTietSauThemDongRef.current = false
    const el = refChiTietGridScroll.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [lines])

  useEffect(() => {
    if (activeDiaDiemIndex == null) return
    const onMouseDown = (e: MouseEvent) => {
      if (refDiaDiemGiaoHangWrap.current?.contains(e.target as Node)) return
      if ((e.target as HTMLElement).closest('[data-dia-diem-gh-dropdown]')) return
      setActiveDiaDiemIndex(null)
      setDiaDiemSuggestions([])
    }
    window.addEventListener('mousedown', onMouseDown)
    return () => window.removeEventListener('mousedown', onMouseDown)
  }, [activeDiaDiemIndex])

  /** Đồng bộ Địa điểm NH từ hình thức (địa chỉ công trình theo thứ tự slot). */
  useEffect(() => {
    if (effectiveReadOnly) return
    const order = buildHinhThucDiaDiemOrder(hinhThucSelectedIds, hinhThucList)
    const addrs: string[] = []
    for (const _ of order) {
      addrs.push(diaChiCongTrinh ?? '')
    }
    if (addrs.length > 0) {
      setDiaDiemGiaoHangList((prev) => {
        const merged = [...addrs]
        for (let i = addrs.length; i < prev.length; i++) {
          const t = (prev[i] ?? '').trim()
          if (t) merged.push(prev[i] ?? '')
        }
        return merged.length > 0 ? merged : ['']
      })
    }
  }, [effectiveReadOnly, hinhThucSelectedIds, diaChiCongTrinh, hinhThucList])

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

  const handleDiaDiemAddressChange = useCallback((index: number, value: string) => {
    setDiaDiemGiaoHangList((prev) => {
      const n = [...prev]
      n[index] = value
      return n
    })
    const order = buildHinhThucDiaDiemOrder(hinhThucSelectedIds, hinhThucList)
    if (order[index]?.type === 'dia_chi_dd') setDiaChiCongTrinh(value)
    setActiveDiaDiemIndex(index)
    if (diaDiemDebounceRef.current) clearTimeout(diaDiemDebounceRef.current)
    if (!value.trim()) {
      setDiaDiemSuggestions([])
      return
    }
    diaDiemDebounceRef.current = setTimeout(() => {
      diaDiemDebounceRef.current = null
      suggestAddressVietnam(value)
        .then((list) => setDiaDiemSuggestions(list.slice(0, 5)))
        .catch(() => setDiaDiemSuggestions([]))
    }, 300)
  }, [hinhThucSelectedIds, hinhThucList])

  const handleSelectDiaDiemSuggestion = useCallback((addr: string, index: number) => {
    setDiaDiemGiaoHangList((prev) => {
      const n = [...prev]
      n[index] = addr
      return n
    })
    const order = buildHinhThucDiaDiemOrder(hinhThucSelectedIds, hinhThucList)
    if (order[index]?.type === 'dia_chi_dd') setDiaChiCongTrinh(addr)
    setDiaDiemSuggestions([])
  }, [hinhThucSelectedIds, hinhThucList])

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
    const ddh = kh.dia_diem_giao_hang
    const khDiaChi = Array.isArray(ddh) && ddh.length > 0 ? ddh[0] : (typeof ddh === 'string' ? ddh : '') || ''
    const defaultAddr = '105 Đường số 02, Khu CBGV ĐHCT, P. Tân An, TP. Cần Thơ'
    const first = khDiaChi || defaultAddr
    setDiaDiemGiaoHangList((prev) => (prev.length === 1 && !prev[0] ? [first] : [first, ...prev.slice(1)]))
    if (phieuNhanTuBaoGia && chungTuMuaPttt === 'chuyen_khoan') {
      const v = getPhieuChiNhanFieldsTuKh(kh)
      setPhieuChiTaiKhoanNhan(v.stk)
      setPhieuChiNganHangNhan(v.nganHang)
      setPhieuChiTenChuTkNhan(v.tenChuTk)
    }
  }

  /** Nạp draft chỉ khi form thêm mới (không có initialHdbCt), không ở chế độ xem. */
  useEffect(() => {
    if (initialHdbCt != null || effectiveReadOnly || draftLoadedRef.current || vatTuList.length === 0) return
    const d = api.getDraft()
    if (!d || d.length === 0) return
    draftLoadedRef.current = true
    const LEGACY_TEN_COL = 'Tên sản phẩm, hàng hóa' as const
    const enriched = d.map((l) => {
      const row = { ...(l as Record<string, string>) }
      const legacyTen = row[LEGACY_TEN_COL]
      if (legacyTen != null && (row[DON_HANG_BAN_COL_TEN_SPHH] ?? '').trim() === '') {
        row[DON_HANG_BAN_COL_TEN_SPHH] = legacyTen
      }
      delete row[LEGACY_TEN_COL]
      const legVthh = row['Tên VTHH']
      if (legVthh != null && (row[DON_HANG_BAN_COL_TEN_SPHH] ?? '').trim() === '') {
        row[DON_HANG_BAN_COL_TEN_SPHH] = legVthh
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
  }, [vatTuList, effectiveReadOnly, initialHdbCt])

  /** Lưu draft chỉ khi form thêm mới (không sửa đơn có sẵn), mỗi khi các dòng thay đổi. */
  useEffect(() => {
    if (initialHdbCt != null || effectiveReadOnly || lines.length === 0) return
    api.setDraft(lines)
  }, [lines, effectiveReadOnly, initialHdbCt])

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
    setLines((prev) => enrichDonHangBanGridLinesWithVthh(prev, vatTuList))
  }, [vatTuList, prefillChiTiet])

  // [BaoGia] Bỏ logic đối chiếu - không cần enrich từ selectedDoiChieuDonMuaId
  // const dropdownEnrichedRef = useRef<string | null>(null)
  // useEffect(() => {
  //   if (!selectedDoiChieuDonMuaId) { dropdownEnrichedRef.current = null; return }
  //   if (vatTuList.length === 0 || lines.length === 0) return
  //   if (dropdownEnrichedRef.current === selectedDoiChieuDonMuaId) return
  //   dropdownEnrichedRef.current = selectedDoiChieuDonMuaId
  //   setLines((prev) => enrichDonHangBanGridLinesWithVthh(prev, vatTuList))
  // }, [selectedDoiChieuDonMuaId, vatTuList.length, lines.length])

  /** [YC30] Tính Số lượng từ Kích thước nếu VTHH có công thức */
  const calculateSoLuongFromKichThuoc = (line: HopDongBanChungTuGridLineRow): string => {
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
  const syncDonGiaTheoBacVaSl = (row: HopDongBanChungTuGridLineRow): HopDongBanChungTuGridLineRow => {
    if (!row._vthh || !(initialHdbCt != null || mauHienTai === 'codongia')) return row
    const sl = Math.max(0, parseFloatVN(row['Số lượng'] ?? '')) || 1
    const dvt = (row['ĐVT'] ?? '').trim() || (row._vthh.dvt_chinh ?? '')
    return { ...row, 'Đơn giá': getDonGiaBanDonHangBanLine(row._vthh, dvt, sl) } as unknown as HopDongBanChungTuGridLineRow
  }

  const handleChonVthh = (vthh: VatTuHangHoaRecord, rowIndex: number) => {
    const next = [...lines]
    if (rowIndex < 0 || rowIndex >= next.length) return
    const row = { ...next[rowIndex] } as Record<string, string> & { _dvtOptions?: string[]; _vthh?: VatTuHangHoaRecord }
    row['Mã'] = vthh.ma
    row[DON_HANG_BAN_COL_TEN_SPHH] = vthh.ten ?? ''
    row['ĐVT'] = vthh.dvt_chinh ?? ''
    row._vthh = vthh
    const isCodongia = initialHdbCt != null || mauHienTai === 'codongia'
    if (isCodongia) {
      if (apDungVatGtgt) row['% thuế GTGT'] = vthh.thue_suat_gtgt ?? ''
      else row['% thuế GTGT'] = ''
      const sl = Math.max(0, parseFloatVN(row['Số lượng'] ?? '')) || 1
      row['Đơn giá'] = getDonGiaBanDonHangBanLine(vthh, (row['ĐVT'] ?? '').trim() || (vthh.dvt_chinh ?? ''), sl)
    }
    const opts = buildDvtOptionsForVthh(vthh)
    if (opts) row._dvtOptions = opts
    else delete row._dvtOptions
    if ((row[COL_DD_GH] ?? '').trim() === '') row[COL_DD_GH] = '0'
    next[rowIndex] = row
    setLines(next)
    setVthhDropdownRowIndex(null)
    setVthhDropdownRect(null)
  }

  /** Địa điểm NH 1: sync từ useEffect theo hình thức (kho.dia_chi, diaChiCongTrinh). */
  const effectiveDiaDiemFirst = diaDiemGiaoHangList[0] ?? ''

  useEffect(() => {
    const opts = getDiaDiemNhOptions(diaDiemGiaoHangList, effectiveDiaDiemFirst)
    const allowed = new Set(opts.map((o) => o.idx))
    setLines((prev) => {
      let changed = false
      const next = prev.map((line) => {
        if ((line['Mã'] ?? '').trim() === '') return line
        const raw = (line[COL_DD_GH] ?? '').trim()
        const n = parseInt(raw, 10)
        if (raw === '' || !Number.isFinite(n) || !allowed.has(n)) {
          changed = true
          return { ...line, [COL_DD_GH]: String(opts[0]?.idx ?? 0) } as unknown as HopDongBanChungTuGridLineRow
        }
        return line
      })
      return changed ? next : prev
    })
  }, [diaDiemGiaoHangList, effectiveDiaDiemFirst])

  const buildPayload = (): HopDongBanChungTuCreatePayload => {
    const coBang =
      initialHdbCt != null || Boolean(prefillChiTiet && prefillChiTiet.length > 0) || mauHienTai === 'codongia'
    const apVat = coBang && apDungVatGtgt
    const { tongTienHang, tienThue: tienThueRaw } = computeDonHangMuaFooterTotals(lines, { apDungVatGtgt: apVat })
    const tienThue = apVat ? tienThueRaw : 0
    const tienCkTinh = Math.max(0, parseFloatVN(tienCkInput || '0'))
    const ttTongThanhToan = tongTienHang + tienThue - tienCkTinh
    const loaiKhDer = loaiKhachHangHienThi ?? 'doanh_nghiep'
    const laCaNhan = loaiKhDer === 'ca_nhan'
    const isCodongia = initialHdbCt != null || mauHienTai === 'codongia'
    let giaTriDonHang = 0
    const chiTiet = lines
      .filter((line) => (line['Mã'] ?? '').trim() !== '')
      .map((line) => {
        const donGia = isCodongia ? parseFloatVN(line['Đơn giá'] ?? '') : 0
        const soLuong = Math.max(0, parseFloatVN(line['Số lượng'] ?? ''))
        const thanhTien = isCodongia ? donGia * soLuong : 0
        const pt = isCodongia && apVat ? parsePctThueGtgtFromLine(line['% thuế GTGT'] ?? '') : null
        const tienThueLine = pt != null ? (thanhTien * pt) / 100 : 0
        giaTriDonHang += thanhTien + (apVat ? tienThueLine : 0)
        const ddRaw = (line[COL_DD_GH] ?? '').trim()
        let ddIdx = parseInt(ddRaw, 10)
        if (!Number.isFinite(ddIdx) || ddIdx < 0) ddIdx = 0
        return {
          ma_hang: (line['Mã'] ?? '').trim(),
          ten_hang: (line[DON_HANG_BAN_COL_TEN_SPHH] ?? '').trim(),
          noi_dung: (line['Nội dung'] ?? '').trim(),
          dvt: (line['ĐVT'] ?? '').trim(),
          so_luong: soLuong,
          don_gia: donGia,
          thanh_tien: thanhTien,
          pt_thue_gtgt: pt,
          tien_thue_gtgt: pt != null ? tienThueLine : null,
          dd_th_index: ddIdx,
          ...(isCodongia ? { ghi_chu: (line['Ghi chú'] ?? '').trim() } : {}),
        }
      })
    const diaDiemGiaoHangFull = [effectiveDiaDiemFirst.trim(), ...diaDiemGiaoHangList.slice(1).map((x) => x.trim()).filter(Boolean)].filter(Boolean).join('\n') || effectiveDiaDiemFirst.trim()
    const ngayGiaoHangPayload =
      phieuNhanTuBaoGia ? ngayGiaoHang ?? ngayDonHang : ngayGiaoHang
    const payload: HopDongBanChungTuCreatePayload = {
      loai_khach_hang: loaiKhDer,
      ten_nguoi_lien_he: !laCaNhan ? tenNguoiLienHe.trim() || undefined : undefined,
      so_dien_thoai_lien_he: !laCaNhan ? soDienThoaiLienHe.trim() || undefined : undefined,
      so_dien_thoai: laCaNhan ? soDienThoaiCaNhan.trim() || undefined : undefined,
      tinh_trang: tinhTrang,
      ngay_lap_hop_dong: toIsoDate(ngayDonHang) || toIsoDate(new Date()),
      so_hop_dong: soDonHang.trim() || 'BG',
      ngay_cam_ket_giao: ngayGiaoHangPayload ? toIsoDateTime(ngayGiaoHangPayload) : null,
      khach_hang: khachHangDisplay.trim(),
      dia_chi: diaChi.trim(),
      ...(laPhieuNhanNvthh ? { nguoi_giao_hang: nguoiGiaoHang.trim() } : {}),
      ma_so_thue: laCaNhan ? '' : maSoThue.trim(),
      dien_giai: dienGiai.trim(),
      nv_ban_hang: nvMuaHang.trim(),
      dieu_khoan_tt: dieuKhoanTT.trim(),
      so_ngay_duoc_no: soNgayDuocNo.trim() || '0',
      dia_diem_giao_hang: diaDiemGiaoHangFull,
      dieu_khoan_khac: dieuKhoanKhac.trim(),
      tong_tien_hang: tongTienHang,
      tong_thue_gtgt: tienThue,
      tong_thanh_toan: ttTongThanhToan,
      ap_dung_vat_gtgt: apVat,
      tl_ck: (() => {
        const t = parseFloatVN(tlCkInput || '')
        return Number.isFinite(t) && t >= 0 ? t : undefined
      })(),
      tien_ck: tienCkTinh > 0 ? tienCkTinh : undefined,
      so_chung_tu_cukcuk: thamChieu.trim(),
      ...(initialHdbCt?.bao_gia_id != null || prefillHdbCt?.bao_gia_id != null
        ? {
            bao_gia_id: (initialHdbCt?.bao_gia_id ?? prefillHdbCt?.bao_gia_id) || undefined,
            so_bao_gia_goc: (initialHdbCt?.so_bao_gia_goc ?? prefillHdbCt?.so_bao_gia_goc) || undefined,
          }
        : {}),
      chiTiet,
      hinh_thuc:
        hasNhapKho && hasKhongNhapKho ? 'ca_hai' : hasKhongNhapKho && !hasNhapKho ? 'khong_nhap_kho' : 'nhap_kho',
      dia_chi_cong_trinh: diaChiCongTrinh?.trim() || undefined,
      attachments:
        attachments.length > 0
          ? chuanHoaDuongDanDinhKemHopDongBanChungTu(attachments, soDonHang.trim() || 'DHM', khPartDinhKem)
          : undefined,
      ...(phieuNhanTuBaoGia
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
                ? chuanHoaDuongDanDinhKemHopDongBanChungTu(phieuChiAttachments, soDonHang.trim() || 'DHM', khPartDinhKem)
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
    if (!thamChieu.trim()) {
      return fail(
        'doi_chieu',
        laPhieuNhanNvthh
          ? phieuNhanTuBaoGia
            ? 'Vui lòng chọn hoặc nhập hợp đồng bán (Nhận hàng từ).'
            : 'Vui lòng chọn hoặc nhập mã hợp đồng bán đối chiếu.'
          : 'Vui lòng nhập Hợp đồng bán.',
        refTieuDeInput.current,
      )
    }
    if (!khachHangDisplay.trim()) {
      return fail('kh', 'Vui lòng chọn Khách hàng.', refKhWrap.current?.querySelector('input') ?? refKhWrap.current)
    }
    const tgGiaoHangTenLoi =
      phieuNhanTuBaoGia && phieuNhanTabChung === 'phieu-chi' ? 'TG chi' : 'TG nhận hàng'
    if (phieuNhanTuBaoGia) {
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
    } else if (!ngayGiaoHang) {
      return fail('tg_nhan', `Vui lòng chọn ${tgGiaoHangTenLoi}.`, refTgNhanBGInput.current)
    }
    if (!soDonHang.trim()) {
      return fail('so_don', `${soDonLabelHienThi} không được để trống.`, null)
    }
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
    if (
      !phieuNhanTuBaoGia &&
      ngayGiaoHang &&
      ngayDonHang &&
      ngayGiaoHang.getTime() < ngayDonHang.getTime()
    ) {
      return fail('tg_nhan', `${tgGiaoHangTenLoi} không được nhỏ hơn TG tạo.`, refTgNhanBGInput.current)
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
      if (initialHdbCt) {
        api.put(initialHdbCt.id, payload)
      } else {
        api.post(payload)
      }
      api.clearDraft()
      setUnsavedChanges(false)
      setAttachmentsDirty(false)
      onSaved?.()
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
  /** [YC32] Hạn thanh toán = TG tạo hợp đồng bán (ngayDonHang) + số ngày được nợ */
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
    initialHdbCt != null || Boolean(prefillChiTiet && prefillChiTiet.length > 0)
  const hienThiFooterTongTien = coBangCoDonGiaTuDau || mauHienTai === 'codongia'
  const currentColumns = useMemo((): readonly string[] => {
    if (!hienThiFooterTongTien) return mauHdbCtKhongDonGiaDisplay as readonly string[]
    return (apDungVatGtgt ? mauHdbCtCoDonGiaDisplay : mauHdbCtCoDonGiaKhongVatDisplay) as readonly string[]
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

  const tinhTrangSelectOptions = useMemo(() => {
    const base = TINH_TRANG_OPTIONS_FORM.map((o) =>
      laPhieuNhanNvthh && o.value === TINH_TRANG_HOP_DONG_BAN_CT_DA_GUI_KHACH
        ? { value: TINH_TRANG_NVTHH_DA_NHAP_KHO, label: TINH_TRANG_NVTHH_DA_NHAP_KHO }
        : { value: o.value, label: o.label }
    )
    if (tinhTrang && !base.some((o) => o.value === tinhTrang)) {
      return [...base, { value: tinhTrang, label: tinhTrang }]
    }
    return base
  }, [tinhTrang, laPhieuNhanNvthh])

  const phieuNhanLienKetTuDonMua = useMemo(() => {
    if (!initialHdbCt?.id || phieuNhanTuBaoGia) return []
    const all = nhanVatTuHangHoaGetAll({ ...getDefaultNhanVatTuHangHoaFilter(), tu: '', den: '' })
    return all.filter((p) => (p.doi_chieu_don_mua_id ?? '').trim() === initialHdbCt.id)
  }, [initialHdbCt?.id, phieuNhanTuBaoGia])

  const showLienQuanPhieuNhanHang =
    !phieuNhanTuBaoGia &&
    Boolean(initialHdbCt?.id) &&
    tinhTrang === TINH_TRANG_HOP_DONG_BAN_CT_DA_GUI_KHACH

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
          style={{ ...titleBarDrag, cursor: onHeaderPointerDown && dragging ? 'grabbing' : onHeaderPointerDown ? 'grab' : 'default' }}
        >
          {phieuNhanTuBaoGia
            ? tieuDePhieuNvthhDayDu
            : (() => {
                const modeHead = initialHdbCt ? (effectiveReadOnly ? 'Xem' : 'Sửa') : 'Thêm'
                const tc = (thamChieu ?? '').trim()
                const tieuDePart = tc ? ` - "${tc.toUpperCase()}"` : ''
                const khPart = khachHangDisplay ? ` - ${khachHangDisplay.toUpperCase()}` : ''
                return `${modeHead} Hợp đồng bán${tieuDePart}${khPart}`
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
        {readOnly && effectiveReadOnly && !donDaNhanHangXem && !donHuyBoChiXem && !viewOnlyLocked && (
          <button type="button" style={toolbarBtnAccent} onClick={() => setEditingFromView(true)}><Pencil size={14} /> Sửa</button>
        )}
        {!effectiveReadOnly && (
          <button type="button" style={toolbarBtnAccent} onClick={handleLuuVaDong} disabled={dangLuu}><Save size={14} /> {dangLuu ? 'Đang lưu...' : 'Lưu'}</button>
        )}
        {!phieuNhanTuBaoGia && (
          <div style={toolbarDinhKemWrap}>
            <button
              ref={refDinhKemBtn}
              type="button"
              style={toolbarBtn}
              title={dktkPendingUploadRows.length > 0 ? 'Đang đọc file đính kèm vào bộ nhớ…' : 'Đính kèm thiết kế (dktk)'}
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
              Đính kèm thiết kế
            </button>
            {attachments.length > 0 && (
              <span style={toolbarDinhKemBadge} aria-label={`${attachments.length} file đính kèm`}>
                {attachments.length > 99 ? '99+' : attachments.length}
              </span>
            )}
          </div>
        )}
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
          <button type="button" style={toolbarBtn} disabled={effectiveReadOnly || initialHdbCt != null || phieuNhanTuBaoGia}>
            <FileText size={14} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>Mẫu <ChevronDown size={10} /></span>
          </button>
          {dropdownMau && !effectiveReadOnly && initialHdbCt == null && !phieuNhanTuBaoGia && (
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
                        setLines((prev) => (prev.length > 0 ? migrateDonHangBanLinesToCoDonGia(prev, vatTuList) : mauCoDonGiaLines()))
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
        open={deleteDiaDiemModal != null}
        onClose={() => setDeleteDiaDiemModal(null)}
        title="Xác nhận xóa địa điểm giao hàng"
        size="sm"
        footer={
          <>
            <button type="button" style={toolbarBtn} onClick={() => setDeleteDiaDiemModal(null)}>Hủy</button>
            <button type="button" style={{ ...toolbarBtn, background: 'var(--accent)', color: 'var(--accent-text)', borderColor: 'var(--accent)' }} onClick={() => {
              const m = deleteDiaDiemModal
              if (!m) return
              if (m.index === 0) setDiaDiemGiaoHangList([''])
              else setDiaDiemGiaoHangList((prev) => prev.length > 1 ? prev.filter((_, j) => j !== m.index) : [''])
              setDeleteDiaDiemModal(null)
            }}>Đồng ý</button>
          </>
        }
      >
        {deleteDiaDiemModal && (
          <>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)' }}>Bạn có chắc chắn xóa địa chỉ giao hàng?</p>
            <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-word' }}>{deleteDiaDiemModal.content}</p>
          </>
        )}
      </Modal>

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

      {/* [BaoGia] Bỏ modal chọn hợp đồng bán đối chiếu - không áp dụng cho Hợp đồng bán */}
      {false && (
        <Modal
          open={false}
          onClose={() => {}}
          title="Chọn hợp đồng bán"
          size="md"
        >
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {(() => {
              const bgChonTuDonList = baoGiaListForDoiChieuNhanHang()
              return (
                <>
                  {bgChonTuDonList.map((bg) => {
                    const ngayDdMm = formatIsoToDdMmYyyy(bg.ngay_lap_hop_dong)
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
                          applyChonBaoGiaDoiChieu(bg)
                          // [BaoGia] Bỏ setShowTimDonMuaHangPopup
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{bg.so_hop_dong}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bg.khach_hang || ''}</span>
                        <span style={{ color: 'var(--text-muted)', textAlign: 'right' }}>{ngayDdMm}</span>
                      </div>
                    )
                  })}
                  {bgChonTuDonList.length === 0 && (
                    <div style={{ padding: 16, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                      Không có hợp đồng bán đủ điều kiện đối chiếu.
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
        {phieuNhanTuBaoGia && (
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
            const thongTinChungFields = (
              <>
            {(!effectiveReadOnly || phieuNhanTuBaoGia || (thamChieu ?? '').trim() !== '') && (
            <div style={{ ...fieldRowDyn, alignItems: 'center' }}>
              <label style={labelStyle}>{phieuNhanTuBaoGia ? 'Nhận hàng từ:' : 'Hợp đồng bán'}</label>
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
                    {/* [BaoGia] Bỏ logic link xem hợp đồng bán đối chiếu */}
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
                          // [BaoGia] Bỏ logic đối chiếu - không mở dropdown tự động
                        }}
                        onClick={() => {
                          // [BaoGia] Bỏ logic đối chiếu
                        }}
                        readOnly={false}
                        disabled={false}
                        placeholder={
                          phieuNhanTuBaoGia ? 'Bấm để chọn đơn Chưa thực hiện…' : 'Nhập hợp đồng bán'
                        }
                      />
                    </div>
                  </div>
                )}
                {hienThiFooterTongTien && (
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
            {/* [BaoGia] Bỏ logic dropdown đối chiếu đơn mua */}
            {false
              ? ReactDOM.createPortal(
                  (() => {
                    const q = thamChieu.trim().toLowerCase()
                    const listNvthhNhanTu = baoGiaListChoPhieuNhanTuBaoGia().filter((bg) => {
                      if (!q) return true
                      const ma = (bg.so_hop_dong ?? '').toLowerCase()
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
                          const ma = (bg.so_hop_dong ?? '').trim()
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
                                applyChonBaoGiaDoiChieu(bg)
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
                            Không có hợp đồng bán ở tình trạng Chờ duyệt.
                          </div>
                        )}
                      </div>
                    )
                  })(),
                  document.body,
                )
              : null}
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
                  {khList
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
                  {khList.filter((kh) => matchSearchKeyword(`${kh.ma_kh} ${kh.ten_kh}`, khSearchKeyword)).length === 0 && (
                    <div style={{ padding: '10px', fontSize: 11, color: 'var(--text-muted)' }}>Không tìm thấy Khách hàng phù hợp.</div>
                  )}
                </div>
              )}
            </div>
            {!phieuNhanTuBaoGia && laToChucKh ? (
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
            {phieuNhanTuBaoGia ? (
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
            {(!phieuNhanTuBaoGia || chungTuMuaCachThanhToan === 'chua_thanh_toan') && (
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
                  title={hanThanhToanDayDu ? 'TG tạo hợp đồng bán + số ngày được nợ' : 'Chưa đủ TG tạo hoặc số ngày được nợ — đang hiển thị ngày hiện tại'}
                />
              </div>
            </div>
            )}
            <div style={fieldRowDyn}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {(() => {
                  const diaDiemSlotOrder = buildHinhThucDiaDiemOrder(hinhThucSelectedIds, hinhThucList)
                  return diaDiemGiaoHangList.map((addr, i) => {
                    const slotType = diaDiemSlotOrder[i]?.type
                    const placeholder =
                      slotType === 'dia_chi_dd'
                        ? `Địa chỉ (ĐĐTH ${i + 1})`
                        : i === 0
                          ? 'Nhập địa chỉ (gợi ý VN)'
                          : `Địa điểm NH ${i + 1}`
                    return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
                    <label style={{ ...labelStyle, minWidth: 90, paddingTop: phieuNhanTuBaoGia ? 2 : 4 }}>Địa điểm NH {i + 1}</label>
                    <div
                      ref={i === activeDiaDiemIndex ? refDiaDiemGiaoHangWrap : undefined}
                      style={{ position: 'relative', flex: 1, minWidth: 0 }}
                    >
                      <div className="htql-address-wrap" style={{ width: '100%' }}>
                        <input
                          style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', paddingRight: 8 }}
                          value={i === 0 ? effectiveDiaDiemFirst : (addr ?? '')}
                          onChange={(e) => handleDiaDiemAddressChange(i, e.target.value)}
                          onFocus={() => {
                            setActiveDiaDiemIndex(i)
                            const v = (i === 0 ? effectiveDiaDiemFirst : (addr ?? '')).trim()
                            if (v && diaDiemDebounceRef.current) clearTimeout(diaDiemDebounceRef.current)
                            if (v) {
                              suggestAddressVietnam(v).then((list) => setDiaDiemSuggestions(list.slice(0, 5))).catch(() => setDiaDiemSuggestions([]))
                            }
                          }}
                          onBlur={() => { setTimeout(() => { setActiveDiaDiemIndex(null); setDiaDiemSuggestions([]) }, 200) }}
                          readOnly={effectiveReadOnly}
                          disabled={effectiveReadOnly}
                          placeholder={placeholder}
                        />
                      </div>
                    </div>
                    {!effectiveReadOnly && i > 0 && (
                      <button
                        type="button"
                        title="Xóa địa điểm"
                        onClick={() => {
                          const val = addr ?? ''
                          if (val.trim()) {
                            setDeleteDiaDiemModal({ index: i, content: val.trim() })
                          } else {
                            setDiaDiemGiaoHangList((prev) => prev.length > 1 ? prev.filter((_, j) => j !== i) : [''])
                          }
                        }}
                        style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, padding: 0, background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted)' }}
                        aria-label="Xóa"
                      ><Trash2 size={12} /></button>
                    )}
                  </div>
                    )
                  })
                })()}
                {!effectiveReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      const lastVal = diaDiemGiaoHangList[diaDiemGiaoHangList.length - 1]?.trim()
                      if (!lastVal) {
                        toastApi?.showToast('Vui lòng nhập địa chỉ giao hàng dòng trên trước khi thêm địa điểm mới.', 'info')
                        return
                      }
                      setDiaDiemGiaoHangList((prev) => [...prev, ''])
                    }}
                    style={{ alignSelf: 'flex-start', marginLeft: 98, marginTop: phieuNhanTuBaoGia ? 0 : undefined, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', fontSize: 10, background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  >
                    <Plus size={12} /> Thêm địa điểm GH
                  </button>
                )}
              </div>
            </div>
            </>
            )
            return phieuNhanTuBaoGia ? (
              <div style={{ flex: '1 1 320px', minWidth: 280, display: 'flex', flexDirection: 'column', alignSelf: 'stretch', marginBottom: 0, minHeight: 0 }}>
                <div className={bgDetailStyles.detailTabBar} role="tablist" aria-label="Thông tin chứng từ">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={phieuNhanTabChung === 'phieu-nhap'}
                    className={phieuNhanTabChung === 'phieu-nhap' ? bgDetailStyles.detailTabActive : bgDetailStyles.detailTab}
                    style={phieuTabBarBtnCompact}
                    onClick={() => setPhieuNhanTabChung('phieu-nhap')}
                  >
                    Phiếu nhập
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={phieuNhanTabChung === 'phieu-chi'}
                    className={phieuNhanTabChung === 'phieu-chi' ? bgDetailStyles.detailTabActive : bgDetailStyles.detailTab}
                    style={phieuTabBarBtnCompact}
                    onClick={() => setPhieuNhanTabChung('phieu-chi')}
                  >
                    Phiếu chi
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={phieuNhanTabChung === 'hoa-don'}
                    className={phieuNhanTabChung === 'hoa-don' ? bgDetailStyles.detailTabActive : bgDetailStyles.detailTab}
                    style={phieuTabBarBtnCompact}
                    onClick={() => setPhieuNhanTabChung('hoa-don')}
                  >
                    Hóa đơn
                  </button>
                </div>
                <div
                  className={bgDetailStyles.detailTabPanel}
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
                          value={phieuChiLyDo}
                          onChange={(e) => setPhieuChiLyDo(e.target.value)}
                          readOnly={effectiveReadOnly}
                          disabled={effectiveReadOnly}
                        />
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
                  className={bgDetailStyles.detailTabPanel}
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
              width: phieuNhanTuBaoGia ? 266 : 268,
              minWidth: phieuNhanTuBaoGia ? 266 : 268,
              marginBottom: 0,
              flexShrink: 0,
              ...(phieuNhanTuBaoGia ? { padding: '6px 8px', gap: FIELD_ROW_GAP } : {}),
              display: 'flex',
              flexDirection: 'column',
              alignSelf: 'stretch',
              minHeight: 0,
            }}
          >
            <div style={{ ...groupBoxTitle, ...(phieuNhanTuBaoGia ? { marginBottom: 4 } : {}) }}>
              {phieuNhanTuBaoGia ? (phieuNhanTabChung === 'hoa-don' ? 'Hóa đơn' : 'Chứng từ') : 'Hợp đồng bán'}
            </div>
            {phieuNhanTuBaoGia && phieuNhanTabChung === 'hoa-don' ? (
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
                    <select
                      className="htql-don-hang-select"
                      style={{ ...inputStyle, width: '100%', paddingRight: 6, boxSizing: 'border-box', textAlign: 'right' }}
                      value={tinhTrang}
                      onChange={(e) => setTinhTrang(e.target.value)}
                      disabled={effectiveReadOnly}
                    >
                      {tinhTrangSelectOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <>
                {phieuNhanTuBaoGia ? (
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
                          <select
                            className="htql-don-hang-select"
                            style={{ ...inputStyle, width: '100%', paddingRight: 6, boxSizing: 'border-box', textAlign: 'right' }}
                            value={tinhTrang}
                            onChange={(e) => setTinhTrang(e.target.value)}
                            disabled={effectiveReadOnly}
                          >
                            {tinhTrangSelectOptions.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
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
                          <select
                            className="htql-don-hang-select"
                            style={{ ...inputStyle, width: '100%', paddingRight: 6, boxSizing: 'border-box', textAlign: 'right' }}
                            value={tinhTrang}
                            onChange={(e) => setTinhTrang(e.target.value)}
                            disabled={effectiveReadOnly}
                          >
                            {tinhTrangSelectOptions.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  )
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
                        <select
                          className="htql-don-hang-select"
                          style={{ ...inputStyle, width: '100%', paddingRight: 6, boxSizing: 'border-box', textAlign: 'right' }}
                          value={tinhTrang}
                          onChange={(e) => setTinhTrang(e.target.value)}
                          disabled={effectiveReadOnly}
                        >
                          {tinhTrangSelectOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={fieldRowDyn}>
                      <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>TG nhận hàng</label>
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
              <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>NV bán hàng</label>
              <DonHangBoxValueLikeNvMuaHang
                readOnly={effectiveReadOnly}
                fixedBandWidth={phieuNhanTuBaoGia ? NVTHH_DON_HANG_BOX_VALUE_BAND_PX : undefined}
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
                <div className={bgDetailStyles.lienQuanPhieuNhanTitle}>Liên quan</div>
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
                            className={bgDetailStyles.lienQuanPhieuNhanLink}
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
                      <tr key={idx} className={baoGiaChiTietStyles.chiTietDataRow}>
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
                                          : col === COL_DD_GH
                                            ? (() => {
                                                const opts = getDiaDiemNhOptions(diaDiemGiaoHangList, effectiveDiaDiemFirst)
                                                const raw = (line[COL_DD_GH] ?? '').trim()
                                                const n = parseInt(raw, 10)
                                                const hit = Number.isFinite(n) ? opts.find((o) => o.idx === n) : undefined
                                                return hit?.label ?? (Number.isFinite(n) ? `ĐĐTH ${n + 1}` : opts[0]?.label ?? 'ĐĐTH 1')
                                              })()
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
                                    const prev = r[idx] as HopDongBanChungTuGridLineRow
                                    const nextRow = {
                                      ...prev,
                                      [col]: ma,
                                      [DON_HANG_BAN_COL_TEN_SPHH]: cleared ? '' : (item ? item.ten : prev[DON_HANG_BAN_COL_TEN_SPHH]),
                                      'ĐVT': cleared ? '' : (item ? (item.dvt_chinh ?? '') : prev['ĐVT']),
                                    } as unknown as HopDongBanChungTuGridLineRow
                                    const isCodongia = initialHdbCt != null || mauHienTai === 'codongia'
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
                                        nextRow['Đơn giá'] = getDonGiaBanDonHangBanLine(item, (nextRow['ĐVT'] ?? '').trim() || (item.dvt_chinh ?? ''), sl)
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
                            ) : col === DON_HANG_BAN_COL_TEN_SPHH ? (
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
                                  r[idx] = { ...r[idx], 'Nội dung': e.target.value } as unknown as HopDongBanChungTuGridLineRow
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
                                        const row = r[idx] as HopDongBanChungTuGridLineRow
                                        const newDvt = e.target.value
                                        const updates = { ...row, 'ĐVT': newDvt } as unknown as HopDongBanChungTuGridLineRow
                                        updates['Số lượng'] = calculateSoLuongFromKichThuoc(updates)
                                        if ((initialHdbCt != null || mauHienTai === 'codongia') && row._vthh) {
                                          const sl = Math.max(0, parseFloatVN(updates['Số lượng'] ?? '')) || 1
                                          updates['Đơn giá'] = getDonGiaBanDonHangBanLine(row._vthh, newDvt, sl)
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
                                  const updated = { ...r[idx], 'mD': raw } as unknown as HopDongBanChungTuGridLineRow
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
                                    let row = { ...r[idx], 'mD': '' } as unknown as HopDongBanChungTuGridLineRow
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
                                  const updated = { ...r[idx], 'mR': raw } as unknown as HopDongBanChungTuGridLineRow
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
                                    let row = { ...r[idx], 'mR': '' } as unknown as HopDongBanChungTuGridLineRow
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
                                  const updated = { ...r[idx], 'Lượng': formatSoNguyenInput(e.target.value) } as unknown as HopDongBanChungTuGridLineRow
                                  updated['Số lượng'] = calculateSoLuongFromKichThuoc(updated)
                                  r[idx] = syncDonGiaTheoBacVaSl(updated)
                                  setLines(r)
                                }}
                                onBlur={() => {
                                  const r = [...lines]
                                  const raw = (r[idx]['Lượng'] ?? '').trim()
                                  let n = parseInt(parseNumber(raw), 10)
                                  if (!Number.isFinite(n) || n < 1) n = 1
                                  const updated = { ...r[idx], 'Lượng': formatSoNguyenInput(String(n)) } as unknown as HopDongBanChungTuGridLineRow
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
                                  let row = { ...r[idx], [col]: val } as unknown as HopDongBanChungTuGridLineRow
                                  if (row._vthh && (initialHdbCt != null || mauHienTai === 'codongia')) {
                                    const sl = Math.max(0, parseFloatVN(val)) || 1
                                    row['Đơn giá'] = getDonGiaBanDonHangBanLine(
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
                                  let next = { ...r[idx], [col]: formatSoTienHienThi(val) } as unknown as HopDongBanChungTuGridLineRow
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
                                  r[idx] = { ...r[idx], 'Đơn giá': formatSoTien(e.target.value) } as unknown as HopDongBanChungTuGridLineRow
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
                            ) : col === COL_DD_GH ? (
                              chiTietReadOnly ? (
                                <input
                                  readOnly
                                  tabIndex={-1}
                                  className="misa-input-solo"
                                  style={{ ...inputStyle, width: '100%', cursor: 'default', border: '1px solid transparent', minHeight: 22, height: 22 }}
                                  value={(() => {
                                    const opts = getDiaDiemNhOptions(diaDiemGiaoHangList, effectiveDiaDiemFirst)
                                    const raw = (line[COL_DD_GH] ?? '').trim()
                                    const n = parseInt(raw, 10)
                                    const hit = Number.isFinite(n) ? opts.find((o) => o.idx === n) : undefined
                                    return hit?.label ?? (Number.isFinite(n) ? `ĐĐTH ${n + 1}` : opts[0]?.label ?? 'ĐĐTH 1')
                                  })()}
                                />
                              ) : (
                                <select
                                  className="misa-input-solo"
                                  style={{ ...inputStyle, width: '100%', minHeight: 22, height: 22, cursor: 'pointer' }}
                                  value={(() => {
                                    const opts = getDiaDiemNhOptions(diaDiemGiaoHangList, effectiveDiaDiemFirst)
                                    const cur = (line[COL_DD_GH] ?? '').trim()
                                    if (cur !== '' && opts.some((o) => String(o.idx) === cur)) return cur
                                    return String(opts[0]?.idx ?? 0)
                                  })()}
                                  onChange={(e) => {
                                    const r = [...lines]
                                    r[idx] = { ...r[idx], [COL_DD_GH]: e.target.value } as unknown as HopDongBanChungTuGridLineRow
                                    setLines(r)
                                  }}
                                >
                                  {getDiaDiemNhOptions(diaDiemGiaoHangList, effectiveDiaDiemFirst).map((o) => (
                                    <option key={o.idx} value={String(o.idx)}>{o.label}</option>
                                  ))}
                                </select>
                              )
                            ) : col === '% thuế GTGT' ? (
                              <select
                                className="misa-input-solo"
                                style={{ ...inputStyle, ...chiTietNumericInputStyle('% thuế GTGT'), width: '100%', minHeight: 22, height: 22, cursor: 'pointer' }}
                                value={line['% thuế GTGT'] ?? ''}
                                onChange={(e) => {
                                  const r = [...lines]
                                  r[idx] = { ...r[idx], '% thuế GTGT': e.target.value } as unknown as HopDongBanChungTuGridLineRow
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
                                onChange={(e) => { const r = [...lines]; r[idx] = { ...r[idx], [col]: e.target.value } as unknown as HopDongBanChungTuGridLineRow; setLines(r) }}
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
              {!chiTietReadOnly && !chiTietGridLocked && (
                <div style={{ flexShrink: 0, padding: '4px 8px', fontSize: 11, borderTop: '0.5px solid var(--border)', background: 'var(--bg-tab)', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ marginLeft: OFFSET_TRAI_COT_MA_SPHH, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        scrollChiTietSauThemDongRef.current = true
                        setLines([
                          ...lines,
                          createEmptyBaoGiaLine(mauHienTai === 'codongia' ? 'codongia' : 'khongdongia'),
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

        <div style={{ ...footerWrap, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Tổng chủng loại VT: {soDong}</span>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Tổng kiện hàng: {tongSoKienHangText}</span>
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
        </div>
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
            /* Trên overlay modal Hợp đồng bán (BanHang.module.css .modalOverlay z-index: 4000); thấp hơn 4000 thì list bị che, tưởng «không lọc được». */
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

      {activeDiaDiemIndex != null && diaDiemSuggestionRect && diaDiemSuggestions.length > 0 && ReactDOM.createPortal(
        <div
          data-dia-diem-gh-dropdown
          style={{
            position: 'fixed',
            top: diaDiemSuggestionRect.top,
            left: diaDiemSuggestionRect.left,
            width: diaDiemSuggestionRect.width,
            maxHeight: 220,
            overflowY: 'auto',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-strong)',
            borderRadius: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            zIndex: 4000,
          }}
        >
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} role="listbox">
            {diaDiemSuggestions.map((a, idx) => (
              <li
                key={idx}
                role="option"
                style={{
                  padding: '10px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  borderBottom: '1px solid var(--border)',
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelectDiaDiemSuggestion(a, activeDiaDiemIndex)}
              >
                {a}
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}

      <HopDongBanChungTuDinhKemModal
        open={showDinhKemModal}
        onClose={() => setShowDinhKemModal(false)}
        anchorRef={dinhKemModalAnchor === 'toolbar' ? refDinhKemBtn : refDinhKemDuoiGhiChu}
        attachments={attachments}
        onChange={patchAttachmentsFromUser}
        readOnly={effectiveReadOnly}
        soDonHangBanChungTu={soDonHang}
        maKhPathPart={khPartDinhKem}
        ngayGiaoHang={ngayGiaoHang}
        ngayDonHangBanChungTu={ngayDonHang}
        daDongBoLuuCsdl={daDongBoLuuCsdlDktk}
        pendingUploadRows={dktkPendingUploadRows}
        onPendingUploadRowsChange={setDktkPendingUploadRows}
      />

      <HopDongBanChungTuDinhKemModal
        open={showDinhKemPhieuChiModal}
        onClose={() => setShowDinhKemPhieuChiModal(false)}
        anchorRef={refPhieuChiDinhKemBtn}
        attachments={phieuChiAttachments}
        onChange={patchPhieuChiAttachmentsFromUser}
        readOnly={effectiveReadOnly}
        soDonHangBanChungTu={soDonHang}
        maKhPathPart={khPartDinhKem}
        ngayGiaoHang={ngayGiaoHang}
        ngayDonHangBanChungTu={ngayDonHang}
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
