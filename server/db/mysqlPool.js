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

  return mysql.createPool({
    host,
    port,
    user,
    password,
    waitForConnections: true,
    connectionLimit: Number(process.env.HTQL_MYSQL_CONNECTION_LIMIT || 16),
    enableKeepAlive: true,
    charset: 'utf8mb4',
    database,
  })
}
