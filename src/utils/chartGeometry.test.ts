import { describe, expect, it } from 'vitest';
import { areaPath, arcPath, clamp, linearScale, linePath, niceTicks, validIndex } from './chartGeometry';

const noNaN = (s: string) => expect(s).not.toContain('NaN');

describe('linearScale', () => {
  it('mapeia o domínio no intervalo', () => {
    const s = linearScale([0, 100], [200, 0]);
    expect(s(0)).toBe(200);
    expect(s(50)).toBe(100);
    expect(s(100)).toBe(0);
  });

  it('com domínio degenerado devolve o meio do intervalo', () => {
    expect(linearScale([5, 5], [0, 100])(5)).toBe(50);
  });
});

describe('linePath / areaPath', () => {
  it('nunca gera NaN, mesmo sem pontos, com 1 ponto, com y iguais ou zerados', () => {
    for (const pts of [[], [{ x: 0, y: 0 }], [{ x: 0, y: 5 }, { x: 10, y: 5 }, { x: 20, y: 5 }], [{ x: 0, y: 0 }, { x: 0, y: 0 }]]) {
      noNaN(linePath(pts));
      noNaN(areaPath(pts, 100));
    }
  });

  it('sem pontos não desenha; com 1 ponto só posiciona', () => {
    expect(linePath([])).toBe('');
    expect(linePath([{ x: 3, y: 4 }])).toBe('M 3 4');
  });

  it('com 2 pontos começa no primeiro e termina no último', () => {
    const d = linePath([{ x: 0, y: 10 }, { x: 100, y: 30 }]);
    expect(d.startsWith('M 0 10')).toBe(true);
    expect(d.endsWith('100 30')).toBe(true);
  });

  it('a curva não ultrapassa os dados entre pontos monotônicos', () => {
    const d = linePath([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 10 }, { x: 30, y: 30 }]);
    const ys = [...d.matchAll(/-?\d+(\.\d+)?/g)].map((m) => Number(m[0])).filter((_, i) => i % 2 === 1);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(30);
  });

  it('a área fecha na linha de base', () => {
    const d = areaPath([{ x: 0, y: 10 }, { x: 50, y: 20 }], 100);
    expect(d).toContain('L 50 100');
    expect(d).toContain('L 0 100');
    expect(d.endsWith('Z')).toBe(true);
  });
});

describe('arcPath', () => {
  it('meia-volta de 180° a 360° passa por cima: da esquerda até a direita', () => {
    const d = arcPath(50, 50, 40, 180, 360);
    expect(d.startsWith('M 10 50')).toBe(true);
    expect(d.endsWith('90 50')).toBe(true);
    noNaN(d);
  });

  it('arco de tamanho zero não gera NaN', () => {
    noNaN(arcPath(50, 50, 40, 180, 180));
  });
});

describe('clamp / niceTicks', () => {
  it('limita ao intervalo', () => {
    expect(clamp(140, 0, 100)).toBe(100);
    expect(clamp(-3, 0, 100)).toBe(0);
  });

  it('marcas redondas para valores em reais', () => {
    expect(niceTicks(26800)).toEqual([0, 10000, 20000, 30000]);
    expect(niceTicks(0)).toEqual([0]);
  });
});

describe('validIndex', () => {
  it('mantém um índice dentro da lista', () => {
    expect(validIndex(3, 12)).toBe(3);
    expect(validIndex(0, 1)).toBe(0);
  });

  it('descarta o índice do mouse que ficou fora quando a lista encolheu (12 → 6 meses)', () => {
    expect(validIndex(10, 6)).toBeNull();
    expect(validIndex(0, 0)).toBeNull();
    expect(validIndex(-1, 6)).toBeNull();
  });

  it('sem mouse continua sem índice', () => {
    expect(validIndex(null, 6)).toBeNull();
  });
});
