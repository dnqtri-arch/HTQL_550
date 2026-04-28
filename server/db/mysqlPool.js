/**
 * Pool MySQL (mysql2/promise). Bật khi đủ host + database + user (HTQL_MYSQL_* hoặc DB_*).
 */
import mysql from 'mysql2/promise'
import { resolveMysqlEnv } from './mysqlEnv.js'

export { useMysqlStorage } from './mysqlEnv.js'

/** @returns {import('mysql2/promise').Pool | null} */
export function createMysqlPool() {
  const { host, database, user, password, port } = resolveMysqlEnv()
  if (!host || !database || !user) return null

  const connectionLimit = Number(process.env.HTQL_MYSQL_CONNECTION_LIMIT || 16)
  const connectTimeout = Number(process.env.HTQL_MYSQL_CONNECT_TIMEOUT_MS || 15_000)

  return mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: Number.isFinite(connectionLimit) && connectionLimit > 0 ? connectionLimit : 16,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: 'utf8mb4',
    /** Bắt tay TCP — tránh treo vô hạn khi DB chưa sẵn sàng (MySQL 5.7 / 8.x / MariaDB 10.4+). */
    connectTimeout: Number.isFinite(connectTimeout) && connectTimeout > 0 ? connectTimeout : 15_000,
    /**
     * Ghi JSON: luôn bind chuỗi (JSON.stringify) ở route/repo — không truyền object thô vào placeholder
     * cho cột JSON (mysql2 có thể tạo CAST(? AS JSON), một số bản MariaDB/MySQL cũ từ chối).
     */
    multipleStatements: false,
  })
}
