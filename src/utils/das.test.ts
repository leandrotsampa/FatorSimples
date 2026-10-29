import { describe, expect, it } from 'vitest';
import { ANEXO_III_TABLE, calculateDas, calculateSimplesEffectiveRate, getBracketForRbt12 } from './taxCalculations';

// DAS de declarações reais do PGDAS-D (receita do mês e RBT12 delas)
const dasOf = (revenue: number, rbt12: number) => {
  const bracket = getBracketForRbt12(rbt12, ANEXO_III_TABLE);
  return calculateDas(revenue, calculateSimplesEffectiveRate(rbt12, bracket), 'III', bracket.faixa);
};

describe('calculateDas', () => {
  it('bate ao centavo com o DAS declarado no PGDAS-D', () => {
    expect(dasOf(17500, 211391.25)).toBe(1185.14); // 12/2024 (o total arredondado daria 1.185,13)
    expect(dasOf(20150, 236516.36)).toBe(1459.38); // 12/2025
    expect(dasOf(18928.64, 233928.74)).toBe(1362.63); // 04/2026
    expect(dasOf(18928.64, 243973.1)).toBe(1393.8); // 09/2026 (o total arredondado daria 1.393,81)
  });

  it('reparte entre os tributos como a declaração (Anexo III, faixa 2, 04/2026)', () => {
    // IRPJ 54,51 + CSLL 47,69 + COFINS 191,45 + PIS 41,56 + CPP 591,38 + ISS 436,04
    expect(dasOf(18928.64, 233928.74)).toBeCloseTo(54.51 + 47.69 + 191.45 + 41.56 + 591.38 + 436.04, 2);
  });

  it('sem receita, DAS zero', () => {
    expect(calculateDas(0, 0.07, 'III', 2)).toBe(0);
  });
});
