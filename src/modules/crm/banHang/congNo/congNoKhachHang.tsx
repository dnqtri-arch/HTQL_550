/**
 * Công nợ khách hàng — tổng hợp Đơn hàng bán + Hợp đồng bán (chứng từ), chỉ hiển thị khi còn lại > 0.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { DataGrid, type DataGridColumn } from '../../../../components/common/dataGrid'
import { useToastOptional } from '../../../../context/toastContext'
import { useDraggable } from '../../../../hooks/useDraggable'
import { matchSearchKeyword } from '../../../../utils/stringUtils'
import { formatNumberDisplay } from '../../../../utils/numberFormat'
import styles from '../BanHang.module.css'
import { baoGiaGetAll, getDefaultBaoGiaFilter } from '../baoGia/baoGiaApi'
import { khachHangGetAll, type KhachHangRecord } from '../khachHang/khachHangApi'
import {
  donHangBanGetAll,
  donHangBanGetChiTiet,
  getDefaultDonHangBanChungTuFilter,
} from '../donHangBan/donHangBanChungTuApi'
import {
  hopDongBanChungTuGetAll,
  hopDongBanChungTuGetChiTiet,
  getDefaultHopDongBanChungTuFilter,
} from '../hopDongBan/hopDongBanChungTuApi'
import {
  tinhDaThuVaConLaiChoDonHangBan,
  tinhDaThuVaConLaiChoHopDongBan,
  hanThanhToanTuDonHang,
  hanThanhToanTuHopDong,
} from '../../../taiChinh/thuTien/chungTuCongNoKhach'
import { buildThuTienBangPrefillFromDonHangBan } from '../../../taiChinh/thuTien/donHangBanToThuTienBangPrefill'
import { buildThuTienBangPrefillFromHopDongBanChungTu } from '../../../taiChinh/thuTien/hopDongBanToThuTienBangPrefill'
import { ThuTienForm } from '../../../taiChinh/thuTien/thuTienForm'
import { ThuTienBangApiProvider } from '../../../taiChinh/thuTien/thuTienBangApiContext'
import { thuTienBangApiImpl, HTQL_THU_TIEN_BANG_RELOAD_EVENT } from '../../../taiChinh/thuTien/thuTienBangApi'
import type { DonHangBanChungTuRecord } from '../../../../types/donHangBanChungTu'
import type { HopDongBanChungTuRecord } from '../../../../types/hopDongBanChungTu'
import type { ThuTienBangChiTiet, ThuTienBangRecord } from '../../../../types/thuTienBang'

function formatNgayIso(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

function parseHanDdMmYyyyToTime(s: string): number | null {
  const t = (s ?? '').trim()
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const d = new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10))
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}

function maKhachTuTen(ten: string, list: KhachHangRecord[]): string {
  const t = ten.trim()
  if (!t) return ''
  const hit =
    list.find((k) => (k.ten_kh ?? '').trim() === t) ||
    list.find((k) => {
      const ma = (k.ma_kh ?? '').trim()
      return ma !== '' && (t === ma || t.startsWith(`${ma} -`))
    })
  return (hit?.ma_kh ?? '').trim()
}

function hanSomNhatDisplay(times: number[]): string {
  const valid = times.filter((n) => Number.isFinite(n))
  if (valid.length === 0) return ''
  const min = Math.min(...valid)
  const d = new Date(min)
  const day = d.getDate()
  const mo = d.getMonth() + 1
  const y = d.getFullYear()
  return `${String(day).padStart(2, '0')}/${String(mo).padStart(2, '0')}/${y}`
}

interface CongNoTongHopRow {
  id: string
  ma_khach_hang: string
  ten_khach_hang: string
  han_thanh_toan: string
  tong_cong_no: number
}

type CongNoChiTietRow = {
  id: string
  loai: 'don_hang_ban' | 'hop_dong_ban'
  loaiHienThi: string
  ma_chung_tu: string
  ngay_chung_tu: string
  han_thanh_toan: string
  dien_giai: string
  tong_phai_thu: number
  da_thu: number
  con_lai: number
  chungTuId: string
}

const columnsCongNo: DataGridColumn<CongNoTongHopRow>[] = [
  { key: 'ma_khach_hang', label: 'Mã KH', width: 88 },
  { key: 'ten_khach_hang', label: 'Tên khách hàng', width: '28%' },
  { key: 'han_thanh_toan', label: 'Hạn thanh toán', width: 100, align: 'right' },
  {
    key: 'tong_cong_no',
    label: 'Tổng công nợ',
    width: 130,
    align: 'right',
    renderCell: (v) => <span className={Number(v) > 0 ? styles.congNoAmountNeg : undefined}>{formatNumberDisplay(Number(v), 0)}</span>,
  },
]

const columnsChiTiet: DataGridColumn<CongNoChiTietRow>[] = [
  { key: 'loaiHienThi', label: 'Loại', width: 108 },
  { key: 'ma_chung_tu', label: 'Mã chứng từ', width: 108 },
  { key: 'ngay_chung_tu', label: 'Ngày CT', width: 84, align: 'right' },
  { key: 'han_thanh_toan', label: 'Hạn thanh toán', width: 100, align: 'right' },
  { key: 'dien_giai', label: 'Diễn giải', width: '22%' },
  { key: 'tong_phai_thu', label: 'Tổng tiền', width: 110, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'da_thu', label: 'Đã thu', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'con_lai', label: 'Còn lại', width: 110, align: 'right', renderCell: (v) => <span className={styles.congNoAmountNeg}>{formatNumberDisplay(Number(v), 0)}</span> },
]

function buildChiTietChoTenKhach(tenKhach: string): CongNoChiTietRow[] {
  const ten = tenKhach.trim()
  if (!ten) return []
  const filterDhb = getDefaultDonHangBanChungTuFilter()
  const filterHdb = getDefaultHopDongBanChungTuFilter()
  const baoGiaIds = new Set(baoGiaGetAll(getDefaultBaoGiaFilter()).map((r) => r.id))
  const out: CongNoChiTietRow[] = []

  for (const r of donHangBanGetAll(filterDhb)) {
    if ((r.khach_hang ?? '').trim() !== ten) continue
    if ((r.tinh_trang ?? '').trim() === 'Hủy bỏ') continue
    const bid = (r.bao_gia_id ?? '').trim()
    if (bid && !baoGiaIds.has(bid)) continue
    const { con_lai, da_thu } = tinhDaThuVaConLaiChoDonHangBan(r)
    if (con_lai <= 0) continue
    const hanStr = hanThanhToanTuDonHang(r)
    const idCt = (r.so_don_hang ?? '').trim() || r.id
    out.push({
      id: `dhb:${r.id}`,
      loai: 'don_hang_ban',
      loaiHienThi: 'Đơn hàng bán',
      ma_chung_tu: idCt,
      ngay_chung_tu: formatNgayIso(r.ngay_don_hang),
      han_thanh_toan: hanStr,
      dien_giai: (r.dien_giai ?? '').trim(),
      tong_phai_thu: typeof r.tong_thanh_toan === 'number' ? r.tong_thanh_toan : 0,
      da_thu,
      con_lai,
      chungTuId: r.id,
    })
  }
  for (const r of hopDongBanChungTuGetAll(filterHdb)) {
    if ((r.khach_hang ?? '').trim() !== ten) continue
    if ((r.tinh_trang ?? '').trim() === 'Hủy bỏ') continue
    const bid = (r.bao_gia_id ?? '').trim()
    if (bid && !baoGiaIds.has(bid)) continue
    const { con_lai, da_thu } = tinhDaThuVaConLaiChoHopDongBan(r)
    if (con_lai <= 0) continue
    const hanStr = hanThanhToanTuHopDong(r)
    const idCt = (r.so_hop_dong ?? '').trim() || r.id
    out.push({
      id: `hdb:${r.id}`,
      loai: 'hop_dong_ban',
      loaiHienThi: 'Hợp đồng bán',
      ma_chung_tu: idCt,
      ngay_chung_tu: formatNgayIso(r.ngay_lap_hop_dong),
      han_thanh_toan: hanStr,
      dien_giai: (r.dien_giai ?? '').trim(),
      tong_phai_thu: typeof r.tong_thanh_toan === 'number' ? r.tong_thanh_toan : 0,
      da_thu,
      con_lai,
      chungTuId: r.id,
    })
  }
  out.sort((a, b) => a.ma_chung_tu.localeCompare(b.ma_chung_tu, 'vi'))
  return out
}

export function CongNoKhachHang() {
  const toast = useToastOptional()
  const thuDrag = useDraggable()
  const [khList, setKhList] = useState<KhachHangRecord[]>([])
  const [congNoList, setCongNoList] = useState<CongNoTongHopRow[]>([])
  const [selectedKhId, setSelectedKhId] = useState<string | null>(null)
  const [chiTietKhach, setChiTietKhach] = useState<CongNoChiTietRow[]>([])
  const [search, setSearch] = useState('')
  const [selectedChungTuId, setSelectedChungTuId] = useState<string | null>(null)
  const [showThuTienModal, setShowThuTienModal] = useState(false)
  const [thuPrefill, setThuPrefill] = useState<{ prefillDon: Partial<ThuTienBangRecord>; prefillChiTiet: ThuTienBangChiTiet[] } | null>(null)
  const [thuTienFormKey, setThuTienFormKey] = useState(0)

  useEffect(() => {
    let c = false
    khachHangGetAll().then((list) => {
      if (!c && Array.isArray(list)) setKhList(list)
    })
    return () => { c = true }
  }, [])

  const loadData = useCallback(() => {
    const filterDhb = getDefaultDonHangBanChungTuFilter()
    const filterHdb = getDefaultHopDongBanChungTuFilter()
    const baoGiaIds = new Set(baoGiaGetAll(getDefaultBaoGiaFilter()).map((r) => r.id))

    type KhBucket = { ten: string; ma_kh: string; tong: number; hanTimes: number[] }
    const byTen: Map<string, KhBucket> = new Map()

    for (const row of donHangBanGetAll(filterDhb)) {
      if ((row.tinh_trang ?? '').trim() === 'Hủy bỏ') continue
      const bid = (row.bao_gia_id ?? '').trim()
      if (bid && !baoGiaIds.has(bid)) continue
      const { con_lai } = tinhDaThuVaConLaiChoDonHangBan(row)
      if (con_lai <= 0) continue
      const tenKey = (row.khach_hang ?? '').trim()
      if (!tenKey) continue
      const maKh = maKhachTuTen(tenKey, khList)
      const hanStr = hanThanhToanTuDonHang(row)
      const tHan = parseHanDdMmYyyyToTime(hanStr)
      const cur = byTen.get(tenKey) ?? { ten: tenKey, ma_kh: maKh, tong: 0, hanTimes: [] }
      cur.tong += con_lai
      if (tHan != null) cur.hanTimes.push(tHan)
      if (!cur.ma_kh && maKh) cur.ma_kh = maKh
      byTen.set(tenKey, cur)
    }

    for (const row of hopDongBanChungTuGetAll(filterHdb)) {
      if ((row.tinh_trang ?? '').trim() === 'Hủy bỏ') continue
      const bid = (row.bao_gia_id ?? '').trim()
      if (bid && !baoGiaIds.has(bid)) continue
      const { con_lai } = tinhDaThuVaConLaiChoHopDongBan(row)
      if (con_lai <= 0) continue
      const tenKey = (row.khach_hang ?? '').trim()
      if (!tenKey) continue
      const maKh = maKhachTuTen(tenKey, khList)
      const hanStr = hanThanhToanTuHopDong(row)
      const tHan = parseHanDdMmYyyyToTime(hanStr)
      const cur = byTen.get(tenKey) ?? { ten: tenKey, ma_kh: maKh, tong: 0, hanTimes: [] }
      cur.tong += con_lai
      if (tHan != null) cur.hanTimes.push(tHan)
      if (!cur.ma_kh && maKh) cur.ma_kh = maKh
      byTen.set(tenKey, cur)
    }

    const rows: CongNoTongHopRow[] = []
    for (const [, v] of byTen) {
      rows.push({
        id: v.ma_kh ? `mk:${v.ma_kh}` : `ten:${v.ten}`,
        ma_khach_hang: v.ma_kh || '—',
        ten_khach_hang: v.ten,
        han_thanh_toan: hanSomNhatDisplay(v.hanTimes),
        tong_cong_no: v.tong,
      })
    }
    rows.sort((a, b) => b.tong_cong_no - a.tong_cong_no)
    setCongNoList(rows)
  }, [khList])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const h = () => loadData()
    window.addEventListener(HTQL_THU_TIEN_BANG_RELOAD_EVENT, h)
    return () => window.removeEventListener(HTQL_THU_TIEN_BANG_RELOAD_EVENT, h)
  }, [loadData])

  useEffect(() => {
    if (!selectedKhId) {
      setChiTietKhach([])
      return
    }
    const sel = congNoList.find((r) => r.id === selectedKhId)
    if (!sel) {
      setSelectedKhId(null)
      setChiTietKhach([])
      return
    }
    setChiTietKhach(buildChiTietChoTenKhach(sel.ten_khach_hang))
  }, [selectedKhId, congNoList])

  useEffect(() => {
    setSelectedChungTuId(null)
  }, [selectedKhId])

  const filtered = useMemo(() => {
    const s = search.trim()
    if (!s) return congNoList
    return congNoList.filter((r) => matchSearchKeyword(`${r.ma_khach_hang} ${r.ten_khach_hang}`, s))
  }, [congNoList, search])

  const tongNo = filtered.reduce((acc, r) => acc + r.tong_cong_no, 0)

  const onSelectKh = (row: CongNoTongHopRow) => {
    setSelectedKhId(row.id)
  }

  const moThuTien = (ct: CongNoChiTietRow) => {
    if (ct.loai === 'don_hang_ban') {
      const r = donHangBanGetAll(getDefaultDonHangBanChungTuFilter()).find((x: DonHangBanChungTuRecord) => x.id === ct.chungTuId)
      if (!r) {
        toast?.showToast('Không tìm thấy đơn hàng bán.', 'info')
        return
      }
      const chi = donHangBanGetChiTiet(r.id)
      setThuPrefill(buildThuTienBangPrefillFromDonHangBan(r, chi))
    } else {
      const r = hopDongBanChungTuGetAll(getDefaultHopDongBanChungTuFilter()).find((x: HopDongBanChungTuRecord) => x.id === ct.chungTuId)
      if (!r) {
        toast?.showToast('Không tìm thấy hợp đồng bán.', 'info')
        return
      }
      const chi = hopDongBanChungTuGetChiTiet(r.id)
      setThuPrefill(buildThuTienBangPrefillFromHopDongBanChungTu(r, chi))
    }
    setShowThuTienModal(true)
    setThuTienFormKey((k) => k + 1)
  }

  const tenKhachChon = congNoList.find((r) => r.id === (selectedKhId ?? ''))?.ten_khach_hang ?? ''

  return (
    <div className={styles.root}>
      <div className={styles.toolbarWrap}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginRight: 8 }}>Công nợ khách hàng</span>
        <button
          type="button"
          className={styles.toolbarBtn}
          disabled={!chiTietKhach.length}
          onClick={() => {
            if (chiTietKhach.length === 1) moThuTien(chiTietKhach[0])
            else toast?.showToast('Chọn một dòng chứng từ còn nợ ở bảng dưới (hoặc chỉ còn một chứng từ thì bấm Thu tiền).', 'info')
          }}
        >
          <Plus size={13} /> Thu tiền
        </button>
        <button type="button" className={styles.toolbarBtn} onClick={() => { loadData(); toast?.showToast('Đã cập nhật công nợ.', 'success') }}>
          Cập nhật
        </button>
        <input type="text" className={styles.searchInput} placeholder="Tìm mã / tên khách..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginLeft: 8 }} />
      </div>

      <div className={styles.contentArea}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Tổng hợp theo khách hàng</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <DataGrid<CongNoTongHopRow>
              columns={columnsCongNo}
              data={filtered}
              keyField="id"
              stripedRows
              compact
              height="100%"
              selectedRowId={selectedKhId ?? undefined}
              onRowSelect={onSelectKh}
              summary={[
                { label: 'Tổng công nợ', value: formatNumberDisplay(tongNo, 0) },
                { label: 'Số khách', value: `= ${filtered.length}` },
              ]}
            />
          </div>
        </div>

        <div className={styles.detailWrap}>
          <div className={styles.detailTabBar}>
            <button type="button" className={styles.detailTabActive}>
              {tenKhachChon ? `Chứng từ còn nợ — ${tenKhachChon}` : 'Chứng từ còn nợ'}
            </button>
          </div>
          <div className={styles.detailTabPanel}>
            <DataGrid<CongNoChiTietRow>
              columns={columnsChiTiet}
              data={chiTietKhach}
              keyField="id"
              stripedRows
              compact
              height="100%"
              selectedRowId={selectedChungTuId ?? undefined}
              onRowSelect={(r) => setSelectedChungTuId(r.id)}
              onRowDoubleClick={(r) => moThuTien(r)}
              summary={[
                { label: 'Tổng còn lại', value: formatNumberDisplay(chiTietKhach.reduce((s, h) => s + h.con_lai, 0), 0) },
              ]}
            />
          </div>
        </div>
      </div>

      {showThuTienModal && thuPrefill && (
        <div className={styles.modalOverlay}>
          <div
            ref={thuDrag.containerRef}
            className={styles.modalBox}
            style={thuDrag.containerStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <ThuTienBangApiProvider api={thuTienBangApiImpl}>
              <ThuTienForm
                key={thuTienFormKey}
                formTitle="Phiếu thu tiền"
                thuTienPhieu
                phieuThuTuMenuBanHang
                soDonLabel="Mã phiếu thu"
                prefillDon={thuPrefill.prefillDon}
                prefillChiTiet={thuPrefill.prefillChiTiet}
                readOnly={false}
                onHeaderPointerDown={thuDrag.dragHandleProps.onMouseDown}
                headerDragStyle={thuDrag.dragHandleProps.style}
                onClose={() => {
                  setShowThuTienModal(false)
                  setThuPrefill(null)
                }}
                onSaved={() => {
                  setShowThuTienModal(false)
                  setThuPrefill(null)
                  loadData()
                  toast?.showToast('Đã lưu phiếu thu.', 'success')
                }}
              />
            </ThuTienBangApiProvider>
          </div>
        </div>
      )}
    </div>
  )
}
