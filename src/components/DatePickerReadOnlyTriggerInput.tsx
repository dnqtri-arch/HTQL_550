import { forwardRef } from 'react'

/**
 * Ô kích hoạt lịch react-datepicker: readOnly (không gõ tay), click mở lịch.
 * Không đặt `readOnly` trên `<DatePicker />` — thư viện chặn `handleSelect` khi `readOnly` và không cập nhật ngày.
 */
export const DatePickerReadOnlyTriggerInput = forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<'input'>
>(function DatePickerReadOnlyTriggerInput(props, ref) {
  const { onClick, onFocus, disabled, className, style, ...rest } = props
  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      readOnly
      disabled={disabled}
      onClick={onClick}
      onFocus={onFocus}
      className={className}
      style={{
        padding: '2px 6px',
        fontSize: 11,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        color: 'var(--text-primary)',
        height: 24,
        minHeight: 24,
        width: '100%',
        boxSizing: 'border-box',
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'right',
        fontVariantNumeric: 'tabular-nums',
        ...style,
      }}
      aria-readonly
    />
  )
})
