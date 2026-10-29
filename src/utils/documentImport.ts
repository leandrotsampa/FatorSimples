// Importa os documentos da Receita para o Histórico: o PGDAS-D traz a empresa, a receita e a folha
// dos meses anteriores e o DAS do mês declarado; o relatório de pagamentos completa o DAS pago e o
// DARF do pró-labore (INSS + IRRF). Nada é gravado antes da pessoa conferir o plano

import type { MonthRecord, TaxSettings } from '../types/tax';
import type { PgdasDeclaration, TaxDocument, TaxPayment } from './taxDocuments';
import { DARF_PROLABORE_CODE, DAS_CODE } from './taxDocuments';
import {
  DEFAULT_SETTINGS,
  calculateProlabore,
  ceilToCents,
  calculateRBT12,
  calculateSimplesNacional,
  fillMissingTaxes,
  settingsForCompetence,
  shiftYearMonth,
} from './taxCalculations';
import { currentYearMonth } from './monthPicker';

export interface ImportRow {
  record: MonthRecord;
  isNew: boolean;
  // Mês recente sem folha no app nem na declaração: o Fator R dos meses seguintes depende dela
  payrollMissing: boolean;
}

export interface CompanyChange {
  label: string;
  from: string;
  to: string;
}

export type ImportedCompany = Pick<TaxSettings, 'companyName' | 'cnpj'> & { cityState?: string };

export interface DocumentImportPlan {
  company: ImportedCompany | null;
  companyChanges: CompanyChange[];
  rows: ImportRow[]; // só os meses que mudam, do mais antigo ao mais novo
  replaced: number; // meses do app atualizados
  removedSamples: number; // meses de exemplo, trocados pelos do documento
  paymentsOutside: number; // meses pagos sem faturamento no app nem na declaração
  // CNPJ dos documentos quando a empresa cadastrada é outra
  otherCompany: string | null;
  // RBT12 e anexo da declaração mais nova contra o que o app calcula com os meses importados
  rbt12Check?: { yearMonth: string; declared: number; app: number };
  anexoCheck?: { yearMonth: string; declared: 'III' | 'V'; app: 'III' | 'V' };
  // Meses com a folha estimada pelo DARF e as declarações do PGDAS-D que trazem a folha real deles
  // (e dos meses que ficaram sem folha)
  estimatedPayroll: string[];
  missingDeclarations: MissingDeclaration[];
}

export interface MissingDeclaration {
  yearMonth: string; // competência da declaração do PGDAS-D a trazer
  months: string[]; // meses cuja folha real ela traz
  available: boolean; // false: ainda não foi transmitida (sai no mês seguinte ao dela)
  // Algum dos meses ainda entra no Fator R da apuração atual (a folha pesa nos 12 meses seguintes);
  // senão a declaração só corrige meses já apurados, no Histórico
  affectsCurrent: boolean;
}

const round = (v: number) => Math.round(v * 100) / 100;
const isSample = (r: MonthRecord) => r.id.startsWith('sample-');
const fmtYm = (ym: string) => `${ym.slice(5)}/${ym.slice(0, 4)}`;
const IMPORT_NOTE = 'Importado';

export const ESTIMATED_PAYROLL_NOTE = 'folha estimada pelo DARF';
export const isPayrollEstimated = (r: MonthRecord) => Boolean(r.notes?.includes(ESTIMATED_PAYROLL_NOTE));

// Cada declaração traz a folha dos 12 meses anteriores ao mês declarado: o menor número de
// declarações que cobre os meses sem folha real, sem passar da seguinte à mais nova já importada.
// A declaração de um mês só existe depois que ele acaba (é transmitida no mês seguinte)
function declarationsFor(
  months: string[],
  latestDeclared: string | undefined,
  today: string,
  isCurrent: (yearMonth: string) => boolean
): MissingDeclaration[] {
  const limit = latestDeclared ? shiftYearMonth(latestDeclared, 1) : undefined;
  const out: MissingDeclaration[] = [];
  let coveredUntil = '';
  for (const m of [...new Set(months)].sort()) {
    if (m <= coveredUntil) {
      const last = out[out.length - 1];
      last.months.push(m);
      last.affectsCurrent ||= isCurrent(m);
      continue;
    }
    let period = shiftYearMonth(m, 12);
    if (limit && period > limit) period = limit;
    out.push({ yearMonth: period, months: [m], available: period < today, affectsCurrent: isCurrent(m) });
    coveredUntil = shiftYearMonth(period, -1);
  }
  // As que mudam o Fator R de hoje primeiro
  return out.sort((a, b) => Number(b.affectsCurrent) - Number(a.affectsCurrent));
}

interface Draft {
  record: MonthRecord;
  sources: Set<string>;
  payrollKnown: boolean;
}

// INSS + IRRF que o app calcula para um pró-labore, como nas guias (centavos arredondados)
const darfFor = (payroll: number, settings: TaxSettings) => {
  const p = calculateProlabore(payroll, settings);
  return round(round(p.inss) + round(p.irrf));
};

// Pró-labore cujo INSS (11%) + IRRF dá o DARF 1410 pago: a folha do mês quando nenhum documento a
// traz. O total cresce com o pró-labore, então uma busca binária acha a faixa de valores que dão
// exatamente o DARF (o arredondamento junta alguns centavos). Nela, prefere 28% da receita do mês
// (a regra do app), depois reais inteiros e só então o meio da faixa: um valor centavos abaixo do
// real deixaria o Fator R em 27,99%
export function payrollFromDarf(paid: number, yearMonth: string, settings: TaxSettings, revenue = 0): number | null {
  if (!(paid > 0)) return null;
  const darf = round(paid);
  const monthSettings = settingsForCompetence(settings, yearMonth);
  const MAX = 1_000_000;
  if (darfFor(MAX, monthSettings) < darf) return null;
  // Menor pró-labore cujo DARF passa de "alvo" (ou o alcança, com inclusive)
  const firstReaching = (target: number, inclusive: boolean) => {
    let lo = 0;
    let hi = MAX;
    for (let k = 0; k < 64 && hi - lo > 0.0005; k++) {
      const mid = (lo + hi) / 2;
      const v = darfFor(mid, monthSettings);
      if (inclusive ? v < target : v <= target) lo = mid;
      else hi = mid;
    }
    return hi;
  };
  const from = firstReaching(darf, true);
  const to = firstReaching(darf, false);
  const fits = (v: number) => v >= from - 0.005 && v <= to + 0.005 && darfFor(v, monthSettings) === darf;
  const preferred = [ceilToCents(revenue * 0.28), Math.ceil(from), Math.floor(to)].filter((v) => v > 0);
  const pick = preferred.find(fits);
  if (pick !== undefined) return pick;
  // A retenção de verdade pode diferir 1 ou 2 centavos da conta do app: 28% da receita ainda vale
  const target28 = preferred[0];
  if (revenue > 0 && Math.abs(darfFor(target28, monthSettings) - darf) <= 0.02) return target28;
  const mid = round((from + to) / 2);
  if (darfFor(mid, monthSettings) === darf) return mid;
  // O DARF não fecha exatamente (ex.: tabela diferente): o centavo mais próximo
  const near = [Math.floor(from * 100) / 100, Math.ceil(from * 100) / 100];
  return near.reduce((best, c) => (Math.abs(darfFor(c, monthSettings) - darf) < Math.abs(darfFor(best, monthSettings) - darf) ? c : best));
}

// Diferença entre a folha declarada e o pró-labore da guia que ainda é só tabela ou arredondamento
// (ex.: janeiro de 2024 com a tabela do IRRF de 2023). Acima disso, a folha inclui outra coisa
const PAYROLL_TOLERANCE = 0.03;

// INSS contido no DARF 1410. Normalmente é 11% da folha do mês; mas a folha do PGDAS-D pode ser maior
// que o pró-labore que gerou a guia (ex.: folha com outros valores além do pró-labore). Quando o DARF
// não fecha com a folha, o INSS sai do pró-labore que gera exatamente esse DARF
export function inssFromDarf(darf: number, payroll: number, yearMonth: string, settings: TaxSettings, revenue = 0): number {
  const monthSettings = settingsForCompetence(settings, yearMonth);
  if (!(payroll > 0)) return round(darf);
  const fromPayroll = round(calculateProlabore(payroll, monthSettings).inss);
  if (Math.abs(darfFor(payroll, monthSettings) - round(darf)) <= 0.05) return fromPayroll;
  const prolabore = payrollFromDarf(darf, yearMonth, settings, revenue);
  if (!prolabore || Math.abs(prolabore - payroll) / payroll <= PAYROLL_TOLERANCE) return fromPayroll;
  return round(calculateProlabore(prolabore, monthSettings).inss);
}

function noteFor(previous: string | undefined, sources: Set<string>): string {
  const note = `${IMPORT_NOTE}: ${[...sources].join(' · ')}`;
  return previous && !previous.startsWith(IMPORT_NOTE) ? `${previous} · ${note}` : note;
}

const sameRecord = (a: MonthRecord, b: MonthRecord) =>
  a.revenue === b.revenue && a.payroll === b.payroll && a.inss === b.inss && a.irrf === b.irrf && a.dasPaid === b.dasPaid;

export function planDocumentImport(
  docs: TaxDocument[],
  history: MonthRecord[],
  settings: TaxSettings,
  today: string = currentYearMonth()
): DocumentImportPlan {
  const base = history.filter((r) => !isSample(r));
  const existing = new Map(base.map((r) => [r.yearMonth, r]));
  const drafts = new Map<string, Draft>();
  const draftFor = (ym: string): Draft => {
    let d = drafts.get(ym);
    if (!d) {
      const old = existing.get(ym);
      d = {
        record: old ? { ...old } : { id: `doc-${ym}`, yearMonth: ym, revenue: 0, payroll: 0, inss: 0, irrf: 0, dasPaid: 0 },
        sources: new Set(),
        payrollKnown: Boolean(old && old.payroll > 0),
      };
      drafts.set(ym, d);
    }
    return d;
  };

  // Declarações da mais antiga para a mais nova: a mais nova prevalece nos meses em comum
  const declarations = docs.filter((d): d is PgdasDeclaration => d.kind === 'pgdas').sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  for (const doc of declarations) {
    const source = `PGDAS-D ${fmtYm(doc.yearMonth)}`;
    const opening = doc.openingDate?.slice(0, 7) ?? '';
    for (const [ym, revenue] of Object.entries(doc.previousRevenue)) {
      if (ym < opening) continue;
      const d = draftFor(ym);
      d.record.revenue = revenue;
      d.sources.add(source);
    }
    for (const [ym, payroll] of Object.entries(doc.previousPayroll)) {
      if (ym < opening || !drafts.has(ym)) continue;
      const d = draftFor(ym);
      d.record.payroll = payroll;
      d.payrollKnown = true;
    }
    const d = draftFor(doc.yearMonth);
    d.record.revenue = doc.revenue;
    d.record.dasPaid = doc.dasDeclared;
    d.sources.add(source);
  }

  // Pagamentos: só completam meses que têm faturamento (no app ou na declaração)
  const paid = new Map<string, { das: number; darf: number }>();
  for (const p of docs.flatMap((d) => (d.kind === 'payments' ? d.payments : [])) as TaxPayment[]) {
    if (p.code !== DAS_CODE && p.code !== DARF_PROLABORE_CODE) continue;
    const sum = paid.get(p.yearMonth) ?? { das: 0, darf: 0 };
    if (p.code === DAS_CODE) sum.das = round(sum.das + p.principal);
    else sum.darf = round(sum.darf + p.principal);
    paid.set(p.yearMonth, sum);
  }
  let paymentsOutside = 0;
  for (const [ym, sum] of paid) {
    if (!drafts.has(ym) && !existing.has(ym)) {
      paymentsOutside++;
      continue;
    }
    const d = draftFor(ym);
    d.sources.add('pagamentos');
    if (sum.das > 0) d.record.dasPaid = sum.das;
    if (sum.darf > 0) {
      // Sem folha no app nem na declaração: a do DARF pago
      if (!d.payrollKnown && d.record.payroll <= 0) {
        const estimated = payrollFromDarf(sum.darf, ym, settings, d.record.revenue);
        if (estimated) {
          d.record.payroll = estimated;
          d.payrollKnown = true;
          d.sources.add(ESTIMATED_PAYROLL_NOTE);
        }
      }
      // O DARF 1410 junta o INSS do pró-labore (11%, até o teto) e o IRRF
      d.record.inss = Math.min(inssFromDarf(sum.darf, d.record.payroll, ym, settings, d.record.revenue), sum.darf);
      d.record.irrf = round(sum.darf - d.record.inss);
    }
  }

  // Impostos que nenhum documento trouxe são calculados com o histórico já mesclado. O DAS só com os
  // 12 meses anteriores completos (desde a abertura) e com a folha deles: senão fica em branco
  const merged = [...base.filter((r) => !drafts.has(r.yearMonth)), ...[...drafts.values()].map((d) => d.record)];
  const openings = declarations.map((d) => d.openingDate?.slice(0, 7)).filter((v): v is string => Boolean(v));
  const { records: filled } = fillMissingTaxes(
    [...drafts.values()].map((d) => d.record),
    merged,
    settings,
    {
      ...(openings.length ? { start: openings.sort()[0] } : {}),
      isPayrollUnknown: (ym) => {
        const d = drafts.get(ym);
        return Boolean(d && !d.payrollKnown && d.record.payroll <= 0);
      },
    }
  );
  const filledByMonth = new Map(filled.map((r) => [r.yearMonth, r]));
  // O que foi calculado, e não veio de documento, fica anotado no mês
  for (const [ym, d] of drafts) {
    const r = filledByMonth.get(ym)!;
    if (r.dasPaid !== d.record.dasPaid) d.sources.add('DAS calculado');
    if (r.inss !== d.record.inss || r.irrf !== d.record.irrf) d.sources.add('INSS e IRRF calculados');
  }

  // Só a folha dos 12 meses mais recentes ainda entra no Fator R de algum mês
  const months = [...new Set([...drafts.keys(), ...existing.keys()])].sort();
  const latest12 = new Set(months.slice(-12));

  const rows: ImportRow[] = [];
  for (const [ym, d] of [...drafts].sort(([a], [b]) => a.localeCompare(b))) {
    const record = { ...filledByMonth.get(ym)!, notes: undefined as string | undefined };
    const old = existing.get(ym);
    if (old && sameRecord(old, record)) continue;
    record.notes = noteFor(old?.notes, d.sources);
    if (!record.notes) delete record.notes;
    rows.push({ record, isNew: !old, payrollMissing: latest12.has(ym) && !d.payrollKnown && record.payroll <= 0 });
  }

  // Empresa: da declaração mais nova
  const latest = declarations[declarations.length - 1];
  const company: ImportedCompany | null = latest
    ? { companyName: latest.companyName, cnpj: latest.cnpj, ...(latest.cityState ? { cityState: latest.cityState } : {}) }
    : null;
  const companyChanges: CompanyChange[] = [];
  if (company) {
    // "De" vazio quando o app ainda está com os dados de exemplo
    const check = (label: string, from: string, fallback: string, to: string | undefined) =>
      to && from !== to && companyChanges.push({ label, from: from === fallback ? '' : from, to });
    check('Razão social', settings.companyName, DEFAULT_SETTINGS.companyName, company.companyName);
    check('CNPJ', settings.cnpj, DEFAULT_SETTINGS.cnpj, company.cnpj);
    check('Cidade / UF', settings.cityState, DEFAULT_SETTINGS.cityState, company.cityState);
  }

  const docCnpj = company?.cnpj ?? docs.find((d) => d.kind === 'payments' && d.cnpj)?.cnpj;
  const registered = settings.cnpj && settings.cnpj !== DEFAULT_SETTINGS.cnpj ? settings.cnpj : null;
  const otherCompany = docCnpj && registered && docCnpj !== registered ? docCnpj : null;

  let rbt12Check: DocumentImportPlan['rbt12Check'];
  let anexoCheck: DocumentImportPlan['anexoCheck'];
  if (latest) {
    const after = [...merged.filter((r) => !filledByMonth.has(r.yearMonth)), ...filled];
    const current = filledByMonth.get(latest.yearMonth)!;
    if (latest.rbt12 !== undefined) {
      const app = calculateRBT12(after, latest.yearMonth, current.revenue, current.payroll).rbt12;
      rbt12Check = { yearMonth: latest.yearMonth, declared: latest.rbt12, app: round(app) };
    }
    if (latest.anexo) {
      const app = calculateSimplesNacional(current.revenue, current.payroll, after, latest.yearMonth).anexoUsed;
      anexoCheck = { yearMonth: latest.yearMonth, declared: latest.anexo, app };
    }
  }

  const estimatedPayroll = rows.filter((r) => isPayrollEstimated(r.record)).map((r) => r.record.yearMonth);

  return {
    company,
    companyChanges,
    rows,
    replaced: rows.filter((r) => !r.isNew).length,
    removedSamples: history.filter(isSample).length,
    paymentsOutside,
    estimatedPayroll,
    missingDeclarations: declarationsFor(
      [...estimatedPayroll, ...rows.filter((r) => r.payrollMissing).map((r) => r.record.yearMonth)],
      latest?.yearMonth,
      today,
      // A folha de um mês entra no Fator R dos 12 meses seguintes
      (ym) => shiftYearMonth(ym, 12) >= today
    ),
    otherCompany,
    ...(rbt12Check ? { rbt12Check } : {}),
    ...(anexoCheck ? { anexoCheck } : {}),
  };
}

export function applyDocumentImport(
  plan: DocumentImportPlan,
  history: MonthRecord[],
  settings: TaxSettings
): { history: MonthRecord[]; settings: TaxSettings; saved: MonthRecord[]; removed: MonthRecord[] } {
  const months = new Set(plan.rows.map((r) => r.record.yearMonth));
  const removed = history.filter((r) => isSample(r) || months.has(r.yearMonth));
  const saved = plan.rows.map((r) => r.record);
  return {
    history: [...history.filter((r) => !isSample(r) && !months.has(r.yearMonth)), ...saved].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth)),
    settings: plan.company ? { ...settings, ...plan.company } : settings,
    saved,
    removed: removed.filter((r) => isSample(r) || !saved.some((s) => s.id === r.id)),
  };
}
