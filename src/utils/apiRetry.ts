/**
 * Retry wrapper cho API - giảm lỗi 503 khi server quá tải.
 * Chia nhỏ batch: gọi tuần tự thay vì Promise.all khi cần.
 */

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 500

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: Error | null = null
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      if (i < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (i + 1)))
      }
    }
  }
  throw lastError ?? new Error('Unknown error')
}

/** Gọi tuần tự thay vì song song - tránh quá tải server */
export async function runSequential<T>(fns: (() => Promise<T>)[]): Promise<T[]> {
  const results: T[] = []
  for (const fn of fns) {
    results.push(await fn())
  }
  return results
}
