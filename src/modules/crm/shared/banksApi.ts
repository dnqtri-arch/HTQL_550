/**
 * API danh sách ngân hàng Việt Nam (VietQR).
 * Dùng cho gợi ý Tên ngân hàng trong form module Tài khoản (tài chính).
 */

const VIETQR_BANKS_URL = 'https://api.vietqr.io/v2/banks'

export interface BankItem {
  id: number
  name: string
  code: string
  shortName: string
}

let cached: BankItem[] | null = null

export async function getBanksVietnam(): Promise<BankItem[]> {
  if (cached) return cached
  try {
    const res = await fetch(VIETQR_BANKS_URL)
    if (!res.ok) return []
    const json = await res.json()
    if (json?.code !== '00' || !Array.isArray(json?.data)) return []
    const data = json.data as Array<{ id: number; name: string; code: string; shortName?: string; short_name?: string }>
    cached = data.map((d) => ({
      id: d.id,
      name: (d.name ?? '').trim(),
      code: (d.code ?? '').trim(),
      shortName: (d.shortName ?? d.short_name ?? d.code ?? '').trim(),
    })).filter((b): b is BankItem => Boolean(b.name))
    return cached
  } catch {
    return []
  }
}
