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
  const normCompact = (v?: string) => norm(v).replace(/\s+/g, '')
  const firstToken = (v?: string) =>
    String(v ?? '')
      .split(/[;,]/)
      .map((x) => x.trim())
      .find(Boolean) ?? ''
  const maQc = norm(context?.maQuyCach || vthh.ma_quy_cach)
  if (maQc) {
    const byMa = rows.find((r) => norm(r.ma_quy_cach) === maQc)
    if (byMa) return byMa
  }
  const dl = norm(firstToken(context?.dinhLuong || vthh.dinh_luong))
  const kg = norm(firstToken(context?.khoGiay || vthh.kho_giay))
  const dd = norm(firstToken(context?.doDay || vthh.do_day))
  const dlc = normCompact(dl)
  const kgc = normCompact(kg)
  const ddc = normCompact(dd)
  if (!dl && !kg && !dd) return rows[0] ?? null

  let best: (typeof rows)[number] | null = null
  let bestScore = -1
  rows.forEach((r) => {
    const rowDl = norm(r.dinh_luong || r.do_day)
    const rowKg = norm(r.kho_giay)
    const rowDd = norm(r.do_day || r.dinh_luong)
    const rowDlc = normCompact(rowDl)
    const rowKgc = normCompact(rowKg)
    const rowDdc = normCompact(rowDd)
    let score = 0
    if (dl) {
      if (rowDlc === dlc || rowDdc === dlc) score += 3
      else if (rowDl && (rowDlc.includes(dlc) || dlc.includes(rowDlc))) score += 1
    }
    if (kg) {
      if (rowKgc === kgc) score += 4
      else if (rowKg && (rowKgc.includes(kgc) || kgc.includes(rowKgc))) score += 1
    }
    if (dd) {
      if (rowDdc === ddc || rowDlc === ddc) score += 3
      else if (rowDd && (rowDdc.includes(ddc) || ddc.includes(rowDdc))) score += 1
    }
    if (score > bestScore) {
      bestScore = score
      best = r
    }
  })
  return bestScore > 0 ? best : (rows[0] ?? null)
}

function sortedBangChietKhau(vthh: VatTuHangHoaRecord) {
  return (vthh.bang_chiet_khau ?? [])
    .filter((r) => (r.so_luong_tu ?? '').trim() !== '' || (r.so_luong_den ?? '').trim() !== '' || (r.ty_le_chiet_khau ?? '').trim() !== '')
    .sort((a, b) => parseFloatVN(a.so_luong_tu ?? '') - parseFloatVN(b.so_luong_tu ?? ''))
}

function getTierIndexBySoLuong(vthh: VatTuHangHoaRecord, soLuong: number): number {
  const bangGia = sortedBangChietKhau(vthh)
  if (bangGia.length === 0) return -1
  const sl = Number.isFinite(soLuong) && soLuong > 0 ? soLuong : 1
  const idx = bangGia.findIndex((r) => {
    const tu = parseFloatVN(r.so_luong_tu ?? '')
    const denStr = (r.so_luong_den ?? '').trim()
    const den = parseFloatVN(r.so_luong_den ?? '')
    if (denStr === '') return sl >= tu
    return sl >= tu && sl <= den
  })
  return idx >= 0 ? idx : -1
}

export function getBanHangB1TtAdjustment(
  vthh: VatTuHangHoaRecord,
  soLuong: number,
  context?: VthhVariantContext,
): { ap_dung: boolean; so_luong_goi_y: number; dvt_goi_y: string; ghi_chu: string } {
  const dvtChinhFallback = (vthh.dvt_chinh ?? '').trim()
  const matrixRow = resolveMatrixRow(vthh, context)
  if (!matrixRow) return { ap_dung: false, so_luong_goi_y: soLuong, dvt_goi_y: dvtChinhFallback, ghi_chu: '' }
  const donGiaTt = Number((matrixRow as { gia_ban_tt?: number }).gia_ban_tt) || 0
  if (donGiaTt <= 0) return { ap_dung: false, so_luong_goi_y: soLuong, dvt_goi_y: dvtChinhFallback, ghi_chu: '' }

  const bangSorted = sortedBangChietKhau(vthh)
  if (bangSorted.length === 0) return { ap_dung: false, so_luong_goi_y: soLuong, dvt_goi_y: dvtChinhFallback, ghi_chu: '' }
  const tu0 = parseFloatVN(bangSorted[0].so_luong_tu ?? '')
  if (!Number.isFinite(tu0) || tu0 <= 0) return { ap_dung: false, so_luong_goi_y: soLuong, dvt_goi_y: dvtChinhFallback, ghi_chu: '' }
  if (!(soLuong > 0 && soLuong < tu0)) {
    return { ap_dung: false, so_luong_goi_y: soLuong, dvt_goi_y: dvtChinhFallback, ghi_chu: '' }
  }

  const dvtChinh = dvtChinhFallback || 'm2'
  const tu0Disp = String(bangSorted[0].so_luong_tu ?? '').trim() || String(tu0)
  return {
    ap_dung: true,
    so_luong_goi_y: 1,
    dvt_goi_y: 'Bộ',
    ghi_chu: `áp dụng đơn giá tối thiểu do số lượng <${tu0Disp} ${dvtChinh} (ĐG TT).`,
  }
}

/** Áp giá gốc (ĐVT chính hoặc quy đổi) — dùng cho đơn giá TT và đơn giá bậc Bk. */
function formatDonGiaBanWithDvtOptions(vthh: VatTuHangHoaRecord, dvtMa: string, baseBan: number): string {
  const dvtChinh = (vthh.dvt_chinh ?? '').trim()
  if (baseBan <= 0) return ''
  if (dvtMa === dvtChinh) return formatSoTienHienThi(baseBan)
  const quyDoi = vthh.don_vi_quy_doi ?? []
  const row = quyDoi.find((r) => (r.dvt ?? '').trim() === dvtMa)
  /** ĐG TT / bậc: khi ép hiển thị ĐVT «Bộ» (tối thiểu) mà không khai ĐVQĐ «Bộ» — một Bộ = một lần áp giá gốc. */
  if (!row && dvtMa.trim() === 'Bộ') return formatSoTienHienThi(baseBan)
  if (!row) return ''
  const giaBanInput = (row.gia_ban ?? '').toString().trim()
  if (giaBanInput) return formatSoTienHienThi(parseFloatVN(giaBanInput))
  const tiLe = parseFloatVN(row.ti_le_quy_doi ?? '1')
  const phep = row.phep_tinh
  if (tiLe <= 0) return formatSoTienHienThi(baseBan)
  let calculated = baseBan
  if (phep === 'nhan') calculated = baseBan * tiLe
  else if (phep === 'chia') calculated = baseBan / tiLe
  return calculated > 0 ? formatSoTienHienThi(calculated) : ''
}

/** Đơn giá bán hiển thị trên ô «Đơn giá» theo ĐVT dòng và SL (matrix + bậc giá + ĐVQĐ). */
export function getDonGiaBanBaoGiaLine(vthh: VatTuHangHoaRecord, dvtMa: string, soLuong: number, context?: VthhVariantContext): string {
  const sl = Number.isFinite(soLuong) && soLuong > 0 ? soLuong : 1
  const matrixRow = resolveMatrixRow(vthh, context)
  const bangSorted = sortedBangChietKhau(vthh)
  const tu0 = bangSorted.length > 0 ? parseFloatVN(bangSorted[0].so_luong_tu ?? '') : NaN

  /** Miền đơn giá TT: SL > 0 và nhỏ hơn «Số lượng từ» dòng 1 bậc giá — lấy `gia_ban_tt` trên đúng dòng matrix (ĐL/khổ). */
  const inTtZone =
    matrixRow &&
    bangSorted.length > 0 &&
    Number.isFinite(tu0) &&
    tu0 > 0 &&
    sl > 0 &&
    sl < tu0
  if (inTtZone) {
    const tt = Number((matrixRow as { gia_ban_tt?: number }).gia_ban_tt) || 0
    if (tt > 0) return formatDonGiaBanWithDvtOptions(vthh, dvtMa, tt)
  }

  const tierIdx = getTierIndexBySoLuong(vthh, sl)
  const matrixGiaBan = (() => {
    if (!matrixRow) return 0
    if (tierIdx < 0) return 0
    if (tierIdx === 0) return Number(matrixRow.gia_ban) || 0
    if (tierIdx === 1) return Number(matrixRow.gia_ban_1) || Number(matrixRow.gia_ban) || 0
    if (tierIdx === 2) return Number(matrixRow.gia_ban_2) || Number(matrixRow.gia_ban_1) || Number(matrixRow.gia_ban) || 0
    return Number(matrixRow.gia_ban_3) || Number(matrixRow.gia_ban_2) || Number(matrixRow.gia_ban_1) || Number(matrixRow.gia_ban) || 0
  })()
  const baseBan = matrixGiaBan > 0 ? matrixGiaBan : getBaseDonGiaBanTheoBacGia(vthh, sl)
  return formatDonGiaBanWithDvtOptions(vthh, dvtMa, baseBan)
}

/** Cột tên dòng chi tiết Báo giá (SPHH). */
export const BAO_GIA_COL_TEN_SPHH = 'Tên Sản phẩm, Hàng hóa' as const

/** Chuyển mẫu không đơn giá → có đơn giá (Báo giá): cột SPHH + Đơn giá bán theo bậc giá. */
export function migrateBaoGiaLinesToCoDonGia(
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
      [BAO_GIA_COL_TEN_SPHH]: raw[BAO_GIA_COL_TEN_SPHH] ?? raw['Tên VTHH'] ?? '',
      'Độ dày/ ĐL': raw['Độ dày/ ĐL'] ?? raw['Độ dày'] ?? '',
      'Khổ giấy': raw['Khổ giấy'] ?? '',
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
      row['Độ dày/ ĐL'] = (vthh.do_day ?? vthh.dinh_luong ?? '').trim()
      const opts = buildDvtOptionsForVthh(vthh)
      if (opts) row._dvtOptions = opts
      const sl = Math.max(0, parseFloatVN(row['Số lượng'] ?? '')) || 1
      row['Đơn giá'] = getDonGiaBanBaoGiaLine(vthh, dvt, sl)
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
export function enrichBaoGiaGridLinesWithVthh(
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
    const donGiaStr = getDonGiaBanBaoGiaLine(vthh, dvt, soLuong > 0 ? soLuong : 1)
    const donGia = parseFloatVN(donGiaStr)
    const thanhTien = thanhTienChiTietBanHang(donGia, soLuong)
    const ptRaw = (vthh.thue_suat_gtgt ?? '').trim()
    const pt = ptRaw === '' ? null : parseFloatVN(ptRaw)
    const tienThue = pt != null ? (thanhTien * pt) / 100 : 0
    return {
      ...line,
      _vthh: vthh,
      _dvtOptions: buildDvtOptionsForVthh(vthh),
      'Độ dày/ ĐL': (vthh.do_day ?? vthh.dinh_luong ?? '').trim(),
      'Đơn giá': donGia > 0 ? donGiaStr : '',
      '% thuế GTGT': ptRaw,
      'Thành tiền': formatSoTienHienThi(thanhTien),
      'Tiền thuế GTGT': formatSoTienHienThi(tienThue),
      'Tổng tiền': formatSoTienHienThi(thanhTien + tienThue),
    } as unknown as DonHangMuaGridLineRow
  })
}
