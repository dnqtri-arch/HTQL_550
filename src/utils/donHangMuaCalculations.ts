import { formatSoTienHienThi, parseFloatVN } from './numberFormat'
import type { DonHangMuaChiTiet } from '../types/donHangMua'
import type { VatTuHangHoaRecord } from '../types/vatTuHangHoa'

/** Cột chỉ số địa điểm giao hàng trên lưới đơn hàng mua. */
export const COL_DD_GH = 'ĐĐGH'

export type DonHangMuaGridLineRow = Record<string, string> & { _dvtOptions?: string[]; _vthh?: VatTuHangHoaRecord }

export function buildDvtOptionsForVthh(vthh: VatTuHangHoaRecord): string[] | undefined {
  const main = (vthh.dvt_chinh ?? '').trim()
  const quyDoi = vthh.don_vi_quy_doi
  if (!Array.isArray(quyDoi) || quyDoi.length === 0) return undefined
  const codes = new Set<string>()
  if (main) codes.add(main)
  quyDoi.forEach((r) => {
    const d = (r.dvt ?? '').trim()
    if (d) codes.add(d)
  })
  const arr = Array.from(codes)
  return arr.length > 1 ? arr : undefined
}

/** ĐG mua theo ĐVT — dùng form ĐHM và migrate mẫu. */
export function getDonGiaMuaTheoDvt(vthh: VatTuHangHoaRecord, dvtMa: string): string {
  const dvtChinh = (vthh.dvt_chinh ?? '').trim()
  if (dvtMa === dvtChinh) {
    const latest = Number(vthh.gia_mua_gan_nhat) || 0
    const fixed = Number(vthh.don_gia_mua_co_dinh) || 0
    if (latest === 0) return fixed > 0 ? formatSoTienHienThi(fixed) : ''
    return formatSoTienHienThi(latest)
  }
  const quyDoi = vthh.don_vi_quy_doi ?? []
  const row = quyDoi.find((r) => (r.dvt ?? '').trim() === dvtMa)
  if (!row) return ''
  const giaMuaInput = (row.gia_mua ?? '').toString().trim()
  if (giaMuaInput) return formatSoTienHienThi(parseFloatVN(giaMuaInput))
  const base = Number(vthh.gia_mua_gan_nhat) || Number(vthh.don_gia_mua_co_dinh) || 0
  const tiLe = parseFloatVN(row.ti_le_quy_doi ?? '1')
  const phep = row.phep_tinh
  if (tiLe <= 0) return base > 0 ? formatSoTienHienThi(base) : ''
  let calculated = base
  if (phep === 'nhan') calculated = base * tiLe
  else if (phep === 'chia') calculated = base / tiLe
  return calculated > 0 ? formatSoTienHienThi(calculated) : ''
}

/** Parse % thuế GTGT từ ô lưới → null nếu không áp dụng. */
export function parsePctThueGtgtFromLine(ptRaw: string): number | null {
  const t = (ptRaw ?? '').trim()
  if (t === '' || t === 'Chưa xác định') return null
  return parseFloatVN(t)
}

/** Chuyển mẫu không đơn giá → có đơn giá: giữ dòng, điền ĐG/% thuế từ VTHH, tính tiền. */
export function migrateDonHangLinesToCoDonGia(prev: DonHangMuaGridLineRow[], vatTuList: VatTuHangHoaRecord[]): DonHangMuaGridLineRow[] {
  return prev.map((line) => {
    const ma = (line['Mã'] ?? '').trim()
    const vthh = ma ? vatTuList.find((vt) => vt.ma === ma) : undefined
    const dvtLine = (line['ĐVT'] ?? '').trim()
    const dvt = dvtLine || (vthh?.dvt_chinh ?? '').trim()
    const row: DonHangMuaGridLineRow = {
      'Mã': line['Mã'] ?? '',
      'Tên VTHH': line['Tên VTHH'] ?? '',
      'ĐVT': line['ĐVT'] ?? '',
      'Số lượng': line['Số lượng'] ?? '',
      'ĐG mua': '',
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
      row['ĐG mua'] = getDonGiaMuaTheoDvt(vthh, dvt)
      const ts = vthh.thue_suat_gtgt
      row['% thuế GTGT'] = ts != null && String(ts) !== '' ? String(ts) : ''
    }
    const donGia = parseFloatVN(row['ĐG mua'] ?? '')
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

export function chiTietToLines(ct: DonHangMuaChiTiet[]): DonHangMuaGridLineRow[] {
  return ct.map((c) => {
    const thanhTien = c.thanh_tien
    const tienThue = c.tien_thue_gtgt ?? 0
    const ddIdx = c.dd_gh_index != null && c.dd_gh_index >= 0 ? c.dd_gh_index : 0
    return {
      'Mã': c.ma_hang,
      'Tên VTHH': c.ten_hang,
      'ĐVT': c.dvt,
      'Số lượng': formatSoTienHienThi(c.so_luong),
      'ĐG mua': formatSoTienHienThi(c.don_gia),
      'Thành tiền': formatSoTienHienThi(thanhTien),
      '% thuế GTGT': c.pt_thue_gtgt != null ? String(c.pt_thue_gtgt) : '',
      'Tiền thuế GTGT': formatSoTienHienThi(tienThue),
      'Tổng tiền': formatSoTienHienThi(thanhTien + tienThue),
      [COL_DD_GH]: String(ddIdx),
      'Ghi chú': c.ghi_chu ?? '',
    }
  })
}

/** Tổng tiền hàng, thuế, thanh toán từ các dòng lưới (có mã hàng). */
/** Đơn giá dòng lưới (Báo giá dùng «Đơn giá», Đơn hàng mua dùng «ĐG mua»). */
export function lineDonGiaCell(line: DonHangMuaGridLineRow): string {
  return (line['Đơn giá'] ?? line['ĐG mua'] ?? '') as string
}

export function computeDonHangMuaFooterTotals(
  lines: DonHangMuaGridLineRow[],
  opts?: { apDungVatGtgt?: boolean }
): {
  tongTienHang: number
  tienThue: number
  tongTienThanhToan: number
} {
  const vatOn = opts?.apDungVatGtgt !== false
  let hang = 0
  let thue = 0
  for (const line of lines) {
    if ((line['Mã'] ?? '').trim() === '') continue
    const thanhTien = parseFloatVN(lineDonGiaCell(line)) * parseFloatVN(line['Số lượng'] ?? '')
    const pt = vatOn ? parsePctThueGtgtFromLine(line['% thuế GTGT'] ?? '') : null
    const tienThueDong = pt != null ? (thanhTien * pt) / 100 : 0
    hang += thanhTien
    thue += tienThueDong
  }
  return { tongTienHang: hang, tienThue: thue, tongTienThanhToan: hang + thue }
}

/** Enrich chi tiết với ĐG mua, % thuế từ VTHH — prefill / đối chiếu. */
/** Hiển thị ô chỉ đọc: Thành tiền / Tiền thuế / Tổng tiền (đồng bộ parse % thuế). */
export function formatDonHangLineThanhTienDisplay(line: DonHangMuaGridLineRow): string {
  const thanhTien = parseFloatVN(lineDonGiaCell(line)) * parseFloatVN(line['Số lượng'] ?? '')
  return formatSoTienHienThi(thanhTien)
}

export function formatDonHangLineTienThueDisplay(line: DonHangMuaGridLineRow): string {
  const thanhTien = parseFloatVN(lineDonGiaCell(line)) * parseFloatVN(line['Số lượng'] ?? '')
  const pt = parsePctThueGtgtFromLine(line['% thuế GTGT'] ?? '')
  const tienThue = pt != null ? (thanhTien * pt) / 100 : 0
  return formatSoTienHienThi(tienThue)
}

export function formatDonHangLineTongTienDisplay(line: DonHangMuaGridLineRow): string {
  const thanhTien = parseFloatVN(lineDonGiaCell(line)) * parseFloatVN(line['Số lượng'] ?? '')
  const pt = parsePctThueGtgtFromLine(line['% thuế GTGT'] ?? '')
  const tienThue = pt != null ? (thanhTien * pt) / 100 : 0
  return formatSoTienHienThi(thanhTien + tienThue)
}

export function enrichDonHangGridLinesWithVthh(
  prev: DonHangMuaGridLineRow[],
  vatTuList: VatTuHangHoaRecord[]
): DonHangMuaGridLineRow[] {
  return prev.map((line) => {
    const ma = (line['Mã'] ?? '').trim()
    if (!ma) return line
    const vthh = vatTuList.find((v) => v.ma === ma)
    if (!vthh) return line
    const dvt = (line['ĐVT'] ?? '').trim() || (vthh.dvt_chinh ?? '')
    const donGiaStr = getDonGiaMuaTheoDvt(vthh, dvt)
    const donGia = parseFloatVN(donGiaStr)
    const soLuong = parseFloatVN(line['Số lượng'] ?? '')
    const thanhTien = donGia * soLuong
    const ptRaw = (vthh.thue_suat_gtgt ?? '').trim()
    const pt = ptRaw === '' ? null : parseFloatVN(ptRaw)
    const tienThue = pt != null ? (thanhTien * pt) / 100 : 0
    return {
      ...line,
      _vthh: vthh,
      _dvtOptions: buildDvtOptionsForVthh(vthh),
      'ĐG mua': donGia > 0 ? formatSoTienHienThi(donGia) : '',
      '% thuế GTGT': ptRaw,
      'Thành tiền': formatSoTienHienThi(thanhTien),
      'Tiền thuế GTGT': formatSoTienHienThi(tienThue),
      'Tổng tiền': formatSoTienHienThi(thanhTien + tienThue),
    } as unknown as DonHangMuaGridLineRow
  })
}
