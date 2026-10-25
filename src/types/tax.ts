/**
 * Tipos e interfaces para cálculo do Simples Nacional, Fator R, INSS e IRPF.
 */

export interface MonthRecord {
  id: string;
  yearMonth: string; // Formato: "AAAA-MM", ex: "2024-09"
  revenue: number;    // Faturamento bruto do mês
  payroll: number;    // Folha de salários / Pró-labore bruto com encargos
  inss: number;       // INSS apurado/retido
  irrf: number;       // IRRF apurado/retido
  dasPaid: number;    // Simples Nacional apurado/pago
  isCurrentMonth?: boolean;
  notes?: string;
}

export interface TaxSettings {
  taxVersionId: string;           // Versão da tabela (ex: '2025_2026_vigente', '2024_oficial')
  autoUpdateTables: boolean;      // Se verdadeiro, atualiza automaticamente ao mudar a competência
  lastTableUpdateDate: string;    // Data da última checagem/atualização da tabela
  minimumWage: number;            // Salário mínimo vigente (ex: 1518.00)
  inssCeiling: number;            // Teto máximo de contribuição INSS (ex: 8157.41)
  inssRate: number;               // Alíquota INSS pró-labore (11% = 0.11)
  dependentsCount: number;        // Número de dependentes para IRRF
  dependentDeduction: number;     // Parcela dedutível por dependente (R$ 189.59)
  simplifiedIrDeduction: number;  // Desconto simplificado mensal IRPF (R$ 607.40 / 564.80)
  companyName: string;            // Razão Social
  cnpj: string;                   // CNPJ
  cityState: string;              // Cidade / UF (ex: Brusque - SC)
  cnae: string;                   // Atividade / CNAE (ex: 6201-5/01 Desenvolvimento de Software)
  prolaboreRule: 'auto_28_month' | 'exact_rbt12' | 'manual';
  manualProlaboreAmount: number;
  accountingFee?: number;         // Honorários mensais da contabilidade (ficam na conta da empresa)
}

export interface IrrfBracket {
  limit: number;
  rate: number;
  deduction: number;
}

export interface SimplesBracket {
  faixa: number;
  limit: number;
  nominalRate: number;
  deduction: number;
}

export interface ProlaboreCalculation {
  gross: number;
  inss: number;
  inssCeilingApplied: boolean;
  irrfBase: number;
  irrfLegalDeductionTotal: number;
  irrfSimplifiedDeduction: number;
  irrfChosenMethod: 'legal' | 'simplified';
  irrfEffectiveDeduction: number;
  irrfRate: number;
  irrfParcelaADeduzir: number;
  irrfBeforeReduction: number; // imposto pela tabela progressiva
  irrfReduction: number;       // redução da Lei 15.270/2025 (0 quando não se aplica)
  irrf: number;
  net: number;
  effectiveTaxRate: number;
}

export interface SimplesCalculation {
  rbt12: number;
  folha12: number;
  monthsCount: number;
  isProportional: boolean;
  factorR: number;
  factorRPercentage: number;
  isQualifiedForAnexo3: boolean;
  factorRShortfall: number; // folha que faltou (R$) para chegar a 28%; 0 quando atingido
  anexoUsed: 'III' | 'V';
  faixa: number;
  nominalRate: number;
  deduction: number;
  effectiveRate: number;
  effectiveRatePercentage: number;
  dasAmount: number;
  // Comparativo com Anexo V (caso ficasse sem Fator R)
  anexoVFaixa: number;
  anexoVNominalRate: number;
  anexoVDeduction: number;
  anexoVEffectiveRate: number;
  anexoVDasAmount: number;
  savingsWithFactorR: number;
}

export interface MonthSummaryResult {
  currentMonthRevenue: number;
  recommendedProlaboreGoldRule: number; // 28% do faturamento do mês
  recommendedProlaboreCompensatory: number; // Compensação exata RBT12
  prolabore: ProlaboreCalculation;
  simples: SimplesCalculation;
  // Projeção da competência seguinte (RBT12 e Fator R já incluindo o mês apurado)
  next: {
    yearMonth: string;
    rbt12: number;
    factorRPercentage: number;
    isQualifiedForAnexo3: boolean;
    anexoUsed: 'III' | 'V';
    faixa: number;
    effectiveRatePercentage: number;
  };
  consolidated: {
    grossRevenue: number;
    dasAmount: number;
    prolaboreGross: number;
    prolaboreNet: number;
    prolaboreTaxes: number; // INSS + IRRF
    distributableProfit: number; // Lucro que sobra na PJ após DAS e pró-labore
    dividendWithholding: number; // IR retido sobre a distribuição (Lei 15.270/2025; 0 se até o limite)
    taxFreeDividends: number; // Lucro distribuído líquido que chega ao sócio
    totalPocketCash: number;  // Pró-labore líquido + Lucro isento
    totalTaxes: number;       // DAS + INSS + IRRF
    totalTaxBurdenPercent: number; // (totalTaxes / grossRevenue) * 100
    accountingFee: number;    // Honorários da contabilidade do mês
    keepInAccount: number;    // Fica na conta da empresa: DAS + INSS + IRRF + IR sobre lucros + contabilidade
  };
}
