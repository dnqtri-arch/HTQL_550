/**
 * Phân quyền người dùng — HTQL_550
 * Thay đổi CURRENT_USER_ROLE để test hiển thị cột Giá trị (admin/ketoan thấy, kho/guest ẩn).
 * Sau này sẽ lấy từ Auth Context thay vì constant.
 */

export type UserRole = 'admin' | 'ketoan' | 'kho' | 'guest'

/** Role hiện tại đang đăng nhập — thay đổi để kiểm tra phân quyền UI. */
export const CURRENT_USER_ROLE: UserRole = 'admin'

/** Kiểm tra quyền xem cột Giá trị / Thành tiền / Tổng cộng tiền. */
export function canXemGiaTri(role: UserRole): boolean {
  return role === 'admin' || role === 'ketoan'
}

/** Kiểm tra quyền thao tác tài chính (công nợ, quỹ, ngân hàng). */
export function canThaoTacTaiChinh(role: UserRole): boolean {
  return role === 'admin' || role === 'ketoan'
}
