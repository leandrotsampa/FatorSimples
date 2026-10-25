import { describe, expect, it } from 'vitest';
import { calculateMonthSummary, compareFactorRStrategies, DEFAULT_SETTINGS } from './taxCalculations';
import type { MonthRecord, TaxSettings } from '../types/tax';

const history: MonthRecord[] = Array.from({ length: 11 }, (_, i) => {
  const ym = `2025-${String(i + 1).padStart(2, '0')}`;
  return { id: ym, yearMonth: ym, revenue: 25000, payroll: 7125, inss: 0, irrf: 0, dasPaid: 0 };
});
const summary = (fee?: number) =>
  calculateMonthSummary(26800, history, { ...DEFAULT_SETTINGS, accountingFee: fee } as TaxSettings, '2025-12');

describe('honorários da contabilidade no fechamento do mês', () => {
  it('a conta fecha: pró-labore líquido + lucro transferido + o que fica na conta = faturamento', () => {
    for (const fee of [0, 500]) {
      const c = summary(fee).consolidated;
      expect(c.prolaboreNet + c.taxFreeDividends + c.keepInAccount).toBeCloseTo(26800, 6);
    }
  });

  it('os honorários saem do lucro a transferir e ficam na conta', () => {
    const sem = summary(0).consolidated;
    const com = summary(500).consolidated;
    expect(com.accountingFee).toBe(500);
    expect(sem.taxFreeDividends - com.taxFreeDividends).toBeCloseTo(500, 6);
    expect(com.keepInAccount - sem.keepInAccount).toBeCloseTo(500, 6);
    expect(com.keepInAccount).toBeCloseTo(com.dasAmount + com.prolaboreTaxes + com.dividendWithholding + 500, 6);
  });

  it('o pró-labore e os impostos não mudam por causa dos honorários', () => {
    expect(summary(500).consolidated.prolaboreNet).toBe(summary(0).consolidated.prolaboreNet);
    expect(summary(500).consolidated.dasAmount).toBe(summary(0).consolidated.dasAmount);
  });

  it('honorários maiores que o lucro não deixam o lucro negativo', () => {
    expect(summary(1_000_000).consolidated.taxFreeDividends).toBe(0);
  });

  it('configuração antiga, sem o campo, conta como zero', () => {
    const c = summary(undefined).consolidated;
    expect(c.accountingFee).toBe(0);
    expect(c.taxFreeDividends).toBe(summary(0).consolidated.taxFreeDividends);
  });
});

describe('falta de dinheiro na conta', () => {
  it('sem falta quando o faturamento cobre pró-labore, DAS e contabilidade', () => {
    expect(summary(500).consolidated.shortfall).toBe(0);
  });

  it('honorários acima do que sobra viram falta, com o valor exato', () => {
    const c = summary(1_000_000).consolidated;
    const expected = c.prolaboreGross + c.dasAmount + 1_000_000 - 26800;
    expect(c.shortfall).toBeCloseTo(expected, 6);
    expect(c.shortfall).toBeGreaterThan(0);
  });
});

describe('Comparador com honorários', () => {
  it('o disponível ao sócio desconta a contabilidade, igual à Apuração', () => {
    const sem = compareFactorRStrategies(26800, history, { ...DEFAULT_SETTINGS, accountingFee: 0 } as TaxSettings, '2025-12');
    const com = compareFactorRStrategies(26800, history, { ...DEFAULT_SETTINGS, accountingFee: 500 } as TaxSettings, '2025-12');
    expect(sem.comFatorR.availableToPartner - com.comFatorR.availableToPartner).toBeCloseTo(500, 6);
    expect(sem.semFatorR.availableToPartner - com.semFatorR.availableToPartner).toBeCloseTo(500, 6);
    expect(com.savings).toBeCloseTo(sem.savings, 6);
  });
});
