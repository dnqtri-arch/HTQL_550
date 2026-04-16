import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { Server, RefreshCw } from 'lucide-react'
import {
  htqlApiUrl,
  getHtqlApiOrigin,
  getHtqlConnectionMode,
  htqlDevUsesRemoteApi,
} from '../../config/htqlApiBase'
import { useToast } from '../../context/toastContext'
import type { HtqlMetaResponse } from '../../types/htqlServerPaths'
import { deriveHtqlMetaPaths } from '../../utils/htqlDerivePaths'
import { formFooterButtonCancel } from '../../constants/formFooterButtons'

const box: React.CSSProperties = {
  padding: '12px 14px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-strong)',
  borderRadius: '6px',
  maxWidth: 920,
}

const label: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: '4px',
}

const valueBox: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  fontSize: '12px',
  padding: '6px 8px',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontFamily: 'ui-monospace, monospace',
  cursor: 'text',
  userSelect: 'text',
  wordBreak: 'break-all',
}

function connectionModeLabel(): string {
  const m = getHtqlConnectionMode()
  if (m === 'Dev') return 'Dev (localhost)'
  if (m === 'LAN') return 'LAN (mạng nội bộ)'
  return 'Online (WAN)'
}

export function KetNoiMayChu() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [connOk, setConnOk] = useState(false)
  const [meta, setMeta] = useState<HtqlMetaResponse | null>(null)
  const [pathDuLieu, setPathDuLieu] = useState('')
  const [pathHdCt, setPathHdCt] = useState('')
  const [pathTk, setPathTk] = useState('')
  const [pathCoSo, setPathCoSo] = useState('')
  const [pathBackupDuLieu, setPathBackupDuLieu] = useState('')
  const [pathBackupCtTk, setPathBackupCtTk] = useState('')
  const [pathUpdateServer, setPathUpdateServer] = useState('')
  const [pathUpdateClient, setPathUpdateClient] = useState('')
  const [pathVthhHinh, setPathVthhHinh] = useState('')
  const [connMode, setConnMode] = useState<string>('')

  const applyMeta = useCallback((m: Partial<HtqlMetaResponse> & { dataDir?: string }) => {
    const d = deriveHtqlMetaPaths(m)
    setMeta({
      name: m.name ?? 'htql-550-server',
      version: m.version ?? 'unknown',
      webAppVersion: m.webAppVersion ?? 'unknown',
      installRoot: (m.installRoot ?? '').trim() || d.installRoot || undefined,
      ssdRoot: m.ssdRoot,
      pathDuLieu: d.duLieu,
      pathHoaDonChungTu: d.hoaDon,
      pathThietKe: d.thietKe,
      pathCoSoDuLieu: d.coSoDuLieu,
      pathBackupDuLieu: d.backupDuLieu,
      pathBackupCtTk: d.backupCtTk,
      pathUpdateServer: d.pathUpdateServer,
      pathUpdateClient: d.pathUpdateClient,
      serverHostName: m.serverHostName,
      storageBackend: m.storageBackend,
      mysqlDatabase: m.mysqlDatabase,
      mysqlHost: m.mysqlHost,
      mysqlPort: m.mysqlPort,
      demoMode: m.demoMode,
      dataDir: m.dataDir,
    })
    setPathDuLieu(d.duLieu)
    setPathHdCt(d.hoaDon)
    setPathTk(d.thietKe)
    setPathCoSo(d.coSoDuLieu)
    setPathBackupDuLieu(d.backupDuLieu)
    setPathBackupCtTk(d.backupCtTk)
    setPathUpdateServer(d.pathUpdateServer)
    setPathUpdateClient(d.pathUpdateClient)
    setPathVthhHinh(d.pathVthhHinhAnh)
    setConnMode(connectionModeLabel())
  }, [])

  const fetchMeta = useCallback(async () => {
    setLoading(true)
    try {
      const r = await axios.get<Partial<HtqlMetaResponse> & { dataDir?: string }>(htqlApiUrl('/api/htql-meta'), {
        timeout: 8000,
      })
      setConnOk(true)
      applyMeta(r.data)
      if (typeof window !== 'undefined' && window.htqlDesktop?.runInstallerUpdateCheck) {
        void window.htqlDesktop.runInstallerUpdateCheck()
      }
    } catch {
      setConnOk(false)
      setMeta(null)
      setConnMode(connectionModeLabel())
      showToast('Không kết nối được máy chủ API. Kiểm tra mạng hoặc cấu hình Smart Connect.', 'error')
    } finally {
      setLoading(false)
    }
  }, [applyMeta, showToast])

  useEffect(() => {
    void (async () => {
      if (typeof window !== 'undefined' && window.htqlDesktop?.loadServerPathsSnapshot) {
        try {
          const snap = await window.htqlDesktop.loadServerPathsSnapshot()
          if (snap?.paths) {
            const d = deriveHtqlMetaPaths({
              pathDuLieu: snap.paths.duLieu,
              pathHoaDonChungTu: snap.paths.hoaDonChungTu,
              pathThietKe: snap.paths.thietKe,
              pathCoSoDuLieu: snap.paths.coSoDuLieu,
              pathBackupDuLieu: snap.paths.backupDuLieu,
              pathBackupCtTk: snap.paths.backupCtTk,
            })
            setPathDuLieu(d.duLieu)
            setPathHdCt(d.hoaDon)
            setPathTk(d.thietKe)
            setPathCoSo(d.coSoDuLieu)
            setPathBackupDuLieu(d.backupDuLieu)
            setPathBackupCtTk(d.backupCtTk)
            setPathUpdateServer(d.pathUpdateServer)
            setPathUpdateClient(d.pathUpdateClient)
            setPathVthhHinh(d.pathVthhHinhAnh)
            if (snap.server) {
              setMeta({
                name: snap.server.name,
                version: snap.server.version,
                webAppVersion: snap.server.webAppVersion,
                installRoot: d.installRoot || undefined,
                pathDuLieu: d.duLieu,
                pathHoaDonChungTu: d.hoaDon,
                pathThietKe: d.thietKe,
                pathCoSoDuLieu: d.coSoDuLieu,
                pathUpdateServer: d.pathUpdateServer,
                pathUpdateClient: d.pathUpdateClient,
              })
            }
            setConnOk(!!snap.connected)
            if (snap.connectionMode === 'LAN' || snap.connectionMode === 'Online') {
              setConnMode(snap.connectionMode === 'LAN' ? 'LAN (mạng nội bộ)' : 'Online (WAN)')
            }
          }
        } catch {
          /* ignore */
        }
      }
      await fetchMeta()
    })()
  }, [fetchMeta])

  return (
    <div style={{ padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Server size={18} color="var(--accent)" />
        <h2 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>Kết nối máy chủ & đường dẫn lưu trữ</h2>
      </div>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 12, maxWidth: 900 }}>
        Trạng thái kết nối tới API Node; chế độ <strong>LAN / Online</strong>; phiên bản server; đường dẫn lưu trữ theo cấu hình
        máy chủ (chỉ xem).
      </p>
      {import.meta.env.DEV && !htqlDevUsesRemoteApi() ? (
        <p style={{ fontSize: '11px', color: '#b45309', marginBottom: 12, maxWidth: 900 }}>
          <strong>Dev:</strong> đang chế độ localhost — API không trỏ tới 192.168.1.68. Để kết nối server thật khi{' '}
          <code>npm run dev</code>, bật <code>VITE_HTQL_DEV_USE_REMOTE_API=1</code> trong{' '}
          <code>.env.development</code> (đã có trong repo) rồi khởi động lại Vite.
        </p>
      ) : null}

      <div style={box}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Trạng thái: </span>
            <span style={{ color: connOk ? '#15803d' : '#b91c1c', fontSize: '12px', fontWeight: 600 }}>
              {loading ? 'Đang kiểm tra…' : connOk ? '● Đã kết nối API' : '● Không kết nối được'}
            </span>
            <span style={{ marginLeft: 12, fontSize: '12px', color: 'var(--text-muted)' }}>
              <strong>Kiểu kết nối:</strong>{' '}
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{connMode || connectionModeLabel()}</span>
            </span>
          </div>
          <button type="button" onClick={() => void fetchMeta()} style={formFooterButtonCancel} disabled={loading}>
            <RefreshCw size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Tải lại từ máy chủ
          </button>
        </div>
        {!loading && meta ? (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
            <div>
              <strong>Phần mềm server:</strong> {meta.name} · API <code>{meta.version}</code>
            </div>
            <div style={{ marginTop: 4 }}>
              <strong>API hiện tại:</strong> <code>{getHtqlApiOrigin() || '(cùng origin / dev)'}</code>
            </div>
            {meta.serverHostName ? (
              <div style={{ marginTop: 4 }}>
                <strong>Tên máy chủ:</strong> <code>{meta.serverHostName}</code>
              </div>
            ) : null}
            {meta.storageBackend ? (
              <div style={{ marginTop: 4 }}>
                <strong>Lưu trữ API:</strong> <code>{meta.storageBackend}</code>
                {meta.mysqlDatabase ? (
                  <>
                    {' '}
                    · DB <code>{meta.mysqlDatabase}</code>
                  </>
                ) : null}
              </div>
            ) : null}
            {meta.demoMode ? (
              <div style={{ marginTop: 6, color: '#b45309', fontWeight: 600 }}>
                ● Chế độ DEMO trên máy chủ (HTQL_DEMO_MODE) — dùng DB/thư mục tách khỏi production nếu cần.
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {meta?.installRoot ? (
            <div>
              <span style={label}>Gốc cài trên máy chủ (INSTALL_ROOT)</span>
              <div style={valueBox}>{meta.installRoot}</div>
            </div>
          ) : null}
          {meta?.ssdRoot ? (
            <div>
              <span style={label}>SSD — gốc đính kèm (HTQL_ROOT_SSD)</span>
              <div style={valueBox}>{meta.ssdRoot}</div>
            </div>
          ) : null}
          <div>
            <span style={label}>Dữ liệu ứng dụng (JSON / HTQL_DATA_DIR)</span>
            <div style={valueBox}>{pathDuLieu || '—'}</div>
          </div>
          <div>
            <span style={label}>Cơ sở dữ liệu (MySQL / SQLite / mô tả trên máy chủ)</span>
            <div style={valueBox}>{pathCoSo || '—'}</div>
          </div>
          <div>
            <span style={label}>Đường dẫn cập nhật server (gói zip)</span>
            <div style={valueBox}>{pathUpdateServer || '—'}</div>
          </div>
          <div>
            <span style={label}>Đường dẫn cập nhật client (.exe / .dmg)</span>
            <div style={valueBox}>{pathUpdateClient || '—'}</div>
          </div>
          <div>
            <span style={label}>File hóa đơn, chứng từ (đính kèm)</span>
            <div style={valueBox}>{pathHdCt || '—'}</div>
          </div>
          <div>
            <span style={label}>File thiết kế</span>
            <div style={valueBox}>{pathTk || '—'}</div>
          </div>
          <div>
            <span style={label}>Ảnh VTHH (Đặc tính — SSD …/vthh)</span>
            <div style={valueBox}>{pathVthhHinh || '—'}</div>
          </div>
          <div>
            <span style={label}>Backup dữ liệu ứng dụng + DB (HDD)</span>
            <div style={valueBox}>{pathBackupDuLieu || '—'}</div>
          </div>
          <div>
            <span style={label}>Backup đồng bộ chứng từ / thiết kế (HDD)</span>
            <div style={valueBox}>{pathBackupCtTk || '—'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
