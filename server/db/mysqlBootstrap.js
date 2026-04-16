/**
 * Tùy chọn: tạo database + user MySQL khi có HTQL_MYSQL_BOOTSTRAP=1 và HTQL_MYSQL_ADMIN_PASSWORD.
 * Dùng tài khoản admin (mặc định root) — chỉ bật lần đầu trên máy chủ, không commit mật khẩu.
 */
import mysql from 'mysql2/promise'
import { resolveMysqlEnv } from './mysqlEnv.js'

function sqlIdent(s) {
  const t = String(s || '').replace(/[^a-zA-Z0-9_]/g, '')
  return t || null
}

export async function tryBootstrapMysqlDatabase() {
  if (process.env.HTQL_MYSQL_BOOTSTRAP !== '1') return
  const adminUser = sqlIdent(process.env.HTQL_MYSQL_ADMIN_USER) || 'root'
  const adminPw = process.env.HTQL_MYSQL_ADMIN_PASSWORD || ''
  if (!adminPw) {
    process.stderr.write('[HTQL_550] HTQL_MYSQL_BOOTSTRAP=1 nhưng thiếu HTQL_MYSQL_ADMIN_PASSWORD — bỏ qua bootstrap.\n')
    return
  }
  const resolved = resolveMysqlEnv()
  const db = sqlIdent(resolved.database)
  const appUser = sqlIdent(resolved.user)
  const appPw = resolved.password ?? ''
  const host = resolved.host || '127.0.0.1'
  const port = resolved.port || 3306
  if (!db || !appUser) {
    process.stderr.write('[HTQL_550] Bootstrap: thiếu HTQL_MYSQL_DATABASE / HTQL_MYSQL_USER.\n')
    return
  }
  let conn
  try {
    conn = await mysql.createConnection({
      host,
      port,
      user: adminUser,
      password: adminPw,
      multipleStatements: false,
    })
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    )
    try {
      await conn.query(`CREATE USER '${appUser}'@'localhost' IDENTIFIED BY ?`, [appPw])
    } catch (e) {
      const msg = String(e && e.message ? e.message : e)
      if (!/exists|Duplicate/i.test(msg)) throw e
      await conn.query(`ALTER USER '${appUser}'@'localhost' IDENTIFIED BY ?`, [appPw])
    }
    await conn.query(`GRANT ALL PRIVILEGES ON \`${db}\`.* TO '${appUser}'@'localhost'`)
    await conn.query(`FLUSH PRIVILEGES`)
    process.stdout.write(`[HTQL_550] MySQL bootstrap: đã đảm bảo DB/user cho ${db} @localhost.\n`)
  } catch (e) {
    process.stderr.write(`[HTQL_550] MySQL bootstrap lỗi: ${e.message || e}\n`)
  } finally {
    if (conn) await conn.end().catch(() => {})
  }
}
