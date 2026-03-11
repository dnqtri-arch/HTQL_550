/**
 * Gợi ý địa chỉ Việt Nam cho ô Địa chỉ liên hệ.
 * Ưu tiên Openmap.vn (cần apikey), dự phòng Nominatim (miễn phí, giới hạn 1 req/s).
 * Kết quả đã bỏ "Việt Nam"/"Vietnam" và mã bưu điện.
 */

const OPENMAP_URL = 'https://mapapis.openmap.vn/v1/autocomplete'
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

/** Bỏ "Việt Nam"/"Vietnam" và mã bưu điện (5–6 chữ số) khỏi chuỗi địa chỉ. */
function cleanAddressForDisplay(addr: string): string {
  let s = (addr || '').trim()
  // Bỏ Vietnam / Việt Nam (có thể kèm dấu phẩy trước/sau)
  s = s.replace(/,?\s*Việt Nam\s*,?/gi, ',')
  s = s.replace(/,?\s*Vietnam\s*,?/gi, ',')
  s = s.replace(/,?\s*Viet Nam\s*,?/gi, ',')
  // Bỏ mã bưu điện ở cuối: dấu phẩy (ASCII hoặc fullwidth) + khoảng trắng + 5 hoặc 6 chữ số
  s = s.replace(/[,，]\s*\d{5,6}\s*$/g, '')
  s = s.replace(/,?\s*\d{5,6}\s*$/g, '')
  // Bỏ dấu phẩy thừa ở cuối (sau khi đã xóa mã số)
  s = s.replace(/[,，]+\s*$/g, '')
  s = s.replace(/,+\s*$/g, '')
  // Dọn dấu phẩy liền nhau và khoảng trắng đầu/cuối
  s = s.replace(/,+\s*,+/g, ',').replace(/^\s*,|,\s*$/g, '').trim()
  return s
}

/** Export để dùng khi load form hoặc onBlur ô địa chỉ */
export { cleanAddressForDisplay }

function getOpenmapKey(): string {
  try {
    return (import.meta.env?.VITE_OPENMAP_API_KEY as string) || ''
  } catch {
    return ''
  }
}

/** Openmap.vn (Google format) → mảng chuỗi địa chỉ */
async function fetchOpenmap(query: string, apikey: string): Promise<string[]> {
  if (!query.trim() || !apikey) return []
  const res = await fetch(
    `${OPENMAP_URL}?text=${encodeURIComponent(query)}&apikey=${encodeURIComponent(apikey)}`
  )
  if (!res.ok) return []
  const data = await res.json()
  const list = data?.predictions as { description?: string }[] | undefined
  if (!Array.isArray(list)) return []
  return list.map((p) => cleanAddressForDisplay(String(p.description ?? ''))).filter(Boolean)
}

/** Nominatim (miễn phí, 1 req/s) → mảng chuỗi địa chỉ tại Việt Nam */
async function fetchNominatim(query: string): Promise<string[]> {
  if (!query.trim()) return []
  const res = await fetch(
    `${NOMINATIM_URL}?q=${encodeURIComponent(query + ', Vietnam')}&format=json&countrycodes=vn&limit=8`,
    { headers: { 'User-Agent': 'HTQL550-Address-Contact/1.0' } }
  )
  if (!res.ok) return []
  const data = await res.json()
  const list = data as { display_name?: string }[] | undefined
  if (!Array.isArray(list)) return []
  return list.map((p) => cleanAddressForDisplay(String(p.display_name ?? ''))).filter(Boolean)
}

/** Gợi ý địa chỉ tại Việt Nam theo từ khóa. Debounce gọi ở phía component. */
export async function suggestAddressVietnam(query: string): Promise<string[]> {
  const key = getOpenmapKey()
  if (key) {
    try {
      const list = await fetchOpenmap(query, key)
      if (list.length > 0) return list
    } catch {
      // fallback
    }
  }
  try {
    return await fetchNominatim(query)
  } catch {
    return []
  }
}
