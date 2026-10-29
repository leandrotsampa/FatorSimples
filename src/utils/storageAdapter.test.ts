import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { storageAdapter } from './storageAdapter';
import { DEFAULT_SETTINGS } from './taxCalculations';
import type { TaxSettings } from '../types/tax';

// Armazenamento do navegador de mentira (o ambiente de teste é Node)
const fakeStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
};

const outraPasta = { ...DEFAULT_SETTINGS, companyName: 'Empresa de outra pasta', accountingFee: 129 } as TaxSettings;

describe('desktop: o banco SQLite é a única fonte dos dados', () => {
  let storage: ReturnType<typeof fakeStorage>;
  const saveSettings = vi.fn(async () => true);

  beforeEach(() => {
    storage = fakeStorage();
    // Dados deixados no armazenamento interno por outra cópia do app neste computador
    storage.setItem('fatorsimples_settings_v2', JSON.stringify(outraPasta));
    storage.setItem('fatorsimples_history_v2', JSON.stringify([{ id: 'x', yearMonth: '2026-09', revenue: 1 }]));
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', {
      electronAPI: {
        isElectron: true,
        getSettings: async () => null, // banco novo: sem configurações
        getHistory: async () => [],
        saveSettings,
      },
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    saveSettings.mockClear();
  });

  it('banco novo começa com as configurações-padrão, não com as de outra pasta', async () => {
    expect(await storageAdapter.loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('banco novo começa sem meses no histórico', async () => {
    expect(await storageAdapter.loadHistory()).toEqual([]);
  });

  it('gravar as configurações vai só para o banco', async () => {
    await storageAdapter.saveSettings(outraPasta);
    expect(saveSettings).toHaveBeenCalledWith(outraPasta);
    expect(storage.getItem('fatorsimples_settings_v2')).toBe(JSON.stringify(outraPasta)); // não reescreveu nada novo
    storage.removeItem('fatorsimples_settings_v2');
    await storageAdapter.saveSettings(outraPasta);
    expect(storage.getItem('fatorsimples_settings_v2')).toBeNull();
  });

  it('as cópias antigas no armazenamento interno são apagadas', () => {
    storageAdapter.forgetLegacyBrowserCopies();
    expect(storage.getItem('fatorsimples_settings_v2')).toBeNull();
    expect(storage.getItem('fatorsimples_history_v2')).toBeNull();
  });
});

describe('navegador (sem Electron): continua no armazenamento do navegador', () => {
  let storage: ReturnType<typeof fakeStorage>;
  beforeEach(() => {
    storage = fakeStorage();
    storage.setItem('fatorsimples_settings_v2', JSON.stringify(outraPasta));
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', {});
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lê e grava no armazenamento do navegador', async () => {
    expect((await storageAdapter.loadSettings()).companyName).toBe('Empresa de outra pasta');
    await storageAdapter.saveSettings(DEFAULT_SETTINGS);
    expect(JSON.parse(storage.getItem('fatorsimples_settings_v2') as string).companyName).toBe(DEFAULT_SETTINGS.companyName);
  });
});
