import { describe, expect, it } from 'vitest';
import { calculateMonthSummary, DEFAULT_SETTINGS } from './taxCalculations';
import type { MonthRecord, TaxSettings } from '../types/tax';

const history: MonthRecord[] = [
  { id: '2026-09', yearMonth: '2026-09', revenue: 26250, payroll: 7481.25, inss: 0, irrf: 0, dasPaid: 0 },
  { id: '2026-10', yearMonth: '2026-10', revenue: 25000, payroll: 7125, inss: 0, irrf: 0, dasPaid: 0 },
];
const withRule = (prolaboreRule: TaxSettings['prolaboreRule']): TaxSettings => ({ ...DEFAULT_SETTINGS, prolaboreRule });

describe('pró-labore de mês sem faturamento informado', () => {
  it('regra de 28% e sem folga não aplicam o piso do salário mínimo: pró-labore e impostos zerados', () => {
    for (const rule of ['auto_28_month', 'exact_rbt12'] as const) {
      const summary = calculateMonthSummary(0, history, withRule(rule), '2026-11');
      expect(summary.prolabore.gross).toBe(0);
      expect(summary.consolidated.prolaboreTaxes).toBe(0);
    }
  });

  it('com faturamento informado, o piso do salário mínimo continua valendo', () => {
    const summary = calculateMonthSummary(3000, history, withRule('auto_28_month'), '2026-11');
    expect(summary.prolabore.gross).toBe(DEFAULT_SETTINGS.minimumWage);
  });

  it('manual e mês salvo seguem o valor informado', () => {
    expect(calculateMonthSummary(0, history, withRule('manual'), '2026-11', 4000).prolabore.gross).toBe(4000);
    expect(calculateMonthSummary(0, history, withRule('auto_28_month'), '2026-11', 4000).prolabore.gross).toBe(4000);
  });
});
