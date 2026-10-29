import { describe, expect, it } from 'vitest';
import { clockKey } from './useClock';

describe('relógio do app aberto por muito tempo', () => {
  it('muda quando vira a hora (a saudação troca de "Bom dia" para "Boa tarde")', () => {
    expect(clockKey(new Date(2026, 9, 29, 11, 59))).not.toBe(clockKey(new Date(2026, 9, 29, 12, 0)));
  });
  it('muda quando vira o dia e o mês (mês atual e meses futuros bloqueados)', () => {
    expect(clockKey(new Date(2026, 9, 31, 23, 59))).not.toBe(clockKey(new Date(2026, 10, 1, 0, 0)));
  });
  it('não muda dentro da mesma hora (sem redesenhar à toa)', () => {
    expect(clockKey(new Date(2026, 9, 29, 14, 1))).toBe(clockKey(new Date(2026, 9, 29, 14, 58)));
  });
});
