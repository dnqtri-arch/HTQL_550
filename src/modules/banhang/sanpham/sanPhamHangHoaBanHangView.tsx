/**
 * Danh sách Sản phẩm hàng hóa dành cho Bán hàng.
 * Chỉ hiển thị VTHH có tinhChat = 'Vật tư' AND la_vthh_ban = true (task 3, 9 YC19).
 * Sử dụng shared API vatTuHangHoaGetForBanHang() — không import component từ module kho.
 */

import { useState, useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'
import { DataGrid, type DataGridColumn } from '../../../components/common/dataGrid'
import { vatTuHangHoaGetForBanHang, type VatTuHangHoaRecord } from '../../inventory/kho/vatTuHangHoaApi'
import { formatNumberDisplay } from '../../../utils/numberFormat'

interface Props {
  onQuayLai: () => void
}

const columns: DataGridColumn<VatTuHangHoaRecord>[] = [
  { key: 'ma', label: 'Mã sản phẩm', width: 110 },
  { key: 'ten', label: 'Tên sản phẩm, hàng hóa', width: '35%' },
  { key: 'nhom_vthh', label: 'Nhóm', width: '15%' },
  { key: 'dvt_chinh', label: 'ĐVT', width: 70 },
  {
    key: 'don_gia_ban',
    label: 'Đơn giá bán',
    width: 110,
    align: 'right',
    renderCell: (v) => v ? formatNumberDisplay(Number(v) || 0, 0) : '',
  },
  { key: 'tinh_chat', label: 'Tính chất', width: 90 },
]

export function SanPhamHangHoaBanHangView({ onQuayLai }: Props) {
  const [danhSach, setDanhSach] = useState<VatTuHangHoaRecord[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    vatTuHangHoaGetForBanHang().then(setDanhSach)
  }, [])

  const filtered = search.trim()
    ? danhSach.filter((r) =>
        `${r.ma} ${r.ten} ${r.nhom_vthh ?? ''}`.toLowerCase().includes(search.toLowerCase())
      )
    : danhSach

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          onClick={onQuayLai}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer',
            color: 'var(--text-primary)', fontFamily: 'inherit',
          }}
        >
          <ChevronLeft size={13} /> Quay lại
        </button>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Chỉ hiển thị sản phẩm có tính chất Vật tư và đã tích "Là vật tư, hàng hóa bán"
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm mã, tên..."
          style={{
            marginLeft: 'auto', height: 26, padding: '0 8px', fontSize: 11,
            border: '1px solid var(--border)', borderRadius: 4,
            background: 'var(--bg-tab)', color: 'var(--text-primary)', fontFamily: 'inherit', width: 200,
          }}
        />
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataGrid<VatTuHangHoaRecord>
          columns={columns}
          data={filtered}
          keyField="id"
          stripedRows
          compact
          height="100%"
          selectedRowId={selectedId}
          onRowSelect={(r) => setSelectedId(String(r.id))}
          summary={[{ label: 'Tổng sản phẩm', value: `= ${filtered.length}` }]}
        />
      </div>
    </div>
  )
}
