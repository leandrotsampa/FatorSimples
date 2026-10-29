import { describe, expect, it } from 'vitest';
import { shouldShowWelcome } from './welcome';
import { DEFAULT_SETTINGS } from './taxCalculations';
import type { MonthRecord } from '../types/tax';

const month: MonthRecord = { id: 'm', yearMonth: '2026-01', revenue: 1, payroll: 0, inss: 0, irrf: 0, dasPaid: 0 };

describe('shouldShowWelcome', () => {
  it('aparece no app sem nada', () => {
    expect(shouldShowWelcome(null, [], DEFAULT_SETTINGS)).toBe(true);
  });

  it('não volta depois de deixada nem no exemplo', () => {
    expect(shouldShowWelcome('done', [], DEFAULT_SETTINGS)).toBe(false);
    expect(shouldShowWelcome('demo', [], DEFAULT_SETTINGS)).toBe(false);
  });

  it('volta ao sair do exemplo ("Usar o meu")', () => {
    expect(shouldShowWelcome('new', [], DEFAULT_SETTINGS)).toBe(true);
  });

  it('não aparece com meses ou com a empresa cadastrada', () => {
    expect(shouldShowWelcome(null, [month], DEFAULT_SETTINGS)).toBe(false);
    expect(shouldShowWelcome(null, [], { ...DEFAULT_SETTINGS, cnpj: '11.222.333/0001-81' })).toBe(false);
    expect(shouldShowWelcome(null, [], { ...DEFAULT_SETTINGS, companyName: 'Outra LTDA' })).toBe(false);
  });
});
