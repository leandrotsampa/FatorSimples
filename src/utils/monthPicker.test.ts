import { describe, expect, it } from 'vitest';
import { currentYearMonth, isFutureMonth, monthLongName, navigateMonth } from './monthPicker';

describe('navigateMonth', () => {
  it('setas laterais andam um mês, atravessando o ano', () => {
    expect(navigateMonth('2026-10', 'ArrowRight')).toBe('2026-11');
    expect(navigateMonth('2026-12', 'ArrowRight')).toBe('2027-01');
    expect(navigateMonth('2026-01', 'ArrowLeft')).toBe('2025-12');
  });

  it('setas verticais andam uma linha da grade (3 meses)', () => {
    expect(navigateMonth('2026-02', 'ArrowDown')).toBe('2026-05');
    expect(navigateMonth('2026-11', 'ArrowDown')).toBe('2027-02');
    expect(navigateMonth('2026-02', 'ArrowUp')).toBe('2025-11');
  });

  it('Home/End vão para janeiro/dezembro do mesmo ano; PageUp/PageDown trocam o ano', () => {
    expect(navigateMonth('2026-07', 'Home')).toBe('2026-01');
    expect(navigateMonth('2026-07', 'End')).toBe('2026-12');
    expect(navigateMonth('2026-07', 'PageUp')).toBe('2025-07');
    expect(navigateMonth('2026-07', 'PageDown')).toBe('2027-07');
  });

  it('outras teclas não navegam', () => {
    expect(navigateMonth('2026-07', 'a')).toBeNull();
    expect(navigateMonth('2026-07', 'Enter')).toBeNull();
  });
});

describe('monthLongName', () => {
  it('nome do mês por extenso', () => {
    expect(monthLongName('2026-10')).toBe('Outubro');
    expect(monthLongName('2026-03')).toBe('Março');
  });
});

describe('competência futura bloqueada', () => {
  it('o mês atual vem da data de hoje', () => {
    expect(currentYearMonth(new Date(2026, 9, 25))).toBe('2026-10');
    expect(currentYearMonth(new Date(2027, 0, 1))).toBe('2027-01');
  });

  it('só meses depois do atual são futuros', () => {
    expect(isFutureMonth('2026-11', '2026-10')).toBe(true);
    expect(isFutureMonth('2027-01', '2026-10')).toBe(true);
    expect(isFutureMonth('2026-10', '2026-10')).toBe(false);
    expect(isFutureMonth('2025-12', '2026-10')).toBe(false);
  });

  it('o teclado na grade não passa do mês atual', () => {
    expect(navigateMonth('2026-09', 'ArrowRight', '2026-10')).toBe('2026-10');
    expect(navigateMonth('2026-10', 'ArrowRight', '2026-10')).toBeNull();
    expect(navigateMonth('2026-08', 'ArrowDown', '2026-10')).toBe('2026-10');
    expect(navigateMonth('2026-03', 'End', '2026-10')).toBe('2026-10');
    expect(navigateMonth('2025-11', 'PageDown', '2026-10')).toBe('2026-10');
    expect(navigateMonth('2026-10', 'ArrowLeft', '2026-10')).toBe('2026-09');
  });
});
