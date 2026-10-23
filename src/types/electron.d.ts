import { MonthRecord, TaxSettings } from './tax';

export interface ElectronAPI {
  isElectron: boolean;
  getDbPath: () => Promise<string>;
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
