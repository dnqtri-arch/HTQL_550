import type { KhoVthh, KhoVthhFilter, PhieuTonKho } from './type'
import { htqlEntityStorage } from '@/utils/htqlEntityStorage'
import {
  nhanVatTuHangHoaGetAll,
  nhanVatTuHangHoaGetChiTiet,
  TINH_TRANG_NVTHH_DA_NHAP_KHO,
  getDefaultNhanVatTuHangHoaFilter,
} from '../../crm/muaHang/nhanVatTuHangHoa/nhanVatTuHangHoaApi'

/* ─────────────────────────────────────────────────────────────────────────
   Stub: xuất kho — đọc từ htqlEntityStorage key htql_xuatkho_items
   Định dạng mỗi item: { mahang, tenvthh, dvt, soluong, giatri, ngay, sophieu, tinh_trang }
───────────────────────────────────────────────────────────────────────── */
interface XuatKhoItem {
  mahang: string
  tenvthh: string
  dvt: string
  soluong: number
  giatri: number
  ngay: string
  sophieu: string
  tinh_trang: string
}

const TINH_TRANG_DA_XUAT_KHO = 'Đã xuất kho'
const LS_XUAT_KHO = 'htql_xuatkho_items'

function docXuatKhoTuStorage(): XuatKhoItem[] {
  try {
    const raw = htqlEntityStorage.getItem(LS_XUAT_KHO)
    if (raw) return JSON.parse(raw) as XuatKhoItem[]
  } catch { /* ignore */ }
  return []
}

/* ─────────────────────────────────────────────────────────────────────────
   Tổng hợp báo cáo tồn kho
   Nguyên tắc: CHỈ lấy từ phiếu "Đã nhập kho" — không dùng dữ liệu mẫu.
   timkiem được lọc phía client (useMemo trong Page), không lọc ở đây.
───────────────────────────────────────────────────────────────────────── */
function getInventoryReport(filter?: Partial<KhoVthhFilter>): KhoVthh[] {
  /* ── Nhập kho: chỉ phiếu "Đã nhập kho" ── */
  const allPhieu = nhanVatTuHangHoaGetAll({
    ...getDefaultNhanVatTuHangHoaFilter(),
    tu: filter?.tungay ?? '',
    den: filter?.denngay ?? '',
  })
  const phieuDaNhapKho = allPhieu.filter((p) => p.tinh_trang === TINH_TRANG_NVTHH_DA_NHAP_KHO)

  /* Map: mavthh → { tenvthh, dvt, nhapkhoSl, nhapkhoGt } */
  const mapNhap = new Map<string, { tenvthh: string; dvt: string; sl: number; gt: number }>()
  for (const phieu of phieuDaNhapKho) {
    if (filter?.makho && phieu.kho_nhap_id !== filter.makho) continue
    const chiTiet = nhanVatTuHangHoaGetChiTiet(phieu.id)
    for (const ct of chiTiet) {
      const ma = (ct.ma_hang ?? '').trim().toUpperCase()
      if (!ma) continue
      const existing = mapNhap.get(ma)
      if (existing) {
        existing.sl += ct.so_luong ?? 0
        existing.gt += ct.thanh_tien ?? 0
      } else {
        mapNhap.set(ma, { tenvthh: ct.ten_hang ?? '', dvt: ct.dvt ?? '', sl: ct.so_luong ?? 0, gt: ct.thanh_tien ?? 0 })
      }
    }
  }

  /* ── Xuất kho: stub từ htqlEntityStorage (trạng thái "Đã xuất kho") ── */
  const xuatItems = docXuatKhoTuStorage().filter((x) => x.tinh_trang === TINH_TRANG_DA_XUAT_KHO)
  const mapXuat = new Map<string, { sl: number; gt: number }>()
  for (const x of xuatItems) {
    const ma = (x.mahang ?? '').trim().toUpperCase()
    if (!ma) continue
    if (filter?.tungay && x.ngay < filter.tungay) continue
    if (filter?.denngay && x.ngay > filter.denngay) continue
    const existing = mapXuat.get(ma)
    if (existing) {
      existing.sl += x.soluong ?? 0
      existing.gt += x.giatri ?? 0
    } else {
      mapXuat.set(ma, { sl: x.soluong ?? 0, gt: x.giatri ?? 0 })
    }
  }

  /* ── Hợp nhất thành danh sách KhoVthh ── */
  const allMa = new Set([...mapNhap.keys(), ...mapXuat.keys()])
  const result: KhoVthh[] = []
  let stt = 1
  for (const ma of allMa) {
    const nhap = mapNhap.get(ma)
    const xuat = mapXuat.get(ma)
    const nhapkhoSl = nhap?.sl ?? 0
    const nhapkhoGt = nhap?.gt ?? 0
    const xuatkhoSl = xuat?.sl ?? 0
    const xuatkhoGt = xuat?.gt ?? 0
    const giavon = nhapkhoSl > 0 ? Math.round((nhapkhoGt) / nhapkhoSl) : 0
    result.push({
      id: `kv-${stt++}`,
      mavthh: ma,
      tenvthh: nhap?.tenvthh ?? '',
      dvt: nhap?.dvt ?? '',
      dauky: { soluong: 0, giatri: 0 },
      nhapkho: { soluong: nhapkhoSl, giatri: nhapkhoGt },
      xuatkho: { soluong: xuatkhoSl, giatri: xuatkhoGt },
      cuoiky: { soluong: nhapkhoSl - xuatkhoSl, giatri: nhapkhoGt - xuatkhoGt },
      giavon,
    })
  }

  return result.sort((a, b) => a.mavthh.localeCompare(b.mavthh))
}

/** Map mã VTHH (uppercase) → tồn cuối kỳ từ báo cáo tồn kho (nhập − xuất). */
export function tonKhoCuoikyTheoMaVthh(filter?: Partial<KhoVthhFilter>): Map<string, { so_luong: number; gia_tri: number }> {
  const report = getInventoryReport(filter)
  const m = new Map<string, { so_luong: number; gia_tri: number }>()
  for (const r of report) {
    const ma = (r.mavthh ?? '').trim().toUpperCase()
    if (!ma) continue
    m.set(ma, { so_luong: r.cuoiky.soluong, gia_tri: r.cuoiky.giatri })
  }
  return m
}

/* ─────────────────────────────────────────────────────────────────────────
   Lấy danh sách phiếu nhập/xuất theo mã VTHH (dùng cho Modal chi tiết)
───────────────────────────────────────────────────────────────────────── */
export function layPhieuTheoMaVthh(mavthh: string): { nhap: PhieuTonKho[]; xuat: PhieuTonKho[] } {
  const ma = mavthh.trim().toUpperCase()

  /* Phiếu nhập — chỉ "Đã nhập kho" */
  const allPhieu = nhanVatTuHangHoaGetAll({ ...getDefaultNhanVatTuHangHoaFilter(), tu: '', den: '' })
  const nhap: PhieuTonKho[] = []
  for (const phieu of allPhieu.filter((p) => p.tinh_trang === TINH_TRANG_NVTHH_DA_NHAP_KHO)) {
    const chiTiet = nhanVatTuHangHoaGetChiTiet(phieu.id)
    const ct = chiTiet.find((c) => (c.ma_hang ?? '').trim().toUpperCase() === ma)
    if (ct) {
      nhap.push({
        sophieu: phieu.so_don_hang,
        ngay: phieu.ngay_don_hang,
        loai: 'Nhập kho',
        tinh_trang: phieu.tinh_trang,
        soluong: ct.so_luong ?? 0,
        giatri: ct.thanh_tien ?? 0,
        ncc: phieu.nha_cung_cap ?? '',
      })
    }
  }

  /* Phiếu xuất (từ htqlEntityStorage stub) */
  const xuatAll = docXuatKhoTuStorage()
  const xuat: PhieuTonKho[] = xuatAll
    .filter((x) => (x.mahang ?? '').trim().toUpperCase() === ma)
    .map((x) => ({
      sophieu: x.sophieu,
      ngay: x.ngay,
      loai: 'Xuất kho',
      tinh_trang: x.tinh_trang,
      soluong: x.soluong,
      giatri: x.giatri,
      ncc: '',
    }))

  return { nhap, xuat }
}

export async function layDanhSachKhoVthh(filter?: Partial<KhoVthhFilter>): Promise<KhoVthh[]> {
  return getInventoryReport(filter)
}
