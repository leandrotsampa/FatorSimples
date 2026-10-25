import { describe, expect, it } from 'vitest';
import { shortcutFor, usesCustomWindowControls, windowChromeOptions, windowControlFor } from './windowChrome.cjs';

const key = (k: string, extra: Partial<{ control: boolean; meta: boolean; shift: boolean }> = {}) => ({
  control: false,
  meta: false,
  shift: false,
  key: k,
  ...extra,
});

describe('windowChromeOptions', () => {
  it('no Windows e no Linux esconde a barra e os botões nativos: o app desenha os seus', () => {
    for (const platform of ['win32', 'linux']) {
      const o = windowChromeOptions(platform);
      expect(o.titleBarStyle).toBe('hidden');
      expect('titleBarOverlay' in o).toBe(false);
      expect(usesCustomWindowControls(platform)).toBe(true);
    }
  });

  it('no macOS usa os botões nativos embutidos, sem overlay', () => {
    const o = windowChromeOptions('darwin');
    expect(o.titleBarStyle).toBe('hiddenInset');
    expect('titleBarOverlay' in o).toBe(false);
    expect(usesCustomWindowControls('darwin')).toBe(false);
  });
});

describe('windowControlFor', () => {
  it('aceita só os três comandos da janela', () => {
    expect(windowControlFor('minimize')).toBe('minimize');
    expect(windowControlFor('toggle-maximize')).toBe('toggle-maximize');
    expect(windowControlFor('close')).toBe('close');
  });

  it('qualquer outra coisa vinda da página é ignorada', () => {
    expect(windowControlFor('quit')).toBeNull();
    expect(windowControlFor(undefined)).toBeNull();
    expect(windowControlFor({ action: 'close' })).toBeNull();
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
