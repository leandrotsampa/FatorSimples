import { describe, expect, it } from 'vitest';
import { parsePayments, parsePgdas, readTaxDocument } from './taxDocuments';
import { PAYMENTS_LINES, PGDAS_LINES } from './taxDocuments.fixtures';

describe('parsePgdas', () => {
  const doc = parsePgdas(PGDAS_LINES)!;

  it('lê a competência, a empresa e o estabelecimento', () => {
    expect(doc.yearMonth).toBe('2026-09');
    expect(doc.cnpj).toBe('11.222.333/0001-81');
    expect(doc.companyName).toBe('EMPRESA EXEMPLO DE SISTEMAS LTDA');
    expect(doc.openingDate).toBe('2023-10-04');
    expect(doc.cityState).toBe('São José dos Pinhais - PR');
  });

  it('lê a receita do mês (interno + externo), o RBT12 e o DAS declarado', () => {
    expect(doc.revenue).toBe(20500);
    expect(doc.rbt12).toBe(244000);
    expect(doc.dasDeclared).toBe(1500);
    expect(doc.factorR).toBe(0.28);
    expect(doc.anexo).toBe('III');
  });

  it('soma interno e externo dos meses anteriores', () => {
    expect(Object.keys(doc.previousRevenue)).toHaveLength(20);
    expect(doc.previousRevenue['2025-01']).toBe(21000);
    expect(doc.previousRevenue['2026-08']).toBe(33000);
  });

  it('lê a folha dos 12 meses anteriores', () => {
    expect(Object.keys(doc.previousPayroll)).toHaveLength(12);
    expect(doc.previousPayroll['2025-09']).toBe(5100);
    expect(doc.previousPayroll['2026-08']).toBe(9000);
  });

  it('recusa um documento que não é o PGDAS-D', () => {
    expect(parsePgdas(PAYMENTS_LINES)).toBeNull();
    expect(parsePgdas(['Extrato bancário', '01/2025 | 1.000,00'])).toBeNull();
  });
});

describe('parsePayments', () => {
  const doc = parsePayments(PAYMENTS_LINES)!;

  it('lê o CNPJ e todas as linhas das páginas, sem os cabeçalhos repetidos', () => {
    expect(doc.cnpj).toBe('11.222.333/0001-81');
    expect(doc.payments).toHaveLength(7);
  });

  it('usa o mês do período de apuração (fim de mês ou dia 1) e guarda principal e total', () => {
    expect(doc.payments[0]).toEqual({ paidOn: '2026-10-15', code: '1410', yearMonth: '2026-09', principal: 700, total: 700 });
    expect(doc.payments[1]).toMatchObject({ code: '3333', yearMonth: '2026-09', principal: 1500 });
    expect(doc.payments[3]).toMatchObject({ yearMonth: '2026-08', principal: 2300, total: 2315.9 });
    expect(doc.payments[6]).toMatchObject({ code: '1410', yearMonth: '2023-10', principal: 145.2 });
  });

  it('recusa um documento que não é o relatório de pagamentos', () => {
    expect(parsePayments(PGDAS_LINES)).toBeNull();
  });
});

describe('readTaxDocument', () => {
  it('reconhece cada tipo de documento', () => {
    expect(readTaxDocument(PGDAS_LINES)?.kind).toBe('pgdas');
    expect(readTaxDocument(PAYMENTS_LINES)?.kind).toBe('payments');
    expect(readTaxDocument(['Nota fiscal de serviço'])).toBeNull();
  });
});
