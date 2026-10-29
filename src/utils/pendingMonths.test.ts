import { describe, expect, it } from 'vitest';
import { pendingMonths } from './pendingMonths';
import type { MonthRecord } from '../types/tax';

const rec = (yearMonth: string, payroll = 5000, revenue = 18000): MonthRecord => ({
  id: yearMonth,
  yearMonth,
  revenue,
  payroll,
  inss: 0,
  irrf: 0,
  dasPaid: 0,
});

describe('pendingMonths', () => {
  it('avisa o mês anterior que ainda não foi salvo', () => {
    expect(pendingMonths([rec('2026-08')], '2026-10').missing).toBe('2026-09');
  });

  it('não avisa com o histórico vazio nem com o mês anterior salvo', () => {
    expect(pendingMonths([], '2026-10').missing).toBeNull();
    expect(pendingMonths([rec('2026-09')], '2026-10').missing).toBeNull();
  });

  it('não avisa quando o histórico só tem meses depois do anterior', () => {
    expect(pendingMonths([rec('2026-10')], '2026-10').missing).toBeNull();
  });

  it('lista os meses dos últimos 12 com faturamento e sem folha', () => {
    const history = [rec('2026-09', 0), rec('2026-08'), rec('2025-09', 0), rec('2026-07', 0, 0)];
    expect(pendingMonths(history, '2026-10').noPayroll).toEqual(['2026-09']);
  });
});
