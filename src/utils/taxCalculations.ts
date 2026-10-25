import {
  MonthRecord,
  TaxSettings,
  SimplesBracket,
  ProlaboreCalculation,
  SimplesCalculation,
  MonthSummaryResult,
} from '../types/tax';

// Tabelas Oficiais do Simples Nacional (Lei Complementar nº 123/2006 atualizada pela LC 155/2016)
export const ANEXO_III_TABLE: SimplesBracket[] = [
  { faixa: 1, limit: 180000, nominalRate: 0.06, deduction: 0 },
  { faixa: 2, limit: 360000, nominalRate: 0.112, deduction: 9360 },
  { faixa: 3, limit: 720000, nominalRate: 0.135, deduction: 17640 },
  { faixa: 4, limit: 1800000, nominalRate: 0.16, deduction: 35640 },
  { faixa: 5, limit: 3600000, nominalRate: 0.21, deduction: 125640 },
  { faixa: 6, limit: 4800000, nominalRate: 0.33, deduction: 648000 },
];

export const ANEXO_V_TABLE: SimplesBracket[] = [
  { faixa: 1, limit: 180000, nominalRate: 0.155, deduction: 0 },
  { faixa: 2, limit: 360000, nominalRate: 0.18, deduction: 4500 },
  { faixa: 3, limit: 720000, nominalRate: 0.195, deduction: 9900 },
  { faixa: 4, limit: 1800000, nominalRate: 0.205, deduction: 17100 },
  { faixa: 5, limit: 3600000, nominalRate: 0.23, deduction: 62100 },
  { faixa: 6, limit: 4800000, nominalRate: 0.305, deduction: 540000 },
];

import { OFFICIAL_TAX_TABLES, TaxTableVersion, getTaxTableForCompetence } from './taxTablesRegistry';

// Configurações padrão vigentes (Ano 2026)
export const DEFAULT_SETTINGS: TaxSettings = {
  taxVersionId: '2026_oficial',
  autoUpdateTables: true,
  lastTableUpdateDate: 'Oficial 2026 (Lei 15.191/2025 + redução da Lei 15.270/2025)',
  minimumWage: 1621.0,
  inssCeiling: 8475.55,
  inssRate: 0.11, // 11% para pró-labore
  dependentsCount: 0,
  dependentDeduction: 189.59,
  simplifiedIrDeduction: 607.2,
  companyName: 'Minha Empresa Tech LTDA',
  cnpj: '00.000.000/0001-00',
  cityState: 'Brusque - SC',
  cnae: '6201-5/01 - Desenvolvimento de Programas de Computador',
  prolaboreRule: 'auto_28_month',
  manualProlaboreAmount: 2500,
  accountingFee: 0,
};

/**
 * Formatação de moeda BRL com 2 casas decimais.
 */
export function formatCurrency(value: number): string {
  if (isNaN(value) || !isFinite(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formatação de percentual (ex: 6.00%).
 */
export function formatPercent(value: number, decimals = 2): string {
  if (isNaN(value) || !isFinite(value)) return '0,00%';
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

/**
 * Tabela oficial ativa nas configurações (com fallbacks seguros)
 */
export function getActiveTaxTable(settings: TaxSettings): TaxTableVersion | undefined {
  return (
    OFFICIAL_TAX_TABLES[settings.taxVersionId] ||
    OFFICIAL_TAX_TABLES['2026_oficial'] ||
    Object.values(OFFICIAL_TAX_TABLES)[0]
  );
}

/**
 * Retenção de IR sobre os lucros distribuídos no mês a um sócio (Lei 15.270/2025):
 * acima do limite mensal, incide sobre o valor total distribuído.
 */
export function calculateDividendWithholding(distributedProfit: number, settings: TaxSettings): number {
  const rule = getActiveTaxTable(settings)?.dividendWithholding;
  if (!rule || distributedProfit <= rule.monthlyThreshold) return 0;
  return distributedProfit * rule.rate;
}

/**
 * Calcula os impostos do pró-labore (INSS e IRPF atualizado automaticamente)
 */
export function calculateProlabore(
  grossAmount: number,
  settings: TaxSettings
): ProlaboreCalculation {
  const safeGross = Math.max(0, grossAmount);

  // Obtém a tabela de alíquotas IRPF ativa (com múltiplos fallbacks seguros)
  const activeTable = getActiveTaxTable(settings);

  const irrfBrackets = activeTable?.irrfBrackets || [
    { faixa: 1, limit: 2259.2, rate: 0.0, deduction: 0.0 },
    { faixa: 2, limit: 2826.65, rate: 0.075, deduction: 169.44 },
    { faixa: 3, limit: 3751.05, rate: 0.15, deduction: 381.44 },
    { faixa: 4, limit: 4664.68, rate: 0.225, deduction: 662.77 },
    { faixa: 5, limit: Infinity, rate: 0.275, deduction: 896.0 },
  ];

  // 1. Cálculo do INSS
  // Pró-labore incide 11% limitado ao teto máximo de contribuição
  const inssBase = Math.min(safeGross, settings.inssCeiling);
  const inss = inssBase * settings.inssRate;
  const inssCeilingApplied = safeGross >= settings.inssCeiling;

  // 2. Cálculo do IRPF
  // Opção A: Deduções Legais (INSS retido + dependentes)
  const legalDeductionTotal = inss + settings.dependentsCount * settings.dependentDeduction;
  const baseWithLegal = Math.max(0, safeGross - legalDeductionTotal);

  // Opção B: Desconto Simplificado Mensal Oficial
  const baseWithSimplified = Math.max(0, safeGross - settings.simplifiedIrDeduction);

  // Função auxiliar para calcular imposto sobre uma base pela tabela progressiva do IRPF
  const computeIrProgressive = (base: number) => {
    let rate = 0;
    let parcela = 0;

    for (const b of irrfBrackets) {
      if (base <= b.limit) {
        rate = b.rate;
        parcela = b.deduction;
        break;
      }
    }

    const tax = Math.max(0, base * rate - parcela);
    return { tax, rate, parcela };
  };

  const irLegal = computeIrProgressive(baseWithLegal);
  const irSimplified = computeIrProgressive(baseWithSimplified);

  // O contribuinte tem direito legal ao método que gerar MENOR imposto
  let chosenMethod: 'legal' | 'simplified' = 'legal';
  let chosenBase = baseWithLegal;
  let finalIr = irLegal.tax;
  let chosenRate = irLegal.rate;
  let chosenParcela = irLegal.parcela;
  let effectiveDeduction = legalDeductionTotal;

  if (irSimplified.tax < irLegal.tax) {
    chosenMethod = 'simplified';
    chosenBase = baseWithSimplified;
    finalIr = irSimplified.tax;
    chosenRate = irSimplified.rate;
    chosenParcela = irSimplified.parcela;
    effectiveDeduction = settings.simplifiedIrDeduction;
  }

  // 3. Redução do IRRF (Lei 15.270/2025): calculada sobre o rendimento bruto, depois da tabela
  const irBeforeReduction = finalIr;
  const reductionRule = activeTable?.irrfReduction;
  let irReduction = 0;
  if (reductionRule) {
    if (safeGross <= reductionRule.fullExemptionLimit) {
      irReduction = reductionRule.maxReduction;
    } else if (safeGross <= reductionRule.phaseOutLimit) {
      irReduction = Math.max(0, reductionRule.phaseOutBase - reductionRule.phaseOutRate * safeGross);
    }
    irReduction = Math.min(irReduction, irBeforeReduction);
    finalIr = irBeforeReduction - irReduction;
  }

  // Pró-labore líquido
  const net = Math.max(0, safeGross - inss - finalIr);
  const totalTaxes = inss + finalIr;
  const effectiveTaxRate = safeGross > 0 ? (totalTaxes / safeGross) * 100 : 0;

  return {
    gross: safeGross,
    inss,
    inssCeilingApplied,
    irrfBase: chosenBase,
    irrfLegalDeductionTotal: legalDeductionTotal,
    irrfSimplifiedDeduction: settings.simplifiedIrDeduction,
    irrfChosenMethod: chosenMethod,
    irrfEffectiveDeduction: effectiveDeduction,
    irrfRate: chosenRate,
    irrfParcelaADeduzir: chosenParcela,
    irrfBeforeReduction: irBeforeReduction,
    irrfReduction: irReduction,
    irrf: finalIr,
    net,
    effectiveTaxRate,
  };
}

/**
 * Desloca uma competência "AAAA-MM" em N meses (negativo volta no tempo).
 */
export function shiftYearMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Competências do histórico dentro dos N meses imediatamente anteriores à competência informada
 * (a própria competência não entra).
 */
export function getPreviousMonths(
  history: MonthRecord[],
  competence: string,
  count: number
): MonthRecord[] {
  const start = shiftYearMonth(competence, -count);
  return history.filter((m) => m.yearMonth >= start && m.yearMonth < competence);
}

/**
 * Calcula RBT12 (Receita Bruta Total dos 12 meses anteriores ao período de apuração)
 * e a Folha12 do mesmo período (LC 123 art. 18 § 1º e § 24).
 * Aplica proporcionalidade da LC 123 art. 18 § 2º se a empresa tiver menos de 12 meses.
 */
export function calculateRBT12(
  history: MonthRecord[],
  competence: string,
  currentMonthRevenue: number,
  currentMonthPayroll: number
): {
  rbt12: number;
  rawRbt12: number;
  folha12: number;
  monthsCount: number;
  isProportional: boolean;
} {
  const previous12 = getPreviousMonths(history, competence, 12);
  const monthsCount = previous12.length;
  const totalRev = previous12.reduce((acc, m) => acc + m.revenue, 0);
  const totalPay = previous12.reduce((acc, m) => acc + m.payroll, 0);

  let rbt12 = 0;
  let folha12 = 0;
  let isProportional = false;

  if (monthsCount === 0) {
    // Primeiro mês de atividade: receita do próprio mês x 12 (art. 18 § 2º da LC 123)
    rbt12 = currentMonthRevenue * 12;
    folha12 = currentMonthPayroll * 12;
    isProportional = true;
  } else if (monthsCount < 12) {
    // Menos de 12 meses de atividade: média aritmética dos meses anteriores x 12
    rbt12 = (totalRev / monthsCount) * 12;
    folha12 = (totalPay / monthsCount) * 12;
    isProportional = true;
  } else {
    // 12 meses completos
    rbt12 = totalRev;
    folha12 = totalPay;
  }

  return {
    rbt12: Math.max(1, rbt12),
    rawRbt12: Math.max(0, rbt12), // sem o piso de R$ 1 usado para evitar divisão por zero
    folha12: Math.max(0, folha12),
    monthsCount,
    isProportional,
  };
}

/**
 * Fator R a partir da folha e da receita de 12 meses (Resolução CGSN 140/2018):
 * folha > 0 e receita = 0 -> 0,28 (Anexo III); folha = 0 e receita > 0 -> 0,01 (Anexo V).
 * Com ambos zerados não há relação a calcular: retorna 0.
 */
export function resolveFactorR(folha12: number, rbt12: number): number {
  if (rbt12 > 0 && folha12 > 0) return folha12 / rbt12;
  if (folha12 > 0) return 0.28;
  if (rbt12 > 0) return 0.01;
  return 0;
}

/**
 * Determina a faixa, alíquota nominal e dedução para um dado RBT12 em uma tabela do Simples
 */
export function getBracketForRbt12(
  rbt12: number,
  table: SimplesBracket[]
): SimplesBracket {
  for (const bracket of table) {
    if (rbt12 <= bracket.limit) {
      return bracket;
    }
  }
  return table[table.length - 1];
}

/**
 * Calcula a Alíquota Efetiva do Simples Nacional
 * Fórmula oficial: (RBT12 * Alíquota Nominal - Parcela a Deduzir) / RBT12
 */
export function calculateSimplesEffectiveRate(
  rbt12: number,
  bracket: SimplesBracket
): number {
  if (rbt12 <= 0) return bracket.nominalRate;
  const effective = (rbt12 * bracket.nominalRate - bracket.deduction) / rbt12;
  return Math.max(0, effective);
}

/**
 * Realiza o cálculo completo do Simples Nacional e Fator R
 */
export function calculateSimplesNacional(
  currentMonthRevenue: number,
  currentMonthPayroll: number,
  history: MonthRecord[],
  competence: string
): SimplesCalculation {
  const { rbt12, rawRbt12, folha12, monthsCount, isProportional } = calculateRBT12(
    history,
    competence,
    currentMonthRevenue,
    currentMonthPayroll
  );

  // Fator R = Folha 12 meses / Receita Bruta 12 meses. Com um dos lados zerado (Resolução CGSN
  // 140/2018): folha > 0 e receita = 0 -> 0,28; folha = 0 e receita > 0 -> 0,01
  const factorR = resolveFactorR(folha12, rawRbt12);
  const factorRPercentage = factorR * 100;
  const isQualifiedForAnexo3 = factorR >= 0.28;
  // Folha que faltou, em reais, nos meses de fato considerados (desfaz a proporcionalização × 12)
  const realMonths = monthsCount > 0 ? monthsCount : 1;
  const factorRShortfall = isQualifiedForAnexo3
    ? 0
    : Math.max(0, (0.28 * rbt12 - folha12) * (realMonths / 12));

  const anexoUsed: 'III' | 'V' = isQualifiedForAnexo3 ? 'III' : 'V';
  const table = isQualifiedForAnexo3 ? ANEXO_III_TABLE : ANEXO_V_TABLE;

  const bracket = getBracketForRbt12(rbt12, table);
  const effectiveRate = calculateSimplesEffectiveRate(rbt12, bracket);
  const effectiveRatePercentage = effectiveRate * 100;
  const dasAmount = currentMonthRevenue * effectiveRate;

  // Cálculo comparativo no Anexo V (o que pagaria se NÃO tivesse Fator R >= 28%)
  const anexoVBracket = getBracketForRbt12(rbt12, ANEXO_V_TABLE);
  const anexoVEffectiveRate = calculateSimplesEffectiveRate(rbt12, anexoVBracket);
  const anexoVDasAmount = currentMonthRevenue * anexoVEffectiveRate;
  const savingsWithFactorR = Math.max(0, anexoVDasAmount - dasAmount);

  return {
    rbt12,
    folha12,
    monthsCount,
    isProportional,
    factorR,
    factorRPercentage,
    isQualifiedForAnexo3,
    factorRShortfall,
    anexoUsed,
    faixa: bracket.faixa,
    nominalRate: bracket.nominalRate,
    deduction: bracket.deduction,
    effectiveRate,
    effectiveRatePercentage,
    dasAmount,
    anexoVFaixa: anexoVBracket.faixa,
    anexoVNominalRate: anexoVBracket.nominalRate,
    anexoVDeduction: anexoVBracket.deduction,
    anexoVEffectiveRate,
    anexoVDasAmount,
    savingsWithFactorR,
  };
}

/**
 * Arredonda para cima no centavo (a tolerância evita que 5096.0000000001 vire 5096.01)
 */
export function ceilToCents(value: number): number {
  return Math.ceil(value * 100 - 1e-6) / 100;
}

// Diferença de folha até a qual o Fator R abaixo de 28% é tratado como "por centavos"
export const FACTOR_R_NEAR_MISS = 1.0;

/**
 * Regra de ouro: 28% da receita do mês (mínimo de 1 salário mínimo), arredondado para cima
 * no centavo para o Fator R nunca ficar abaixo de 28% por arredondamento
 */
export function calculateGoldRuleProlabore(revenue: number, settings: TaxSettings): number {
  return Math.max(settings.minimumWage, ceilToCents(revenue * 0.28));
}

/**
 * Calcula o pró-labore ideal recomendado para manter o Fator R >= 28%
 */
export function calculateRecommendedProlabores(
  currentMonthRevenue: number,
  history: MonthRecord[],
  settings: TaxSettings,
  competence: string
): {
  goldRuleMonthly: number; // 28% puro do faturamento do mês atual
  exactCompensatory: number; // compensação exata considerando os 11 meses anteriores
} {
  // 1. Regra de ouro: 28% da receita do mês atual (mínimo de 1 salário mínimo)
  const goldRuleMonthly = calculateGoldRuleProlabore(currentMonthRevenue, settings);

  // 2. Compensação exata no histórico dos 11 meses anteriores, para que o Fator R da
  // próxima competência (que inclui este mês) fique em 28%:
  // Queremos: (Folha11 + FolhaMes) / (Receita11 + ReceitaMes) >= 0.28
  // FolhaMes >= 0.28 * (Receita11 + ReceitaMes) - Folha11
  const previous11 = getPreviousMonths(history, competence, 11);
  const history11Revenue = previous11.reduce((acc, m) => acc + m.revenue, 0);
  const history11Payroll = previous11.reduce((acc, m) => acc + m.payroll, 0);

  const targetRBT12 = history11Revenue + currentMonthRevenue;
  const targetFolha12 = targetRBT12 * 0.28;
  const neededMonthFolha = targetFolha12 - history11Payroll;

  const exactCompensatory = Math.max(settings.minimumWage, ceilToCents(Math.max(0, neededMonthFolha)));

  return {
    goldRuleMonthly,
    exactCompensatory,
  };
}

/**
 * Consolidação completa de todos os 5 itens requeridos para a tela principal
 */
export function calculateMonthSummary(
  currentMonthRevenue: number,
  history: MonthRecord[],
  settings: TaxSettings,
  competence: string,
  overrideProlabore?: number
): MonthSummaryResult {
  const recommendations = calculateRecommendedProlabores(
    currentMonthRevenue,
    history,
    settings,
    competence
  );

  // Determina o pró-labore ativo usado no cálculo
  let chosenProlabore = recommendations.goldRuleMonthly;
  if (settings.prolaboreRule === 'exact_rbt12') {
    chosenProlabore = recommendations.exactCompensatory;
  } else if (settings.prolaboreRule === 'manual') {
    chosenProlabore = Math.max(
      settings.minimumWage,
      overrideProlabore !== undefined ? overrideProlabore : settings.manualProlaboreAmount
    );
  } else if (overrideProlabore !== undefined) {
    chosenProlabore = Math.max(settings.minimumWage, overrideProlabore);
  }

  // 1 & 2 & 3: Pró-labore e seus impostos
  const prolabore = calculateProlabore(chosenProlabore, settings);

  // 4 & 5: Simples Nacional e Alíquota Efetiva
  const simples = calculateSimplesNacional(currentMonthRevenue, chosenProlabore, history, competence);

  // Projeção da próxima competência: o RBT12 e o Fator R dela já incluem este mês
  const nextYearMonth = shiftYearMonth(competence, 1);
  const historyWithCurrent: MonthRecord[] = [
    ...history.filter((m) => m.yearMonth !== competence),
    {
      id: `projection-${competence}`,
      yearMonth: competence,
      revenue: currentMonthRevenue,
      payroll: chosenProlabore,
      inss: prolabore.inss,
      irrf: prolabore.irrf,
      dasPaid: simples.dasAmount,
    },
  ];
  const nextSimples = calculateSimplesNacional(0, 0, historyWithCurrent, nextYearMonth);

  // Consolidação Financeira (Lucro Isento e Dinheiro no Bolso)
  const dasAmount = simples.dasAmount;
  const prolaboreGross = prolabore.gross;
  const prolaboreNet = prolabore.net;
  const prolaboreTaxes = prolabore.inss + prolabore.irrf;

  // Honorários da contabilidade: despesa do mês que fica na conta antes de distribuir o lucro
  const accountingFee = Math.max(0, settings.accountingFee ?? 0);

  // Lucro líquido remanescente na PJ disponível para distribuição ao sócio
  const distributableProfit = Math.max(0, currentMonthRevenue - dasAmount - prolaboreGross - accountingFee);
  // A partir de 2026, distribuição acima de R$ 50 mil no mês sofre retenção de 10% sobre o total
  const dividendWithholding = calculateDividendWithholding(distributableProfit, settings);
  const taxFreeDividends = distributableProfit - dividendWithholding;

  // Total de dinheiro líquido no bolso do sócio (Pró-labore líquido + lucro distribuído líquido)
  const totalPocketCash = prolaboreNet + taxFreeDividends;

  // Custo tributário total (DAS + INSS + IRRF)
  const totalTaxes = dasAmount + prolaboreTaxes;
  const totalTaxBurdenPercent =
    currentMonthRevenue > 0 ? (totalTaxes / currentMonthRevenue) * 100 : 0;

  return {
    currentMonthRevenue,
    recommendedProlaboreGoldRule: recommendations.goldRuleMonthly,
    recommendedProlaboreCompensatory: recommendations.exactCompensatory,
    prolabore,
    simples,
    next: {
      yearMonth: nextYearMonth,
      rbt12: nextSimples.rbt12,
      factorRPercentage: nextSimples.factorRPercentage,
      isQualifiedForAnexo3: nextSimples.isQualifiedForAnexo3,
      anexoUsed: nextSimples.anexoUsed,
      faixa: nextSimples.faixa,
      effectiveRatePercentage: nextSimples.effectiveRatePercentage,
    },
    consolidated: {
      grossRevenue: currentMonthRevenue,
      dasAmount,
      prolaboreGross,
      prolaboreNet,
      prolaboreTaxes,
      distributableProfit,
      dividendWithholding,
      taxFreeDividends,
      totalPocketCash,
      totalTaxes,
      totalTaxBurdenPercent,
      accountingFee,
      keepInAccount: dasAmount + prolaboreTaxes + dividendWithholding + accountingFee,
      // O faturamento não cobre pró-labore bruto + DAS + contabilidade: quanto falta na conta
      shortfall: Math.max(0, prolaboreGross + dasAmount + accountingFee - currentMonthRevenue),
    },
  };
}

/**
 * Gera histórico padrão simulado de 11 meses anteriores para demonstração inicial e cálculo imediato
 */
export function generateSampleHistory(
  baseMonthlyRevenue = 20000,
  targetFactorR = 0.285
): MonthRecord[] {
  const months: MonthRecord[] = [];
  const now = new Date();

  for (let i = 11; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    // Variação leve no faturamento (+- 10%)
    const varianceFactor = 0.95 + (i % 3) * 0.05;
    const rev = Math.round(baseMonthlyRevenue * varianceFactor);
    const payroll = ceilToCents(rev * targetFactorR);

    // Impostos calculados pelas mesmas regras da apuração (tabelas da competência e RBT12 dos meses anteriores)
    const prolabore = calculateProlabore(payroll, settingsForCompetence(DEFAULT_SETTINGS, yearMonth));
    const das = calculateSimplesNacional(rev, payroll, months, yearMonth).dasAmount;

    months.push({
      id: `sample-${yearMonth}`,
      yearMonth,
      revenue: rev,
      payroll,
      inss: Math.round(prolabore.inss * 100) / 100,
      irrf: Math.round(prolabore.irrf * 100) / 100,
      dasPaid: Math.round(das * 100) / 100,
      notes: 'Histórico gerado para base de cálculo RBT12',
    });
  }

  return months;
}

/**
 * Preenche INSS, IRRF e DAS zerados de competências importadas quando dá para calcular
 * (INSS/IRRF pelo pró-labore; DAS pela receita). O DAS usa o histórico já mesclado, pois o
 * RBT12 depende dos meses anteriores. Esses campos são só informativos: Fator R e RBT12
 * usam apenas receita e folha.
 */
export function fillMissingTaxes(
  records: MonthRecord[],
  mergedHistory: MonthRecord[],
  settings: TaxSettings
): { records: MonthRecord[]; filledFields: number } {
  let filledFields = 0;
  const round = (v: number) => Math.round(v * 100) / 100;

  const filled = records.map((rec) => {
    const monthSettings = settingsForCompetence(settings, rec.yearMonth);
    const updates: Partial<MonthRecord> = {};
    const names: string[] = [];

    if (rec.payroll > 0 && (rec.inss === 0 || rec.irrf === 0)) {
      const prolabore = calculateProlabore(rec.payroll, monthSettings);
      if (rec.inss === 0 && prolabore.inss > 0) {
        updates.inss = round(prolabore.inss);
        names.push('INSS');
      }
      if (rec.irrf === 0 && prolabore.irrf > 0) {
        updates.irrf = round(prolabore.irrf);
        names.push('IRRF');
      }
    }
    if (rec.revenue > 0 && rec.dasPaid === 0) {
      const das = calculateSimplesNacional(rec.revenue, rec.payroll, mergedHistory, rec.yearMonth).dasAmount;
      if (das > 0) {
        updates.dasPaid = round(das);
        names.push('DAS');
      }
    }

    if (names.length === 0) return rec;
    filledFields += names.length;
    const note = `${names.join(', ')} calculado(s) na importação`;
    return { ...rec, ...updates, notes: rec.notes ? `${rec.notes} · ${note}` : note };
  });

  return { records: filled, filledFields };
}

/**
 * Configuração com as tabelas oficiais (salário mínimo, teto do INSS e IRRF) da competência informada.
 * Se a atualização automática estiver desligada, mantém a tabela escolhida pelo usuário.
 */
export function settingsForCompetence(settings: TaxSettings, yearMonth: string): TaxSettings {
  if (!settings.autoUpdateTables) return settings;
  const table = getTaxTableForCompetence(yearMonth);
  return {
    ...settings,
    taxVersionId: table.id,
    minimumWage: table.minimumWage,
    inssCeiling: table.inssCeiling,
    inssRate: table.inssRate,
    simplifiedIrDeduction: table.simplifiedIrDeduction,
    dependentDeduction: table.dependentDeduction,
  };
}

/**
 * Custo de uma estratégia em um mês: DAS + INSS + IRRF do pró-labore.
 * A CPP (INSS patronal) já está dentro do DAS nos Anexos III e V.
 */
export interface StrategyCost {
  anexo: 'III' | 'V';
  effectiveRatePercentage: number;
  das: number;
  prolaboreGross: number;
  inss: number;
  irrf: number;
  totalTaxes: number;
  dividendWithholding: number; // IR retido sobre o lucro distribuído (antecipação do IRPFM)
  // Receita - tributos - retenção = pró-labore líquido + lucro distribuído líquido (antes das despesas operacionais)
  availableToPartner: number;
}

export interface StrategyComparison {
  rbt12: number;
  comFatorR: StrategyCost; // Anexo III com pró-labore de 28% da receita
  semFatorR: StrategyCost; // Anexo V com pró-labore de 1 salário mínimo
  savings: number; // semFatorR - comFatorR (negativo = Fator R não compensa)
}

function buildStrategyCost(
  anexo: 'III' | 'V',
  revenue: number,
  rbt12: number,
  prolaboreGross: number,
  settings: TaxSettings
): StrategyCost {
  const table = anexo === 'III' ? ANEXO_III_TABLE : ANEXO_V_TABLE;
  const rate = calculateSimplesEffectiveRate(rbt12, getBracketForRbt12(rbt12, table));
  const das = revenue * rate;
  const prolabore = calculateProlabore(prolaboreGross, settings);
  const totalTaxes = das + prolabore.inss + prolabore.irrf;
  // "Vale a pena?" compara só impostos: os honorários da contabilidade ficam de fora
  const dividendWithholding = calculateDividendWithholding(
    Math.max(0, revenue - das - prolabore.gross),
    settings
  );
  return {
    anexo,
    effectiveRatePercentage: rate * 100,
    das,
    prolaboreGross: prolabore.gross,
    inss: prolabore.inss,
    irrf: prolabore.irrf,
    totalTaxes,
    dividendWithholding,
    availableToPartner: revenue - totalTaxes - dividendWithholding,
  };
}

/**
 * Compara, para o mesmo faturamento e o mesmo RBT12, as duas estratégias possíveis:
 * manter o Fator R (pró-labore de 28%, Anexo III) ou abrir mão dele (pró-labore mínimo, Anexo V).
 * Considera a estratégia mantida de forma contínua (Folha12 / RBT12 estável).
 */
export function compareFactorRStrategies(
  revenue: number,
  history: MonthRecord[],
  settings: TaxSettings,
  competence: string
): StrategyComparison {
  const { rbt12 } = calculateRBT12(history, competence, revenue, 0);
  const comFatorR = buildStrategyCost('III', revenue, rbt12, calculateGoldRuleProlabore(revenue, settings), settings);
  const semFatorR = buildStrategyCost('V', revenue, rbt12, settings.minimumWage, settings);
  return { rbt12, comFatorR, semFatorR, savings: semFatorR.totalTaxes - comFatorR.totalTaxes };
}

export interface RealizedMonthComparison {
  record: MonthRecord;
  factorRPercentage: number;
  factorRShortfall: number; // folha que faltou (R$) para 28%
  anexoUsed: 'III' | 'V';
  isProportional: boolean;
  dasExpected: number; // DAS calculado pelas regras do Simples para o mês
  dasReal: number; // DAS informado no histórico (ou o calculado, se não informado)
  dasInformed: boolean;
  realTotal: number; // DAS + INSS + IRRF efetivamente registrados
  comFatorR: StrategyCost;
  semFatorR: StrategyCost;
  result: number; // semFatorR - realTotal (positivo = sua escolha custou menos que ficar sem Fator R)
  missedSavings: number; // só em meses no Anexo V: quanto teria economizado mantendo o Fator R
}

/**
 * Confronta o que foi efetivamente pago em cada competência registrada com o que seria pago
 * sem o Fator R (Anexo V + pró-labore mínimo), usando as tabelas de cada competência.
 */
export function compareRealizedMonths(
  history: MonthRecord[],
  settings: TaxSettings,
  untilCompetence: string,
  count = 12
): RealizedMonthComparison[] {
  const months = history
    .filter((m) => m.yearMonth <= untilCompetence)
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
    .slice(-count);

  return months.map((record) => {
    const monthSettings = settingsForCompetence(settings, record.yearMonth);
    const simples = calculateSimplesNacional(record.revenue, record.payroll, history, record.yearMonth);
    const strategies = compareFactorRStrategies(record.revenue, history, monthSettings, record.yearMonth);
    const dasInformed = record.dasPaid > 0;
    const dasReal = dasInformed ? record.dasPaid : simples.dasAmount;
    const realTotal = dasReal + record.inss + record.irrf;

    return {
      record,
      factorRPercentage: simples.factorRPercentage,
      factorRShortfall: simples.factorRShortfall,
      anexoUsed: simples.anexoUsed,
      isProportional: simples.isProportional,
      dasExpected: simples.dasAmount,
      dasReal,
      dasInformed,
      realTotal,
      comFatorR: strategies.comFatorR,
      semFatorR: strategies.semFatorR,
      result: strategies.semFatorR.totalTaxes - realTotal,
      missedSavings: simples.anexoUsed === 'V' ? Math.max(0, realTotal - strategies.comFatorR.totalTaxes) : 0,
    };
  });
}

export interface FactorRMargin {
  nextYearMonth: string;
  nextFactorRPercentage: number;
  isNextQualified: boolean;
  minProlabore: number; // menor pró-labore deste mês que mantém o Fator R >= 28% na próxima competência
  prolaboreMargin: number; // pró-labore atual - mínimo (negativo = precisa aumentar)
  revenueCeiling: number; // maior faturamento deste mês que mantém o Fator R com o pró-labore atual
  revenueMargin: number; // quanto ainda pode faturar neste mês (negativo = já passou do limite)
  marginCost: number; // INSS + IRRF pagos a mais por manter pró-labore acima do mínimo necessário
  dasAtStake: number; // DAS a mais na próxima competência se cair no Anexo V (mesmo faturamento)
}

/**
 * Folga do Fator R: a próxima competência usa os 11 meses anteriores + o mês atual.
 * Com menos de 12 meses de histórico a lei usa médias, mas a razão Folha/Receita é a mesma.
 */
export function calculateFactorRMargin(
  revenue: number,
  prolabore: number,
  history: MonthRecord[],
  settings: TaxSettings,
  competence: string
): FactorRMargin {
  const previous11 = getPreviousMonths(history, competence, 11);
  const revenue11 = previous11.reduce((acc, m) => acc + m.revenue, 0);
  const payroll11 = previous11.reduce((acc, m) => acc + m.payroll, 0);

  const revenue12 = revenue11 + revenue;
  const payroll12 = payroll11 + prolabore;
  const nextFactorR = resolveFactorR(payroll12, revenue12);

  const minProlabore = Math.max(settings.minimumWage, ceilToCents(0.28 * revenue12 - payroll11));
  const prolaboreMargin = prolabore - minProlabore;
  const revenueCeiling = payroll12 / 0.28 - revenue11;
  const revenueMargin = revenueCeiling - revenue;

  const taxesOn = (gross: number) => {
    const p = calculateProlabore(gross, settings);
    return p.inss + p.irrf;
  };
  const marginCost = prolaboreMargin > 0 ? taxesOn(prolabore) - taxesOn(minProlabore) : 0;

  const nextYearMonth = shiftYearMonth(competence, 1);
  const historyWithCurrent: MonthRecord[] = [
    ...history.filter((m) => m.yearMonth !== competence),
    { id: `margin-${competence}`, yearMonth: competence, revenue, payroll: prolabore, inss: 0, irrf: 0, dasPaid: 0 },
  ];
  const { rbt12: nextRbt12 } = calculateRBT12(historyWithCurrent, nextYearMonth, revenue, 0);
  const rateIII = calculateSimplesEffectiveRate(nextRbt12, getBracketForRbt12(nextRbt12, ANEXO_III_TABLE));
  const rateV = calculateSimplesEffectiveRate(nextRbt12, getBracketForRbt12(nextRbt12, ANEXO_V_TABLE));

  return {
    nextYearMonth,
    nextFactorRPercentage: nextFactorR * 100,
    isNextQualified: nextFactorR >= 0.28,
    minProlabore,
    prolaboreMargin,
    revenueCeiling: Math.max(0, revenueCeiling),
    revenueMargin,
    marginCost,
    dasAtStake: revenue * (rateV - rateIII),
  };
}

/**
 * Tirar a folga: o mesmo mês com o menor pró-labore que mantém o Fator R em 28% na próxima
 * competência. Diz quanto a mais chega ao sócio (pró-labore líquido + antecipação de lucros).
 */
export function calculateSlackRelease(
  revenue: number,
  history: MonthRecord[],
  settings: TaxSettings,
  competence: string,
  current: MonthSummaryResult
): { minProlabore: number; extraForYou: number } {
  const minimum = calculateMonthSummary(revenue, history, { ...settings, prolaboreRule: 'exact_rbt12' }, competence);
  const youGet = (s: MonthSummaryResult) => s.consolidated.prolaboreNet + s.consolidated.taxFreeDividends;
  return { minProlabore: minimum.prolabore.gross, extraForYou: youGet(minimum) - youGet(current) };
}
