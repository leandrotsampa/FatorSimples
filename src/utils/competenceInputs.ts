import type { MonthRecord, TaxSettings } from '../types/tax';
import { calculateGoldRuleProlabore } from './taxCalculations';

// Valores de entrada da Apuração para uma competência: os reais salvos ou, em apuração, zerados nos 28%
export function competenceInputs(
  record: MonthRecord | undefined,
  settings: TaxSettings
): { revenue: number; rule: TaxSettings['prolaboreRule']; manualProlabore: number } {
  if (!record) return { revenue: 0, rule: 'auto_28_month', manualProlabore: 0 };
  // Pró-labore salvo igual aos 28% (tolerância de 1 centavo de arredondamento) = regra 28%
  const goldRule = calculateGoldRuleProlabore(record.revenue, settings);
  const isGoldRule = Math.abs(record.payroll - goldRule) <= 0.01 + 1e-9;
  return { revenue: record.revenue, rule: isGoldRule ? 'auto_28_month' : 'manual', manualProlabore: record.payroll };
}
