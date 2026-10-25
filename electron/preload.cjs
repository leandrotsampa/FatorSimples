const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  windowControl: (action) => ipcRenderer.invoke('window:control', action),
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onWindowMaximized: (callback) => {
    const listener = (event, maximized) => callback(Boolean(maximized));
    ipcRenderer.on('window:maximized', listener);
    return () => ipcRenderer.removeListener('window:maximized', listener);
  },
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
