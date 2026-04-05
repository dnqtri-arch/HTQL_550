import { forwardRef } from 'react'

const inputStyle: React.CSSProperties = {
  padding: '2px 6px',
  fontSize: 11,
  background: '#fff',
  border: '1px solid var(--border)',
  borderRadius: 4,
  color: 'var(--text-primary)',
  height: 24,
  minHeight: 24,
  boxSizing: 'border-box',
  flex: 1,
  minWidth: 0,
}

/** Custom input cho TG nhận hàng: cho gõ tay (react-datepicker parse theo dateFormat); onClick vẫn mở lịch khi mở popper. onOpen khi cần controlled open. */
export const DatePickerTgNhanInput = forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<'input'> & { onOpen?: () => void }
>(function DatePickerTgNhanInput(props, ref) {
  const { onClick, onOpen, ...rest } = props
  return (
    <input
      {...rest}
      ref={ref}
      onClick={(e) => {
        onClick?.(e)
        onOpen?.()
      }}
      style={{
        ...inputStyle,
        width: '100%',
        boxSizing: 'border-box',
        cursor: rest.disabled ? 'default' : 'text',
        textAlign: 'right',
        fontVariantNumeric: 'tabular-nums',
      }}
    />
  )
})
