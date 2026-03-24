import { limitShift, shift } from '@floating-ui/react'
import type { Middleware } from '@floating-ui/react'

/**
 * Popup react-datepicker (HTQL): không bị clip bởi overflow/modal.
 * - portalId: render vào `#htql-react-datepicker-portal` (body).
 * - popperPlacement: ưu tiên **phía dưới** ô nhập (`bottom-start`); Floating UI `flip` (mặc định trong react-datepicker) đổi lên trên khi thiếu chỗ.
 * - shift + limitShift: giữ lịch trong viewport (không tràn ngang/dọc).
 * - strategy `fixed`: tránh lệch vì tổ tiên có transform/overflow.
 * - shouldCloseOnSelect: `true` — lịch **chỉ ngày** đóng sau khi chọn ngày (form có giờ ghi đè `shouldCloseOnSelect={false}`).
 * @see `.cursor/rules/o-nhap.mdc` §2
 */
export const HTQL_DATEPICKER_PORTAL_ID = 'htql-react-datepicker-portal'

const htqlDatePickerMiddleware: Middleware[] = [
  shift({
    padding: 10,
    crossAxis: true,
    limiter: limitShift({ offset: 8 }),
  }),
]

export const htqlDatePickerPopper = {
  portalId: HTQL_DATEPICKER_PORTAL_ID,
  popperPlacement: 'bottom-start' as const,
  popperProps: {
    strategy: 'fixed' as const,
  },
  popperModifiers: htqlDatePickerMiddleware,
  shouldCloseOnSelect: true,
}

/** Tên import cũ (trước đây ưu tiên `top-start`); cùng cấu hình với `htqlDatePickerPopper`. */
export const htqlDatePickerPopperTop = htqlDatePickerPopper
