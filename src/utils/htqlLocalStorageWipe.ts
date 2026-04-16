import { wipeHtqlEntityStorage } from './htqlEntityStorage'

/**
 * Xóa toàn bộ dữ liệu HTQL: htqlEntityStorage (RAM) + mọi khóa htql* còn sót trong localStorage,
 * + khóa điều hướng tạm sessionStorage (tiền tố htql).
 */
export function wipeAllHtqlLocalStorageKeys(): void {
  wipeHtqlEntityStorage()
  if (typeof window === 'undefined') return

  if (typeof localStorage !== 'undefined') {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('htql')) toRemove.push(k)
    }
    for (const k of toRemove) {
      try {
        localStorage.removeItem(k)
      } catch {
        /* ignore quota / private mode */
      }
    }
  }

  if (typeof sessionStorage !== 'undefined') {
    const toRemoveSs: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k && k.startsWith('htql')) toRemoveSs.push(k)
    }
    for (const k of toRemoveSs) {
      try {
        sessionStorage.removeItem(k)
      } catch {
        /* ignore */
      }
    }
  }
}
