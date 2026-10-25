import { MonthRecord, TaxSettings } from '../types/tax';

/**
 * Gera script SQL compatível com SQLite para criar as tabelas
 * e inserir todo o histórico e configurações locais.
 */
export function generateSqliteDump(settings: TaxSettings, history: MonthRecord[]): string {
  const lines: string[] = [
    '-- ============================================================',
    '-- FatorSimples - Banco de Dados SQLite (Simples Nacional & Fator R)',
    `-- Gerado em: ${new Date().toISOString()}`,
    `-- Município: ${settings.cityState || 'Brusque - SC'}`,
    '-- ============================================================',
    '',
    'PRAGMA foreign_keys = ON;',
    '',
    '-- Tabela de Configurações Fiscais da Empresa',
    'CREATE TABLE IF NOT EXISTS tax_settings (',
    '    id INTEGER PRIMARY KEY AUTOINCREMENT,',
    '    company_name TEXT NOT NULL,',
    '    cnpj TEXT,',
    '    city_state TEXT,',
    '    cnae TEXT,',
    '    tax_version_id TEXT,',
    '    minimum_wage REAL,',
    '    inss_ceiling REAL,',
    '    inss_rate REAL,',
    '    dependents_count INTEGER,',
    '    simplified_ir_deduction REAL,',
    '    dependent_deduction REAL,',
    '    prolabore_rule TEXT,',
    '    accounting_fee REAL DEFAULT 0,',
    '    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP',
    ');',
    '',
    '-- Tabela de Histórico Mensal de Faturamento e Folha (RBT12)',
    'CREATE TABLE IF NOT EXISTS monthly_history (',
    '    id TEXT PRIMARY KEY,',
    '    year_month TEXT NOT NULL UNIQUE,',
    '    revenue REAL NOT NULL,',
    '    payroll REAL NOT NULL,',
    '    inss REAL DEFAULT 0,',
    '    irrf REAL DEFAULT 0,',
    '    das_paid REAL DEFAULT 0,',
    '    factor_r REAL,',
    '    notes TEXT,',
    '    created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
    ');',
    '',
    '-- Limpar e inserir configuração atual',
    'DELETE FROM tax_settings;',
    `INSERT INTO tax_settings (company_name, cnpj, city_state, cnae, tax_version_id, minimum_wage, inss_ceiling, inss_rate, dependents_count, simplified_ir_deduction, dependent_deduction, prolabore_rule, accounting_fee) VALUES (`,
    `    '${(settings.companyName || '').replace(/'/g, "''")}',`,
    `    '${(settings.cnpj || '').replace(/'/g, "''")}',`,
    `    '${(settings.cityState || '').replace(/'/g, "''")}',`,
    `    '${(settings.cnae || '').replace(/'/g, "''")}',`,
    `    '${settings.taxVersionId}',`,
    `    ${settings.minimumWage},`,
    `    ${settings.inssCeiling},`,
    `    ${settings.inssRate},`,
    `    ${settings.dependentsCount},`,
    `    ${settings.simplifiedIrDeduction},`,
    `    ${settings.dependentDeduction},`,
    `    '${settings.prolaboreRule}',`,
    `    ${Number(settings.accountingFee) || 0}`,
    ');',
    '',
    '-- Inserção das competências do histórico',
  ];

  history.forEach((rec) => {
    const factorR = rec.revenue > 0 ? rec.payroll / rec.revenue : 0;
    const safeNotes = (rec.notes || '').replace(/'/g, "''");
    lines.push(
      `INSERT OR REPLACE INTO monthly_history (id, year_month, revenue, payroll, inss, irrf, das_paid, factor_r, notes) VALUES ('${rec.id}', '${rec.yearMonth}', ${rec.revenue}, ${rec.payroll}, ${rec.inss}, ${rec.irrf}, ${rec.dasPaid}, ${factorR.toFixed(4)}, '${safeNotes}');`
    );
  });

  lines.push('');
  lines.push('-- View para apuração rápida de RBT12 (últimos 12 meses)');
  lines.push('CREATE VIEW IF NOT EXISTS v_rbt12_summary AS');
  lines.push('SELECT ');
  lines.push('    COUNT(*) as total_months,');
  lines.push('    SUM(revenue) as rbt12,');
  lines.push('    SUM(payroll) as folha12,');
  lines.push('    (SUM(payroll) / SUM(revenue)) * 100 as factor_r_percent');
  lines.push('FROM (');
  lines.push('    SELECT revenue, payroll FROM monthly_history ORDER BY year_month DESC LIMIT 12');
  lines.push(');');
  lines.push('');

  return lines.join('\n');
}
