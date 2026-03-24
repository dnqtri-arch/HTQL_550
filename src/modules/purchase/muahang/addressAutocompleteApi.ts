/**
 * Gợi ý địa chỉ Việt Nam cho ô địa chỉ.
 * Ưu tiên Goong.io Place AutoComplete (VITE_GOONG_API_KEY), dự phòng Openmap.vn, cuối cùng Nominatim.
 */

/** Độ dài tối thiểu (sau trim) mới gọi Goong/Openmap/Nominatim — tránh request khi gõ quá ít. */
const MIN_ADDRESS_QUERY_LEN = 3

const GOONG_AUTOCOMPLETE_URL = 'https://rsapi.goong.io/Place/AutoComplete'
const OPENMAP_URL = 'https://mapapis.openmap.vn/v1/autocomplete'
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

/** Bỏ "Việt Nam"/"Vietnam" và mã bưu điện (5–6 chữ số) khỏi chuỗi địa chỉ. */
function cleanAddressForDisplay(addr: string): string {
  let s = (addr || '').trim()
  s = s.replace(/,?\s*Việt Nam\s*,?/gi, ',')
  s = s.replace(/,?\s*Vietnam\s*,?/gi, ',')
  s = s.replace(/,?\s*Viet Nam\s*,?/gi, ',')
  s = s.replace(/[,，]\s*\d{5,6}\s*$/g, '')
  s = s.replace(/,?\s*\d{5,6}\s*$/g, '')
  s = s.replace(/[,，]+\s*$/g, '')
  s = s.replace(/,+\s*$/g, '')
  s = s.replace(/,+\s*,+/g, ',').replace(/^\s*,|,\s*$/g, '').trim()
  return s
}

/** Export để dùng khi load form hoặc onBlur ô địa chỉ */
export { cleanAddressForDisplay }

function getGoongKey(): string {
  try {
    return (import.meta.env?.VITE_GOONG_API_KEY as string) || ''
  } catch {
    return ''
  }
}

function getOpenmapKey(): string {
  try {
    return (import.meta.env?.VITE_OPENMAP_API_KEY as string) || ''
  } catch {
    return ''
  }
}

/** Goong Place API — predictions[].description */
async function fetchGoong(query: string, apiKey: string): Promise<string[]> {
  if (!query.trim() || !apiKey) return []
  const url = `${GOONG_AUTOCOMPLETE_URL}?api_key=${encodeURIComponent(apiKey)}&input=${encodeURIComponent(query)}&limit=10`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = (await res.json()) as { status?: string; predictions?: { description?: string }[] }
  const preds = data?.predictions
  if (!Array.isArray(preds)) return []
  return preds
    .map((p) => cleanAddressForDisplay(String(p.description ?? '')))
    .filter(Boolean)
}

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

/** Gợi ý địa chỉ tại Việt Nam theo từ khóa. Debounce gọi ở phía component; API chỉ chạy khi ≥ MIN_ADDRESS_QUERY_LEN ký tự. */
export async function suggestAddressVietnam(query: string): Promise<string[]> {
  const q = (query ?? '').trim()
  if (q.length < MIN_ADDRESS_QUERY_LEN) return []

  const goongKey = getGoongKey()
  if (goongKey) {
    try {
      const list = await fetchGoong(q, goongKey)
      if (list.length > 0) return list
    } catch {
      /* fallback */
    }
  }
  const openmapKey = getOpenmapKey()
  if (openmapKey) {
    try {
      const list = await fetchOpenmap(query, openmapKey)
      if (list.length > 0) return list
    } catch {
      /* fallback */
    }
  }
  try {
    return await fetchNominatim(q)
  } catch {
    return []
  }
}
