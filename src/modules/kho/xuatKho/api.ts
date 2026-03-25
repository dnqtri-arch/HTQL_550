import type { PhieuXuatKho, ChiTietXuatKho, TonKhoSnapshot } from './type'
import {
  nhanVatTuHangHoaGetAll,
  nhanVatTuHangHoaGetChiTiet,
  TINH_TRANG_NVTHH_DA_NHAP_KHO,
  getDefaultNhanVatTuHangHoaFilter,
} from '../nhanVatTuHangHoa/nhanVatTuHangHoaApi'

/* ── localStorage keys ─────────────────────────────────────────── */
const LS_PHIEU_XUAT = 'htql_phieu_xuat_kho'
/** Key chia sẻ với khovthh/Api.ts — phải nhất quán */
const LS_XUAT_ITEMS = 'htql_xuatkho_items'

/* ── CRUD helpers ──────────────────────────────────────────────── */
function docDuLieu(): PhieuXuatKho[] {
  try {
    const raw = localStorage.getItem(LS_PHIEU_XUAT)
    if (raw) return JSON.parse(raw) as PhieuXuatKho[]
  } catch { /* ignore */ }
  return []
}

function luuDuLieu(list: PhieuXuatKho[]): void {
  localStorage.setItem(LS_PHIEU_XUAT, JSON.stringify(list))
}

/* ── Task 5: Đồng bộ items sang htql_xuatkho_items ────────────── */
function syncXuatItems(tatCaPhieu: PhieuXuatKho[]): void {
  const items: XuatKhoItem[] = []
  for (const p of tatCaPhieu) {
    if (p.tinhtrang !== 'Đã xuất kho') continue
    for (const ct of p.chitiet) {
      items.push({
        mahang: ct.mavthh,
        tenvthh: ct.tenvthh,
        dvt: ct.dvt,
        soluong: ct.soluong,
        giatri: ct.thanhtien,
        ngay: p.ngayxuat,
        sophieu: p.sophieu,
        tinh_trang: 'Đã xuất kho',
      })
    }
  }
  localStorage.setItem(LS_XUAT_ITEMS, JSON.stringify(items))
}

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

/* ── Task 6: Lấy tồn kho hiện tại (snapshot) ──────────────────── */
export function layTonKhoHienTai(makho?: string): Map<string, TonKhoSnapshot> {
  const mapNhap = new Map<string, { tenvthh: string; dvt: string; sl: number; gt: number }>()

  const allPhieu = nhanVatTuHangHoaGetAll({
    ...getDefaultNhanVatTuHangHoaFilter(),
    tu: '',
    den: '',
  })
  const daNhap = allPhieu.filter((p) => p.tinh_trang === TINH_TRANG_NVTHH_DA_NHAP_KHO)

  for (const phieu of daNhap) {
    if (makho && phieu.kho_nhap_id !== makho) continue
    const chiTiet = nhanVatTuHangHoaGetChiTiet(phieu.id)
    for (const ct of chiTiet) {
      const ma = (ct.ma_hang ?? '').trim().toUpperCase()
      if (!ma) continue
      const ex = mapNhap.get(ma)
      if (ex) {
        ex.sl += ct.so_luong ?? 0
        ex.gt += ct.thanh_tien ?? 0
      } else {
        mapNhap.set(ma, { tenvthh: ct.ten_hang ?? '', dvt: ct.dvt ?? '', sl: ct.so_luong ?? 0, gt: ct.thanh_tien ?? 0 })
      }
    }
  }

  /* Trừ đã xuất kho */
  let xuatItems: XuatKhoItem[] = []
  try {
    const raw = localStorage.getItem(LS_XUAT_ITEMS)
    if (raw) xuatItems = JSON.parse(raw) as XuatKhoItem[]
  } catch { /* ignore */ }

  const result = new Map<string, TonKhoSnapshot>()
  for (const [ma, nhap] of mapNhap) {
    const tongXuat = xuatItems.filter((x) => (x.mahang ?? '').trim().toUpperCase() === ma)
      .reduce((s, x) => s + (x.soluong ?? 0), 0)
    result.set(ma, {
      mavthh: ma,
      tenvthh: nhap.tenvthh,
      dvt: nhap.dvt,
      soluongton: Math.max(0, nhap.sl - tongXuat),
    })
  }
  return result
}

/* ── Auto generate số phiếu ────────────────────────────────────── */
export function autoGenSoPhieu(): string {
  const ngay = new Date()
  const y = ngay.getFullYear()
  const m = String(ngay.getMonth() + 1).padStart(2, '0')
  const d = String(ngay.getDate()).padStart(2, '0')
  const prefix = `PXK-${y}${m}${d}-`
  const list = docDuLieu()
  const soMax = list
    .filter((p) => p.sophieu.startsWith(prefix))
    .map((p) => parseInt(p.sophieu.replace(prefix, '') || '0', 10))
    .reduce((a, b) => Math.max(a, b), 0)
  return `${prefix}${String(soMax + 1).padStart(3, '0')}`
}

/* ── CRUD ──────────────────────────────────────────────────────── */
export function xuatKhoGetAll(): PhieuXuatKho[] {
  return docDuLieu().sort((a, b) => b.ngaytao.localeCompare(a.ngaytao))
}

export function xuatKhoCreate(data: Omit<PhieuXuatKho, 'id' | 'ngaytao'>): PhieuXuatKho {
  const list = docDuLieu()
  const phieu: PhieuXuatKho = {
    ...data,
    id: `pxk-${Date.now()}`,
    ngaytao: new Date().toISOString(),
  }
  list.push(phieu)
  luuDuLieu(list)
  syncXuatItems(list)
  return phieu
}

export function xuatKhoUpdate(phieu: PhieuXuatKho): PhieuXuatKho {
  const list = docDuLieu()
  const idx = list.findIndex((p) => p.id === phieu.id)
  if (idx >= 0) list[idx] = phieu
  else list.push(phieu)
  luuDuLieu(list)
  syncXuatItems(list)
  return phieu
}

export function xuatKhoDelete(id: string): void {
  const list = docDuLieu().filter((p) => p.id !== id)
  luuDuLieu(list)
  syncXuatItems(list)
}

/** Tính tổng giá trị từ chi tiết */
export function tinhTongGiaTri(chitiet: ChiTietXuatKho[]): number {
  return chitiet.reduce((s, ct) => s + (ct.thanhtien ?? 0), 0)
}
