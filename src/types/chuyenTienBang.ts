import type { ChiTienBangAttachmentItem } from './chiTienBang'

/** Kỳ lọc danh sách phiếu chuyển tiền (đồng bộ KY_OPTIONS thu/chi tiền). */
export type ChuyenTienBangKyValue = 'tat-ca' | 'tuan-nay' | 'thang-nay' | 'quy-nay' | 'nam-nay'

/** Đính kèm — cùng cấu trúc phiếu chi. */
export type ChuyenTienBangAttachmentItem = ChiTienBangAttachmentItem

export interface ChuyenTienBangRecord {
  id: string
  tinh_trang: string
  so_chuyen_tien_bang: string
  /** Ngày chuyển (yyyy-mm-dd) */
  ngay_chuyen: string
  ly_do_chuyen: string
  /** id bản ghi module Tài khoản (nguồn) */
  tk_nguon_id: string
  /** id bản ghi module Tài khoản (đích) */
  tk_den_id: string
  so_tien: number
  attachments?: ChuyenTienBangAttachmentItem[]
  /** Phiếu thu tự tạo khi ghi sổ */
  phieu_thu_tu_chuyen_id?: string
  /** Phiếu chi tự tạo khi ghi sổ */
  phieu_chi_tu_chuyen_id?: string
}

export interface ChuyenTienBangCreatePayload {
  tinh_trang: string
  so_chuyen_tien_bang: string
  ngay_chuyen: string
  ly_do_chuyen: string
  tk_nguon_id: string
  tk_den_id: string
  so_tien: number
  attachments?: ChuyenTienBangAttachmentItem[]
  phieu_thu_tu_chuyen_id?: string
  phieu_chi_tu_chuyen_id?: string
}

export interface ChuyenTienBangFilter {
  ky: ChuyenTienBangKyValue
  tu: string
  den: string
}
