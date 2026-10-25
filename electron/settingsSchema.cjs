/**
 * Migrações leves da tabela tax_settings: adiciona colunas novas a bancos criados
 * por versões anteriores, sem recriar a tabela nem perder dados.
 */

const SETTINGS_COLUMNS = [{ name: 'accounting_fee', ddl: 'REAL DEFAULT 0' }];

function ensureSettingsColumns(db) {
  const existing = new Set(db.prepare('PRAGMA table_info(tax_settings)').all().map((c) => c.name));
  for (const col of SETTINGS_COLUMNS) {
    if (!existing.has(col.name)) {
      db.exec(`ALTER TABLE tax_settings ADD COLUMN ${col.name} ${col.ddl}`);
    }
  }
}

module.exports = { ensureSettingsColumns };
