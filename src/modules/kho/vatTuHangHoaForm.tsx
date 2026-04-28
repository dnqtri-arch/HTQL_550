import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { X, ChevronDown, Info, Plus, Trash2, CheckCircle, XCircle, FileCheck, AlertTriangle } from 'lucide-react'
import type { VatTuHangHoaRecord } from './vatTuHangHoaApi'
import { vatTuHangHoaGetAll } from './vatTuHangHoaApi'
import {
  NHOM_VTHH_BASE_ITEMS,
  buildLoaiVthhSelectOptions,
  buildNhomVthhLookupList,
  parseNhomVthhStored,
  nhomVthhStoredToTenHienThi,
  appendVthhLoaiCustom,
  appendVthhNhomCustom,
  readVthhDinhLuongCustomFromStorage,
  readVthhHeMauCustomFromStorage,
  readVthhKhoGiayCustomFromStorage,
  HTQL_VTHH_LOAI_NHOM_CHANGED,
  STORAGE_KEY_VTHH_DINH_LUONG_CUSTOM,
  STORAGE_KEY_VTHH_HE_MAU_CUSTOM,
  STORAGE_KEY_VTHH_KHO_GIAY_CUSTOM,
  STORAGE_KEY_VTHH_LOAI_CUSTOM,
  STORAGE_KEY_VTHH_NHOM_CUSTOM,
  STORAGE_KEY_VTHH_NHOM_DISABLED,
  resolveThueGtgtFormSelectMa,
} from './vthhLoaiNhomSync'
import { formatSoTien, formatSoTienHienThi, parseNumber, parseFloatVN, parseDecimalFlex, formatSoNguyenInput, formatSoTuNhienInput, normalizeKichThuocInput, toStoredNumberString, numberToStoredFormat, isZeroDisplay } from '../../utils/numberFormat'
import { matchSearchKeyword } from '../../utils/stringUtils'
import type { NhomVTHHItem } from './nhomVTHHLookupModal'
import { ThemDonViTinhModal } from './themDonViTinhModal'
import { ThemKhoModal } from './themKhoModal'
import { ThemNhomVTHHModal } from './themNhomVTHHModal'
import { Modal } from '../../components/common/modal'
import { VatTuHangHoaFormTabNgamDinh, LabelCell } from './vatTuHangHoaFormTabNgamDinh'
import { formFooterButtonCancel, formFooterButtonSave, formFooterButtonSaveAndAdd } from '../../constants/formFooterButtons'
import { lookupActionButtonStyle } from '../../constants/lookupControlStyles'
import './VatTuHangHoaForm.css'
import { htqlCanUploadToServer, htqlDeleteFileOnServer, htqlFileDownloadUrl, htqlUploadFileToServer } from '../../utils/htqlServerFileUpload'
import { htqlPathPartAscii } from '../../utils/htqlPathPartAscii'
import { thueGtgtStdToken, THUE_GTGT_STD_SET } from '../../utils/thueGtgtTokens'
import { vthhBuildMaPhu1, vthhBuildMaPhu2, vthhEffectiveParentMaU } from '../../utils/vthhVariantMa'

/** Ảnh đã upload API — lưu `htql-vthh:` + relativePath (GET /api/htql-files?kind=vthh_hinh). */
const HTQL_VTHH_HINH_PREFIX = 'htql-vthh:'

function vthhImageDisplayUrl(stored: string | undefined | null): string {
  if (!stored) return ''
  if (stored.startsWith('data:')) return stored
  if (stored.startsWith(HTQL_VTHH_HINH_PREFIX)) {
    return htqlFileDownloadUrl('vthh_hinh', stored.slice(HTQL_VTHH_HINH_PREFIX.length))
  }
  return stored
}

export type FormValues = {
  ma_vthh: string
  ten_vthh: string
  /** VT cấp cha (chỉ hiện khi tính chất = Vật tư) */
  vt_chinh: boolean
  tinh_chat: string
  nhom_vthh: string
  /** Mã VTHH cấp cha (hàng hóa cấp cha), rỗng = không chọn */
  hang_hoa_cap_cha: string
  mo_ta: string
  dvt_chinh: string
  thoi_han_bh: string
  so_luong_ton_toi_thieu: string
  nguon_goc: string
  dien_giai_khi_mua: string
  dien_giai_khi_ban: string
  kho_ngam_dinh: string
  tai_khoan_kho: string
  tai_khoan_doanh_thu: string
  tk_chiet_khau: string
  tk_giam_gia: string
  tk_tra_lai: string
  tai_khoan_chi_phi: string
  ty_le_ckmh: string
  loai_hh_dac_trung: string
  don_gia_mua_co_dinh: string
  don_gia_mua_gan_nhat: string
  don_gia_ban: string
  thue_suat_gtgt_dau_ra: string
  thue_suat_gtgt_tu_nhap: string
  co_giam_thue: string
  thue_suat_nk: string
  thue_suat_xk: string
  nhom_hhdv_ttdb: string
  mau_sac: string
  kich_thuoc: string
  /** Đơn vị mD (chỉ hiện khi tính chất = Vật tư) */
  kich_thuoc_md: string
  /** Đơn vị mR (chỉ hiện khi tính chất = Vật tư) */
  kich_thuoc_mr: string
  so_khung: string
  so_may: string
  thoi_gian_bao_hanh: string
  xuat_xu: string
  don_vi_quy_doi: {
    dvt_chinh: string
    dvt_quy_doi: string
    ti_le_quy_doi: string
    ti_le_kho_json: string
    phep_tinh: 'nhan' | 'chia' | ''
    mo_ta: string
    gia_mua_gan_nhat: string
    gia_ban: string
    gia_ban_1: string
    gia_ban_2: string
    gia_ban_3: string
  }[]
  dien_giai: string
  la_bo_phan_lap_rap: boolean
  la_vthh_ban: boolean
  la_mat_hang_khuyen_mai: boolean
  chiet_khau: boolean
  loai_chiet_khau: string
  bang_chiet_khau: { so_luong_tu: string; so_luong_den: string; ty_le_chiet_khau: string; mo_ta: string }[]
  theo_doi_ma_quy_cach: boolean
  ma_quy_cach: { hien_thi: boolean; ten_hien_thi: string; cho_phep_trung: boolean }[]
  nhieu_phien_ban: boolean
  ma_quy_cach_bien_the: string
  dinh_luong: string
  kho_giay: string
  he_mau: string
  do_day: string
  dac_tinh: string
  duong_dan_hinh_anh?: string
  ten_file_hinh_anh?: string
  cong_thuc_tinh_so_luong?: string
}

const MAX_IMAGE_SIZE_MB = 5
const MAX_IMAGE_WIDTH = 512
const MAX_IMAGE_HEIGHT = 768
const ALLOWED_IMAGE_EXT = ['jpg', 'jpeg', 'png'] as const
const ALLOWED_IMAGE_ACCEPT = '.jpg,.jpeg,.png'

function getImageExtension(file: File): string | null {
  const name = (file.name || '').toLowerCase()
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : ''
  return ALLOWED_IMAGE_EXT.includes(ext as (typeof ALLOWED_IMAGE_EXT)[number]) ? ext : null
}

function isAllowedImageFile(file: File): boolean {
  const ext = getImageExtension(file)
  if (!ext) return false
  const mime = file.type?.toLowerCase()
  return (
    mime === 'image/jpeg' ||
    mime === 'image/jpg' ||
    mime === 'image/png'
  )
}

/** Tự động sinh mô tả quy đổi:
 * - Phép nhân: 1 [ĐV quy đổi] = [tỉ lệ] [ĐVT chính]. VD: 1 Ram = 500 Tờ.
 * - Phép chia: 1 [ĐVT chính] = [tỉ lệ] [ĐV quy đổi]. VD: 1 Kg = 10 Hộp.
 * Khi chưa chọn phép tính (phepTinh rỗng) trả về ''.
 */
function generateMoTaQuyDoi(opts: {
  dvtChinh: string
  dvtQuyDoi: string
  tiLe: string
  phepTinh: 'nhan' | 'chia' | ''
  dvtList: { id: number; ma_dvt: string; ten_dvt: string; ky_hieu?: string }[]
}): string {
  const { dvtChinh, dvtQuyDoi, tiLe, phepTinh, dvtList } = opts
  const getDisplay = (ma: string) => {
    if (!ma) return ''
    const d = dvtList.find((x) => x.ma_dvt === ma)
    return d ? (d.ky_hieu || d.ten_dvt || ma) : ma
  }
  const dvtChinhDisplay = getDisplay(dvtChinh)
  const dvtQuyDoiDisplay = getDisplay(dvtQuyDoi)
  if (!dvtQuyDoiDisplay || !tiLe || (phepTinh !== 'nhan' && phepTinh !== 'chia')) return ''
  const tiLeNum = parseFloat(parseNumber(tiLe)) || 0
  if (tiLeNum <= 0) return ''
  if (phepTinh === 'nhan') {
    return `1 ${dvtQuyDoiDisplay} = ${tiLe} ${dvtChinhDisplay}`
  }
  return `1 ${dvtChinhDisplay} = ${tiLe} ${dvtQuyDoiDisplay}`
}

/** Viết hoa chữ cái đầu mỗi từ (locale vi); không nối kích thước vào tên. */
function titleCaseVthhTen(raw: string): string {
  const s = (raw ?? '').trim()
  if (!s) return ''
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const chars = [...w]
      const first = chars[0] ?? ''
      const rest = chars.slice(1).join('')
      try {
        return first.toLocaleUpperCase('vi-VN') + rest.toLocaleLowerCase('vi-VN')
      } catch {
        return first.toUpperCase() + rest.toLowerCase()
      }
    })
    .join(' ')
}

/** Nối hậu tố kích thước (mD / mR) vào tên file ảnh — không dùng cho trường Tên hiển thị. */
function kichThuocSuffixForFileName(md: string, mr: string): string {
  const mdT = (md ?? '').trim()
  const mrT = (mr ?? '').trim()
  if (mdT) return ` ${mdT}m`
  if (mrT) return ` ${mrT}m`
  return ''
}

function tenVthhImageBaseNameFromParts(ten: string, md: string, mr: string): string {
  const base = `${(ten ?? '').trim()}${kichThuocSuffixForFileName(md, mr)}`
  return tenVatTuToFileName(base)
}

/** Chuyển chuỗi tiếng Việt thành không dấu, viết liền (không khoảng trắng) để dùng làm tên file. */
function tenVatTuToFileName(ten: string): string {
  const map: Record<string, string> = {
    à: 'a', á: 'a', ả: 'a', ã: 'a', ạ: 'a', ă: 'a', ằ: 'a', ắ: 'a', ẳ: 'a', ẵ: 'a', ặ: 'a', â: 'a', ầ: 'a', ấ: 'a', ẩ: 'a', ẫ: 'a', ậ: 'a',
    è: 'e', é: 'e', ẻ: 'e', ẽ: 'e', ẹ: 'e', ê: 'e', ề: 'e', ế: 'e', ể: 'e', ễ: 'e', ệ: 'e',
    ì: 'i', í: 'i', ỉ: 'i', ĩ: 'i', ị: 'i',
    ò: 'o', ó: 'o', ỏ: 'o', õ: 'o', ọ: 'o', ô: 'o', ồ: 'o', ố: 'o', ổ: 'o', ỗ: 'o', ộ: 'o', ơ: 'o', ờ: 'o', ớ: 'o', ở: 'o', ỡ: 'o', ợ: 'o',
    ù: 'u', ú: 'u', ủ: 'u', ũ: 'u', ụ: 'u', ư: 'u', ừ: 'u', ứ: 'u', ử: 'u', ữ: 'u', ự: 'u',
    ỳ: 'y', ý: 'y', ỷ: 'y', ỹ: 'y', ỵ: 'y',
    đ: 'd',
  }
  let s = (ten || '').trim().toLowerCase()
  for (const [k, v] of Object.entries(map)) s = s.replace(new RegExp(k, 'g'), v)
  s = s.replace(/[^a-z0-9]/g, '') // chỉ giữ chữ và số, viết liền
  return s || 'anh'
}

/** Resize ảnh fit trong 512x768, giữ tỷ lệ, chất lượng cao. Trả về base64 data URL hoặc reject. Chỉ chấp nhận jpg, jpeg, png. */
function resizeImageToFit(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isAllowedImageFile(file)) {
      reject(new Error('Chỉ chấp nhận ảnh có đuôi .jpg, .jpeg hoặc .png'))
      return
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      reject(new Error(`Kích thước file không được vượt quá ${MAX_IMAGE_SIZE_MB}MB`))
      return
    }
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const w = img.naturalWidth
      const h = img.naturalHeight
      let dw = w
      let dh = h
      if (w > MAX_IMAGE_WIDTH || h > MAX_IMAGE_HEIGHT) {
        const scaleW = MAX_IMAGE_WIDTH / w
        const scaleH = MAX_IMAGE_HEIGHT / h
        const scale = Math.min(scaleW, scaleH)
        dw = Math.round(w * scale)
        dh = Math.round(h * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = dw
      canvas.height = dh
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Không thể tạo canvas'))
        return
      }
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, dw, dh)
      const ext = getImageExtension(file) ?? 'jpg'
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg'
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Không thể nén ảnh'))
            return
          }
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('Lỗi đọc ảnh'))
          reader.readAsDataURL(blob)
        },
        mime,
        0.92
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Không thể tải ảnh'))
    }
    img.src = objectUrl
  })
}

const KHO_LOOKUP: { id: string; label: string }[] = []

/** Lưu/đọc danh mục kho (Chọn kho ngầm định) để khi mở form lần 2 vẫn thấy kho đã thêm */
import { loadKhoListFromStorage, saveKhoListToStorage } from './khoStorage'

/** Loại trừ "Kho chính" và "Kho phụ" khỏi dropdown Chọn kho (không hiển thị). */
const KHO_LABELS_EXCLUDED = ['Kho chính', 'Kho phụ']

const inputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '100%',
  height: 24,
  lineHeight: '22px',
  padding: '0 4px',
  fontSize: 11,
  fontFamily: "'Tahoma', Arial, sans-serif",
  background: 'var(--bg-tab)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  boxSizing: 'border-box',
}

/** Viền ô nổi bật khi trường bắt buộc chưa nhập (ẩn cảnh báo chữ) */
const REQUIRED_FIELD_ERROR_BORDER = '#ff5722'

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none',
  paddingRight: 20,
}

const thChietKhau: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  background: 'var(--bg-tab)',
  color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border)',
  borderRight: '1px solid var(--border)',
  fontSize: 11,
  fontWeight: 600,
}

const tdChietKhau: React.CSSProperties = {
  padding: '4px 6px',
  borderBottom: '1px solid var(--border)',
  borderRight: '1px solid var(--border)',
  color: 'var(--text-primary)',
  verticalAlign: 'middle',
}

const footerStyle: React.CSSProperties = {
  position: 'sticky',
  bottom: 0,
  background: 'var(--bg-tab)',
  padding: 8,
  borderTop: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
}

const btnFooter: React.CSSProperties = {
  padding: '4px 14px',
  fontSize: 11,
  fontFamily: "'Tahoma', Arial, sans-serif",
  border: '1px solid var(--border)',
  borderRadius: 0,
  cursor: 'pointer',
  fontWeight: 'bold',
}

interface Props {
  mode: 'add' | 'edit'
  initialData?: VatTuHangHoaRecord | null
  dvtList: { id: number; ma_dvt: string; ten_dvt: string; ky_hieu?: string }[]
  onClose: () => void
  onSubmit: (data: Omit<VatTuHangHoaRecord, 'id'>) => Promise<void>
  onSubmitAndAdd: (data: Omit<VatTuHangHoaRecord, 'id'>) => Promise<void>
  onMaTuDong: (tinhChat: string) => string
  /** Gọi sau khi thêm đơn vị tính từ modal để cập nhật danh sách ĐVT */
  onRefreshDvtList?: () => Promise<void>
  /** Gọi khi bấm chuột trên thanh tiêu đề để kéo form (drag) */
  onHeaderPointerDown?: (e: React.MouseEvent) => void
  /** Đang kéo form (để đổi cursor thành grabbing) */
  dragging?: boolean
  /** Danh sách VTHH để chọn NVL trong tab Định mức (chỉ hiện tính chất Vật tư) */
  vatTuList?: VatTuHangHoaRecord[]
}

const SUB_TABS_VAT_TU: { id: 1 | 2 | 3 | 4; label: string }[] = [
  { id: 1, label: '1. Ngầm định' },
  { id: 2, label: '2. Bậc giá' },
  { id: 3, label: '3. Đơn vị quy đổi' },
  { id: 4, label: '4. Đặc tính, hình ảnh' },
]

const SUB_TABS_SAN_PHAM: { id: 1 | 2 | 3 | 4 | 5; label: string }[] = [
  { id: 1, label: '1. Ngầm định' },
  { id: 2, label: '2. Bậc giá' },
  { id: 3, label: '3. Đơn vị quy đổi' },
  { id: 4, label: '4. Định mức nguyên vật liệu' },
  { id: 5, label: '5. Đặc tính, hình ảnh' },
]

/**
 * QUY ƯỚC CÔNG THỨC TÍNH KHỐI LƯỢNG / SỐ LƯỢNG
 *
 * Biến số:
 * - [Chiều dài]: chiều dài cạnh
 * - [Chiều rộng]: chiều rộng cạnh
 * - [Chiều cao]: chiều cao của hình hộp
 * - [Bán kính]: bán kính hình tròn
 * - [Lượng]: số lượng để tính ra số lượng vật tư, hàng hóa, dịch vụ
 *
 * Toán tử (phép tính):
 * - + : phép cộng
 * - - : phép trừ
 * - * : phép nhân
 * - / : phép chia
 * - ( : dấu ngoặc trái
 * - ) : dấu ngoặc phải
 *
 * Nút "Kiểm tra công thức": kiểm tra tính hợp lệ của công thức theo quy tắc toán học.
 */

/** Chuẩn hóa công thức để so sánh (bỏ khoảng trắng thừa) */
function normalizeFormula(s: string): string {
  return (s || '').trim().replace(/\s+/g, '')
}

/** Tự động nhận diện loại công thức: nếu trùng với mẫu thì trả về tên mục, không thì "Khác". */
function detectFormulaType(formula: string): string {
  const n = normalizeFormula(formula)
  if (!n) return 'Khác'
  const types = ['Chu vi hình chữ nhật', 'Diện tích hình chữ nhật', 'Thể tích hình hộp chữ nhật', 'Chu vi hình tròn', 'Diện tích hình tròn', 'Thể tích hình trụ'] as const
  for (const t of types) {
    const template = FORMULA_TEMPLATES[t]
    if (template && normalizeFormula(template) === n) return t
  }
  return 'Khác'
}

/** Công thức mặc định theo từng cách tính (biến [Tên]; Lượng = số lượng, phải nhân với [Lượng] phía sau) */
const FORMULA_TEMPLATES: Record<string, string> = {
  'Chu vi hình chữ nhật': '([Chiều dài] + [Chiều rộng]) * 2*[Lượng]',
  'Diện tích hình chữ nhật': '[Chiều dài]*[Chiều rộng]*[Lượng]',
  'Thể tích hình hộp chữ nhật': '[Chiều dài]*[Chiều rộng]*[Chiều cao]*[Lượng]',
  'Chu vi hình tròn': '2*[Bán kính]*3.14*[Lượng]',
  'Diện tích hình tròn': '[Bán kính]*[Bán kính]*3.14*[Lượng]',
  'Thể tích hình trụ': '[Bán kính]*[Bán kính]*3.14*[Chiều cao]*[Lượng]',
  'Khác': '',
}

/** Giá trị form khi thêm mới (reset sau "Lưu và tiếp tục") */
function getEmptyFormValues(dvtList: { id: number; ma_dvt: string; ten_dvt: string; ky_hieu?: string }[]): FormValues {
  const dvtChinh = dvtList[0]?.ma_dvt ?? 'Cái'
  return {
    ma_vthh: '',
    ten_vthh: '',
    vt_chinh: false,
    tinh_chat: 'Vật tư',
    nhom_vthh: '',
    hang_hoa_cap_cha: '',
    mo_ta: '',
    dvt_chinh: dvtChinh,
    thoi_han_bh: '',
    so_luong_ton_toi_thieu: '0',
    nguon_goc: '',
    dien_giai_khi_mua: '',
    dien_giai_khi_ban: '',
    kho_ngam_dinh: '',
    tai_khoan_kho: '',
    tai_khoan_doanh_thu: '5111',
    tk_chiet_khau: '5111',
    tk_giam_gia: '5111',
    tk_tra_lai: '5111',
    tai_khoan_chi_phi: '632',
    ty_le_ckmh: '0',
    loai_hh_dac_trung: '',
    don_gia_mua_co_dinh: '0',
    don_gia_mua_gan_nhat: '0',
    don_gia_ban: '0',
    thue_suat_gtgt_dau_ra: 'Chưa xác định',
    thue_suat_gtgt_tu_nhap: '',
    co_giam_thue: 'Có giảm thuế',
    thue_suat_nk: '0',
    thue_suat_xk: '0',
    nhom_hhdv_ttdb: '',
    mau_sac: '',
    kich_thuoc: '',
    kich_thuoc_md: '',
    kich_thuoc_mr: '',
    so_khung: '',
    so_may: '',
    thoi_gian_bao_hanh: '',
    xuat_xu: '',
    don_vi_quy_doi: [],
    dien_giai: '',
    la_bo_phan_lap_rap: false,
    la_vthh_ban: true,
    la_mat_hang_khuyen_mai: false,
    chiet_khau: false,
    loai_chiet_khau: 'Theo %',
    bang_chiet_khau: [],
    theo_doi_ma_quy_cach: false,
    ma_quy_cach: [
      { hien_thi: false, ten_hien_thi: '', cho_phep_trung: false },
      { hien_thi: false, ten_hien_thi: '', cho_phep_trung: false },
      { hien_thi: false, ten_hien_thi: '', cho_phep_trung: false },
      { hien_thi: false, ten_hien_thi: '', cho_phep_trung: false },
      { hien_thi: false, ten_hien_thi: '', cho_phep_trung: false },
    ],
    nhieu_phien_ban: false,
      he_mau: '',
    ma_quy_cach_bien_the: '',
    dinh_luong: '',
    kho_giay: '',
    do_day: '',
    dac_tinh: '',
    duong_dan_hinh_anh: '',
    cong_thuc_tinh_so_luong: '',
    ten_file_hinh_anh: '',
  }
}

/** Các mã ĐVT hợp lệ cho dòng định mức NVL: ĐVT chính + đơn vị quy đổi của VTHH đó. */
function collectDvtMaChoNvlItem(item: VatTuHangHoaRecord | undefined): string[] {
  if (!item) return []
  const primary = (item.dvt_chinh ?? '').trim()
  const extra = (item.don_vi_quy_doi ?? [])
    .map((d) => (d.dvt ?? '').trim())
    .filter(Boolean)
  const seen = new Set<string>()
  const out: string[] = []
  for (const m of [primary, ...extra]) {
    if (!m || seen.has(m)) continue
    seen.add(m)
    out.push(m)
  }
  return out
}

function normalizeDinhMucRowDvt(
  row: { ma: string; ten: string; dvt: string; so_luong: string; hao_hut: string },
  nvlOptionsList: VatTuHangHoaRecord[]
): { ma: string; ten: string; dvt: string; so_luong: string; hao_hut: string } {
  const item = nvlOptionsList.find((o) => o.ma === row.ma.trim())
  if (!item) return row
  const extraDvts = (item.don_vi_quy_doi ?? [])
    .map((d) => (d.dvt ?? '').trim())
    .filter(Boolean)
  if (extraDvts.length === 0) return row
  const dvtMas = collectDvtMaChoNvlItem(item)
  const cur = (row.dvt ?? '').trim()
  if (dvtMas.includes(cur)) return row
  return { ...row, dvt: (item.dvt_chinh ?? dvtMas[0] ?? '').trim() }
}

function parseMultiStoredList(raw: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const token of (raw ?? '').split(';')) {
    const t = token.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

/** Gộp chuỗi `a;b;c` đã lưu ở root với giá trị distinct trong `pricing_matrix` — sau Lưu/Mở lại tab Ngầm định vẫn khớp matrix Bậc giá. */
function mergeSemicolonRootsWithPricingMatrix(
  rootSemi: string,
  pricingMatrix: unknown[] | undefined,
  pick: 'dinh_luong' | 'kho_giay' | 'he_mau',
): string {
  const parsed = parseMultiStoredList(rootSemi ?? '')
  const seen = new Set(parsed)
  const out = [...parsed]
  if (!Array.isArray(pricingMatrix)) return out.join(';')
  for (const row of pricingMatrix) {
    const raw = String((row as Record<string, unknown>)?.[pick] ?? '').trim()
    if (raw && !seen.has(raw)) {
      seen.add(raw)
      out.push(raw)
    }
  }
  return out.join(';')
}

function parseTiLeKhoJson(raw: string | null | undefined): Record<string, string> {
  if (!raw?.trim()) return {}
  try {
    const p = JSON.parse(raw) as unknown
    if (!p || typeof p !== 'object' || Array.isArray(p)) return {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
      const s = String(v ?? '').trim()
      if (s) out[k] = s
    }
    return out
  } catch {
    return {}
  }
}

/** Chiều dài (m) theo tên khổ — đồng bộ parse với form (parseDecimalFlex). */
function readKhoGiayDaiByTenFromCatalog(): Record<string, number> {
  const daiByTen: Record<string, number> = {}
  readVthhKhoGiayCustomFromStorage().forEach((item) => {
    const ten = String(item.ten ?? '').trim()
    if (!ten) return
    const d = parseDecimalFlex(String(item.chieu_dai_m ?? '').trim())
    if (Number.isFinite(d) && d > 0) daiByTen[ten] = d
  })
  return daiByTen
}

/** Payload: có ít nhất một khổ «đặc biệt» (danh mục không có chiều dài) trong lựa chọn → lưu ti_le_theo_kho_giay / matrix. */
function computeHasSpecialKhoForTiLePayload(data: FormValues): boolean {
  if (data.nhieu_phien_ban !== true) return false
  const tens = parseMultiStoredList(data.kho_giay ?? '')
  if (tens.length === 0) return false
  const daiByTen = readKhoGiayDaiByTenFromCatalog()
  return tens.some((ten) => !(daiByTen[ten] > 0))
}

type VariantMatrixCell = {
  /** Tham chiếu (read-only trên matrix); lưu kèm `pricing_matrix`. */
  gia_mua_gan_nhat: string
  gia_mua: string
  /** Giá bán tối thiểu (cột riêng; không phải B1). */
  gia_ban_tt: string
  gia_ban_by_bac: string[]
}

function emptyVariantMatrixCell(bacCount: number): VariantMatrixCell {
  const n = Math.max(1, bacCount)
  return {
    gia_mua_gan_nhat: '',
    gia_mua: '',
    gia_ban_tt: '',
    gia_ban_by_bac: Array.from({ length: n }, () => ''),
  }
}

function variantComboKey(dinhLuong: string, khoGiay: string): string {
  return `${dinhLuong}__${khoGiay}`
}

function variantMatrixFieldKey(comboKey: string, kind: 'mua' | 'ban' | 'ban_tt', bacIdx?: number): string {
  if (kind === 'mua') return `${comboKey}__mua`
  if (kind === 'ban_tt') return `${comboKey}__ban_tt`
  return `${comboKey}__ban_${Math.max(0, bacIdx ?? 0)}`
}

/** Khoảng SL ngắn cho tiêu đề cột Giá bán Bk — khớp **dòng k** bảng bậc giá (cột matrix `gia_ban_by_bac[k]` ↔ dòng `k`). */
function matrixGiaBanBacShortRange(rows: { so_luong_tu?: string; so_luong_den?: string }[], idx: number): string {
  if (!Array.isArray(rows) || rows.length === 0 || idx < 0 || idx >= rows.length) return ''
  const tu = (rows[idx]?.so_luong_tu ?? '').trim()
  const den = (rows[idx]?.so_luong_den ?? '').trim()
  const isLast = idx === rows.length - 1
  if (tu && den) return `${tu}–${den}`
  if (!den && isLast) {
    if (idx === 0) return tu ? `≥${tu}` : ''
    const prevDen = (rows[idx - 1]?.so_luong_den ?? '').trim()
    if (prevDen) return `>${prevDen}`
    return tu ? `≥${tu}` : ''
  }
  return tu || ''
}

/** Nhãn phụ cột Giá bán TT — áp khi SL nhỏ hơn «Số lượng từ» **dòng 1** bảng bậc giá (đồng bộ báo giá / matrix). */
function matrixGiaBanTtShortRange(rows: { so_luong_tu?: string }[]): string {
  const raw = String(rows[0]?.so_luong_tu ?? '').trim()
  if (!raw) return ''
  const tu = parseFloatVN(raw)
  if (!Number.isFinite(tu) || tu <= 0) return ''
  return `<${raw}`
}


/** Kiểm tra công thức: ngoặc cân bằng, cú pháp toán học hợp lệ, phải có [Lượng]. */
function validateFormula(formula: string, cachTinh?: string): { valid: boolean; message: string } {
  const s = formula.trim()
  if (!s) {
    if (cachTinh === 'Khác') return { valid: true, message: 'Hợp lệ.' }
    return { valid: false, message: 'Không hợp lệ.' }
  }
  let paren = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '(') paren++
    else if (c === ')') {
      paren--
      if (paren < 0) return { valid: false, message: 'Không hợp lệ.' }
    }
  }
  if (paren !== 0) return { valid: false, message: 'Không hợp lệ.' }
  const rest = s.replace(/\[[^\]]*\]/g, 'V').replace(/\d+\.?\d*/g, 'N').replace(/[\s+\-*/()]/g, '')
  if (/[^VN]/.test(rest)) return { valid: false, message: 'Không hợp lệ.' }
  if (!s.includes('[Lượng]')) return { valid: false, message: 'Không hợp lệ.' }
  const tokens = s.match(/\[[^\]]*\]|\d+\.?\d*|[+\-*/()]/g) ?? []
  const ops = new Set(['+', '-', '*', '/'])
  const isOperand = (t: string) => /^\[.*\]$/.test(t) || /^\d+\.?\d*$/.test(t)
  if (tokens.length === 0) return { valid: false, message: 'Không hợp lệ.' }
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const prev = tokens[i - 1]
    if (ops.has(t) && i > 0 && ops.has(prev)) return { valid: false, message: 'Không hợp lệ.' }
    if (isOperand(t) && i > 0 && isOperand(prev)) return { valid: false, message: 'Không hợp lệ.' }
    if (t === ')' && i > 0 && (ops.has(prev) || prev === '(')) return { valid: false, message: 'Không hợp lệ.' }
    if ((t === '+' || t === '*' || t === '/') && (i === 0 || prev === '(')) return { valid: false, message: 'Không hợp lệ.' }
  }
  if (ops.has(tokens[tokens.length - 1])) return { valid: false, message: 'Không hợp lệ.' }
  return { valid: true, message: 'Hợp lệ.' }
}

export function VatTuHangHoaForm({ mode, initialData, dvtList, onClose, onSubmit, onSubmitAndAdd, onMaTuDong, onRefreshDvtList, onHeaderPointerDown, dragging, vatTuList }: Props) {
  const [submitError, setSubmitError] = useState('')
  const [lookupModal, setLookupModal] = useState<'kho' | 'nhom_vthh' | null>(null)
  const [showThemDvtModal, setShowThemDvtModal] = useState(false)
  const [activeSubTab, setActiveSubTab] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [imageUploadError, setImageUploadError] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; sizeMB: number } | null>(null)
  const [formulaDialogOpen, setFormulaDialogOpen] = useState(false)
  const [formulaAlert, setFormulaAlert] = useState<{ valid: boolean } | null>(null)
  const [formulaCachTinh, setFormulaCachTinh] = useState('Khác')
  const [formulaText, setFormulaText] = useState('')
  const [nhomVTHHList, setNhomVTHHList] = useState<NhomVTHHItem[]>(() => buildNhomVthhLookupList([]))
  const [loaiVthhOptions, setLoaiVthhOptions] = useState<Array<{ value: string; label: string }>>([])
  const [dinhLuongOptions, setDinhLuongOptions] = useState<string[]>([])
  const [khoGiayOptions, setKhoGiayOptions] = useState<string[]>([])
  const [heMauAllOptions, setHeMauAllOptions] = useState<Array<{ ten: string; he_mau_in?: boolean; he_mau_vat_tu?: boolean }>>([])
  const [khoGiayChieuRongByTen, setKhoGiayChieuRongByTen] = useState<Record<string, number>>({})
  const [khoGiayChieuDaiByTen, setKhoGiayChieuDaiByTen] = useState<Record<string, number>>({})
  const [openVariantDropdown, setOpenVariantDropdown] = useState<'dinh-luong' | 'kho-giay' | 'he-mau' | null>(null)
  const [variantMatrix, setVariantMatrix] = useState<Record<string, VariantMatrixCell>>({})
  const [showMatrixMissingHint, setShowMatrixMissingHint] = useState(false)
  const [showMatrixMissingConfirm, setShowMatrixMissingConfirm] = useState(false)
  const [pendingMatrixSubmitAction, setPendingMatrixSubmitAction] = useState<'save' | 'save-add' | null>(null)
  const [showThemLoaiVthhModal, setShowThemLoaiVthhModal] = useState(false)
  const [tenLoaiVthhMoi, setTenLoaiVthhMoi] = useState('')
  const [khoList, setKhoList] = useState(loadKhoListFromStorage)
  const [showThemKhoModal, setShowThemKhoModal] = useState(false)
  const [dinhMucNvlRows, setDinhMucNvlRows] = useState<{ ma: string; ten: string; dvt: string; so_luong: string; hao_hut: string }[]>([])
  const [nvlDropdownRowIdx, setNvlDropdownRowIdx] = useState<number | null>(null)
  const [nvlDropdownRect, setNvlDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const nvlDropdownRef = useRef<HTMLDivElement>(null)
  const nvlOptions = useMemo(() => (vatTuList ?? []).filter((r) => r.tinh_chat === 'Vật tư' || r.tinh_chat === 'Vật tư hàng hóa'), [vatTuList])

  /** Khóa bỏ tick «VT cấp cha» chỉ khi đã có VTHH con trỏ về mã này — còn không thì cho bỏ tick / chỉnh sửa bình thường. */
  const byMaVthhList = useMemo(() => {
    const m = new Map<string, unknown>()
    for (const r of vatTuList ?? []) {
      const u = String(r.ma ?? '').trim().toUpperCase()
      if (u) m.set(u, r)
    }
    return m
  }, [vatTuList])

  const coVtConThuocCha = useMemo(() => {
    if (mode !== 'edit' || !initialData?.vt_chinh) return false
    const maCha = (initialData.ma ?? '').trim()
    if (!maCha) return false
    const maChaU = maCha.toUpperCase()
    return (vatTuList ?? []).some(
      (r) => r.id !== initialData.id && vthhEffectiveParentMaU(r, byMaVthhList) === maChaU,
    )
  }, [mode, initialData?.id, initialData?.vt_chinh, initialData?.ma, vatTuList, byMaVthhList])
  const vtChinhLocked = mode === 'edit' && initialData?.vt_chinh === true && coVtConThuocCha
  const inputMaRef = useRef<HTMLInputElement>(null)
  const inputTenRef = useRef<HTMLInputElement>(null)
  const khoNgamDinhRef = useRef<HTMLDivElement>(null)
  const [khoDropdownRect, setKhoDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const nhomVthhRef = useRef<HTMLDivElement>(null)
  const [nhomDropdownRect, setNhomDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const [showThemNhomVTHHModal, setShowThemNhomVTHHModal] = useState(false)
  /** Chỉ số các dòng Đơn vị quy đổi đã nhập Tỉ lệ từ bàn phím (auto-fill từ kích thước không tính). */
  const userEnteredTiLeByIndex = useRef<Set<number>>(new Set())
  const overlayKhoLookupMouseDownRef = useRef(false)
  const overlayNhomVthhMouseDownRef = useRef(false)
  /** Nạp lại matrix khi `pricing_matrix` / định lượng / khổ trên bản ghi đổi — không chỉ theo `id`. */
  const matrixInitRef = useRef<string | null>(null)

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-vthh-variant-dropdown]')) return
      if ((e.target as HTMLElement).closest('[data-vthh-variant-dropdown-panel]')) return
      setOpenVariantDropdown(null)
    }
    window.addEventListener('mousedown', onMouseDown)
    return () => window.removeEventListener('mousedown', onMouseDown)
  }, [])

  useEffect(() => {
    if (lookupModal === 'kho' && khoNgamDinhRef.current) {
      const r = khoNgamDinhRef.current.getBoundingClientRect()
      setKhoDropdownRect({ top: r.bottom, left: r.left, width: Math.max(r.width, 200) })
    } else {
      setKhoDropdownRect(null)
    }
  }, [lookupModal])

  useEffect(() => {
    if (lookupModal === 'nhom_vthh' && nhomVthhRef.current) {
      const r = nhomVthhRef.current.getBoundingClientRect()
      setNhomDropdownRect({ top: r.bottom, left: r.left, width: Math.max(r.width, 220) })
    } else {
      setNhomDropdownRect(null)
    }
  }, [lookupModal])

  useEffect(() => {
    const raw = (initialData as { dinh_muc_nvl?: { ma: string; ten: string; dvt: string; so_luong: string; hao_hut: string }[] })?.dinh_muc_nvl
    if (initialData != null) {
      if (Array.isArray(raw) && raw.length > 0) {
        setDinhMucNvlRows(
          raw.map((r) =>
            normalizeDinhMucRowDvt(
              {
                ma: r.ma ?? '',
                ten: r.ten ?? '',
                dvt: r.dvt ?? '',
                so_luong:
                  r.so_luong != null && String(r.so_luong).trim() !== '' ? formatSoTuNhienInput(String(r.so_luong)) : '',
                hao_hut:
                  (r as { hao_hut?: string }).hao_hut != null && String((r as { hao_hut?: string }).hao_hut).trim() !== ''
                    ? formatSoTuNhienInput(String((r as { hao_hut?: string }).hao_hut))
                    : '',
              },
              nvlOptions
            )
          )
        )
      } else {
        setDinhMucNvlRows([])
      }
    }
  }, [initialData?.id, nvlOptions])

  useEffect(() => {
    const raw = (initialData as { don_vi_quy_doi?: unknown[] })?.don_vi_quy_doi
    if (Array.isArray(raw) && raw.length > 0) {
      userEnteredTiLeByIndex.current = new Set(raw.map((_, i) => i))
    } else if (initialData == null) {
      userEnteredTiLeByIndex.current = new Set()
    }
  }, [initialData?.id])

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (nvlDropdownRef.current?.contains(e.target as Node)) return
      if ((e.target as HTMLElement).closest('[data-nvl-cell]')) return
      setNvlDropdownRowIdx(null)
      setNvlDropdownRect(null)
    }
    window.addEventListener('mousedown', onMouseDown)
    return () => window.removeEventListener('mousedown', onMouseDown)
  }, [nvlDropdownRowIdx])

  const refreshLoaiNhomDanhMuc = useCallback(async () => {
    try {
      const all = await vatTuHangHoaGetAll()
      setLoaiVthhOptions(buildLoaiVthhSelectOptions(all))
      setDinhLuongOptions(readVthhDinhLuongCustomFromStorage().map((x) => x.ten).filter(Boolean))
      setHeMauAllOptions(
        readVthhHeMauCustomFromStorage()
          .map((x) => ({ ten: String(x.ten ?? '').trim(), he_mau_in: x.he_mau_in, he_mau_vat_tu: x.he_mau_vat_tu }))
          .filter((x) => x.ten),
      )
      const khoGiayItems = readVthhKhoGiayCustomFromStorage()
      setKhoGiayOptions(khoGiayItems.map((x) => x.ten).filter(Boolean))
      const widthMap: Record<string, number> = {}
      const daiMap: Record<string, number> = {}
      khoGiayItems.forEach((item) => {
        const ten = String(item.ten ?? '').trim()
        if (!ten) return
        const w = parseDecimalFlex(String(item.chieu_rong_m ?? '').trim())
        if (Number.isFinite(w) && w > 0) widthMap[ten] = w
        const d = parseDecimalFlex(String(item.chieu_dai_m ?? '').trim())
        if (Number.isFinite(d) && d > 0) daiMap[ten] = d
      })
      setKhoGiayChieuRongByTen(widthMap)
      setKhoGiayChieuDaiByTen(daiMap)
      setNhomVTHHList((prev) => {
        const fromSync = buildNhomVthhLookupList(all)
        const ids = new Set(fromSync.map((x) => x.id))
        const extras = prev.filter((p) => !ids.has(p.id))
        return [...fromSync, ...extras].sort((a, b) => a.ten.localeCompare(b.ten, 'vi'))
      })
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    void refreshLoaiNhomDanhMuc()
  }, [refreshLoaiNhomDanhMuc])

  useEffect(() => {
    const run = () => {
      void refreshLoaiNhomDanhMuc()
    }
    const onKvRemoteSync = (e: Event) => {
      const keys = (e as CustomEvent<{ keys?: string[] }>).detail?.keys ?? []
      if (!Array.isArray(keys)) return
      if (
        keys.includes(STORAGE_KEY_VTHH_LOAI_CUSTOM) ||
        keys.includes(STORAGE_KEY_VTHH_NHOM_CUSTOM) ||
        keys.includes(STORAGE_KEY_VTHH_NHOM_DISABLED) ||
        keys.includes(STORAGE_KEY_VTHH_DINH_LUONG_CUSTOM) ||
        keys.includes(STORAGE_KEY_VTHH_HE_MAU_CUSTOM) ||
        keys.includes(STORAGE_KEY_VTHH_KHO_GIAY_CUSTOM)
      ) {
        run()
      }
    }
    window.addEventListener(HTQL_VTHH_LOAI_NHOM_CHANGED, run)
    window.addEventListener('htql-vthh-reload', run)
    window.addEventListener('htql-kv-remote-sync', onKvRemoteSync as EventListener)
    return () => {
      window.removeEventListener(HTQL_VTHH_LOAI_NHOM_CHANGED, run)
      window.removeEventListener('htql-vthh-reload', run)
      window.removeEventListener('htql-kv-remote-sync', onKvRemoteSync as EventListener)
    }
  }, [refreshLoaiNhomDanhMuc])

  const handleFormulaCachTinhChange = (value: string) => {
    setFormulaCachTinh(value)
    setFormulaText(FORMULA_TEMPLATES[value] ?? '')
  }

  const handleFormulaTextChange = (newVal: string) => {
    setFormulaText(newVal)
    setFormulaCachTinh(detectFormulaType(newVal))
  }

  const appendToFormula = (x: string) => {
    setFormulaText((s) => {
      const newVal = s + x
      setFormulaCachTinh(detectFormulaType(newVal))
      return newVal
    })
  }

  useEffect(() => {
    if (formulaDialogOpen) {
      const saved = getValues('cong_thuc_tinh_so_luong') || ''
      setFormulaText(saved)
      setFormulaCachTinh(detectFormulaType(saved))
    }
  }, [formulaDialogOpen])

  /* Khi mở form Sửa, hiển thị công thức đã lưu ra ngoài (giống form Thêm) */
  useEffect(() => {
    const saved = (initialData as { cong_thuc_tinh_so_luong?: string })?.cong_thuc_tinh_so_luong?.trim()
    if (saved) setFormulaText(saved)
  }, [initialData?.id])

  const handleDongYCongThuc = () => {
    const { valid } = validateFormula(formulaText ?? '', formulaCachTinh)
    if (valid) {
      setValue('cong_thuc_tinh_so_luong', formulaText ?? '')
      setFormulaDialogOpen(false)
    } else {
      setFormulaAlert({ valid: false })
    }
  }

  const handleKiemTraCongThuc = () => {
    try {
      const { valid } = validateFormula(formulaText ?? '', formulaCachTinh)
      setFormulaAlert({ valid })
    } catch {
      setFormulaAlert({ valid: false })
    }
  }

  const { register, handleSubmit, setValue, control, watch, getValues, trigger, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      ma_vthh: initialData?.ma ?? '',
      vt_chinh: (initialData as { vt_chinh?: boolean })?.vt_chinh ?? false,
      ten_vthh: (() => {
        const tenRaw = initialData?.ten ?? ''
        const matchNewMRMC = tenRaw.match(/\s+([\d.,]+)\s*mR\s*x\s*([\d.,]+)\s*mC\s*$/)
        const matchNewFull = tenRaw.match(/\s+([\d.,]+)mx([\d.,]+)m\s*$/)
        const matchNewSingle = tenRaw.match(/\s+([\d.,]+)m\s*$/)
        const matchFull = tenRaw.match(/\s*\(KT:\s*(.+?)mDx(.+?)mR\)\s*$/)
        const matchFullMRMC = tenRaw.match(/\s*\(KT:\s*(.+?)mRx(.+?)mC\)\s*$/)
        const matchFullM = tenRaw.match(/\s*\(KT:\s*(.+?)mx(.+?)m\)\s*$/)
        const matchOnlyMd = tenRaw.match(/\s*\(KT:\s*(.+?)mD\)\s*$/)
        const matchOnlyMr = tenRaw.match(/\s*\(KT:\s*(.+?)mR\)\s*$/)
        const matchOnlyMC = tenRaw.match(/\s*\(KT:\s*(.+?)mC\)\s*$/)
        const matchOnlyM = tenRaw.match(/\s*\(KT:\s*(.+?)m\)\s*$/)
        const matchOld = tenRaw.match(/\s*\(kích thước:\s*([^x]*)x([^)]*)\)\s*$/)
        const match = matchNewMRMC || matchNewFull || matchNewSingle || matchFull || matchFullMRMC || matchFullM || matchOnlyMd || matchOnlyMr || matchOnlyMC || matchOnlyM || matchOld
        if (match && match.index != null) return titleCaseVthhTen(tenRaw.slice(0, match.index).trim())
        return titleCaseVthhTen(tenRaw.trim())
      })(),
      tinh_chat: initialData?.tinh_chat ?? 'Vật tư',
      nhom_vthh: (() => {
        const v = (initialData?.nhom_vthh ?? '').trim()
        if (!v) return ''
        const parts = v.split(';').map((s) => s.trim()).filter(Boolean)
        const list = NHOM_VTHH_BASE_ITEMS
        const ids = parts.map((p) => {
          const byId = list.find((x) => x.id === p || x.ma === p)
          const byTen = list.find((x) => x.ten === p)
          return (byId ?? byTen)?.id ?? p
        }).filter((id, i, arr) => arr.indexOf(id) === i)
        return ids.join(';')
      })(),
      mo_ta: initialData?.mo_ta ?? '',
      hang_hoa_cap_cha: (initialData as { ma_vthh_cap_cha?: string })?.ma_vthh_cap_cha ?? '',
      dvt_chinh: initialData?.dvt_chinh ?? dvtList[0]?.ma_dvt ?? 'Cái',
      thoi_han_bh: initialData?.thoi_han_bh ?? '',
      so_luong_ton_toi_thieu: initialData?.so_luong_ton_toi_thieu != null ? formatSoTien(String(initialData.so_luong_ton_toi_thieu)) : '0',
      nguon_goc: initialData?.nguon_goc ?? '',
      dien_giai_khi_mua: initialData?.dien_giai_khi_mua ?? '',
      dien_giai_khi_ban: initialData?.dien_giai_khi_ban ?? '',
      kho_ngam_dinh: (() => {
        const v = initialData?.kho_ngam_dinh
        if (!v) return ''
        const item = KHO_LOOKUP.find((x) => x.id === v)
        return item?.label ?? v
      })(),
      tai_khoan_kho: initialData?.tai_khoan_kho ?? '',
      tai_khoan_doanh_thu: initialData?.tk_doanh_thu ?? '5111',
      tk_chiet_khau: initialData?.tk_chiet_khau ?? '5111',
      tk_giam_gia: initialData?.tk_giam_gia ?? '5111',
      tk_tra_lai: initialData?.tk_tra_lai ?? '5111',
      tai_khoan_chi_phi: initialData?.tk_chi_phi ?? '632',
      ty_le_ckmh: initialData?.ty_le_ckmh != null ? formatSoTien(String(initialData.ty_le_ckmh)) : '0',
      loai_hh_dac_trung: initialData?.loai_hh_dac_trung ?? '',
      don_gia_mua_co_dinh: initialData?.don_gia_mua_co_dinh != null ? formatSoTien(String(initialData.don_gia_mua_co_dinh)) : '0',
      don_gia_mua_gan_nhat: initialData?.gia_mua_gan_nhat != null ? formatSoTien(String(initialData.gia_mua_gan_nhat)) : (initialData?.don_gia_mua != null ? formatSoTien(String(initialData.don_gia_mua)) : '0'),
      don_gia_ban: initialData?.don_gia_ban != null ? formatSoTien(String(initialData.don_gia_ban)) : (initialData?.gia_ban_quy_dinh != null ? formatSoTien(String(initialData.gia_ban_quy_dinh)) : '0'),
      thue_suat_gtgt_dau_ra: resolveThueGtgtFormSelectMa(initialData ?? null),
      thue_suat_gtgt_tu_nhap: (() => {
        const sel = resolveThueGtgtFormSelectMa(initialData ?? null)
        if (sel !== 'Tự nhập') return ''
        const gtgStored = String(initialData?.thue_suat_gtgt ?? '').trim()
        const dauStored = String(initialData?.thue_suat_gtgt_dau_ra ?? '').trim()
        const raw = dauStored === 'Tự nhập' ? gtgStored : (dauStored || gtgStored)
        const s = String(raw).trim()
        if (s === '' || s === 'Chưa xác định' || s === '0' || s === '5' || s === '8' || s === '10') return ''
        return formatSoTien(s)
      })(),
      co_giam_thue: initialData?.co_giam_thue ?? 'Có giảm thuế',
      thue_suat_nk: initialData?.thue_suat_nk != null ? formatSoTien(String(initialData.thue_suat_nk)) : '0',
      thue_suat_xk: initialData?.thue_suat_xk != null ? formatSoTien(String(initialData.thue_suat_xk)) : '0',
      nhom_hhdv_ttdb: initialData?.nhom_hhdv_ttdb ?? '',
      mau_sac: initialData?.mau_sac ?? '',
      kich_thuoc: initialData?.kich_thuoc ?? '',
      kich_thuoc_md: (() => {
        const tenRaw = initialData?.ten ?? ''
        const matchNewMRMC = tenRaw.match(/\s+([\d.,]+)\s*mR\s*x\s*([\d.,]+)\s*mC\s*$/)
        const matchNewFull = tenRaw.match(/\s+([\d.,]+)mx([\d.,]+)m\s*$/)
        const matchNewSingle = tenRaw.match(/\s+([\d.,]+)m\s*$/)
        const matchFull = tenRaw.match(/\s*\(KT:\s*(.+?)mDx(.+?)mR\)\s*$/)
        const matchFullMRMC = tenRaw.match(/\s*\(KT:\s*(.+?)mRx(.+?)mC\)\s*$/)
        const matchFullM = tenRaw.match(/\s*\(KT:\s*(.+?)mx(.+?)m\)\s*$/)
        const matchOnlyMd = tenRaw.match(/\s*\(KT:\s*(.+?)mD\)\s*$/)
        const matchOnlyMR = tenRaw.match(/\s*\(KT:\s*(.+?)mR\)\s*$/)
        const matchOnlyM = tenRaw.match(/\s*\(KT:\s*(.+?)m\)\s*$/)
        const matchOld = tenRaw.match(/\s*\(kích thước:\s*([^x]*)x([^)]*)\)\s*$/)
        if (matchNewMRMC) return normalizeKichThuocInput(matchNewMRMC[1].trim())
        if (matchNewFull) return normalizeKichThuocInput(matchNewFull[1].trim())
        if (matchNewSingle) return normalizeKichThuocInput(matchNewSingle[1].trim())
        if (matchFull) return normalizeKichThuocInput(matchFull[1].trim())
        if (matchFullMRMC) return normalizeKichThuocInput(matchFullMRMC[1].trim())
        if (matchFullM) return normalizeKichThuocInput(matchFullM[1].trim())
        if (matchOnlyMd) return normalizeKichThuocInput(matchOnlyMd[1].trim())
        if (matchOnlyMR) return normalizeKichThuocInput(matchOnlyMR[1].trim())
        if (matchOnlyM) return normalizeKichThuocInput(matchOnlyM[1].trim())
        if (matchOld) return normalizeKichThuocInput(matchOld[1].trim())
        return normalizeKichThuocInput(initialData?.kich_thuoc_md ?? '')
      })(),
      kich_thuoc_mr: (() => {
        const tenRaw = initialData?.ten ?? ''
        const matchNewMRMC = tenRaw.match(/\s+([\d.,]+)\s*mR\s*x\s*([\d.,]+)\s*mC\s*$/)
        const matchNewFull = tenRaw.match(/\s+([\d.,]+)mx([\d.,]+)m\s*$/)
        const matchFull = tenRaw.match(/\s*\(KT:\s*(.+?)mDx(.+?)mR\)\s*$/)
        const matchFullMRMC = tenRaw.match(/\s*\(KT:\s*(.+?)mRx(.+?)mC\)\s*$/)
        const matchFullM = tenRaw.match(/\s*\(KT:\s*(.+?)mx(.+?)m\)\s*$/)
        const matchOnlyMr = tenRaw.match(/\s*\(KT:\s*(.+?)mR\)\s*$/)
        const matchOnlyMC = tenRaw.match(/\s*\(KT:\s*(.+?)mC\)\s*$/)
        const matchOld = tenRaw.match(/\s*\(kích thước:\s*([^x]*)x([^)]*)\)\s*$/)
        if (matchNewMRMC) return normalizeKichThuocInput(matchNewMRMC[2].trim())
        if (matchNewFull) return normalizeKichThuocInput(matchNewFull[2].trim())
        if (matchFull) return normalizeKichThuocInput(matchFull[2].trim())
        if (matchFullMRMC) return normalizeKichThuocInput(matchFullMRMC[2].trim())
        if (matchFullM) return normalizeKichThuocInput(matchFullM[2].trim())
        if (matchOnlyMr) return normalizeKichThuocInput(matchOnlyMr[1].trim())
        if (matchOnlyMC) return normalizeKichThuocInput(matchOnlyMC[1].trim())
        if (matchOld) return normalizeKichThuocInput(matchOld[2].trim())
        return normalizeKichThuocInput(initialData?.kich_thuoc_mr ?? '')
      })(),
      so_khung: initialData?.so_khung ?? '',
      so_may: initialData?.so_may ?? '',
      thoi_gian_bao_hanh: initialData?.thoi_gian_bao_hanh ?? '',
      xuat_xu: initialData?.xuat_xu ?? '',
      don_vi_quy_doi: Array.isArray(initialData?.don_vi_quy_doi) && initialData!.don_vi_quy_doi!.length > 0
        ? (() => {
            const tenRaw = initialData?.ten ?? ''
            const getMd = () => {
              const m = tenRaw.match(/\s+([\d.,]+)\s*mR\s*x\s*([\d.,]+)\s*mC\s*$/) || tenRaw.match(/\s+([\d.,]+)m\s*$/)
              if (m) return normalizeKichThuocInput(m[1].trim())
              return normalizeKichThuocInput(initialData?.kich_thuoc_md ?? '')
            }
            const getMr = () => {
              const m = tenRaw.match(/\s+([\d.,]+)\s*mR\s*x\s*([\d.,]+)\s*mC\s*$/)
              if (m) return normalizeKichThuocInput(m[2].trim())
              return normalizeKichThuocInput(initialData?.kich_thuoc_mr ?? '')
            }
            const mdVal = getMd()
            const mrVal = getMr()
            const productFirst = (() => {
              const a = parseDecimalFlex(mdVal)
              const b = parseDecimalFlex(mrVal)
              return a > 0 && b > 0 ? numberToStoredFormat(a * b) : null
            })()

            /** Xác định ĐG mua gốc để so sánh, theo đúng quy tắc: ưu tiên ĐG mua gần nhất, sau đó ĐG mua cố định, cuối cùng don_gia_mua (cũ). */
            const baseDonGiaMua =
              (initialData?.gia_mua_gan_nhat ?? 0) > 0
                ? initialData?.gia_mua_gan_nhat ?? 0
                : (initialData?.don_gia_mua_co_dinh ?? initialData?.don_gia_mua ?? 0)

            return (initialData!.don_vi_quy_doi as {
              dvt?: string
              dvt_chinh?: string
              ti_le_quy_doi?: string
              phep_tinh?: string
              mo_ta?: string
              gia_mua?: unknown
              gia_ban?: unknown
              gia_ban_1?: unknown
              gia_ban_2?: unknown
              gia_ban_3?: unknown
            }[]).map((r, idx) => {
              const tiLeTheoKho = (r as { ti_le_theo_kho_giay?: Record<string, unknown> }).ti_le_theo_kho_giay
              const tiLeKhoJson =
                tiLeTheoKho && typeof tiLeTheoKho === 'object' && !Array.isArray(tiLeTheoKho)
                  ? JSON.stringify(
                      Object.fromEntries(
                        Object.entries(tiLeTheoKho)
                          .map(([k, v]) => [k, String(v ?? '').trim()])
                          .filter(([, v]) => v !== ''),
                      ),
                    )
                  : ''
              const dvtChinh = initialData?.dvt_chinh ?? dvtList[0]?.ma_dvt ?? 'Cái'
              const dvtQuyDoi = r.dvt ?? r.dvt_chinh ?? ''
              const tiLeStored =
                idx === 0 && productFirst != null
                  ? productFirst
                  : r.ti_le_quy_doi != null && String(r.ti_le_quy_doi).trim() !== ''
                    ? numberToStoredFormat(parseDecimalFlex(String(r.ti_le_quy_doi)))
                    : ''
              const phepTinh = (r.phep_tinh === 'chia' ? 'chia' : r.phep_tinh === 'nhan' ? 'nhan' : '') as 'nhan' | 'chia' | ''
              const moTa = (r as { mo_ta?: string }).mo_ta ?? ''

              // Giá đã lưu (hiệu lực) cho ĐV quy đổi này
              const savedGiaMuaStr = (r.gia_mua ?? '').toString().trim()
              const savedGiaMuaNum = savedGiaMuaStr ? parseFloatVN(savedGiaMuaStr) : 0

              // Giá tự động tính lại từ base + tỉ lệ + phép tính
              const tiLeNum = parseFloatVN(tiLeStored || (r.ti_le_quy_doi as string) || '1')
              let autoGiaMua = baseDonGiaMua
              if (phepTinh === 'nhan' && tiLeNum > 0) autoGiaMua = baseDonGiaMua * tiLeNum
              else if (phepTinh === 'chia' && tiLeNum > 0) autoGiaMua = baseDonGiaMua / tiLeNum

              // So sánh: nếu chênh lệch đáng kể thì coi là giá override nhập tay → nạp vào field; ngược lại để rỗng để form tự tính.
              const epsilon = 1e-6
              const isOverride =
                savedGiaMuaStr !== '' &&
                (baseDonGiaMua === 0 || Math.abs(savedGiaMuaNum - autoGiaMua) > epsilon)

              const giaMuaFieldValue = isOverride ? savedGiaMuaStr : ''

              return {
                dvt_chinh: dvtChinh,
                dvt_quy_doi: dvtQuyDoi,
                ti_le_quy_doi: tiLeStored,
                ti_le_kho_json: tiLeKhoJson,
                phep_tinh: phepTinh,
                mo_ta: moTa,
                // giá override nhập tay (nếu có); nếu rỗng thì UI sẽ dùng giá tự động
                gia_mua_gan_nhat: giaMuaFieldValue,
                gia_ban: r.gia_ban != null ? formatSoTien(String(r.gia_ban)) : '',
                gia_ban_1:
                  (r as { gia_ban_1?: unknown }).gia_ban_1 != null
                    ? formatSoTien(String((r as { gia_ban_1?: unknown }).gia_ban_1))
                    : '',
                gia_ban_2:
                  (r as { gia_ban_2?: unknown }).gia_ban_2 != null
                    ? formatSoTien(String((r as { gia_ban_2?: unknown }).gia_ban_2))
                    : '',
                gia_ban_3:
                  (r as { gia_ban_3?: unknown }).gia_ban_3 != null
                    ? formatSoTien(String((r as { gia_ban_3?: unknown }).gia_ban_3))
                    : '',
              }
            })
          })()
        : [],
      dien_giai: initialData?.dien_giai ?? '',
      la_bo_phan_lap_rap: initialData?.la_bo_phan_lap_rap ?? false,
      la_vthh_ban: initialData?.la_vthh_ban ?? true,
      la_mat_hang_khuyen_mai: initialData?.la_hang_khuyen_mai ?? false,
      chiet_khau: (initialData as { chiet_khau?: boolean })?.chiet_khau ?? false,
      loai_chiet_khau: (initialData as { loai_chiet_khau?: string })?.loai_chiet_khau ?? 'Theo %',
      bang_chiet_khau: Array.isArray((initialData as { bang_chiet_khau?: { so_luong_tu?: string; so_luong_den?: string; ty_le_chiet_khau?: string }[] })?.bang_chiet_khau) && (initialData as { bang_chiet_khau: unknown[] }).bang_chiet_khau.length > 0
        ? (initialData as { bang_chiet_khau: { so_luong_tu?: string; so_luong_den?: string; ty_le_chiet_khau?: string; mo_ta?: string }[]; loai_chiet_khau?: string }).bang_chiet_khau.map((r, idx, arr) => {
            const loai = (initialData as { loai_chiet_khau?: string })?.loai_chiet_khau ?? 'Theo %'
            const tyLe = r.ty_le_chiet_khau != null ? String(r.ty_le_chiet_khau) : ''
            const prev = arr[idx - 1]
            const soLuongTu = r.so_luong_tu != null && String(r.so_luong_tu).trim() !== '' ? formatSoNguyenInput(String(r.so_luong_tu)) : (idx === 0 ? '0' : (prev ? formatSoNguyenInput(String(prev.so_luong_den ?? '')) : ''))
            return {
              so_luong_tu: soLuongTu,
              so_luong_den: r.so_luong_den != null ? formatSoNguyenInput(String(r.so_luong_den)) : '',
              ty_le_chiet_khau: tyLe ? (loai === 'Theo số tiền' ? formatSoTien(tyLe) : formatSoNguyenInput(tyLe)) : '',
              mo_ta: (r as { mo_ta?: string }).mo_ta ?? '',
            }
          })
        : [],
      theo_doi_ma_quy_cach: (initialData as { theo_doi_ma_quy_cach?: boolean })?.theo_doi_ma_quy_cach ?? false,
      ma_quy_cach: (() => {
        const raw = (initialData as unknown as { ma_quy_cach?: { ten_hien_thi?: string; cho_phep_trung?: boolean; hien_thi?: boolean }[] })?.ma_quy_cach
        return Array.isArray(raw) && raw.length >= 5
          ? raw.slice(0, 5).map((r) => ({ hien_thi: r.hien_thi ?? false, ten_hien_thi: r.ten_hien_thi ?? '', cho_phep_trung: r.cho_phep_trung ?? false }))
          : [
              { hien_thi: false, ten_hien_thi: '', cho_phep_trung: false },
              { hien_thi: false, ten_hien_thi: '', cho_phep_trung: false },
              { hien_thi: false, ten_hien_thi: '', cho_phep_trung: false },
              { hien_thi: false, ten_hien_thi: '', cho_phep_trung: false },
              { hien_thi: false, ten_hien_thi: '', cho_phep_trung: false },
            ]
      })(),
      nhieu_phien_ban: (() => {
        if ((initialData as { nhieu_phien_ban?: boolean })?.nhieu_phien_ban === true) return true
        if ((initialData as { pricing_matrix?: unknown[] })?.pricing_matrix && Array.isArray((initialData as { pricing_matrix?: unknown[] }).pricing_matrix) && ((initialData as { pricing_matrix?: unknown[] }).pricing_matrix?.length ?? 0) > 0) return true
        if ((initialData as { dinh_luong?: string })?.dinh_luong?.trim()) return true
        if ((initialData as { kho_giay?: string })?.kho_giay?.trim()) return true
        return false
      })(),
      ma_quy_cach_bien_the: (initialData as { ma_quy_cach?: string })?.ma_quy_cach ?? '',
      dinh_luong: mergeSemicolonRootsWithPricingMatrix(
        (initialData as { dinh_luong?: string })?.dinh_luong ?? '',
        (initialData as { pricing_matrix?: unknown[] })?.pricing_matrix,
        'dinh_luong',
      ),
      kho_giay: mergeSemicolonRootsWithPricingMatrix(
        (initialData as { kho_giay?: string })?.kho_giay ?? '',
        (initialData as { pricing_matrix?: unknown[] })?.pricing_matrix,
        'kho_giay',
      ),
      he_mau: mergeSemicolonRootsWithPricingMatrix(
        (initialData as { he_mau?: string; mau_sac?: string })?.he_mau ?? (initialData as { mau_sac?: string })?.mau_sac ?? '',
        (initialData as { pricing_matrix?: unknown[] })?.pricing_matrix,
        'he_mau',
      ),
      do_day: (() => {
        const explicit = String((initialData as { do_day?: string })?.do_day ?? '').trim()
        if (explicit) return explicit
        return mergeSemicolonRootsWithPricingMatrix(
          (initialData as { dinh_luong?: string })?.dinh_luong ?? '',
          (initialData as { pricing_matrix?: unknown[] })?.pricing_matrix,
          'dinh_luong',
        )
      })(),
      dac_tinh: (initialData as { dac_tinh?: string })?.dac_tinh ?? initialData?.dien_giai ?? '',
      duong_dan_hinh_anh: initialData?.duong_dan_hinh_anh ?? '',
      cong_thuc_tinh_so_luong: (initialData as { cong_thuc_tinh_so_luong?: string })?.cong_thuc_tinh_so_luong ?? '',
      ten_file_hinh_anh: (() => {
        const p = initialData?.duong_dan_hinh_anh
        if (!p || typeof p !== 'string' || p.startsWith('data:')) return ''
        const name = p.replace(/^.*[/\\]/, '').trim()
        return name || ''
      })(),
    },
  })

  const tinhChat = watch('tinh_chat')
  const canShowSaleFields = watch('la_vthh_ban') === true
  const dinhLuongValue = watch('dinh_luong') ?? ''
  const khoGiayValue = watch('kho_giay') ?? ''
  const heMauValue = watch('he_mau') ?? ''
  /** Dùng cho matrix ĐVQĐ khi `kho_giay` root trống nhưng đã có `ti_le_kho_json` (mở Xem/Sửa). */
  const donViQuyDoiRowsForMatrix = watch('don_vi_quy_doi') ?? []
  const maVthhValue = (watch('ma_vthh') ?? '').trim()
  const nhieuPhienBan = watch('nhieu_phien_ban') === true
  const canAccessBangGiaTab = canShowSaleFields || nhieuPhienBan || watch('la_mat_hang_khuyen_mai') === true
  const showBangGiaSaleColumns = canShowSaleFields && !nhieuPhienBan
  const bangGiaRowsForMatrix = watch('bang_chiet_khau') ?? []
  /** Theo dõi từng ô dòng 1 để matrix cập nhật ngay khi nhập SL từ / SL đến (không phụ thuộc tham chiếu mảng). */
  const bangChietKhau0Tu = watch('bang_chiet_khau.0.so_luong_tu')
  const bangChietKhau0Den = watch('bang_chiet_khau.0.so_luong_den')
  const bacGiaCount = Math.max(1, Array.isArray(bangGiaRowsForMatrix) ? bangGiaRowsForMatrix.length : 1)
  const isBangGiaEmpty = !Array.isArray(bangGiaRowsForMatrix) || bangGiaRowsForMatrix.length === 0
  /**
   * Cột Giá bán TT trên matrix: SL từ ≥ 1; nếu đã nhập SL đến thì bắt buộc đến ≥ từ (đúng quy tắc khoảng).
   * Khoảng mở (không nhập đến) vẫn hiện cột khi từ ≥ 1.
   */
  const showGiaBanTTAfterGiáMua =
    canShowSaleFields &&
    nhieuPhienBan &&
    (() => {
      const tu = parseFloatVN(String(bangChietKhau0Tu ?? '').trim())
      const denStr = String(bangChietKhau0Den ?? '').trim()
      if (!Number.isFinite(tu) || tu < 1) return false
      if (denStr !== '') {
        const den = parseFloatVN(denStr)
        if (!Number.isFinite(den) || den < tu) return false
      }
      return true
    })()
  const matrixPriceColsPerKhoGiay =
    2 + (canShowSaleFields ? bacGiaCount + (showGiaBanTTAfterGiáMua ? 1 : 0) : 0)
  const showBangGiaTierTable = canShowSaleFields
  const initialBangGiaCount = Math.max(
    1,
    Array.isArray((initialData as { bang_chiet_khau?: unknown[] } | undefined)?.bang_chiet_khau)
      ? (((initialData as { bang_chiet_khau?: unknown[] }).bang_chiet_khau?.length ?? 0) || 1)
      : 1,
  )
  const selectedDinhLuong = useMemo(() => parseMultiStoredList(dinhLuongValue), [dinhLuongValue])
  const selectedKhoGiay = useMemo(() => parseMultiStoredList(khoGiayValue), [khoGiayValue])
  const selectedHeMau = useMemo(() => parseMultiStoredList(heMauValue), [heMauValue])
  const heMauOptions = useMemo(() => {
    const isVatTu = String(tinhChat ?? '').trim() === 'Vật tư'
    return heMauAllOptions
      .filter((item) => (isVatTu ? item.he_mau_vat_tu === true : item.he_mau_in === true))
      .map((item) => item.ten)
  }, [heMauAllOptions, tinhChat])
  useEffect(() => {
    const current = parseMultiStoredList(getValues('he_mau') ?? '')
    if (current.length === 0) return
    const allowed = new Set(heMauOptions)
    const next = current.filter((x) => allowed.has(x))
    if (next.length !== current.length) {
      setValue('he_mau', next.join(';'), { shouldDirty: true, shouldTouch: true })
    }
  }, [heMauOptions, getValues, setValue])
  const selectedPhu1Axis = useMemo(() => {
    const tagged = [
      ...selectedDinhLuong.map((v) => `DL:${v}`),
      ...selectedHeMau.map((v) => `HM:${v}`),
    ]
    return tagged.length > 0 ? Array.from(new Set(tagged)) : ['']
  }, [selectedDinhLuong, selectedHeMau])
  const persistedPricingMatrixRowCount = useMemo(() => {
    const pm = (initialData as { pricing_matrix?: unknown[] } | undefined)?.pricing_matrix
    return Array.isArray(pm) ? pm.length : 0
  }, [initialData])
  /** Matrix bậc giá: đừng ẩn khi mở bản ghi chỉ có `pricing_matrix` / state đã nạp mà tab Ngầm định chưa có chọn DL/Khổ/Hệ màu. */
  const showVariantMatrix =
    nhieuPhienBan &&
    (selectedDinhLuong.length > 0 ||
      selectedHeMau.length > 0 ||
      selectedKhoGiay.length > 0 ||
      persistedPricingMatrixRowCount > 0 ||
      Object.keys(variantMatrix).length > 0)
  const selectedKhoGiayAxis = useMemo(() => (selectedKhoGiay.length > 0 ? selectedKhoGiay : ['']), [selectedKhoGiay])
  const hasAnySpecialKhoSelected = useMemo(() => {
    if (!nhieuPhienBan || selectedKhoGiay.length === 0) return false
    return selectedKhoGiay.some((ten) => !(Number.isFinite(khoGiayChieuDaiByTen[ten]) && khoGiayChieuDaiByTen[ten] > 0))
  }, [nhieuPhienBan, selectedKhoGiay, khoGiayChieuDaiByTen])
  /** ĐVQĐ: có khổ đặc biệt (kể cả trộn) thì dùng chế độ matrix theo khổ. */
  const specialOnlyKhoSelection = hasAnySpecialKhoSelected
  /**
   * Tab **Bậc giá** — matrix nhập giá: **chỉ cột khổ thường** (có chiều dài trong danh mục). Khổ đặc biệt / thiếu chiều dài **không** hiển thị ở đây.
   * Không có khổ thường nào → một cột rỗng `''` (nhập giá theo định lượng).
   */
  const matrixKhoGiayAxisBangGia = useMemo(() => {
    if (!nhieuPhienBan) return selectedKhoGiayAxis
    if (selectedKhoGiay.length === 0) return selectedKhoGiayAxis
    const normals = selectedKhoGiay.filter((ten) => Number.isFinite(khoGiayChieuDaiByTen[ten]) && khoGiayChieuDaiByTen[ten] > 0)
    if (normals.length > 0) return normals
    return ['']
  }, [nhieuPhienBan, selectedKhoGiay, selectedKhoGiayAxis, khoGiayChieuDaiByTen])

  /**
   * Lưu `pricing_matrix` / mã phụ 2: gồm **mọi khổ đã chọn** (thứ tự `kho_giay`), kể cả khổ đặc biệt — để lưới & DB có đủ PB…a/b/c.
   * Trộn thường + đặc biệt: chỉ dùng **khổ thường** (cùng quy tắc ĐVQĐ tránh trộn tỉ lệ).
   */
  const matrixKhoGiayAxisPayload = useMemo(() => {
    if (!nhieuPhienBan) return selectedKhoGiayAxis
    if (selectedKhoGiay.length === 0) return selectedKhoGiayAxis
    const normals = selectedKhoGiay.filter((ten) => Number.isFinite(khoGiayChieuDaiByTen[ten]) && khoGiayChieuDaiByTen[ten] > 0)
    if (normals.length > 0) return normals
    return selectedKhoGiay
  }, [nhieuPhienBan, selectedKhoGiay, selectedKhoGiayAxis, khoGiayChieuDaiByTen])

  /** Khổ giấy hiển thị matrix ĐVQĐ: ưu tiên `kho_giay` form; nếu trống lấy tên khổ từ `ti_le_kho_json` đã lưu (Xem/Sửa). */
  const khoGiayNamesForDvdqMatrixUi = useMemo(() => {
    if (selectedKhoGiay.length > 0) return selectedKhoGiay
    const fromJson: string[] = []
    const seen = new Set<string>()
    for (const row of donViQuyDoiRowsForMatrix) {
      const m = parseTiLeKhoJson((row as { ti_le_kho_json?: string }).ti_le_kho_json)
      for (const k of Object.keys(m)) {
        if (k && !seen.has(k)) {
          seen.add(k)
          fromJson.push(k)
        }
      }
    }
    return fromJson
  }, [selectedKhoGiay, donViQuyDoiRowsForMatrix])

  const dvdqHasSpecialKhoFromUiList = useMemo(() => {
    if (!nhieuPhienBan || khoGiayNamesForDvdqMatrixUi.length === 0) return false
    return khoGiayNamesForDvdqMatrixUi.some((ten) => !(Number.isFinite(khoGiayChieuDaiByTen[ten]) && khoGiayChieuDaiByTen[ten] > 0))
  }, [nhieuPhienBan, khoGiayNamesForDvdqMatrixUi, khoGiayChieuDaiByTen])

  const hasAnyNormalKhoForDvdqUi = useMemo(() => {
    if (!nhieuPhienBan || khoGiayNamesForDvdqMatrixUi.length === 0) return false
    return khoGiayNamesForDvdqMatrixUi.some((ten) => Number.isFinite(khoGiayChieuDaiByTen[ten]) && khoGiayChieuDaiByTen[ten] > 0)
  }, [nhieuPhienBan, khoGiayNamesForDvdqMatrixUi, khoGiayChieuDaiByTen])

  /** Tab ĐVQĐ — matrix theo khổ:
   * - Trộn khổ thường + đặc biệt: chỉ hiển thị khổ bình thường.
   * - Chỉ khổ đặc biệt: hiển thị khổ đặc biệt.
   */
  const dvdqMatrixKhoTens = useMemo(() => {
    if (!nhieuPhienBan || khoGiayNamesForDvdqMatrixUi.length === 0 || !dvdqHasSpecialKhoFromUiList) return [] as string[]
    const normals = khoGiayNamesForDvdqMatrixUi.filter((ten) => Number.isFinite(khoGiayChieuDaiByTen[ten]) && khoGiayChieuDaiByTen[ten] > 0)
    if (normals.length > 0) return normals
    return khoGiayNamesForDvdqMatrixUi
  }, [nhieuPhienBan, khoGiayNamesForDvdqMatrixUi, dvdqHasSpecialKhoFromUiList, khoGiayChieuDaiByTen])
  const isDemToken = useCallback((raw: string) => /\bdem\b/i.test(String(raw ?? '').trim()), [])
  const isKhoGiayNormalToken = useCallback((ten: string) => Number.isFinite(khoGiayChieuDaiByTen[ten]) && khoGiayChieuDaiByTen[ten] > 0, [khoGiayChieuDaiByTen])
  const decodePhu1Token = useCallback((token: string): { dinhLuong?: string; heMau?: string } => {
    const raw = String(token ?? '')
    if (raw.startsWith('DL:')) return { dinhLuong: raw.slice(3) }
    if (raw.startsWith('HM:')) return { heMau: raw.slice(3) }
    return raw ? { dinhLuong: raw } : {}
  }, [])
  const isVariantOptionDisabled = useCallback((kind: 'dinh-luong' | 'kho-giay' | 'he-mau', value: string) => {
    if (kind === 'dinh-luong') {
      const current = selectedDinhLuong
      const nextIsDem = isDemToken(value)
      return current.some((item) => item !== value && isDemToken(item) !== nextIsDem)
    }
    if (kind === 'kho-giay') {
      const current = selectedKhoGiay
      const nextIsNormal = isKhoGiayNormalToken(value)
      return current.some((item) => item !== value && isKhoGiayNormalToken(item) !== nextIsNormal)
    }
    return false
  }, [selectedDinhLuong, selectedKhoGiay, isDemToken, isKhoGiayNormalToken])

  const toggleVariantMultiValue = useCallback((field: 'dinh_luong' | 'kho_giay' | 'he_mau', value: string) => {
    const current = parseMultiStoredList(getValues(field) ?? '')
    const set = new Set(current)
    const adding = !set.has(value)
    if (adding && field === 'dinh_luong') {
      const nextIsDem = isDemToken(value)
      const hasOpposite = current.some((item) => isDemToken(item) !== nextIsDem)
      if (hasOpposite) {
        setSubmitError('Độ dày/Định lượng: không được chọn trộn DEM với GSM.')
        return
      }
    }
    if (adding && field === 'kho_giay') {
      const nextIsNormal = isKhoGiayNormalToken(value)
      const hasOpposite = current.some((item) => isKhoGiayNormalToken(item) !== nextIsNormal)
      if (hasOpposite) {
        setSubmitError('Khổ giấy: không được chọn trộn khổ thường với khổ đặc biệt.')
        return
      }
    }
    if (set.has(value)) set.delete(value)
    else set.add(value)
    const next = Array.from(set).join(';')
    setValue(field, next, { shouldDirty: true, shouldTouch: true })
    if (field === 'dinh_luong') {
      setValue('do_day', next, { shouldDirty: true, shouldTouch: true })
    }
    setSubmitError('')
  }, [getValues, setValue, isDemToken, isKhoGiayNormalToken])

  const variantCombos = useMemo(() => {
    if (!nhieuPhienBan) return []
    const dls = selectedPhu1Axis.length > 0 ? selectedPhu1Axis : ['']
    const kgs = matrixKhoGiayAxisBangGia.length > 0 ? matrixKhoGiayAxisBangGia : ['']
    const combos: Array<{ dinh_luong: string; kho_giay: string; key: string }> = []
    dls.forEach((dl) => {
      kgs.forEach((kg) => {
        combos.push({ dinh_luong: dl, kho_giay: kg, key: variantComboKey(dl, kg) })
      })
    })
    return combos
  }, [selectedPhu1Axis, nhieuPhienBan, matrixKhoGiayAxisBangGia])

  const variantMatrixInitSeed = useMemo(() => {
    const id = initialData?.id ?? 0
    const pm = (initialData as { pricing_matrix?: unknown[] } | undefined)?.pricing_matrix
    const dl0 = (initialData as { dinh_luong?: string })?.dinh_luong ?? ''
    const kg0 = (initialData as { kho_giay?: string })?.kho_giay ?? ''
    const hm0 = (initialData as { he_mau?: string; mau_sac?: string })?.he_mau ?? (initialData as { mau_sac?: string })?.mau_sac ?? ''
    return `${id}|${initialBangGiaCount}|${JSON.stringify(pm ?? null)}|${dl0}|${hm0}|${kg0}`
  }, [
    initialData?.id,
    initialBangGiaCount,
    (initialData as { pricing_matrix?: unknown[] } | undefined)?.pricing_matrix,
    (initialData as { dinh_luong?: string })?.dinh_luong,
    (initialData as { he_mau?: string; mau_sac?: string })?.he_mau,
    (initialData as { he_mau?: string; mau_sac?: string })?.mau_sac,
    (initialData as { kho_giay?: string })?.kho_giay,
  ])

  useEffect(() => {
    if (matrixInitRef.current === variantMatrixInitSeed) return
    matrixInitRef.current = variantMatrixInitSeed
    const nhieuPb = (initialData as { nhieu_phien_ban?: boolean })?.nhieu_phien_ban === true
    const matrix = Array.isArray((initialData as { pricing_matrix?: unknown[] } | undefined)?.pricing_matrix)
      ? ((initialData as { pricing_matrix?: Array<{
          dinh_luong?: string
          kho_giay?: string
          gia_mua_gan_nhat?: number
          gia_mua?: number
          gia_ban_tt?: number
          gia_ban?: number
          gia_ban_1?: number
          gia_ban_2?: number
          gia_ban_3?: number
        }> }).pricing_matrix ?? [])
      : []
    const daiByTenInit = readKhoGiayDaiByTenFromCatalog()
    const khoSelInit = parseMultiStoredList((initialData as { kho_giay?: string })?.kho_giay ?? '')
    let kgsUiInit: string[] = ['']
    if (nhieuPb && khoSelInit.length > 0) {
      const normals = khoSelInit.filter((ten) => Number.isFinite(daiByTenInit[ten]) && daiByTenInit[ten] > 0)
      kgsUiInit = normals.length > 0 ? normals : ['']
    }

    const headerGmn = (initialData as { gia_mua_gan_nhat?: number })?.gia_mua_gan_nhat
    const rowToCell = (row: {
      gia_mua_gan_nhat?: number
      gia_mua?: number
      gia_ban_tt?: number
      gia_ban?: number
      gia_ban_1?: number
      gia_ban_2?: number
      gia_ban_3?: number
    }): VariantMatrixCell => {
      const gmnRow = row.gia_mua_gan_nhat
      const gmnStr =
        gmnRow != null && gmnRow > 0
          ? formatSoTien(String(gmnRow))
          : headerGmn != null && headerGmn > 0
            ? formatSoTien(String(headerGmn))
            : ''
      return {
        gia_mua_gan_nhat: gmnStr,
        gia_mua: row.gia_mua != null ? formatSoTien(String(row.gia_mua)) : '',
        gia_ban_tt: row.gia_ban_tt != null ? formatSoTien(String(row.gia_ban_tt)) : '',
        gia_ban_by_bac: Array.from({ length: initialBangGiaCount }, (_, idx) => {
          if (idx === 0) return row.gia_ban != null ? formatSoTien(String(row.gia_ban)) : ''
          if (idx === 1) return row.gia_ban_1 != null ? formatSoTien(String(row.gia_ban_1)) : ''
          if (idx === 2) return row.gia_ban_2 != null ? formatSoTien(String(row.gia_ban_2)) : ''
          if (idx === 3) return row.gia_ban_3 != null ? formatSoTien(String(row.gia_ban_3)) : ''
          return ''
        }),
      }
    }

    const next: Record<string, VariantMatrixCell> = {}
    matrix.forEach((row) => {
      const dlKey = String((row as { dinh_luong?: string; he_mau?: string }).dinh_luong ?? '').trim()
      const hmKey = String((row as { he_mau?: string }).he_mau ?? '').trim()
      const key = variantComboKey(dlKey ? `DL:${dlKey}` : hmKey ? `HM:${hmKey}` : '', row.kho_giay ?? '')
      next[key] = rowToCell(row)
    })

    /** Cột matrix bậc giá dùng `kgsUiInit` (có thể `''`); DB lưu `kho_giay` thật → map giá sang đúng ô UI. */
    const cellHasPrice = (c: VariantMatrixCell | undefined) =>
      Boolean(
        (c?.gia_mua ?? '').trim() ||
          (c?.gia_ban_tt ?? '').trim() ||
          (c?.gia_ban_by_bac ?? []).some((x) => (x ?? '').trim()),
      )

    const dlsSet = new Set<string>()
    matrix.forEach((r) => {
      const dRaw = String((r as { dinh_luong?: string }).dinh_luong ?? '').trim()
      const hRaw = String((r as { he_mau?: string }).he_mau ?? '').trim()
      const d = dRaw ? `DL:${dRaw}` : (hRaw ? `HM:${hRaw}` : '')
      if (d) dlsSet.add(d)
    })
    let dlsList = [...dlsSet]
    if (dlsList.length === 0) {
      const dlInit = parseMultiStoredList((initialData as { dinh_luong?: string })?.dinh_luong ?? '').map((x) => `DL:${x}`)
      const hmInit = parseMultiStoredList((initialData as { he_mau?: string; mau_sac?: string })?.he_mau ?? (initialData as { mau_sac?: string })?.mau_sac ?? '').map((x) => `HM:${x}`)
      dlsList = [...dlInit, ...hmInit]
      if (dlsList.length === 0) dlsList = ['']
    }

    for (const dl of dlsList) {
      const rowsDl = matrix
        .filter((r) => {
          const dRaw = String((r as { dinh_luong?: string }).dinh_luong ?? '').trim()
          const hRaw = String((r as { he_mau?: string }).he_mau ?? '').trim()
          const token = dRaw ? `DL:${dRaw}` : hRaw ? `HM:${hRaw}` : ''
          return token === dl
        })
        .sort((a, b) => String(a.kho_giay ?? '').localeCompare(String(b.kho_giay ?? ''), 'vi', { numeric: true }))
      if (rowsDl.length === 0) continue
      const refRow = rowsDl[0]!
      for (const kgUi of kgsUiInit) {
        const uiKey = variantComboKey(dl, kgUi)
        if (cellHasPrice(next[uiKey])) continue
        const kgTrim = String(kgUi).trim()
        const exact = rowsDl.find((r) => String(r.kho_giay ?? '').trim() === kgTrim)
        const src = exact ?? refRow
        next[uiKey] = rowToCell(src)
      }
    }

    setVariantMatrix(next)
  }, [variantMatrixInitSeed, initialBangGiaCount])

  useEffect(() => {
    setVariantMatrix((prev) => {
      const next: Record<string, VariantMatrixCell> = {}
      Object.entries(prev).forEach(([key, old]) => {
        const giaBanByBac = old?.gia_ban_by_bac ?? []
        next[key] = {
          gia_mua_gan_nhat: old?.gia_mua_gan_nhat ?? '',
          gia_mua: old?.gia_mua ?? '',
          gia_ban_tt: old?.gia_ban_tt ?? '',
          gia_ban_by_bac: Array.from({ length: bacGiaCount }, (_, idx) => giaBanByBac[idx] ?? ''),
        }
      })
      return next
    })
  }, [bacGiaCount])

  useEffect(() => {
    if (!nhieuPhienBan || variantCombos.length !== 1) return
    const autoMa = vthhBuildMaPhu1(maVthhValue, 1)
    if ((getValues('ma_quy_cach_bien_the') ?? '').trim() !== autoMa) {
      setValue('ma_quy_cach_bien_the', autoMa, { shouldDirty: true, shouldTouch: false })
    }
  }, [variantCombos, maVthhValue, getValues, setValue, nhieuPhienBan])

  /** Một ô giá theo ĐL (cột khổ đầu tiên); các khổ còn lại kế thừa khi lưu. */
  const matrixPriceRefKeys = useMemo(() => {
    if (!nhieuPhienBan) return [] as string[]
    if (selectedPhu1Axis.length === 0 || matrixKhoGiayAxisBangGia.length === 0) return []
    const k0 = matrixKhoGiayAxisBangGia[0] ?? ''
    return selectedPhu1Axis.map((dl) => variantComboKey(dl, k0))
  }, [nhieuPhienBan, selectedPhu1Axis, matrixKhoGiayAxisBangGia])

  const matrixMissingFieldMap = useMemo(() => {
    const out: Record<string, true> = {}
    if (!nhieuPhienBan || matrixPriceRefKeys.length === 0) return out
    matrixPriceRefKeys.forEach((key) => {
      const cell = variantMatrix[key]
      const giaMua = (cell?.gia_mua ?? '').trim()
      if (!giaMua) out[variantMatrixFieldKey(key, 'mua')] = true
      if (canShowSaleFields) {
        if (showGiaBanTTAfterGiáMua) {
          const tt = (cell?.gia_ban_tt ?? '').trim()
          if (!tt) out[variantMatrixFieldKey(key, 'ban_tt')] = true
        }
        for (let idx = 0; idx < bacGiaCount; idx++) {
          const giaBan = (cell?.gia_ban_by_bac?.[idx] ?? '').trim()
          if (!giaBan) out[variantMatrixFieldKey(key, 'ban', idx)] = true
        }
      }
    })
    return out
  }, [
    nhieuPhienBan,
    matrixPriceRefKeys,
    variantMatrix,
    bacGiaCount,
    canShowSaleFields,
    showGiaBanTTAfterGiáMua,
  ])

  const matrixMissingCount = useMemo(
    () => Object.keys(matrixMissingFieldMap).length,
    [matrixMissingFieldMap],
  )

  useEffect(() => {
    if (!nhieuPhienBan) {
      setShowMatrixMissingHint(false)
      setShowMatrixMissingConfirm(false)
      setPendingMatrixSubmitAction(null)
    }
  }, [nhieuPhienBan])

  const loaiVthhSelectOptions = useMemo(() => {
    const base = loaiVthhOptions
    const tc = (tinhChat ?? '').trim()
    if (tc && !base.some((o) => o.value === tc)) {
      return [...base, { value: tc, label: tc }].sort((a, b) => a.value.localeCompare(b.value, 'vi'))
    }
    return base
  }, [loaiVthhOptions, tinhChat])
  const subTabs = useMemo(() => (tinhChat === 'Sản phẩm' ? SUB_TABS_SAN_PHAM : SUB_TABS_VAT_TU), [tinhChat])
  useEffect(() => {
    if (tinhChat !== 'Sản phẩm' && activeSubTab === 5) setActiveSubTab(4)
  }, [tinhChat, activeSubTab])
  useEffect(() => {
    if (!canAccessBangGiaTab && activeSubTab === 2) setActiveSubTab(1)
  }, [canAccessBangGiaTab, activeSubTab])

  /** Chế độ Thêm: ô mã = chữ cái đầu tính chất + 5 số tăng dần; cập nhật khi đổi tính chất */
  useEffect(() => {
    if (mode === 'add') setValue('ma_vthh', onMaTuDong(tinhChat ?? 'Vật tư'))
  }, [mode, tinhChat, onMaTuDong, setValue])

  /** Đồng bộ hai chiều: "Là hàng khuyến mại" ↔ Thuế GTGT 0%
   * - Tick checkbox → gán Thuế GTGT = 0%
   * - Chọn thuế khác 0% (gồm "Tự nhập") → bỏ tick (effect chỉ phụ thuộc thuế để tránh bỏ tick ngay khi user vừa tick) */
  const laMatHangKhuyenMai = watch('la_mat_hang_khuyen_mai')
  const thueSuatGtgtDauRa = watch('thue_suat_gtgt_dau_ra')
  useEffect(() => {
    if (laMatHangKhuyenMai) {
      setValue('thue_suat_gtgt_dau_ra', '0', { shouldValidate: false })
      setValue('thue_suat_gtgt_tu_nhap', '', { shouldValidate: false })
    }
  }, [laMatHangKhuyenMai, setValue])
  useEffect(() => {
    if (getValues('la_mat_hang_khuyen_mai') && thueSuatGtgtDauRa !== '0') {
      setValue('la_mat_hang_khuyen_mai', false, { shouldValidate: false })
    }
  }, [thueSuatGtgtDauRa, setValue, getValues])

  const imagePreview = watch('duong_dan_hinh_anh')
  useEffect(() => {
    if (!imagePreview) setImageMeta(null)
  }, [imagePreview])
  const handleImageSelect = async (file: File | null) => {
    setImageUploadError('')
    if (!file) return
    if (!isAllowedImageFile(file)) {
      setImageUploadError('Chỉ chấp nhận ảnh có đuôi .jpg, .jpeg hoặc .png')
      return
    }
    setImageUploading(true)
    try {
      const dataUrl = await resizeImageToFit(file)
      const ext = getImageExtension(file) ?? 'jpg'
      const tenFile =
        tenVthhImageBaseNameFromParts(
          String(getValues('ten_vthh') ?? ''),
          String(getValues('kich_thuoc_md') ?? ''),
          String(getValues('kich_thuoc_mr') ?? '')
        ) +
        '.' +
        ext
      if (htqlCanUploadToServer()) {
        const blob = await (await fetch(dataUrl)).blob()
        const maRaw = (getValues('ma_vthh') ?? '').trim() || `moi_${Date.now()}`
        const dir = htqlPathPartAscii(maRaw) || 'chua_co_ma'
        const up = await htqlUploadFileToServer(blob, { kind: 'vthh_hinh', relativeDir: dir, filename: tenFile })
        setValue('duong_dan_hinh_anh', `${HTQL_VTHH_HINH_PREFIX}${up.relativePath}`)
      } else {
        setValue('duong_dan_hinh_anh', dataUrl)
      }
      setValue('ten_file_hinh_anh', tenFile)
    } catch (e) {
      setImageUploadError(e instanceof Error ? e.message : 'Lỗi xử lý ảnh')
    } finally {
      setImageUploading(false)
    }
  }

  const { fields: donViQuyDoiFields, append: appendDonViQuyDoi, remove: removeDonViQuyDoi } = useFieldArray({
    control,
    name: 'don_vi_quy_doi',
  })
  const { fields: bangChietKhauFields, append: appendChietKhau, remove: removeChietKhau } = useFieldArray({ control, name: 'bang_chiet_khau' })
  const bangChietKhauValues = watch('bang_chiet_khau') ?? []
  /** Chỉ số dòng có dữ liệu cuối cùng. Dòng chỉ có Số lượng từ = "0" (các ô khác trống) không coi là có dữ liệu. */
  const lastDataIndexBangGia = (() => {
    let last = -1
    ;(bangChietKhauValues ?? []).forEach((r, i) => {
      const tu = (r?.so_luong_tu ?? '').trim()
      const den = (r?.so_luong_den ?? '').trim()
      const gia = (r?.ty_le_chiet_khau ?? '').trim()
      const hasData = !!(tu && tu !== '0') || !!(den) || !!(gia !== '' && gia !== '0')
      if (hasData) last = i
    })
    return last
  })()

  const donViQuyDoiValues = watch('don_vi_quy_doi') ?? []
  /* Chuỗi phụ thuộc để effect tự sinh mô tả chạy khi đổi ĐVT chính, ĐVQĐ, TL hoặc Phép tính (tránh lỗi chỉ đổi Phép tính mà mô tả không cập nhật) */
  const donViQuyDoiInputSignature = donViQuyDoiValues
    .map((r) => `${(r.dvt_chinh ?? '')}|${(r.dvt_quy_doi ?? '')}|${(r.ti_le_quy_doi ?? '')}|${(r.phep_tinh ?? '')}|${(r as { ti_le_kho_json?: string }).ti_le_kho_json ?? ''}`)
    .join(';')
  const updateTiLeTheoKhoCell = useCallback(
    (dvdIdx: number, tenKh: string, rawInput: string) => {
      const rows = getValues('don_vi_quy_doi') ?? []
      const curRow = rows[dvdIdx]
      if (!curRow) return
      const map = { ...parseTiLeKhoJson((curRow as { ti_le_kho_json?: string }).ti_le_kho_json) }
      const displayed = formatSoTien(rawInput)
      const stored = displayed ? toStoredNumberString(displayed) : ''
      map[tenKh] = stored
      setValue(`don_vi_quy_doi.${dvdIdx}.ti_le_kho_json`, JSON.stringify(map), { shouldDirty: true, shouldTouch: true })
      userEnteredTiLeByIndex.current.add(dvdIdx)
      const order = parseMultiStoredList(getValues('kho_giay') ?? '')
      const firstPool = dvdqMatrixKhoTens.length > 0 ? dvdqMatrixKhoTens : order
      const first = firstPool.map((t) => map[t]).find((v) => v && parseFloatVN(v) > 0)
      setValue(`don_vi_quy_doi.${dvdIdx}.ti_le_quy_doi`, first ?? '', { shouldValidate: false })
    },
    [getValues, setValue, dvdqMatrixKhoTens],
  )
  /** Thêm dòng bậc giá: luôn cho phép thêm (giống đơn vị quy đổi), giá trị mặc định giống hiện tại. */
  const handleThemDongBangGia = () => {
    const lastRow = bangChietKhauValues[bangChietKhauValues.length - 1]
    const nextSoLuongTuRaw = (lastRow?.so_luong_den ?? '').trim() || (lastRow?.so_luong_tu ?? '').trim() || '0'
    appendChietKhau({
      so_luong_tu: bangChietKhauValues.length === 0 ? '0' : formatSoNguyenInput(nextSoLuongTuRaw),
      so_luong_den: '',
      ty_le_chiet_khau: '',
      mo_ta: '',
    })
  }

  useEffect(() => {
    if (activeSubTab === 2 && (bangChietKhauValues?.length ?? 0) > 0) {
      const t = setTimeout(() => { void trigger('bang_chiet_khau') }, 0)
      return () => clearTimeout(t)
    }
  }, [activeSubTab, trigger, bangChietKhauValues?.length])

  useEffect(() => {
    const t = setTimeout(() => inputTenRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [])

  const watchedTenVthh = watch('ten_vthh')
  const watchedTenFile = watch('ten_file_hinh_anh')
  const watchedHinhAnh = watch('duong_dan_hinh_anh')
  const watchedKichMdImg = watch('kich_thuoc_md')
  const watchedKichMrImg = watch('kich_thuoc_mr')
  useEffect(() => {
    if (!watchedHinhAnh || !watchedTenFile) return
    const ext = watchedTenFile.includes('.') ? watchedTenFile.slice(watchedTenFile.lastIndexOf('.') + 1) : 'jpg'
    const newTenFile = tenVthhImageBaseNameFromParts(watchedTenVthh ?? '', watchedKichMdImg ?? '', watchedKichMrImg ?? '') + '.' + ext
    if (newTenFile !== watchedTenFile) setValue('ten_file_hinh_anh', newTenFile)
  }, [watchedTenVthh, watchedKichMdImg, watchedKichMrImg, watchedHinhAnh, watchedTenFile, setValue])

  /* Diễn giải khi mua / bán: chỉ từ Tên (title case), không gộp kích thước. */
  useEffect(() => {
    const tenBase = (watchedTenVthh ?? '').trim()
    const tenDayDu = titleCaseVthhTen(tenBase)
    setValue('dien_giai_khi_mua', tenDayDu, { shouldValidate: false })
    setValue('dien_giai_khi_ban', tenDayDu, { shouldValidate: false })
  }, [watchedTenVthh, setValue])

  /* Tự động sinh mô tả quy đổi khi ĐVT chính, ĐVQĐ, tỉ lệ, phép tính thay đổi. */
  useEffect(() => {
    if (specialOnlyKhoSelection) return
    const rows = donViQuyDoiValues
    const t = setTimeout(() => {
      const dvtChinh = (rows[0]?.dvt_chinh ?? '').trim()
      rows.forEach((row, idx) => {
        const moTa = generateMoTaQuyDoi({
          dvtChinh,
          dvtQuyDoi: (row.dvt_quy_doi ?? '').trim(),
          tiLe: (row.ti_le_quy_doi ?? '').trim(),
          phepTinh: row.phep_tinh === 'chia' ? 'chia' : (row.phep_tinh === 'nhan' ? 'nhan' : ''),
          dvtList,
        })
        const currentMoTa = (row.mo_ta ?? '').trim()
        if (currentMoTa !== moTa) {
          setValue(`don_vi_quy_doi.${idx}.mo_ta`, moTa, { shouldValidate: false })
        }
      })
    }, 0)
    return () => clearTimeout(t)
  }, [specialOnlyKhoSelection, donViQuyDoiInputSignature, donViQuyDoiValues, dvtList, setValue])

  /* TL dòng đầu: có matrix khổ (tab ĐVQĐ) → chỉ nhân với mD; không matrix → rộng × (mR nếu có, không thì mD). */
  const kichThuocMd = watch('kich_thuoc_md')
  const kichThuocMr = watch('kich_thuoc_mr')
  const khoGiayDaChon = watch('kho_giay') ?? ''
  useEffect(() => {
    if (specialOnlyKhoSelection) return
    const mdNum = parseDecimalFlex((kichThuocMd ?? '').trim())
    const mrNum = parseDecimalFlex((kichThuocMr ?? '').trim())
    const dim = dvdqMatrixKhoTens.length > 0 ? mdNum : mrNum > 0 ? mrNum : mdNum
    const khoGiayTokens = parseMultiStoredList(String(khoGiayDaChon))
    if (donViQuyDoiValues.length === 0) return
    if (!(dim > 0)) return

    const applyProduct = (baseM: number) => {
      if (!(baseM > 0)) return
      const product = baseM * dim
      setValue('don_vi_quy_doi.0.ti_le_quy_doi', numberToStoredFormat(product), { shouldValidate: false })
      userEnteredTiLeByIndex.current.add(0)
    }

    if (khoGiayTokens.length === 0) {
      if (mdNum > 0) applyProduct(mdNum)
      return
    }
    if (khoGiayTokens.length === 1) {
      const w = khoGiayChieuRongByTen[khoGiayTokens[0]] ?? 0
      const base = w > 0 ? w : mdNum
      applyProduct(base)
      return
    }
    const products = khoGiayTokens
      .map((t) => {
        const w = khoGiayChieuRongByTen[t] ?? 0
        return w > 0 ? w * dim : NaN
      })
      .filter((x) => Number.isFinite(x) && x > 0)
    if (products.length === 0) {
      if (mdNum > 0) applyProduct(mdNum)
      return
    }
    const first = products[0]
    const allSame = products.every((p) => Math.abs(p - first) < 1e-9)
    if (allSame) {
      setValue('don_vi_quy_doi.0.ti_le_quy_doi', numberToStoredFormat(first), { shouldValidate: false })
      userEnteredTiLeByIndex.current.add(0)
    }
  }, [
    kichThuocMd,
    kichThuocMr,
    khoGiayDaChon,
    khoGiayChieuRongByTen,
    donViQuyDoiValues.length,
    dvdqMatrixKhoTens,
    setValue,
    specialOnlyKhoSelection,
  ])

  /* Matrix ĐVQĐ: tỉ lệ = Rộng (m) × Dài (m); Dài chỉ từ ô mD — không nhập mD thì không tự điền. */
  useEffect(() => {
    if (dvdqMatrixKhoTens.length === 0) return
    const mdNum = parseDecimalFlex(String(kichThuocMd ?? '').trim())
    if (!(mdNum > 0)) return
    const rows = getValues('don_vi_quy_doi') ?? []
    rows.forEach((row, idx) => {
      const dvtQ = (row.dvt_quy_doi ?? '').trim()
      const phep = row.phep_tinh
      if (!dvtQ || (phep !== 'nhan' && phep !== 'chia')) return
      let map = parseTiLeKhoJson((row as { ti_le_kho_json?: string }).ti_le_kho_json)
      let changed = false
      for (const ten of dvdqMatrixKhoTens) {
        const rong = khoGiayChieuRongByTen[ten] ?? 0
        if (!(rong > 0)) continue
        const nextVal = numberToStoredFormat(rong * mdNum)
        if ((map[ten] ?? '').trim() !== nextVal) {
          map = { ...map, [ten]: nextVal }
          changed = true
        }
      }
      if (!changed) return
      setValue(`don_vi_quy_doi.${idx}.ti_le_kho_json`, JSON.stringify(map), { shouldValidate: false })
      const firstVal = dvdqMatrixKhoTens.map((t) => map[t]).find((v) => v && parseFloatVN(v) > 0)
      if (firstVal) setValue(`don_vi_quy_doi.${idx}.ti_le_quy_doi`, firstVal, { shouldValidate: false })
      userEnteredTiLeByIndex.current.add(idx)
    })
  }, [dvdqMatrixKhoTens, kichThuocMd, khoGiayChieuRongByTen, getValues, setValue, donViQuyDoiFields.length, donViQuyDoiInputSignature])

  /**
   * Tab 3 (Đơn vị quy đổi): không chặn lưu khi có dòng chưa nhập đủ. Chỉ gửi và lưu các dòng đã nhập đủ (ĐV quy đổi + Tỉ lệ); dòng thiếu ô không đưa vào payload.
   */
  const validateTabsBeforeSave = (
    _data: FormValues,
    _nvlRows: { ma: string; ten: string; dvt: string; so_luong: string; hao_hut: string }[],
    _tinhChat: string
  ): { ok: boolean; tab?: 1 | 2 | 3 | 4 | 5; message: string } => {
    return { ok: true, message: '' }
  }

  const buildPayload = (data: FormValues): Omit<VatTuHangHoaRecord, 'id'> => {
    /* Lấy ĐG bán gốc từ data (tab 1 hoặc bậc giá) — dùng khi lưu giá hiển thị. */
    const getBaseDgBanFromData = (tiLeNum: number): number => {
      const bangGia = data.bang_chiet_khau ?? []
      const hasBangGiaRows = bangGia.some((r) => {
        const tu = (r.so_luong_tu ?? '').trim()
        const den = (r.so_luong_den ?? '').trim()
        const gia = (r.ty_le_chiet_khau ?? '').trim()
        return tu !== '' || den !== '' || gia !== ''
      })
      const donGiaBanTab1 = String(data.don_gia_ban ?? '')
      if (!hasBangGiaRows) return parseFloatVN(donGiaBanTab1) || 0
      const matchingRow = bangGia.find((r) => {
        const tu = parseFloatVN(r.so_luong_tu ?? '')
        const denStr = (r.so_luong_den ?? '').trim()
        const den = parseFloatVN(r.so_luong_den ?? '')
        if (denStr === '') return tiLeNum >= tu
        return tiLeNum >= tu && tiLeNum <= den
      })
      if (!matchingRow) return parseFloatVN(donGiaBanTab1) || 0
      const rowIdx = bangGia.indexOf(matchingRow)
      const useDgBanTab1 = rowIdx === 0 || parseFloatVN(matchingRow.so_luong_tu ?? '') === 0
      const baseNum = useDgBanTab1 ? parseFloatVN(donGiaBanTab1) : parseFloatVN(matchingRow.ty_le_chiet_khau ?? '')
      return baseNum || parseFloatVN(donGiaBanTab1) || 0
    }

    /* ĐV quy đổi: chỉ gửi dòng đã chọn đơn vị + đủ Tỉ lệ + đã chọn Phép tính. Lưu giá trị hiển thị (nhập tay hoặc tính từ tỉ lệ) để truy xuất nhanh. */
    const specialPayload = computeHasSpecialKhoForTiLePayload(data)
    const khoOrderPayload = parseMultiStoredList(data.kho_giay ?? '')
    const daiByTenPayload = readKhoGiayDaiByTenFromCatalog()
    const specialKhoOrderPayload = khoOrderPayload.filter((t) => !(daiByTenPayload[t] > 0))
    const normalKhoOrderPayload = khoOrderPayload.filter((t) => daiByTenPayload[t] > 0)
    const matrixKhoOrderPayload = specialPayload ? (normalKhoOrderPayload.length > 0 ? normalKhoOrderPayload : specialKhoOrderPayload) : []
    const dvd = data.don_vi_quy_doi
      .map((r, idx) => ({ r, idx }))
      .filter(({ r, idx }) => {
        if (!(r.dvt_quy_doi ?? '').trim()) return false
        if (!(r.phep_tinh === 'nhan' || r.phep_tinh === 'chia')) return false
        if (specialPayload) {
          const khoMap = parseTiLeKhoJson((r as { ti_le_kho_json?: string }).ti_le_kho_json)
          return Object.values(khoMap).some((v) => parseFloatVN(v) > 0)
        }
        return (r.ti_le_quy_doi ?? '').trim() !== '' && userEnteredTiLeByIndex.current.has(idx)
      })
      .map(({ r }) => {
        const khoMap = parseTiLeKhoJson((r as { ti_le_kho_json?: string }).ti_le_kho_json)
        const firstTiLeStr =
          specialPayload && matrixKhoOrderPayload.length > 0
            ? matrixKhoOrderPayload.map((t) => khoMap[t]).find((v) => v && parseFloatVN(v) > 0) ?? (r.ti_le_quy_doi ?? '').trim()
            : (r.ti_le_quy_doi ?? '').trim()
        const tiLe = parseFloatVN(firstTiLeStr || '1')
        const phepTinh = r.phep_tinh as 'nhan' | 'chia'
        const baseDgMua = parseFloatVN(String(data.don_gia_mua_gan_nhat ?? '')) > 0 ? parseFloatVN(String(data.don_gia_mua_gan_nhat ?? '')) : parseFloatVN(String(data.don_gia_mua_co_dinh ?? ''))
        let calculatedDgMua = baseDgMua
        if (phepTinh === 'nhan' && tiLe > 0) calculatedDgMua = baseDgMua * tiLe
        else if (phepTinh === 'chia' && tiLe > 0) calculatedDgMua = baseDgMua / tiLe
        const hasGiaMuaInput = (r.gia_mua_gan_nhat ?? '').toString().trim() !== ''
        const giaMuaToSave = hasGiaMuaInput ? (r.gia_mua_gan_nhat ?? '') : (calculatedDgMua > 0 ? String(calculatedDgMua) : '')
        const baseDgBan = getBaseDgBanFromData(tiLe)
        let calculatedDgBan = baseDgBan
        if (phepTinh === 'nhan' && tiLe > 0) calculatedDgBan = baseDgBan * tiLe
        else if (phepTinh === 'chia' && tiLe > 0) calculatedDgBan = baseDgBan / tiLe
        const hasGiaBanInput = (r.gia_ban ?? '').trim() !== ''
        const giaBanToSave = hasGiaBanInput ? (r.gia_ban ?? '') : (calculatedDgBan > 0 ? String(calculatedDgBan) : '')
        const tiLeTheoKho: Record<string, string> = {}
        if (specialPayload) {
          for (const [k, v] of Object.entries(khoMap)) {
            if (normalKhoOrderPayload.length > 0 && !(daiByTenPayload[k] > 0)) continue
            if (normalKhoOrderPayload.length === 0 && daiByTenPayload[k] > 0) continue
            const s = (v ?? '').trim()
            if (s && parseFloatVN(s) > 0) tiLeTheoKho[k] = String(parseNumber(s))
          }
        }
        return {
          dvt: r.dvt_quy_doi ?? '',
          ti_le_quy_doi: firstTiLeStr ? String(parseNumber(firstTiLeStr)) : '',
          phep_tinh: phepTinh,
          mo_ta: specialPayload ? undefined : r.mo_ta?.trim() || undefined,
          ...(Object.keys(tiLeTheoKho).length > 0 ? { ti_le_theo_kho_giay: tiLeTheoKho } : {}),
          gia_mua: giaMuaToSave ? formatSoTien(giaMuaToSave) : '',
          gia_ban: giaBanToSave ? formatSoTien(giaBanToSave) : '',
          gia_ban_1: r.gia_ban_1?.trim() ? formatSoTien(r.gia_ban_1) : undefined,
          gia_ban_2: r.gia_ban_2?.trim() ? formatSoTien(r.gia_ban_2) : undefined,
          gia_ban_3: r.gia_ban_3?.trim() ? formatSoTien(r.gia_ban_3) : undefined,
        }
      })
    return {
      ma: data.ma_vthh.trim(),
      ten: titleCaseVthhTen(data.ten_vthh.trim()),
      tinh_chat: data.tinh_chat,
      nhom_vthh: data.nhom_vthh.trim(),
      dvt_chinh: data.don_vi_quy_doi[0]?.dvt_chinh || data.dvt_chinh || (dvtList[0]?.ma_dvt ?? 'Cái'),
      so_luong_ton: initialData?.so_luong_ton ?? 0,
      gia_tri_ton: initialData?.gia_tri_ton ?? 0,
      mo_ta: data.mo_ta.trim() || undefined,
      thoi_han_bh: data.thoi_han_bh.trim() || undefined,
      so_luong_ton_toi_thieu: data.so_luong_ton_toi_thieu ? parseFloatVN(data.so_luong_ton_toi_thieu) || 0 : 0,
      nguon_goc: data.nguon_goc.trim() || undefined,
      dien_giai_khi_mua: data.dien_giai_khi_mua.trim() || undefined,
      dien_giai_khi_ban: data.dien_giai_khi_ban.trim() || undefined,
      kho_ngam_dinh: data.kho_ngam_dinh.trim() || undefined,
      tai_khoan_kho: data.tai_khoan_kho.trim() || undefined,
      tk_doanh_thu: data.tai_khoan_doanh_thu.trim() || undefined,
      tk_chiet_khau: data.tk_chiet_khau.trim() || undefined,
      tk_giam_gia: data.tk_giam_gia.trim() || undefined,
      tk_tra_lai: data.tk_tra_lai.trim() || undefined,
      tk_chi_phi: data.tai_khoan_chi_phi.trim() || undefined,
      ty_le_ckmh: data.ty_le_ckmh.trim() || undefined,
      loai_hh_dac_trung: data.loai_hh_dac_trung.trim() || undefined,
      don_gia_mua_co_dinh: data.don_gia_mua_co_dinh ? parseFloatVN(data.don_gia_mua_co_dinh) : undefined,
      gia_mua_gan_nhat: data.don_gia_mua_gan_nhat ? parseFloatVN(data.don_gia_mua_gan_nhat) : undefined,
      don_gia_ban: data.don_gia_ban ? parseFloatVN(data.don_gia_ban) : undefined,
      ...(() => {
        const dau = data.thue_suat_gtgt_dau_ra
        if (dau === 'Tự nhập') {
          const n = data.thue_suat_gtgt_tu_nhap?.trim() || undefined
          return { thue_suat_gtgt: n, thue_suat_gtgt_dau_ra: 'Tự nhập' as const }
        }
        const raw = (dau ?? '').trim()
        if (raw === 'Chưa xác định') {
          return { thue_suat_gtgt: 'Chưa xác định', thue_suat_gtgt_dau_ra: 'Chưa xác định' }
        }
        if (!raw) {
          return { thue_suat_gtgt: undefined, thue_suat_gtgt_dau_ra: undefined }
        }
        const norm = thueGtgtStdToken(raw)
        if (THUE_GTGT_STD_SET.has(norm)) {
          return { thue_suat_gtgt: norm, thue_suat_gtgt_dau_ra: norm }
        }
        return { thue_suat_gtgt: raw, thue_suat_gtgt_dau_ra: raw }
      })(),
      co_giam_thue: data.co_giam_thue.trim() || undefined,
      thue_suat_nk: data.thue_suat_nk.trim() || undefined,
      thue_suat_xk: data.thue_suat_xk.trim() || undefined,
      nhom_hhdv_ttdb: data.nhom_hhdv_ttdb.trim() || undefined,
      mau_sac: data.mau_sac.trim() || undefined,
      kich_thuoc: data.kich_thuoc.trim() || undefined,
      kich_thuoc_md: data.kich_thuoc_md?.trim() || undefined,
      kich_thuoc_mr: data.kich_thuoc_mr?.trim() || undefined,
      so_khung: data.so_khung.trim() || undefined,
      so_may: data.so_may.trim() || undefined,
      thoi_gian_bao_hanh: data.thoi_gian_bao_hanh.trim() || undefined,
      xuat_xu: data.xuat_xu.trim() || undefined,
      don_vi_quy_doi: dvd.length > 0 ? dvd : undefined,
      dien_giai: data.dien_giai.trim() || undefined,
      la_bo_phan_lap_rap: data.la_bo_phan_lap_rap,
      la_vthh_ban: data.la_vthh_ban,
      la_hang_khuyen_mai: data.la_mat_hang_khuyen_mai,
      chiet_khau: data.chiet_khau,
      loai_chiet_khau: data.loai_chiet_khau.trim() || undefined,
      bang_chiet_khau: (() => {
        const arr = data.bang_chiet_khau
          .filter((r) => r.so_luong_tu || r.so_luong_den || r.ty_le_chiet_khau)
          .map((r, i, filtered) => {
            const useDgBan = i === 0 || parseFloatVN(r.so_luong_tu ?? '') === 0
            const tyLe = (r.ty_le_chiet_khau ?? '').trim() || (useDgBan ? (data.don_gia_ban ?? '').trim() : '')
            const mo_ta = getMoTaBangGia(filtered, i)
            return { ...r, ty_le_chiet_khau: tyLe, mo_ta: mo_ta || `Từ ${(r.so_luong_tu ?? '').trim() || '—'} đến ${(r.so_luong_den ?? '').trim() || '—'}, đơn giá ${tyLe || '—'}` }
          })
        return arr.length > 0 ? arr : undefined
      })(),
      ma_quy_cach: (() => {
        if (!data.nhieu_phien_ban) {
          return data.ma_quy_cach_bien_the.trim() || (data.tinh_chat === 'Vật tư' && !data.vt_chinh ? data.ma_vthh.trim() : undefined)
        }
        const first = variantCombos[0]
        if (first) return vthhBuildMaPhu1(data.ma_vthh.trim(), 1)
        return data.ma_quy_cach_bien_the.trim() || (data.tinh_chat === 'Vật tư' && !data.vt_chinh ? data.ma_vthh.trim() : undefined)
      })(),
      he_mau: data.nhieu_phien_ban ? (data.he_mau?.trim() || undefined) : undefined,
      do_day: data.nhieu_phien_ban ? (data.do_day?.trim() || undefined) : undefined,
      pricing_matrix: (() => {
        if (!data.nhieu_phien_ban) return undefined
        const maChinh = data.ma_vthh.trim().replace(/\s+/g, '') || 'VTHH'
        const dlsParsed = selectedPhu1Axis.filter((x) => x.trim() !== '')
        const dlsAxis = dlsParsed.length > 0 ? dlsParsed : ['']
        const kgsAxis = matrixKhoGiayAxisPayload.length > 0 ? matrixKhoGiayAxisPayload : ['']
        const rows: Array<{
          ma_quy_cach: string
          dinh_luong?: string
          he_mau?: string
          kho_giay?: string
          do_day?: string
          dvt?: string
          gia_mua_gan_nhat?: number
          gia_mua?: number
          gia_ban_tt?: number
          gia_ban?: number
          gia_ban_1?: number
          gia_ban_2?: number
          gia_ban_3?: number
        }> = []
        dlsAxis.forEach((dl, dlIdx) => {
          const maPhu1 = vthhBuildMaPhu1(maChinh, dlIdx + 1)
          /** Giá nhập trên matrix chỉ có ở cột khổ thường (hoặc cột `''` khi chỉ khổ đặc biệt). */
          const refKey = variantComboKey(dl, matrixKhoGiayAxisBangGia[0] ?? kgsAxis[0] ?? '')
          const refCell = variantMatrix[refKey]
          kgsAxis.forEach((kg, kIdx) => {
            const key = variantComboKey(dl, kg)
            const cell = variantMatrix[key]
            const srcCell = kgsAxis.length > 1 ? (refCell ?? cell) : (cell ?? refCell)
            const giaBanByBac = srcCell?.gia_ban_by_bac ?? []
            const giaBanTtStr = (srcCell?.gia_ban_tt ?? '').trim()
            const giaBanTt = giaBanTtStr ? parseFloatVN(giaBanTtStr) : undefined
            const giaBan0 = giaBanByBac[0]?.trim() ? parseFloatVN(giaBanByBac[0]) : undefined
            const giaBan1 = giaBanByBac[1]?.trim() ? parseFloatVN(giaBanByBac[1]) : undefined
            const giaBan2 = giaBanByBac[2]?.trim() ? parseFloatVN(giaBanByBac[2]) : undefined
            const giaBan3 = giaBanByBac[3]?.trim() ? parseFloatVN(giaBanByBac[3]) : undefined
            const decodedPhu1 = decodePhu1Token(dl)
            const gmnCell = (srcCell?.gia_mua_gan_nhat ?? '').trim()
            const gmnForm = String(data.don_gia_mua_gan_nhat ?? '').trim()
            rows.push({
              ma_quy_cach: vthhBuildMaPhu2(maPhu1, kIdx),
              dinh_luong: decodedPhu1.dinhLuong || undefined,
              he_mau: decodedPhu1.heMau || undefined,
              kho_giay: kg || undefined,
              do_day: decodedPhu1.dinhLuong || undefined,
              dvt: (data.don_vi_quy_doi[0]?.dvt_chinh || data.dvt_chinh || '').trim() || undefined,
              gia_mua_gan_nhat: gmnCell ? parseFloatVN(gmnCell) : gmnForm ? parseFloatVN(gmnForm) : undefined,
              gia_mua: srcCell?.gia_mua?.trim() ? parseFloatVN(srcCell.gia_mua) : undefined,
              gia_ban_tt: giaBanTt,
              gia_ban: giaBan0,
              gia_ban_1: giaBan1,
              gia_ban_2: giaBan2,
              gia_ban_3: giaBan3,
            })
          })
        })
        const filtered = rows.filter((row) => {
          return !!(
            row.dinh_luong ||
            row.kho_giay ||
            row.gia_mua_gan_nhat != null ||
            row.gia_mua != null ||
            row.gia_ban_tt != null ||
            row.gia_ban != null ||
            row.gia_ban_1 != null ||
            row.gia_ban_2 != null ||
            row.gia_ban_3 != null
          )
        })
        return filtered.length > 0 ? filtered : undefined
      })(),
      dac_tinh: data.dac_tinh?.trim() || undefined,
      duong_dan_hinh_anh: data.duong_dan_hinh_anh?.trim() || undefined,
      cong_thuc_tinh_so_luong: data.cong_thuc_tinh_so_luong?.trim() || undefined,
      ma_vthh_cap_cha: (data.tinh_chat === 'Vật tư' && data.hang_hoa_cap_cha?.trim()) ? data.hang_hoa_cap_cha.trim() : undefined,
      vt_chinh: data.tinh_chat === 'Vật tư' ? data.vt_chinh : undefined,
      dinh_muc_nvl: (() => {
        const filtered = (dinhMucNvlRows ?? []).filter((r) => {
          const ma = (r?.ma ?? '').trim()
          const soLuong = (r?.so_luong ?? '').trim()
          const haoHut = (r?.hao_hut ?? '').trim()
          return ma && ma !== 'Mã NVL' && soLuong !== '' && haoHut !== ''
        })
        return filtered.length > 0 ? filtered.map((r) => ({
          ma: r.ma.trim(),
          ten: r.ten.trim(),
          dvt: r.dvt.trim(),
          so_luong: (r.so_luong ?? '').trim(),
          hao_hut: (r.hao_hut ?? '').trim(),
        })) : undefined
      })(),
    }
  }

  const submitWithAction = useCallback(
    async (data: FormValues, action: 'save' | 'save-add', bypassMatrixConfirm = false) => {
      setSubmitError('')
      const tabCheck = validateTabsBeforeSave(data, dinhMucNvlRows, data.tinh_chat ?? 'Vật tư')
      if (!tabCheck.ok) {
        setSubmitError(tabCheck.message)
        if (tabCheck.tab != null) setActiveSubTab(tabCheck.tab)
        return
      }
      if (nhieuPhienBan && matrixMissingCount > 0 && !bypassMatrixConfirm) {
        setShowMatrixMissingHint(true)
        setActiveSubTab(2)
        setPendingMatrixSubmitAction(action)
        setShowMatrixMissingConfirm(true)
        setSubmitError(`Matrix quy cách còn thiếu ${matrixMissingCount} ô giá.`)
        return
      }
      try {
        if (action === 'save') {
          await onSubmit(buildPayload(data))
          onClose()
          return
        }
        await onSubmitAndAdd(buildPayload(data))
        const emptyValues = getEmptyFormValues(dvtList)
        reset(emptyValues, { keepDefaultValues: false })
        setValue('ma_vthh', onMaTuDong(getValues('tinh_chat') ?? 'Vật tư'))
        userEnteredTiLeByIndex.current = new Set()
        setDinhMucNvlRows([])
        setActiveSubTab(1)
        setSubmitError('')
        setFormulaText('')
        setFormulaCachTinh('Khác')
        setFormulaAlert(null)
        setImageUploadError('')
        setShowMatrixMissingHint(false)
        setPendingMatrixSubmitAction(null)
        setTimeout(() => inputTenRef.current?.focus(), 0)
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : 'Có lỗi xảy ra')
      }
    },
    [dinhMucNvlRows, nhieuPhienBan, matrixMissingCount, onSubmit, buildPayload, onClose, onSubmitAndAdd, dvtList, reset, setValue, onMaTuDong, getValues],
  )

  const onSave = handleSubmit(
    async (data) => {
      await submitWithAction(data, 'save')
    },
    () => {
      setSubmitError('Vui lòng kiểm tra các trường bắt buộc và định dạng số.')
    },
  )

  const onSaveAndAdd = handleSubmit(
    async (data) => {
      await submitWithAction(data, 'save-add')
    },
    () => {
      setSubmitError('Vui lòng kiểm tra các trường bắt buộc và định dạng số.')
    },
  )

  const onConfirmSaveWhenMatrixMissing = handleSubmit(async (data) => {
    const action = pendingMatrixSubmitAction
    if (!action) return
    setShowMatrixMissingConfirm(false)
    setPendingMatrixSubmitAction(null)
    await submitWithAction(data, action, true)
  })

  const maReg = register('ma_vthh', { required: 'Mã là bắt buộc' })

  /** Validation: số nguyên / thập phân >= 0 */
  const validateSoKhongAm = (v: string) => parseFloatVN(v) >= 0 || 'Phải lớn hơn hoặc bằng 0'

  /** Bảng bậc giá: so sánh Số lượng từ / Số lượng đến như thiết lập ban đầu — luôn kiểm tra "đến ≥ từ" và "từ ≥ đến dòng trước" khi có giá trị. */
  const validateSoLuongTu = (idx: number, lastDataRowIndex: number) => (v: string) => {
    const arr = getValues('bang_chiet_khau') ?? []
    const row = arr[idx]
    const den = (row?.so_luong_den ?? '').trim()
    const gia = (row?.ty_le_chiet_khau ?? '').trim()
    const tuVal = (v ?? '').trim()
    const hasRowData = !!(tuVal && tuVal !== '0') || !!(den) || !!(gia !== '' && gia !== '0')
    const isLastDataRow = lastDataRowIndex >= 0 && idx === lastDataRowIndex
    if (!hasRowData) return true
    if (isLastDataRow && !tuVal) return true
    if (!isLastDataRow && !tuVal) return 'Bắt buộc nhập'
    const n = parseFloatVN(v)
    if (n < 0) return 'Phải lớn hơn hoặc bằng 0'
    if (idx > 0 && arr[idx - 1]) {
      const denTruoc = (arr[idx - 1].so_luong_den ?? '').trim()
      if (denTruoc) {
        const d = parseFloatVN(denTruoc)
        if (!Number.isNaN(d) && n < d) return 'Số lượng từ phải ≥ số lượng đến dòng trước'
      }
    }
    if (den) {
      const d = parseFloatVN(den)
      if (!Number.isNaN(d) && n > d) return 'Số lượng từ không được lớn hơn số lượng đến trong cùng dòng'
    }
    return true
  }
  const validateSoLuongDen = (idx: number, lastDataRowIndex: number) => (v: string) => {
    const arr = getValues('bang_chiet_khau') ?? []
    const row = arr[idx]
    const tu = (row?.so_luong_tu ?? '').trim()
    const gia = (row?.ty_le_chiet_khau ?? '').trim()
    const denVal = (v ?? '').trim()
    const hasRowData = !!(tu && tu !== '0') || !!(denVal) || !!(gia !== '' && gia !== '0')
    const isLastDataRow = lastDataRowIndex >= 0 && idx === lastDataRowIndex
    if (!hasRowData) return true
    if (isLastDataRow && !denVal) return true
    if (!isLastDataRow && !denVal) return 'Bắt buộc nhập'
    const n = parseFloatVN(v)
    if (n < 0) return 'Phải lớn hơn hoặc bằng 0'
    if (tu) {
      const t = parseFloatVN(tu)
      if (!Number.isNaN(t) && n < t) return 'Số lượng đến phải ≥ số lượng từ'
    }
    return true
  }
  const validateDonGiaBangGia = (idx: number, lastDataRowIndex: number) => (v: string) => {
    const arr = getValues('bang_chiet_khau') ?? []
    const row = arr[idx]
    const tu = (row?.so_luong_tu ?? '').trim()
    const den = (row?.so_luong_den ?? '').trim()
    const giaVal = (v ?? '').trim()
    const hasRowData = !!(tu && tu !== '0') || !!(den) || !!(giaVal !== '' && giaVal !== '0')
    const isLastDataRow = lastDataRowIndex >= 0 && idx === lastDataRowIndex
    if (!hasRowData) return true
    if (isLastDataRow && !giaVal) return true
    return parseFloatVN(v) >= 0 || 'Phải lớn hơn hoặc bằng 0'
  }

  /** Mô tả bậc giá bằng từ ngữ theo logic khoảng: dòng 1 đoạn [a,b], dòng 2+ nửa khoảng (b,c] hoặc (b,+∞). */
  const getMoTaBangGia = (values: { so_luong_tu?: string; so_luong_den?: string }[], idx: number) => {
    const tu = (values[idx]?.so_luong_tu ?? '').trim()
    const den = (values[idx]?.so_luong_den ?? '').trim()
    const isLast = idx === values.length - 1
    if (idx === 0) {
      if (!tu) return ''
      if (!den && isLast) return `Từ ${tu} trở lên (bao gồm ${tu})`
      return den ? `Từ ${tu} đến ${den} (bao gồm cả ${tu} và ${den})` : ''
    }
    const prevDen = (values[idx - 1]?.so_luong_den ?? '').trim()
    if (!prevDen) return tu || den ? `Lớn hơn ${prevDen || '—'} đến ${den || 'không giới hạn'}` : ''
    if (!den && isLast) return `Lớn hơn ${prevDen} trở lên`
    return den ? `Lớn hơn ${prevDen} đến ${den} (bao gồm ${den})` : ''
  }

  /** Ô kích thước mR/mD: cho phép số thập phân (VD: 0,91), phải > 0 khi có nhập */
  const validateKichThuoc = (v: string) => {
    if (!(v ?? '').trim()) return true
    const n = parseFloatVN(v)
    if (Number.isNaN(n)) return 'Không đúng định dạng số'
    return n > 0 || 'Phải lớn hơn 0'
  }

  return (
    <>
      <form
        onSubmit={onSave}
        className="misa-form htql-form"
        style={{
          border: '1px solid var(--border)',
          borderRadius: 2,
          overflow: 'hidden',
          background: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          zIndex: 100,
          position: 'relative',
        }}
      >
        <div
          role="presentation"
          onMouseDown={onHeaderPointerDown}
          style={{
            padding: '6px 12px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-tab)',
            fontSize: 11,
            fontFamily: "'Tahoma', Arial, sans-serif",
            fontWeight: 'bold',
            color: 'var(--text-primary)',
            cursor: onHeaderPointerDown ? (dragging ? 'grabbing' : 'grab') : undefined,
          }}
        >
          <span>
            {mode === 'add' ? 'Thêm Vật tư, hàng hóa, dịch vụ' : `Chỉnh sửa ${(initialData?.ten ?? watch('ten_vthh') ?? '').trim() || 'Vật tư, hàng hóa, dịch vụ'}`}
          </span>
          <button type="button" onClick={onClose} onMouseDown={(e) => e.stopPropagation()} style={{ padding: 2, background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 12, flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }} className="misa-form-body">
          <fieldset className="htql-fieldset">
            <legend className="htql-legend">Thông tin chung</legend>
            <div className="htql-fieldset-inner">
              <div className="misa-form-grid htql-fieldset-top">
              {/* Row 1: Mã (*) | Tên (*) */}
              <LabelCell label="Mã" required />
              <div className="misa-grid-item" style={{ maxWidth: 'calc(100% - 77px)' }}>
                <input
                  {...maReg}
                  ref={(el) => {
                    maReg.ref(el)
                    ;(inputMaRef as React.MutableRefObject<HTMLInputElement | null>).current = el
                  }}
                  className="misa-input-solo"
                  style={{ ...inputStyle, ...(errors.ma_vthh ? { borderColor: REQUIRED_FIELD_ERROR_BORDER, borderWidth: 2 } : {}), cursor: 'not-allowed' }}
                  placeholder="VT00001"
                  disabled
                />
              </div>
              <div style={{ marginLeft: -96 }}>
                <LabelCell label="Tên" required />
              </div>
              <div className="misa-grid-item" style={{ marginLeft: -56, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Controller
                    control={control}
                    name="ten_vthh"
                    rules={{ required: 'Tên là bắt buộc' }}
                    render={({ field, fieldState }) => (
                      <input
                        ref={(el) => {
                          field.ref(el)
                          ;(inputTenRef as React.MutableRefObject<HTMLInputElement | null>).current = el
                        }}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={(e) => {
                          field.onChange(titleCaseVthhTen(e.target.value))
                          field.onBlur()
                        }}
                        name={field.name}
                        className="misa-input-solo"
                        style={{ ...inputStyle, width: '100%', ...(fieldState.error ? { borderColor: REQUIRED_FIELD_ERROR_BORDER, borderWidth: 2 } : {}) }}
                        placeholder="Tên"
                      />
                    )}
                  />
                </div>
                {(watch('tinh_chat') ?? '') === 'Vật tư' && (() => {
                  const vtChinhReg = register('vt_chinh')
                  return (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0, cursor: vtChinhLocked ? 'default' : 'pointer', flexShrink: 0, fontSize: 11 }}>
                      <input
                        type="checkbox"
                        {...(vtChinhLocked ? { checked: true, readOnly: true, disabled: true } : vtChinhReg)}
                        onChange={vtChinhLocked ? undefined : (e) => {
                          vtChinhReg.onChange(e)
                          if (e.target.checked) setValue('hang_hoa_cap_cha', '', { shouldValidate: false })
                        }}
                        style={{ width: 14, height: 14, margin: 0, cursor: vtChinhLocked ? 'default' : 'pointer' }}
                      />
                      <span>VT cấp cha</span>
                    </label>
                  )
                })()}
              </div>
              {/* Row 2: Loại VTHH (*) | Nhóm VTHH | Kích thước (mD, mR) — cùng một dòng */}
              <div className="misa-grid-item" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'minmax(82px, 108px) minmax(0, 1fr) minmax(62px, 76px) minmax(0, 2fr) minmax(34px, 48px) minmax(0, 1.5fr)', columnGap: 4, rowGap: 0, alignItems: 'center', width: '100%' }}>
                <LabelCell label="Loại VTHH" required />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: -8 }}>
                  <div className="misa-input-wrap htql-tinh-chat-no-border" style={{ width: 144, position: 'relative' }}>
                    <select
                      {...register('tinh_chat', { required: 'Loại VTHH là bắt buộc' })}
                      className="misa-input-solo htql-tinh-chat-select"
                      style={{ ...selectStyle, width: '100%', border: 'none', ...(errors.tinh_chat ? { boxShadow: `0 0 0 2px ${REQUIRED_FIELD_ERROR_BORDER}` } : {}) }}
                    >
                      {loaiVthhSelectOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <span className="htql-tinh-chat-chevron" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)' }}>
                      <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                    </span>
                  </div>
                  <button
                    type="button"
                    className="misa-lookup-btn htql-dvt-plus-btn"
                    style={{ width: 24, height: 24, minHeight: 24, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, position: 'relative', zIndex: 1, cursor: 'pointer' }}
                    title="Thêm loại VTHH"
                    onClick={() => {
                      setTenLoaiVthhMoi('')
                      setShowThemLoaiVthhModal(true)
                    }}
                  >
                    +
                  </button>
                </div>
                <div style={{ marginLeft: -20 }}>
                  <LabelCell label="Nhóm VTHH" required />
                </div>
                <div ref={nhomVthhRef} className="misa-grid-item" style={{ display: 'flex', alignItems: 'center', gap: 4, width: 'calc(100% - 5px)', maxWidth: 'calc(100% - 5px)', minWidth: 0, marginLeft: 10 }}>
                  <Controller
                    control={control}
                    name="nhom_vthh"
                    rules={{ validate: (v) => ((v ?? '').toString().trim() ? true : 'Nhóm VTHH là bắt buộc') }}
                    render={({ field, fieldState }) => (
                      <div
                        className="misa-input-wrap htql-kho-ngam-dinh-no-border"
                        style={{ flex: 1, minWidth: 0, position: 'relative', cursor: 'pointer' }}
                        onClick={() => setLookupModal('nhom_vthh')}
                        data-nhom-vthh-dropdown=""
                      >
                        <input
                          readOnly
                          value={nhomVthhStoredToTenHienThi(field.value, nhomVTHHList)}
                          className="misa-input-solo"
                          style={{
                            ...inputStyle,
                            paddingRight: 26,
                            cursor: 'pointer',
                            ...(fieldState.error ? { borderColor: REQUIRED_FIELD_ERROR_BORDER, borderWidth: 2 } : {}),
                          }}
                          placeholder="Chọn nhóm..."
                        />
                        <span style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)' }}>
                          <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                        </span>
                      </div>
                    )}
                  />
                  <button
                    type="button"
                    className="misa-lookup-btn htql-dvt-plus-btn"
                    style={lookupActionButtonStyle}
                    title="Thêm nhóm VTHH"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowThemNhomVTHHModal(true)
                    }}
                  >
                    +
                  </button>
                </div>
                <div style={{ marginLeft: -33 }}>
                  <LabelCell label="Kích thước" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: 0, marginLeft: 20 }}>
                    <Controller
                      control={control}
                      name="kich_thuoc_md"
                      rules={{ validate: validateKichThuoc }}
                      render={({ field, fieldState }) => (
                        <input
                          {...field}
                          value={formatSoTien(field.value ?? '')}
                          onChange={(e) => {
                            const displayed = formatSoTuNhienInput(normalizeKichThuocInput(e.target.value))
                            field.onChange(toStoredNumberString(displayed))
                          }}
                          onFocus={() => { if (isZeroDisplay(String(field.value))) field.onChange('') }}
                          onBlur={field.onBlur}
                          className="misa-input-solo"
                          style={{ ...inputStyle, paddingRight: 36, width: '100%', ...(fieldState.error ? { borderColor: 'var(--accent)' } : {}) }}
                          placeholder="VD: 10"
                        />
                      )}
                    />
                    <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 11, color: '#000', fontWeight: 'bold' }}>mD</span>
                  </div>
                  <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                    <Controller
                      control={control}
                      name="kich_thuoc_mr"
                      rules={{ validate: validateKichThuoc }}
                      render={({ field, fieldState }) => (
                        <input
                          {...field}
                          value={formatSoTien(field.value ?? '')}
                          onChange={(e) => {
                            const displayed = formatSoTuNhienInput(normalizeKichThuocInput(e.target.value))
                            field.onChange(toStoredNumberString(displayed))
                          }}
                          onFocus={() => { if (isZeroDisplay(String(field.value))) field.onChange('') }}
                          onBlur={field.onBlur}
                          className="misa-input-solo"
                          style={{ ...inputStyle, paddingRight: 36, width: '100%', ...(fieldState.error ? { borderColor: 'var(--accent)' } : {}) }}
                          placeholder="VD: 20"
                        />
                      )}
                    />
                    <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 11, color: '#000', fontWeight: 'bold' }}>mR</span>
                  </div>
                </div>
              </div>
              </div>
              {/* Row: Thuộc vật tư - chỉ hiện khi tính chất = Vật tư và chưa tick VT cấp cha */}
              {(watch('tinh_chat') ?? '') === 'Vật tư' && !watch('vt_chinh') && (() => {
                const vtChinhList = (vatTuList ?? []).filter((r) => (mode !== 'edit' || r.id !== initialData?.id) && r.vt_chinh === true)
                return (
                  <div className="misa-form-grid" style={{ gridTemplateColumns: 'minmax(82px, 108px) minmax(0, 1fr)', alignItems: 'center', gap: 4 }}>
                    <LabelCell label="Thuộc vật tư" />
                    <div className="misa-grid-item" style={{ minWidth: 0 }}>
                      {vtChinhList.length === 0 ? (
                        <input
                          type="text"
                          readOnly
                          value=""
                          placeholder="Chưa có vật tư cấp cha"
                          className="misa-input-solo"
                          style={{ ...inputStyle, width: '100%', color: 'var(--text-secondary)', cursor: 'default' }}
                        />
                      ) : (
                        <select
                          {...register('hang_hoa_cap_cha')}
                          className="misa-input-solo"
                          style={{ ...selectStyle, width: '100%' }}
                        >
                          <option value="">Chọn vật tư cấp cha</option>
                          {vtChinhList.map((r) => (
                            <option key={r.id} value={r.ma}>{r.ma} – {r.ten}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                )
              })()}
              {/* Row 3: Mô tả - khối flex:1 để lấp đầy chiều cao form */}
              <div className="htql-mota-section">
                <div className="misa-label misa-grid-item htql-mota-label">Mô tả</div>
                <div className="misa-grid-item htql-full-width htql-mota-wrap" style={{ display: 'flex', minHeight: 0 }}>
                  <textarea {...register('mo_ta')} className="misa-input-solo" style={{ ...inputStyle, width: '100%', maxWidth: 'none', flex: 1, minHeight: 80, minWidth: 0, resize: 'vertical', lineHeight: 1.5 }} placeholder="Mô tả" rows={4} />
                </div>
              </div>
              <div className="misa-form-grid htql-fieldset-bottom">
              {/* Row 4: ĐVT chính (input + "+" + dropdown + "Công thức tính số lượng...") */}
              <LabelCell label="ĐVT chính" />
              <div className="misa-grid-item htql-full-width" style={{ gridColumn: '2 / -1', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                <div className="misa-input-wrap htql-dvt-chinh-no-border" style={{ width: 90 }}>
                  <select {...(donViQuyDoiValues.length > 0 ? register('don_vi_quy_doi.0.dvt_chinh') : register('dvt_chinh'))} className="misa-input-solo htql-dvt-chinh-select" style={{ ...selectStyle, width: '100%', border: 'none' }}>
                    {dvtList.map((d) => {
                      const usedInConversion = donViQuyDoiValues.some((r) => (r.dvt_quy_doi ?? '').trim() === d.ma_dvt)
                      return (
                        <option key={d.id} value={d.ma_dvt} disabled={usedInConversion} className={usedInConversion ? 'htql-dvt-already-used' : ''}>{d.ky_hieu || d.ten_dvt}</option>
                      )
                    })}
                    {dvtList.length === 0 && <option value="Cái">Cái</option>}
                  </select>
                  <span className="htql-dvt-chinh-chevron" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'var(--accent)', color: 'var(--accent-text)' }}>
                    <ChevronDown size={12} style={{ color: 'var(--accent-text)' }} />
                  </span>
                </div>
                <button type="button" className="misa-lookup-btn htql-dvt-plus-btn" style={{ width: 24, height: 24, minHeight: 24, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }} title="Thêm đơn vị tính" onClick={() => setShowThemDvtModal(true)}>+</button>
                {formulaText && (
                  <span style={{ fontSize: 10, color: 'var(--text-primary)', flex: 1, minWidth: 0, whiteSpace: 'normal', wordBreak: 'break-all' }} title={formulaText}>
                    {formulaText}
                  </span>
                )}
                <button type="button" style={{ ...btnFooter, padding: '2px 8px', fontSize: 10, height: 24, minHeight: 24, boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center' }} onClick={() => setFormulaDialogOpen(true)}>Công thức tính số lượng...</button>
              </div>
              {/* Row 5: Thời hạn BH | SL tối thiểu */}
              <LabelCell label="Thời hạn BH" />
              <div className="misa-grid-item" style={{ position: 'relative' }}>
                <input
                  {...register('thoi_han_bh')}
                  className="misa-input-solo"
                  style={{ ...inputStyle, paddingRight: 36 }}
                  placeholder="VD: 12"
                />
                <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 11, color: '#000', fontWeight: 'bold' }}>tháng</span>
              </div>
              <div style={{ marginLeft: -27 }}>
                <LabelCell label="SL tối thiểu" />
              </div>
              <div className="misa-grid-item" style={{ maxWidth: 'calc(100% - 10px)', marginLeft: 13 }}>
                <Controller
                  control={control}
                  name="so_luong_ton_toi_thieu"
                  rules={{ validate: validateSoKhongAm }}
                  render={({ field, fieldState }) => (
                    <input
                      {...field}
                      onChange={(e) => field.onChange(formatSoTien(e.target.value))}
                      onFocus={() => { if (isZeroDisplay(String(field.value))) field.onChange('') }}
                      onBlur={field.onBlur}
                      type="text"
                      className="misa-input-solo"
                      style={{ ...inputStyle, ...(fieldState.error ? { borderColor: 'var(--accent)' } : {}) }}
                      placeholder="0,00"
                    />
                  )}
                />
                {errors.so_luong_ton_toi_thieu && <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 2 }}>{errors.so_luong_ton_toi_thieu.message}</div>}
              </div>
              {/* Row 6: Nguồn gốc (full width) */}
              <LabelCell label="Nguồn gốc" />
              <div className="misa-grid-item htql-full-width" style={{ gridColumn: '2 / -1' }}>
                <input {...register('nguon_goc')} className="misa-input-solo" style={{ ...inputStyle, width: '100%', maxWidth: 'none' }} placeholder="Nguồn gốc" />
              </div>
              {/* Row 7: Diễn giải khi mua (full width) */}
              <LabelCell label="Diễn giải khi mua" />
              <div className="misa-grid-item htql-full-width" style={{ gridColumn: '2 / -1' }}>
                <input {...register('dien_giai_khi_mua')} className="misa-input-solo" style={{ ...inputStyle, width: '100%', maxWidth: 'none' }} placeholder="Diễn giải khi mua" />
              </div>
              {/* Row 8: Diễn giải khi bán (full width) */}
              <LabelCell label="Diễn giải khi bán" />
              <div className="misa-grid-item htql-full-width" style={{ gridColumn: '2 / -1' }}>
                <input {...register('dien_giai_khi_ban')} className="misa-input-solo" style={{ ...inputStyle, width: '100%', maxWidth: 'none' }} placeholder="Diễn giải khi bán" />
              </div>
            </div>
            </div>
          </fieldset>

          {/* Các tab bên dưới Thông tin chung */}
          <div className="htql-sub-tabs" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {subTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={activeSubTab === tab.id ? 'htql-sub-tab htql-sub-tab-active' : 'htql-sub-tab'}
                  onClick={() => {
                    if (tab.id === 2 && !canAccessBangGiaTab) return
                    setActiveSubTab(tab.id)
                  }}
                  disabled={tab.id === 2 && !canAccessBangGiaTab}
                  style={tab.id === 2 && !canAccessBangGiaTab ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14, marginLeft: 'auto', paddingRight: 2 }}>
              {(watch('tinh_chat') ?? '') === 'Vật tư' ? (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" {...register('la_vthh_ban')} style={{ width: 14, height: 14 }} />
                  <span style={{ color: 'var(--text-primary)' }}>Có thể bán</span>
                </label>
              ) : null}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input type="checkbox" {...register('la_mat_hang_khuyen_mai')} style={{ width: 14, height: 14 }} />
                <span style={{ color: 'var(--text-primary)' }}>Là hàng khuyến mãi</span>
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input type="checkbox" {...register('nhieu_phien_ban')} style={{ width: 14, height: 14 }} />
                <span style={{ color: 'var(--text-primary)' }}>Nhiều phiên bản</span>
              </label>
            </div>
          </div>
          <div className="htql-sub-tab-content">
            {activeSubTab === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <VatTuHangHoaFormTabNgamDinh
                  control={control}
                  register={register}
                  watch={watch}
                  onOpenKhoLookup={() => setLookupModal('kho')}
                  onOpenThemKho={() => setShowThemKhoModal(true)}
                  khoNgamDinhRef={khoNgamDinhRef}
                  openVariantDropdown={openVariantDropdown}
                  selectedDinhLuong={selectedDinhLuong}
                  selectedKhoGiay={selectedKhoGiay}
                  selectedHeMau={selectedHeMau}
                  dinhLuongOptions={dinhLuongOptions}
                  khoGiayOptions={khoGiayOptions}
                  heMauOptions={heMauOptions}
                  onToggleVariantDropdown={(kind) => setOpenVariantDropdown((prev) => (prev === kind ? null : kind))}
                  onToggleVariantValue={toggleVariantMultiValue}
                  isVariantOptionDisabled={isVariantOptionDisabled}
                />
                <input type="hidden" {...register('he_mau')} />
                <input type="hidden" {...register('do_day')} />
              </div>
            )}
            {activeSubTab === 2 && canAccessBangGiaTab && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {showBangGiaTierTable && (
                <div style={{ border: '0.5px solid var(--border)', borderRadius: 4, overflowX: 'auto', background: 'var(--bg-tab)' }}>
                  <table className="htql-dvt-quydoi-table" style={{ width: '100%', borderCollapse: 'collapse', borderSpacing: 0, fontSize: 11, tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: 36 }} />
                      <col style={{ width: 72 }} />
                      <col style={{ width: 72 }} />
                      {showBangGiaSaleColumns && <col style={{ width: 72 }} />}
                      <col />
                      <col style={{ width: 36 }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={{ ...thChietKhau, textAlign: 'center' }}>STT</th>
                        <th style={{ ...thChietKhau }}>SL từ</th>
                        <th style={{ ...thChietKhau }}>SL đến</th>
                        {showBangGiaSaleColumns && <th style={{ ...thChietKhau }}>ĐG bán</th>}
                        <th style={{ ...thChietKhau }}>Mô tả</th>
                        <th style={{ ...thChietKhau }} />
                      </tr>
                    </thead>
                    <tbody>
                      {bangChietKhauFields.length === 0 ? (
                        <tr>
                          <td colSpan={showBangGiaSaleColumns ? 6 : 5} style={{ ...tdChietKhau, background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: 10, textAlign: 'center' }}>Chưa có dòng. Bấm &quot;Thêm dòng&quot; để thêm.</td>
                        </tr>
                      ) : (
                        bangChietKhauFields.map((field, idx) => (
                          <tr key={field.id}>
                            <td style={{ ...tdChietKhau, textAlign: 'center' }}>{idx + 1}</td>
                            <td style={tdChietKhau}>
                              <Controller
                                control={control}
                                name={`bang_chiet_khau.${idx}.so_luong_tu`}
                                rules={{ validate: validateSoLuongTu(idx, lastDataIndexBangGia) }}
                                render={({ field: f, fieldState }) => (
                                  <input
                                    {...f}
                                    onChange={(e) => {
                                      f.onChange(formatSoNguyenInput(e.target.value))
                                      setTimeout(() => { void trigger('bang_chiet_khau') }, 0)
                                    }}
                                    onBlur={() => void trigger('bang_chiet_khau')}
                                    className="misa-input-solo"
                                    style={{ ...inputStyle, width: '100%', ...(fieldState.error ? { borderColor: 'var(--accent)' } : {}) }}
                                    placeholder=""
                                  />
                                )}
                              />
                            </td>
                            <td style={tdChietKhau}>
                              <Controller
                                control={control}
                                name={`bang_chiet_khau.${idx}.so_luong_den`}
                                rules={{ validate: validateSoLuongDen(idx, lastDataIndexBangGia) }}
                                render={({ field: f, fieldState }) => (
                                  <input
                                    {...f}
                                    onChange={(e) => {
                                      f.onChange(formatSoNguyenInput(e.target.value))
                                      setTimeout(() => { void trigger('bang_chiet_khau') }, 0)
                                    }}
                                    onBlur={() => void trigger('bang_chiet_khau')}
                                    className="misa-input-solo"
                                    style={{ ...inputStyle, width: '100%', ...(fieldState.error ? { borderColor: 'var(--accent)' } : {}) }}
                                    placeholder=""
                                  />
                                )}
                              />
                            </td>
                            {showBangGiaSaleColumns && (
                            <td style={tdChietKhau}>
                              <Controller
                                control={control}
                                name={`bang_chiet_khau.${idx}.ty_le_chiet_khau`}
                                rules={{ validate: validateDonGiaBangGia(idx, lastDataIndexBangGia) }}
                                render={({ field: f, fieldState }) => {
                                  const soLuongTu = bangChietKhauValues[idx]?.so_luong_tu ?? ''
                                  const useDgBan = idx === 0 || parseFloatVN(soLuongTu) === 0
                                  const donGiaBan = watch('don_gia_ban')
                                  const hasInput = (f.value ?? '').toString().trim() !== ''
                                  const displayVal = hasInput ? (f.value ?? '') : (useDgBan ? donGiaBan : (f.value ?? ''))
                                  return (
                                    <input
                                      {...f}
                                      value={formatSoTienHienThi(displayVal)}
                                      onChange={(e) => {
                                        const v = e.target.value
                                        f.onChange(v ? formatSoTien(v) : '')
                                      }}
                                      onFocus={() => { if (isZeroDisplay(String(f.value))) f.onChange('') }}
                                      onBlur={f.onBlur}
                                      className="misa-input-solo"
                                      style={{
                                        ...inputStyle,
                                        width: '100%',
                                        textAlign: 'right',
                                        ...(fieldState.error ? { borderColor: 'var(--accent)' } : {}),
                                      }}
                                      placeholder="0"
                                      inputMode="text"
                                    />
                                  )
                                }}
                              />
                            </td>
                            )}
                            <td style={{ ...tdChietKhau, color: 'var(--text-muted)', fontSize: 10 }}>
                              <input
                                type="text"
                                readOnly
                                tabIndex={-1}
                                className="misa-input-solo"
                                style={{ ...inputStyle, width: '100%', background: 'var(--bg-secondary)', cursor: 'default' }}
                                value={getMoTaBangGia(bangChietKhauValues, idx) || ''}
                                placeholder="Tự động theo khoảng"
                              />
                            </td>
                            <td style={{ ...tdChietKhau, width: 36, padding: '2px 4px', textAlign: 'center' }}>
                              <button type="button" onClick={() => removeChietKhau(idx)} title="Xóa dòng" style={{ padding: 2, background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <div style={{ padding: '4px 8px', fontSize: 10, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
                    <button type="button" onClick={handleThemDongBangGia} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', fontSize: 10, background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                      <Plus size={12} /> Thêm dòng
                    </button>
                  </div>
                  {(() => {
                    const arr = errors.bang_chiet_khau
                    if (!arr || !Array.isArray(arr)) return null
                    const msgs: string[] = []
                    arr.forEach((row, idx) => {
                      if (!row) return
                      if (row.so_luong_tu?.message) msgs.push(`Dòng ${idx + 1} - Số lượng từ: ${row.so_luong_tu.message}`)
                      if (row.so_luong_den?.message) msgs.push(`Dòng ${idx + 1} - Số lượng đến: ${row.so_luong_den.message}`)
                      if (showBangGiaSaleColumns && row.ty_le_chiet_khau?.message) msgs.push(`Dòng ${idx + 1} - ĐG bán: ${row.ty_le_chiet_khau.message}`)
                    })
                    return msgs.length > 0 ? (
                      <div style={{ padding: '6px 8px', fontSize: 10, color: 'var(--accent)', background: 'rgba(239, 68, 68, 0.08)', borderTop: '1px solid var(--border)' }}>
                        {msgs.join(' · ')}
                      </div>
                    ) : null
                  })()}
                </div>
                )}
                {showVariantMatrix && (
                <div style={{ border: '0.5px solid var(--border)', borderRadius: 4, overflow: 'auto', background: 'var(--bg-tab)' }}>
                  {specialOnlyKhoSelection && selectedKhoGiay.length > 0 && (
                    <div style={{ padding: '6px 8px', fontSize: 10, color: 'var(--text-muted)', borderBottom: '0.5px solid var(--border)', background: 'rgba(245, 158, 11, 0.12)' }}>
                      Có khổ <strong>đặc biệt</strong> (thiếu chiều dài trong danh mục): ở <strong>bậc giá</strong> chỉ hiển thị cột nhập giá theo định lượng; các khổ đặc biệt <strong>không</strong> có cột riêng tại đây. Khi <strong>Lưu</strong>, hệ thống vẫn ghi đủ phiên bản phụ 2 theo từng khổ đã chọn ở tab Ngầm định (giá kế thừa từ cột tham chiếu).
                    </div>
                  )}
                  {matrixKhoGiayAxisBangGia.length > 1 && (
                    <div style={{ padding: '4px 8px', fontSize: 10, color: 'var(--text-muted)', borderBottom: '0.5px solid var(--border)' }}>
                      Giá mua / giá bán nhập ở <strong>cột khổ đầu tiên</strong>; các khổ còn lại <strong>kế thừa</strong> (phiên bản phụ 2 cùng giá phụ 1).
                    </div>
                  )}
                  {bangGiaRowsForMatrix.length > 0 && (
                    <div style={{ padding: '4px 8px', fontSize: 10, color: 'var(--text-muted)', borderBottom: '0.5px solid var(--border)', background: 'rgba(59, 130, 246, 0.06)' }}>
                      <strong>Giá bán B1, B2, …</strong> theo đúng <strong>dòng 1, dòng 2, …</strong> bảng Bậc giá phía trên: mỗi cột Bk là giá cho khoảng SL của <strong>dòng k</strong> đó.
                    </div>
                  )}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr>
                        <th style={{ ...thChietKhau, minWidth: 120 }} rowSpan={2}>Định lượng</th>
                        {matrixKhoGiayAxisBangGia.map((kg, kgIdx) => (
                          <th
                            key={`${kg}-${kgIdx}`}
                            style={{
                              ...thChietKhau,
                              textAlign: 'center',
                              ...(kgIdx > 0 ? { borderLeft: '3px solid #9ca3af' } : {}),
                            }}
                            colSpan={matrixPriceColsPerKhoGiay}
                          >
                            {specialOnlyKhoSelection ? 'Giá (theo định lượng)' : kg || 'Không khổ giấy'}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {matrixKhoGiayAxisBangGia.map((kg, kgIdx) => (
                          <React.Fragment key={`${kg}-${kgIdx}-sub`}>
                            <th style={{ ...thChietKhau, minWidth: 100, ...(kgIdx > 0 ? { borderLeft: '3px solid #9ca3af' } : {}) }}>GM gần nhất</th>
                            <th style={{ ...thChietKhau, minWidth: 100 }}>Giá mua</th>
                            {canShowSaleFields && showGiaBanTTAfterGiáMua && (() => {
                              const ttShort = matrixGiaBanTtShortRange(bangGiaRowsForMatrix)
                              const tu0Raw = String(bangGiaRowsForMatrix[0]?.so_luong_tu ?? '').trim()
                              return (
                              <th
                                style={{ ...thChietKhau, minWidth: 112 }}
                                title={
                                  tu0Raw
                                    ? `Đơn giá tối thiểu khi số lượng nhỏ hơn ${tu0Raw} (theo ĐVT chính / matrix; đồng bộ báo giá).`
                                    : undefined
                                }
                              >
                                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, lineHeight: 1.25 }}>
                                  <span>Giá bán TT</span>
                                  {ttShort ? (
                                    <span style={{ fontWeight: 400, fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                      SL {ttShort}
                                    </span>
                                  ) : null}
                                </span>
                              </th>
                            )})()}
                            {canShowSaleFields &&
                              Array.from({ length: bacGiaCount }, (_, idx) => {
                                const moTaBac = getMoTaBangGia(bangGiaRowsForMatrix, idx)
                                const rangeShort = matrixGiaBanBacShortRange(bangGiaRowsForMatrix, idx)
                                return (
                                <th
                                  key={`${kg}-${kgIdx}-ban-${idx}`}
                                  title={moTaBac || undefined}
                                  style={{
                                    ...thChietKhau,
                                    minWidth: 112,
                                    ...(idx === bacGiaCount - 1 && kgIdx < matrixKhoGiayAxisBangGia.length - 1 ? { borderRight: '3px solid #9ca3af' } : {}),
                                  }}
                                >
                                  {isBangGiaEmpty ? (
                                    'Giá bán'
                                  ) : (
                                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, lineHeight: 1.25 }}>
                                      <span>{`Giá bán B${idx + 1}`}</span>
                                      {rangeShort ? (
                                        <span style={{ fontWeight: 400, fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                          SL {rangeShort}
                                        </span>
                                      ) : null}
                                    </span>
                                  )}
                                </th>
                              )})}
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPhu1Axis.length === 0 || matrixKhoGiayAxisBangGia.length === 0 ? (
                        <tr>
                          <td colSpan={Math.max(1, matrixKhoGiayAxisBangGia.length) * matrixPriceColsPerKhoGiay + 1} style={{ ...tdChietKhau, textAlign: 'center', color: 'var(--text-muted)' }}>
                            Chọn ít nhất 1 Độ dày/Định lượng hoặc 1 Khổ giấy để nhập matrix.
                          </td>
                        </tr>
                      ) : (
                        selectedPhu1Axis.map((dl) => (
                          <tr key={dl} className="htql-vthh-price-matrix-row">
                            <td style={{ ...tdChietKhau, fontWeight: 600 }}>
                              {(() => {
                                const decoded = decodePhu1Token(dl)
                                if (decoded.dinhLuong) return decoded.dinhLuong
                                if (decoded.heMau) return `Hệ màu: ${decoded.heMau}`
                                return 'Không phiên bản phụ 1'
                              })()}
                            </td>
                            {matrixKhoGiayAxisBangGia.map((kg, kgIdx) => {
                              const key = variantComboKey(dl, kg)
                              const refKeyDl = variantComboKey(dl, matrixKhoGiayAxisBangGia[0] ?? '')
                              const isRefCol = kgIdx === 0 || matrixKhoGiayAxisBangGia.length <= 1
                              const cell = variantMatrix[key] ?? emptyVariantMatrixCell(bacGiaCount)
                              const refCell = variantMatrix[refKeyDl] ?? emptyVariantMatrixCell(bacGiaCount)
                              const displayCell = isRefCol ? cell : refCell
                              const groupSepRight = kgIdx < matrixKhoGiayAxisBangGia.length - 1
                              return (
                                <React.Fragment key={`${dl}-${kg}-${kgIdx}`}>
                                  <td style={{ ...tdChietKhau, ...(kgIdx > 0 ? { borderLeft: '3px solid #9ca3af' } : {}) }}>
                                    <input
                                      className="misa-input-solo"
                                      readOnly
                                      tabIndex={-1}
                                      style={{
                                        ...inputStyle,
                                        width: '100%',
                                        textAlign: 'right',
                                        background: 'var(--bg-secondary)',
                                        cursor: 'default',
                                      }}
                                      value={formatSoTienHienThi(displayCell.gia_mua_gan_nhat ?? '')}
                                    />
                                  </td>
                                  <td style={{ ...tdChietKhau }}>
                                    <input
                                      className="misa-input-solo"
                                      readOnly={!isRefCol}
                                      style={{
                                        ...inputStyle,
                                        width: '100%',
                                        textAlign: 'right',
                                        ...(!isRefCol ? { opacity: 0.85, cursor: 'default', background: 'var(--bg-secondary)' } : {}),
                                        ...(showMatrixMissingHint && matrixMissingFieldMap[variantMatrixFieldKey(refKeyDl, 'mua')] ? { borderColor: 'var(--accent)', background: 'rgba(239, 68, 68, 0.08)' } : {}),
                                      }}
                                      value={formatSoTienHienThi(displayCell.gia_mua)}
                                      onChange={(e) => {
                                        if (!isRefCol) return
                                        const nextVal = formatSoTien(e.target.value)
                                        setVariantMatrix((prev) => ({
                                          ...prev,
                                          [key]: {
                                            gia_mua_gan_nhat: prev[key]?.gia_mua_gan_nhat ?? cell.gia_mua_gan_nhat ?? '',
                                            gia_mua: nextVal,
                                            gia_ban_tt: prev[key]?.gia_ban_tt ?? cell.gia_ban_tt ?? '',
                                            gia_ban_by_bac: Array.from({ length: Math.max(1, bacGiaCount) }, (_, i) => prev[key]?.gia_ban_by_bac?.[i] ?? cell.gia_ban_by_bac[i] ?? ''),
                                          },
                                        }))
                                      }}
                                      placeholder="0"
                                    />
                                  </td>
                                  {canShowSaleFields && showGiaBanTTAfterGiáMua && (
                                    <td style={tdChietKhau}>
                                      <input
                                        className="misa-input-solo"
                                        readOnly={!isRefCol}
                                        style={{
                                          ...inputStyle,
                                          width: '100%',
                                          textAlign: 'right',
                                          ...(!isRefCol ? { opacity: 0.85, cursor: 'default', background: 'var(--bg-secondary)' } : {}),
                                          ...(showMatrixMissingHint && matrixMissingFieldMap[variantMatrixFieldKey(refKeyDl, 'ban_tt')]
                                            ? { borderColor: 'var(--accent)', background: 'rgba(239, 68, 68, 0.08)' }
                                            : {}),
                                        }}
                                        value={formatSoTienHienThi(displayCell.gia_ban_tt ?? '')}
                                        onChange={(e) => {
                                          if (!isRefCol) return
                                          const nextVal = formatSoTien(e.target.value)
                                          setVariantMatrix((prev) => ({
                                            ...prev,
                                            [key]: {
                                              gia_mua_gan_nhat: prev[key]?.gia_mua_gan_nhat ?? cell.gia_mua_gan_nhat ?? '',
                                              gia_mua: prev[key]?.gia_mua ?? cell.gia_mua ?? '',
                                              gia_ban_tt: nextVal,
                                              gia_ban_by_bac: Array.from({ length: Math.max(1, bacGiaCount) }, (_, i) => prev[key]?.gia_ban_by_bac?.[i] ?? cell.gia_ban_by_bac[i] ?? ''),
                                            },
                                          }))
                                        }}
                                        placeholder="0"
                                      />
                                    </td>
                                  )}
                                  {canShowSaleFields &&
                                    Array.from({ length: bacGiaCount }, (_, idx) => (
                                      <td
                                        style={{
                                          ...tdChietKhau,
                                          ...(idx === bacGiaCount - 1 && groupSepRight ? { borderRight: '3px solid #9ca3af' } : {}),
                                        }}
                                        key={`${key}-b-${idx}`}
                                      >
                                        <input
                                          className="misa-input-solo"
                                          readOnly={!isRefCol}
                                          style={{
                                            ...inputStyle,
                                            width: '100%',
                                            textAlign: 'right',
                                            ...(!isRefCol ? { opacity: 0.85, cursor: 'default', background: 'var(--bg-secondary)' } : {}),
                                            ...(showMatrixMissingHint && matrixMissingFieldMap[variantMatrixFieldKey(refKeyDl, 'ban', idx)]
                                              ? { borderColor: 'var(--accent)', background: 'rgba(239, 68, 68, 0.08)' }
                                              : {}),
                                          }}
                                          value={formatSoTienHienThi(displayCell.gia_ban_by_bac[idx] ?? '')}
                                          onChange={(e) => {
                                            if (!isRefCol) return
                                            const nextVal = formatSoTien(e.target.value)
                                            setVariantMatrix((prev) => {
                                              const old = prev[key] ?? {
                                                gia_mua_gan_nhat: cell.gia_mua_gan_nhat,
                                                gia_mua: cell.gia_mua,
                                                gia_ban_tt: cell.gia_ban_tt ?? '',
                                                gia_ban_by_bac: Array.from({ length: Math.max(1, bacGiaCount) }, (_, i) => cell.gia_ban_by_bac[i] ?? ''),
                                              }
                                              const nextByBac = Array.from({ length: Math.max(1, bacGiaCount) }, (_, i) => old.gia_ban_by_bac[i] ?? '')
                                              nextByBac[idx] = nextVal
                                              return {
                                                ...prev,
                                                [key]: {
                                                  gia_mua_gan_nhat: old.gia_mua_gan_nhat,
                                                  gia_mua: old.gia_mua,
                                                  gia_ban_tt: old.gia_ban_tt ?? '',
                                                  gia_ban_by_bac: nextByBac,
                                                },
                                              }
                                            })
                                          }}
                                          placeholder="0"
                                        />
                                      </td>
                                    ))}
                                </React.Fragment>
                              )
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
              </div>
            )}
              </div>
            )}
            {activeSubTab === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ border: '0.5px solid var(--border)', borderRadius: 4, overflowX: 'auto', background: 'var(--bg-tab)' }}>
                  <table className="htql-dvt-quydoi-table" style={{ width: '100%', borderCollapse: 'collapse', borderSpacing: 0, fontSize: 11, tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: 36 }} />
                      <col style={{ width: '28%', maxWidth: 200 }} />
                      <col style={{ width: 148 }} />
                      <col style={{ width: 40 }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={{ ...thChietKhau, textAlign: 'center' }}>STT</th>
                        <th style={thChietKhau}>ĐV quy đổi</th>
                        <th style={{ ...thChietKhau }} title="Phép nhân = nhân toán học, Phép chia = chia toán học">Phép tính</th>
                        <th style={{ ...thChietKhau }} />
                      </tr>
                    </thead>
                    <tbody>
                      {donViQuyDoiFields.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ ...tdChietKhau, background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: 10, textAlign: 'center' }}>
                            Chưa có dòng. Bấm &quot;Thêm dòng&quot; để thêm.
                          </td>
                        </tr>
                      ) : (
                        donViQuyDoiFields.map((field, idx) => {
                          const hasDvtQuyDoi = (donViQuyDoiValues[idx]?.dvt_quy_doi ?? '').trim() !== ''
                          return (
                            <tr key={field.id}>
                              <td style={{ ...tdChietKhau, textAlign: 'center' }}>{idx + 1}</td>
                              <td style={tdChietKhau}>
                                <select
                                  {...register(`don_vi_quy_doi.${idx}.dvt_quy_doi`)}
                                  className="htql-dvt-quydoi-select misa-input-solo"
                                  style={{ ...inputStyle, width: '100%', maxWidth: 'none', textAlign: 'left', cursor: 'pointer', appearance: 'none', paddingRight: 20, background: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}
                                >
                                  <option value="">Chọn đơn vị</option>
                                  {dvtList.map((d) => {
                                    const dvtChinh = donViQuyDoiValues[0]?.dvt_chinh ?? ''
                                    const usedInOtherRows = donViQuyDoiValues.some((r, j) => j !== idx && (r.dvt_quy_doi ?? '').trim() === d.ma_dvt)
                                    const isMainUnit = d.ma_dvt === dvtChinh
                                    const disabled = isMainUnit || usedInOtherRows
                                    const alreadyUsed = disabled
                                    return (
                                      <option key={d.id} value={d.ma_dvt} disabled={disabled} className={alreadyUsed ? 'htql-dvt-already-used' : ''}>
                                        {d.ky_hieu || d.ten_dvt}
                                      </option>
                                    )
                                  })}
                                </select>
                              </td>
                              <td style={tdChietKhau}>
                                {hasDvtQuyDoi ? (
                                  <select
                                    {...register(`don_vi_quy_doi.${idx}.phep_tinh`)}
                                    className="misa-input-solo"
                                    style={{ ...inputStyle, width: '100%', textAlign: 'left', cursor: 'pointer', appearance: 'none', paddingRight: 20, background: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}
                                  >
                                    <option value="">Chọn</option>
                                    <option value="nhan">Phép nhân</option>
                                    <option value="chia">Phép chia</option>
                                  </select>
                                ) : (
                                  <input readOnly tabIndex={-1} className="misa-input-solo" style={{ ...inputStyle, width: '100%', background: 'var(--bg-secondary)', cursor: 'default', color: 'var(--text-muted)' }} value="" />
                                )}
                              </td>
                              <td style={{ ...tdChietKhau, width: 36, padding: '2px 4px', textAlign: 'center' }}>
                                <input type="hidden" {...register(`don_vi_quy_doi.${idx}.ti_le_quy_doi`)} />
                                <input type="hidden" {...register(`don_vi_quy_doi.${idx}.gia_mua_gan_nhat`)} />
                                <input type="hidden" {...register(`don_vi_quy_doi.${idx}.gia_ban`)} />
                                <input type="hidden" {...register(`don_vi_quy_doi.${idx}.mo_ta`)} />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (donViQuyDoiFields.length <= 1) {
                                      userEnteredTiLeByIndex.current = new Set()
                                      setValue('don_vi_quy_doi', [])
                                    } else {
                                      const next = new Set<number>()
                                      userEnteredTiLeByIndex.current.forEach((i) => {
                                        if (i < idx) next.add(i)
                                        else if (i > idx) next.add(i - 1)
                                      })
                                      userEnteredTiLeByIndex.current = next
                                      removeDonViQuyDoi(idx)
                                    }
                                  }}
                                  title="Xóa dòng"
                                  style={{ padding: 2, background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                  <div style={{ padding: '4px 8px', fontSize: 10, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() =>
                        appendDonViQuyDoi({
                          dvt_chinh: donViQuyDoiValues[0]?.dvt_chinh ?? getValues('dvt_chinh') ?? dvtList[0]?.ma_dvt ?? 'Cái',
                          dvt_quy_doi: '',
                          ti_le_quy_doi: '',
                          ti_le_kho_json: '',
                          phep_tinh: '',
                          mo_ta: '',
                          gia_mua_gan_nhat: '',
                          gia_ban: '',
                          gia_ban_1: '',
                          gia_ban_2: '',
                          gia_ban_3: '',
                        })
                      }
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', fontSize: 10, background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    >
                      <Plus size={12} /> Thêm dòng
                    </button>
                  </div>
                </div>
                {dvdqMatrixKhoTens.length > 0 &&
                  (() => {
                    const mdDim = parseDecimalFlex(String(kichThuocMd ?? '').trim())
                    const dvtLabel = (ma: string) => {
                      const d = dvtList.find((x) => x.ma_dvt === ma)
                      return d ? (d.ky_hieu || d.ten_dvt || ma) : ma
                    }
                    const cellBorder: React.CSSProperties = { border: '1px solid var(--border)', padding: '4px 6px' }
                    return (
                      <>
                        {donViQuyDoiFields.map((field, dvdIdx) => {
                          const row = donViQuyDoiValues[dvdIdx]
                          const hasDvt = (row?.dvt_quy_doi ?? '').trim() !== ''
                          const phep = row?.phep_tinh
                          if (!hasDvt || (phep !== 'nhan' && phep !== 'chia')) return null
                          const khoMap = parseTiLeKhoJson((row as { ti_le_kho_json?: string }).ti_le_kho_json)
                          const dvtChinhMa = (donViQuyDoiValues[0]?.dvt_chinh ?? '').trim()
                          const dvtQMa = (row?.dvt_quy_doi ?? '').trim()
                          const dvtQDLabel = dvtLabel(dvtQMa)
                          return (
                            <div key={field.id} style={{ border: '0.5px solid var(--border)', borderRadius: 4, overflowX: 'auto', background: 'var(--bg-tab)' }}>
                              <div style={{ padding: '6px 8px', fontSize: 11, fontWeight: 600, borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                                Matrix ĐV quy đổi — {dvtQDLabel}
                                {hasAnyNormalKhoForDvdqUi ? (
                                  <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>(chỉ khổ bình thường)</span>
                                ) : null}
                              </div>
                              <table className="htql-dvdq-kho-matrix-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
                                <colgroup>
                                  <col style={{ width: 44 }} />
                                  <col style={{ width: 140 }} />
                                  <col style={{ width: 96 }} />
                                  <col style={{ width: 96 }} />
                                  <col style={{ width: 120 }} />
                                  <col />
                                </colgroup>
                                <thead>
                                  <tr>
                                    <th style={{ ...thChietKhau, ...cellBorder, textAlign: 'center' }}>STT</th>
                                    <th style={{ ...thChietKhau, ...cellBorder, textAlign: 'center' }}>Khổ giấy</th>
                                    <th style={{ ...thChietKhau, ...cellBorder, textAlign: 'center' }}>Rộng (m)</th>
                                    <th style={{ ...thChietKhau, ...cellBorder, textAlign: 'center' }}>Dài (m)</th>
                                    <th style={{ ...thChietKhau, ...cellBorder, textAlign: 'center' }}>Tỉ lệ</th>
                                    <th style={{ ...thChietKhau, ...cellBorder, textAlign: 'left', paddingLeft: 15 }}>Mô tả</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {dvdqMatrixKhoTens.map((tenKh, i) => {
                                    const rong = khoGiayChieuRongByTen[tenKh] ?? 0
                                    const storedTi = (khoMap[tenKh] ?? '').trim()
                                    let dispTi = formatSoTien(storedTi)
                                    if (dispTi.endsWith(',') && !/,\d+$/.test(dispTi)) dispTi = dispTi.slice(0, -1)
                                    const moTaHang = generateMoTaQuyDoi({
                                      dvtChinh: dvtChinhMa,
                                      dvtQuyDoi: dvtQMa,
                                      tiLe: storedTi,
                                      phepTinh: phep === 'chia' ? 'chia' : 'nhan',
                                      dvtList,
                                    }).replace(/,\s+(?=[^\d])/g, ' ')
                                    return (
                                      <tr key={`${field.id}-${tenKh}`}>
                                        <td style={{ ...tdChietKhau, ...cellBorder, textAlign: 'center' }}>{i + 1}</td>
                                        <td style={{ ...tdChietKhau, ...cellBorder, textAlign: 'center', fontWeight: 600 }}>{tenKh}</td>
                                        <td style={{ ...tdChietKhau, ...cellBorder, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                                          {rong > 0 ? formatSoTienHienThi(numberToStoredFormat(rong)) : '—'}
                                        </td>
                                        <td style={{ ...tdChietKhau, ...cellBorder, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                                          {mdDim > 0 ? formatSoTienHienThi(numberToStoredFormat(mdDim)) : '—'}
                                        </td>
                                        <td style={{ ...tdChietKhau, ...cellBorder, textAlign: 'right' }}>
                                          <input
                                            className="misa-input-solo"
                                            style={{ ...inputStyle, width: '100%', textAlign: 'right', minWidth: 56, maxWidth: '100%' }}
                                            value={dispTi}
                                            onChange={(e) => updateTiLeTheoKhoCell(dvdIdx, tenKh, e.target.value)}
                                            onFocus={() => {
                                              if (isZeroDisplay(storedTi)) updateTiLeTheoKhoCell(dvdIdx, tenKh, '')
                                            }}
                                            onBlur={() => {
                                              const n = parseFloatVN(storedTi)
                                              if (!Number.isNaN(n) && n < 0) updateTiLeTheoKhoCell(dvdIdx, tenKh, '0')
                                            }}
                                            placeholder=""
                                            title="Tỉ lệ theo khổ"
                                          />
                                        </td>
                                        <td style={{ ...tdChietKhau, ...cellBorder, textAlign: 'left', fontSize: 12, paddingLeft: 15 }}>{moTaHang || '—'}</td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )
                        })}
                      </>
                    )
                  })()}
              </div>
            )}
            {activeSubTab === 4 && tinhChat === 'Sản phẩm' && (
              <div style={{ border: '0.5px solid var(--border)', borderRadius: 4, overflowX: 'auto', background: 'var(--bg-tab)' }}>
                <table className="htql-dinh-muc-nvl-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      <th style={{ ...thChietKhau, textAlign: 'center', width: 36 }}>STT</th>
                      <th style={thChietKhau}>Mã NVL</th>
                      <th style={thChietKhau}>Tên NVL</th>
                      <th style={{ ...thChietKhau, width: 110 }}>ĐVT</th>
                      <th style={{ ...thChietKhau, width: 96, textAlign: 'right' }}>Số lượng</th>
                      <th style={{ ...thChietKhau, width: 88, textAlign: 'right' }}>% Hao hụt</th>
                      <th style={{ ...thChietKhau, width: 36 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {dinhMucNvlRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ ...tdChietKhau, background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: 10, textAlign: 'center' }}>
                          Chưa có dòng. Bấm &quot;Thêm dòng&quot; để thêm.
                        </td>
                      </tr>
                    ) : (
                      dinhMucNvlRows.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ ...tdChietKhau, textAlign: 'center' }}>{idx + 1}</td>
                          <td data-nvl-cell style={tdChietKhau}>
                            <div style={{ position: 'relative', width: '100%', display: 'inline-block' }}>
                              <input className="misa-input-solo" style={{ ...inputStyle, width: '100%', paddingRight: 26, boxSizing: 'border-box' }} value={row.ma} onChange={(e) => {
                                const ma = e.target.value
                                const r = [...dinhMucNvlRows]
                                const item = nvlOptions.find((o) => o.ma === ma)
                                const cleared = !ma.trim()
                                r[idx] = {
                                  ...r[idx],
                                  ma,
                                  ten: cleared ? '' : (item ? item.ten : r[idx].ten),
                                  dvt: cleared ? '' : (item ? item.dvt_chinh : r[idx].dvt),
                                }
                                setDinhMucNvlRows(r)
                              }} onFocus={(e) => { const td = (e.target as HTMLElement).closest('td'); if (td) { const rect = (td as HTMLElement).getBoundingClientRect(); setNvlDropdownRect({ top: rect.bottom, left: rect.left, width: rect.width }); setNvlDropdownRowIdx(idx); } }} onClick={(e) => { if (nvlDropdownRowIdx !== idx) { const td = (e.target as HTMLElement).closest('td'); if (td) { const rect = (td as HTMLElement).getBoundingClientRect(); setNvlDropdownRect({ top: rect.bottom, left: rect.left, width: rect.width }); setNvlDropdownRowIdx(idx); } } }} placeholder="Mã NVL" />
                              <span role="button" tabIndex={0} onMouseDown={(e) => { e.preventDefault(); const td = (e.target as HTMLElement).closest('td'); if (!td) return; const rect = (td as HTMLElement).getBoundingClientRect(); setNvlDropdownRect({ top: rect.bottom, left: rect.left, width: rect.width }); setNvlDropdownRowIdx(idx); }} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <ChevronDown size={12} />
                              </span>
                            </div>
                          </td>
                          <td style={tdChietKhau}>
                            <input
                              readOnly
                              tabIndex={-1}
                              className="misa-input-solo"
                              style={{ ...inputStyle, width: '100%', cursor: 'default' }}
                              value={row.ten}
                              placeholder="Tên NVL"
                            />
                          </td>
                          <td style={tdChietKhau}>
                            {(() => {
                              const item = nvlOptions.find((o) => o.ma === row.ma)
                              const extraDvts = (item?.don_vi_quy_doi ?? [])
                                .map((d) => (d.dvt ?? '').trim())
                                .filter(Boolean)
                              const dvtMas = collectDvtMaChoNvlItem(item)
                              const showSelect = extraDvts.length > 0 && dvtMas.length > 0
                              if (showSelect) {
                                return (
                                  <select
                                    className="misa-input-solo"
                                    style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
                                    value={row.dvt}
                                    onChange={(e) => {
                                      const v = e.target.value
                                      const r = [...dinhMucNvlRows]
                                      r[idx] = { ...r[idx], dvt: v }
                                      setDinhMucNvlRows(r)
                                    }}
                                  >
                                    {dvtMas.map((ma) => {
                                      const d = dvtList.find((x) => x.ma_dvt === ma)
                                      const label = d ? (d.ky_hieu || d.ten_dvt || ma) : ma
                                      return (
                                        <option key={ma} value={ma}>{label}</option>
                                      )
                                    })}
                                  </select>
                                )
                              }
                              const maDvt = item?.dvt_chinh ?? row.dvt
                              const d = dvtList.find((x) => x.ma_dvt === maDvt)
                              const display = d ? (d.ky_hieu || d.ten_dvt) : (maDvt || '')
                              return (
                                <input
                                  readOnly
                                  tabIndex={-1}
                                  className="misa-input-solo"
                                  style={{ ...inputStyle, width: '100%', cursor: 'default' }}
                                  value={display}
                                />
                              )
                            })()}
                          </td>
                          <td style={tdChietKhau}>
                            <input
                              className="misa-input-solo"
                              style={{ ...inputStyle, width: '100%' }}
                              value={row.so_luong ?? ''}
                              onChange={(e) => {
                                const formatted = formatSoTuNhienInput(e.target.value)
                                const r = [...dinhMucNvlRows]
                                r[idx] = { ...r[idx], so_luong: formatted }
                                setDinhMucNvlRows(r)
                              }}
                              onBlur={() => {
                                const trimmed = String(row.so_luong ?? '').trim()
                                if (trimmed !== '') {
                                  const n = parseFloatVN(row.so_luong)
                                  if (Number.isNaN(n) || n < 0) {
                                    const r = [...dinhMucNvlRows]
                                    r[idx] = { ...r[idx], so_luong: formatSoTuNhienInput('1') }
                                    setDinhMucNvlRows(r)
                                  }
                                }
                              }}
                              placeholder="Số lượng"
                            />
                          </td>
                          <td style={tdChietKhau}>
                            <input
                              className="misa-input-solo"
                              style={{ ...inputStyle, width: '100%' }}
                              value={row.hao_hut ?? ''}
                              onChange={(e) => {
                                const formatted = formatSoTuNhienInput(e.target.value)
                                const r = [...dinhMucNvlRows]
                                r[idx] = { ...r[idx], hao_hut: formatted }
                                setDinhMucNvlRows(r)
                              }}
                              onBlur={() => {
                                const trimmed = String(row.hao_hut ?? '').trim()
                                if (trimmed !== '') {
                                  const n = parseFloatVN(row.hao_hut)
                                  if (Number.isNaN(n) || n < 0) {
                                    const r = [...dinhMucNvlRows]
                                    r[idx] = { ...r[idx], hao_hut: formatSoTuNhienInput('1') }
                                    setDinhMucNvlRows(r)
                                  } else if (n > 100) {
                                    const r = [...dinhMucNvlRows]
                                    r[idx] = { ...r[idx], hao_hut: formatSoTuNhienInput('100') }
                                    setDinhMucNvlRows(r)
                                  }
                                }
                              }}
                              placeholder="%"
                            />
                          </td>
                          <td style={{ ...tdChietKhau, width: 36, padding: '2px 4px', textAlign: 'center' }}>
                            <button type="button" onClick={() => setDinhMucNvlRows(dinhMucNvlRows.filter((_, i) => i !== idx))} style={{ padding: 2, background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title="Xóa dòng">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div style={{ padding: '4px 8px', fontSize: 10, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
                  <button type="button" onClick={() => setDinhMucNvlRows([...dinhMucNvlRows, { ma: '', ten: '', dvt: '', so_luong: '', hao_hut: '' }])} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', fontSize: 10, background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                    <Plus size={12} /> Thêm dòng
                  </button>
                </div>
              </div>
            )}
            {nvlDropdownRowIdx !== null && nvlDropdownRect && tinhChat === 'Sản phẩm' && activeSubTab === 4 && ReactDOM.createPortal(
              <div
                ref={nvlDropdownRef}
                style={{
                  position: 'fixed',
                  top: nvlDropdownRect.top,
                  left: nvlDropdownRect.left,
                  width: Math.max(nvlDropdownRect.width, 320),
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
                      const currentRowIdx = nvlDropdownRowIdx
                      const searchText = (dinhMucNvlRows[currentRowIdx]?.ma ?? '').trim()
                      let availableNvlOptions = nvlOptions.filter(
                        (item) => !dinhMucNvlRows.some((row, idx) => idx !== currentRowIdx && row.ma === item.ma)
                      )
                      if (searchText) {
                        availableNvlOptions = availableNvlOptions.filter(
                          (item) =>
                            matchSearchKeyword(item.ma ?? '', searchText) ||
                            matchSearchKeyword(item.ten ?? '', searchText)
                        )
                      }
                      return availableNvlOptions.length === 0 ? (
                        <tr><td colSpan={2} style={{ ...tdChietKhau, padding: 8, color: 'var(--text-muted)' }}>{searchText ? 'Không tìm thấy NVL phù hợp' : 'Không còn NVL nào để chọn'}</td></tr>
                      ) : (
                        availableNvlOptions.map((item) => (
                        <tr
                          key={item.id}
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--row-selected-bg)' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                          onMouseDown={() => {
                            const r = [...dinhMucNvlRows]
                            if (nvlDropdownRowIdx != null && r[nvlDropdownRowIdx] != null) {
                              r[nvlDropdownRowIdx] = { ...r[nvlDropdownRowIdx], ma: item.ma, ten: item.ten, dvt: item.dvt_chinh ?? r[nvlDropdownRowIdx].dvt }
                              setDinhMucNvlRows(r)
                            }
                            setNvlDropdownRowIdx(null)
                            setNvlDropdownRect(null)
                          }}
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
            {((activeSubTab === 4 && tinhChat !== 'Sản phẩm') || (activeSubTab === 5 && tinhChat === 'Sản phẩm')) && (
              <div style={{ border: '1px solid #4b5563', padding: 16, borderRadius: 4 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gridTemplateRows: 'auto minmax(160px, 1fr)', gap: '6px 16px', alignItems: 'stretch' }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Arial, sans-serif' }}>Đặc tính</label>
                  </div>
                  <div />
                  <div style={{ minWidth: 0 }}>
                    <textarea
                      {...register('dac_tinh')}
                      className="misa-input-solo"
                      style={{
                        width: '100%',
                        height: 160,
                        minHeight: 160,
                        padding: '6px 8px',
                        fontFamily: 'Arial, sans-serif',
                        fontSize: 12,
                        background: 'var(--bg-tab)',
                        border: '1px solid #374151',
                        borderRadius: 4,
                        color: 'var(--text-primary)',
                        resize: 'vertical',
                        overflowY: 'auto',
                        fontStyle: 'italic',
                        boxSizing: 'border-box',
                      }}
                      placeholder="Mô tả đặc tính của sản phẩm"
                    />
                  </div>
                  {/* Hình ảnh - cùng hàng với ô Đặc tính, canh giữa theo chiều dọc */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, minHeight: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <div
                      style={{
                        minHeight: 100,
                        maxWidth: 140,
                        maxHeight: 140,
                        flexShrink: 0,
                        border: '1px dashed var(--border-strong)',
                        borderRadius: 4,
                        background: imagePreview ? 'transparent' : 'var(--bg-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        fontSize: 10,
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                      onClick={() => document.getElementById('htql-hinh-anh-input')?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = imagePreview ? 'transparent' : 'rgba(59, 130, 246, 0.08)' }}
                      onDragLeave={(e) => { e.currentTarget.style.background = imagePreview ? 'transparent' : 'var(--bg-primary)' }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.currentTarget.style.background = imagePreview ? 'transparent' : 'var(--bg-primary)'
                        const f = e.dataTransfer.files[0]
                        if (f && isAllowedImageFile(f)) handleImageSelect(f)
                        else if (f) setImageUploadError('Chỉ chấp nhận ảnh có đuôi .jpg, .jpeg hoặc .png')
                      }}
                    >
                      {imageUploading ? (
                        <span>Đang nén ảnh...</span>
                      ) : imagePreview ? (
                        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 100, maxWidth: 140, maxHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img
                            src={vthhImageDisplayUrl(imagePreview)}
                            alt="Preview"
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                            onLoad={(e) => {
                              const img = e.currentTarget
                              const isDataUrl = imagePreview.startsWith('data:')
                              const sizeBytes = isDataUrl
                                ? Math.floor((imagePreview.length - (imagePreview.indexOf(',') + 1)) * 0.75)
                                : 0
                              setImageMeta({
                                width: img.naturalWidth,
                                height: img.naturalHeight,
                                sizeMB: sizeBytes / (1024 * 1024),
                              })
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              void (async () => {
                                const prev = (getValues('duong_dan_hinh_anh') ?? '').trim()
                                if (prev.startsWith(HTQL_VTHH_HINH_PREFIX) && htqlCanUploadToServer()) {
                                  try {
                                    await htqlDeleteFileOnServer('vthh_hinh', prev.slice(HTQL_VTHH_HINH_PREFIX.length))
                                  } catch {
                                    /* vẫn gỡ khỏi form */
                                  }
                                }
                                setValue('duong_dan_hinh_anh', '')
                                setValue('ten_file_hinh_anh', '')
                              })()
                            }}
                            style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 4, border: 'none', background: 'var(--accent)', color: 'var(--accent-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
                            title="Xóa ảnh"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ textAlign: 'center', padding: 8 }}>
                          Hình ảnh
                          <br />
                          <span style={{ fontSize: 9 }}>Chọn hình ảnh hoặc kéo thả</span>
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, color: 'var(--text-muted)', minWidth: 0, flex: 1 }}>
                      <div><span style={{ color: 'var(--text-primary)' }}>{imagePreview ? (imagePreview.startsWith('data:') ? 'Ảnh nhúng (Base64)' : imagePreview.startsWith(HTQL_VTHH_HINH_PREFIX) ? 'Ảnh trên máy chủ (vthh)' : (watch('ten_file_hinh_anh') || imagePreview.split(/[/\\]/).pop() || '—')) : '—'}</span></div>
                      <div><span style={{ color: 'var(--text-primary)' }}>{imageMeta ? `${imageMeta.width}×${imageMeta.height}` : '—'}</span></div>
                      <div><span style={{ color: 'var(--text-primary)' }}>{imageMeta && imageMeta.sizeMB > 0 ? `${imageMeta.sizeMB.toFixed(2)} MB` : '—'}</span></div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ color: 'var(--text-primary)', wordBreak: 'break-word', whiteSpace: 'normal', display: 'block' }}>{imagePreview ? (imagePreview.startsWith('data:') ? 'Base64' : imagePreview.startsWith(HTQL_VTHH_HINH_PREFIX) ? `SSD …/vthh/${imagePreview.slice(HTQL_VTHH_HINH_PREFIX.length)}` : (imagePreview.split(/[/\\]/).pop() ?? '—')) : '—'}</span>
                      </div>
                    </div>
                    </div>
                    <input
                      id="htql-hinh-anh-input"
                      type="file"
                      accept={ALLOWED_IMAGE_ACCEPT}
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleImageSelect(f)
                        e.target.value = ''
                      }}
                    />
                    {imageUploadError && <p style={{ fontSize: 11, color: 'var(--accent)' }}>{imageUploadError}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {submitError && (
            <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 12 }}>
              {submitError}
            </p>
          )}
        </div>

        <div style={footerStyle}>
          <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 11, color: 'var(--accent-hover)', textDecoration: 'none' }}>Xem video hướng dẫn</a>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={onClose} style={formFooterButtonCancel}>Hủy bỏ</button>
            <button type="submit" style={formFooterButtonSave}>Lưu</button>
            {mode === 'add' && (
              <button type="button" onClick={(e) => { e.preventDefault(); onSaveAndAdd(e); }} style={formFooterButtonSaveAndAdd}>Lưu và tiếp tục</button>
            )}
          </div>
        </div>
      </form>

      {lookupModal === 'kho' && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 4000 }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) overlayKhoLookupMouseDownRef.current = true }}
            onClick={(e) => { if (e.target === e.currentTarget && overlayKhoLookupMouseDownRef.current) setLookupModal(null); overlayKhoLookupMouseDownRef.current = false }}
            aria-hidden
          />
          {khoDropdownRect && ReactDOM.createPortal(
            <div
              onMouseDown={() => { overlayKhoLookupMouseDownRef.current = false }}
              style={{
                position: 'fixed',
                top: khoDropdownRect.top,
                left: khoDropdownRect.left,
                width: khoDropdownRect.width,
                maxHeight: 240,
                overflowY: 'auto',
                zIndex: 2000,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const khoChoPhep = khoList.filter((item) => !KHO_LABELS_EXCLUDED.includes(item.label))
                if (khoChoPhep.length === 0) {
                  return <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)' }}>Chưa có kho nào</div>
                }
                return khoChoPhep.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setValue('kho_ngam_dinh', item.label)
                      setLookupModal(null)
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && (setValue('kho_ngam_dinh', item.label), setLookupModal(null))}
                    style={{
                      padding: '6px 10px',
                      fontSize: 11,
                      fontFamily: "var(--font-misa, 'Tahoma', Arial, sans-serif)",
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {item.label}
                  </div>
                ))
              })()}
            </div>,
            document.body
          )}
        </>
      )}
      {showThemKhoModal && (
        <ThemKhoModal
          existingItems={khoList}
          onClose={() => setShowThemKhoModal(false)}
          onSave={(item) => {
            const nextList = [...khoList, item]
            setKhoList(nextList)
            saveKhoListToStorage(nextList)
            setValue('kho_ngam_dinh', item.label)
            setShowThemKhoModal(false)
          }}
          onSaveAndAdd={(item) => {
            const nextList = [...khoList, item]
            setKhoList(nextList)
            saveKhoListToStorage(nextList)
            setValue('kho_ngam_dinh', item.label)
          }}
        />
      )}
      {lookupModal === 'nhom_vthh' && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 4000 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) overlayNhomVthhMouseDownRef.current = true
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && overlayNhomVthhMouseDownRef.current) setLookupModal(null)
              overlayNhomVthhMouseDownRef.current = false
            }}
            aria-hidden
          />
          {nhomDropdownRect && ReactDOM.createPortal(
            <div
              data-nhom-vthh-dropdown=""
              onMouseDown={() => { overlayNhomVthhMouseDownRef.current = false }}
              style={{
                position: 'fixed',
                top: nhomDropdownRect.top,
                left: nhomDropdownRect.left,
                width: nhomDropdownRect.width,
                maxHeight: 240,
                overflowY: 'auto',
                zIndex: 4100,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {nhomVTHHList.length === 0 ? (
                <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)' }}>Chưa có nhóm</div>
              ) : (
                nhomVTHHList.map((item) => {
                  const curIds = parseNhomVthhStored(getValues('nhom_vthh'))
                  const selected = curIds.includes(item.id)
                  return (
                    <div
                      key={item.id}
                      role="option"
                      aria-selected={selected}
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        const ids = parseNhomVthhStored(getValues('nhom_vthh'))
                        const next = selected ? ids.filter((x) => x !== item.id) : [...ids, item.id]
                        setValue('nhom_vthh', next.join(';'), { shouldValidate: true, shouldDirty: true })
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return
                        const ids = parseNhomVthhStored(getValues('nhom_vthh'))
                        const next = selected ? ids.filter((x) => x !== item.id) : [...ids, item.id]
                        setValue('nhom_vthh', next.join(';'), { shouldValidate: true, shouldDirty: true })
                      }}
                      style={{
                        padding: '6px 10px',
                        fontSize: 11,
                        fontFamily: "var(--font-misa, 'Tahoma', Arial, sans-serif)",
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                        borderBottom: '1px solid var(--border)',
                        background: selected ? 'var(--row-selected-bg)' : undefined,
                      }}
                    >
                      {item.ten}
                    </div>
                  )
                })
              )}
            </div>,
            document.body
          )}
        </>
      )}
      {showThemLoaiVthhModal && (
        <Modal
          open
          onClose={() => setShowThemLoaiVthhModal(false)}
          title="Thêm loại VTHH"
          size="sm"
          footer={
            <>
              <button type="button" style={formFooterButtonCancel} onClick={() => setShowThemLoaiVthhModal(false)}>Hủy bỏ</button>
              <button
                type="button"
                style={formFooterButtonSave}
                onClick={() => {
                  const t = tenLoaiVthhMoi.trim()
                  if (!t) return
                  if (!appendVthhLoaiCustom({ ten: t })) {
                    alert('Loại này đã tồn tại (hoặc trùng với loại có sẵn).')
                    return
                  }
                  void refreshLoaiNhomDanhMuc()
                  setValue('tinh_chat', t, { shouldValidate: true, shouldDirty: true })
                  setShowThemLoaiVthhModal(false)
                }}
              >
                Lưu
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tên loại</label>
            <input
              value={tenLoaiVthhMoi}
              onChange={(e) => setTenLoaiVthhMoi(e.target.value)}
              placeholder="Nhập tên loại mới"
              style={{ ...inputStyle, height: 28 }}
            />
          </div>
        </Modal>
      )}

      {showThemNhomVTHHModal && (
        <ThemNhomVTHHModal
          parentOptions={nhomVTHHList}
          onClose={() => setShowThemNhomVTHHModal(false)}
          onSave={(item) => {
            appendVthhNhomCustom({ ma: item.id, ten: item.ten })
            setNhomVTHHList((prev) => (prev.some((x) => x.id === item.id) ? prev : [...prev, item]))
            const cur = parseNhomVthhStored(getValues('nhom_vthh'))
            const nextIds = Array.from(new Set([...cur, item.id]))
            setValue('nhom_vthh', nextIds.join(';'), { shouldValidate: true, shouldDirty: true })
            void refreshLoaiNhomDanhMuc()
            setShowThemNhomVTHHModal(false)
          }}
          onSaveAndAdd={(item) => {
            appendVthhNhomCustom({ ma: item.id, ten: item.ten })
            setNhomVTHHList((prev) => (prev.some((x) => x.id === item.id) ? prev : [...prev, item]))
            const cur = parseNhomVthhStored(getValues('nhom_vthh'))
            const nextIds = Array.from(new Set([...cur, item.id]))
            setValue('nhom_vthh', nextIds.join(';'), { shouldValidate: true, shouldDirty: true })
            void refreshLoaiNhomDanhMuc()
          }}
        />
      )}

      {showThemDvtModal && (
        <ThemDonViTinhModal
          onClose={() => setShowThemDvtModal(false)}
          onSaved={async () => { await onRefreshDvtList?.() }}
        />
      )}

      {formulaDialogOpen && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setFormulaDialogOpen(false); }}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              width: '90vw',
              maxWidth: 520,
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
              Thiết lập công thức tính Số lượng trên chứng từ bán hàng
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16 }}>
                <Info size={18} style={{ flexShrink: 0, color: 'var(--accent)', marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Chức năng này cho phép thiết lập công thức tính toán Số lượng trên chứng từ bán hàng, mua hàng. Dùng dấu "." để ngăn cách phần thập phân.
                </p>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Cách tính</label>
                <select
                  value={formulaCachTinh}
                  onChange={(e) => handleFormulaCachTinhChange(e.target.value)}
                  style={{
                    width: '100%',
                    maxWidth: 280,
                    padding: '4px 8px',
                    fontSize: 11,
                    background: 'var(--bg-tab)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="Khác">Khác</option>
                  <option value="Chu vi hình chữ nhật">Chu vi hình chữ nhật</option>
                  <option value="Diện tích hình chữ nhật">Diện tích hình chữ nhật</option>
                  <option value="Thể tích hình hộp chữ nhật">Thể tích hình hộp chữ nhật</option>
                  <option value="Chu vi hình tròn">Chu vi hình tròn</option>
                  <option value="Diện tích hình tròn">Diện tích hình tròn</option>
                  <option value="Thể tích hình trụ">Thể tích hình trụ</option>
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Thiết lập công thức</label>
                <textarea
                  value={formulaText}
                  onChange={(e) => handleFormulaTextChange(e.target.value)}
                  placeholder="Nhập công thức..."
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: 8,
                    fontSize: 12,
                    fontFamily: 'Arial, sans-serif',
                    background: 'var(--bg-tab)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    color: 'var(--text-primary)',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {['Chiều dài', 'Chiều rộng', 'Chiều cao', 'Bán kính', 'Lượng'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => appendToFormula(`[${v}]`)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11,
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {['+', '-', '*', '/', '(', ')'].map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => appendToFormula(op)}
                    style={{
                      padding: '4px 12px',
                      fontSize: 14,
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    {op}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleKiemTraCongThuc()
                  }}
                  style={{ ...btnFooter, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                >
                  <FileCheck size={14} />
                  Kiểm tra công thức
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleDongYCongThuc()
                  }}
                  style={{ ...btnFooter, display: 'flex', alignItems: 'center', gap: 4, background: 'var(--accent)', color: 'var(--accent-text)', cursor: 'pointer' }}
                >
                  <CheckCircle size={14} />
                  Đồng ý
                </button>
                <button
                  type="button"
                  onClick={() => setFormulaDialogOpen(false)}
                  style={{ ...btnFooter, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                >
                  <XCircle size={14} />
                  Hủy bỏ
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {formulaAlert && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setFormulaAlert(null)}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              minWidth: 320,
              maxWidth: 400,
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', background: 'var(--bg-tab)' }}>
              Thông báo
            </div>
            <div style={{ padding: 20, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              {formulaAlert.valid ? (
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle size={26} color="var(--accent-text)" strokeWidth={2.5} />
                </div>
              ) : (
                <div style={{ width: 44, height: 44, flexShrink: 0, color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={40} strokeWidth={2} />
                </div>
              )}
              <div style={{ flex: 1, paddingTop: 8 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)' }}>
                  {formulaAlert.valid ? 'Công thức hợp lệ.' : 'Công thức không hợp lệ.'}
                </p>
              </div>
            </div>
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setFormulaAlert(null)}
                style={{
                  padding: '6px 20px',
                  fontSize: 12,
                  background: 'var(--accent)',
                  color: 'var(--accent-text)',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showMatrixMissingConfirm && (
        <Modal
          open
          onClose={() => {
            setShowMatrixMissingConfirm(false)
            setPendingMatrixSubmitAction(null)
          }}
          title="Xác nhận lưu dữ liệu"
          size="sm"
          footer={(
            <>
              <button
                type="button"
                style={formFooterButtonCancel}
                onClick={() => {
                  setShowMatrixMissingConfirm(false)
                  setPendingMatrixSubmitAction(null)
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                style={formFooterButtonSave}
                onClick={(e) => {
                  e.preventDefault()
                  void onConfirmSaveWhenMatrixMissing()
                }}
              >
                Đồng ý lưu
              </button>
            </>
          )}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--text-primary)' }}>
            <AlertTriangle size={16} style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }} />
            <div>
              Matrix quy cách còn thiếu <strong>{matrixMissingCount}</strong> ô giá. Các ô thiếu đã được tô đỏ.
              <br />
              Anh có muốn tiếp tục lưu khi chưa nhập đủ không?
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
