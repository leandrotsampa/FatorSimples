import { describe, expect, it } from 'vitest';
import { competenceInputs } from './competenceInputs';
import { calculateGoldRuleProlabore, DEFAULT_SETTINGS } from './taxCalculations';
import type { MonthRecord } from '../types/tax';

const record = (revenue: number, payroll: number): MonthRecord => ({
  id: 'r',
  yearMonth: '2026-09',
  revenue,
  payroll,
  inss: 0,
  irrf: 0,
  dasPaid: 0,
});

describe('competenceInputs', () => {
  it('competência em apuração começa zerada na regra dos 28%', () => {
    expect(competenceInputs(undefined, DEFAULT_SETTINGS)).toEqual({
      revenue: 0,
      rule: 'auto_28_month',
      manualProlabore: 0,
    });
  });

  it('mês salvo com pró-labore de 28% volta na regra dos 28%', () => {
    const gold = calculateGoldRuleProlabore(26800, DEFAULT_SETTINGS);
    expect(competenceInputs(record(26800, gold), DEFAULT_SETTINGS)).toEqual({
      revenue: 26800,
      rule: 'auto_28_month',
      manualProlabore: gold,
    });
  });

  it('mês salvo com outro pró-labore volta no manual com o valor gravado', () => {
    expect(competenceInputs(record(100000, 20000), DEFAULT_SETTINGS)).toEqual({
      revenue: 100000,
      rule: 'manual',
      manualProlabore: 20000,
    });
  });
});
