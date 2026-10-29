// Lembretes do mês: o anterior ainda não salvo e os meses recentes sem folha. Os dois mudam o
// Fator R e o RBT12 do mês em apuração
import type { MonthRecord } from '../types/tax';
import { shiftYearMonth as shift } from './taxCalculations';


export function pendingMonths(history: MonthRecord[], competence: string): { missing: string | null; noPayroll: string[] } {
  const previous = shift(competence, -1);
  const months = new Set(history.map((h) => h.yearMonth));
  // Só cobra o anterior de quem já usa o Histórico até antes dele
  const hasOlder = history.some((h) => h.yearMonth < previous);
  const from = shift(competence, -12);
  const noPayroll = history
    .filter((h) => h.yearMonth >= from && h.yearMonth < competence && h.revenue > 0 && h.payroll <= 0)
    .map((h) => h.yearMonth)
    .sort();
  return { missing: hasOlder && !months.has(previous) ? previous : null, noPayroll };
}
