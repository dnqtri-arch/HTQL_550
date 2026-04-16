/**
 * Changelog / delta (GET /api/sync/delta?after_id=) — client lưu last_sync_id.
 * Ưu tiên localStorage gắn thiết bị; có thể đồng bộ thêm qua user_preferences sau này.
 */
import { htqlApiUrl } from '../config/htqlApiBase'
import { fetchHtqlSyncState } from './htqlSyncStateClient'

const STORAGE_KEY = 'htql_sync_log_last_id'

/** Renderer lắng nghe để nạp lại bundle khi delta báo scope `bundle`. */
export const HTQL_SYNC_DELTA_BUNDLE_EVENT = 'htql-sync-delta-bundle'

export function getLastSyncLogId(): number {
  if (typeof localStorage === 'undefined') return 0
  try {
    const n = Number(localStorage.getItem(STORAGE_KEY))
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

export function setLastSyncLogId(id: number): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, String(id))
  } catch {
    /* ignore */
  }
}

export type HtqlSyncDeltaEntry = {
  id: number
  scope: 'kv' | 'bundle'
  refKey: string | null
  moduleId: string | null
}

export type HtqlSyncDeltaResponse = {
  entries: HtqlSyncDeltaEntry[]
  maxSyncLogId: number
  systemVersion: number
  afterId: number
}

/** Kéo các thay đổi sau after_id (tối đa 5000 dòng / lần). */
export async function fetchHtqlSyncDelta(afterId: number): Promise<HtqlSyncDeltaResponse | null> {
  try {
    const r = await fetch(htqlApiUrl(`/api/sync/delta?after_id=${encodeURIComponent(String(afterId))}`), {
      credentials: 'include',
    })
    if (!r.ok) return null
    return (await r.json()) as HtqlSyncDeltaResponse
  } catch {
    return null
  }
}

/** Căn `last_sync_id` với đuôi log trên server (sau full KV pull hoặc khi khởi động). */
export async function alignLastSyncLogIdFromServer(): Promise<void> {
  const st = await fetchHtqlSyncState()
  if (st) setLastSyncLogId(st.maxSyncLogId)
}
