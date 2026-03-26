/**
 * Định dạng số toàn hệ thống:
 * - Phân cách hàng nghìn: dấu chấm (.)
 * - Phân cách thập phân: dấu phẩy (,)
 * VD: 1.234.567,89
 *
 * Số tiền (formatSoTien) — quy ước nhập (đồng bộ với .cursor/rules/number-format.mdc):
 * - Chỉ gõ số: chấm (.) = phân tách hàng nghìn. VD: 12345678 → "12.345.678".
 * - Chủ động gõ chấm (.) hoặc phẩy (,): thập phân, hiển thị thành phẩy. VD: "12.345.678" + "." → "12.345.678,"; gõ tiếp "5" → "12.345.678,5".
 * - Chuỗi kết thúc bằng chấm: coi chấm cuối là thập phân → hiển thị phần nguyên + phẩy (cho phép nhập chấm sau số đã format).
 * - Chưa có phẩy thì mọi chấm đều hàng nghìn (tránh "1.234.567"+"8" thành "1.234,56").
 * - Đã có phẩy: dùng findDecimalSeparatorIndex để lấy tối đa 2 chữ số thập phân.
 */

export const THOUSANDS_SEP = '.'
export const DECIMAL_SEP = ','

/**
 * Bỏ số 0 vô nghĩa ở đầu chuỗi số nguyên. Giữ "0" nếu toàn bộ là 0.
 * VD: "01" -> "1", "007" -> "7", "0" -> "0"
 */
function stripLeadingZeros(s: string): string {
  if (!s || s === '0') return s
  const t = s.replace(/^0+/, '')
  return t === '' ? '0' : t
}

/**
 * Tìm vị trí phân cách thập phân trong chuỗi nhập — LOGIC DÙNG CHO TOÀN HỆ THỐNG.
 * - Ưu tiên: dấu phải nhất mà ngay sau nó có đúng 1 hoặc 2 chữ số (phần thập phân thực sự), rồi hết chuỗi hoặc gặp [.,]. VD "123456.7." -> dấu trước "7" -> 123.456,7; dấu chấm thứ 2 bỏ.
 * - Nếu không có dấu nào thỏa (vd "1.234."): lấy dấu phải nhất -> "1.234,".
 * Dùng trong formatSoTien, formatPhanTramInput. Khi thêm ô nhập số có thập phân ở module khác, gọi formatSoTien(s) hoặc formatPhanTramInput(s) từ utils/numberFormat.
 */
function findDecimalSeparatorIndex(s: string): number {
  const cleaned = (s || '').replace(/[^\d.,]/g, '')
  const sepIndices: number[] = []
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '.' || cleaned[i] === ',') sepIndices.push(i)
  }
  if (sepIndices.length === 0) return -1
  const hasRealDecimalPart = (idx: number) => {
    const after = cleaned.slice(idx + 1)
    return /^\d{1,2}([.,]|$)/.test(after)
  }
  for (let j = sepIndices.length - 1; j >= 0; j--) {
    if (hasRealDecimalPart(sepIndices[j])) return sepIndices[j]
  }
  return sepIndices[sepIndices.length - 1]
}

/**
 * Chuyển chuỗi đã format (1.234.567,89) về chuỗi số thuần để parseFloat.
 * Bỏ dấu . và đổi , thành .
 */
export function parseNumber(s: string): string {
  return (s || '').replace(/\./g, '').replace(',', '.')
}

/**
 * Parse chuỗi đã format thành number.
 */
export function parseFloatVN(s: string): number {
  return parseFloat(parseNumber(s)) || 0
}

/**
 * Parse số từ chuỗi có thể dùng dấu chấm hoặc phẩy làm thập phân.
 * VD: "0,91" → 0.91, "0.91" → 0.91 (tránh parseNumber coi . là hàng nghìn thành 91).
 * Dùng cho ô nhập kích thước (mR, mC) khi tính tỉ lệ mR × mC.
 */
export function parseDecimalFlex(s: string): number {
  const cleaned = (s || '').trim().replace(/[^\d.,]/g, '')
  if (!cleaned) return 0
  const idx = findDecimalSeparatorIndex(cleaned)
  if (idx < 0) return parseFloat(parseNumber(cleaned)) || 0
  if (cleaned[idx] === ',') return parseFloat(parseNumber(cleaned)) || 0
  return parseFloat(cleaned.replace(/,/g, '')) || 0
}

/**
 * Kiểm tra chuỗi đang hiển thị là số 0 (0, 0,00, 0,0, 000...).
 * Dùng cho nguyên tắc: khi chọn ô nhập số đang hiển thị 0 thì xóa 0 để nhập bình thường.
 */
export function isZeroDisplay(s: string): boolean {
  return parseFloatVN(s || '') === 0
}

/**
 * Định dạng số nguyên: chỉ phân cách hàng nghìn bằng dấu chấm.
 * VD: 1234567 -> "1.234.567"
 */
export function formatSoNguyen(value: number | string): string {
  const n = typeof value === 'number' ? value : parseFloat(parseNumber(String(value)))
  if (Number.isNaN(n) || !Number.isFinite(n)) return ''
  const intPart = Math.floor(Math.abs(n)).toString()
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEP)
  return n < 0 ? `-${formatted}` : formatted
}

/**
 * Định dạng khi nhập số nguyên (số nguyên dương, không thập phân).
 * Nguyên tắc nhập: phân cách hàng nghìn (dấu chấm), số 0 ở đầu tự động bỏ. Không có phân cách thập phân.
 * VD: "01234" -> "1.234", "007" -> "7"
 */
export function formatSoNguyenInput(s: string): string {
  const digits = (s || '').replace(/\D/g, '')
  const stripped = stripLeadingZeros(digits)
  return stripped.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEP)
}

/**
 * Định dạng khi nhập số tự nhiên (có thể có thập phân).
 * Nguyên tắc nhập: phân cách hàng nghìn (.), phân cách thập phân (,), số 0 ở đầu tự động bỏ.
 * Tối đa 2 chữ số thập phân.
 * VD: "01234" -> "1.234" | "1234,5" -> "1.234,5" | "100,88" -> "100,88"
 */
export function formatSoTuNhienInput(s: string): string {
  return formatSoTien(s)
}

/**
 * Chuỗi lưu trữ: phẩy phân cách thập phân, không lưu dấu chấm hàng nghìn (dễ tính toán).
 * VD: "1.234.567,5" → "1234567,5", "1,07" → "1,07".
 */
export function toStoredNumberString(s: string): string {
  return (s || '').replace(/\./g, '')
}

/**
 * Chuyển number sang chuỗi lưu trữ (phẩy thập phân, không chấm hàng nghìn).
 * VD: 10.7 → "10,7", 1234567.89 → "1234567,89". Dùng khi ghi tỉ lệ từ phép tính.
 */
export function numberToStoredFormat(n: number, maxDecimals = 10): string {
  if (!Number.isFinite(n)) return ''
  const fixed = n.toFixed(maxDecimals).replace(/0+$/, '').replace(/\.0+$/, '')
  if (fixed.includes('.')) {
    const [i, d] = fixed.split('.')
    return i + ',' + d
  }
  return fixed
}

/**
 * Chuẩn hóa chuỗi nhập cho ô kích thước (mR, mC): nếu có một dấu chấm và phần sau là 1–2 chữ số thì coi là thập phân, đổi thành phẩy để formatSoTien không bỏ chấm (tránh "0.91" → "91").
 */
export function normalizeKichThuocInput(s: string): string {
  const cleaned = (s || '').replace(/[^\d.,]/g, '')
  if (cleaned.includes(',')) return s
  const lastDot = cleaned.lastIndexOf('.')
  if (lastDot < 0) return s
  const after = cleaned.slice(lastDot + 1)
  if (after.length <= 2 && /^\d+$/.test(after)) {
    const before = cleaned.slice(0, lastDot)
    return (before ? before.replace(/\./g, '') : '0') + ',' + after
  }
  return s
}

/**
 * Định dạng khi nhập phần trăm (%).
 * Cho phép nhập dấu chấm (.) → đổi thành phẩy (,) phân cách thập phân. Đã có "10" rồi gõ "." → "10,". Đã có "10,5" rồi gõ "." → đứng im. Nhập số vẫn cho phép.
 */
export function formatPhanTramInput(s: string): string {
  let cleaned = (s || '').replace(/[^\d.,]/g, '')
  // Cùng chuẩn hóa như formatSoTien: một chấm mà phần sau >= 3 chữ số → coi là hàng nghìn (bỏ chấm).
  if (!cleaned.includes(',') && cleaned.includes('.')) {
    const parts = cleaned.split('.')
    const nonFirst = parts.slice(1)
    const allNonFirstAre3 = nonFirst.every((p) => p.length === 3)
    const firstLen = parts[0].length
    const looksLikeThousands =
      (allNonFirstAre3 && (firstLen >= 3 && firstLen % 3 === 0 || parts.length > 2)) ||
      (parts.length === 2 && parts[1].length >= 3)
    if (looksLikeThousands) cleaned = parts.join('')
  }
  const lastSep = findDecimalSeparatorIndex(cleaned)
  let hasDecimal = lastSep >= 0

  let intStr: string
  let decStr: string

  if (!hasDecimal) {
    intStr = cleaned.replace(/\./g, '').replace(/,/g, '')
    decStr = ''
  } else {
    intStr = cleaned.slice(0, lastSep).replace(/\./g, '').replace(/,/g, '')
    const decStrRaw = cleaned.slice(lastSep + 1).replace(/\D/g, '')
    decStr = decStrRaw.slice(0, 2)
  }

  if (!intStr && !decStr) return ''
  const intPart = stripLeadingZeros(intStr || '0')
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEP)
  if (hasDecimal) return `${formattedInt}${DECIMAL_SEP}${decStr}`
  return formattedInt
}

/**
 * TLCK (%) trên form Báo giá — tối đa **3** chữ số thập phân sau dấu phẩy (khác `formatPhanTramInput` 2 số).
 */
export function formatTlCkBaoGiaInput(s: string): string {
  let cleaned = (s || '').replace(/[^\d.,]/g, '')
  if (!cleaned.includes(',') && cleaned.includes('.')) {
    const parts = cleaned.split('.')
    const nonFirst = parts.slice(1)
    const allNonFirstAre3 = nonFirst.every((p) => p.length === 3)
    const firstLen = parts[0].length
    const looksLikeThousands =
      (allNonFirstAre3 && (firstLen >= 3 && firstLen % 3 === 0 || parts.length > 2)) ||
      (parts.length === 2 && parts[1].length >= 3)
    if (looksLikeThousands) cleaned = parts.join('')
  }
  const lastSep = findDecimalSeparatorIndex(cleaned)
  const hasDecimal = lastSep >= 0
  let intStr: string
  let decStr: string
  if (!hasDecimal) {
    intStr = cleaned.replace(/\./g, '').replace(/,/g, '')
    decStr = ''
  } else {
    intStr = cleaned.slice(0, lastSep).replace(/\./g, '').replace(/,/g, '')
    const decStrRaw = cleaned.slice(lastSep + 1).replace(/\D/g, '')
    decStr = decStrRaw.slice(0, 3)
  }
  if (!intStr && !decStr) return ''
  const intPart = stripLeadingZeros(intStr || '0')
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEP)
  if (hasDecimal) return `${formattedInt}${DECIMAL_SEP}${decStr}`
  return formattedInt
}

/** Chuẩn hóa TLCK sau blur — luôn đủ 3 chữ số thập phân (vd. `0,000`). */
export function chuanHoaTlCkBaoGiaSauBlur(s: string): string {
  const n = parseFloatVN((s ?? '').trim() || '0')
  if (!Number.isFinite(n)) return formatSoThapPhan(0, 3)
  return formatSoThapPhan(n, 3)
}

/**
 * Định dạng số thập phân: hàng nghìn (.), thập phân (,).
 * decimals: số chữ số thập phân (mặc định 2).
 * VD: 1234567.5 -> "1.234.567,50"
 */
export function formatSoThapPhan(value: number | string, decimals: number = 2): string {
  const s = typeof value === 'string' ? value : String(value ?? '')
  const cleaned = s.replace(/[^\d,.-]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  if (Number.isNaN(num) && cleaned !== '' && cleaned !== '-') return s
  if (Number.isNaN(num) || !Number.isFinite(num)) return ''
  const fixed = Math.abs(num).toFixed(decimals)
  const [intPart, decPart] = fixed.split('.')
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEP)
  const result = decPart ? `${formatted}${DECIMAL_SEP}${decPart}` : formatted
  return num < 0 ? `-${result}` : result
}

/**
 * Định dạng số tiền khi nhập.
 * - Nhập liên tục tự nhiên (chỉ số): dấu chấm (.) phân tách hàng nghìn (vd 1234567 → "1.234.567").
 * - Chủ động nhập dấu chấm (.) hoặc dấu phẩy (,): hiểu là thập phân, hiển thị thành dấu phẩy (vd 12345678. → "12.345.678," rồi gõ "5" → "12.345.678,5").
 */
export function formatSoTien(s: string): string {
  let cleaned = (s || '').replace(/[^\d.,]/g, '')
  // Chưa có phẩy trong chuỗi.
  if (!cleaned.includes(',')) {
    // Chuỗi kết thúc bằng chấm: người dùng chủ động gõ chấm = thập phân → hiển thị phần nguyên + dấu phẩy.
    if (cleaned.endsWith('.')) {
      const lastDotIndex = cleaned.lastIndexOf('.')
      const intStr = cleaned.slice(0, lastDotIndex).replace(/\./g, '')
      if (intStr === '') return '0' + DECIMAL_SEP
      const intPart = stripLeadingZeros(intStr)
      const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEP)
      return formatted + DECIMAL_SEP
    }
    // Không có chấm ở cuối: mọi chấm đều là hàng nghìn (bỏ chấm, format nguyên). Tránh "1.234.567"+"8" → "12.345.678".
    const onlyDigits = cleaned.replace(/\./g, '').replace(/,/g, '')
    if (onlyDigits === '') return ''
    const intPart = stripLeadingZeros(onlyDigits)
    return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEP)
  }
  // Đã có phẩy: tìm vị trí phân cách thập phân (phẩy hoặc chấm), lấy tối đa 2 chữ số sau đó.
  const lastSep = findDecimalSeparatorIndex(cleaned)
  const hasDecimal = lastSep >= 0

  let intStr: string
  let decStr: string

  if (!hasDecimal) {
    intStr = cleaned.replace(/\./g, '').replace(/,/g, '')
    decStr = ''
  } else {
    intStr = cleaned.slice(0, lastSep).replace(/\./g, '').replace(/,/g, '')
    const decStrRaw = cleaned.slice(lastSep + 1).replace(/\D/g, '')
    decStr = decStrRaw.slice(0, 2)
  }

  if (!intStr && !decStr) return ''
  const intPart = stripLeadingZeros(intStr || '0')
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEP)
  if (hasDecimal) return `${formatted}${DECIMAL_SEP}${decStr}`
  return formatted
}

/**
 * Hiển thị số (số nguyên hoặc số tiền) khi đã có giá trị number.
 * Dùng cho summary, grid, v.v.
 */
export function formatNumberDisplay(value: number, decimals: number = 0): string {
  if (Number.isNaN(value) || !Number.isFinite(value)) return '0'
  const fixed = decimals > 0 ? Math.abs(value).toFixed(decimals) : Math.floor(Math.abs(value)).toString()
  const [intPart, decPart] = fixed.split('.')
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEP)
  const result = decPart ? `${formatted}${DECIMAL_SEP}${decPart}` : formatted
  return value < 0 ? `-${result}` : result
}

/**
 * Hiển thị giá tiền: có thập phân thì hiển thị phẩy + phần thập phân, không có thì không hiển thị dấu phẩy.
 * VD: 455000 → "455.000"; 219,78 → "219,78"; 10,7 → "10,7".
 */
export function formatSoTienHienThi(value: number | string): string {
  const n = typeof value === 'number' ? value : parseFloat(parseNumber(String(value)))
  if (Number.isNaN(n) || !Number.isFinite(n)) return ''
  const abs = Math.abs(n)
  const intPart = Math.floor(abs)
  const frac = abs - intPart
  const hasDecimal = frac >= 1e-9
  const formattedInt = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEP)
  const prefix = n < 0 ? '-' : ''
  if (!hasDecimal) return prefix + formattedInt
  const decNum = Math.round(frac * 100) / 100
  const decStr = decNum.toFixed(2).split('.')[1].replace(/0+$/, '') || '0'
  return prefix + formattedInt + DECIMAL_SEP + decStr
}
