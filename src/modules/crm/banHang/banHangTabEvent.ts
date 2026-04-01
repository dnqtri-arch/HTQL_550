import type { DonHangBanChungTuRecord, DonHangBanChungTuChiTiet } from '../../../types/donHangBanChungTu'

/** Chuyển tab / mở form trong phân hệ Bán hàng. */
export const HTQL_BAN_HANG_TAB_EVENT = 'htql-ban-hang-tab'

/** Làm mới danh sách Đơn hàng bán (sau khi xóa phiếu thu / đồng bộ trạng thái). */
export const HTQL_DON_HANG_BAN_LIST_REFRESH_EVENT = 'htql-don-hang-ban-list-refresh'

/** Làm mới danh sách Hợp đồng bán (sau xóa / lưu — đồng bộ lịch sử bán trên form Báo giá, v.v.). */
export const HTQL_HOP_DONG_BAN_LIST_REFRESH_EVENT = 'htql-hop-dong-ban-list-refresh'

export type BanHangTabEventDetail =
  | string
  | {
      tab: string
      /** Mở tab Ghi nhận doanh thu và prefill phiếu từ đơn hàng bán. */
      ghiNhanTuDonBan?: { don: DonHangBanChungTuRecord; chiTiet: DonHangBanChungTuChiTiet[] }
    }
