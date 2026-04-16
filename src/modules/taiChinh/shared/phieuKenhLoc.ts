/**
 * Xác định kênh tiền mặt / ngân hàng của phiếu thu-chi (đồng bộ logic với tính số dư TK).
 */
import type { ThuTienBangRecord } from '../../../types/thuTienBang'
import type { ChiTienBangRecord } from '../../../types/chiTienBang'
import { taiKhoanGetAll, taiKhoanLaTienMat, taiKhoanLaTkNganHang } from '../taiKhoan/taiKhoanApi'

function tkTheoPhieuId(id: string | undefined) {
  const s = id?.trim()
  if (!s) return undefined
  return taiKhoanGetAll().find((t) => t.id === s)
}

export function phieuThuLaKenhTienMat(r: ThuTienBangRecord): boolean {
  const tk = tkTheoPhieuId(r.phieu_tai_khoan_id)
  if (tk) return taiKhoanLaTienMat(tk)
  return Boolean(r.thu_tien_mat) && !r.thu_qua_ngan_hang
}

export function phieuThuLaKenhNganHang(r: ThuTienBangRecord): boolean {
  const tk = tkTheoPhieuId(r.phieu_tai_khoan_id)
  if (tk) return taiKhoanLaTkNganHang(tk)
  return Boolean(r.thu_qua_ngan_hang)
}

export function phieuChiLaKenhTienMat(r: ChiTienBangRecord): boolean {
  const tk = tkTheoPhieuId(r.phieu_tai_khoan_id)
  if (tk) return taiKhoanLaTienMat(tk)
  return Boolean(r.chi_tien_mat) && !r.chi_qua_ngan_hang
}

export function phieuChiLaKenhNganHang(r: ChiTienBangRecord): boolean {
  const tk = tkTheoPhieuId(r.phieu_tai_khoan_id)
  if (tk) return taiKhoanLaTkNganHang(tk)
  return Boolean(r.chi_qua_ngan_hang)
}
