/**
 * Map Hợp đồng bán → prefill form Thu tiền (phiếu).
 */
import { addDays } from 'date-fns'
import type { ThuTienBangChiTiet, ThuTienBangRecord } from '../../../types/thuTienBang'
import type { HopDongBanChungTuChiTiet, HopDongBanChungTuRecord } from '../../../types/hopDongBanChungTu'
import type { PhuLucHopDongBanChungTuChiTiet, PhuLucHopDongBanChungTuRecord } from '../../../types/phuLucHopDongBanChungTu'
import { formatSoTienHienThi } from '../../../utils/numberFormat'
import { tinhDaThuVaConLaiChoHopDongBan } from './chungTuCongNoKhach'

const PHIEU_THU_ROW_PREFIX = '__PT_ROW__:'

function parseIsoNgay(iso: string | undefined): Date | null {
  if (!iso?.trim()) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDdMmYyyy(d: Date): string {
  const day = d.getDate()
  const mo = d.getMonth() + 1
  const y = d.getFullYear()
  return `${String(day).padStart(2, '0')}/${String(mo).padStart(2, '0')}/${y}`
}

type PhieuRow = {
  ma_chung_tu: string
  ngay_tao: string
  han_tt: string
  so_phai_thu: string
  so_chua_thu: string
  thu_lan_nay: string
  noi_dung_thu: string
}

export function buildThuTienBangPrefillFromHopDongBanChungTu(
  row: HopDongBanChungTuRecord,
  _chiTiet: HopDongBanChungTuChiTiet[],
): { prefillDon: Partial<ThuTienBangRecord>; prefillChiTiet: ThuTienBangChiTiet[] } {
  const ngayLap = parseIsoNgay(row.ngay_lap_hop_dong)
  const ngayTaoStr = ngayLap ? formatDdMmYyyy(ngayLap) : ''
  const rawNo = String(row.so_ngay_duoc_no ?? '').replace(/\D/g, '')
  const days = rawNo === '' ? 0 : parseInt(rawNo, 10)
  const hanDate =
    ngayLap && Number.isFinite(days) && days >= 0 ? addDays(ngayLap, days) : ngayLap
  const hanTtStr = hanDate ? formatDdMmYyyy(hanDate) : ''
  const tongTt = typeof row.tong_thanh_toan === 'number' ? row.tong_thanh_toan : 0
  const tongStr = formatSoTienHienThi(tongTt)
  const { tong_da_lap } = tinhDaThuVaConLaiChoHopDongBan(row)
  const conLaiDeLap = Math.max(0, tongTt - tong_da_lap)
  const conLaiStr = formatSoTienHienThi(conLaiDeLap)
  const maCt = (row.so_hop_dong ?? '').trim()

  const noiDungThu = (row.dien_giai ?? '').trim() || `Thu tiền theo HĐ bán ${maCt}`

  const phieuRow: PhieuRow = {
    ma_chung_tu: maCt,
    ngay_tao: ngayTaoStr,
    han_tt: hanTtStr,
    so_phai_thu: tongStr,
    so_chua_thu: conLaiStr,
    thu_lan_nay: conLaiStr,
    noi_dung_thu: noiDungThu,
  }

  const prefillDon: Partial<ThuTienBangRecord> = {
    loai_khach_hang: row.loai_khach_hang,
    ten_nguoi_lien_he: row.ten_nguoi_lien_he,
    so_dien_thoai_lien_he: row.so_dien_thoai_lien_he,
    tinh_trang: 'Mới tạo',
    ngay_thu_tien_bang: row.ngay_lap_hop_dong,
    ngay_giao_hang: row.ngay_cam_ket_giao,
    khach_hang: row.khach_hang,
    dia_chi: row.dia_chi,
    nguoi_giao_hang: row.nguoi_giao_hang,
    ma_so_thue: row.ma_so_thue,
    dien_giai: row.dien_giai ? row.dien_giai : `Thu tiền theo HĐ bán ${maCt}`,
    nv_ban_hang: row.nv_ban_hang,
    dieu_khoan_tt: row.dieu_khoan_tt,
    so_ngay_duoc_no: row.so_ngay_duoc_no,
    dieu_khoan_khac: row.dieu_khoan_khac,
    tong_tien_hang: row.tong_tien_hang,
    tong_thue_gtgt: row.tong_thue_gtgt,
    tong_thanh_toan: row.tong_thanh_toan,
    ap_dung_vat_gtgt: row.ap_dung_vat_gtgt,
    tl_ck: row.tl_ck,
    tien_ck: row.tien_ck,
    so_dien_thoai: row.so_dien_thoai,
    so_chung_tu_cukcuk: maCt,
    doi_chieu_don_mua_id: row.id,
    attachments: row.attachments?.map((a) => ({ ...a })),
    hinh_thuc: row.hinh_thuc,
    dia_chi_cong_trinh: row.dia_chi_cong_trinh,
    thu_tien_mat: true,
    thu_qua_ngan_hang: false,
  }

  const prefillChiTiet: ThuTienBangChiTiet[] = [
    {
      id: 'prefill-phieu-0',
      thu_tien_bang_id: '__prefill__',
      stt: 1,
      ma_hang: phieuRow.ma_chung_tu,
      ten_hang: phieuRow.noi_dung_thu,
      ma_quy_cach: '',
      dvt: '',
      chieu_dai: 0,
      chieu_rong: 0,
      chieu_cao: 0,
      ban_kinh: 0,
      luong: 0,
      so_luong: 1,
      so_luong_nhan: 0,
      don_gia: 0,
      thanh_tien: 0,
      pt_thue_gtgt: null,
      tien_thue_gtgt: null,
      lenh_san_xuat: '',
      noi_dung: PHIEU_THU_ROW_PREFIX + JSON.stringify(phieuRow),
      ghi_chu: '',
    },
  ]

  if (ngayLap) {
    const y = ngayLap.getFullYear()
    const m = ngayLap.getMonth() + 1
    const d = ngayLap.getDate()
    prefillDon.ngay_hach_toan = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  return { prefillDon, prefillChiTiet }
}

/** Phụ lục HĐ bán — cấu trúc giống HĐ cho phần tiêu đề / mã chứng từ trên phiếu thu. */
export function buildThuTienBangPrefillFromPhuLucHopDongBan(
  row: PhuLucHopDongBanChungTuRecord,
  chiTiet: PhuLucHopDongBanChungTuChiTiet[],
): { prefillDon: Partial<ThuTienBangRecord>; prefillChiTiet: ThuTienBangChiTiet[] } {
  return buildThuTienBangPrefillFromHopDongBanChungTu(row as unknown as HopDongBanChungTuRecord, chiTiet as unknown as HopDongBanChungTuChiTiet[])
}
