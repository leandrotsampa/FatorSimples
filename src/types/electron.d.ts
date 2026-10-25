import { MonthRecord, TaxSettings } from './tax';

export type StorageMode = 'portable' | 'system';

export interface ElectronAPI {
  isElectron: boolean;
  platform?: string;
  // Cor dos botões nativos da janela (minimizar/maximizar/fechar) conforme o tema
  setTitleBarTheme?: (theme: 'dark' | 'light') => Promise<void>;
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
