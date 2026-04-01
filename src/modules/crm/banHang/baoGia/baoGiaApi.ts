/**
 * API và types cho Báo giá (header + chi tiết dòng).
 * Mã: {Năm}/BG/{Số} — rule ma-he-thong.mdc
 * 
 * [YC24 Mục 7] Endpoint backend (khi có): /api/sales/quotes
 * Hiện tại: localStorage-based (tách biệt khỏi /api/purchase/orders)
 */

import { maFormatHeThong, getCurrentYear } from '../../../../utils/maFormat'
import type {
  BaoGiaAttachmentItem,
  BaoGiaChiTiet,
  BaoGiaCreatePayload,
  BaoGiaDraftLine,
  BaoGiaFilter,
  BaoGiaKyValue,
  BaoGiaRecord,
} from '../../../../types/baoGia'

export type {
  BaoGiaAttachmentItem,
  BaoGiaChiTiet,
  BaoGiaCreatePayload,
  BaoGiaDraftLine,
  BaoGiaFilter,
  BaoGiaKyValue,
  BaoGiaRecord,
} from '../../../../types/baoGia'

/** Alias tương thích — cùng nghĩa với BaoGiaKyValue. */
export type KyValue = BaoGiaKyValue

/** Dữ liệu mẫu báo giá */
const MOCK_DON: BaoGiaRecord[] = [
  {
    id: 'bg1',
    tinh_trang: 'Chưa thực hiện',
    ngay_bao_gia: '2026-03-10',
    so_bao_gia: 'BG00001',
    ngay_giao_hang: null,
    khach_hang: 'CÔNG TY TNHH QUẢNG CÁO VAX',
    dia_chi: '',
    ma_so_thue: '',
    dien_giai: '',
    nv_ban_hang: '',
    dieu_khoan_tt: '',
    so_ngay_duoc_no: '0',
    dia_diem_giao_hang: '',
    dieu_khoan_khac: '',
    tong_tien_hang: 4000000,
    tong_thue_gtgt: 0,
    tong_thanh_toan: 4000000,
    so_chung_tu_cukcuk: '',
  },
  {
    id: 'bg2',
    tinh_trang: 'Đang thực hiện',
    ngay_bao_gia: '2026-03-12',
    so_bao_gia: 'BG00002',
    ngay_giao_hang: '2026-03-20',
    khach_hang: 'CÔNG TY CP NGUYÊN VẬT LIỆU ABC',
    dia_chi: '',
    ma_so_thue: '',
    dien_giai: 'Đơn hàng vật tư quý 1',
    nv_ban_hang: '',
    dieu_khoan_tt: '',
    so_ngay_duoc_no: '0',
    dia_diem_giao_hang: '',
    dieu_khoan_khac: '',
    tong_tien_hang: 15000000,
    tong_thue_gtgt: 0,
    tong_thanh_toan: 15000000,
    so_chung_tu_cukcuk: 'CUKCUK-2026-001',
  },
  {
    id: 'bg3',
    tinh_trang: 'Chưa thực hiện',
    ngay_bao_gia: '2026-03-15',
    so_bao_gia: 'BG00003',
    ngay_giao_hang: null,
    khach_hang: 'CÔNG TY TNHH DỊCH VỤ XYZ',
    dia_chi: '',
    ma_so_thue: '',
    dien_giai: '',
    nv_ban_hang: '',
    dieu_khoan_tt: '',
    so_ngay_duoc_no: '0',
    dia_diem_giao_hang: '',
    dieu_khoan_khac: '',
    tong_tien_hang: 8500000,
    tong_thue_gtgt: 0,
    tong_thanh_toan: 8500000,
    so_chung_tu_cukcuk: '',
  },
]

/** Chi tiết theo báo giá */
const MOCK_CHI_TIET: BaoGiaChiTiet[] = [
  {
    id: 'ct1',
    bao_gia_id: 'bg1',
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
    dd_gh_index: 0,
  },
]

const STORAGE_KEY_BAO_GIA = 'htql_bao_gia_list'
const STORAGE_KEY_CHI_TIET = 'htql_bao_gia_chi_tiet'

function normalizeBaoGia(d: Partial<BaoGiaRecord> & { id: string; de_xuat_id?: string }): BaoGiaRecord {
  const legacyDx = (d as { de_xuat_id?: string }).de_xuat_id
  const doiChieu = d.doi_chieu_don_mua_id ?? legacyDx
  return {
    id: d.id,
    loai_khach_hang: d.loai_khach_hang ?? undefined,
    ten_nguoi_lien_he: d.ten_nguoi_lien_he ?? undefined,
    so_dien_thoai_lien_he: d.so_dien_thoai_lien_he ?? undefined,
    tinh_trang: d.tinh_trang ?? 'Chưa thực hiện',
    ngay_bao_gia: d.ngay_bao_gia ?? '',
    so_bao_gia: d.so_bao_gia ?? '',
    ngay_giao_hang: d.ngay_giao_hang ?? null,
    khach_hang: d.khach_hang ?? '',
    dia_chi: d.dia_chi ?? '',
    nguoi_giao_hang: d.nguoi_giao_hang ?? undefined,
    ma_so_thue: d.ma_so_thue ?? '',
    dien_giai: d.dien_giai ?? '',
    nv_ban_hang: d.nv_ban_hang ?? '',
    dieu_khoan_tt: d.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: d.so_ngay_duoc_no ?? '0',
    dia_diem_giao_hang: d.dia_diem_giao_hang ?? '',
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
    attachments: Array.isArray((d as { attachments?: BaoGiaAttachmentItem[] }).attachments)
      ? (d as { attachments: BaoGiaAttachmentItem[] }).attachments
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
  }
}

function loadFromStorage(): { baoGia: BaoGiaRecord[]; chiTiet: BaoGiaChiTiet[] } {
  try {
    const rawBaoGia = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_BAO_GIA) : null
    const rawCt = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CHI_TIET) : null
    const baoGia = rawBaoGia ? JSON.parse(rawBaoGia) : null
    const chiTiet = rawCt ? JSON.parse(rawCt) : null
    if (Array.isArray(baoGia) && Array.isArray(chiTiet)) {
      return { baoGia: baoGia.map((d: Partial<BaoGiaRecord> & { id: string }) => normalizeBaoGia(d)), chiTiet }
    }
  } catch {
    /* ignore */
  }
  return { baoGia: [...MOCK_DON], chiTiet: [...MOCK_CHI_TIET] }
}

function saveToStorage(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_BAO_GIA, JSON.stringify(_baoGiaList))
      localStorage.setItem(STORAGE_KEY_CHI_TIET, JSON.stringify(_chiTietList))
    }
  } catch {
    /* ignore */
  }
}

/** Draft các dòng đang nhập trong form (chỉ lưu cột hiển thị, bỏ _vthh để tránh object lớn). */
const STORAGE_KEY_DRAFT = 'htql_bao_gia_draft'

export function getBaoGiaDraft(): BaoGiaDraftLine[] | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DRAFT) : null
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function setBaoGiaDraft(lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const toSave = lines.map((l) => {
        const { _vthh, ...rest } = l
        return rest
      })
      localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(toSave))
    }
  } catch {
    /* ignore */
  }
}

export function clearBaoGiaDraft(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY_DRAFT)
  } catch {
    /* ignore */
  }
}

/** Bản sao có thể xóa; khởi tạo từ localStorage (nếu có) hoặc dữ liệu mẫu */
const _initial = loadFromStorage()
let _baoGiaList: BaoGiaRecord[] = _initial.baoGia
let _chiTietList: BaoGiaChiTiet[] = _initial.chiTiet

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

export function baoGiaGetAll(filter: BaoGiaFilter): BaoGiaRecord[] {
  const { tu, den } = filter
  if (!tu || !den) return [..._baoGiaList]
  return _baoGiaList.filter((d) => {
    const ngay = d.ngay_bao_gia
    return ngay >= tu && ngay <= den
  })
}

export function baoGiaGetChiTiet(baoGiaId: string): BaoGiaChiTiet[] {
  return _chiTietList.filter((c) => c.bao_gia_id === baoGiaId)
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
export function baoGiaBiKhoaChinhSuaTheoTinhTrang(tinh_trang: string): boolean {
  const t = (tinh_trang ?? '').trim()
  return t === TINH_TRANG_BG_DA_CHUYEN_DHB || t === TINH_TRANG_BG_DA_CHUYEN_HD || t === TINH_TRANG_BG_KH_KHONG_DONG_Y
}

/** Cập nhật tình trạng (và tùy chọn ghi chú) từ menu Tạo giao dịch — giữ nguyên chi tiết. */
export function baoGiaCapNhatTuMenuTaoGd(
  baoGiaId: string,
  patch: { tinh_trang: string; dien_giai?: string },
): void {
  const row = _baoGiaList.find((d) => d.id === baoGiaId)
  if (!row) return
  const ct = baoGiaGetChiTiet(baoGiaId)
  const base = baoGiaBuildCreatePayloadFromRecord(row, ct)
  baoGiaPut(baoGiaId, {
    ...base,
    tinh_trang: patch.tinh_trang,
    dien_giai: patch.dien_giai !== undefined ? patch.dien_giai : base.dien_giai,
  })
}

/** Đồng bộ UI danh sách báo giá khi hoàn tác trạng thái từ module khác (vd. xóa HĐ bán). */
export const HTQL_BAO_GIA_RELOAD_EVENT = 'htql-bao-gia-reload'

/**
 * Sau khi xóa ĐHB: nếu không còn đơn hàng bán nào có `bao_gia_id` trùng, hoàn tác báo giá
 * từ «Đã chuyển ĐHB» → «Mới tạo» (YC51).
 */
export function baoGiaHoanTacKhiHetLienKetDonHangBan(
  baoGiaId: string | null | undefined,
  cacDonHangBanConLai: { bao_gia_id?: string }[],
): void {
  const id = (baoGiaId ?? '').trim()
  if (!id) return
  const still = cacDonHangBanConLai.some((d) => (d.bao_gia_id ?? '').trim() === id)
  if (still) return
  const row = _baoGiaList.find((r) => r.id === id)
  if (!row) return
  if ((row.tinh_trang ?? '').trim() !== TINH_TRANG_BG_DA_CHUYEN_DHB) return
  baoGiaCapNhatTuMenuTaoGd(id, { tinh_trang: TINH_TRANG_BG_MOI_TAO })
}

/**
 * Sau khi xóa HĐ bán: nếu không còn hợp đồng nào có `bao_gia_id` trùng, hoàn tác báo giá
 * từ «Đã chuyển HĐ» → «Mới tạo» (YC51).
 */
export function baoGiaHoanTacKhiHetLienKetHopDongBan(
  baoGiaId: string | null | undefined,
  cacHopDongConLai: { bao_gia_id?: string }[],
): void {
  const id = (baoGiaId ?? '').trim()
  if (!id) return
  const still = cacHopDongConLai.some((d) => (d.bao_gia_id ?? '').trim() === id)
  if (still) return
  const row = _baoGiaList.find((r) => r.id === id)
  if (!row) return
  if ((row.tinh_trang ?? '').trim() !== TINH_TRANG_BG_DA_CHUYEN_HD) return
  baoGiaCapNhatTuMenuTaoGd(id, { tinh_trang: TINH_TRANG_BG_MOI_TAO })
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HTQL_BAO_GIA_RELOAD_EVENT))
  }
}

/** Ghép payload PUT từ bản ghi + chi tiết (dùng modal hủy/phục hồi và đồng bộ tình trạng). */
export function baoGiaBuildCreatePayloadFromRecord(row: BaoGiaRecord, ct: BaoGiaChiTiet[]): BaoGiaCreatePayload {
  return {
    loai_khach_hang: row.loai_khach_hang,
    ten_nguoi_lien_he: row.ten_nguoi_lien_he,
    so_dien_thoai_lien_he: row.so_dien_thoai_lien_he,
    tinh_trang: row.tinh_trang,
    ngay_bao_gia: row.ngay_bao_gia,
    so_bao_gia: row.so_bao_gia,
    ngay_giao_hang: row.ngay_giao_hang,
    khach_hang: row.khach_hang,
    dia_chi: row.dia_chi ?? '',
    nguoi_giao_hang: row.nguoi_giao_hang,
    ma_so_thue: row.ma_so_thue ?? '',
    dien_giai: row.dien_giai ?? '',
    nv_ban_hang: row.nv_ban_hang ?? '',
    dieu_khoan_tt: row.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: row.so_ngay_duoc_no ?? '0',
    dia_diem_giao_hang: row.dia_diem_giao_hang ?? '',
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
    chiTiet: ct.map((c) => ({
      ma_hang: c.ma_hang,
      ten_hang: c.ten_hang,
      dvt: c.dvt,
      so_luong: c.so_luong,
      don_gia: c.don_gia,
      thanh_tien: c.thanh_tien,
      pt_thue_gtgt: c.pt_thue_gtgt,
      tien_thue_gtgt: c.tien_thue_gtgt,
      dd_gh_index: c.dd_gh_index ?? null,
      noi_dung: c.noi_dung ?? '',
      ghi_chu: c.ghi_chu ?? '',
      chieu_dai: c.chieu_dai,
      chieu_rong: c.chieu_rong,
      luong: c.luong,
    })),
  }
}

/** Cập nhật tình trạng báo giá (giữ nguyên chi tiết và các trường khác). */
export function baoGiaSetTinhTrang(baoGiaId: string, tinh_trang: string): void {
  const row = _baoGiaList.find((d) => d.id === baoGiaId)
  if (!row) return
  const ct = baoGiaGetChiTiet(baoGiaId)
  baoGiaPut(baoGiaId, { ...baoGiaBuildCreatePayloadFromRecord(row, ct), tinh_trang })
}

/** Xóa báo giá và toàn bộ chi tiết của báo giá. */
export function baoGiaDelete(baoGiaId: string): void {
  _baoGiaList = _baoGiaList.filter((d) => d.id !== baoGiaId)
  _chiTietList = _chiTietList.filter((c) => c.bao_gia_id !== baoGiaId)
  saveToStorage()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HTQL_BAO_GIA_RELOAD_EVENT))
  }
}

/** Tạo báo giá mới (thêm vào danh sách nội bộ). Trả về bản ghi báo giá vừa tạo. */
export function baoGiaPost(payload: BaoGiaCreatePayload): BaoGiaRecord {
  const id = `bg${Date.now()}`
  const baoGiaRow: BaoGiaRecord = {
    id,
    loai_khach_hang: payload.loai_khach_hang,
    ten_nguoi_lien_he: payload.ten_nguoi_lien_he,
    so_dien_thoai_lien_he: payload.so_dien_thoai_lien_he,
    tinh_trang: payload.tinh_trang,
    ngay_bao_gia: payload.ngay_bao_gia,
    so_bao_gia: payload.so_bao_gia,
    ngay_giao_hang: payload.ngay_giao_hang,
    khach_hang: payload.khach_hang,
    dia_chi: payload.dia_chi ?? '',
    nguoi_giao_hang: payload.nguoi_giao_hang ?? undefined,
    ma_so_thue: payload.ma_so_thue ?? '',
    dien_giai: payload.dien_giai ?? '',
    nv_ban_hang: payload.nv_ban_hang ?? '',
    dieu_khoan_tt: payload.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: payload.so_ngay_duoc_no ?? '0',
    dia_diem_giao_hang: payload.dia_diem_giao_hang ?? '',
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
  }
  _baoGiaList.push(baoGiaRow)
  payload.chiTiet.forEach((c, i) => {
    _chiTietList.push({
      id: `ct${id}-${i}`,
      bao_gia_id: id,
      ma_hang: c.ma_hang,
      ten_hang: c.ten_hang,
      ma_quy_cach: '',
      dvt: c.dvt,
      chieu_dai: c.chieu_dai ?? 0,
      chieu_rong: c.chieu_rong ?? 0,
      chieu_cao: 0,
      ban_kinh: 0,
      luong: c.luong ?? 0,
      so_luong: c.so_luong,
      so_luong_nhan: 0,
      don_gia: c.don_gia,
      thanh_tien: c.thanh_tien,
      pt_thue_gtgt: c.pt_thue_gtgt,
      tien_thue_gtgt: c.tien_thue_gtgt,
      lenh_san_xuat: '',
      dd_gh_index: c.dd_gh_index ?? null,
      noi_dung: c.noi_dung ?? '',
      ghi_chu: c.ghi_chu ?? '',
    })
  })
  saveToStorage()
  return baoGiaRow
}

/** Cập nhật báo giá (xóa chi tiết cũ, ghi lại theo payload). */
export function baoGiaPut(baoGiaId: string, payload: BaoGiaCreatePayload): void {
  const idx = _baoGiaList.findIndex((d) => d.id === baoGiaId)
  if (idx < 0) return
  _baoGiaList[idx] = {
    id: baoGiaId,
    loai_khach_hang: payload.loai_khach_hang,
    ten_nguoi_lien_he: payload.ten_nguoi_lien_he,
    so_dien_thoai_lien_he: payload.so_dien_thoai_lien_he,
    tinh_trang: payload.tinh_trang,
    ngay_bao_gia: payload.ngay_bao_gia,
    so_bao_gia: payload.so_bao_gia,
    ngay_giao_hang: payload.ngay_giao_hang,
    khach_hang: payload.khach_hang,
    dia_chi: payload.dia_chi ?? '',
    nguoi_giao_hang: payload.nguoi_giao_hang ?? undefined,
    ma_so_thue: payload.ma_so_thue ?? '',
    dien_giai: payload.dien_giai ?? '',
    nv_ban_hang: payload.nv_ban_hang ?? '',
    dieu_khoan_tt: payload.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: payload.so_ngay_duoc_no ?? '0',
    dia_diem_giao_hang: payload.dia_diem_giao_hang ?? '',
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
  }
  _chiTietList = _chiTietList.filter((c) => c.bao_gia_id !== baoGiaId)
  payload.chiTiet.forEach((c, i) => {
    _chiTietList.push({
      id: `ct${baoGiaId}-${i}`,
      bao_gia_id: baoGiaId,
      ma_hang: c.ma_hang,
      ten_hang: c.ten_hang,
      ma_quy_cach: '',
      dvt: c.dvt,
      chieu_dai: c.chieu_dai ?? 0,
      chieu_rong: c.chieu_rong ?? 0,
      chieu_cao: 0,
      ban_kinh: 0,
      luong: c.luong ?? 0,
      so_luong: c.so_luong,
      so_luong_nhan: 0,
      don_gia: c.don_gia,
      thanh_tien: c.thanh_tien,
      pt_thue_gtgt: c.pt_thue_gtgt,
      tien_thue_gtgt: c.tien_thue_gtgt,
      lenh_san_xuat: '',
      dd_gh_index: c.dd_gh_index ?? null,
      noi_dung: c.noi_dung ?? '',
      ghi_chu: c.ghi_chu ?? '',
    })
  })
  saveToStorage()
}

export function getDefaultBaoGiaFilter(): BaoGiaFilter {
  const ky = 'thang-nay' as KyValue
  const { tu, den } = getDateRangeForKy(ky)
  return { ky, tu, den }
}

const MODULE_PREFIX = 'BG'

/** Trả về số báo giá tiếp theo (2026/BG/1, 2026/BG/2...) — reset mỗi năm. */
export function baoGiaSoDonHangTiepTheo(): string {
  const year = getCurrentYear()
  let maxSo = 0
  for (const d of _baoGiaList) {
    const s = (d.so_bao_gia || '').trim()
    const match = s.match(new RegExp(`^${year}/${MODULE_PREFIX}/(\\d+)$`))
    if (!match) continue
    const n = parseInt(match[1], 10)
    if (n > maxSo) maxSo = n
  }
  return maFormatHeThong(MODULE_PREFIX, maxSo + 1)
}
