import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FileText, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import type { BaoGiaAttachmentItem } from '../../../../types/baoGia'
import { htqlFileDownloadUrl, htqlCanUploadToServer, htqlUploadFileToServer } from '../../../../utils/htqlServerFileUpload'
import {
  parseSoBaoGiaForAttachmentFile,
  partMccForPath,
  formatTgGiaoForAttachmentFile,
  buildDktkAttachmentBaseName,
  buildDktkFolderVirtualPath,
  buildDktkFullVirtualPath,
  rebuildDktkAttachmentStoredFileName,
  chuanHoaDuongDanDinhKemBaoGia as chuanHoaDuongDanDinhKemBaoGiaTuUtil,
} from '../../../../utils/htqlThietKeDktkNaming'

/** Đính kèm thiết kế (dktk): AI, EPS, SVG, PDF, Corel (CDR), PSD, ảnh, TIFF */
const ACCEPT_ATTR = '.ai,.eps,.svg,.pdf,.cdr,.psd,.jpg,.jpeg,.png,.tif,.tiff'

function hopLeDinhDangFile(file: File): boolean {
  const n = file.name.toLowerCase()
  return /\.(ai|eps|svg|pdf|cdr|psd|jpe?g|png|tiff?)$/i.test(n)
}

export {
  parseSoBaoGiaForAttachmentFile,
  partMccForPath,
  formatTgGiaoForAttachmentFile,
}

/**
 * Tên file: mã BG + TG tạo báo giá (ưu tiên) + chỉ số — không còn segment mã KH trong tên.
 * `maKhPathPart` giữ trong chữ ký để tương thích gọi cũ (bỏ qua).
 */
export function buildBgAttachmentBaseName(
  soDon: string,
  _maKhPathPart: string,
  ngayGiao: Date | null,
  ngayBaoGia: Date | null,
  index: number
): string {
  const doc = parseSoBaoGiaForAttachmentFile(soDon)
  return buildDktkAttachmentBaseName(doc, ngayBaoGia, ngayGiao, index)
}

/** Đường dẫn logic dưới gốc thiết kế trên SSD: mã_kh hoặc `_pending_dktk` / mã_bg */
export function buildBgAttachmentFolderVirtualPath(soBaoGia: string, maKhPathPart: string): string {
  return buildDktkFolderVirtualPath(parseSoBaoGiaForAttachmentFile(soBaoGia), maKhPathPart)
}

export function buildBgAttachmentFullVirtualPath(soBaoGia: string, maKhPathPart: string, fileName: string): string {
  return buildDktkFullVirtualPath(parseSoBaoGiaForAttachmentFile(soBaoGia), maKhPathPart, fileName)
}

/** `maKhPathPart` giữ cho tương thích gọi cũ (bỏ qua). */
export function rebuildBgAttachmentStoredFileName(
  currentName: string,
  soBaoGia: string,
  _maKhPathPart: string
): string {
  return rebuildDktkAttachmentStoredFileName(currentName, parseSoBaoGiaForAttachmentFile, soBaoGia)
}

export function chuanHoaDuongDanDinhKemBaoGia(
  items: BaoGiaAttachmentItem[],
  soBaoGia: string,
  maKhPathPart: string
): BaoGiaAttachmentItem[] {
  return chuanHoaDuongDanDinhKemBaoGiaTuUtil(items, soBaoGia, maKhPathPart)
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

function phanMoRongTheoTen(ten: string): string {
  const n = ten.toLowerCase()
  const m = n.match(/(\.[^./\\]+)$/)
  return m ? m[1] : ''
}

function phanMoRongTheoMime(mime: string, tenGoc: string): string {
  const t = phanMoRongTheoTen(tenGoc)
  if (t) return t
  if (mime === 'application/pdf') return '.pdf'
  if (mime === 'image/svg+xml') return '.svg'
  if (mime === 'image/png') return '.png'
  if (mime === 'image/tiff') return '.tiff'
  return '.jpg'
}

async function docFileThanhDataUrl(
  file: File,
  onProgress?: (loaded: number, total: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0 && onProgress) onProgress(ev.loaded, ev.total)
    }
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

function laSvgDataUrl(data: string): boolean {
  return /^data:image\/svg\+xml/i.test(data) || /^data:text\/xml.*svg/i.test(data)
}

function laTiffTheoTenTep(ten: string): boolean {
  return /\.(tiff?)$/i.test(ten)
}

/** Icon/badge theo đuôi — TIFF, CDR, AI… không xem thumbnail ảnh được (dinhkem.mdc). */
function DinhKemBadgeExt({ label, bg, color = '#fff' }: { label: string; bg: string; color?: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: '4px 6px',
        borderRadius: 4,
        background: bg,
        color,
        lineHeight: 1,
        letterSpacing: 0.35,
        fontFamily: 'var(--font-misa), Tahoma, Arial, sans-serif',
        userSelect: 'none',
      }}
    >
      {label}
    </span>
  )
}

function iconDinhKemTheoTenTep(tenFile: string): React.ReactNode {
  const m = tenFile.match(/(\.[^./\\]+)$/i)
  const ext = (m?.[1] ?? '').toLowerCase()
  if (ext === '.cdr') return <DinhKemBadgeExt label="CDR" bg="#1e7b34" />
  if (ext === '.ai') return <DinhKemBadgeExt label="AI" bg="#ff7f00" />
  if (ext === '.eps') return <DinhKemBadgeExt label="EPS" bg="#8b5a2b" />
  if (ext === '.psd') return <DinhKemBadgeExt label="PSD" bg="#001d26" color="#31a8ff" />
  if (ext === '.tif' || ext === '.tiff') return <DinhKemBadgeExt label="TIF" bg="#1a5f7a" />
  if (ext === '.svg') return <DinhKemBadgeExt label="SVG" bg="#7c3aed" />
  const short = ext.replace(/^\./, '').toUpperCase().slice(0, 5) || 'FILE'
  return <DinhKemBadgeExt label={short} bg="#475569" />
}

function loaiXemTruocTuData(data: string, tenFile = ''): 'image' | 'pdf' | 'svg' | 'other' {
  if (laTiffTheoTenTep(tenFile)) return 'other'
  if (data && data.length > 0) {
    if (laPdfDataUrl(data)) return 'pdf'
    if (laSvgDataUrl(data)) return 'svg'
    if (laAnhDataUrl(data)) return 'image'
  }
  const n = (tenFile || '').toLowerCase()
  if (/\.pdf$/i.test(n)) return 'pdf'
  if (/\.(jpe?g|png)$/i.test(n)) return 'image'
  if (/\.svg$/i.test(n)) return 'svg'
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
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`
  const mib = 1024 * 1024
  const gib = 1024 ** 3
  const tib = 1024 ** 4
  /** Từ ~1000 MB trở lên dùng GB/TB cho gọn (tránh số MB quá dài). */
  if (bytes >= 1000 * mib) {
    if (bytes >= tib) return `${(bytes / tib).toFixed(2)} TB`
    return `${(bytes / gib).toFixed(2)} GB`
  }
  if (bytes < gib) return `${(bytes / mib).toFixed(bytes < 10 * mib ? 1 : 0)} MB`
  if (bytes < tib) return `${(bytes / gib).toFixed(2)} GB`
  return `${(bytes / tib).toFixed(2)} TB`
}

/** Ảnh thumbnail trực tiếp từ data URL — file quá lớn gây lag DOM / ảnh trắng; dùng icon. */
const NGUONG_BYTE_HIEN_THI_ANH_THUMB = 800_000

/** Thumbnail ảnh trong danh sách — lỗi giải mã / file lớn → icon. */
function DinhKemThumbAnh({
  src,
  alt,
  tenTepFallback,
}: {
  src: string
  alt: string
  tenTepFallback?: string
}) {
  const [loi, setLoi] = useState(false)
  if (loi) {
    return tenTepFallback ? iconDinhKemTheoTenTep(tenTepFallback) : <FileText size={24} style={{ color: 'var(--accent)' }} />
  }
  return (
    <img
      loading="lazy"
      decoding="async"
      src={src}
      alt={alt}
      onError={() => setLoi(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  )
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

export type BaoGiaDinhKemPendingRow = {
  id: string
  ten: string
  sizeBytes: number
  phanTram: number
  chu: string
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
  /** Đã lưu báo giá xuống CSDL (hoặc mở từ bản ghi đã lưu, chưa sửa đính kèm). `false` = chỉ trên form, chưa Lưu. */
  daDongBoLuuCsdl?: boolean
  /**
   * Tiến trình đọc file (upload vào bộ nhớ) — nên giữ state ở form cha để khi đóng popover vẫn hiện trên nút Đính kèm.
   * Nếu không truyền, modal dùng state nội bộ (chỉ hiện khi popover mở).
   */
  pendingUploadRows?: BaoGiaDinhKemPendingRow[]
  onPendingUploadRowsChange?: React.Dispatch<React.SetStateAction<BaoGiaDinhKemPendingRow[]>>
}

const THUMB_STRIP = 52
const BG_DINH_KEM_TOI_DA_TEP = 10
/** Đính kèm thiết kế (dktk): tối đa 2000 MB / file */
const BG_DINH_KEM_TOI_DA_BYTES = 2000 * 1024 * 1024
/** Trên overlay modal HTQL (z-index 4000) — popover đính kèm phải cao hơn (htql550.mdc). */
const PANEL_Z = 4100
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
  daDongBoLuuCsdl = true,
  pendingUploadRows: pendingUploadRowsProp,
  onPendingUploadRowsChange,
}: BaoGiaDinhKemModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  /** Index file đang xem trong popup toàn màn (null = đóng). */
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const viewerItem = viewerIndex != null ? attachments[viewerIndex] ?? null : null
  const [viewerResolvedSrc, setViewerResolvedSrc] = useState<string | null>(null)
  const [viewerMediaReady, setViewerMediaReady] = useState(false)
  /** Dòng danh sách đang hover — viền nhẹ (không đổi kích thước ô thumbnail). */
  const [hoverRowIdx, setHoverRowIdx] = useState<number | null>(null)
  /** Tiến trình từng file đang đọc (trước khi confirm thêm vào báo giá) — fallback khi form không truyền state cha. */
  const [pendingTienTrinhLocal, setPendingTienTrinhLocal] = useState<BaoGiaDinhKemPendingRow[]>([])
  const pendingTienTrinh = pendingUploadRowsProp ?? pendingTienTrinhLocal
  const setPendingTienTrinh = onPendingUploadRowsChange ?? setPendingTienTrinhLocal
  const [canhBaoDinhKem, setCanhBaoDinhKem] = useState<string | null>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 520 })

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
    const margin = 8
    /** Neo sát nút Đính kèm (liền mạch): cạnh trái = nút, khe dọc 1px. */
    const left = Math.max(margin, r.left)
    const maxW = Math.min(640, window.innerWidth - margin - left)
    const w = Math.max(320, Math.min(520, Math.max(420, maxW)))
    const top = r.bottom + 1
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
      /** Không xóa pending upload — tiếp tục hiển thị trên nút Đính kèm / khi mở lại popover. */
    }
  }, [open])

  useEffect(() => {
    if (viewerIndex != null && (viewerIndex < 0 || viewerIndex >= attachments.length)) {
      setViewerIndex(null)
    }
  }, [attachments.length, viewerIndex])

  useEffect(() => {
    setViewerMediaReady(false)
  }, [viewerIndex])

  useEffect(() => {
    if (!viewerItem?.server_relative_path || !viewerItem?.server_kind || viewerItem.data) {
      setViewerResolvedSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      return
    }
    let cancelled = false
    const url = htqlFileDownloadUrl(viewerItem.server_kind, viewerItem.server_relative_path)
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.blob()
      })
      .then((blob) => {
        if (cancelled) return
        const u = URL.createObjectURL(blob)
        setViewerResolvedSrc((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return u
        })
      })
      .catch(() => {
        if (!cancelled) {
          setViewerResolvedSrc((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return null
          })
        }
      })
    return () => {
      cancelled = true
      setViewerResolvedSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [viewerItem?.data, viewerItem?.server_relative_path, viewerItem?.server_kind])

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
            `Sai định dạng (chỉ file thiết kế: .ai, .eps, .svg, .pdf, .cdr, .psd, .jpg, .png, .tif/.tiff) — sẽ bỏ qua, vẫn xử lý file hợp lệ:\n${saiDinhDang.map((n) => `• ${n}`).join('\n')}`
          )
        }
        if (vuotDungLuong.length > 0) {
          phan.push(
            `Dung lượng từ 2000 MB trở lên — không được đính kèm (các file sau sẽ không được thêm):\n${vuotDungLuong.map((n) => `• ${n}`).join('\n')}`
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

      const pendingIds = listXuLy.map((f, j) => `pending-${j}-${f.name}-${f.size}`)
      setPendingTienTrinh(
        listXuLy.map((f, j) => ({
          id: pendingIds[j]!,
          ten: f.name,
          sizeBytes: f.size,
          phanTram: 0,
          chu: 'Đang chờ…',
        }))
      )

      const hangMoi: BaoGiaAttachmentItem[] = []
      const capNhatPending = (j: number, phanTram: number, chu: string) => {
        setPendingTienTrinh((prev) =>
          prev.map((row) => (row.id === pendingIds[j] ? { ...row, phanTram, chu } : row))
        )
      }

      const relUploadDir = buildBgAttachmentFolderVirtualPath(soBaoGia, maKhPathPart)
      const coApi = htqlCanUploadToServer()

      for (let i = 0; i < listXuLy.length; i++) {
        const file = listXuLy[i]
        const chiSo = attachments.length + hangMoi.length + 1
        const tenGoc = buildBgAttachmentBaseName(soBaoGia, maKhPathPart, ngayGiaoHang, ngayBaoGia, chiSo)
        capNhatPending(i, 2, 'Đang xử lý…')
        try {
          const laAnhNen = /\.(jpe?g|png)$/i.test(file.name) || /^image\/(jpeg|png)$/i.test(file.type || '')
          if (laAnhNen) {
            capNhatPending(i, 15, 'Đang nén ảnh…')
            const blob = await nenAnhThanhJpeg(file)
            const tenLuu = `${tenGoc}.jpg`
            const sizeByte = blob.size
            const fileJpg = new File([blob], tenLuu, { type: 'image/jpeg' })
            if (coApi) {
              capNhatPending(i, 40, 'Đang tải lên máy chủ…')
              try {
                const up = await htqlUploadFileToServer(fileJpg, {
                  kind: 'thiet_ke',
                  relativeDir: relUploadDir,
                  filename: tenLuu,
                })
                hangMoi.push({
                  name: tenLuu,
                  data: '',
                  kich_thuoc_byte: up.size,
                  server_kind: 'thiet_ke',
                  server_relative_path: up.relativePath,
                })
                capNhatPending(i, 100, 'Đã lưu trên máy chủ')
                continue
              } catch {
                capNhatPending(i, 60, 'Máy chủ lỗi — lưu cục bộ…')
              }
            }
            capNhatPending(i, 85, 'Đang đọc sau nén…')
            const dataUrl = await blobThanhDataUrl(blob)
            hangMoi.push({ name: tenLuu, data: dataUrl, kich_thuoc_byte: sizeByte })
          } else {
            capNhatPending(i, 5, 'Đang đọc file…')
            const ext = phanMoRongTheoMime(file.type || '', file.name)
            const tenLuu = `${tenGoc}${ext}`
            const sizeByte = file.size
            if (coApi) {
              capNhatPending(i, 25, 'Đang tải lên máy chủ…')
              try {
                const up = await htqlUploadFileToServer(file, {
                  kind: 'thiet_ke',
                  relativeDir: relUploadDir,
                  filename: tenLuu,
                })
                hangMoi.push({
                  name: tenLuu,
                  data: '',
                  kich_thuoc_byte: up.size,
                  server_kind: 'thiet_ke',
                  server_relative_path: up.relativePath,
                })
                capNhatPending(i, 100, 'Đã lưu trên máy chủ')
                continue
              } catch {
                capNhatPending(i, 40, 'Máy chủ lỗi — lưu cục bộ…')
              }
            }
            const dataUrl = await docFileThanhDataUrl(file, (loaded, total) => {
              const sub = total > 0 ? loaded / total : 0
              capNhatPending(i, Math.min(99, Math.round(5 + sub * 94)), `Đang tải ${Math.round(sub * 100)}%`)
            })
            hangMoi.push({ name: tenLuu, data: dataUrl, kich_thuoc_byte: sizeByte })
          }
          capNhatPending(i, 100, 'Đã đọc xong')
        } catch {
          capNhatPending(i, 0, 'Lỗi xử lý')
        }
      }
      setPendingTienTrinh([])
      if (hangMoi.length === 0) {
        return
      }

      const n = hangMoi.length
      const msg =
        n === 1
          ? `Thêm 1 file đính kèm vào báo giá?\n\n${hangMoi[0].name}`
          : `Thêm ${n} file đính kèm vào báo giá?`
      if (!(await xacNhanDefer(msg))) {
        return
      }

      const now = new Date().toISOString()
      const withMeta: BaoGiaAttachmentItem[] = hangMoi.map((x) => ({
        ...x,
        saved_at: now,
        virtual_path: buildBgAttachmentFullVirtualPath(soBaoGia, maKhPathPart, x.name),
      }))
      onChange([...attachments, ...withMeta])
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

  const viewerKind = viewerItem ? loaiXemTruocTuData(viewerItem.data, viewerItem.name) : null
  const viewerSrc = viewerResolvedSrc || viewerItem?.data || ''

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
      aria-label="Đính kèm thiết kế"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        maxHeight: 'min(560px, 62vh)',
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
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>Đính kèm thiết kế (dktk)</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, lineHeight: 1.35, flex: '1 1 200px', minWidth: 0 }}>
          Tối đa 10 file — .ai, .eps, .svg, .pdf, .cdr, .psd, .jpg, .png, .tif — mỗi file nhỏ hơn 2000 MB
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
          </div>
        )}
        {pendingTienTrinh.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            {pendingTienTrinh.map((row) => (
              <div
                key={row.id}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 8px',
                  borderRadius: 4,
                  border: '1px dashed var(--accent)',
                  background: 'rgba(230, 126, 34, 0.06)',
                }}
              >
                <div style={{ width: THUMB_STRIP, height: THUMB_STRIP, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={22} style={{ color: 'var(--accent)', opacity: 0.85 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.ten}>
                    {row.ten}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Dung lượng: {formatDungLuongHienThi(row.sizeBytes)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{row.chu}</div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden', marginTop: 6 }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${row.phanTram}%`,
                        background: 'var(--accent)',
                        transition: 'width 0.12s ease-out',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {attachments.length === 0 && pendingTienTrinh.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>Chưa có file đính kèm.</div>
        ) : attachments.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: '4px 0 8px',
              overflowX: 'hidden',
            }}
          >
            {attachments.map((item, idx) => {
              const isHover = hoverRowIdx === idx
              const isViewer = viewerIndex === idx
              const nhanManh = isHover || isViewer
              const bytesRaw = item.kich_thuoc_byte ?? uocLuongByteTuDataUrl(item.data)
              const bytes = Number.isFinite(bytesRaw) && bytesRaw > 0 ? bytesRaw : uocLuongByteTuDataUrl(item.data)
              const duongDan = duongDanHienThi(item, soBaoGia, maKhPathPart)
              const chiIconTheoDuoi = /\.(tiff?|cdr|ai|eps|psd)$/i.test(item.name)
              const anhNhoDuoc =
                !chiIconTheoDuoi &&
                (laAnhDataUrl(item.data) || laSvgDataUrl(item.data)) &&
                bytes < NGUONG_BYTE_HIEN_THI_ANH_THUMB
              const trangThaiLuu = daDongBoLuuCsdl
                ? 'Đã lưu trong dữ liệu báo giá'
                : 'Sẵn sàng lưu vào dữ liệu báo giá — bấm Lưu trên form'
              return (
                <div
                  key={`row-${item.name}-${idx}`}
                  role="listitem"
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'stretch',
                    gap: 10,
                    padding: '6px 8px',
                    borderRadius: 4,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                    boxShadow: nhanManh ? '0 0 0 1px var(--accent)' : 'none',
                    transition: 'box-shadow 0.15s ease',
                  }}
                  onMouseEnter={() => setHoverRowIdx(idx)}
                  onMouseLeave={() => setHoverRowIdx((h) => (h === idx ? null : h))}
                >
                  <button
                    type="button"
                    title={item.name}
                    onClick={() => moXemTruocTai(idx)}
                    style={{
                      width: THUMB_STRIP,
                      height: THUMB_STRIP,
                      minWidth: THUMB_STRIP,
                      minHeight: THUMB_STRIP,
                      padding: 0,
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      background: 'var(--bg-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      flexShrink: 0,
                    }}
                  >
                    {anhNhoDuoc && laAnhDataUrl(item.data) ? (
                      <DinhKemThumbAnh src={item.data} alt="" tenTepFallback={item.name} />
                    ) : anhNhoDuoc && laSvgDataUrl(item.data) ? (
                      <img loading="lazy" decoding="async" src={item.data} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : laPdfDataUrl(item.data) ? (
                      <FileText size={24} style={{ color: '#b91c1c' }} />
                    ) : (
                      iconDinhKemTheoTenTep(item.name)
                    )}
                  </button>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={item.name}
                    >
                      {item.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                      Dung lượng: {formatDungLuongHienThi(bytes)}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        marginTop: 2,
                        wordBreak: 'break-all',
                        lineHeight: 1.35,
                      }}
                      title={duongDan}
                    >
                      Thư mục: {duongDan}
                    </div>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>{trangThaiLuu}</span>
                  </div>
                  {!readOnly ? (
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          xoaTai(idx)
                        }}
                        style={{
                          ...nutPhu,
                          fontSize: 10,
                          padding: '6px 12px',
                          color: 'var(--accent)',
                          borderColor: 'var(--accent)',
                          fontWeight: 600,
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
        ) : null}
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
          <div
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              position: 'relative',
            }}
          >
            {viewerKind === 'image' && (
              <>
                {!viewerMediaReady && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      color: '#eee',
                      fontSize: 12,
                    }}
                  >
                    <Loader2 size={36} className="htql-spin" />
                    Đang giải mã ảnh…
                  </div>
                )}
                <img
                  src={viewerSrc}
                  alt=""
                  decoding="async"
                  onLoad={() => setViewerMediaReady(true)}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    opacity: viewerMediaReady ? 1 : 0,
                    transition: 'opacity 0.15s ease',
                  }}
                />
              </>
            )}
            {viewerKind === 'svg' && (
              <>
                {!viewerMediaReady && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#eee',
                    }}
                  >
                    <Loader2 size={32} className="htql-spin" />
                  </div>
                )}
                <img
                  src={viewerSrc}
                  alt=""
                  decoding="async"
                  onLoad={() => setViewerMediaReady(true)}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    opacity: viewerMediaReady ? 1 : 0,
                  }}
                />
              </>
            )}
            {viewerKind === 'pdf' && (
              <iframe
                title="PDF"
                src={viewerSrc}
                onLoad={() => setViewerMediaReady(true)}
                style={{ width: '100%', height: '100%', minHeight: 400, border: 'none', background: '#fff' }}
              />
            )}
            {viewerKind === 'other' && (
              <div
                style={{
                  color: '#ccc',
                  fontSize: 12,
                  textAlign: 'center',
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <div style={{ transform: 'scale(1.35)', display: 'flex', justifyContent: 'center' }}>{iconDinhKemTheoTenTep(viewerItem.name)}</div>
                <p style={{ margin: 0, maxWidth: 440, lineHeight: 1.5 }}>
                  Không xem trước trực tiếp. File đã lưu trong dữ liệu báo giá — mở bằng ứng dụng phù hợp theo loại tệp.
                </p>
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
