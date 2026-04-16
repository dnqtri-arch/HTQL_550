import fs from 'fs'

const p = 'src/modules/crm/banHang/donHangBan/donHangBanChungTuApi.ts'
let s = fs.readFileSync(p, 'utf8')
const start = s.indexOf('/**\n')
const end = s.indexOf('\n */', start)
if (start < 0 || end < 0) {
  console.error('comment block not found')
  process.exit(1)
}
const inner = `
 * API ��ơn hàng bán (ch� đầy đ��) — header + chi tiết.
 * Mã đơn: rule ma-he-thong.mdc (prefix DHB).
 *
 * Dữ liệu: JSON bundle \`/api/htql-module-bundle/donHangBanChungTu\` (MySQL \`htql_module_bundle\` hoặc file fallback).
`
s = s.slice(0, start + 3) + inner + s.slice(end)
fs.writeFileSync(p, s)
console.log('header ok')
