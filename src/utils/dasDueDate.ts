// Vencimento do DAS: dia 20 do mês seguinte à competência. Sem expediente bancário no dia 20
// (fim de semana ou feriado nacional), passa para o primeiro dia útil seguinte.
// Feriados estaduais e municipais não entram: dependem de onde a empresa está.

// Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano)
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const key = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

// Dias sem expediente bancário no país: feriados nacionais, Carnaval e Sexta-feira Santa
function bankHolidays(year: number): Set<string> {
  const fixed: [number, number][] = [
    [1, 1], // Confraternização Universal
    [4, 21], // Tiradentes
    [5, 1], // Dia do Trabalho
    [9, 7], // Independência
    [10, 12], // Nossa Senhora Aparecida
    [11, 2], // Finados
    [11, 15], // Proclamação da República
    [12, 25], // Natal
  ];
  if (year >= 2024) fixed.push([11, 20]); // Consciência Negra (Lei 14.759/2023)
  const easter = easterSunday(year);
  const dates = [
    ...fixed.map(([m, d]) => new Date(year, m - 1, d)),
    addDays(easter, -48), // Carnaval (segunda)
    addDays(easter, -47), // Carnaval (terça)
    addDays(easter, -2), // Sexta-feira Santa
  ];
  return new Set(dates.map(key));
}

const isBusinessDay = (d: Date) => d.getDay() !== 0 && d.getDay() !== 6 && !bankHolidays(d.getFullYear()).has(key(d));

// "2026-10" -> 23/11/2026 (20/11 é feriado)
export function dasDueDate(competence: string): Date {
  const [y, m] = competence.split('-').map(Number);
  let due = new Date(y, m, 20); // mês seguinte (o Date vira o ano sozinho em dezembro)
  while (!isBusinessDay(due)) due = addDays(due, 1);
  return due;
}

export function formatDueDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
