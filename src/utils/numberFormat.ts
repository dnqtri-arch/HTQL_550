/**
 * Định dạng số toàn hệ thống:
 * - Phân cách hàng nghìn: dấu chấm (.)
 * - Phân cách thập phân: dấu phẩy (,)
 * VD: 1234567.89 -> "1.234.567,89"
 *
 * Nguyên tắc nhập:
 * - Số tự nhiên, số tiền, phần trăm: tuân thủ phân cách hàng nghìn, phân cách thập phân, và số 0 ở đầu.
 * - Số nguyên: tuân thủ phân cách hàng nghìn và số 0 ở đầu (không có phần thập phân).
 *
 * Mục 2 — Dấu chấm (.) khi nhập:
 * - Nhập liên tục tự nhiên (chỉ số): hệ thống mặc định dùng dấu chấm (.) phân tách hàng nghìn. VD: 1234567 → "1.234.567".
 * - Nếu chủ động nhập dấu chấm (.) từ bàn phím thì dấu chấm đó tương đương dấu phẩy (,) — tức phân tách phần thập phân. VD: 1234567.88 → "1.234.567,88" (88 là thập phân vì đã gõ chấm).
 * - Ô chưa có số gõ "." → "0,"; ".5" → "0,5". Đã có dấu thập phân rồi gõ thêm "." → đứng im.
 *
 * --- LOGIC TOÀN HỆ THỐNG (dùng chung khi cần format nhập số có thập phân) ---
 * Chọn dấu phân cách thập phân trong chuỗi nhập (có thể nhiều dấu chấm/phẩy do vừa gõ hàng nghìn vừa gõ thập phân):
 * 1) Ưu tiên: dấu phải nhất mà ngay sau nó có đúng 1 hoặc 2 chữ số (phần thập phân thực sự) rồi hết chuỗi hoặc gặp dấu chấm/phẩy. VD: "123456.7." -> chọn dấu trước "7" -> hiển thị "123.456,7"; dấu chấm thứ 2 bỏ.
 * 2) Nếu không có dấu nào thỏa (vd chỉ có "1.234."): lấy dấu phải nhất -> hiển thị "1.234,".
 * Áp dụng trong: formatSoTien, formatPhanTramInput (và mọi ô nhập số có thập phân sau này). Hàm nội bộ: findDecimalSeparatorIndex.
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
 * - Nhập liên tục tự nhiên (chỉ số): dấu chấm (.) mặc định phân tách hàng nghìn (vd 1234567 → "1.234.567").
 * - Chủ động nhập dấu chấm (.) từ bàn phím = dấu phẩy (,) phân tách thập phân (vd 1234567.88 → "1.234.567,88").
 * Chuỗi chỉ có chấm với mỗi nhóm sau chấm đúng 3 chữ số (định dạng hàng nghìn do hệ thống) được chuẩn hóa bỏ chấm trước khi format để tránh nhầm với thập phân.
 */
export function formatSoTien(s: string): string {
  let cleaned = (s || '').replace(/[^\d.,]/g, '')
  // Chuẩn hóa: không có phẩy, có chấm. Coi chấm là hàng nghìn (bỏ chấm) khi:
  // - Nhiều chấm và mỗi nhóm sau chấm đúng 3 chữ số và (phần đầu 3/6/9... chữ số hoặc >2 nhóm), hoặc
  // - Đúng một chấm mà phần sau chấm có từ 3 chữ số trở lên (vd "1.2345" → 12345 → "12.345", "12.345" → "12.345") — tránh hiển thị "1,23" khi người dùng gõ 12345.
  if (cleaned.includes(',') === false && cleaned.includes('.')) {
    const parts = cleaned.split('.')
    const nonFirst = parts.slice(1)
    const allNonFirstAre3 = nonFirst.every((p) => p.length === 3)
    const firstLen = parts[0].length
    const looksLikeThousands =
      allNonFirstAre3 && (firstLen >= 3 && firstLen % 3 === 0 || parts.length > 2) ||
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
    // Quy ước: mọi dấu chấm (.) nhập từ bàn phím = dấu phẩy (,) ngăn tách thập phân. Không còn coi chấm là hàng nghìn khi nhập.
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
