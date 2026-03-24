/** Viền báo lỗi validation (đồng bộ rule form-validation-focus.mdc) */
export const HTQL_FORM_ERROR_BORDER = '1px solid #dc2626'

export function htqlFocusAndScrollIntoView(el: HTMLElement | null): void {
  if (!el) return
  el.focus()
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}
