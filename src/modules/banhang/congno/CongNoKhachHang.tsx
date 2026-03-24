/**
 * Công nợ khách hàng — tự động tính từ HoaDonBan + PhieuThu.
 * Hiển thị bảng tổng hợp và chi tiết theo hóa đơn.
 * Logic: congNoKhachHang() từ hoaDonBanApi.
 */

import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { DataGrid, type DataGridColumn } from '../../../components/common/DataGrid'
import { Modal } from '../../../components/common/Modal'
import { useToastOptional } from '../../../context/ToastContext'
import { matchSearchKeyword } from '../../../utils/stringUtils'
import { formatNumberDisplay } from '../../../utils/numberFormat'
import { formFooterButtonCancel, formFooterButtonSave } from '../../../constants/formFooterButtons'
import {
  hoaDonBanGetAll,
  phieuThuPost,
  phieuThuSoTiepTheo,
  congNoKhachHang,
  getDefaultHoaDonBanFilter,
  type HoaDonBanRecord,
} from '../hoadon/hoaDonBanApi'
import styles from '../BanHang.module.css'

function formatNgay(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

const TODAY_ISO = new Date().toISOString().slice(0, 10)

// ─── Main ─────────────────────────────────────────────────────────────────

interface CongNoRow {
  id: string
  khach_hang: string
  tong_no: number
  so_hoa_don: number
}

const columnsCongNo: DataGridColumn<CongNoRow>[] = [
  { key: 'khach_hang', label: 'Khách hàng', width: '40%' },
  { key: 'so_hoa_don', label: 'Số hóa đơn nợ', width: 110, align: 'right' },
  {
    key: 'tong_no',
    label: 'Tổng công nợ',
    width: 140,
    align: 'right',
    renderCell: (v) => <span className={Number(v) > 0 ? styles.congNoAmountNeg : undefined}>{formatNumberDisplay(Number(v), 0)}</span>,
  },
]

const columnsHoaDonNo: DataGridColumn<HoaDonBanRecord>[] = [
  { key: 'so_hoa_don', label: 'Số HĐ', width: 100 },
  { key: 'ngay_hoa_don', label: 'Ngày HĐ', width: 76, align: 'right', renderCell: (v) => formatNgay(v as string) },
  { key: 'dien_giai', label: 'Diễn giải', width: '30%' },
  { key: 'tong_thanh_toan', label: 'Tổng tiền', width: 110, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'so_tien_da_thu', label: 'Đã thu', width: 100, align: 'right', renderCell: (v) => formatNumberDisplay(Number(v), 0) },
  { key: 'con_lai', label: 'Còn lại', width: 110, align: 'right', renderCell: (v) => <span className={styles.congNoAmountNeg}>{formatNumberDisplay(Number(v), 0)}</span> },
  { key: 'tinh_trang', label: 'Trạng thái', width: 110 },
]

export function CongNoKhachHang() {
  const toast = useToastOptional()
  const [congNoList, setCongNoList] = useState<CongNoRow[]>([])
  const [selectedKh, setSelectedKh] = useState<string | null>(null)
  const [hoaDonNoCuaKh, setHoaDonNoCuaKh] = useState<HoaDonBanRecord[]>([])
  const [search, setSearch] = useState('')
  const [thuModal, setThuModal] = useState<HoaDonBanRecord | null>(null)
  const [loi, setLoi] = useState('')

  const loadData = useCallback(() => {
    const map = congNoKhachHang()
    const rows: CongNoRow[] = []
    map.forEach((v, kh) => rows.push({ id: kh, khach_hang: kh, tong_no: v.tongNo, so_hoa_don: v.soHoaDon }))
    rows.sort((a, b) => b.tong_no - a.tong_no)
    setCongNoList(rows)
    if (selectedKh) {
      const hoaDonAll = hoaDonBanGetAll({ ...getDefaultHoaDonBanFilter() })
      setHoaDonNoCuaKh(hoaDonAll.filter((h) => h.khach_hang === selectedKh && h.con_lai > 0 && h.tinh_trang !== 'Hủy bỏ'))
    }
  }, [selectedKh])

  useEffect(() => { loadData() }, [loadData])

  const filtered = search.trim()
    ? congNoList.filter((r) => matchSearchKeyword(r.khach_hang, search))
    : congNoList

  const tongNo = filtered.reduce((s, r) => s + r.tong_no, 0)

  const onSelectKh = (row: CongNoRow) => {
    setSelectedKh(row.khach_hang)
    const hoaDonAll = hoaDonBanGetAll({ ...getDefaultHoaDonBanFilter() })
    setHoaDonNoCuaKh(hoaDonAll.filter((h) => h.khach_hang === row.khach_hang && h.con_lai > 0 && h.tinh_trang !== 'Hủy bỏ'))
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbarWrap}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginRight: 8 }}>Công nợ khách hàng</span>
        <button
          type="button"
          className={styles.toolbarBtn}
          disabled={!hoaDonNoCuaKh.length}
          onClick={() => {
            if (hoaDonNoCuaKh.length === 1) setThuModal(hoaDonNoCuaKh[0])
            else toast?.showToast('Chọn hóa đơn muốn thu tiền trong bảng phía dưới.', 'info')
          }}
        >
          <Plus size={13} /> Thu tiền
        </button>
        <button type="button" className={styles.toolbarBtn} onClick={() => { loadData(); toast?.showToast('Đã cập nhật công nợ.', 'success') }}>
          Cập nhật
        </button>
        <input type="text" className={styles.searchInput} placeholder="Tìm khách hàng..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginLeft: 8 }} />
      </div>

      <div className={styles.contentArea}>
        {/* Bảng tổng hợp */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Tổng hợp theo khách hàng</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <DataGrid<CongNoRow>
              columns={columnsCongNo} data={filtered} keyField="id" stripedRows compact height="100%"
              selectedRowId={selectedKh ?? undefined}
              onRowSelect={onSelectKh}
              summary={[
                { label: 'Tổng công nợ', value: formatNumberDisplay(tongNo, 0) },
                { label: 'Số khách', value: `= ${filtered.length}` },
              ]}
            />
          </div>
        </div>

        {/* Chi tiết hóa đơn theo KH */}
        <div className={styles.detailWrap}>
          <div className={styles.detailTabBar}>
            <button type="button" className={styles.detailTabActive}>
              {selectedKh ? `Hóa đơn còn nợ — ${selectedKh}` : 'Hóa đơn còn nợ'}
            </button>
          </div>
          <div className={styles.detailTabPanel}>
            <DataGrid<HoaDonBanRecord>
              columns={columnsHoaDonNo} data={hoaDonNoCuaKh} keyField="id" stripedRows compact height="100%"
              onRowDoubleClick={(r) => setThuModal(r)}
              summary={[
                { label: 'Tổng còn lại', value: formatNumberDisplay(hoaDonNoCuaKh.reduce((s, h) => s + h.con_lai, 0), 0) },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Modal thu tiền */}
      <Modal
        open={thuModal != null}
        onClose={() => setThuModal(null)}
        title="Thu tiền khách hàng"
        size="sm"
        footer={
          <>
            <button type="button" style={formFooterButtonCancel} onClick={() => setThuModal(null)}>Hủy bỏ</button>
            <button type="button" style={formFooterButtonSave} onClick={() => {
              const el = document.getElementById('phieu-thu-so-tien') as HTMLInputElement | null
              if (!el) return
              const so = Number(el.value.replace(/[.,\s]/g, '')) || 0
              if (!so) { setLoi('Số tiền phải lớn hơn 0.'); return }
              phieuThuPost({
                so_phieu: phieuThuSoTiepTheo(),
                ngay_thu: TODAY_ISO,
                khach_hang: thuModal?.khach_hang ?? '',
                so_tien: so,
                dien_giai: `Thu tiền hóa đơn ${thuModal?.so_hoa_don ?? ''}`,
                hoa_don_ban_id: thuModal?.id,
                so_hoa_don_lien_quan: thuModal?.so_hoa_don,
              })
              toast?.showToast(`Đã ghi nhận thu ${formatNumberDisplay(so, 0)}.`, 'success')
              setThuModal(null)
              setLoi('')
              loadData()
            }}>Lưu</button>
          </>
        }
      >
        {thuModal && (
          <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ background: 'var(--bg-tab)', borderRadius: 4, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div><strong>Hóa đơn:</strong> {thuModal.so_hoa_don} — {thuModal.khach_hang}</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <span>Tổng: <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumberDisplay(thuModal.tong_thanh_toan, 0)}</strong></span>
                <span>Còn lại: <strong style={{ color: '#c2410c', fontVariantNumeric: 'tabular-nums' }}>{formatNumberDisplay(thuModal.con_lai, 0)}</strong></span>
              </div>
            </div>
            {loi && <div style={{ color: '#dc2626', fontSize: 11 }}>{loi}</div>}
            <div className={styles.formRow}>
              <span className={styles.formLabel} style={{ minWidth: 90 }}>Số tiền thu</span>
              <input
                id="phieu-thu-so-tien"
                className={styles.formInput}
                style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', flex: 1 }}
                defaultValue={String(thuModal.con_lai)}
                autoFocus
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
