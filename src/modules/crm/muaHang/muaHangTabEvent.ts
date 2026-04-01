import type { DonHangMuaChiTiet, DonHangMuaRecord } from './donHangMua/donHangMuaApi'

/** Phiếu nhận vật tư hàng hóa (NVTHH) lưu xong — shell Mua hàng lắng nghe để cập nhật tình trạng ĐHM. */
export const HTQL_NVTHH_SYNC_DHM_TINH_TRANG_EVENT = 'htql-nvthh-sync-dhm-tinh-trang'

/** ĐHM cần làm mới danh sách (sau xóa phiếu NVTHH / đồng bộ tình trạng). */
export const HTQL_DHM_LIST_REFRESH_EVENT = 'htql-dhm-list-refresh'

/** Chuyển tab phân hệ Mua hàng — `CustomEvent` với `detail` là id tab (chuỗi) hoặc object có `tab` + tùy chọn prefill. */
export const HTQL_MUA_HANG_TAB_EVENT = 'htql-mua-hang-tab'

export type MuaHangTabEventDetail =
  | string
  | {
      tab: string
      /** Mở tab nhận hàng và đổ đầy form phiếu từ đơn hàng mua. */
      nhanHangTuDonMua?: { don: DonHangMuaRecord; chiTiet: DonHangMuaChiTiet[] }
      /** Mở tab nhận hàng và hiển thị form xem phiếu theo id. */
      xemPhieuNhanHangId?: string
    }
