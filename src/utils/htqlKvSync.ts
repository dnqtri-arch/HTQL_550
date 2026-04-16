/**
 * Sync entity keys (htql* trong htqlEntityStorage, RAM) với /api/htql-kv (MySQL hoặc file JSON).
 * Call after initHtqlApiBase(); failures do not block render.
 *
 * Đa máy trạm: poll định kỳ kéo KV từ máy chủ (cùng debounce PUT) để máy khác thấy dữ liệu mới
 * với độ trễ thấp trong giới hạn HTTP/poll — không thể <1ms qua mạng (RTT + xử lý).
 */
import { htqlApiUrl } from '../config/htqlApiBase'
import {
  fetchHtqlSyncState,
  getLocalHtqlSystemVersion,
  setLocalHtqlSystemVersion,
} from './htqlSyncStateClient'
import {
  alignLastSyncLogIdFromServer,
  fetchHtqlSyncDelta,
  getLastSyncLogId,
  setLastSyncLogId,
  HTQL_SYNC_DELTA_BUNDLE_EVENT,
} from './htqlSyncDeltaClient'
import {
  htqlEntityStorage,
  htqlEntitySetItemBase,
  htqlEntityRemoveItemBase,
  migrateLegacyHtqlEntityLocalStorageOnce,
} from './htqlEntityStorage'
import { baoGiaReloadFromStorage, HTQL_BAO_GIA_RELOAD_EVENT } from '../modules/crm/banHang/baoGia/baoGiaApi'
import {
  HTQL_DON_HANG_BAN_LIST_REFRESH_EVENT,
  HTQL_GHI_NHAN_DOANH_THU_LIST_REFRESH_EVENT,
  HTQL_HOA_DON_BAN_LIST_REFRESH_EVENT,
} from '../modules/crm/banHang/banHangTabEvent'
import { HTQL_HOP_DONG_MUA_LIST_REFRESH_EVENT } from '../modules/crm/muaHang/muaHangTabEvent'
import { donHangBanReloadFromStorage } from '../modules/crm/banHang/donHangBan/donHangBanChungTuApi'
import { hopDongBanChungTuReloadFromStorage } from '../modules/crm/banHang/hopDongBan/hopDongBanChungTuApi'
import { phuLucHopDongBanChungTuReloadFromStorage } from '../modules/crm/banHang/phuLucHopDongBan/phuLucHopDongBanChungTuApi'
import { ghiNhanDoanhThuReloadFromStorage } from '../modules/crm/banHang/ghiNhanDoanhThu/ghiNhanDoanhThuApi'
import { hoaDonBanReloadFromStorage } from '../modules/crm/banHang/hoaDon/hoaDonBanApi'
import { donHangMuaReloadFromStorage } from '../modules/crm/muaHang/donHangMua/donHangMuaApi'
import { hopDongMuaReloadFromStorage } from '../modules/crm/muaHang/hopDongMua/hopDongMuaApi'
import { thuTienBangReloadFromStorage } from '../modules/taiChinh/thuTien/thuTienBangApi'
import { chiTienBangReloadFromStorage } from '../modules/taiChinh/chiTien/chiTienBangApi'
import { chuyenTienBangReloadFromStorage } from '../modules/taiChinh/chuyenTien/chuyenTienBangApi'
import { vatTuHangHoaNapLai, VTHH_ENTITY_STORAGE_KEY } from '../modules/kho/khoHang/vatTuHangHoaApi'

const DEVICE_KEY = 'htql_device_id'
/** Pending KV PUTs when offline; replay on next app start. Key avoids htql prefix to skip sync loop. */
const OFFLINE_KV_SPOOL_KEY = '__htql_offline_kv_spool__'

/** Khoảng poll GET /api/htql-kv (ms) — đồng bộ nhanh giữa máy trạm (MySQL htql_kv_store). */
export const KV_POLL_INTERVAL_MS = 220

/** Debounce gom PUT sau chỉnh sửa htqlEntityStorage (ms) — cân bằng số request và độ trễ đẩy lên server. */
const KV_PUT_DEBOUNCE_MS = 240

/** Keys with dedicated MySQL tables — do not mirror in htql_kv_store */
const KV_EXCLUDE_KEYS = new Set([
  'htql550_khach_hang',
  'htql550_nhom_khach_hang',
  'htql550_dktt_khach_hang',
  'htql550_nha_cung_cap',
  'htql550_don_vi_tinh',
])

/** Phiên bản KV đã thấy từ server (theo key) — dùng khi poll để biết khi nào có thay đổi từ máy khác. */
const lastSeenVersion = new Map<string, number>()
/** Khóa đang chờ PUT lên server (chỉnh sửa cục bộ) — không ghi đè bằng poll trong lúc này. */
const pendingLocalKeys = new Set<string>()

let sessionBytesUp = 0
let sessionBytesDown = 0
let lastPollDurationMs: number | null = null
let lastPollAt = 0
/** Kích thước gói GET /api/htql-kv của lần poll gần nhất (ước lượng tốc độ). */
let lastPollBytesDown = 0
/** Vòng poll gần nhất có tải GET /api/htql-kv đầy đủ hay chỉ delta + cổng sync-state. */
let lastPollUsedFullKvGet = false

/** Khóa chờ debounce PUT (chưa gửi hoặc đang trong hàng đợi flush). */
const kvPutDebouncedPendingKeys = new Set<string>()
/** PUT lên API đang chạy (batch debounce hoặc xóa key đơn). */
let kvRemoteWriteInFlight = 0
/** Chuỗi lần poll GET thất bại liên tiếp — mất kết nối tới máy chủ/KV (MySQL). */
let kvPollFailStreak = 0
const KV_POLL_FAIL_STREAK_MAX = 3

/** Gán trong bootstrap — gọi từ visibility/online để kéo KV ngay khi quay lại tab. */
let pollMergeFromServerRef: (() => Promise<void>) | null = null

export function htqlKvPollNow(): void {
  void pollMergeFromServerRef?.()
}

export type HtqlKvSyncStats = {
  sessionBytesUp: number
  sessionBytesDown: number
  lastPollDurationMs: number | null
  lastPollAt: number
  lastPollBytesDown: number
  lastPollUsedFullKvGet: boolean
}

export function getHtqlKvSyncStats(): HtqlKvSyncStats {
  return {
    sessionBytesUp,
    sessionBytesDown,
    lastPollDurationMs,
    lastPollAt,
    lastPollBytesDown,
    lastPollUsedFullKvGet,
  }
}

export function isHtqlKvSyncActive(): boolean {
  return patched
}

function readOfflineSpoolFromStorage(): { key: string; value: string }[] {
  if (typeof localStorage === 'undefined') return []
  return readOfflineSpool(localStorage.getItem.bind(localStorage))
}

/** Số entry chờ replay khi offline (chưa ghi được lên máy chủ). */
export function getHtqlKvOfflineSpoolCount(): number {
  return readOfflineSpoolFromStorage().length
}

export function getHtqlKvDebouncedPendingCount(): number {
  return kvPutDebouncedPendingKeys.size
}

export function getHtqlKvRemoteWriteInFlight(): boolean {
  return kvRemoteWriteInFlight > 0
}

export function getHtqlKvPollFailStreak(): number {
  return kvPollFailStreak
}

export type HtqlCsdFooterTone = 'ok' | 'warn' | 'err' | 'muted'

/**
 * Dòng CSDL (footer): ưu tiên «Đang đồng bộ» khi đang ghi KV→API;
 * với máy chủ dùng MySQL: «Đã kết nối» / «Chưa kết nối» theo API + poll KV.
 * Khi máy chủ không dùng MySQL (JSON): nhãn giải thích ngắn (không dùng bộ đếm SLDL).
 */
export function getHtqlCsdFooterLabel(
  storageBackend: string | undefined,
  connOk: boolean,
): { text: string; tone: HtqlCsdFooterTone } {
  const syncing =
    getHtqlKvRemoteWriteInFlight() ||
    getHtqlKvDebouncedPendingCount() > 0 ||
    getHtqlKvOfflineSpoolCount() > 0
  if (syncing) return { text: 'Đang đồng bộ', tone: 'warn' }

  const mysql = (storageBackend ?? '').toLowerCase() === 'mysql'
  if (!mysql) return { text: 'Chế độ JSON (máy chủ)', tone: 'muted' }

  if (!patched) return { text: 'Chưa kết nối', tone: 'err' }
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { text: 'Chưa kết nối', tone: 'err' }
  if (!connOk) return { text: 'Chưa kết nối', tone: 'err' }
  if (kvPollFailStreak >= KV_POLL_FAIL_STREAK_MAX) return { text: 'Chưa kết nối', tone: 'err' }
  return { text: 'Đã kết nối', tone: 'ok' }
}

export type HtqlDbdMysqlTrangThai = 'thanh_cong' | 'chua_dong_bo' | 'mat_ket_noi' | 'khong_ap_dung'

/**
 * Trạng thái ĐBDL (đồng bộ dữ liệu) so với máy chủ — khi storage MySQL, ghi KV = ghi MySQL (htql_kv_store).
 * @param connOk — kết nối HTTP tới API (footer)
 */
export function getHtqlDbdMysqlTrangThai(connOk: boolean): HtqlDbdMysqlTrangThai {
  if (!patched) return 'khong_ap_dung'
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'mat_ket_noi'
  if (!connOk) return 'mat_ket_noi'
  if (kvPollFailStreak >= KV_POLL_FAIL_STREAK_MAX) return 'mat_ket_noi'
  if (getHtqlKvOfflineSpoolCount() > 0) return 'chua_dong_bo'
  if (kvPutDebouncedPendingKeys.size > 0) return 'chua_dong_bo'
  if (kvRemoteWriteInFlight) return 'chua_dong_bo'
  return 'thanh_cong'
}

function applyServerSystemVersionFromJson(j: { systemVersion?: unknown } | null | undefined): void {
  if (!j || j.systemVersion === undefined || j.systemVersion === null) return
  const v = Number(j.systemVersion)
  if (Number.isFinite(v)) setLocalHtqlSystemVersion(v)
}

function byteLen(s: string): number {
  try {
    return new Blob([s]).size
  } catch {
    return s.length * 2
  }
}

/** Sau khi KV ghi vào htqlEntityStorage, nạp lại cache module (RAM) để màn hình khớp dữ liệu máy chủ. */
function rehydrateModuleCachesFromKvKeys(keys: string[]): void {
  if (!keys.length) return
  let baoGia = false
  let dhbCt = false
  let hdb = false
  let pl = false
  let dhm = false
  let hdm = false
  let thu = false
  let chi = false
  let chuyen = false
  let ghiNhan = false
  let hoaDon = false
  let vthh = false
  for (const k of keys) {
    if (k.startsWith('htql_bao_gia')) baoGia = true
    if (k.startsWith('htql_don_hang_ban_chung_tu')) dhbCt = true
    if (k.startsWith('htql_hop_dong_ban')) hdb = true
    if (k.startsWith('htql_phu_luc_hop_dong_ban')) pl = true
    if (k.startsWith('htql_don_hang_mua')) dhm = true
    if (k.startsWith('htql_hop_dong_mua')) hdm = true
    if (k.startsWith('htql_thu_tien_bang')) thu = true
    if (k.startsWith('htql_chi_tien_bang')) chi = true
    if (k.startsWith('htql550_chuyen_tien')) chuyen = true
    if (k.startsWith('htql_ghi_nhan_doanh_thu') || k.startsWith('htql_nhan_hang')) ghiNhan = true
    if (k.startsWith('htql_hoa_don_ban') || k.startsWith('htql_phieu_thu_khach_hang')) hoaDon = true
    if (k === VTHH_ENTITY_STORAGE_KEY) vthh = true
  }
  if (baoGia) baoGiaReloadFromStorage()
  if (dhbCt) donHangBanReloadFromStorage()
  if (hdb) hopDongBanChungTuReloadFromStorage()
  if (pl) phuLucHopDongBanChungTuReloadFromStorage()
  if (dhm) donHangMuaReloadFromStorage()
  if (hdm) hopDongMuaReloadFromStorage()
  if (thu) thuTienBangReloadFromStorage()
  if (chi) chiTienBangReloadFromStorage()
  if (chuyen) chuyenTienBangReloadFromStorage()
  if (ghiNhan) ghiNhanDoanhThuReloadFromStorage()
  if (hoaDon) hoaDonBanReloadFromStorage()
  if (vthh) vatTuHangHoaNapLai()
}

function dispatchReloadsForChangedKeys(keys: string[]) {
  if (!keys.length) return
  let hdb = false
  let pl = false
  let thuChi = false
  let chuyen = false
  let ghiSo = false
  let dhm = false
  let nvthh = false
  let dhbList = false
  let baoGiaList = false
  let hdmList = false
  let hoaDonBanList = false
  let gndtList = false
  for (const k of keys) {
    if (k.startsWith('htql_hop_dong_ban')) hdb = true
    if (k.startsWith('htql_phu_luc_hop_dong_ban')) pl = true
    if (k.startsWith('htql_thu_tien_bang') || k.startsWith('htql_chi_tien_bang')) thuChi = true
    if (k.startsWith('htql550_chuyen_tien')) chuyen = true
    if (k.startsWith('htql550_thu_chi_tien_ghi_so') || k.startsWith('htql550_so_chi_tiet')) ghiSo = true
    if (k.startsWith('htql_don_hang_mua')) dhm = true
    if (k.startsWith('htql_hop_dong_mua')) hdmList = true
    if (k.startsWith('htql_nhan_vat_tu') || k.startsWith('htql_nhan_hang')) nvthh = true
    if (k.startsWith('htql_don_hang_ban')) dhbList = true
    if (k.startsWith('htql_bao_gia')) baoGiaList = true
    if (k.startsWith('htql_hoa_don_ban') || k.startsWith('htql_phieu_thu_khach_hang')) hoaDonBanList = true
    if (k.startsWith('htql_ghi_nhan_doanh_thu') || k.startsWith('htql_nhan_hang')) gndtList = true
  }
  if (hdb) window.dispatchEvent(new CustomEvent('htql-hop-dong-ban-list-refresh'))
  if (pl) window.dispatchEvent(new CustomEvent('htql-phu-luc-hop-dong-ban-list-refresh'))
  if (thuChi || baoGiaList) {
    try {
      window.dispatchEvent(new CustomEvent(HTQL_BAO_GIA_RELOAD_EVENT))
    } catch {
      /* ignore */
    }
  }
  if (dhbList) {
    try {
      window.dispatchEvent(new CustomEvent(HTQL_DON_HANG_BAN_LIST_REFRESH_EVENT))
    } catch {
      /* ignore */
    }
  }
  if (chuyen) window.dispatchEvent(new CustomEvent('htql:chuyen-tien-bang-reload'))
  if (ghiSo) window.dispatchEvent(new CustomEvent('htql:tai-chinh-ghi-so-reload'))
  if (dhm || nvthh) window.dispatchEvent(new CustomEvent('htql-dhm-list-refresh'))
  if (hdmList) {
    try {
      window.dispatchEvent(new CustomEvent(HTQL_HOP_DONG_MUA_LIST_REFRESH_EVENT))
    } catch {
      /* ignore */
    }
  }
  if (hoaDonBanList) {
    try {
      window.dispatchEvent(new CustomEvent(HTQL_HOA_DON_BAN_LIST_REFRESH_EVENT))
    } catch {
      /* ignore */
    }
  }
  if (gndtList) {
    try {
      window.dispatchEvent(new CustomEvent(HTQL_GHI_NHAN_DOANH_THU_LIST_REFRESH_EVENT))
    } catch {
      /* ignore */
    }
  }
  if (keys.some((k) => k === VTHH_ENTITY_STORAGE_KEY)) {
    try {
      window.dispatchEvent(new CustomEvent('htql-vthh-reload'))
    } catch {
      /* ignore */
    }
  }
  window.dispatchEvent(new CustomEvent('htql-kv-remote-sync', { detail: { keys } }))
}

function isKvSyncKey(key: string): boolean {
  if (key === DEVICE_KEY) return false
  return key.startsWith('htql') && !KV_EXCLUDE_KEYS.has(key)
}

/** Timer debounce PUT (gắn sau bootstrap). */
let kvPutDebounceTimer: ReturnType<typeof setTimeout> | null = null
let kvFlushPendingImpl: (() => Promise<void>) | null = null

/** Số khóa nghiệp vụ (htql*, trừ exclude) đang giữ trong bộ nhớ — đồng bộ KV↔MySQL khi poll/PUT thành công. */
export function getHtqlKvSyncedEntityKeyCount(): number {
  let n = 0
  try {
    for (let i = 0; i < htqlEntityStorage.length; i++) {
      const k = htqlEntityStorage.key(i)
      if (k && isKvSyncKey(k)) n++
    }
  } catch {
    /* ignore */
  }
  return n
}

/**
 * Đẩy ngay mọi chỉnh sửa KV đang chờ debounce lên máy chủ; đợi PUT đang chạy xong.
 * Gọi trước khi tắt ứng dụng (Electron) để tránh mất dữ liệu chưa ghi MySQL.
 */
export async function flushHtqlKvPendingSync(): Promise<void> {
  if (kvPutDebounceTimer) {
    clearTimeout(kvPutDebounceTimer)
    kvPutDebounceTimer = null
  }
  await kvFlushPendingImpl?.()
  const deadline = Date.now() + 20_000
  while (getHtqlKvRemoteWriteInFlight() && Date.now() < deadline) {
    await new Promise<void>((r) => setTimeout(r, 40))
  }
}

function ensureDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
    return id
  } catch {
    return 'unknown'
  }
}

export { ensureDeviceId }

let suppressPush = false
let patched = false

function readOfflineSpool(origGet: (k: string) => string | null): { key: string; value: string }[] {
  try {
    const raw = origGet(OFFLINE_KV_SPOOL_KEY)
    if (!raw) return []
    const j = JSON.parse(raw) as unknown
    return Array.isArray(j) ? (j as { key: string; value: string }[]) : []
  } catch {
    return []
  }
}

function mergeOfflineSpool(
  origGet: (k: string) => string | null,
  origSet: (k: string, v: string) => void,
  origRemove: (k: string) => void,
  batch: { key: string; value: string }[],
) {
  try {
    const prev = readOfflineSpool(origGet)
    const map = new Map(prev.map((e) => [e.key, e]))
    for (const e of batch) map.set(e.key, e)
    const merged = [...map.values()]
    if (merged.length) origSet(OFFLINE_KV_SPOOL_KEY, JSON.stringify(merged))
    else origRemove(OFFLINE_KV_SPOOL_KEY)
  } catch {
    /* ignore */
  }
}

export async function bootstrapHtqlKvSync(): Promise<void> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
  migrateLegacyHtqlEntityLocalStorageOnce()
  if (patched) return
  const origSet = localStorage.setItem.bind(localStorage)
  const origGet = localStorage.getItem.bind(localStorage)
  const origRemove = localStorage.removeItem.bind(localStorage)
  try {
    const metaRes = await fetch(htqlApiUrl('/api/htql-meta'))
    if (!metaRes.ok) return
    const meta = (await metaRes.json()) as { kvSyncEnabled?: boolean }
    if (!meta.kvSyncEnabled) return

    const spoolReplay = readOfflineSpool(origGet)
    if (spoolReplay.length) {
      try {
        const replayRes = await fetch(htqlApiUrl('/api/htql-kv'), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: spoolReplay }),
        })
        if (replayRes.ok) origRemove(OFFLINE_KV_SPOOL_KEY)
      } catch {
        /* keep spool */
      }
    }

    const pullRes = await fetch(htqlApiUrl('/api/htql-kv?prefix=htql'))
    if (!pullRes.ok) return
    const pull = (await pullRes.json()) as {
      entries?: { key: string; value: string; version: number }[]
      systemVersion?: unknown
    }
    applyServerSystemVersionFromJson(pull)
    if (getLocalHtqlSystemVersion() === null) {
      try {
        const st = await fetchHtqlSyncState()
        if (st) setLocalHtqlSystemVersion(st.systemVersion)
      } catch {
        /* ignore */
      }
    }
    const entries = pull.entries || []
    try {
      const rawPull = JSON.stringify({ entries })
      sessionBytesDown += byteLen(rawPull)
    } catch {
      /* ignore */
    }

    lastSeenVersion.clear()
    suppressPush = true
    try {
      for (const e of entries) {
        if (e.key && typeof e.value === 'string') {
          htqlEntitySetItemBase(e.key, e.value)
          lastSeenVersion.set(e.key, Number(e.version) || 0)
        }
      }
    } finally {
      suppressPush = false
    }

    rehydrateModuleCachesFromKvKeys(entries.map((e) => e.key).filter(Boolean))

    const serverKeys = new Set(entries.map((x) => x.key))
    const toPush: { key: string; value: string }[] = []
    for (let i = 0; i < htqlEntityStorage.length; i++) {
      const key = htqlEntityStorage.key(i)
      if (!key || !key.startsWith('htql')) continue
      if (key === DEVICE_KEY) continue
      const value = htqlEntityStorage.getItem(key) ?? ''
      if (!serverKeys.has(key)) {
        toPush.push({ key, value })
      }
    }
    if (toPush.length) {
      try {
        const payload = JSON.stringify({ entries: toPush })
        sessionBytesUp += byteLen(payload)
        const r = await fetch(htqlApiUrl('/api/htql-kv'), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        })
        if (!r.ok) mergeOfflineSpool(origGet, origSet, origRemove, toPush)
        else {
          try {
            const j = (await r.json()) as { systemVersion?: unknown }
            applyServerSystemVersionFromJson(j)
          } catch {
            /* ignore */
          }
        }
      } catch {
        mergeOfflineSpool(origGet, origSet, origRemove, toPush)
      }
    }

    try {
      await alignLastSyncLogIdFromServer()
    } catch {
      /* ignore */
    }

    let pollInFlight = false

    const pollMergeFromServer = async () => {
      if (pollInFlight) return
      pollInFlight = true
      const bumpPollFail = () => {
        kvPollFailStreak = Math.min(99, kvPollFailStreak + 1)
        try {
          window.dispatchEvent(new CustomEvent('htql-dbd-status'))
        } catch {
          /* ignore */
        }
      }
      try {
      const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
      let forceKvPullFromDelta = false
      try {
        let after = getLastSyncLogId()
        for (let page = 0; page < 40; page++) {
          const delta = await fetchHtqlSyncDelta(after)
          if (!delta) break
          applyServerSystemVersionFromJson({ systemVersion: delta.systemVersion })
          const dlist = delta.entries || []
          if (!dlist.length) break
          for (const e of dlist) {
            const sc = String(e.scope ?? '')
            if (sc === 'kv') forceKvPullFromDelta = true
            if (sc === 'bundle' && e.moduleId) {
              try {
                window.dispatchEvent(
                  new CustomEvent(HTQL_SYNC_DELTA_BUNDLE_EVENT, { detail: { moduleId: e.moduleId } }),
                )
              } catch {
                /* ignore */
              }
            }
          }
          let maxInBatch = after
          for (const e of dlist) {
            const id = Number(e.id) || 0
            if (id > maxInBatch) maxInBatch = id
          }
          setLastSyncLogId(maxInBatch)
          after = maxInBatch
          if (dlist.length < 5000) break
        }
      } catch {
        /* delta không bắt buộc */
      }
      try {
        const syncSt = await fetchHtqlSyncState()
        if (syncSt) {
          const localLast = getLastSyncLogId()
          if (localLast > syncSt.maxSyncLogId) {
            setLastSyncLogId(syncSt.maxSyncLogId)
            forceKvPullFromDelta = true
          }
          const localSv = getLocalHtqlSystemVersion()
          const logBehind = getLastSyncLogId() < syncSt.maxSyncLogId
          if (
            !forceKvPullFromDelta &&
            !logBehind &&
            localSv !== null &&
            syncSt.systemVersion === localSv
          ) {
            kvPollFailStreak = 0
            lastPollUsedFullKvGet = false
            lastPollDurationMs = Math.round(
              (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0,
            )
            lastPollAt = Date.now()
            try {
              window.dispatchEvent(new CustomEvent('htql-dbd-status'))
            } catch {
              /* ignore */
            }
            return
          }
        }
      } catch {
        /* bỏ qua gate — kéo KV đầy đủ */
      }
      let pullRes: Response
      try {
        pullRes = await fetch(htqlApiUrl('/api/htql-kv?prefix=htql'))
      } catch {
        bumpPollFail()
        return
      }
      if (!pullRes.ok) {
        bumpPollFail()
        return
      }
      let text = ''
      try {
        text = await pullRes.text()
      } catch {
        bumpPollFail()
        return
      }
      const downLen = byteLen(text)
      sessionBytesDown += downLen
      lastPollBytesDown = downLen
      lastPollUsedFullKvGet = true
      lastPollDurationMs = Math.round(
        (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0,
      )
      let pull: { entries?: { key: string; value: string; version: number }[]; systemVersion?: unknown }
      try {
        pull = JSON.parse(text) as {
          entries?: { key: string; value: string; version: number }[]
          systemVersion?: unknown
        }
      } catch {
        bumpPollFail()
        return
      }
      applyServerSystemVersionFromJson(pull)
      const list = pull.entries || []
      const serverKeys = new Set(list.map((e) => e.key).filter(Boolean))
      const changedKeys: string[] = []
      suppressPush = true
      try {
        for (const e of list) {
          if (!e.key || typeof e.value !== 'string') continue
          if (pendingLocalKeys.has(e.key)) continue
          const sv = Number(e.version) || 0
          const prev = lastSeenVersion.get(e.key) ?? 0
          const localVal = htqlEntityStorage.getItem(e.key)
          if (localVal === e.value && sv === prev) continue
          if (localVal === e.value && sv > prev) {
            lastSeenVersion.set(e.key, sv)
            continue
          }
          htqlEntitySetItemBase(e.key, e.value)
          lastSeenVersion.set(e.key, sv)
          changedKeys.push(e.key)
        }
        /** Máy khác đã xóa trên server → GET không còn key; gỡ khỏi htqlEntityStorage (không PUT lại). */
        const toRemove: string[] = []
        for (let i = 0; i < htqlEntityStorage.length; i++) {
          const k = htqlEntityStorage.key(i)
          if (!k || !isKvSyncKey(k)) continue
          if (serverKeys.has(k)) continue
          if (pendingLocalKeys.has(k)) continue
          if (kvPutDebouncedPendingKeys.has(k)) continue
          if (lastSeenVersion.has(k)) toRemove.push(k)
        }
        for (const k of toRemove) {
          htqlEntityRemoveItemBase(k)
          lastSeenVersion.delete(k)
          changedKeys.push(k)
        }
      } finally {
        suppressPush = false
      }
      if (changedKeys.length) {
        rehydrateModuleCachesFromKvKeys(changedKeys)
        dispatchReloadsForChangedKeys(changedKeys)
      }
      kvPollFailStreak = 0
      lastPollAt = Date.now()
      try {
        await alignLastSyncLogIdFromServer()
      } catch {
        /* ignore */
      }
      try {
        window.dispatchEvent(new CustomEvent('htql-dbd-status'))
      } catch {
        /* ignore */
      }
      } finally {
        pollInFlight = false
      }
    }

    const flush = async () => {
      if (kvPutDebouncedPendingKeys.size === 0) return
      const batch = [...kvPutDebouncedPendingKeys]
      kvPutDebouncedPendingKeys.clear()
      const body = batch.map((key) => ({ key, value: htqlEntityStorage.getItem(key) ?? '' }))
      const payload = JSON.stringify({ entries: body })
      sessionBytesUp += byteLen(payload)
      kvRemoteWriteInFlight++
      try {
        const putRes = await fetch(htqlApiUrl('/api/htql-kv'), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        })
        const ok = putRes.ok
        if (ok) {
          try {
            const j = (await putRes.json()) as { systemVersion?: unknown }
            applyServerSystemVersionFromJson(j)
          } catch {
            /* ignore */
          }
        }
        if (ok) {
          for (const k of batch) pendingLocalKeys.delete(k)
          rehydrateModuleCachesFromKvKeys(batch)
          dispatchReloadsForChangedKeys(batch)
          void pollMergeFromServer()
        } else {
          mergeOfflineSpool(origGet, origSet, origRemove, body)
          for (const k of batch) pendingLocalKeys.delete(k)
        }
      } catch {
        mergeOfflineSpool(origGet, origSet, origRemove, body)
        for (const k of batch) pendingLocalKeys.delete(k)
      } finally {
        kvRemoteWriteInFlight--
        try {
          window.dispatchEvent(new CustomEvent('htql-dbd-status'))
        } catch {
          /* ignore */
        }
      }
    }

    kvFlushPendingImpl = flush

    const baseEntitySetItem = htqlEntityStorage.setItem.bind(htqlEntityStorage)
    const baseEntityRemoveItem = htqlEntityStorage.removeItem.bind(htqlEntityStorage)

    htqlEntityStorage.setItem = (key: string, value: string) => {
      baseEntitySetItem(key, value)
      if (suppressPush || !isKvSyncKey(key)) return
      pendingLocalKeys.add(key)
      kvPutDebouncedPendingKeys.add(key)
      if (kvPutDebounceTimer) clearTimeout(kvPutDebounceTimer)
      kvPutDebounceTimer = setTimeout(() => {
        kvPutDebounceTimer = null
        void flush()
      }, KV_PUT_DEBOUNCE_MS)
    }

    htqlEntityStorage.removeItem = (key: string) => {
      baseEntityRemoveItem(key)
      if (suppressPush || !isKvSyncKey(key)) return
      pendingLocalKeys.add(key)
      const payload = JSON.stringify({ entries: [{ key, value: '' }] })
      sessionBytesUp += byteLen(payload)
      kvRemoteWriteInFlight++
      void fetch(htqlApiUrl('/api/htql-kv'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      })
        .then(async (r) => {
          if (r.ok) {
            try {
              const j = (await r.json()) as { systemVersion?: unknown }
              applyServerSystemVersionFromJson(j)
            } catch {
              /* ignore */
            }
          }
          pendingLocalKeys.delete(key)
          lastSeenVersion.delete(key)
          rehydrateModuleCachesFromKvKeys([key])
          dispatchReloadsForChangedKeys([key])
          if (r.ok) void pollMergeFromServer()
        })
        .catch(() => {
          mergeOfflineSpool(origGet, origSet, origRemove, [{ key, value: '' }])
          pendingLocalKeys.delete(key)
        })
        .finally(() => {
          kvRemoteWriteInFlight--
          try {
            window.dispatchEvent(new CustomEvent('htql-dbd-status'))
          } catch {
            /* ignore */
          }
        })
    }

    pollMergeFromServerRef = pollMergeFromServer
    window.setInterval(() => {
      void pollMergeFromServer()
    }, KV_POLL_INTERVAL_MS)
    void pollMergeFromServer()

    patched = true
  } catch (e) {
    console.warn('[HTQL] bootstrapHtqlKvSync', e)
  }
}
