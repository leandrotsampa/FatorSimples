import { describe, expect, it } from 'vitest';
import { easeOutCubic, instantIf, lerp, prefersReducedMotion } from './motion';

describe('easeOutCubic', () => {
  it('começa em 0 e termina em 1', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it('acelera no início (passa da metade antes de t = 0,5)', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe('lerp', () => {
  it('interpola linearmente', () => {
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });
});

describe('prefersReducedMotion', () => {
  it('é falso fora do navegador', () => {
    expect(typeof window).toBe('undefined');
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('instantIf', () => {
  it('com movimento reduzido a transição vira instantânea', () => {
    expect(instantIf(true, { type: 'spring', stiffness: 400 })).toEqual({ duration: 0 });
  });

  it('sem movimento reduzido mantém a transição original', () => {
    const t = { duration: 0.45 };
    expect(instantIf(false, t)).toBe(t);
  });
});
