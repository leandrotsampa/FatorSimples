import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPref, initAppPrefs, setPref } from './appPrefs';

const fakeStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
};

describe('desktop: tema, preferências e versão ignorada ficam no banco', () => {
  let storage: ReturnType<typeof fakeStorage>;
  const setAppState = vi.fn(async () => true);
  const desktop = (initial: Record<string, string | null>) =>
    vi.stubGlobal('window', { electronAPI: { isElectron: true, initialAppState: initial, setAppState } });

  beforeEach(() => {
    storage = fakeStorage();
    vi.stubGlobal('localStorage', storage);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    setAppState.mockClear();
  });

  it('o que o banco tem é o que vale', () => {
    desktop({ theme: 'dark', uiPrefs: null, ignoredVersion: null });
    initAppPrefs();
    expect(getPref('theme')).toBe('dark');
  });

  it('migração única: o armazenamento interno vai para o banco e é apagado', () => {
    storage.setItem('fatorsimples_theme_v2', 'dark');
    storage.setItem('fatorsimples_ui_v1', '{"soundEnabled":false}');
    storage.setItem('fatorsimples_ignored_version', '1.4.1');
    desktop({ theme: null, uiPrefs: null, ignoredVersion: null });
    initAppPrefs();
    expect(getPref('theme')).toBe('dark');
    expect(getPref('uiPrefs')).toBe('{"soundEnabled":false}');
    expect(getPref('ignoredVersion')).toBe('1.4.1');
    expect(setAppState).toHaveBeenCalledWith('theme', 'dark');
    expect(storage.getItem('fatorsimples_theme_v2')).toBeNull();
    expect(storage.getItem('fatorsimples_ui_v1')).toBeNull();
    expect(storage.getItem('fatorsimples_ignored_version')).toBeNull();
  });

  it('o banco ganha da cópia antiga, que só é apagada', () => {
    storage.setItem('fatorsimples_theme_v2', 'dark');
    desktop({ theme: 'light', uiPrefs: null, ignoredVersion: null });
    initAppPrefs();
    expect(getPref('theme')).toBe('light');
    expect(setAppState).not.toHaveBeenCalled();
    expect(storage.getItem('fatorsimples_theme_v2')).toBeNull();
  });

  it('valor antigo inválido não vai para o banco', () => {
    storage.setItem('fatorsimples_theme_v2', 'roxo');
    desktop({ theme: null, uiPrefs: null, ignoredVersion: null });
    initAppPrefs();
    expect(getPref('theme')).toBeNull();
    expect(setAppState).not.toHaveBeenCalled();
  });

  it('gravar vai para o banco, não para o armazenamento interno', () => {
    desktop({ theme: null, uiPrefs: null, ignoredVersion: null });
    initAppPrefs();
    setPref('theme', 'dark');
    expect(getPref('theme')).toBe('dark');
    expect(setAppState).toHaveBeenCalledWith('theme', 'dark');
    expect(storage.getItem('fatorsimples_theme_v2')).toBeNull();
  });
});

describe('navegador (sem banco): armazenamento do navegador', () => {
  let storage: ReturnType<typeof fakeStorage>;
  beforeEach(() => {
    storage = fakeStorage();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', {});
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lê e grava no localStorage', () => {
    initAppPrefs();
    setPref('theme', 'dark');
    expect(storage.getItem('fatorsimples_theme_v2')).toBe('dark');
    expect(getPref('theme')).toBe('dark');
  });
});
