/**
 * Kho chuỗi nghiệp vụ trong RAM (thay localStorage cho entity).
 * Đồng bộ đa máy: htqlKvSync patch setItem/removeItem → PUT/DELETE /api/htql-kv.
 * Không dùng cho: htql_device_id, __htql_offline_kv_spool__ (vẫn localStorage).
 */

const store = new Map<string, string>()
/** Thứ tự chèn — hỗ trợ .key(i) giống Storage */
const insertionOrder: string[] = []

function ensureOrdered(key: string): void {
  if (store.has(key)) return
  insertionOrder.push(key)
}

export function htqlEntityGetItemBase(key: string): string | null {
  return store.get(key) ?? null
}

export function htqlEntitySetItemBase(key: string, value: string): void {
  ensureOrdered(key)
  store.set(key, value)
}

export function htqlEntityRemoveItemBase(key: string): void {
  store.delete(key)
  const i = insertionOrder.indexOf(key)
  if (i >= 0) insertionOrder.splice(i, 1)
}

/** API giống localStorage cho mã nghiệp vụ — phương thức có thể bị htqlKvSync bọc */
export const htqlEntityStorage = {
  get length(): number {
    return store.size
  },
  key(index: number): string | null {
    return insertionOrder[index] ?? null
  },
  getItem(key: string): string | null {
    return htqlEntityGetItemBase(key)
  },
  setItem(key: string, value: string): void {
    htqlEntitySetItemBase(key, value)
  },
  removeItem(key: string): void {
    htqlEntityRemoveItemBase(key)
  },
  clear(): void {
    store.clear()
    insertionOrder.length = 0
  },
}

const DEVICE_KEY = 'htql_device_id'
const OFFLINE_KV_SPOOL_KEY = '__htql_offline_kv_spool__'
const LEGACY_SKIP = new Set([DEVICE_KEY, OFFLINE_KV_SPOOL_KEY])

/**
 * Một lần khi có localStorage cũ: chép khóa htql* (trừ thiết bị/spool) vào RAM rồi xóa khỏi localStorage.
 * Gọi trước khi htqlKvSync bọc setItem (dùng base để không bắn PUT).
 */
export function migrateLegacyHtqlEntityLocalStorageOnce(): void {
  if (typeof localStorage === 'undefined') return
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('htql') && !LEGACY_SKIP.has(k)) keys.push(k)
  }
  for (const k of keys) {
    const v = localStorage.getItem(k)
    if (v != null) {
      if (!store.has(k)) htqlEntitySetItemBase(k, v)
    }
    try {
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  }
}

export function wipeHtqlEntityStorage(): void {
  htqlEntityStorage.clear()
}
