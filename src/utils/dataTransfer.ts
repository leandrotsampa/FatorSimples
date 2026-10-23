import { MonthRecord, TaxSettings } from '../types/tax';

/**
 * Exportação e importação dos dados da empresa e das competências (faturamento, folha e impostos),
 * sem parâmetros fiscais nem estrutura de banco.
 */

const YEAR_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const COMPANY_FIELDS = ['companyName', 'cnpj', 'cityState', 'cnae'] as const;

export type CompanyData = Partial<Pick<TaxSettings, (typeof COMPANY_FIELDS)[number]>>;

export interface DataImport {
  company: CompanyData | null; // null quando o arquivo não traz os dados da empresa
  records: MonthRecord[];
}

export function buildDataExport(history: MonthRecord[], settings: TaxSettings): string {
  const competencias = [...history]
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
    .map((rec) => ({
      yearMonth: rec.yearMonth,
      revenue: rec.revenue,
      payroll: rec.payroll,
      inss: rec.inss,
      irrf: rec.irrf,
      dasPaid: rec.dasPaid,
      ...(rec.notes ? { notes: rec.notes } : {}),
    }));

  return JSON.stringify(
    {
      app: 'FatorSimples',
      formato: 'dados-competencias',
      versao: 1,
      exportadoEm: new Date().toISOString(),
      empresa: Object.fromEntries(COMPANY_FIELDS.map((field) => [field, settings[field] || ''])),
      competencias,
    },
    null,
    2
  );
}

// Aceita número ou texto no padrão brasileiro ("R$ 1.234,56")
function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string' || value.trim() === '') return 0;
  let s = value.replace(/R\$|\s/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Lê o JSON de dados. Aceita { empresa?, competencias?: [...] }, { history: [...] } (backup antigo)
 * ou diretamente um array de competências. Lança Error com mensagem amigável se inválido.
 */
export function parseDataImport(content: string): DataImport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }

  const obj = parsed as Record<string, unknown>;
  const list = Array.isArray(parsed) ? parsed : obj?.competencias ?? obj?.history ?? [];
  if (!Array.isArray(list)) {
    throw new Error('O campo "competencias" deve ser uma lista.');
  }

  // Só os campos da empresa presentes no arquivo são aplicados; os ausentes ficam como estão
  let company: CompanyData | null = null;
  const empresa = Array.isArray(parsed) ? undefined : obj?.empresa;
  if (empresa && typeof empresa === 'object') {
    const source = empresa as Record<string, unknown>;
    company = {};
    COMPANY_FIELDS.forEach((field) => {
      if (typeof source[field] === 'string') company![field] = (source[field] as string).trim();
    });
    if (Object.keys(company).length === 0) company = null;
  }

  const byMonth = new Map<string, MonthRecord>();
  list.forEach((item, index) => {
    const rec = item as Record<string, unknown>;
    const yearMonth = String(rec?.yearMonth ?? '').trim();
    if (!YEAR_MONTH_REGEX.test(yearMonth)) {
      throw new Error(`Item ${index + 1}: competência "${yearMonth}" inválida (use o formato AAAA-MM).`);
    }
    byMonth.set(yearMonth, {
      id: `rec-${yearMonth}`,
      yearMonth,
      revenue: toNumber(rec.revenue),
      payroll: toNumber(rec.payroll),
      inss: toNumber(rec.inss),
      irrf: toNumber(rec.irrf),
      dasPaid: toNumber(rec.dasPaid),
      notes: typeof rec.notes === 'string' && rec.notes ? rec.notes : undefined,
    });
  });

  return { company, records: [...byMonth.values()] };
}
