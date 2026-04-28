import { htqlApiUrl } from '../config/htqlApiBase'
import { setLocalHtqlSystemVersion } from './htqlSyncStateClient'
import { htqlKvPollNow } from './htqlKvSync'
import { htqlModuleBundleVersionsPollNow } from './htqlModuleBundleSyncPoll'

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

/** Gỡ etag bundle trong sessionStorage (vd. test / khôi phục sau lỗi hiếm). Mọi module dùng `htqlModuleBundleGet` đều dùng chung. */
export function clearHtqlModuleBundleSessionEtag(moduleId: string): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(etagStorageKey(moduleId))
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

/**
 * GET bundle module (baoGia, donHangBanChungTu, …). **Mọi** module migrate sang `htql_module_bundle`
 * phải dùng hàm này — không tự `fetch` `/api/htql-module-bundle/:id`.
 *
 * ETag: chỉ gửi `If-None-Match` khi RAM (`lastKnownBundleVersion`) đã có version trong **cùng**
 * phiên tab; sau F5 không gửi → luôn nhận body 200, tránh 304 không dữ liệu khi RAM đã reset.
 */
export async function htqlModuleBundleGet(moduleId: string): Promise<HtqlModuleBundleGetResult> {
  const url = htqlApiUrl(`/api/htql-module-bundle/${encodeURIComponent(moduleId)}`)
  const prevEtag = readStoredEtag(moduleId)
  const headers: Record<string, string> = {}
  if (prevEtag && lastKnownBundleVersion.has(moduleId)) headers['If-None-Match'] = prevEtag

  let r = await fetch(url, {
    credentials: 'include',
    headers: Object.keys(headers).length ? headers : undefined,
  })

  if (r.status === 304 && !lastKnownBundleVersion.has(moduleId)) {
    clearHtqlModuleBundleSessionEtag(moduleId)
    r = await fetch(url, { credentials: 'include' })
  }

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

/** Trùng server `bundleEtag(moduleId, version)` — sau PUT phải cập nhật để GET không áp nhầm bản cũ. */
function bundleEtagClient(moduleId: string, version: number): string {
  return `W/"${moduleId}:${version}"`
}

/** Giới hạn ~64KB của `keepalive` — bundle lớn hơn vẫn PUT bình thường (F5 giữa chừng có rủi ro). */
const MODULE_BUNDLE_PUT_KEEPALIVE_MAX_BYTES = 60_000

function moduleBundlePutBodyBytes(bundle: unknown): number {
  try {
    return new Blob([JSON.stringify({ bundle })]).size
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

/**
 * PUT tối thiểu khi đóng trang (F5) — request thường bị huỷ; `keepalive` tăng khả năng tới server.
 * Chỉ gọi khi body nhỏ (giới hạn trình duyệt).
 */
export function htqlModuleBundlePutKeepalive(moduleId: string, bundle: unknown): void {
  if (typeof window === 'undefined') return
  const body = JSON.stringify({ bundle })
  if (moduleBundlePutBodyBytes(bundle) > MODULE_BUNDLE_PUT_KEEPALIVE_MAX_BYTES) return
  try {
    void fetch(htqlApiUrl(`/api/htql-module-bundle/${encodeURIComponent(moduleId)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body,
      keepalive: true,
    })
  } catch {
    /* ignore */
  }
}

export async function htqlModuleBundlePut(moduleId: string, bundle: unknown): Promise<{ version: number }> {
  const body = JSON.stringify({ bundle })
  const keepalive = moduleBundlePutBodyBytes(bundle) <= MODULE_BUNDLE_PUT_KEEPALIVE_MAX_BYTES
  const r = await fetch(htqlApiUrl(`/api/htql-module-bundle/${encodeURIComponent(moduleId)}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body,
    ...(keepalive ? { keepalive: true as const } : {}),
  })
  if (!r.ok) {
    let detail = ''
    try {
      const raw = await r.text()
      if (raw) {
        try {
          const j = JSON.parse(raw) as { error?: string }
          if (typeof j?.error === 'string' && j.error.trim()) detail = `: ${j.error.trim()}`
          else detail = `: ${raw.slice(0, 400)}`
        } catch {
          detail = `: ${raw.slice(0, 400)}`
        }
      }
    } catch {
      /* ignore */
    }
    throw new Error(`htql-module-bundle PUT ${r.status}${detail}`)
  }
  const j = (await r.json()) as { version?: unknown; systemVersion?: unknown }
  const sv = Number(j.systemVersion)
  if (Number.isFinite(sv)) setLocalHtqlSystemVersion(sv)
  const version = Number(j.version) || 0
  writeStoredEtag(moduleId, bundleEtagClient(moduleId, version))
  lastKnownBundleVersion.set(moduleId, version)
  htqlKvPollNow()
  void htqlModuleBundleVersionsPollNow()
  return { version }
}
