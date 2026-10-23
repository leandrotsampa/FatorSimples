import { IrrfBracket, SimplesBracket } from '../types/tax';

export interface TaxTableVersion {
  id: string;
  name: string;
  year: number;
  effectiveDate: string;
  legalBasis: string;
  minimumWage: number;
  inssCeiling: number;
  inssRate: number;
  dependentDeduction: number;
  simplifiedIrDeduction: number;
  irrfBrackets: {
    faixa: number;
    limit: number;
    rate: number;
    deduction: number;
  }[];
  // Redução mensal do IRRF aplicada após a tabela progressiva, pelo rendimento tributável bruto
  irrfReduction?: IrrfReductionRule;
  // Retenção de IR sobre lucros e dividendos pagos no mês à mesma pessoa física
  dividendWithholding?: DividendWithholdingRule;
}

/**
 * Retenção na fonte sobre lucros e dividendos (Lei 15.270/2025, art. 6º-A da Lei 9.250/1995):
 * se a mesma empresa pagar à mesma pessoa física mais que monthlyThreshold no mês,
 * retém rate sobre o valor TOTAL pago (não só sobre o excedente). Vale também para o Simples.
 * O valor retido é antecipação do IRPF mínimo anual (IRPFM) e é ajustado na declaração.
 */
export interface DividendWithholdingRule {
  legalBasis: string;
  monthlyThreshold: number;
  rate: number;
}

const LEI_15270_DIVIDENDS: DividendWithholdingRule = {
  legalBasis: 'Lei nº 15.270/2025',
  monthlyThreshold: 50000.0,
  rate: 0.1,
};

/**
 * Redução do IRRF mensal (Lei 15.270/2025):
 * - rendimento bruto até fullExemptionLimit: reduz até maxReduction (imposto zerado);
 * - até phaseOutLimit: reduz phaseOutBase - phaseOutRate x rendimento bruto;
 * - acima disso: sem redução. A redução nunca passa do imposto apurado.
 */
export interface IrrfReductionRule {
  legalBasis: string;
  fullExemptionLimit: number;
  maxReduction: number;
  phaseOutLimit: number;
  phaseOutBase: number;
  phaseOutRate: number;
}

const LEI_15270_REDUCTION: IrrfReductionRule = {
  legalBasis: 'Lei nº 15.270/2025',
  fullExemptionLimit: 5000.0,
  maxReduction: 312.89,
  phaseOutLimit: 7350.0,
  phaseOutBase: 978.62,
  phaseOutRate: 0.133145,
};

/**
 * Registro oficial de tabelas fiscais versionadas (Receita Federal, INSS e Simples Nacional).
 * Atualizado automaticamente conforme a legislação e competência anual (2024, 2025, 2026, 2027+).
 */
export const OFFICIAL_TAX_TABLES: Record<string, TaxTableVersion> = {
  // Tabela Vigente Oficial de 2026 (Ano corrente)
  '2026_oficial': {
    id: '2026_oficial',
    name: 'Vigente Oficial 2026 (Lei 15.191/2025 + redução da Lei 15.270/2025)',
    year: 2026,
    effectiveDate: 'Janeiro/2026 a Dezembro/2026',
    legalBasis: 'Lei nº 15.191/2025 (tabela progressiva), Lei nº 15.270/2025 (redução), Decreto do salário mínimo e Portaria Interministerial MPS/MF 2026',
    minimumWage: 1621.0,
    inssCeiling: 8475.55,
    inssRate: 0.11, // 11% contribuinte individual / pró-labore
    dependentDeduction: 189.59,
    simplifiedIrDeduction: 607.2, // Desconto simplificado mensal oficial (25% da faixa isenta)
    irrfBrackets: [
      { faixa: 1, limit: 2428.8, rate: 0.0, deduction: 0.0 },
      { faixa: 2, limit: 2826.65, rate: 0.075, deduction: 182.16 },
      { faixa: 3, limit: 3751.05, rate: 0.15, deduction: 394.16 },
      { faixa: 4, limit: 4664.68, rate: 0.225, deduction: 675.49 },
      { faixa: 5, limit: Infinity, rate: 0.275, deduction: 908.73 },
    ],
    irrfReduction: LEI_15270_REDUCTION,
    dividendWithholding: LEI_15270_DIVIDENDS,
  },

  // 2027: sem tabela oficial publicada, repete os valores de 2026 (a redução da Lei 15.270/2025 não tem prazo final)
  '2027_projetado_ldo': {
    id: '2027_projetado_ldo',
    name: '2027 (valores de 2026 até a publicação oficial)',
    year: 2027,
    effectiveDate: '01/01/2027 em diante (Automático para competências de 2027)',
    legalBasis: 'Valores de 2026 mantidos até a publicação do novo salário mínimo, teto do INSS e tabela do IRRF',
    minimumWage: 1621.0,
    inssCeiling: 8475.55,
    inssRate: 0.11,
    dependentDeduction: 189.59,
    simplifiedIrDeduction: 607.2,
    irrfBrackets: [
      { faixa: 1, limit: 2428.8, rate: 0.0, deduction: 0.0 },
      { faixa: 2, limit: 2826.65, rate: 0.075, deduction: 182.16 },
      { faixa: 3, limit: 3751.05, rate: 0.15, deduction: 394.16 },
      { faixa: 4, limit: 4664.68, rate: 0.225, deduction: 675.49 },
      { faixa: 5, limit: Infinity, rate: 0.275, deduction: 908.73 },
    ],
    irrfReduction: LEI_15270_REDUCTION,
    dividendWithholding: LEI_15270_DIVIDENDS,
  },

  // Tabela Oficial de 2025 (janeiro a abril): ainda a tabela progressiva de fevereiro/2024
  '2025_oficial': {
    id: '2025_oficial',
    name: 'Oficial 2025 · jan a abr (Lei 14.848/2024)',
    year: 2025,
    effectiveDate: '01/01/2025 a 30/04/2025',
    legalBasis: 'Lei nº 14.848/2024 (tabela do IRRF) e Portaria Interministerial MPS/MF nº 6/2025',
    minimumWage: 1518.0,
    inssCeiling: 8157.41,
    inssRate: 0.11,
    dependentDeduction: 189.59,
    simplifiedIrDeduction: 564.8,
    irrfBrackets: [
      { faixa: 1, limit: 2259.2, rate: 0.0, deduction: 0.0 },
      { faixa: 2, limit: 2826.65, rate: 0.075, deduction: 169.44 },
      { faixa: 3, limit: 3751.05, rate: 0.15, deduction: 381.44 },
      { faixa: 4, limit: 4664.68, rate: 0.225, deduction: 662.77 },
      { faixa: 5, limit: Infinity, rate: 0.275, deduction: 896.0 },
    ],
  },

  // Tabela Oficial de 2025 (maio a dezembro): nova faixa de isenção da MP 1.294/2025, convertida na Lei 15.191/2025
  '2025_maio_oficial': {
    id: '2025_maio_oficial',
    name: 'Oficial 2025 · mai a dez (Lei 15.191/2025)',
    year: 2025,
    effectiveDate: '01/05/2025 a 31/12/2025',
    legalBasis: 'MP nº 1.294/2025 convertida na Lei nº 15.191/2025 e Portaria Interministerial MPS/MF nº 6/2025',
    minimumWage: 1518.0,
    inssCeiling: 8157.41,
    inssRate: 0.11,
    dependentDeduction: 189.59,
    simplifiedIrDeduction: 607.2,
    irrfBrackets: [
      { faixa: 1, limit: 2428.8, rate: 0.0, deduction: 0.0 },
      { faixa: 2, limit: 2826.65, rate: 0.075, deduction: 182.16 },
      { faixa: 3, limit: 3751.05, rate: 0.15, deduction: 394.16 },
      { faixa: 4, limit: 4664.68, rate: 0.225, deduction: 675.49 },
      { faixa: 5, limit: Infinity, rate: 0.275, deduction: 908.73 },
    ],
  },

  // Tabela Oficial de 2024
  '2024_oficial': {
    id: '2024_oficial',
    name: 'Oficial 2024 (MP nº 1.206/2024)',
    year: 2024,
    effectiveDate: 'Fevereiro/2024 a Dezembro/2024',
    legalBasis: 'Medida Provisória nº 1.206/2024 e Portaria MPS/MF nº 2/2024',
    minimumWage: 1412.0,
    inssCeiling: 7786.02,
    inssRate: 0.11,
    dependentDeduction: 189.59,
    simplifiedIrDeduction: 564.8,
    irrfBrackets: [
      { faixa: 1, limit: 2259.2, rate: 0.0, deduction: 0.0 },
      { faixa: 2, limit: 2826.65, rate: 0.075, deduction: 169.44 },
      { faixa: 3, limit: 3751.05, rate: 0.15, deduction: 381.44 },
      { faixa: 4, limit: 4664.68, rate: 0.225, deduction: 662.77 },
      { faixa: 5, limit: Infinity, rate: 0.275, deduction: 896.0 },
    ],
  },
};

// Alias para compatibilidade retroativa com dados salvos no localStorage
OFFICIAL_TAX_TABLES['2025_2026_vigente'] = OFFICIAL_TAX_TABLES['2026_oficial'];

/**
 * Seleciona automaticamente a tabela oficial apropriada com base no ano da competência
 * (e no mês, em 2025, quando a tabela do IRRF mudou em maio).
 * Quando o ano 2027 chegar (ou você selecionar um mês de 2027), ele pega sozinho a tabela de 2027!
 */
export function getTaxTableForCompetence(yearMonth: string): TaxTableVersion {
  const year = parseInt(yearMonth.split('-')[0], 10);
  if (year <= 2024) {
    return OFFICIAL_TAX_TABLES['2024_oficial'];
  }
  if (year === 2025) {
    // A tabela progressiva mudou a partir da competência de maio/2025
    const month = parseInt(yearMonth.split('-')[1], 10);
    return month >= 5 ? OFFICIAL_TAX_TABLES['2025_maio_oficial'] : OFFICIAL_TAX_TABLES['2025_oficial'];
  }
  if (year === 2026) {
    return OFFICIAL_TAX_TABLES['2026_oficial'];
  }
  // Para 2027 ou anos futuros: ativa automaticamente a tabela de 2027+
  return OFFICIAL_TAX_TABLES['2027_projetado_ldo'];
}
