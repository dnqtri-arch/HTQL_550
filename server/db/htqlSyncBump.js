/**
 * system_version toàn cục + log delta (MySQL hoặc file JSON fallback).
 * Gọi sau mỗi lần ghi htql_kv_store / htql_module_bundle thành công.
 */
import fs from 'fs'
import path from 'path'

const STATE_FILE = 'htql_system_state.json'
const LOG_FILE = 'htql_sync_log.json'
const MAX_FILE_LOG = 5000

function statePath(dataDir) {
  return path.join(dataDir, STATE_FILE)
}

function logPath(dataDir) {
  return path.join(dataDir, LOG_FILE)
}

function readJsonFile(p, fallback) {
  try {
    const raw = fs.readFileSync(p, 'utf8')
    const j = JSON.parse(raw)
    return j && typeof j === 'object' && !Array.isArray(j) ? j : fallback
  } catch {
    return fallback
  }
}

function writeJsonFile(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8')
}

/**
 * @param {import('mysql2/promise').Pool | null} mysqlPool
 * @param {string} dataDir
 */
export async function getSystemVersionValue(mysqlPool, dataDir) {
  if (mysqlPool) {
    const [rows] = await mysqlPool.query(
      `SELECT system_version FROM htql_system_state WHERE singleton = 'x' LIMIT 1`,
    )
    if (rows.length) return Number(rows[0].system_version) || 0
    return 0
  }
  const st = readJsonFile(statePath(dataDir), { system_version: 0 })
  return Number(st.system_version) || 0
}

/**
 * @param {import('mysql2/promise').Pool | null} mysqlPool
 * @param {string} dataDir
 */
export async function getMaxSyncLogId(mysqlPool, dataDir) {
  if (mysqlPool) {
    const [rows] = await mysqlPool.query(`SELECT COALESCE(MAX(id), 0) AS m FROM htql_sync_log`)
    return Number(rows[0]?.m) || 0
  }
  const st = readJsonFile(logPath(dataDir), { next_id: 1, entries: [] })
  const entries = Array.isArray(st.entries) ? st.entries : []
  let max = 0
  for (const e of entries) {
    const id = Number(e.id) || 0
    if (id > max) max = id
  }
  return max
}

/**
 * @param {import('mysql2/promise').Pool} conn - pool connection trong transaction
 */
export async function bumpSystemVersionMysqlConn(conn) {
  await conn.query(
    `UPDATE htql_system_state SET system_version = system_version + 1 WHERE singleton = 'x'`,
  )
}

/**
 * @param {import('mysql2/promise').Pool} conn
 * @param {'kv'|'bundle'} scope
 * @param {string | null} refKey
 * @param {string | null} moduleId
 */
export async function appendSyncLogMysqlConn(conn, scope, refKey, moduleId) {
  await conn.query(
    `INSERT INTO htql_sync_log (scope, ref_key, module_id) VALUES (?, ?, ?)`,
    [scope, refKey, moduleId],
  )
}

/** Sau khi insert log — giữ khoảng 100k dòng gần nhất khi bảng quá lớn. */
export async function pruneSyncLogIfNeededMysql(pool) {
  const [mx] = await pool.query(`SELECT COALESCE(MAX(id), 0) AS m FROM htql_sync_log`)
  const maxId = Number(mx[0]?.m) || 0
  if (maxId > 200000) {
    const cutoff = maxId - 100000
    await pool.query(`DELETE FROM htql_sync_log WHERE id < ?`, [cutoff])
  }
}

/** File fallback: một lần bump + nhiều dòng log (KV batch). */
export function bumpAfterKvBatchFile(dataDir, keys) {
  const sp = statePath(dataDir)
  const st = readJsonFile(sp, { system_version: 0 })
  st.system_version = (Number(st.system_version) || 0) + 1
  writeJsonFile(sp, st)
  const v = st.system_version

  const lp = logPath(dataDir)
  const log = readJsonFile(lp, { next_id: 1, entries: [] })
  let nextId = Number(log.next_id) || 1
  const entries = Array.isArray(log.entries) ? log.entries : []
  for (const k of keys) {
    entries.push({
      id: nextId,
      scope: 'kv',
      ref_key: k,
      module_id: null,
      created_at: new Date().toISOString(),
    })
    nextId++
  }
  while (entries.length > MAX_FILE_LOG) entries.shift()
  log.next_id = nextId
  log.entries = entries
  writeJsonFile(lp, log)
  return v
}

/** Một lần bump + một dòng log bundle. */
export function bumpAfterBundleWriteFile(dataDir, moduleId) {
  const sp = statePath(dataDir)
  const st = readJsonFile(sp, { system_version: 0 })
  st.system_version = (Number(st.system_version) || 0) + 1
  writeJsonFile(sp, st)
  const v = st.system_version

  const lp = logPath(dataDir)
  const log = readJsonFile(lp, { next_id: 1, entries: [] })
  let nextId = Number(log.next_id) || 1
  const entries = Array.isArray(log.entries) ? log.entries : []
  entries.push({
    id: nextId,
    scope: 'bundle',
    ref_key: null,
    module_id: moduleId,
    created_at: new Date().toISOString(),
  })
  nextId++
  while (entries.length > MAX_FILE_LOG) entries.shift()
  log.next_id = nextId
  log.entries = entries
  writeJsonFile(lp, log)
  return v
}
