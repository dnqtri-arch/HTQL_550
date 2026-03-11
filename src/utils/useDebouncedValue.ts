import { useState, useEffect } from 'react'

/**
 * Trả về giá trị debounced: value chỉ cập nhật sau `delayMs` khi `inputValue` ngừng thay đổi.
 */
export function useDebouncedValue<T>(inputValue: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(inputValue)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputValue)
    }, delayMs)
    return () => clearTimeout(timer)
  }, [inputValue, delayMs])

  return debouncedValue
}
