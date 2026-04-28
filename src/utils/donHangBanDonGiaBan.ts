/**
 * Đơn giá bán trên form Báo giá — đồng bộ logic Tab Bậc giá / Tab ngầm định (VTHH).
 * Căn cứ số lượng dòng báo giá để chọn khoảng bậc giá; không có bậc giá → đg bán tab ngầm định (don_gia_ban / gia_ban_quy_dinh).
 */
import { formatSoTienHienThi, parseFloatVN } from './numberFormat'
import type { VatTuHangHoaRecord } from '../types/vatTuHangHoa'
import {
  buildDvtOptionsForVthh,
  parsePctThueGtgtFromLine,
  type VthhVariantContext,
  type DonHangMuaGridLineRow,
} from './donHangMuaCalculations'
import { BAN_HANG_COL_DCNH } from './banHangDcnhStorage'
import { thanhTienChiTietBanHang } from './banHangChiTietTien'

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

function resolveMatrixRow(vthh: VatTuHangHoaRecord, context?: VthhVariantContext): NonNullable<VatTuHangHoaRecord['pricing_matrix']>[number] | null {
  const rows = Array.isArray(vthh.pricing_matrix) ? vthh.pricing_matrix : []
  if (rows.length === 0) return null
  const norm = (v?: string) => (v ?? '').trim().toLowerCase()
  const maQc = norm(context?.maQuyCach || vthh.ma_quy_cach)
  if (maQc) {
    const byMa = rows.find((r) => norm(r.ma_quy_cach) === maQc)
    if (byMa) return byMa
  }
  const dl = norm(context?.dinhLuong || vthh.dinh_luong)
  const kg = norm(context?.khoGiay || vthh.kho_giay)
  const dd = norm(context?.doDay || vthh.do_day)
  const found = rows.find((r) => {
    if (dl && norm(r.dinh_luong) !== dl) return false
    if (kg && norm(r.kho_giay) !== kg) return false
    if (dd && norm(r.do_day) !== dd) return false
    return dl || kg || dd
  })
  return found ?? null
}

function getTierIndexBySoLuong(vthh: VatTuHangHoaRecord, soLuong: number): number {
  const bangGiaRaw = vthh.bang_chiet_khau ?? []
  const bangGia = bangGiaRaw
    .filter((r) => (r.so_luong_tu ?? '').trim() !== '' || (r.so_luong_den ?? '').trim() !== '' || (r.ty_le_chiet_khau ?? '').trim() !== '')
    .sort((a, b) => parseFloatVN(a.so_luong_tu ?? '') - parseFloatVN(b.so_luong_tu ?? ''))
  if (bangGia.length === 0) return 0
  const sl = Number.isFinite(soLuong) && soLuong > 0 ? soLuong : 1
  const idx = bangGia.findIndex((r) => {
    const tu = parseFloatVN(r.so_luong_tu ?? '')
    const denStr = (r.so_luong_den ?? '').trim()
    const den = parseFloatVN(r.so_luong_den ?? '')
    if (denStr === '') return sl >= tu
    return sl >= tu && sl <= den
  })
  return idx >= 0 ? idx : 0
}

export function getBanHangB1TtAdjustment(
  vthh: VatTuHangHoaRecord,
  soLuong: number,
  context?: VthhVariantContext,
): { ap_dung: boolean; so_luong_goi_y: number; dvt_goi_y: string; ghi_chu: string } {
  const matrixRow = resolveMatrixRow(vthh, context)
  if (!matrixRow) return { ap_dung: false, so_luong_goi_y: soLuong, dvt_goi_y: (vthh.dvt_chinh ?? '').trim(), ghi_chu: '' }
  const tierIdx = getTierIndexBySoLuong(vthh, soLuong)
  const rowPm = matrixRow as { gia_ban_tt?: number }
  const donGiaTt = Number(rowPm.gia_ban_tt) || 0
  if (tierIdx !== 0 || !(soLuong > 0 && soLuong < 1) || donGiaTt <= 0) {
    return { ap_dung: false, so_luong_goi_y: soLuong, dvt_goi_y: (vthh.dvt_chinh ?? '').trim(), ghi_chu: '' }
  }
  const dvtChinh = (vthh.dvt_chinh ?? '').trim() || 'm2'
  return {
    ap_dung: true,
    so_luong_goi_y: 1,
    dvt_goi_y: 'Bộ',
    ghi_chu: `áp dụng đơn giá tối thiểu do số lượng <1 ${dvtChinh}.`,
  }
}

/** Đơn giá bán hiển thị trên ô «Đơn giá» theo ĐVT dòng và SL (bậc giá + quy đổi ĐVT bán). */
export function getDonGiaBanDonHangBanLine(vthh: VatTuHangHoaRecord, dvtMa: string, soLuong: number, context?: VthhVariantContext): string {
  const dvtChinh = (vthh.dvt_chinh ?? '').trim()
  const sl = Number.isFinite(soLuong) && soLuong > 0 ? soLuong : 1
  const matrixRow = resolveMatrixRow(vthh, context)
  const tierIdx = getTierIndexBySoLuong(vthh, sl)
  const matrixGiaBan = (() => {
    if (!matrixRow) return 0
    if (tierIdx <= 0) return Number(matrixRow.gia_ban) || 0
    if (tierIdx === 1) return Number(matrixRow.gia_ban_1) || Number(matrixRow.gia_ban) || 0
    if (tierIdx === 2) return Number(matrixRow.gia_ban_2) || Number(matrixRow.gia_ban_1) || Number(matrixRow.gia_ban) || 0
    return Number(matrixRow.gia_ban_3) || Number(matrixRow.gia_ban_2) || Number(matrixRow.gia_ban_1) || Number(matrixRow.gia_ban) || 0
  })()
  const baseBan = matrixGiaBan > 0 ? matrixGiaBan : getBaseDonGiaBanTheoBacGia(vthh, sl)
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
      [BAN_HANG_COL_DCNH]: raw[BAN_HANG_COL_DCNH] ?? '0',
      '% thuế GTGT': '',
      'Tiền thuế GTGT': '',
      'Tổng tiền': '',
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
    const thanhTien = thanhTienChiTietBanHang(donGia, soLuong)
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
    const thanhTien = thanhTienChiTietBanHang(donGia, soLuong)
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
