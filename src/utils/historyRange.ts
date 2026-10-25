import type { MonthRecord } from '../types/tax';

export type HistoryRange = '12m' | '6m' | 'year';

// Meses exibidos no gráfico do Histórico, do mais antigo ao mais recente
export function selectHistoryRange(records: MonthRecord[], range: HistoryRange): MonthRecord[] {
  const asc = [...records].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  if (asc.length === 0) return [];
  if (range === '6m') return asc.slice(-6);
  if (range === 'year') {
    const year = asc[asc.length - 1].yearMonth.slice(0, 4);
    return asc.filter((m) => m.yearMonth.startsWith(year));
  }
  return asc.slice(-12);
}
