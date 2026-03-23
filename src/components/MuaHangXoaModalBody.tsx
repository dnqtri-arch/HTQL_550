import type { ReactElement } from 'react'

export type MuaHangXoaModalVariant = 'don_hang_mua' | 'phieu_nhan_nvthh'

const INTRO: Record<MuaHangXoaModalVariant, string> = {
  don_hang_mua: 'Đơn hàng mua sẽ bị xóa vĩnh viễn khỏi danh sách.',
  phieu_nhan_nvthh: 'Phiếu nhận vật tư hàng hóa sẽ bị xóa vĩnh viễn khỏi danh sách.',
}

const MA_LABEL: Record<MuaHangXoaModalVariant, string> = {
  don_hang_mua: 'Mã ĐHM',
  phieu_nhan_nvthh: 'Mã phiếu',
}

export const MUA_HANG_MODAL_FOOTER_HUY = 'Hủy'
export const MUA_HANG_MODAL_FOOTER_DONG_Y = 'Đồng ý'
export const MUA_HANG_MODAL_TITLE_XOA = 'Xác nhận xóa'

export function MuaHangXoaModalBody({
  variant,
  soDonHang,
  nhaCungCap,
}: {
  variant: MuaHangXoaModalVariant
  soDonHang: string
  nhaCungCap: string
}): ReactElement {
  return (
    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>
      {INTRO[variant]}
      <br />
      <br />
      {MA_LABEL[variant]}: <strong>{soDonHang}</strong>
      <br />
      Nhà cung cấp: {nhaCungCap}
      <br />
      <br />
      Bạn có chắc chắn muốn xóa?
    </p>
  )
}
