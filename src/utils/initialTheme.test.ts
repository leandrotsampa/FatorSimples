import { describe, expect, it } from 'vitest';
import { resolveInitialTheme } from './initialTheme';

describe('tema ao abrir o app', () => {
  it('primeira vez: claro', () => {
    expect(resolveInitialTheme(null)).toBe('light');
    expect(resolveInitialTheme('qualquer')).toBe('light');
  });
  it('depois: a escolha salva', () => {
    expect(resolveInitialTheme('dark')).toBe('dark');
    expect(resolveInitialTheme('light')).toBe('light');
  });
});
