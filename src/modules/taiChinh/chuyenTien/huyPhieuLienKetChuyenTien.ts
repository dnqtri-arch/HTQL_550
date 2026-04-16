/**
 * Hủy ghi sổ + xóa phiếu thu/chi do phiếu chuyển tiền tạo ra.
 */
import type { ChuyenTienBangRecord } from '../../../types/chuyenTienBang'
import { thuTienBangDelete } from '../thuTien/thuTienBangApi'
import { chiTienBangDelete } from '../chiTien/chiTienBangApi'
import { huyGhiSoPhieuThu } from '../thuTien/ghiSoTaiChinhApi'
import { huyGhiSoPhieuChi } from '../chiTien/ghiSoChiTienApi'

export function huyGhiSoVaXoaPhieuThuChiTuChuyenTien(row: ChuyenTienBangRecord): void {
  const tid = row.phieu_thu_tu_chuyen_id?.trim()
  const cid = row.phieu_chi_tu_chuyen_id?.trim()
  if (tid) {
    huyGhiSoPhieuThu(tid)
    thuTienBangDelete(tid)
  }
  if (cid) {
    huyGhiSoPhieuChi(cid)
    chiTienBangDelete(cid)
  }
}
