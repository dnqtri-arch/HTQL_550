/**
 * Thứ tự danh sách mặc định: **mới trước** — theo mã chứng từ `{năm}/…/{số}` hoặc số cuối trong `id`.
 * Dùng trong getAll / lưới danh sách (Báo giá, ĐHB, HĐ bán/mua, VTHH).
 */

/** Điểm sắp xếp: lớn hơn = mới hơn (sort giảm dần: b - a). */
export function htqlRankNewestFirst(row: {
  id?: string | number
  so_bao_gia?: string
  so_don_hang?: string
  so_hop_dong?: string
  ma?: string
  id_num?: number
}): number {
  if (typeof row.id === 'number' && Number.isFinite(row.id)) {
    return row.id
  }
  if (typeof row.id_num === 'number' && Number.isFinite(row.id_num)) {
    return row.id_num
  }
  const so = (row.so_bao_gia ?? row.so_don_hang ?? row.so_hop_dong ?? row.ma ?? '').trim()
  if (so) {
    const m = so.match(/^(\d{4})\/[^/]+\/(\d+)\s*$/i)
    if (m) {
      const y = parseInt(m[1], 10)
      const n = parseInt(m[2], 10)
      if (Number.isFinite(y) && Number.isFinite(n)) return y * 1_000_000 + n
    }
    const tail = so.match(/(\d+)\s*$/)
    if (tail) {
      const n = parseInt(tail[1], 10)
      if (Number.isFinite(n)) return n
    }
  }
  const id = String(row.id ?? '')
  const nums = id.match(/\d+/g)
  if (nums && nums.length) {
    const last = nums[nums.length - 1]
    const n = parseInt(last, 10)
    if (Number.isFinite(n)) return n
  }
  return 0
}

/** Trả bản sao đã sort giảm dần theo `htqlRankNewestFirst`. */
export function htqlSortCopyNewestFirst<T extends Parameters<typeof htqlRankNewestFirst>[0]>(rows: T[]): T[] {
  return [...rows].sort((a, b) => htqlRankNewestFirst(b) - htqlRankNewestFirst(a))
}
