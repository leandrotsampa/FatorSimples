import { MonthRecord, TaxSettings } from '../types/tax';
import { DEFAULT_SETTINGS } from './taxCalculations';
import type { StorageMode } from '../types/electron';

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
   * Onde o banco está: ao lado do app (portátil) ou na pasta de dados do sistema (macOS)
   */
  async getStorageMode(): Promise<StorageMode> {
    if (typeof window !== 'undefined' && window.electronAPI?.getStorageMode) {
      try {
        return await window.electronAPI.getStorageMode();
      } catch (e) {
        console.error('Erro ao obter o modo de armazenamento:', e);
      }
    }
    return 'portable';
  },

  /**
   * Desktop: apaga as cópias de configurações e histórico que versões antigas guardavam no
   * armazenamento interno do Electron (comum a todas as cópias do app no computador)
   */
  forgetLegacyBrowserCopies(): void {
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // sem armazenamento: nada a apagar
    }
  },

  /**
   * Carrega as configurações. No desktop, só do SQLite: banco novo começa com o padrão (o
   * armazenamento interno do Electron é comum a todas as cópias do app no computador e não vale
   * como dado). No navegador, do localStorage
   */
  async loadSettings(): Promise<TaxSettings> {
    if (typeof window !== 'undefined' && window.electronAPI?.getSettings) {
      try {
        const settings = await window.electronAPI.getSettings();
        return settings ? { ...DEFAULT_SETTINGS, ...settings } : DEFAULT_SETTINGS;
      } catch (e) {
        console.error('Erro ao ler settings via SQLite:', e);
        return DEFAULT_SETTINGS;
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
   * Salva as configurações: no desktop, só no SQLite; no navegador, no localStorage
   */
  async saveSettings(settings: TaxSettings): Promise<void> {
    if (typeof window !== 'undefined' && window.electronAPI?.saveSettings) {
      try {
        await window.electronAPI.saveSettings(settings);
      } catch (e) {
        console.error('Erro ao gravar settings via SQLite:', e);
      }
      return;
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
        return Array.isArray(records) ? records : [];
      } catch (e) {
        console.error('Erro ao ler histórico via SQLite:', e);
        return [];
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
   * Vários meses de uma vez (importação, exemplo), numa transação só no SQLite: ou entra tudo ou
   * nada. Na web o histórico é gravado inteiro pelo App, então não há o que fazer aqui
   */
  async replaceMonths(changes: { clear?: boolean; remove?: string[]; save?: MonthRecord[] }): Promise<boolean> {
    if (typeof window !== 'undefined' && window.electronAPI?.replaceMonths) {
      try {
        return await window.electronAPI.replaceMonths(changes);
      } catch (e) {
        console.error('Erro ao gravar as competências via SQLite:', e);
        return false;
      }
    }
    return true;
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
