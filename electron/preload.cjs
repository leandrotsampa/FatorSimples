const { contextBridge, ipcRenderer } = require('electron');

// Tema, preferências e tutorial do banco entregues ao abrir a janela (o tema entra antes do primeiro
// desenho), e o problema ao abrir o banco, se houver
let initial = { state: {}, storageError: null };
try {
  initial = ipcRenderer.sendSync('app-state:initial') || initial;
} catch (e) {}

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  initialAppState: initial.state,
  storageError: initial.storageError,
  platform: process.platform,
  windowControl: (action) => ipcRenderer.invoke('window:control', action),
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onWindowMaximized: (callback) => {
    const listener = (event, maximized) => callback(Boolean(maximized));
    ipcRenderer.on('window:maximized', listener);
    return () => ipcRenderer.removeListener('window:maximized', listener);
  },
  openReleasesPage: () => ipcRenderer.invoke('app:open-releases'),
  relaunchApp: () => ipcRenderer.invoke('app:relaunch'),
  getAppState: (key) => ipcRenderer.invoke('sqlite:get-app-state', key),
  setAppState: (key, value) => ipcRenderer.invoke('sqlite:set-app-state', key, value),
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
