/**
 * Preload — IPC cho Smart Connect (kết quả quét LAN lúc cài NSIS).
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('htqlDesktop', {
  platform: process.platform,
  isElectron: true,
  /** IPv4 máy trạm (footer «IP Client»). */
  getClientIpv4: () => ipcRenderer.invoke('htql:get-client-ipv4'),
  getInstallDiscovery: () => ipcRenderer.invoke('htql:get-install-discovery'),
  saveServerPathsSnapshot: (payload) => ipcRenderer.invoke('htql:save-server-paths', payload),
  loadServerPathsSnapshot: () => ipcRenderer.invoke('htql:load-server-paths'),
  /** Sau initHtqlApiBase — ghi apiBase cạnh exe + kích hoạt kiểm tra bản cài từ máy chủ */
  notifyResolvedApiBase: (apiBase) => ipcRenderer.invoke('htql:notify-resolved-api-base', apiBase),
  runInstallerUpdateCheck: () => ipcRenderer.invoke('htql:run-installer-update-check'),
  onInstallerDownloadProgress: (cb) => {
    const ch = 'htql-installer-download-progress'
    const listener = (_, data) => cb(data)
    ipcRenderer.on(ch, listener)
    return () => ipcRenderer.removeListener(ch, listener)
  },
})
