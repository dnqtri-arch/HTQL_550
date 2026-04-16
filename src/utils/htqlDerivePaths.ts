import type { HtqlMetaResponse } from '../types/htqlServerPaths'

/** Ghép đường dẫn giống server Node (DATA_DIR + hậu tố) khi API không trả đủ trường. */
function joinDataSub(base: string, ...segments: string[]): string {
  const b = base.replace(/[/\\]+$/, '')
  if (!b) return ''
  const sep = base.includes('\\') ? '\\' : '/'
  return [b, ...segments].join(sep)
}

/** Suy INSTALL_ROOT từ path dữ liệu (vd …/opt/htql550/data → …/opt/htql550). */
function deriveInstallRootFromPath(duLieu: string): string {
  const d = duLieu.replace(/[/\\]+$/, '')
  if (!d) return ''
  if (/\/data$/i.test(d)) return d.replace(/\/data$/i, '')
  if (/\\data$/i.test(d)) return d.replace(/\\data$/i, '')
  return ''
}

/** Kết quả chuẩn hóa từ /api/htql-meta (kể cả server cũ thiếu field). */
export type DerivedHtqlMetaPaths = {
  duLieu: string
  hoaDon: string
  thietKe: string
  coSoDuLieu: string
  backupDuLieu: string
  backupCtTk: string
  /** Gốc cài (từ API hoặc suy từ pathDuLieu) */
  installRoot: string
  pathUpdateServer: string
  pathUpdateClient: string
  pathVthhHinhAnh: string
}

/**
 * Chuẩn hóa đường dẫn hiển thị:
 * - MySQL: ưu tiên chuỗi MySQL khi storageBackend=mysql (không để path sqlite ghi đè).
 * - Đính kèm/thiết kế: nếu API thiếu, suy từ SSD khi có ssdRoot.
 * - Update server/client: nếu API thiếu, suy từ installRoot/update/…
 */
export function deriveHtqlMetaPaths(m: Partial<HtqlMetaResponse> & { dataDir?: string }): DerivedHtqlMetaPaths {
  const duLieu = (m.pathDuLieu ?? m.dataDir ?? '').trim()
  const ssd = (m.ssdRoot ?? '').trim()

  const hoaDon =
    (m.pathHoaDonChungTu ?? '').trim() || (ssd ? joinDataSub(ssd, 'hdct') : joinDataSub(duLieu, 'hdct'))
  const thietKe =
    (m.pathThietKe ?? '').trim() || (ssd ? joinDataSub(ssd, 'thietke') : joinDataSub(duLieu, 'thietke'))

  const rawCoSo = (m.pathCoSoDuLieu ?? '').trim()
  let coSoDuLieu: string
  if (m.storageBackend === 'mysql' && m.mysqlDatabase) {
    coSoDuLieu = `MySQL ${m.mysqlDatabase} @ ${m.mysqlHost ?? '127.0.0.1'}:${m.mysqlPort ?? '3306'}`
  } else if (rawCoSo.startsWith('MySQL')) {
    coSoDuLieu = rawCoSo
  } else if (rawCoSo) {
    coSoDuLieu = rawCoSo
  } else {
    coSoDuLieu = joinDataSub(duLieu, 'sqlite')
  }

  const backupDuLieu = (m.pathBackupDuLieu ?? '').trim() || '/hdd_4tb/htql_550/backup_dulieu'
  const backupCtTk = (m.pathBackupCtTk ?? '').trim() || '/hdd_4tb/htql_550/backup_ct_tk'

  const installRoot = (m.installRoot ?? '').trim() || deriveInstallRootFromPath(duLieu)
  const pathUpdateServer =
    (m.pathUpdateServer ?? '').trim() || (installRoot ? joinDataSub(installRoot, 'update', 'server') : '')
  const pathUpdateClient =
    (m.pathUpdateClient ?? '').trim() || (installRoot ? joinDataSub(installRoot, 'update', 'client') : '')

  const explicitVthh = (m.pathVthhHinhAnh ?? '').trim()
  const pathVthhHinhAnh =
    explicitVthh || (ssd ? joinDataSub(ssd, 'vthh') : '/ssd_2tb/htql_550/vthh')

  return {
    duLieu,
    hoaDon,
    thietKe,
    coSoDuLieu,
    backupDuLieu,
    backupCtTk,
    installRoot,
    pathUpdateServer,
    pathUpdateClient,
    pathVthhHinhAnh,
  }
}
