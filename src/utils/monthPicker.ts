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

// Mês de hoje no formato da competência ("2026-10")
export function currentYearMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Competência que ainda não chegou: não dá para apurar nem lançar
export function isFutureMonth(yearMonth: string, current: string = currentYearMonth()): boolean {
  return yearMonth > current;
}

// Navegação pelo teclado na grade de meses (3 colunas): devolve o novo mês ou null se a tecla não navega.
// Com `max`, nunca passa dele (o mês atual)
export function navigateMonth(yearMonth: string, key: string, max?: string): string | null {
  const next = stepByKey(yearMonth, key);
  if (next === null || !max || next <= max) return next;
  return yearMonth < max ? max : null;
}

function stepByKey(yearMonth: string, key: string): string | null {
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

// Grade de anos do seletor: 12 por página, a mais recente terminando no ano atual
export const YEARS_PER_PAGE = 12;

export function yearPage(pageEnd: number): number[] {
  return Array.from({ length: YEARS_PER_PAGE }, (_, k) => pageEnd - YEARS_PER_PAGE + 1 + k);
}

// Último ano da página que mostra `year`: o ano atual ou de 12 em 12 antes dele
export function pageEndFor(year: number, currentYear: number): number {
  if (year >= currentYear - YEARS_PER_PAGE + 1) return currentYear;
  const pagesBack = Math.ceil((currentYear - YEARS_PER_PAGE + 1 - year) / YEARS_PER_PAGE);
  return currentYear - pagesBack * YEARS_PER_PAGE;
}
