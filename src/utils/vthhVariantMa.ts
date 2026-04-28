/**
 * Quy ước mã phiên bản VTHH (nhiều phiên bản):
 * - Mã chính: `ma` gốc (machinh).
 * - Phụ 1 (ĐL/định lượng): `{machinh}_PB{n}` — **một** gạch dưới trước `PB`, không có `_` giữa `PB` và `n` (vd. `VT00001_PB1`).
 * - Phụ 2 (khổ giấy): `{maPhu1}{a|b|…}` — hậu tố chữ cái **thường** kiểu Excel (a, b, …, z, aa, …) (vd. `VT00001_PB1a`).
 * - Tương thích đọc dữ liệu cũ: `{machinh}_PB_{n}` và hậu tố chữ hoa.
 */

import type { VatTuHangHoaRecord } from '../types/vatTuHangHoa'

export function vthhMaNormalize(ma: string | undefined | null): string {
  return String(ma ?? '').trim().toUpperCase()
}

/** Phụ 1 (chuẩn hóa IN HOA) từ mã phụ 2 — bỏ hậu tố chữ cái sau `_PB{n}` hoặc `_PB_{n}`. */
export function vthhInferPhu1MaFromPhu2Ma(ma: string | undefined | null): string {
  const su = vthhMaNormalize(ma)
  const legacy = su.match(/^(.*)_PB_(\d+)([A-Z]+)$/)
  if (legacy) return `${legacy[1]}_PB_${legacy[2]}`
  const neu = su.match(/^(.*)_PB(\d+)([A-Z]+)$/)
  if (neu) return `${neu[1]}_PB${neu[2]}`
  return ''
}

/** Mã vật tư gốc (machinh) từ bất kỳ mã phụ 1 / phụ 2. */
export function vthhMachinhFromAnyVariantMa(ma: string | undefined | null): string {
  let s = String(ma ?? '').trim()
  if (!s) return ''
  while (true) {
    const su = vthhMaNormalize(s)
    const p = vthhInferPhu1MaFromPhu2Ma(su)
    if (p) {
      const pu = vthhMaNormalize(p)
      if (pu && pu !== su) {
        s = pu
        continue
      }
    }
    const mLegacy = su.match(/^(.+)_PB_\d+$/)
    if (mLegacy && mLegacy[1] !== su) {
      s = mLegacy[1]
      continue
    }
    const mNew = su.match(/^(.+)_PB\d+$/)
    if (mNew && mNew[1] !== su) {
      s = mNew[1]
      continue
    }
    break
  }
  return s
}

/** Cha trực tiếp trên lưới: `ma_vthh_cap_cha` hợp lệ, hoặc suy phụ 2→phụ 1, hoặc phụ 1→machinh. */
export function vthhEffectiveParentMaU(
  r: Pick<VatTuHangHoaRecord, 'ma' | 'ma_vthh_cap_cha'>,
  byMa: ReadonlyMap<string, unknown>,
): string {
  const selfU = vthhMaNormalize(r.ma)
  const ex = vthhMaNormalize(r.ma_vthh_cap_cha ?? '')
  if (ex && ex !== selfU && byMa.has(ex)) return ex
  const phu1From2 = vthhMaNormalize(vthhInferPhu1MaFromPhu2Ma(String(r.ma ?? '')))
  if (phu1From2 && phu1From2 !== selfU && byMa.has(phu1From2)) return phu1From2
  const root = vthhMaNormalize(vthhMachinhFromAnyVariantMa(String(r.ma ?? '')))
  if (root && root !== selfU && byMa.has(root) && selfU.startsWith(root)) {
    const tail = selfU.slice(root.length)
    if (tail.startsWith('_PB')) return root
  }
  return ''
}

/** `{machinh}_PB{n}` (vd. VT00001_PB1) */
export function vthhBuildMaPhu1(maChinh: string, phienBanIndex: number): string {
  const root = String(maChinh ?? '').trim().replace(/\s+/g, '') || 'VTHH'
  const pb = Math.max(1, Math.floor(phienBanIndex))
  return `${root}_PB${pb}`
}

/** a, b, …, z, aa, … (chỉ số 0-based). */
export function vthhExcelStyleLettersLowerFromZero(zeroBased: number): string {
  let n = zeroBased + 1
  let s = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(97 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s || 'a'
}

/** `{maPhu1}{a}` (chữ thường, vd. VT00001_PB1a) */
export function vthhBuildMaPhu2(maPhu1: string, khoZeroIdx: number): string {
  const base = String(maPhu1 ?? '').trim().replace(/\s+/g, '')
  return `${base}${vthhExcelStyleLettersLowerFromZero(khoZeroIdx)}`
}

/**
 * Phần mã hiển thị sau `{machinh}` (cột Mã — rút gọn: PB1, PB1A, …).
 */
/** Khóa phụ 1 (IN HOA) để nhóm các dòng `pricing_matrix` cùng một định lượng. */
export function vthhMatrixRowPhu1Bucket(mq: string | undefined | null): string {
  const from2 = vthhInferPhu1MaFromPhu2Ma(mq)
  if (from2) return vthhMaNormalize(from2)
  const su = vthhMaNormalize(mq)
  if (/_PB\d+$/i.test(su)) return su
  if (/_PB_\d+$/i.test(su)) return su
  return su
}

export function vthhMaHienThiSauMaChinh(fullMa: string | undefined | null, maChinhGoc?: string | null): string {
  const f = String(fullMa ?? '').trim()
  if (!f) return ''
  const root =
    maChinhGoc != null && String(maChinhGoc).trim() !== ''
      ? String(maChinhGoc).trim()
      : vthhMachinhFromAnyVariantMa(f)
  if (!root) return f
  const ru = vthhMaNormalize(root)
  const fu = vthhMaNormalize(f)
  if (fu === ru) return f
  if (!fu.startsWith(ru)) return f
  const prefixLen = root.length
  if (vthhMaNormalize(f.slice(0, prefixLen)) !== ru) return f
  let suf = f.slice(prefixLen).replace(/^_+/, '')
  const u = suf.toUpperCase()
  const legacyUnderscore = u.match(/^PB_(\d+)$/)
  if (legacyUnderscore) return `PB${legacyUnderscore[1]}`
  const legacyUnderscoreLet = u.match(/^PB_(\d+)([A-Z]+)$/)
  if (legacyUnderscoreLet) return `PB${legacyUnderscoreLet[1]}${legacyUnderscoreLet[2]}`
  const compact = u.match(/^PB(\d+)$/)
  if (compact) return `PB${compact[1]}`
  const compactLet = u.match(/^PB(\d+)([A-Z]+)$/)
  if (compactLet) return `PB${compactLet[1]}${compactLet[2]}`
  return suf || f
}

/** Tên gốc: bỏ hậu tố « — ĐL …» / «– ĐL …» ở cuối (tên lưu cũ của phiên bản). */
export function vthhTenGocBoQuyUocDlCuoi(ten: string | undefined | null): string {
  return String(ten ?? '')
    .trim()
    .replace(/\s*[—–-]\s*ĐL\s+.+$/i, '')
    .trim()
}

/** Rút gọn token định lượng cho tên phụ 1 (vd. `3.0 dem` → `3.0`). */
export function vthhDlRutGonChoTen(dlRaw: string | undefined | null): string {
  const t = String(dlRaw ?? '').trim()
  if (!t) return ''
  const m = t.match(/(\d+(?:[.,]\d+)?)/)
  return m ? m[1].replace(',', '.') : t
}

/** Tên hiển thị phiên bản phụ 1: `{tên gốc} {định lượng rút gọn}`. */
export function vthhTenPhu1TheoDl(tenChinhHoacDayDu: string | undefined | null, dlRaw: string | undefined | null): string {
  const base = vthhTenGocBoQuyUocDlCuoi(tenChinhHoacDayDu)
  const dl = vthhDlRutGonChoTen(dlRaw)
  if (!dl) return base
  if (!base) return dl
  return `${base} ${dl}`.trim()
}

/** Tên phiên bản phụ 2 (khổ): `{tên phụ 1} ({khổ})`. */
export function vthhTenPhu2TheoKhoGiay(tenPhu1: string | undefined | null, khoGiay: string | undefined | null): string {
  const t1 = String(tenPhu1 ?? '').trim()
  const kg = String(khoGiay ?? '').trim()
  if (!kg) return t1
  return `${t1} (${kg})`
}

/** Mã phụ 2 (có hậu tố chữ sau `_PB{n}`). */
export function vthhMaLaPhu2Chuan(ma: string | undefined | null): boolean {
  const p1 = vthhInferPhu1MaFromPhu2Ma(ma)
  if (!p1) return false
  return vthhMaNormalize(String(ma ?? '').trim()) !== vthhMaNormalize(p1)
}

/** Mã phụ 1 lưu DB (`…_PB{n}` / `…_PB_{n}`), không phải phụ 2. */
export function vthhMaLaPhu1Chuan(ma: string | undefined | null): boolean {
  const u = vthhMaNormalize(ma)
  if (!u) return false
  if (vthhMaLaPhu2Chuan(ma)) return false
  return /_PB\d+$/.test(u) || /_PB_\d+$/.test(u)
}
