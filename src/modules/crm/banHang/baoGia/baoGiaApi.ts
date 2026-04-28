/**
 * API và types cho Báo giá (header + chi tiết dòng).
 * Mã: {Năm}/BG/{Số} — rule ma-he-thong.mdc
 * 
 * Dữ liệu: JSON bundle `/api/htql-module-bundle/baoGia` (MySQL `htql_module_bundle` hoặc file fallback).
 */

import { htqlSortCopyNewestFirst } from '@/utils/htqlListSortNewestFirst'
import { maFormatHeThong, getCurrentYear } from '../../../../utils/maFormat'
import { allocateMaHeThongFromServer, hintMaxSerialForYearPrefix } from '../../../../utils/htqlSequenceApi'
import { htqlEntityStorage } from '@/utils/htqlEntityStorage'
import {
  htqlModuleBundleGet,
  htqlModuleBundlePut,
  htqlModuleBundlePutKeepalive,
} from '@/utils/htqlModuleBundleApi'
import type {
  BaoGiaAttachmentItem,
  BaoGiaChiTiet,
  BaoGiaCreatePayload,
  BaoGiaDraftLine,
  BaoGiaFilter,
  BaoGiaKyValue,
  BaoGiaRecord,
} from '../../../../types/baoGia'

export type {
  BaoGiaAttachmentItem,
  BaoGiaChiTiet,
  BaoGiaCreatePayload,
  BaoGiaDraftLine,
  BaoGiaFilter,
  BaoGiaKyValue,
  BaoGiaRecord,
} from '../../../../types/baoGia'

/** Alias tương thích — cùng nghĩa với BaoGiaKyValue. */
export type KyValue = BaoGiaKyValue


export const BAO_GIA_MODULE_ID = 'baoGia' as const
export const BAO_GIA_BUNDLE_QUERY_KEY = ['htql-module-bundle', BAO_GIA_MODULE_ID] as const

const BUNDLE_V = 2

const MODULE_PREFIX = 'BG'

/** [YC76] Loại bỏ bản ghi mock/dữ liệu cũ theo mã hệ thống. */
const SO_BAO_GIA_LOAI_BO = new Set(['2026/BG/3', '2026/BG/5'])

function filterBaoGiaLoaiBoTheoMa(
  baoGia: BaoGiaRecord[],
  chiTiet: BaoGiaChiTiet[],
): { baoGia: BaoGiaRecord[]; chiTiet: BaoGiaChiTiet[] } {
  const removedIds = new Set<string>()
  const outBg: BaoGiaRecord[] = []
  for (const d of baoGia) {
    const so = (d.so_bao_gia ?? '').trim()
    if (SO_BAO_GIA_LOAI_BO.has(so)) {
      removedIds.add(d.id)
      continue
    }
    outBg.push(d)
  }
  const outCt = chiTiet.filter((c) => !removedIds.has(c.bao_gia_id))
  return { baoGia: outBg, chiTiet: outCt }
}

function normalizeBaoGia(d: Partial<BaoGiaRecord> & { id: string; de_xuat_id?: string }): BaoGiaRecord {
  const legacyDx = (d as { de_xuat_id?: string }).de_xuat_id
  const doiChieu = d.doi_chieu_don_mua_id ?? legacyDx
  return {
    id: d.id,
    loai_khach_hang: d.loai_khach_hang ?? undefined,
    ten_nguoi_lien_he: d.ten_nguoi_lien_he ?? undefined,
    so_dien_thoai_lien_he: d.so_dien_thoai_lien_he ?? undefined,
    tinh_trang: d.tinh_trang ?? 'Chưa thực hiện',
    ngay_bao_gia: d.ngay_bao_gia ?? '',
    so_bao_gia: d.so_bao_gia ?? '',
    ngay_giao_hang: d.ngay_giao_hang ?? null,
    khach_hang: d.khach_hang ?? '',
    dia_chi: d.dia_chi ?? '',
    dia_chi_nhan_hang: d.dia_chi_nhan_hang,
    nguoi_giao_hang: d.nguoi_giao_hang ?? undefined,
    ma_so_thue: d.ma_so_thue ?? '',
    dien_giai: d.dien_giai ?? '',
    nv_ban_hang: d.nv_ban_hang ?? '',
    dieu_khoan_tt: d.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: d.so_ngay_duoc_no ?? '0',
    dieu_khoan_khac: d.dieu_khoan_khac ?? '',
    tong_tien_hang: typeof d.tong_tien_hang === 'number' ? d.tong_tien_hang : 0,
    tong_thue_gtgt: typeof d.tong_thue_gtgt === 'number' ? d.tong_thue_gtgt : 0,
    tong_thanh_toan: typeof d.tong_thanh_toan === 'number' ? d.tong_thanh_toan : 0,
    ap_dung_vat_gtgt: typeof d.ap_dung_vat_gtgt === 'boolean' ? d.ap_dung_vat_gtgt : undefined,
    tl_ck: typeof d.tl_ck === 'number' ? d.tl_ck : undefined,
    tien_ck: typeof d.tien_ck === 'number' ? d.tien_ck : undefined,
    so_dien_thoai: d.so_dien_thoai ?? undefined,
    so_chung_tu_cukcuk: d.so_chung_tu_cukcuk ?? '',
    doi_chieu_don_mua_id: doiChieu ?? undefined,
    attachments: Array.isArray((d as { attachments?: BaoGiaAttachmentItem[] }).attachments)
      ? (d as { attachments: BaoGiaAttachmentItem[] }).attachments
      : undefined,
    hinh_thuc: d.hinh_thuc,
    dia_chi_cong_trinh: d.dia_chi_cong_trinh,
    chung_tu_mua_loai_chung_tu: d.chung_tu_mua_loai_chung_tu,
    chung_tu_mua_chua_thanh_toan: d.chung_tu_mua_chua_thanh_toan,
    chung_tu_mua_thanh_toan_ngay: d.chung_tu_mua_thanh_toan_ngay,
    chung_tu_mua_pttt: d.chung_tu_mua_pttt,
    chung_tu_mua_ck: d.chung_tu_mua_ck,
    chung_tu_mua_loai_hd: d.chung_tu_mua_loai_hd,
    chung_tu_mua_so_hoa_don: d.chung_tu_mua_so_hoa_don,
    hoa_don_ngay: d.hoa_don_ngay,
    hoa_don_ky_hieu: d.hoa_don_ky_hieu,
    mau_hoa_don_ma: d.mau_hoa_don_ma,
    mau_hoa_don_ten: d.mau_hoa_don_ten,
    phieu_chi_nha_cung_cap: d.phieu_chi_nha_cung_cap,
    phieu_chi_dia_chi: d.phieu_chi_dia_chi,
    phieu_chi_nguoi_nhan_tien: d.phieu_chi_nguoi_nhan_tien,
    phieu_chi_ly_do: d.phieu_chi_ly_do,
    phieu_chi_ngay: d.phieu_chi_ngay,
    phieu_chi_tai_khoan_chi: d.phieu_chi_tai_khoan_chi,
    phieu_chi_ngan_hang_chi: d.phieu_chi_ngan_hang_chi,
    phieu_chi_ten_nguoi_gui: d.phieu_chi_ten_nguoi_gui,
    phieu_chi_tai_khoan_nhan: d.phieu_chi_tai_khoan_nhan,
    phieu_chi_ngan_hang_nhan: d.phieu_chi_ngan_hang_nhan,
    phieu_chi_ten_chu_tk_nhan: d.phieu_chi_ten_chu_tk_nhan,
    phieu_chi_ngan_hang: d.phieu_chi_ngan_hang,
    phieu_chi_ten_nguoi_nhan_ck: d.phieu_chi_ten_nguoi_nhan_ck,
    phieu_chi_attachments: Array.isArray(d.phieu_chi_attachments) ? d.phieu_chi_attachments : undefined,
  }
}

let _baoGiaList: BaoGiaRecord[] = []
let _chiTietList: BaoGiaChiTiet[] = []
let _baoGiaDraft: BaoGiaDraftLine[] | null = null

let persistTimer: ReturnType<typeof setTimeout> | null = null
let persistInFlight = false
/** Nháp (draft) đồng bộ nhanh hơn để cúp điện / tắt đột ngột ít mất hơn — Lưu chứng từ vẫn dùng `baoGiaPersistBundleNow` (không debounce). */
const PERSIST_DEBOUNCE_MS = 180

/** Phiên bản bundle server sau lần PUT thành công gần nhất — tránh GET cũ ghi đè RAM. */
let _lastPersistedServerVersion = 0

let pagehideFlushRegistered = false
function flushPendingPersistSyncFireAndForget(): void {
  if (!persistTimer && !persistInFlight) return
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  try {
    htqlModuleBundlePutKeepalive(BAO_GIA_MODULE_ID, buildBaoGiaBundleForPersist())
  } catch {
    /* ignore */
  }
}

function ensureBaoGiaBundleLifecycleFlush(): void {
  if (typeof window === 'undefined' || pagehideFlushRegistered) return
  pagehideFlushRegistered = true
  window.addEventListener('pagehide', flushPendingPersistSyncFireAndForget)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPendingPersistSyncFireAndForget()
  })
}

function buildBaoGiaBundleForPersist(): Record<string, unknown> {
  return {
    _v: BUNDLE_V,
    baoGia: _baoGiaList,
    chiTiet: _chiTietList,
    draft: _baoGiaDraft,
  }
}

/** Chỉ chặn merge bundle từ server khi đang PUT — không chặn khi chỉ còn debounce (tránh máy khác không thấy dữ liệu). */
function baoGiaIsBundleWriteInFlight(): boolean {
  return persistInFlight
}

/**
 * Ghi bundle lên server một lần (chuỗi tuần tự nếu gọi dồn).
 * Lỗi mạng/CSDL **bubbling** — `baoGiaPersistBundleNow` / Lưu form phải báo lỗi, không được giả thành công.
 */
function runPersistBaoGiaBundleOp(): Promise<void> {
  persistInFlight = true
  return htqlModuleBundlePut(BAO_GIA_MODULE_ID, buildBaoGiaBundleForPersist())
    .then(({ version }) => {
      _lastPersistedServerVersion = Math.max(_lastPersistedServerVersion, version)
    })
    .finally(() => {
      persistInFlight = false
    })
    .then(() => undefined)
}

/**
 * Ghi ngay bundle báo giá lên `/api/htql-module-bundle/baoGia` (hủy debounce đang chờ).
 * Dùng sau Lưu / Sửa / Xóa để F5 không mất dữ liệu vì PUT chưa kịp chạy.
 */
export async function baoGiaPersistBundleNow(): Promise<void> {
  ensureBaoGiaBundleLifecycleFlush()
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  await runPersistBaoGiaBundleOp()
}

function schedulePersistBaoGiaBundle(): void {
  ensureBaoGiaBundleLifecycleFlush()
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    void runPersistBaoGiaBundleOp().catch(() => {
      /* autosave nháp — có thể offline; Lưu chứng từ dùng baoGiaPersistBundleNow và vẫn throw */
    })
  }, PERSIST_DEBOUNCE_MS)
}

function applyBaoGiaBundlePayload(bundle: unknown | null): void {
  /** Null/invalid bundle: empty lists (không khôi phục bản ghi MOCK). */
  if (!bundle || typeof bundle !== 'object') {
    _baoGiaList = []
    _chiTietList = []
    _baoGiaDraft = null
    return
  }
  const o = bundle as { baoGia?: unknown; chiTiet?: unknown; draft?: unknown }
  const baoGiaRaw = o.baoGia
  const chiTietRaw = o.chiTiet
  if (!Array.isArray(baoGiaRaw) || !Array.isArray(chiTietRaw)) {
    _baoGiaList = []
    _chiTietList = []
    _baoGiaDraft = null
    return
  }
  const normalized = (baoGiaRaw as (Partial<BaoGiaRecord> & { id: string })[]).map((d) => normalizeBaoGia(d))
  const filtered = filterBaoGiaLoaiBoTheoMa(normalized, chiTietRaw as BaoGiaChiTiet[])
  _baoGiaList = filtered.baoGia
  _chiTietList = filtered.chiTiet
  if (o.draft == null) _baoGiaDraft = null
  else if (Array.isArray(o.draft)) _baoGiaDraft = o.draft as BaoGiaDraftLine[]
  else _baoGiaDraft = null
}

export async function baoGiaFetchBundleAndApply(): Promise<number> {
  try {
    const { bundle, version, notModified } = await htqlModuleBundleGet(BAO_GIA_MODULE_ID)
    if (notModified) return version
    if (!baoGiaIsBundleWriteInFlight()) {
      /** Tránh đọc trễ (GET trước commit / cache) làm mất bản ghi vừa ghi. */
      if (version < _lastPersistedServerVersion) {
        return version
      }
      const holdDraft = persistTimer != null
      const savedDraft = holdDraft ? _baoGiaDraft : null
      applyBaoGiaBundlePayload(bundle)
      if (holdDraft) {
        _baoGiaDraft = savedDraft
      }
      _lastPersistedServerVersion = Math.max(_lastPersistedServerVersion, version)
    }
    return version
  } catch {
    if (!baoGiaIsBundleWriteInFlight() && _baoGiaList.length === 0) {
      applyBaoGiaBundlePayload(null)
      _lastPersistedServerVersion = 0
    }
    return 0
  }
}

export function baoGiaReloadFromStorage(): void {
  void baoGiaFetchBundleAndApply()
}

export function getBaoGiaDraft(): BaoGiaDraftLine[] | null {
  return _baoGiaDraft
}

export function setBaoGiaDraft(lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>): void {
  const toSave = lines.map((l) => {
    const { _vthh: _drop, ...rest } = l
    return rest
  })
  _baoGiaDraft = toSave as BaoGiaDraftLine[]
  schedulePersistBaoGiaBundle()
}

export function clearBaoGiaDraft(): void {
  _baoGiaDraft = null
  schedulePersistBaoGiaBundle()
}

export function getDateRangeForKy(ky: string): { tu: string; den: string } {
  if (ky === 'tat-ca') return { tu: '', den: '' }
  const now = new Date()
  const den = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let tu: Date
  switch (ky) {
    case 'tuan-nay': {
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1
      tu = new Date(den)
      tu.setDate(tu.getDate() - diff)
      break
    }
    case 'thang-nay':
      tu = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'quy-nay': {
      const q = Math.floor(now.getMonth() / 3) + 1
      tu = new Date(now.getFullYear(), (q - 1) * 3, 1)
      break
    }
    case 'nam-nay':
      tu = new Date(now.getFullYear(), 0, 1)
      break
    default:
      // Đầu tháng đến hiện tại
      tu = new Date(now.getFullYear(), now.getMonth(), 1)
  }
  return {
    tu: formatLocalDate(tu),
    den: formatLocalDate(den),
  }
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export const KY_OPTIONS = [
  { value: 'tat-ca', label: 'Tất cả' },
  { value: 'tuan-nay', label: 'Tuần này' },
  { value: 'thang-nay', label: 'Tháng này' },
  { value: 'quy-nay', label: 'Quý này' },
  { value: 'nam-nay', label: 'Năm nay' },
] as const

export function baoGiaGetAll(filter: BaoGiaFilter): BaoGiaRecord[] {
  const { tu, den } = filter
  const rows =
    !tu || !den
      ? [..._baoGiaList]
      : _baoGiaList.filter((d) => {
          const ngay = (d.ngay_bao_gia ?? '').trim()
          /** Thiếu ngày — vẫn hiện trong kỳ (sau Lưu / đổi lọc «reset» không bị «mất» dòng). */
          if (!ngay) return true
          return ngay >= tu && ngay <= den
        })
  return htqlSortCopyNewestFirst(rows)
}

export function baoGiaGetChiTiet(baoGiaId: string): BaoGiaChiTiet[] {
  return _chiTietList.filter((c) => c.bao_gia_id === baoGiaId)
}

/** [YC30] Trạng thái báo giá - 5 options mới */
export const TINH_TRANG_BAO_GIA = [
  'Mới tạo',
  'Đã gửi KH',
  'Đã chuyển ĐHB',
  'Đã chuyển HĐ',
  'KH không đồng ý',
] as const

export const TINH_TRANG_BAO_GIA_DA_GUI_KHACH = 'Đã gửi KH'
export const TINH_TRANG_NVTHH_DA_NHAP_KHO = 'Đã nhập kho'
export const TINH_TRANG_BG_DA_CHUYEN_DHB = 'Đã chuyển ĐHB'
export const TINH_TRANG_BG_DA_CHUYEN_HD = 'Đã chuyển HĐ'
export const TINH_TRANG_BG_KH_KHONG_DONG_Y = 'KH không đồng ý'
export const TINH_TRANG_BG_MOI_TAO = 'Mới tạo'

/** Khóa chỉnh sửa form khi đã tạo giao dịch / KH không đồng ý (YC 50). */
export function baoGiaBiKhoaChinhSuaTheoTinhTrang(tinh_trang: string): boolean {
  const t = (tinh_trang ?? '').trim()
  return t === TINH_TRANG_BG_DA_CHUYEN_DHB || t === TINH_TRANG_BG_DA_CHUYEN_HD || t === TINH_TRANG_BG_KH_KHONG_DONG_Y
}

/** Cập nhật tình trạng (và tùy chọn ghi chú) từ menu Tạo giao dịch — giữ nguyên chi tiết. */
export function baoGiaCapNhatTuMenuTaoGd(
  baoGiaId: string,
  patch: { tinh_trang: string; dien_giai?: string },
): void {
  const row = _baoGiaList.find((d) => d.id === baoGiaId)
  if (!row) return
  const ct = baoGiaGetChiTiet(baoGiaId)
  const base = baoGiaBuildCreatePayloadFromRecord(row, ct)
  void baoGiaPut(baoGiaId, {
    ...base,
    tinh_trang: patch.tinh_trang,
    dien_giai: patch.dien_giai !== undefined ? patch.dien_giai : base.dien_giai,
  }).catch(() => {
    /* đồng bộ nền từ menu — không throw lên UI */
  })
}

/** Đồng bộ UI danh sách báo giá khi hoàn tác trạng thái từ module khác (vd. xóa HĐ bán). */
export const HTQL_BAO_GIA_RELOAD_EVENT = 'htql-bao-gia-reload'

/**
 * Sau khi xóa ĐHB: nếu không còn đơn hàng bán nào có `bao_gia_id` trùng, hoàn tác báo giá
 * từ «Đã chuyển ĐHB» → «Mới tạo» (YC51).
 */
export function baoGiaHoanTacKhiHetLienKetDonHangBan(
  baoGiaId: string | null | undefined,
  cacDonHangBanConLai: { bao_gia_id?: string }[],
): void {
  const id = (baoGiaId ?? '').trim()
  if (!id) return
  const still = cacDonHangBanConLai.some((d) => (d.bao_gia_id ?? '').trim() === id)
  if (still) return
  const row = _baoGiaList.find((r) => r.id === id)
  if (!row) return
  if ((row.tinh_trang ?? '').trim() !== TINH_TRANG_BG_DA_CHUYEN_DHB) return
  baoGiaCapNhatTuMenuTaoGd(id, { tinh_trang: TINH_TRANG_BG_MOI_TAO })
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HTQL_BAO_GIA_RELOAD_EVENT))
  }
}

/**
 * Sau khi xóa HĐ bán: nếu không còn hợp đồng nào có `bao_gia_id` trùng, hoàn tác báo giá
 * từ «Đã chuyển HĐ» → «Mới tạo» (YC51).
 */
const LS_HDB_CT_LIST = 'htql_hop_dong_ban_chung_tu_list'
const LS_PLHDB_CT_LIST = 'htql_phu_luc_hop_dong_ban_chung_tu_list'

function conBanGhiLienKetBaoGiaTrongHdbVaPhuLucCt(baoGiaId: string): boolean {
  const id = baoGiaId.trim()
  if (!id || typeof htqlEntityStorage === 'undefined') return false
  for (const key of [LS_HDB_CT_LIST, LS_PLHDB_CT_LIST]) {
    try {
      const raw = htqlEntityStorage.getItem(key)
      if (!raw) continue
      const arr = JSON.parse(raw) as { bao_gia_id?: string }[]
      if (Array.isArray(arr) && arr.some((d) => (d.bao_gia_id ?? '').trim() === id)) return true
    } catch {
      /* ignore */
    }
  }
  return false
}

export function baoGiaHoanTacKhiHetLienKetHopDongBan(
  baoGiaId: string | null | undefined,
  _cacHopDongConLai?: { bao_gia_id?: string }[],
): void {
  const id = (baoGiaId ?? '').trim()
  if (!id) return
  if (conBanGhiLienKetBaoGiaTrongHdbVaPhuLucCt(id)) return
  const row = _baoGiaList.find((r) => r.id === id)
  if (!row) return
  if ((row.tinh_trang ?? '').trim() !== TINH_TRANG_BG_DA_CHUYEN_HD) return
  baoGiaCapNhatTuMenuTaoGd(id, { tinh_trang: TINH_TRANG_BG_MOI_TAO })
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HTQL_BAO_GIA_RELOAD_EVENT))
  }
}

/** Ghép payload PUT từ bản ghi + chi tiết (dùng modal hủy/phục hồi và đồng bộ tình trạng). */
export function baoGiaBuildCreatePayloadFromRecord(row: BaoGiaRecord, ct: BaoGiaChiTiet[]): BaoGiaCreatePayload {
  return {
    loai_khach_hang: row.loai_khach_hang,
    ten_nguoi_lien_he: row.ten_nguoi_lien_he,
    so_dien_thoai_lien_he: row.so_dien_thoai_lien_he,
    tinh_trang: row.tinh_trang,
    ngay_bao_gia: row.ngay_bao_gia,
    so_bao_gia: row.so_bao_gia,
    ngay_giao_hang: row.ngay_giao_hang,
    khach_hang: row.khach_hang,
    dia_chi: row.dia_chi ?? '',
    dia_chi_nhan_hang: row.dia_chi_nhan_hang,
    nguoi_giao_hang: row.nguoi_giao_hang,
    ma_so_thue: row.ma_so_thue ?? '',
    dien_giai: row.dien_giai ?? '',
    nv_ban_hang: row.nv_ban_hang ?? '',
    dieu_khoan_tt: row.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: row.so_ngay_duoc_no ?? '0',
    dieu_khoan_khac: row.dieu_khoan_khac ?? '',
    tong_tien_hang: row.tong_tien_hang,
    tong_thue_gtgt: row.tong_thue_gtgt,
    tong_thanh_toan: row.tong_thanh_toan,
    ap_dung_vat_gtgt: row.ap_dung_vat_gtgt,
    tl_ck: row.tl_ck,
    tien_ck: row.tien_ck,
    so_dien_thoai: row.so_dien_thoai,
    so_chung_tu_cukcuk: row.so_chung_tu_cukcuk ?? '',
    doi_chieu_don_mua_id: row.doi_chieu_don_mua_id,
    attachments: row.attachments?.length ? row.attachments.map((a) => ({ ...a })) : undefined,
    hinh_thuc: row.hinh_thuc,
    dia_chi_cong_trinh: row.dia_chi_cong_trinh,
    chung_tu_mua_loai_chung_tu: row.chung_tu_mua_loai_chung_tu,
    chung_tu_mua_chua_thanh_toan: row.chung_tu_mua_chua_thanh_toan,
    chung_tu_mua_thanh_toan_ngay: row.chung_tu_mua_thanh_toan_ngay,
    chung_tu_mua_pttt: row.chung_tu_mua_pttt,
    chung_tu_mua_ck: row.chung_tu_mua_ck,
    chung_tu_mua_loai_hd: row.chung_tu_mua_loai_hd,
    chung_tu_mua_so_hoa_don: row.chung_tu_mua_so_hoa_don,
    hoa_don_ngay: row.hoa_don_ngay,
    hoa_don_ky_hieu: row.hoa_don_ky_hieu,
    mau_hoa_don_ma: row.mau_hoa_don_ma,
    mau_hoa_don_ten: row.mau_hoa_don_ten,
    phieu_chi_nha_cung_cap: row.phieu_chi_nha_cung_cap,
    phieu_chi_dia_chi: row.phieu_chi_dia_chi,
    phieu_chi_nguoi_nhan_tien: row.phieu_chi_nguoi_nhan_tien,
    phieu_chi_ly_do: row.phieu_chi_ly_do,
    phieu_chi_ngay: row.phieu_chi_ngay,
    phieu_chi_tai_khoan_chi: row.phieu_chi_tai_khoan_chi,
    phieu_chi_ngan_hang_chi: row.phieu_chi_ngan_hang_chi,
    phieu_chi_ten_nguoi_gui: row.phieu_chi_ten_nguoi_gui,
    phieu_chi_tai_khoan_nhan: row.phieu_chi_tai_khoan_nhan,
    phieu_chi_ngan_hang_nhan: row.phieu_chi_ngan_hang_nhan,
    phieu_chi_ten_chu_tk_nhan: row.phieu_chi_ten_chu_tk_nhan,
    phieu_chi_ngan_hang: row.phieu_chi_ngan_hang_nhan ?? row.phieu_chi_ngan_hang,
    phieu_chi_ten_nguoi_nhan_ck: row.phieu_chi_ten_chu_tk_nhan ?? row.phieu_chi_ten_nguoi_nhan_ck,
    phieu_chi_attachments: row.phieu_chi_attachments?.length ? row.phieu_chi_attachments.map((a) => ({ ...a })) : undefined,
    chiTiet: ct.map((c) => ({
      ma_hang: c.ma_hang,
      ten_hang: c.ten_hang,
      dvt: c.dvt,
      so_luong: c.so_luong,
      don_gia: c.don_gia,
      thanh_tien: c.thanh_tien,
      pt_thue_gtgt: c.pt_thue_gtgt,
      tien_thue_gtgt: c.tien_thue_gtgt,
      noi_dung: c.noi_dung ?? '',
      ghi_chu: c.ghi_chu ?? '',
      chieu_dai: c.chieu_dai,
      chieu_rong: c.chieu_rong,
      luong: c.luong,
      dcnh_index: c.dcnh_index ?? 0,
    })),
  }
}

/** Cập nhật tình trạng báo giá (giữ nguyên chi tiết và các trường khác). */
export function baoGiaSetTinhTrang(baoGiaId: string, tinh_trang: string): void {
  const row = _baoGiaList.find((d) => d.id === baoGiaId)
  if (!row) return
  const ct = baoGiaGetChiTiet(baoGiaId)
  void baoGiaPut(baoGiaId, { ...baoGiaBuildCreatePayloadFromRecord(row, ct), tinh_trang }).catch(() => {
    /* đồng bộ nền */
  })
}

/** Xóa báo giá và toàn bộ chi tiết của báo giá. */
export async function baoGiaDelete(baoGiaId: string): Promise<void> {
  _baoGiaList = _baoGiaList.filter((d) => d.id !== baoGiaId)
  _chiTietList = _chiTietList.filter((c) => c.bao_gia_id !== baoGiaId)
  await baoGiaPersistBundleNow()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HTQL_BAO_GIA_RELOAD_EVENT))
  }
}

/** Tạo báo giá mới (thêm vào danh sách nội bộ). Trả về bản ghi báo giá vừa tạo. */
export async function baoGiaPost(payload: BaoGiaCreatePayload): Promise<BaoGiaRecord> {
  const year = getCurrentYear()
  const hint = hintMaxSerialForYearPrefix(year, MODULE_PREFIX, _baoGiaList.map((d) => d.so_bao_gia))
  const soBaoGia = await allocateMaHeThongFromServer({
    seqKey: 'BG',
    modulePrefix: MODULE_PREFIX,
    hintMaxSerial: hint,
    year,
  })
  const id = `bg${Date.now()}`
  const baoGiaRow: BaoGiaRecord = {
    id,
    loai_khach_hang: payload.loai_khach_hang,
    ten_nguoi_lien_he: payload.ten_nguoi_lien_he,
    so_dien_thoai_lien_he: payload.so_dien_thoai_lien_he,
    tinh_trang: payload.tinh_trang,
    ngay_bao_gia: payload.ngay_bao_gia,
    so_bao_gia: soBaoGia,
    ngay_giao_hang: payload.ngay_giao_hang,
    khach_hang: payload.khach_hang,
    dia_chi: payload.dia_chi ?? '',
    dia_chi_nhan_hang: payload.dia_chi_nhan_hang,
    nguoi_giao_hang: payload.nguoi_giao_hang ?? undefined,
    ma_so_thue: payload.ma_so_thue ?? '',
    dien_giai: payload.dien_giai ?? '',
    nv_ban_hang: payload.nv_ban_hang ?? '',
    dieu_khoan_tt: payload.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: payload.so_ngay_duoc_no ?? '0',
    dieu_khoan_khac: payload.dieu_khoan_khac ?? '',
    tong_tien_hang: payload.tong_tien_hang,
    tong_thue_gtgt: payload.tong_thue_gtgt,
    tong_thanh_toan: payload.tong_thanh_toan,
    ap_dung_vat_gtgt: payload.ap_dung_vat_gtgt,
    tl_ck: payload.tl_ck,
    tien_ck: payload.tien_ck,
    so_dien_thoai: payload.so_dien_thoai,
    so_chung_tu_cukcuk: payload.so_chung_tu_cukcuk ?? '',
    doi_chieu_don_mua_id: payload.doi_chieu_don_mua_id ?? undefined,
    attachments: payload.attachments ? [...payload.attachments] : undefined,
    hinh_thuc: payload.hinh_thuc,
    dia_chi_cong_trinh: payload.dia_chi_cong_trinh,
    chung_tu_mua_loai_chung_tu: payload.chung_tu_mua_loai_chung_tu,
    chung_tu_mua_chua_thanh_toan: payload.chung_tu_mua_chua_thanh_toan,
    chung_tu_mua_thanh_toan_ngay: payload.chung_tu_mua_thanh_toan_ngay,
    chung_tu_mua_pttt: payload.chung_tu_mua_pttt,
    chung_tu_mua_ck: payload.chung_tu_mua_ck,
    chung_tu_mua_loai_hd: payload.chung_tu_mua_loai_hd,
    chung_tu_mua_so_hoa_don: payload.chung_tu_mua_so_hoa_don,
    hoa_don_ngay: payload.hoa_don_ngay,
    hoa_don_ky_hieu: payload.hoa_don_ky_hieu,
    mau_hoa_don_ma: payload.mau_hoa_don_ma,
    mau_hoa_don_ten: payload.mau_hoa_don_ten,
    phieu_chi_nha_cung_cap: payload.phieu_chi_nha_cung_cap,
    phieu_chi_dia_chi: payload.phieu_chi_dia_chi,
    phieu_chi_nguoi_nhan_tien: payload.phieu_chi_nguoi_nhan_tien,
    phieu_chi_ly_do: payload.phieu_chi_ly_do,
    phieu_chi_ngay: payload.phieu_chi_ngay,
    phieu_chi_tai_khoan_chi: payload.phieu_chi_tai_khoan_chi,
    phieu_chi_ngan_hang_chi: payload.phieu_chi_ngan_hang_chi,
    phieu_chi_ten_nguoi_gui: payload.phieu_chi_ten_nguoi_gui,
    phieu_chi_tai_khoan_nhan: payload.phieu_chi_tai_khoan_nhan,
    phieu_chi_ngan_hang_nhan: payload.phieu_chi_ngan_hang_nhan,
    phieu_chi_ten_chu_tk_nhan: payload.phieu_chi_ten_chu_tk_nhan,
    phieu_chi_ngan_hang: payload.phieu_chi_ngan_hang,
    phieu_chi_ten_nguoi_nhan_ck: payload.phieu_chi_ten_nguoi_nhan_ck,
    phieu_chi_attachments: payload.phieu_chi_attachments ? [...payload.phieu_chi_attachments] : undefined,
  }
  _baoGiaList.push(baoGiaRow)
  payload.chiTiet.forEach((c, i) => {
    _chiTietList.push({
      id: `ct${id}-${i}`,
      bao_gia_id: id,
      ma_hang: c.ma_hang,
      ten_hang: c.ten_hang,
      ma_quy_cach: (c.ma_quy_cach ?? c.ma_hang ?? '').trim(),
      dvt: c.dvt,
      chieu_dai: c.chieu_dai ?? 0,
      chieu_rong: c.chieu_rong ?? 0,
      chieu_cao: 0,
      ban_kinh: 0,
      luong: c.luong ?? 0,
      so_luong: c.so_luong,
      so_luong_nhan: 0,
      don_gia: c.don_gia,
      thanh_tien: c.thanh_tien,
      pt_thue_gtgt: c.pt_thue_gtgt,
      tien_thue_gtgt: c.tien_thue_gtgt,
      lenh_san_xuat: '',
      noi_dung: c.noi_dung ?? '',
      ghi_chu: c.ghi_chu ?? '',
      dcnh_index: typeof c.dcnh_index === 'number' ? c.dcnh_index : 0,
    })
  })
  await baoGiaPersistBundleNow()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HTQL_BAO_GIA_RELOAD_EVENT))
  }
  return baoGiaRow
}

/** Cập nhật báo giá (xóa chi tiết cũ, ghi lại theo payload). */
export async function baoGiaPut(baoGiaId: string, payload: BaoGiaCreatePayload): Promise<void> {
  const idx = _baoGiaList.findIndex((d) => d.id === baoGiaId)
  if (idx < 0) return
  _baoGiaList[idx] = {
    id: baoGiaId,
    loai_khach_hang: payload.loai_khach_hang,
    ten_nguoi_lien_he: payload.ten_nguoi_lien_he,
    so_dien_thoai_lien_he: payload.so_dien_thoai_lien_he,
    tinh_trang: payload.tinh_trang,
    ngay_bao_gia: payload.ngay_bao_gia,
    so_bao_gia: payload.so_bao_gia,
    ngay_giao_hang: payload.ngay_giao_hang,
    khach_hang: payload.khach_hang,
    dia_chi: payload.dia_chi ?? '',
    dia_chi_nhan_hang: payload.dia_chi_nhan_hang,
    nguoi_giao_hang: payload.nguoi_giao_hang ?? undefined,
    ma_so_thue: payload.ma_so_thue ?? '',
    dien_giai: payload.dien_giai ?? '',
    nv_ban_hang: payload.nv_ban_hang ?? '',
    dieu_khoan_tt: payload.dieu_khoan_tt ?? '',
    so_ngay_duoc_no: payload.so_ngay_duoc_no ?? '0',
    dieu_khoan_khac: payload.dieu_khoan_khac ?? '',
    tong_tien_hang: payload.tong_tien_hang,
    tong_thue_gtgt: payload.tong_thue_gtgt,
    tong_thanh_toan: payload.tong_thanh_toan,
    ap_dung_vat_gtgt: payload.ap_dung_vat_gtgt,
    tl_ck: payload.tl_ck,
    tien_ck: payload.tien_ck,
    so_dien_thoai: payload.so_dien_thoai,
    so_chung_tu_cukcuk: payload.so_chung_tu_cukcuk ?? '',
    doi_chieu_don_mua_id: payload.doi_chieu_don_mua_id ?? undefined,
    attachments: payload.attachments ? [...payload.attachments] : undefined,
    hinh_thuc: payload.hinh_thuc,
    dia_chi_cong_trinh: payload.dia_chi_cong_trinh,
    chung_tu_mua_loai_chung_tu: payload.chung_tu_mua_loai_chung_tu,
    chung_tu_mua_chua_thanh_toan: payload.chung_tu_mua_chua_thanh_toan,
    chung_tu_mua_thanh_toan_ngay: payload.chung_tu_mua_thanh_toan_ngay,
    chung_tu_mua_pttt: payload.chung_tu_mua_pttt,
    chung_tu_mua_ck: payload.chung_tu_mua_ck,
    chung_tu_mua_loai_hd: payload.chung_tu_mua_loai_hd,
    chung_tu_mua_so_hoa_don: payload.chung_tu_mua_so_hoa_don,
    hoa_don_ngay: payload.hoa_don_ngay,
    hoa_don_ky_hieu: payload.hoa_don_ky_hieu,
    mau_hoa_don_ma: payload.mau_hoa_don_ma,
    mau_hoa_don_ten: payload.mau_hoa_don_ten,
    phieu_chi_nha_cung_cap: payload.phieu_chi_nha_cung_cap,
    phieu_chi_dia_chi: payload.phieu_chi_dia_chi,
    phieu_chi_nguoi_nhan_tien: payload.phieu_chi_nguoi_nhan_tien,
    phieu_chi_ly_do: payload.phieu_chi_ly_do,
    phieu_chi_ngay: payload.phieu_chi_ngay,
    phieu_chi_tai_khoan_chi: payload.phieu_chi_tai_khoan_chi,
    phieu_chi_ngan_hang_chi: payload.phieu_chi_ngan_hang_chi,
    phieu_chi_ten_nguoi_gui: payload.phieu_chi_ten_nguoi_gui,
    phieu_chi_tai_khoan_nhan: payload.phieu_chi_tai_khoan_nhan,
    phieu_chi_ngan_hang_nhan: payload.phieu_chi_ngan_hang_nhan,
    phieu_chi_ten_chu_tk_nhan: payload.phieu_chi_ten_chu_tk_nhan,
    phieu_chi_ngan_hang: payload.phieu_chi_ngan_hang,
    phieu_chi_ten_nguoi_nhan_ck: payload.phieu_chi_ten_nguoi_nhan_ck,
    phieu_chi_attachments: payload.phieu_chi_attachments ? [...payload.phieu_chi_attachments] : undefined,
  }
  _chiTietList = _chiTietList.filter((c) => c.bao_gia_id !== baoGiaId)
  payload.chiTiet.forEach((c, i) => {
    _chiTietList.push({
      id: `ct${baoGiaId}-${i}`,
      bao_gia_id: baoGiaId,
      ma_hang: c.ma_hang,
      ten_hang: c.ten_hang,
      ma_quy_cach: (c.ma_quy_cach ?? c.ma_hang ?? '').trim(),
      dvt: c.dvt,
      chieu_dai: c.chieu_dai ?? 0,
      chieu_rong: c.chieu_rong ?? 0,
      chieu_cao: 0,
      ban_kinh: 0,
      luong: c.luong ?? 0,
      so_luong: c.so_luong,
      so_luong_nhan: 0,
      don_gia: c.don_gia,
      thanh_tien: c.thanh_tien,
      pt_thue_gtgt: c.pt_thue_gtgt,
      tien_thue_gtgt: c.tien_thue_gtgt,
      lenh_san_xuat: '',
      noi_dung: c.noi_dung ?? '',
      ghi_chu: c.ghi_chu ?? '',
      dcnh_index: typeof c.dcnh_index === 'number' ? c.dcnh_index : 0,
    })
  })
  await baoGiaPersistBundleNow()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HTQL_BAO_GIA_RELOAD_EVENT))
  }
}

/** Báo giá có thể chọn khi lập ĐHB/HĐ bán từ form (loại trừ đã chuyển ĐHB/HĐ, KH không đồng ý). */
export function baoGiaListChoLapDonHangBanTuBang(filter: BaoGiaFilter): BaoGiaRecord[] {
  return baoGiaGetAll(filter).filter((bg) => {
    const t = (bg.tinh_trang ?? '').trim()
    return (
      t !== TINH_TRANG_BG_DA_CHUYEN_DHB &&
      t !== TINH_TRANG_BG_DA_CHUYEN_HD &&
      t !== TINH_TRANG_BG_KH_KHONG_DONG_Y
    )
  })
}

export function getDefaultBaoGiaFilter(): BaoGiaFilter {
  const ky = 'thang-nay' as KyValue
  const { tu, den } = getDateRangeForKy(ky)
  return { ky, tu, den }
}

/** Trả về số báo giá tiếp theo (2026/BG/1, 2026/BG/2...) — reset mỗi năm. */
export function baoGiaSoDonHangTiepTheo(): string {
  const year = getCurrentYear()
  let maxSo = 0
  for (const d of _baoGiaList) {
    const s = (d.so_bao_gia || '').trim()
    const match = s.match(new RegExp(`^${year}/${MODULE_PREFIX}/(\\d+)$`))
    if (!match) continue
    const n = parseInt(match[1], 10)
    if (n > maxSo) maxSo = n
  }
  return maFormatHeThong(MODULE_PREFIX, maxSo + 1)
}
