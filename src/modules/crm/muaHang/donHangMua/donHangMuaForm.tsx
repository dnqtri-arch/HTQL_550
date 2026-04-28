import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import ReactDOM from 'react-dom'
import {
  Plus,
  Pencil,
  Save,
  Trash2,
  Paperclip,
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
  LOOKUP_CHEVRON_WIDTH,
  lookupInputWithChevronStyle,
  lookupChevronOverlayStyle,
  lookupActionButtonStyle,
} from '../../../../constants/lookupControlStyles'
import { loadDieuKhoanThanhToan, saveDieuKhoanThanhToan, nhaCungCapGetAll, type DieuKhoanThanhToanItem } from '../nhaCungCap/nhaCungCapApi'
import { NhaCungCap } from '../nhaCungCap/nhaCungCap'
import type { NhaCungCapRecord } from '../nhaCungCap/nhaCungCapApi'
import type { VatTuHangHoaRecord } from '../../../../types/vatTuHangHoa'
import { vatTuHangHoaGetAll } from '../../../kho/vatTuHangHoaApi'
import { donViTinhGetAll } from '../../../kho/donViTinhApi'
import { matchSearchKeyword } from '../../../../utils/stringUtils'
import { vietTatTenNganHang } from '../../../../utils/nganHangDisplay'
import { mau_dhmkhongdongia } from './donHangMuaGridMau'
import { loadKhoListFromStorage, saveKhoListToStorage, type KhoStorageItem } from '../../../kho/khoStorage'
import { formatSoNguyenInput, formatNumberDisplay, formatSoTien, formatSoTienHienThi, formatSoTuNhienInput, formatSoThapPhan, parseFloatVN } from '../../../../utils/numberFormat'
import {
  COL_DD_GH,
  buildDvtOptionsForVthh,
  migrateDonHangLinesToCoDonGia,
  chiTietToLines,
  getDonGiaMuaTheoDvt,
  computeDonHangMuaFooterTotals,
  enrichDonHangGridLinesWithVthh,
  formatDonHangLineThanhTienDisplay,
  formatDonHangLineTienThueDisplay,
  formatDonHangLineTongTienDisplay,
  parsePctThueGtgtFromLine,
  type DonHangMuaGridLineRow,
} from '../../../../utils/donHangMuaCalculations'
import {
  donHangMuaGetAll,
  donHangMuaGetChiTiet,
  getDefaultDonHangMuaFilter,
  getDateRangeForKy as dhmGetDateRangeForKy,
  KY_OPTIONS as DHM_KY_OPTIONS,
  donHangMuaPost,
  donHangMuaPut,
  donHangMuaDelete,
  getDonHangMuaDraft,
  setDonHangMuaDraft,
  clearDonHangMuaDraft,
  donHangMuaSoDonHangTiepTheo,
  type DonHangMuaCreatePayload,
  type DonHangMuaRecord,
  type DonHangMuaChiTiet,
  type DonHangMuaAttachmentItem,
  TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG,
} from './donHangMuaApi'
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
  TINH_TRANG_NVTHH_DA_NHAP_KHO,
  type NhanVatTuHangHoaRecord,
} from '../nhanVatTuHangHoa/nhanVatTuHangHoaApi'
import type { NhanVatTuHangHoaApi } from '../nhanVatTuHangHoa/nhanVatTuHangHoaApiContext'
import { NhanVatTuHangHoaApiProvider } from '../nhanVatTuHangHoa/nhanVatTuHangHoaApiContext'
import { NhanVatTuHangHoaFormModal } from '../nhanVatTuHangHoa/nhanVatTuHangHoaFormModal'
import { DonHangMuaDinhKemModal, chuanHoaDuongDanDinhKemDonHangMua, partMccForPath } from './donHangMuaDinhKemModal'
import { DonHangMuaApiProvider, useDonHangMuaApi, type DonHangMuaApi } from './donHangMuaApiContext'
import { setUnsavedChanges } from '../../../../context/unsavedChanges'
import { Modal } from '../../../../components/common/modal'
import { useToastOptional } from '../../../../context/toastContext'
import { HTQL_FORM_ERROR_BORDER, htqlFocusAndScrollIntoView } from '../../../../utils/formValidationFocus'
import { preserveTimeWhenCalendarDayChanges } from '../../../../utils/reactDatepickerPreserveTime'
import { ThemDieuKhoanThanhToanModal } from '../../shared/themDieuKhoanThanhToanModal'
import { ThemKhoModal } from '../../../kho/themKhoModal'
import { hinhThucGetAll, type HinhThucRecord } from '../../shared/hinhThucApi'
import { getBanksVietnam, type BankItem } from '../../shared/banksApi'
import { ThemHinhThucModal } from '../../shared/themHinhThucModal'
import { mauHoaDonGetAll, type MauHoaDonItem } from '../../shared/mauHoaDonApi'
import { ThemMauHoaDonModal } from '../../shared/themMauHoaDonModal'
import { suggestAddressVietnam } from '../../shared/addressAutocompleteApi'
import dmhDetailStyles from './DonHangMua.module.css'

const apiDonHangMua: DonHangMuaApi = {
  getAll: donHangMuaGetAll,
  getChiTiet: donHangMuaGetChiTiet,
  delete: donHangMuaDelete,
  getDefaultFilter: getDefaultDonHangMuaFilter,
  getDateRangeForKy: dhmGetDateRangeForKy,
  KY_OPTIONS: DHM_KY_OPTIONS,
  post: donHangMuaPost,
  put: donHangMuaPut,
  soDonHangTiepTheo: donHangMuaSoDonHangTiepTheo,
  getDraft: getDonHangMuaDraft,
  setDraft: setDonHangMuaDraft,
  clearDraft: clearDonHangMuaDraft,
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

registerLocale('vi', vi)

const FORM_FIELD_HEIGHT = LOOKUP_CONTROL_HEIGHT
/** Chiều rộng nhãn Thông tin chung — canh lề trái với Địa điểm GH (rule canh-le) */
const LABEL_MIN_WIDTH = 90
/** Khối Đơn hàng / Chứng từ / Hóa đơn (phiếu NVTHH): đồng bộ nhãn với hàng NV mua hàng */
const LABEL_DON_HANG_BOX = 82
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
/** MST: cố định chiều rộng, NCC chiếm phần còn lại của dòng */
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

export interface DonHangMuaFormProps {
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
  initialDon?: DonHangMuaRecord | null
  initialChiTiet?: DonHangMuaChiTiet[] | null
  /** Dữ liệu đổ sẵn khi tạo mới (chuyển từ chứng từ khác), không phải chế độ xem */
  prefillDon?: Partial<DonHangMuaRecord> | null
  prefillChiTiet?: DonHangMuaChiTiet[] | null
  /** Sau khi bấm Lưu (chỉ lưu): chuyển form sang chế độ xem đơn vừa lưu, không đóng form */
  onSavedAndView?: (don: DonHangMuaRecord) => void
  formTitle?: string
  soDonLabel?: string
  /** Phiếu nhận hàng: đối chiếu theo đơn mua hàng (chọn ĐMH + link xem). */
  doiChieuSource?: 'don_mua_hang'
  /** Tạo phiếu nhận từ menu ĐHM: prefill tiêu đề/HT/kho/ĐĐGH từ ĐHM (HT/kho/ĐĐGH cho phép sửa lại); lưới chỉ sửa Số lượng; TG tạo = hiện tại; tiêu đề form = `_tieu_de_nguon_dhm`. */
  phieuNhanTuDonHangMua?: boolean
  /** Phiếu nhận mở từ «Thêm mới» danh sách (không prefill ĐHM): lưới chi tiết giống form ĐHM (thêm/xóa dòng, sửa đủ cột). */
  phieuNhanThemMoiTuDanhSach?: boolean
  /** Xem phiếu/đơn từ popup: luôn chỉ đọc, ẩn nút Sửa (dùng với readOnly + initialDon). */
  viewOnlyLocked?: boolean
}

/** Tình trạng hiển thị trên form ĐHM / phiếu nhận (đủ bản ghi cũ: thêm option nếu giá trị đang lưu không nằm trong danh sách). */
const TINH_TRANG_OPTIONS_FORM = [
  { value: 'Chưa thực hiện', label: 'Chưa thực hiện' },
  { value: TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG, label: TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG },
  { value: 'Hủy bỏ', label: 'Hủy bỏ' },
] as const

/** Phiếu NVTHH: hiển thị «Đã nhập kho» thay cho cùng giá trị đồng bộ ĐHM «Đã nhận hàng». */
function normalizeTinhTrangPhieuNvthhForForm(tinh: string | undefined, laPhieuNhan: boolean): string {
  const t = (tinh ?? '').trim()
  const base = t === '' ? 'Chưa thực hiện' : t
  if (!laPhieuNhan) return base
  return base === TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG ? TINH_TRANG_NVTHH_DA_NHAP_KHO : base
}

/** Các mức thuế suất GTGT thiết lập trước (dropdown % thuế GTGT) */
const THUE_SUAT_GTGT_OPTIONS = [
  { value: '', label: 'Chưa xác định' },
  { value: '0', label: '0%' },
  { value: '5', label: '5%' },
  { value: '8', label: '8%' },
  { value: '10', label: '10%' },
] as const

/** Mẫu có đơn giá — mẫu không đơn giá + ĐG mua, Thành tiền, % thuế GTGT, Tiền thuế GTGT, Tổng tiền (rule mau_gia.mdc) */
const mau_dhmcodongia = [
  'Mã',
  'Tên VTHH',
  'Độ dày/ ĐL',
  'Khổ giấy',
  'ĐVT',
  'Số lượng',
  'ĐG mua',
  'Thành tiền',
  '% thuế GTGT',
  'Tiền thuế GTGT',
  'Tổng tiền',
] as const

/** Cột ĐĐGH — hằng COL_DD_GH từ utils/donHangMuaCalculations */
const mauDhmCoDonGiaDisplay = [...mau_dhmcodongia, COL_DD_GH, 'Ghi chú'] as const
const mauDhmKhongDonGiaDisplay = [...mau_dhmkhongdongia, COL_DD_GH] as const

/** Thứ tự ô Địa điểm GH: luôn **kho nhập** trước **tên công trình** (form phiếu NVTHH: hai trường cùng một hàng sau «Kho nhập»). */
function buildHinhThucDiaDiemOrder(
  hinhThucSelectedIds: string[],
  hinhThucList: { id: string; ten: string }[]
): { type: 'ten_cong_trinh' | 'kho_nhap' }[] {
  const khoSlots: { type: 'kho_nhap' }[] = []
  const ctSlots: { type: 'ten_cong_trinh' }[] = []
  for (const id of hinhThucSelectedIds) {
    const h = hinhThucList.find((x) => x.id === id)
    if (!h?.ten) continue
    if (/không nhập kho|khong nhap kho/i.test(h.ten)) ctSlots.push({ type: 'ten_cong_trinh' })
    else if (/nhập kho|nhap kho/i.test(h.ten) && !/không|khong/i.test(h.ten)) khoSlots.push({ type: 'kho_nhap' })
  }
  return [...khoSlots, ...ctSlots]
}

/**
 * Khôi phục checkbox hình thức từ bản ghi đã lưu.
 * - `ca_hai`: cả nhập kho + không nhập kho.
 * - Bản ghi cũ chỉ có `nhap_kho` nhưng còn tên/địa chỉ CT → bật thêm hình thức không nhập kho.
 */
function deriveHinhThucSelectedIdsFromRecord(
  d: Partial<DonHangMuaRecord> & { hinh_thuc?: string; kho_nhap_id?: string; ten_cong_trinh?: string; dia_chi_cong_trinh?: string } | null | undefined
): string[] {
  if (!d) return []
  const all = hinhThucGetAll()
  const htKho = all.find((x) => /nhập kho|nhap kho/i.test(x.ten) && !/không|khong/i.test(x.ten))
  const htCt = all.find((x) => /không nhập kho|khong nhap kho/i.test(x.ten))
  const mode = (d.hinh_thuc ?? '').trim()
  const coCt = Boolean((d.ten_cong_trinh ?? '').trim() || (d.dia_chi_cong_trinh ?? '').trim())
  const coKhoId = Boolean((d.kho_nhap_id ?? '').trim())
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
    if (coKhoId && htKho) ids.push(htKho.id)
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
/** Lưới chi tiết VTHH: cao theo nội dung (bảng + nút Thêm dòng), trần cuộn dọc khi vượt quá */

/** Danh sách option ĐĐgh theo các dòng địa điểm GH đang có nội dung. */
function getDiaDiemGhOptions(list: string[], effectiveFirst: string): { idx: number; label: string }[] {
  const opts: { idx: number; label: string }[] = []
  for (let i = 0; i < list.length; i++) {
    const text = i === 0 ? effectiveFirst : (list[i] ?? '')
    if (text.trim()) opts.push({ idx: i, label: `ĐĐGH ${i + 1}` })
  }
  if (opts.length === 0) opts.push({ idx: 0, label: 'ĐĐGH 1' })
  return opts
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

function buildDoDayOptionsForVthh(vthh?: VatTuHangHoaRecord | null): string[] | null {
  if (!vthh) return null
  const set = new Set<string>()
  const push = (raw?: string | null) => {
    const parts = String(raw ?? '').split(/[;,]/).map((x) => x.trim()).filter(Boolean)
    parts.forEach((v) => set.add(v))
  }
  push(vthh.do_day)
  push(vthh.dinh_luong)
  const matrix = Array.isArray(vthh.pricing_matrix) ? vthh.pricing_matrix : []
  matrix.forEach((row) => { push(row.do_day); push(row.dinh_luong) })
  const out = Array.from(set)
  return out.length > 0 ? out : null
}

function buildKhoGiayOptionsForVthh(vthh?: VatTuHangHoaRecord | null): string[] | null {
  if (!vthh) return null
  const set = new Set<string>()
  const push = (raw?: string | null) => {
    const parts = String(raw ?? '').split(/[;,]/).map((x) => x.trim()).filter(Boolean)
    parts.forEach((v) => set.add(v))
  }
  push(vthh.kho_giay)
  const matrix = Array.isArray(vthh.pricing_matrix) ? vthh.pricing_matrix : []
  matrix.forEach((row) => {
    push(row.kho_giay)
  })
  const out = Array.from(set)
  return out.length > 0 ? out : null
}

function donGiaContextFromDonHangMuaLine(row: DonHangMuaGridLineRow) {
  const doDay = (row['Độ dày/ ĐL'] ?? '').trim()
  const khoGiay = (row['Khổ giấy'] ?? '').trim()
  if (!doDay && !khoGiay) return undefined
  return { doDay, dinhLuong: doDay, khoGiay }
}

function insertVariantColumns(cols: readonly string[]): readonly string[] {
  const out = [...cols]
  if (out.includes('Độ dày/ ĐL') && out.includes('Khổ giấy')) return out
  const idxDvt = out.indexOf('ĐVT')
  if (idxDvt >= 0) {
    out.splice(idxDvt, 0, 'Độ dày/ ĐL', 'Khổ giấy')
    return out
  }
  return [...out, 'Độ dày/ ĐL', 'Khổ giấy']
}

/** Độ rộng cột cố định (rule mau_gia: STT, Mã, Tên, ĐVT, Số lượng giữ nguyên khi chuyển mẫu). */
const COL_WIDTH_STT = 36
const COL_WIDTH_MA = 88
const COL_WIDTH_TEN = 220
const COL_WIDTH_DO_DAY = 92
const COL_WIDTH_KHO_GIAY = 104
const COL_WIDTH_DVT = 64
const COL_WIDTH_SO_LUONG = 68
const COL_WIDTH_ACTION = 28
/** Căn trái nút Thêm dòng với cạnh trái nội dung cột Mã VTHH (cột xóa + STT + padding ô Mã). */
const OFFSET_TRAI_COT_MA_VTHH = COL_WIDTH_ACTION + COL_WIDTH_STT + 5

function colWidthStyle(col: string, ghiChuFill?: boolean): React.CSSProperties {
  if (col === 'Mã') return { width: COL_WIDTH_MA, minWidth: COL_WIDTH_MA, maxWidth: COL_WIDTH_MA }
  if (col === 'Tên VTHH') return { width: COL_WIDTH_TEN, minWidth: COL_WIDTH_TEN, maxWidth: COL_WIDTH_TEN }
  if (col === 'Độ dày/ ĐL') return { width: COL_WIDTH_DO_DAY, minWidth: COL_WIDTH_DO_DAY, maxWidth: COL_WIDTH_DO_DAY }
  if (col === 'Khổ giấy') return { width: COL_WIDTH_KHO_GIAY, minWidth: COL_WIDTH_KHO_GIAY, maxWidth: COL_WIDTH_KHO_GIAY }
  if (col === 'ĐVT') return { width: COL_WIDTH_DVT, minWidth: COL_WIDTH_DVT, maxWidth: COL_WIDTH_DVT }
  if (col === 'Số lượng') return { width: COL_WIDTH_SO_LUONG, minWidth: COL_WIDTH_SO_LUONG, maxWidth: COL_WIDTH_SO_LUONG }
  if (col === 'Ghi chú') return ghiChuFill ? { minWidth: 120 } : { width: 180, minWidth: 120 }
  if (col === 'ĐG mua') return { width: 100, minWidth: 100 }
  if (col === 'Thành tiền') return { width: 100, minWidth: 100 }
  if (col === '% thuế GTGT') return { width: 92, minWidth: 92, maxWidth: 92 }
  if (col === 'Tiền thuế GTGT') return { width: 96, minWidth: 96, maxWidth: 96 }
  if (col === 'Tổng tiền') return { width: 100, minWidth: 100 }
  if (col === COL_DD_GH) return { width: 76, minWidth: 76, maxWidth: 76 }
  return {}
}

const STICKY_Z_TH_TOP = 5
const STICKY_Z_TH_CORNER = 6
const STICKY_Z_TD_LEFT = 4

type StickyTraiKind = 'action' | 'stt' | 'ma' | 'ten' | 'do_day' | 'kho_giay' | 'dvt'

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
    case 'do_day':
      return COL_WIDTH_ACTION + COL_WIDTH_STT + COL_WIDTH_MA + COL_WIDTH_TEN
    case 'kho_giay':
      return COL_WIDTH_ACTION + COL_WIDTH_STT + COL_WIDTH_MA + COL_WIDTH_TEN + COL_WIDTH_DO_DAY
    case 'dvt':
      return COL_WIDTH_ACTION + COL_WIDTH_STT + COL_WIDTH_MA + COL_WIDTH_TEN + COL_WIDTH_DO_DAY + COL_WIDTH_KHO_GIAY
  }
}

function cotChiTietLaCotTraiCoDinh(col: string): StickyTraiKind | null {
  if (col === 'Mã') return 'ma'
  if (col === 'Tên VTHH') return 'ten'
  if (col === 'Độ dày/ ĐL') return 'do_day'
  if (col === 'Khổ giấy') return 'kho_giay'
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

/** Cột số / tiền / thuế trong lưới chi tiết ĐHM — canh phải (rule canh-le) */
const CHI_TIET_COLS_NUMERIC = new Set([
  'Số lượng',
  'ĐG mua',
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

/** Đối chiếu Phiếu nhận hàng: mọi ĐHM trừ Hủy bỏ */
function donHangMuaListForDoiChieuNhanHang(): DonHangMuaRecord[] {
  const all = donHangMuaGetAll({ ...getDefaultDonHangMuaFilter(), tu: '', den: '' })
  return all.filter((dmh) => dmh.tinh_trang !== 'Hủy bỏ')
}

/** Hiển thị ô «Nhận hàng từ»: `mã ĐHM: tiêu đề` (tiêu đề = so_chung_tu_cukcuk). */
function formatNhanHangTuTuDonMua(dmh: DonHangMuaRecord): string {
  const ma = (dmh.so_don_hang ?? '').trim()
  const td = (dmh.so_chung_tu_cukcuk ?? '').trim()
  let s: string
  if (ma && td) s = `${ma}: ${td}`
  else if (ma) s = ma
  else s = td
  return s.toUpperCase()
}

/** Điền tab Phiếu chi (TK nhận đối tác) từ danh bạ NCC — `tai_khoan_ngan_hang` / `tk_ngan_hang`. */
function getPhieuChiNhanFieldsTuNcc(ncc: NhaCungCapRecord): { stk: string; nganHang: string; tenChuTk: string } {
  const arr = ncc.tai_khoan_ngan_hang
  const tk = Array.isArray(arr) && arr.length > 0 ? arr[0] : null
  if (tk) {
    const bank = String(tk.ten_ngan_hang ?? '').trim()
    return {
      stk: (tk.so_tai_khoan ?? '').trim(),
      nganHang: bank,
      tenChuTk: (tk.ten_nguoi_nhan ?? ncc.ten_ncc ?? '').trim(),
    }
  }
  return {
    stk: (ncc.tk_ngan_hang ?? '').trim(),
    nganHang: (ncc.ten_ngan_hang ?? '').trim(),
    tenChuTk: (ncc.ten_ncc ?? '').trim(),
  }
}

/** Phiếu NVTHH — popup «Nhận hàng từ»: chỉ ĐHM tình trạng Chưa thực hiện. */
function donHangMuaListChoPhieuNhanTuDonHangMua(): DonHangMuaRecord[] {
  const all = donHangMuaGetAll({ ...getDefaultDonHangMuaFilter(), tu: '', den: '' })
  return all.filter((dmh) => dmh.tinh_trang === 'Chưa thực hiện')
}

function gridColumnHeaderLabel(col: string): string {
  if (col === 'Mã') return 'Mã VTHH'
  if (col === COL_DD_GH) return 'ĐĐGH'
  return col
}

/** Mẫu không đơn giá — không thêm dòng (rule mau_gia.mdc) */
function mauKhongDonGiaLines(): DonHangMuaGridLineRow[] {
  return []
}

/** Mẫu có đơn giá — không thêm dòng (rule mau_gia.mdc) */
function mauCoDonGiaLines(): DonHangMuaGridLineRow[] {
  return []
}

export function DonHangMuaForm({ onClose, onSaved, onHeaderPointerDown, dragging, readOnly = false, initialDon, initialChiTiet, prefillDon, prefillChiTiet, onMinimize, onMaximize, onSavedAndView: _onSavedAndView, formTitle: formTitleProp, soDonLabel: soDonLabelProp, doiChieuSource, phieuNhanTuDonHangMua = false, phieuNhanThemMoiTuDanhSach = false, viewOnlyLocked = false }: DonHangMuaFormProps) {
  const api = useDonHangMuaApi()
  const toastApi = useToastOptional()
  const formTitle = formTitleProp ?? 'Đơn hàng mua'
  const soDonLabel = soDonLabelProp ?? 'Mã ĐHM'
  const isViewMode = readOnly && initialDon != null
  const [editingFromView, setEditingFromView] = useState(false)
  const laPhieuNhanNvthh = Boolean(phieuNhanTuDonHangMua || doiChieuSource === 'don_mua_hang')
  const donDaNhanHangXem =
    readOnly &&
    initialDon != null &&
    (initialDon.tinh_trang === TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG ||
      initialDon.tinh_trang === TINH_TRANG_NVTHH_DA_NHAP_KHO)
  const donHuyBoChiXem = initialDon != null && initialDon.tinh_trang === 'Hủy bỏ'
  const effectiveReadOnly = (readOnly && !editingFromView) || donDaNhanHangXem || donHuyBoChiXem || viewOnlyLocked
  /** Chi tiết VTHH chỉ đọc khi form ở chế độ xem (readOnly). */
  const chiTietReadOnly = effectiveReadOnly
  /** Phiếu nhận từ ĐHM: không thêm/xóa dòng; chỉ sửa cột Số lượng — trừ khi «Thêm mới» từ danh sách (không prefill ĐHM). */
  const chiTietGridLocked = Boolean(phieuNhanTuDonHangMua) && !effectiveReadOnly && !phieuNhanThemMoiTuDanhSach
  const [nhaCungCapDisplay, setNhaCungCapDisplay] = useState(() => {
    if (isViewMode && initialDon) return initialDon.nha_cung_cap
    if (prefillDon?.nha_cung_cap) return prefillDon.nha_cung_cap
    return ''
  })
  const [nhaCungCapId, setNhaCungCapId] = useState<number | null>(null)
  /** Mã NCC (ma_ncc) — dùng đặt tên file đính kèm theo rule hệ thống. */
  const [nhaCungCapMa, setNhaCungCapMa] = useState('')
  const nccPartDinhKem = useMemo(() => partMccForPath(nhaCungCapMa), [nhaCungCapMa])
  const [attachments, setAttachments] = useState<DonHangMuaAttachmentItem[]>(() => {
    if (initialDon?.attachments?.length) return initialDon.attachments.map((a) => ({ ...a }))
    if (prefillDon && 'attachments' in prefillDon && Array.isArray(prefillDon.attachments) && prefillDon.attachments.length > 0) {
      return prefillDon.attachments.map((a) => ({ ...a }))
    }
    return []
  })
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
    if (isViewMode && initialDon) return initialDon.nv_mua_hang ?? ''
    if (prefillDon?.nv_mua_hang != null) return prefillDon.nv_mua_hang
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
    const fromRec = deriveHinhThucSelectedIdsFromRecord((initialDon ?? prefillDon) as DonHangMuaRecord | null | undefined)
    if (fromRec.length > 0) return fromRec
    if (phieuNhanTuDonHangMua && initialDon == null && prefillDon == null) return defaultPhieuNhanHinhThucNhapKhoIds()
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
  const [khoDropdownOpen, setKhoDropdownOpen] = useState(false)
  const [khoSearchKeyword, setKhoSearchKeyword] = useState('')
  const [khoDropdownRect, setKhoDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const refKhoWrap = useRef<HTMLDivElement>(null)
  const [khoNhapId, setKhoNhapId] = useState(() => {
    const h = (initialDon ?? prefillDon) as { kho_nhap_id?: string } | null | undefined
    return h?.kho_nhap_id ?? ''
  })
  const [tenCongTrinh, setTenCongTrinh] = useState(() => {
    const h = (initialDon ?? prefillDon) as { ten_cong_trinh?: string } | null | undefined
    return h?.ten_cong_trinh ?? ''
  })
  const [khoList, setKhoList] = useState<KhoStorageItem[]>(() => loadKhoListFromStorage())
  const [diaDiemGiaoHangList, setDiaDiemGiaoHangList] = useState<string[]>(() => {
    const raw = (initialDon ?? prefillDon) as { dia_diem_giao_hang?: string } | null | undefined
    const s = raw?.dia_diem_giao_hang ?? ''
    if (!s.trim()) return ['']
    return s.split(/\r?\n/).filter(Boolean).length > 0 ? s.split(/\r?\n/).map((x) => x.trim()) : ['']
  })
  const [dieuKhoanKhac, setDieuKhoanKhac] = useState(() => {
    if (isViewMode && initialDon) return initialDon.dieu_khoan_khac ?? ''
    if (prefillDon?.dieu_khoan_khac != null) return prefillDon.dieu_khoan_khac
    return ''
  })
  const [thamChieu, setThamChieu] = useState(() => {
    if (isViewMode && initialDon) {
      if (phieuNhanTuDonHangMua) {
        const lk = initialDon.doi_chieu_don_mua_id
        if (lk) {
          const all = donHangMuaGetAll({ ...getDefaultDonHangMuaFilter(), tu: '', den: '' })
          const d = all.find((x) => x.id === lk)
          if (d) return formatNhanHangTuTuDonMua(d)
        }
        return (initialDon.so_chung_tu_cukcuk ?? '').toUpperCase()
      }
      return initialDon.so_chung_tu_cukcuk ?? ''
    }
    if (prefillDon && phieuNhanTuDonHangMua) {
      const pd = prefillDon as DonHangMuaRecord
      if ((pd.so_don_hang ?? '').trim()) return formatNhanHangTuTuDonMua(pd)
    }
    if (prefillDon?.so_chung_tu_cukcuk != null) {
      return phieuNhanTuDonHangMua
        ? String(prefillDon.so_chung_tu_cukcuk).toUpperCase()
        : prefillDon.so_chung_tu_cukcuk
    }
    return ''
  })
  const [ngayDonHang, setNgayDonHang] = useState<Date | null>(() => {
    if (isViewMode && initialDon) return parseIsoToDate(initialDon.ngay_don_hang)
    if (phieuNhanTuDonHangMua) return new Date()
    if (prefillDon?.ngay_don_hang) return parseIsoToDate(prefillDon.ngay_don_hang)
    return new Date()
  })
  const [soDonHang, setSoDonHang] = useState(() => (isViewMode && initialDon ? initialDon.so_don_hang : api.soDonHangTiepTheo()))
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
  const [phieuChiNgay, setPhieuChiNgay] = useState<Date | null>(() => {
    const r = (initialDon ?? prefillDon) as DonHangMuaRecord | undefined
    const iso = r?.phieu_chi_ngay?.trim()
    return iso ? parseIsoToDate(iso) : null
  })
  /** Dòng grid: các key cột là string; _dvtOptions khi VTHH có đơn vị quy đổi; _vthh để lấy ĐG mua theo ĐVT khi đổi ĐVT */
  const [lines, setLines] = useState<DonHangMuaGridLineRow[]>(() => {
    if (isViewMode && initialChiTiet && initialChiTiet.length > 0) return chiTietToLines(initialChiTiet)
    if (prefillChiTiet && prefillChiTiet.length > 0) return chiTietToLines(prefillChiTiet)
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
  const [nccList, setNccList] = useState<NhaCungCapRecord[]>([])
  const [nccDropdownOpen, setNccDropdownOpen] = useState(false)
  const [nccSearchKeyword, setNccSearchKeyword] = useState('')
  const [nccDropdownRect, setNccDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const [showThemNccForm, setShowThemNccForm] = useState(false)
  const [showThemDkttModal, setShowThemDkttModal] = useState(false)
  const [danhSachDKTT, setDanhSachDKTT] = useState<DieuKhoanThanhToanItem[]>([])
  const [dangLuu, setDangLuu] = useState(false)
  const [loi, setLoi] = useState('')
  const [deleteRowIndex, setDeleteRowIndex] = useState<number | null>(null)
  const [hinhThucDropdownOpen, setHinhThucDropdownOpen] = useState(false)
  const [hinhThucDropdownRect, setHinhThucDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const refHinhThucWrap = useRef<HTMLDivElement>(null)
  const [showThemKhoModal, setShowThemKhoModal] = useState(false)
  const [deleteDiaDiemModal, setDeleteDiaDiemModal] = useState<{ index: number; content: string } | null>(null)
  const [activeDiaDiemIndex, setActiveDiaDiemIndex] = useState<number | null>(null)
  const [diaChiCongTrinh, setDiaChiCongTrinh] = useState(() => {
    const d = (initialDon ?? prefillDon) as { dia_chi_cong_trinh?: string } | null | undefined
    return d?.dia_chi_cong_trinh ?? ''
  })
  const [chungTuMuaCachThanhToan, setChungTuMuaCachThanhToan] = useState<'chua_thanh_toan' | 'thanh_toan_ngay'>(() => {
    const r = (initialDon ?? prefillDon) as DonHangMuaRecord | undefined
    if (r?.chung_tu_mua_chua_thanh_toan) return 'chua_thanh_toan'
    if (r?.chung_tu_mua_thanh_toan_ngay) return 'thanh_toan_ngay'
    return 'thanh_toan_ngay'
  })
  const [chungTuMuaPttt, setChungTuMuaPttt] = useState<'tien_mat' | 'chuyen_khoan'>(() => {
    const r = (initialDon ?? prefillDon) as DonHangMuaRecord | undefined
    return normalizeChungTuMuaPtttStored(r?.chung_tu_mua_pttt)
  })
  const [chungTuMuaLoaiHd, setChungTuMuaLoaiHd] = useState<ChungTuMuaLoaiHdPhieu>(() => {
    const r = (initialDon ?? prefillDon) as DonHangMuaRecord | undefined
    const v = r?.chung_tu_mua_loai_hd
    if (v === 'gtgt') return 'gtgt'
    return 'hd_le'
  })
  const [phieuNhanTabChung, setPhieuNhanTabChung] = useState<'phieu-nhap' | 'phieu-chi' | 'hoa-don'>('phieu-nhap')
  const [phieuSoHoaDon, setPhieuSoHoaDon] = useState(() => {
    const r = (initialDon ?? prefillDon) as DonHangMuaRecord | undefined
    return (r?.chung_tu_mua_so_hoa_don ?? '').trim()
  })
  const [hoaDonNgay, setHoaDonNgay] = useState<Date | null>(() => {
    const r = (initialDon ?? prefillDon) as DonHangMuaRecord | undefined
    const iso = r?.hoa_don_ngay?.trim()
    if (!iso) return null
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!m) return parseIsoToDate(iso)
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  })
  const [hoaDonKyHieu, setHoaDonKyHieu] = useState(() => {
    const r = (initialDon ?? prefillDon) as DonHangMuaRecord | undefined
    return (r?.hoa_don_ky_hieu ?? '').trim()
  })
  const [mauHoaDonMa, setMauHoaDonMa] = useState(() => {
    const r = (initialDon ?? prefillDon) as DonHangMuaRecord | undefined
    return (r?.mau_hoa_don_ma ?? '').trim()
  })
  const [mauHoaDonTen, setMauHoaDonTen] = useState(() => {
    const r = (initialDon ?? prefillDon) as DonHangMuaRecord | undefined
    return (r?.mau_hoa_don_ten ?? '').trim()
  })
  const [mauHoaDonList, setMauHoaDonList] = useState<MauHoaDonItem[]>([])
  const [mauHoaDonDropdownOpen, setMauHoaDonDropdownOpen] = useState(false)
  const [mauHoaDonDropdownRect, setMauHoaDonDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const [showThemMauHoaDonModal, setShowThemMauHoaDonModal] = useState(false)
  const refMauHoaDonWrap = useRef<HTMLDivElement>(null)
  const [phieuChiNcc, setPhieuChiNcc] = useState(() => {
    const r = (initialDon ?? prefillDon) as DonHangMuaRecord | undefined
    return r?.phieu_chi_nha_cung_cap ?? ''
  })
  const [phieuChiDiaChi, setPhieuChiDiaChi] = useState(() => {
    const r = (initialDon ?? prefillDon) as DonHangMuaRecord | undefined
    return r?.phieu_chi_dia_chi ?? ''
  })
  const [phieuChiNguoiNhanTien, setPhieuChiNguoiNhanTien] = useState(() => {
    const r = (initialDon ?? prefillDon) as DonHangMuaRecord | undefined
    return r?.phieu_chi_nguoi_nhan_tien ?? ''
  })
  const [phieuChiLyDo, setPhieuChiLyDo] = useState(() => {
    const r = (initialDon ?? prefillDon) as DonHangMuaRecord | undefined
    return r?.phieu_chi_ly_do ?? ''
  })
  const [phieuChiTaiKhoanChi, setPhieuChiTaiKhoanChi] = useState(() => {
    const r = (initialDon ?? prefillDon) as DonHangMuaRecord | undefined
    return r?.phieu_chi_tai_khoan_chi ?? ''
  })
  const [phieuChiNganHangChi, setPhieuChiNganHangChi] = useState(() => {
    const r = (initialDon ?? prefillDon) as DonHangMuaRecord | undefined
    return r?.phieu_chi_ngan_hang_chi ?? r?.phieu_chi_ngan_hang ?? ''
  })
  const [phieuChiTenNguoiGui, setPhieuChiTenNguoiGui] = useState(() => {
    const r = (initialDon ?? prefillDon) as DonHangMuaRecord | undefined
    return r?.phieu_chi_ten_nguoi_gui ?? ''
  })
  const [phieuChiTaiKhoanNhan, setPhieuChiTaiKhoanNhan] = useState(() => {
    const r = (initialDon ?? prefillDon) as DonHangMuaRecord | undefined
    return r?.phieu_chi_tai_khoan_nhan ?? ''
  })
  const [phieuChiNganHangNhan, setPhieuChiNganHangNhan] = useState(() => {
    const r = (initialDon ?? prefillDon) as DonHangMuaRecord | undefined
    return r?.phieu_chi_ngan_hang_nhan ?? ''
  })
  const [phieuChiTenChuTkNhan, setPhieuChiTenChuTkNhan] = useState(() => {
    const r = (initialDon ?? prefillDon) as DonHangMuaRecord | undefined
    return r?.phieu_chi_ten_chu_tk_nhan ?? r?.phieu_chi_ten_nguoi_nhan_ck ?? ''
  })
  const [phieuChiAttachments, setPhieuChiAttachments] = useState<DonHangMuaAttachmentItem[]>(() => {
    const r = (initialDon ?? prefillDon) as DonHangMuaRecord | undefined
    const a = r?.phieu_chi_attachments
    return Array.isArray(a) && a.length ? a.map((x) => ({ ...x })) : []
  })
  const [showDinhKemPhieuChiModal, setShowDinhKemPhieuChiModal] = useState(false)
  const [bankSuggestList, setBankSuggestList] = useState<BankItem[]>([])
  const [diaDiemSuggestions, setDiaDiemSuggestions] = useState<string[]>([])
  const [diaDiemSuggestionRect, setDiaDiemSuggestionRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const diaDiemDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refDiaDiemGiaoHangWrap = useRef<HTMLDivElement>(null)
  const refEmail = useRef<HTMLDivElement>(null)
  const refNccWrap = useRef<HTMLDivElement>(null)
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
  const refTgNhanDmhInput = useRef<HTMLInputElement>(null)
  const refTgNhapNvthhInput = useRef<HTMLInputElement>(null)
  const refPhieuChiNgayInput = useRef<HTMLInputElement>(null)
  const refDmhChiTietSection = useRef<HTMLDivElement>(null)
  const refChiTietGridScroll = useRef<HTMLDivElement>(null)
  const scrollChiTietSauThemDongRef = useRef(false)

  const [selectedDoiChieuDonMuaId, setSelectedDoiChieuDonMuaId] = useState<string | null>(() => {
    const id = initialDon?.doi_chieu_don_mua_id ?? prefillDon?.doi_chieu_don_mua_id
    return id ?? null
  })
  const lienKetDonMuaId = initialDon?.doi_chieu_don_mua_id || prefillDon?.doi_chieu_don_mua_id || selectedDoiChieuDonMuaId || null
  const [showTimDonMuaHangPopup, setShowTimDonMuaHangPopup] = useState(false)
  const [nhanHangTuDropdownOpen, setNhanHangTuDropdownOpen] = useState(false)
  const [nhanHangTuDropdownRect, setNhanHangTuDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const [showDonMuaHangPopup, setShowDonMuaHangPopup] = useState(false)
  const [viewDonHangMuaRecord, setViewDonHangMuaRecord] = useState<DonHangMuaRecord | null>(null)

  /** Phiếu NVTHH: bỏ margin dưới từng dòng — khoảng cách dọc = `gap` tab panel (cùng kho nhập → ĐĐGH 1). */
  const fieldRowDyn = useMemo(
    (): React.CSSProperties => ({ ...fieldRow, marginBottom: phieuNhanTuDonHangMua ? 0 : FIELD_ROW_GAP }),
    [phieuNhanTuDonHangMua]
  )

  /** Phiếu NVTHH — ô chọn kho: rộng theo nhãn dài nhất trong danh sách (ít dư khoảng trắng). */
  const khoNhapPickWidthFromListMaxPx = useMemo(() => {
    let longest = '-- Chọn --'
    for (const k of khoList) {
      const L = (k.label ?? '').trim()
      if (L.length > longest.length) longest = L
    }
    return Math.ceil(longest.length * 7.2) + LOOKUP_CHEVRON_WIDTH + 52
  }, [khoList])

  const phieuChiStkInputCh = useMemo(() => {
    const a = phieuChiTaiKhoanChi.trim().length
    const b = phieuChiTaiKhoanNhan.trim().length
    return Math.min(28, Math.max(11, Math.max(a, b, 10) + 2))
  }, [phieuChiTaiKhoanChi, phieuChiTaiKhoanNhan])

  const soDonLabelHienThi = useMemo(() => {
    if (!phieuNhanTuDonHangMua) return soDonLabel
    if (phieuNhanTabChung === 'phieu-nhap') return 'Mã phiếu nhập'
    if (phieuNhanTabChung === 'phieu-chi') return 'Mã phiếu chi'
    return 'Mã phiếu NVTHH'
  }, [phieuNhanTuDonHangMua, phieuNhanTabChung, soDonLabel])

  const mauHoaDonHienThi = useMemo(() => {
    if (mauHoaDonMa && mauHoaDonTen) return `${mauHoaDonMa} — ${mauHoaDonTen}`
    if (mauHoaDonMa) return mauHoaDonMa
    return mauHoaDonTen
  }, [mauHoaDonMa, mauHoaDonTen])

  const tieuDePhieuNvthhDayDu = useMemo(() => {
    if (!phieuNhanTuDonHangMua) return ''
    const chungTu =
      hinhThucSelectedIds.length > 0
        ? hinhThucSelectedIds
            .map((id) => hinhThucList.find((x) => x.id === id)?.ten)
            .filter(Boolean)
            .join(', ')
        : PHIEU_CHUNG_TU_MUA_DEFAULT_TEXT
    const pttt = chungTuMuaPttt === 'chuyen_khoan' ? 'Chuyển khoản' : 'Tiền mặt'
    const loaiHd = chungTuMuaLoaiHd === 'gtgt' ? 'HĐ GTGT' : 'HĐ lẻ'
    const ncc = (nhaCungCapDisplay || '').trim() || '—'
    return `Nhận vật tư hàng hóa - ${chungTu} - ${pttt} - ${loaiHd} - ${ncc}`
  }, [phieuNhanTuDonHangMua, hinhThucSelectedIds, hinhThucList, chungTuMuaPttt, chungTuMuaLoaiHd, nhaCungCapDisplay])

  const dienGiaiPhieuMacDinh = useMemo(() => {
    if (!phieuNhanTuDonHangMua) return ''
    const t = thamChieu.trim()
    if (!t) return ''
    const so = phieuSoHoaDon.trim()
    return so ? `Nhập hàng ${t} theo hóa đơn số ${so}` : `Nhập hàng ${t}`
  }, [phieuNhanTuDonHangMua, thamChieu, phieuSoHoaDon])

  useEffect(() => {
    dienGiaiPhieuTuChinhRef.current = false
  }, [initialDon?.id, phieuNhanTuDonHangMua])

  useEffect(() => {
    if (!phieuNhanTuDonHangMua || initialDon != null) return
    if (dienGiaiPhieuTuChinhRef.current) return
    setDienGiai(dienGiaiPhieuMacDinh)
  }, [phieuNhanTuDonHangMua, initialDon, dienGiaiPhieuMacDinh])

  useEffect(() => {
    if (!phieuNhanTuDonHangMua || phieuNhanTabChung !== 'phieu-chi' || initialDon != null) return
    setPhieuChiNcc(nhaCungCapDisplay)
    setPhieuChiDiaChi(diaChi)
  }, [phieuNhanTuDonHangMua, phieuNhanTabChung, nhaCungCapDisplay, diaChi, initialDon])

  useEffect(() => {
    if (!phieuNhanTuDonHangMua) return
    let cancelled = false
    mauHoaDonGetAll().then((list) => {
      if (!cancelled) setMauHoaDonList(list)
    })
    return () => {
      cancelled = true
    }
  }, [phieuNhanTuDonHangMua])

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

  /** Khi tạo mới từ chứng từ khác (prefill): đổ dữ liệu một lần khi mount. */
  useEffect(() => {
    if (isViewMode) return
    if (didPrefillRef.current) return
    if (!prefillDon && (!prefillChiTiet || prefillChiTiet.length === 0)) return
    didPrefillRef.current = true

    if (prefillDon) {
      if (prefillDon.nha_cung_cap != null) setNhaCungCapDisplay(prefillDon.nha_cung_cap)
      if (prefillDon.dia_chi != null) setDiaChi(prefillDon.dia_chi)
      if (prefillDon.nguoi_giao_hang != null) setNguoiGiaoHang(prefillDon.nguoi_giao_hang)
      if (prefillDon.ma_so_thue != null) setMaSoThue(prefillDon.ma_so_thue)
      if (prefillDon.dien_giai != null) setDienGiai(prefillDon.dien_giai)
      if (prefillDon.nv_mua_hang != null) setNvMuaHang(prefillDon.nv_mua_hang)
      if (prefillDon.dieu_khoan_tt != null) setDieuKhoanTT(prefillDon.dieu_khoan_tt)
      if (prefillDon.so_ngay_duoc_no != null) setSoNgayDuocNo(prefillDon.so_ngay_duoc_no)
      if (prefillDon.dia_diem_giao_hang != null) {
        const parts = String(prefillDon.dia_diem_giao_hang).split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
        setDiaDiemGiaoHangList(parts.length > 0 ? parts : [''])
      }
      if (prefillDon.dieu_khoan_khac != null) setDieuKhoanKhac(prefillDon.dieu_khoan_khac)
      if (phieuNhanTuDonHangMua) {
        const pd = prefillDon as DonHangMuaRecord
        if ((pd.id ?? '').trim()) setSelectedDoiChieuDonMuaId(pd.id)
        if ((pd.so_don_hang ?? '').trim()) setThamChieu(formatNhanHangTuTuDonMua(pd))
        else if (prefillDon.so_chung_tu_cukcuk != null) setThamChieu(prefillDon.so_chung_tu_cukcuk)
      } else if (prefillDon.so_chung_tu_cukcuk != null) {
        setThamChieu(prefillDon.so_chung_tu_cukcuk)
      }
      if (prefillDon.tinh_trang != null) {
        setTinhTrang(normalizeTinhTrangPhieuNvthhForForm(prefillDon.tinh_trang, laPhieuNhanNvthh))
      }
      if (prefillDon.ngay_don_hang != null && !phieuNhanTuDonHangMua) setNgayDonHang(parseIsoToDate(prefillDon.ngay_don_hang))
      if (prefillDon.ngay_giao_hang !== undefined) setNgayGiaoHang(parseIsoToDate(prefillDon.ngay_giao_hang ?? null))
      const ext = prefillDon as DonHangMuaRecord
      if (ext.phieu_chi_ngay != null) setPhieuChiNgay(parseIsoToDate(ext.phieu_chi_ngay))
      setHinhThucSelectedIds(deriveHinhThucSelectedIdsFromRecord(ext))
      if (ext.kho_nhap_id != null) setKhoNhapId(ext.kho_nhap_id)
      if (ext.ten_cong_trinh != null) setTenCongTrinh(ext.ten_cong_trinh)
      if (ext.dia_chi_cong_trinh != null) setDiaChiCongTrinh(ext.dia_chi_cong_trinh)
      if (prefillDon.attachments?.length) {
        setAttachments(prefillDon.attachments.map((a) => ({ ...a })))
      }
      // so_don_hang: luôn dùng số tự sinh của đơn mua hàng / phiếu nhận
    }

    if (prefillChiTiet && prefillChiTiet.length > 0) {
      setLines(chiTietToLines(prefillChiTiet))
    }
  }, [isViewMode, prefillDon, prefillChiTiet, laPhieuNhanNvthh, phieuNhanTuDonHangMua, doiChieuSource])

  useEffect(() => {
    setKhoList(loadKhoListFromStorage())
  }, [])

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
    nhaCungCapGetAll().then((data) => {
      if (!cancelled && Array.isArray(data)) setNccList(data)
    })
    return () => { cancelled = true }
  }, [])

  const applyChonDonMuaHangDoiChieu = useCallback(
    (dmh: DonHangMuaRecord) => {
      const label = (dmh.so_don_hang ?? '').trim()
      setThamChieu(phieuNhanTuDonHangMua ? formatNhanHangTuTuDonMua(dmh) : label)
      setSelectedDoiChieuDonMuaId(dmh.id)
      setValErrKey((k) => (k === 'doi_chieu' ? null : k))
      setNhaCungCapDisplay(dmh.nha_cung_cap ?? '')
      const ten = (dmh.nha_cung_cap ?? '').trim()
      const hit = nccList.find((n) => (n.ten_ncc || '').trim() === ten)
      if (hit != null) {
        setNhaCungCapId(hit.id)
        setNhaCungCapMa((hit.ma_ncc ?? '').trim())
        if (phieuNhanTuDonHangMua && chungTuMuaPttt === 'chuyen_khoan') {
          const v = getPhieuChiNhanFieldsTuNcc(hit)
          setPhieuChiTaiKhoanNhan(v.stk)
          setPhieuChiNganHangNhan(v.nganHang)
          setPhieuChiTenChuTkNhan(v.tenChuTk)
        }
      }
      setDiaChi(dmh.dia_chi ?? '')
      setNguoiGiaoHang(dmh.nguoi_giao_hang ?? '')
      setHinhThucSelectedIds(deriveHinhThucSelectedIdsFromRecord(dmh))
      setKhoNhapId((dmh as DonHangMuaRecord & { kho_nhap_id?: string }).kho_nhap_id ?? '')
      setTenCongTrinh((dmh as DonHangMuaRecord & { ten_cong_trinh?: string }).ten_cong_trinh ?? '')
      setDiaChiCongTrinh((dmh as DonHangMuaRecord & { dia_chi_cong_trinh?: string }).dia_chi_cong_trinh ?? '')
      setMaSoThue(dmh.ma_so_thue ?? '')
      setDienGiai(dmh.dien_giai ?? '')
      setNvMuaHang(dmh.nv_mua_hang ?? '')
      setDieuKhoanTT(dmh.dieu_khoan_tt ?? '')
      setSoNgayDuocNo(dmh.so_ngay_duoc_no ?? '0')
      setDiaDiemGiaoHangList((() => {
        const s = (dmh.dia_diem_giao_hang ?? '').trim()
        return s ? s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean) : ['']
      })())
      setDieuKhoanKhac(dmh.dieu_khoan_khac ?? '')
      setNgayDonHang(parseIsoToDate(dmh.ngay_don_hang))
      setNgayGiaoHang(parseIsoToDate(dmh.ngay_giao_hang ?? null))
      const ct = donHangMuaGetChiTiet(dmh.id)
      setLines(chiTietToLines(ct))
    },
    [phieuNhanTuDonHangMua, nccList, chungTuMuaPttt],
  )

  useEffect(() => {
    if (!phieuNhanTuDonHangMua || chungTuMuaPttt !== 'chuyen_khoan' || effectiveReadOnly) return
    if (nhaCungCapId == null) return
    const hit = nccList.find((n) => n.id === nhaCungCapId)
    if (!hit) return
    const v = getPhieuChiNhanFieldsTuNcc(hit)
    setPhieuChiTaiKhoanNhan((prev) => (prev.trim() ? prev : v.stk))
    setPhieuChiNganHangNhan((prev) => (prev.trim() ? prev : v.nganHang))
    setPhieuChiTenChuTkNhan((prev) => (prev.trim() ? prev : v.tenChuTk))
  }, [phieuNhanTuDonHangMua, chungTuMuaPttt, nhaCungCapId, nccList, effectiveReadOnly])

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
    if (phieuNhanTuDonHangMua) setNhanHangTuDropdownOpen(false)
    setMauHoaDonDropdownOpen(false)
    setTgNhapPickerOpen(false)
    setPhieuChiNgayPickerOpen(false)
    setNgayHoaDonPickerOpen(false)
    setTgNhanHangPickerOpen(false)
  }, [phieuNhanTabChung, phieuNhanTuDonHangMua])

  /** Đồng bộ id + mã NCC từ danh bạ (tên / chuỗi «mã - tên» cũ). Phiếu: chuẩn về chỉ tên khi khớp. */
  useEffect(() => {
    const raw = (initialDon?.nha_cung_cap ?? prefillDon?.nha_cung_cap ?? '').trim()
    if (!raw || nccList.length === 0) return
    const found =
      nccList.find((n) => (n.ten_ncc || '').trim() === raw) ||
      nccList.find((n) => {
        const ma = (n.ma_ncc ?? '').trim()
        const ten = (n.ten_ncc ?? '').trim()
        return ma && ten && `${ma} - ${ten}` === raw
      }) ||
      nccList.find((n) => {
        const ma = (n.ma_ncc ?? '').trim()
        return ma !== '' && (raw === ma || raw.startsWith(`${ma} -`))
      })
    if (found != null) {
      setNhaCungCapId(found.id)
      setNhaCungCapMa((found.ma_ncc ?? '').trim())
      if (laPhieuNhanNvthh) setNhaCungCapDisplay((found.ten_ncc || '').trim())
    }
  }, [initialDon?.nha_cung_cap, prefillDon?.nha_cung_cap, nccList, laPhieuNhanNvthh])

  /** Đổi đơn (id): nạp file đính kèm từ bản ghi và chuẩn hóa `name`/`virtual_path` theo Mã ĐHM + NCC hiện tại (dữ liệu cũ có thể còn `ncc_unknown` trong tên file). */
  useEffect(() => {
    if (initialDon?.id == null) return
    const a = initialDon.attachments
    const raw = Array.isArray(a) ? a.map((x) => ({ ...x })) : []
    if (raw.length === 0) {
      setAttachments([])
      return
    }
    const so = (initialDon.so_don_hang ?? '').trim() || 'DHM'
    const nccPart = partMccForPath('')
    setAttachments(chuanHoaDuongDanDinhKemDonHangMua(raw, so, nccPart))
  }, [initialDon?.id])

  /** Đồng bộ `name` + `virtual_path` khi đổi Mã ĐHM / NCC (đính kèm trước, nhập NCC sau — tránh tên file vẫn `ncc_unknown`). */
  useEffect(() => {
    const so = soDonHang.trim() || 'DHM'
    setAttachments((prev) => {
      if (prev.length === 0) return prev
      const next = chuanHoaDuongDanDinhKemDonHangMua(prev, so, nccPartDinhKem)
      const same = next.every(
        (n, i) => n.virtual_path === prev[i]?.virtual_path && n.name === (prev[i]?.name ?? '')
      )
      return same ? prev : next
    })
  }, [soDonHang, nccPartDinhKem])

  useEffect(() => {
    if (!phieuNhanTuDonHangMua) return
    const so = soDonHang.trim() || 'DHM'
    setPhieuChiAttachments((prev) => {
      if (prev.length === 0) return prev
      const next = chuanHoaDuongDanDinhKemDonHangMua(prev, so, nccPartDinhKem)
      const same = next.every(
        (n, i) => n.virtual_path === prev[i]?.virtual_path && n.name === (prev[i]?.name ?? '')
      )
      return same ? prev : next
    })
  }, [phieuNhanTuDonHangMua, soDonHang, nccPartDinhKem])

  /** Khi chuyển sang xem đơn khác (initialDon/initialChiTiet đổi) mà form vẫn mở: đồng bộ toàn bộ state từ props để hiển thị đúng đơn mới. */
  useEffect(() => {
    if (!readOnly || initialDon == null) return
    const d = initialDon as DonHangMuaRecord & { hinh_thuc?: string; kho_nhap_id?: string; ten_cong_trinh?: string; dia_chi_cong_trinh?: string }
    setNhaCungCapDisplay(initialDon.nha_cung_cap ?? '')
    setDiaChi(initialDon.dia_chi ?? '')
    setNguoiGiaoHang(initialDon.nguoi_giao_hang ?? '')
    setMaSoThue(initialDon.ma_so_thue ?? '')
    setDienGiai(initialDon.dien_giai ?? '')
    setNvMuaHang(initialDon.nv_mua_hang ?? '')
    setDieuKhoanTT(initialDon.dieu_khoan_tt ?? '')
    setSoNgayDuocNo(initialDon.so_ngay_duoc_no ?? '0')
    setHinhThucSelectedIds(deriveHinhThucSelectedIdsFromRecord(d))
    setKhoNhapId(d.kho_nhap_id ?? '')
    setTenCongTrinh(d.ten_cong_trinh ?? '')
    setDiaChiCongTrinh(d.dia_chi_cong_trinh ?? '')
    const dgh = (initialDon.dia_diem_giao_hang ?? '').trim()
    setDiaDiemGiaoHangList(dgh ? dgh.split(/\r?\n/).map((x) => x.trim()).filter(Boolean) : [''])
    setDieuKhoanKhac(initialDon.dieu_khoan_khac ?? '')
    setSelectedDoiChieuDonMuaId(initialDon.doi_chieu_don_mua_id ?? null)
    if (phieuNhanTuDonHangMua && initialDon.doi_chieu_don_mua_id) {
      const linked = donHangMuaGetAll({ ...getDefaultDonHangMuaFilter(), tu: '', den: '' }).find((x) => x.id === initialDon.doi_chieu_don_mua_id)
      setThamChieu(
        linked ? formatNhanHangTuTuDonMua(linked) : (initialDon.so_chung_tu_cukcuk ?? '').toUpperCase(),
      )
    } else {
      setThamChieu(initialDon.so_chung_tu_cukcuk ?? '')
    }
    setNgayDonHang(parseIsoToDate(initialDon.ngay_don_hang))
    setSoDonHang(initialDon.so_don_hang)
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
    setPhieuChiNcc(initialDon.phieu_chi_nha_cung_cap ?? '')
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
    if (initialChiTiet && initialChiTiet.length > 0) setLines(chiTietToLines(initialChiTiet))
    else setLines([])
    const att = initialDon.attachments
    const rawAtt = Array.isArray(att) ? att.map((x) => ({ ...x })) : []
    if (rawAtt.length === 0) setAttachments([])
    else {
      const so = (initialDon.so_don_hang ?? '').trim() || 'DHM'
      const nccPart = partMccForPath('')
      setAttachments(chuanHoaDuongDanDinhKemDonHangMua(rawAtt, so, nccPart))
    }
    setEditingFromView(false)
  }, [readOnly, initialDon?.id, initialDon, initialChiTiet, laPhieuNhanNvthh, phieuNhanTuDonHangMua])

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
    if (khoDropdownOpen && refKhoWrap.current) {
      const r = refKhoWrap.current.getBoundingClientRect()
      setKhoDropdownRect({
        top: r.bottom,
        left: r.left,
        width: phieuNhanTuDonHangMua ? r.width : Math.max(r.width, 200),
      })
    } else {
      setKhoDropdownRect(null)
    }
  }, [khoDropdownOpen, phieuNhanTuDonHangMua])

  useEffect(() => {
    if (!khoDropdownOpen) return
    const onMouseDown = (e: MouseEvent) => {
      if (refKhoWrap.current?.contains(e.target as Node)) return
      if ((e.target as HTMLElement).closest('[data-kho-dropdown]')) return
      setKhoDropdownOpen(false)
    }
    window.addEventListener('mousedown', onMouseDown)
    return () => window.removeEventListener('mousedown', onMouseDown)
  }, [khoDropdownOpen])

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

  /** Đồng bộ Địa điểm GH từ hình thức: địa chỉ kho / địa chỉ công trình theo thứ tự chọn hình thức (nhập vào các ô ĐĐGH, không còn ô riêng “Địa chỉ công trình”). */
  useEffect(() => {
    if (effectiveReadOnly) return
    const order = buildHinhThucDiaDiemOrder(hinhThucSelectedIds, hinhThucList)
    const addrs: string[] = []
    for (const { type } of order) {
      if (type === 'kho_nhap' && khoNhapId) {
        const kho = khoList.find((k) => k.id === khoNhapId)
        if (kho?.dia_chi?.trim()) addrs.push(kho.dia_chi.trim())
        else addrs.push('')
      } else if (type === 'ten_cong_trinh') {
        /** Không trim: trim trong effect xóa dấu cách đang gõ trong ô ĐĐGH / địa chỉ công trình. */
        addrs.push(diaChiCongTrinh ?? '')
      }
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
  }, [effectiveReadOnly, hinhThucSelectedIds, khoNhapId, diaChiCongTrinh, khoList, hinhThucList])

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

  const handleDiaDiemAddressChange = useCallback((index: number, value: string) => {
    setDiaDiemGiaoHangList((prev) => {
      const n = [...prev]
      n[index] = value
      return n
    })
    const order = buildHinhThucDiaDiemOrder(hinhThucSelectedIds, hinhThucList)
    if (order[index]?.type === 'ten_cong_trinh') setDiaChiCongTrinh(value)
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
    if (order[index]?.type === 'ten_cong_trinh') setDiaChiCongTrinh(addr)
    setDiaDiemSuggestions([])
  }, [hinhThucSelectedIds, hinhThucList])

  const handleChonNcc = (ncc: NhaCungCapRecord) => {
    setNhaCungCapId(ncc.id)
    setNhaCungCapMa((ncc.ma_ncc ?? '').trim())
    setNhaCungCapDisplay(ncc.ten_ncc || '')
    setDiaChi(ncc.dia_chi || '')
    setMaSoThue(ncc.ma_so_thue || '')
    setDieuKhoanTT(ncc.dieu_khoan_tt || '')
    const dktt = danhSachDKTT.find((d) => d.ma === ncc.dieu_khoan_tt || d.ten === ncc.dieu_khoan_tt)
    if (dktt) setSoNgayDuocNo(String(dktt.so_ngay_duoc_no))
    const ddh = ncc.dia_diem_giao_hang
    const first = Array.isArray(ddh) && ddh.length > 0 ? ddh[0] : (typeof ddh === 'string' ? ddh : '') || ''
    setDiaDiemGiaoHangList((prev) => (prev.length === 1 && !prev[0] ? [first] : [first, ...prev.slice(1)]))
    if (phieuNhanTuDonHangMua && chungTuMuaPttt === 'chuyen_khoan') {
      const v = getPhieuChiNhanFieldsTuNcc(ncc)
      setPhieuChiTaiKhoanNhan(v.stk)
      setPhieuChiNganHangNhan(v.nganHang)
      setPhieuChiTenChuTkNhan(v.tenChuTk)
    }
  }

  /** ĐG mua khi ĐVT là ĐVT chính (gọi từ handleChonVthh lúc mới chọn). */
  const getDonGiaHienThiWhenDvtChinh = (vthh: VatTuHangHoaRecord, row?: DonHangMuaGridLineRow): string => {
    return getDonGiaMuaTheoDvt(vthh, vthh.dvt_chinh ?? '', row ? donGiaContextFromDonHangMuaLine(row) : undefined)
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

  /** Prefill chi tiết (vd. từ ĐHM): tra cứu VTHH để điền ĐG mua, % thuế GTGT và tính tiền. */
  useEffect(() => {
    if (!prefillChiTiet || prefillChiTiet.length === 0) return
    if (prefillEnrichedRef.current || vatTuList.length === 0) return
    prefillEnrichedRef.current = true
    setLines((prev) => enrichDonHangGridLinesWithVthh(prev, vatTuList))
  }, [vatTuList, prefillChiTiet])

  /** Khi chọn Đối chiếu từ dropdown: enrich chi tiết với ĐG mua, % thuế từ VTHH (giống Chuyển ĐHM). */
  const dropdownEnrichedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!selectedDoiChieuDonMuaId) {
      dropdownEnrichedRef.current = null
      return
    }
    if (vatTuList.length === 0 || lines.length === 0) return
    if (dropdownEnrichedRef.current === selectedDoiChieuDonMuaId) return
    dropdownEnrichedRef.current = selectedDoiChieuDonMuaId
    setLines((prev) => enrichDonHangGridLinesWithVthh(prev, vatTuList))
  }, [selectedDoiChieuDonMuaId, vatTuList.length, lines.length])

  const handleChonVthh = (vthh: VatTuHangHoaRecord, rowIndex: number) => {
    const next = [...lines]
    if (rowIndex < 0 || rowIndex >= next.length) return
    const row = { ...next[rowIndex] } as Record<string, string> & { _dvtOptions?: string[]; _vthh?: VatTuHangHoaRecord }
    row['Mã'] = vthh.ma
    row['Tên VTHH'] = vthh.ten ?? ''
    const doDayOpts = buildDoDayOptionsForVthh(vthh)
    const khoGiayOpts = buildKhoGiayOptionsForVthh(vthh)
    row['Độ dày/ ĐL'] = doDayOpts && doDayOpts.length > 0
      ? doDayOpts[0]
      : (((vthh.do_day ?? vthh.dinh_luong ?? '').trim().split(/[;,]/).map((x) => x.trim()).find(Boolean)) ?? '')
    row['Khổ giấy'] = khoGiayOpts && khoGiayOpts.length > 0
      ? khoGiayOpts[0]
      : (((vthh.kho_giay ?? '').trim().split(/[;,]/).map((x) => x.trim()).find(Boolean)) ?? '')
    row['ĐVT'] = vthh.dvt_chinh ?? ''
    row._vthh = vthh
    const isCodongia = initialDon != null || mauHienTai === 'codongia'
    if (isCodongia) {
      row['ĐG mua'] = getDonGiaHienThiWhenDvtChinh(vthh, row)
    }
    row['% thuế GTGT'] = vthh.thue_suat_gtgt ?? ''
    const opts = buildDvtOptionsForVthh(vthh)
    if (opts) row._dvtOptions = opts
    else delete row._dvtOptions
    ;(row as DonHangMuaGridLineRow & { _doDayOptions?: string[]; _khoGiayOptions?: string[] })._doDayOptions = doDayOpts ?? undefined
    ;(row as DonHangMuaGridLineRow & { _doDayOptions?: string[]; _khoGiayOptions?: string[] })._khoGiayOptions = khoGiayOpts ?? undefined
    if ((row[COL_DD_GH] ?? '').trim() === '') row[COL_DD_GH] = '0'
    next[rowIndex] = row
    setLines(next)
    setVthhDropdownRowIndex(null)
    setVthhDropdownRect(null)
  }

  /** Địa điểm GH 1: sync từ useEffect theo hình thức (kho.dia_chi, diaChiCongTrinh). */
  const effectiveDiaDiemFirst = diaDiemGiaoHangList[0] ?? ''

  useEffect(() => {
    const opts = getDiaDiemGhOptions(diaDiemGiaoHangList, effectiveDiaDiemFirst)
    const allowed = new Set(opts.map((o) => o.idx))
    setLines((prev) => {
      let changed = false
      const next = prev.map((line) => {
        if ((line['Mã'] ?? '').trim() === '') return line
        const raw = (line[COL_DD_GH] ?? '').trim()
        const n = parseInt(raw, 10)
        if (raw === '' || !Number.isFinite(n) || !allowed.has(n)) {
          changed = true
          return { ...line, [COL_DD_GH]: String(opts[0]?.idx ?? 0) } as unknown as DonHangMuaGridLineRow
        }
        return line
      })
      return changed ? next : prev
    })
  }, [diaDiemGiaoHangList, effectiveDiaDiemFirst])

  const buildPayload = (): DonHangMuaCreatePayload => {
    const isCodongia = initialDon != null || mauHienTai === 'codongia'
    let giaTriDonHang = 0
    const chiTiet = lines
      .filter((line) => (line['Mã'] ?? '').trim() !== '')
      .map((line) => {
        const donGia = isCodongia ? parseFloatVN(line['ĐG mua'] ?? '') : 0
        const soLuong = Math.max(0, parseFloatVN(line['Số lượng'] ?? ''))
        const thanhTien = isCodongia ? donGia * soLuong : 0
        const pt = isCodongia ? parsePctThueGtgtFromLine(line['% thuế GTGT'] ?? '') : null
        const tienThue = pt != null ? (thanhTien * pt) / 100 : 0
        giaTriDonHang += thanhTien + tienThue
        const ddRaw = (line[COL_DD_GH] ?? '').trim()
        let ddIdx = parseInt(ddRaw, 10)
        if (!Number.isFinite(ddIdx) || ddIdx < 0) ddIdx = 0
        return {
          ma_hang: (line['Mã'] ?? '').trim(),
          ten_hang: (line['Tên VTHH'] ?? '').trim(),
          dvt: (line['ĐVT'] ?? '').trim(),
          so_luong: soLuong,
          don_gia: donGia,
          thanh_tien: thanhTien,
          pt_thue_gtgt: pt,
          tien_thue_gtgt: pt != null ? tienThue : null,
          dd_gh_index: ddIdx,
          ...(isCodongia ? { ghi_chu: (line['Ghi chú'] ?? '').trim() } : {}),
        }
      })
    const diaDiemGiaoHangFull = [effectiveDiaDiemFirst.trim(), ...diaDiemGiaoHangList.slice(1).map((x) => x.trim()).filter(Boolean)].filter(Boolean).join('\n') || effectiveDiaDiemFirst.trim()
    const ngayGiaoHangPayload =
      phieuNhanTuDonHangMua ? ngayGiaoHang ?? ngayDonHang : ngayGiaoHang
    const payload: DonHangMuaCreatePayload = {
      tinh_trang: tinhTrang,
      ngay_don_hang: toIsoDate(ngayDonHang) || toIsoDate(new Date()),
      so_don_hang: soDonHang.trim() || 'DHM',
      ngay_giao_hang: ngayGiaoHangPayload ? toIsoDateTime(ngayGiaoHangPayload) : null,
      nha_cung_cap: nhaCungCapDisplay.trim(),
      dia_chi: diaChi.trim(),
      ...(laPhieuNhanNvthh ? { nguoi_giao_hang: nguoiGiaoHang.trim() } : {}),
      ma_so_thue: maSoThue.trim(),
      dien_giai: dienGiai.trim(),
      nv_mua_hang: nvMuaHang.trim(),
      dieu_khoan_tt: dieuKhoanTT.trim(),
      so_ngay_duoc_no: soNgayDuocNo.trim() || '0',
      dia_diem_giao_hang: diaDiemGiaoHangFull,
      dieu_khoan_khac: dieuKhoanKhac.trim(),
      gia_tri_don_hang: giaTriDonHang,
      so_chung_tu_cukcuk: thamChieu.trim(),
      doi_chieu_don_mua_id: lienKetDonMuaId ?? undefined,
      chiTiet,
      hinh_thuc:
        hasNhapKho && hasKhongNhapKho ? 'ca_hai' : hasKhongNhapKho && !hasNhapKho ? 'khong_nhap_kho' : 'nhap_kho',
      kho_nhap_id: hasNhapKho ? khoNhapId || undefined : undefined,
      ten_cong_trinh: tenCongTrinh.trim() || undefined,
      dia_chi_cong_trinh: diaChiCongTrinh?.trim() || undefined,
      attachments:
        attachments.length > 0
          ? chuanHoaDuongDanDinhKemDonHangMua(attachments, soDonHang.trim() || 'DHM', nccPartDinhKem)
          : undefined,
      ...(phieuNhanTuDonHangMua
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
            phieu_chi_nha_cung_cap: phieuChiNcc.trim() || undefined,
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
                ? chuanHoaDuongDanDinhKemDonHangMua(phieuChiAttachments, soDonHang.trim() || 'DHM', nccPartDinhKem)
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
          ? phieuNhanTuDonHangMua
            ? 'Vui lòng chọn hoặc nhập đơn mua hàng (Nhận hàng từ).'
            : 'Vui lòng chọn hoặc nhập mã đơn mua hàng đối chiếu.'
          : 'Vui lòng nhập Tiêu đề.',
        refTieuDeInput.current,
      )
    }
    if (!nhaCungCapDisplay.trim()) {
      return fail('ncc', 'Vui lòng chọn Nhà cung cấp.', refNccWrap.current?.querySelector('input') ?? refNccWrap.current)
    }
    const tgGiaoHangTenLoi =
      phieuNhanTuDonHangMua && phieuNhanTabChung === 'phieu-chi' ? 'TG chi' : 'TG nhận hàng'
    if (phieuNhanTuDonHangMua) {
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
      return fail('tg_nhan', `Vui lòng chọn ${tgGiaoHangTenLoi}.`, refTgNhanDmhInput.current)
    }
    if (!soDonHang.trim()) {
      return fail('so_don', `${soDonLabelHienThi} không được để trống.`, null)
    }
    const detailLines = lines.filter((line) => (line['Mã'] ?? '').trim() !== '')
    if (detailLines.length === 0) {
      return fail('chi_tiet', 'Phải có ít nhất một dòng chi tiết VTHH.', refDmhChiTietSection.current)
    }
    const badSlIdx = lines.findIndex((line) => {
      if (!(line['Mã'] ?? '').trim()) return false
      return parseFloatVN(line['Số lượng'] ?? '') <= 0
    })
    if (badSlIdx >= 0) {
      const el = document.querySelector(`[data-dmh-sl-idx="${badSlIdx}"]`) as HTMLElement | null
      return fail(`so_luong_${badSlIdx}`, 'Số lượng từng dòng VTHH phải lớn hơn 0.', el)
    }
    if (
      !phieuNhanTuDonHangMua &&
      ngayGiaoHang &&
      ngayDonHang &&
      ngayGiaoHang.getTime() < ngayDonHang.getTime()
    ) {
      return fail('tg_nhan', `${tgGiaoHangTenLoi} không được nhỏ hơn TG tạo.`, refTgNhanDmhInput.current)
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
      if (initialDon) {
        api.put(initialDon.id, payload)
      } else {
        await api.post(payload)
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

  const formatHanDateLocal = (d: Date) => {
    const day = d.getDate()
    const mo = d.getMonth() + 1
    const y = d.getFullYear()
    return `${String(day).padStart(2, '0')}/${String(mo).padStart(2, '0')}/${y}`
  }
  /** Đủ TG nhận + số ngày được nợ (đã nhập) → tính từ TG nhận; thiếu → hiển thị ngày hiện tại. */
  const ngayGiaoChoHanTt =
    phieuNhanTuDonHangMua ? ngayGiaoHang ?? ngayDonHang : ngayGiaoHang
  const hanThanhToanDayDu = Boolean(ngayGiaoChoHanTt && String(soNgayDuocNo ?? '').replace(/\D/g, '') !== '')
  const hanThanhToanHienThi = (() => {
    const todayStr = formatHanDateLocal(new Date())
    if (!ngayGiaoChoHanTt) return todayStr
    const raw = String(soNgayDuocNo ?? '').replace(/\D/g, '')
    if (raw === '') return todayStr
    const n = parseInt(raw, 10)
    const days = Number.isFinite(n) && n >= 0 ? n : 0
    return formatHanDateLocal(addDays(ngayGiaoChoHanTt, days))
  })()

  const { tongTienHang, tienThue, tongTienThanhToan } = computeDonHangMuaFooterTotals(lines)
  const soDong = lines.length

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
      laPhieuNhanNvthh && o.value === TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG
        ? { value: TINH_TRANG_NVTHH_DA_NHAP_KHO, label: TINH_TRANG_NVTHH_DA_NHAP_KHO }
        : { value: o.value, label: o.label }
    )
    if (tinhTrang && !base.some((o) => o.value === tinhTrang)) {
      return [...base, { value: tinhTrang, label: tinhTrang }]
    }
    return base
  }, [tinhTrang, laPhieuNhanNvthh])

  const phieuNhanLienKetTuDonMua = useMemo(() => {
    if (!initialDon?.id || phieuNhanTuDonHangMua) return []
    const all = nhanVatTuHangHoaGetAll({ ...getDefaultNhanVatTuHangHoaFilter(), tu: '', den: '' })
    return all.filter((p) => (p.doi_chieu_don_mua_id ?? '').trim() === initialDon.id)
  }, [initialDon?.id, phieuNhanTuDonHangMua])

  const showLienQuanPhieuNhanHang =
    !phieuNhanTuDonHangMua &&
    Boolean(initialDon?.id) &&
    tinhTrang === TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG

  /** Cột hiển thị theo rule mau_gia.mdc — codongia khi đang xem/sửa đơn; khongdongia khi chọn mẫu không đơn giá; luôn kèm cột ĐĐGH. */
  const coBangCoDonGiaTuDau =
    initialDon != null || Boolean(prefillChiTiet && prefillChiTiet.length > 0)
  const currentColumns = insertVariantColumns((coBangCoDonGiaTuDau ? mauDhmCoDonGiaDisplay : mauHienTai === 'codongia' ? mauDhmCoDonGiaDisplay : mauDhmKhongDonGiaDisplay) as readonly string[])
  /** Mẫu không đơn giá (thêm mới): ẩn tổng tiền / thuế / thanh toán ở footer. */
  const hienThiFooterTongTien = coBangCoDonGiaTuDau || mauHienTai === 'codongia'
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
          {phieuNhanTuDonHangMua
            ? tieuDePhieuNvthhDayDu
            : `${formTitle}${effectiveReadOnly ? ' - Chế độ xem' : ''}${nhaCungCapDisplay ? ` - ${nhaCungCapDisplay}` : ''}`}
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
        {!phieuNhanTuDonHangMua && (
          <div style={toolbarDinhKemWrap}>
            <button
              ref={refDinhKemBtn}
              type="button"
              style={toolbarBtn}
              title="Đính kèm chứng từ"
              onClick={() => {
                setShowDinhKemModal((o) => {
                  const next = !o
                  if (next) setDinhKemModalAnchor('toolbar')
                  return next
                })
              }}
            >
              <Paperclip size={14} /> Đính kèm
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
          <button type="button" style={toolbarBtn} disabled={effectiveReadOnly || initialDon != null || phieuNhanTuDonHangMua}>
            <FileText size={14} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>Mẫu <ChevronDown size={10} /></span>
          </button>
          {dropdownMau && !effectiveReadOnly && initialDon == null && !phieuNhanTuDonHangMua && (
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
                        setLines((prev) => (prev.length > 0 ? migrateDonHangLinesToCoDonGia(prev, vatTuList) : mauCoDonGiaLines()))
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

      {doiChieuSource === 'don_mua_hang' && !phieuNhanTuDonHangMua && (
        <Modal
          open={showTimDonMuaHangPopup}
          onClose={() => setShowTimDonMuaHangPopup(false)}
          title="Chọn đơn mua hàng"
          size="md"
        >
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {(() => {
              const dmhChonTuDonList = donHangMuaListForDoiChieuNhanHang()
              return (
                <>
                  {dmhChonTuDonList.map((dmh) => {
                    const ngayDdMm = formatIsoToDdMmYyyy(dmh.ngay_don_hang)
                    return (
                      <div
                        key={dmh.id}
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
                          applyChonDonMuaHangDoiChieu(dmh)
                          setShowTimDonMuaHangPopup(false)
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{dmh.so_don_hang}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dmh.nha_cung_cap || ''}</span>
                        <span style={{ color: 'var(--text-muted)', textAlign: 'right' }}>{ngayDdMm}</span>
                      </div>
                    )
                  })}
                  {dmhChonTuDonList.length === 0 && (
                    <div style={{ padding: 16, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                      Không có đơn mua hàng đủ điều kiện đối chiếu.
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </Modal>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '8px 12px' }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {phieuNhanTuDonHangMua && (
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
            const thongTinChungFields = (
              <>
            <div style={fieldRowDyn}>
              <label style={labelStyle}>{phieuNhanTuDonHangMua ? 'Nhận hàng từ:' : 'Tiêu đề'}</label>
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
                    {thamChieu && lienKetDonMuaId && doiChieuSource === 'don_mua_hang' ? (
                      <button
                        type="button"
                        title="Xem đơn mua hàng liên kết"
                        style={{
                          background: 'none', border: 'none', padding: 0,
                          cursor: 'pointer', color: 'var(--accent)', fontSize: 11,
                          textDecoration: 'underline', textUnderlineOffset: 2,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
                          textTransform: 'uppercase',
                        }}
                        onClick={() => {
                          const all = donHangMuaGetAll({ ...getDefaultDonHangMuaFilter(), tu: '', den: '' })
                          const rec = all.find((d) => d.id === lienKetDonMuaId) ?? null
                          if (!rec) return
                          setViewDonHangMuaRecord(rec)
                          setShowDonMuaHangPopup(true)
                        }}
                      >
                        {thamChieu}
                      </button>
                    ) : (
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
                    ref={phieuNhanTuDonHangMua && doiChieuSource === 'don_mua_hang' ? refNhanHangTuWrap : undefined}
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
                      position: phieuNhanTuDonHangMua && doiChieuSource === 'don_mua_hang' ? 'relative' : undefined,
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
                          ...(phieuNhanTuDonHangMua ? { textTransform: 'uppercase' as const } : {}),
                        }}
                        value={thamChieu}
                        onChange={(e) => {
                          const raw = e.target.value
                          setThamChieu(phieuNhanTuDonHangMua ? raw.toUpperCase() : raw)
                          if (valErrKey === 'doi_chieu') setValErrKey(null)
                        }}
                        onFocus={() => {
                          if (phieuNhanTuDonHangMua && doiChieuSource === 'don_mua_hang' && !effectiveReadOnly) {
                            setNhanHangTuDropdownOpen(true)
                          }
                        }}
                        onClick={() => {
                          if (doiChieuSource === 'don_mua_hang' && !effectiveReadOnly) {
                            if (phieuNhanTuDonHangMua) setNhanHangTuDropdownOpen(true)
                            else setShowTimDonMuaHangPopup(true)
                          }
                        }}
                        readOnly={false}
                        disabled={false}
                        placeholder={
                          phieuNhanTuDonHangMua ? 'Bấm để chọn đơn Chưa thực hiện…' : 'Nhập tiêu đề'
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            {phieuNhanTuDonHangMua &&
            doiChieuSource === 'don_mua_hang' &&
            nhanHangTuDropdownOpen &&
            nhanHangTuDropdownRect &&
            !effectiveReadOnly
              ? ReactDOM.createPortal(
                  (() => {
                    const q = thamChieu.trim().toLowerCase()
                    const listNvthhNhanTu = donHangMuaListChoPhieuNhanTuDonHangMua().filter((dmh) => {
                      if (!q) return true
                      const ma = (dmh.so_don_hang ?? '').toLowerCase()
                      const ten = (dmh.so_chung_tu_cukcuk ?? '').toLowerCase()
                      const ncc = (dmh.nha_cung_cap ?? '').toLowerCase()
                      return ma.includes(q) || ten.includes(q) || ncc.includes(q)
                    })
                    return (
                      <div
                        data-nhan-hang-tu-dropdown
                        style={{
                          position: 'fixed',
                          top: nhanHangTuDropdownRect.top,
                          left: nhanHangTuDropdownRect.left,
                          width: nhanHangTuDropdownRect.width,
                          maxHeight: 240,
                          overflowY: 'auto',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-strong)',
                          borderRadius: 4,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          zIndex: 1060,
                        }}
                      >
                        {listNvthhNhanTu.map((dmh) => {
                          const tenDhm = (dmh.so_chung_tu_cukcuk ?? '').trim() || '—'
                          const ma = (dmh.so_don_hang ?? '').trim()
                          return (
                            <div
                              key={dmh.id}
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
                                applyChonDonMuaHangDoiChieu(dmh)
                                setNhanHangTuDropdownOpen(false)
                              }}
                            >
                              <span style={{ fontWeight: 600 }}>{ma}</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }} title={tenDhm}>
                                {tenDhm}
                              </span>
                              <span
                                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}
                                title={dmh.nha_cung_cap || ''}
                              >
                                {dmh.nha_cung_cap || ''}
                              </span>
                            </div>
                          )
                        })}
                        {listNvthhNhanTu.length === 0 && (
                          <div style={{ padding: 12, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                            Không có đơn mua hàng ở tình trạng Chưa thực hiện.
                          </div>
                        )}
                      </div>
                    )
                  })(),
                  document.body,
                )
              : null}
            <div style={{ ...fieldRowDyn, alignItems: 'center', width: '100%', minWidth: 0 }}>
              <label style={labelStyle}>Nhà cung cấp</label>
              <div
                ref={refNccWrap}
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
                  border: valErrKey === 'ncc' ? HTQL_FORM_ERROR_BORDER : '1px solid transparent',
                }}
              >
                <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}>
                  <input
                    style={{ ...inputStyle, ...lookupInputWithChevronStyle, flex: 1, minWidth: 0, cursor: effectiveReadOnly ? 'default' : 'pointer', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}
                    value={nccDropdownOpen ? nccSearchKeyword : nhaCungCapDisplay}
                    onChange={(e) => {
                      if (effectiveReadOnly) return
                      setNccSearchKeyword(e.target.value)
                      if (!nccDropdownOpen) setNccDropdownOpen(true)
                      if (valErrKey === 'ncc') setValErrKey(null)
                    }}
                    onFocus={(e) => {
                      if (effectiveReadOnly) return
                      setNccSearchKeyword(nhaCungCapDisplay)
                      setNccDropdownOpen(true)
                      e.currentTarget.select()
                    }}
                    onClick={(e) => {
                      if (!effectiveReadOnly) e.currentTarget.select()
                    }}
                    placeholder="Nhập để tìm hoặc chọn nhà cung cấp..."
                    readOnly={effectiveReadOnly}
                    disabled={effectiveReadOnly}
                  />
                  <span style={lookupChevronOverlayStyle} aria-hidden><ChevronDown size={12} style={{ color: 'var(--accent-text)' }} /></span>
                </div>
                <button type="button" style={lookupActionButtonStyle} title="Thêm nhà cung cấp" onClick={() => setShowThemNccForm(true)} disabled={effectiveReadOnly} aria-disabled={effectiveReadOnly}><Plus size={12} /></button>
              </div>
              <label style={{ ...labelStyle, minWidth: 82, width: 82, flexShrink: 0, textAlign: 'right' }}>Mã số thuế</label>
              <input
                style={{
                  ...inputStyle,
                  flex: '0 0 auto',
                  width: MA_SO_THUE_FIELD_WIDTH,
                  minWidth: MA_SO_THUE_FIELD_WIDTH,
                  maxWidth: MA_SO_THUE_FIELD_WIDTH,
                  boxSizing: 'border-box',
                }}
                value={maSoThue}
                onChange={(e) => setMaSoThue(e.target.value)}
                readOnly={effectiveReadOnly}
                disabled={effectiveReadOnly}
              />
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
                          if (valErrKey === 'ncc') setValErrKey(null)
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
            {phieuNhanTuDonHangMua ? (
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
            {(!phieuNhanTuDonHangMua || chungTuMuaCachThanhToan === 'chua_thanh_toan') && (
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
                  title={hanThanhToanDayDu ? 'TG nhận hàng + số ngày được nợ' : 'Chưa đủ TG nhận hàng hoặc số ngày được nợ — đang hiển thị ngày hiện tại'}
                />
              </div>
            </div>
            )}
            {!phieuNhanTuDonHangMua && (
            <div style={fieldRowDyn}>
              <label style={labelStyle}>Hình thức</label>
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
                    style={{ ...inputStyle, ...lookupInputWithChevronStyle, width: '100%', minWidth: 0, cursor: hinhThucLocked ? 'default' : 'pointer', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT, boxSizing: 'border-box' }}
                    value={hinhThucSelectedIds.length ? hinhThucSelectedIds.map((id) => hinhThucList.find((x) => x.id === id)?.ten).filter(Boolean).join(', ') : 'Chọn hình thức'}
                    readOnly
                    disabled={hinhThucLocked}
                  />
                  <span style={lookupChevronOverlayStyle} aria-hidden><ChevronDown size={12} style={{ color: 'var(--accent-text)' }} /></span>
                </div>
                {!hinhThucLocked && (
                  <button type="button" style={lookupActionButtonStyle} title="Thêm hình thức" onClick={() => setShowThemHinhThucModal(true)} aria-label="Thêm hình thức">
                    <Plus size={12} />
                  </button>
                )}
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
            {(hasKhongNhapKho || hasNhapKho) && (
              phieuNhanTuDonHangMua ? (
                <>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    width: '100%',
                    minWidth: 0,
                  }}
                >
                  {(() => {
                    const order = buildHinhThucDiaDiemOrder(hinhThucSelectedIds, hinhThucList)
                    const coKho = order.some((o) => o.type === 'kho_nhap')
                    const coTenCt = order.some((o) => o.type === 'ten_cong_trinh')
                    const khoLabelForWidth = (khoDropdownOpen ? khoSearchKeyword : khoNhapId ? (khoList.find((k) => k.id === khoNhapId)?.label ?? '') : '').trim()
                    const khoTypingPx =
                      Math.ceil((khoLabelForWidth || '-- Chọn --').length * 7.2) + LOOKUP_CHEVRON_WIDTH + 52
                    const khoFitPx = Math.min(Math.max(Math.max(khoNhapPickWidthFromListMaxPx, khoTypingPx), 96), 520)
                    const khoPick = (
                      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flex: '0 0 auto', flexShrink: 0 }}>
                        <div
                          ref={refKhoWrap}
                          style={{
                            display: 'flex',
                            gap: 2,
                            alignItems: 'center',
                            position: 'relative',
                            height: LOOKUP_CONTROL_HEIGHT,
                            minHeight: LOOKUP_CONTROL_HEIGHT,
                            borderRadius: 4,
                            boxSizing: 'border-box',
                            width: khoFitPx,
                            minWidth: khoFitPx,
                            maxWidth: khoFitPx,
                            flexShrink: 0,
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT, width: '100%' }}>
                            <input
                              style={{
                                ...inputStyle,
                                ...lookupInputWithChevronStyle,
                                width: '100%',
                                minWidth: 0,
                                maxWidth: '100%',
                                boxSizing: 'border-box',
                                cursor: effectiveReadOnly ? 'default' : 'pointer',
                                height: LOOKUP_CONTROL_HEIGHT,
                                minHeight: LOOKUP_CONTROL_HEIGHT,
                              }}
                              value={
                                khoDropdownOpen
                                  ? khoSearchKeyword
                                  : khoNhapId
                                    ? (khoList.find((k) => k.id === khoNhapId)?.label ?? '')
                                    : ''
                              }
                              onChange={(e) => {
                                if (effectiveReadOnly) return
                                setKhoSearchKeyword(e.target.value)
                                if (!khoDropdownOpen) setKhoDropdownOpen(true)
                              }}
                              onFocus={(e) => {
                                if (effectiveReadOnly) return
                                setKhoSearchKeyword(khoNhapId ? (khoList.find((k) => k.id === khoNhapId)?.label ?? '') : '')
                                setKhoDropdownOpen(true)
                                e.currentTarget.select()
                              }}
                              onClick={(e) => { if (!effectiveReadOnly) e.currentTarget.select() }}
                              placeholder="-- Chọn --"
                              readOnly={effectiveReadOnly}
                              disabled={effectiveReadOnly}
                            />
                            <span style={lookupChevronOverlayStyle} aria-hidden><ChevronDown size={12} style={{ color: 'var(--accent-text)' }} /></span>
                          </div>
                          {!effectiveReadOnly && (
                            <button type="button" style={lookupActionButtonStyle} title="Thêm kho mới" onClick={() => setShowThemKhoModal(true)} aria-label="Thêm kho"><Plus size={12} /></button>
                          )}
                        </div>
                      </div>
                    )
                    const hangKhoTenCt = (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: 8,
                          width: '100%',
                          minWidth: 0,
                        }}
                      >
                        <label style={{ ...labelStyle, minWidth: 90, flexShrink: 0 }}>Kho nhập</label>
                        {khoPick}
                        <label style={{ ...labelStyle, minWidth: 90, flexShrink: 0 }}>Tên công trình</label>
                        <input
                          style={{ ...inputStyle, flex: '1 1 200px', minWidth: 140, maxWidth: '100%', boxSizing: 'border-box' }}
                          value={tenCongTrinh}
                          onChange={(e) => setTenCongTrinh(e.target.value)}
                          readOnly={effectiveReadOnly}
                          disabled={effectiveReadOnly}
                          placeholder="Nhập tên công trình — địa chỉ nhập tại Địa điểm GH tương ứng"
                          title="Địa chỉ công trình nhập tại dòng Địa điểm GH theo thứ tự hình thức"
                        />
                      </div>
                    )
                    if (coKho && coTenCt) return hangKhoTenCt
                    if (coKho) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0, flexWrap: 'wrap' }}>
                          <label style={{ ...labelStyle, minWidth: 90, flexShrink: 0 }}>Kho nhập</label>
                          {khoPick}
                        </div>
                      )
                    }
                    if (coTenCt) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0, flexWrap: 'wrap' }}>
                          <label style={{ ...labelStyle, minWidth: 90, flexShrink: 0 }}>Tên công trình</label>
                          <input
                            style={{ ...inputStyle, flex: 1, minWidth: 120, maxWidth: '100%', boxSizing: 'border-box' }}
                            value={tenCongTrinh}
                            onChange={(e) => setTenCongTrinh(e.target.value)}
                            readOnly={effectiveReadOnly}
                            disabled={effectiveReadOnly}
                            placeholder="Nhập tên công trình — địa chỉ nhập tại Địa điểm GH tương ứng"
                            title="Địa chỉ công trình nhập tại dòng Địa điểm GH theo thứ tự hình thức"
                          />
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
                  {khoDropdownOpen && khoDropdownRect && (
                    <div
                      data-kho-dropdown
                      style={{
                        position: 'fixed',
                        top: khoDropdownRect.top,
                        left: khoDropdownRect.left,
                        width: khoDropdownRect.width,
                        maxHeight: 220,
                        overflowY: 'auto',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 4,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 1050,
                      }}
                    >
                      {khoList
                        .filter((k) => matchSearchKeyword(k.label, khoSearchKeyword))
                        .slice(0, 100)
                        .map((k) => (
                          <div
                            key={k.id}
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
                              setKhoNhapId(k.id)
                              setKhoSearchKeyword(k.label)
                              setKhoDropdownOpen(false)
                            }}
                          >
                            {k.label}
                          </div>
                        ))}
                      {khoList.filter((k) => matchSearchKeyword(k.label, khoSearchKeyword)).length === 0 && (
                        <div style={{ padding: '10px', fontSize: 11, color: 'var(--text-muted)' }}>Không tìm thấy kho phù hợp.</div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ ...fieldRowDyn, flexWrap: 'wrap', gap: 8 }}>
                  {(() => {
                    const order = buildHinhThucDiaDiemOrder(hinhThucSelectedIds, hinhThucList)
                    return order.map(({ type }, idxHt) =>
                      type === 'ten_cong_trinh' ? (
                        <div key={`ht-ten-${idxHt}`} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 200px', minWidth: 0 }}>
                          <label style={{ ...labelStyle, minWidth: 90 }}>Tên công trình</label>
                          <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} value={tenCongTrinh} onChange={(e) => setTenCongTrinh(e.target.value)} readOnly={effectiveReadOnly} disabled={effectiveReadOnly} placeholder="Nhập tên công trình — địa chỉ nhập tại Địa điểm GH tương ứng" title="Địa chỉ công trình nhập tại dòng Địa điểm GH theo thứ tự hình thức" />
                        </div>
                      ) : (
                        <div key={`ht-kho-${idxHt}`} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                          <label style={{ ...labelStyle, minWidth: 90 }}>Kho nhập</label>
                          <div
                            ref={refKhoWrap}
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
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}>
                              <input
                                style={{ ...inputStyle, ...lookupInputWithChevronStyle, flex: 1, minWidth: 0, cursor: effectiveReadOnly ? 'default' : 'pointer', height: LOOKUP_CONTROL_HEIGHT, minHeight: LOOKUP_CONTROL_HEIGHT }}
                                value={
                                  khoDropdownOpen
                                    ? khoSearchKeyword
                                    : khoNhapId
                                      ? (khoList.find((k) => k.id === khoNhapId)?.label ?? '')
                                      : ''
                                }
                                onChange={(e) => {
                                  if (effectiveReadOnly) return
                                  setKhoSearchKeyword(e.target.value)
                                  if (!khoDropdownOpen) setKhoDropdownOpen(true)
                                }}
                                onFocus={(e) => {
                                  if (effectiveReadOnly) return
                                  setKhoSearchKeyword(khoNhapId ? (khoList.find((k) => k.id === khoNhapId)?.label ?? '') : '')
                                  setKhoDropdownOpen(true)
                                  e.currentTarget.select()
                                }}
                                onClick={(e) => { if (!effectiveReadOnly) e.currentTarget.select() }}
                                placeholder="-- Chọn --"
                                readOnly={effectiveReadOnly}
                                disabled={effectiveReadOnly}
                              />
                              <span style={lookupChevronOverlayStyle} aria-hidden><ChevronDown size={12} style={{ color: 'var(--accent-text)' }} /></span>
                            </div>
                            {!effectiveReadOnly && (
                              <button type="button" style={lookupActionButtonStyle} title="Thêm kho mới" onClick={() => setShowThemKhoModal(true)} aria-label="Thêm kho"><Plus size={12} /></button>
                            )}
                          </div>
                          {khoDropdownOpen && khoDropdownRect && (
                            <div
                              data-kho-dropdown
                              style={{
                                position: 'fixed',
                                top: khoDropdownRect.top,
                                left: khoDropdownRect.left,
                                width: khoDropdownRect.width,
                                maxHeight: 220,
                                overflowY: 'auto',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-strong)',
                                borderRadius: 4,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                zIndex: 1050,
                              }}
                            >
                              {khoList
                                .filter((k) => matchSearchKeyword(k.label, khoSearchKeyword))
                                .slice(0, 100)
                                .map((k) => (
                                  <div
                                    key={k.id}
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
                                      setKhoNhapId(k.id)
                                      setKhoSearchKeyword(k.label)
                                      setKhoDropdownOpen(false)
                                    }}
                                  >
                                    {k.label}
                                  </div>
                                ))}
                              {khoList.filter((k) => matchSearchKeyword(k.label, khoSearchKeyword)).length === 0 && (
                                <div style={{ padding: '10px', fontSize: 11, color: 'var(--text-muted)' }}>Không tìm thấy kho phù hợp.</div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    )
                  })()}
                </div>
              )
            )}
            <div style={fieldRowDyn}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {(() => {
                  const diaDiemSlotOrder = buildHinhThucDiaDiemOrder(hinhThucSelectedIds, hinhThucList)
                  return diaDiemGiaoHangList.map((addr, i) => {
                    const slotType = diaDiemSlotOrder[i]?.type
                    const placeholder =
                      slotType === 'kho_nhap'
                        ? `Địa chỉ kho nhập (ĐĐGH ${i + 1})`
                        : slotType === 'ten_cong_trinh'
                          ? `Địa chỉ công trình (ĐĐGH ${i + 1})`
                          : i === 0
                            ? 'Nhập địa chỉ (gợi ý VN)'
                            : `Địa điểm GH ${i + 1}`
                    return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
                    <label style={{ ...labelStyle, minWidth: 90, paddingTop: phieuNhanTuDonHangMua ? 2 : 4 }}>Địa điểm GH {i + 1}</label>
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
                    style={{ alignSelf: 'flex-start', marginLeft: 98, marginTop: phieuNhanTuDonHangMua ? 0 : undefined, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', fontSize: 10, background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  >
                    <Plus size={12} /> Thêm địa điểm GH
                  </button>
                )}
              </div>
            </div>
            </>
            )
            return phieuNhanTuDonHangMua ? (
              <div style={{ flex: '1 1 320px', minWidth: 280, display: 'flex', flexDirection: 'column', alignSelf: 'stretch', marginBottom: 0, minHeight: 0 }}>
                <div className={dmhDetailStyles.detailTabBar} role="tablist" aria-label="Thông tin chứng từ">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={phieuNhanTabChung === 'phieu-nhap'}
                    className={phieuNhanTabChung === 'phieu-nhap' ? dmhDetailStyles.detailTabActive : dmhDetailStyles.detailTab}
                    style={phieuTabBarBtnCompact}
                    onClick={() => setPhieuNhanTabChung('phieu-nhap')}
                  >
                    Phiếu nhập
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={phieuNhanTabChung === 'phieu-chi'}
                    className={phieuNhanTabChung === 'phieu-chi' ? dmhDetailStyles.detailTabActive : dmhDetailStyles.detailTab}
                    style={phieuTabBarBtnCompact}
                    onClick={() => setPhieuNhanTabChung('phieu-chi')}
                  >
                    Phiếu chi
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={phieuNhanTabChung === 'hoa-don'}
                    className={phieuNhanTabChung === 'hoa-don' ? dmhDetailStyles.detailTabActive : dmhDetailStyles.detailTab}
                    style={phieuTabBarBtnCompact}
                    onClick={() => setPhieuNhanTabChung('hoa-don')}
                  >
                    Hóa đơn
                  </button>
                </div>
                <div
                  className={dmhDetailStyles.detailTabPanel}
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
                      <label style={labelStyle}>Nhà cung cấp</label>
                      <input
                        style={inputStyle}
                        value={phieuChiNcc}
                        onChange={(e) => setPhieuChiNcc(e.target.value)}
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
                            title="Điền tự động từ danh bạ nhà cung cấp"
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
                              title={(phieuChiNganHangNhan || '').trim() || 'Điền tự động từ danh bạ nhà cung cấp'}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '3 1 200px', minWidth: 120 }}>
                            <span style={phieuChiInlineLabel}>Tên người nhận</span>
                            <input
                              style={phieuChiTenNguoiField}
                              value={phieuChiTenChuTkNhan}
                              readOnly
                              disabled={effectiveReadOnly}
                              title="Điền tự động từ danh bạ nhà cung cấp"
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
                      <label style={labelStyle}>Nhà cung cấp</label>
                      <input
                        style={{ ...inputStyle, flex: '1 1 160px', minWidth: 120 }}
                        value={nhaCungCapDisplay}
                        onChange={(e) => setNhaCungCapDisplay(e.target.value)}
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
                          title="Điền tự động từ danh bạ nhà cung cấp (phiếu chi CK)"
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
                              (phieuChiNganHangNhan || '').trim() || 'Điền tự động từ danh bạ nhà cung cấp (phiếu chi CK)'
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
                            title="Điền tự động từ danh bạ nhà cung cấp (phiếu chi CK)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ ...groupBox, flex: '1 1 320px', minWidth: 560, marginBottom: 0, display: 'flex', flexDirection: 'column', alignSelf: 'stretch' }}>
                <div style={groupBoxTitle}>Thông tin chung</div>
                {thongTinChungFields}
              </div>
            )
          })()}

          <div
            style={{
              ...groupBox,
              width: phieuNhanTuDonHangMua ? 266 : 268,
              minWidth: phieuNhanTuDonHangMua ? 266 : 268,
              marginBottom: 0,
              flexShrink: 0,
              ...(phieuNhanTuDonHangMua ? { padding: '6px 8px', gap: FIELD_ROW_GAP } : {}),
              display: 'flex',
              flexDirection: 'column',
              alignSelf: 'stretch',
              minHeight: 0,
            }}
          >
            <div style={{ ...groupBoxTitle, ...(phieuNhanTuDonHangMua ? { marginBottom: 4 } : {}) }}>
              {phieuNhanTuDonHangMua ? (phieuNhanTabChung === 'hoa-don' ? 'Hóa đơn' : 'Chứng từ') : 'Đơn hàng'}
            </div>
            {phieuNhanTuDonHangMua && phieuNhanTabChung === 'hoa-don' ? (
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
                      style={{ ...inputStyle, width: '100%', paddingRight: 6, boxSizing: 'border-box' }}
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
                {phieuNhanTuDonHangMua ? (
                  phieuNhanTabChung === 'phieu-chi' ? (
                    <>
                      <div style={fieldRowDyn}>
                        <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>{soDonLabelHienThi}</label>
                        <div style={nvthhChungTuValueCellWrap}>
                          <input
                            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', cursor: 'default' }}
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
                            style={{ ...inputStyle, width: '100%', paddingRight: 6, boxSizing: 'border-box' }}
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
                            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', cursor: 'default' }}
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
                            style={{ ...inputStyle, width: '100%', paddingRight: 6, boxSizing: 'border-box' }}
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
                        <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', cursor: 'default' }} value={soDonHang} readOnly disabled tabIndex={-1} />
                      </div>
                    </div>
                    <div style={fieldRowDyn}>
                      <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>Tình trạng</label>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <select
                          className="htql-don-hang-select"
                          style={{ ...inputStyle, width: '100%', paddingRight: 6, boxSizing: 'border-box' }}
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
                                ref={refTgNhanDmhInput}
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
              <label style={{ ...labelStyle, minWidth: LABEL_DON_HANG_BOX }}>NV mua hàng</label>
              <DonHangBoxValueLikeNvMuaHang
                readOnly={effectiveReadOnly}
                fixedBandWidth={phieuNhanTuDonHangMua ? NVTHH_DON_HANG_BOX_VALUE_BAND_PX : undefined}
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
                    style={{ ...inputStyle, ...lookupInputWithChevronStyle, width: '100%', minWidth: 0 }}
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
                <div className={dmhDetailStyles.lienQuanPhieuNhanTitle}>Liên quan</div>
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
                            className={dmhDetailStyles.lienQuanPhieuNhanLink}
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
            ref={refDmhChiTietSection}
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
            <div ref={refChiTietGridScroll} style={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 11, tableLayout: 'fixed', minWidth: tableMinWidth }}>
                <colgroup>
                  <col style={{ width: COL_WIDTH_ACTION, minWidth: COL_WIDTH_ACTION, maxWidth: COL_WIDTH_ACTION }} />
                  <col style={{ width: COL_WIDTH_STT, minWidth: COL_WIDTH_STT, maxWidth: COL_WIDTH_STT }} />
                  {currentColumns.map((col) => (
                    <col key={col} style={colWidthStyle(col, col === 'Ghi chú' ? ghiChuFill : undefined)} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th
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
                      const stickyTrai = cotChiTietLaCotTraiCoDinh(col)
                      return (
                        <th
                          key={col}
                          style={{
                            ...gridThStyle,
                            ...(stickyTrai ? mergeThStickyGocTrai(stickyTrai) : mergeThStickyChiTop()),
                            ...colWidthStyle(col, col === 'Ghi chú' ? ghiChuFill : undefined),
                            paddingLeft: CHI_TIET_COLS_NUMERIC.has(col) ? 2 : 5,
                            paddingRight: CHI_TIET_COLS_NUMERIC.has(col) ? 6 : undefined,
                            ...chiTietNumericThTdStyle(col),
                            ...(col === currentColumns[currentColumns.length - 1] ? { borderRight: 'none' } : {}),
                          }}
                        >
                          {gridColumnHeaderLabel(col)}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={currentColumns.length + 2} style={{ ...gridTdStyle, background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: 10, textAlign: 'center' }}>{chiTietReadOnly ? 'Chưa có dòng.' : chiTietGridLocked ? 'Chưa có dòng.' : 'Chưa có dòng. Bấm "Thêm dòng" để thêm.'}</td>
                    </tr>
                  ) : (
                    lines.map((line, idx) => (
                      <tr key={idx} className={dmhDetailStyles.chiTietDataRow}>
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
                                style={{ ...inputStyle, ...chiTietNumericInputStyle(col), width: '100%', border: '1px solid transparent', minHeight: 22, height: 22, cursor: 'default', background: 'var(--bg-secondary)' }}
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
                                                const opts = getDiaDiemGhOptions(diaDiemGiaoHangList, effectiveDiaDiemFirst)
                                                const raw = (line[COL_DD_GH] ?? '').trim()
                                                const n = parseInt(raw, 10)
                                                const hit = Number.isFinite(n) ? opts.find((o) => o.idx === n) : undefined
                                                return hit?.label ?? (Number.isFinite(n) ? `ĐĐGH ${n + 1}` : opts[0]?.label ?? 'ĐĐGH 1')
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
                                    const prev = r[idx] as DonHangMuaGridLineRow
                                    const nextRow = {
                                      ...prev,
                                      [col]: ma,
                                      'Tên VTHH': cleared ? '' : (item ? item.ten : prev['Tên VTHH']),
                                      'Độ dày/ ĐL': cleared ? '' : item ? (((item.do_day ?? item.dinh_luong ?? '').trim().split(/[;,]/).map((x) => x.trim()).find(Boolean)) || '') : prev['Độ dày/ ĐL'],
                                      'Khổ giấy': cleared ? '' : item ? (((item.kho_giay ?? '').trim().split(/[;,]/).map((x) => x.trim()).find(Boolean)) || '') : prev['Khổ giấy'],
                                      'ĐVT': cleared ? '' : (item ? (item.dvt_chinh ?? '') : prev['ĐVT']),
                                    } as unknown as DonHangMuaGridLineRow
                                    const isCodongia = initialDon != null || mauHienTai === 'codongia'
                                    if (cleared || !item) {
                                      delete nextRow._dvtOptions
                                      delete nextRow._vthh
                                      ;(nextRow as DonHangMuaGridLineRow & { _doDayOptions?: string[]; _khoGiayOptions?: string[] })._doDayOptions = undefined
                                      ;(nextRow as DonHangMuaGridLineRow & { _doDayOptions?: string[]; _khoGiayOptions?: string[] })._khoGiayOptions = undefined
                                      if (cleared && isCodongia) { nextRow['ĐG mua'] = '' }
                                      if (cleared) nextRow['% thuế GTGT'] = ''
                                    } else {
                                      nextRow._vthh = item
                                      const opts = buildDvtOptionsForVthh(item)
                                      if (opts) nextRow._dvtOptions = opts
                                      else delete nextRow._dvtOptions
                                      const doDayOpts = buildDoDayOptionsForVthh(item)
                                      ;(nextRow as DonHangMuaGridLineRow & { _doDayOptions?: string[] })._doDayOptions = doDayOpts ?? undefined
                                      nextRow['Độ dày/ ĐL'] = doDayOpts && doDayOpts.length > 0 ? doDayOpts[0] : nextRow['Độ dày/ ĐL']
                                      const khoGiayOpts = buildKhoGiayOptionsForVthh(item)
                                      ;(nextRow as DonHangMuaGridLineRow & { _khoGiayOptions?: string[] })._khoGiayOptions = khoGiayOpts ?? undefined
                                      nextRow['Khổ giấy'] = khoGiayOpts && khoGiayOpts.length > 0 ? khoGiayOpts[0] : nextRow['Khổ giấy']
                                      if (isCodongia) {
                                        nextRow['ĐG mua'] = getDonGiaHienThiWhenDvtChinh(item, nextRow)
                                      }
                                      nextRow['% thuế GTGT'] = item.thue_suat_gtgt ?? ''
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
                                  placeholder="Mã VTHH"
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
                              <input readOnly tabIndex={-1} className="misa-input-solo" style={{ ...inputStyle, width: '100%', cursor: 'default', border: '1px solid transparent', minHeight: 22, height: 22, background: 'var(--bg-secondary)' }} value={line[col] ?? ''} />
                            ) : col === 'Độ dày/ ĐL' ? (
                              (() => {
                                const opts = (line as DonHangMuaGridLineRow & { _doDayOptions?: string[] })._doDayOptions ?? buildDoDayOptionsForVthh(line._vthh)
                                if (opts && opts.length > 0) {
                                  return (
                                    <select className="misa-input-solo" style={{ ...inputStyle, width: '100%', minHeight: 22, height: 22, cursor: 'pointer' }} value={line['Độ dày/ ĐL'] ?? opts[0]} onChange={(e) => { const r = [...lines]; const row = { ...r[idx], 'Độ dày/ ĐL': e.target.value } as unknown as DonHangMuaGridLineRow; if ((initialDon != null || mauHienTai === 'codongia') && row._vthh) row['ĐG mua'] = getDonGiaMuaTheoDvt(row._vthh, (row['ĐVT'] ?? '').trim() || (row._vthh.dvt_chinh ?? ''), donGiaContextFromDonHangMuaLine(row)); r[idx] = row; setLines(r) }}>
                                      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                  )
                                }
                                return <input className="misa-input-solo" style={{ ...inputStyle, width: '100%', border: '1px solid transparent', minHeight: 22, height: 22, background: 'var(--bg-secondary)' }} value={line['Độ dày/ ĐL'] ?? ''} onChange={(e) => { const r = [...lines]; r[idx] = { ...r[idx], 'Độ dày/ ĐL': e.target.value } as unknown as DonHangMuaGridLineRow; setLines(r) }} />
                              })()
                            ) : col === 'Khổ giấy' ? (
                              (() => {
                                const opts = (line as DonHangMuaGridLineRow & { _khoGiayOptions?: string[] })._khoGiayOptions ?? buildKhoGiayOptionsForVthh(line._vthh)
                                if (opts && opts.length > 0) {
                                  return (
                                    <select className="misa-input-solo" style={{ ...inputStyle, width: '100%', minHeight: 22, height: 22, cursor: 'pointer' }} value={line['Khổ giấy'] ?? opts[0]} onChange={(e) => { const r = [...lines]; const row = { ...r[idx], 'Khổ giấy': e.target.value } as unknown as DonHangMuaGridLineRow; if ((initialDon != null || mauHienTai === 'codongia') && row._vthh) row['ĐG mua'] = getDonGiaMuaTheoDvt(row._vthh, (row['ĐVT'] ?? '').trim() || (row._vthh.dvt_chinh ?? ''), donGiaContextFromDonHangMuaLine(row)); r[idx] = row; setLines(r) }}>
                                      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                  )
                                }
                                return <input className="misa-input-solo" style={{ ...inputStyle, width: '100%', border: '1px solid transparent', minHeight: 22, height: 22, background: 'var(--bg-secondary)' }} value={line['Khổ giấy'] ?? ''} onChange={(e) => { const r = [...lines]; r[idx] = { ...r[idx], 'Khổ giấy': e.target.value } as unknown as DonHangMuaGridLineRow; setLines(r) }} />
                              })()
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
                                        const row = r[idx] as DonHangMuaGridLineRow
                                        const newDvt = e.target.value
                                        const updates = { ...row, 'ĐVT': newDvt } as unknown as DonHangMuaGridLineRow
                                        if ((initialDon != null || mauHienTai === 'codongia') && row._vthh) {
                                          updates['ĐG mua'] = getDonGiaMuaTheoDvt(row._vthh, newDvt, donGiaContextFromDonHangMuaLine(updates))
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
                                  <input readOnly tabIndex={-1} className="misa-input-solo" style={{ ...inputStyle, width: '100%', cursor: 'default', border: '1px solid transparent', minHeight: 22, height: 22, background: 'var(--bg-secondary)' }} value={dvtHienThiLabel(line['ĐVT'], dvtList)} />
                                )
                              })()
                            ) : col === 'Số lượng' ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                data-dmh-sl-idx={idx}
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
                                  r[idx] = { ...r[idx], [col]: formatSoTuNhienInput(e.target.value) } as unknown as DonHangMuaGridLineRow
                                  setLines(r)
                                  if (valErrKey === `so_luong_${idx}`) setValErrKey(null)
                                }}
                                onBlur={() => {
                                  const raw = (line[col] ?? '').trim()
                                  if (raw === '') return
                                  const n = parseFloatVN(raw)
                                  const val = Number.isNaN(n) || n < 0 ? 0 : n
                                  const r = [...lines]
                                  r[idx] = { ...r[idx], [col]: formatSoTienHienThi(val) } as unknown as DonHangMuaGridLineRow
                                  setLines(r)
                                }}
                              />
                            ) : col === 'ĐG mua' ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                className="misa-input-solo htql-no-spinner"
                                style={{ ...inputStyle, ...chiTietNumericInputStyle('ĐG mua'), width: '100%', boxSizing: 'border-box', border: '1px solid transparent', minHeight: 22, height: 22 }}
                                value={line['ĐG mua'] ?? ''}
                                onChange={(e) => {
                                  const r = [...lines]
                                  r[idx] = { ...r[idx], 'ĐG mua': formatSoTien(e.target.value) } as unknown as DonHangMuaGridLineRow
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
                                    const opts = getDiaDiemGhOptions(diaDiemGiaoHangList, effectiveDiaDiemFirst)
                                    const raw = (line[COL_DD_GH] ?? '').trim()
                                    const n = parseInt(raw, 10)
                                    const hit = Number.isFinite(n) ? opts.find((o) => o.idx === n) : undefined
                                    return hit?.label ?? (Number.isFinite(n) ? `ĐĐGH ${n + 1}` : opts[0]?.label ?? 'ĐĐGH 1')
                                  })()}
                                />
                              ) : (
                                <select
                                  className="misa-input-solo"
                                  style={{ ...inputStyle, width: '100%', minHeight: 22, height: 22, cursor: 'pointer' }}
                                  value={(() => {
                                    const opts = getDiaDiemGhOptions(diaDiemGiaoHangList, effectiveDiaDiemFirst)
                                    const cur = (line[COL_DD_GH] ?? '').trim()
                                    if (cur !== '' && opts.some((o) => String(o.idx) === cur)) return cur
                                    return String(opts[0]?.idx ?? 0)
                                  })()}
                                  onChange={(e) => {
                                    const r = [...lines]
                                    r[idx] = { ...r[idx], [COL_DD_GH]: e.target.value } as unknown as DonHangMuaGridLineRow
                                    setLines(r)
                                  }}
                                >
                                  {getDiaDiemGhOptions(diaDiemGiaoHangList, effectiveDiaDiemFirst).map((o) => (
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
                                  r[idx] = { ...r[idx], '% thuế GTGT': e.target.value } as unknown as DonHangMuaGridLineRow
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
                                onChange={(e) => { const r = [...lines]; r[idx] = { ...r[idx], [col]: e.target.value } as unknown as DonHangMuaGridLineRow; setLines(r) }}
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
                  <div style={{ marginLeft: OFFSET_TRAI_COT_MA_VTHH, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        scrollChiTietSauThemDongRef.current = true
                        setLines([
                          ...lines,
                          currentColumns.reduce<Record<string, string>>((acc, c) => ({ ...acc, [c]: '' }), {}) as unknown as DonHangMuaGridLineRow,
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
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <span style={footerSummaryItem}>Tổng tiền: <span style={footerSummaryValue}>{formatNumberDisplay(tongTienHang, 0)}</span></span>
              <span style={footerSummaryItem}>Tiền thuế GTGT: <span style={footerSummaryValue}>{formatNumberDisplay(tienThue, 0)}</span></span>
              <span style={footerSummaryItem}>Tổng tiền thanh toán: <span style={footerSummaryValue}>{formatNumberDisplay(tongTienThanhToan, 0)}</span></span>
            </div>
          )}
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
              getChiTiet={(id) => nhanVatTuHangHoaGetChiTiet(id) as unknown as DonHangMuaChiTiet[]}
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
                let available = vatTuList.filter(
                  (item) =>
                    !item.vt_chinh && !lines.some((row, i) => i !== currentRowIdx && row['Mã'] === item.ma),
                )
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
            zIndex: 1050,
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

      <DonHangMuaDinhKemModal
        open={showDinhKemModal}
        onClose={() => setShowDinhKemModal(false)}
        anchorRef={dinhKemModalAnchor === 'toolbar' ? refDinhKemBtn : refDinhKemDuoiGhiChu}
        attachments={attachments}
        onChange={setAttachments}
        readOnly={effectiveReadOnly}
        soDonHang={soDonHang}
        maNccPathPart={nccPartDinhKem}
        ngayGiaoHang={ngayGiaoHang}
        ngayDonHang={ngayDonHang}
      />

      <DonHangMuaDinhKemModal
        open={showDinhKemPhieuChiModal}
        onClose={() => setShowDinhKemPhieuChiModal(false)}
        anchorRef={refPhieuChiDinhKemBtn}
        attachments={phieuChiAttachments}
        onChange={setPhieuChiAttachments}
        readOnly={effectiveReadOnly}
        soDonHang={soDonHang}
        maNccPathPart={nccPartDinhKem}
        ngayGiaoHang={ngayGiaoHang}
        ngayDonHang={ngayDonHang}
      />

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

      {showThemDkttModal && (
        <ThemDieuKhoanThanhToanModal
          existingItems={danhSachDKTT}
          onClose={() => setShowThemDkttModal(false)}
          onSave={(item) => {
            const list = [...danhSachDKTT]
            if (!list.some((x) => x.ma === item.ma)) {
              list.push(item)
              saveDieuKhoanThanhToan(list)
              setDanhSachDKTT(list)
            }
            setDieuKhoanTT(item.ten)
            setSoNgayDuocNo(String(item.so_ngay_duoc_no))
          }}
          onSaveAndAdd={(item) => {
            const list = [...danhSachDKTT]
            if (!list.some((x) => x.ma === item.ma)) {
              list.push(item)
              saveDieuKhoanThanhToan(list)
              setDanhSachDKTT(list)
            }
            setDieuKhoanTT(item.ten)
            setSoNgayDuocNo(String(item.so_ngay_duoc_no))
          }}
        />
      )}

      {showThemKhoModal && (
        <ThemKhoModal
          existingItems={khoList}
          onClose={() => setShowThemKhoModal(false)}
          onSave={(item) => {
            const next = [...khoList]
            if (!next.some((k) => k.id === item.id)) {
              next.push(item)
              saveKhoListToStorage(next)
              setKhoList(next)
              setKhoNhapId(item.id)
            }
            setShowThemKhoModal(false)
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

      {showDonMuaHangPopup && viewDonHangMuaRecord && doiChieuSource === 'don_mua_hang' && (
        <div style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div
            style={{
              background: 'var(--bg-primary)', borderRadius: 8, width: '94vw', maxWidth: 1100,
              height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
              pointerEvents: 'auto',
            }}
          >
            <DonHangMuaApiProvider api={apiDonHangMua}>
              <DonHangMuaForm
                key={`dmh-popup-${viewDonHangMuaRecord.id}`}
                readOnly={true}
                initialDon={viewDonHangMuaRecord}
                initialChiTiet={donHangMuaGetChiTiet(viewDonHangMuaRecord.id)}
                formTitle="Đơn hàng mua"
                soDonLabel="Mã ĐHM"
                onClose={() => { setShowDonMuaHangPopup(false); setViewDonHangMuaRecord(null) }}
                onSaved={() => { setShowDonMuaHangPopup(false); setViewDonHangMuaRecord(null) }}
              />
            </DonHangMuaApiProvider>
          </div>
        </div>
      )}
    </div>
  )
}
