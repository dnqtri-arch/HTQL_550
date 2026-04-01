/**
 * Nội dung (diễn giải) phiếu thu theo lần thu và số tiền — YC66.
 */
export function buildDienGiaiPhieuThu(p: {
  khachHang: string
  maDon: string
  soPhaiThu: number
  /** Số chưa thu trước khi thu lần này (để phân biệt lần 2, 3…). */
  soChuaThuTruocLanNay: number
  thuLanNay: number
  /** Thứ tự lần thu hiện tại (1 = lần đầu). */
  lanThu: number
}): string {
  const ma = p.maDon.trim()
  const kh = p.khachHang.trim()
  const suffix = kh ? ` của khách hàng ${kh}` : ''
  const sp = p.soPhaiThu
  const tln = p.thuLanNay
  const lan = p.lanThu
  if (lan <= 1) {
    if (tln < sp) return `Thu tiền cọc theo đơn ${ma}${suffix}`
    return `Thu tiền theo đơn ${ma}${suffix}`
  }
  if (p.soChuaThuTruocLanNay > 0) {
    return `Thu tiền lần ${lan} theo đơn ${ma}${suffix}`
  }
  return `Thu tiền theo đơn ${ma}${suffix}`
}
