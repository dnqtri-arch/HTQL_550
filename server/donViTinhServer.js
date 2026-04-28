/**
 * HTQL_550 — API Node (Express).
 * - Lưu trữ: MySQL (mysql2) khi cấu hình HTQL_MYSQL_* — đồng bộ đa client.
 * - Fallback: file JSON trong HTQL_DATA_DIR (dev / cài cũ).
 */
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import crypto from 'node:crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import os from 'node:os'
import dotenv from 'dotenv'
import { createMysqlPool, useMysqlStorage } from './db/mysqlPool.js'
import { resolveMysqlEnv, mysqlEnvMissingKeys } from './db/mysqlEnv.js'
import {
  ensureSchema,
  HTQL_MYSQL_SCHEMA_VERSION,
  HTQL_ENSURED_TABLES,
  compactHtqlHttpSessionTable,
  purgeStaleHtqlHttpSessions,
} from './db/ensureSchema.js'
import { createJsonEntityPartitionRepo, createJsonEntityRepo } from './db/jsonEntityRepo.js'
import { migrateJsonFilesIfEmpty } from './db/migrateJsonFiles.js'
import { mountHtqlKvRoutes } from './db/htqlKvRoutes.js'
import { mountHtqlModuleBundleRoutes } from './db/htqlModuleBundleRoutes.js'
import { backfillModuleMysqlTables } from './db/moduleMysqlTables.js'
import { mountHtqlSyncRoutes } from './db/htqlSyncRoutes.js'
import { mountHtqlSequenceRoutes } from './db/htqlSequenceRoutes.js'
import { mountHtqlRecordEditLockRoutes } from './db/htqlRecordEditLockRoutes.js'
import { mountUserPreferencesRoutes } from './db/userPreferencesRoutes.js'
import { mountPaperSizeRoutes } from './db/paperSizeRoutes.js'
import { mountHtqlUploadRoutes } from './htqlUploadRoutes.js'
import { tryBootstrapMysqlDatabase } from './db/mysqlBootstrap.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

/** Gốc triển khai (vd /opt/htql550): parent của thư mục server/ */
const INSTALL_ROOT = process.env.HTQL_INSTALL_ROOT
  ? path.resolve(process.env.HTQL_INSTALL_ROOT)
  : path.resolve(path.join(__dirname, '..'))

/** Triển khai chuẩn dưới /opt: mặc định SSD 2TB + HDD (aaPanel) — có thể override bằng .env */
const IS_LINUX_OPT_INSTALL = INSTALL_ROOT.startsWith('/opt/')
const SSD_ROOT = process.env.HTQL_ROOT_SSD
  ? path.resolve(process.env.HTQL_ROOT_SSD)
  : IS_LINUX_OPT_INSTALL
    ? '/ssd_2tb/htql_550'
    : ''

/** Dữ liệu JSON / registry: luôn dưới gốc cài (vd /opt/htql550/data), không gộp vào SSD trừ khi HTQL_DATA_DIR chỉ định */
const DATA_DIR = process.env.HTQL_DATA_DIR
  ? path.resolve(process.env.HTQL_DATA_DIR)
  : path.join(INSTALL_ROOT, 'data')

/** Đường dẫn lưu trữ (mặc định SSD 2TB theo yêu cầu triển khai). */
const PATH_DU_LIEU = process.env.HTQL_PATH_DU_LIEU ? path.resolve(process.env.HTQL_PATH_DU_LIEU) : DATA_DIR
const PATH_HOADON_CHUNG_TU = process.env.HTQL_PATH_HOADON_CHUNG_TU
  ? path.resolve(process.env.HTQL_PATH_HOADON_CHUNG_TU)
  : SSD_ROOT
    ? path.join(SSD_ROOT, 'hdct')
    : path.join(DATA_DIR, 'hdct')
const PATH_THIET_KE = process.env.HTQL_PATH_THIET_KE
  ? path.resolve(process.env.HTQL_PATH_THIET_KE)
  : SSD_ROOT
    ? path.join(SSD_ROOT, 'thietke')
    : path.join(DATA_DIR, 'thietke')
/** Ảnh VTHH (tab Đặc tính — form VTHH). Linux: cùng cây `HTQL_ROOT_SSD` (vd …/htql_550/vthh); Windows dev: dưới DATA_DIR. */
const PATH_VTHH_HINH_ANH = process.env.HTQL_PATH_VTHH_HINH_ANH
  ? path.resolve(process.env.HTQL_PATH_VTHH_HINH_ANH)
  : process.platform === 'win32'
    ? path.join(DATA_DIR, 'vthh_hinh')
    : SSD_ROOT
      ? path.join(SSD_ROOT, 'vthh')
      : '/ssd_2tb/htql_550/vthh'
const PATH_CO_SO_DU_LIEU = process.env.HTQL_PATH_CO_SO_DU_LIEU
  ? path.resolve(process.env.HTQL_PATH_CO_SO_DU_LIEU)
  : path.join(DATA_DIR, 'sqlite')

/** Backup HDD (ứng dụng + dump DB; đồng bộ chứng từ/thiết kế). */
const PATH_BACKUP_DU_LIEU = process.env.HTQL_PATH_BACKUP_DU_LIEU
  ? path.resolve(process.env.HTQL_PATH_BACKUP_DU_LIEU)
  : '/hdd_4tb/htql_550/backup_dulieu'
const PATH_BACKUP_CT_TK = process.env.HTQL_PATH_BACKUP_CT_TK
  ? path.resolve(process.env.HTQL_PATH_BACKUP_CT_TK)
  : '/hdd_4tb/htql_550/backup_ct_tk'

/** Gói cài client (.exe) + manifest — mặc định dưới thư mục cài đặt: INSTALL_ROOT/update/… (không dùng SSD). */
const HTQL_UPDATE_CLIENT_DIR = process.env.HTQL_UPDATE_CLIENT_DIR
  ? path.resolve(process.env.HTQL_UPDATE_CLIENT_DIR)
  : path.join(INSTALL_ROOT, 'update', 'client')

const HTQL_UPDATE_SERVER_DIR = process.env.HTQL_UPDATE_SERVER_DIR
  ? path.resolve(process.env.HTQL_UPDATE_SERVER_DIR)
  : path.join(INSTALL_ROOT, 'update', 'server')

const LOGS_DIR = path.join(INSTALL_ROOT, 'logs')

/** Trên Linux/macOS: chmod 775 thư mục vừa tạo (API không thể chown — chown do setup_server / quản trị). */
function tryChmodDir775(dirPath) {
  if (!dirPath || process.platform === 'win32') return
  try {
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      fs.chmodSync(dirPath, 0o775)
    }
  } catch {
    /* EPERM nếu không phải owner — bỏ qua */
  }
}

function ensureHtqlDataDirectories() {
  const dirs = [
    DATA_DIR,
    PATH_DU_LIEU,
    PATH_HOADON_CHUNG_TU,
    PATH_THIET_KE,
    PATH_VTHH_HINH_ANH,
    ...(SSD_ROOT ? [SSD_ROOT] : []),
    ...(useMysqlStorage() ? [] : [PATH_CO_SO_DU_LIEU]),
    HTQL_UPDATE_CLIENT_DIR,
    HTQL_UPDATE_SERVER_DIR,
    PATH_BACKUP_DU_LIEU,
    PATH_BACKUP_CT_TK,
    LOGS_DIR,
  ]
  for (const d of dirs) {
    try {
      if (d) {
        fs.mkdirSync(d, { recursive: true })
        tryChmodDir775(d)
      }
    } catch (e) {
      process.stderr.write(`[HTQL_550] Cảnh báo: không tạo được thư mục ${d}: ${e}\n`)
    }
  }
}

/** Nếu SSD chưa mount / không quyền ghi, mkdir thất bị âm thầm — nhắc kiểm tra. */
function warnIfSsdDirsMissing() {
  for (const [label, p] of [
    ['HTQL_PATH_HOADON_CHUNG_TU', PATH_HOADON_CHUNG_TU],
    ['HTQL_PATH_THIET_KE', PATH_THIET_KE],
    ['HTQL_PATH_VTHH_HINH_ANH', PATH_VTHH_HINH_ANH],
  ]) {
    if (!p) continue
    try {
      if (!fs.existsSync(p)) {
        process.stderr.write(
          `[HTQL_550] Cảnh báo: không có thư mục ${label}=${p} — tạo tay: sudo mkdir -p ... ; chown user chạy PM2 (quyền ghi SSD).\n`,
        )
      }
    } catch (_) {
      /* ignore */
    }
  }
}

function safeInstallerBasename(name) {
  const b = path.basename(String(name || ''))
  if (!/\.exe$/i.test(b)) return null
  if (/[/\\]|\.\./.test(b)) return null
  return b
}

const DATA_FILE = path.join(DATA_DIR, 'donViTinh.json')
const DATA_FILE_NCC = path.join(DATA_DIR, 'nhaCungCap.json')
const DATA_FILE_KH = path.join(DATA_DIR, 'khachHang.json')
const CLIENT_REGISTRY_FILE = path.join(DATA_DIR, 'htqlClientRegistry.json')

const DVT_NAP_MAU_TOI_THIEU = [
  { id: 1, ma_dvt: '01', ten_dvt: 'Cái', ky_hieu: 'Cái', dien_giai: '' },
  { id: 2, ma_dvt: '02', ten_dvt: 'Hộp', ky_hieu: 'Hộp', dien_giai: '' },
  { id: 3, ma_dvt: '03', ten_dvt: 'Mét', ky_hieu: 'm', dien_giai: 'Đơn vị đo chiều dài' },
  { id: 4, ma_dvt: '04', ten_dvt: 'Kilôgam', ky_hieu: 'Kg', dien_giai: '' },
  { id: 5, ma_dvt: '05', ten_dvt: 'Tờ', ky_hieu: 'Tờ', dien_giai: '' },
  { id: 6, ma_dvt: '06', ten_dvt: 'Ram giấy', ky_hieu: 'Ram', dien_giai: '' },
]

function readJsonArray(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function load() {
  return readJsonArray(DATA_FILE)
}
function save(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}
function loadNcc() {
  return readJsonArray(DATA_FILE_NCC)
}
function saveNcc(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(DATA_FILE_NCC, JSON.stringify(data, null, 2), 'utf8')
}
function loadKh() {
  return readJsonArray(DATA_FILE_KH)
}
function saveKh(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(DATA_FILE_KH, JSON.stringify(data, null, 2), 'utf8')
}
function loadClientRegistry() {
  try {
    const raw = fs.readFileSync(CLIENT_REGISTRY_FILE, 'utf8')
    const data = JSON.parse(raw)
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
  } catch {
    return {}
  }
}

/** Chuẩn hoá khóa cũ (chỉ IP) → `ip:x.x.x.x` hoặc giữ client_key. */
function normalizeRegistryKeys(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = /^ip:/.test(k) || k.length > 40 ? k : `ip:${k}`
    out[key] = v
  }
  return out
}
function saveClientRegistry(obj) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(CLIENT_REGISTRY_FILE, JSON.stringify(obj, null, 2), 'utf8')
}

function getRequestClientIp(req) {
  const xf = req.headers['x-forwarded-for']
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim()
  if (Array.isArray(xf) && xf[0]) return String(xf[0]).split(',')[0].trim()
  const rip = req.socket?.remoteAddress || ''
  return String(rip).replace(/^::ffff:/, '')
}

const app = express()
app.set('trust proxy', 1)

/** CORS + cookie phiên — client dùng `credentials: 'include'` / axios `withCredentials`. */
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)
app.use(cookieParser())

const HTQL_SESSION_COOKIE = 'htql_sess'
const HTQL_SESSION_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000

/** Tắt ghi phiên vào MySQL (chỉ cookie) — vd gỡ lỗi: HTQL_HTTP_SESSION_DB=0 */
function htqlHttpSessionMysqlEnabled() {
  const v = String(process.env.HTQL_HTTP_SESSION_DB ?? '1').trim().toLowerCase()
  return v !== '0' && v !== 'false' && v !== 'off'
}

/**
 * Ghi dòng `client_key IS NULL` (mỗi request cookie mới → một dòng) — dễ phình bảng (bot/crawler).
 * Mặc định **tắt**; bật lại: HTQL_HTTP_SESSION_ANONYMOUS_DB=1.
 */
function htqlHttpSessionAnonymousMysqlEnabled() {
  const v = String(process.env.HTQL_HTTP_SESSION_ANONYMOUS_DB ?? '0').trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'on'
}

function htqlCookieSecure(req) {
  if (process.env.HTQL_COOKIE_SECURE === '1') return true
  if (process.env.HTQL_COOKIE_SECURE === '0') return false
  const xf = req.headers['x-forwarded-proto']
  if (typeof xf === 'string' && xf.split(',')[0].trim().toLowerCase() === 'https') return true
  return false
}

/**
 * Cookie HttpOnly `htql_sess` + (khi MySQL bật) hàng `htql_http_session` — phiên thiết bị có thể truy vết,
 * gắn `client_key` từ `X-HTQL-Client-Id`. Không lưu token trong localStorage.
 */
app.use(async (req, res, next) => {
  if (req.method === 'OPTIONS') return next()
  if (req.method === 'GET' && req.path === '/api/health') return next()
  if (req.method === 'POST' && req.path === '/api/htql-maintenance/purge-http-sessions') return next()
  if (req.method === 'POST' && req.path === '/api/htql-maintenance/compact-http-sessions') return next()
  try {
    let token =
      req.cookies && req.cookies[HTQL_SESSION_COOKIE] ? String(req.cookies[HTQL_SESSION_COOKIE]) : ''
    if (!token || token.length < 8) {
      token = crypto.randomBytes(24).toString('hex')
      res.cookie(HTQL_SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: htqlCookieSecure(req),
        path: '/',
        maxAge: HTQL_SESSION_MAX_AGE_MS,
      })
    }
    if (mysqlPool && htqlHttpSessionMysqlEnabled()) {
      const ip = getRequestClientIp(req) || ''
      const ua = String(req.headers['user-agent'] || '').slice(0, 512)
      const ckRaw = String(req.headers['x-htql-client-id'] || '').trim().slice(0, 128)
      let ck = ckRaw.length ? ckRaw.slice(0, 128) : null
      if (ck && (ck.toLowerCase() === 'unknown' || ck === '-')) ck = null
      /**
       * Một hàng / thiết bị khi có client_key — tránh mỗi request tạo dòng mới nếu cookie không gửi lại được.
       * (Index UNIQUE(client_key) do ensureSchema tạo khi dedupe xong.)
       */
      if (ck) {
        const [ur] = await mysqlPool.query(
          `UPDATE htql_http_session SET session_token = ?, ip = ?, user_agent = ?, last_seen_at = CURRENT_TIMESTAMP(3) WHERE client_key = ? LIMIT 1`,
          [token, ip, ua, ck],
        )
        const n = typeof ur?.affectedRows === 'number' ? ur.affectedRows : 0
        if (!n) {
          await mysqlPool.query(
            `INSERT INTO htql_http_session (session_token, client_key, ip, user_agent) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               last_seen_at = CURRENT_TIMESTAMP(3),
               ip = VALUES(ip),
               user_agent = VALUES(user_agent),
               client_key = IF(CHAR_LENGTH(IFNULL(VALUES(client_key), '')) > 0, VALUES(client_key), client_key)`,
            [token, ck, ip, ua],
          )
        }
      } else if (htqlHttpSessionAnonymousMysqlEnabled()) {
        await mysqlPool.query(
          `INSERT INTO htql_http_session (session_token, client_key, ip, user_agent) VALUES (?, NULL, ?, ?)
           ON DUPLICATE KEY UPDATE
             last_seen_at = CURRENT_TIMESTAMP(3),
             ip = VALUES(ip),
             user_agent = VALUES(user_agent)`,
          [token, ip, ua],
        )
      }
    }
  } catch (e) {
    console.error('[HTQL_550] http session', e)
  }
  next()
})

app.use(express.json({ limit: '50mb' }))

/** Chế độ demo (dữ liệu thử nghiệm từ Cursor / máy dev) — bật trên server: HTQL_DEMO_MODE=1; DB MySQL nên dùng DB riêng (vd htql_550_db_demo) qua HTQL_MYSQL_DATABASE. */
const DEMO_MODE =
  process.env.HTQL_DEMO_MODE === '1' || String(process.env.HTQL_DEMO_MODE || '').toLowerCase() === 'true'
app.use((req, res, next) => {
  if (DEMO_MODE) {
    res.setHeader('X-HTQL-Demo', '1')
  }
  next()
})

let mysqlPool = null
let repoDvt = null
let repoNcc = null
let repoKh = null

async function recordHtqlClientVisit(req) {
  const ip = getRequestClientIp(req)
  if (!ip) return
  const clientKeyRaw = String(req.headers['x-htql-client-id'] || '').trim()
  const clientKey = clientKeyRaw.slice(0, 128) || `ip:${ip.slice(0, 64)}`
  const verRaw = String(req.headers['x-htql-client-version'] || '').trim()
  const ver = verRaw && verRaw.toLowerCase() !== 'unknown' ? verRaw : ''
  const zoneRaw = String(req.headers['x-htql-connection-zone'] || '').trim().toLowerCase()
  const connectionZone = zoneRaw === 'wan' ? 'wan' : zoneRaw === 'lan' ? 'lan' : ''
  const hostname = String(req.headers['x-htql-client-hostname'] || '').trim().slice(0, 200)
  const online = req.headers['x-htql-client-online'] === '1'
  const ua = String(req.headers['user-agent'] || '').slice(0, 400)
  const now = Date.now()
  const lastPath = (req.originalUrl || req.url || '').slice(0, 200)

  if (mysqlPool) {
    const [rows] = await mysqlPool.query('SELECT data FROM htql_workstation WHERE client_key = ?', [
      clientKey,
    ])
    let prev = {}
    if (rows.length) {
      const d = rows[0].data
      prev = typeof d === 'string' ? JSON.parse(d) : d
    }
    const next = {
      ...prev,
      lastSeen: now,
      clientVersion: ver || prev.clientVersion || '',
      connectionZone: connectionZone || prev.connectionZone || '',
      hostname: hostname || prev.hostname || '',
      online,
      userAgent: ua || prev.userAgent || '',
      lastMethod: req.method,
      lastPath,
    }
    await mysqlPool.query(
      'INSERT INTO htql_workstation (client_key, ip, data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE ip = VALUES(ip), data = VALUES(data), updated_at = CURRENT_TIMESTAMP(3)',
      [clientKey, ip.slice(0, 64), JSON.stringify(next)],
    )
    return
  }

  const reg = normalizeRegistryKeys(loadClientRegistry())
  const prev = reg[clientKey] || reg[`ip:${ip}`] || {}
  reg[clientKey] = {
    ...prev,
    ip: ip.slice(0, 64),
    lastSeen: now,
    clientVersion: ver || prev.clientVersion || '',
    connectionZone: connectionZone || prev.connectionZone || '',
    hostname: hostname || prev.hostname || '',
    online,
    userAgent: ua || prev.userAgent || '',
    lastMethod: req.method,
    lastPath,
  }
  saveClientRegistry(reg)
}

app.use(async (req, res, next) => {
  try {
    if (req.method === 'OPTIONS') return next()
    if (req.method === 'GET' && req.path === '/api/health') return next()
    if (req.method === 'POST' && req.path === '/api/htql-maintenance/purge-http-sessions') return next()
    if (req.method === 'POST' && req.path === '/api/htql-maintenance/compact-http-sessions') return next()
    if (String(req.path || '').startsWith('/api/htql-client-installer')) return next()
    await recordHtqlClientVisit(req)
  } catch (e) {
    console.error('[HTQL_550] registry', e)
  }
  next()
})

function mountRoutes() {
  const maintenanceLogTables = ['htql_sync_log', 'htql_record_edit_lock', 'htql_client_registry']
  const maintenanceAllowedTargets = new Set(['session', 'logs', 'all'])

  function canAccessMaintenance(req, res) {
    const token = String(process.env.HTQL_MAINTENANCE_TOKEN || '').trim()
    const hdrRaw = String(req.headers['x-htql-maintenance-token'] || '').trim()
    const auth = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
    const hdr = hdrRaw || auth
    const ip = getRequestClientIp(req) || ''
    const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1'
    if (token) {
      if (hdr !== token) {
        res.status(403).json({ error: 'Forbidden' })
        return false
      }
      return true
    }
    if (!isLocal) {
      res.status(404).end()
      return false
    }
    return true
  }

  async function compactLogLikeTables(mode) {
    let deletedTotal = 0
    const details = []
    for (const t of maintenanceLogTables) {
      const item = { table: t, deleted: 0, mode: mode === 'optimize' ? 'optimize' : 'truncate' }
      if (mode === 'optimize') {
        await mysqlPool.query(`OPTIMIZE TABLE \`${t}\``)
        details.push(item)
        continue
      }
      const [[{ c }]] = await mysqlPool.query(`SELECT COUNT(*) AS c FROM \`${t}\``)
      const n = Number(c) || 0
      item.deleted = n
      deletedTotal += n
      await mysqlPool.query(`TRUNCATE TABLE \`${t}\``)
      await mysqlPool.query(`ANALYZE TABLE \`${t}\``)
      details.push(item)
    }
    return { deletedTotal, details }
  }

  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({
      ok: true,
      pid: process.pid,
      uptime: Math.round(process.uptime()),
      mysql: Boolean(mysqlPool),
      schemaVersion: useMysqlStorage() ? HTQL_MYSQL_SCHEMA_VERSION : null,
    })
  })

  /**
   * Purge `htql_http_session` (batch). Nội bộ / cron:
   * - Không set HTQL_MAINTENANCE_TOKEN: chỉ chấp nhận từ 127.0.0.1 (vd `curl -sS -X POST http://127.0.0.1:3001/api/htql-maintenance/purge-http-sessions`).
   * - Có token: header `X-HTQL-Maintenance-Token: <token>` hoặc `Authorization: Bearer <token>`.
   */
  app.post('/api/htql-maintenance/purge-http-sessions', async (req, res) => {
    if (!canAccessMaintenance(req, res)) return
    if (!mysqlPool) return res.status(503).json({ error: 'MySQL không kết nối' })
    const roundsCap = Math.min(Math.max(Number(req.query?.rounds) || 1200, 1), 5000)
    try {
      const deleted = await purgeStaleHtqlHttpSessions(mysqlPool, {
        force: true,
        yieldMs: Math.min(Math.max(Number(process.env.HTQL_HTTP_SESSION_PURGE_YIELD_MS ?? 15) || 15, 0), 2000),
        maxRounds: roundsCap,
      })
      res.json({ ok: true, deleted })
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })
  app.post('/api/htql-maintenance/compact-http-sessions', async (req, res) => {
    if (!canAccessMaintenance(req, res)) return
    if (!mysqlPool) return res.status(503).json({ error: 'MySQL không kết nối' })
    try {
      const mode = String(req.query?.mode || 'truncate').trim().toLowerCase()
      if (mode !== 'truncate' && mode !== 'optimize') {
        return res.status(400).json({ error: 'mode phải là truncate hoặc optimize' })
      }
      const target = String(req.query?.target || 'all').trim().toLowerCase()
      if (!maintenanceAllowedTargets.has(target)) {
        return res.status(400).json({ error: 'target phải là session | logs | all' })
      }
      let session = { mode, deleted: 0 }
      let logs = { deletedTotal: 0, details: [] }
      if (target === 'session' || target === 'all') {
        session = await compactHtqlHttpSessionTable(mysqlPool, mode)
      }
      if (target === 'logs' || target === 'all') {
        logs = await compactLogLikeTables(mode)
      }
      res.json({ ok: true, target, mode, session, logs })
    } catch (e) {
      res.status(500).json({ error: String(e?.message || e) })
    }
  })

  if (repoDvt) {
    app.get('/api/don-vi-tinh', async (req, res) => {
      try {
        res.json(await repoDvt.list())
      } catch (e) {
        res.status(500).json({ error: String(e.message || e) })
      }
    })
    app.post('/api/don-vi-tinh', async (req, res) => {
      try {
        const list = await repoDvt.list()
        const payload = req.body
        const id = list.length > 0 ? Math.max(...list.map((r) => r.id)) + 1 : 1
        const soMax = list.reduce((max, r) => {
          const n = parseInt(r.ma_dvt, 10)
          return !isNaN(n) && n > max ? n : max
        }, 0)
        const ma_dvt = payload.ma_dvt?.trim() || String(soMax + 1).padStart(2, '0')
        const newRow = { ...payload, id, ma_dvt }
        const created = await repoDvt.insert(newRow)
        res.json(created)
      } catch (e) {
        res.status(500).json({ error: String(e.message || e) })
      }
    })
    app.put('/api/don-vi-tinh/:id', async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10)
        const updated = await repoDvt.update(id, { ...req.body, id })
        if (!updated) return res.status(404).json({ error: 'Không tìm thấy' })
        res.json(updated)
      } catch (e) {
        res.status(500).json({ error: String(e.message || e) })
      }
    })
    app.delete('/api/don-vi-tinh/:id', async (req, res) => {
      try {
        const ok = await repoDvt.remove(parseInt(req.params.id, 10))
        if (!ok) return res.status(404).json({ error: 'Không tìm thấy' })
        res.status(204).send()
      } catch (e) {
        res.status(500).json({ error: String(e.message || e) })
      }
    })
    app.post('/api/don-vi-tinh/nap-mau', async (req, res) => {
      try {
        const rows = await repoDvt.truncateAndSeed(DVT_NAP_MAU_TOI_THIEU.map((r) => ({ ...r })))
        res.json(rows)
      } catch (e) {
        res.status(500).json({ error: String(e.message || e) })
      }
    })
  } else {
    app.get('/api/don-vi-tinh', (req, res) => res.json(load()))
    app.post('/api/don-vi-tinh', (req, res) => {
      const list = load()
      const payload = req.body
      const id = list.length > 0 ? Math.max(...list.map((r) => r.id)) + 1 : 1
      const soMax = list.reduce((max, r) => {
        const n = parseInt(r.ma_dvt, 10)
        return !isNaN(n) && n > max ? n : max
      }, 0)
      const ma_dvt = payload.ma_dvt?.trim() || String(soMax + 1).padStart(2, '0')
      const newRow = { ...payload, id, ma_dvt }
      list.push(newRow)
      save(list)
      res.json(newRow)
    })
    app.put('/api/don-vi-tinh/:id', (req, res) => {
      const list = load()
      const id = parseInt(req.params.id, 10)
      const idx = list.findIndex((r) => r.id === id)
      if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy' })
      list[idx] = { ...req.body, id }
      save(list)
      res.json(list[idx])
    })
    app.delete('/api/don-vi-tinh/:id', (req, res) => {
      const list = load().filter((r) => r.id !== parseInt(req.params.id, 10))
      save(list)
      res.status(204).send()
    })
    app.post('/api/don-vi-tinh/nap-mau', (req, res) => {
      save(DVT_NAP_MAU_TOI_THIEU.map((r) => ({ ...r })))
      res.json(load())
    })
  }

  if (repoNcc) {
    const mirrorKhFromNcc = async (nccRow) => {
      if (!repoKh) return
      if (!nccRow || !nccRow.khach_hang) return
      const ma = String(nccRow.ma_ncc || '').trim()
      if (!ma) return
      const khPayload = {
        ma_kh: ma,
        ten_kh: nccRow.ten_ncc ?? '',
        loai_kh: nccRow.loai_ncc ?? 'to_chuc',
        isNhaCungCap: true,
        dia_chi: nccRow.dia_chi,
        nhom_kh: nccRow.nhom_kh_ncc,
        ma_so_thue: nccRow.ma_so_thue,
        ma_dvqhns: nccRow.ma_dvqhns,
        dien_thoai: nccRow.dien_thoai,
        fax: nccRow.fax,
        email: nccRow.email,
        website: nccRow.website,
        dien_giai: nccRow.dien_giai,
        dieu_khoan_tt: nccRow.dieu_khoan_tt,
        so_ngay_duoc_no: nccRow.so_ngay_duoc_no,
        han_muc_no_kh: nccRow.so_no_toi_da,
        nv_ban_hang: nccRow.nv_mua_hang,
        tk_ngan_hang: nccRow.tk_ngan_hang,
        ten_ngan_hang: nccRow.ten_ngan_hang,
        nguoi_lien_he: nccRow.nguoi_lien_he,
        tai_khoan_ngan_hang: nccRow.tai_khoan_ngan_hang,
        ngung_theo_doi: Boolean(nccRow.ngung_theo_doi),
        quoc_gia: nccRow.quoc_gia,
        quyen_huyen: nccRow.quyen_huyen,
        tinh_tp: nccRow.tinh_tp,
        xa_phuong: nccRow.xa_phuong,
        xung_ho: nccRow.xung_ho,
        gioi_tinh: nccRow.gioi_tinh,
        ho_va_ten_lien_he: nccRow.ho_va_ten_lien_he,
        chuc_danh: nccRow.chuc_danh,
        dt_di_dong: nccRow.dt_di_dong,
        dtdd_khac: nccRow.dtdd_khac,
        dt_co_dinh: nccRow.dt_co_dinh,
        dia_chi_lien_he: nccRow.dia_chi_lien_he,
        dai_dien_theo_pl: nccRow.dai_dien_theo_pl,
        dia_diem_giao_hang: nccRow.dia_diem_giao_hang,
        dia_diem_nhan_hang: nccRow.dia_diem_nhan_hang,
        dia_diem_nhan_trung_giao: nccRow.dia_diem_giao_trung_nhan,
        so_ho_chieu: nccRow.so_ho_chieu,
        so_cccd: nccRow.so_cccd,
        ngay_cap: nccRow.ngay_cap,
        noi_cap: nccRow.noi_cap,
      }
      const khList = await repoKh.list()
      const found = khList.find((x) => String(x.ma_kh || '').trim() === ma)
      if (found) {
        await repoKh.update(found.id, { ...khPayload, id: found.id })
      } else {
        const nextId = khList.length > 0 ? Math.max(...khList.map((x) => Number(x.id) || 0)) + 1 : 1
        await repoKh.insert({ ...khPayload, id: nextId })
      }
    }

    app.get('/api/nha-cung-cap', async (req, res) => {
      try {
        res.json(await repoNcc.list())
      } catch (e) {
        res.status(500).json({ error: String(e.message || e) })
      }
    })
    app.post('/api/nha-cung-cap', async (req, res) => {
      try {
        const list = await repoNcc.list()
        const payload = req.body
        const id = list.length > 0 ? Math.max(...list.map((r) => r.id)) + 1 : 1
        const newRow = await repoNcc.insert({ ...payload, id })
        try {
          await mirrorKhFromNcc(newRow)
        } catch (mirrorErr) {
          console.warn('[HTQL_550] mirror KH từ NCC (POST):', mirrorErr?.message || mirrorErr)
        }
        res.json(newRow)
      } catch (e) {
        res.status(500).json({ error: String(e.message || e) })
      }
    })
    app.put('/api/nha-cung-cap/:id', async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10)
        const updated = await repoNcc.update(id, { ...req.body, id })
        if (!updated) return res.status(404).json({ error: 'Không tìm thấy' })
        try {
          await mirrorKhFromNcc(updated)
        } catch (mirrorErr) {
          console.warn('[HTQL_550] mirror KH từ NCC (PUT):', mirrorErr?.message || mirrorErr)
        }
        res.json(updated)
      } catch (e) {
        res.status(500).json({ error: String(e.message || e) })
      }
    })
    app.delete('/api/nha-cung-cap/:id', async (req, res) => {
      try {
        const ok = await repoNcc.remove(parseInt(req.params.id, 10))
        if (!ok) return res.status(404).json({ error: 'Không tìm thấy' })
        res.status(204).send()
      } catch (e) {
        res.status(500).json({ error: String(e.message || e) })
      }
    })
  } else {
    app.get('/api/nha-cung-cap', (req, res) => res.json(loadNcc()))
    app.post('/api/nha-cung-cap', (req, res) => {
      const list = loadNcc()
      const payload = req.body
      const id = list.length > 0 ? Math.max(...list.map((r) => r.id)) + 1 : 1
      const newRow = { ...payload, id }
      list.push(newRow)
      saveNcc(list)
      res.json(newRow)
    })
    app.put('/api/nha-cung-cap/:id', (req, res) => {
      const list = loadNcc()
      const id = parseInt(req.params.id, 10)
      const idx = list.findIndex((r) => r.id === id)
      if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy' })
      list[idx] = { ...req.body, id }
      saveNcc(list)
      res.json(list[idx])
    })
    app.delete('/api/nha-cung-cap/:id', (req, res) => {
      const list = loadNcc().filter((r) => r.id !== parseInt(req.params.id, 10))
      saveNcc(list)
      res.status(204).send()
    })
  }

  mountHtqlKvRoutes(app, { mysqlPool, dataDir: DATA_DIR })
  mountHtqlModuleBundleRoutes(app, { mysqlPool, dataDir: DATA_DIR })
  mountHtqlSyncRoutes(app, { mysqlPool, dataDir: DATA_DIR })
  mountHtqlSequenceRoutes(app, { mysqlPool, dataDir: DATA_DIR })
  mountUserPreferencesRoutes(app, { mysqlPool, dataDir: DATA_DIR })
  mountHtqlRecordEditLockRoutes(app, { mysqlPool })
  mountPaperSizeRoutes(app, { mysqlPool })

  if (repoKh) {
    const mirrorNccFromKh = async (khRow) => {
      if (!repoNcc) return
      if (!khRow || !khRow.isNhaCungCap) return
      const ma = String(khRow.ma_kh || '').trim()
      if (!ma) return
      const nccPayload = {
        ma_ncc: ma,
        ten_ncc: khRow.ten_kh ?? '',
        loai_ncc: khRow.loai_kh ?? 'to_chuc',
        khach_hang: true,
        dia_chi: khRow.dia_chi,
        nhom_kh_ncc: khRow.nhom_kh,
        ma_so_thue: khRow.ma_so_thue,
        ma_dvqhns: khRow.ma_dvqhns,
        dien_thoai: khRow.dien_thoai,
        fax: khRow.fax,
        email: khRow.email,
        website: khRow.website,
        dien_giai: khRow.dien_giai,
        dieu_khoan_tt: khRow.dieu_khoan_tt,
        so_ngay_duoc_no: khRow.so_ngay_duoc_no,
        so_no_toi_da: khRow.han_muc_no_kh,
        nv_mua_hang: khRow.nv_ban_hang,
        tk_ngan_hang: khRow.tk_ngan_hang,
        ten_ngan_hang: khRow.ten_ngan_hang,
        nguoi_lien_he: khRow.nguoi_lien_he,
        tai_khoan_ngan_hang: khRow.tai_khoan_ngan_hang,
        ngung_theo_doi: Boolean(khRow.ngung_theo_doi),
        quoc_gia: khRow.quoc_gia,
        quyen_huyen: khRow.quyen_huyen,
        tinh_tp: khRow.tinh_tp,
        xa_phuong: khRow.xa_phuong,
        xung_ho: khRow.xung_ho,
        gioi_tinh: khRow.gioi_tinh,
        ho_va_ten_lien_he: khRow.ho_va_ten_lien_he,
        chuc_danh: khRow.chuc_danh,
        dt_di_dong: khRow.dt_di_dong,
        dtdd_khac: khRow.dtdd_khac,
        dt_co_dinh: khRow.dt_co_dinh,
        dia_chi_lien_he: khRow.dia_chi_lien_he,
        dai_dien_theo_pl: khRow.dai_dien_theo_pl,
        dia_diem_giao_hang: khRow.dia_diem_giao_hang,
        dia_diem_nhan_hang: khRow.dia_diem_nhan_hang,
        dia_diem_giao_trung_nhan: khRow.dia_diem_nhan_trung_giao,
        so_ho_chieu: khRow.so_ho_chieu,
        so_cccd: khRow.so_cccd,
        ngay_cap: khRow.ngay_cap,
        noi_cap: khRow.noi_cap,
      }
      const nccList = await repoNcc.list()
      const found = nccList.find((x) => String(x.ma_ncc || '').trim() === ma)
      if (found) {
        await repoNcc.update(found.id, { ...nccPayload, id: found.id })
      } else {
        const nextId = nccList.length > 0 ? Math.max(...nccList.map((x) => Number(x.id) || 0)) + 1 : 1
        await repoNcc.insert({ ...nccPayload, id: nextId })
      }
    }

    app.get('/api/khach-hang', async (req, res) => {
      try {
        res.json(await repoKh.list())
      } catch (e) {
        res.status(500).json({ error: String(e.message || e) })
      }
    })
    app.post('/api/khach-hang', async (req, res) => {
      try {
        const list = await repoKh.list()
        const payload = req.body
        const id = list.length > 0 ? Math.max(...list.map((r) => r.id)) + 1 : 1
        const newRow = await repoKh.insert({ ...payload, id })
        try {
          await mirrorNccFromKh(newRow)
        } catch (mirrorErr) {
          console.warn('[HTQL_550] mirror NCC từ KH (POST):', mirrorErr?.message || mirrorErr)
        }
        res.json(newRow)
      } catch (e) {
        res.status(500).json({ error: String(e.message || e) })
      }
    })
    app.put('/api/khach-hang/:id', async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10)
        const updated = await repoKh.update(id, { ...req.body, id })
        if (!updated) return res.status(404).json({ error: 'Không tìm thấy' })
        try {
          await mirrorNccFromKh(updated)
        } catch (mirrorErr) {
          console.warn('[HTQL_550] mirror NCC từ KH (PUT):', mirrorErr?.message || mirrorErr)
        }
        res.json(updated)
      } catch (e) {
        res.status(500).json({ error: String(e.message || e) })
      }
    })
    app.delete('/api/khach-hang/:id', async (req, res) => {
      try {
        const ok = await repoKh.remove(parseInt(req.params.id, 10))
        if (!ok) return res.status(404).json({ error: 'Không tìm thấy' })
        res.status(204).send()
      } catch (e) {
        res.status(500).json({ error: String(e.message || e) })
      }
    })
  } else {
    app.get('/api/khach-hang', (req, res) => res.json(loadKh()))
    app.post('/api/khach-hang', (req, res) => {
      const list = loadKh()
      const payload = req.body
      const id = list.length > 0 ? Math.max(...list.map((r) => r.id)) + 1 : 1
      const newRow = { ...payload, id }
      list.push(newRow)
      saveKh(list)
      res.json(newRow)
    })
    app.put('/api/khach-hang/:id', (req, res) => {
      const list = loadKh()
      const id = parseInt(req.params.id, 10)
      const idx = list.findIndex((r) => r.id === id)
      if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy' })
      list[idx] = { ...req.body, id }
      saveKh(list)
      res.json(list[idx])
    })
    app.delete('/api/khach-hang/:id', (req, res) => {
      const list = loadKh().filter((r) => r.id !== parseInt(req.params.id, 10))
      saveKh(list)
      res.status(204).send()
    })
  }
}

const PKG = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'))
let ROOT_PKG = { version: 'unknown' }
try {
  ROOT_PKG = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
} catch {
  /* triển khai chỉ có server/ — không có package.json gốc → webAppVersion = unknown */
}

function readUtf8TrimIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf8').trim()
  } catch {
    /* ignore */
  }
  return ''
}

/** Tag gói zip triển khai (`VERSION.txt` tại INSTALL_ROOT) — khớp htql_server_v….zip / Control Center. */
const INSTALL_VERSION_TAG = readUtf8TrimIfExists(path.join(INSTALL_ROOT, 'VERSION.txt'))
const API_RELEASE_VERSION = INSTALL_VERSION_TAG || PKG.version || 'unknown'

/** Lấy tag VYYYY_MM_DD_NN trong chuỗi version hoặc tên file .exe (không hiển thị nguyên tên file làm «phiên bản»). */
function extractVxTagFromHtqlManifestParts(verRaw, fileBasename) {
  const pool = [verRaw, fileBasename].filter(Boolean).map((s) => String(s))
  for (const s of pool) {
    const m = s.match(/(V\d{4}_\d{2}_\d{2}_\d+)/i)
    if (m) return m[1].replace(/^v/i, 'V')
  }
  return null
}

/** Phiên bản gói client trong update/client (Tool đẩy manifest + exe) — footer «Đồng bộ» máy chủ. */
function readClientInstallerManifestSummary() {
  try {
    const manifestPath = path.join(HTQL_UPDATE_CLIENT_DIR, 'htql-client-manifest.json')
    if (!fs.existsSync(manifestPath)) {
      return {
        clientInstallerVersion: null,
        clientInstallerSemver: null,
        clientInstallerFile: null,
      }
    }
    const j = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    const verRaw = j.version != null ? String(j.version).trim() : null
    const fn = j.latestFile || j.fileName
    const fnBase = fn && typeof fn === 'string' ? path.basename(String(fn)) : ''
    const tagNorm = extractVxTagFromHtqlManifestParts(verRaw, fnBase)
    const ver = tagNorm || (verRaw && !/\.(exe|dmg)$/i.test(verRaw) ? verRaw : null)
    let semver = j.semver != null ? String(j.semver).trim() : ''
    const semverFromTag = tagNorm && tagNorm.match(/V(\d{4})_(\d{2})_(\d{2})_(\d+)/i)
    if (!semver && semverFromTag) {
      semver = `${semverFromTag[1]}.${parseInt(semverFromTag[2], 10)}.${parseInt(semverFromTag[3], 10)}-${semverFromTag[4]}`
    }
    if (!semver && verRaw && !tagNorm) {
      const tagM = verRaw.match(/V(\d{4})_(\d{2})_(\d{2})_(\d+)/i)
      if (tagM) {
        semver = `${tagM[1]}.${parseInt(tagM[2], 10)}.${parseInt(tagM[3], 10)}-${tagM[4]}`
      }
    }
    return {
      clientInstallerVersion: ver,
      clientInstallerSemver: semver || null,
      clientInstallerFile: fn && typeof fn === 'string' ? path.basename(String(fn)) : null,
    }
  } catch {
    return {
      clientInstallerVersion: null,
      clientInstallerSemver: null,
      clientInstallerFile: null,
    }
  }
}

app.get('/api/htql-meta', (req, res) => {
  const mysqlCfg = resolveMysqlEnv()
  const mysqlHost = mysqlCfg.host
  const mysqlDb = mysqlCfg.database
  const mysqlPort = String(mysqlCfg.port || 3306)
  const clientInst = readClientInstallerManifestSummary()
  const host = req.get('host') || `localhost:${process.env.PORT || 3001}`
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http'
  let clientInstallerDownloadUrl = null
  const fn = clientInst.clientInstallerFile
  if (fn && safeInstallerBasename(fn)) {
    clientInstallerDownloadUrl = `${proto}://${host}/api/htql-client-installer/${encodeURIComponent(safeInstallerBasename(fn))}`
  }
  res.json({
    name: 'htql-550-server',
    version: API_RELEASE_VERSION,
    serverPackageJsonVersion: PKG.version || undefined,
    webAppVersion: ROOT_PKG.version || 'unknown',
    installVersionTag: INSTALL_VERSION_TAG || undefined,
    ...clientInst,
    clientInstallerDownloadUrl,
    installRoot: INSTALL_ROOT,
    ssdRoot: SSD_ROOT || undefined,
    dataDir: DATA_DIR,
    pathDuLieu: PATH_DU_LIEU,
    pathHoaDonChungTu: PATH_HOADON_CHUNG_TU,
    pathThietKe: PATH_THIET_KE,
    pathVthhHinhAnh: PATH_VTHH_HINH_ANH,
    pathCoSoDuLieu: useMysqlStorage()
      ? `MySQL ${mysqlDb} @ ${mysqlHost}:${mysqlPort}`
      : PATH_CO_SO_DU_LIEU,
    pathBackupDuLieu: PATH_BACKUP_DU_LIEU,
    pathBackupCtTk: PATH_BACKUP_CT_TK,
    pathUpdateClient: HTQL_UPDATE_CLIENT_DIR,
    pathUpdateServer: HTQL_UPDATE_SERVER_DIR,
    serverHostName: os.hostname(),
    storageBackend: useMysqlStorage() ? 'mysql' : 'json',
    mysqlDatabase: mysqlDb || undefined,
    mysqlUser: mysqlCfg.user || undefined,
    mysqlHost: mysqlHost || undefined,
    mysqlPort: mysqlPort || undefined,
    demoMode: DEMO_MODE,
    /** `mysql`: mỗi request cập nhật `htql_http_session` (cookie `htql_sess` + MySQL). `cookie_only`: chưa có pool hoặc HTQL_HTTP_SESSION_DB=0 */
    httpSessionStorage: mysqlPool && htqlHttpSessionMysqlEnabled() ? 'mysql' : 'cookie_only',
    /** Đồng bộ localStorage (prefix htql*) qua GET/PUT /api/htql-kv */
    kvSyncEnabled: true,
    /** system_version + delta log: GET /api/htql-sync-state, GET /api/sync/delta */
    htqlSyncStateApi: true,
    /** Mô hình lưu tối ưu: KV tách htql_mod_*; bundle giữ chuẩn ở htql_module_bundle; DVT/KH/NCC là entity riêng */
    kvStoreBusinessDataNote:
      'Module/KV: htql_kv_store + bảng vật lý htql_mod_<moduleId>; module bundle: htql_module_bundle (không mirror htql_mod để tránh trùng dữ liệu). DVT: don_vi_tinh. KH/NCC: gộp lưu chung htql_doi_tac (phân vùng partner_type).',
    /** POST /api/htql-upload (multipart) + GET /api/htql-files?kind=&rel= — file trên SSD */
    fileUploadApi: true,
  })
})

/** Thống kê bảng MySQL (information_schema) — dùng Control Center. */
app.get('/api/htql-mysql-tables', async (req, res) => {
  try {
    if (!mysqlPool) {
      return res.status(503).json({ ok: false, error: 'MySQL chưa cấu hình (API đang dùng JSON).' })
    }
    const [dbRows] = await mysqlPool.query('SELECT DATABASE() AS db')
    const schema = dbRows[0]?.db
    if (!schema) {
      return res.status(503).json({ ok: false, error: 'Không xác định được database hiện tại.' })
    }
    const [tables] = await mysqlPool.query(
      `SELECT TABLE_NAME AS tableName, TABLE_ROWS AS rowEstimate, DATA_LENGTH AS dataLength, INDEX_LENGTH AS indexLength
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME`,
      [schema],
    )
    const list = (tables || []).map((t) => {
      const dataBytes = Number(t.dataLength) || 0
      const indexBytes = Number(t.indexLength) || 0
      return {
        name: String(t.tableName),
        rowEstimate: Number(t.rowEstimate) || 0,
        dataBytes,
        indexBytes,
        totalBytes: dataBytes + indexBytes,
      }
    })
    res.json({ ok: true, database: schema, tables: list })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) })
  }
})

function parseMysqlPreviewLimit(raw) {
  const n = Number.parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(n) || n <= 0) return 50
  return Math.min(n, 200)
}

function sqlIdentSafe(name) {
  const v = String(name || '').trim()
  if (!/^[a-zA-Z0-9_]+$/.test(v)) return ''
  return `\`${v}\``
}

/**
 * Admin: liệt kê module đã auto tạo bảng vật lý `htql_mod_*` + số dòng từng bảng.
 * Dùng cho Tool kiểm tra sau deploy.
 */
app.get('/api/htql-admin-module-tables', async (req, res) => {
  try {
    if (!mysqlPool) {
      return res.status(503).json({ ok: false, error: 'MySQL chưa cấu hình (API đang dùng JSON).' })
    }
    const [dbRows] = await mysqlPool.query('SELECT DATABASE() AS db')
    const schema = dbRows[0]?.db
    if (!schema) {
      return res.status(503).json({ ok: false, error: 'Không xác định được database hiện tại.' })
    }
    const [rows] = await mysqlPool.query(
      `SELECT r.module_id AS moduleId, r.table_name AS tableName, r.source,
              t.TABLE_ROWS AS rowEstimate, t.DATA_LENGTH AS dataLength, t.INDEX_LENGTH AS indexLength
       FROM htql_module_registry r
       LEFT JOIN information_schema.TABLES t
         ON t.TABLE_SCHEMA = DATABASE() AND t.TABLE_NAME = r.table_name
       WHERE r.table_name LIKE 'htql_mod_%'
       ORDER BY r.table_name, r.module_id`,
    )
    const list = []
    for (const r of rows || []) {
      const tableName = String(r.tableName || '').trim()
      const safeTable = sqlIdentSafe(tableName)
      let rowCount = null
      if (safeTable) {
        try {
          const [[x]] = await mysqlPool.query(`SELECT COUNT(*) AS c FROM ${safeTable}`)
          rowCount = Number(x?.c)
          if (!Number.isFinite(rowCount)) rowCount = 0
        } catch {
          rowCount = null
        }
      }
      const dataBytes = Number(r.dataLength) || 0
      const indexBytes = Number(r.indexLength) || 0
      list.push({
        moduleId: String(r.moduleId || ''),
        tableName,
        source: String(r.source || 'kv'),
        rowCount,
        rowEstimate: Number(r.rowEstimate) || 0,
        dataBytes,
        indexBytes,
        totalBytes: dataBytes + indexBytes,
      })
    }
    res.json({ ok: true, database: schema, moduleTables: list })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) })
  }
})

/**
 * Admin: xem nhanh dữ liệu bảng MySQL (preview) cho Tool.
 */
app.get('/api/htql-mysql-table-preview', async (req, res) => {
  try {
    if (!mysqlPool) {
      return res.status(503).json({ ok: false, error: 'MySQL chưa cấu hình (API đang dùng JSON).' })
    }
    const tableName = String(req.query.table ?? '').trim()
    const safeTable = sqlIdentSafe(tableName)
    if (!safeTable) {
      return res.status(400).json({ ok: false, error: 'Tên bảng không hợp lệ.' })
    }
    const limit = parseMysqlPreviewLimit(req.query.limit)
    const [existsRows] = await mysqlPool.query(
      `SELECT TABLE_NAME AS name
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       LIMIT 1`,
      [tableName],
    )
    if (!Array.isArray(existsRows) || !existsRows.length) {
      return res.status(404).json({ ok: false, error: `Không tìm thấy bảng ${tableName}.` })
    }
    const [countRows] = await mysqlPool.query(`SELECT COUNT(*) AS c FROM ${safeTable}`)
    const totalRows = Number(countRows?.[0]?.c) || 0
    const [rows] = await mysqlPool.query(`SELECT * FROM ${safeTable} LIMIT ?`, [limit])
    const list = Array.isArray(rows) ? rows : []
    const columns = list.length ? Object.keys(list[0] || {}) : []
    res.json({
      ok: true,
      tableName,
      totalRows,
      limit,
      fetchedRows: list.length,
      columns,
      rows: list,
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) })
  }
})

mountHtqlUploadRoutes(app, {
  pathThietKe: PATH_THIET_KE,
  pathChungTu: PATH_HOADON_CHUNG_TU,
  pathVthhHinhAnh: PATH_VTHH_HINH_ANH,
})

app.get('/api/htql-client-registry', async (req, res) => {
  try {
    if (mysqlPool) {
      const [rows] = await mysqlPool.query('SELECT client_key, ip, data FROM htql_workstation')
      const clients = []
      for (const r of rows) {
        const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
        clients.push({
          clientKey: r.client_key,
          ip: r.ip,
          hostname: d.hostname || '',
          online: Boolean(d.online),
          lastSeen: d.lastSeen,
          clientVersion: d.clientVersion || '',
          connectionZone: d.connectionZone || '',
          lastPath: d.lastPath || '',
        })
      }
      clients.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))
      return res.json({
        expectedWebVersion: ROOT_PKG.version || 'unknown',
        serverApiVersion: API_RELEASE_VERSION,
        clients,
      })
    }
    const reg = normalizeRegistryKeys(loadClientRegistry())
    const clients = Object.entries(reg).map(([clientKey, v]) => ({
      clientKey,
      ip: v.ip || clientKey.replace(/^ip:/, '') || '',
      hostname: v.hostname || '',
      online: Boolean(v.online),
      lastSeen: v.lastSeen,
      clientVersion: v.clientVersion || '',
      connectionZone: v.connectionZone || '',
      lastPath: v.lastPath || '',
    }))
    clients.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))
    res.json({
      expectedWebVersion: ROOT_PKG.version || 'unknown',
      serverApiVersion: API_RELEASE_VERSION,
      clients,
    })
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
})

app.get('/api/htql-client-update-manifest', (req, res) => {
  try {
    const manifestPath = path.join(HTQL_UPDATE_CLIENT_DIR, 'htql-client-manifest.json')
    if (!fs.existsSync(manifestPath)) {
      return res.json({
        version: null,
        latestFile: null,
        message: 'Chưa có gói cài trên máy chủ (Control Center → tải .exe).',
      })
    }
    const j = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    if (!j.semver && j.version) {
      const tagM = String(j.version).match(/V(\d{4})_(\d{2})_(\d{2})_(\d+)/i)
      if (tagM) {
        j.semver = `${tagM[1]}.${parseInt(tagM[2], 10)}.${parseInt(tagM[3], 10)}-${tagM[4]}`
      }
    }
    const host = req.get('host') || `localhost:${process.env.PORT || 3001}`
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http'
    const fn = j.latestFile || j.fileName
    if (fn && safeInstallerBasename(fn)) {
      j.downloadUrl = `${proto}://${host}/api/htql-client-installer/${encodeURIComponent(safeInstallerBasename(fn))}`
    }
    res.json(j)
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
})

app.get('/api/htql-client-installer/:name', (req, res) => {
  const safe = safeInstallerBasename(req.params.name)
  if (!safe) return res.status(400).json({ error: 'Tên file không hợp lệ' })
  const dir = path.resolve(HTQL_UPDATE_CLIENT_DIR)
  const full = path.join(dir, safe)
  if (!full.startsWith(dir + path.sep) && full !== dir) return res.status(400).end()
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'Không tìm thấy file' })
  res.setHeader('Content-Disposition', `attachment; filename="${safe}"`)
  return res.sendFile(full)
})

/** VietQR tra MST — proxy, cache 24h khi thanh cong, retry khi 429 (client go truc tiep de bi 429). */
const taxBusinessCache = new Map()
const TAX_BUSINESS_CACHE_MS = 24 * 60 * 60 * 1000
const VIETQR_BUSINESS_BASE = 'https://api.vietqr.io/v2/business'
const VIETQR_UA = 'Mozilla/5.0 (compatible; HTQL-550/1.0; enterprise-tax-lookup)'
const VIETQR_MAX_ATTEMPTS = 4

async function fetchVietqrBusinessJson(mst) {
  const url = `${VIETQR_BUSINESS_BASE}/${encodeURIComponent(mst)}`
  let lastText = ''
  let lastStatus = 502
  for (let attempt = 0; attempt < VIETQR_MAX_ATTEMPTS; attempt++) {
    const r = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': VIETQR_UA },
    })
    lastStatus = r.status
    lastText = await r.text()
    if (r.status === 429) {
      let waitMs = 2000 * (attempt + 1)
      const ra = r.headers.get('retry-after')
      if (ra) {
        const sec = parseInt(ra, 10)
        if (!Number.isNaN(sec) && sec > 0) waitMs = Math.min(sec * 1000, 30000)
      }
      if (attempt < VIETQR_MAX_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, waitMs))
        continue
      }
      return {
        status: 429,
        body: {
          code: '429',
          desc: 'VietQR gioi han tan suat. Thu lai sau 1-2 phut.',
          data: null,
        },
      }
    }
    let parsed
    try {
      parsed = JSON.parse(lastText)
    } catch {
      if (attempt < VIETQR_MAX_ATTEMPTS - 1 && r.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, 1500))
        continue
      }
      return {
        status: r.status >= 400 ? r.status : 502,
        body: { code: '99', desc: 'Phan hoi VietQR khong phai JSON', data: null },
      }
    }
    return { status: r.status, body: parsed }
  }
  return {
    status: lastStatus,
    body: { code: '99', desc: lastText?.slice?.(0, 200) || 'VietQR loi', data: null },
  }
}

app.get('/api/tax-business/:mst', async (req, res) => {
  const mst = String(req.params.mst || '')
    .trim()
    .replace(/\s/g, '')
  if (!mst || !/^\d{10,14}$/.test(mst)) {
    return res.status(400).json({ error: 'Ma so thue khong hop le' })
  }
  const now = Date.now()
  const hit = taxBusinessCache.get(mst)
  if (hit && hit.exp > now) {
    res.setHeader('X-HTQL-Tax-Cache', 'hit')
    return res.status(200).json(hit.body)
  }
  try {
    const { status, body } = await fetchVietqrBusinessJson(mst)
    if (
      status >= 200 &&
      status < 300 &&
      body &&
      typeof body === 'object' &&
      body.code === '00' &&
      body.data
    ) {
      taxBusinessCache.set(mst, { exp: now + TAX_BUSINESS_CACHE_MS, body })
      res.setHeader('X-HTQL-Tax-Cache', 'miss')
    }
    return res.status(status).json(body)
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) })
  }
})

app.get('/api/cccd-lookup', (req, res) => {
  const cccd = (req.query.cccd || '').toString().trim().replace(/\s/g, '')
  if (!cccd) return res.json(null)
  res.json(null)
})

async function migrateLegacyRegistryToWorkstation(pool) {
  if (!pool) return
  const [cnt] = await pool.query('SELECT COUNT(*) as n FROM htql_workstation')
  if (cnt[0].n > 0) return
  try {
    const [rows] = await pool.query('SELECT ip, data FROM htql_client_registry')
    for (const r of rows) {
      const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
      await pool.query(
        `INSERT INTO htql_workstation (client_key, ip, data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)`,
        [`ip:${r.ip}`, r.ip, JSON.stringify(d)],
      )
    }
  } catch (_) {
    /* bảng legacy có thể trống */
  }
}

async function start() {
  ensureHtqlDataDirectories()
  warnIfSsdDirsMissing()
  if (useMysqlStorage()) {
    await tryBootstrapMysqlDatabase()
    mysqlPool = createMysqlPool()
    await ensureSchema(mysqlPool)
    process.stdout.write(
      `[HTQL_550] MySQL schema v${HTQL_MYSQL_SCHEMA_VERSION}: ${HTQL_ENSURED_TABLES.length} bảng (CREATE IF NOT EXISTS mỗi lần khởi động)\n`,
    )
    await migrateLegacyRegistryToWorkstation(mysqlPool)
    repoDvt = createJsonEntityRepo(mysqlPool, 'don_vi_tinh')
    repoNcc = createJsonEntityPartitionRepo(mysqlPool, 'htql_doi_tac', 'partner_type', 'nha_cung_cap')
    repoKh = createJsonEntityPartitionRepo(mysqlPool, 'htql_doi_tac', 'partner_type', 'khach_hang')
    try {
      await backfillModuleMysqlTables(mysqlPool)
      process.stdout.write('[HTQL_550] MySQL module tables: đã đồng bộ registry và tự tạo bảng theo module khi có dữ liệu mới.\n')
    } catch (e) {
      process.stderr.write(`[HTQL_550] Cảnh báo backfill module tables: ${String(e?.message || e)}\n`)
    }
    await migrateJsonFilesIfEmpty(mysqlPool, { dataDir: DATA_DIR })
    const rcfg = resolveMysqlEnv()
    process.stdout.write(
      `[HTQL_550] MySQL: ${rcfg.database} @ ${rcfg.host}:${rcfg.port} (DVT/NCC/KH → bảng MySQL, không ghi khachHang.json khi pool OK)\n`,
    )
  } else {
    const r = resolveMysqlEnv()
    const miss = mysqlEnvMissingKeys()
    process.stdout.write(
      `[HTQL_550] Lưu trữ: file JSON trong DATA_DIR — chưa bật MySQL. Thiếu biến: ${miss.length ? miss.join(', ') : '(không xác định)'} | đã đọc host='${r.host || ''}' db='${r.database || ''}' user='${r.user || ''}'\n`,
    )
  }

  if (process.env.HTQL_STORAGE_MIGRATE_ON_START === '1') {
    const { runMigrateStorageLayout } = await import('./migrateStorageLayout.js')
    const mig = await runMigrateStorageLayout({
      pathThietKe: PATH_THIET_KE,
      pathHoaDonChungTu: PATH_HOADON_CHUNG_TU,
      mysqlPool,
      dataDir: DATA_DIR,
    })
    process.stdout.write(`[HTQL_550] Storage layout migration: ${JSON.stringify(mig)}\n`)
  }

  mountRoutes()

  const PORT = Number(process.env.PORT || 3001)
  app.listen(PORT, '0.0.0.0', () => {
    process.stdout.write(
      `[HTQL_550] API cổng ${PORT} | DATA_DIR=${DATA_DIR} | SSD_ROOT=${SSD_ROOT || '(không set)'} | DEMO=${DEMO_MODE ? '1' : '0'}\n`,
    )
    process.stdout.write(
      `[HTQL_550] SSD file: PATH_THIET_KE=${PATH_THIET_KE} | PATH_HOADON_CHUNG_TU=${PATH_HOADON_CHUNG_TU}\n`,
    )
    process.stdout.write(
      '[HTQL_550] Upload: POST /api/htql-upload | GET /api/htql-files — client dùng /api (proxy hoặc LAN).\n',
    )
    if (mysqlPool) {
      const yieldBg = Math.min(Math.max(Number(process.env.HTQL_HTTP_SESSION_PURGE_YIELD_MS ?? 25) || 25, 0), 2000)
      setImmediate(() => {
        purgeStaleHtqlHttpSessions(mysqlPool, { yieldMs: yieldBg }).catch((e) =>
          console.warn('[HTQL_550] htql_http_session purge (nền):', e?.message || e),
        )
      })
    }
  })
}

start().catch((e) => {
  console.error(e)
  process.exit(1)
})
