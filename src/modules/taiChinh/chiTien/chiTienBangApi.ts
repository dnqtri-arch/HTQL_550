/**
 * API và types cho Báo giá (header + chi tiết dòng).
 * Mã: {Năm}/BG/{Số} — rule ma-he-thong.mdc
 * 
 * [YC24 Mục 7] Endpoint backend (khi có): /api/sales/quotes
 * Hiện tại: htqlEntityStorage-based (tách biệt khỏi /api/purchase/orders)
 */

import { maFormatHeThong, getCurrentYear } from '../../../utils/maFormat'
import { allocateMaHeThongFromServer, hintMaxSerialForYearPrefix } from '../../../utils/htqlSequenceApi'
import { htqlEntityStorage } from '@/utils/htqlEntityStorage'
import { formatSoTienHienThi, parseFloatVN } from '../../../utils/numberFormat'
import { donHangBanGetAll } from '../../crm/banHang/donHangBan/donHangBanChungTuApi'
import { donHangBanChiTienBangIdsLinked } from '../../crm/banHang/donHangBan/donHangBanChungTuApi'
import { hopDongBanChiTienBangIdsLinked, hopDongBanChungTuGetAll } from '../../crm/banHang/hopDongBan/hopDongBanChungTuApi'
import { phuLucHopDongBanChiTienBangIdsLinked, phuLucHopDongBanChungTuGetAll } from '../../crm/banHang/phuLucHopDongBan/phuLucHopDongBanChungTuApi'
import type {
  ChiTienBangAttachmentItem,
  ChiTienBangChiTiet,
  ChiTienBangCreatePayload,
  ChiTienBangDraftLine,
  ChiTienBangFilter,
  ChiTienBangKyValue,
  ChiTienBangRecord,
} from '../../../types/chiTienBang'
import type { ChiTienBangApi } from './chiTienBangApiContext'
import { donHangBanHoanTacKhiXoaChiTien } from '../../crm/banHang/donHangBan/donHangBanChungTuApi'
import { hopDongBanHoanTacKhiXoaChiTien } from '../../crm/banHang/hopDongBan/hopDongBanChungTuApi'
import { phuLucHopDongBanHoanTacKhiXoaChiTien } from '../../crm/banHang/phuLucHopDongBan/phuLucHopDongBanChungTuApi'

export type {
  ChiTienBangAttachmentItem,
  ChiTienBangChiTiet,
  ChiTienBangCreatePayload,
  ChiTienBangDraftLine,
  ChiTienBangFilter,
  ChiTienBangKyValue,
  ChiTienBangRecord,
} from '../../../types/chiTienBang'

/** Alias tương thích — cùng nghĩa với ChiTienBangKyValue. */
export type KyValue = ChiTienBangKyValue

const MODULE_PREFIX = 'PC'

/** Dữ liệu mẫu báo giá */
const MOCK_DON: ChiTienBangRecord[] = [
  {
    id: 'bg1',
    tinh_trang: 'Chưa thực hiện',
    ngay_chi_tien_bang: '2026-03-10',
    so_chi_tien_bang: 'TT00001',
    ngay_giao_hang: null,
    khach_hang: 'CÔNG TY TNHH QUẢNG CÁO VAX',
    dia_chi: '',
    ma_so_thue: '',
    dien_giai: '',
    nv_ban_hang: '',
    dieu_khoan_tt: '',
    so_ngay_duoc_no: '0',
    dieu_khoan_khac: '',
    tong_tien_hang: 4000000,
    tong_thue_gtgt: 0,
    tong_thanh_toan: 4000000,
    so_chung_tu_cukcuk: '',
  },
  {
    id: 'bg2',
    tinh_trang: 'Đang thực hiện',
    ngay_chi_tien_bang: '2026-03-12',
    so_chi_tien_bang: 'TT00002',
    ngay_giao_hang: '2026-03-20',
    khach_hang: 'CÔNG TY CP NGUYÊN VẬT LIỆU ABC',
    dia_chi: '',
    ma_so_thue: '',
    dien_giai: 'Đơn hàng vật tư quý 1',
    nv_ban_hang: '',
    dieu_khoan_tt: '',
    so_ngay_duoc_no: '0',
    dieu_khoan_khac: '',
    tong_tien_hang: 15000000,
    tong_thue_gtgt: 0,
    tong_thanh_toan: 15000000,
    so_chung_tu_cukcuk: 'CUKCUK-2026-001',
  },
  {
    id: 'bg3',
    tinh_trang: 'Chưa thực hiện',
    ngay_chi_tien_bang: '2026-03-15',
    so_chi_tien_bang: 'TT00003',
    ngay_giao_hang: null,
    khach_hang: 'CÔNG TY TNHH DỊCH VỤ XYZ',
    dia_chi: '',
    ma_so_thue: '',
    dien_giai: '',
    nv_ban_hang: '',
    dieu_khoan_tt: '',
    so_ngay_duoc_no: '0',
    dieu_khoan_khac: '',
    tong_tien_hang: 8500000,
    tong_thue_gtgt: 0,
    tong_thanh_toan: 8500000,
    so_chung_tu_cukcuk: '',
  },
]

/** Chi tiết theo báo giá */
const MOCK_CHI_TIET: ChiTienBangChiTiet[] = [
  {
    id: 'ct1',
    chi_tien_bang_id: 'bg1',
    ma_hang: 'VT00001',
    ten_hang: 'decal trang sus',
    ma_quy_cach: '',
    dvt: 'Cây',
    chieu_dai: 0,
    chieu_rong: 0,
    chieu_cao: 0,
    ban_kinh: 0,
    luong: 0,
    so_luong: 5,
    so_luong_nhan: 0,
    don_gia: 800000,
    thanh_tien: 4000000,
    pt_thue_gtgt: null,
    tien_thue_gtgt: null,
    lenh_san_xuat: '',
  },
]

const STORAGE_KEY_THU_TIEN_BANG = 'htql_chi_tien_bang_list'
const STORAGE_KEY_CHI_TIET = 'htql_chi_tien_bang_chi_tiet'

function normalizeChiTienBang(d: Partial<ChiTienBangRecord> & { id: string; de_xuat_id?: string }): ChiTienBangRecord {
  const legacyDx = (d as { de_xuat_id?: string }).de_xuat_id
  const doiChieu = d.doi_chieu_don_mua_id ?? legacyDx
  return {
    id: d.id,
    loai_khach_hang: d.loai_khach_hang ?? undefined,
    ten_nguoi_lien_he: d.ten_nguoi_lien_he ?? undefined,
    so_dien_thoai_lien_he: d.so_dien_thoai_lien_he ?? undefined,
    tinh_trang: d.tinh_trang ?? 'Chưa thực hiện',
    ngay_chi_tien_bang: d.ngay_chi_tien_bang ?? '',
    so_chi_tien_bang: d.so_chi_tien_bang ?? '',
    ngay_giao_hang: d.ngay_giao_hang ?? null,
    khach_hang: d.khach_hang ?? '',
    dia_chi: d.dia_chi ?? '',
    nguoi_giao_hang: d.nguoi_giao_hang ?? undefined,
    ma_so_thue: d.ma_so_thue ?? '',
    dien_giai: d.dien_giai ?? '',
    nv_ban_hang: d.nv_ban_hang ?? '',
    dieu_khoan_tt: d.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: d.so_ngay_duoc_no ?? '0',
    dieu_khoan_khac: d.dieu_khoan_khac ?? '',
    tong_tien_hang: typeof d.tong_tien_hang === 'number' ? d.tong_tien_hang : 0,
    tong_thue_gtgt: typeof d.tong_thue_gtgt === 'number' ? d.tong_thue_gtgt : 0,
    tong_thanh_toan: typeof d.tong_thanh_toan === 'number' ? d.tong_thanh_toan : 0,
    ap_dung_vat_gtgt: typeof d.ap_dung_vat_gtgt === 'boolean' ? d.ap_dung_vat_gtgt : undefined,
    tl_ck: typeof d.tl_ck === 'number' ? d.tl_ck : undefined,
    tien_ck: typeof d.tien_ck === 'number' ? d.tien_ck : undefined,
    so_dien_thoai: d.so_dien_thoai ?? undefined,
    so_chung_tu_cukcuk: d.so_chung_tu_cukcuk ?? '',
    doi_chieu_don_mua_id: doiChieu ?? undefined,
    attachments: Array.isArray((d as { attachments?: ChiTienBangAttachmentItem[] }).attachments)
      ? (d as { attachments: ChiTienBangAttachmentItem[] }).attachments
      : undefined,
    hinh_thuc: d.hinh_thuc,
    dia_chi_cong_trinh: d.dia_chi_cong_trinh,
    chung_tu_mua_loai_chung_tu: d.chung_tu_mua_loai_chung_tu,
    chung_tu_mua_chua_thanh_toan: d.chung_tu_mua_chua_thanh_toan,
    chung_tu_mua_thanh_toan_ngay: d.chung_tu_mua_thanh_toan_ngay,
    chung_tu_mua_pttt: d.chung_tu_mua_pttt,
    chung_tu_mua_ck: d.chung_tu_mua_ck,
    chung_tu_mua_loai_hd: d.chung_tu_mua_loai_hd,
    chung_tu_mua_so_hoa_don: d.chung_tu_mua_so_hoa_don,
    hoa_don_ngay: d.hoa_don_ngay,
    hoa_don_ky_hieu: d.hoa_don_ky_hieu,
    mau_hoa_don_ma: d.mau_hoa_don_ma,
    mau_hoa_don_ten: d.mau_hoa_don_ten,
    phieu_chi_nha_cung_cap: d.phieu_chi_nha_cung_cap,
    phieu_chi_dia_chi: d.phieu_chi_dia_chi,
    phieu_chi_nguoi_nhan_tien: d.phieu_chi_nguoi_nhan_tien,
    phieu_chi_ly_do: d.phieu_chi_ly_do,
    phieu_chi_ngay: d.phieu_chi_ngay,
    phieu_chi_tai_khoan_chi: d.phieu_chi_tai_khoan_chi,
    phieu_chi_ngan_hang_chi: d.phieu_chi_ngan_hang_chi,
    phieu_chi_ten_nguoi_gui: d.phieu_chi_ten_nguoi_gui,
    phieu_chi_tai_khoan_nhan: d.phieu_chi_tai_khoan_nhan,
    phieu_chi_ngan_hang_nhan: d.phieu_chi_ngan_hang_nhan,
    phieu_chi_ten_chu_tk_nhan: d.phieu_chi_ten_chu_tk_nhan,
    phieu_chi_ngan_hang: d.phieu_chi_ngan_hang,
    phieu_chi_ten_nguoi_nhan_ck: d.phieu_chi_ten_nguoi_nhan_ck,
    phieu_chi_attachments: Array.isArray(d.phieu_chi_attachments) ? d.phieu_chi_attachments : undefined,
    ly_do_chi_phieu: d.ly_do_chi_phieu ?? undefined,
    chi_tien_mat: typeof d.chi_tien_mat === 'boolean' ? d.chi_tien_mat : undefined,
    chi_qua_ngan_hang: typeof d.chi_qua_ngan_hang === 'boolean' ? d.chi_qua_ngan_hang : undefined,
    ngay_hach_toan: d.ngay_hach_toan,
    phieu_tai_khoan_id: d.phieu_tai_khoan_id?.trim() || undefined,
  }
}

function loadFromStorage(): { ChiTienBang: ChiTienBangRecord[]; chiTiet: ChiTienBangChiTiet[] } {
  try {
    const rawChiTienBang = typeof htqlEntityStorage !== 'undefined' ? htqlEntityStorage.getItem(STORAGE_KEY_THU_TIEN_BANG) : null
    const rawCt = typeof htqlEntityStorage !== 'undefined' ? htqlEntityStorage.getItem(STORAGE_KEY_CHI_TIET) : null
    const ChiTienBang = rawChiTienBang ? JSON.parse(rawChiTienBang) : null
    const chiTiet = rawCt ? JSON.parse(rawCt) : null
    if (Array.isArray(ChiTienBang) && Array.isArray(chiTiet)) {
      return { ChiTienBang: ChiTienBang.map((d: Partial<ChiTienBangRecord> & { id: string }) => normalizeChiTienBang(d)), chiTiet }
    }
  } catch {
    /* ignore */
  }
  return { ChiTienBang: [...MOCK_DON], chiTiet: [...MOCK_CHI_TIET] }
}

function saveToStorage(): void {
  try {
    if (typeof htqlEntityStorage !== 'undefined') {
      htqlEntityStorage.setItem(STORAGE_KEY_THU_TIEN_BANG, JSON.stringify(_ChiTienBangList))
      htqlEntityStorage.setItem(STORAGE_KEY_CHI_TIET, JSON.stringify(_chiTietList))
    }
  } catch {
    /* ignore */
  }
}

/** Draft các dòng đang nhập trong form (chỉ lưu cột hiển thị, bỏ _vthh để tránh object lớn). */
const STORAGE_KEY_DRAFT = 'htql_chi_tien_bang_draft'

export function getChiTienBangDraft(): ChiTienBangDraftLine[] | null {
  try {
    const raw = typeof htqlEntityStorage !== 'undefined' ? htqlEntityStorage.getItem(STORAGE_KEY_DRAFT) : null
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function setChiTienBangDraft(lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>): void {
  try {
    if (typeof htqlEntityStorage !== 'undefined') {
      const toSave = lines.map((l) => {
        const { _vthh, ...rest } = l
        return rest
      })
      htqlEntityStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(toSave))
    }
  } catch {
    /* ignore */
  }
}

export function clearChiTienBangDraft(): void {
  try {
    if (typeof htqlEntityStorage !== 'undefined') htqlEntityStorage.removeItem(STORAGE_KEY_DRAFT)
  } catch {
    /* ignore */
  }
}

/** Bản sao có thể xóa; khởi tạo từ htqlEntityStorage (nếu có) hoặc dữ liệu mẫu */
const _initial = loadFromStorage()
let _ChiTienBangList: ChiTienBangRecord[] = _initial.ChiTienBang
let _chiTietList: ChiTienBangChiTiet[] = _initial.chiTiet

export function chiTienBangReloadFromStorage(): void {
  const { ChiTienBang, chiTiet } = loadFromStorage()
  _ChiTienBangList = ChiTienBang
  _chiTietList = chiTiet
}

/** Lấy từ/đến theo kỳ: "tat-ca" | "tuan-nay" | "thang-nay" | "quy-nay" | "nam-nay" */
export function getDateRangeForKy(ky: string): { tu: string; den: string } {
  if (ky === 'tat-ca') return { tu: '', den: '' }
  const now = new Date()
  const den = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let tu: Date
  switch (ky) {
    case 'tuan-nay': {
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1
      tu = new Date(den)
      tu.setDate(tu.getDate() - diff)
      break
    }
    case 'thang-nay':
      tu = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'quy-nay': {
      const q = Math.floor(now.getMonth() / 3) + 1
      tu = new Date(now.getFullYear(), (q - 1) * 3, 1)
      break
    }
    case 'nam-nay':
      tu = new Date(now.getFullYear(), 0, 1)
      break
    default:
      // Đầu tháng đến hiện tại
      tu = new Date(now.getFullYear(), now.getMonth(), 1)
  }
  return {
    tu: formatLocalDate(tu),
    den: formatLocalDate(den),
  }
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export const KY_OPTIONS = [
  { value: 'tat-ca', label: 'Tất cả' },
  { value: 'tuan-nay', label: 'Tuần này' },
  { value: 'thang-nay', label: 'Tháng này' },
  { value: 'quy-nay', label: 'Quý này' },
  { value: 'nam-nay', label: 'Năm nay' },
] as const

export function chiTienBangGetAll(filter: ChiTienBangFilter): ChiTienBangRecord[] {
  const { tu, den } = filter
  if (!tu || !den) return [..._ChiTienBangList]
  return _ChiTienBangList.filter((d) => {
    const ngay = d.ngay_chi_tien_bang
    return ngay >= tu && ngay <= den
  })
}

export function chiTienBangGetChiTiet(chiTienBangId: string): ChiTienBangChiTiet[] {
  return _chiTietList.filter((c) => c.chi_tien_bang_id === chiTienBangId)
}

/** [YC30] Trạng thái báo giá - 5 options mới */
export const TINH_TRANG_BAO_GIA = [
  'Mới tạo',
  'Đã gửi KH',
  'Đã chuyển ĐHB',
  'Đã chuyển HĐ',
  'KH không đồng ý',
] as const

export const TINH_TRANG_BAO_GIA_DA_GUI_KHACH = 'Đã gửi KH'
export const TINH_TRANG_NVTHH_DA_NHAP_KHO = 'Đã nhập kho'
export const TINH_TRANG_BG_DA_CHUYEN_DHB = 'Đã chuyển ĐHB'
export const TINH_TRANG_BG_DA_CHUYEN_HD = 'Đã chuyển HĐ'
export const TINH_TRANG_BG_KH_KHONG_DONG_Y = 'KH không đồng ý'
export const TINH_TRANG_BG_MOI_TAO = 'Mới tạo'

/** Khóa chỉnh sửa form khi đã tạo giao dịch / KH không đồng ý (YC 50). */
export function chiTienBangBiKhoaChinhSuaTheoTinhTrang(tinh_trang: string): boolean {
  const t = (tinh_trang ?? '').trim()
  return t === TINH_TRANG_BG_DA_CHUYEN_DHB || t === TINH_TRANG_BG_DA_CHUYEN_HD || t === TINH_TRANG_BG_KH_KHONG_DONG_Y
}

/** Cập nhật tình trạng (và tùy chọn ghi chú) từ menu Tạo giao dịch — giữ nguyên chi tiết. */
export function chiTienBangCapNhatTuMenuTaoGd(
  chiTienBangId: string,
  patch: { tinh_trang: string; dien_giai?: string },
): void {
  const row = _ChiTienBangList.find((d) => d.id === chiTienBangId)
  if (!row) return
  const ct = chiTienBangGetChiTiet(chiTienBangId)
  const base = chiTienBangBuildCreatePayloadFromRecord(row, ct)
  chiTienBangPut(chiTienBangId, {
    ...base,
    tinh_trang: patch.tinh_trang,
    dien_giai: patch.dien_giai !== undefined ? patch.dien_giai : base.dien_giai,
  })
}

/** Đồng bộ UI danh sách báo giá khi hoàn tác trạng thái từ module khác (vd. xóa HĐ bán). */
export const HTQL_CHI_TIEN_BANG_RELOAD_EVENT = 'htql-bao-gia-reload'

/**
 * Sau khi xóa ĐHB: nếu không còn đơn hàng bán nào có `chi_tien_bang_id` trùng, hoàn tác báo giá
 * từ «Đã chuyển ĐHB» → «Mới tạo» (YC51).
 */
export function chiTienBangHoanTacKhiHetLienKetDonHangBan(
  chiTienBangId: string | null | undefined,
  cacDonHangBanConLai: { chi_tien_bang_id?: string }[],
): void {
  const id = (chiTienBangId ?? '').trim()
  if (!id) return
  const still = cacDonHangBanConLai.some((d) => (d.chi_tien_bang_id ?? '').trim() === id)
  if (still) return
  const row = _ChiTienBangList.find((r) => r.id === id)
  if (!row) return
  if ((row.tinh_trang ?? '').trim() !== TINH_TRANG_BG_DA_CHUYEN_DHB) return
  chiTienBangCapNhatTuMenuTaoGd(id, { tinh_trang: TINH_TRANG_BG_MOI_TAO })
}

/**
 * Sau khi xóa HĐ bán: nếu không còn hợp đồng nào có `chi_tien_bang_id` trùng, hoàn tác báo giá
 * từ «Đã chuyển HĐ» → «Mới tạo» (YC51).
 */
export function chiTienBangHoanTacKhiHetLienKetHopDongBan(
  chiTienBangId: string | null | undefined,
  cacHopDongConLai: { chi_tien_bang_id?: string }[],
): void {
  const id = (chiTienBangId ?? '').trim()
  if (!id) return
  const still = cacHopDongConLai.some((d) => (d.chi_tien_bang_id ?? '').trim() === id)
  if (still) return
  const row = _ChiTienBangList.find((r) => r.id === id)
  if (!row) return
  if ((row.tinh_trang ?? '').trim() !== TINH_TRANG_BG_DA_CHUYEN_HD) return
  chiTienBangCapNhatTuMenuTaoGd(id, { tinh_trang: TINH_TRANG_BG_MOI_TAO })
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HTQL_CHI_TIEN_BANG_RELOAD_EVENT))
  }
}

/** Ghép payload PUT từ bản ghi + chi tiết (dùng modal hủy/phục hồi và đồng bộ tình trạng). */
export function chiTienBangBuildCreatePayloadFromRecord(row: ChiTienBangRecord, ct: ChiTienBangChiTiet[]): ChiTienBangCreatePayload {
  return {
    loai_khach_hang: row.loai_khach_hang,
    ten_nguoi_lien_he: row.ten_nguoi_lien_he,
    so_dien_thoai_lien_he: row.so_dien_thoai_lien_he,
    tinh_trang: row.tinh_trang,
    ngay_chi_tien_bang: row.ngay_chi_tien_bang,
    so_chi_tien_bang: row.so_chi_tien_bang,
    ngay_giao_hang: row.ngay_giao_hang,
    khach_hang: row.khach_hang,
    dia_chi: row.dia_chi ?? '',
    nguoi_giao_hang: row.nguoi_giao_hang,
    ma_so_thue: row.ma_so_thue ?? '',
    dien_giai: row.dien_giai ?? '',
    nv_ban_hang: row.nv_ban_hang ?? '',
    dieu_khoan_tt: row.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: row.so_ngay_duoc_no ?? '0',
    dieu_khoan_khac: row.dieu_khoan_khac ?? '',
    tong_tien_hang: row.tong_tien_hang,
    tong_thue_gtgt: row.tong_thue_gtgt,
    tong_thanh_toan: row.tong_thanh_toan,
    ap_dung_vat_gtgt: row.ap_dung_vat_gtgt,
    tl_ck: row.tl_ck,
    tien_ck: row.tien_ck,
    so_dien_thoai: row.so_dien_thoai,
    so_chung_tu_cukcuk: row.so_chung_tu_cukcuk ?? '',
    doi_chieu_don_mua_id: row.doi_chieu_don_mua_id,
    attachments: row.attachments?.length ? row.attachments.map((a) => ({ ...a })) : undefined,
    hinh_thuc: row.hinh_thuc,
    dia_chi_cong_trinh: row.dia_chi_cong_trinh,
    chung_tu_mua_loai_chung_tu: row.chung_tu_mua_loai_chung_tu,
    chung_tu_mua_chua_thanh_toan: row.chung_tu_mua_chua_thanh_toan,
    chung_tu_mua_thanh_toan_ngay: row.chung_tu_mua_thanh_toan_ngay,
    chung_tu_mua_pttt: row.chung_tu_mua_pttt,
    chung_tu_mua_ck: row.chung_tu_mua_ck,
    chung_tu_mua_loai_hd: row.chung_tu_mua_loai_hd,
    chung_tu_mua_so_hoa_don: row.chung_tu_mua_so_hoa_don,
    hoa_don_ngay: row.hoa_don_ngay,
    hoa_don_ky_hieu: row.hoa_don_ky_hieu,
    mau_hoa_don_ma: row.mau_hoa_don_ma,
    mau_hoa_don_ten: row.mau_hoa_don_ten,
    phieu_chi_nha_cung_cap: row.phieu_chi_nha_cung_cap,
    phieu_chi_dia_chi: row.phieu_chi_dia_chi,
    phieu_chi_nguoi_nhan_tien: row.phieu_chi_nguoi_nhan_tien,
    phieu_chi_ly_do: row.phieu_chi_ly_do,
    phieu_chi_ngay: row.phieu_chi_ngay,
    phieu_chi_tai_khoan_chi: row.phieu_chi_tai_khoan_chi,
    phieu_chi_ngan_hang_chi: row.phieu_chi_ngan_hang_chi,
    phieu_chi_ten_nguoi_gui: row.phieu_chi_ten_nguoi_gui,
    phieu_chi_tai_khoan_nhan: row.phieu_chi_tai_khoan_nhan,
    phieu_chi_ngan_hang_nhan: row.phieu_chi_ngan_hang_nhan,
    phieu_chi_ten_chu_tk_nhan: row.phieu_chi_ten_chu_tk_nhan,
    phieu_chi_ngan_hang: row.phieu_chi_ngan_hang_nhan ?? row.phieu_chi_ngan_hang,
    phieu_chi_ten_nguoi_nhan_ck: row.phieu_chi_ten_chu_tk_nhan ?? row.phieu_chi_ten_nguoi_nhan_ck,
    phieu_chi_attachments: row.phieu_chi_attachments?.length ? row.phieu_chi_attachments.map((a) => ({ ...a })) : undefined,
    ly_do_chi_phieu: row.ly_do_chi_phieu,
    chi_tien_mat: row.chi_tien_mat,
    chi_qua_ngan_hang: row.chi_qua_ngan_hang,
    ngay_hach_toan: row.ngay_hach_toan,
    phieu_tai_khoan_id: row.phieu_tai_khoan_id,
    chiTiet: ct.map((c) => ({
      ma_hang: c.ma_hang,
      ten_hang: c.ten_hang,
      dvt: c.dvt,
      so_luong: c.so_luong,
      don_gia: c.don_gia,
      thanh_tien: c.thanh_tien,
      pt_thue_gtgt: c.pt_thue_gtgt,
      tien_thue_gtgt: c.tien_thue_gtgt,
      noi_dung: c.noi_dung ?? '',
      ghi_chu: c.ghi_chu ?? '',
    })),
  }
}

/** Cập nhật tình trạng báo giá (giữ nguyên chi tiết và các trường khác). */
export function chiTienBangSetTinhTrang(chiTienBangId: string, tinh_trang: string): void {
  const row = _ChiTienBangList.find((d) => d.id === chiTienBangId)
  if (!row) return
  const ct = chiTienBangGetChiTiet(chiTienBangId)
  chiTienBangPut(chiTienBangId, { ...chiTienBangBuildCreatePayloadFromRecord(row, ct), tinh_trang })
}

/** Prefix JSON dòng phiếu thu — đồng bộ với `ChiTienForm.tsx`. */
const PHIEU_CHI_ROW_PREFIX_DONG_BO = '__PC_ROW__:'

function isPhieuChiKhachRecord(r: ChiTienBangRecord): boolean {
  return r.ly_do_chi_phieu === 'chi_nha_cung_cap' || r.ly_do_chi_phieu === 'chi_khac'
}

function khachHangKhopDongBo(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function tienThuChoMaDonHang(ct: ChiTienBangChiTiet[], maChungTu: string): number {
  const m = maChungTu.trim()
  if (!m) return 0
  let s = 0
  for (const line of ct) {
    const ma = (line.ma_hang ?? '').trim()
    if (ma !== m) continue
    const tt = line.thanh_tien
    if (typeof tt === 'number' && Number.isFinite(tt)) {
      s += tt
      continue
    }
    const dg = typeof line.don_gia === 'number' ? line.don_gia : 0
    const sl = typeof line.so_luong === 'number' ? line.so_luong : 0
    s += dg * sl
  }
  return s
}

function mapChiTietDongBoMaDon(
  ct: ChiTienBangChiTiet[],
  maDon: string,
  phai: number,
  soChuaTruocPhieu: number,
): ChiTienBangChiTiet[] {
  const ma = maDon.trim()
  return ct.map((line) => {
    const lineMa = (line.ma_hang ?? '').trim()
    if (lineMa !== ma) return line
    const raw = (line.noi_dung ?? '').trim()
    if (raw.startsWith(PHIEU_CHI_ROW_PREFIX_DONG_BO)) {
      try {
        const j = JSON.parse(raw.slice(PHIEU_CHI_ROW_PREFIX_DONG_BO.length)) as Record<string, unknown>
        const soPhaiStr = formatSoTienHienThi(phai)
        const soChuaStr = formatSoTienHienThi(soChuaTruocPhieu)
        const thuNum = parseFloatVN(String(j.thu_lan_nay ?? '0'))
        const thuCapped = Math.min(Number.isFinite(thuNum) ? thuNum : 0, soChuaTruocPhieu)
        const thuStr = formatSoTienHienThi(thuCapped)
        const newJ = { ...j, so_phai_thu: soPhaiStr, so_chua_thu: soChuaStr, thu_lan_nay: thuStr }
        return {
          ...line,
          noi_dung: PHIEU_CHI_ROW_PREFIX_DONG_BO + JSON.stringify(newJ),
          don_gia: thuCapped,
          so_luong: 1,
          thanh_tien: thuCapped,
        }
      } catch {
        return line
      }
    }
    const tt0 =
      typeof line.thanh_tien === 'number' && Number.isFinite(line.thanh_tien)
        ? line.thanh_tien
        : (typeof line.don_gia === 'number' ? line.don_gia : 0) * (typeof line.so_luong === 'number' ? line.so_luong : 0)
    const capped = Math.min(tt0, soChuaTruocPhieu)
    return { ...line, don_gia: capped, so_luong: 1, thanh_tien: capped }
  })
}

/**
 * Sau khi xóa/đổi phiếu chi: cập nhật lại số tiền trong JSON dòng theo thứ tự lập.
 */
export function dongBoLaiNoiDungPhieuChiTheoMaDonHang(khachHang: string, maDonHang: string): void {
  const kh = khachHang.trim()
  const ma = maDonHang.trim()
  if (!kh || !ma) return
  const allDhb = donHangBanGetAll({ ky: 'tat-ca', tu: '', den: '' })
  const dhb = allDhb.find((r) => (r.so_don_hang ?? '').trim() === ma && khachHangKhopDongBo(r.khach_hang ?? '', kh))
  if (!dhb) return
  const phai =
    typeof dhb.tong_thanh_toan === 'number' && Number.isFinite(dhb.tong_thanh_toan) ? dhb.tong_thanh_toan : 0

  const candidates = _ChiTienBangList
    .filter((r) => isPhieuChiKhachRecord(r) && khachHangKhopDongBo(r.khach_hang ?? '', kh))
    .map((r) => {
      const ct = chiTienBangGetChiTiet(r.id)
      const t = tienThuChoMaDonHang(ct, ma)
      return { r, t, ct }
    })
    .filter((x) => x.t > 0)

  candidates.sort((a, b) => {
    const na = (a.r.ngay_chi_tien_bang ?? '').localeCompare(b.r.ngay_chi_tien_bang ?? '')
    if (na !== 0) return na
    return String(a.r.id).localeCompare(String(b.r.id))
  })

  let lapTruoc = 0
  for (const { r, ct } of candidates) {
    const soChua = Math.max(0, phai - lapTruoc)
    const newCt = mapChiTietDongBoMaDon(ct, ma, phai, soChua)
    const row = _ChiTienBangList.find((d) => d.id === r.id)
    if (!row) continue
    chiTienBangPut(r.id, chiTienBangBuildCreatePayloadFromRecord(row, newCt))
    const after = chiTienBangGetChiTiet(r.id)
    lapTruoc += tienThuChoMaDonHang(after, ma)
  }
}

function chiTienBangDangLienKetNguon(chiTienBangId: string): boolean {
  const id = (chiTienBangId ?? '').trim()
  if (!id) return false
  const filterTatCa = { ky: 'tat-ca' as const, tu: '', den: '' }
  if (donHangBanGetAll(filterTatCa).some((row) => donHangBanChiTienBangIdsLinked(row).includes(id))) return true
  if (hopDongBanChungTuGetAll(filterTatCa).some((row) => hopDongBanChiTienBangIdsLinked(row).includes(id))) return true
  if (phuLucHopDongBanChungTuGetAll(filterTatCa).some((row) => phuLucHopDongBanChiTienBangIdsLinked(row).includes(id))) return true
  return false
}

/** Xóa báo giá và toàn bộ chi tiết của báo giá. */
export function chiTienBangDelete(chiTienBangId: string): void {
  if (chiTienBangDangLienKetNguon(chiTienBangId)) {
    throw new Error('Phiếu chi đang liên kết chứng từ nguồn, không thể xóa.')
  }
  const row = _ChiTienBangList.find((d) => d.id === chiTienBangId)
  const kh = row?.khach_hang?.trim() ?? ''
  const ctBefore = row ? _chiTietList.filter((c) => c.chi_tien_bang_id === chiTienBangId) : []
  const maDonSet = new Set<string>()
  for (const line of ctBefore) {
    const mh = (line.ma_hang ?? '').trim()
    if (mh) maDonSet.add(mh)
    const raw = (line.noi_dung ?? '').trim()
    if (raw.startsWith(PHIEU_CHI_ROW_PREFIX_DONG_BO)) {
      try {
        const j = JSON.parse(raw.slice(PHIEU_CHI_ROW_PREFIX_DONG_BO.length)) as { ma_chung_tu?: string }
        const m = (j.ma_chung_tu ?? '').trim()
        if (m) maDonSet.add(m)
      } catch {
        /* ignore */
      }
    }
  }
  _ChiTienBangList = _ChiTienBangList.filter((d) => d.id !== chiTienBangId)
  _chiTietList = _chiTietList.filter((c) => c.chi_tien_bang_id !== chiTienBangId)
  saveToStorage()
  donHangBanHoanTacKhiXoaChiTien(chiTienBangId)
  hopDongBanHoanTacKhiXoaChiTien(chiTienBangId)
  phuLucHopDongBanHoanTacKhiXoaChiTien(chiTienBangId)
  if (kh) {
    for (const ma of maDonSet) {
      dongBoLaiNoiDungPhieuChiTheoMaDonHang(kh, ma)
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HTQL_CHI_TIEN_BANG_RELOAD_EVENT))
  }
}

/** Tạo báo giá mới (thêm vào danh sách nội bộ). Trả về bản ghi báo giá vừa tạo. */
export async function chiTienBangPost(payload: ChiTienBangCreatePayload): Promise<ChiTienBangRecord> {
  const year = getCurrentYear()
  const hint = hintMaxSerialForYearPrefix(year, MODULE_PREFIX, _ChiTienBangList.map((d) => d.so_chi_tien_bang))
  const soCt = await allocateMaHeThongFromServer({
    seqKey: 'PC',
    modulePrefix: MODULE_PREFIX,
    hintMaxSerial: hint,
    year,
  })
  const id = `bg${Date.now()}`
  const ChiTienBangRow: ChiTienBangRecord = {
    id,
    loai_khach_hang: payload.loai_khach_hang,
    ten_nguoi_lien_he: payload.ten_nguoi_lien_he,
    so_dien_thoai_lien_he: payload.so_dien_thoai_lien_he,
    tinh_trang: payload.tinh_trang,
    ngay_chi_tien_bang: payload.ngay_chi_tien_bang,
    so_chi_tien_bang: soCt,
    ngay_giao_hang: payload.ngay_giao_hang,
    khach_hang: payload.khach_hang,
    dia_chi: payload.dia_chi ?? '',
    nguoi_giao_hang: payload.nguoi_giao_hang ?? undefined,
    ma_so_thue: payload.ma_so_thue ?? '',
    dien_giai: payload.dien_giai ?? '',
    nv_ban_hang: payload.nv_ban_hang ?? '',
    dieu_khoan_tt: payload.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: payload.so_ngay_duoc_no ?? '0',
    dieu_khoan_khac: payload.dieu_khoan_khac ?? '',
    tong_tien_hang: payload.tong_tien_hang,
    tong_thue_gtgt: payload.tong_thue_gtgt,
    tong_thanh_toan: payload.tong_thanh_toan,
    ap_dung_vat_gtgt: payload.ap_dung_vat_gtgt,
    tl_ck: payload.tl_ck,
    tien_ck: payload.tien_ck,
    so_dien_thoai: payload.so_dien_thoai,
    so_chung_tu_cukcuk: payload.so_chung_tu_cukcuk ?? '',
    doi_chieu_don_mua_id: payload.doi_chieu_don_mua_id ?? undefined,
    attachments: payload.attachments ? [...payload.attachments] : undefined,
    hinh_thuc: payload.hinh_thuc,
    dia_chi_cong_trinh: payload.dia_chi_cong_trinh,
    chung_tu_mua_loai_chung_tu: payload.chung_tu_mua_loai_chung_tu,
    chung_tu_mua_chua_thanh_toan: payload.chung_tu_mua_chua_thanh_toan,
    chung_tu_mua_thanh_toan_ngay: payload.chung_tu_mua_thanh_toan_ngay,
    chung_tu_mua_pttt: payload.chung_tu_mua_pttt,
    chung_tu_mua_ck: payload.chung_tu_mua_ck,
    chung_tu_mua_loai_hd: payload.chung_tu_mua_loai_hd,
    chung_tu_mua_so_hoa_don: payload.chung_tu_mua_so_hoa_don,
    hoa_don_ngay: payload.hoa_don_ngay,
    hoa_don_ky_hieu: payload.hoa_don_ky_hieu,
    mau_hoa_don_ma: payload.mau_hoa_don_ma,
    mau_hoa_don_ten: payload.mau_hoa_don_ten,
    phieu_chi_nha_cung_cap: payload.phieu_chi_nha_cung_cap,
    phieu_chi_dia_chi: payload.phieu_chi_dia_chi,
    phieu_chi_nguoi_nhan_tien: payload.phieu_chi_nguoi_nhan_tien,
    phieu_chi_ly_do: payload.phieu_chi_ly_do,
    phieu_chi_ngay: payload.phieu_chi_ngay,
    phieu_chi_tai_khoan_chi: payload.phieu_chi_tai_khoan_chi,
    phieu_chi_ngan_hang_chi: payload.phieu_chi_ngan_hang_chi,
    phieu_chi_ten_nguoi_gui: payload.phieu_chi_ten_nguoi_gui,
    phieu_chi_tai_khoan_nhan: payload.phieu_chi_tai_khoan_nhan,
    phieu_chi_ngan_hang_nhan: payload.phieu_chi_ngan_hang_nhan,
    phieu_chi_ten_chu_tk_nhan: payload.phieu_chi_ten_chu_tk_nhan,
    phieu_chi_ngan_hang: payload.phieu_chi_ngan_hang,
    phieu_chi_ten_nguoi_nhan_ck: payload.phieu_chi_ten_nguoi_nhan_ck,
    phieu_chi_attachments: payload.phieu_chi_attachments ? [...payload.phieu_chi_attachments] : undefined,
    ly_do_chi_phieu: payload.ly_do_chi_phieu,
    chi_tien_mat: payload.chi_tien_mat,
    chi_qua_ngan_hang: payload.chi_qua_ngan_hang,
    ngay_hach_toan: payload.ngay_hach_toan,
    phieu_tai_khoan_id: payload.phieu_tai_khoan_id?.trim() || undefined,
  }
  _ChiTienBangList.push(ChiTienBangRow)
  payload.chiTiet.forEach((c, i) => {
    _chiTietList.push({
      id: `ct${id}-${i}`,
      chi_tien_bang_id: id,
      ma_hang: c.ma_hang,
      ten_hang: c.ten_hang,
      ma_quy_cach: '',
      dvt: c.dvt,
      chieu_dai: 0,
      chieu_rong: 0,
      chieu_cao: 0,
      ban_kinh: 0,
      luong: 0,
      so_luong: c.so_luong,
      so_luong_nhan: 0,
      don_gia: c.don_gia,
      thanh_tien: c.thanh_tien,
      pt_thue_gtgt: c.pt_thue_gtgt,
      tien_thue_gtgt: c.tien_thue_gtgt,
      lenh_san_xuat: '',
      noi_dung: c.noi_dung ?? '',
      ghi_chu: c.ghi_chu ?? '',
    })
  })
  saveToStorage()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HTQL_CHI_TIEN_BANG_RELOAD_EVENT))
  }
  return ChiTienBangRow
}

/** Cập nhật báo giá (xóa chi tiết cũ, ghi lại theo payload). */
export function chiTienBangPut(chiTienBangId: string, payload: ChiTienBangCreatePayload): void {
  if (chiTienBangDangLienKetNguon(chiTienBangId)) {
    throw new Error('Phiếu chi đang liên kết chứng từ nguồn, không thể chỉnh sửa.')
  }
  const idx = _ChiTienBangList.findIndex((d) => d.id === chiTienBangId)
  if (idx < 0) return
  _ChiTienBangList[idx] = {
    id: chiTienBangId,
    loai_khach_hang: payload.loai_khach_hang,
    ten_nguoi_lien_he: payload.ten_nguoi_lien_he,
    so_dien_thoai_lien_he: payload.so_dien_thoai_lien_he,
    tinh_trang: payload.tinh_trang,
    ngay_chi_tien_bang: payload.ngay_chi_tien_bang,
    so_chi_tien_bang: payload.so_chi_tien_bang,
    ngay_giao_hang: payload.ngay_giao_hang,
    khach_hang: payload.khach_hang,
    dia_chi: payload.dia_chi ?? '',
    nguoi_giao_hang: payload.nguoi_giao_hang ?? undefined,
    ma_so_thue: payload.ma_so_thue ?? '',
    dien_giai: payload.dien_giai ?? '',
    nv_ban_hang: payload.nv_ban_hang ?? '',
    dieu_khoan_tt: payload.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: payload.so_ngay_duoc_no ?? '0',
    dieu_khoan_khac: payload.dieu_khoan_khac ?? '',
    tong_tien_hang: payload.tong_tien_hang,
    tong_thue_gtgt: payload.tong_thue_gtgt,
    tong_thanh_toan: payload.tong_thanh_toan,
    ap_dung_vat_gtgt: payload.ap_dung_vat_gtgt,
    tl_ck: payload.tl_ck,
    tien_ck: payload.tien_ck,
    so_dien_thoai: payload.so_dien_thoai,
    so_chung_tu_cukcuk: payload.so_chung_tu_cukcuk ?? '',
    doi_chieu_don_mua_id: payload.doi_chieu_don_mua_id ?? undefined,
    attachments: payload.attachments ? [...payload.attachments] : undefined,
    hinh_thuc: payload.hinh_thuc,
    dia_chi_cong_trinh: payload.dia_chi_cong_trinh,
    chung_tu_mua_loai_chung_tu: payload.chung_tu_mua_loai_chung_tu,
    chung_tu_mua_chua_thanh_toan: payload.chung_tu_mua_chua_thanh_toan,
    chung_tu_mua_thanh_toan_ngay: payload.chung_tu_mua_thanh_toan_ngay,
    chung_tu_mua_pttt: payload.chung_tu_mua_pttt,
    chung_tu_mua_ck: payload.chung_tu_mua_ck,
    chung_tu_mua_loai_hd: payload.chung_tu_mua_loai_hd,
    chung_tu_mua_so_hoa_don: payload.chung_tu_mua_so_hoa_don,
    hoa_don_ngay: payload.hoa_don_ngay,
    hoa_don_ky_hieu: payload.hoa_don_ky_hieu,
    mau_hoa_don_ma: payload.mau_hoa_don_ma,
    mau_hoa_don_ten: payload.mau_hoa_don_ten,
    phieu_chi_nha_cung_cap: payload.phieu_chi_nha_cung_cap,
    phieu_chi_dia_chi: payload.phieu_chi_dia_chi,
    phieu_chi_nguoi_nhan_tien: payload.phieu_chi_nguoi_nhan_tien,
    phieu_chi_ly_do: payload.phieu_chi_ly_do,
    phieu_chi_ngay: payload.phieu_chi_ngay,
    phieu_chi_tai_khoan_chi: payload.phieu_chi_tai_khoan_chi,
    phieu_chi_ngan_hang_chi: payload.phieu_chi_ngan_hang_chi,
    phieu_chi_ten_nguoi_gui: payload.phieu_chi_ten_nguoi_gui,
    phieu_chi_tai_khoan_nhan: payload.phieu_chi_tai_khoan_nhan,
    phieu_chi_ngan_hang_nhan: payload.phieu_chi_ngan_hang_nhan,
    phieu_chi_ten_chu_tk_nhan: payload.phieu_chi_ten_chu_tk_nhan,
    phieu_chi_ngan_hang: payload.phieu_chi_ngan_hang,
    phieu_chi_ten_nguoi_nhan_ck: payload.phieu_chi_ten_nguoi_nhan_ck,
    phieu_chi_attachments: payload.phieu_chi_attachments ? [...payload.phieu_chi_attachments] : undefined,
    ly_do_chi_phieu: payload.ly_do_chi_phieu,
    chi_tien_mat: payload.chi_tien_mat,
    chi_qua_ngan_hang: payload.chi_qua_ngan_hang,
    ngay_hach_toan: payload.ngay_hach_toan,
    phieu_tai_khoan_id: payload.phieu_tai_khoan_id?.trim() || undefined,
  }
  _chiTietList = _chiTietList.filter((c) => c.chi_tien_bang_id !== chiTienBangId)
  payload.chiTiet.forEach((c, i) => {
    _chiTietList.push({
      id: `ct${chiTienBangId}-${i}`,
      chi_tien_bang_id: chiTienBangId,
      ma_hang: c.ma_hang,
      ten_hang: c.ten_hang,
      ma_quy_cach: '',
      dvt: c.dvt,
      chieu_dai: 0,
      chieu_rong: 0,
      chieu_cao: 0,
      ban_kinh: 0,
      luong: 0,
      so_luong: c.so_luong,
      so_luong_nhan: 0,
      don_gia: c.don_gia,
      thanh_tien: c.thanh_tien,
      pt_thue_gtgt: c.pt_thue_gtgt,
      tien_thue_gtgt: c.tien_thue_gtgt,
      lenh_san_xuat: '',
      noi_dung: c.noi_dung ?? '',
      ghi_chu: c.ghi_chu ?? '',
    })
  })
  saveToStorage()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HTQL_CHI_TIEN_BANG_RELOAD_EVENT))
  }
}

export function getDefaultChiTienBangFilter(): ChiTienBangFilter {
  const ky = 'thang-nay' as KyValue
  const { tu, den } = getDateRangeForKy(ky)
  return { ky, tu, den }
}

/** Trả về số báo giá tiếp theo (2026/BG/1, 2026/BG/2...) — reset mỗi năm. */
export function chiTienBangSoDonHangTiepTheo(): string {
  const year = getCurrentYear()
  let maxSo = 0
  for (const d of _ChiTienBangList) {
    const s = (d.so_chi_tien_bang || '').trim()
    const match = s.match(new RegExp(`^${year}/${MODULE_PREFIX}/(\\d+)$`))
    if (!match) continue
    const n = parseInt(match[1], 10)
    if (n > maxSo) maxSo = n
  }
  return maFormatHeThong(MODULE_PREFIX, maxSo + 1)
}

/** Gói API mặc định cho `ChiTienBangApiProvider` (dùng từ module Thu tiền / Đơn hàng bán). */
export const ChiTienBangApiImpl: ChiTienBangApi = {
  getAll: chiTienBangGetAll,
  getChiTiet: chiTienBangGetChiTiet,
  delete: chiTienBangDelete,
  getDefaultFilter: getDefaultChiTienBangFilter,
  getDateRangeForKy,
  KY_OPTIONS,
  post: chiTienBangPost,
  put: chiTienBangPut,
  soDonHangTiepTheo: chiTienBangSoDonHangTiepTheo,
  getDraft: getChiTienBangDraft,
  setDraft: setChiTienBangDraft,
  clearDraft: clearChiTienBangDraft,
}
