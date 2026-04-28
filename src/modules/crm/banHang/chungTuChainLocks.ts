import type { DonHangBanChungTuRecord } from '../../../types/donHangBanChungTu'
import type { HopDongBanChungTuRecord } from '../../../types/hopDongBanChungTu'
import type { PhuLucHopDongBanChungTuRecord } from '../../../types/phuLucHopDongBanChungTu'

export const CHAIN_DOWNSTREAM_LOCK_MATRIX = {
  lockWhenDownstreamStatusIn: 'all_except_cancelled_or_rejected',
  ignoreStatuses: ['Hủy bỏ', 'KH không đồng ý'],
} as const

function norm(value: string | null | undefined): string {
  return (value ?? '').trim()
}

export function downstreamStatusBlocksUpstream(status: string | null | undefined): boolean {
  const s = norm(status)
  if (!s) return true
  return !CHAIN_DOWNSTREAM_LOCK_MATRIX.ignoreStatuses.includes(s as 'Hủy bỏ' | 'KH không đồng ý')
}

export function lockReasonDonHangBanByChain(
  row: DonHangBanChungTuRecord,
  hopDongRows: HopDongBanChungTuRecord[],
  phuLucRows: PhuLucHopDongBanChungTuRecord[],
): string | null {
  const donId = norm(row.id)
  if (!donId) return null
  const linkedHopDongIds = new Set<string>()
  for (const hopDong of hopDongRows) {
    if (norm(hopDong.doi_chieu_don_mua_id) !== donId) continue
    linkedHopDongIds.add(norm(hopDong.id))
    if (downstreamStatusBlocksUpstream(hopDong.tinh_trang)) {
      return 'Đơn hàng bán đã phát sinh Hợp đồng bán ở trạng thái đang hiệu lực.'
    }
  }
  for (const phuLuc of phuLucRows) {
    const linkDirect = norm(phuLuc.doi_chieu_don_mua_id) === donId
    const hdbGoc = norm(phuLuc.hop_dong_ban_chung_tu_goc_id)
    const linkViaHopDong = !!hdbGoc && linkedHopDongIds.has(hdbGoc)
    if (!linkDirect && !linkViaHopDong) continue
    if (downstreamStatusBlocksUpstream(phuLuc.tinh_trang)) {
      return 'Đơn hàng bán đã phát sinh Phụ lục hợp đồng ở trạng thái đang hiệu lực.'
    }
  }
  return null
}

export function lockReasonHopDongByChain(
  row: HopDongBanChungTuRecord,
  phuLucRows: PhuLucHopDongBanChungTuRecord[],
): string | null {
  const hopDongId = norm(row.id)
  if (!hopDongId) return null
  for (const phuLuc of phuLucRows) {
    if (norm(phuLuc.hop_dong_ban_chung_tu_goc_id) !== hopDongId) continue
    if (downstreamStatusBlocksUpstream(phuLuc.tinh_trang)) {
      return 'Hợp đồng bán đã phát sinh Phụ lục hợp đồng ở trạng thái đang hiệu lực.'
    }
  }
  return null
}
