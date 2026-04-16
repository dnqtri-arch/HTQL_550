import fs from 'fs'

const p = 'src/modules/crm/banHang/donHangBan/donHangBanChungTuApi.ts'
let s = fs.readFileSync(p, 'utf8')

const NEW_MID = `let _donHangBanList: DonHangBanChungTuRecord[] = []
let _chiTietList: DonHangBanChungTuChiTiet[] = []
let _donHangBanDraft: DonHangBanChungTuDraftLine[] | null = null

let persistTimer: ReturnType<typeof setTimeout> | null = null
let persistInFlight = false
const PERSIST_DEBOUNCE_MS = 450

function buildDonHangBanChungTuBundleForPersist(): Record<string, unknown> {
  return {
    _v: BUNDLE_V,
    donHangBan: _donHangBanList,
    chiTiet: _chiTietList,
    draft: _donHangBanDraft,
  }
}

function donHangBanChungTuHasPendingPersist(): boolean {
  return persistTimer != null || persistInFlight
}

function schedulePersistDonHangBanChungTuBundle(): void {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    persistInFlight = true
    void htqlModuleBundlePut(DON_HANG_BAN_CHUNG_TU_MODULE_ID, buildDonHangBanChungTuBundleForPersist())
      .catch(() => {
        /* offline */
      })
      .finally(() => {
        persistInFlight = false
      })
  }, PERSIST_DEBOUNCE_MS)
}

function applyDonHangBanChungTuBundlePayload(bundle: unknown | null): void {
  if (!bundle || typeof bundle !== 'object') {
    _donHangBanList = [...MOCK_DON]
    _chiTietList = [...MOCK_CHI_TIET]
    _donHangBanDraft = null
    return
  }
  const o = bundle as { donHangBan?: unknown; chiTiet?: unknown; draft?: unknown }
  const donRaw = o.donHangBan
  const chiTietRaw = o.chiTiet
  if (!Array.isArray(donRaw) || !Array.isArray(chiTietRaw)) {
    _donHangBanList = [...MOCK_DON]
    _chiTietList = [...MOCK_CHI_TIET]
    _donHangBanDraft = null
    return
  }
  _donHangBanList = (donRaw as (Partial<DonHangBanChungTuRecord> & { id: string })[]).map((d) =>
    normalizeDonHangBanChungTu(d),
  )
  _chiTietList = chiTietRaw as DonHangBanChungTuChiTiet[]
  if (o.draft == null) _donHangBanDraft = null
  else if (Array.isArray(o.draft)) _donHangBanDraft = o.draft as DonHangBanChungTuDraftLine[]
  else _donHangBanDraft = null
}

export async function donHangBanChungTuFetchBundleAndApply(): Promise<number> {
  try {
    const { bundle, version } = await htqlModuleBundleGet(DON_HANG_BAN_CHUNG_TU_MODULE_ID)
    if (!donHangBanChungTuHasPendingPersist()) applyDonHangBanChungTuBundlePayload(bundle)
    return version
  } catch {
    if (!donHangBanChungTuHasPendingPersist() && _donHangBanList.length === 0) applyDonHangBanChungTuBundlePayload(null)
    return 0
  }
}

export function donHangBanReloadFromStorage(): void {
  void donHangBanChungTuFetchBundleAndApply()
}

export function getDonHangBanChungTuDraft(): DonHangBanChungTuDraftLine[] | null {
  return _donHangBanDraft
}

export function setDonHangBanChungTuDraft(lines: Array<Record<string, string> & { _dvtOptions?: string[]; _vthh?: unknown }>): void {
  const toSave = lines.map((l) => {
    const { _vthh: _drop, ...rest } = l
    return rest
  })
  _donHangBanDraft = toSave as DonHangBanChungTuDraftLine[]
  schedulePersistDonHangBanChungTuBundle()
}

export function clearDonHangBanChungTuDraft(): void {
  _donHangBanDraft = null
  schedulePersistDonHangBanChungTuBundle()
}

`

const a = s.indexOf('function loadFromStorage()')
const b = s.indexOf('export function getDateRangeForKy')
if (a < 0 || b < 0 || b <= a) {
  console.error('range', a, b)
  process.exit(1)
}
s = s.slice(0, a) + NEW_MID + s.slice(b)

s = s.replace(/saveToStorage\(\)/g, 'schedulePersistDonHangBanChungTuBundle()')

fs.writeFileSync(p, s)
console.log('patched mid', p)
