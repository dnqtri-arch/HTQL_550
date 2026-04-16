/**
 * Con trỏ system_version (GET /api/htql-sync-state) — gate GET KV nặng trên desktop.
 * sessionStorage: không mất khi reload trong phiên (theo yêu cầu đồng bộ EXE/DMG).
 */
import { htqlApiUrl } from '../config/htqlApiBase'

const STORAGE_KEY = 'htql_local_system_version'

function readStored(): number | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw == null || raw === '') return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export function getLocalHtqlSystemVersion(): number | null {
  return readStored()
}

export function setLocalHtqlSystemVersion(v: number): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, String(v))
  } catch {
    /* ignore */
  }
}

export type HtqlSyncStatePayload = {
  systemVersion: number
  maxSyncLogId: number
}

export async function fetchHtqlSyncState(): Promise<HtqlSyncStatePayload | null> {
  try {
    const r = await fetch(htqlApiUrl('/api/htql-sync-state'), { credentials: 'include' })
    if (!r.ok) return null
    const j = (await r.json()) as { systemVersion?: unknown; maxSyncLogId?: unknown }
    return {
      systemVersion: Number(j.systemVersion) || 0,
      maxSyncLogId: Number(j.maxSyncLogId) || 0,
    }
  } catch {
    return null
  }
}
