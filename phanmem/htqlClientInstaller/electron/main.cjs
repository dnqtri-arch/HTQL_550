/**
 * HTQL_550 — Máy trạm Windows: production load web-dist; dev load http://localhost:5173 (HTQL_CLIENT_DEV=1).
 * Frameless + titleBarOverlay (vàng kim / nâu đất), Smart Connect: đọc htql-smart-connect.json cạnh exe (bước cài NSIS).
 */
const { app, BrowserWindow, shell, Menu, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')
const https = require('https')
const os = require('os')
const { spawn } = require('child_process')

const isDev =
  process.env.HTQL_CLIENT_DEV === '1' ||
  process.env.VITE_DEV === '1' ||
  process.argv.includes('--htql-dev')

let mainWindow = null

/**
 * Chuẩn cài đặt: `HTQL_INSTALL_ROOT=/opt/htql550` → gói client do Control Center đẩy vào
 * `/opt/htql550/update/client` (trùng `HTQL_UPDATE_CLIENT_DIR` trong `server/.env`).
 * Client không đọc trực tiếp đĩa Linux — lấy đường dẫn thật qua `GET /api/htql-meta` → `pathUpdateClient`.
 */
const PATH_UPDATE_CLIENT_HINT = '/opt/htql550/update/client'

function normalizePosixPath(p) {
  return String(p || '')
    .replace(/\\/g, '/')
    .replace(/\/+$/, '')
}

/** Hostname hoặc IPv4; IPv6 phải bọc [ ] trong URL. */
function httpBase(host, port) {
  const h = String(host || '').trim()
  const p = Number(port) || 3001
  if (!h) return ''
  const needBrackets = h.includes(':') && !h.startsWith('[')
  const hostPart = needBrackets ? `[${h}]` : h
  return `http://${hostPart}:${p}`
}

function readInstallDiscovery() {
  try {
    const exeDir = path.dirname(process.execPath)
    const p = path.join(exeDir, 'htql-smart-connect.json')
    if (!fs.existsSync(p)) {
      return { discoveredHost: null, apiPort: null, scannedAt: null }
    }
    const raw = fs.readFileSync(p, 'utf8')
    const j = JSON.parse(raw)
    return {
      discoveredHost: j.discoveredHost != null ? String(j.discoveredHost) : null,
      apiPort: j.apiPort != null ? Number(j.apiPort) : null,
      scannedAt: j.scannedAt != null ? String(j.scannedAt) : null,
    }
  } catch {
    return { discoveredHost: null, apiPort: null, scannedAt: null }
  }
}

/** Không dùng electron-updater (generic URL) — tránh hộp thoại trùng với kiểm tra manifest máy chủ. */
function maybeSetupAutoUpdater() {
  /* intentionally empty */
}

/**
 * Thứ tự so sánh — semver (2026.4.15-2), tag VYYYY_MM_DD_NN, và **YYYY.MM.BUILD** (đồng bộ server/client).
 */
function versionRank(s) {
  const t = String(s || '').trim()
  const sem = t.match(/^(\d+)\.(\d+)\.(\d+)-(\d+)$/)
  if (sem) {
    return (
      parseInt(sem[1], 10) * 1e12 +
      parseInt(sem[2], 10) * 1e9 +
      parseInt(sem[3], 10) * 1e6 +
      parseInt(sem[4], 10)
    )
  }
  const ymb = t.match(/^(\d{4})\.(\d{2})\.(\d+)$/)
  if (ymb) {
    return (
      parseInt(ymb[1], 10) * 1e12 +
      parseInt(ymb[2], 10) * 1e9 +
      parseInt(ymb[3], 10)
    )
  }
  const tag = t.match(/V(\d{4})_(\d{2})_(\d{2})_(\d+)/i)
  if (tag) {
    return (
      parseInt(tag[1], 10) * 1e12 +
      parseInt(tag[2], 10) * 1e9 +
      parseInt(tag[3], 10) * 1e6 +
      parseInt(tag[4], 10)
    )
  }
  const digits = t.replace(/\D/g, '')
  return digits ? parseInt(digits.slice(0, 16), 10) : 0
}

/** Chuỗi định danh phiên bản từ manifest: tag V… hoặc **YYYY.MM.BUILD** / `htql_client_v….exe`. */
function extractVxTagFromManifest(m) {
  if (!m || typeof m !== 'object') return ''
  const parts = [m.version, m.latestFile, m.fileName]
  for (const p of parts) {
    const s = String(p || '')
    const tagM = s.match(/(V\d{4}_\d{2}_\d{2}_\d+)/i)
    if (tagM) return tagM[1]
    const hc = s.match(/htql_client_v(\d{4}\.\d{2}\.\d+)/i)
    if (hc) return hc[1]
    const plain = s.match(/(\d{4}\.\d{2}\.\d+)/)
    if (plain) return plain[1]
  }
  return ''
}

function semverFromManifestVersion(m) {
  const v0 = m && typeof m.version === 'string' ? m.version.trim() : ''
  const hc0 = v0.match(/htql_client_v(\d{4}\.\d{2}\.\d+)/i)
  if (hc0) return hc0[1]
  if (/^\d{4}\.\d{2}\.\d+$/.test(v0)) return v0
  const id = extractVxTagFromManifest(m)
  if (id && /^\d{4}\.\d{2}\.\d+$/.test(id)) return id
  if (id && /^V/i.test(id)) {
    const tm = id.match(/V(\d{4})_(\d{2})_(\d{2})_(\d+)/i)
    if (tm) return `${tm[1]}.${parseInt(tm[2], 10)}.${parseInt(tm[3], 10)}-${tm[4]}`
  }
  const tagM = v0.match(/V(\d{4})_(\d{2})_(\d{2})_(\d+)/i)
  if (tagM) {
    return `${tagM[1]}.${parseInt(tagM[2], 10)}.${parseInt(tagM[3], 10)}-${tagM[4]}`
  }
  return ''
}

/**
 * Tải file installer qua HTTP(S) vào thư mục tạm — không mở trình duyệt.
 * @param onProgress { received, total, bytesPerSecond } — total nếu có Content-Length; bytesPerSecond EMA (B/s)
 */
function httpDownloadToFile(urlStr, destPath, timeoutMs = 900000, onProgress) {
  return new Promise((resolve, reject) => {
    let u
    try {
      u = new URL(urlStr)
    } catch (e) {
      return reject(new Error(String(e.message || e)))
    }
    const isHttps = u.protocol === 'https:'
    const lib = isHttps ? https : http
    const port = u.port ? Number(u.port) : isHttps ? 443 : 80
    try {
      fs.mkdirSync(path.dirname(destPath), { recursive: true })
    } catch (e) {
      return reject(e)
    }
    const file = fs.createWriteStream(destPath)
    const req = lib.request(
      {
        hostname: u.hostname,
        port,
        path: `${u.pathname}${u.search}`,
        method: 'GET',
        timeout: timeoutMs,
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          file.destroy()
          try {
            fs.unlinkSync(destPath)
          } catch (_) {
            /* ignore */
          }
          return reject(new Error(`HTTP ${res.statusCode}`))
        }
        const totalBytes = parseInt(String(res.headers['content-length'] || ''), 10)
        const total = Number.isFinite(totalBytes) && totalBytes > 0 ? totalBytes : null
        let received = 0
        if (onProgress) onProgress({ received: 0, total })
        res.on('data', (chunk) => {
          received += chunk.length
          if (onProgress) onProgress({ received, total })
          const ok = file.write(chunk)
          if (!ok) res.pause()
        })
        file.on('drain', () => res.resume())
        res.on('end', () => file.end())
        res.on('error', (e) => {
          try {
            file.destroy()
            fs.unlinkSync(destPath)
          } catch (_) {
            /* ignore */
          }
          reject(e)
        })
        file.on('finish', () => file.close(() => resolve(destPath)))
      },
    )
    req.on('error', (e) => {
      try {
        file.destroy()
        fs.unlinkSync(destPath)
      } catch (_) {
        /* ignore */
      }
      reject(e)
    })
    req.on('timeout', () => {
      req.destroy()
      try {
        file.destroy()
        fs.unlinkSync(destPath)
      } catch (_) {
        /* ignore */
      }
      reject(new Error('timeout'))
    })
    req.end()
  })
}

function emitInstallerDownloadProgress(payload) {
  try {
    const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null
    if (win && win.webContents) {
      win.webContents.send('htql-installer-download-progress', payload)
    }
  } catch (_) {
    /* ignore */
  }
}

function httpGetJson(urlStr, timeoutMs = 10000) {
  return new Promise((resolve) => {
    let u
    try {
      u = new URL(urlStr)
    } catch (e) {
      return resolve({ ok: false, error: String(e.message || e) })
    }
    const isHttps = u.protocol === 'https:'
    const lib = isHttps ? https : http
    const port = u.port ? Number(u.port) : isHttps ? 443 : 80
    const req = lib.request(
      {
        hostname: u.hostname,
        port,
        path: `${u.pathname}${u.search}`,
        method: 'GET',
        timeout: timeoutMs,
      },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (c) => {
          body += c
        })
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            return resolve({ ok: false, error: `HTTP ${res.statusCode}` })
          }
          try {
            resolve({ ok: true, json: JSON.parse(body) })
          } catch {
            resolve({ ok: false, error: body.slice(0, 200) })
          }
        })
      },
    )
    req.on('error', (e) => resolve({ ok: false, error: String(e.message || e) }))
    req.on('timeout', () => {
      req.destroy()
      resolve({ ok: false, error: 'timeout' })
    })
    req.end()
  })
}

/** Chỉ gán sau khi user bấm «Xác nhận cập nhật» — tránh chặn nhắc lại khi bấm «Để sau». */
let promptedInstallerUpdateKey = ''
/** Tránh nhiều hộp thoại cùng manifest trong ~90s (timer + API + thư mục cục bộ). */
const offerDedupRecent = new Map()
const OFFER_DEDUP_MS = 90_000
let checkInstallerUpdateInFlight = false

/** IPv4 không loopback đầu tiên — hiển thị footer «IP Client». */
function getPrimaryLanIPv4() {
  try {
    const nets = os.networkInterfaces()
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net && net.family === 'IPv4' && !net.internal) return String(net.address || '')
      }
    }
  } catch {
    /* ignore */
  }
  return ''
}

/**
 * Cài NSIS im lặng (/S) — không dùng shell.openPath trên Windows (tránh flash console).
 * macOS: mở .dmg/.pkg bằng openPath.
 */
function launchNsisInstallerSilent(exePath) {
  const p = String(exePath || '').trim()
  if (!p) return
  if (process.platform !== 'win32') {
    shell.openPath(p).catch(() => {})
    return
  }
  try {
    const child = spawn(p, ['/S', '/NCRC'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    })
    child.unref()
  } catch {
    shell.openPath(p).catch(() => {})
  }
}

function installerCacheDestPath(m, downloadUrl) {
  const fromManifest = m.latestFile || m.fileName
  let baseName = fromManifest ? path.basename(String(fromManifest)) : ''
  if (!baseName || !/\.(exe|dmg)$/i.test(baseName)) {
    try {
      const u = new URL(downloadUrl)
      baseName = path.basename(u.pathname) || 'htql_client_v.exe'
    } catch {
      baseName = 'htql_client_v.exe'
    }
  }
  const safe = baseName.replace(/[^a-zA-Z0-9._\- ()[\]]/g, '_')
  return path.join(app.getPath('temp'), 'htql-client-updates', safe || 'htql_client_v.exe')
}

/** So sánh manifest (server hoặc thư mục update/client cạnh exe) với bản đang chạy — chỉ hỏi khi phiên bản mới hơn. */
async function considerInstallerManifest(m, opts) {
  if (!m || typeof m !== 'object') return
  if (m.error) return
  const tagEx = extractVxTagFromManifest(m)
  const verRaw = String(m.version || '').trim()
  const ver = tagEx || verRaw
  if (!ver) return
  let serverSem = String(m.semver || '').trim()
  if (!serverSem) serverSem = semverFromManifestVersion(m)
  const serverRank = versionRank(serverSem || ver)
  const curRank = versionRank(app.getVersion())
  if (serverRank <= curRank) return
  const key = `${opts.source}:${tagEx || ver}:${m.sha256 || m.latestFile || m.fileName || ''}`
  if (key === promptedInstallerUpdateKey) return
  const prev = offerDedupRecent.get(key) || 0
  if (Date.now() - prev < OFFER_DEDUP_MS) return
  const dl = typeof m.downloadUrl === 'string' ? m.downloadUrl.trim() : ''
  const cur = app.getVersion()
  const port = opts.port || 3001
  const localExe = opts.localInstallerPath && fs.existsSync(opts.localInstallerPath) ? opts.localInstallerPath : ''
  const res = await dialog.showMessageBox(mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined, {
    type: 'question',
    buttons: ['Để sau', localExe ? 'Xác nhận (chạy cài đặt)' : dl ? 'Xác nhận (tải và cài đặt)' : 'Đóng'],
    defaultId: localExe || dl ? 1 : 0,
    cancelId: 0,
    title: 'HTQL_550 — Có bản cập nhật mới',
    message: `Phát hiện phiên bản cài đặt mới (${opts.sourceLabel}: ${serverSem || ver}).`,
    detail: localExe
      ? `Bản đang chạy: ${cur}.\nFile cài: ${localExe}\nXác nhận để chạy trình cài (NSIS ghi đè chương trình — không xóa dữ liệu ứng dụng theo thiết kế).`
      : dl
        ? `Bản đang chạy: ${cur}.\nXác nhận để tải bản cài về thư mục tạm trên máy trạm và chạy cài đặt (cổng ${port}).`
        : `Bản đang chạy: ${cur}.\nChưa có URL tải — kiểm tra Control Center đã đẩy .exe/.dmg lên ${PATH_UPDATE_CLIENT_HINT}.`,
  })
  offerDedupRecent.set(key, Date.now())
  if (res.response !== 1) return
  promptedInstallerUpdateKey = key
  if (localExe) {
    launchNsisInstallerSilent(localExe)
    setTimeout(() => app.exit(0), 400)
    return
  }
  if (!dl) return
  const dest = installerCacheDestPath(m, dl)
  const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null
  try {
    emitInstallerDownloadProgress({ received: 0, total: null, bytesPerSecond: 0, done: false })
    if (win) {
      win.setProgressBar(2)
    }
    await httpDownloadToFile(dl, dest, 900000, ({ received, total, bytesPerSecond }) => {
      emitInstallerDownloadProgress({
        received,
        total: total ?? null,
        bytesPerSecond: typeof bytesPerSecond === 'number' ? bytesPerSecond : 0,
        done: false,
      })
      if (win) {
        if (total != null && total > 0) {
          win.setProgressBar(Math.min(1, received / total))
        } else {
          win.setProgressBar(2)
        }
      }
    })
    emitInstallerDownloadProgress({ received: 0, total: null, bytesPerSecond: 0, done: true })
    if (win) win.setProgressBar(-1)
    await shell.openPath(dest)
  } catch (e) {
    emitInstallerDownloadProgress({ received: 0, total: null, bytesPerSecond: 0, done: true })
    if (win) win.setProgressBar(-1)
    await dialog.showMessageBox(mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined, {
      type: 'error',
      title: 'HTQL_550 — Tải bản cài thất bại',
      message: String(e?.message || e),
    })
  }
}

/** Thư mục cạnh exe: update/client/htql-client-manifest.json (offline / bản sao từ máy chủ). */
function readLocalClientUpdateManifest() {
  try {
    const base = path.join(path.dirname(process.execPath), 'update', 'client')
    const p = path.join(base, 'htql-client-manifest.json')
    if (!fs.existsSync(p)) return { manifest: null, installerPath: '' }
    const j = JSON.parse(fs.readFileSync(p, 'utf8'))
    if (!j || typeof j !== 'object') return { manifest: null, installerPath: '' }
    const fn = j.latestFile || j.fileName
    if (fn && typeof fn === 'string' && /^[\w.\- ()+\[\]]+\.(exe|dmg)$/i.test(fn)) {
      const localInstaller = path.join(base, path.basename(fn))
      if (fs.existsSync(localInstaller)) {
        return { manifest: j, installerPath: localInstaller }
      }
    }
    return { manifest: j, installerPath: '' }
  } catch {
    return { manifest: null, installerPath: '' }
  }
}

async function checkInstallerUpdateFromServer() {
  if (isDev) return
  if (checkInstallerUpdateInFlight) return
  checkInstallerUpdateInFlight = true
  /** Ưu tiên manifest trên máy chủ (đồng bộ Tool); thư mục update/client cạnh exe chỉ bổ sung / offline. */
  try {
    let d = readInstallDiscovery()
    if (!d.discoveredHost) {
      const sp = readServerPathsDiscovery()
      if (sp.discoveredHost) d = sp
    }
    if (d.discoveredHost) {
      const port = d.apiPort || 3001
      const base = httpBase(d.discoveredHost, port)
      if (base) {
        const metaR = await httpGetJson(`${base}/api/htql-meta`)
        let pathUpdateLine = ''
        if (metaR.ok && metaR.json && metaR.json.pathUpdateClient) {
          const p = normalizePosixPath(metaR.json.pathUpdateClient)
          const hint = normalizePosixPath(PATH_UPDATE_CLIENT_HINT)
          pathUpdateLine =
            p === hint
              ? `Thư mục gói client trên máy chủ: ${metaR.json.pathUpdateClient} (chuẩn ${PATH_UPDATE_CLIENT_HINT} — khớp Control Center).`
              : `Thư mục gói client trên máy chủ: ${metaR.json.pathUpdateClient} (HTQL_INSTALL_ROOT tùy chỉnh — Tool phải đẩy .exe/manifest vào đúng thư mục này).`
        }
        const manifestUrl = `${base}/api/htql-client-update-manifest`
        const r = await httpGetJson(manifestUrl)
        if (r.ok && r.json) {
          await considerInstallerManifest(r.json, {
            source: 'api',
            sourceLabel: 'Máy chủ (nội dung thư mục update/client)',
            port,
            detailHint: `${pathUpdateLine ? `${pathUpdateLine}\n` : ''}GET /api/htql-client-update-manifest đọc cùng thư mục với pathUpdateClient trên máy chủ.\nXác nhận để tải qua HTTP (cổng ${port}).`,
          })
        }
      }
    }
  } catch (_) {
    /* im lặng — máy chủ có thể tạm tắt */
  }
  try {
    const { manifest: localM, installerPath: localExe } = readLocalClientUpdateManifest()
    if (localM) {
      await considerInstallerManifest(localM, {
        source: 'local-update-folder',
        sourceLabel: 'Thư mục update/client (cạnh file chạy)',
        port: 3001,
        localInstallerPath: localExe,
        detailHint: 'Bản cài mới nằm cạnh chương trình.',
      })
    }
  } catch (_) {
    /* ignore */
  } finally {
    checkInstallerUpdateInFlight = false
  }
}

function createWindow() {
  const iconIco = path.join(__dirname, '..', 'build', 'icon.ico')
  const iconPng = path.join(__dirname, '..', 'build', 'icon.png')
  const winOpts = {
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1a1408',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
    },
  }
  if (fs.existsSync(iconIco)) winOpts.icon = iconIco
  else if (fs.existsSync(iconPng)) winOpts.icon = iconPng
  if (process.platform === 'win32') {
    winOpts.titleBarOverlay = {
      color: '#2d1f0f',
      symbolColor: '#d4af37',
      height: 40,
    }
  }
  mainWindow = new BrowserWindow(winOpts)

  if (isDev) {
    const devMenu = Menu.buildFromTemplate([
      {
        label: 'View',
        submenu: [
          { role: 'reload', label: 'Tải lại' },
          { role: 'toggleDevTools', label: 'Công cụ phát triển' },
        ],
      },
    ])
    Menu.setApplicationMenu(devMenu)
    mainWindow.loadURL('http://localhost:5173').catch((e) => {
      console.error('[HTQL_550] Dev: không mở được http://localhost:5173 — hãy chạy `npm run dev` tại gốc repo.', e)
    })
  } else {
    Menu.setApplicationMenu(null)
    const indexHtml = path.join(__dirname, '..', 'web-dist', 'index.html')
    mainWindow.loadFile(indexHtml).catch((e) => {
      console.error('[HTQL_550]', e)
    })
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    try {
      if (!mainWindow.isDestroyed() && !mainWindow.isMaximized()) mainWindow.maximize()
    } catch {
      /* ignore */
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  /** Đồng bộ KV trước khi hủy cửa sổ — await thật; có giới hạn thời gian để không treo khi mạng/API kẹt. */
  const HTQL_CLOSE_FLUSH_TIMEOUT_MS = 12_000
  let closeFlushDone = false
  mainWindow.on('close', async (e) => {
    if (closeFlushDone) return
    e.preventDefault()
    const win = mainWindow
    try {
      if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
        const flushPromise = win.webContents.executeJavaScript(
          `(function(){ var p = window.__htqlFlushKvSync && window.__htqlFlushKvSync(); return (p && typeof p.then === 'function') ? p : Promise.resolve(); })()`,
          true,
        )
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('htql flush timeout')), HTQL_CLOSE_FLUSH_TIMEOUT_MS),
        )
        await Promise.race([flushPromise, timeoutPromise]).catch(() => {})
      }
    } catch (_) {
      /* ignore */
    }
    closeFlushDone = true
    win.destroy()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

if (isDev) {
  app.disableHardwareAcceleration()
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    } else {
      createWindow()
    }
  })
}

app.setAppUserModelId('vn.htql550.client')

ipcMain.handle('htql:get-install-discovery', () => readInstallDiscovery())
ipcMain.handle('htql:get-client-ipv4', () => getPrimaryLanIPv4())

const SERVER_PATHS_FILE = 'htql-server-paths.json'

function serverPathsSidecarPath() {
  return path.join(path.dirname(process.execPath), SERVER_PATHS_FILE)
}

/** Máy cài tay / không quét LAN: `htql-server-paths.json` (màn Kết nối máy chủ) có `apiBase` — dùng để kiểm tra cập nhật giống Smart Connect. */
function readServerPathsDiscovery() {
  try {
    const p = serverPathsSidecarPath()
    if (!fs.existsSync(p)) return { discoveredHost: null, apiPort: null, scannedAt: null }
    const raw = fs.readFileSync(p, 'utf8')
    const j = JSON.parse(raw)
    const apiBase = typeof j.apiBase === 'string' ? j.apiBase.trim() : ''
    if (!apiBase) return { discoveredHost: null, apiPort: null, scannedAt: null }
    const u = new URL(apiBase.startsWith('http') ? apiBase : `http://${apiBase}`)
    const port = u.port ? Number(u.port) : 3001
    return {
      discoveredHost: u.hostname || null,
      apiPort: Number.isFinite(port) ? port : 3001,
      scannedAt: typeof j.savedAt === 'string' ? j.savedAt : null,
    }
  } catch {
    return { discoveredHost: null, apiPort: null, scannedAt: null }
  }
}

ipcMain.handle('htql:save-server-paths', (_, payload) => {
  try {
    const p = serverPathsSidecarPath()
    fs.writeFileSync(p, JSON.stringify(payload ?? {}, null, 2), 'utf8')
    return { ok: true, path: p }
  } catch (e) {
    return { ok: false, error: String(e?.message || e) }
  }
})

ipcMain.handle('htql:load-server-paths', () => {
  try {
    const p = serverPathsSidecarPath()
    if (!fs.existsSync(p)) return null
    const raw = fs.readFileSync(p, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
})

/**
 * Renderer đã probe xong API (cùng logic initHtqlApiBase) — ghi apiBase cạnh exe để main process
 * gọi GET /api/htql-client-update-manifest (không phụ thuộc htql-smart-connect.json khi user không quét LAN lúc cài).
 * Đồng thời chạy lại kiểm tra ngay (tránh timer 3,5s chạy trước khi probe LAN ~5s xong).
 */
function persistApiBaseSidecar(apiBaseStr) {
  const s = String(apiBaseStr || '').trim()
  if (!s) return { ok: false, error: 'empty' }
  try {
    const p = serverPathsSidecarPath()
    let existing = {}
    if (fs.existsSync(p)) {
      try {
        existing = JSON.parse(fs.readFileSync(p, 'utf8'))
      } catch {
        existing = {}
      }
    }
    const merged = { ...existing, apiBase: s, savedAt: new Date().toISOString() }
    fs.writeFileSync(p, JSON.stringify(merged, null, 2), 'utf8')
    return { ok: true, path: p }
  } catch (e) {
    return { ok: false, error: String(e?.message || e) }
  }
}

ipcMain.handle('htql:notify-resolved-api-base', (_, apiBase) => {
  const r = persistApiBaseSidecar(apiBase)
  if (r.ok) {
    setImmediate(() => {
      checkInstallerUpdateFromServer().catch(() => {})
    })
  }
  return r
})

ipcMain.handle('htql:run-installer-update-check', () => {
  return checkInstallerUpdateFromServer().then(() => ({ ok: true })).catch((e) => ({ ok: false, error: String(e?.message || e) }))
})

app.whenReady().then(() => {
  maybeSetupAutoUpdater()
  createWindow()
  const runUpdateCheck = () => checkInstallerUpdateFromServer().catch(() => {})
  setTimeout(runUpdateCheck, 3500)
  /** Kiểm tra lại sau khi mạng/API máy chủ sẵn sàng (upload manifest từ Tool). */
  setTimeout(runUpdateCheck, 12000)
  setTimeout(runUpdateCheck, 30000)
  /** 6 giờ / lần — tránh gọi API quá dày khi mở lâu. */
  setInterval(runUpdateCheck, 6 * 60 * 60 * 1000)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
