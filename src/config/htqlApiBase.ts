/**
 * Client production: Local-First LAN (probe nhanh), sau đó fallback WAN 14.224.152.48.
 * Dev: URL tương đối /api (proxy Vite → localhost:3001).
 * Probe HTTP dùng axios (timeout rõ ràng).
 */

import axios from 'axios'
import {
  HTQL_DEFAULT_API_PORT,
  HTQL_DEFAULT_IP_LAN,
  HTQL_DEFAULT_IP_PUBLIC,
} from '../constants/htqlConnectionDefaults'

/** Ưu tiên health (nhẹ); fallback DVT cho bản server cũ. */
const PROBE_PATHS = ['/api/health', '/api/don-vi-tinh'] as const
const LAN_RESOLVE_BUDGET_MS = 3200
const PROBE_TIMEOUT_MS = 2200
const SWEEP_HOST_TIMEOUT_MS = 350
const PROBE_RETRY_DELAY_MS = 250

let resolvedBase = ''

async function getInstallDiscoveryFromDesktop(): Promise<{
  discoveredHost: string | null
  apiPort: number | null
} | null> {
  if (typeof window === 'undefined') return null
  const d = window.htqlDesktop
  if (!d?.getInstallDiscovery) return null
  try {
    const raw = await d.getInstallDiscovery()
    if (!raw) return null
    return {
      discoveredHost: raw.discoveredHost ? String(raw.discoveredHost) : null,
      apiPort: raw.apiPort != null && Number.isFinite(Number(raw.apiPort)) ? Number(raw.apiPort) : null,
    }
  } catch {
    return null
  }
}

function envMode(): string {
  return (import.meta.env.VITE_HTQL_API_MODE as string | undefined) ?? 'smart'
}

function buildBase(ip: string, port: string): string {
  return `http://${ip}:${port}`
}

function probeResponseOk(path: string, data: unknown): boolean {
  if (path === '/api/health' && data && typeof data === 'object' && 'ok' in data && (data as { ok?: unknown }).ok === true)
    return true
  if (path === '/api/don-vi-tinh' && Array.isArray(data)) return true
  return false
}

async function probeOk(baseUrl: string, timeoutMs: number = PROBE_TIMEOUT_MS): Promise<boolean> {
  for (const path of PROBE_PATHS) {
    try {
      const r = await axios.get(`${baseUrl}${path}`, {
        timeout: timeoutMs,
        validateStatus: (s) => s >= 200 && s < 300,
      })
      if (r.status >= 200 && r.status < 300 && probeResponseOk(path, r.data)) return true
    } catch {
      /* thử path kế */
    }
  }
  return false
}

async function probeOkWithRetry(baseUrl: string, timeoutMs: number = PROBE_TIMEOUT_MS): Promise<boolean> {
  if (await probeOk(baseUrl, timeoutMs)) return true
  await new Promise((r) => setTimeout(r, PROBE_RETRY_DELAY_MS))
  return probeOk(baseUrl, timeoutMs)
}

function isFileProtocol(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'file:'
}

/** Quét 192.168.1.1–254 (lô) trong ngân sách thời gian LAN_RESOLVE_BUDGET_MS tính từ t0. */
async function sweepLanForServer(port: string, t0: number): Promise<string | null> {
  const batchSize = 24
  for (let start = 1; start <= 254; start += batchSize) {
    if (Date.now() - t0 >= LAN_RESOLVE_BUDGET_MS) return null
    const tasks: Promise<string | null>[] = []
    for (let i = start; i < start + batchSize && i <= 254; i++) {
      const base = `http://192.168.1.${i}:${port}`
      tasks.push(
        probeOk(base, SWEEP_HOST_TIMEOUT_MS).then((ok) => (ok ? base : null)),
      )
    }
    const hits = await Promise.all(tasks)
    const found = hits.find((h) => h !== null)
    if (found) return found
  }
  return null
}

/** Dev: bật probe LAN/WAN tới server thật (`.env.development`: VITE_HTQL_DEV_USE_REMOTE_API=1). */
export function htqlDevUsesRemoteApi(): boolean {
  return (
    import.meta.env.VITE_HTQL_DEV_USE_REMOTE_API === '1' ||
    String(import.meta.env.VITE_HTQL_DEV_USE_REMOTE_API ?? '').toLowerCase() === 'true'
  )
}

/**
 * Dev + remote: khi probe LAN/WAN không khớp nhưng `.env` đã chỉ đúng máy chủ API trong `VITE_HTTP_PROXY_API_TARGET`,
 * thử probe URL đó để dùng base tuyệt đối (cùng DB với client đã phát hành).
 */
async function tryDevRemoteProxyFromEnv(): Promise<void> {
  if (!import.meta.env.DEV || !htqlDevUsesRemoteApi() || resolvedBase) return
  const raw = (import.meta.env.VITE_HTTP_PROXY_API_TARGET as string | undefined)?.trim()
  if (!raw) return
  const base = raw.replace(/\/$/, '')
  if (await probeOkWithRetry(base)) {
    resolvedBase = base
  }
}

/**
 * Gọi một lần trước khi render app (main.tsx).
 * Ưu tiên: discovery (cài đặt) → LAN cố định → quét LAN trong ngân sách ngắn → WAN.
 * Dev: mặc định proxy /api → localhost:3001. Bật VITE_HTQL_DEV_USE_REMOTE_API=1 để probe LAN/WAN (server thật 192.168.1.68:3001).
 */
export async function initHtqlApiBase(): Promise<void> {
  if (import.meta.env.DEV && !htqlDevUsesRemoteApi()) {
    resolvedBase = ''
    return
  }
  if (envMode() === 'same-origin') {
    resolvedBase = ''
    return
  }
  const port = (import.meta.env.VITE_HTQL_API_PORT as string | undefined) ?? HTQL_DEFAULT_API_PORT
  const lan = (import.meta.env.VITE_HTQL_IP_LAN as string | undefined) ?? HTQL_DEFAULT_IP_LAN
  const pub = (import.meta.env.VITE_HTQL_IP_PUBLIC as string | undefined) ?? HTQL_DEFAULT_IP_PUBLIC
  const lanBase = buildBase(lan, port)
  const pubBase = buildBase(pub, port)

  const t0 = Date.now()

  const discovery = await getInstallDiscoveryFromDesktop()
  if (discovery?.discoveredHost) {
    const p = discovery.apiPort != null ? String(discovery.apiPort) : port
    const base = buildBase(discovery.discoveredHost, p)
    if (await probeOkWithRetry(base)) {
      resolvedBase = base
      return
    }
  }

  if (await probeOkWithRetry(lanBase)) {
    resolvedBase = lanBase
    return
  }

  if (Date.now() - t0 >= LAN_RESOLVE_BUDGET_MS) {
    if (await probeOkWithRetry(pubBase)) {
      resolvedBase = pubBase
      return
    }
    if (isFileProtocol()) {
      resolvedBase = pubBase
      return
    }
    resolvedBase = ''
    await tryDevRemoteProxyFromEnv()
    return
  }

  const swept = await sweepLanForServer(port, t0)
  if (swept) {
    resolvedBase = swept
    return
  }

  if (await probeOkWithRetry(pubBase)) {
    resolvedBase = pubBase
    return
  }

  if (isFileProtocol()) {
    resolvedBase = pubBase
    return
  }
  resolvedBase = ''
  await tryDevRemoteProxyFromEnv()
}

/**
 * Kiểm tra base hiện tại còn sống; nếu mất kết nối lâu (router đổi IP, server đổi LAN/WAN),
 * tự resolve lại để client không đứng yên ở base cũ.
 * @returns true nếu base thay đổi.
 */
export async function ensureHtqlApiBaseAlive(): Promise<boolean> {
  const prev = resolvedBase
  if (prev && (await probeOk(prev, 1200))) return false
  await initHtqlApiBase()
  return prev !== resolvedBase
}

/** Base đã chọn (vd http://192.168.1.68:3001) hoặc '' khi dùng cùng origin. */
export function getHtqlApiOrigin(): string {
  return resolvedBase
}

function isPrivateLanHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h === '127.0.0.1') return true
  const parts = h.split('.').map((x) => parseInt(x, 10))
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false
  const [a, b] = parts
  if (a === 10) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

/** LAN = API trỏ tới IP mạng nội bộ; Online = IP công khai / WAN. Dev = chỉ khi dev và không bật remote API. */
export function getHtqlConnectionMode(): 'LAN' | 'Online' | 'Dev' {
  if (import.meta.env.DEV && !htqlDevUsesRemoteApi()) return 'Dev'
  const o = resolvedBase.trim()
  if (!o) return 'Online'
  try {
    const u = new URL(o)
    return isPrivateLanHost(u.hostname) ? 'LAN' : 'Online'
  } catch {
    return 'Online'
  }
}

/** Tiền tố URL cho các endpoint /api/... */
export function htqlApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  if (!resolvedBase) return p
  return `${resolvedBase}${p}`
}
