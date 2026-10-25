import { describe, expect, it } from 'vitest';
import { resolveSidebarMode, SIDEBAR_COLLAPSE_BELOW } from './sidebarMode';

describe('resolveSidebarMode', () => {
  it('em janela larga segue a preferência salva', () => {
    expect(resolveSidebarMode('expanded', 1280, false)).toBe('expanded');
    expect(resolveSidebarMode('collapsed', 1280, false)).toBe('collapsed');
  });

  it('na janela do app desktop (mínimo de 980px, notebook com escala) o menu expandido continua expandido', () => {
    expect(resolveSidebarMode('expanded', 980, false)).toBe('expanded');
    expect(resolveSidebarMode('expanded', 1077, false)).toBe('expanded');
  });

  it('só em tela muito estreita recolhe sozinho e expandir abre por cima do conteúdo', () => {
    expect(resolveSidebarMode('expanded', 800, false)).toBe('collapsed');
    expect(resolveSidebarMode('expanded', 800, true)).toBe('overlay');
    expect(resolveSidebarMode('collapsed', SIDEBAR_COLLAPSE_BELOW - 1, true)).toBe('overlay');
  });

  it('o limite fica abaixo da largura mínima da janela (980px)', () => {
    expect(SIDEBAR_COLLAPSE_BELOW).toBe(900);
    expect(resolveSidebarMode('expanded', 900, false)).toBe('expanded');
  });
});
