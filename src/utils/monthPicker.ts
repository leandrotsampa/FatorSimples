import { shiftYearMonth } from './taxCalculations';

export const MONTH_SHORT_NAMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTH_LONG_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// "2026-10" -> "Outubro"
export function monthLongName(yearMonth: string): string {
  return MONTH_LONG_NAMES[Number(yearMonth.slice(5, 7)) - 1] ?? '';
}

// Navegação pelo teclado na grade de meses (3 colunas): devolve o novo mês ou null se a tecla não navega
export function navigateMonth(yearMonth: string, key: string): string | null {
  const month = Number(yearMonth.slice(5, 7));
  switch (key) {
    case 'ArrowLeft':
      return shiftYearMonth(yearMonth, -1);
    case 'ArrowRight':
      return shiftYearMonth(yearMonth, 1);
    case 'ArrowUp':
      return shiftYearMonth(yearMonth, -3);
    case 'ArrowDown':
      return shiftYearMonth(yearMonth, 3);
    case 'Home':
      return shiftYearMonth(yearMonth, 1 - month);
    case 'End':
      return shiftYearMonth(yearMonth, 12 - month);
    case 'PageUp':
      return shiftYearMonth(yearMonth, -12);
    case 'PageDown':
      return shiftYearMonth(yearMonth, 12);
    default:
      return null;
  }
}
