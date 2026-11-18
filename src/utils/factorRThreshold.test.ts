import { describe, expect, it } from 'vitest';
import { calculateFactorRMargin, calculateMonthSummary, DEFAULT_SETTINGS, meetsFactorR } from './taxCalculations';
import type { MonthRecord, TaxSettings } from '../types/tax';

// Histórico dos dados de exemplo (dez/2025 a out/2026): com faturamento de R$ 25.114,00 em nov/2026,
// o pró-labore "sem folga" (R$ 5.650,67) leva o Fator R de dez/2026 a 27,999999999999996% em ponto flutuante
const rows: [string, number, number][] = [
  ['2025-12', 26250, 7481.25],
  ['2026-01', 25000, 7125],
  ['2026-02', 23750, 6768.75],
  ['2026-03', 26250, 7481.25],
  ['2026-04', 25000, 7125],
  ['2026-05', 23750, 6768.75],
  ['2026-06', 26250, 7481.25],
  ['2026-07', 25000, 7125],
  ['2026-08', 23750, 6768.75],
  ['2026-09', 26250, 7481.25],
  ['2026-10', 25000, 7125],
];
const history: MonthRecord[] = rows.map(([yearMonth, revenue, payroll]) => ({
  id: yearMonth,
  yearMonth,
  revenue,
  payroll,
  inss: 0,
  irrf: 0,
  dasPaid: 0,
}));
const settings: TaxSettings = { ...DEFAULT_SETTINGS, prolaboreRule: 'exact_rbt12' };

describe('Fator R no limite de 28%', () => {
  it('pró-labore sem folga mantém o Anexo III na próxima competência', () => {
    const summary = calculateMonthSummary(25114, history, settings, '2026-11');
    expect(summary.prolabore.gross).toBe(5650.67);
    expect(summary.next.isQualifiedForAnexo3).toBe(true);
  });

  it('folga do pró-labore sem folga é zero, sem sinal negativo', () => {
    const margin = calculateFactorRMargin(25114, 5650.67, history, settings, '2026-11');
    expect(margin.isNextQualified).toBe(true);
    expect(margin.prolaboreMargin).toBe(0);
    expect(Object.is(margin.prolaboreMargin, -0)).toBe(false);
  });

  it('tolera só o resíduo de ponto flutuante', () => {
    expect(meetsFactorR(0.28)).toBe(true);
    expect(meetsFactorR(0.27999999999999996)).toBe(true);
    expect(meetsFactorR(0.2799)).toBe(false);
  });
});
