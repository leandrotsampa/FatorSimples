import { describe, expect, it } from 'vitest';
import { dasDueDate, formatDueDate } from './dasDueDate';

const due = (competence: string) => formatDueDate(dasDueDate(competence));

describe('vencimento do DAS', () => {
  it('dia 20 do mês seguinte quando é dia útil', () => {
    expect(due('2026-08')).toBe('21/09/2026'); // 20/09/2026 é domingo
    expect(due('2026-09')).toBe('20/10/2026'); // terça
  });

  it('passa para o próximo dia útil no fim de semana', () => {
    expect(due('2026-11')).toBe('21/12/2026'); // 20/12/2026 é domingo
    expect(due('2026-05')).toBe('22/06/2026'); // 20/06/2026 é sábado
  });

  it('passa para o próximo dia útil em feriado nacional', () => {
    expect(due('2026-10')).toBe('23/11/2026'); // 20/11 (Consciência Negra) na sexta
  });

  it('20/11 só é feriado nacional a partir de 2024', () => {
    expect(due('2023-10')).toBe('20/11/2023'); // segunda, ainda não era feriado
  });

  it('pula feriados móveis (Carnaval)', () => {
    expect(due('2028-01')).toBe('21/02/2028'); // 20/02/2028 é domingo; segunda 21/02 não é Carnaval
    expect(due('2023-01')).toBe('22/02/2023'); // 20 e 21/02/2023 Carnaval; quarta de cinzas tem expediente
  });

  it('vira o ano na competência de dezembro', () => {
    expect(due('2026-12')).toBe('20/01/2027');
  });
});
