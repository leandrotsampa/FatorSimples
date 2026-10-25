import { describe, expect, it } from 'vitest';
import { calculateMonthSummary, calculateSlackRelease, DEFAULT_SETTINGS } from './taxCalculations';
import type { MonthRecord, TaxSettings } from '../types/tax';

// Histórico com folha acima de 28% (30%): o mês pode pagar menos pró-labore e manter o Fator R
const history: MonthRecord[] = Array.from({ length: 11 }, (_, i) => {
  const ym = `2025-${String(i + 1).padStart(2, '0')}`;
  return { id: ym, yearMonth: ym, revenue: 25000, payroll: 7500, inss: 0, irrf: 0, dasPaid: 0 };
});
const settings = { ...DEFAULT_SETTINGS, prolaboreRule: 'auto_28_month' } as TaxSettings;
const youGet = (s: ReturnType<typeof calculateMonthSummary>) => s.consolidated.prolaboreNet + s.consolidated.taxFreeDividends;

describe('tirar a folga do pró-labore', () => {
  it('passa a usar o pró-labore mínimo e diz quanto a mais vai para você', () => {
    const atual = calculateMonthSummary(26800, history, settings, '2025-12');
    const minimo = calculateMonthSummary(26800, history, { ...settings, prolaboreRule: 'exact_rbt12' }, '2025-12');
    const r = calculateSlackRelease(26800, history, settings, '2025-12', atual);

    expect(r.minProlabore).toBeCloseTo(minimo.prolabore.gross, 6);
    expect(r.minProlabore).toBeLessThan(atual.prolabore.gross);
    expect(r.extraForYou).toBeCloseTo(youGet(minimo) - youGet(atual), 6);
    expect(r.extraForYou).toBeGreaterThan(0);
    // O Fator R da próxima competência continua garantido
    expect(minimo.next.isQualifiedForAnexo3).toBe(true);
  });

  it('já no mínimo: não há folga para tirar', () => {
    const noMinimo = { ...settings, prolaboreRule: 'exact_rbt12' } as TaxSettings;
    const atual = calculateMonthSummary(26800, history, noMinimo, '2025-12');
    const r = calculateSlackRelease(26800, history, noMinimo, '2025-12', atual);
    expect(r.extraForYou).toBeCloseTo(0, 6);
  });
});
