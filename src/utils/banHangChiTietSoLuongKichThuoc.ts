/**
 * Chi tiết SPHH bán hàng: **mD** = chiều dài, **mR** = chiều rộng, **Lượng** = lượng (nhân vào công thức).
 * Ưu tiên **`cong_thuc_tinh_so_luong`** trên VTHH (đánh giá placeholder [Chiều dài], [Chiều rộng], [Lượng], …).
 */
import { dvtLaMetVuong } from './dvtLaMetVuong'
import { formatSoTienHienThi, parseFloatVN } from './numberFormat'
import { tinhSoLuongTuCongThucVthh } from './vthhCongThucSoLuong'
import type { VatTuHangHoaRecord } from '../types/vatTuHangHoa'

export type BanHangChiTietKichThuocLine = {
  'Số lượng'?: string
  'mD'?: string
  'mR'?: string
  'Lượng'?: string
  'ĐVT'?: string
  _vthh?: VatTuHangHoaRecord
}

export function tinhSoLuongChiTietTuKichThuocVaVthh(
  line: BanHangChiTietKichThuocLine,
  dvtList: { ma_dvt: string; ten_dvt: string; ky_hieu?: string }[],
): string {
  const vthh = line._vthh
  const formulaRaw = vthh?.cong_thuc_tinh_so_luong?.trim()
  if (!formulaRaw) return line['Số lượng'] ?? ''

  const dai = parseFloatVN(line['mD'] ?? '') || 0
  const rong = parseFloatVN(line['mR'] ?? '') || 0
  const luong = parseFloatVN(line['Lượng'] ?? '1') || 1

  /** Luôn thử công thức VTHH trước (thiết lập chuẩn trên danh mục). */
  const nCongThuc = tinhSoLuongTuCongThucVthh(formulaRaw, { chieu_dai: dai, chieu_rong: rong, luong })
  if (nCongThuc != null && nCongThuc > 0) return formatSoTienHienThi(nCongThuc)

  const dvtRaw = (line['ĐVT'] ?? '').trim()
  const congThucCoKichThuoc =
    /\[\s*Chiều\s*dài\s*\]/i.test(formulaRaw) && /\[\s*Chiều\s*rộng\s*\]/i.test(formulaRaw)
  if (!dvtLaMetVuong(dvtRaw, dvtList) && !congThucCoKichThuoc) return line['Số lượng'] ?? ''

  const formulaLower = formulaRaw.toLowerCase()
  if (formulaLower.includes('dài') && formulaLower.includes('rộng') && formulaLower.includes('lượng')) {
    const result = dai * rong * luong
    return result > 0 ? formatSoTienHienThi(result) : ''
  }
  return line['Số lượng'] ?? ''
}
