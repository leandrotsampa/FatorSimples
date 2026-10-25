import { describe, expect, it } from 'vitest';
import { countUpFrame, INTRO_WINDOW_MS, isFinalFrame, startValueFor } from './useCountUp';

describe('countUpFrame', () => {
  it('começa no valor de origem', () => {
    expect(countUpFrame(0, 100, 0, 450)).toBe(0);
  });

  it('termina exatamente no valor final', () => {
    expect(countUpFrame(0, 100, 450, 450)).toBe(100);
    expect(countUpFrame(0, 100, 9999, 450)).toBe(100);
  });

  it('fica entre os dois valores no meio do caminho, também descendo', () => {
    const v = countUpFrame(50, 10, 225, 450);
    expect(v).toBeGreaterThan(10);
    expect(v).toBeLessThan(50);
  });

  it('ao mudar o alvo no meio da animação, parte do valor exibido e termina no novo alvo', () => {
    const shown = countUpFrame(0, 100, 100, 450);
    expect(shown).toBeGreaterThan(0);
    expect(countUpFrame(shown, 200, 0, 450)).toBe(shown);
    expect(countUpFrame(37.5, 200, 450, 450)).toBe(200);
  });

  it('com duração zero vai direto ao valor final', () => {
    expect(countUpFrame(0, 2169.22, 0, 0)).toBe(2169.22);
  });
});

describe('isFinalFrame', () => {
  it('para quando chega ao alvo', () => {
    expect(isFinalFrame(100, 100)).toBe(true);
    expect(isFinalFrame(99.9, 100)).toBe(false);
  });

  it('para na hora quando o alvo não é um número finito (sem rAF infinito)', () => {
    expect(isFinalFrame(Number.NaN, Number.NaN)).toBe(true);
    expect(isFinalFrame(10, Number.POSITIVE_INFINITY)).toBe(true);
  });
});

describe('startValueFor', () => {
  it('na abertura do app os números contam a partir do zero', () => {
    expect(startValueFor(2169.22, 0)).toBe(0);
    expect(startValueFor(2169.22, INTRO_WINDOW_MS - 1)).toBe(0);
  });

  it('depois da abertura, voltar a uma tela mostra o valor direto, sem recontar', () => {
    expect(startValueFor(2169.22, INTRO_WINDOW_MS)).toBe(2169.22);
    expect(startValueFor(2169.22, 60_000)).toBe(2169.22);
  });
});
