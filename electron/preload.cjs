const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  setTitleBarTheme: (theme) => ipcRenderer.invoke('window:set-titlebar-theme', theme),
  openReleasesPage: () => ipcRenderer.invoke('app:open-releases'),
  getRemoteTables: () => ipcRenderer.invoke('sqlite:get-remote-tables'),
  saveRemoteTables: (stored) => ipcRenderer.invoke('sqlite:save-remote-tables', stored),
  getDbPath: () => ipcRenderer.invoke('sqlite:get-db-path'),
  getStorageMode: () => ipcRenderer.invoke('sqlite:get-storage-mode'),
  getHistory: () => ipcRenderer.invoke('sqlite:get-history'),
  saveMonth: (record) => ipcRenderer.invoke('sqlite:save-month', record),
  deleteMonth: (id) => ipcRenderer.invoke('sqlite:delete-month', id),
  clearHistory: () => ipcRenderer.invoke('sqlite:clear-history'),
  getSettings: () => ipcRenderer.invoke('sqlite:get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('sqlite:save-settings', settings),
  openDbFolder: () => ipcRenderer.invoke('sqlite:open-db-folder'),
});
