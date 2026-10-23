const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
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
