/**
 * API lấy danh sách xã/phường theo tỉnh/thành — dữ liệu sau sáp nhập 07/2025 (Nghị quyết 202/2025/QH15).
 * Nguồn: provinces.open-api.vn API v2 (depth=2). Dự phòng: dữ liệu tĩnh theo mã v2.
 */

const PROVINCE_V2_URL = 'https://provinces.open-api.vn/api/v2/p'
const WARDS_URL_VNREGION = 'https://huynhminhvangit.github.io/vn-region-api/data/wards.json'

interface WardItemV2 {
  name: string
  code: number
  division_type?: string
  province_code?: number
}

interface WardItem {
  code: string
  name: string
  province_code: string | number
  district_code?: string
}

const cacheByCode: Record<string, string[]> = {}

/** Dữ liệu tĩnh dự phòng khi API lỗi — mã tỉnh theo API v2 (sau sáp nhập). */
const FALLBACK_WARDS: Record<string, string[]> = {
  '01': ['Phường Phúc Xá', 'Phường Trúc Bạch', 'Phường Vĩnh Phúc', 'Phường Cống Vị', 'Phường Liễu Giai', 'Phường Ngọc Hà', 'Phường Điện Biên', 'Phường Đội Cấn', 'Phường Ngọc Khánh', 'Phường Kim Mã', 'Phường Giảng Võ', 'Phường Quán Thánh'],
  '04': ['Thị trấn Cao Bằng', 'Xã Đức Long', 'Xã Hoàng Tung', 'Xã Hưng Đạo', 'Xã Quang Trung'],
  '08': ['Thị trấn Tuyên Quang', 'Xã An Khang', 'Xã Đội Cấn', 'Xã Hồng Thái', 'Xã Phú Lâm'],
  '11': ['Thị trấn Điện Biên', 'Xã Thanh Minh', 'Xã Thanh Nưa', 'Xã Sam Mứn', 'Xã Núa Ngam'],
  '12': ['Thị trấn Lai Châu', 'Xã Nậm Loỏng', 'Xã Sùng Phài', 'Xã San Thàng', 'Xã Tả Lèng'],
  '14': ['Thị trấn Sơn La', 'Xã Chiềng Cơi', 'Xã Chiềng Đen', 'Xã Chiềng Lề', 'Xã Chiềng Sinh'],
  '15': ['Thị trấn Lào Cai', 'Xã Bản Phiệt', 'Xã Bản Vược', 'Xã Cốc San', 'Xã Tả Phời'],
  '19': ['Thị trấn Thái Nguyên', 'Phường Cam Giá', 'Phường Đồng Quang', 'Phường Gia Sàng', 'Phường Hoàng Văn Thụ'],
  '20': ['Thị trấn Lạng Sơn', 'Xã Hòa Bình', 'Xã Hữu Liên', 'Xã Quan Sơn', 'Xã Yên Bình'],
  '22': ['Thị trấn Quảng Ninh', 'Phường Bạch Đằng', 'Phường Bãi Cháy', 'Phường Cao Thắng', 'Phường Hòn Gai'],
  '24': ['Phường Vũ Ninh', 'Phường Kinh Bắc', 'Phường Đáp Cầu', 'Phường Đại Phúc', 'Phường Ninh Xá', 'Phường Quế Võ', 'Phường Từ Sơn', 'Phường Thuận Thành', 'Xã Gia Bình', 'Xã Lương Tài'],
  '25': ['Thị trấn Phú Thọ', 'Phường Hùng Vương', 'Phường Phong Châu', 'Phường Thanh Minh', 'Xã Thanh Đình'],
  '31': ['Phường An Lão', 'Phường An Dương', 'Phường Cát Bi', 'Phường Đằng Hải', 'Phường Đông Hải'],
  '33': ['Thị trấn Hưng Yên', 'Xã Bảo Khê', 'Xã Cửu Cao', 'Xã Đình Dù', 'Xã Liên Phương'],
  '37': ['Thị trấn Ninh Bình', 'Phường Đông Thành', 'Phường Nam Bình', 'Phường Nam Thành', 'Phường Tân Thành'],
  '38': ['Thị trấn Thanh Hóa', 'Phường Ba Đình', 'Phường Điện Biên', 'Phường Đông Sơn', 'Phường Đông Vệ'],
  '40': ['Thị trấn Nghệ An', 'Phường Hà Huy Tập', 'Phường Hưng Bình', 'Phường Hưng Chính', 'Phường Hưng Đông'],
  '42': ['Thị trấn Hà Tĩnh', 'Phường Bắc Hà', 'Phường Đại Nài', 'Phường Nam Hà', 'Phường Nguyễn Du'],
  '44': ['Thị trấn Quảng Trị', 'Phường 1', 'Phường 2', 'Phường 3', 'Phường An Đôn'],
  '46': ['Phường Phú Hội', 'Phường Phú Nhuận', 'Phường Tây Lộc', 'Phường Thuận Lộc', 'Phường Thuận Thành'],
  '48': ['Phường Hải Châu I', 'Phường Hải Châu II', 'Phường Hòa Thuận', 'Phường Phước Ninh', 'Phường Thanh Bình', 'Phường Thuận Phước', 'Phường Thạc Gián', 'Phường Hòa An', 'Phường Khuê Trung'],
  '51': ['Thị trấn Quảng Ngãi', 'Xã Nghĩa Dũng', 'Xã Nghĩa Dõng', 'Xã Nghĩa Hà', 'Xã Nghĩa Phú'],
  '52': ['Thị trấn Gia Lai', 'Xã An Phú', 'Xã Chư Á', 'Xã Diên Phú', 'Xã Ia Kênh'],
  '56': ['Phường Ninh Hiệp', 'Phường Ninh Đa', 'Phường Phước Hải', 'Phường Phước Long', 'Phường Phước Tân'],
  '66': ['Thị trấn Đắk Lắk', 'Xã Cư Êbur', 'Xã Ea Kao', 'Xã Ea Tu', 'Xã Hòa Khánh'],
  '68': ['Phường Đà Lạt', 'Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6'],
  '75': ['Thị trấn Đồng Nai', 'Phường An Bình', 'Phường Bình Đa', 'Phường Bửu Hòa', 'Phường Long Bình'],
  '79': ['Phường Bến Nghé', 'Phường Bến Thành', 'Phường Cầu Kho', 'Phường Cầu Ông Lãnh', 'Phường Cô Giang', 'Phường Đa Kao', 'Phường Nguyễn Cư Trinh', 'Phường Nguyễn Thái Bình', 'Phường Phạm Ngũ Lão', 'Phường Tân Định'],
  '80': ['Thị trấn Tây Ninh', 'Xã Bình Minh', 'Xã Hiệp Ninh', 'Xã Ninh Sơn', 'Xã Tân Bình'],
  '82': ['Thị trấn Đồng Tháp', 'Xã An Bình', 'Xã Bình Thành', 'Xã Định Yên', 'Xã Mỹ Hội'],
  '86': ['Phường Vĩnh Long', 'Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5'],
  '91': ['Thị trấn An Giang', 'Phường Mỹ Bình', 'Phường Mỹ Long', 'Phường Mỹ Phước', 'Phường Mỹ Quý'],
  '92': ['Phường An Khánh', 'Phường An Nghiệp', 'Phường An Hòa', 'Phường An Lạc', 'Phường An Phú'],
  '96': ['Thị trấn Cà Mau', 'Xã An Xuyên', 'Xã Định Bình', 'Xã Hòa Thành', 'Xã Tân Thành'],
}

function normalizeCode(code: string | number): string {
  return String(code).padStart(2, '0')
}

/** Thứ tự ưu tiên loại đơn vị: Đặc khu (0) → Phường (1) → Thị trấn (2) → Xã (3) → khác (4). */
function getWardTypeOrder(nameOrType: string): number {
  const s = nameOrType.trim().toLowerCase()
  if (s.startsWith('đặc khu ') || s.startsWith('khu ') || s === 'đặc khu' || s === 'khu') return 0
  if (s.startsWith('phường ') || s === 'phường') return 1
  if (s.startsWith('thị trấn ') || s === 'thị trấn') return 2
  if (s.startsWith('xã ') || s === 'xã') return 3
  return 4
}

/** Sắp xếp danh sách tên xã/phường: đặc khu → phường → thị trấn → xã, trong từng nhóm ABC (tiếng Việt). */
function sortWardNamesByTypeThenABC(names: string[]): string[] {
  return [...names].sort((a, b) => {
    const orderA = getWardTypeOrder(a)
    const orderB = getWardTypeOrder(b)
    if (orderA !== orderB) return orderA - orderB
    return a.localeCompare(b, 'vi')
  })
}

/** Lấy danh sách tên xã/phường theo mã tỉnh (2 chữ số). Chỉ trả về xã/phường của đúng tỉnh đó. */
export async function getWardsByProvinceCode(provinceCode: string): Promise<string[]> {
  const code = normalizeCode(provinceCode)
  const provinceCodeNum = parseInt(code, 10)
  if (Number.isNaN(provinceCodeNum) || provinceCodeNum < 1 || provinceCodeNum > 99) return []

  if (cacheByCode[code]) return cacheByCode[code]

  // 1) API v2 (sau sáp nhập 07/2025): GET /api/v2/p/{code}?depth=2 → tỉnh có wards[] trực tiếp
  try {
    const res = await fetch(`${PROVINCE_V2_URL}/${provinceCodeNum}?depth=2`)
    if (res.ok) {
      const data = (await res.json()) as { wards?: WardItemV2[] }
      const wards = data?.wards
      if (Array.isArray(wards) && wards.length > 0) {
        const list = wards.map((w) => w.name).filter(Boolean)
        const unique = Array.from(new Set(list))
        const sorted = sortWardNamesByTypeThenABC(unique)
        cacheByCode[code] = sorted
        return sorted
      }
    }
  } catch {
    // bỏ qua, thử nguồn tiếp theo
  }

  // 2) Thử vn-region-api (lọc đúng province_code)
  try {
    const res = await fetch(WARDS_URL_VNREGION)
    const data = await res.json()
    if (res.ok && Array.isArray(data)) {
      const list = (data as WardItem[])
        .filter((w) => normalizeCode(w.province_code) === code)
        .map((w) => w.name)
        .filter(Boolean)
      const unique = Array.from(new Set(list))
      const sorted = sortWardNamesByTypeThenABC(unique)
      if (sorted.length > 0) {
        cacheByCode[code] = sorted
        return sorted
      }
    }
  } catch {
    // bỏ qua
  }

  // 3) Dữ liệu tĩnh dự phòng (theo đúng mã tỉnh)
  const fallback = FALLBACK_WARDS[code]
  if (fallback) {
    const sorted = sortWardNamesByTypeThenABC(fallback)
    cacheByCode[code] = sorted
    return sorted
  }
  return []
}
