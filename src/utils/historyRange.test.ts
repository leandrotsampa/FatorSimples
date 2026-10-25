import { describe, expect, it } from 'vitest';
import { selectHistoryRange } from './historyRange';
import type { MonthRecord } from '../types/tax';

const rec = (ym: string): MonthRecord => ({ id: ym, yearMonth: ym, revenue: 1, payroll: 1, inss: 0, irrf: 0, dasPaid: 0 });
// 2025-06 até 2026-09, fora de ordem
const all = ['2026-09', '2025-06', '2026-01', '2025-12', '2026-05', '2025-09', '2026-03', '2025-07', '2025-08', '2025-10', '2025-11', '2026-02', '2026-04', '2026-06', '2026-07', '2026-08'].map(rec);

describe('selectHistoryRange', () => {
  it('12 meses: os 12 mais recentes, do mais antigo ao mais recente', () => {
    const r = selectHistoryRange(all, '12m').map((m) => m.yearMonth);
    expect(r).toHaveLength(12);
    expect(r[0]).toBe('2025-10');
    expect(r[11]).toBe('2026-09');
  });

  it('6 meses: os 6 mais recentes', () => {
    expect(selectHistoryRange(all, '6m').map((m) => m.yearMonth)).toEqual([
      '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09',
    ]);
  });

  it('ano: os meses do ano da competência mais recente', () => {
    const r = selectHistoryRange(all, 'year').map((m) => m.yearMonth);
    expect(r[0]).toBe('2026-01');
    expect(r).toHaveLength(9);
  });

  it('sem histórico devolve vazio', () => {
    expect(selectHistoryRange([], '12m')).toEqual([]);
    expect(selectHistoryRange([], 'year')).toEqual([]);
  });
});
