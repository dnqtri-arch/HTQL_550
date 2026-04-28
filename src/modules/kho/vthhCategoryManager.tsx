import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { DataGrid, type DataGridColumn } from '../../components/common/dataGrid'
import { ListPageToolbar } from '../../components/listPageToolbar'
import { Modal } from '../../components/common/modal'
import { ConfirmXoaCaptchaModal } from '../../components/common/confirmXoaCaptchaModal'
import {
  type VatTuHangHoaRecord,
  VTHH_ENTITY_STORAGE_KEY,
  vatTuHangHoaGetAll,
  vatTuHangHoaPut,
} from './vatTuHangHoaApi'
import { useToastOptional } from '../../context/toastContext'
import {
  NHOM_VTHH_BASE_ITEMS,
  STORAGE_KEY_VTHH_DINH_LUONG_CUSTOM,
  STORAGE_KEY_VTHH_HE_MAU_CUSTOM,
  STORAGE_KEY_VTHH_KHO_GIAY_CUSTOM,
  STORAGE_KEY_VTHH_LOAI_CUSTOM,
  STORAGE_KEY_VTHH_NHOM_DISABLED,
  STORAGE_KEY_VTHH_NHOM_CUSTOM,
  STORAGE_KEY_VTHH_THUE_VAT_CUSTOM,
  STORAGE_KEY_VTHH_THUE_VAT_DISABLED,
  THUE_VAT_BASE_ITEMS,
  dispatchVthhLoaiNhomChanged,
  nhomTokenDisplayLabel,
  thueVatTokenDisplayLabel,
  parseNhomVthhStored,
  replaceNhomTokenInStored,
  type VthhDanhMucItem,
  readVthhDinhLuongCustomFromStorage,
  readVthhHeMauCustomFromStorage,
  readVthhKhoGiayCustomFromStorage,
  readVthhLoaiCustomFromStorage,
  readVthhNhomDisabledFromStorage,
  readVthhNhomCustomFromStorage,
  readVthhThueVatCustomFromStorage,
  readVthhThueVatDisabledFromStorage,
  saveVthhNhomDisabledToStorage,
  saveVthhThueVatDisabledToStorage,
} from './vthhLoaiNhomSync'
import { htqlEntityStorage } from '../../utils/htqlEntityStorage'
import { htqlApiUrl } from '../../config/htqlApiBase'
import { formatSoTien, isZeroDisplay, normalizeKichThuocInput, parseDecimalFlex } from '../../utils/numberFormat'

type ManagerMode = 'loai' | 'nhom' | 'vat' | 'kho-giay' | 'dinh-luong' | 'he-mau'

interface Props {
  mode: ManagerMode
  onQuayLai: () => void
}

interface RowItem {
  id: string
  ma: string
  ten: string
  chieuRongM: string
  chieuDaiM: string
  dienGiai: string
  heMauIn: boolean
  heMauVatTu: boolean
  count: number
}

function titleByMode(mode: ManagerMode): string {
  if (mode === 'loai') return 'Loại VTHH'
  if (mode === 'nhom') return 'Nhóm VTHH'
  if (mode === 'kho-giay') return 'Khổ giấy'
  if (mode === 'dinh-luong') return 'Độ dày/ Định lượng'
  if (mode === 'he-mau') return 'Hệ màu'
  return 'Thuế GTGT'
}

function isBuiltInNhomToken(token: string): boolean {
  return NHOM_VTHH_BASE_ITEMS.some((x) => x.id === token || x.ma === token)
}

function normalizeMa(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '')
}

function buildUpperInitialCode(raw: string): string {
  const words = raw
    .trim()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
  const code = words.map((w) => w[0]?.toUpperCase() ?? '').join('')
  return normalizeMa(code)
}

function normalizeMaByMode(raw: string, mode: ManagerMode): string {
  if (mode === 'vat') return raw.trim()
  return normalizeMa(raw)
}

function readCustomValuesByMode(mode: ManagerMode): VthhDanhMucItem[] {
  if (mode === 'loai') return readVthhLoaiCustomFromStorage()
  if (mode === 'nhom') return readVthhNhomCustomFromStorage()
  if (mode === 'kho-giay') return readVthhKhoGiayCustomFromStorage()
  if (mode === 'dinh-luong') return readVthhDinhLuongCustomFromStorage()
  if (mode === 'he-mau') return readVthhHeMauCustomFromStorage()
  return readVthhThueVatCustomFromStorage()
}

function readDisabledNhomTokens(): string[] {
  return readVthhNhomDisabledFromStorage()
}

function autoCodeFromTen(raw: string, mode: ManagerMode): string {
  if (mode === 'vat' || mode === 'kho-giay' || mode === 'dinh-luong' || mode === 'he-mau') return ''
  const initials = buildUpperInitialCode(raw)
  if (initials) return initials
  return mode === 'loai' ? 'LOAI' : 'NHOM'
}

function isNumericCodeMode(mode: ManagerMode): boolean {
  return mode === 'vat' || mode === 'kho-giay' || mode === 'dinh-luong' || mode === 'he-mau'
}

function sortByMaNumericThenText(a: string, b: string): number {
  const na = Number.parseInt(String(a).trim(), 10)
  const nb = Number.parseInt(String(b).trim(), 10)
  const ha = Number.isFinite(na)
  const hb = Number.isFinite(nb)
  if (ha && hb) return na - nb
  if (ha) return -1
  if (hb) return 1
  return a.localeCompare(b, 'vi')
}

function splitStoredTokens(raw: string): string[] {
  return raw
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean)
}

/** Chỉ đếm khớp danh mục (ma/ten) — không coi mọi chuỗi trong VTHH là dòng danh mục. */
function tokenMatchesCatalogItem(tok: string, item: VthhDanhMucItem): boolean {
  const ma = String(item.ma ?? '').trim()
  const ten = String(item.ten ?? '').trim()
  if (!ma || !ten) return false
  const t = tok.trim()
  if (!t) return false
  return t === ma || t === ten || t.toLowerCase() === ten.toLowerCase()
}

function collectKhoGiayTokensFromRecord(r: VatTuHangHoaRecord): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const push = (s: string) => {
    const t = String(s ?? '').trim()
    if (!t || seen.has(t)) return
    seen.add(t)
    out.push(t)
  }
  for (const x of splitStoredTokens(String(r.kho_giay ?? ''))) push(x)
  const pm = r.pricing_matrix
  if (Array.isArray(pm)) {
    for (const row of pm) {
      push(String(row?.kho_giay ?? ''))
    }
  }
  return out
}

function collectDinhLuongTokensFromRecord(r: VatTuHangHoaRecord): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const push = (s: string) => {
    const t = String(s ?? '').trim()
    if (!t || seen.has(t)) return
    seen.add(t)
    out.push(t)
  }
  for (const x of splitStoredTokens(String(r.dinh_luong ?? ''))) push(x)
  const pm = r.pricing_matrix
  if (Array.isArray(pm)) {
    for (const row of pm) {
      push(String(row?.dinh_luong ?? ''))
      push(String(row?.do_day ?? ''))
    }
  }
  return out
}

function collectHeMauTokensFromRecord(r: VatTuHangHoaRecord): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const push = (s: string) => {
    const t = String(s ?? '').trim()
    if (!t || seen.has(t)) return
    seen.add(t)
    out.push(t)
  }
  for (const x of splitStoredTokens(String((r as { he_mau?: string }).he_mau ?? r.mau_sac ?? ''))) push(x)
  const pm = r.pricing_matrix as Array<{ he_mau?: string }> | undefined
  if (Array.isArray(pm)) {
    for (const row of pm) {
      push(String(row?.he_mau ?? ''))
    }
  }
  return out
}

function parseNonNegativeMeter(raw: string): number | null {
  const cleaned = String(raw ?? '').trim()
  if (!cleaned) return null
  const n = parseDecimalFlex(cleaned)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function meterDisplayVn(raw: string | undefined): string {
  const n = parseDecimalFlex(String(raw ?? '').trim())
  if (!Number.isFinite(n)) return String(raw ?? '').trim().replace('.', ',')
  return formatSoTien(String(n).replace('.', ','))
}

export function VthhCategoryManager({ mode, onQuayLai }: Props) {
  const toast = useToastOptional()
  const [danhSach, setDanhSach] = useState<VatTuHangHoaRecord[]>([])
  const [customValues, setCustomValues] = useState<VthhDanhMucItem[]>([])
  const [disabledNhomTokens, setDisabledNhomTokens] = useState<string[]>([])
  const [disabledVatTokens, setDisabledVatTokens] = useState<string[]>([])
  const [selected, setSelected] = useState<RowItem | null>(null)
  const [editModal, setEditModal] = useState<'add' | 'edit' | null>(null)
  const [pendingMa, setPendingMa] = useState('')
  const [pendingTen, setPendingTen] = useState('')
  const [pendingChieuRongM, setPendingChieuRongM] = useState('')
  const [pendingChieuDaiM, setPendingChieuDaiM] = useState('')
  const [pendingDienGiai, setPendingDienGiai] = useState('')
  const [pendingHeMauIn, setPendingHeMauIn] = useState(false)
  const [pendingHeMauVatTu, setPendingHeMauVatTu] = useState(false)
  const [napKichThuocDangTai, setNapKichThuocDangTai] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const title = titleByMode(mode)
  const storageKey =
    mode === 'loai'
      ? STORAGE_KEY_VTHH_LOAI_CUSTOM
      : mode === 'nhom'
        ? STORAGE_KEY_VTHH_NHOM_CUSTOM
        : mode === 'kho-giay'
          ? STORAGE_KEY_VTHH_KHO_GIAY_CUSTOM
          : mode === 'dinh-luong'
            ? STORAGE_KEY_VTHH_DINH_LUONG_CUSTOM
            : mode === 'he-mau'
              ? STORAGE_KEY_VTHH_HE_MAU_CUSTOM
            : STORAGE_KEY_VTHH_THUE_VAT_CUSTOM

  const showError = useCallback(
    (message: string) => {
      if (toast) toast.showToast(message, 'error')
      else alert(message)
    },
    [toast],
  )

  const load = useCallback(async () => {
    const all = await vatTuHangHoaGetAll()
    setDanhSach(all)
  }, [])

  useEffect(() => {
    setCustomValues(readCustomValuesByMode(mode))
    setDisabledNhomTokens(readDisabledNhomTokens())
    setDisabledVatTokens(readVthhThueVatDisabledFromStorage())
  }, [storageKey, mode])

  useEffect(() => {
    const run = () => {
      setCustomValues(readCustomValuesByMode(mode))
      setDisabledNhomTokens(readDisabledNhomTokens())
      setDisabledVatTokens(readVthhThueVatDisabledFromStorage())
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key !== storageKey) return
      run()
    }
    const onChanged = () => run()
    const onKvRemoteSync = (e: Event) => {
      const keys = (e as CustomEvent<{ keys?: string[] }>).detail?.keys ?? []
      if (
        Array.isArray(keys) &&
        (keys.includes(storageKey) ||
          keys.includes(STORAGE_KEY_VTHH_NHOM_DISABLED) ||
          keys.includes(STORAGE_KEY_VTHH_THUE_VAT_DISABLED))
      ) {
        run()
      }
      if (Array.isArray(keys) && keys.includes(VTHH_ENTITY_STORAGE_KEY)) {
        void load()
      }
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('htql-vthh-loai-nhom-changed', onChanged)
    window.addEventListener('htql-kv-remote-sync', onKvRemoteSync as EventListener)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('htql-vthh-loai-nhom-changed', onChanged)
      window.removeEventListener('htql-kv-remote-sync', onKvRemoteSync as EventListener)
    }
  }, [storageKey, mode, load])

  const saveCustomValues = useCallback(
    (next: VthhDanhMucItem[]) => {
      htqlEntityStorage.setItem(storageKey, JSON.stringify(next))
      setCustomValues(next)
      dispatchVthhLoaiNhomChanged()
    },
    [storageKey],
  )

  const upsertCustomValue = useCallback(
    (ma: string, ten: string, oldMa?: string, sizeM?: { chieuRongM: string; chieuDaiM: string }) => {
      const key = String(oldMa ?? ma)
      if (customValues.some((x) => x.ma === key)) {
        saveCustomValues(customValues.map((x) => (
          x.ma === key
            ? {
                ma,
                ten,
                ...(sizeM ? { chieu_rong_m: sizeM.chieuRongM, chieu_dai_m: sizeM.chieuDaiM } : {}),
              }
            : x
        )))
        return
      }
      saveCustomValues([
        ...customValues,
        {
          ma,
          ten,
          ...(sizeM ? { chieu_rong_m: sizeM.chieuRongM, chieu_dai_m: sizeM.chieuDaiM } : {}),
        },
      ])
    },
    [customValues, saveCustomValues],
  )

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo<RowItem[]>(() => {
    const countMap = new Map<string, number>()
    const tenByMa = new Map<string, string>()

    if (mode === 'loai') {
      for (const item of customValues) {
        if (!item.ma || !item.ten) continue
        if (!countMap.has(item.ma)) countMap.set(item.ma, 0)
        tenByMa.set(item.ma, item.ten)
      }
      for (const r of danhSach) {
        const raw = String(r.tinh_chat ?? '').trim()
        if (!raw) continue
        const hit = customValues.find((x) => x.ten === raw || x.ma === raw)
        const ma = hit?.ma ?? raw
        if (!tenByMa.has(ma)) tenByMa.set(ma, hit?.ten ?? raw)
        countMap.set(ma, (countMap.get(ma) ?? 0) + 1)
      }
      return [...countMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], 'vi'))
        .map(([ma, count]) => ({ id: ma, ma, ten: tenByMa.get(ma) ?? ma, chieuRongM: '', chieuDaiM: '', dienGiai: '', heMauIn: false, heMauVatTu: false, count }))
    }

    if (mode === 'vat') {
      const disabledVat = new Set(disabledVatTokens)
      for (const item of THUE_VAT_BASE_ITEMS) {
        if (disabledVat.has(item.ma)) continue
        if (!countMap.has(item.ma)) countMap.set(item.ma, 0)
        tenByMa.set(item.ma, item.ten)
      }
      for (const item of customValues) {
        if (!item.ma) continue
        if (disabledVat.has(item.ma)) continue
        if (!countMap.has(item.ma)) countMap.set(item.ma, 0)
        tenByMa.set(item.ma, item.ten || item.ma)
      }
      for (const r of danhSach) {
        const tokenOut = String(r.thue_suat_gtgt_dau_ra ?? '').trim()
        const tokenLegacy = String(r.thue_suat_gtgt ?? '').trim()
        const token = tokenOut || tokenLegacy
        if (!token) continue
        countMap.set(token, (countMap.get(token) ?? 0) + 1)
      }
      return [...countMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], 'vi'))
        .map(([ma, count]) => ({
          id: ma,
          ma,
          ten: tenByMa.get(ma) ?? thueVatTokenDisplayLabel(ma, customValues),
          chieuRongM: '',
          chieuDaiM: '',
          dienGiai: '',
          heMauIn: false,
          heMauVatTu: false,
          count,
        }))
    }

    if (mode === 'kho-giay' || mode === 'dinh-luong' || mode === 'he-mau') {
      /** Chỉ hiển thị dòng danh mục đã khai báo (custom); «Số VTHH sử dụng» = token khớp ma/ten + pricing_matrix. */
      const countByMa = new Map<string, number>()
      for (const item of customValues) {
        const ma = String(item.ma ?? '').trim()
        const ten = String(item.ten ?? '').trim()
        if (!ma || !ten) continue
        countByMa.set(ma, 0)
        tenByMa.set(ma, ten)
      }
      for (const r of danhSach) {
        const tokens =
          mode === 'kho-giay'
            ? collectKhoGiayTokensFromRecord(r)
            : mode === 'dinh-luong'
              ? collectDinhLuongTokensFromRecord(r)
              : collectHeMauTokensFromRecord(r)
        for (const token of tokens) {
          for (const item of customValues) {
            const ma = String(item.ma ?? '').trim()
            if (!ma || !tokenMatchesCatalogItem(token, item)) continue
            countByMa.set(ma, (countByMa.get(ma) ?? 0) + 1)
          }
        }
      }
      return customValues
        .filter((item) => String(item.ma ?? '').trim() && String(item.ten ?? '').trim())
        .map((item) => {
          const ma = String(item.ma ?? '').trim()
          const ten = String(item.ten ?? '').trim()
          return {
            id: ma,
            ma,
            ten,
            chieuRongM: mode === 'kho-giay' ? String(item.chieu_rong_m ?? '').trim() : '',
            chieuDaiM: mode === 'kho-giay' ? String(item.chieu_dai_m ?? '').trim() : '',
            dienGiai: mode === 'he-mau' ? String(item.dien_giai ?? '').trim() : '',
            heMauIn: mode === 'he-mau' ? item.he_mau_in === true : false,
            heMauVatTu: mode === 'he-mau' ? item.he_mau_vat_tu === true : false,
            count: countByMa.get(ma) ?? 0,
          }
        })
        .sort((a, b) => sortByMaNumericThenText(a.ma, b.ma))
    }

    const disabled = new Set(disabledNhomTokens)
    for (const base of NHOM_VTHH_BASE_ITEMS) {
      if (disabled.has(base.id) || disabled.has(base.ma)) continue
      if (!countMap.has(base.id)) countMap.set(base.id, 0)
      tenByMa.set(base.id, base.ten)
    }
    for (const item of customValues) {
      if (!item.ma) continue
      if (disabled.has(item.ma)) continue
      if (!countMap.has(item.ma)) countMap.set(item.ma, 0)
      tenByMa.set(item.ma, item.ten || item.ma)
    }
    for (const r of danhSach) {
      for (const token of parseNhomVthhStored(String(r.nhom_vthh ?? ''))) {
        countMap.set(token, (countMap.get(token) ?? 0) + 1)
      }
    }
    return [...countMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'vi'))
      .map(([ma, count]) => ({
        id: ma,
        ma,
        ten: tenByMa.get(ma) ?? nhomTokenDisplayLabel(ma, customValues),
        chieuRongM: '',
        chieuDaiM: '',
        dienGiai: '',
        heMauIn: false,
        heMauVatTu: false,
        count,
      }))
  }, [customValues, danhSach, disabledNhomTokens, disabledVatTokens, mode])

  const columns: DataGridColumn<RowItem>[] = useMemo(() => {
    if (mode === 'kho-giay') {
      return [
        { key: 'ma', label: 'Mã', width: '16%', filterable: false },
        { key: 'ten', label: title, width: '28%', filterable: false },
        {
          key: 'chieuRongM',
          label: 'Kích thước (m) - Chiều rộng',
          width: '16%',
          align: 'right',
          filterable: false,
          renderCell: (v) => meterDisplayVn(String(v ?? '')),
        },
        {
          key: 'chieuDaiM',
          label: 'Kích thước (m) - Chiều dài',
          width: '16%',
          align: 'right',
          filterable: false,
          renderCell: (v) => meterDisplayVn(String(v ?? '')),
        },
        { key: 'count', label: 'Số VTHH sử dụng', width: '24%', align: 'right', filterable: false },
      ]
    }
    if (mode === 'he-mau') {
      return [
        { key: 'ma', label: 'Mã', width: '14%', filterable: false },
        { key: 'ten', label: title, width: '26%', filterable: false },
        { key: 'dienGiai', label: 'Diễn giải', width: '34%', filterable: false },
        { key: 'count', label: 'Số VTHH sử dụng', width: '12%', align: 'right', filterable: false },
      ]
    }
    return [
      { key: 'ma', label: 'Mã', width: '22%', filterable: false },
      { key: 'ten', label: title, width: '54%', filterable: false },
      { key: 'count', label: 'Số VTHH sử dụng', width: '24%', align: 'right', filterable: false },
    ]
  }, [mode, title])

  const moThem = () => {
    setPendingMa('')
    setPendingTen('')
    setPendingChieuRongM('')
    setPendingChieuDaiM('')
    setPendingDienGiai('')
    setPendingHeMauIn(false)
    setPendingHeMauVatTu(false)
    setEditModal('add')
  }

  const moSua = () => {
    if (!selected) return
    setPendingMa(selected.ma)
    setPendingTen(selected.ten)
    setPendingChieuRongM(selected.chieuRongM ?? '')
    setPendingChieuDaiM(selected.chieuDaiM ?? '')
    setPendingDienGiai(selected.dienGiai ?? '')
    setPendingHeMauIn(Boolean(selected.heMauIn))
    setPendingHeMauVatTu(Boolean(selected.heMauVatTu))
    setEditModal('edit')
  }

  const nextSttMa = useMemo(() => {
    const nums = customValues
      .map((r) => Number.parseInt(String(r.ma).trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0)
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
    return String(next)
  }, [customValues])

  useEffect(() => {
    if (editModal !== 'add') return
    if (!isNumericCodeMode(mode)) {
      const base = autoCodeFromTen(pendingTen, mode)
      const used = new Set(rows.map((r) => r.ma))
      let candidate = base || (mode === 'loai' ? 'LOAI' : 'NHOM')
      if (used.has(candidate)) {
        let i = 2
        while (used.has(`${candidate}_${i}`)) i++
        candidate = `${candidate}_${i}`
      }
      setPendingMa(candidate)
      return
    }
    if (isNumericCodeMode(mode)) {
      setPendingMa(nextSttMa)
    }
  }, [pendingTen, mode, editModal, nextSttMa, rows])

  const luuThemHoacSua = async () => {
    const ma = isNumericCodeMode(mode)
      ? String(Math.max(1, Number.parseInt(String(pendingMa).trim(), 10) || 1))
      : normalizeMaByMode(pendingMa, mode)
    const ten = pendingTen.trim()
    if (!ma) {
      showError('Mã là bắt buộc.')
      return
    }
    if (!ten) {
      showError('Tên là bắt buộc.')
      return
    }
    let chieuRongM = ''
    let chieuDaiM = ''
    if (mode === 'kho-giay') {
      const w = parseNonNegativeMeter(pendingChieuRongM)
      const l = parseNonNegativeMeter(pendingChieuDaiM)
      if (w == null) {
        showError('Chiều rộng (m) phải là số thập phân lớn hơn hoặc bằng 0.')
        return
      }
      chieuRongM = String(w)
      chieuDaiM = l == null ? '' : String(l)
    }
    const selectedMa = selected?.ma ?? ''
    const duplicateMa = rows.find((x) => x.ma === ma && x.ma !== selectedMa)
    if (duplicateMa) {
      showError(`${title} có mã "${ma}" đã tồn tại.`)
      return
    }
    const duplicateTen = rows.find((x) => x.ten.toLowerCase() === ten.toLowerCase() && x.ma !== selectedMa)
    if (duplicateTen) {
      showError(`${title} có tên "${ten}" đã tồn tại.`)
      return
    }
    if (mode === 'he-mau' && pendingHeMauIn && pendingHeMauVatTu) {
      showError('Chỉ được chọn một trong hai: Hệ màu in hoặc Hệ màu vật tư.')
      return
    }

    if (editModal === 'add') {
      saveCustomValues([
        ...customValues,
        {
          ma,
          ten,
          ...(mode === 'kho-giay' ? { chieu_rong_m: chieuRongM, chieu_dai_m: chieuDaiM } : {}),
          ...(mode === 'he-mau'
            ? {
                dien_giai: pendingDienGiai.trim() || undefined,
                he_mau_in: pendingHeMauIn,
                he_mau_vat_tu: pendingHeMauVatTu,
              }
            : {}),
        },
      ])
      if (toast) toast.showToast(`Đã thêm ${title.toLowerCase()} mới.`, 'success')
      setEditModal(null)
      return
    }

    if (!selected) return
    if (mode === 'loai') {
      const affected = danhSach.filter((r) => {
        const raw = String(r.tinh_chat ?? '').trim()
        return raw === selected.ten || raw === selected.ma
      })
      for (const row of affected) {
        await vatTuHangHoaPut(row.id, { ...row, tinh_chat: ten })
      }
      upsertCustomValue(ma, ten, selected.ma)
      setEditModal(null)
      await load()
      return
    }

    if (mode === 'vat') {
      const affected = danhSach.filter((r) => {
        const raw = String(r.thue_suat_gtgt_dau_ra ?? '').trim()
        return raw === selected.ten || raw === selected.ma
      })
      for (const row of affected) {
        await vatTuHangHoaPut(row.id, { ...row, thue_suat_gtgt: ma, thue_suat_gtgt_dau_ra: ma })
      }
      upsertCustomValue(ma, ten, selected.ma)
      setEditModal(null)
      await load()
      return
    }

    if (mode === 'kho-giay' || mode === 'dinh-luong' || mode === 'he-mau') {
      upsertCustomValue(
        ma,
        ten,
        selected.ma,
        mode === 'kho-giay' ? { chieuRongM, chieuDaiM } : undefined,
      )
      if (mode === 'he-mau') {
        saveCustomValues(
          customValues.map((x) =>
            x.ma === selected.ma
              ? {
                  ...x,
                  ma,
                  ten,
                  dien_giai: pendingDienGiai.trim() || undefined,
                  he_mau_in: pendingHeMauIn,
                  he_mau_vat_tu: pendingHeMauVatTu,
                }
              : x,
          ),
        )
      }
      setEditModal(null)
      return
    }

    const affected = danhSach.filter((r) => parseNhomVthhStored(String(r.nhom_vthh ?? '')).includes(selected.ma) && r.id > 0)
    for (const row of affected) {
      await vatTuHangHoaPut(row.id, {
        ...row,
        nhom_vthh: replaceNhomTokenInStored(String(row.nhom_vthh ?? ''), selected.ma, ma),
      })
    }
    upsertCustomValue(ma, ten, selected.ma)
    setEditModal(null)
    await load()
  }

  const napKichThuocKhoGiay = useCallback(async () => {
    if (mode !== 'kho-giay') return
    const q = pendingTen.trim()
    if (!q) {
      showError('Vui lòng nhập Khổ giấy trước khi nạp kích thước.')
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
      const payload = await r.json() as {
        match?: { widthM?: number; heightM?: number; name?: string }
      }
      let width = Number(payload?.match?.widthM ?? 0)
      let height = Number(payload?.match?.heightM ?? 0)
      if (width > 20) width = width / 1000
      if (height > 20) height = height / 1000
      if (!(width > 0)) throw new Error('Dữ liệu chiều rộng không hợp lệ.')
      setPendingChieuRongM(formatSoTien(String(width).replace('.', ',')))
      setPendingChieuDaiM(height > 0 ? formatSoTien(String(height).replace('.', ',')) : '')
      if (toast) toast.showToast(`Đã nạp kích thước ${width} x ${height > 0 ? height : '?'} m.`, 'success')
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Không nạp được kích thước.')
    } finally {
      setNapKichThuocDangTai(false)
    }
  }, [mode, pendingTen, showError, toast])

  const moXoa = () => {
    if (!selected) return
    if (selected.count > 0) {
      showError(`${title} "${selected.ten}" đang được gán cho ${selected.count} vật tư hàng hóa, không thể xóa.`)
      return
    }
    setDeleteOpen(true)
  }

  const xoaItem = async () => {
    if (!selected) return
    if (mode === 'nhom' && isBuiltInNhomToken(selected.ma)) {
      const nextDisabled = Array.from(new Set([...disabledNhomTokens, selected.ma]))
      saveVthhNhomDisabledToStorage(nextDisabled)
      setDisabledNhomTokens(nextDisabled)
      dispatchVthhLoaiNhomChanged()
      saveCustomValues(customValues.filter((x) => x.ma !== selected.ma))
    } else if (mode === 'vat' && THUE_VAT_BASE_ITEMS.some((x) => x.ma === selected.ma)) {
      const nextDisabled = Array.from(new Set([...disabledVatTokens, selected.ma]))
      saveVthhThueVatDisabledToStorage(nextDisabled)
      setDisabledVatTokens(nextDisabled)
      dispatchVthhLoaiNhomChanged()
      saveCustomValues(customValues.filter((x) => x.ma !== selected.ma))
    } else {
      saveCustomValues(customValues.filter((x) => x.ma !== selected.ma))
    }
    setDeleteOpen(false)
    setSelected(null)
    await load()
    if (toast) toast.showToast(`Đã xóa ${title.toLowerCase()} "${selected.ten}".`, 'success')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: 'var(--bg-secondary)' }}>
      <ListPageToolbar
        onQuayLai={onQuayLai}
        buttons={[
          { icon: <Plus size={14} />, label: 'Thêm', onClick: moThem },
          { icon: <Pencil size={14} />, label: 'Sửa', onClick: moSua, disabled: !selected },
          { icon: <Trash2 size={14} />, label: 'Xóa', onClick: moXoa, disabled: !selected },
        ]}
      />
      <div style={{ flex: 1, minHeight: 0 }}>
        {mode === 'kho-giay' ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', border: '0.5px solid var(--border)', borderRadius: 4, overflow: 'hidden', background: 'var(--bg-secondary)' }}>
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', padding: '4px 6px', background: 'var(--bg-tab)', textAlign: 'left', width: '16%' }}>Mã</th>
                    <th rowSpan={2} style={{ borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', padding: '4px 6px', background: 'var(--bg-tab)', textAlign: 'left', width: '28%' }}>{title}</th>
                    <th colSpan={2} style={{ borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', padding: '4px 6px', background: 'var(--bg-tab)', textAlign: 'center', width: '32%' }}>Kích thước (m)</th>
                    <th rowSpan={2} style={{ borderBottom: '0.5px solid var(--border)', padding: '4px 6px', background: 'var(--bg-tab)', textAlign: 'right', width: '24%' }}>Số VTHH sử dụng</th>
                  </tr>
                  <tr>
                    <th style={{ borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', padding: '4px 6px', background: 'var(--bg-tab)', textAlign: 'right' }}>Chiều rộng</th>
                    <th style={{ borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', padding: '4px 6px', background: 'var(--bg-tab)', textAlign: 'right' }}>Chiều dài</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const isSelected = selected?.id === r.id
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelected(r)}
                        style={{ cursor: 'pointer', background: isSelected ? 'var(--row-selected-bg)' : undefined }}
                      >
                        <td style={{ borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', padding: '3px 6px' }}>{r.ma}</td>
                        <td style={{ borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', padding: '3px 6px' }}>{r.ten}</td>
                        <td style={{ borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', padding: '3px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{meterDisplayVn(r.chieuRongM || '')}</td>
                        <td style={{ borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', padding: '3px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{meterDisplayVn(r.chieuDaiM || '')}</td>
                        <td style={{ borderBottom: '0.5px solid var(--border)', padding: '3px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.count}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ borderTop: '0.5px solid var(--border)', padding: '4px 8px', fontSize: 11, color: 'var(--accent)', display: 'flex', gap: 16, fontWeight: 600 }}>
              <span>Số dòng: {rows.length}</span>
              <span>Tổng VTHH liên quan: {rows.reduce((s, r) => s + r.count, 0)}</span>
            </div>
          </div>
        ) : (
          <DataGrid<RowItem>
            columns={columns}
            data={rows}
            keyField="id"
            height="100%"
            selectedRowId={selected?.id ?? null}
            onRowSelect={(r) => setSelected(r)}
            onRowDoubleClick={(r) => setSelected(r)}
            summary={[
              { label: 'Số dòng', value: rows.length },
              { label: 'Tổng VTHH liên quan', value: rows.reduce((s, r) => s + r.count, 0) },
            ]}
          />
        )}
      </div>
      <Modal
        open={editModal != null}
        onClose={() => setEditModal(null)}
        title={editModal === 'add' ? `Thêm ${title}` : `Sửa ${title}`}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditModal(null)}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-primary)', cursor: 'pointer' }}
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={luuThemHoacSua}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--accent-text)', cursor: 'pointer', fontWeight: 600 }}
            >
              Lưu
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Mã</label>
          <input
            value={pendingMa}
            onChange={() => {}}
            placeholder={isNumericCodeMode(mode) ? 'Mã tự tăng theo STT' : 'Mã tự tạo tự động'}
            readOnly
            style={{ height: 28, border: '1px solid var(--border-strong)', borderRadius: 4, padding: '0 8px', fontSize: 12 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{title}</label>
            {mode === 'kho-giay' && (
              <button
                type="button"
                onClick={() => void napKichThuocKhoGiay()}
                disabled={napKichThuocDangTai}
                style={{ height: 24, padding: '0 8px', borderRadius: 4, border: '1px solid var(--border-strong)', background: 'var(--bg-tab)', cursor: napKichThuocDangTai ? 'default' : 'pointer', fontSize: 11 }}
              >
                {napKichThuocDangTai ? 'Đang nạp...' : 'Nạp kích thước'}
              </button>
            )}
          </div>
          <input
            value={pendingTen}
            onChange={(e) => setPendingTen(e.target.value)}
            placeholder={`Nhập ${title.toLowerCase()}`}
            style={{ height: 28, border: '1px solid var(--border-strong)', borderRadius: 4, padding: '0 8px', fontSize: 12 }}
          />
          {mode === 'kho-giay' && (
            <>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Chiều rộng (m)</label>
              <input
                value={pendingChieuRongM}
                onChange={(e) => {
                  const displayed = formatSoTien(normalizeKichThuocInput(e.target.value))
                  setPendingChieuRongM(displayed || '')
                }}
                onFocus={() => {
                  if (isZeroDisplay(String(pendingChieuRongM))) setPendingChieuRongM('')
                }}
                placeholder="Nhập chiều rộng"
                inputMode="decimal"
                lang="vi"
                style={{ height: 28, border: '1px solid var(--border-strong)', borderRadius: 4, padding: '0 8px', fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
              />
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Chiều dài (m)</label>
              <input
                value={pendingChieuDaiM}
                onChange={(e) => {
                  const displayed = formatSoTien(normalizeKichThuocInput(e.target.value))
                  setPendingChieuDaiM(displayed || '')
                }}
                onFocus={() => {
                  if (isZeroDisplay(String(pendingChieuDaiM))) setPendingChieuDaiM('')
                }}
                placeholder="Nhập chiều dài"
                inputMode="decimal"
                lang="vi"
                style={{ height: 28, border: '1px solid var(--border-strong)', borderRadius: 4, padding: '0 8px', fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
              />
            </>
          )}
          {mode === 'he-mau' && (
            <>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Diễn giải</label>
              <input
                value={pendingDienGiai}
                onChange={(e) => setPendingDienGiai(e.target.value)}
                placeholder="Nhập diễn giải hệ màu"
                style={{ height: 28, border: '1px solid var(--border-strong)', borderRadius: 4, padding: '0 8px', fontSize: 12 }}
              />
              <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Áp dụng</label>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={pendingHeMauIn}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setPendingHeMauIn(checked)
                      if (checked) setPendingHeMauVatTu(false)
                    }}
                  />
                  Hệ màu in
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={pendingHeMauVatTu}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setPendingHeMauVatTu(checked)
                      if (checked) setPendingHeMauIn(false)
                    }}
                  />
                  Hệ màu vật tư
                </label>
              </div>
            </>
          )}
        </div>
      </Modal>
      <ConfirmXoaCaptchaModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={xoaItem}
        title={`Xóa ${title}`}
        message={
          <div>
            Bạn sắp xóa <strong>{title}</strong> "<strong>{selected?.ten}</strong>" (mã <strong>{selected?.ma}</strong>).
            <br />
            Thao tác không hoàn tác.
          </div>
        }
      />
    </div>
  )
}
