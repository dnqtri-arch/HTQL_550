import { ModulePage } from '../../components/ModulePage'
import { DataGrid } from '../../components/DataGrid'

const subNav = [
  { id: 'ban-hang', label: 'Bán hàng' },
  { id: 'hoa-don', label: 'Hóa đơn bán' },
  { id: 'khach-hang', label: 'Khách hàng' },
  { id: 'bao-cao', label: 'Báo cáo bán hàng' },
]

const sampleHoaDon = [
  { id: 1, So_hoa_don: 'HD-001', Ngay: '01/03/2026', Khach_hang: 'Công ty A', Tong_tien: '15.000.000' },
  { id: 2, So_hoa_don: 'HD-002', Ngay: '02/03/2026', Khach_hang: 'Công ty B', Tong_tien: '8.500.000' },
  { id: 3, So_hoa_don: 'HD-003', Ngay: '03/03/2026', Khach_hang: 'Công ty C', Tong_tien: '22.300.000' },
]

const columns = [
  { key: 'So_hoa_don', label: 'Số hóa đơn', width: '18%', filterable: true },
  { key: 'Ngay', label: 'Ngày', width: '15%', filterable: true },
  { key: 'Khach_hang', label: 'Khách hàng', width: '42%', filterable: true },
  { key: 'Tong_tien', label: 'Tổng tiền', width: '25%', align: 'right' as const, filterable: true },
]

export function BanHang() {
  const total = sampleHoaDon.length
  const sumMoney = '45.800.000'

  return (
    <ModulePage title="Bán hàng" subNav={subNav} defaultSubId="hoa-don">
      {(activeSubId) =>
        activeSubId === 'hoa-don' ? (
          <>
            <p style={{ color: 'var(--text-muted)', marginBottom: '6px', fontSize: '11px' }}>
              Danh sách hóa đơn bán. File thiết kế lưu tại /ssd_2tb/HTQL_550/thietke/
            </p>
            <DataGrid
              columns={columns}
              data={sampleHoaDon}
              keyField="id"
              summary={[
                { label: 'Tổng số', value: total },
                { label: 'Tổng tiền', value: sumMoney },
              ]}
              maxHeight={280}
            />
          </>
        ) : (
          <div style={{ padding: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid var(--border-strong)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
              Sử dụng Danh mục: Khách hàng (DanhMuc_DoiTuong), Vật tư hàng hóa, Kho, Đơn vị tính (DanhMuc_VatTu).
            </p>
          </div>
        )
      }
    </ModulePage>
  )
}
