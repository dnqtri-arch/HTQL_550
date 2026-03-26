/**
 * Gợi ý địa chỉ Việt Nam cho ô địa chỉ.
 * Ưu tiên Goong.io Place AutoComplete (VITE_GOONG_API_KEY), dự phòng Openmap.vn, cuối cùng Nominatim.
 */

/** Độ dài tối thiểu (sau trim) mới gọi Goong/Openmap/Nominatim — tránh request khi gõ quá ít. */
const MIN_ADDRESS_QUERY_LEN = 3

/** Place Autocomplete V1 (dự phòng nếu V2 lỗi / không có kết quả). */
const GOONG_AUTOCOMPLETE_URL = 'https://rsapi.goong.io/Place/AutoComplete'
/** Place Autocomplete V2 — ưu tiên (địa giới hành chính cập nhật). Xem help.goong.io REST API V2. */
const GOONG_AUTOCOMPLETE_V2_URL = 'https://rsapi.goong.io/v2/place/autocomplete'
/** Geocoding V2 — cùng họ REST V2 Goong (địa chỉ đầy đủ từ place_id). */
const GOONG_GEOCODE_V2_URL = 'https://rsapi.goong.io/v2/geocode'
/** Geocoding (tương thích Google Geocoding) — dự phòng nếu V2 không trả kết quả. */
const GOONG_GEOCODE_URL = 'https://rsapi.goong.io/geocode'
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

type GoongPredictionV2 = {
  description?: string
  place_id?: string
}

/** Ghép chuỗi hiển thị VN từ `address_components` (Geocode), ưu tiên số nhà + đường + phường/xã + tỉnh/TP. */
function formatVietnamAddressFromGeocodeComponents(
  components: { long_name?: string; short_name?: string; types?: string[] }[]
): string | null {
  if (!Array.isArray(components) || components.length === 0) return null
  const get = (want: string[]) => {
    const hit = components.find((c) => (c.types ?? []).some((t) => want.includes(t)))
    return (hit?.long_name ?? '').trim()
  }
  const streetNum = get(['street_number'])
  const route = get(['route'])
  const wardRaw = get([
    'sublocality_level_1',
    'sublocality',
    'administrative_area_level_3',
    'neighborhood',
  ])
  const locality = get(['locality'])
  const province = get(['administrative_area_level_1'])

  const parts: string[] = []
  if (streetNum || route) {
    const left = [streetNum ? `Số ${streetNum}` : '', route ? (route.startsWith('Đường') ? route : `Đường ${route}`) : '']
      .filter(Boolean)
      .join(', ')
    if (left) parts.push(left)
  }
  if (wardRaw) {
    let w = wardRaw.replace(/^Phường\s+/i, '').replace(/^Xã\s+/i, '').trim()
    if (!/^P[\s.]/i.test(w)) w = `P. ${w}`
    parts.push(w)
  }
  const tp = locality || province
  if (tp) {
    const t = tp.replace(/^Thành phố\s+/i, '').replace(/^Tỉnh\s+/i, '').trim()
    const label = /^TP[\s.]/i.test(t) ? t : `TP. ${t}`
    parts.push(label)
  }
  const s = parts.join(', ').replace(/\s+/g, ' ').trim()
  return s || null
}

/** Geocode V2 / Geocode V1 — `place_id` → một dòng địa chỉ đầy đủ. */
async function geocodeGoongPlaceToDisplayLine(placeId: string, apiKey: string): Promise<string | null> {
  if (!placeId?.trim() || !apiKey) return null
  const tryUrls = [
    `${GOONG_GEOCODE_V2_URL}?${new URLSearchParams({ place_id: placeId, api_key: apiKey }).toString()}`,
    `${GOONG_GEOCODE_URL}?${new URLSearchParams({ place_id: placeId, api_key: apiKey }).toString()}`,
  ]
  for (const url of tryUrls) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const data = (await res.json()) as {
        status?: string
        results?: {
          formatted_address?: string
          address_components?: { long_name?: string; short_name?: string; types?: string[] }[]
        }[]
      }
      const r = data?.results?.[0]
      if (!r) continue
      const fromComp = formatVietnamAddressFromGeocodeComponents(r.address_components ?? [])
      if (fromComp) return cleanAddressForDisplay(fromComp)
      const fa = r.formatted_address
      if (fa && typeof fa === 'string') return cleanAddressForDisplay(fa)
    } catch {
      /* thử URL kế */
    }
  }
  return null
}

/** Goong Place Autocomplete V2 + Geocode V2 — mỗi gợi ý là địa chỉ đầy đủ (số nhà, đường, phường/xã, tỉnh/TP) khi có `place_id`. */
async function fetchGoongV2WithGeocode(query: string, apiKey: string): Promise<string[]> {
  if (!query.trim() || !apiKey) return []
  const params = new URLSearchParams({
    api_key: apiKey,
    input: query,
    limit: '10',
    more_compound: 'true',
  })
  const url = `${GOONG_AUTOCOMPLETE_V2_URL}?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = (await res.json()) as { status?: string; predictions?: GoongPredictionV2[] }
  const preds = data?.predictions
  if (!Array.isArray(preds) || preds.length === 0) return []

  const maxGeo = 8
  const slice = preds.slice(0, maxGeo)
  const enriched = await Promise.all(
    slice.map(async (p) => {
      const desc = cleanAddressForDisplay(String(p.description ?? ''))
      const pid = (p.place_id ?? '').trim()
      if (!pid) return desc || null
      try {
        const geo = await geocodeGoongPlaceToDisplayLine(pid, apiKey)
        return geo || desc || null
      } catch {
        return desc || null
      }
    })
  )
  const out = enriched.filter((x): x is string => Boolean(x && x.trim()))
  if (out.length > 0) return out

  return preds
    .map((p) => cleanAddressForDisplay(String(p.description ?? '')))
    .filter(Boolean)
}

/** Goong Place API V1 — dự phòng */
async function fetchGoongV1(query: string, apiKey: string): Promise<string[]> {
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
      const listV2 = await fetchGoongV2WithGeocode(q, goongKey)
      if (listV2.length > 0) return listV2
    } catch {
      /* fallback V1 */
    }
    try {
      const listV1 = await fetchGoongV1(q, goongKey)
      if (listV1.length > 0) return listV1
    } catch {
      /* fallback Openmap */
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
