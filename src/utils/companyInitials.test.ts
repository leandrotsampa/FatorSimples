import { describe, expect, it } from 'vitest';
import { companyInitials } from './companyInitials';

describe('iniciais da empresa no topo', () => {
  it('usa as duas primeiras palavras, sem o tipo societário', () => {
    expect(companyInitials('Minha Empresa Tech LTDA')).toBe('ME');
    expect(companyInitials('Acme ltda')).toBe('AC');
    expect(companyInitials('João da Silva ME')).toBe('JS');
  });
  it('nome vazio vira um marcador neutro', () => {
    expect(companyInitials('  ')).toBe('FS');
  });
});
