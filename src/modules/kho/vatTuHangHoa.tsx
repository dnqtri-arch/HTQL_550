import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Plus, Copy, Pencil, Trash2, RefreshCw, Upload, Download, Printer } from 'lucide-react'
import { DataGrid, type DataGridColumn } from '../../components/common/dataGrid'
import { ListPageToolbar } from '../../components/listPageToolbar'
import {
  type VatTuHangHoaRecord,
  vatTuHangHoaGetAll,
  vatTuHangHoaPost,
  vatTuHangHoaPut,
  vatTuHangHoaDelete,
  vatTuHangHoaDeleteWithChildren,
  vatTuHangHoaNapLai,
  vatTuHangHoaTrungMa,
  vatTuHangHoaMaTuDong,
  VATTU_IMAGE_BASE,
  vatTuHinhAnhUrl,
  vatTuHinhAnhPathLabel,
} from './vatTuHangHoaApi'
import { formatNumberDisplay, formatSoTienHienThi, formatSoThapPhan, parseFloatVN, parseDecimalFlex } from '../../utils/numberFormat'
import { exportCsv } from '../../utils/exportCsv'
import { useToastOptional } from '../../context/toastContext'
import { ConfirmXoaCaptchaModal } from '../../components/common/confirmXoaCaptchaModal'
import { VatTuHangHoaForm } from './vatTuHangHoaForm'
import { donViTinhGetAll } from './donViTinhApi'
import { tonKhoCuoikyTheoMaVthh } from './tonKho/api'
import { loadKhoListFromStorage } from './khoStorage'
import { donHangMuaGetAll, donHangMuaGetChiTiet, getDefaultDonHangMuaFilter } from '../crm/muaHang/donHangMua/donHangMuaApi'
import { hopDongMuaGetAll, hopDongMuaGetChiTiet, getDefaultHopDongMuaFilter } from '../crm/muaHang/hopDongMua/hopDongMuaApi'
import type { VthhPricingMatrixItem } from '../../types/vatTuHangHoa'
import { formatThueGtgtBangHienThiTuDanhMuc } from './vthhLoaiNhomSync'
import {
  vthhBuildMaPhu2,
  vthhEffectiveParentMaU,
  vthhInferPhu1MaFromPhu2Ma,
  vthhMachinhFromAnyVariantMa,
  vthhMaHienThiSauMaChinh,
  vthhMaNormalize,
  vthhMatrixRowPhu1Bucket,
  vthhTenPhu1TheoDl,
  vthhTenPhu2TheoKhoGiay,
} from '../../utils/vthhVariantMa'

function giaMuaGanNhatHienThi(r: VatTuHangHoaRecord): number {
  const latest = Number(r.gia_mua_gan_nhat ?? 0) || 0
  if (latest > 0) return latest
  return Number(r.don_gia_mua_co_dinh ?? r.don_gia_mua ?? 0) || 0
}

function maKhoNgamDinh(value: string | null | undefined, labelToMa: Map<string, string>): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (labelToMa.has(raw)) return labelToMa.get(raw) ?? raw
  if (/^[A-Z0-9_]+$/.test(raw)) return raw
  const codeMatch = raw.match(/\b[A-Z]{1,6}\d{1,6}\b/)
  if (codeMatch) return codeMatch[0]
  const splitPipe = raw.split('|')[0]?.trim() ?? ''
  const splitDash = splitPipe.split('-')[0]?.trim() ?? ''
  return splitDash || raw
}

type LatestDgMua = { ngay: string; soChungTu: string; donGia: number }

function parseSerialFromSoChungTu(value: string): number {
  const m = value.trim().match(/(\d+)(?!.*\d)/)
  if (!m) return 0
  return Number.parseInt(m[1], 10) || 0
}

function shouldReplaceLatest(prev: LatestDgMua | undefined, next: LatestDgMua): boolean {
  if (!prev) return true
  if (next.ngay > prev.ngay) return true
  if (next.ngay < prev.ngay) return false
  return parseSerialFromSoChungTu(next.soChungTu) >= parseSerialFromSoChungTu(prev.soChungTu)
}

function parseMainMaSerialDesc(ma: string): number {
  const m = String(ma ?? '').trim().match(/(\d+)(?!.*\d)/)
  return m ? Number.parseInt(m[1], 10) || 0 : 0
}

function parsePbSerialAsc(ma: string): number {
  const m = String(ma ?? '').toUpperCase().match(/_PB(\d+)/)
  return m ? Number.parseInt(m[1], 10) || 0 : 0
}

function parsePhu2SuffixAsc(ma: string): string {
  const m = String(ma ?? '').trim().match(/([A-Za-z]+)$/)
  return (m?.[1] ?? '').toLowerCase()
}

function compareVthhMaForTree(a: VatTuHangHoaRecord, b: VatTuHangHoaRecord, depth: number): number {
  const maA = String(a.ma ?? '')
  const maB = String(b.ma ?? '')
  if (depth === 0) {
    const sa = parseMainMaSerialDesc(maA)
    const sb = parseMainMaSerialDesc(maB)
    if (sa !== sb) return sb - sa
    return maB.localeCompare(maA, 'vi', { numeric: true })
  }
  if (depth === 1) {
    const pa = parsePbSerialAsc(maA)
    const pb = parsePbSerialAsc(maB)
    if (pa !== pb) return pa - pb
    return maA.localeCompare(maB, 'vi', { numeric: true })
  }
  const xa = parsePhu2SuffixAsc(maA)
  const xb = parsePhu2SuffixAsc(maB)
  if (xa !== xb) return xa.localeCompare(xb, 'vi', { numeric: true })
  return maA.localeCompare(maB, 'vi', { numeric: true })
}

/** Dòng lưới VTHH: thứ tự phân tầng (mẹ → con) + metadata hiển thị. */
type VatTuHangHoaGridRow = VatTuHangHoaRecord & {
  _vthhTreeIndent?: number
  _vthhIsVariantChild?: boolean
  _vthhHasChildren?: boolean
  /** Khóa duy nhất cho `DataGrid` (có thể nhiều dòng cùng `id` khi tách từng dòng `pricing_matrix`). */
  _vthhListRowId: string
  /** Bản ghi VTHH gốc (luôn = `id` ngoại trừ dòng tổng hợp từ matrix). */
  _vthhSourceRecordId: number
  _vthhIsMatrixVariant?: boolean
  /** Dòng nhóm phụ 1 (chỉ lưới): không có trong DB, đứng trước các dòng matrix phụ 2 cùng ĐL. */
  _vthhIsSyntheticPhu1?: boolean
  /** Mã vật tư gốc (phiên bản chính) — dùng cột Mã rút gọn & matrix. */
  _vthhMaChinhGoc?: string
}

/** Nhóm phiên bản: chính → phụ 1 → phụ 2 (theo `ma_vthh_cap_cha` + quy ước `_PB{n}` / hậu tố khổ chữ thường). */
function buildVthhHierarchyDisplayRows(list: VatTuHangHoaRecord[]): VatTuHangHoaGridRow[] {
  const maU = (ma: string) => (ma ?? '').trim().toUpperCase()
  const byMa = new Map<string, VatTuHangHoaRecord>()
  for (const r of list) {
    const m = maU(r.ma)
    if (m) byMa.set(m, r)
  }
  const effParentU = (r: VatTuHangHoaRecord) => vthhEffectiveParentMaU(r, byMa)
  const isLinkedChild = (r: VatTuHangHoaRecord) => effParentU(r) !== ''
  const childrenByParent = new Map<string, VatTuHangHoaRecord[]>()
  for (const r of list) {
    const p = effParentU(r)
    if (!p) continue
    const arr = childrenByParent.get(p) ?? []
    arr.push(r)
    childrenByParent.set(p, arr)
  }
  for (const arr of childrenByParent.values()) {
    arr.sort((a, b) => compareVthhMaForTree(a, b, 1))
  }
  const roots = list.filter((r) => !isLinkedChild(r)).sort((a, b) => compareVthhMaForTree(a, b, 0))
  const used = new Set<number>()
  const out: VatTuHangHoaGridRow[] = []

  const pushNode = (r: VatTuHangHoaRecord, depth: number) => {
    const m = maU(r.ma)
    const kids = (childrenByParent.get(m) ?? []).slice().sort((a, b) => compareVthhMaForTree(a, b, depth + 1))
    const hasChildren = kids.length > 0
    const maChinhGoc = vthhMachinhFromAnyVariantMa(r.ma ?? '')
    out.push({
      ...r,
      _vthhTreeIndent: depth,
      _vthhIsVariantChild: depth > 0,
      _vthhHasChildren: hasChildren,
      _vthhListRowId: `${r.id}::0`,
      _vthhSourceRecordId: r.id,
      _vthhMaChinhGoc: maChinhGoc,
    })
    used.add(r.id)
    for (const k of kids) {
      if (!used.has(k.id)) pushNode(k, depth + 1)
    }
  }

  for (const r of roots) {
    if (!used.has(r.id)) pushNode(r, 0)
  }
  for (const r of list) {
    if (!used.has(r.id)) {
      pushNode(r, isLinkedChild(r) ? 1 : 0)
    }
  }
  return out
}

function splitKhoGiayDisplayTokens(raw: string | undefined): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of (raw ?? '').split(/[;,]/)) {
    const t = part.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

function matrixRowShouldExpand(pm: VthhPricingMatrixItem, matrixLen: number): boolean {
  return (
    matrixLen > 1 ||
    Boolean(String(pm.dinh_luong ?? '').trim() || String(pm.kho_giay ?? '').trim()) ||
    splitKhoGiayDisplayTokens(pm.kho_giay).length > 1
  )
}

/** Token định lượng trên bản ghi phiên bản (có thể nhiều giá trị `;` hoặc rỗng → suy từ tên). */
function parseVthhDinhLuongTokensFromRecord(r: VatTuHangHoaRecord): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const push = (t: string) => {
    const x = t.trim()
    if (!x || seen.has(x)) return
    seen.add(x)
    out.push(x)
  }
  for (const part of (r.dinh_luong ?? '').split(';')) push(part)
  for (const part of (r.do_day ?? '').split(';')) push(part)
  if (out.length > 0) return out
  const ten = String(r.ten ?? '')
  const m = ten.match(/[—–-]\s*ĐL\s+(.+)$/i)
  if (m) push(m[1])
  return out
}

function pmDinhLuongTokens(pm: VthhPricingMatrixItem): string[] {
  const raw = String(pm.dinh_luong ?? '').trim()
  if (!raw) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const part of raw.split(/[;,]/)) {
    const t = part.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

/** Khớp dòng matrix trên cha với phiên bản con: `ma_quy_cach` đủ (phụ 2), phụ 2 là tiếp nối phụ 1 (`mqc.startsWith(childMaU)` + chữ), hoặc cùng định lượng. */
function matrixPmMatchesChildVariant(r: VatTuHangHoaRecord, pm: VthhPricingMatrixItem, childMaU: string): boolean {
  const mqc = (pm.ma_quy_cach ?? '').trim().toUpperCase()
  if (mqc && mqc === childMaU) return true
  if (mqc && mqc.startsWith(childMaU) && mqc.length > childMaU.length) {
    const rest = mqc.slice(childMaU.length)
    if (rest !== '' && /^[A-Za-z]+$/.test(rest)) return true
  }
  if (mqc && childMaU.startsWith(mqc)) {
    const rest = childMaU.slice(mqc.length)
    if (rest !== '' && /^[A-Za-z]+$/.test(rest)) return true
  }
  const dlPm = String(pm.dinh_luong ?? '').trim()
  const dlR = String(r.dinh_luong ?? '').trim()
  if (dlPm !== '' && dlR !== '' && dlPm === dlR) return true
  const childDls = parseVthhDinhLuongTokensFromRecord(r)
  const pmDls = pmDinhLuongTokens(pm)
  if (childDls.length > 0 && pmDls.length > 0) return pmDls.some((d) => childDls.includes(d))
  return false
}

/**
 * Dòng matrix trên lưới:
 * - Bản ghi cha (không có con cùng nhóm trong lưới): matrix ngay dưới cha (thụt 1).
 * - Bản ghi con (ma_vthh_cap_cha): tách từ `pricing_matrix` của **cha**, khớp `ma_quy_cach` / `dinh_luong` — mỗi khổ giấy (nhiều token) → một dòng **cấp cháu** (thụt +1 dưới con).
 */
function expandVthhPricingMatrixDisplayRows(rows: VatTuHangHoaGridRow[]): VatTuHangHoaGridRow[] {
  const maU = (ma: string) => (ma ?? '').trim().toUpperCase()
  const byMa = new Map<string, VatTuHangHoaGridRow>()
  for (const row of rows) {
    const m = maU(row.ma ?? '')
    if (m) byMa.set(m, row)
  }
  const parentMaForExpand = (r: VatTuHangHoaGridRow) => vthhEffectiveParentMaU(r, byMa)

  /** Matrix thường nằm trên bản ghi gốc (chính); con phụ 1/2 leo cây cha để tìm `pricing_matrix`. */
  const resolveMatrixSourceRow = (startParentMaU: string): VatTuHangHoaGridRow | undefined => {
    const guard = new Set<string>()
    let curU = startParentMaU
    while (curU) {
      if (guard.has(curU)) return undefined
      guard.add(curU)
      const cur = byMa.get(curU)
      if (!cur) return undefined
      const mx = cur.pricing_matrix
      if (Array.isArray(mx) && mx.length > 0) return cur
      const p = vthhEffectiveParentMaU(cur, byMa)
      if (!p) return undefined
      curU = p
    }
    return undefined
  }

  const out: VatTuHangHoaGridRow[] = []

  const pushMatrixVisualRows = (
    anchor: VatTuHangHoaGridRow,
    pm: VthhPricingMatrixItem,
    baseIndent: number,
    idPrefix: string,
    priceSourcePm?: VthhPricingMatrixItem,
  ) => {
    const src = priceSourcePm ?? pm
    const khoTokens = splitKhoGiayDisplayTokens(pm.kho_giay)
    const tenPhu1 = vthhTenPhu1TheoDl(anchor.ten, pm.dinh_luong)
    const maChinhGoc = vthhMachinhFromAnyVariantMa(String(anchor.ma ?? ''))

    const emit = (khoSingle: string | undefined, slug: string, fullMaOverride?: string) => {
      const subTen = vthhTenPhu2TheoKhoGiay(tenPhu1, khoSingle)
      const fullMa =
        (fullMaOverride ?? '').trim() ||
        String(pm.ma_quy_cach ?? '').trim() ||
        String(anchor.ma ?? '').trim()
      out.push({
        ...anchor,
        ma: fullMa,
        ten: subTen,
        dvt_chinh: pm.dvt || anchor.dvt_chinh,
        don_gia_ban: src.gia_ban != null ? src.gia_ban : anchor.don_gia_ban,
        gia_mua_gan_nhat: src.gia_mua != null ? src.gia_mua : anchor.gia_mua_gan_nhat,
        kho_giay: khoSingle ?? anchor.kho_giay,
        dinh_luong: pm.dinh_luong ?? anchor.dinh_luong,
        _vthhListRowId: `${anchor._vthhListRowId}::m::${idPrefix}${slug}`,
        _vthhSourceRecordId: anchor._vthhSourceRecordId,
        _vthhIsMatrixVariant: true,
        _vthhIsVariantChild: true,
        _vthhTreeIndent: baseIndent + 1,
        _vthhHasChildren: false,
        _vthhMaChinhGoc: maChinhGoc,
        pricing_matrix: undefined,
      })
    }

    if (khoTokens.length > 1) {
      const p1FromPm = vthhInferPhu1MaFromPhu2Ma(String(pm.ma_quy_cach ?? '')).trim()
      khoTokens.forEach((kg, i) => {
        const maTok = p1FromPm ? vthhBuildMaPhu2(p1FromPm, i) : ''
        emit(kg, `kg${i}`, maTok)
      })
    } else {
      emit(khoTokens[0], '0')
    }
  }

  for (const r of rows) {
    out.push(r)

    const parentMaU = parentMaForExpand(r)
    const isLinkedChild = parentMaU !== ''

    /** Phiên bản con: matrix trên bản ghi gốc hoặc cha có `pricing_matrix`. */
    if (isLinkedChild) {
      const matrixHost = resolveMatrixSourceRow(parentMaU)
      const parentMatrix = matrixHost?.pricing_matrix
      if (Array.isArray(parentMatrix) && parentMatrix.length > 0) {
        const childMaU = maU(r.ma ?? '')
        const seenKey = new Set<string>()
        const matching: VthhPricingMatrixItem[] = []
        for (const pm of parentMatrix) {
          const mqc = maU(String(pm.ma_quy_cach ?? ''))
          const dlPm = String(pm.dinh_luong ?? '').trim()
          const key = `${mqc}|${dlPm}|${String(pm.kho_giay ?? '').trim()}`
          if (seenKey.has(key)) continue
          if (matrixPmMatchesChildVariant(r, pm, childMaU)) {
            seenKey.add(key)
            matching.push(pm)
          }
        }

        matching.sort((a, b) => {
          const ka = String(a.kho_giay ?? '')
          const kb = String(b.kho_giay ?? '')
          if (ka !== kb) return ka.localeCompare(kb, 'vi', { numeric: true })
          return String(a.ma_quy_cach ?? '').localeCompare(String(b.ma_quy_cach ?? ''), 'vi', { numeric: true })
        })

        const baseIndent = r._vthhTreeIndent ?? 1
        matching.forEach((pm, mi) => {
          if (!matrixRowShouldExpand(pm, parentMatrix.length)) return
          const sameDl = matching
            .filter((x) => String(x.dinh_luong ?? '').trim() === String(pm.dinh_luong ?? '').trim())
            .sort((a, b) => String(a.kho_giay ?? '').localeCompare(String(b.kho_giay ?? ''), 'vi', { numeric: true }))
          const priceRef = sameDl[0] ?? pm
          pushMatrixVisualRows(r, pm, baseIndent, `${mi}-`, priceRef)
        })
      }
      continue
    }

    const matrix = r.pricing_matrix
    if (!Array.isArray(matrix) || matrix.length === 0) continue

    const hasKidsInList = rows.some((x) => parentMaForExpand(x) === maU(String(r.ma ?? '')))
    if (hasKidsInList) continue

    const matrixExpandable = matrix.filter((pm) => matrixRowShouldExpand(pm, matrix.length))
    if (matrixExpandable.length === 0) continue

    const groups = new Map<string, VthhPricingMatrixItem[]>()
    for (const pm of matrixExpandable) {
      const b = vthhMatrixRowPhu1Bucket(String(pm.ma_quy_cach ?? ''))
      const arr = groups.get(b) ?? []
      arr.push(pm)
      groups.set(b, arr)
    }
    const groupKeys = [...groups.keys()].sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }))
    const rootIndent = r._vthhTreeIndent ?? 0

    for (const gk of groupKeys) {
      const pms = groups.get(gk)!
      pms.sort((a, b) => {
        const ka = String(a.kho_giay ?? '')
        const kb = String(b.kho_giay ?? '')
        if (ka !== kb) return ka.localeCompare(kb, 'vi', { numeric: true })
        return String(a.ma_quy_cach ?? '').localeCompare(String(b.ma_quy_cach ?? ''), 'vi', { numeric: true })
      })
      const first = pms[0]!
      const p1Ma =
        vthhInferPhu1MaFromPhu2Ma(String(first.ma_quy_cach ?? '')).trim() ||
        String(first.ma_quy_cach ?? '').trim() ||
        gk
      const dlLabel = String(first.dinh_luong ?? '').trim()
      const tenSafe = vthhTenPhu1TheoDl(r.ten, dlLabel || undefined)
      out.push({
        ...r,
        ma: p1Ma,
        ten: tenSafe,
        dinh_luong: first.dinh_luong ?? r.dinh_luong,
        kho_giay: undefined,
        don_gia_ban: first.gia_ban != null ? first.gia_ban : r.don_gia_ban,
        don_gia_mua_co_dinh: first.gia_mua != null ? first.gia_mua : r.don_gia_mua_co_dinh,
        gia_mua_gan_nhat: first.gia_mua != null ? first.gia_mua : r.gia_mua_gan_nhat,
        _vthhTreeIndent: rootIndent + 1,
        _vthhIsVariantChild: true,
        _vthhHasChildren: pms.length > 0,
        _vthhIsSyntheticPhu1: true,
        _vthhIsMatrixVariant: false,
        _vthhListRowId: `${r._vthhListRowId}::syn::${maU(p1Ma)}`,
        _vthhSourceRecordId: r._vthhSourceRecordId,
        _vthhMaChinhGoc: vthhMachinhFromAnyVariantMa(p1Ma),
        pricing_matrix: undefined,
      })
      const priceRefGroup = pms[0]!
      pms.forEach((pm, mi) => {
        pushMatrixVisualRows(r, pm, rootIndent + 1, `${gk}-${mi}-`, priceRefGroup)
      })
    }
  }
  return out
}

/** Dòng tổng hợp từ matrix (không có bản ghi riêng) — không nhân bản; vẫn mở Sửa để xem/chỉnh bản ghi gốc. */
function vthhGridLaDongTongHopMatrix(row: VatTuHangHoaGridRow): boolean {
  return Boolean(row._vthhIsSyntheticPhu1 || row._vthhIsMatrixVariant)
}

function tinhDgMuaGanNhatTheoChungTu(): Map<string, number> {
  const map = new Map<string, LatestDgMua>()

  const dhm = donHangMuaGetAll({ ...getDefaultDonHangMuaFilter(), tu: '', den: '' })
  for (const don of dhm) {
    const ngay = String(don.ngay_don_hang ?? '').trim()
    if (!ngay) continue
    for (const ct of donHangMuaGetChiTiet(don.id)) {
      const ma = String(ct.ma_hang ?? '').trim().toUpperCase()
      if (!ma) continue
      const donGia = Number(ct.don_gia ?? 0) || 0
      const candidate: LatestDgMua = { ngay, soChungTu: String(don.so_don_hang ?? ''), donGia }
      const prev = map.get(ma)
      if (shouldReplaceLatest(prev, candidate)) map.set(ma, candidate)
    }
  }

  const hdm = hopDongMuaGetAll({ ...getDefaultHopDongMuaFilter(), tu: '', den: '' })
  for (const don of hdm) {
    const ngay = String(don.ngay_don_hang ?? '').trim()
    if (!ngay) continue
    for (const ct of hopDongMuaGetChiTiet(don.id)) {
      const ma = String(ct.ma_hang ?? '').trim().toUpperCase()
      if (!ma) continue
      const donGia = Number(ct.don_gia ?? 0) || 0
      const candidate: LatestDgMua = { ngay, soChungTu: String(don.so_don_hang ?? ''), donGia }
      const prev = map.get(ma)
      if (shouldReplaceLatest(prev, candidate)) map.set(ma, candidate)
    }
  }

  const out = new Map<string, number>()
  for (const [ma, val] of map.entries()) out.set(ma, val.donGia)
  return out
}

/** Hiển thị cột ĐVT theo nguyên tắc ĐVT chính: hiển thị ký hiệu/tên (ky_hieu || ten_dvt), không hiển thị mã */
function dvtHienThiLabel(
  value: string | null | undefined,
  dvtList: { ma_dvt: string; ten_dvt: string; ky_hieu?: string }[]
): string {
  if (value == null || value === '') return ''
  const v = String(value).trim()
  const d = dvtList.find(
    (x) => x.ma_dvt === v || x.ten_dvt === v || (x.ky_hieu != null && x.ky_hieu === v)
  )
  return d ? (d.ky_hieu || d.ten_dvt || d.ma_dvt) : v
}

/** Giống form: lấy ĐG bán gốc để tính theo tỉ lệ — không có bậc giá thì dùng ĐG bán tab 1; có bậc giá thì tìm dòng chứa tỉ lệ. */
function getBaseDgBanForDonViQuyDoiView(record: VatTuHangHoaRecord, tiLeNum: number): number {
  const bangGia = record.bang_chiet_khau ?? []
  const hasBangGiaRows = bangGia.some((r) => {
    const tu = (r.so_luong_tu ?? '').trim()
    const den = (r.so_luong_den ?? '').trim()
    const gia = (r.ty_le_chiet_khau ?? '').trim()
    return tu !== '' || den !== '' || gia !== ''
  })
  const donGiaBanTab1 = String(record.don_gia_ban ?? '')
  if (!hasBangGiaRows) return parseFloatVN(donGiaBanTab1) || 0
  const matchingRow = bangGia.find((r) => {
    const tu = parseFloatVN(r.so_luong_tu ?? '')
    const denStr = (r.so_luong_den ?? '').trim()
    const den = parseFloatVN(r.so_luong_den ?? '')
    if (denStr === '') return tiLeNum >= tu
    return tiLeNum >= tu && tiLeNum <= den
  })
  if (!matchingRow) return parseFloatVN(donGiaBanTab1) || 0
  const rowIdx = bangGia.indexOf(matchingRow)
  const useDgBanTab1 = rowIdx === 0 || parseFloatVN(matchingRow.so_luong_tu ?? '') === 0
  const baseNum = useDgBanTab1 ? parseFloatVN(donGiaBanTab1) : parseFloatVN(matchingRow.ty_le_chiet_khau ?? '')
  return baseNum || parseFloatVN(donGiaBanTab1) || 0
}

const panelChiTiet: React.CSSProperties = {
  marginTop: '8px',
  border: '1px solid var(--border-strong)',
  borderRadius: '4px',
  background: 'var(--bg-secondary)',
  overflow: 'hidden',
}

const truongChiTiet: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  padding: '3px 0',
}

const nhan: React.CSSProperties = {
  color: 'var(--text-secondary)',
  minWidth: '140px',
  fontWeight: 500,
}

const giaTri: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontWeight: 500,
}

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  fontWeight: 600,
  color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border)',
  borderRight: '1px solid var(--border)',
  background: 'var(--bg-tab)',
}
const tdStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderBottom: '1px solid var(--border)',
  borderRight: '1px solid var(--border)',
  color: 'var(--text-primary)',
}

const vungHinhAnh: React.CSSProperties = {
  border: '1px dashed var(--border-strong)',
  borderRadius: '4px',
  minHeight: '120px',
  maxWidth: '160px',
  maxHeight: '160px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-muted)',
  fontSize: '10px',
  background: 'var(--bg-primary)',
  overflow: 'hidden',
}

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  pointerEvents: 'none',
}

const modalBox: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-strong)',
  borderRadius: '6px',
  width: '94vw',
  maxWidth: 1000,
  height: '85vh',
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
  userSelect: 'none',
  pointerEvents: 'auto',
}

interface VatTuHangHoaProps {
  onQuayLai?: () => void
  /** [YC26] Filter mode: 'all' (mặc định - tất cả VTHH), 'ban' (chỉ la_vthh_ban = true) */
  filterMode?: 'all' | 'ban'
}

function filterWithHierarchyByMode(data: VatTuHangHoaRecord[], filterMode: 'all' | 'ban'): VatTuHangHoaRecord[] {
  if (filterMode === 'all') return data
  const byMa = new Map<string, VatTuHangHoaRecord>()
  data.forEach((r) => {
    const ma = String(r.ma ?? '').trim().toUpperCase()
    if (ma) byMa.set(ma, r)
  })
  const keep = new Set<number>()
  data.forEach((r) => {
    if (r.la_vthh_ban === true) keep.add(r.id)
  })
  let changed = true
  while (changed) {
    changed = false
    data.forEach((r) => {
      const parentMa = vthhEffectiveParentMaU(r, byMa)
      if (!parentMa) return
      const parent = byMa.get(parentMa)
      if (!parent) return
      if (keep.has(parent.id) && !keep.has(r.id)) {
        keep.add(r.id)
        changed = true
      }
      if (keep.has(r.id) && !keep.has(parent.id)) {
        keep.add(parent.id)
        changed = true
      }
    })
  }
  return data.filter((r) => keep.has(r.id))
}

function rootMaForVersion(record: VatTuHangHoaRecord): string {
  return vthhMachinhFromAnyVariantMa(record.ma ?? '')
}

function mergePayloadForVersionTarget(
  payload: Omit<VatTuHangHoaRecord, 'id'>,
  target: VatTuHangHoaRecord
): Omit<VatTuHangHoaRecord, 'id'> {
  const thueGtg = payload.thue_suat_gtgt
  const thueDau = payload.thue_suat_gtgt_dau_ra ?? payload.thue_suat_gtgt
  return {
    ...payload,
    ma: target.ma,
    ma_vthh_cap_cha: target.ma_vthh_cap_cha,
    vt_chinh: target.vt_chinh,
    ma_quy_cach: target.ma_quy_cach,
    dinh_luong: target.dinh_luong,
    he_mau: (target as { he_mau?: string }).he_mau,
    kho_giay: target.kho_giay,
    do_day: target.do_day,
    pricing_matrix: target.pricing_matrix,
    so_luong_ton: target.so_luong_ton,
    gia_tri_ton: target.gia_tri_ton,
    thue_suat_gtgt: thueGtg,
    thue_suat_gtgt_dau_ra: thueDau,
  }
}

export function VatTuHangHoa({ onQuayLai, filterMode = 'all' }: VatTuHangHoaProps) {
  const toastApi = useToastOptional()
  const showError = toastApi ? (msg: string) => toastApi.showToast(msg, 'error') : (msg: string) => alert(msg)

  const [danhSach, setDanhSach] = useState<VatTuHangHoaRecord[]>([])
  const [dongChon, setDongChon] = useState<VatTuHangHoaRecord | null>(null)
  const [modalOpen, setModalOpen] = useState<'add' | 'edit' | null>(null)
  const [addPrefill, setAddPrefill] = useState<Partial<VatTuHangHoaRecord> | null>(null)
  /** Tăng mỗi lần bấm Thêm để form remount → reset các tab và nội dung phía dưới. */
  const [addFormKey, setAddFormKey] = useState(0)
  const [dvtList, setDvtList] = useState<{ id: number; ma_dvt: string; ten_dvt: string; ky_hieu?: string }[]>([])
  const [latestDgMuaByMa, setLatestDgMuaByMa] = useState<Map<string, number>>(() => new Map())
  const [dangTai, setDangTai] = useState(true)
  const [imageLoadError, setImageLoadError] = useState(false)
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; sizeMB: number } | null>(null)
  const [detailTab, setDetailTab] = useState<'ngam_dinh' | 'chiet_khau' | 'don_vi_quy_doi' | 'dinh_muc_nvl' | 'dac_tinh'>('ngam_dinh')
  const modalBoxRef = useRef<HTMLDivElement>(null)
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | null>(null)
  const [dragStart, setDragStart] = useState<{ clientX: number; clientY: number; startX: number; startY: number } | null>(null)
  /** Dòng đang mở form cảnh báo xóa (null = đóng form) */
  const [deleteTarget, setDeleteTarget] = useState<VatTuHangHoaRecord | null>(null)
  const [vthhGridListRowId, setVthhGridListRowId] = useState<string | null>(null)

  /** `silent`: đồng bộ từ máy khác — không bật «đang tải» (tránh giật layout). */
  const napLai = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true
    if (!silent) setDangTai(true)
    vatTuHangHoaNapLai()
    try {
      const data = await vatTuHangHoaGetAll()
      if (!silent) {
        const dvt = await donViTinhGetAll()
        setDvtList(dvt.map((r) => ({ id: r.id, ma_dvt: r.ma_dvt, ten_dvt: r.ten_dvt, ky_hieu: r.ky_hieu })))
      }
      setLatestDgMuaByMa(tinhDgMuaGanNhatTheoChungTu())
      const filtered = filterWithHierarchyByMode(data, filterMode)
      setDanhSach(filtered)
      setDongChon((prev) => {
        if (!prev) return filtered[0] ?? null
        const capNhat = filtered.find((r) => r.id === prev.id)
        return capNhat ?? filtered[0] ?? null
      })
    } finally {
      if (!silent) setDangTai(false)
    }
  }, [filterMode])

  const refreshDvtList = useCallback(async () => {
    const dv = await donViTinhGetAll()
    setDvtList(dv.map((r) => ({ id: r.id, ma_dvt: r.ma_dvt, ten_dvt: r.ten_dvt, ky_hieu: r.ky_hieu })))
  }, [])

  const tonTheoMa = useMemo(() => tonKhoCuoikyTheoMaVthh(), [danhSach])
  const khoLabelToMa = useMemo(() => {
    const m = new Map<string, string>()
    for (const item of loadKhoListFromStorage()) {
      const id = String(item.id ?? '').trim()
      const label = String(item.label ?? '').trim()
      if (!id || !label) continue
      m.set(label, id)
    }
    return m
  }, [danhSach])

  const hierarchicalDanhSach = useMemo(() => buildVthhHierarchyDisplayRows(danhSach), [danhSach])
  const gridHierarchyRows = useMemo(
    () => expandVthhPricingMatrixDisplayRows(hierarchicalDanhSach),
    [hierarchicalDanhSach]
  )

  /** Khi bản ghi chọn theo mã nguồn đổi (hoặc làm mới), giữ dòng con/matrix nếu cùng `id`, ngược lại gán dòng mặc định `id::0`. */
  useEffect(() => {
    if (!dongChon) {
      setVthhGridListRowId(null)
      return
    }
    setVthhGridListRowId((prev) => {
      if (prev != null && prev.startsWith(`${dongChon.id}::`)) return prev
      return `${dongChon.id}::0`
    })
  }, [dongChon?.id])

  /** Lưới: ĐVT theo ký hiệu/tên; tồn lấy từ module Tồn kho (báo cáo nhập − xuất). Dòng matrix dùng mã tồn theo bản ghi nguồn. */
  const displayData = useMemo(() => {
    return gridHierarchyRows.map((r) => {
      const maU = (() => {
        if (r._vthhIsMatrixVariant || r._vthhIsSyntheticPhu1) {
          const p = danhSach.find((x) => x.id === r._vthhSourceRecordId)
          return (p?.ma ?? r.ma ?? '').trim().toUpperCase()
        }
        return (r.ma ?? '').trim().toUpperCase()
      })()
      const tk = tonTheoMa.get(maU)
      const fromChungTu = latestDgMuaByMa.get(maU) ?? 0
      const fromRecord = Number(r.gia_mua_gan_nhat ?? 0) || 0
      const dgGanNhat = fromChungTu > 0 ? fromChungTu : (fromRecord > 0 ? fromRecord : Number(r.don_gia_mua_co_dinh ?? r.don_gia_mua ?? 0) || 0)
      return {
        ...r,
        dvt_chinh: dvtHienThiLabel(r.dvt_chinh, dvtList),
        don_gia_mua_gan_nhat_hien_thi: dgGanNhat,
        kho_ngam_dinh_hien_thi: maKhoNgamDinh(r.kho_ngam_dinh ?? '', khoLabelToMa),
        so_luong_ton: tk?.so_luong ?? 0,
        gia_tri_ton: tk?.gia_tri ?? 0,
      }
    })
  }, [gridHierarchyRows, dvtList, tonTheoMa, latestDgMuaByMa, khoLabelToMa, danhSach])

  const selectedVthhGridRow = useMemo(() => {
    const id = vthhGridListRowId ?? (dongChon ? `${dongChon.id}::0` : null)
    if (!id) return null
    return displayData.find((x) => x._vthhListRowId === id) ?? null
  }, [displayData, vthhGridListRowId, dongChon])

  const dangChonDongKhongNhanBan = Boolean(selectedVthhGridRow && vthhGridLaDongTongHopMatrix(selectedVthhGridRow))

  const columns: DataGridColumn<VatTuHangHoaGridRow>[] = useMemo(
    () => [
      {
        key: 'ma',
        label: 'Mã VTHH',
        width: 118,
        filterable: false,
        renderCell: (v, row) => {
          const indent = row._vthhTreeIndent ?? 0
          const isChild = Boolean(row._vthhIsVariantChild)
          const isMatrix = Boolean(row._vthhIsMatrixVariant)
          const isSynP1 = Boolean(row._vthhIsSyntheticPhu1)
          const fullMa = String(v ?? '')
          const shortMa = vthhMaHienThiSauMaChinh(fullMa, row._vthhMaChinhGoc)
          return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, paddingLeft: indent * 14, whiteSpace: 'nowrap' }}>
              {isChild ? (
                <span
                  style={{ color: 'var(--connector, #d97706)', fontSize: 11, fontWeight: 700 }}
                  title={
                    isMatrix
                      ? 'Phiên bản theo quy cách (matrix — khổ giấy)'
                      : isSynP1
                        ? 'Phiên bản phụ 1 (định lượng / nhóm matrix)'
                        : 'Phiên bản con (mã cấp cha)'
                  }
                >
                  {isMatrix ? '⤷' : '└'}
                </span>
              ) : null}
              <span title={shortMa !== fullMa ? fullMa : undefined}>{shortMa}</span>
            </span>
          )
        },
      },
      { key: 'ten', label: 'Tên VTHH', width: '14%', filterable: false },
      { key: 'tinh_chat', label: 'Loại VTHH', width: '8%', filterable: false },
      { key: 'nhom_vthh', label: 'Nhóm VTHH', width: '8%', filterable: false },
      { key: 'dvt_chinh', label: 'ĐVT', width: '6%', filterable: false },
      {
        key: 'vt_chinh',
        label: 'VT cấp cha',
        width: 56,
        align: 'center',
        filterable: false,
        renderCell: (_v, row) => {
          if (row._vthhIsVariantChild) return ''
          if (row._vthhHasChildren) return 'Mẹ'
          return row.vt_chinh ? '✓' : ''
        },
      },
      {
        key: 'don_gia_mua_gan_nhat_hien_thi',
        label: 'Giá mua gần',
        width: 88,
        align: 'right',
        filterable: false,
        renderCell: (v) => formatNumberDisplay(Number(v ?? 0), 0),
      },
      {
        key: 'don_gia_ban',
        label: 'ĐG bán',
        width: 80,
        align: 'right',
        filterable: false,
        renderCell: (_v, row) => formatNumberDisplay(Number(row.don_gia_ban ?? 0), 0),
      },
      {
        key: 'thue_suat_gtgt_dau_ra',
        label: 'Thuế GTGT',
        width: 72,
        align: 'right',
        filterable: false,
        renderCell: (_v, row) => formatThueGtgtBangHienThiTuDanhMuc(row),
      },
      {
        key: 'kho_ngam_dinh_hien_thi',
        label: 'Kho',
        width: 96,
        filterable: false,
        renderCell: (v) => <span style={{ whiteSpace: 'nowrap' }}>{String(v ?? '')}</span>,
      },
      {
        key: 'so_luong_ton',
        label: 'SL tồn',
        width: 72,
        align: 'right',
        filterable: false,
        renderCell: (v) => formatSoThapPhan(Number(v), 2),
      },
      {
        key: 'gia_tri_ton',
        label: 'GT tồn',
        width: 88,
        align: 'right',
        filterable: false,
        renderCell: (v) => formatNumberDisplay(Number(v), 0),
      },
    ],
    []
  )

  useEffect(() => {
    napLai()
  }, [])

  const vthhReloadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Đồng bộ đa máy: gom nhiều sự kiện KV/poll trong ~320ms → một lần nap (giảm giật lưới). */
  useEffect(() => {
    const onVthhReload = () => {
      if (vthhReloadDebounceRef.current) clearTimeout(vthhReloadDebounceRef.current)
      vthhReloadDebounceRef.current = setTimeout(() => {
        vthhReloadDebounceRef.current = null
        void napLai({ silent: true })
      }, 320)
    }
    window.addEventListener('htql-vthh-reload', onVthhReload)
    return () => {
      window.removeEventListener('htql-vthh-reload', onVthhReload)
      if (vthhReloadDebounceRef.current) clearTimeout(vthhReloadDebounceRef.current)
    }
  }, [napLai])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (deleteTarget) setDeleteTarget(null)
      else if (modalOpen) setModalOpen(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalOpen, deleteTarget])

  useEffect(() => {
    setImageLoadError(false)
    setImageMeta(null)
  }, [dongChon?.id, dongChon?.duong_dan_hinh_anh])

  useEffect(() => {
    setDetailTab('ngam_dinh')
  }, [dongChon?.id])

  const detailTabs = useMemo(() => {
    const tabs: { id: typeof detailTab; label: string }[] = [
      { id: 'ngam_dinh', label: 'Ngầm định' },
    ]
    if (dongChon) {
      const hasChietKhau = Array.isArray(dongChon.bang_chiet_khau) && dongChon.bang_chiet_khau.some((r) => r.so_luong_tu || r.so_luong_den || r.ty_le_chiet_khau)
      if (hasChietKhau) tabs.push({ id: 'chiet_khau', label: 'Bậc giá' })
      const hasDonViQuyDoi = Array.isArray(dongChon.don_vi_quy_doi) && dongChon.don_vi_quy_doi.some((r) => (r.dvt ?? '').trim() || (r.ti_le_quy_doi ?? '1') !== '1' || (r.mo_ta ?? '').trim() || (r.gia_ban ?? '').trim())
      if (hasDonViQuyDoi) tabs.push({ id: 'don_vi_quy_doi', label: 'Đơn vị quy đổi' })
      const hasDinhMucNvl = dongChon.tinh_chat === 'Sản phẩm' && Array.isArray(dongChon.dinh_muc_nvl) && dongChon.dinh_muc_nvl.some((r) => r.ma || r.ten || r.so_luong)
      if (hasDinhMucNvl) tabs.push({ id: 'dinh_muc_nvl', label: 'Định mức nguyên vật liệu' })
      const hasDacTinh = (dongChon.dac_tinh ?? '').trim() || (dongChon.duong_dan_hinh_anh ?? '').trim()
      if (hasDacTinh) tabs.push({ id: 'dac_tinh', label: 'Đặc tính, hình ảnh' })
    }
    return tabs
  }, [dongChon])

  const activeDetailTab = detailTabs.some((t) => t.id === detailTab) ? detailTab : 'ngam_dinh'

  useEffect(() => {
    if (modalOpen) setModalPosition(null)
  }, [modalOpen])

  useEffect(() => {
    if (!dragStart) return
    const onMove = (e: MouseEvent) => {
      setModalPosition({
        x: dragStart.startX + (e.clientX - dragStart.clientX),
        y: dragStart.startY + (e.clientY - dragStart.clientY),
      })
    }
    const onUp = () => setDragStart(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragStart])

  const handleHeaderPointerDown = useCallback((e: React.MouseEvent) => {
    if (!modalBoxRef.current) return
    const rect = modalBoxRef.current.getBoundingClientRect()
    setModalPosition({ x: rect.left, y: rect.top })
    setDragStart({ clientX: e.clientX, clientY: e.clientY, startX: rect.left, startY: rect.top })
  }, [])

  const moThem = () => {
    setAddPrefill(null)
    setAddFormKey((k) => k + 1)
    setModalOpen('add')
  }

  const moSua = () => {
    if (!dongChon) return
    setAddPrefill(null)
    setModalOpen('edit')
  }

  const nhanBan = () => {
    if (!dongChon) return
    if (dangChonDongKhongNhanBan) {
      showError('Không nhân bản từ dòng tổng hợp matrix. Chọn bản ghi danh mục (một dòng có trong CSDL) để nhân bản.')
      return
    }
    setAddPrefill({ ...dongChon, ma: '' })
    setModalOpen('add')
  }

  const dongModal = () => {
    setModalOpen(null)
    setAddPrefill(null)
  }

  const handleSubmitForm = async (payload: Omit<VatTuHangHoaRecord, 'id'>) => {
    if (vatTuHangHoaTrungMa(payload.ma, modalOpen === 'edit' ? dongChon?.id : undefined)) {
      throw new Error('Mã VTHH đã tồn tại.')
    }
    if (modalOpen === 'add') {
      await vatTuHangHoaPost(payload)
    } else if (modalOpen === 'edit' && dongChon) {
      const all = await vatTuHangHoaGetAll()
      const rootMaU = vthhMaNormalize(rootMaForVersion(dongChon))
      const group = all.filter((r) => vthhMaNormalize(vthhMachinhFromAnyVariantMa(r.ma ?? '')) === rootMaU)
      if (group.length <= 1) {
        await vatTuHangHoaPut(dongChon.id, { ...payload, so_luong_ton: dongChon.so_luong_ton, gia_tri_ton: dongChon.gia_tri_ton })
      } else {
        for (const target of group) {
          await vatTuHangHoaPut(target.id, mergePayloadForVersionTarget(payload, target))
        }
      }
    }
    await napLai()
  }

  const handleSubmitAndAdd = async (payload: Omit<VatTuHangHoaRecord, 'id'>) => {
    if (vatTuHangHoaTrungMa(payload.ma)) {
      throw new Error('Mã VTHH đã tồn tại.')
    }
    await vatTuHangHoaPost(payload)
    await napLai()
  }

  const moFormXoa = () => {
    if (!dongChon) return
    setDeleteTarget(dongChon)
  }

  const thucHienXoa = async () => {
    if (!deleteTarget) return
    const idXoa = deleteTarget.id
    const laCha = Boolean(deleteTarget.vt_chinh)
    setDeleteTarget(null)
    try {
      if (laCha) {
        const { deletedIds } = await vatTuHangHoaDeleteWithChildren(idXoa)
        setDongChon((prev) => (prev && deletedIds.includes(prev.id) ? null : prev))
      } else {
        await vatTuHangHoaDelete(idXoa)
        setDanhSach((prev) => prev.filter((r) => r.id !== idXoa))
        setDongChon((prev) => (prev?.id === idXoa ? null : prev))
      }
      await napLai()
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Có lỗi xảy ra.')
    }
  }

  const xuatKhau = () => {
    const ton = tonKhoCuoikyTheoMaVthh()
    const header = [
      'Mã',
      'Tên',
      'Loại VTHH',
      'Nhóm VTHH',
      'ĐVT',
      'VT cấp cha',
      'Giá mua gần',
      'ĐG bán',
      'Thuế GTGT',
      'Kho',
      'Số lượng tồn',
      'GT tồn',
    ]
    const rows = displayData.map((r) => {
      const maU = (r.ma ?? '').trim().toUpperCase()
      const tk = ton.get(maU)
      return [
        r.ma,
        r.ten,
        r.tinh_chat,
        r.nhom_vthh,
        dvtHienThiLabel(r.dvt_chinh, dvtList),
        r.vt_chinh ? 'Có' : '',
        String((r as VatTuHangHoaRecord & { don_gia_mua_gan_nhat_hien_thi?: number }).don_gia_mua_gan_nhat_hien_thi ?? 0),
        String(r.don_gia_ban ?? ''),
        formatThueGtgtBangHienThiTuDanhMuc(r),
        maKhoNgamDinh(r.kho_ngam_dinh ?? '', khoLabelToMa),
        String(tk?.so_luong ?? 0),
        String(tk?.gia_tri ?? 0),
      ]
    })
    exportCsv([header, ...rows], 'Vat_tu_hang_hoa.csv')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: 'var(--bg-secondary)' }}>
      <ListPageToolbar
        onQuayLai={onQuayLai}
        buttons={[
          { icon: <Plus size={14} />, label: 'Thêm', onClick: moThem },
          { icon: <Copy size={14} />, label: 'Nhân bản', onClick: nhanBan, disabled: !dongChon || dangChonDongKhongNhanBan },
          { icon: <Pencil size={14} />, label: 'Sửa', onClick: moSua, disabled: !dongChon },
          { icon: <Trash2 size={14} />, label: 'Xóa', onClick: moFormXoa, disabled: !dongChon },
          { icon: <RefreshCw size={14} />, label: 'Làm mới', onClick: () => napLai(), disabled: dangTai, title: 'Làm mới lại dữ liệu vật tư hàng hóa' },
          { icon: <Upload size={14} />, label: 'Nhập khẩu' },
          { icon: <Download size={14} />, label: 'Xuất khẩu', onClick: xuatKhau },
          { icon: <Printer size={14} />, label: 'In' },
        ]}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            flex: 1,
            minHeight: 280,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <DataGrid<VatTuHangHoaGridRow>
            columns={columns}
            data={displayData}
            keyField="_vthhListRowId"
            height="100%"
            getRowExtraStyle={(row) => {
              if (row._vthhIsMatrixVariant) {
                return {
                  background: 'var(--bg-tab)',
                  boxShadow: 'inset 4px 0 0 var(--connector, #d97706)',
                }
              }
              if (row._vthhIsSyntheticPhu1) {
                return {
                  background: 'var(--bg-tab)',
                  boxShadow: 'inset 4px 0 0 rgba(245, 158, 11, 0.45)',
                }
              }
              if (row._vthhIsVariantChild) {
                return {
                  background: 'var(--bg-tab)',
                  boxShadow: 'inset 4px 0 0 var(--connector, #d97706)',
                }
              }
              if (row._vthhHasChildren) {
                return { background: 'rgba(245, 158, 11, 0.06)' }
              }
              return undefined
            }}
            selectedRowId={vthhGridListRowId ?? (dongChon != null ? `${dongChon.id}::0` : null)}
            onRowSelect={(row) => {
              setVthhGridListRowId(row._vthhListRowId)
              const sourceId = row._vthhSourceRecordId
              const original = danhSach.find((r) => r.id === sourceId) ?? null
              setDongChon(original)
            }}
            onRowDoubleClick={(row) => {
              setVthhGridListRowId(row._vthhListRowId)
              const sourceId = row._vthhSourceRecordId
              const original = danhSach.find((r) => r.id === sourceId) ?? null
              setDongChon(original ?? null)
              setAddPrefill(null)
              setModalOpen('edit')
            }}
            summary={[
              { label: 'Số dòng', value: danhSach.length },
              {
                label: 'Tổng giá trị tồn (TK)',
                value: formatNumberDisplay(
                  displayData.filter((r) => !r._vthhIsMatrixVariant && !r._vthhIsSyntheticPhu1).reduce((s, r) => s + r.gia_tri_ton, 0),
                  0
                ),
              },
            ]}
          />
        </div>

        <div style={{ ...panelChiTiet, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 8, flexShrink: 0, minHeight: 28 }}>
            {detailTabs.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDetailTab(t.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  height: 26,
                  boxSizing: 'border-box',
                  fontSize: 11,
                  fontWeight: activeDetailTab === t.id ? 700 : 600,
                  background: activeDetailTab === t.id ? 'var(--accent)' : 'var(--bg-primary)',
                  color: activeDetailTab === t.id ? 'var(--accent-text)' : 'var(--text-primary)',
                  border: '1px solid ' + (activeDetailTab === t.id ? 'var(--accent)' : 'var(--border-strong)'),
                  borderRadius: 4,
                  cursor: 'pointer',
                  boxShadow: activeDetailTab === t.id ? 'none' : '0 1px 2px rgba(0,0,0,0.06)',
                }}
              >
                {i + 1}. {t.label}
              </button>
            ))}
          </div>
          <div style={{ minHeight: 220, overflow: 'auto', flex: 1 }}>
          {activeDetailTab === 'ngam_dinh' && (
            <div style={{ padding: 10, fontSize: 11 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) minmax(120px, 1fr) minmax(100px, 1fr) minmax(120px, 1fr)', gap: '8px 16px', alignItems: 'center' }}>
                <span style={nhan}>Kho</span>
                <span style={giaTri}>{maKhoNgamDinh(dongChon?.kho_ngam_dinh, khoLabelToMa) || '—'}</span>
                <span style={nhan}>ĐG mua cố định</span>
                <span style={giaTri}>{dongChon?.don_gia_mua_co_dinh != null ? formatNumberDisplay(dongChon.don_gia_mua_co_dinh) : '—'}</span>
                <span style={nhan}>TK kho</span>
                <span style={giaTri}>{dongChon?.tai_khoan_kho ?? '—'}</span>
                <span style={nhan}>Giá mua gần</span>
                <span style={giaTri}>{dongChon ? formatNumberDisplay(displayData.find((x) => x.id === dongChon.id)?.don_gia_mua_gan_nhat_hien_thi ?? giaMuaGanNhatHienThi(dongChon)) : '—'}</span>
                <span style={nhan}>TK doanh thu</span>
                <span style={giaTri}>{dongChon?.tk_doanh_thu ?? '5111'}</span>
                <span style={nhan}>ĐG bán</span>
                <span style={giaTri}>{dongChon?.don_gia_ban != null ? formatNumberDisplay(dongChon.don_gia_ban) : '—'}</span>
                <span style={nhan}>TK chiết khấu</span>
                <span style={giaTri}>{dongChon?.tk_chiet_khau ?? '—'}</span>
                <span style={nhan}>Thuế GTGT (%)</span>
                <span style={giaTri}>{dongChon ? formatThueGtgtBangHienThiTuDanhMuc(dongChon) : '—'}</span>
                <span style={nhan}>TK giảm giá</span>
                <span style={giaTri}>{dongChon?.tk_giam_gia ?? '—'}</span>
                <span style={nhan}>Là hàng khuyến mại</span>
                <span style={giaTri}>{dongChon?.la_hang_khuyen_mai ? 'Có' : 'Không'}</span>
                <span style={nhan}>TK trả lại</span>
                <span style={giaTri}>{dongChon?.tk_tra_lai ?? '—'}</span>
                <span style={nhan}>TK chi phí</span>
                <span style={giaTri}>{dongChon?.tk_chi_phi ?? '—'}</span>
              </div>
              {(dongChon?.cong_thuc_tinh_so_luong ?? '').trim() && (
                <div style={{ ...truongChiTiet, marginTop: 10 }}>
                  <span style={nhan}>Công thức tính số lượng:</span>
                  <span style={{ ...giaTri, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{dongChon?.cong_thuc_tinh_so_luong}</span>
                </div>
              )}
            </div>
          )}
          {activeDetailTab === 'chiet_khau' && dongChon?.bang_chiet_khau && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', background: 'var(--bg-tab)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 36 }} />
                  <col style={{ width: 72 }} />
                  <col style={{ width: 72 }} />
                  <col style={{ width: 72 }} />
                  <col />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 36, textAlign: 'center' }}>STT</th>
                    <th style={{ ...thStyle, width: 72 }}>Số lượng từ</th>
                    <th style={{ ...thStyle, width: 72 }}>Số lượng đến</th>
                    <th style={{ ...thStyle, width: 72 }}>Đơn giá</th>
                    <th style={thStyle}>Mô tả</th>
                  </tr>
                </thead>
                <tbody>
                  {dongChon.bang_chiet_khau.filter((r) => r.so_luong_tu || r.so_luong_den || r.ty_le_chiet_khau).map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{i + 1}</td>
                      <td style={tdStyle}>{r.so_luong_tu || '—'}</td>
                      <td style={tdStyle}>{r.so_luong_den || '—'}</td>
                      <td style={tdStyle}>{r.ty_le_chiet_khau || '—'}</td>
                      <td style={tdStyle}>{r.mo_ta || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeDetailTab === 'don_vi_quy_doi' && dongChon?.don_vi_quy_doi && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflowX: 'auto', background: 'var(--bg-tab)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 36 }} />
                  <col style={{ width: 92 }} />
                  <col style={{ width: 72 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 90 }} />
                  <col />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 36, textAlign: 'center' }}>STT</th>
                    <th style={{ ...thStyle, width: 92 }}>ĐV quy đổi</th>
                    <th style={{ ...thStyle, width: 72, textAlign: 'left' }}>Tỉ lệ</th>
                    <th style={{ ...thStyle, width: 90 }} title="Phép nhân = nhân toán học, Phép chia = chia toán học">Phép tính</th>
                    <th style={{ ...thStyle, width: 90, textAlign: 'right' }}>ĐG mua</th>
                    <th style={{ ...thStyle, width: 90, textAlign: 'right' }}>ĐG bán</th>
                    <th style={thStyle}>Mô tả</th>
                  </tr>
                </thead>
                <tbody>
                  {dongChon.don_vi_quy_doi
                    .filter((r) => (r.dvt ?? '').trim() || (r.ti_le_quy_doi ?? '1') !== '1' || (r.mo_ta ?? '').trim() || (r.gia_ban ?? '').trim() || (r.gia_mua ?? '').trim())
                    .map((r, i) => {
                      const tiLe = parseDecimalFlex(r.ti_le_quy_doi ?? '1')
                      const phepTinh = r.phep_tinh === 'chia' ? 'chia' : r.phep_tinh === 'nhan' ? 'nhan' : null
                      const baseDgMua = giaMuaGanNhatHienThi(dongChon)
                      let calculatedDgMua = baseDgMua
                      if (phepTinh === 'nhan' && tiLe > 0) calculatedDgMua = baseDgMua * tiLe
                      else if (phepTinh === 'chia' && tiLe > 0) calculatedDgMua = baseDgMua / tiLe
                      const hasGiaMuaInput = r.gia_mua != null && String(r.gia_mua).trim() !== ''
                      const dgMuaDisplay = hasGiaMuaInput ? parseFloatVN(String(r.gia_mua)) : calculatedDgMua
                      const baseDgBan = getBaseDgBanForDonViQuyDoiView(dongChon, tiLe)
                      let calculatedDgBan = baseDgBan
                      if (phepTinh === 'nhan' && tiLe > 0) calculatedDgBan = baseDgBan * tiLe
                      else if (phepTinh === 'chia' && tiLe > 0) calculatedDgBan = baseDgBan / tiLe
                      const hasGiaBanInput = r.gia_ban != null && String(r.gia_ban).trim() !== ''
                      const dgBanDisplay = hasGiaBanInput ? parseFloatVN(String(r.gia_ban)) : calculatedDgBan
                      return (
                        <tr key={i}>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>{i + 1}</td>
                          <td style={tdStyle}>{dvtHienThiLabel(r.dvt ?? '', dvtList) || '—'}</td>
                          <td style={tdStyle}>{formatSoTienHienThi(parseDecimalFlex(r.ti_le_quy_doi ?? '1')) || '1'}</td>
                          <td style={tdStyle}>{r.phep_tinh === 'chia' ? 'Phép chia' : 'Phép nhân'}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{dgMuaDisplay > 0 || hasGiaMuaInput ? formatNumberDisplay(dgMuaDisplay) : '—'}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{dgBanDisplay > 0 || hasGiaBanInput ? formatNumberDisplay(dgBanDisplay) : '—'}</td>
                          <td style={tdStyle}>{r.mo_ta || '—'}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
          {activeDetailTab === 'dinh_muc_nvl' && dongChon?.dinh_muc_nvl && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', background: 'var(--bg-tab)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 36 }} />
                  <col style={{ width: 72 }} />
                  <col />
                  <col style={{ width: 56 }} />
                  <col style={{ width: 72 }} />
                  <col style={{ width: 64 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 36, textAlign: 'center' }}>STT</th>
                    <th style={{ ...thStyle, width: 72 }}>Mã NVL</th>
                    <th style={thStyle}>Nguyên vật liệu</th>
                    <th style={{ ...thStyle, width: 56 }}>ĐVT</th>
                    <th style={{ ...thStyle, width: 72 }}>Số lượng</th>
                    <th style={{ ...thStyle, width: 64 }}>Hao hụt (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {dongChon.dinh_muc_nvl.filter((r) => r.ma || r.ten || r.so_luong).map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{i + 1}</td>
                      <td style={tdStyle}>{r.ma || '—'}</td>
                      <td style={tdStyle}>{r.ten || '—'}</td>
                      <td style={tdStyle}>{dvtHienThiLabel(r.dvt ?? '', dvtList) || '—'}</td>
                      <td style={tdStyle}>{r.so_luong || '—'}</td>
                      <td style={tdStyle}>{r.hao_hut || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeDetailTab === 'dac_tinh' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gridTemplateRows: 'auto minmax(120px, 1fr)', gap: '6px 16px', padding: 10, alignItems: 'stretch' }}>
              <div style={{ minWidth: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Đặc tính</label>
              </div>
              <div />
              <div style={{ ...giaTri, whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: 120, padding: 8, background: 'var(--bg-tab)', border: '1px solid var(--border)', borderRadius: 4 }}>
                {(dongChon?.dac_tinh ?? '').trim() || '—'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <div style={vungHinhAnh}>
                    {dongChon?.duong_dan_hinh_anh && !imageLoadError ? (
                      (() => {
                        const src = vatTuHinhAnhUrl(dongChon.duong_dan_hinh_anh)
                        const isDataUrl = dongChon.duong_dan_hinh_anh.startsWith('data:')
                        const sizeBytes = isDataUrl
                          ? Math.floor((dongChon.duong_dan_hinh_anh.length - (dongChon.duong_dan_hinh_anh.indexOf(',') + 1)) * 0.75)
                          : 0
                        return (
                          <img
                            src={src}
                            alt={dongChon.ten ?? 'Hình ảnh VTHH'}
                            title={dongChon.ten ?? undefined}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                            onLoad={(e) => {
                              setImageLoadError(false)
                              const img = e.currentTarget
                              setImageMeta({
                                width: img.naturalWidth,
                                height: img.naturalHeight,
                                sizeMB: isDataUrl ? sizeBytes / (1024 * 1024) : 0,
                              })
                            }}
                            onError={() => setImageLoadError(true)}
                          />
                        )
                      })()
                    ) : null}
                    <span style={{ display: dongChon?.duong_dan_hinh_anh && !imageLoadError ? 'none' : 'block', textAlign: 'center', padding: 8 }}>
                      Hình ảnh
                      <br />
                      <span style={{ fontSize: '9px' }}>{VATTU_IMAGE_BASE}</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10, color: 'var(--text-muted)', minWidth: 0 }}>
                    <div><span style={{ color: 'var(--text-primary)' }}>{dongChon?.duong_dan_hinh_anh ? (dongChon.duong_dan_hinh_anh.startsWith('data:') ? 'Ảnh nhúng (Base64)' : (dongChon.duong_dan_hinh_anh.split(/[/\\]/).pop() ?? '—')) : '—'}</span></div>
                    <div><span style={{ color: 'var(--text-primary)' }}>{imageMeta ? `${imageMeta.width}×${imageMeta.height}` : '—'}</span></div>
                    <div><span style={{ color: 'var(--text-primary)' }}>{imageMeta && imageMeta.sizeMB > 0 ? `${imageMeta.sizeMB.toFixed(2)} MB` : '—'}</span></div>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ color: 'var(--text-primary)', wordBreak: 'break-word', whiteSpace: 'normal', display: 'block' }}>{vatTuHinhAnhPathLabel(dongChon?.duong_dan_hinh_anh)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div style={modalOverlay}>
          <div
            ref={modalBoxRef}
            style={{
              ...modalBox,
              ...(modalPosition != null
                ? { position: 'fixed' as const, left: modalPosition.x, top: modalPosition.y }
                : {}),
            }}
          >
            <VatTuHangHoaForm
              key={modalOpen === 'edit' ? `edit-${dongChon?.id ?? ''}` : `add-${addFormKey}`}
              mode={modalOpen}
              initialData={modalOpen === 'edit' ? dongChon ?? undefined : addPrefill ? { ...addPrefill, id: addPrefill.id ?? 0, so_luong_ton: addPrefill.so_luong_ton ?? 0, gia_tri_ton: addPrefill.gia_tri_ton ?? 0 } as VatTuHangHoaRecord : undefined}
              dvtList={dvtList}
              vatTuList={danhSach}
              onClose={dongModal}
              onSubmit={handleSubmitForm}
              onSubmitAndAdd={handleSubmitAndAdd}
              onMaTuDong={(tinhChat) => vatTuHangHoaMaTuDong(tinhChat)}
              onRefreshDvtList={refreshDvtList}
              onHeaderPointerDown={handleHeaderPointerDown}
              dragging={dragStart != null}
            />
          </div>
        </div>
      )}

      <ConfirmXoaCaptchaModal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={thucHienXoa}
        title={deleteTarget?.vt_chinh ? 'Xóa vật tư cấp cha' : 'Xóa vật tư hàng hóa'}
        message={
          deleteTarget?.vt_chinh ? (
            <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.45 }}>
              <p style={{ margin: '0 0 8px' }}>
                Vật tư &quot;{deleteTarget.ten}&quot; (Mã: {deleteTarget.ma}) là <strong>VT cấp cha</strong>.
                {(() => {
                  const n = danhSach.filter(
                    (r) =>
                      r.id !== deleteTarget.id &&
                      (r.ma_vthh_cap_cha ?? '').trim() === (deleteTarget.ma ?? '').trim(),
                  ).length
                  return n > 0 ? (
                    <>
                      {' '}
                      Có <strong>{n}</strong> mã VTHH cấp con thuộc nhóm này.
                    </>
                  ) : null
                })()}
              </p>
              <p style={{ margin: 0 }}>
                Nếu đồng ý, hệ thống sẽ <strong>xóa luôn toàn bộ vật tư cấp con</strong> trước khi xóa bản ghi cấp cha. Thao tác không hoàn tác.
              </p>
            </div>
          ) : deleteTarget ? (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)' }}>
              Bạn sắp xóa &quot;{deleteTarget.ten}&quot; (Mã: {deleteTarget.ma}). Thao tác không hoàn tác.
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)' }}>Thao tác không hoàn tác.</p>
          )
        }
      />
    </div>
  )
}
