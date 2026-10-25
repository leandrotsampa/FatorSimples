import { describe, expect, it } from 'vitest';
import { DEFAULT_UI_PREFS, parseUiPrefs } from './useUiPrefs';

describe('parseUiPrefs', () => {
  it('sem nada salvo usa o padrão: sons desligados, volume 40%, menu recolhido', () => {
    expect(parseUiPrefs(null)).toEqual({ soundEnabled: false, soundVolume: 0.4, sidebar: 'collapsed' });
    expect(DEFAULT_UI_PREFS).toEqual({ soundEnabled: false, soundVolume: 0.4, sidebar: 'collapsed' });
  });

  it('JSON inválido volta ao padrão', () => {
    expect(parseUiPrefs('{quebrado')).toEqual(DEFAULT_UI_PREFS);
  });

  it('mantém o que foi salvo e completa o que faltar', () => {
    expect(parseUiPrefs('{"sidebar":"expanded"}')).toEqual({ ...DEFAULT_UI_PREFS, sidebar: 'expanded' });
  });

  it('descarta valores fora do formato', () => {
    expect(parseUiPrefs('{"sidebar":"gigante","soundVolume":7,"soundEnabled":"sim"}')).toEqual(DEFAULT_UI_PREFS);
  });
});
