// Tema, preferências de interface e versão ignorada. No desktop ficam no banco (tabela app_state),
// junto com os dados: copiar o fatorsimples.sqlite leva tudo, e dois portáteis em pastas diferentes
// ficam independentes. O processo principal entrega os valores ao abrir a janela (o tema já entra
// certo, sem piscar). No navegador (npm run dev), ficam no localStorage.
// welcome: tela inicial deixada ("done"), no exemplo ("demo") ou de volta ao começo ("new")
export type PrefKey = 'theme' | 'uiPrefs' | 'ignoredVersion' | 'welcome';

// Onde versões até a 1.4.0 guardavam cada uma, no armazenamento interno do Electron
const LEGACY_KEYS: Record<PrefKey, string> = {
  theme: 'fatorsimples_theme_v2',
  uiPrefs: 'fatorsimples_ui_v1',
  ignoredVersion: 'fatorsimples_ignored_version',
  welcome: 'fatorsimples_welcome',
};
const VALID: Record<PrefKey, (v: string) => boolean> = {
  theme: (v) => v === 'light' || v === 'dark',
  uiPrefs: (v) => v.length <= 4096,
  ignoredVersion: (v) => /^v?\d+\.\d+\.\d+$/.test(v),
  welcome: (v) => /^(done|demo|new)$/.test(v),
};
const KEYS = Object.keys(LEGACY_KEYS) as PrefKey[];

let cache: Partial<Record<PrefKey, string | null>> = {};

const isDesktop = () => typeof window !== 'undefined' && Boolean(window.electronAPI?.setAppState);

const readLegacy = (key: PrefKey) => {
  try {
    return localStorage.getItem(LEGACY_KEYS[key]);
  } catch {
    return null;
  }
};

// Chamado antes de desenhar a tela. No desktop, faz a migração única do armazenamento interno
export function initAppPrefs(): void {
  cache = {};
  if (!isDesktop()) return;
  const initial = window.electronAPI?.initialAppState ?? {};
  for (const key of KEYS) {
    const fromDb = initial[key] ?? null;
    const legacy = readLegacy(key);
    if (fromDb == null && legacy != null && VALID[key](legacy)) {
      cache[key] = legacy;
      void window.electronAPI?.setAppState?.(key, legacy).catch(() => undefined);
    } else {
      cache[key] = fromDb;
    }
    try {
      localStorage.removeItem(LEGACY_KEYS[key]);
    } catch {
      // sem armazenamento: nada a apagar
    }
  }
}

export function getPref(key: PrefKey): string | null {
  if (isDesktop()) return cache[key] ?? null;
  return readLegacy(key);
}

export function setPref(key: PrefKey, value: string): void {
  if (isDesktop()) {
    cache[key] = value;
    void window.electronAPI?.setAppState?.(key, value).catch(() => undefined);
    return;
  }
  try {
    localStorage.setItem(LEGACY_KEYS[key], value);
  } catch {
    // sem armazenamento: vale só nesta abertura
  }
}
