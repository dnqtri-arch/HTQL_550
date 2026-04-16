import type { TaiKhoanRecord } from '../../../types/taiKhoan'
import { taiKhoanLaTkNganHang, taiKhoanLaTienMat } from '../taiKhoan/taiKhoanApi'
import { LY_DO_CHUYEN_NOP_TIEN_MAT_VAO_NH, LY_DO_CHUYEN_RUT_TIEN_MAT } from '../../../constants/ngamDinhTaiKhoan'

export function hopLeCapTkChuyenTien(lyDo: string, tkNguon: TaiKhoanRecord, tkDen: TaiKhoanRecord): boolean {
  const ld = lyDo.trim()
  if (ld === LY_DO_CHUYEN_RUT_TIEN_MAT) {
    return taiKhoanLaTkNganHang(tkNguon) && taiKhoanLaTienMat(tkDen)
  }
  if (ld === LY_DO_CHUYEN_NOP_TIEN_MAT_VAO_NH) {
    return taiKhoanLaTienMat(tkNguon) && taiKhoanLaTkNganHang(tkDen)
  }
  /** Lý do khác (danh mục Loại thu/chi): chấp nhận cặp NH ↔ tiền mặt một chiều bất kỳ. */
  const nguonNh = taiKhoanLaTkNganHang(tkNguon)
  const nguonTm = taiKhoanLaTienMat(tkNguon)
  const denNh = taiKhoanLaTkNganHang(tkDen)
  const denTm = taiKhoanLaTienMat(tkDen)
  return (nguonNh && denTm) || (nguonTm && denNh)
}
