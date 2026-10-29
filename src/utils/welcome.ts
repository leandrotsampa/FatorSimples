// Tela inicial: só na primeira abertura, com o app ainda sem nada (nenhum mês e a empresa padrão)
// e sem o registro, no banco, de que ela já foi deixada
import type { MonthRecord, TaxSettings } from '../types/tax';
import { DEFAULT_SETTINGS } from './taxCalculations';

export function shouldShowWelcome(welcome: string | null, history: MonthRecord[], settings: TaxSettings): boolean {
  if (welcome === 'done' || welcome === 'demo' || history.length > 0) return false;
  return settings.cnpj === DEFAULT_SETTINGS.cnpj && settings.companyName === DEFAULT_SETTINGS.companyName;
}
