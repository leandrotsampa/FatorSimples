import { useSyncExternalStore } from 'react';
import { getPref, setPref } from '../utils/appPrefs';

// Preferências de interface (não fiscais): no desktop ficam no banco, junto com os dados (appPrefs)
export interface UiPrefs {
  soundEnabled: boolean;
  soundVolume: number; // 0 a 1
  sidebar: 'expanded' | 'collapsed';
}

export const DEFAULT_UI_PREFS: UiPrefs = { soundEnabled: true, soundVolume: 0.4, sidebar: 'expanded' };

// Lê o que foi salvo; campo ausente ou fora do formato usa o padrão
export function parseUiPrefs(raw: string | null): UiPrefs {
  if (!raw) return DEFAULT_UI_PREFS;
  try {
    const p = JSON.parse(raw);
    return {
      soundEnabled: typeof p.soundEnabled === 'boolean' ? p.soundEnabled : DEFAULT_UI_PREFS.soundEnabled,
      soundVolume:
        typeof p.soundVolume === 'number' && p.soundVolume >= 0 && p.soundVolume <= 1
          ? p.soundVolume
          : DEFAULT_UI_PREFS.soundVolume,
      sidebar: p.sidebar === 'collapsed' || p.sidebar === 'expanded' ? p.sidebar : DEFAULT_UI_PREFS.sidebar,
    };
  } catch {
    return DEFAULT_UI_PREFS;
  }
}

// Uma única cópia em memória para todos os componentes ficarem em sincronia
let current: UiPrefs | null = null;
const listeners = new Set<() => void>();

export function getUiPrefs(): UiPrefs {
  if (!current) current = parseUiPrefs(getPref('uiPrefs'));
  return current;
}

export function setUiPrefs(patch: Partial<UiPrefs>): void {
  current = { ...getUiPrefs(), ...patch };
  setPref('uiPrefs', JSON.stringify(current));
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUiPrefs(): [UiPrefs, (patch: Partial<UiPrefs>) => void] {
  const prefs = useSyncExternalStore(subscribe, getUiPrefs);
  return [prefs, setUiPrefs];
}
