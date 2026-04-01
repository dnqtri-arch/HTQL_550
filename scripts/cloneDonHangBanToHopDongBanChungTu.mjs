/**
 * Nhân bản file ĐHB chứng từ → HĐ bán chứng từ (thư mục hopDongBan).
 * node scripts/cloneDonHangBanToHopDongBanChungTu.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const srcDon = path.join(root, 'src', 'modules', 'crm', 'banHang', 'donHangBan')
const destHop = path.join(root, 'src', 'modules', 'crm', 'banHang', 'hopDongBan')

const FILES = [
  ['donHangBanChungTuApi.ts', 'hopDongBanChungTuApi.ts'],
  ['donHangBanChungTuApiContext.tsx', 'hopDongBanChungTuApiContext.tsx'],
  ['donHangBanGridMauFull.ts', 'hopDongBanGridMauFull.ts'],
  ['baoGiaToDonHangBanChungTuPrefill.ts', 'baoGiaToHopDongBanChungTuPrefill.ts'],
  ['donHangBanDinhKemModalFull.tsx', 'hopDongBanDinhKemModalFull.tsx'],
  ['donHangBanForm.tsx', 'hopDongBanForm.tsx'],
  ['donHangBan.tsx', 'hopDongBan.tsx'],
  ['donHangBanTaoGiaoDich.ts', 'hopDongBanTaoGiaoDich.ts'],
]

const REPLACEMENTS = [
  ['baoGiaHoanTacKhiHetLienKetDonHangBan', 'baoGiaHoanTacKhiHetLienKetHopDongBan'],
  ['buildDonHangBanChungTuPrefillFromBaoGia', 'buildHopDongBanChungTuPrefillFromBaoGia'],
  ['DonHangBanChungTuAttachmentItem', 'HopDongBanChungTuAttachmentItem'],
  ['DonHangBanChungTuCreatePayload', 'HopDongBanChungTuCreatePayload'],
  ['DonHangBanChungTuDraftLine', 'HopDongBanChungTuDraftLine'],
  ['DonHangBanChungTuKyValue', 'HopDongBanChungTuKyValue'],
  ['DonHangBanChungTuChiTiet', 'HopDongBanChungTuChiTiet'],
  ['DonHangBanChungTuRecord', 'HopDongBanChungTuRecord'],
  ['DonHangBanChungTuFilter', 'HopDongBanChungTuFilter'],
  ['DonHangBanChungTuApiProvider', 'HopDongBanChungTuApiProvider'],
  ['useDonHangBanChungTuApi', 'useHopDongBanChungTuApi'],
  ['DonHangBanChungTuApiContext', 'HopDongBanChungTuApiContext'],
  ['DonHangBanChungTuApi', 'HopDongBanChungTuApi'],
  ['donHangBanChungTuApiImpl', 'hopDongBanChungTuApiImpl'],
  ['getDefaultDonHangBanChungTuFilter', 'getDefaultHopDongBanChungTuFilter'],
  ['getDonHangBanChungTuDraft', 'getHopDongBanChungTuDraft'],
  ['setDonHangBanChungTuDraft', 'setHopDongBanChungTuDraft'],
  ['clearDonHangBanChungTuDraft', 'clearHopDongBanChungTuDraft'],
  ['donHangBanSoDonHangTiepTheo', 'hopDongBanSoHopDongTiepTheo'],
  ['donHangBanBuildCreatePayloadFromRecord', 'hopDongBanChungTuBuildCreatePayloadFromRecord'],
  ['donHangBanSetTinhTrang', 'hopDongBanChungTuSetTinhTrang'],
  ['TINH_TRANG_DON_HANG_BAN_DA_NHAN_HANG', 'TINH_TRANG_HOP_DONG_BAN_CHUNG_TU_DA_NHAN_HANG'],
  ['TINH_TRANG_DON_HANG_BAN_CT_DA_GUI_KHACH', 'TINH_TRANG_HOP_DONG_BAN_CT_DA_GUI_KHACH'],
  ['TINH_TRANG_DON_HANG_BAN_CT', 'TINH_TRANG_HOP_DONG_BAN_CT'],
  ['donHangBanGetChiTiet', 'hopDongBanChungTuGetChiTiet'],
  ['donHangBanGetAll', 'hopDongBanChungTuGetAll'],
  ['donHangBanDelete', 'hopDongBanChungTuDelete'],
  ['donHangBanPost', 'hopDongBanChungTuPost'],
  ['donHangBanPut', 'hopDongBanChungTuPut'],
  ['normalizeDonHangBanChungTu', 'normalizeHopDongBanChungTu'],
  ['DonHangBanGridLineRow', 'HopDongBanChungTuGridLineRow'],
  ['export function DonHangBanForm', 'export function HopDongBanForm'],
  ['function DonHangBanContent', 'function HopDongBanContent'],
  ['export function DonHangBan(', 'export function HopDongBan('],
  ["from './donHangBanGridMauFull'", "from './hopDongBanGridMauFull'"],
  ["from './donHangBanChungTuApi'", "from './hopDongBanChungTuApi'"],
  ["from './donHangBanChungTuApiContext'", "from './hopDongBanChungTuApiContext'"],
  ["from './donHangBanDinhKemModalFull'", "from './hopDongBanDinhKemModalFull'"],
  ["from './baoGiaToDonHangBanChungTuPrefill'", "from './baoGiaToHopDongBanChungTuPrefill'"],
  ["from './donHangBanForm'", "from './hopDongBanForm'"],
  ["from '../../../../types/donHangBanChungTu'", "from '../../../../types/hopDongBanChungTu'"],
  ['htql_don_hang_ban_chung_tu_list', 'htql_hop_dong_ban_chung_tu_list'],
  ['htql_don_hang_ban_chung_tu_chi_tiet', 'htql_hop_dong_ban_chung_tu_chi_tiet'],
  ['htql_don_hang_ban_chung_tu_draft', 'htql_hop_dong_ban_chung_tu_draft'],
  ['htql_don_hang_ban_from_baogia', 'htql_hop_dong_ban_from_baogia'],
  ['DON_HANG_BAN_COL_TEN_SPHH', 'HOP_DONG_BAN_COL_TEN_SPHH'],
  ['initialDhb', 'initialHdbCt'],
  ['prefillDhb', 'prefillHdbCt'],
  ['prefillTuBaoGia', 'prefillTuBaoGiaHdb'],
  ['prefillCloneTuDonHangBan', 'prefillCloneTuHopDongBanChungTu'],
  ['setPrefillTuBaoGia', 'setPrefillTuBaoGiaHdb'],
  ['setPrefillCloneTuDonHangBan', 'setPrefillCloneTuHopDongBanChungTu'],
  ['mau_dhb', 'mau_hdbct'],
  ['mauDhb', 'mauHdbCt'],
  ['dd_gh_index', 'dd_th_index'],
  ['ngay_don_hang', 'ngay_lap_hop_dong'],
  ['so_don_hang', 'so_hop_dong'],
  ['ngay_giao_hang', 'ngay_cam_ket_giao'],
  ['don_hang_ban_id', 'hop_dong_ban_chung_tu_id'],
  ['Đơn hàng bán', 'Hợp đồng bán'],
  ['đơn hàng bán', 'hợp đồng bán'],
  ['Mã ĐHB', 'Mã HĐ'],
  ['Ngày ĐH', 'Ngày lập HĐ'],
  ['Đã chuyển ĐHB', 'Đã chuyển HĐ'],
  ['ĐĐNH', 'ĐĐTH'],
  ['nháp đơn hàng', 'nháp hợp đồng'],
  ['Đơn hàng bán từ báo giá', 'Hợp đồng bán từ báo giá'],
  ['soDonHangTiepTheo', 'soHopDongTiepTheo'],
]

function applyAll(s) {
  let out = s
  for (const [a, b] of REPLACEMENTS) out = out.split(a).join(b)
  return out
}

for (const [fromName, toName] of FILES) {
  const fromPath = path.join(srcDon, fromName)
  const toPath = path.join(destHop, toName)
  if (!fs.existsSync(fromPath)) {
    console.error('Missing:', fromPath)
    process.exit(1)
  }
  let text = applyAll(fs.readFileSync(fromPath, 'utf8'))
  if (toName === 'hopDongBanChungTuApi.ts') {
    text = text.replace(/const MODULE_PREFIX = 'BG'/g, "const MODULE_PREFIX = 'HDB'")
  }
  fs.mkdirSync(destHop, { recursive: true })
  fs.writeFileSync(toPath, text, 'utf8')
  console.log('Wrote', path.relative(root, toPath))
}
