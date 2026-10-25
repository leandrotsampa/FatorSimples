import { describe, expect, it } from 'vitest';
import { ensureSettingsColumns } from './settingsSchema.cjs';

// Banco falso: só o que a migração usa (PRAGMA table_info e exec)
function fakeDb(columns: string[]) {
  const execs: string[] = [];
  return {
    execs,
    prepare: (sql: string) => ({ all: () => (sql.includes('table_info') ? columns.map((name) => ({ name })) : []) }),
    exec: (sql: string) => {
      execs.push(sql);
    },
  };
}

describe('ensureSettingsColumns', () => {
  it('banco antigo ganha a coluna de honorários sem recriar a tabela', () => {
    const db = fakeDb(['id', 'company_name', 'manual_prolabore_amount']);
    ensureSettingsColumns(db);
    expect(db.execs).toEqual(['ALTER TABLE tax_settings ADD COLUMN accounting_fee REAL DEFAULT 0']);
  });

  it('banco já migrado não é alterado', () => {
    const db = fakeDb(['id', 'company_name', 'accounting_fee']);
    ensureSettingsColumns(db);
    expect(db.execs).toEqual([]);
  });
});
