import { describe, expect, it } from 'vitest';
import { parseTransfersDone, toggleTransferDone } from './useTransfersDone';

describe('transferências feitas por competência', () => {
  it('marca e desmarca uma transferência só no mês dela', () => {
    let state = toggleTransferDone({}, '2026-10', 'prolabore');
    expect(state['2026-10']).toEqual({ prolabore: true });
    state = toggleTransferDone(state, '2026-11', 'lucro');
    expect(state['2026-10']).toEqual({ prolabore: true });
    expect(state['2026-11']).toEqual({ lucro: true });
    state = toggleTransferDone(state, '2026-10', 'prolabore');
    expect(state['2026-10']).toEqual({ prolabore: false });
  });

  it('conteúdo salvo inválido vira vazio', () => {
    expect(parseTransfersDone(null)).toEqual({});
    expect(parseTransfersDone('{quebrado')).toEqual({});
    expect(parseTransfersDone('{"2026-10":{"prolabore":true,"x":"sim"},"lixo":5}')).toEqual({ '2026-10': { prolabore: true } });
  });
});
