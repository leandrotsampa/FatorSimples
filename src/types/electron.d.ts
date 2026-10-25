import { MonthRecord, TaxSettings } from './tax';

export type StorageMode = 'portable' | 'system';

export interface ElectronAPI {
  isElectron: boolean;
  platform?: string;
  // Botões da janela desenhados pelo app (Windows e Linux)
  windowControl?: (action: 'minimize' | 'toggle-maximize' | 'close') => Promise<void>;
  isWindowMaximized?: () => Promise<boolean>;
  // Avisa quando a janela maximiza ou restaura; devolve a função que para de ouvir
  onWindowMaximized?: (callback: (maximized: boolean) => void) => () => void;
  // Abre a página de versões do FatorSimples no navegador do sistema
  openReleasesPage?: () => Promise<void>;
  // Tabelas fiscais baixadas do GitHub, guardadas no banco
  getRemoteTables?: () => Promise<unknown>;
  saveRemoteTables?: (stored: { doc: unknown; checkedAt: string | null }) => Promise<boolean>;
  getDbPath: () => Promise<string>;
  // 'portable' = banco ao lado do app (Windows/Linux); 'system' = pasta de dados do sistema (macOS)
  getStorageMode?: () => Promise<StorageMode>;
  getHistory: () => Promise<MonthRecord[]>;
  saveMonth: (record: MonthRecord) => Promise<boolean>;
  deleteMonth: (id: string) => Promise<boolean>;
  clearHistory: () => Promise<boolean>;
  getSettings: () => Promise<TaxSettings | null>;
  saveSettings: (settings: TaxSettings) => Promise<boolean>;
  openDbFolder?: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
