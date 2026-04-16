/**
 * Chuẩn hoá biến môi trường MySQL cho API Node.
 * Ưu tiên HTQL_MYSQL_*; tương thích DB_* / MYSQL_* (cấu hình tay, aaPanel, file .env cũ).
 */
function trimEnv(v) {
  return String(v ?? '').trim()
}

/**
 * @returns {{ host: string, database: string, user: string, password: string, port: number }}
 */
export function resolveMysqlEnv() {
  const host = trimEnv(process.env.HTQL_MYSQL_HOST || process.env.DB_HOST || process.env.MYSQL_HOST)
  const database = trimEnv(
    process.env.HTQL_MYSQL_DATABASE || process.env.DB_NAME || process.env.MYSQL_DATABASE,
  )
  const user = trimEnv(process.env.HTQL_MYSQL_USER || process.env.DB_USER || process.env.MYSQL_USER)
  const password = String(
    process.env.HTQL_MYSQL_PASSWORD ??
      process.env.DB_PASS ??
      process.env.DB_PASSWORD ??
      process.env.MYSQL_PASSWORD ??
      '',
  )
  const port = Number(process.env.HTQL_MYSQL_PORT || process.env.DB_PORT || process.env.MYSQL_PORT || 3306)
  return {
    host,
    database,
    user,
    password,
    port: Number.isFinite(port) && port > 0 ? port : 3306,
  }
}

export function useMysqlStorage() {
  const { host, database, user } = resolveMysqlEnv()
  return Boolean(host && database && user)
}

/** Gợi ý log khi fallback JSON — thiếu biến nào (HTQL_MYSQL_* hoặc DB_*). */
export function mysqlEnvMissingKeys() {
  const { host, database, user } = resolveMysqlEnv()
  const missing = []
  if (!host) missing.push('HTQL_MYSQL_HOST|DB_HOST')
  if (!database) missing.push('HTQL_MYSQL_DATABASE|DB_NAME')
  if (!user) missing.push('HTQL_MYSQL_USER|DB_USER')
  return missing
}
