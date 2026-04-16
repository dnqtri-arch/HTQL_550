import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { HtqlRegistryClient, HtqlSettings } from './vite-env'
import {
  RefreshCw,
  Minus,
  Maximize2,
  X,
  Save,
  Server,
  Download,
  Laptop,
  Terminal,
  FolderOpen,
  HardDrive,
  FileUp,
  Database,
} from 'lucide-react'

const VER = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''

/** Đồng bộ tool server / máy chủ (đích SFTP + thư mục update dưới /opt/htql550). */
const REMOTE_SERVER_ZIP_PATH = '/tmp/htql_server_update.zip'
const DISPLAY_PATH_SERVER_UPDATE = '/opt/htql550/update/server'
const DISPLAY_PATH_CLIENT_UPDATE = '/opt/htql550/update/client'

const ONLINE_MS = 3 * 60 * 1000
const LOG_CAP = 150000

function compareVersion(a: string, b: string): number {
  const norm = (s: string) =>
    s
      .trim()
      .replace(/^v/i, '')
      .split('.')
      .map((x) => parseInt(x.replace(/\D/g, ''), 10) || 0)
  const pa = norm(a)
  const pb = norm(b)
  const n = Math.max(pa.length, pb.length)
  for (let i = 0; i < n; i++) {
    const va = pa[i] ?? 0
    const vb = pb[i] ?? 0
    if (va !== vb) return va - vb
  }
  return 0
}

function isVersionOlder(client: string, expected: string): boolean {
  const e = expected.trim()
  if (!e) return false
  const c = client.trim()
  if (!c) return true
  return compareVersion(c, e) < 0
}

function workstationLight(row: HtqlRegistryClient) {
  const recent = Date.now() - (row.lastSeen || 0) < ONLINE_MS
  if (!recent) return { bg: '#ef4444', title: 'Offline (quá hạn heartbeat)' }
  const z = String(row.connectionZone || '').toLowerCase()
  if (z === 'wan') return { bg: '#22c55e', title: 'Online — Internet (WAN)' }
  if (z === 'lan') return { bg: '#3b82f6', title: 'Online — LAN' }
  if (row.online) return { bg: '#22c55e', title: 'Online' }
  return { bg: '#3b82f6', title: 'Liên lạc gần đây (thiếu vùng LAN/WAN)' }
}

function connLabel(c: { mode: string; host: string | null }) {
  if (c.mode === 'offline') return '● SMART CONNECT — Offline'
  const zone = c.mode === 'lan' ? 'LAN' : 'WAN'
  return `● SMART CONNECT — ${zone} ${c.host ?? ''}`
}

const btnPrimary =
  'no-drag inline-flex items-center justify-center gap-1 rounded-lg border border-[#ffd700]/80 bg-gradient-to-b from-[#f7e396] via-[#d4af37] to-[#a67c00] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#1a1408] shadow-[0_4px_12px_rgba(212,175,55,0.4)] transition hover:brightness-110 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50'

const btnSecondary =
  'no-drag inline-flex items-center justify-center gap-1 rounded-lg border border-gold-500/70 bg-gradient-to-b from-gold-900/40 to-[#1a1408] px-2.5 py-1.5 text-xs font-semibold text-gold-100 shadow-inner transition hover:border-gold-400 hover:from-gold-800/50 disabled:opacity-50'

const btnPick =
  'no-drag inline-flex items-center gap-1 rounded border border-gold-600/60 bg-gold-950/40 px-1.5 py-0.5 text-xs font-medium text-gold-100 hover:bg-gold-900/50'

export default function App() {
  const [conn, setConn] = useState<{ mode: string; host: string | null }>({
    mode: 'offline',
    host: null,
  })
  const [settings, setSettings] = useState<HtqlSettings>({
    ubuntuUser: 'ubuntu',
    ubuntuPassword: '',
    lastClientInstallerPath: '',
    mysqlHost: '127.0.0.1',
    mysqlPort: '3306',
    mysqlDatabase: 'htql_550_db',
    mysqlUser: 'htql_550',
    mysqlPassword: '',
    workstations: [],
  })
  const [journalText, setJournalText] = useState('')
  const [journalReady, setJournalReady] = useState(false)
  const [statusBlock, setStatusBlock] = useState('')
  const [statusReady, setStatusReady] = useState(false)
  const [registryRows, setRegistryRows] = useState<HtqlRegistryClient[]>([])
  const [registryError, setRegistryError] = useState('')
  const [expectedWebVersion, setExpectedWebVersion] = useState('')
  /** Đọc từ GET /api/htql-meta — hiển thị MySQL/đường dẫn (không ghi từ tool). */
  const [serverMeta, setServerMeta] = useState<Record<string, unknown> | null>(null)
  const [log, setLog] = useState('')
  const logRef = useRef<HTMLPreElement>(null)
  const journalRef = useRef<HTMLPreElement>(null)
  const [zipUpdate, setZipUpdate] = useState('')
  const [installerPath, setInstallerPath] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploadLine, setUploadLine] = useState('')

  const appendLog = useCallback((s: string) => {
    setLog((prev) => {
      const n = prev + s
      return n.length > LOG_CAP ? n.slice(-LOG_CAP) : n
    })
  }, [])

  const prependSshLog = useCallback((s: string) => {
    setLog((prev) => {
      const n = s + prev
      return n.length > LOG_CAP ? n.slice(0, LOG_CAP) : n
    })
  }, [])

  useEffect(() => {
    window.htqlControl.getConnection().then(setConn)
    window.htqlControl.getSettings().then((s) => {
      setSettings((prev) => ({ ...prev, ...s }))
      if (s.lastClientInstallerPath) setInstallerPath(s.lastClientInstallerPath)
    })
    const off = window.htqlControl.onConnectionUpdate(setConn)
    const offLog = window.htqlControl.onSshLog(prependSshLog)
    const offUp = window.htqlControl.onUploadProgress((p) => {
      setUploadLine(
        `Đang tải file… ${p.pct}% (${(p.sent / (1024 * 1024)).toFixed(1)} / ${(p.total / (1024 * 1024)).toFixed(1)} MB, ~${p.mbps.toFixed(2)} MB/s)`,
      )
    })
    return () => {
      off()
      offLog()
      offUp()
    }
  }, [prependSshLog])

  useEffect(() => {
    logRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [log, uploadLine])

  useEffect(() => {
    if (conn.mode === 'offline') {
      setJournalText('')
      setJournalReady(false)
      return
    }
    setJournalReady(false)
    let cancelled = false
    const tick = async () => {
      const j = await window.htqlControl.journalTail()
      if (!cancelled) {
        setJournalReady(true)
        if (j.ok) {
          const t = (j.text ?? '').trim()
          const lines = t.length ? t.split('\n') : []
          setJournalText(lines.length ? lines.slice().reverse().join('\n') : '(Trống)')
        } else {
          setJournalText(`Lỗi: ${j.error ?? 'journal'}${j.text ? `\n${j.text}` : ''}`)
        }
      }
    }
    void tick()
    const t = setInterval(tick, 8000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [conn.mode])

  useEffect(() => {
    journalRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [journalText])

  const refreshServerStatus = useCallback(async () => {
    if (conn.mode === 'offline') {
      setStatusBlock('')
      setStatusReady(false)
      setServerMeta(null)
      return
    }
    setStatusReady(false)
    const metaR = await window.htqlControl.fetchHtqlMeta()
    const regR = await window.htqlControl.fetchHtqlClientRegistry()
    let metaBlock = ''
    let metaWeb = ''
    if (!metaR.ok || !('json' in metaR) || !metaR.json) {
      setServerMeta(null)
      metaBlock = `Lỗi đọc /api/htql-meta: ${'error' in metaR ? String(metaR.error) : 'unknown'}`
    } else {
      const m = metaR.json as Record<string, unknown>
      setServerMeta(m)
      metaWeb = String(m.webAppVersion ?? '')
      const host = String(m.serverHostName ?? '—')
      const db = String(m.pathCoSoDuLieu ?? m.mysqlDatabase ?? '—')
      const lines = [
        'HTQL_550',
        `Tên máy chủ (server): ${host}`,
        `Gốc cài (INSTALL_ROOT): ${String(m.installRoot ?? '—')}`,
        `SSD đính kèm (HTQL_ROOT_SSD): ${String(m.ssdRoot ?? '—')}`,
        `Dữ liệu ứng dụng (HTQL_DATA_DIR): ${String(m.pathDuLieu ?? m.dataDir ?? '—')}`,
        `Cơ sở dữ liệu: ${db}`,
        `Đường dẫn cập nhật server: ${String(m.pathUpdateServer ?? DISPLAY_PATH_SERVER_UPDATE)}`,
        `Đường dẫn cập nhật client: ${String(m.pathUpdateClient ?? DISPLAY_PATH_CLIENT_UPDATE)}`,
        `File hóa đơn, chứng từ: ${String(m.pathHoaDonChungTu ?? '—')}`,
        `File thiết kế: ${String(m.pathThietKe ?? '—')}`,
        `Backup dữ liệu + DB (HDD): ${String(m.pathBackupDuLieu ?? '—')}`,
        `Backup chứng từ / thiết kế (HDD): ${String(m.pathBackupCtTk ?? '—')}`,
        `Phiên bản API (server): ${String(m.version ?? '—')}`,
        `Phiên bản web (client tham chiếu): ${metaWeb || '—'}`,
      ]
      let clientVers = '—'
      if (regR.ok && 'json' in regR && regR.json) {
        const rj = regR.json as { clients?: HtqlRegistryClient[] }
        const clients = rj.clients || []
        if (clients.length) {
          const withVer = clients.filter((c) => String(c.clientVersion || '').trim())
          const uniq = [...new Set(withVer.map((c) => String(c.clientVersion).trim()))]
          const missing = clients.length - withVer.length
          if (uniq.length) {
            clientVers = uniq.join(', ')
            if (missing > 0) clientVers += ` (+${missing} máy chưa gửi phiên bản — cập nhật client web)`
          } else {
            clientVers = `${clients.length} máy trạm (chưa gửi phiên bản qua header — cần bản client mới)`
          }
        } else {
          clientVers = '(chưa có máy trạm trong registry)'
        }
      } else if (!regR.ok && 'error' in regR) {
        const err = String(regR.error || '')
        clientVers = metaWeb
          ? `(registry: ${err} — phiên bản web từ /api/htql-meta: ${metaWeb})`
          : `(không đọc được registry: ${err})`
      }
      lines.push(`Phiên bản máy trạm (client, gần đây): ${clientVers}`)
      metaBlock = lines.join('\n')
    }
    setStatusBlock(metaBlock)
    setStatusReady(true)
  }, [conn.mode])

  useEffect(() => {
    if (conn.mode === 'offline') {
      setStatusBlock('')
      setStatusReady(false)
      return
    }
    setStatusReady(false)
    let cancelled = false
    void refreshServerStatus()
    const iv = setInterval(() => {
      if (!cancelled) void refreshServerStatus()
    }, 12_000)
    return () => {
      cancelled = true
      clearInterval(iv)
    }
  }, [conn.mode, refreshServerStatus])

  useEffect(() => {
    if (conn.mode === 'offline') {
      setRegistryRows([])
      setExpectedWebVersion('')
      setRegistryError('')
      return
    }
    let cancelled = false
    const tick = async () => {
      const [r, meta] = await Promise.all([
        window.htqlControl.fetchHtqlClientRegistry(),
        window.htqlControl.fetchHtqlMeta(),
      ])
      if (cancelled) return
      let webFromMeta = ''
      if (meta.ok && 'json' in meta && meta.json) {
        webFromMeta = String((meta.json as { webAppVersion?: string }).webAppVersion ?? '')
      }
      if (!r.ok) {
        setRegistryError('error' in r ? String(r.error || '') : 'Lỗi gọi API')
        setRegistryRows([])
        setExpectedWebVersion(webFromMeta)
        return
      }
      if (!('json' in r) || !r.json) {
        setRegistryError('Phản hồi không hợp lệ')
        setExpectedWebVersion(webFromMeta)
        return
      }
      const j = r.json as { clients?: HtqlRegistryClient[]; expectedWebVersion?: string; error?: string }
      if (j.error) {
        setRegistryError(String(j.error))
        setRegistryRows([])
        setExpectedWebVersion(webFromMeta || j.expectedWebVersion || '')
        return
      }
      setRegistryError('')
      setExpectedWebVersion(j.expectedWebVersion || webFromMeta)
      setRegistryRows(Array.isArray(j.clients) ? j.clients : [])
    }
    void tick()
    const t = setInterval(tick, 5000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [conn.mode])

  /** Gộp theo IP: nếu một máy vừa gửi UUID vừa gửi ip:* chỉ giữ bản ghi lastSeen mới nhất. */
  const registryRowsDeduped = useMemo(() => {
    const byIp = new Map<string, HtqlRegistryClient>()
    for (const row of registryRows) {
      const ip = String(row.ip || '').trim()
      if (!ip) continue
      const prev = byIp.get(ip)
      if (!prev || (row.lastSeen || 0) > (prev.lastSeen || 0)) {
        byIp.set(ip, row)
      }
    }
    return [...byIp.values()].sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))
  }, [registryRows])

  const saveCfg = async () => {
    setBusy(true)
    await window.htqlControl.setSettings(settings)
    appendLog('Đã lưu cấu hình cục bộ.\r\n')
    setBusy(false)
  }

  const pullMysqlFromServer = async () => {
    setBusy(true)
    prependSshLog('--- Đọc HTQL_MYSQL_* từ server/.env (SSH) ---\r\n')
    const r = await window.htqlControl.pullMysqlEnv()
    if (!r.ok) {
      prependSshLog(`[LỖI] ${r.error}\r\n`)
      setBusy(false)
      return
    }
    const { fields } = r
    setSettings((s) => ({
      ...s,
      mysqlHost: fields.mysqlHost,
      mysqlPort: fields.mysqlPort,
      mysqlDatabase: fields.mysqlDatabase,
      mysqlUser: fields.mysqlUser,
      mysqlPassword: fields.mysqlPassword,
    }))
    await window.htqlControl.setSettings(fields)
    prependSshLog('Đã đồng bộ ô MySQL từ máy chủ và lưu cục bộ.\r\n')
    setBusy(false)
  }

  const pushMysqlToServer = async () => {
    setBusy(true)
    prependSshLog('--- Ghi HTQL_MYSQL_* lên server/.env + .mysql_password + PM2 ---\r\n')
    const r = await window.htqlControl.pushMysqlEnv({
      mysqlHost: settings.mysqlHost || '127.0.0.1',
      mysqlPort: settings.mysqlPort || '3306',
      mysqlDatabase: settings.mysqlDatabase || '',
      mysqlUser: settings.mysqlUser || '',
      mysqlPassword: settings.mysqlPassword || '',
    })
    if (!r.ok && r.error) prependSshLog(`[LỖI] ${r.error}\r\n`)
    if (r.out) prependSshLog(r.out.endsWith('\n') ? r.out : `${r.out}\r\n`)
    if (r.ok) {
      await window.htqlControl.setSettings({
        mysqlHost: settings.mysqlHost,
        mysqlPort: settings.mysqlPort,
        mysqlDatabase: settings.mysqlDatabase,
        mysqlUser: settings.mysqlUser,
        mysqlPassword: settings.mysqlPassword,
      })
      prependSshLog('Ghi MySQL lên server: THÀNH CÔNG.\r\n')
    }
    void refreshServerStatus()
    setBusy(false)
  }

  const field = (label: string, key: keyof Omit<HtqlSettings, 'workstations'>, type: 'text' | 'password' = 'text') => (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gold-200/95">{label}</span>
      <input
        type={type}
        className="rounded border border-gold-700/50 bg-panel2 px-1.5 py-1 text-xs text-gold-50 outline-none ring-0 transition focus:border-gold-400 focus:shadow-[0_0_0_1px_rgba(212,175,55,0.35)]"
        value={String(settings[key] ?? '')}
        onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
      />
    </label>
  )

  const zipFolderHint = (zipPath: string) => {
    const base = zipPath.replace(/[/\\]+/g, '/').split('/').pop() || ''
    const m = base.match(/^(htql_server_v[\d.]+)\.zip$/i)
    return m ? m[1] : null
  }

  const runUpdate = async () => {
    if (!zipUpdate) {
      appendLog('Chọn file .zip cập nhật server.\r\n')
      return
    }
    const hint = zipFolderHint(zipUpdate)
    if (!hint) {
      appendLog('Tên file phải đúng dạng htql_server_v….zip (đúng gói build).\r\n')
      return
    }
    setBusy(true)
    setUploadLine('')
    appendLog('--- Cập nhật phần mềm server ---\r\n')
    appendLog(`Bước 1: SFTP → ${REMOTE_SERVER_ZIP_PATH}\r\n`)
    const up = await window.htqlControl.uploadFile(zipUpdate, REMOTE_SERVER_ZIP_PATH)
    setUploadLine('')
    if (!up.ok) {
      appendLog(`[LỖI] Tải file: ${up.error}\r\n`)
      setBusy(false)
      return
    }
    appendLog(`Bước 2–n: Giải nén (${hint}), rsync, npm, PM2, sao chép zip → ${DISPLAY_PATH_SERVER_UPDATE} …\r\n`)
    const r = await window.htqlControl.runServerUpdate({ extractedFolderName: hint })
    appendLog(
      `--- Kết quả cập nhật server: ${r.ok ? 'THÀNH CÔNG' : 'THẤT BẠI'}${r.code != null ? ` (mã thoát ${r.code})` : ''} ---\r\n`,
    )
    if (r.error) appendLog(`[LỖI] ${r.error}\r\n`)
    if (r.out) appendLog(r.out + (r.out.endsWith('\n') ? '' : '\r\n'))
    if (!r.ok && !r.error && !r.out) appendLog('(Không có log chi tiết — kiểm tra SSH hoặc quyền sudo.)\r\n')
    void refreshServerStatus()
    setBusy(false)
  }

  const runClientInstaller = async () => {
    if (!installerPath) {
      appendLog('Chọn file .exe hoặc .dmg.\r\n')
      return
    }
    setBusy(true)
    setUploadLine('')
    appendLog('--- Đẩy gói cài client (.exe / .dmg) ---\r\n')
    await window.htqlControl.setSettings({ lastClientInstallerPath: installerPath })
    setSettings((s) => ({ ...s, lastClientInstallerPath: installerPath }))
    const r = await window.htqlControl.uploadClientInstaller(installerPath)
    if (!r.ok) appendLog(`[LỖI] ${r.error}\r\n`)
    else appendLog('[THÀNH CÔNG] Đã đẩy installer + manifest.\r\n')
    void refreshServerStatus()
    setBusy(false)
  }

  const viewPm2 = async () => {
    setBusy(true)
    prependSshLog('--- PM2 log (nostream) ---\r\n')
    const r = await window.htqlControl.pm2Logs()
    if (r.ok && r.out) prependSshLog(r.out)
    else prependSshLog(`${r.error ?? ''}\r\n`)
    setBusy(false)
  }

  const restartPm2 = async () => {
    setBusy(true)
    prependSshLog('--- Khởi động lại PM2 ---\r\n')
    const r = await window.htqlControl.pm2Restart()
    if (r.ok && r.out) prependSshLog(r.out)
    else prependSshLog(`${r.error ?? ''}\r\n`)
    setBusy(false)
  }

  return (
    <div className="flex h-screen min-h-[760px] flex-col bg-gradient-to-br from-panel via-[#1e160a] to-panel text-gold-100">
      <header className="drag-region flex h-9 shrink-0 items-center justify-between border-b border-gold-800/40 bg-gradient-to-r from-[#2a1f0d] to-[#1a1408] px-2.5">
        <div className="flex items-center gap-1.5">
          <Server className="no-drag h-4 w-4 text-gold-400" strokeWidth={1.75} />
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-bold tracking-tight text-gold-100">HTQL_550 Server</span>
            {VER ? <span className="text-[11px] font-medium text-gold-500">Phiên bản {VER}</span> : null}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={`no-drag max-w-[220px] truncate text-xs font-medium ${conn.mode === 'offline' ? 'text-rose-400' : 'text-emerald-400'}`}
            title={connLabel(conn)}
          >
            {connLabel(conn)}
          </span>
          <button
            type="button"
            className="no-drag rounded-md p-1 text-gold-400 hover:bg-gold-900/40"
            onClick={() => window.htqlControl.getConnection().then(setConn)}
            title="Làm mới kết nối"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="no-drag rounded-md p-1 text-gold-400 hover:bg-gold-900/40"
            onClick={() => window.htqlControl.minimize()}
            title="Thu nhỏ"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="no-drag rounded-md p-1 text-gold-400 hover:bg-gold-900/40"
            onClick={() => window.htqlControl.toggleMaximize()}
            title="Phóng to / khôi phục"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="no-drag rounded-md p-1 text-gold-400 hover:bg-gold-900/40"
            onClick={() => window.htqlControl.close()}
            title="Đóng"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-row">
        <main className="min-w-0 flex-[0.92] overflow-hidden p-1.5">
          <div className="mx-auto flex h-full max-w-4xl flex-col gap-1.5">
            <section className="shrink-0 rounded-lg border border-gold-800/40 bg-panel2/80 p-2 shadow-inner">
              <h2 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-gold-300">
                <HardDrive className="h-4 w-4 text-gold-500" strokeWidth={1.75} />
                Đăng nhập SSH Ubuntu (sudo)
              </h2>
              <p className="mb-1 text-[10px] leading-snug text-gold-500">
                Dùng tài khoản có quyền <strong>sudo</strong> trên máy chủ (mặc định user <code>ubuntu</code>). Đường dẫn cài{' '}
                <code>/opt/htql550</code>, PM2, gói cập nhật <code>/opt/htql550/update/…</code> — cố định trong tool. MySQL (aaPanel)
                khớp biến <code>HTQL_MYSQL_*</code> trong <code>/opt/htql550/server/.env</code> — đọc/ghi qua SSH (đổi mật khẩu → bấm
                Ghi lên server + PM2).
              </p>
              <div className="grid max-w-md grid-cols-2 gap-x-2 gap-y-1">
                {field('User Ubuntu (SSH + sudo)', 'ubuntuUser')}
                {field('Mật khẩu', 'ubuntuPassword', 'password')}
              </div>
              <div className="mt-2 rounded border border-gold-800/35 bg-gold-950/20 p-2">
                <h3 className="mb-1 flex items-center gap-1 text-xs font-bold text-gold-300">
                  <Database className="h-3.5 w-3.5" /> MySQL (HTQL_MYSQL_* — đồng bộ server/.env)
                </h3>
                <p className="mb-1 text-[10px] leading-snug text-gold-500">
                  Tạo database và user trên <strong>aaPanel</strong>. <strong>Đọc từ server</strong> tải toàn bộ <code>HTQL_MYSQL_*</code>{' '}
                  (kể cả mật khẩu) từ <code>server/.env</code> qua SSH. <strong>Ghi lên server</strong> cập nhật <code>.env</code>,{' '}
                  <code>.mysql_password</code> (backup cron) và <code>pm2 restart --update-env</code>.
                </p>
                <div className="grid max-w-2xl grid-cols-1 gap-x-2 gap-y-1 sm:grid-cols-2">
                  {field('MySQL host', 'mysqlHost')}
                  {field('MySQL cổng', 'mysqlPort')}
                  {field('Tên database', 'mysqlDatabase')}
                  {field('User đăng nhập', 'mysqlUser')}
                  {field('Mật khẩu MySQL', 'mysqlPassword', 'password')}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <button
                    type="button"
                    disabled={busy || conn.mode === 'offline'}
                    className={btnSecondary + ' py-0.5 text-[10px]'}
                    onClick={() => void pullMysqlFromServer()}
                    title="SSH: cat server/.env"
                  >
                    Đọc từ server
                  </button>
                  <button
                    type="button"
                    disabled={busy || conn.mode === 'offline'}
                    className={btnSecondary + ' py-0.5 text-[10px]'}
                    onClick={() => void pushMysqlToServer()}
                    title="SSH: ghi .env + PM2"
                  >
                    Ghi lên server + PM2
                  </button>
                </div>
                {conn.mode === 'offline' ? (
                  <p className="mt-1 text-[10px] text-gold-500">Cần Smart Connect (LAN/WAN) để SSH/MySQL.</p>
                ) : serverMeta ? (
                  <div className="mt-1.5 grid max-w-lg grid-cols-1 gap-0.5 border-t border-gold-800/30 pt-1.5 font-mono text-[10px] text-amber-100/90 sm:grid-cols-2">
                    <div className="sm:col-span-2 text-[10px] font-medium text-gold-500">Xác minh qua API (/api/htql-meta)</div>
                    <div>
                      <span className="text-gold-500">Lưu trữ: </span>
                      {String(serverMeta.storageBackend ?? '—')}
                    </div>
                    <div>
                      <span className="text-gold-500">User (API): </span>
                      {String(serverMeta.mysqlUser ?? '—')}
                    </div>
                    <div>
                      <span className="text-gold-500">Host: </span>
                      {String(serverMeta.mysqlHost ?? '—')}
                    </div>
                    <div>
                      <span className="text-gold-500">Cổng: </span>
                      {String(serverMeta.mysqlPort ?? '3306')}
                    </div>
                    <div>
                      <span className="text-gold-500">Database: </span>
                      {String(serverMeta.mysqlDatabase ?? '—')}
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-gold-500">Mô tả DB: </span>
                      {String(serverMeta.pathCoSoDuLieu ?? '—')}
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-[10px] text-gold-500">Chưa tải được meta — đợi làm mới tình trạng.</p>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                <button type="button" disabled={busy} className={btnPrimary} onClick={saveCfg}>
                  <Save className="h-3.5 w-3.5" /> Lưu cấu hình
                </button>
                <button type="button" disabled={busy} className={btnSecondary} onClick={viewPm2}>
                  <Terminal className="h-3.5 w-3.5" /> Xem log PM2
                </button>
                <button type="button" disabled={busy} className={btnSecondary} onClick={restartPm2}>
                  <RefreshCw className="h-3.5 w-3.5" /> Khởi động lại PM2
                </button>
              </div>
            </section>

            <div className="grid min-h-0 shrink-0 grid-cols-1 gap-1.5 lg:grid-cols-2">
              <section className="rounded-lg border border-gold-800/40 bg-panel2/80 p-2 shadow-inner">
                <h3 className="mb-1 flex items-center gap-1.5 text-xs font-bold text-gold-300">
                  <Download className="h-4 w-4" /> Cập nhật phần mềm server
                </h3>
                <p className="mb-1 font-mono text-[10px] leading-snug text-gold-300">
                  Đích SFTP: <span className="text-amber-200">{REMOTE_SERVER_ZIP_PATH}</span>
                  <br />
                  Bản sao zip (update): <span className="text-amber-200/90">{DISPLAY_PATH_SERVER_UPDATE}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    className={btnPick}
                    onClick={async () => {
                      const p = await window.htqlControl.openFile({
                        filters: [{ name: 'Zip', extensions: ['zip'] }],
                      })
                      if (p) setZipUpdate(p)
                    }}
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Chọn .zip
                  </button>
                  <span className="max-w-[160px] truncate text-xs text-gold-400" title={zipUpdate}>
                    {zipUpdate ? zipUpdate.split(/[/\\]/).pop() : 'Chưa chọn'}
                  </span>
                </div>
                <button type="button" disabled={busy} className={`${btnPrimary} mt-1.5 w-full py-1.5`} onClick={runUpdate}>
                  Chạy cập nhật server
                </button>
              </section>

              <section className="rounded-lg border border-gold-800/40 bg-panel2/80 p-2 shadow-inner">
                <h3 className="mb-1 flex items-center gap-1.5 text-xs font-bold text-gold-300">
                  <Laptop className="h-4 w-4" /> Cập nhật máy trạm (client)
                </h3>
                <p className="mb-1 font-mono text-[10px] leading-snug text-gold-300">
                  Đích trên server: <span className="text-amber-200">{DISPLAY_PATH_CLIENT_UPDATE}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    className={btnPick}
                    onClick={async () => {
                      const p = await window.htqlControl.openFile({
                        filters: [
                          { name: 'Installer', extensions: ['exe', 'dmg'] },
                          { name: 'Tất cả', extensions: ['*'] },
                        ],
                      })
                      if (p) {
                        setInstallerPath(p)
                        void window.htqlControl.setSettings({ lastClientInstallerPath: p })
                        setSettings((s) => ({ ...s, lastClientInstallerPath: p }))
                      }
                    }}
                  >
                    <FileUp className="h-3.5 w-3.5" />
                    Chọn .exe / .dmg
                  </button>
                  <span className="max-w-[140px] truncate text-[10px] text-gold-400" title={installerPath}>
                    {installerPath ? installerPath.split(/[/\\]/).pop() : 'Chưa chọn'}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  className={`${btnPrimary} mt-1.5 w-full py-1.5`}
                  onClick={runClientInstaller}
                >
                  Tải lên gói cài &amp; tạo manifest
                </button>
              </section>
            </div>

            <section className="flex min-h-[160px] shrink-0 flex-col rounded-lg border border-gold-800/40 bg-panel2/80 p-2 shadow-inner">
              <div className="mb-0.5 flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-emerald-300/95">Tình trạng HTQL_550 trên server (SSH)</h3>
                <button
                  type="button"
                  disabled={busy || conn.mode === 'offline'}
                  className={btnSecondary + ' py-0.5 text-[10px]'}
                  onClick={() => void refreshServerStatus()}
                >
                  <RefreshCw className="h-3 w-3" /> Làm mới
                </button>
              </div>
              <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-snug text-gold-100/90">
                {conn.mode === 'offline'
                  ? 'Offline — cần Smart Connect + API máy chủ.'
                  : !statusReady
                    ? 'Đang tải…'
                    : statusBlock}
              </pre>
            </section>
          </div>
        </main>

        <div className="flex min-h-0 min-w-0 flex-[1.2] flex-row border-l border-gold-800/40 bg-[#120d06]">
          <aside className="flex w-[min(100%,268px)] shrink-0 flex-col border-r border-gold-800/40 bg-[#0e0a05]">
            <div className="shrink-0 border-b border-gold-800/40 px-2 py-1">
              <div className="text-[11px] font-bold text-amber-200/95">Máy trạm (API)</div>
              <p className="mt-0.5 text-[9px] leading-tight text-gold-500">
                Phiên bản tham chiếu (build web): {expectedWebVersion || '—'}. Client Windows/macOS gửi phiên bản qua header khi gọi
                API.
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2 text-[10px]">
              {conn.mode === 'offline' ? (
                <p className="text-gold-500">Cần Smart Connect.</p>
              ) : registryError ? (
                <p className="text-rose-400">{registryError}</p>
              ) : registryRowsDeduped.length === 0 ? (
                <p className="text-gold-500">
                  Chưa có máy trạm. Mở HTQL_550 (bản cài đặt Windows/macOS) trỏ tới máy chủ (API cổng 3001).
                </p>
              ) : (
                registryRowsDeduped.map((row) => {
                  const light = workstationLight(row)
                  const old = isVersionOlder(row.clientVersion || '', expectedWebVersion)
                  const rk = row.clientKey || row.ip
                  return (
                    <div key={rk} className="rounded border border-gold-800/45 bg-gold-950/25 px-1.5 py-1.5">
                      <div className="flex items-start gap-1.5">
                        <span
                          className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full shadow-inner"
                          style={{
                            backgroundColor: light.bg,
                            boxShadow: light.bg === '#22c55e' ? '0 0 6px #22c55e' : 'none',
                          }}
                          title={light.title}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-medium text-gold-300">{row.hostname?.trim() || '—'}</div>
                          <div className="font-mono text-[11px] text-gold-200">{row.ip}</div>
                          <div
                            className="mt-0.5 font-mono text-[10px] tabular-nums"
                            style={
                              old
                                ? { color: '#e8c547', textShadow: '0 0 1px rgba(184,134,11,0.9)' }
                                : { color: 'rgba(212, 175, 55, 0.85)' }
                            }
                          >
                            Phiên bản: {row.clientVersion?.trim() || '(chưa gửi)'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-[1.1] flex-col border-b border-gold-800/40">
              <div className="shrink-0 border-b border-gold-900/40 px-2 py-0.5 text-[11px] font-bold text-gold-300">
                Nhật ký thao tác SSH / máy trạm (mới nhất trên cùng)
              </div>
              {uploadLine ? (
                <div className="shrink-0 border-b border-gold-900/50 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                  {uploadLine}
                </div>
              ) : null}
              <pre
                ref={logRef}
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words p-2 font-mono text-[10px] leading-relaxed text-gold-100/95"
              >
                {log}
              </pre>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 border-b border-gold-900/40 px-2 py-0.5 text-[11px] font-bold text-sky-300/95">
                Log hệ thống Ubuntu (journal — dòng mới trước)
              </div>
              <pre
                ref={journalRef}
                className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words p-2 font-mono text-[10px] leading-snug text-gold-100/90"
              >
                {conn.mode === 'offline' ? '—' : !journalReady ? 'Đang tải…' : journalText}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
