import { describe, expect, it } from 'vitest';
import { applyDocumentImport, planDocumentImport } from './documentImport';
import { parsePayments, parsePgdas } from './taxDocuments';
import { PAYMENTS_LINES, PGDAS_LINES } from './taxDocuments.fixtures';
import { DEFAULT_SETTINGS, calculateProlabore, settingsForCompetence } from './taxCalculations';
import { payrollFromDarf } from './documentImport';
import type { MonthRecord } from '../types/tax';

const pgdas = parsePgdas(PGDAS_LINES)!;
const payments = parsePayments(PAYMENTS_LINES)!;
const rec = (yearMonth: string, extra: Partial<MonthRecord> = {}): MonthRecord => ({
  id: `month-${yearMonth}`,
  yearMonth,
  revenue: 10000,
  payroll: 2800,
  inss: 308,
  irrf: 0,
  dasPaid: 600,
  ...extra,
});
const byMonth = (plan: ReturnType<typeof planDocumentImport>, ym: string) => plan.rows.find((r) => r.record.yearMonth === ym)!;

describe('planDocumentImport com o PGDAS-D', () => {
  const plan = planDocumentImport([pgdas], [], DEFAULT_SETTINGS);

  it('cria um mês para cada receita anterior e para a competência declarada', () => {
    expect(plan.rows).toHaveLength(21);
    expect(plan.rows[0].record.yearMonth).toBe('2025-01');
    expect(plan.rows.at(-1)!.record.yearMonth).toBe('2026-09');
    expect(plan.rows.every((r) => r.isNew)).toBe(true);
  });

  it('usa a receita, a folha e o DAS declarados', () => {
    expect(byMonth(plan, '2026-08').record).toMatchObject({ revenue: 33000, payroll: 9000 });
    expect(byMonth(plan, '2026-09').record).toMatchObject({ revenue: 20500, dasPaid: 1500 });
  });

  it('avisa só os meses sem folha que ainda entram no Fator R (os 12 últimos)', () => {
    expect(byMonth(plan, '2026-09').payrollMissing).toBe(true);
    expect(byMonth(plan, '2025-01').payrollMissing).toBe(false);
    expect(byMonth(plan, '2026-08').payrollMissing).toBe(false);
  });

  it('traz os dados da empresa e mostra o que muda', () => {
    expect(plan.company).toEqual({ companyName: 'EMPRESA EXEMPLO DE SISTEMAS LTDA', cnpj: '11.222.333/0001-81', cityState: 'São José dos Pinhais - PR' });
    expect(plan.companyChanges.map((c) => c.label)).toEqual(['Razão social', 'CNPJ', 'Cidade / UF']);
    expect(plan.otherCompany).toBeNull();
  });

  it('confere o RBT12 do app com o da declaração', () => {
    expect(plan.rbt12Check).toEqual({ yearMonth: '2026-09', declared: 244000, app: 244000 });
  });

  it('avisa quando a declaração é de outra empresa já cadastrada', () => {
    const other = planDocumentImport([pgdas], [], { ...DEFAULT_SETTINGS, cnpj: '99.888.777/0001-66' });
    expect(other.otherCompany).toBe('11.222.333/0001-81');
  });

  it('não começa antes da abertura da empresa', () => {
    const late = planDocumentImport([{ ...pgdas, openingDate: '2025-06-10' }], [], DEFAULT_SETTINGS);
    expect(late.rows[0].record.yearMonth).toBe('2025-06');
  });

  it('a declaração mais nova prevalece nos meses em comum', () => {
    const older = { ...pgdas, yearMonth: '2026-08', revenue: 1, previousRevenue: { '2026-07': 1 }, previousPayroll: {} };
    const merged = planDocumentImport([pgdas, older], [], DEFAULT_SETTINGS);
    expect(byMonth(merged, '2026-08').record.revenue).toBe(33000);
    expect(byMonth(merged, '2026-07').record.revenue).toBe(19000);
  });
});

describe('planDocumentImport com o histórico', () => {
  it('atualiza o mês que já existe, mantendo o id e as anotações da pessoa', () => {
    const plan = planDocumentImport([pgdas], [rec('2026-08', { notes: 'nota minha' })], DEFAULT_SETTINGS);
    const row = byMonth(plan, '2026-08');
    expect(row.isNew).toBe(false);
    expect(row.record.id).toBe('month-2026-08');
    expect(row.record.notes).toMatch(/^nota minha · Importado/);
    expect(plan.replaced).toBe(1);
  });

  it('mantém a folha do app quando a declaração não traz a do mês', () => {
    const plan = planDocumentImport([pgdas], [rec('2026-09', { payroll: 5800 })], DEFAULT_SETTINGS);
    expect(byMonth(plan, '2026-09')).toMatchObject({ payrollMissing: false, record: { payroll: 5800, revenue: 20500 } });
  });

  it('deixa de fora meses que não mudam', () => {
    const first = planDocumentImport([pgdas], [], DEFAULT_SETTINGS);
    const history = applyDocumentImport(first, [], DEFAULT_SETTINGS).history;
    expect(planDocumentImport([pgdas], history, DEFAULT_SETTINGS).rows).toHaveLength(0);
  });

  it('troca os meses de exemplo pelos do documento', () => {
    const plan = planDocumentImport([pgdas], [rec('2024-01', { id: 'sample-2024-01' })], DEFAULT_SETTINGS);
    expect(plan.removedSamples).toBe(1);
    const after = applyDocumentImport(plan, [rec('2024-01', { id: 'sample-2024-01' })], DEFAULT_SETTINGS).history;
    expect(after.some((h) => h.id.startsWith('sample-'))).toBe(false);
  });
});

describe('planDocumentImport com os pagamentos', () => {
  it('soma o DAS pago (principal) e reparte o DARF 1410 entre INSS (11% da folha, até o teto) e IRRF', () => {
    const plan = planDocumentImport([pgdas, payments], [], DEFAULT_SETTINGS);
    expect(byMonth(plan, '2026-08').record).toMatchObject({ dasPaid: 2300, inss: 932.31, irrf: 1317.69 });
    expect(byMonth(plan, '2026-07').record.dasPaid).toBe(1350);
    const sep = byMonth(plan, '2026-09');
    expect(sep.record.dasPaid).toBe(1500);
    expect(Math.round((sep.record.inss + sep.record.irrf) * 100) / 100).toBe(700);
  });

  it('pagamentos de meses sem faturamento no app ficam de fora', () => {
    const plan = planDocumentImport([pgdas, payments], [], DEFAULT_SETTINGS);
    expect(plan.rows.some((r) => r.record.yearMonth === '2023-10')).toBe(false);
    expect(plan.paymentsOutside).toBe(1);
  });

  it('sozinhos, completam os meses que já estão no app', () => {
    const plan = planDocumentImport([payments], [rec('2026-08', { payroll: 9000 })], DEFAULT_SETTINGS);
    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0].record).toMatchObject({ revenue: 10000, dasPaid: 2300, inss: 932.31, irrf: 1317.69 });
    expect(plan.company).toBeNull();
  });

  it('avisa quando os pagamentos são de outra empresa', () => {
    const plan = planDocumentImport([payments], [], { ...DEFAULT_SETTINGS, cnpj: '99.888.777/0001-66' });
    expect(plan.otherCompany).toBe('11.222.333/0001-81');
  });
});

describe('applyDocumentImport', () => {
  it('grava os meses e os dados da empresa, mantendo o CNAE', () => {
    const plan = planDocumentImport([pgdas], [rec('2020-01')], DEFAULT_SETTINGS);
    const { history, settings } = applyDocumentImport(plan, [rec('2020-01')], DEFAULT_SETTINGS);
    expect(history).toHaveLength(22);
    expect(settings).toMatchObject({ cnpj: '11.222.333/0001-81', cnae: DEFAULT_SETTINGS.cnae });
  });
});

describe('payrollFromDarf', () => {
  const darfOf = (payroll: number, ym: string) => {
    const p = calculateProlabore(payroll, settingsForCompetence(DEFAULT_SETTINGS, ym));
    return Math.round(p.inss * 100) / 100 + Math.round(p.irrf * 100) / 100;
  };

  it('acha a folha cujo INSS + IRRF dá o DARF pago', () => {
    expect(payrollFromDarf(145.2, '2023-10', DEFAULT_SETTINGS)).toBe(1320);
    const p = payrollFromDarf(darfOf(5980.45, '2025-01'), '2025-01', DEFAULT_SETTINGS)!;
    expect(Math.abs(p - 5980.45)).toBeLessThan(0.05);
  });

  it('não estima sem DARF', () => {
    expect(payrollFromDarf(0, '2025-01', DEFAULT_SETTINGS)).toBeNull();
  });
});

describe('planDocumentImport estimando a folha pelo DARF', () => {
  it('mês sem folha na declaração ganha a folha do DARF e deixa de ser avisado', () => {
    const plan = planDocumentImport([pgdas, payments], [], DEFAULT_SETTINGS);
    const sep = byMonth(plan, '2026-09');
    expect(sep.payrollMissing).toBe(false);
    expect(sep.record.payroll).toBeGreaterThan(0);
    expect(sep.record.notes).toMatch(/folha estimada pelo DARF/);
  });

  it('a folha da declaração prevalece sobre a estimativa', () => {
    const plan = planDocumentImport([pgdas, payments], [], DEFAULT_SETTINGS);
    expect(byMonth(plan, '2026-08').record.payroll).toBe(9000);
  });
});
