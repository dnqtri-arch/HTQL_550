import type { CSSProperties } from 'react'

/**
 * Kiểu hiển thị chuẩn hệ thống cho ô có dropdown + nút thêm (giống ĐVT chính trong form Thêm hàng hóa).
 * Dùng cho: DKTT, NV mua hàng, và các ô lookup tương tự.
 * Import và dùng các hằng số / style này để đồng bộ toàn hệ thống.
 */

/** Chiều cao chuẩn ô nhập và nút (dropdown, +) trong nhóm lookup — bằng ĐVT chính (24px). */
export const LOOKUP_CONTROL_HEIGHT = 24

/** Chiều rộng vùng mũi tên xổ xuống (chevron) nằm trong ô nhập. */
export const LOOKUP_CHEVRON_WIDTH = 22

/** Style cho ô input/select khi có chevron overlay bên phải (paddingRight để chừa chỗ chevron). */
export const lookupInputWithChevronStyle: CSSProperties = {
  height: LOOKUP_CONTROL_HEIGHT,
  minHeight: LOOKUP_CONTROL_HEIGHT,
  paddingRight: 26,
  boxSizing: 'border-box',
}

/**
 * Style cho vùng chevron (mũi tên xổ xuống) nằm trong ô — nền accent, chữ đen.
 * Dùng với position: absolute, right: 0, top: 0, bottom: 0, width: LOOKUP_CHEVRON_WIDTH.
 */
export const lookupChevronOverlayStyle: CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 0,
  bottom: 0,
  width: LOOKUP_CHEVRON_WIDTH,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
  background: 'var(--accent)',
  color: 'var(--accent-text)',
}

/**
 * Style cho nút sổ xuống (dropdown) hoặc nút + cạnh ô lookup — vuông 24x24, nền accent.
 * Dùng cho: nút ChevronDown riêng, nút Plus (Thêm) trong ĐVT chính, DKTT, NV mua hàng.
 */
export const lookupActionButtonStyle: CSSProperties = {
  width: LOOKUP_CONTROL_HEIGHT,
  minWidth: LOOKUP_CONTROL_HEIGHT,
  height: LOOKUP_CONTROL_HEIGHT,
  minHeight: LOOKUP_CONTROL_HEIGHT,
  boxSizing: 'border-box',
  padding: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--accent)',
  color: 'var(--accent-text)',
  border: '1px solid var(--connector, var(--border))',
  borderRadius: '4px',
  cursor: 'pointer',
  flexShrink: 0,
}
