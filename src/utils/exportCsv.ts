/**
 * Xuất dữ liệu dạng CSV (UTF-8 với BOM) và tải file.
 * @param rows - Hàng đầu tiên thường là header, các hàng sau là dữ liệu. Mỗi hàng là mảng string.
 * @param filename - Tên file tải xuống (vd: 'Don_vi_tinh.csv')
 */
export function exportCsv(rows: string[][], filename: string): void {
  if (rows.length === 0) return
  const csv = rows.map((row) => row.join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
