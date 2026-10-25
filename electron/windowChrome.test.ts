import { describe, expect, it } from 'vitest';
import { shortcutFor, titleBarOverlayFor, windowChromeOptions } from './windowChrome.cjs';

const key = (k: string, extra: Partial<{ control: boolean; meta: boolean; shift: boolean }> = {}) => ({
  control: false,
  meta: false,
  shift: false,
  key: k,
  ...extra,
});

describe('windowChromeOptions', () => {
  it('no Windows esconde a barra nativa e mantém os botões com 40px de altura', () => {
    const o = windowChromeOptions('win32', 'dark');
    expect(o.titleBarStyle).toBe('hidden');
    expect(o.titleBarOverlay?.height).toBe(40);
  });

  it('no macOS usa os botões nativos embutidos, sem overlay', () => {
    const o = windowChromeOptions('darwin', 'dark');
    expect(o.titleBarStyle).toBe('hiddenInset');
    expect(o.titleBarOverlay).toBeUndefined();
  });
});

describe('titleBarOverlayFor', () => {
  it('usa as cores do cabeçalho em cada tema', () => {
    expect(titleBarOverlayFor('light')).toEqual({ color: '#ffffff', symbolColor: '#334155', height: 40 });
    expect(titleBarOverlayFor('dark')).toEqual({ color: '#0f172a', symbolColor: '#cbd5e1', height: 40 });
  });
});

describe('shortcutFor', () => {
  it('mantém o zoom no app empacotado', () => {
    expect(shortcutFor(key('=', { control: true }), true)).toBe('zoom-in');
    expect(shortcutFor(key('+', { control: true }), true)).toBe('zoom-in');
    expect(shortcutFor(key('-', { control: true }), true)).toBe('zoom-out');
    expect(shortcutFor(key('0', { meta: true }), true)).toBe('zoom-reset');
  });

  it('recarregar e DevTools só existem fora do build', () => {
    expect(shortcutFor(key('r', { control: true }), true)).toBe(null);
    expect(shortcutFor(key('r', { control: true }), false)).toBe('reload');
    expect(shortcutFor(key('I', { control: true, shift: true }), true)).toBe(null);
    expect(shortcutFor(key('I', { control: true, shift: true }), false)).toBe('devtools');
  });

  it('copiar, colar e teclas sem modificador ficam com o Chromium', () => {
    expect(shortcutFor(key('c', { control: true }), true)).toBe(null);
    expect(shortcutFor(key('v', { control: true }), false)).toBe(null);
    expect(shortcutFor(key('='), true)).toBe(null);
  });
});
