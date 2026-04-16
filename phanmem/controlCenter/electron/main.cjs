/**
 * HTQL_550 Server — Electron main (frameless, không menu, SSH + sudo -S)
 */
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { execFile } = require('child_process')
const http = require('http')
const https = require('https')
const net = require('net')
const { URL } = require('url')
const { Client } = require('ssh2')

const IP_LAN = '192.168.1.68'
const IP_WAN = '14.224.152.48'
const MONITOR_MS = 15_000

/** Gốc cài HTQL trên Ubuntu; gói cập nhật server/client: …/update/ (không dùng /ssd_2tb cho update). */
const REMOTE_HTQL_ROOT = '/opt/htql550'
const PATH_UPDATE_SERVER = `${REMOTE_HTQL_ROOT}/update/server`
const PATH_UPDATE_CLIENT = `${REMOTE_HTQL_ROOT}/update/client`
const PATH_BACKUP_DF = '/hdd_4tb/htql_550/backup_dulieu'
const PATH_BACKUP_CT = '/hdd_4tb/htql_550/backup_ct_tk'
const PATH_BACKUP_LEGACY = '/hdd_4tb/backup'

let mainWindow = null
let connectionState = { mode: 'offline', host: null }
let monitorTimer = null
let activeShell = null

function settingsPath() {
  return path.join(app.getPath('userData'), 'htql-settings.json')
}

/** Chuẩn triển khai — không cần nhập trong UI (chỉ user + mật khẩu). */
const REMOTE_INSTALL_DIR = '/tmp'
const PM2_APP_NAME = 'htql550-api'

function defaultSettings() {
  return {
    ubuntuUser: 'ubuntu',
    ubuntuPassword: '',
    workstations: [],
    lastClientInstallerPath: '',
    mysqlHost: '127.0.0.1',
    mysqlPort: '3306',
    mysqlDatabase: 'htql_550_db',
    mysqlUser: 'htql_550',
    mysqlPassword: '',
  }
}

function loadSettings() {
  try {
    const raw = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'))
    const def = defaultSettings()
    const out = { ...def }
    for (const k of Object.keys(def)) {
      if (k in raw && raw[k] !== undefined) out[k] = raw[k]
    }
    return out
  } catch {
    return defaultSettings()
  }
}

function saveSettings(data) {
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true })
  const merged = { ...loadSettings(), ...data }
  delete merged.pgPassword
  delete merged.pgDbUser
  delete merged.pgDbName
  delete merged.installNode
  delete merged.installPostgresql
  fs.writeFileSync(settingsPath(), JSON.stringify(merged, null, 2), 'utf8')
}

function pingHost(ip) {
  return new Promise((resolve) => {
    execFile('ping', ['-n', '1', '-w', '3000', ip], { windowsHide: true }, (err, stdout) => {
      if (err) return resolve(false)
      resolve(/Reply from|Trả lời từ|TTL=/i.test(String(stdout)))
    })
  })
}

async function refreshConnection() {
  const lan = await pingHost(IP_LAN)
  if (lan) connectionState = { mode: 'lan', host: IP_LAN }
  else {
    const wan = await pingHost(IP_WAN)
    if (wan) connectionState = { mode: 'wan', host: IP_WAN }
    else connectionState = { mode: 'offline', host: null }
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('connection:update', connectionState)
  }
}

function getSshConnectOptions() {
  const s = loadSettings()
  const host = connectionState.host
  if (!host) throw new Error('Mất kết nối Smart Connect (đèn đỏ).')
  const pw = (s.ubuntuPassword || '').trim()
  if (!pw) throw new Error('Nhập mật khẩu Ubuntu (dùng cho SSH và sudo).')
  return {
    host,
    port: 22,
    username: (s.ubuntuUser || 'ubuntu').trim(),
    password: pw,
    readyTimeout: 30_000,
    keepaliveInterval: 10_000,
  }
}

function connectSsh() {
  return new Promise((resolve, reject) => {
    const conn = new Client()
    conn.on('ready', () => resolve(conn)).on('error', reject)
    try {
      conn.connect(getSshConnectOptions())
    } catch (e) {
      reject(e)
    }
  })
}

function sendLog(event, chunk) {
  if (event && event.sender && !event.sender.isDestroyed()) {
    event.sender.send('ssh:log', chunk)
  }
}

/**
 * Chạy lệnh SSH và stream log về renderer.
 * Dùng PTY mặc định để tránh buffer stdout/stderr (không TTY → apt/bash thường chỉ flush khi hết tiến trình).
 * @param {import('ssh2').Client | null} existingConn — nếu có: không mở session mới, không gọi conn.end() khi xong.
 */
function sshExecStream(event, cmd, opts = {}, existingConn = null) {
  const usePty = opts.pty !== false
  const execOpts = usePty
    ? {
        pty: true,
        env: { TERM: 'xterm-256color', LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' },
      }
    : {}
  const closeConn = !existingConn && opts.closeConnection !== false
  const run = (conn) =>
    new Promise((resolve, reject) => {
      conn.exec(cmd, execOpts, (err, stream) => {
        if (err) {
          if (closeConn) conn.end()
          return reject(err)
        }
        let out = ''
        let exitCode = 0
        const onData = (d) => {
          const s = d.toString('utf8')
          out += s
          sendLog(event, s)
        }
        stream.on('data', onData)
        if (stream.stderr) stream.stderr.on('data', onData)
        stream.on('exit', (code, signal) => {
          if (code != null) exitCode = code
          else if (signal) exitCode = 1
        })
        stream.on('close', () => {
          if (closeConn) conn.end()
          resolve({ code: exitCode, out })
        })
      })
    })
  if (existingConn) return run(existingConn)
  return connectSsh().then((conn) => run(conn)).catch((e) => Promise.reject(e))
}

function escapeSingleQuotes(s) {
  return String(s).replace(/'/g, "'\"'\"'")
}

/** @param {string} content */
function parseMysqlFromEnv(content) {
  const out = {
    mysqlHost: '127.0.0.1',
    mysqlPort: '3306',
    mysqlDatabase: '',
    mysqlUser: '',
    mysqlPassword: '',
  }
  if (!content || typeof content !== 'string') return out
  for (const line of content.replace(/\r\n/g, '\n').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq < 1) continue
    const key = t.slice(0, eq).trim()
    const val = t.slice(eq + 1)
    switch (key) {
      case 'HTQL_MYSQL_HOST':
        out.mysqlHost = val.trim() || '127.0.0.1'
        break
      case 'HTQL_MYSQL_PORT':
        out.mysqlPort = val.trim() || '3306'
        break
      case 'HTQL_MYSQL_DATABASE':
        out.mysqlDatabase = val.trim()
        break
      case 'HTQL_MYSQL_USER':
        out.mysqlUser = val.trim()
        break
      case 'HTQL_MYSQL_PASSWORD':
        out.mysqlPassword = val
        break
      default:
        break
    }
  }
  return out
}

/**
 * @param {string} src
 * @param {{ mysqlHost: string, mysqlPort: string, mysqlDatabase: string, mysqlUser: string, mysqlPassword: string }} fields
 */
function mergeMysqlIntoEnvContent(src, fields) {
  const keys = {
    HTQL_MYSQL_HOST: String(fields.mysqlHost ?? '').trim() || '127.0.0.1',
    HTQL_MYSQL_PORT: String(fields.mysqlPort ?? '3306').trim() || '3306',
    HTQL_MYSQL_DATABASE: String(fields.mysqlDatabase ?? '').trim(),
    HTQL_MYSQL_USER: String(fields.mysqlUser ?? '').trim(),
    HTQL_MYSQL_PASSWORD: String(fields.mysqlPassword ?? ''),
  }
  const lines = (src || '').replace(/\r\n/g, '\n').split('\n')
  const kept = []
  for (const line of lines) {
    const t = line.trim()
    const eq = t.indexOf('=')
    if (eq > 0) {
      const k = t.slice(0, eq).trim()
      if (Object.prototype.hasOwnProperty.call(keys, k)) continue
    }
    kept.push(line)
  }
  const block = Object.keys(keys).map((k) => `${k}=${keys[k]}`)
  const body = kept.join('\n').replace(/\s+$/, '')
  return body ? `${body}\n\n${block.join('\n')}\n` : `${block.join('\n')}\n`
}

function httpGetJson(urlStr, timeoutMs = 5000) {
  return new Promise((resolve) => {
    let u
    try {
      u = new URL(urlStr)
    } catch (e) {
      return resolve({ ok: false, error: String(e.message || e) })
    }
    const lib = u.protocol === 'https:' ? https : http
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method: 'GET',
        timeout: timeoutMs,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'HTQL-Control-Center/2.5',
        },
      },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (c) => {
          body += c
        })
        res.on('end', () => {
          const sc = res.statusCode ?? 0
          const trimmed = body.trim()
          const looksHtml =
            /^<!DOCTYPE|<html[\s>]/i.test(trimmed) ||
            (trimmed.startsWith('<') && /<body|Cannot GET/i.test(trimmed))
          const htmlHint =
            'Phản hồi HTML (thường là proxy/Nginx hoặc không phải API Node :3001 — kiểm tra PM2 `htql550-api`).'
          if (sc >= 400) {
            if (looksHtml) {
              return resolve({ ok: false, error: `HTTP ${sc}: ${htmlHint}` })
            }
            try {
              const j = JSON.parse(body)
              const msg = j && typeof j === 'object' && j.error ? String(j.error) : body.slice(0, 300)
              return resolve({ ok: false, error: `HTTP ${sc}: ${msg}` })
            } catch {
              return resolve({ ok: false, error: `HTTP ${sc}: ${body.slice(0, 300)}` })
            }
          }
          try {
            const j = JSON.parse(body)
            resolve({ ok: true, status: res.statusCode, json: j })
          } catch {
            if (looksHtml) {
              return resolve({ ok: false, error: htmlHint })
            }
            resolve({ ok: true, status: res.statusCode, text: body.slice(0, 800) })
          }
        })
      }
    )
    req.on('error', (e) => resolve({ ok: false, error: String(e.message || e) }))
    req.on('timeout', () => {
      req.destroy()
      resolve({ ok: false, error: 'timeout' })
    })
    req.end()
  })
}

/** HTTP timeout: Windows -> Smart Connect host:3001 */
const HTQL_API_HTTP_TIMEOUT_MS = 12_000
/** SSH curl timeout (localhost API on Ubuntu) */
const HTQL_API_SSH_CURL_TIMEOUT_MS = 35_000

function shouldTrySshApiFallback(httpError) {
  const err = String(httpError || '')
  if (err === 'timeout') return true
  // LAN :3001 may return HTML (wrong proxy, missing route) -- try 127.0.0.1 via SSH (PM2 API).
  if (/proxy\/Nginx/i.test(err)) return true
  return /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EHOSTUNREACH|ENETUNREACH|getaddrinfo|socket hang up/i.test(
    err,
  )
}

/** GET JSON from Node API: direct HTTP first, then curl 127.0.0.1 via SSH if unreachable. */
async function fetchJsonFromServerWithSshFallback(apiPath) {
  const host = connectionState.host
  if (!host) return { ok: false, error: 'Smart Connect offline.' }
  const url = `http://${host}:3001${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`
  const direct = await httpGetJson(url, HTQL_API_HTTP_TIMEOUT_MS)
  if (direct.ok) return direct
  const err0 = 'error' in direct ? String(direct.error) : 'unknown'
  if (!shouldTrySshApiFallback(err0)) return direct

  // No curl -f: non-2xx still returns body (JSON or HTML); -f would exit 22 before we read it.
  const inner = `curl -sS --connect-timeout 8 --max-time 25 "http://127.0.0.1:3001${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}"`
  const cmd = `bash -lc ${JSON.stringify(inner)}`
  const r = await sshExecInternal(cmd, HTQL_API_SSH_CURL_TIMEOUT_MS)
  if (r.error) {
    return {
      ok: false,
      error: `${err0} | qua SSH: ${r.error}`,
    }
  }
  if (r.code !== 0) {
    const tail = (r.out || '').trim().slice(0, 280)
    return {
      ok: false,
      error: `${err0} | qua SSH: curl thoát mã ${r.code}${tail ? `: ${tail}` : ''}`,
    }
  }
  const body = (r.out || '').trim()
  try {
    const j = JSON.parse(body)
    return { ok: true, status: 200, json: j }
  } catch {
    const hint =
      /^<!DOCTYPE|<html[\s>]/i.test(body) || (body.startsWith('<') && /Cannot GET|body/i.test(body))
        ? ' — Server returned HTML (missing route or wrong process). Deploy new htql_server zip; pm2 restart htql550-api --update-env.'
        : ''
    return {
      ok: false,
      error: `${err0} | qua SSH: không parse được JSON (${body.slice(0, 120)}…).${hint}`,
    }
  }
}

function tcpProbe(host, port, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const sock = net.createConnection({ host, port, timeout: timeoutMs }, () => {
      sock.end()
      resolve({ ok: true })
    })
    sock.on('error', (e) => resolve({ ok: false, error: String(e.message || e) }))
    sock.on('timeout', () => {
      sock.destroy()
      resolve({ ok: false, error: 'timeout' })
    })
  })
}

function createWindow() {
  const iconPng = path.join(__dirname, '..', 'build', 'logo_nambac.png')
  const winOpts = {
    width: 1360,
    height: 880,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: '#1a1408',
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  }
  if (fs.existsSync(iconPng)) winOpts.icon = iconPng
  mainWindow = new BrowserWindow(winOpts)
  Menu.setApplicationMenu(null)
  mainWindow.once('ready-to-show', () => mainWindow.show())
  const dev = process.env.VITE_DEV === '1'
  if (dev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  refreshConnection()
  monitorTimer = setInterval(refreshConnection, MONITOR_MS)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (monitorTimer) clearInterval(monitorTimer)
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('connection:get', () => connectionState)
ipcMain.handle('settings:get', () => loadSettings())
ipcMain.handle('settings:set', (_, data) => {
  saveSettings(data)
  return loadSettings()
})

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize()
})
ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close()
})
ipcMain.handle('window:toggleMaximize', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isMaximized()) mainWindow.unmaximize()
  else mainWindow.maximize()
})

ipcMain.handle('dialog:openFile', async (_, opts) => {
  const r = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: opts?.filters || [],
  })
  return r.canceled ? null : r.filePaths[0]
})

ipcMain.handle('dialog:openDirectory', async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  return r.canceled ? null : r.filePaths[0]
})

ipcMain.handle('ssh:uploadFile', async (event, localPath, remotePath) => {
  const rp = String(remotePath).replace(/\\/g, '/')
  const parentDir = path.posix.dirname(rp)
  const mk = await sshExecInternal(`bash -lc ${JSON.stringify(`mkdir -p '${escapeSingleQuotes(parentDir)}'`)}`, 15000)
  if (mk.error) return { ok: false, error: `Không tạo được thư mục ${parentDir}: ${mk.error}` }
  let conn
  try {
    conn = await connectSsh()
  } catch (e) {
    return { ok: false, error: String(e.message || e) }
  }
  return new Promise((resolve) => {
    conn.sftp((err, sftp) => {
      if (err) {
        conn.end()
        return resolve({ ok: false, error: String(err.message || err) })
      }
      const stat = fs.statSync(localPath)
      const total = stat.size
      const t0 = Date.now()
      const step = (transferred) => {
        const pct = total ? Math.min(100, Math.round((transferred / total) * 100)) : 0
        const dt = (Date.now() - t0) / 1000
        const mbps = dt > 0 ? transferred / (1024 * 1024) / dt : 0
        event.sender.send('ssh:uploadProgress', { sent: transferred, total, pct, mbps })
      }
      sendLog(event, `Đang tải file… ${Math.round((stat.size / (1024 * 1024)) * 10) / 10} MB\r\n`)
      sftp.fastPut(localPath, remotePath, { step }, (err2) => {
        conn.end()
        if (err2) resolve({ ok: false, error: String(err2.message || err2) })
        else {
          sendLog(event, 'Đã tải xong file .zip.\r\n')
          resolve({ ok: true })
        }
      })
    })
  })
})

async function sshExecInternal(cmd, timeoutMs = 0) {
  let conn
  try {
    conn = await connectSsh()
  } catch (e) {
    return { code: null, out: '', error: String(e.message || e) }
  }
  return new Promise((resolve) => {
    let settled = false
    const timer =
      timeoutMs > 0
        ? setTimeout(() => {
            if (settled) return
            settled = true
            try {
              conn.end()
            } catch (_) {}
            resolve({ code: null, out: '', error: `SSH quá ${Math.round(timeoutMs / 1000)}s (timeout)` })
          }, timeoutMs)
        : null
    conn.exec(cmd, (err, stream) => {
      if (err) {
        if (timer) clearTimeout(timer)
        settled = true
        conn.end()
        return resolve({ code: null, out: '', error: String(err.message || err) })
      }
      let out = ''
      const onChunk = (d) => {
        out += d.toString('utf8')
      }
      stream.on('data', onChunk)
      if (stream.stderr) stream.stderr.on('data', onChunk)
      let exitCode = 0
      stream.on('exit', (code, signal) => {
        if (code != null) exitCode = code
        else if (signal) exitCode = 1
      })
      stream.on('close', () => {
        if (settled) return
        settled = true
        if (timer) clearTimeout(timer)
        conn.end()
        resolve({ code: exitCode, out })
      })
    })
  })
}

ipcMain.handle('ssh:exec', async (_, cmd) => sshExecInternal(cmd))

ipcMain.handle('ssh:pm2Restart', async () => {
  const s = loadSettings()
  const name = PM2_APP_NAME
  const cmd = `bash -lc 'export PATH="$HOME/.npm-global/bin:$PATH:/usr/local/bin"; echo "${escapeSingleQuotes(s.ubuntuPassword)}" | sudo -S -v 2>/dev/null; pm2 restart "${name}" || pm2 restart all'`
  const r = await sshExecInternal(cmd)
  if (r.error) return { ok: false, error: r.error, out: r.out }
  return { ok: true, out: r.out }
})

ipcMain.handle('ssh:pm2Logs', async () => {
  const name = PM2_APP_NAME
  const cmd = `bash -lc 'export PATH="$HOME/.npm-global/bin:$PATH:/usr/local/bin"; pm2 logs "${name}" --lines 400 --nostream 2>&1 || pm2 logs --lines 200 --nostream 2>&1'`
  const r = await sshExecInternal(cmd)
  if (r.error) return { ok: false, error: r.error, out: r.out }
  return { ok: true, out: r.out }
})

const JOURNAL_SHELL = `bash -lc ${JSON.stringify(`(journalctl -n 35 --no-pager -o short-iso 2>/dev/null || tail -n 35 /var/log/syslog 2>/dev/null || echo "(Không đọc được journal/syslog — thử quyền sudo trên server)")`)}`

ipcMain.handle('ssh:journalTail', async () => {
  try {
    const r = await sshExecInternal(JOURNAL_SHELL, 45_000)
    if (r.error) return { ok: false, error: r.error, text: '' }
    if (r.code !== 0) return { ok: false, error: `SSH thoát mã ${r.code}`, text: r.out || '' }
    const t = (r.out || '').trim()
    return { ok: true, text: t.length ? t : '(Trống)' }
  } catch (e) {
    return { ok: false, error: String(e.message || e), text: '' }
  }
})

const SSH_HEALTH_TIMEOUT_MS = 50_000

/** Kiểm tra trên chính máy chủ Ubuntu (SSH) — không liên quan tới localhost trên máy Windows. */
function buildHealthShell() {
  const root = escapeSingleQuotes(REMOTE_HTQL_ROOT)
  const pm2n = escapeSingleQuotes(PM2_APP_NAME)
  const bak = escapeSingleQuotes(PATH_BACKUP_DF)
  const updCl = escapeSingleQuotes(PATH_UPDATE_CLIENT)
  const inner = [
    'set +e',
    'export PATH="$HOME/.npm-global/bin:$PATH:/usr/local/bin"',
    'echo "=== HTQL_550 HEALTH $(date -Iseconds) ==="',
    `[ -d '${root}' ] && echo "installed_htql_dir=yes" || echo "installed_htql_dir=no"`,
    `[ -f '${root}/server/donViTinhServer.js' ] && echo "installed_api_file=yes" || echo "installed_api_file=no"`,
    `( command -v pm2 >/dev/null 2>&1 && pm2 describe '${pm2n}' 2>/dev/null | grep -qE "status.*online" && echo "pm2_status=online" ) || ( command -v pm2 >/dev/null 2>&1 && echo "pm2_status=not_online" ) || echo "pm2_status=no_pm2"`,
    'echo "--- RAM ---"',
    'free -h | head -4',
    `echo "--- disk gốc cài HTQL ---"`,
    `df -h '${root}' 2>/dev/null | tail -1 || echo "df_htql=error"`,
    `echo "--- (Tuỳ chọn) SSD 2TB ---"`,
    `df -h /ssd_2tb/htql_550 2>/dev/null | tail -1 || echo "Không mount /ssd_2tb/htql_550"`,
    `echo "--- HDD backup ${PATH_BACKUP_DF} ---"`,
    `df -h '${bak}' 2>/dev/null | tail -1 || echo "df_backup=error"`,
    'echo "--- API Node trên máy chủ (PM2, 127.0.0.1:3001) ---"',
    `( command -v ss >/dev/null 2>&1 && ss -tlnp 2>/dev/null | grep -qE ':3001\\b' && echo "api_listen=yes" ) || echo "api_listen=no"`,
    'CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://127.0.0.1:3001/api/htql-meta 2>/dev/null)',
    `[ "$CODE" = "200" ] && echo "api_http=ok" || echo "api_http=fail code=$CODE"`,
    `echo "--- Gói client (update dưới ${REMOTE_HTQL_ROOT}/update/client) ---"`,
    `ls -la '${updCl}' 2>/dev/null | tail -n 5 || echo "(chưa có)"`,
  ].join('; ')
  return `bash -lc ${JSON.stringify(inner)}`
}

ipcMain.handle('ssh:serverHealth', async () => {
  try {
    const cmd = buildHealthShell()
    const r = await sshExecInternal(cmd, SSH_HEALTH_TIMEOUT_MS)
    if (r.error) return { ok: false, error: r.error, text: '' }
    if (r.code !== 0) return { ok: false, error: `SSH thoát mã ${r.code}`, text: r.out || '' }
    const t = (r.out || '').trim()
    return { ok: true, text: t.length ? t : '(Không có dữ liệu)' }
  } catch (e) {
    return { ok: false, error: String(e.message || e), text: '' }
  }
})

ipcMain.handle('api:fetchHtqlClientRegistry', async () => {
  const host = connectionState.host
  if (!host) return { ok: false, error: 'Smart Connect offline — không gọi được API máy chủ.' }
  return fetchJsonFromServerWithSshFallback('/api/htql-client-registry')
})

ipcMain.handle('api:fetchHtqlMeta', async () => {
  if (!connectionState.host) return { ok: false, error: 'Smart Connect offline.' }
  return fetchJsonFromServerWithSshFallback('/api/htql-meta')
})

ipcMain.handle('api:fetchMysqlTables', async () => {
  if (!connectionState.host) return { ok: false, error: 'Smart Connect offline.' }
  return fetchJsonFromServerWithSshFallback('/api/htql-mysql-tables')
})

ipcMain.handle('ssh:pullMysqlEnv', async () => {
  const envPath = `${REMOTE_HTQL_ROOT}/server/.env`
  const inner = `test -f '${escapeSingleQuotes(envPath)}' && cat '${escapeSingleQuotes(envPath)}' || echo ''`
  const cmd = `bash -lc ${JSON.stringify(inner)}`
  try {
    const r = await sshExecInternal(cmd, 25_000)
    if (r.error) return { ok: false, error: r.error }
    if (r.code !== 0) return { ok: false, error: r.out?.trim() || `SSH thoát mã ${r.code}` }
    const fields = parseMysqlFromEnv(r.out || '')
    return { ok: true, fields }
  } catch (e) {
    return { ok: false, error: String(e.message || e) }
  }
})

ipcMain.handle('ssh:pushMysqlEnv', async (event, payload) => {
  const fields = {
    mysqlHost: String(payload?.mysqlHost ?? '').trim(),
    mysqlPort: String(payload?.mysqlPort ?? '3306').trim() || '3306',
    mysqlDatabase: String(payload?.mysqlDatabase ?? '').trim(),
    mysqlUser: String(payload?.mysqlUser ?? '').trim(),
    mysqlPassword: String(payload?.mysqlPassword ?? ''),
  }
  if (!fields.mysqlDatabase || !fields.mysqlUser) {
    return { ok: false, error: 'Thiếu tên database hoặc user MySQL (HTQL_MYSQL_DATABASE / HTQL_MYSQL_USER).' }
  }
  const envPath = `${REMOTE_HTQL_ROOT}/server/.env`
  const root = REMOTE_HTQL_ROOT
  const s = loadSettings()
  const pw = (s.ubuntuPassword || '').trim()
  if (!pw) return { ok: false, error: 'Cần mật khẩu Ubuntu (sudo) để ghi file trên máy chủ.' }

  const cat = await sshExecInternal(`bash -lc ${JSON.stringify(`test -f '${escapeSingleQuotes(envPath)}' && cat '${escapeSingleQuotes(envPath)}' || echo ''`)}`, 25_000)
  if (cat.error) return { ok: false, error: cat.error }
  if (cat.code !== 0) return { ok: false, error: cat.out?.trim() || `Không đọc được .env (mã ${cat.code})` }

  const merged = mergeMysqlIntoEnvContent(cat.out || '', fields)
  const tmpLocal = path.join(app.getPath('temp'), `htql_env_${Date.now()}.env`)
  fs.writeFileSync(tmpLocal, merged, 'utf8')

  const remoteTmp = `${REMOTE_INSTALL_DIR.replace(/\/$/, '')}/htql550_env_push_${Date.now()}.env`
  let conn
  try {
    conn = await connectSsh()
  } catch (e) {
    try {
      fs.unlinkSync(tmpLocal)
    } catch (_) {}
    return { ok: false, error: String(e.message || e) }
  }

  try {
    await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err)
        sftp.fastPut(tmpLocal, remoteTmp, (e2) => {
          if (e2) return reject(e2)
          resolve(undefined)
        })
      })
    })
  } catch (e) {
    try {
      conn.end()
    } catch (_) {}
    try {
      fs.unlinkSync(tmpLocal)
    } catch (_) {}
    return { ok: false, error: String(e.message || e) }
  }
  try {
    fs.unlinkSync(tmpLocal)
  } catch (_) {}

  const b64pw = Buffer.from(fields.mysqlPassword, 'utf8').toString('base64')
  const pm2n = escapeSingleQuotes(PM2_APP_NAME)
  const inner = [
    'set -e',
    `echo "${escapeSingleQuotes(pw)}" | sudo -S -v`,
    `sudo cp '${escapeSingleQuotes(remoteTmp)}' '${escapeSingleQuotes(envPath)}'`,
    `sudo chmod 600 '${escapeSingleQuotes(envPath)}' || true`,
    `echo '${b64pw}' | base64 -d | sudo tee '${escapeSingleQuotes(root)}/.mysql_password' > /dev/null`,
    `sudo chmod 600 '${escapeSingleQuotes(root)}/.mysql_password'`,
    `rm -f '${escapeSingleQuotes(remoteTmp)}'`,
    'export PATH="$HOME/.npm-global/bin:$PATH:/usr/local/bin"',
    `pm2 restart ${pm2n} --update-env || pm2 restart all --update-env`,
    'echo OK_MYSQL_ENV',
  ].join('; ')
  const cmd = `bash -lc ${JSON.stringify(inner)}`
  sendLog(event, '--- Ghi HTQL_MYSQL_* → server/.env, .mysql_password, PM2 --update-env ---\r\n')
  try {
    const r = await new Promise((resolve, reject) => {
      conn.exec(cmd, (e3, stream) => {
        if (e3) {
          conn.end()
          return reject(e3)
        }
        let out = ''
        stream.on('data', (d) => {
          const t = d.toString('utf8')
          out += t
          sendLog(event, t)
        })
        if (stream.stderr) stream.stderr.on('data', (d) => sendLog(event, d.toString('utf8')))
        stream.on('close', () => {
          conn.end()
          resolve(out)
        })
      })
    })
    const ok = String(r).includes('OK_MYSQL_ENV')
    return { ok, out: String(r), code: ok ? 0 : 1 }
  } catch (e) {
    try {
      conn.end()
    } catch (_) {}
    return { ok: false, error: String(e.message || e) }
  }
})

ipcMain.handle('net:probeWorkstation', async (_, payload) => {
  const host = String(payload?.host || '').trim()
  const apiPort = Number(payload?.apiPort) || 3001
  const webPort = Number(payload?.webPort) || 80
  if (!host) return { ok: false, error: 'Thiếu host.' }
  const apiUrl = `http://${host}:${apiPort}/api/htql-meta`
  const webUrl = `http://${host}:${webPort}/`
  const [tcpApi, httpMeta, tcpWeb] = await Promise.all([
    tcpProbe(host, apiPort),
    httpGetJson(apiUrl, HTQL_API_HTTP_TIMEOUT_MS),
    tcpProbe(host, webPort),
  ])
  return {
    ok: true,
    host,
    tcpApi,
    tcpWeb,
    httpMeta,
    apiUrl,
    webUrl,
  }
})

const NGINX_WEB_ROOT_DEFAULT = '/var/www/htql'

ipcMain.handle('ssh:uploadClientFolder', async (event, localDir) => {
  if (!fs.existsSync(localDir)) return { ok: false, error: 'Thư mục không tồn tại.' }
  const s = loadSettings()
  const remoteWebRoot = NGINX_WEB_ROOT_DEFAULT
  const { execFileSync } = require('child_process')
  const tmp = path.join(app.getPath('temp'), `htql_client_${Date.now()}.tar.gz`)
  const remoteName = `htql_client_${Date.now()}.tar.gz`
  const remoteTmp = `/tmp/${remoteName}`
  const remoteArchive = `${PATH_UPDATE_CLIENT}/${remoteName}`
  try {
    execFileSync('tar', ['-czf', tmp, '-C', localDir, '.'], { windowsHide: true, stdio: 'ignore' })
  } catch (e) {
    return { ok: false, error: `tar: ${String(e.message || e)}` }
  }
  let conn
  try {
    conn = await connectSsh()
  } catch (e) {
    try {
      fs.unlinkSync(tmp)
    } catch (_) {}
    return { ok: false, error: String(e.message || e) }
  }
  return new Promise((resolve) => {
    conn.sftp((err, sftp) => {
      if (err) {
        conn.end()
        try {
          fs.unlinkSync(tmp)
        } catch (_) {}
        return resolve({ ok: false, error: String(err.message || err) })
      }
      const stat = fs.statSync(tmp)
      const total = stat.size
      const t0 = Date.now()
      const step = (transferred) => {
        const pct = total ? Math.min(100, Math.round((transferred / total) * 100)) : 0
        const dt = (Date.now() - t0) / 1000
        const mbps = dt > 0 ? transferred / (1024 * 1024) / dt : 0
        event.sender.send('ssh:uploadProgress', { sent: transferred, total, pct, mbps })
      }
      sendLog(event, `Đang tải gói client → ${PATH_UPDATE_CLIENT} …\r\n`)
      sftp.fastPut(tmp, remoteTmp, { step }, (err2) => {
        if (err2) {
          conn.end()
          try {
            fs.unlinkSync(tmp)
          } catch (_) {}
          return resolve({ ok: false, error: String(err2.message || err2) })
        }
        const ex = `bash -lc 'set -e; echo "${escapeSingleQuotes(s.ubuntuPassword)}" | sudo -S -v; sudo mkdir -p "${escapeSingleQuotes(PATH_UPDATE_CLIENT)}"; sudo mkdir -p "${escapeSingleQuotes(remoteWebRoot)}"; sudo cp "${escapeSingleQuotes(remoteTmp)}" "${escapeSingleQuotes(remoteArchive)}"; sudo tar -xzf "${escapeSingleQuotes(remoteArchive)}" -C "${escapeSingleQuotes(remoteWebRoot)}"; sudo rm -f "${escapeSingleQuotes(remoteTmp)}"; echo "OK: lưu bản lưu tại ${PATH_UPDATE_CLIENT} và giải nén vào Nginx."`
        conn.exec(ex, (e3, stream) => {
          let out = ''
          if (e3) {
            conn.end()
            try {
              fs.unlinkSync(tmp)
            } catch (_) {}
            return resolve({ ok: false, error: String(e3.message || e3) })
          }
          stream.on('data', (d) => {
            const t = d.toString('utf8')
            out += t
            sendLog(event, t)
          })
          if (stream.stderr) {
            stream.stderr.on('data', (d) => {
              const t = d.toString('utf8')
              out += t
              sendLog(event, t)
            })
          }
          stream.on('close', () => {
            conn.end()
            try {
              fs.unlinkSync(tmp)
            } catch (_) {}
            resolve({ ok: true, out })
          })
        })
      })
    })
  })
})

ipcMain.handle('ssh:listClientUpdateArtifacts', async () => {
  const inner = `echo "=== Bản client (update): ${PATH_UPDATE_CLIENT} ===" && ls -la '${PATH_UPDATE_CLIENT}' 2>/dev/null | tail -n 30 || echo "(chưa có thư mục hoặc không đọc được)"`
  const cmd = `bash -lc ${JSON.stringify(inner)}`
  try {
    const r = await sshExecInternal(cmd, 25_000)
    if (r.error) return { ok: false, error: r.error, text: '' }
    if (r.code !== 0) return { ok: false, error: `SSH thoát mã ${r.code}`, text: r.out || '' }
    const t = (r.out || '').trim()
    return { ok: true, text: t.length ? t : '(Trống)' }
  } catch (e) {
    return { ok: false, error: String(e.message || e), text: '' }
  }
})

/** Gói .exe / .dmg: SFTP → /tmp → sudo cp vào thư mục update client + manifest (SHA tính trên máy Windows) */
ipcMain.handle('ssh:uploadClientInstaller', async (event, localPath) => {
  if (!localPath || !fs.existsSync(localPath)) return { ok: false, error: 'File không tồn tại.' }
  const ext = path.extname(localPath).toLowerCase()
  if (ext !== '.exe' && ext !== '.dmg') return { ok: false, error: 'Chỉ hỗ trợ .exe hoặc .dmg' }
  const base = path.basename(localPath)
  if (!/^[\w.\- ()+\[\]]+\.(exe|dmg)$/i.test(base)) return { ok: false, error: 'Tên file không hợp lệ' }

  const s = loadSettings()
  const buf = fs.readFileSync(localPath)
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex')
  const ver = base.replace(/\.(exe|dmg)$/i, '')
  const tagM = ver.match(/V(\d{4})_(\d{2})_(\d{2})_(\d+)/i)
  const semverFromTag = tagM
    ? `${tagM[1]}.${parseInt(tagM[2], 10)}.${parseInt(tagM[3], 10)}-${tagM[4]}`
    : ''
  const manifestObj = {
    version: ver,
    semver: semverFromTag || undefined,
    latestFile: base,
    sha256,
    updatedAt: new Date().toISOString(),
  }
  const localManifest = path.join(app.getPath('temp'), `htql-manifest-${Date.now()}.json`)
  fs.writeFileSync(localManifest, JSON.stringify(manifestObj, null, 2), 'utf8')

  const safeBase = base.replace(/[^a-zA-Z0-9._-]/g, '_')
  const remoteInstaller = `/tmp/htql_inst_${Date.now()}_${safeBase}`
  const remoteManifest = `/tmp/htql-manifest-${Date.now()}.json`
  const destInstaller = `${PATH_UPDATE_CLIENT}/${base}`
  const destManifest = `${PATH_UPDATE_CLIENT}/htql-client-manifest.json`

  let conn
  try {
    conn = await connectSsh()
  } catch (e) {
    try {
      fs.unlinkSync(localManifest)
    } catch (_) {}
    return { ok: false, error: String(e.message || e) }
  }

  try {
    await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err)
        const stat = fs.statSync(localPath)
        const total = stat.size
        const t0 = Date.now()
        const step = (transferred) => {
          const pct = total ? Math.min(100, Math.round((transferred / total) * 100)) : 0
          const dt = (Date.now() - t0) / 1000
          const mbps = dt > 0 ? transferred / (1024 * 1024) / dt : 0
          event.sender.send('ssh:uploadProgress', { sent: transferred, total, pct, mbps })
        }
        sendLog(event, `Đang tải installer → ${remoteInstaller} …\r\n`)
        sftp.fastPut(localPath, remoteInstaller, { step }, (e1) => {
          if (e1) return reject(e1)
          sendLog(event, 'Đang tải manifest…\r\n')
          sftp.fastPut(localManifest, remoteManifest, {}, (e2) => {
            if (e2) return reject(e2)
            resolve()
          })
        })
      })
    })

    const inner = [
      'set -e',
      `echo "${escapeSingleQuotes(s.ubuntuPassword)}" | sudo -S -v`,
      `sudo mkdir -p ${escapeSingleQuotes(PATH_UPDATE_CLIENT)}`,
      `sudo cp ${escapeSingleQuotes(remoteInstaller)} ${escapeSingleQuotes(destInstaller)}`,
      `sudo cp ${escapeSingleQuotes(remoteManifest)} ${escapeSingleQuotes(destManifest)}`,
      `sudo rm -f ${escapeSingleQuotes(remoteInstaller)} ${escapeSingleQuotes(remoteManifest)}`,
      `sudo bash -c 'cd ${escapeSingleQuotes(PATH_UPDATE_CLIENT)} && shopt -s nullglob; ls -1t *.exe 2>/dev/null | tail -n +11 | xargs -r rm -f; ls -1t *.dmg 2>/dev/null | tail -n +11 | xargs -r rm -f'`,
      'echo OK',
    ].join('; ')
    const cmd = `bash -lc ${JSON.stringify(inner)}`
    const r = await new Promise((resolve, reject) => {
      conn.exec(cmd, (e3, stream) => {
        let out = ''
        if (e3) {
          conn.end()
          return reject(e3)
        }
        stream.on('data', (d) => {
          const t = d.toString('utf8')
          out += t
          sendLog(event, t)
        })
        if (stream.stderr) stream.stderr.on('data', (d) => sendLog(event, d.toString('utf8')))
        stream.on('close', () => {
          conn.end()
          resolve(out)
        })
      })
    })
    try {
      fs.unlinkSync(localManifest)
    } catch (_) {}
    return { ok: String(r).includes('OK'), out: String(r) }
  } catch (e) {
    try {
      conn.end()
    } catch (_) {}
    try {
      fs.unlinkSync(localManifest)
    } catch (_) {}
    return { ok: false, error: String(e.message || e) }
  }
})

ipcMain.handle('ssh:runServerUpdate', async (event, payload) => {
  const s = loadSettings()
  const f = String(payload?.extractedFolderName || '').trim()
  if (!/^htql_server_v[\d.]+$/i.test(f)) {
    return { ok: false, error: 'Tên thư mục trong gói zip không hợp lệ — chọn file htql_server_v….zip.' }
  }
  const installDir = REMOTE_INSTALL_DIR.replace(/\/$/, '')
  const remote = `${installDir}/htql_server_update.zip`
  const root = REMOTE_HTQL_ROOT
  const pw = (s.ubuntuPassword || '').trim()
  const pm2n = escapeSingleQuotes(PM2_APP_NAME)
  const inner = [
    'set -e',
    `echo "${escapeSingleQuotes(pw)}" | sudo -S -v`,
    'echo ">>> [Update 1/7] apt update + upgrade (Ubuntu)..."',
    'sudo mkdir -p /etc/apt/apt.conf.d',
    'printf "%s\\n" "Acquire::Retries \\"3\\";" "Acquire::http::Timeout \\"20\\";" "Acquire::https::Timeout \\"20\\";" "Acquire::ForceIPv4 \\"true\\";" | sudo tee /etc/apt/apt.conf.d/99htql-network >/dev/null',
    'i=0; until sudo DEBIAN_FRONTEND=noninteractive apt-get update -y; do i=$((i+1)); [ "$i" -ge 3 ] && { echo "apt-get update failed after 3 tries"; exit 1; }; echo "apt-get update retry $i/3..."; sleep 5; done',
    'sudo DEBIAN_FRONTEND=noninteractive apt-get -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" upgrade',
    'echo ">>> [Update 2/7] Cài unzip (nếu thiếu)..."',
    'sudo DEBIAN_FRONTEND=noninteractive apt-get install -y unzip',
    `echo ">>> [Update 3/7] Giải nén gói từ ${remote}..."`,
    `unzip -o '${escapeSingleQuotes(remote)}' -d /tmp || { U=$?; [ "$U" -le 1 ] || exit "$U"; }`,
    'echo ">>> [Update 4/7] rsync mã server + package.json gốc (webAppVersion)..."',
    `sudo rsync -a /tmp/${escapeSingleQuotes(f)}/server/ ${escapeSingleQuotes(root)}/server/ --exclude node_modules --exclude .env`,
    `[ -f /tmp/${escapeSingleQuotes(f)}/package.json ] && sudo cp -f /tmp/${escapeSingleQuotes(f)}/package.json ${escapeSingleQuotes(root)}/package.json || true`,
    `[ -f /tmp/${escapeSingleQuotes(f)}/VERSION.txt ] && sudo cp -f /tmp/${escapeSingleQuotes(f)}/VERSION.txt ${escapeSingleQuotes(root)}/VERSION.txt || true`,
    `[ -f /tmp/${escapeSingleQuotes(f)}/PACKAGE_INFO.txt ] && sudo cp -f /tmp/${escapeSingleQuotes(f)}/PACKAGE_INFO.txt ${escapeSingleQuotes(root)}/PACKAGE_INFO.txt || true`,
    'echo ">>> [Update 5/7] npm install..."',
    `cd ${escapeSingleQuotes(root)}/server && npm install --omit=dev`,
    'echo ">>> [Update 6/7] khởi động lại PM2..."',
    'export PATH="$HOME/.npm-global/bin:$PATH:/usr/local/bin"',
    `pm2 restart '${pm2n}' || pm2 restart all`,
    'echo ">>> [Update 7/7] Dọn rác: apt autoremove, autoclean, lưu zip vào update/server (tối đa 10 bản)..."',
    'sudo DEBIAN_FRONTEND=noninteractive apt-get autoremove -y',
    'sudo apt-get autoclean',
    `sudo mkdir -p '${PATH_UPDATE_SERVER}'`,
    `sudo cp -f '${escapeSingleQuotes(remote)}' '${PATH_UPDATE_SERVER}/${f}.zip'`,
    `sudo cp -f '${PATH_UPDATE_SERVER}/${f}.zip' '${PATH_UPDATE_SERVER}/htql_server_update.zip' || true`,
    `sudo sh -c 'cd ${PATH_UPDATE_SERVER} && ls -1t htql_server_v*.zip 2>/dev/null | tail -n +11 | xargs -r rm -f'`,
    `rm -f '${escapeSingleQuotes(remote)}' 2>/dev/null || true`,
    `echo ">>> Hoàn tất. Đã xử lý zip tại ${remote}"`,
  ].join('; ')
  const cmd = `bash -lc ${JSON.stringify(inner)}`
  try {
    const r = await sshExecStream(event, cmd)
    return { ok: r.code === 0, code: r.code, out: r.out }
  } catch (e) {
    return { ok: false, error: String(e.message || e) }
  }
})

ipcMain.handle('ssh:listServerArtifacts', async () => {
  const inner = `ls -1t '${PATH_UPDATE_SERVER}'/htql_server_v*.zip 2>/dev/null || true`
  const cmd = `bash -lc ${JSON.stringify(inner)}`
  try {
    const r = await sshExecInternal(cmd, 20_000)
    if (r.error) return { ok: false, error: r.error, files: [] }
    const raw = (r.out || '').trim()
    const files = raw
      ? raw
          .split('\n')
          .map((line) => path.basename(line.trim()))
          .filter((name) => /^htql_server_v[\d.]+\.zip$/i.test(name))
      : []
    return { ok: true, files }
  } catch (e) {
    return { ok: false, error: String(e.message || e), files: [] }
  }
})

ipcMain.handle('ssh:listClientArtifacts', async () => {
  const inner = `find '${PATH_UPDATE_CLIENT}' -maxdepth 1 -type f \\( -name '*.exe' -o -name '*.dmg' \\) -printf '%T@\\t%f\\n' 2>/dev/null | sort -nr | head -20 | cut -f2- || true`
  const cmd = `bash -lc ${JSON.stringify(inner)}`
  try {
    const r = await sshExecInternal(cmd, 20_000)
    if (r.error) return { ok: false, error: r.error, files: [] }
    const raw = (r.out || '').trim()
    const files = raw
      ? raw
          .split('\n')
          .map((line) => line.trim())
          .filter((name) => /^[\w.\- ()+\[\]]+\.(exe|dmg)$/i.test(name))
      : []
    return { ok: true, files }
  } catch (e) {
    return { ok: false, error: String(e.message || e), files: [] }
  }
})

ipcMain.handle('ssh:restoreServerFromZip', async (event, payload) => {
  const s = loadSettings()
  const name = String(payload?.fileName || '').trim()
  if (!/^htql_server_v[\d.]+\.zip$/i.test(name)) {
    return { ok: false, error: 'Chỉ chọn file htql_server_v….zip trong thư mục update/server.' }
  }
  const folder = name.replace(/\.zip$/i, '')
  const src = `${PATH_UPDATE_SERVER}/${name}`
  const root = REMOTE_HTQL_ROOT
  const pw = (s.ubuntuPassword || '').trim()
  const pm2n = escapeSingleQuotes(PM2_APP_NAME)
  const inner = [
    'set -e',
    `echo "${escapeSingleQuotes(pw)}" | sudo -S -v`,
    `echo ">>> Phục hồi server từ ${src}"`,
    `sudo test -f '${escapeSingleQuotes(src)}'`,
    `sudo cp -f '${escapeSingleQuotes(src)}' /tmp/htql_server_restore.zip`,
    `unzip -o /tmp/htql_server_restore.zip -d /tmp || { U=$?; [ "$U" -le 1 ] || exit "$U"; }`,
    `sudo rsync -a /tmp/${escapeSingleQuotes(folder)}/server/ ${escapeSingleQuotes(root)}/server/ --exclude node_modules --exclude .env`,
    `[ -f /tmp/${escapeSingleQuotes(folder)}/package.json ] && sudo cp -f /tmp/${escapeSingleQuotes(folder)}/package.json ${escapeSingleQuotes(root)}/package.json || true`,
    `[ -f /tmp/${escapeSingleQuotes(folder)}/VERSION.txt ] && sudo cp -f /tmp/${escapeSingleQuotes(folder)}/VERSION.txt ${escapeSingleQuotes(root)}/VERSION.txt || true`,
    `[ -f /tmp/${escapeSingleQuotes(folder)}/PACKAGE_INFO.txt ] && sudo cp -f /tmp/${escapeSingleQuotes(folder)}/PACKAGE_INFO.txt ${escapeSingleQuotes(root)}/PACKAGE_INFO.txt || true`,
    `cd ${escapeSingleQuotes(root)}/server && npm install --omit=dev`,
    'export PATH="$HOME/.npm-global/bin:$PATH:/usr/local/bin"',
    `pm2 restart '${pm2n}' || pm2 restart all`,
    'rm -f /tmp/htql_server_restore.zip 2>/dev/null || true',
    'echo ">>> Hoàn tất phục hồi server."',
  ].join('; ')
  const cmd = `bash -lc ${JSON.stringify(inner)}`
  try {
    const r = await sshExecStream(event, cmd)
    return { ok: r.code === 0, code: r.code, out: r.out }
  } catch (e) {
    return { ok: false, error: String(e.message || e) }
  }
})

ipcMain.handle('ssh:restoreClientInstaller', async (event, payload) => {
  const s = loadSettings()
  const name = String(payload?.fileName || '').trim()
  if (!/^[\w.\- ()+\[\]]+\.(exe|dmg)$/i.test(name)) {
    return { ok: false, error: 'Tên file installer không hợp lệ.' }
  }
  const base = name.replace(/\.(exe|dmg)$/i, '')
  const remoteInst = `${PATH_UPDATE_CLIENT}/${name}`
  const probe = `bash -lc ${JSON.stringify(
    `sudo test -f '${escapeSingleQuotes(remoteInst)}' && sudo sha256sum '${escapeSingleQuotes(remoteInst)}' | awk '{print $1}'`,
  )}`
  const p1 = await sshExecInternal(probe, 25_000)
  if (p1.error) return { ok: false, error: p1.error }
  if (p1.code !== 0) return { ok: false, error: `Không đọc được installer trên server (mã ${p1.code}).` }
  const sha = String(p1.out || '')
    .trim()
    .split(/\s+/)[0]
  if (!/^[a-f0-9]{64}$/i.test(sha)) return { ok: false, error: 'Không lấy được SHA256 hợp lệ trên server.' }

  const tagM = base.match(/V(\d{4})_(\d{2})_(\d{2})_(\d+)/i)
  const semverFromTag = tagM
    ? `${tagM[1]}.${parseInt(tagM[2], 10)}.${parseInt(tagM[3], 10)}-${tagM[4]}`
    : undefined
  const manifestObj = {
    version: base,
    semver: semverFromTag,
    latestFile: name,
    sha256: sha,
    updatedAt: new Date().toISOString(),
  }
  const localManifest = path.join(app.getPath('temp'), `htql-restore-manifest-${Date.now()}.json`)
  fs.writeFileSync(localManifest, JSON.stringify(manifestObj, null, 2), 'utf8')

  let conn
  try {
    conn = await connectSsh()
  } catch (e) {
    try {
      fs.unlinkSync(localManifest)
    } catch (_) {}
    return { ok: false, error: String(e.message || e) }
  }
  const remoteTmp = `/tmp/htql-restore-manifest-${Date.now()}.json`
  const destManifest = `${PATH_UPDATE_CLIENT}/htql-client-manifest.json`
  try {
    await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err)
        sendLog(event, 'Đang tải manifest phục hồi lên server…\r\n')
        sftp.fastPut(localManifest, remoteTmp, {}, (e1) => {
          if (e1) return reject(e1)
          resolve()
        })
      })
    })
    const inner = [
      'set -e',
      `echo "${escapeSingleQuotes(s.ubuntuPassword)}" | sudo -S -v`,
      `sudo cp ${escapeSingleQuotes(remoteTmp)} ${escapeSingleQuotes(destManifest)}`,
      `sudo rm -f ${escapeSingleQuotes(remoteTmp)}`,
      'echo OK',
    ].join('; ')
    const r = await new Promise((resolve, reject) => {
      conn.exec(`bash -lc ${JSON.stringify(inner)}`, (e3, stream) => {
        let out = ''
        if (e3) {
          conn.end()
          return reject(e3)
        }
        stream.on('data', (d) => {
          const t = d.toString('utf8')
          out += t
          sendLog(event, t)
        })
        if (stream.stderr) stream.stderr.on('data', (d) => sendLog(event, d.toString('utf8')))
        stream.on('close', () => {
          conn.end()
          resolve(out)
        })
      })
    })
    try {
      fs.unlinkSync(localManifest)
    } catch (_) {}
    return { ok: String(r).includes('OK'), out: String(r) }
  } catch (e) {
    try {
      conn.end()
    } catch (_) {}
    try {
      fs.unlinkSync(localManifest)
    } catch (_) {}
    return { ok: false, error: String(e.message || e) }
  }
})

ipcMain.handle('ssh:listBackupSummary', async () => {
  const inner = [
    'echo "=== Backup dữ liệu + DB (HTQL) ==="',
    `sudo du -sh '${PATH_BACKUP_DF}' 2>/dev/null || echo "(không đọc được ${PATH_BACKUP_DF})"`,
    `sudo ls -1t '${PATH_BACKUP_DF}' 2>/dev/null | head -25 || true`,
    'echo ""',
    'echo "=== Backup chứng từ / thiết kế (HTQL) ==="',
    `sudo du -sh '${PATH_BACKUP_CT}' 2>/dev/null || echo "(không đọc được ${PATH_BACKUP_CT})"`,
    `sudo ls -1t '${PATH_BACKUP_CT}' 2>/dev/null | head -20 || true`,
    'echo ""',
    'echo "=== Thư mục legacy /hdd_4tb/backup (nếu có) ==="',
    `sudo du -sh '${PATH_BACKUP_LEGACY}' 2>/dev/null || echo "(chưa có hoặc không đọc được)"`,
    `sudo ls -1t '${PATH_BACKUP_LEGACY}' 2>/dev/null | head -20 || true`,
  ].join('\n')
  const cmd = `bash -lc ${JSON.stringify(inner)}`
  try {
    const r = await sshExecInternal(cmd, 35_000)
    if (r.error) return { ok: false, error: r.error, text: '' }
    return { ok: r.code === 0, text: (r.out || '').trim() || '(Trống)' }
  } catch (e) {
    return { ok: false, error: String(e.message || e), text: '' }
  }
})
