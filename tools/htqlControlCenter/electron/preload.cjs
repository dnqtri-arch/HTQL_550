const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('htqlControl', {
  getConnection: () => ipcRenderer.invoke('connection:get'),
  onConnectionUpdate: (cb) => {
    const fn = (_, s) => cb(s)
    ipcRenderer.on('connection:update', fn)
    return () => ipcRenderer.removeListener('connection:update', fn)
  },
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (data) => ipcRenderer.invoke('settings:set', data),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
  close: () => ipcRenderer.invoke('window:close'),
  openFile: (opts) => ipcRenderer.invoke('dialog:openFile', opts),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  uploadFile: (localPath, remotePath) => ipcRenderer.invoke('ssh:uploadFile', localPath, remotePath),
  onUploadProgress: (cb) => {
    const fn = (_, p) => cb(p)
    ipcRenderer.on('ssh:uploadProgress', fn)
    return () => ipcRenderer.removeListener('ssh:uploadProgress', fn)
  },
  onSshLog: (cb) => {
    const fn = (_, s) => cb(s)
    ipcRenderer.on('ssh:log', fn)
    return () => ipcRenderer.removeListener('ssh:log', fn)
  },
  runServerUpdate: (payload) => ipcRenderer.invoke('ssh:runServerUpdate', payload),
  uploadClientInstaller: (localPath) => ipcRenderer.invoke('ssh:uploadClientInstaller', localPath),
  pm2Restart: () => ipcRenderer.invoke('ssh:pm2Restart'),
  pm2Logs: () => ipcRenderer.invoke('ssh:pm2Logs'),
  serverMetrics: () => ipcRenderer.invoke('ssh:serverMetrics'),
  journalTail: () => ipcRenderer.invoke('ssh:journalTail'),
  fetchHtqlClientRegistry: () => ipcRenderer.invoke('api:fetchHtqlClientRegistry'),
  fetchHtqlMeta: () => ipcRenderer.invoke('api:fetchHtqlMeta'),
  pullMysqlEnv: () => ipcRenderer.invoke('ssh:pullMysqlEnv'),
  pushMysqlEnv: (payload) => ipcRenderer.invoke('ssh:pushMysqlEnv', payload),
  serverHealth: () => ipcRenderer.invoke('ssh:serverHealth'),
  probeWorkstation: (payload) => ipcRenderer.invoke('net:probeWorkstation', payload),
})
