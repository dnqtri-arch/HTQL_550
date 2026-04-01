/**
 * Đơn giá bán trên form Báo giá — đồng bộ logic Tab Bậc giá / Tab ngầm định (VTHH).
 * Căn cứ số lượng dòng báo giá để chọn khoảng bậc giá; không có bậc giá → đg bán tab ngầm định (don_gia_ban / gia_ban_quy_dinh).
 */
import { formatSoTienHienThi, parseFloatVN } from './numberFormat'
import type { VatTuHangHoaRecord } from '../types/vatTuHangHoa'
import {
  COL_DD_GH,
  buildDvtOptionsForVthh,
  parsePctThueGtgtFromLine,
  type DonHangMuaGridLineRow,
} from './donHangMuaCalculations'

/** ĐG bán gốc (số) theo bảng bậc giá + SL; giống getBaseDgBanForDonViQuyDoi trong vatTuHangHoaForm / vatTuHangHoa.tsx (tiLe → soLuong). */
export function getBaseDonGiaBanTheoBacGia(vthh: VatTuHangHoaRecord, soLuong: number): number {
  const bangGiaRaw = vthh.bang_chiet_khau ?? []
  const bangGia = bangGiaRaw
    .filter((r) => {
      const tu = (r.so_luong_tu ?? '').trim()
      const den = (r.so_luong_den ?? '').trim()
      const gia = (r.ty_le_chiet_khau ?? '').trim()
      return tu !== '' || den !== '' || gia !== ''
    })
    .sort((a, b) => parseFloatVN(a.so_luong_tu ?? '') - parseFloatVN(b.so_luong_tu ?? ''))
  const hasBangGiaRows = bangGia.length > 0
  const donGiaBanTab1 = String(vthh.don_gia_ban ?? vthh.gia_ban_quy_dinh ?? '')
  const sl = Number.isFinite(soLuong) && soLuong > 0 ? soLuong : 1
  if (!hasBangGiaRows) return parseFloatVN(donGiaBanTab1) || 0
  const matchingRow = bangGia.find((r) => {
    const tu = parseFloatVN(r.so_luong_tu ?? '')
    const denStr = (r.so_luong_den ?? '').trim()
    const den = parseFloatVN(r.so_luong_den ?? '')
    if (denStr === '') return sl >= tu
    return sl >= tu && sl <= den
  })
  if (!matchingRow) return parseFloatVN(donGiaBanTab1) || 0
  const idxInSorted = bangGia.indexOf(matchingRow)
  const useDgBanTab1 = idxInSorted === 0
  /** Bậc đầu (khoảng SL nhỏ nhất sau sắp xếp): ưu tiên «ĐG bán» tại dòng bậc giá (`ty_le_chiet_khau`); chỉ khi trống/0 mới lấy `don_gia_ban` tab ngầm định — đồng bộ form VTHH. */
  const giaTaiDongBac = parseFloatVN(matchingRow.ty_le_chiet_khau ?? '')
  const baseNum = useDgBanTab1
    ? (giaTaiDongBac > 0 ? giaTaiDongBac : parseFloatVN(donGiaBanTab1))
    : parseFloatVN(matchingRow.ty_le_chiet_khau ?? '')
  return baseNum || parseFloatVN(donGiaBanTab1) || 0
}

/** Đơn giá bán hiển thị trên ô «Đơn giá» theo ĐVT dòng và SL (bậc giá + quy đổi ĐVT bán). */
export function getDonGiaBanDonHangBanLine(vthh: VatTuHangHoaRecord, dvtMa: string, soLuong: number): string {
  const dvtChinh = (vthh.dvt_chinh ?? '').trim()
  const sl = Number.isFinite(soLuong) && soLuong > 0 ? soLuong : 1
  const baseBan = getBaseDonGiaBanTheoBacGia(vthh, sl)
  if (dvtMa === dvtChinh) {
    return baseBan > 0 ? formatSoTienHienThi(baseBan) : ''
  }
  const quyDoi = vthh.don_vi_quy_doi ?? []
  const row = quyDoi.find((r) => (r.dvt ?? '').trim() === dvtMa)
  if (!row) return ''
  const giaBanInput = (row.gia_ban ?? '').toString().trim()
  if (giaBanInput) return formatSoTienHienThi(parseFloatVN(giaBanInput))
  const tiLe = parseFloatVN(row.ti_le_quy_doi ?? '1')
  const phep = row.phep_tinh
  if (tiLe <= 0) return baseBan > 0 ? formatSoTienHienThi(baseBan) : ''
  let calculated = baseBan
  if (phep === 'nhan') calculated = baseBan * tiLe
  else if (phep === 'chia') calculated = baseBan / tiLe
  return calculated > 0 ? formatSoTienHienThi(calculated) : ''
}

/** Cột tên dòng chi tiết Báo giá (SPHH). */
export const DON_HANG_BAN_COL_TEN_SPHH = 'Tên Sản phẩm, Hàng hóa' as const

/** Chuyển mẫu không đơn giá → có đơn giá (Báo giá): cột SPHH + Đơn giá bán theo bậc giá. */
export function migrateDonHangBanLinesToCoDonGia(
  prev: DonHangMuaGridLineRow[],
  vatTuList: VatTuHangHoaRecord[]
): DonHangMuaGridLineRow[] {
  return prev.map((line) => {
    const raw = line as Record<string, string>
    const ma = (line['Mã'] ?? '').trim()
    const vthh = ma ? vatTuList.find((vt) => vt.ma === ma) : undefined
    const dvtLine = (line['ĐVT'] ?? '').trim()
    const dvt = dvtLine || (vthh?.dvt_chinh ?? '').trim()
    const row: DonHangMuaGridLineRow = {
      'Mã': line['Mã'] ?? '',
      [DON_HANG_BAN_COL_TEN_SPHH]: raw[DON_HANG_BAN_COL_TEN_SPHH] ?? raw['Tên VTHH'] ?? '',
      'Nội dung': raw['Nội dung'] ?? '',
      'ĐVT': line['ĐVT'] ?? '',
      'mD': raw['mD'] ?? '',
      'mR': raw['mR'] ?? '',
      'Lượng': (raw['Lượng'] ?? '').trim() !== '' ? raw['Lượng'] ?? '1' : '1',
      'Số lượng': line['Số lượng'] ?? '',
      'Đơn giá': '',
      'Thành tiền': '',
      '% thuế GTGT': '',
      'Tiền thuế GTGT': '',
      'Tổng tiền': '',
      [COL_DD_GH]: (line[COL_DD_GH] ?? '').trim() !== '' ? String(line[COL_DD_GH]) : '0',
      'Ghi chú': line['Ghi chú'] ?? '',
    }
    if (vthh) {
      row._vthh = vthh
      const opts = buildDvtOptionsForVthh(vthh)
      if (opts) row._dvtOptions = opts
      const sl = Math.max(0, parseFloatVN(row['Số lượng'] ?? '')) || 1
      row['Đơn giá'] = getDonGiaBanDonHangBanLine(vthh, dvt, sl)
      const ts = vthh.thue_suat_gtgt
      row['% thuế GTGT'] = ts != null && String(ts) !== '' ? String(ts) : ''
    }
    const donGia = parseFloatVN(row['Đơn giá'] ?? '')
    const soLuong = Math.max(0, parseFloatVN(row['Số lượng'] ?? ''))
    const thanhTien = donGia * soLuong
    const pt = parsePctThueGtgtFromLine(row['% thuế GTGT'] ?? '')
    const tienThue = pt != null ? (thanhTien * pt) / 100 : 0
    row['Thành tiền'] = formatSoTienHienThi(thanhTien)
    row['Tiền thuế GTGT'] = formatSoTienHienThi(tienThue)
    row['Tổng tiền'] = formatSoTienHienThi(thanhTien + tienThue)
    return row
  })
}

/** Prefill chi tiết Báo giá: Đơn giá bán + thuế theo VTHH. */
export function enrichDonHangBanGridLinesWithVthh(
  prev: DonHangMuaGridLineRow[],
  vatTuList: VatTuHangHoaRecord[]
): DonHangMuaGridLineRow[] {
  return prev.map((line) => {
    const ma = (line['Mã'] ?? '').trim()
    if (!ma) return line
    const vthh = vatTuList.find((v) => v.ma === ma)
    if (!vthh) return line
    const dvt = (line['ĐVT'] ?? '').trim() || (vthh.dvt_chinh ?? '')
    const soLuong = Math.max(0, parseFloatVN(line['Số lượng'] ?? ''))
    const donGiaStr = getDonGiaBanDonHangBanLine(vthh, dvt, soLuong > 0 ? soLuong : 1)
    const donGia = parseFloatVN(donGiaStr)
    const thanhTien = donGia * soLuong
    const ptRaw = (vthh.thue_suat_gtgt ?? '').trim()
    const pt = ptRaw === '' ? null : parseFloatVN(ptRaw)
    const tienThue = pt != null ? (thanhTien * pt) / 100 : 0
    return {
      ...line,
      _vthh: vthh,
      _dvtOptions: buildDvtOptionsForVthh(vthh),
      'Đơn giá': donGia > 0 ? donGiaStr : '',
      '% thuế GTGT': ptRaw,
      'Thành tiền': formatSoTienHienThi(thanhTien),
      'Tiền thuế GTGT': formatSoTienHienThi(tienThue),
      'Tổng tiền': formatSoTienHienThi(thanhTien + tienThue),
    } as unknown as DonHangMuaGridLineRow
  })
}
