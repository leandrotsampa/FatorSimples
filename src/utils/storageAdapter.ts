import { MonthRecord, TaxSettings } from '../types/tax';
import { DEFAULT_SETTINGS } from './taxCalculations';

const SETTINGS_STORAGE_KEY = 'fatorsimples_settings_v2';
const HISTORY_STORAGE_KEY = 'fatorsimples_history_v2';

export const storageAdapter = {
  /**
   * Indica se a aplicação está rodando dentro do Electron nativo (desktop .exe / .dmg)
   */
  isElectron(): boolean {
    return Boolean(typeof window !== 'undefined' && window.electronAPI?.isElectron);
  },

  /**
   * Obtém o caminho do arquivo físico SQLite caso esteja no Electron
   */
  async getDatabasePath(): Promise<string | null> {
    if (typeof window !== 'undefined' && window.electronAPI?.getDbPath) {
      try {
        return await window.electronAPI.getDbPath();
      } catch (e) {
        console.error('Erro ao obter caminho do SQLite:', e);
      }
    }
    return null;
  },

  /**
   * Carrega as configurações (do SQLite se no Electron, ou do localStorage na web)
   */
  async loadSettings(): Promise<TaxSettings> {
    if (typeof window !== 'undefined' && window.electronAPI?.getSettings) {
      try {
        const settings = await window.electronAPI.getSettings();
        if (settings) {
          return { ...DEFAULT_SETTINGS, ...settings };
        }
      } catch (e) {
        console.error('Erro ao ler settings via SQLite:', e);
      }
    }

    // Fallback Web: localStorage
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SETTINGS;
  },

  /**
   * Salva as configurações (no SQLite se no Electron, e no localStorage na web)
   */
  async saveSettings(settings: TaxSettings): Promise<void> {
    if (typeof window !== 'undefined' && window.electronAPI?.saveSettings) {
      try {
        await window.electronAPI.saveSettings(settings);
      } catch (e) {
        console.error('Erro ao gravar settings via SQLite:', e);
      }
    }

    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Fallback
    }
  },

  /**
   * Carrega o histórico de competências (do SQLite se no Electron, ou do localStorage na web)
   */
  async loadHistory(): Promise<MonthRecord[]> {
    if (typeof window !== 'undefined' && window.electronAPI?.getHistory) {
      try {
        const records = await window.electronAPI.getHistory();
        if (Array.isArray(records)) {
          return records;
        }
      } catch (e) {
        console.error('Erro ao ler histórico via SQLite:', e);
      }
    }

    // Fallback Web: localStorage
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }

    return [];
  },

  /**
   * Salva uma competência no banco (no SQLite se no Electron, e no localStorage na web)
   */
  async saveMonth(record: MonthRecord): Promise<void> {
    if (typeof window !== 'undefined' && window.electronAPI?.saveMonth) {
      try {
        await window.electronAPI.saveMonth(record);
      } catch (e) {
        console.error('Erro ao gravar competência via SQLite:', e);
      }
    }
  },

  /**
   * Deleta uma competência no banco
   */
  async deleteMonth(id: string): Promise<void> {
    if (typeof window !== 'undefined' && window.electronAPI?.deleteMonth) {
      try {
        await window.electronAPI.deleteMonth(id);
      } catch (e) {
        console.error('Erro ao excluir competência via SQLite:', e);
      }
    }
  },

  /**
   * Limpa o histórico no banco
   */
  async clearHistory(): Promise<void> {
    if (typeof window !== 'undefined' && window.electronAPI?.clearHistory) {
      try {
        await window.electronAPI.clearHistory();
      } catch (e) {
        console.error('Erro ao limpar histórico via SQLite:', e);
      }
    }
  },
};
