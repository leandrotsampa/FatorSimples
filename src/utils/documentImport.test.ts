import { describe, expect, it } from 'vitest';
import { applyDocumentImport, planDocumentImport } from './documentImport';
import { parsePayments, parsePgdas } from './taxDocuments';
import { PAYMENTS_LINES, PGDAS_LINES } from './taxDocuments.fixtures';
import { DEFAULT_SETTINGS, calculateProlabore, hasFullWindow, settingsForCompetence, shiftYearMonth } from './taxCalculations';
import { inssFromDarf, isPayrollEstimated, payrollFromDarf } from './documentImport';
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

  it('marca todo mês sem folha (a declaração só traz a dos 12 meses anteriores)', () => {
    expect(byMonth(plan, '2026-09').payrollMissing).toBe(true);
    expect(byMonth(plan, '2025-01').payrollMissing).toBe(true);
    expect(byMonth(plan, '2026-08').payrollMissing).toBe(false);
  });

  it('pede também a declaração que traz a folha dos meses sem folha antigos', () => {
    const fromDeclarations = planDocumentImport([pgdas], [], DEFAULT_SETTINGS, '2026-10').missingDeclarations;
    expect(fromDeclarations.map((d) => d.yearMonth)).toEqual(['2026-10', '2026-01']);
    expect(fromDeclarations[1]).toMatchObject({ available: true, affectsCurrent: false });
    expect(fromDeclarations[1].months[0]).toBe('2025-01');
  });

  it('traz os dados da empresa e mostra o que muda', () => {
    expect(plan.company).toEqual({ companyName: 'EMPRESA EXEMPLO DE SISTEMAS LTDA', cnpj: '11.222.333/0001-81', cityState: 'São José dos Pinhais - PR' });
    expect(plan.companyChanges.map((c) => c.label)).toEqual(['Razão social', 'CNPJ', 'Cidade / UF']);
    expect(plan.otherCompany).toBeNull();
  });

  it('confere o RBT12 do app com o da declaração', () => {
    expect(plan.rbt12Check).toEqual({ yearMonth: '2026-09', declared: 244000, app: 244000 });
  });

  it('confere o anexo do app com o da declaração', () => {
    expect(plan.anexoCheck).toMatchObject({ yearMonth: '2026-09', declared: 'III' });
  });

  it('não inventa DAS sem os 12 meses anteriores completos no histórico', () => {
    // Só a declaração: os meses de 2025 não têm o ano anterior, e a folha de antes de set/2025 não vem
    expect(byMonth(plan, '2025-01').record.dasPaid).toBe(0);
    expect(byMonth(plan, '2026-08').record.dasPaid).toBe(0);
    // O mês declarado mantém o DAS da declaração
    expect(byMonth(plan, '2026-09').record.dasPaid).toBe(1500);
  });

  it('mostra só o valor novo da empresa quando o app ainda está com os dados de exemplo', () => {
    expect(plan.companyChanges.every((c) => c.from === '')).toBe(true);
    const named = planDocumentImport([pgdas], [], { ...DEFAULT_SETTINGS, companyName: 'Nome antigo' });
    expect(named.companyChanges.find((c) => c.label === 'Razão social')).toMatchObject({ from: 'Nome antigo' });
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

  it('prefere 28% da receita do mês, depois reais inteiros, dentro da faixa que dá o DARF', () => {
    // 28% de R$ 21.800 = R$ 6.104,00: o meio da faixa ficaria centavos abaixo e o Fator R, em 27,99%
    expect(payrollFromDarf(darfOf(6104, '2025-06'), '2025-06', DEFAULT_SETTINGS, 21800)).toBe(6104);
    expect(payrollFromDarf(darfOf(5980.45, '2025-01'), '2025-01', DEFAULT_SETTINGS, 21358.75)).toBe(5980.45);
    expect(payrollFromDarf(darfOf(5302, '2026-09'), '2026-09', DEFAULT_SETTINGS, 18928.64)).toBe(5302);
    expect(payrollFromDarf(darfOf(5544, '2025-04'), '2025-04', DEFAULT_SETTINGS)).toBe(5544);
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

describe('folhas estimadas pelo DARF', () => {
  it('aceita 28% da receita mesmo com o DARF 1 ou 2 centavos diferente (arredondamento da retenção)', () => {
    const paid = darfOfFor(5980.45, '2025-01') - 0.01;
    expect(payrollFromDarf(paid, '2025-01', DEFAULT_SETTINGS, 21358.75)).toBe(5980.45);
  });

  it('lista os meses estimados e pede a declaração que traz a folha real deles', () => {
    const plan = planDocumentImport([pgdas, payments], [], DEFAULT_SETTINGS, '2026-10');
    expect(plan.estimatedPayroll).toEqual(['2026-09']);
    // A de 10/2026 só existe depois que outubro acaba; a de 01/2026 traz a folha dos meses de 2025
    // que ficaram sem folha (sem DARF nos pagamentos do exemplo)
    expect(plan.missingDeclarations[0]).toEqual({ yearMonth: '2026-10', months: ['2026-09'], available: false, affectsCurrent: true });
    expect(plan.missingDeclarations[1]).toMatchObject({ yearMonth: '2026-01', available: true, affectsCurrent: false });
    expect(planDocumentImport([pgdas, payments], [], DEFAULT_SETTINGS, '2026-11').missingDeclarations[0].available).toBe(true);
  });

  it('meses antigos estimados pedem a declaração de 12 meses depois', () => {
    const old = { ...pgdas, previousRevenue: { '2025-01': 20000, '2025-02': 20000 }, previousPayroll: {} };
    const pays = { kind: 'payments' as const, payments: [
      { code: '1410', yearMonth: '2025-01', principal: 1000 },
      { code: '1410', yearMonth: '2025-02', principal: 1000 },
    ] };
    const plan = planDocumentImport([old, pays], [], DEFAULT_SETTINGS, '2026-10');
    expect(plan.estimatedPayroll).toEqual(['2025-01', '2025-02']);
    expect(plan.missingDeclarations).toEqual([
      // O mês declarado fica sem folha: ela vem na declaração seguinte, que ainda não existe, e muda a apuração de hoje
      { yearMonth: '2026-10', months: ['2026-09'], available: false, affectsCurrent: true },
      // Folhas de 2025 só mudam meses já apurados: corrigem o Histórico
      { yearMonth: '2026-01', months: ['2025-01', '2025-02'], available: true, affectsCurrent: false },
    ]);
  });

  it('o mês importado guarda que a folha é estimada', () => {
    const plan = planDocumentImport([pgdas, payments], [], DEFAULT_SETTINGS);
    expect(isPayrollEstimated(byMonth(plan, '2026-09').record)).toBe(true);
    expect(isPayrollEstimated(byMonth(plan, '2026-08').record)).toBe(false);
  });
});

function darfOfFor(payroll: number, ym: string) {
  const p = calculateProlabore(payroll, settingsForCompetence(DEFAULT_SETTINGS, ym));
  return Math.round((Math.round(p.inss * 100) / 100 + Math.round(p.irrf * 100) / 100) * 100) / 100;
}

describe('inssFromDarf', () => {
  it('usa 11% da folha quando o DARF fecha com ela', () => {
    // set/2026: pró-labore de R$ 5.302,00, DARF de R$ 692,87 (INSS 583,22 + IRRF 109,65)
    expect(inssFromDarf(692.87, 5302, '2026-09', DEFAULT_SETTINGS, 18928.64)).toBe(583.22);
  });

  it('mantém a folha quando a diferença é só da tabela do IRRF', () => {
    // jan/2024 ainda usava a tabela de 2023: o DARF passa R$ 19,33 do que o app calcula
    expect(inssFromDarf(831.11, 4781, '2024-01', DEFAULT_SETTINGS, 17073.75)).toBe(525.91);
  });

  it('usa o pró-labore da guia quando a folha declarada é maior que ele', () => {
    // jul/2024: folha de R$ 5.751,65 no PGDAS-D, mas a guia é de um pró-labore de R$ 4.900,00
    expect(inssFromDarf(851.65, 5751.65, '2024-07', DEFAULT_SETTINGS, 17500)).toBe(539);
  });

  it('sem folha, o DARF inteiro fica como INSS até haver o pró-labore', () => {
    expect(inssFromDarf(145.2, 0, '2023-10', DEFAULT_SETTINGS)).toBe(145.2);
  });
});

describe('payrollFromDarf com os 28% da receita', () => {
  it('arredonda os 28% para cima no centavo, como a regra do app', () => {
    // fev/2025: 28% de R$ 20.803,97 é R$ 5.825,1116; o pró-labore declarado foi R$ 5.825,12
    expect(payrollFromDarf(1170.46, '2025-02', DEFAULT_SETTINGS, 20803.97)).toBe(5825.12);
  });
});

describe('hasFullWindow', () => {
  const months = (from: string, count: number) =>
    Array.from({ length: count }, (_, k) => rec(shiftYearMonth(from, k)));

  it('exige os 12 meses anteriores no histórico', () => {
    expect(hasFullWindow(months('2025-01', 12), '2026-01')).toBe(true);
    expect(hasFullWindow(months('2025-02', 11), '2026-01')).toBe(false);
  });

  it('não exige meses antes do início da atividade', () => {
    expect(hasFullWindow(months('2025-06', 7), '2026-01', { start: '2025-06' })).toBe(true);
  });

  it('não serve mês com a folha ainda desconhecida', () => {
    expect(hasFullWindow(months('2025-01', 12), '2026-01', { isPayrollUnknown: (ym) => ym === '2025-05' })).toBe(false);
  });
});
