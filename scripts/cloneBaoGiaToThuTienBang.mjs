/**
 * Sao chép Báo giá → Thu tiền (ThuTienBang) — tách biệt storage/types.
 * Chạy: node scripts/cloneBaoGiaToThuTienBang.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function rep(s, rules) {
  let out = s
  for (const [a, b] of rules) out = out.split(a).join(b)
  return out
}

const RULES = [
  ['buildDonHangBanChungTuPrefillFromBaoGia', 'buildDonHangBanChungTuPrefillFromThuTienBang'],
  ['buildHopDongBanChungTuPrefillFromBaoGia', 'buildHopDongBanChungTuPrefillFromThuTienBang'],
  ['HTQL_BAO_GIA_RELOAD_EVENT', 'HTQL_THU_TIEN_BANG_RELOAD_EVENT'],
  ['STORAGE_KEY_BAO_GIA', 'STORAGE_KEY_THU_TIEN_BANG'],
  ['lichSuBanHangKhach', 'lichSuThuTienKhach'],
  ['layLichSuBanChoKhach', 'layLichSuThuTienChoKhach'],
  ['coLichSuBan', 'coLichSuThuTien'],
  ['BaoGiaAttachmentItem', 'ThuTienBangAttachmentItem'],
  ['BaoGiaChiTiet', 'ThuTienBangChiTiet'],
  ['BaoGiaCreatePayload', 'ThuTienBangCreatePayload'],
  ['BaoGiaDraftLine', 'ThuTienBangDraftLine'],
  ['BaoGiaFilter', 'ThuTienBangFilter'],
  ['BaoGiaKyValue', 'ThuTienBangKyValue'],
  ['BaoGiaRecord', 'ThuTienBangRecord'],
  ['BaoGiaApiProvider', 'ThuTienBangApiProvider'],
  ['useBaoGiaApi', 'useThuTienBangApi'],
  ['BaoGiaApi', 'ThuTienBangApi'],
  ['BaoGiaForm', 'ThuTienForm'],
  ['BaoGia.module.css', 'ThuTienBang.module.css'],
  ['baoGiaChiTietStyles', 'thuTienBangChiTietStyles'],
  ['bgDetailStyles', 'thuTienBangDetailStyles'],
  ['baoGiaGridMau', 'thuTienBangGridMau'],
  ['mau_bgkhongdongia', 'mau_tt_bang_khongdongia'],
  ['mau_bgcodongia_khong_vat', 'mau_tt_bang_codongia_khong_vat'],
  ['mau_bgcodongia', 'mau_tt_bang_codongia'],
  ['baoGiaDinhKemModal', 'thuTienBangDinhKemModal'],
  ['BaoGiaDinhKemModal', 'ThuTienBangDinhKemModal'],
  ['types/baoGia', 'types/thuTienBang'],
  ['baoGiaGetAll', 'thuTienBangGetAll'],
  ['baoGiaGetChiTiet', 'thuTienBangGetChiTiet'],
  ['baoGiaDelete', 'thuTienBangDelete'],
  ['baoGiaPost', 'thuTienBangPost'],
  ['baoGiaPut', 'thuTienBangPut'],
  ['getDefaultBaoGiaFilter', 'getDefaultThuTienBangFilter'],
  ['getBaoGiaDraft', 'getThuTienBangDraft'],
  ['setBaoGiaDraft', 'setThuTienBangDraft'],
  ['clearBaoGiaDraft', 'clearThuTienBangDraft'],
  ['baoGiaSoDonHangTiepTheo', 'thuTienBangSoDonHangTiepTheo'],
  ['baoGiaCapNhatTuMenuTaoGd', 'thuTienBangCapNhatTuMenuTaoGd'],
  ['baoGiaBiKhoaChinhSuaTheoTinhTrang', 'thuTienBangBiKhoaChinhSuaTheoTinhTrang'],
  ['baoGiaDaChonTaoGd', 'thuTienBangDaChonTaoGd'],
  ['baoGiaToDonHangBanChungTuPrefill', 'thuTienBangToDonHangBanChungTuPrefill'],
  ['baoGiaToHopDongBanChungTuPrefill', 'thuTienBangToHopDongBanChungTuPrefill'],
  ['from \'./baoGia', 'from \'./thuTienBang'],
  ['from "./baoGia', 'from "./thuTienBang'],
  ['BaoGia', 'ThuTienBang'],
  ['baoGia', 'thuTienBang'],
  ['ngay_bao_gia', 'ngay_thu_tien_bang'],
  ['so_bao_gia', 'so_thu_tien_bang'],
  ['bao_gia_id', 'thu_tien_bang_id'],
]

function fixPathsForTaiChinhThuTien(content, fileName) {
  let c = content
  c = c.replace(/\.\.\/\.\.\/\.\.\/\.\.\/types\//g, '../../../types/')
  c = c.replace(/\.\.\/\.\.\/\.\.\/\.\.\/utils\//g, '../../../utils/')
  c = c.replace(/\.\.\/\.\.\/\.\.\/\.\.\/components\//g, '../../../components/')
  c = c.replace(/\.\.\/\.\.\/\.\.\/\.\.\/constants\//g, '../../../constants/')
  c = c.replace(/\.\.\/\.\.\/\.\.\/\.\.\/context\//g, '../../../context/')
  c = c.replace(/\.\.\/\.\.\/\.\.\/kho\//g, '../../kho/')
  c = c.replace(/\.\.\/\.\.\/shared\//g, '../../crm/shared/')
  c = c.replace(/\.\.\/\.\.\/muaHang\//g, '../../crm/muaHang/')
  c = c.replace(/\.\.\/khachHang\//g, '../../crm/banHang/khachHang/')
  c = c.replace(/\.\.\/BanHang\.module\.css/g, './banHangDetailMirror.module.css')
  if (fileName === 'thuTien.tsx') {
    c = c.replace(/\.\.\/donHangBan\//g, '../../crm/banHang/donHangBan/')
    c = c.replace(/\.\.\/hopDongBan\//g, '../../crm/banHang/hopDongBan/')
    c = c.replace(/\.\/thuTienForm/g, './thuTienForm')
    c = c.replace(/\.\/thuTienBangApi/g, './thuTienBangApi')
    c = c.replace(/\.\/thuTienBangApiContext/g, './thuTienBangApiContext')
    c = c.replace(/\.\/thuTienBangToDonHangBanChungTuPrefill/g, './thuTienBangToDonHangBanChungTuPrefill')
    c = c.replace(/\.\/thuTienBangToHopDongBanChungTuPrefill/g, './thuTienBangToHopDongBanChungTuPrefill')
    c = c.replace(/from '\.\/thuTienBangApi'/g, "from './thuTienBangApi'")
    c = c.replace(/\.\.\/\.\.\/\.\.\/\.\.\/types\//g, '../../../../types/')
  }
  return c
}

function mockIdsFix(content) {
  return content
    .replace(/so_thu_tien_bang: 'TT00001'/g, "so_thu_tien_bang: 'TT00001'")
    .replace(/so_thu_tien_bang: 'TT00002'/g, "so_thu_tien_bang: 'TT00002'")
    .replace(/so_thu_tien_bang: 'TT00003'/g, "so_thu_tien_bang: 'TT00003'")
    .replace(/id: 'ttb1'/g, "id: 'ttb1'")
    .replace(/thu_tien_bang_id: 'ttb1'/g, "thu_tien_bang_id: 'ttb1'")
}

const jobs = [
  { src: 'src/types/baoGia.ts', dest: 'src/types/thuTienBang.ts', fix: true },
  { src: 'src/modules/crm/banHang/baoGia/baoGiaApi.ts', dest: 'src/modules/taiChinh/thuTien/thuTienBangApi.ts', fix: true },
  { src: 'src/modules/crm/banHang/baoGia/baoGiaApiContext.tsx', dest: 'src/modules/taiChinh/thuTien/thuTienBangApiContext.tsx', fix: true },
  { src: 'src/modules/crm/banHang/baoGia/baoGiaGridMau.ts', dest: 'src/modules/taiChinh/thuTien/thuTienBangGridMau.ts', fix: true },
  { src: 'src/modules/crm/banHang/baoGia/baoGiaDinhKemModal.tsx', dest: 'src/modules/taiChinh/thuTien/thuTienBangDinhKemModal.tsx', fix: true },
  { src: 'src/modules/crm/banHang/baoGia/lichSuBanHangKhach.ts', dest: 'src/modules/taiChinh/thuTien/lichSuThuTienKhach.ts', fix: true },
  { src: 'src/modules/crm/banHang/baoGia/BaoGia.module.css', dest: 'src/modules/taiChinh/thuTien/ThuTienBang.module.css', fix: false },
  { src: 'src/modules/crm/banHang/baoGia/baoGiaForm.tsx', dest: 'src/modules/taiChinh/thuTien/thuTienForm.tsx', fix: true },
  { src: 'src/modules/crm/banHang/donHangBan/baoGiaToDonHangBanChungTuPrefill.ts', dest: 'src/modules/taiChinh/thuTien/thuTienBangToDonHangBanChungTuPrefill.ts', fix: true },
  { src: 'src/modules/crm/banHang/hopDongBan/baoGiaToHopDongBanChungTuPrefill.ts', dest: 'src/modules/taiChinh/thuTien/thuTienBangToHopDongBanChungTuPrefill.ts', fix: true },
  { src: 'src/modules/crm/banHang/banHang.module.css', dest: 'src/modules/taiChinh/thuTien/banHangDetailMirror.module.css', fix: false },
  { src: 'src/modules/crm/banHang/baoGia/baoGia.tsx', dest: 'src/modules/taiChinh/thuTien/thuTien.tsx', fix: true },
]

for (const job of jobs) {
  const sp = path.join(root, job.src)
  const dp = path.join(root, job.dest)
  let text = fs.readFileSync(sp, 'utf8')
  text = rep(text, RULES)
  const base = path.basename(job.dest)
  if (job.fix) {
    text = fixPathsForTaiChinhThuTien(text, base)
    text = mockIdsFix(text)
  }
  fs.mkdirSync(path.dirname(dp), { recursive: true })
  fs.writeFileSync(dp, text, 'utf8')
  console.log('Wrote', job.dest)
}

// Đổi tên export component danh sách: ThuTienBang → ThuTien
const thuTienList = path.join(root, 'src/modules/taiChinh/thuTien/thuTien.tsx')
let listTxt = fs.readFileSync(thuTienList, 'utf8')
listTxt = listTxt.replace(/export function ThuTienBang\b/g, 'export function ThuTien')
listTxt = listTxt.replace(/\bThuTienBang\b(?=\s*\()/g, 'ThuTien') // JSX <ThuTienBang> -> careful
// Khôi phục tên type/provider cần giữ ThuTienBang
listTxt = listTxt.replace(/export function ThuTien\b/g, 'export function ThuTien')
listTxt = listTxt.replace(/function ThuTien\s*\(/, 'function ThuTien(')
// Provider vẫn ThuTienBangApiProvider
fs.writeFileSync(thuTienList, listTxt, 'utf8')

console.log('Patched export name in thuTien.tsx (review JSX <ThuTienBang> manually)')
