import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { ReactDatePickerCustomHeaderProps } from 'react-datepicker'

const BTN_SIZE = 32
const HEADER_PADDING_X = 8

const headerWrap: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingLeft: HEADER_PADDING_X,
  paddingRight: HEADER_PADDING_X,
  paddingTop: 4,
  paddingBottom: 4,
  width: '100%',
  boxSizing: 'border-box',
}

const navBtn: React.CSSProperties = {
  width: BTN_SIZE,
  height: BTN_SIZE,
  minWidth: BTN_SIZE,
  minHeight: BTN_SIZE,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
  borderRadius: '50%',
  padding: 0,
  flexShrink: 0,
}

const centerWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flex: 1,
  justifyContent: 'center',
  minWidth: 0,
}

const selectStyle: React.CSSProperties = {
  padding: '2px 6px',
  fontSize: 11,
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  color: 'inherit',
  cursor: 'pointer',
  minWidth: 60,
}

/** Custom header cho DatePicker (Ngày Giờ & chỉ Ngày): flex space-between, ChevronLeft/Right, hover bo tròn */
export function DatePickerCustomHeader({
  date,
  changeMonth,
  changeYear,
  decreaseMonth,
  increaseMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
}: ReactDatePickerCustomHeaderProps) {
  const month = date.getMonth()
  const year = date.getFullYear()

  const years: number[] = []
  for (let y = year - 80; y <= year + 20; y++) years.push(y)

  return (
    <div style={headerWrap} className="htql-datepicker-custom-header">
      <button
        type="button"
        className="htql-datepicker-nav-btn"
        aria-label="Tháng trước"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          decreaseMonth()
        }}
        disabled={prevMonthButtonDisabled}
        style={{
          ...navBtn,
          opacity: prevMonthButtonDisabled ? 0.4 : 1,
        }}
      >
        <ChevronLeft size={18} strokeWidth={2.5} />
      </button>

      <div style={centerWrap}>
        <select
          value={month}
          onChange={(e) => changeMonth(Number(e.target.value))}
          style={selectStyle}
          className="htql-datepicker-month-select"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i}>
              {format(new Date(year, i, 1), 'LLLL', { locale: vi })}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => changeYear(Number(e.target.value))}
          style={selectStyle}
          className="htql-datepicker-year-select"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="htql-datepicker-nav-btn"
        aria-label="Tháng sau"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          increaseMonth()
        }}
        disabled={nextMonthButtonDisabled}
        style={{
          ...navBtn,
          opacity: nextMonthButtonDisabled ? 0.4 : 1,
        }}
      >
        <ChevronRight size={18} strokeWidth={2.5} />
      </button>
    </div>
  )
}
