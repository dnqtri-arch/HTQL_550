/**
 * Quy tắc đường dẫn / tên file đính kèm thiết kế (dktk) dưới gốc `thietke` — dùng chung Báo giá / ĐHB / HĐ bán / Phụ lục.
 * - Thư mục: `{mã_kh | _pending_dktk}/{mã_chứng_từ_ascii}/{tên_file}`
 * - Tên file: `{mã_chứng_từ_ascii}_{HH_mm_dd_MM_yyyy}_{n}` (không còn segment mã KH trong tên file)
 * - `_pending_dktk` thay cho `kh_unknown` trên ổ đĩa khi chưa có mã KH (tránh tạo thư mục kh_unknown)
 */
import { htqlPathPartAscii } from './htqlPathPartAscii'

export const PENDING_DKTK_FOLDER = '_pending_dktk'

/** Chuẩn hóa «2026/ĐHB/1» → ASCII để regex DHB khớp. */
export function htqlNormalizeChungTuSoAscii(raw: string): string {
  let s = String(raw ?? '')
  try {
    s = s.replace(/\u0110/g, 'D').replace(/\u0111/g, 'd')
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  } catch {
    s = s.replace(/\u0110/g, 'D').replace(/\u0111/g, 'd')
  }
  return s
}

/** 2026/BG/3 → 2026_bg_3 */
export function parseSoBaoGiaForAttachmentFile(soDon: string): string {
  const t = htqlNormalizeChungTuSoAscii(soDon.trim())
  const m = t.match(/^(\d{4})\s*\/\s*BG\s*\/\s*(\d+)$/i)
  if (m) return `${m[1]}_bg_${m[2]}`
  const s = t.replace(/[\\/]+/g, '_').replace(/\s+/g, '_').replace(/_+/g, '_').toLowerCase()
  return s || 'bg'
}

/** 2026/DHB/3 → 2026_dhb_3; hỗ trợ legacy BG */
export function parseSoDonHangBanChungTuForAttachmentFile(soDon: string): string {
  const t = htqlNormalizeChungTuSoAscii(soDon.trim())
  let m = t.match(/^(\d{4})\s*\/\s*DHB\s*\/\s*(\d+)$/i)
  if (m) return `${m[1]}_dhb_${m[2]}`
  m = t.match(/^(\d{4})\s*\/\s*BG\s*\/\s*(\d+)$/i)
  if (m) return `${m[1]}_bg_${m[2]}`
  const s = t.replace(/[\\/]+/g, '_').replace(/\s+/g, '_').replace(/_+/g, '_').toLowerCase()
  return s || 'dhb'
}

/** 2026/HDB/3 → 2026_hdb_3; BG / ĐHB nếu cần parse chéo */
export function parseSoHopDongBanChungTuForAttachmentFile(soDon: string): string {
  const t = htqlNormalizeChungTuSoAscii(soDon.trim())
  const mBg = t.match(/^(\d{4})\s*\/\s*BG\s*\/\s*(\d+)$/i)
  if (mBg) return `${mBg[1]}_bg_${mBg[2]}`
  const mHdb = t.match(/^(\d{4})\s*\/\s*HDB\s*\/\s*(\d+)$/i)
  if (mHdb) return `${mHdb[1]}_hdb_${mHdb[2]}`
  const mDhb = t.match(/^(\d{4})\s*\/\s*DHB\s*\/\s*(\d+)$/i)
  if (mDhb) return `${mDhb[1]}_dhb_${mDhb[2]}`
  const s = t.replace(/[\\/]+/g, '_').replace(/\s+/g, '_').replace(/_+/g, '_').toLowerCase()
  return s || 'hdb'
}

/** 2026/PLHDB/3 → 2026_plhdb_3 (+ BG / HDB / DHB) */
export function parseSoPhuLucHopDongBanChungTuForAttachmentFile(soDon: string): string {
  const t = htqlNormalizeChungTuSoAscii(soDon.trim())
  const mPl = t.match(/^(\d{4})\s*\/\s*PLHDB\s*\/\s*(\d+)$/i)
  if (mPl) return `${mPl[1]}_plhdb_${mPl[2]}`
  const mBg = t.match(/^(\d{4})\s*\/\s*BG\s*\/\s*(\d+)$/i)
  if (mBg) return `${mBg[1]}_bg_${mBg[2]}`
  const mHdb = t.match(/^(\d{4})\s*\/\s*HDB\s*\/\s*(\d+)$/i)
  if (mHdb) return `${mHdb[1]}_hdb_${mHdb[2]}`
  const mDhb = t.match(/^(\d{4})\s*\/\s*DHB\s*\/\s*(\d+)$/i)
  if (mDhb) return `${mDhb[1]}_dhb_${mDhb[2]}`
  const s = t.replace(/[\\/]+/g, '_').replace(/\s+/g, '_').replace(/_+/g, '_').toLowerCase()
  return s || 'plhdb'
}

/**
 * Phần thư mục cho KH: chỉ `ma_kh` (ASCII). Chưa có mã → token nội bộ `kh_unknown` (logic JSON),
 * nhưng **thư mục vật lý** dùng `PENDING_DKTK_FOLDER` qua `folderKhSegmentFromMaKhPathPart`.
 */
export function partMccForPath(maKh: string, _tenKhFallback?: string): string {
  const m = htqlPathPartAscii(maKh)
  return m || 'kh_unknown'
}

export function folderKhSegmentFromMaKhPathPart(maKhPathPart: string): string {
  const kh = (maKhPathPart || '').trim().toLowerCase()
  return kh && kh !== 'kh_unknown' ? kh : PENDING_DKTK_FOLDER
}

/** HH_mm_dd_MM_yyyy (vd 09_00_29_03_2026) */
export function formatTgGiaoForAttachmentFile(d: Date): string {
  const h = d.getHours()
  const mi = d.getMinutes()
  const day = d.getDate()
  const mo = d.getMonth() + 1
  const y = d.getFullYear()
  return `${String(h).padStart(2, '0')}_${String(mi).padStart(2, '0')}_${String(day).padStart(2, '0')}_${String(mo).padStart(2, '0')}_${y}`
}

/** Tên file: mã chứng từ + TG tạo (ưu tiên) + chỉ số — không còn mã KH trong tên. */
export function buildDktkAttachmentBaseName(
  docToken: string,
  ngayTaoUuTien: Date | null,
  ngayPhu: Date | null,
  index: number
): string {
  const doc = (docToken || '').trim() || 'bg'
  const tgNgay = ngayTaoUuTien ?? ngayPhu ?? new Date()
  const tgPart = formatTgGiaoForAttachmentFile(tgNgay)
  return `${doc}_${tgPart}_${index}`
}

export function buildDktkFolderVirtualPath(docToken: string, maKhPathPart: string): string {
  const khSeg = folderKhSegmentFromMaKhPathPart(maKhPathPart)
  const doc = (docToken || '').trim().replace(/^\/+/, '').replace(/\/+/g, '/')
  return `${khSeg}/${doc}`
}

export function buildDktkFullVirtualPath(docToken: string, maKhPathPart: string, fileName: string): string {
  const base = fileName.replace(/^\/+/, '')
  return `${buildDktkFolderVirtualPath(docToken, maKhPathPart)}/${base}`
}

/** Hậu tố chuẩn: _HH_mm_dd_MM_yyyy_index (hỗ trợ tên cũ có thêm _kh_xxx_ trước hậu tố). */
export const RE_DKTK_ATT_NAME_TAIL = /_(\d{2})_(\d{2})_(\d{2})_(\d{2})_(\d{4})_(\d+)$/

export function rebuildDktkAttachmentStoredFileName(
  currentName: string,
  docTokenFn: (so: string) => string,
  soChungTu: string
): string {
  const raw = (currentName || '').trim()
  const extMatch = raw.match(/(\.[^./\\]+)$/)
  const ext = extMatch ? extMatch[1] : ''
  const base = extMatch ? raw.slice(0, -ext.length) : raw
  const m = base.match(RE_DKTK_ATT_NAME_TAIL)
  if (!m) return raw
  const tgPart = `${m[1]}_${m[2]}_${m[3]}_${m[4]}_${m[5]}`
  const index = m[6]
  const docPart = docTokenFn(soChungTu)
  return `${docPart}_${tgPart}_${index}${ext}`
}

export type HtqlDktkPathItem = { name: string; virtual_path?: string }

/**
 * Chuẩn hóa `name` + `virtual_path`.
 * Nếu có `soBaoGiaGoc` và thư mục chứng từ trên path trùng mã BG gốc → **giữ** segment mã BG (tái sử dụng file khi lập ĐHB/HĐ từ báo giá), chỉ đổi segment KH (`_pending_dktk` / `kh_unknown` → mã KH thật).
 */
export function chuanHoaThietKeVirtualPaths<T extends HtqlDktkPathItem>(
  items: T[],
  soChungTu: string,
  maKhPathPart: string,
  parseDocToken: (so: string) => string,
  options?: { soBaoGiaGoc?: string | null }
): T[] {
  const bgGocTok = (options?.soBaoGiaGoc ?? '').trim() ? parseSoBaoGiaForAttachmentFile(String(options!.soBaoGiaGoc)) : ''
  const docTok = parseDocToken(soChungTu)
  const khFolder = folderKhSegmentFromMaKhPathPart(maKhPathPart)

  return items.map((a) => {
    const vp = (a.virtual_path || '').replace(/\\/g, '/').replace(/^\/+/, '')
    const segs = vp.split('/').filter(Boolean)
    const docFromVp = segs.length >= 2 ? segs[1] ?? '' : ''
    const fnameFromVp = segs.length >= 3 ? segs.slice(2).join('/') : ''

    if (bgGocTok && docFromVp === bgGocTok) {
      const fname = (fnameFromVp || a.name || '').replace(/^\/+/, '')
      const newVp = `${khFolder}/${bgGocTok}/${fname}`
      return { ...a, virtual_path: newVp, name: fname || a.name }
    }

    const name = rebuildDktkAttachmentStoredFileName(a.name, parseDocToken, soChungTu)
    return { ...a, name, virtual_path: buildDktkFullVirtualPath(docTok, maKhPathPart, name) }
  })
}

export function chuanHoaDuongDanDinhKemBaoGia<T extends HtqlDktkPathItem>(items: T[], soBaoGia: string, maKhPathPart: string): T[] {
  const docTok = parseSoBaoGiaForAttachmentFile(soBaoGia)
  return items.map((a) => {
    const name = rebuildDktkAttachmentStoredFileName(a.name, parseSoBaoGiaForAttachmentFile, soBaoGia)
    return { ...a, name, virtual_path: buildDktkFullVirtualPath(docTok, maKhPathPart, name) }
  })
}

export function chuanHoaDuongDanDinhKemDonHangBanChungTu<T extends HtqlDktkPathItem>(
  items: T[],
  soDonHang: string,
  maKhPathPart: string,
  options?: { soBaoGiaGoc?: string | null }
): T[] {
  return chuanHoaThietKeVirtualPaths(items, soDonHang, maKhPathPart, parseSoDonHangBanChungTuForAttachmentFile, options)
}

export function chuanHoaDuongDanDinhKemHopDongBanChungTu<T extends HtqlDktkPathItem>(
  items: T[],
  soHopDong: string,
  maKhPathPart: string,
  options?: { soBaoGiaGoc?: string | null }
): T[] {
  return chuanHoaThietKeVirtualPaths(items, soHopDong, maKhPathPart, parseSoHopDongBanChungTuForAttachmentFile, options)
}

export function chuanHoaDuongDanDinhKemPhuLucHopDongBanChungTu<T extends HtqlDktkPathItem>(
  items: T[],
  soPhuLuc: string,
  maKhPathPart: string,
  options?: { soBaoGiaGoc?: string | null }
): T[] {
  return chuanHoaThietKeVirtualPaths(items, soPhuLuc, maKhPathPart, parseSoPhuLucHopDongBanChungTuForAttachmentFile, options)
}

/** Suy mã KH từ chuỗi hiển thị khách hàng + danh bạ (tránh partMccForPath('') khi nạp bản ghi đã lưu). */
export function maKhPathPartTuKhachHangVaDanhBa(
  khachHangDisplay: string | undefined,
  khList: Array<{ ma_kh?: string | null; ten_kh?: string | null }>
): string {
  const raw = (khachHangDisplay ?? '').trim()
  if (!raw) return partMccForPath('')
  const found =
    khList.find((n) => (n.ten_kh || '').trim() === raw) ||
    khList.find((n) => {
      const ma = (n.ma_kh ?? '').trim()
      const ten = (n.ten_kh ?? '').trim()
      return ma && ten && `${ma} - ${ten}` === raw
    }) ||
    khList.find((n) => {
      const ma = (n.ma_kh ?? '').trim()
      return ma !== '' && (raw === ma || raw.startsWith(`${ma} -`))
    })
  return partMccForPath((found?.ma_kh ?? '').trim())
}
