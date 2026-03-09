/**
 * htql_550_map (gọi tắt: maps)
 * Cấu hình Google Maps / Places API cho gợi ý địa chỉ Việt Nam.
 * API Key lưu trong .env: VITE_HTQL_550_MAP_API_KEY (alias: HTQL_550_GOOGLE_MAPS_API_KEY).
 */
/** API Key dùng cho Maps/Places (đọc từ env lúc build). */
export const mapsApiKey: string = import.meta.env.VITE_HTQL_550_MAP_API_KEY ?? ''

/** Có sẵn API key (dùng để bật autocomplete). */
export const mapsReady = Boolean(mapsApiKey?.trim())
