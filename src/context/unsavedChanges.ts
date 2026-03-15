/**
 * Theo dõi form đang nhập dở để cảnh báo khi refresh (F5) hoặc rời trang.
 * Form gọi markDirty() khi người dùng sửa, markClean() khi lưu hoặc đóng.
 */

let _hasUnsavedChanges = false

export function setUnsavedChanges(dirty: boolean): void {
  _hasUnsavedChanges = dirty
}

export function getUnsavedChanges(): boolean {
  return _hasUnsavedChanges
}
