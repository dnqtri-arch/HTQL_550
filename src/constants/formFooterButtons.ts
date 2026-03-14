import type { CSSProperties } from 'react'

/**
 * Nút footer thống nhất theo form Thêm vật tư hàng hóa (phân hệ Kho).
 * Không dùng icon — chỉ chữ. Thứ tự: Hủy bỏ | Cất/Lưu | Cất & Thêm / Lưu và tiếp tục.
 */

const formFooterButtonBase: CSSProperties = {
  padding: '4px 14px',
  fontSize: 11,
  fontFamily: "'Tahoma', Arial, sans-serif",
  border: '1px solid var(--border)',
  borderRadius: 0,
  cursor: 'pointer',
  fontWeight: 'bold',
}

/** Nút Hủy bỏ — giống form Vật tư hàng hóa */
export const formFooterButtonCancel: CSSProperties = {
  ...formFooterButtonBase,
  background: 'var(--bg-tab)',
  color: 'var(--text-primary)',
}

/** Nút Cất / Lưu / Đồng ý */
export const formFooterButtonSave: CSSProperties = {
  ...formFooterButtonBase,
  background: 'var(--accent)',
  color: 'var(--accent-text)',
}

/** Nút Cất & Thêm / Lưu và tiếp tục / Đồng ý và thêm — cùng kiểu Hủy bỏ (nền tab) */
export const formFooterButtonSaveAndAdd: CSSProperties = {
  ...formFooterButtonBase,
  background: 'var(--bg-tab)',
  color: 'var(--text-primary)',
}
