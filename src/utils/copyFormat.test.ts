import { describe, expect, it } from 'vitest';
import { formatForCopy } from './copyFormat';

describe('formatForCopy', () => {
  it('alíquota para colar na nota: duas casas, vírgula, sem %', () => {
    expect(formatForCopy(8.0912, 'percent')).toBe('8,09');
    expect(formatForCopy(15.5, 'percent')).toBe('15,50');
  });

  it('valor para colar no banco: milhar com ponto, centavos com vírgula, sem R$', () => {
    expect(formatForCopy(5750.694, 'money')).toBe('5.750,69');
    expect(formatForCopy(17126.78, 'money')).toBe('17.126,78');
    expect(formatForCopy(0, 'money')).toBe('0,00');
  });

  it('valor inválido vira zero, nunca "NaN"', () => {
    expect(formatForCopy(Number.NaN, 'money')).toBe('0,00');
  });
});
