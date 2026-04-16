import { htqlApiUrl } from '../config/htqlApiBase'
import { setLocalHtqlSystemVersion } from './htqlSyncStateClient'

const ETAG_KEY_PREFIX = 'htql_bundle_etag_'

/** Phiên bản bundle đã áp sau lần GET 200 gần nhất — dùng khi 304. */
const lastKnownBundleVersion = new Map<string, number>()

function etagStorageKey(moduleId: string): string {
  return `${ETAG_KEY_PREFIX}${moduleId}`
}

function readStoredEtag(moduleId: string): string {
  if (typeof sessionStorage === 'undefined') return ''
  try {
    return sessionStorage.getItem(etagStorageKey(moduleId)) ?? ''
  } catch {
    return ''
  }
}

function writeStoredEtag(moduleId: string, etag: string): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    if (etag) sessionStorage.setItem(etagStorageKey(moduleId), etag)
  } catch {
    /* ignore */
  }
}

/** GET nhẹ — map moduleId → version (đồng bộ đa máy cho bundle không nằm trong htql_kv_store). */
export async function htqlModuleBundleVersionsGet(): Promise<Record<string, number>> {
  const r = await fetch(htqlApiUrl('/api/htql-module-bundle-versions'), {
    credentials: 'include',
  })
  if (!r.ok) throw new Error(`htql-module-bundle-versions ${r.status}`)
  const j = (await r.json()) as { versions?: unknown }
  const v = j.versions
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Record<string, number> = {}
  for (const [k, val] of Object.entries(v)) {
    out[k] = Number(val) || 0
  }
  return out
}

export type HtqlModuleBundleGetResult = {
  bundle: unknown | null
  version: number
  /** true khi 304 — không parse JSON body; không cập nhật state nghiệp vụ. */
  notModified?: boolean
}

export async function htqlModuleBundleGet(moduleId: string): Promise<HtqlModuleBundleGetResult> {
  const prevEtag = readStoredEtag(moduleId)
  const headers: Record<string, string> = {}
  if (prevEtag) headers['If-None-Match'] = prevEtag

  const r = await fetch(htqlApiUrl(`/api/htql-module-bundle/${encodeURIComponent(moduleId)}`), {
    credentials: 'include',
    headers: Object.keys(headers).length ? headers : undefined,
  })
  if (r.status === 304) {
    return {
      bundle: null,
      version: lastKnownBundleVersion.get(moduleId) ?? 0,
      notModified: true,
    }
  }
  if (!r.ok) throw new Error(`htql-module-bundle GET ${r.status}`)
  const etag = r.headers.get('etag')
  if (etag) writeStoredEtag(moduleId, etag)
  const j = (await r.json()) as { bundle?: unknown; version?: unknown }
  const version = Number(j.version) || 0
  lastKnownBundleVersion.set(moduleId, version)
  return {
    bundle: j.bundle ?? null,
    version,
  }
}

export async function htqlModuleBundlePut(moduleId: string, bundle: unknown): Promise<{ version: number }> {
  const r = await fetch(htqlApiUrl(`/api/htql-module-bundle/${encodeURIComponent(moduleId)}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ bundle }),
  })
  if (!r.ok) throw new Error(`htql-module-bundle PUT ${r.status}`)
  const j = (await r.json()) as { version?: unknown; systemVersion?: unknown }
  const sv = Number(j.systemVersion)
  if (Number.isFinite(sv)) setLocalHtqlSystemVersion(sv)
  void import('./htqlKvSync').then((m) => {
    m.htqlKvPollNow()
  })
  void import('./htqlModuleBundleSyncPoll').then((m) => {
    void m.htqlModuleBundleVersionsPollNow()
  })
  return { version: Number(j.version) || 0 }
}
