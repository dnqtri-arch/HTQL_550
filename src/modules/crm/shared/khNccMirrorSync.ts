/**
 * Mirror KH <-> NCC after save (API + local storage). Dynamic import avoids circular deps.
 * Same business key: ma_kh === ma_ncc (only UI labels differ per module).
 */

import type { KhachHangRecord } from '../banHang/khachHang/khachHangApi'
import type { NhaCungCapRecord } from '../muaHang/nhaCungCap/nhaCungCapApi'

/** Mã thống nhất: bản NCC dùng trực tiếp ma_ncc làm ma_kh khi mirror sang KH */
export function maDongBoTuNcc(ncc: NhaCungCapRecord): string {
  return String(ncc.ma_ncc ?? '').trim()
}

function khPayloadFromNcc(ncc: NhaCungCapRecord, ma_kh: string): Omit<KhachHangRecord, 'id'> {
  return {
    ma_kh,
    ten_kh: ncc.ten_ncc,
    loai_kh: ncc.loai_ncc as KhachHangRecord['loai_kh'],
    isNhaCungCap: true,
    dia_chi: ncc.dia_chi,
    nhom_kh: ncc.nhom_kh_ncc,
    ma_so_thue: ncc.ma_so_thue,
    ma_dvqhns: ncc.ma_dvqhns,
    dien_thoai: ncc.dien_thoai,
    fax: ncc.fax,
    email: ncc.email,
    website: ncc.website,
    dien_giai: ncc.dien_giai,
    dieu_khoan_tt: ncc.dieu_khoan_tt,
    so_ngay_duoc_no: ncc.so_ngay_duoc_no,
    han_muc_no_kh: ncc.so_no_toi_da ?? 0,
    nv_ban_hang: ncc.nv_mua_hang,
    tk_ngan_hang: ncc.tk_ngan_hang,
    ten_ngan_hang: ncc.ten_ngan_hang,
    nguoi_lien_he: ncc.nguoi_lien_he,
    tai_khoan_ngan_hang: ncc.tai_khoan_ngan_hang as KhachHangRecord['tai_khoan_ngan_hang'],
    ngung_theo_doi: ncc.ngung_theo_doi,
    quoc_gia: ncc.quoc_gia,
    quyen_huyen: ncc.quyen_huyen,
    tinh_tp: ncc.tinh_tp,
    xa_phuong: ncc.xa_phuong,
    xung_ho: ncc.xung_ho,
    gioi_tinh: ncc.gioi_tinh,
    ho_va_ten_lien_he: ncc.ho_va_ten_lien_he,
    chuc_danh: ncc.chuc_danh,
    dt_di_dong: ncc.dt_di_dong,
    dtdd_khac: ncc.dtdd_khac,
    dt_co_dinh: ncc.dt_co_dinh,
    dia_chi_lien_he: ncc.dia_chi_lien_he,
    dai_dien_theo_pl: ncc.dai_dien_theo_pl,
    dia_diem_giao_hang: ncc.dia_diem_giao_hang,
    dia_diem_nhan_hang: ncc.dia_diem_nhan_hang,
    dia_diem_nhan_trung_giao: ncc.dia_diem_giao_trung_nhan,
    so_ho_chieu: ncc.so_ho_chieu,
    so_cccd: ncc.so_cccd,
    ngay_cap: ncc.ngay_cap,
    noi_cap: ncc.noi_cap,
  }
}

function nccPayloadFromKh(kh: KhachHangRecord, ma_ncc: string): Omit<NhaCungCapRecord, 'id'> {
  return {
    ma_ncc,
    ten_ncc: kh.ten_kh,
    loai_ncc: kh.loai_kh as NhaCungCapRecord['loai_ncc'],
    khach_hang: true,
    dia_chi: kh.dia_chi,
    nhom_kh_ncc: kh.nhom_kh,
    ma_so_thue: kh.ma_so_thue,
    ma_dvqhns: kh.ma_dvqhns,
    dien_thoai: kh.dien_thoai,
    fax: kh.fax,
    email: kh.email,
    website: kh.website,
    dien_giai: kh.dien_giai,
    dieu_khoan_tt: kh.dieu_khoan_tt,
    so_ngay_duoc_no: kh.so_ngay_duoc_no,
    so_no_toi_da: kh.han_muc_no_kh ?? 0,
    nv_mua_hang: kh.nv_ban_hang,
    tk_ngan_hang: kh.tk_ngan_hang,
    ten_ngan_hang: kh.ten_ngan_hang,
    nguoi_lien_he: kh.nguoi_lien_he,
    tai_khoan_ngan_hang: kh.tai_khoan_ngan_hang as NhaCungCapRecord['tai_khoan_ngan_hang'],
    ngung_theo_doi: kh.ngung_theo_doi,
    quoc_gia: kh.quoc_gia,
    quyen_huyen: kh.quyen_huyen,
    tinh_tp: kh.tinh_tp,
    xa_phuong: kh.xa_phuong,
    xung_ho: kh.xung_ho,
    gioi_tinh: kh.gioi_tinh,
    ho_va_ten_lien_he: kh.ho_va_ten_lien_he,
    chuc_danh: kh.chuc_danh,
    dt_di_dong: kh.dt_di_dong,
    dtdd_khac: kh.dtdd_khac,
    dt_co_dinh: kh.dt_co_dinh,
    dia_chi_lien_he: kh.dia_chi_lien_he,
    dai_dien_theo_pl: kh.dai_dien_theo_pl,
    dia_diem_giao_hang: kh.dia_diem_giao_hang,
    dia_diem_nhan_hang: kh.dia_diem_nhan_hang,
    dia_diem_giao_trung_nhan: kh.dia_diem_nhan_trung_giao,
    so_ho_chieu: kh.so_ho_chieu,
    so_cccd: kh.so_cccd,
    ngay_cap: kh.ngay_cap,
    noi_cap: kh.noi_cap,
  }
}

/** After NCC save: upsert KH when khach_hang */
export async function mirrorKhachHangFromNccAfterNccSave(ncc: NhaCungCapRecord): Promise<void> {
  if (!ncc.khach_hang) return
  const khApi = await import('../banHang/khachHang/khachHangApi')
  const ma_kh = maDongBoTuNcc(ncc)
  if (!ma_kh) return
  const payload = khPayloadFromNcc(ncc, ma_kh)
  const list = await khApi.khachHangGetAll()
  const existing = list.find((r) => r.ma_kh === ma_kh)
  if (existing) {
    await khApi.khachHangPut(existing.id, payload, { skipPartnerMirror: true })
  } else {
    await khApi.khachHangPost(payload, { skipPartnerMirror: true })
  }
  khApi.khachHangNapLai()
}

/** After KH save: upsert NCC when isNhaCungCap */
export async function mirrorNhaCungCapFromKhachHangAfterKhSave(kh: KhachHangRecord): Promise<void> {
  if (!kh.isNhaCungCap) return
  const nccApi = await import('../muaHang/nhaCungCap/nhaCungCapApi')
  const ma_ncc = String(kh.ma_kh ?? '').trim()
  if (!ma_ncc) return
  const payload = nccPayloadFromKh(kh, ma_ncc)
  const list = await nccApi.nhaCungCapGetAll()
  const existing = list.find((r) => r.ma_ncc === ma_ncc)
  if (existing) {
    await nccApi.nhaCungCapPut(existing.id, payload, { skipPartnerMirror: true })
  } else {
    await nccApi.nhaCungCapPost(payload, { skipPartnerMirror: true })
  }
  nccApi.nhaCungCapNapLai()
}
