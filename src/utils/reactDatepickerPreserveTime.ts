/**
 * react-datepicker (ngày giờ): khi user chọn **ngày mới** trên lịch, giữ **giờ/phút/giây** của giá trị trước.
 * Khi chỉnh giờ hoặc vẫn cùng ngày calendar → dùng `incoming` từ picker (không ghi đè).
 */
export function preserveTimeWhenCalendarDayChanges(incoming: Date | null, previous: Date | null): Date | null {
  if (!incoming) return null
  if (!previous) return incoming
  const sameDay =
    incoming.getFullYear() === previous.getFullYear() &&
    incoming.getMonth() === previous.getMonth() &&
    incoming.getDate() === previous.getDate()
  if (sameDay) return incoming
  const out = new Date(incoming)
  out.setHours(previous.getHours(), previous.getMinutes(), previous.getSeconds(), previous.getMilliseconds())
  return out
}
