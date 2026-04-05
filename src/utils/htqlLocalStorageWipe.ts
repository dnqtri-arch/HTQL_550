/**
 * Xóa toàn bộ khóa dữ liệu HTQL trong `localStorage` (tiền tố `htql`).
 * Dùng cho chức năng «xóa toàn bộ hệ thống» / reset dữ liệu mock — phải gọi hàm này (hoặc tương đương),
 * không chỉ ẩn bản ghi trên UI.
 */
export function wipeAllHtqlLocalStorageKeys(): void {
  if (typeof localStorage === 'undefined') return
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
