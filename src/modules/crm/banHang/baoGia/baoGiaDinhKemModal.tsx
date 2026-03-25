import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import type { BaoGiaAttachmentItem } from '../../../../types/baoGia'

const ACCEPT_ATTR = '.jpg,.jpeg,.png,.pdf,.docx'

function hopLeDinhDangFile(file: File): boolean {
  const n = file.name.toLowerCase()
  return /\.(jpe?g|png|pdf|docx)$/i.test(n)
}

/** 2026/BG/3 → 2026_bg_3 */
export function parseSoBaoGiaForAttachmentFile(soDon: string): string {
  const t = soDon.trim()
  const m = t.match(/^(\d{4})\s*\/\s*BG\s*\/\s*(\d+)$/i)
  if (m) return `${m[1]}_bg_${m[2]}`
  const s = t.replace(/[\\/]+/g, '_').replace(/\s+/g, '_').replace(/_+/g, '_').toLowerCase()
  return s || 'bg'
}

/**
 * Phần thư mục/tên file cho KH: **chỉ** `ma_kh` (chuẩn hóa chữ thường, bỏ khoảng trắng).
 * Không dùng tên KH làm slug — chưa có mã thì `kh_unknown`.
 * Tham số thứ hai (nếu có) bỏ qua, giữ cho tương thích gọi cũ.
 */
export function partMccForPath(maKh: string, _tenKhFallback?: string): string {
  const m = (maKh || '').trim().replace(/\s+/g, '').toLowerCase()
  return m || 'kh_unknown'
}

/** HH_mm_dd_MM_yyyy (vd 09_00_29_03_2026) */
export function formatTgGiaoForAttachmentFile(d: Date): string {
  const h = d.getHours()
  const mi = d.getMinutes()
  const day = d.getDate()
  const mo = d.getMonth() + 1
  const y = d.getFullYear()
  return `${String(h).padStart(2, '0')}_${String(mi).padStart(2, '0')}_${String(day).padStart(2, '0')}_${String(mo).padStart(2, '0')}_${y}`
}

/**
 * `maKhPathPart`: kết quả `partMccForPath(ma_kh)` — chỉ mã KH; chưa có mã → `kh_unknown`.
 * Thời gian trong tên file: TG giao hàng nếu có, không thì TG tạo báo giá, không thì thời điểm hiện tại.
 */
export function buildBgAttachmentBaseName(
  soDon: string,
  maKhPathPart: string,
  ngayGiao: Date | null,
  ngayBaoGia: Date | null,
  index: number
): string {
  const bgPart = parseSoBaoGiaForAttachmentFile(soDon)
  const khPart = (maKhPathPart || 'kh_unknown').trim().toLowerCase()
  const tgNgay = ngayGiao ?? ngayBaoGia ?? new Date()
  const tgPart = formatTgGiaoForAttachmentFile(tgNgay)
  return `${bgPart}_${khPart}_${tgPart}_${index}`
}

/** Thư mục module (slug) — đồng bộ quy tắc lưu đính kèm BG */
export const BG_ATTACHMENT_MODULE_FOLDER = 'bao_gia'

/** bao_gia / mã_kh / mã_bg — `maKhPathPart` đã qua partMccForPath */
export function buildBgAttachmentFolderVirtualPath(soBaoGia: string, maKhPathPart: string): string {
  const kh = (maKhPathPart || 'kh_unknown').trim().toLowerCase()
  const bg = parseSoBaoGiaForAttachmentFile(soBaoGia)
  return `${BG_ATTACHMENT_MODULE_FOLDER}/${kh}/${bg}`
}

export function buildBgAttachmentFullVirtualPath(soBaoGia: string, maKhPathPart: string, fileName: string): string {
  const base = fileName.replace(/^\/+/, '')
  return `${buildBgAttachmentFolderVirtualPath(soBaoGia, maKhPathPart)}/${base}`
}

/** Hậu tố chuẩn do `buildBgAttachmentBaseName`: _HH_mm_dd_MM_yyyy_index */
const RE_BG_ATT_NAME_TAIL = /_(\d{2})_(\d{2})_(\d{2})_(\d{2})_(\d{4})_(\d+)$/

/**
 * Khi đổi Mã BG / KH sau khi đã đính kèm: đổi lại `name` cho khớp (trước đó có thể là `…_kh_unknown_…`).
 * Giữ nguyên phần thời gian + chỉ số từ tên cũ; nếu không khớp định dạng hệ thống thì giữ nguyên tên.
 */
export function rebuildBgAttachmentStoredFileName(
  currentName: string,
  soBaoGia: string,
  maKhPathPart: string
): string {
  const raw = (currentName || '').trim()
  const extMatch = raw.match(/(\.[^./\\]+)$/)
  const ext = extMatch ? extMatch[1] : ''
  const base = extMatch ? raw.slice(0, -ext.length) : raw
  const m = base.match(RE_BG_ATT_NAME_TAIL)
  if (!m) return raw
  const tgPart = `${m[1]}_${m[2]}_${m[3]}_${m[4]}_${m[5]}`
  const index = m[6]
  const bgPart = parseSoBaoGiaForAttachmentFile(soBaoGia)
  const khPart = (maKhPathPart || 'kh_unknown').trim().toLowerCase()
  return `${bgPart}_${khPart}_${tgPart}_${index}${ext}`
}

/**
 * Trước khi lưu / khi đổi Mã BG hoặc mã KH: gán lại `name` (nếu đúng pattern) và `virtual_path` theo quy tắc hiện tại
 * (bao_gia / mã_kh / mã_bg / tên_file), tránh lệch khi user đính kèm trước rồi mới nhập KH/số đơn.
 */
export function chuanHoaDuongDanDinhKemBaoGia(
  items: BaoGiaAttachmentItem[],
  soBaoGia: string,
  maKhPathPart: string
): BaoGiaAttachmentItem[] {
  return items.map((a) => {
    const name = rebuildBgAttachmentStoredFileName(a.name, soBaoGia, maKhPathPart)
    return {
      ...a,
      name,
      virtual_path: buildBgAttachmentFullVirtualPath(soBaoGia, maKhPathPart, name),
    }
  })
}

/** Bỏ phần tên file, chỉ giữ đường dẫn thư mục (có / cuối). */
export function duongDanThuMucLuuTru(fullPath: string): string {
  const t = (fullPath || '').trim().replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '')
  if (!t) return ''
  const i = t.lastIndexOf('/')
  if (i < 0) return ''
  return `${t.slice(0, i)}/`
}

/** Đường dẫn hiển thị trong UI: chỉ tới thư mục; luôn tính theo Mã BG + phần KH hiện tại (không tin virtual_path cũ). */
export function duongDanHienThi(item: BaoGiaAttachmentItem, soBaoGia: string, maKhPathPart: string): string {
  const full = buildBgAttachmentFullVirtualPath(soBaoGia, maKhPathPart, item.name)
  const thuMuc = duongDanThuMucLuuTru(full)
  if (thuMuc) return thuMuc
  return `${buildBgAttachmentFolderVirtualPath(soBaoGia, maKhPathPart)}/`
}

function phanMoRongTheoMime(mime: string): string {
  if (mime === 'application/pdf') return '.pdf'
  if (mime.includes('wordprocessingml') || mime.includes('msword')) return '.docx'
  if (mime === 'image/png') return '.png'
  return '.jpg'
}

async function docFileThanhDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Đọc file lỗi'))
    r.readAsDataURL(file)
  })
}

/** Nén ảnh JPEG, giảm cạnh dài tối đa maxEdge; giảm quality lặp đến khi dung lượng hợp lý. */
async function nenAnhThanhJpeg(file: File, maxEdge = 1920): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale))
  const h = Math.max(1, Math.round(bmp.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bmp.close?.()
    throw new Error('Canvas không khả dụng')
  }
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close?.()
  let q = 0.9
  let blob: Blob | null = null
  for (let i = 0; i < 14; i++) {
    blob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), 'image/jpeg', q))
    if (!blob) break
    if (blob.size <= 700_000 || q <= 0.48) break
    q -= 0.05
  }
  if (!blob) {
    const b = await new Promise<Blob | null>((res) => canvas.toBlob((x) => res(x), 'image/jpeg', 0.82))
    if (!b) throw new Error('Nén ảnh thất bại')
    return b
  }
  return blob
}

function blobThanhDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(new Error('Đọc blob lỗi'))
    fr.readAsDataURL(blob)
  })
}

function laAnhDataUrl(data: string): boolean {
  return /^data:image\//i.test(data)
}

function laPdfDataUrl(data: string): boolean {
  return /^data:application\/pdf/i.test(data)
}

function loaiXemTruocTuData(data: string): 'image' | 'pdf' | 'other' {
  if (laAnhDataUrl(data)) return 'image'
  if (laPdfDataUrl(data)) return 'pdf'
  return 'other'
}

/** Ước lượng byte từ data URL (base64). */
export function uocLuongByteTuDataUrl(dataUrl: string): number {
  const i = dataUrl.indexOf(',')
  if (i < 0) return 0
  const b64 = dataUrl.slice(i + 1).replace(/\s/g, '')
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((b64.length * 3) / 4) - pad)
}

export function formatDungLuongHienThi(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatNgayGioLuu(iso?: string): string {
  if (!iso?.trim()) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`
}

export type BaoGiaDinhKemModalProps = {
  open: boolean
  onClose: () => void
  /** Neo panel ngay dưới nút Đính kèm trên toolbar */
  anchorRef: React.RefObject<HTMLElement | null>
  attachments: BaoGiaAttachmentItem[]
  onChange: (next: BaoGiaAttachmentItem[]) => void
  readOnly?: boolean
  soBaoGia: string
  /** `partMccForPath(ma_kh)` — thư mục + tên file (chỉ mã KH) */
  maKhPathPart: string
  ngayGiaoHang: Date | null
  /** Fallback thời gian trong tên file khi chưa chọn TG giao hàng */
  ngayBaoGia: Date | null
}

const THUMB_STRIP = 52
/** Chiều cao cố định hàng nút Xóa — luôn chiếm chỗ để hover không đẩy layout / chiều cao form. */
const THUMB_DELETE_ROW_H = 28
const BG_DINH_KEM_TOI_DA_TEP = 10
const BG_DINH_KEM_TOI_DA_BYTES = 5 * 1024 * 1024
const PANEL_Z = 1060
const VIEWER_Z = 12000

/** Đưa `alert` / `confirm` ra sau vài frame — tránh trình duyệt chặn khi vừa đóng hộp thoại chọn file. */
function deferUserDialog(fn: () => void) {
  try {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(fn, 80)
      })
    })
  } catch {
    window.setTimeout(fn, 80)
  }
}

export function BaoGiaDinhKemModal({
  open,
  onClose,
  anchorRef,
  attachments,
  onChange,
  readOnly,
  soBaoGia,
  maKhPathPart,
  ngayGiaoHang,
  ngayBaoGia,
}: BaoGiaDinhKemModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  /** Index file đang xem trong popup toàn màn (null = đóng). */
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  /** Thumbnail đang hover — nổi bật (không đổi kích thước ô) + hiện nút Xóa. */
  const [hoverStripIdx, setHoverStripIdx] = useState<number | null>(null)
  const [tienTrinh, setTienTrinh] = useState<{ phanTram: number; chu: string } | null>(null)
  const [canhBaoDinhKem, setCanhBaoDinhKem] = useState<string | null>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 440 })

  const baoLoiDinhKem = useCallback((msg: string) => {
    setCanhBaoDinhKem(msg)
    deferUserDialog(() => {
      window.alert(msg)
    })
  }, [])

  const xacNhanDefer = useCallback(
    (msg: string) =>
      new Promise<boolean>((resolve) => {
        deferUserDialog(() => resolve(window.confirm(msg)))
      }),
    []
  )

  const updatePos = useCallback(() => {
    const el = anchorRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const w = Math.min(560, Math.max(400, window.innerWidth - r.left - 12))
    const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8))
    const top = r.bottom + 4
    setPos({ top, left, width: w })
  }, [anchorRef])

  useLayoutEffect(() => {
    if (!open) return
    updatePos()
    const on = () => updatePos()
    window.addEventListener('scroll', on, true)
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on, true)
      window.removeEventListener('resize', on)
    }
  }, [open, updatePos, attachments.length])

  useEffect(() => {
    if (!open) {
      setViewerIndex(null)
      setCanhBaoDinhKem(null)
    }
  }, [open])

  useEffect(() => {
    if (viewerIndex != null && (viewerIndex < 0 || viewerIndex >= attachments.length)) {
      setViewerIndex(null)
    }
  }, [attachments.length, viewerIndex])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (viewerIndex != null) {
        if (e.key === 'Escape') {
          setViewerIndex(null)
          return
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          setViewerIndex((i) => (i != null && i > 0 ? i - 1 : i))
          return
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          setViewerIndex((i) => (i != null && i < attachments.length - 1 ? i + 1 : i))
          return
        }
        return
      }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, viewerIndex, attachments.length])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if ((t as Element).closest?.('[data-bg-dinh-kem-viewer]')) return
      if (anchorRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, onClose, anchorRef])

  const xuLyTepTuMang = useCallback(
    async (list: File[]) => {
      if (list.length === 0 || readOnly) return
      const slotConLai = BG_DINH_KEM_TOI_DA_TEP - attachments.length
      if (slotConLai <= 0) {
        baoLoiDinhKem('Đã đủ 10 file đính kèm. Xóa bớt file nếu cần thêm mới.')
        return
      }
      if (list.length > BG_DINH_KEM_TOI_DA_TEP) {
        baoLoiDinhKem(
          `Bạn đã chọn ${list.length} file — mỗi lần chỉ được chọn tối đa ${BG_DINH_KEM_TOI_DA_TEP} file.\n\nKhông xử lý hay tải file nào.`
        )
        return
      }

      const saiDinhDang: string[] = []
      const vuotDungLuong: string[] = []
      const hopLe: File[] = []
      for (const file of list) {
        if (!hopLeDinhDangFile(file)) saiDinhDang.push(file.name)
        else if (file.size >= BG_DINH_KEM_TOI_DA_BYTES)
          vuotDungLuong.push(`${file.name} (${formatDungLuongHienThi(file.size)})`)
        else hopLe.push(file)
      }
      if (saiDinhDang.length > 0 || vuotDungLuong.length > 0) {
        const phan: string[] = []
        if (saiDinhDang.length > 0) {
          phan.push(
            `Sai định dạng (chỉ .jpg, .png, .pdf, .docx) — sẽ bỏ qua, vẫn xử lý file hợp lệ:\n${saiDinhDang.map((n) => `• ${n}`).join('\n')}`
          )
        }
        if (vuotDungLuong.length > 0) {
          phan.push(
            `Dung lượng từ 5 MB trở lên — không được đính kèm (các file sau sẽ không được thêm):\n${vuotDungLuong.map((n) => `• ${n}`).join('\n')}`
          )
        }
        baoLoiDinhKem(phan.join('\n\n'))
      }

      if (hopLe.length === 0) {
        return
      }

      const layToiDa = Math.min(hopLe.length, slotConLai)
      const listXuLy = hopLe.slice(0, layToiDa)
      if (hopLe.length > slotConLai) {
        baoLoiDinhKem(
          `Đang có ${attachments.length}/10 file; chỉ còn ${slotConLai} ô trống.\n\nSẽ xử lý ${layToiDa} file hợp lệ đầu tiên; ${hopLe.length - layToiDa} file hợp lệ còn lại không được thêm.`
        )
      }

      const hangMoi: BaoGiaAttachmentItem[] = []
      for (let i = 0; i < listXuLy.length; i++) {
        const file = listXuLy[i]
        const chiSo = attachments.length + hangMoi.length + 1
        const tenGoc = buildBgAttachmentBaseName(soBaoGia, maKhPathPart, ngayGiaoHang, ngayBaoGia, chiSo)
        setTienTrinh({
          phanTram: Math.round((i / listXuLy.length) * 100),
          chu: `(${i + 1}/${listXuLy.length}) Đang xử lý: ${file.name}`,
        })
        try {
          const laAnh = file.type.startsWith('image/') || /\.(jpe?g|png)$/i.test(file.name)
          let dataUrl: string
          let tenLuu: string
          if (laAnh) {
            setTienTrinh({
              phanTram: Math.round(((i + 0.3) / listXuLy.length) * 100),
              chu: `Nén ảnh giữ độ nét: ${file.name}`,
            })
            const blob = await nenAnhThanhJpeg(file)
            dataUrl = await blobThanhDataUrl(blob)
            tenLuu = `${tenGoc}.jpg`
          } else {
            setTienTrinh({
              phanTram: Math.round(((i + 0.5) / listXuLy.length) * 100),
              chu: `Đọc file: ${file.name}`,
            })
            dataUrl = await docFileThanhDataUrl(file)
            const lower = file.name.toLowerCase()
            if (lower.endsWith('.pdf')) tenLuu = `${tenGoc}.pdf`
            else if (lower.endsWith('.docx')) tenLuu = `${tenGoc}.docx`
            else tenLuu = `${tenGoc}${phanMoRongTheoMime(file.type || '')}`
          }
          hangMoi.push({ name: tenLuu, data: dataUrl })
        } catch {
          setTienTrinh({ phanTram: 100, chu: `Lỗi xử lý: ${file.name}` })
        }
      }
      if (hangMoi.length === 0) {
        setTienTrinh({ phanTram: 100, chu: 'Hoàn tất' })
        setTimeout(() => setTienTrinh(null), 500)
        return
      }

      const n = hangMoi.length
      const msg =
        n === 1
          ? `Thêm 1 file đính kèm vào báo giá?\n\n${hangMoi[0].name}`
          : `Thêm ${n} file đính kèm vào báo giá?`
      if (!(await xacNhanDefer(msg))) {
        setTienTrinh(null)
        return
      }

      const now = new Date().toISOString()
      const withMeta: BaoGiaAttachmentItem[] = hangMoi.map((x) => ({
        ...x,
        saved_at: now,
        virtual_path: buildBgAttachmentFullVirtualPath(soBaoGia, maKhPathPart, x.name),
      }))
      onChange([...attachments, ...withMeta])
      setTienTrinh({ phanTram: 100, chu: 'Đã thêm vào báo giá' })
      setTimeout(() => setTienTrinh(null), 600)
    },
    [attachments, onChange, readOnly, soBaoGia, maKhPathPart, ngayGiaoHang, ngayBaoGia, baoLoiDinhKem, xacNhanDefer]
  )

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const el = e.target
      const snapshot = el.files?.length ? Array.from(el.files) : []
      el.value = ''
      if (readOnly || snapshot.length === 0) return
      deferUserDialog(() => {
        setCanhBaoDinhKem(null)
        void xuLyTepTuMang(snapshot).catch(() => {
          baoLoiDinhKem('Có lỗi khi xử lý file đính kèm. Vui lòng thử lại.')
        })
      })
    },
    [readOnly, xuLyTepTuMang, baoLoiDinhKem]
  )

  const moXemTruocTai = (idx: number) => {
    if (idx < 0 || idx >= attachments.length) return
    setViewerIndex(idx)
  }

  const dongViewer = () => setViewerIndex(null)

  const viewerItem = viewerIndex != null ? attachments[viewerIndex] : null
  const viewerKind = viewerItem ? loaiXemTruocTuData(viewerItem.data) : null

  const xoaTai = (idx: number) => {
    if (readOnly) return
    onChange(attachments.filter((_, j) => j !== idx))
    setViewerIndex((vi) => {
      if (vi == null) return null
      if (vi === idx) return null
      if (vi > idx) return vi - 1
      return vi
    })
  }

  const nutPhu: React.CSSProperties = {
    padding: '5px 10px',
    fontSize: 11,
    borderRadius: 4,
    border: '1px solid var(--border-strong)',
    background: '#FFFFFF',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    fontFamily: 'var(--font-misa), Tahoma, Arial, sans-serif',
  }

  const panel = open ? (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Đính kèm chứng từ"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        maxHeight: 'min(420px, 50vh)',
        zIndex: PANEL_Z,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-strong)',
        borderRadius: 4,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '8px 10px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          gap: '4px 10px',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>Đính kèm chứng từ</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, lineHeight: 1.35, flex: '1 1 200px', minWidth: 0 }}>
          Đính kèm tối đa 10 file, các file .jpg, .png, .pdf, .docx — mỗi file phải nhỏ hơn 5 MB
        </span>
      </div>
      <div style={{ padding: '8px 10px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
        {!readOnly && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              marginBottom: 8,
              flexWrap: 'wrap',
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT_ATTR}
              multiple
              style={{ display: 'none' }}
              onChange={onFileInputChange}
            />
            <button
              type="button"
              disabled={attachments.length >= BG_DINH_KEM_TOI_DA_TEP}
              title={attachments.length >= BG_DINH_KEM_TOI_DA_TEP ? 'Đã đủ 10 file đính kèm' : undefined}
              style={{
                ...nutPhu,
                flexShrink: 0,
                background: attachments.length >= BG_DINH_KEM_TOI_DA_TEP ? 'var(--border)' : 'var(--accent)',
                color: attachments.length >= BG_DINH_KEM_TOI_DA_TEP ? 'var(--text-muted)' : 'var(--accent-text)',
                borderColor: attachments.length >= BG_DINH_KEM_TOI_DA_TEP ? 'var(--border-strong)' : 'var(--accent)',
                boxShadow:
                  attachments.length >= BG_DINH_KEM_TOI_DA_TEP ? 'none' : '0 1px 3px rgba(230, 126, 34, 0.35)',
                cursor: attachments.length >= BG_DINH_KEM_TOI_DA_TEP ? 'not-allowed' : 'pointer',
              }}
              onClick={() => {
                if (attachments.length >= BG_DINH_KEM_TOI_DA_TEP) return
                inputRef.current?.click()
              }}
            >
              Thêm file…
            </button>
            <div style={{ flex: '1 1 140px', minWidth: 100, minHeight: tienTrinh ? 22 : 0 }}>
              {tienTrinh ? (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      marginBottom: 4,
                      gap: 8,
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{tienTrinh.chu}</span>
                    <span style={{ flexShrink: 0 }}>{tienTrinh.phanTram}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${tienTrinh.phanTram}%`,
                        background: 'var(--accent)',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
        {attachments.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>Chưa có file đính kèm.</div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
              overflowX: 'hidden',
              overflowY: 'visible',
              padding: '8px 6px 10px',
              alignItems: 'flex-start',
              flexShrink: 0,
            }}
          >
            {attachments.map((item, idx) => {
              const isHover = hoverStripIdx === idx
              const isViewer = viewerIndex === idx
              const anDiemKhac = hoverStripIdx !== null && hoverStripIdx !== idx
              const nhanManh = isHover || isViewer
              return (
                <div
                  key={`strip-${item.name}-${idx}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    flex: '0 0 auto',
                    position: 'relative',
                    zIndex: isHover ? 3 : 1,
                  }}
                  onMouseEnter={() => setHoverStripIdx(idx)}
                  onMouseLeave={() => setHoverStripIdx((h) => (h === idx ? null : h))}
                >
                  <button
                    type="button"
                    title={item.name}
                    onClick={() => moXemTruocTai(idx)}
                    style={{
                      width: THUMB_STRIP,
                      height: THUMB_STRIP,
                      padding: 0,
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      background: 'var(--bg-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      flexShrink: 0,
                      opacity: anDiemKhac ? 0.62 : 1,
                      transition: 'opacity 0.15s ease, box-shadow 0.15s ease',
                      boxShadow: nhanManh
                        ? '0 0 0 2px var(--accent), 0 4px 14px rgba(0,0,0,0.14)'
                        : 'none',
                    }}
                  >
                    {laAnhDataUrl(item.data) ? (
                      <img src={item.data} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : laPdfDataUrl(item.data) ? (
                      <FileText size={24} style={{ color: 'var(--accent)' }} />
                    ) : (
                      <FileText size={24} style={{ color: '#2b579a' }} />
                    )}
                  </button>
                  {!readOnly ? (
                    <div
                      style={{
                        height: THUMB_DELETE_ROW_H,
                        minHeight: THUMB_DELETE_ROW_H,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        width: '100%',
                      }}
                    >
                      <button
                        type="button"
                        tabIndex={isHover ? 0 : -1}
                        aria-hidden={!isHover}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (!isHover) return
                          xoaTai(idx)
                        }}
                        style={{
                          ...nutPhu,
                          fontSize: 10,
                          padding: '3px 10px',
                          color: 'var(--accent)',
                          borderColor: 'var(--accent)',
                          fontWeight: 600,
                          visibility: isHover ? 'visible' : 'hidden',
                          pointerEvents: isHover ? 'auto' : 'none',
                        }}
                      >
                        Xóa
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
        {canhBaoDinhKem ? (
          <div
            role="alert"
            style={{
              marginTop: 10,
              padding: '8px 10px',
              fontSize: 11,
              lineHeight: 1.4,
              color: 'var(--text-primary)',
              background: 'rgba(220, 53, 69, 0.1)',
              border: '1px solid var(--border-strong)',
              borderRadius: 4,
              whiteSpace: 'pre-wrap',
            }}
          >
            {canhBaoDinhKem}
          </div>
        ) : null}
      </div>
    </div>
  ) : null

  const nutVong: React.CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.35)',
    background: 'rgba(0,0,0,0.45)',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }

  const viewerOverlay =
    viewerItem != null && viewerKind != null ? (
      <div
        data-bg-dinh-kem-viewer
        role="dialog"
        aria-modal
        aria-label="Xem trước file đính kèm"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: VIEWER_Z,
          background: 'rgba(0,0,0,0.93)',
          display: 'flex',
          flexDirection: 'column',
          padding: 12,
        }}
        onClick={dongViewer}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <span style={{ fontSize: 12, color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0, paddingRight: 8 }}>
            {viewerItem.name}
            <span style={{ fontWeight: 400, opacity: 0.85, marginLeft: 8 }}>
              ({viewerIndex! + 1} / {attachments.length})
            </span>
          </span>
          <button type="button" style={{ ...nutPhu, background: '#333', color: '#fff', borderColor: '#555' }} onClick={dongViewer}>
            Đóng
          </button>
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="File trước"
            disabled={viewerIndex === 0}
            style={{
              ...nutVong,
              opacity: viewerIndex === 0 ? 0.35 : 1,
              cursor: viewerIndex === 0 ? 'not-allowed' : 'pointer',
            }}
            onClick={() => viewerIndex != null && viewerIndex > 0 && setViewerIndex(viewerIndex - 1)}
          >
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>
          <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            {viewerKind === 'image' && (
              <img src={viewerItem.data} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            )}
            {viewerKind === 'pdf' && (
              <iframe title="PDF" src={viewerItem.data} style={{ width: '100%', height: '100%', minHeight: 400, border: 'none', background: '#fff' }} />
            )}
            {viewerKind === 'other' && (
              <div style={{ color: '#ccc', fontSize: 12, textAlign: 'center', padding: 24 }}>
                <FileText size={48} style={{ marginBottom: 8, opacity: 0.7 }} />
                <p>Không xem trước DOCX trực tiếp. File đã lưu trong dữ liệu báo giá.</p>
              </div>
            )}
          </div>
          <button
            type="button"
            aria-label="File sau"
            disabled={viewerIndex != null && viewerIndex >= attachments.length - 1}
            style={{
              ...nutVong,
              opacity: viewerIndex != null && viewerIndex >= attachments.length - 1 ? 0.35 : 1,
              cursor: viewerIndex != null && viewerIndex >= attachments.length - 1 ? 'not-allowed' : 'pointer',
            }}
            onClick={() => viewerIndex != null && viewerIndex < attachments.length - 1 && setViewerIndex(viewerIndex + 1)}
          >
            <ChevronRight size={28} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    ) : null

  return (
    <>
      {panel != null ? createPortal(panel, document.body) : null}
      {viewerOverlay != null ? createPortal(viewerOverlay, document.body) : null}
    </>
  )
}
