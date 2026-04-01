/**
 * Sao chép nội dung nghiệp vụ Báo giá → Đơn hàng bán (file/types/API riêng).
 * Chạy: node scripts/cloneDonHangBanFromBaoGia.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const bgDir = path.join(root, 'src', 'modules', 'crm', 'banHang', 'baoGia')
const dhbDir = path.join(root, 'src', 'modules', 'crm', 'banHang', 'donHangBan')
const typesBg = path.join(root, 'src', 'types', 'baoGia.ts')
const typesOut = path.join(root, 'src', 'types', 'donHangBanChungTu.ts')
const utilsBg = path.join(root, 'src', 'utils', 'baoGiaDonGiaBan.ts')
const utilsOut = path.join(root, 'src', 'utils', 'donHangBanDonGiaBan.ts')

function rep(s, pairs) {
  let o = s
  for (const [a, b] of pairs) o = o.split(a).join(b)
  return o
}

const typePairs = [
  ['types/baoGia', 'types/donHangBanChungTu'],
  ['from \'../types/baoGia\'', 'from \'../types/donHangBanChungTu\''],
  ['from "../../types/baoGia"', 'from "../../types/donHangBanChungTu"'],
  ['from \'../../types/baoGia\'', 'from \'../../types/donHangBanChungTu\''],
  ['from \'../../../../types/baoGia\'', 'from \'../../../../types/donHangBanChungTu\''],
  ['BaoGiaKyValue', 'DonHangBanChungTuKyValue'],
  ['BaoGiaAttachmentItem', 'DonHangBanChungTuAttachmentItem'],
  ['BaoGiaRecord', 'DonHangBanChungTuRecord'],
  ['BaoGiaChiTiet', 'DonHangBanChungTuChiTiet'],
  ['BaoGiaCreatePayload', 'DonHangBanChungTuCreatePayload'],
  ['BaoGiaFilter', 'DonHangBanChungTuFilter'],
  ['BaoGiaDraftLine', 'DonHangBanChungTuDraftLine'],
  ['bao_gia_id', 'don_hang_ban_id'],
  ['so_bao_gia', 'so_don_hang'],
  ['ngay_bao_gia', 'ngay_don_hang'],
  ['Kiểu kỳ lọc danh sách báo giá', 'Kiểu kỳ lọc danh sách đơn hàng bán'],
  ['đính kèm chứng từ', 'đính kèm chứng từ (ĐHB)'],
  ['Báo giá', 'Đơn hàng bán'],
]

let typesSrc = fs.readFileSync(typesBg, 'utf8')
typesSrc = rep(typesSrc, typePairs)
typesSrc = typesSrc.replace(/\bBaoGia\b/g, 'DonHangBanChungTu')
fs.writeFileSync(typesOut, typesSrc, 'utf8')
console.log('types', path.relative(root, typesOut))

let u = fs.readFileSync(utilsBg, 'utf8')
u = rep(u, [
  ['baoGiaDonGiaBan', 'donHangBanDonGiaBan'],
  ['BaoGia', 'DonHangBan'],
  ['BAO_GIA_COL', 'DON_HANG_BAN_COL'],
  ['from \'./donHangMuaCalculations\'', 'from \'./donHangMuaCalculations\''],
  ['migrateBaoGiaLinesToCoDonGia', 'migrateDonHangBanLinesToCoDonGia'],
  ['enrichBaoGiaGridLinesWithVthh', 'enrichDonHangBanGridLinesWithVthh'],
  ['getDonGiaBanBaoGiaLine', 'getDonGiaBanDonHangBanLine'],
])
fs.writeFileSync(utilsOut, u, 'utf8')
console.log('utils', path.relative(root, utilsOut))

const apiPairs = [
  ...typePairs.map(([a, b]) => [`../../../../types/baoGia`, `../../../../types/donHangBanChungTu`]).filter((_, i) => i < 1),
  ['../../../../types/baoGia', '../../../../types/donHangBanChungTu'],
  ['BaoGia', 'DonHangBanChungTu'],
  ['baoGia', 'donHangBan'],
  ['STORAGE_KEY_BAO_GIA', 'STORAGE_KEY_DON_HANG_BAN_CT'],
  ['htql_bao_gia_list', 'htql_don_hang_ban_chung_tu_list'],
  ['htql_bao_gia_chi_tiet', 'htql_don_hang_ban_chung_tu_chi_tiet'],
  ['htql_bao_gia_draft', 'htql_don_hang_ban_chung_tu_draft'],
  ['API và types cho Báo giá', 'API đơn hàng bán (đầy đủ chứng từ — tách khỏi báo giá)'],
  ["maFormatHeThong('BG'", "maFormatHeThong('DHB'"],
  ['BG00001', 'DHB00001'],
  ['BG00002', 'DHB00002'],
  ['BG00003', 'DHB00003'],
  ['bg1', 'dhbct1'],
  ['bg2', 'dhbct2'],
  ['bg3', 'dhbct3'],
]

let api = fs.readFileSync(path.join(bgDir, 'baoGiaApi.ts'), 'utf8')
for (const [a, b] of [
  ['../../../../types/baoGia', '../../../../types/donHangBanChungTu'],
  ['BaoGiaKyValue', 'DonHangBanChungTuKyValue'],
  ['BaoGiaAttachmentItem', 'DonHangBanChungTuAttachmentItem'],
  ['BaoGiaRecord', 'DonHangBanChungTuRecord'],
  ['BaoGiaChiTiet', 'DonHangBanChungTuChiTiet'],
  ['BaoGiaCreatePayload', 'DonHangBanChungTuCreatePayload'],
  ['BaoGiaFilter', 'DonHangBanChungTuFilter'],
  ['BaoGiaDraftLine', 'DonHangBanChungTuDraftLine'],
  ['baoGia', 'donHangBan'],
  ['BaoGia', 'DonHangBanChungTu'],
  ['bao_gia_id', 'don_hang_ban_id'],
  ['STORAGE_KEY_BAO_GIA', 'STORAGE_KEY_DON_HANG_BAN_CT'],
  ['htql_bao_gia_list', 'htql_don_hang_ban_chung_tu_list'],
  ['htql_bao_gia_chi_tiet', 'htql_don_hang_ban_chung_tu_chi_tiet'],
  ['htql_bao_gia_draft', 'htql_don_hang_ban_chung_tu_draft'],
  ["maFormatHeThong('BG'", "maFormatHeThong('DHB'"],
  ['BG00001', 'DHB00001'],
  ['BG00002', 'DHB00002'],
  ['BG00003', 'DHB00003'],
  ['id: \'bg1\'', 'id: \'dhb_full1\''],
  ['id: \'bg2\'', 'id: \'dhb_full2\''],
  ['id: \'bg3\'', 'id: \'dhb_full3\''],
]) {
  api = api.split(a).join(b)
}
fs.writeFileSync(path.join(dhbDir, 'donHangBanChungTuApi.ts'), api, 'utf8')
console.log('api donHangBanChungTuApi.ts')

for (const [from, to] of [
  ['baoGiaGridMau.ts', 'donHangBanGridMauFull.ts'],
  ['baoGiaDinhKemModal.tsx', 'donHangBanDinhKemModalFull.tsx'],
  ['baoGiaApiContext.tsx', 'donHangBanChungTuApiContext.tsx'],
  ['lichSuBanHangKhach.ts', 'lichSuBanHangKhachDonHangBan.ts'],
]) {
  let c = fs.readFileSync(path.join(bgDir, from), 'utf8')
  c = rep(c, [
    ['baoGiaGridMau', 'donHangBanGridMauFull'],
    ['mau_bg', 'mau_dhb'],
    ['BaoGia', 'DonHangBanChungTu'],
    ['baoGia', 'donHangBan'],
    ['../../../../types/baoGia', '../../../../types/donHangBanChungTu'],
    ['BaoGiaDinhKem', 'DonHangBanDinhKemFull'],
    ['chuanHoaDuongDanDinhKemBaoGia', 'chuanHoaDuongDanDinhKemDonHangBan'],
    ['BaoGiaDinhKemPendingRow', 'DonHangBanDinhKemFullPendingRow'],
    ['./baoGiaApi', './donHangBanChungTuApi'],
    ['useBaoGiaApi', 'useDonHangBanChungTuApi'],
    ['BaoGiaApiProvider', 'DonHangBanChungTuApiProvider'],
    ['BaoGiaApiContext', 'DonHangBanChungTuApiContext'],
    ['type BaoGiaApi', 'type DonHangBanChungTuApi'],
    ['BaoGiaApi', 'DonHangBanChungTuApi'],
  ])
  fs.writeFileSync(path.join(dhbDir, to), c, 'utf8')
  console.log('file', to)
}

fs.copyFileSync(path.join(bgDir, 'BaoGia.module.css'), path.join(dhbDir, 'DonHangBanChungTu.module.css'))
console.log('css copied')

let form = fs.readFileSync(path.join(bgDir, 'baoGiaForm.tsx'), 'utf8')
const formPairs = [
  ['./baoGiaGridMau', './donHangBanGridMauFull'],
  ['./baoGiaDinhKemModal', './donHangBanDinhKemModalFull'],
  ['./baoGiaApi', './donHangBanChungTuApi'],
  ['./baoGiaApiContext', './donHangBanChungTuApiContext'],
  ['./lichSuBanHangKhach', './lichSuBanHangKhachDonHangBan'],
  ['../BaoGia.module.css', './DonHangBanChungTu.module.css'],
  ['./BaoGia.module.css', './DonHangBanChungTu.module.css'],
  ['from \'./baoGiaApiContext\'', 'from \'./donHangBanChungTuApiContext\''],
  ['useBaoGiaApi', 'useDonHangBanChungTuApi'],
  ['from \'../../../../utils/baoGiaDonGiaBan\'', 'from \'../../../../utils/donHangBanDonGiaBan\''],
  ['migrateBaoGiaLinesToCoDonGia', 'migrateDonHangBanLinesToCoDonGia'],
  ['enrichBaoGiaGridLinesWithVthh', 'enrichDonHangBanGridLinesWithVthh'],
  ['getDonGiaBanBaoGiaLine', 'getDonGiaBanDonHangBanLine'],
  ['BAO_GIA_COL_TEN_SPHH', 'DON_HANG_BAN_COL_TEN_SPHH'],
  ['BaoGiaGridLineRow', 'DonHangBanGridLineRow'],
  ['BaoGiaRecord', 'DonHangBanChungTuRecord'],
  ['BaoGiaChiTiet', 'DonHangBanChungTuChiTiet'],
  ['BaoGiaCreatePayload', 'DonHangBanChungTuCreatePayload'],
  ['BaoGiaAttachmentItem', 'DonHangBanChungTuAttachmentItem'],
  ['BaoGiaDinhKem', 'DonHangBanDinhKemFull'],
  ['BaoGiaDinhKemPendingRow', 'DonHangBanDinhKemFullPendingRow'],
  ['TINH_TRANG_BAO_GIA', 'TINH_TRANG_DON_HANG_BAN_CT'],
  ['TINH_TRANG_BAO_GIA_DA_GUI_KHACH', 'TINH_TRANG_DON_HANG_BAN_DA_GUI_KHACH'],
  ['baoGiaGetAll', 'donHangBanChungTuGetAll'],
  ['baoGiaGetChiTiet', 'donHangBanChungTuGetChiTiet'],
  ['getDefaultBaoGiaFilter', 'getDefaultDonHangBanChungTuFilter'],
  ['initialDon', 'initialDhb'],
  ['prefillDon', 'prefillDhb'],
  ['so_bao_gia', 'so_don_hang'],
  ['ngay_bao_gia', 'ngay_don_hang'],
  ['Báo giá', 'Đơn hàng bán'],
  ['báo giá', 'đơn hàng bán'],
  ['BG ', 'ĐHB '],
  ['phiếu NVTHH từ báo giá', 'phiếu NVTHH từ đơn hàng bán'],
  ['Địa điểm GH', 'Địa điểm NH'],
  ['ĐĐGH', 'ĐĐNH'],
  ['getDiaDiemGhOptions', 'getDiaDiemNhOptionsFromList'],
  ['COL_DD_GH', 'COL_DD_NH'],
]
for (const [a, b] of formPairs) {
  form = form.split(a).join(b)
}
form = form.replace(/function getDiaDiemNhOptionsFromList/g, 'function getDiaDiemNhOptions')
form = form.replace(/export function BaoGiaForm/g, 'export function DonHangBanChungTuForm')
form = form.replace(/function BaoGiaFormInner/g, 'function DonHangBanChungTuFormInner')
fs.writeFileSync(path.join(dhbDir, 'donHangBanForm.tsx'), form, 'utf8')
console.log('donHangBanForm.tsx written')
