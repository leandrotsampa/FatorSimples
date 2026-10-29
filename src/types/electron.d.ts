import { MonthRecord, TaxSettings } from './tax';

export type StorageMode = 'portable' | 'system';
export type AppStateKey = 'tour' | 'theme' | 'uiPrefs' | 'ignoredVersion';

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
  // Estado do app guardado junto com os dados (ex.: 'tour', o que o tutorial já mostrou)
  getAppState?: (key: AppStateKey) => Promise<string | null>;
  setAppState?: (key: AppStateKey, value: string) => Promise<boolean>;
  // Valores do banco entregues ao abrir a janela (o tema entra antes do primeiro desenho)
  initialAppState?: Partial<Record<AppStateKey, string | null>>;
  // Problema ao abrir o banco: o app mostra uma tela de erro em vez de gravar em outro lugar
  storageError?: { message: string; dbPath: string } | null;
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
  // Reinicia o app (botão "Tentar de novo" da tela de erro do banco)
  relaunchApp?: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
