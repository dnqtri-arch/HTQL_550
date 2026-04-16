/**
 * Thu/chi tiền — toàn bộ phiếu thu + chi có lý do (YC94: kể cả chưa ghi sổ).
 */
import { PhieuThuChiHopNhatBang } from '../shared/phieuThuChiHopNhatBang'

export function ThuChiTien() {
  return <PhieuThuChiHopNhatBang variant="thuChiGhiSo" />
}
