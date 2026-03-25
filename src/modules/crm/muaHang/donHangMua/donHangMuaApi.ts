/**
 * API và types cho Đơn hàng mua (header + chi tiết dòng).
 * Mã: {Năm}/DHM/{Số} — rule ma-he-thong.mdc
 */

import { maFormatHeThong, getCurrentYear } from '../../../../utils/maFormat'
import type {
  DonHangMuaAttachmentItem,
  DonHangMuaChiTiet,
  DonHangMuaCreatePayload,
  DonHangMuaDraftLine,
  DonHangMuaFilter,
  DonHangMuaKyValue,
  DonHangMuaRecord,
} from '../../../../types/donHangMua'

export type {
  DonHangMuaAttachmentItem,
  DonHangMuaChiTiet,
  DonHangMuaCreatePayload,
  DonHangMuaDraftLine,
  DonHangMuaFilter,
  DonHangMuaKyValue,
  DonHangMuaRecord,
} from '../../../../types/donHangMua'

/** Alias tương thích — cùng nghĩa với DonHangMuaKyValue. */
export type KyValue = DonHangMuaKyValue

/** Dữ liệu mẫu đơn hàng mua */
const MOCK_DON: DonHangMuaRecord[] = [
  {
    id: 'dhm1',
    tinh_trang: 'Chưa thực hiện',
    ngay_don_hang: '2026-03-10',
    so_don_hang: 'DHM00001',
    ngay_giao_hang: null,
    nha_cung_cap: 'CÔNG TY TNHH QUẢNG CÁO VAX',
    dia_chi: '',
    ma_so_thue: '',
    dien_giai: '',
    nv_mua_hang: '',
    dieu_khoan_tt: '',
    so_ngay_duoc_no: '0',
    dia_diem_giao_hang: '',
    dieu_khoan_khac: '',
    gia_tri_don_hang: 4000000,
    so_chung_tu_cukcuk: '',
  },
  {
    id: 'dhm2',
    tinh_trang: 'Đang thực hiện',
    ngay_don_hang: '2026-03-12',
    so_don_hang: 'DHM00002',
    ngay_giao_hang: '2026-03-20',
    nha_cung_cap: 'CÔNG TY CP NGUYÊN VẬT LIỆU ABC',
    dia_chi: '',
    ma_so_thue: '',
    dien_giai: 'Đơn hàng vật tư quý 1',
    nv_mua_hang: '',
    dieu_khoan_tt: '',
    so_ngay_duoc_no: '0',
    dia_diem_giao_hang: '',
    dieu_khoan_khac: '',
    gia_tri_don_hang: 15000000,
    so_chung_tu_cukcuk: 'CUKCUK-2026-001',
  },
  {
    id: 'dhm3',
    tinh_trang: 'Chưa thực hiện',
    ngay_don_hang: '2026-03-15',
    so_don_hang: 'DHM00003',
    ngay_giao_hang: null,
    nha_cung_cap: 'CÔNG TY TNHH DỊCH VỤ XYZ',
    dia_chi: '',
    ma_so_thue: '',
    dien_giai: '',
    nv_mua_hang: '',
    dieu_khoan_tt: '',
    so_ngay_duoc_no: '0',
    dia_diem_giao_hang: '',
    dieu_khoan_khac: '',
    gia_tri_don_hang: 8500000,
    so_chung_tu_cukcuk: '',
  },
]

/** Chi tiết theo đơn */
const MOCK_CHI_TIET: DonHangMuaChiTiet[] = [
  {
    id: 'ct1',
    don_hang_mua_id: 'dhm1',
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

const STORAGE_KEY_DON = 'htql_don_hang_mua_list'
const STORAGE_KEY_CHI_TIET = 'htql_don_hang_mua_chi_tiet'

function normalizeDon(d: Partial<DonHangMuaRecord> & { id: string; de_xuat_id?: string }): DonHangMuaRecord {
  const legacyDx = (d as { de_xuat_id?: string }).de_xuat_id
  const doiChieu = d.doi_chieu_don_mua_id ?? legacyDx
  return {
    id: d.id,
    tinh_trang: d.tinh_trang ?? 'Chưa thực hiện',
    ngay_don_hang: d.ngay_don_hang ?? '',
    so_don_hang: d.so_don_hang ?? '',
    ngay_giao_hang: d.ngay_giao_hang ?? null,
    nha_cung_cap: d.nha_cung_cap ?? '',
    dia_chi: d.dia_chi ?? '',
    nguoi_giao_hang: d.nguoi_giao_hang ?? undefined,
    ma_so_thue: d.ma_so_thue ?? '',
    dien_giai: d.dien_giai ?? '',
    nv_mua_hang: d.nv_mua_hang ?? '',
    dieu_khoan_tt: d.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: d.so_ngay_duoc_no ?? '0',
    dia_diem_giao_hang: d.dia_diem_giao_hang ?? '',
    dieu_khoan_khac: d.dieu_khoan_khac ?? '',
    gia_tri_don_hang: typeof d.gia_tri_don_hang === 'number' ? d.gia_tri_don_hang : 0,
    so_chung_tu_cukcuk: d.so_chung_tu_cukcuk ?? '',
    doi_chieu_don_mua_id: doiChieu ?? undefined,
    attachments: Array.isArray((d as { attachments?: DonHangMuaAttachmentItem[] }).attachments)
      ? (d as { attachments: DonHangMuaAttachmentItem[] }).attachments
      : undefined,
    hinh_thuc: d.hinh_thuc,
    kho_nhap_id: d.kho_nhap_id,
    ten_cong_trinh: d.ten_cong_trinh,
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

function loadFromStorage(): { don: DonHangMuaRecord[]; chiTiet: DonHangMuaChiTiet[] } {
  try {
    const rawDon = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DON) : null
    const rawCt = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CHI_TIET) : null
    const don = rawDon ? JSON.parse(rawDon) : null
    const chiTiet = rawCt ? JSON.parse(rawCt) : null
    if (Array.isArray(don) && Array.isArray(chiTiet)) {
      return { don: don.map((d: Partial<DonHangMuaRecord> & { id: string }) => normalizeDon(d)), chiTiet }
    }
  } catch {
    /* ignore */
  }
  return { don: [...MOCK_DON], chiTiet: [...MOCK_CHI_TIET] }
}

function saveToStorage(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DON, JSON.stringify(_donList))
      localStorage.setItem(STORAGE_KEY_CHI_TIET, JSON.stringify(_chiTietList))
    }
  } catch {
    /* ignore */
  }
}

/** Draft các dòng đang nhập trong form (chỉ lưu cột hiển thị, bỏ _vthh để tránh object lớn). */
const STORAGE_KEY_DRAFT = 'htql_don_hang_mua_draft'

export function getDonHangMuaDraft(): DonHangMuaDraftLine[] | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_DRAFT) : null
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function setDonHangMuaDraft(lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>): void {
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

export function clearDonHangMuaDraft(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY_DRAFT)
  } catch {
    /* ignore */
  }
}

/** Bản sao có thể xóa; khởi tạo từ localStorage (nếu có) hoặc dữ liệu mẫu */
const _initial = loadFromStorage()
let _donList: DonHangMuaRecord[] = _initial.don
let _chiTietList: DonHangMuaChiTiet[] = _initial.chiTiet

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

export function donHangMuaGetAll(filter: DonHangMuaFilter): DonHangMuaRecord[] {
  const { tu, den } = filter
  if (!tu || !den) return [..._donList]
  return _donList.filter((d) => {
    const ngay = d.ngay_don_hang
    return ngay >= tu && ngay <= den
  })
}

export function donHangMuaGetChiTiet(donId: string): DonHangMuaChiTiet[] {
  return _chiTietList.filter((c) => c.don_hang_mua_id === donId)
}

/** Tình trạng đơn sau khi lưu phiếu nhận vật tư hàng hóa (NVTHH) có đối chiếu đơn mua. */
export const TINH_TRANG_DON_HANG_MUA_DA_NHAN_HANG = 'Đã nhận hàng'

/** Ghép payload PUT từ bản ghi + chi tiết (dùng modal hủy/phục hồi và đồng bộ tình trạng). */
export function donHangMuaBuildCreatePayloadFromRecord(row: DonHangMuaRecord, ct: DonHangMuaChiTiet[]): DonHangMuaCreatePayload {
  return {
    tinh_trang: row.tinh_trang,
    ngay_don_hang: row.ngay_don_hang,
    so_don_hang: row.so_don_hang,
    ngay_giao_hang: row.ngay_giao_hang,
    nha_cung_cap: row.nha_cung_cap,
    dia_chi: row.dia_chi ?? '',
    nguoi_giao_hang: row.nguoi_giao_hang,
    ma_so_thue: row.ma_so_thue ?? '',
    dien_giai: row.dien_giai ?? '',
    nv_mua_hang: row.nv_mua_hang ?? '',
    dieu_khoan_tt: row.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: row.so_ngay_duoc_no ?? '0',
    dia_diem_giao_hang: row.dia_diem_giao_hang ?? '',
    dieu_khoan_khac: row.dieu_khoan_khac ?? '',
    gia_tri_don_hang: row.gia_tri_don_hang,
    so_chung_tu_cukcuk: row.so_chung_tu_cukcuk ?? '',
    doi_chieu_don_mua_id: row.doi_chieu_don_mua_id,
    attachments: row.attachments?.length ? row.attachments.map((a) => ({ ...a })) : undefined,
    hinh_thuc: row.hinh_thuc,
    kho_nhap_id: row.kho_nhap_id,
    ten_cong_trinh: row.ten_cong_trinh,
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
      ghi_chu: c.ghi_chu ?? '',
    })),
  }
}

/** Cập nhật tình trạng đơn (giữ nguyên chi tiết và các trường khác). */
export function donHangMuaSetTinhTrang(donId: string, tinh_trang: string): void {
  const row = _donList.find((d) => d.id === donId)
  if (!row) return
  const ct = donHangMuaGetChiTiet(donId)
  donHangMuaPut(donId, { ...donHangMuaBuildCreatePayloadFromRecord(row, ct), tinh_trang })
}

/** Xóa đơn hàng mua và toàn bộ chi tiết của đơn. */
export function donHangMuaDelete(donId: string): void {
  _donList = _donList.filter((d) => d.id !== donId)
  _chiTietList = _chiTietList.filter((c) => c.don_hang_mua_id !== donId)
  saveToStorage()
}

/** Tạo đơn hàng mua mới (thêm vào danh sách nội bộ). Trả về bản ghi đơn vừa tạo. */
export function donHangMuaPost(payload: DonHangMuaCreatePayload): DonHangMuaRecord {
  const id = `dhm${Date.now()}`
  const don: DonHangMuaRecord = {
    id,
    tinh_trang: payload.tinh_trang,
    ngay_don_hang: payload.ngay_don_hang,
    so_don_hang: payload.so_don_hang,
    ngay_giao_hang: payload.ngay_giao_hang,
    nha_cung_cap: payload.nha_cung_cap,
    dia_chi: payload.dia_chi ?? '',
    nguoi_giao_hang: payload.nguoi_giao_hang ?? undefined,
    ma_so_thue: payload.ma_so_thue ?? '',
    dien_giai: payload.dien_giai ?? '',
    nv_mua_hang: payload.nv_mua_hang ?? '',
    dieu_khoan_tt: payload.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: payload.so_ngay_duoc_no ?? '0',
    dia_diem_giao_hang: payload.dia_diem_giao_hang ?? '',
    dieu_khoan_khac: payload.dieu_khoan_khac ?? '',
    gia_tri_don_hang: payload.gia_tri_don_hang,
    so_chung_tu_cukcuk: payload.so_chung_tu_cukcuk ?? '',
    doi_chieu_don_mua_id: payload.doi_chieu_don_mua_id ?? undefined,
    attachments: payload.attachments ? [...payload.attachments] : undefined,
    hinh_thuc: payload.hinh_thuc,
    kho_nhap_id: payload.kho_nhap_id,
    ten_cong_trinh: payload.ten_cong_trinh,
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
  _donList.push(don)
  payload.chiTiet.forEach((c, i) => {
    _chiTietList.push({
      id: `ct${id}-${i}`,
      don_hang_mua_id: id,
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
      dd_gh_index: c.dd_gh_index ?? null,
      ghi_chu: c.ghi_chu ?? '',
    })
  })
  saveToStorage()
  return don
}

/** Cập nhật đơn hàng mua (xóa chi tiết cũ, ghi lại theo payload). */
export function donHangMuaPut(donId: string, payload: DonHangMuaCreatePayload): void {
  const idx = _donList.findIndex((d) => d.id === donId)
  if (idx < 0) return
  _donList[idx] = {
    id: donId,
    tinh_trang: payload.tinh_trang,
    ngay_don_hang: payload.ngay_don_hang,
    so_don_hang: payload.so_don_hang,
    ngay_giao_hang: payload.ngay_giao_hang,
    nha_cung_cap: payload.nha_cung_cap,
    dia_chi: payload.dia_chi ?? '',
    nguoi_giao_hang: payload.nguoi_giao_hang ?? undefined,
    ma_so_thue: payload.ma_so_thue ?? '',
    dien_giai: payload.dien_giai ?? '',
    nv_mua_hang: payload.nv_mua_hang ?? '',
    dieu_khoan_tt: payload.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: payload.so_ngay_duoc_no ?? '0',
    dia_diem_giao_hang: payload.dia_diem_giao_hang ?? '',
    dieu_khoan_khac: payload.dieu_khoan_khac ?? '',
    gia_tri_don_hang: payload.gia_tri_don_hang,
    so_chung_tu_cukcuk: payload.so_chung_tu_cukcuk ?? '',
    doi_chieu_don_mua_id: payload.doi_chieu_don_mua_id ?? undefined,
    attachments: payload.attachments ? [...payload.attachments] : undefined,
    hinh_thuc: payload.hinh_thuc,
    kho_nhap_id: payload.kho_nhap_id,
    ten_cong_trinh: payload.ten_cong_trinh,
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
  _chiTietList = _chiTietList.filter((c) => c.don_hang_mua_id !== donId)
  payload.chiTiet.forEach((c, i) => {
    _chiTietList.push({
      id: `ct${donId}-${i}`,
      don_hang_mua_id: donId,
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
      dd_gh_index: c.dd_gh_index ?? null,
      ghi_chu: c.ghi_chu ?? '',
    })
  })
  saveToStorage()
}

export function getDefaultDonHangMuaFilter(): DonHangMuaFilter {
  const ky = 'thang-nay' as KyValue
  const { tu, den } = getDateRangeForKy(ky)
  return { ky, tu, den }
}

const MODULE_PREFIX = 'DHM'

/** Trả về số đơn hàng tiếp theo (2026/DHM/1, 2026/DHM/2...) — reset mỗi năm. */
export function donHangMuaSoDonHangTiepTheo(): string {
  const year = getCurrentYear()
  let maxSo = 0
  for (const d of _donList) {
    const s = (d.so_don_hang || '').trim()
    const match = s.match(new RegExp(`^${year}/${MODULE_PREFIX}/(\\d+)$`))
    if (!match) continue
    const n = parseInt(match[1], 10)
    if (n > maxSo) maxSo = n
  }
  return maFormatHeThong(MODULE_PREFIX, maxSo + 1)
}
