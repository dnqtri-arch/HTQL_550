/**
 * Tra cứu thông tin doanh nghiệp theo mã số thuế (VietQR API).
 * Dùng để điền Tên, Địa chỉ, Tỉnh/TP, Xã/Phường, Địa chỉ liên hệ khi bấm "Lấy thông tin".
 * API hiện chỉ trả name, address — điện thoại/email/website/người đại diện không có; tỉnh/xã parse từ địa chỉ.
 */

import { DANH_SACH_TINH_THANH_VIET_NAM } from '../../constants/provincesVietnam'

const VIETQR_BUSINESS_URL = 'https://api.vietqr.io/v2/business'

export interface TaxLookupResult {
  name: string
  address: string
  /** Tỉnh/Thành phố parse từ address (khớp danh sách tỉnh). */
  tinh_tp?: string
  /** Xã/Phường/Thị trấn parse từ address. */
  xa_phuong?: string
  /** Điện thoại (API chưa trả). */
  dien_thoai?: string
  /** Email (API chưa trả). */
  email?: string
  /** Website (API chưa trả). */
  website?: string
  /** Người đại diện theo pháp luật (API chưa trả). */
  dai_dien_theo_pl?: string
  /** Xưng hô: Ông (nam) / Bà (nữ), từ API hoặc suy từ tên người đại diện. */
  xung_ho?: string
  /** Chức vụ của người đại diện pháp luật (API chưa trả). */
  chuc_danh?: string
  /** ĐT cố định (số bàn) — nếu API trả điện thoại là số bàn. */
  dt_co_dinh?: string
  /** ĐT di động — số di động thứ nhất. */
  dt_di_dong?: string
  /** ĐTDĐ khác — số di động thứ hai (nếu có). */
  dtdd_khac?: string
  /** Địa chỉ liên hệ — có thể dùng luôn address khi API chỉ có 1 địa chỉ. */
  dia_chi_lien_he?: string
}

const PROVINCE_SET = new Set(DANH_SACH_TINH_THANH_VIET_NAM)
const WARD_PREFIX = /^(Phường|Xã|Thị trấn)\s+.+/

/** Map tên viết tắt / biến thể thường gặp trong địa chỉ -> tên chuẩn trong danh sách tỉnh. */
const PROVINCE_ALIASES: Record<string, string> = {
  'Hồ Chí Minh': 'Thành phố Hồ Chí Minh',
  'Hà Nội': 'Thành phố Hà Nội',
  'Đà Nẵng': 'Thành phố Đà Nẵng',
  'Hải Phòng': 'Thành phố Hải Phòng',
  'Cần Thơ': 'Thành phố Cần Thơ',
  'Huế': 'Thành phố Huế',
}

function normalizeProvincePart(part: string): string | undefined {
  const p = part.trim()
  if (!p) return undefined
  if (PROVINCE_SET.has(p)) return p
  if (PROVINCE_ALIASES[p]) return PROVINCE_ALIASES[p]
  const afterTinh = p.replace(/^Tỉnh\s+/, '').trim()
  if (afterTinh !== p && PROVINCE_SET.has(afterTinh)) return afterTinh
  const afterTp = p.replace(/^TP\.?\s*/, '').trim()
  if (afterTp !== p) {
    const full = 'Thành phố ' + afterTp
    if (PROVINCE_SET.has(full)) return full
    if (PROVINCE_ALIASES[afterTp]) return PROVINCE_ALIASES[afterTp]
  }
  const afterThanhPho = p.replace(/^Thành phố\s+/, '').trim()
  if (afterThanhPho !== p && PROVINCE_ALIASES[afterThanhPho]) return PROVINCE_ALIASES[afterThanhPho]
  return undefined
}

/**
 * Parse địa chỉ Việt Nam để lấy Tỉnh/TP và Xã/Phường (phần cuối thường: ... , Phường/Xã, Quận/Huyện, Tỉnh/TP).
 * Dự phòng: nếu không khớp theo phần (cắt dấu phẩy), tìm tên tỉnh xuất hiện trong chuỗi địa chỉ.
 */
function parseAddressParts(address: string): { tinh_tp?: string; xa_phuong?: string } {
  const raw = (address || '').trim()
  if (!raw) return {}
  const parts = raw.split(/[,，]/).map((p) => p.trim()).filter(Boolean)
  let tinh_tp: string | undefined
  let xa_phuong: string | undefined
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]
    if (!tinh_tp) {
      const matched = normalizeProvincePart(p)
      if (matched) tinh_tp = matched
    }
    if (!xa_phuong && WARD_PREFIX.test(p)) xa_phuong = p
  }
  if (!tinh_tp) {
    let lastIndex = -1
    for (const name of DANH_SACH_TINH_THANH_VIET_NAM) {
      const idx = raw.lastIndexOf(name)
      if (idx > lastIndex) {
        lastIndex = idx
        tinh_tp = name
      }
    }
  }
  return { tinh_tp, xa_phuong }
}

/**
 * Chuẩn hóa địa chỉ: "Tỉnh" trước tỉnh, "Thành phố" (đủ chữ, không viết tắt) trước thành phố.
 * VD: "..., Vĩnh Long" → "..., Tỉnh Vĩnh Long"; "..., TP Hồ Chí Minh" hoặc "..., Hồ Chí Minh" → "..., Thành phố Hồ Chí Minh".
 */
function ensureTinhPrefixInAddress(addr: string): string {
  const raw = (addr || '').trim()
  if (!raw) return raw
  const parts = raw.split(/[,，]/).map((p) => p.trim())
  const result = parts.map((p) => {
    if (!p) return p
    if (p.startsWith('Thành phố ')) return p
    if (p.startsWith('Tỉnh ')) return p
    const afterTp = p.replace(/^TP\.?\s*/, '').trim()
    if (afterTp !== p) {
      if (PROVINCE_ALIASES[afterTp]) return PROVINCE_ALIASES[afterTp]
      if (PROVINCE_SET.has('Thành phố ' + afterTp)) return 'Thành phố ' + afterTp
    }
    if (PROVINCE_ALIASES[p]) return PROVINCE_ALIASES[p]
    if (PROVINCE_SET.has(p) && !p.startsWith('Thành phố ')) return 'Tỉnh ' + p
    return p
  })
  return result.join(', ')
}

/** Trả về "Ông" (nam) hoặc "Bà" (nữ) từ API hoặc suy từ tên người đại diện. */
function resolveXungHo(d: Record<string, unknown>, daiDienName?: string): string | undefined {
  const g = (d.gioi_tinh ?? d.gender ?? d.sex ?? d.gioiTinh ?? '') as string
  const gNorm = typeof g === 'string' ? g.trim().toLowerCase() : String(g)
  if (/^(nam|male|1|true)$/.test(gNorm)) return 'Ông'
  if (/^(nữ|nu|female|0|false)$/.test(gNorm)) return 'Bà'
  if (daiDienName) {
    const name = daiDienName.trim()
    if (name.includes(' Thị ') || /^\S+\s+Thị\s+/.test(name)) return 'Bà'
    return 'Ông'
  }
  return undefined
}

/** Chuẩn hóa chuỗi số điện thoại (bỏ khoảng trắng, dấu gạch, +84 → 0). */
function normalizePhone(s: string): string {
  let n = (s || '').trim().replace(/[\s\-.]/g, '')
  n = n.replace(/^\+84/, '0')
  return n
}

/** Số di động VN: 10 chữ số, bắt đầu 03, 05, 07, 08, 09. */
function isMobileVN(phone: string): boolean {
  const n = normalizePhone(phone).replace(/^\+84/, '0')
  return /^0(3|5|7|8|9)\d{8}$/.test(n)
}

/** Số bàn VN: thường 10–11 chữ số, đầu 02 (024, 028, 0220...). */
function isLandlineVN(phone: string): boolean {
  const n = normalizePhone(phone).replace(/^\+84/, '0')
  return /^02\d{8,9}$/.test(n) && n.length >= 10
}

/**
 * Thu thập và phân loại số điện thoại từ response API.
 * Trả về: dien_thoai (ô chung tab 1), dt_co_dinh (số bàn), dt_di_dong (di động 1), dtdd_khac (di động 2).
 */
function parsePhones(d: Record<string, unknown>): {
  dien_thoai?: string
  dt_co_dinh?: string
  dt_di_dong?: string
  dtdd_khac?: string
} {
  const raw: string[] = []
  const add = (v: unknown) => {
    if (typeof v === 'string' && v.trim()) raw.push(v.trim())
    if (Array.isArray(v)) v.forEach((x) => add(x))
  }
  add(d.phone ?? d.tel ?? d.phoneNumber ?? d.dien_thoai ?? d.fax)
  add(d.mobile ?? d.di_dong ?? d.dtdd)
  if (Array.isArray(d.phones)) d.phones.forEach((x: unknown) => add(x))
  const landlines: string[] = []
  const mobiles: string[] = []
  const seen = new Set<string>()
  for (const p of raw) {
    const n = normalizePhone(p)
    if (!n || seen.has(n)) continue
    seen.add(n)
    if (isMobileVN(p)) mobiles.push(n)
    else if (isLandlineVN(p)) landlines.push(n)
    else if (/^\d{9,11}$/.test(n)) {
      if (/^0(3|5|7|8|9)/.test(n)) mobiles.push(n)
      else if (/^02/.test(n)) landlines.push(n)
    }
  }
  const firstLandline = landlines[0]
  const firstMobile = mobiles[0]
  const secondMobile = mobiles[1]
  const main = firstMobile ?? firstLandline ?? raw[0]?.trim()
  return {
    dien_thoai: main || undefined,
    dt_co_dinh: firstLandline || undefined,
    dt_di_dong: firstMobile || undefined,
    dtdd_khac: secondMobile || undefined,
  }
}

/**
 * Tra cứu doanh nghiệp theo mã số thuế.
 * Trả về name, address, tinh_tp, xa_phuong (parse từ address), dia_chi_lien_he (= address).
 */
export async function lookupTaxCode(mst: string): Promise<TaxLookupResult | null> {
  const code = (mst || '').trim().replace(/\s/g, '')
  if (!code) return null
  try {
    const res = await fetch(`${VIETQR_BUSINESS_URL}/${encodeURIComponent(code)}`)
    if (!res.ok) return null
    const json = await res.json()
    if (json?.code !== '00' || !json?.data) return null
    const d = json.data
    const addressRaw = (d.address ?? '').trim()
    const address = ensureTinhPrefixInAddress(addressRaw)
    const { tinh_tp, xa_phuong } = parseAddressParts(addressRaw)
    const daiDien = (d.legalRepresentative ?? d.dai_dien ?? d.representative ?? d.director ?? d.nguoi_dai_dien ?? d.legal_representative ?? '').trim() || undefined
    const xungHo = resolveXungHo(d, daiDien)
    const chucDanh = (d.chuc_vu ?? d.directorTitle ?? d.position ?? d.legalRepresentativeTitle ?? d.chuc_danh ?? d.title ?? '').trim() || undefined
    const phones = parsePhones(d)
    return {
      name: (d.name ?? '').trim() || (d.shortName ?? '').trim(),
      address,
      tinh_tp,
      xa_phuong,
      dien_thoai: phones.dien_thoai,
      email: (d.email ?? '').trim() || undefined,
      website: (d.website ?? d.web ?? '').trim() || undefined,
      dai_dien_theo_pl: daiDien,
      xung_ho: xungHo,
      chuc_danh: chucDanh,
      dt_co_dinh: phones.dt_co_dinh,
      dt_di_dong: phones.dt_di_dong,
      dtdd_khac: phones.dtdd_khac,
      dia_chi_lien_he: address || undefined,
    }
  } catch {
    return null
  }
}
