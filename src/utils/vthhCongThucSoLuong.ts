/**
 * Đánh giá `cong_thuc_tinh_so_luong` của VTHH — biến [Chiều dài], [Chiều rộng], [Lượng], …
 * Đồng bộ quy ước placeholder với `FORMULA_TEMPLATES` trong `vatTuHangHoaForm.tsx`.
 */

export type CongThucKichThuocGiaTri = {
  chieu_dai: number
  chieu_rong: number
  luong: number
  chieu_cao?: number
  ban_kinh?: number
}

function evalSafeNumericExpr(expr: string): number | null {
  const cleaned = expr
    .replace(/\s+/g, '')
    .replace(/×|✕|∗|⋅/g, '*')
    .replace(/÷/g, '/')
  if (!cleaned) return null
  if (!/^[\d.eE+\-*/().]+$/.test(cleaned)) return null
  try {
    const n = Function(`"use strict"; return (${cleaned})`)() as unknown
    return typeof n === 'number' && Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

/**
 * Thay placeholder bằng số rồi tính biểu thức.
 * Trả `null` nếu không tính được hoặc công thức rỗng.
 */
export function tinhSoLuongTuCongThucVthh(formulaRaw: string | null | undefined, v: CongThucKichThuocGiaTri): number | null {
  const f = (formulaRaw ?? '').trim()
  if (!f) return null
  const dai = Number.isFinite(v.chieu_dai) ? v.chieu_dai : 0
  const rong = Number.isFinite(v.chieu_rong) ? v.chieu_rong : 0
  const luong = Number.isFinite(v.luong) ? v.luong : 0
  const cao = Number.isFinite(v.chieu_cao ?? NaN) ? (v.chieu_cao as number) : 0
  const bk = Number.isFinite(v.ban_kinh ?? NaN) ? (v.ban_kinh as number) : 0

  let expr = f
  expr = expr.replace(/\[\s*Chiều\s*dài\s*\]/gi, String(dai))
  expr = expr.replace(/\[\s*Chiều\s*rộng\s*\]/gi, String(rong))
  expr = expr.replace(/\[\s*Chiều\s*cao\s*\]/gi, String(cao))
  expr = expr.replace(/\[\s*Bán\s*kính\s*\]/gi, String(bk))
  expr = expr.replace(/\[\s*Lượng\s*\]/gi, String(luong))

  const n = evalSafeNumericExpr(expr)
  return n != null && n > 0 ? n : null
}
