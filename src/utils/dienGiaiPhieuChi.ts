/**
 * Diễn giải phiếu chi tiền theo lần chi (YC88).
 */
export function buildDienGiaiPhieuChi(p: {
  khachHang: string
  maDon: string
  soPhaiChi: number
  soChuaChiTruocLanNay: number
  chiLanNay: number
  lanChi: number
}): string {
  const ma = p.maDon.trim()
  const kh = p.khachHang.trim()
  const suffix = kh ? ` của khách hàng ${kh}` : ''
  const sp = p.soPhaiChi
  const cln = p.chiLanNay
  const lan = p.lanChi
  if (lan <= 1) {
    if (cln < sp) return `Chi tiền cọc theo đơn ${ma}${suffix}`
    return `Chi tiền theo đơn ${ma}${suffix}`
  }
  if (p.soChuaChiTruocLanNay > 0) {
    return `Chi tiền lần ${lan} theo đơn ${ma}${suffix}`
  }
  return `Chi tiền theo đơn ${ma}${suffix}`
}
