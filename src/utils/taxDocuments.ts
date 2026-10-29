// Leitura dos documentos da Receita em PDF (já em linhas de texto, ver pdfText.ts):
// - a declaração do PGDAS-D, que a contabilidade envia todo mês;
// - o relatório de pagamentos do e-CAC / serviço "Pagamentos" (DAS 3333 e DARF 1410)

export interface PgdasDeclaration {
  kind: 'pgdas';
  yearMonth: string; // competência declarada (AAAA-MM)
  cnpj: string;
  companyName: string;
  openingDate?: string; // AAAA-MM-DD
  cityState?: string; // "Cidade - UF"
  revenue: number; // receita do mês (interno + externo)
  rbt12?: number;
  dasDeclared: number;
  anexo?: 'III' | 'V'; // conferido com o anexo que o app calcula
  // Receita e folha dos meses anteriores, por AAAA-MM
  previousRevenue: Record<string, number>;
  previousPayroll: Record<string, number>;
}

export interface TaxPayment {
  code: string; // 3333 = DAS do Simples; 1410 = DARF da DCTFWeb (INSS + IRRF)
  yearMonth: string; // competência paga
  principal: number; // o imposto, sem multa e juros de atraso
}

export interface PaymentsReport {
  kind: 'payments';
  cnpj?: string;
  payments: TaxPayment[];
}

export type TaxDocument = PgdasDeclaration | PaymentsReport;

export const DAS_CODE = '3333';
export const DARF_PROLABORE_CODE = '1410';

// Onde obter cada documento
export const PGDAS_SOURCE_URL = 'https://www8.receita.fazenda.gov.br/SimplesNacional/';
export const PAYMENTS_SOURCE_URL = 'https://servicos.receitafederal.gov.br/servico/pagamentos';

const MONEY = String.raw`\d{1,3}(?:\.\d{3})*,\d{2}`;
const CNPJ = String.raw`\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}`;

const money = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
const flat = (line: string) => line.replace(/\s*\|\s*/g, ' ').trim();
const ymOf = (month: string, year: string) => `${year}-${month}`;

const LOWER_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
const titleCase = (s: string) =>
  s
    .toLocaleLowerCase('pt-BR')
    .split(/\s+/)
    .map((w, k) => (k > 0 && LOWER_WORDS.has(w) ? w : w.charAt(0).toLocaleUpperCase('pt-BR') + w.slice(1)))
    .join(' ');

// Pares "MM/AAAA valor" das linhas entre dois marcadores de seção
function monthValues(lines: string[], from: RegExp, to: RegExp): Record<string, number> {
  const start = lines.findIndex((l) => from.test(l));
  if (start < 0) return {};
  const out: Record<string, number> = {};
  for (let k = start + 1; k < lines.length && !to.test(lines[k]); k++) {
    for (const m of lines[k].matchAll(new RegExp(String.raw`(\d{2})\/(\d{4}) (${MONEY})`, 'g'))) {
      out[ymOf(m[1], m[2])] = money(m[3]);
    }
  }
  return out;
}

export function parsePgdas(raw: string[]): PgdasDeclaration | null {
  const lines = raw.map(flat);
  const text = lines.join('\n');
  if (!/Programa Gerador do Documento de Arrecadação/i.test(text) || !/Simples Nacional/i.test(text)) return null;

  const period = text.match(/Apuração: (\d{2})\/(\d{2})\/(\d{4}) a/);
  const cnpj = text.match(new RegExp(`CNPJ Matriz: (${CNPJ})`));
  const name = text.match(/Nome empresarial: (.+)/);
  const rpa = lines.find((l) => /^Receita Bruta do PA \(RPA\)/i.test(l));
  if (!period || !cnpj || !name || !rpa) return null;
  const rpaValues = rpa.match(new RegExp(MONEY, 'g')) ?? [];

  const opening = text.match(/Data de abertura no CNPJ: (\d{2})\/(\d{2})\/(\d{4})/);
  const place = text.match(/Município: (.+?) UF: ([A-Z]{2})/);
  // O valor do RBT12 fica na linha entre o rótulo e "ao PA (RBT12)"
  const rbt12Label = lines.findIndex((l) => /^ao PA \(RBT12\)$/.test(l));
  const rbt12Values = rbt12Label > 0 ? (lines[rbt12Label - 1].match(new RegExp(MONEY, 'g')) ?? []) : [];
  const totalLabel = lines.findIndex((l) => /Valor Total do Débito Declarado/.test(l));
  const totalValues = totalLabel >= 0 ? (lines[totalLabel + 1]?.match(new RegExp(MONEY, 'g')) ?? []) : [];
  // O Fator r vem cortado em duas casas (0,28): só o anexo serve para conferir
  const anexo = text.match(/Fator r = \d+,\d+ ?- Anexo (III|V)\b/);

  const internal = monthValues(lines, /^2\.2\.1\)/, /^2\.2\.2\)|^2\.3\)/);
  const external = monthValues(lines, /^2\.2\.2\)/, /^2\.3\)/);
  const previousRevenue: Record<string, number> = { ...internal };
  for (const [ym, v] of Object.entries(external)) previousRevenue[ym] = Math.round(((previousRevenue[ym] ?? 0) + v) * 100) / 100;

  return {
    kind: 'pgdas',
    yearMonth: ymOf(period[2], period[3]),
    cnpj: cnpj[1],
    companyName: name[1].trim(),
    ...(opening ? { openingDate: `${opening[3]}-${opening[2]}-${opening[1]}` } : {}),
    ...(place ? { cityState: `${titleCase(place[1].trim())} - ${place[2]}` } : {}),
    revenue: money(rpaValues[rpaValues.length - 1] ?? '0'),
    ...(rbt12Values.length ? { rbt12: money(rbt12Values[rbt12Values.length - 1]) } : {}),
    dasDeclared: money(totalValues[totalValues.length - 1] ?? '0'),
    ...(anexo ? { anexo: anexo[1] as 'III' | 'V' } : {}),
    previousRevenue,
    previousPayroll: monthValues(lines, /^2\.3\)/, /^2\.3\.1\)|^2\.4\)/),
  };
}

// Data de arrecadação, código, nº do documento, período de apuração, principal, multa, juros e total
const PAYMENT_ROW = new RegExp(
  String.raw`^\d{2}\/\d{2}\/\d{4} (\d{4}) \d+ \d{2}\/(\d{2})\/(\d{4}) (${MONEY}) ${MONEY} ${MONEY} ${MONEY}$`
);

export function parsePayments(raw: string[]): PaymentsReport | null {
  const lines = raw.map(flat);
  if (!lines.some((l) => /^Data de Arrecadação Receita N. Documento Período de Apuração/i.test(l))) return null;
  const cnpj = lines.join('\n').match(new RegExp(`Contribuinte: (${CNPJ})`));
  const payments: TaxPayment[] = [];
  for (const line of lines) {
    const m = line.match(PAYMENT_ROW);
    if (!m) continue;
    payments.push({ code: m[1], yearMonth: ymOf(m[2], m[3]), principal: money(m[4]) });
  }
  return { kind: 'payments', ...(cnpj ? { cnpj: cnpj[1] } : {}), payments };
}

export function readTaxDocument(lines: string[]): TaxDocument | null {
  return parsePgdas(lines) ?? parsePayments(lines);
}
