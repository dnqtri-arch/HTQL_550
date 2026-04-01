/**
 * Sao chép module donHangMua → hopDongMua (types + files), đổi tên & storage độc lập.
 * Chạy: node scripts/cloneHopDongMuaFromDonHangMua.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const srcDir = path.join(root, 'src', 'modules', 'crm', 'muaHang', 'donHangMua')
const destDir = path.join(root, 'src', 'modules', 'crm', 'muaHang', 'hopDongMua')
const typesSrc = path.join(root, 'src', 'types', 'donHangMua.ts')
const typesDest = path.join(root, 'src', 'types', 'hopDongMua.ts')

const fileMap = [
  ['donHangMuaApi.ts', 'hopDongMuaApi.ts'],
  ['donHangMuaForm.tsx', 'hopDongMuaForm.tsx'],
  ['donHangMua.tsx', 'hopDongMua.tsx'],
  ['donHangMuaAttachmentTypes.ts', 'hopDongMuaAttachmentTypes.ts'],
  ['donHangMuaApiContext.tsx', 'hopDongMuaApiContext.tsx'],
  ['donHangMuaDinhKemModal.tsx', 'hopDongMuaDinhKemModal.tsx'],
  ['donHangMuaGridMau.ts', 'hopDongMuaGridMau.ts'],
  ['DonHangMua.module.css', 'HopDongMua.module.css'],
]

function transformTypes(content) {
  let s = content
  s = s.replace(/donHangMuaApi/g, 'hopDongMuaApi')
  s = s.replace(/DonHangMua/g, 'HopDongMua')
  s = s.replace(/don_hang_mua_id/g, 'hop_dong_mua_id')
  s = s.replace(/đơn hàng mua/gi, 'hợp đồng mua')
  s = s.replace(/Đơn hàng mua/g, 'Hợp đồng mua')
  s = s.replace(/ĐHM/g, 'HĐM')
  s = s.replace(/form ĐHM/g, 'form HĐM')
  return s
}

function transformModule(content) {
  let s = content
  const ordered = [
    ['DonHangMuaApiProvider', 'HopDongMuaApiProvider'],
    ['useDonHangMuaApi', 'useHopDongMuaApi'],
    ['DonHangMuaApiContext', 'HopDongMuaApiContext'],
    ['type DonHangMuaApi', 'type HopDongMuaApi'],
    ['DonHangMuaApi', 'HopDongMuaApi'],
    ['DonHangMuaContent', 'HopDongMuaContent'],
    ['donHangMuaApiContext', 'hopDongMuaApiContext'],
    ['donHangMuaAttachmentTypes', 'hopDongMuaAttachmentTypes'],
    ['donHangMuaDinhKemModal', 'hopDongMuaDinhKemModal'],
    ['donHangMuaGridMau', 'hopDongMuaGridMau'],
    ['DonHangMua.module.css', 'HopDongMua.module.css'],
    ['donHangMuaForm', 'hopDongMuaForm'],
    ['DonHangMuaForm', 'HopDongMuaForm'],
    ['apiDon:', 'apiHopDongMua:'],
    ['api={apiDon}', 'api={apiHopDongMua}'],
    ['apiDon,', 'apiHopDongMua,'],
    ["from '../../../../types/donHangMua'", "from '../../../../types/hopDongMua'"],
    ["from '../../../types/donHangMua'", "from '../../../types/hopDongMua'"],
    ['donHangMua/', 'hopDongMua/'],
    ['DonHangMua', 'HopDongMua'],
    ['donHangMua', 'hopDongMua'],
    ['htql_don_hang_mua', 'htql_hop_dong_mua'],
    ['DHM', 'HDM'],
    ['dhm_', 'hdm_'],
    ['dhmct', 'hdmct'],
    ['đơn hàng mua', 'hợp đồng mua'],
    ['Đơn hàng mua', 'Hợp đồng mua'],
    ['Số đơn hàng', 'Số hợp đồng'],
    ['Ngày đơn hàng', 'Ngày hợp đồng'],
    ['Giá trị đơn hàng', 'Giá trị hợp đồng'],
    ['ĐH mua', 'HĐ mua'],
    ['ĐHM', 'HĐM'],
    ['Tổng đơn', 'Tổng HĐ'],
    ['danh sách đơn', 'danh sách hợp đồng'],
  ]
  for (const [a, b] of ordered) {
    s = s.split(a).join(b)
  }
  return s
}

fs.mkdirSync(destDir, { recursive: true })

const typesContent = fs.readFileSync(typesSrc, 'utf8')
fs.writeFileSync(typesDest, transformTypes(typesContent), 'utf8')
console.log('Wrote', path.relative(root, typesDest))

for (const [from, to] of fileMap) {
  const p = path.join(srcDir, from)
  const out = path.join(destDir, to)
  let c = fs.readFileSync(p, 'utf8')
  c = transformModule(c)
  fs.writeFileSync(out, c, 'utf8')
  console.log('Wrote', path.relative(root, out))
}
