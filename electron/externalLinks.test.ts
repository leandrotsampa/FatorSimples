import { describe, expect, it } from 'vitest';
import { isAllowedExternalUrl } from './externalLinks.cjs';

describe('links abertos no navegador do sistema', () => {
  it('abre os sites da Receita e do Simples Nacional', () => {
    expect(isAllowedExternalUrl('https://servicos.receitafederal.gov.br/servico/pagamentos')).toBe(true);
    expect(isAllowedExternalUrl('https://www8.receita.fazenda.gov.br/SimplesNacional/')).toBe(true);
    expect(isAllowedExternalUrl('https://github.com/leandrotsampa/FatorSimples/releases/latest')).toBe(true);
  });

  it('recusa outros sites, http e endereços parecidos', () => {
    expect(isAllowedExternalUrl('http://servicos.receitafederal.gov.br/')).toBe(false);
    expect(isAllowedExternalUrl('https://receitafederal.gov.br.golpe.com/')).toBe(false);
    expect(isAllowedExternalUrl('https://exemplo.com/')).toBe(false);
    expect(isAllowedExternalUrl('file:///C:/Windows')).toBe(false);
    expect(isAllowedExternalUrl('não é url')).toBe(false);
  });
});
