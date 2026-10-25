import { describe, expect, it } from 'vitest';
import { resolveSidebarMode, SIDEBAR_COLLAPSE_BELOW } from './sidebarMode';

describe('resolveSidebarMode', () => {
  it('em janela larga segue a preferência salva', () => {
    expect(resolveSidebarMode('expanded', 1280, false)).toBe('expanded');
    expect(resolveSidebarMode('collapsed', 1280, false)).toBe('collapsed');
  });

  it('em janela estreita recolhe sozinho', () => {
    expect(resolveSidebarMode('expanded', 1000, false)).toBe('collapsed');
  });

  it('em janela estreita, expandir abre por cima do conteúdo', () => {
    expect(resolveSidebarMode('expanded', 1000, true)).toBe('overlay');
    expect(resolveSidebarMode('collapsed', SIDEBAR_COLLAPSE_BELOW - 1, true)).toBe('overlay');
  });

  it('o limite é 1100px', () => {
    expect(SIDEBAR_COLLAPSE_BELOW).toBe(1100);
    expect(resolveSidebarMode('expanded', 1100, false)).toBe('expanded');
  });
});
