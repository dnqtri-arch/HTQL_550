import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  getHtqlApiOrigin,
  getHtqlConnectionMode,
  htqlApiUrl,
  htqlDevUsesRemoteApi,
} from '../config/htqlApiBase'
import {
  getHtqlCsdFooterLabel,
  getHtqlKvSyncStats,
  type HtqlKvSyncStats,
} from '../utils/htqlKvSync'
import { extractHtqlClientVxTag, semverFromVxTag } from '../utils/htqlVersionRank'

const footerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 8,
  padding: '6px 12px',
  background: 'var(--bg-secondary)',
  borderTop: '2px solid var(--border-strong)',
  fontSize: '11px',
  color: 'var(--text-muted)',
}

type HtqlMeta = {
  webAppVersion?: string
  version?: string
  clientInstallerVersion?: string | null
  clientInstallerSemver?: string | null
  clientInstallerFile?: string | null
  clientInstallerDownloadUrl?: string | null
  /** mysql | json — nguồn lưu KV (MySQL = htql_kv_store) */
  storageBackend?: string
}

const META_FETCH_TIMEOUT_MS = 12_000
const META_RETRY_DELAYS_MS = [0, 400, 900]

function connectionLabel(
  origin: string,
  pubIp: string,
  opts: {
    metaOk: boolean
    connMode: ReturnType<typeof getHtqlConnectionMode>
    /** IP LAN mặc định khi UI dùng proxy / không có origin — hiển thị cố định VD LAN (192.168.1.68) */
    lanHintIp: string
    /** IPv4 máy trạm (Electron). */
    clientIp?: string
  },
): { text: string; ok: boolean } {
  const inner = (() => {
    if (origin) {
      try {
        const host = new URL(origin).hostname
        if (host === pubIp) return { text: `● Kết nối: ONLINE (${host})`, ok: true }
        return { text: `● Kết nối: LAN (${host})`, ok: true }
      } catch {
        return { text: '● Kết nối: OFF', ok: false }
      }
    }
    if (import.meta.env.DEV && !htqlDevUsesRemoteApi()) {
      return { text: '● Kết nối: Dev (localhost / proxy)', ok: true }
    }
    if (opts.metaOk) {
      const m = opts.connMode
      if (m === 'LAN') return { text: `● Kết nối: LAN (${opts.lanHintIp})`, ok: true }
      if (m === 'Dev') return { text: '● Kết nối: Dev (API)', ok: true }
      return { text: `● Kết nối: ONLINE (${pubIp})`, ok: true }
    }
    return { text: '● Kết nối: OFF', ok: false }
  })()
  const tail = opts.clientIp?.trim()
  if (tail) return { text: `${inner.text} · IP Client: ${tail}`, ok: inner.ok }
  return inner
}

/** Hiển thị một dòng: tag V… (máy chủ đã chuẩn hóa trong /api/htql-meta). */
function serverClientInstallerLine(meta: HtqlMeta | null): string {
  if (!meta) return '—'
  const tag =
    extractHtqlClientVxTag(meta.clientInstallerVersion, meta.clientInstallerFile) ||
    meta.clientInstallerVersion?.trim()
  if (tag) return tag.startsWith('V') ? tag : `V${tag.replace(/^v/i, '')}`
  const sem = meta.clientInstallerSemver?.trim()
  if (sem) return sem
  const w = meta.webAppVersion?.trim()
  if (w && w !== 'unknown') return w
  const v = meta.version?.trim()
  if (v && v !== 'unknown') return v
  return '—'
}

/** Chuỗi để so khớp Đồng bộ (ưu tiên semver manifest, không dùng tên file .exe). */
function serverVersionForSync(meta: HtqlMeta | null): string {
  if (!meta) return ''
  const sem = meta.clientInstallerSemver?.trim()
  if (sem) return sem
  const tag =
    extractHtqlClientVxTag(meta.clientInstallerVersion, meta.clientInstallerFile) ||
    meta.clientInstallerVersion?.trim()
  if (tag) return semverFromVxTag(tag) || tag
  const w = meta.webAppVersion?.trim()
  if (w && w !== 'unknown') return w
  const v = meta.version?.trim()
  if (v && v !== 'unknown') return v
  return ''
}

function clientVersionForSync(tagEnv: string | undefined, webRoot: string | undefined): string {
  const tag = (tagEnv ?? '').trim()
  const vx = extractHtqlClientVxTag(tag) || tag
  if (vx) return semverFromVxTag(vx) || vx
  return (webRoot ?? '').trim()
}

function formatBytesVi(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B'
  if (n < 1024) return `${Math.round(n)} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

/** Chỉ byte phiên — tách khỏi chu kỳ poll / độ trễ (dòng dưới). */
function kvSyncFooterBytesLine(s: HtqlKvSyncStats): string {
  const up = formatBytesVi(s.sessionBytesUp)
  const down = formatBytesVi(s.sessionBytesDown)
  return `↑ ${up} · ↓ ${down}`
}

const KV_FOOTER_UI_TICK_MS = 1000

export function AppFooter() {
  const now = new Date()
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('vi-VN')
  const tag = import.meta.env.VITE_HTQL_550_VERSION as string | undefined
  const webRootVer = import.meta.env.VITE_APP_VERSION as string | undefined
  const lanHintIp = (import.meta.env.VITE_HTQL_IP_LAN as string | undefined)?.trim() || '192.168.1.68'
  const pubIp = (import.meta.env.VITE_HTQL_IP_PUBLIC as string | undefined) ?? '14.224.152.48'

  const isElectronApp =
    typeof window !== 'undefined' &&
    Boolean((window as Window & { htqlDesktop?: { isElectron?: boolean } }).htqlDesktop?.isElectron)

  /** Tag V… từ build — chỉ bản cài EXE/DMG (Electron) có; bản web không dùng semver gốc repo (1.0.0). */
  const mayTinhClientLine = useMemo(() => {
    const t = (tag ?? '').trim()
    const vx = extractHtqlClientVxTag(t) || t
    if (vx) return vx.startsWith('V') ? vx : vx
    if (isElectronApp) return (webRootVer ?? '').trim() || '—'
    return '—'
  }, [tag, webRootVer, isElectronApp])

  const [meta, setMeta] = useState<HtqlMeta | null>(null)
  const [metaErr, setMetaErr] = useState(false)
  const [kvStats, setKvStats] = useState<HtqlKvSyncStats>(() => getHtqlKvSyncStats())
  const [clientLanIp, setClientLanIp] = useState('')

  const origin = getHtqlApiOrigin()
  const connMode = getHtqlConnectionMode()

  const fetchMeta = useCallback(async () => {
    setMetaErr(false)
    let lastErr = false
    for (let i = 0; i < META_RETRY_DELAYS_MS.length; i++) {
      const d = META_RETRY_DELAYS_MS[i]
      if (d > 0) await new Promise((r) => setTimeout(r, d))
      try {
        const r = await axios.get<HtqlMeta>(htqlApiUrl('/api/htql-meta'), {
          timeout: META_FETCH_TIMEOUT_MS,
        })
        setMeta(r.data)
        setMetaErr(false)
        return
      } catch {
        lastErr = true
      }
    }
    if (lastErr) {
      setMeta(null)
      setMetaErr(true)
    }
  }, [])

  useEffect(() => {
    void fetchMeta()
  }, [fetchMeta])

  useEffect(() => {
    if (!isElectronApp) return
    const g = window.htqlDesktop?.getClientIpv4
    if (typeof g !== 'function') return
    void g()
      .then((ip) => setClientLanIp((ip || '').trim()))
      .catch(() => setClientLanIp(''))
  }, [isElectronApp])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void fetchMeta()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [fetchMeta])

  useEffect(() => {
    const tick = () => {
      setKvStats(getHtqlKvSyncStats())
    }
    const t = window.setInterval(tick, KV_FOOTER_UI_TICK_MS)
    const onKv = () => tick()
    const onDbd = () => tick()
    window.addEventListener('htql-kv-remote-sync', onKv)
    window.addEventListener('htql-dbd-status', onDbd)
    tick()
    return () => {
      window.clearInterval(t)
      window.removeEventListener('htql-kv-remote-sync', onKv)
      window.removeEventListener('htql-dbd-status', onDbd)
    }
  }, [])

  const metaOk = Boolean(meta) && !metaErr
  const conn = connectionLabel(origin, pubIp, { metaOk, connMode, lanHintIp, clientIp: clientLanIp })

  const serverWeb = serverClientInstallerLine(meta)
  const serverForSync = serverVersionForSync(meta)
  const clientVerForSync = clientVersionForSync(tag, webRootVer)
  const syncMatch =
    isElectronApp &&
    !metaErr &&
    meta &&
    clientVerForSync &&
    serverForSync &&
    serverForSync === clientVerForSync

  const csd = getHtqlCsdFooterLabel(meta?.storageBackend, conn.ok)
  const csdTitle =
    'CSDL: trạng thái MySQL trên máy chủ (qua API). «Đang đồng bộ» khi đang ghi KV lên máy chủ.'

  const serverLineColor =
    isElectronApp && syncMatch ? '#15803d' : metaErr ? '#b91c1c' : 'var(--text-muted)'

  return (
    <footer style={footerStyles}>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexWrap: 'nowrap',
          alignItems: 'center',
          gap: 10,
          overflowX: 'auto',
          overflowY: 'hidden',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.35,
        }}
        title="Kết nối API · phiên bản máy chủ (manifest) · luồng byte KV phiên hiện tại."
      >
        <span style={{ color: conn.ok ? '#15803d' : 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {conn.text}
        </span>
        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }} aria-hidden>
          ·
        </span>
        <span style={{ color: serverLineColor, flexShrink: 0, whiteSpace: 'nowrap' }}>
          {isElectronApp ? (
            <>
              {'\u25cf Client: '}
              {mayTinhClientLine}
              {' | '}
            </>
          ) : (
            '\u25cf '
          )}
          {'M\u00e1y ch\u1ee7: '}
          {serverWeb}
        </span>
        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }} aria-hidden>
          ·
        </span>
        <span style={{ color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>
          ● Luồng KV: {kvSyncFooterBytesLine(kvStats)}
          {kvStats.lastPollUsedFullKvGet && kvStats.lastPollBytesDown > 0
            ? ` · gói GET gần nhất: ${formatBytesVi(kvStats.lastPollBytesDown)}`
            : ''}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', alignItems: 'baseline', justifyContent: 'flex-end', textAlign: 'right', maxWidth: 'min(42em, 100%)' }}>
        <span
          style={{
            color:
              csd.tone === 'ok'
                ? '#15803d'
                : csd.tone === 'warn'
                  ? '#ca8a04'
                  : csd.tone === 'err'
                    ? '#b91c1c'
                    : 'var(--text-muted)',
          }}
          title={csdTitle}
        >
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>CSDL:</span> {csd.text}
        </span>
        <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
          {timeStr} {dateStr}
        </span>
      </div>
    </footer>
  )
}