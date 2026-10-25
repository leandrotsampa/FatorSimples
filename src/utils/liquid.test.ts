import { describe, expect, it } from 'vitest';
import { crossScale, edgeSprings, LEAD_SPRING, TRAIL_SPRING } from './liquid';

describe('edgeSprings', () => {
  it('descendo, a ponta de baixo sai na frente e a de cima vem atrás', () => {
    expect(edgeSprings(10, 100)).toEqual({ start: TRAIL_SPRING, end: LEAD_SPRING });
  });

  it('subindo, a ponta de cima sai na frente e a de baixo vem atrás', () => {
    expect(edgeSprings(100, 10)).toEqual({ start: LEAD_SPRING, end: TRAIL_SPRING });
  });

  it('a ponta da frente é mais rápida que a de trás', () => {
    expect(LEAD_SPRING.stiffness).toBeGreaterThan(TRAIL_SPRING.stiffness);
  });
});

describe('crossScale', () => {
  it('parado, mantém a largura', () => {
    expect(crossScale(40, 40)).toBe(1);
  });

  it('esticado, afina para conservar o volume', () => {
    expect(crossScale(160, 40)).toBeCloseTo(0.5, 5);
    expect(crossScale(80, 40)).toBeLessThan(1);
  });

  it('nunca afina demais nem engorda', () => {
    expect(crossScale(4000, 40)).toBe(0.45);
    expect(crossScale(20, 40)).toBe(1);
    expect(crossScale(10, 0)).toBe(1);
  });
});
