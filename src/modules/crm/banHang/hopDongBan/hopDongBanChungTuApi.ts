/**
 * API và types cho Báo giá (header + chi tiết dòng).
 * Mã: {Năm}/BG/{Số} — rule ma-he-thong.mdc
 * 
 * [YC24 Mục 7] Endpoint backend (khi có): /api/sales/quotes
 * Hiện tại: localStorage-based (tách biệt khỏi /api/purchase/orders)
 */

import { maFormatHeThong, getCurrentYear } from '../../../../utils/maFormat'
import { baoGiaHoanTacKhiHetLienKetHopDongBan } from '../baoGia/baoGiaApi'
import { HTQL_HOP_DONG_BAN_LIST_REFRESH_EVENT } from '../banHangTabEvent'
import type {
  HopDongBanChungTuAttachmentItem,
  HopDongBanChungTuChiTiet,
  HopDongBanChungTuCreatePayload,
  HopDongBanChungTuDraftLine,
  HopDongBanChungTuFilter,
  HopDongBanChungTuKyValue,
  HopDongBanChungTuRecord,
} from '../../../../types/hopDongBanChungTu'
import type { HopDongBanChungTuApi } from './hopDongBanChungTuApiContext'

export type {
  HopDongBanChungTuAttachmentItem,
  HopDongBanChungTuChiTiet,
  HopDongBanChungTuCreatePayload,
  HopDongBanChungTuDraftLine,
  HopDongBanChungTuFilter,
  HopDongBanChungTuKyValue,
  HopDongBanChungTuRecord,
} from '../../../../types/hopDongBanChungTu'

/** Alias tương thích — cùng nghĩa với HopDongBanChungTuKyValue. */
export type KyValue = HopDongBanChungTuKyValue

/** Dữ liệu mẫu báo giá */
const MOCK_DON: HopDongBanChungTuRecord[] = [
  {
    id: 'dhb_full1',
    tinh_trang: 'Chưa thực hiện',
    ngay_lap_hop_dong: '2026-03-10',
    so_hop_dong: 'DHB00001',
    ngay_cam_ket_giao: null,
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
    id: 'dhb_full2',
    tinh_trang: 'Đang thực hiện',
    ngay_lap_hop_dong: '2026-03-12',
    so_hop_dong: 'DHB00002',
    ngay_cam_ket_giao: '2026-03-20',
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
    id: 'dhb_full3',
    tinh_trang: 'Chưa thực hiện',
    ngay_lap_hop_dong: '2026-03-15',
    so_hop_dong: 'DHB00003',
    ngay_cam_ket_giao: null,
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
const MOCK_CHI_TIET: HopDongBanChungTuChiTiet[] = [
  {
    id: 'ct1',
    hop_dong_ban_chung_tu_id: 'dhb_full1',
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
    dd_th_index: 0,
  },
]

const STORAGE_KEY_HOP_DONG_BAN_CT_LIST = 'htql_hop_dong_ban_chung_tu_list'
const STORAGE_KEY_CHI_TIET = 'htql_hop_dong_ban_chung_tu_chi_tiet'

function normalizeHopDongBanChungTu(d: Partial<HopDongBanChungTuRecord> & { id: string; de_xuat_id?: string }): HopDongBanChungTuRecord {
  const legacyDx = (d as { de_xuat_id?: string }).de_xuat_id
  const doiChieu = d.doi_chieu_don_mua_id ?? legacyDx
  return {
    id: d.id,
    loai_khach_hang: d.loai_khach_hang ?? undefined,
    ten_nguoi_lien_he: d.ten_nguoi_lien_he ?? undefined,
    so_dien_thoai_lien_he: d.so_dien_thoai_lien_he ?? undefined,
    tinh_trang: d.tinh_trang ?? 'Chưa thực hiện',
    ngay_lap_hop_dong: d.ngay_lap_hop_dong ?? '',
    so_hop_dong: d.so_hop_dong ?? '',
    ngay_cam_ket_giao: d.ngay_cam_ket_giao ?? null,
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
    attachments: Array.isArray((d as { attachments?: HopDongBanChungTuAttachmentItem[] }).attachments)
      ? (d as { attachments: HopDongBanChungTuAttachmentItem[] }).attachments
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
    bao_gia_id: d.bao_gia_id,
    so_bao_gia_goc: d.so_bao_gia_goc,
  }
}

function loadFromStorage(): { list: HopDongBanChungTuRecord[]; chiTiet: HopDongBanChungTuChiTiet[] } {
  try {
    const rawList = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_HOP_DONG_BAN_CT_LIST) : null
    const rawCt = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CHI_TIET) : null
    const list = rawList ? JSON.parse(rawList) : null
    const chiTiet = rawCt ? JSON.parse(rawCt) : null
    if (Array.isArray(list) && Array.isArray(chiTiet)) {
      return { list: list.map((d: Partial<HopDongBanChungTuRecord> & { id: string }) => normalizeHopDongBanChungTu(d)), chiTiet }
    }
  } catch {
    /* ignore */
  }
  return { list: [...MOCK_DON], chiTiet: [...MOCK_CHI_TIET] }
}

function saveToStorage(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_HOP_DONG_BAN_CT_LIST, JSON.stringify(_hopDongBanChungTuList))
      localStorage.setItem(STORAGE_KEY_CHI_TIET, JSON.stringify(_chiTietList))
    }
  } catch {
    /* ignore */
  }
}

/** Draft các dòng đang nhập trong form (chỉ lưu cột hiển thị, bỏ _vthh để tránh object lớn). */
const STORAGE_KEY_DRAFT_HDB_CT = 'htql_hop_dong_ban_chung_tu_draft'

export function getHopDongBanChungTuDraft(): HopDongBanChungTuDraftLine[] | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DRAFT_HDB_CT) : null
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function setHopDongBanChungTuDraft(lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const toSave = lines.map((l) => {
        const { _vthh, ...rest } = l
        return rest
      })
      localStorage.setItem(STORAGE_KEY_DRAFT_HDB_CT, JSON.stringify(toSave))
    }
  } catch {
    /* ignore */
  }
}

export function clearHopDongBanChungTuDraft(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY_DRAFT_HDB_CT)
  } catch {
    /* ignore */
  }
}

/** Bản sao có thể xóa; khởi tạo từ localStorage (nếu có) hoặc dữ liệu mẫu */
const _initial = loadFromStorage()
let _hopDongBanChungTuList: HopDongBanChungTuRecord[] = _initial.list
let _chiTietList: HopDongBanChungTuChiTiet[] = _initial.chiTiet

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

export function hopDongBanChungTuGetAll(filter: HopDongBanChungTuFilter): HopDongBanChungTuRecord[] {
  const { tu, den } = filter
  if (!tu || !den) return [..._hopDongBanChungTuList]
  return _hopDongBanChungTuList.filter((d) => {
    const ngay = d.ngay_lap_hop_dong
    return ngay >= tu && ngay <= den
  })
}

export function hopDongBanChungTuGetChiTiet(donHangBanId: string): HopDongBanChungTuChiTiet[] {
  return _chiTietList.filter((c) => c.hop_dong_ban_chung_tu_id === donHangBanId)
}

/** [YC30] Trạng thái báo giá - 5 options mới */
export const TINH_TRANG_HOP_DONG_BAN_CT = [
  'Mới tạo',
  'Đã gửi KH',
  'Đã chuyển HĐ',
  'Đã chuyển HĐ',
  'KH không đồng ý',
] as const

export const TINH_TRANG_HOP_DONG_BAN_CT_DA_GUI_KHACH = 'Đã gửi KH'
export const TINH_TRANG_NVTHH_DA_NHAP_KHO = 'Đã nhập kho'

/** Sau khi lưu phiếu Ghi nhận doanh thu (NVTHH) ở trạng thái đã nhập kho — đồng bộ danh sách ĐHB. */
export const TINH_TRANG_HOP_DONG_BAN_CHUNG_TU_DA_NHAN_HANG = 'Đã nhận hàng'

/** Ghép payload PUT từ bản ghi + chi tiết (dùng modal hủy/phục hồi và đồng bộ tình trạng). */
export function hopDongBanChungTuBuildCreatePayloadFromRecord(row: HopDongBanChungTuRecord, ct: HopDongBanChungTuChiTiet[]): HopDongBanChungTuCreatePayload {
  return {
    loai_khach_hang: row.loai_khach_hang,
    ten_nguoi_lien_he: row.ten_nguoi_lien_he,
    so_dien_thoai_lien_he: row.so_dien_thoai_lien_he,
    tinh_trang: row.tinh_trang,
    ngay_lap_hop_dong: row.ngay_lap_hop_dong,
    so_hop_dong: row.so_hop_dong,
    ngay_cam_ket_giao: row.ngay_cam_ket_giao,
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
    bao_gia_id: row.bao_gia_id,
    so_bao_gia_goc: row.so_bao_gia_goc,
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
      dd_th_index: c.dd_th_index ?? null,
      noi_dung: c.noi_dung ?? '',
      ghi_chu: c.ghi_chu ?? '',
    })),
  }
}

/** Cập nhật tình trạng báo giá (giữ nguyên chi tiết và các trường khác). */
export function hopDongBanChungTuSetTinhTrang(donHangBanId: string, tinh_trang: string): void {
  const row = _hopDongBanChungTuList.find((d) => d.id === donHangBanId)
  if (!row) return
  const ct = hopDongBanChungTuGetChiTiet(donHangBanId)
  hopDongBanChungTuPut(donHangBanId, { ...hopDongBanChungTuBuildCreatePayloadFromRecord(row, ct), tinh_trang })
}

/** Xóa hợp đồng bán và chi tiết; đồng bộ hoàn tác trạng thái báo giá nếu hết liên kết (YC51). */
export function hopDongBanChungTuDelete(donHangBanId: string): void {
  const removed = _hopDongBanChungTuList.find((d) => d.id === donHangBanId)
  const baoGiaId = removed?.bao_gia_id
  _hopDongBanChungTuList = _hopDongBanChungTuList.filter((d) => d.id !== donHangBanId)
  _chiTietList = _chiTietList.filter((c) => c.hop_dong_ban_chung_tu_id !== donHangBanId)
  saveToStorage()
  baoGiaHoanTacKhiHetLienKetHopDongBan(baoGiaId, _hopDongBanChungTuList)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HTQL_HOP_DONG_BAN_LIST_REFRESH_EVENT))
  }
}

/** Tạo báo giá mới (thêm vào danh sách nội bộ). Trả về bản ghi báo giá vừa tạo. */
export function hopDongBanChungTuPost(payload: HopDongBanChungTuCreatePayload): HopDongBanChungTuRecord {
  const id = `bg${Date.now()}`
  const hopDongBanChungTuRow: HopDongBanChungTuRecord = {
    id,
    loai_khach_hang: payload.loai_khach_hang,
    ten_nguoi_lien_he: payload.ten_nguoi_lien_he,
    so_dien_thoai_lien_he: payload.so_dien_thoai_lien_he,
    tinh_trang: payload.tinh_trang,
    ngay_lap_hop_dong: payload.ngay_lap_hop_dong,
    so_hop_dong: payload.so_hop_dong,
    ngay_cam_ket_giao: payload.ngay_cam_ket_giao,
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
    bao_gia_id: payload.bao_gia_id,
    so_bao_gia_goc: payload.so_bao_gia_goc,
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
  _hopDongBanChungTuList.push(hopDongBanChungTuRow)
  payload.chiTiet.forEach((c, i) => {
    _chiTietList.push({
      id: `ct${id}-${i}`,
      hop_dong_ban_chung_tu_id: id,
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
      dd_th_index: c.dd_th_index ?? null,
      noi_dung: c.noi_dung ?? '',
      ghi_chu: c.ghi_chu ?? '',
    })
  })
  saveToStorage()
  return hopDongBanChungTuRow
}

/** Cập nhật báo giá (xóa chi tiết cũ, ghi lại theo payload). */
export function hopDongBanChungTuPut(donHangBanId: string, payload: HopDongBanChungTuCreatePayload): void {
  const idx = _hopDongBanChungTuList.findIndex((d) => d.id === donHangBanId)
  if (idx < 0) return
  _hopDongBanChungTuList[idx] = {
    id: donHangBanId,
    loai_khach_hang: payload.loai_khach_hang,
    ten_nguoi_lien_he: payload.ten_nguoi_lien_he,
    so_dien_thoai_lien_he: payload.so_dien_thoai_lien_he,
    tinh_trang: payload.tinh_trang,
    ngay_lap_hop_dong: payload.ngay_lap_hop_dong,
    so_hop_dong: payload.so_hop_dong,
    ngay_cam_ket_giao: payload.ngay_cam_ket_giao,
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
    bao_gia_id: payload.bao_gia_id,
    so_bao_gia_goc: payload.so_bao_gia_goc,
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
  _chiTietList = _chiTietList.filter((c) => c.hop_dong_ban_chung_tu_id !== donHangBanId)
  payload.chiTiet.forEach((c, i) => {
    _chiTietList.push({
      id: `ct${donHangBanId}-${i}`,
      hop_dong_ban_chung_tu_id: donHangBanId,
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
      dd_th_index: c.dd_th_index ?? null,
      noi_dung: c.noi_dung ?? '',
      ghi_chu: c.ghi_chu ?? '',
    })
  })
  saveToStorage()
}

export function getDefaultHopDongBanChungTuFilter(): HopDongBanChungTuFilter {
  const ky = 'thang-nay' as KyValue
  const { tu, den } = getDateRangeForKy(ky)
  return { ky, tu, den }
}

const MODULE_PREFIX = 'HDB'

/** Trả về số báo giá tiếp theo (2026/BG/1, 2026/BG/2...) — reset mỗi năm. */
export function hopDongBanSoHopDongTiepTheo(): string {
  const year = getCurrentYear()
  let maxSo = 0
  for (const d of _hopDongBanChungTuList) {
    const s = (d.so_hop_dong || '').trim()
    const match = s.match(new RegExp(`^${year}/${MODULE_PREFIX}/(\\d+)$`))
    if (!match) continue
    const n = parseInt(match[1], 10)
    if (n > maxSo) maxSo = n
  }
  return maFormatHeThong(MODULE_PREFIX, maxSo + 1)
}

/** Gói API mặc định cho `HopDongBanChungTuApiProvider` (danh sách + form ĐHB đầy đủ). */
export const hopDongBanChungTuApiImpl: HopDongBanChungTuApi = {
  getAll: hopDongBanChungTuGetAll,
  getChiTiet: hopDongBanChungTuGetChiTiet,
  delete: hopDongBanChungTuDelete,
  getDefaultFilter: getDefaultHopDongBanChungTuFilter,
  getDateRangeForKy,
  KY_OPTIONS,
  post: hopDongBanChungTuPost,
  put: hopDongBanChungTuPut,
  soHopDongTiepTheo: hopDongBanSoHopDongTiepTheo,
  getDraft: getHopDongBanChungTuDraft,
  setDraft: setHopDongBanChungTuDraft,
  clearDraft: clearHopDongBanChungTuDraft,
}
