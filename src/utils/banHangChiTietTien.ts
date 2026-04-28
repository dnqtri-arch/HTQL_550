/**
 * Chi tiết bán hàng (Báo giá, Đơn hàng bán, Hợp đồng bán, Phụ lục HĐ):
 * - 0 < SL < 1 → Thành tiền = Đơn giá
 * - SL ≥ 1 → Thành tiền = Đơn giá × SL
 * - SL ≤ 0 → 0
 */
import { formatSoTienHienThi, parseFloatVN } from './numberFormat'
import {
  lineDonGiaCell,
  parsePctThueGtgtFromLine,
  type DonHangMuaGridLineRow,
} from './donHangMuaCalculations'

export function thanhTienChiTietBanHang(donGia: number, soLuong: number): number {
  const dg = Number.isFinite(donGia) && donGia >= 0 ? donGia : 0
  const sl = Number.isFinite(soLuong) ? soLuong : 0
  if (sl <= 0) return 0
  if (sl < 1) return dg
  return dg * sl
}

export function computeBanHangChiTietFooterTotals(
  lines: DonHangMuaGridLineRow[],
  opts?: { apDungVatGtgt?: boolean },
): { tongTienHang: number; tienThue: number; tongTienThanhToan: number } {
  const vatOn = opts?.apDungVatGtgt !== false
  let hang = 0
  let thue = 0
  for (const line of lines) {
    if ((line['Mã'] ?? '').trim() === '') continue
    const dg = parseFloatVN(lineDonGiaCell(line))
    const sl = parseFloatVN(line['Số lượng'] ?? '')
    const thanhTien = thanhTienChiTietBanHang(dg, sl)
    const pt = vatOn ? parsePctThueGtgtFromLine(line['% thuế GTGT'] ?? '') : null
    const tienThueDong = pt != null ? (thanhTien * pt) / 100 : 0
    hang += thanhTien
    thue += tienThueDong
  }
  return { tongTienHang: hang, tienThue: thue, tongTienThanhToan: hang + thue }
}

export function formatBanHangChiTietThanhTienDisplay(line: DonHangMuaGridLineRow): string {
  const tt = thanhTienChiTietBanHang(parseFloatVN(lineDonGiaCell(line)), parseFloatVN(line['Số lượng'] ?? ''))
  return formatSoTienHienThi(tt)
}

export function formatBanHangChiTietTienThueDisplay(line: DonHangMuaGridLineRow): string {
  const tt = thanhTienChiTietBanHang(parseFloatVN(lineDonGiaCell(line)), parseFloatVN(line['Số lượng'] ?? ''))
  const pt = parsePctThueGtgtFromLine(line['% thuế GTGT'] ?? '')
  const tienThue = pt != null ? (tt * pt) / 100 : 0
  return formatSoTienHienThi(tienThue)
}

export function formatBanHangChiTietTongTienDisplay(line: DonHangMuaGridLineRow): string {
  const tt = thanhTienChiTietBanHang(parseFloatVN(lineDonGiaCell(line)), parseFloatVN(line['Số lượng'] ?? ''))
  const pt = parsePctThueGtgtFromLine(line['% thuế GTGT'] ?? '')
  const tienThue = pt != null ? (tt * pt) / 100 : 0
  return formatSoTienHienThi(tt + tienThue)
}
