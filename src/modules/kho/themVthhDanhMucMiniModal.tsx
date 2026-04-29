import { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal } from '../../components/common/modal'
import {
  formFooterButtonCancel,
  formFooterButtonSave,
  formFooterButtonSaveAndAdd,
} from '../../constants/formFooterButtons'
import { useToastOptional } from '../../context/toastContext'
import { htqlApiUrl } from '../../config/htqlApiBase'
import {
  STORAGE_KEY_VTHH_DINH_LUONG_CUSTOM,
  STORAGE_KEY_VTHH_HE_MAU_CUSTOM,
  STORAGE_KEY_VTHH_KHO_GIAY_CUSTOM,
  dispatchVthhLoaiNhomChanged,
  readVthhDinhLuongCustomFromStorage,
  readVthhHeMauCustomFromStorage,
  readVthhKhoGiayCustomFromStorage,
} from './vthhLoaiNhomSync'
import { formatSoTien, isZeroDisplay, normalizeKichThuocInput, parseDecimalFlex } from '../../utils/numberFormat'

export type ThemVthhDanhMucMode = 'dinh-luong' | 'kho-giay' | 'he-mau'

interface Props {
  mode: ThemVthhDanhMucMode
  onClose: () => void
  onSaved: () => void
}

function parseNonNegativeMeter(raw: string): number | null {
  const cleaned = String(raw ?? '').trim()
  if (!cleaned) return null
  const n = parseDecimalFlex(cleaned)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function titleByMode(mode: ThemVthhDanhMucMode): string {
  if (mode === 'dinh-luong') return 'Độ dày/ Kích thước'
  if (mode === 'kho-giay') return 'Khổ giấy'
  return 'Hệ màu'
}

export function ThemVthhDanhMucMiniModal({ mode, onClose, onSaved }: Props) {
  const toast = useToastOptional()
  const title = titleByMode(mode)
  const [pendingMa, setPendingMa] = useState('')
  const [pendingTen, setPendingTen] = useState('')
  const [pendingChieuRongM, setPendingChieuRongM] = useState('')
  const [pendingChieuDaiM, setPendingChieuDaiM] = useState('')
  const [pendingDienGiai, setPendingDienGiai] = useState('')
  const [pendingHeMauIn, setPendingHeMauIn] = useState(true)
  const [pendingHeMauVatTu, setPendingHeMauVatTu] = useState(false)
  const [napKichThuocDangTai, setNapKichThuocDangTai] = useState(false)

  const [storageRev, setStorageRev] = useState(0)

  const customValues = useMemo(() => {
    if (mode === 'dinh-luong') return readVthhDinhLuongCustomFromStorage()
    if (mode === 'kho-giay') return readVthhKhoGiayCustomFromStorage()
    return readVthhHeMauCustomFromStorage()
  }, [mode, storageRev])

  const nextSttMa = useMemo(() => {
    const nums = customValues.map((r) => Number.parseInt(String(r.ma).trim(), 10)).filter((n) => Number.isFinite(n) && n > 0)
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
    return String(next)
  }, [customValues])

  useEffect(() => {
    setPendingMa(nextSttMa)
  }, [nextSttMa, mode])

  const napKichThuocKhoGiay = useCallback(async () => {
    if (mode !== 'kho-giay') return
    const q = pendingTen.trim()
    if (!q) {
      toast?.showToast('Vui lòng nhập tên khổ giấy trước khi nạp kích thước.', 'error')
      return
    }
    setNapKichThuocDangTai(true)
    try {
      const url = htqlApiUrl(`/api/paper-sizes/lookup?q=${encodeURIComponent(q)}`)
      const r = await fetch(url, { credentials: 'include' })
      if (!r.ok) {
        const payload = await r.json().catch(() => ({}))
        throw new Error(String((payload as { error?: unknown })?.error ?? 'Không tìm thấy kích thước phù hợp.'))
      }
      const payload = await r.json() as { match?: { widthM?: number; heightM?: number } }
      let width = Number(payload?.match?.widthM ?? 0)
      let height = Number(payload?.match?.heightM ?? 0)
      if (width > 20) width = width / 1000
      if (height > 20) height = height / 1000
      if (!(width > 0)) throw new Error('Dữ liệu chiều rộng không hợp lệ.')
      setPendingChieuRongM(formatSoTien(String(width).replace('.', ',')))
      setPendingChieuDaiM(height > 0 ? formatSoTien(String(height).replace('.', ',')) : '')
      toast?.showToast(`Đã nạp kích thước ${width} × ${height > 0 ? height : '?'} m.`, 'success')
    } catch (e) {
      toast?.showToast(e instanceof Error ? e.message : 'Không nạp được kích thước.', 'error')
    } finally {
      setNapKichThuocDangTai(false)
    }
  }, [mode, pendingTen, toast])

  const persistAndNotify = useCallback(() => {
    dispatchVthhLoaiNhomChanged()
    onSaved()
  }, [onSaved])

  const luu = useCallback(
    (closeAfter: boolean) => {
      const ma = String(Math.max(1, Number.parseInt(String(pendingMa).trim(), 10) || 1))
      const ten = pendingTen.trim()
      if (!ten) {
        toast?.showToast('Tên là bắt buộc.', 'error')
        return
      }
      const listTen =
        mode === 'dinh-luong'
          ? readVthhDinhLuongCustomFromStorage()
          : mode === 'kho-giay'
            ? readVthhKhoGiayCustomFromStorage()
            : readVthhHeMauCustomFromStorage()
      const dupTen = listTen.some((x) => String(x.ten ?? '').trim().toLowerCase() === ten.toLowerCase())
      if (dupTen) {
        toast?.showToast(`Đã có mục "${ten}".`, 'error')
        return
      }

      if (mode === 'dinh-luong') {
        const cur = readVthhDinhLuongCustomFromStorage()
        localStorage.setItem(STORAGE_KEY_VTHH_DINH_LUONG_CUSTOM, JSON.stringify([...cur, { ma, ten }]))
        setStorageRev((x) => x + 1)
        persistAndNotify()
        toast?.showToast(`Đã thêm ${title.toLowerCase()}.`, 'success')
        if (closeAfter) onClose()
        else {
          setPendingTen('')
        }
        return
      }

      if (mode === 'kho-giay') {
        const w = parseNonNegativeMeter(pendingChieuRongM)
        const l = parseNonNegativeMeter(pendingChieuDaiM)
        if (w == null) {
          toast?.showToast('Chiều rộng (m) phải là số ≥ 0.', 'error')
          return
        }
        const cur = readVthhKhoGiayCustomFromStorage()
        localStorage.setItem(
          STORAGE_KEY_VTHH_KHO_GIAY_CUSTOM,
          JSON.stringify([...cur, { ma, ten, chieu_rong_m: String(w), chieu_dai_m: l == null ? '' : String(l) }]),
        )
        setStorageRev((x) => x + 1)
        persistAndNotify()
        toast?.showToast(`Đã thêm ${title.toLowerCase()}.`, 'success')
        if (closeAfter) onClose()
        else {
          setPendingTen('')
          setPendingChieuRongM('')
          setPendingChieuDaiM('')
        }
        return
      }

      if (!pendingHeMauIn && !pendingHeMauVatTu) {
        toast?.showToast('Chọn Hệ màu in hoặc Hệ màu vật tư.', 'error')
        return
      }
      if (pendingHeMauIn && pendingHeMauVatTu) {
        toast?.showToast('Chỉ được chọn một trong hai: Hệ màu in hoặc Hệ màu vật tư.', 'error')
        return
      }
      const cur = readVthhHeMauCustomFromStorage()
      localStorage.setItem(
        STORAGE_KEY_VTHH_HE_MAU_CUSTOM,
        JSON.stringify([
          ...cur,
          {
            ma,
            ten,
            dien_giai: pendingDienGiai.trim() || undefined,
            he_mau_in: pendingHeMauIn,
            he_mau_vat_tu: pendingHeMauVatTu,
          },
        ]),
      )
      setStorageRev((x) => x + 1)
      persistAndNotify()
      toast?.showToast(`Đã thêm ${title.toLowerCase()}.`, 'success')
      if (closeAfter) onClose()
      else {
        setPendingTen('')
        setPendingDienGiai('')
        setPendingHeMauIn(true)
        setPendingHeMauVatTu(false)
      }
    },
    [
      mode,
      onClose,
      pendingChieuDaiM,
      pendingChieuRongM,
      pendingDienGiai,
      pendingHeMauIn,
      pendingHeMauVatTu,
      pendingMa,
      pendingTen,
      persistAndNotify,
      title,
      toast,
    ],
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={`Thêm ${title}`}
      size="sm"
      footer={
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" style={formFooterButtonCancel} onClick={onClose}>
            Hủy bỏ
          </button>
          <button type="button" style={formFooterButtonSave} onClick={() => luu(true)}>
            Lưu
          </button>
          <button type="button" style={formFooterButtonSaveAndAdd} onClick={() => luu(false)}>
            Lưu và tiếp tục
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mã</label>
        <input
          value={pendingMa}
          readOnly
          style={{ height: 28, border: '1px solid var(--border-strong)', borderRadius: 4, padding: '0 8px', fontSize: 12, background: 'var(--bg-secondary)' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>{title}</label>
          {mode === 'kho-giay' ? (
            <button
              type="button"
              onClick={() => void napKichThuocKhoGiay()}
              disabled={napKichThuocDangTai}
              style={{
                height: 24,
                padding: '0 8px',
                borderRadius: 4,
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-tab)',
                cursor: napKichThuocDangTai ? 'default' : 'pointer',
                fontSize: 11,
              }}
            >
              {napKichThuocDangTai ? 'Đang nạp...' : 'Nạp kích thước'}
            </button>
          ) : null}
        </div>
        <input
          value={pendingTen}
          onChange={(e) => setPendingTen(e.target.value)}
          placeholder={`Nhập ${title.toLowerCase()}`}
          style={{ height: 28, border: '1px solid var(--border-strong)', borderRadius: 4, padding: '0 8px', fontSize: 12 }}
        />
        {mode === 'kho-giay' ? (
          <>
            <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Chiều rộng (m)</label>
            <input
              value={pendingChieuRongM}
              onChange={(e) => {
                const displayed = formatSoTien(normalizeKichThuocInput(e.target.value))
                setPendingChieuRongM(displayed || '')
              }}
              onFocus={() => {
                if (isZeroDisplay(String(pendingChieuRongM))) setPendingChieuRongM('')
              }}
              placeholder="Chiều rộng"
              inputMode="decimal"
              lang="vi"
              style={{
                height: 28,
                border: '1px solid var(--border-strong)',
                borderRadius: 4,
                padding: '0 8px',
                fontSize: 12,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
              }}
            />
            <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Chiều dài (m)</label>
            <input
              value={pendingChieuDaiM}
              onChange={(e) => {
                const displayed = formatSoTien(normalizeKichThuocInput(e.target.value))
                setPendingChieuDaiM(displayed || '')
              }}
              onFocus={() => {
                if (isZeroDisplay(String(pendingChieuDaiM))) setPendingChieuDaiM('')
              }}
              placeholder="Chiều dài (để trống nếu khổ đặc biệt)"
              inputMode="decimal"
              lang="vi"
              style={{
                height: 28,
                border: '1px solid var(--border-strong)',
                borderRadius: 4,
                padding: '0 8px',
                fontSize: 12,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
              }}
            />
          </>
        ) : null}
        {mode === 'he-mau' ? (
          <>
            <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Diễn giải</label>
            <input
              value={pendingDienGiai}
              onChange={(e) => setPendingDienGiai(e.target.value)}
              placeholder="Diễn giải (tuỳ chọn)"
              style={{ height: 28, border: '1px solid var(--border-strong)', borderRadius: 4, padding: '0 8px', fontSize: 12 }}
            />
            <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Áp dụng</label>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={pendingHeMauIn}
                  onChange={(e) => {
                    const c = e.target.checked
                    setPendingHeMauIn(c)
                    if (c) setPendingHeMauVatTu(false)
                  }}
                />
                Hệ màu in
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={pendingHeMauVatTu}
                  onChange={(e) => {
                    const c = e.target.checked
                    setPendingHeMauVatTu(c)
                    if (c) setPendingHeMauIn(false)
                  }}
                />
                Hệ màu vật tư
              </label>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  )
}
