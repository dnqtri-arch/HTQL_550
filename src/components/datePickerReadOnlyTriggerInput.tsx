import { forwardRef } from 'react'

/**
 * Ô kích hoạt lịch react-datepicker. Mặc định `readOnly` (chỉ click mở lịch);
 * truyền `readOnly={false}` để gõ tay theo `dateFormat` (nền có thể đặt `#fff` qua `style`).
 * Không đặt `readOnly` trên `<DatePicker />` — chỉ trên customInput.
 */
export const DatePickerReadOnlyTriggerInput = forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<'input'> & { readOnly?: boolean }
>(function DatePickerReadOnlyTriggerInput(props, ref) {
  const { onClick, onFocus, disabled, className, style, readOnly = true, ...rest } = props
  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      readOnly={readOnly}
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
        cursor: disabled ? 'default' : readOnly ? 'pointer' : 'text',
        textAlign: 'right',
        fontVariantNumeric: 'tabular-nums',
        ...style,
      }}
      aria-readonly={readOnly ? true : undefined}
    />
  )
})
