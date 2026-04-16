/**
 * Ghi sổ phiếu chuyển tiền: tạo phiếu thu + phiếu chi nội bộ, ghi sổ ngay.
 */
import type { TaiKhoanRecord } from '../../../types/taiKhoan'
import { thuTienBangPost, thuTienBangDelete } from '../thuTien/thuTienBangApi'
import { chiTienBangPost } from '../chiTien/chiTienBangApi'
import { thuTienBangSoDonHangTiepTheo } from '../thuTien/thuTienBangApi'
import { chiTienBangSoDonHangTiepTheo } from '../chiTien/chiTienBangApi'
import { ghiSoTuPhieuThu } from '../thuTien/ghiSoTaiChinhApi'
import { ghiSoTuPhieuChi } from '../chiTien/ghiSoChiTienApi'
import { taiKhoanLaTienMat, taiKhoanLaTkNganHang } from '../taiKhoan/taiKhoanApi'

const LY_DO_THU_NOI_BO_LABEL = 'Thu tiền nội bộ'
const LY_DO_CHI_NOI_BO_LABEL = 'Chi tiền nội bộ'

function noiDungPhieu(lyDoUser: string, soChuyen: string): string {
  const u = (lyDoUser ?? '').trim()
  const s = (soChuyen ?? '').trim()
  if (u && s) return `${LY_DO_THU_NOI_BO_LABEL} — ${u} (CT: ${s})`
  if (u) return `${LY_DO_THU_NOI_BO_LABEL} — ${u}`
  if (s) return `${LY_DO_THU_NOI_BO_LABEL} (CT: ${s})`
  return LY_DO_THU_NOI_BO_LABEL
}

function noiDungPhieuChi(lyDoUser: string, soChuyen: string): string {
  const u = (lyDoUser ?? '').trim()
  const s = (soChuyen ?? '').trim()
  if (u && s) return `${LY_DO_CHI_NOI_BO_LABEL} — ${u} (CT: ${s})`
  if (u) return `${LY_DO_CHI_NOI_BO_LABEL} — ${u}`
  if (s) return `${LY_DO_CHI_NOI_BO_LABEL} (CT: ${s})`
  return LY_DO_CHI_NOI_BO_LABEL
}

const NOI_BO_LINE = {
  ma_hang: '__NOI_BO__',
  ten_hang: 'Chuyển tiền nội bộ',
  dvt: '—',
  so_luong: 1,
  don_gia: 0,
  thanh_tien: 0,
  pt_thue_gtgt: null as number | null,
  tien_thue_gtgt: null as number | null,
}

function basePayloadTong(soTien: number) {
  return {
    tong_tien_hang: soTien,
    tong_thue_gtgt: 0,
    tong_thanh_toan: soTien,
    ap_dung_vat_gtgt: false as boolean | undefined,
  }
}

export async function taoPhieuThuChiVaGhiSoTuChuyenTien(opts: {
  ngay: string
  soChuyen: string
  lyDoUser: string
  tkNguon: TaiKhoanRecord
  tkDen: TaiKhoanRecord
  soTien: number
}): Promise<{ phieuThuId: string; phieuChiId: string }> {
  const { ngay, soChuyen, lyDoUser, tkNguon, tkDen, soTien } = opts
  const tang = Math.round(Number(soTien) || 0)
  if (!Number.isFinite(tang) || tang <= 0) throw new Error('Số tiền không hợp lệ')

  const thuMat = taiKhoanLaTienMat(tkDen)
  const thuNh = !thuMat && taiKhoanLaTkNganHang(tkDen)
  const chiMat = taiKhoanLaTienMat(tkNguon)
  const chiNh = !chiMat && taiKhoanLaTkNganHang(tkNguon)

  const line = { ...NOI_BO_LINE, don_gia: tang, thanh_tien: tang }

  const thuRow = await thuTienBangPost({
    tinh_trang: 'Chưa thực hiện',
    ngay_thu_tien_bang: ngay,
    ngay_hach_toan: ngay,
    so_thu_tien_bang: thuTienBangSoDonHangTiepTheo(),
    ngay_giao_hang: null,
    khach_hang: 'Nội bộ',
    dia_chi: '',
    ma_so_thue: '',
    dien_giai: noiDungPhieu(lyDoUser, soChuyen),
    nv_ban_hang: '',
    dieu_khoan_tt: '',
    so_chung_tu_cukcuk: '',
    so_ngay_duoc_no: '0',
    dieu_khoan_khac: '',
    ...basePayloadTong(tang),
    ly_do_thu_phieu: 'thu_noi_bo',
    thu_tien_mat: thuMat,
    thu_qua_ngan_hang: thuNh,
    phieu_tai_khoan_id: tkDen.id,
    chiTiet: [line],
  })
  try {
    const chiRow = await chiTienBangPost({
      tinh_trang: 'Chưa thực hiện',
      ngay_chi_tien_bang: ngay,
      ngay_hach_toan: ngay,
      so_chi_tien_bang: chiTienBangSoDonHangTiepTheo(),
      ngay_giao_hang: null,
      khach_hang: 'Nội bộ',
      dia_chi: '',
      ma_so_thue: '',
      dien_giai: noiDungPhieuChi(lyDoUser, soChuyen),
      nv_ban_hang: '',
      dieu_khoan_tt: '',
      so_chung_tu_cukcuk: '',
      so_ngay_duoc_no: '0',
      dieu_khoan_khac: '',
      ...basePayloadTong(tang),
      ly_do_chi_phieu: 'chi_noi_bo',
      chi_tien_mat: chiMat,
      chi_qua_ngan_hang: chiNh,
      phieu_tai_khoan_id: tkNguon.id,
      phieu_chi_tai_khoan_chi: tkNguon.so_tai_khoan,
      phieu_chi_ngan_hang_chi: tkNguon.ten_ngan_hang,
      phieu_chi_ten_nguoi_gui: '',
      chiTiet: [line],
    })

    ghiSoTuPhieuThu(thuRow, tang)
    ghiSoTuPhieuChi(chiRow, tang)

    return { phieuThuId: thuRow.id, phieuChiId: chiRow.id }
  } catch (e) {
    thuTienBangDelete(thuRow.id)
    throw e
  }
}
