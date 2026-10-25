import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { isNewerVersion, mergeTables, parseStoredRemoteTables, selectTableForCompetence, validateRemoteTables } from './remoteTables';
import { OFFICIAL_TAX_TABLES, getTaxTableForCompetence, type TaxTableVersion } from './taxTablesRegistry';

const table = (over: Partial<TaxTableVersion> & { id: string; validFrom: string }): TaxTableVersion => ({
  name: over.id,
  year: Number(over.validFrom.slice(0, 4)),
  effectiveDate: '',
  legalBasis: 'Lei teste',
  minimumWage: 1621,
  inssCeiling: 8475.55,
  inssRate: 0.11,
  dependentDeduction: 189.59,
  simplifiedIrDeduction: 607.2,
  irrfBrackets: [
    { faixa: 1, limit: 2428.8, rate: 0, deduction: 0 },
    { faixa: 2, limit: Infinity, rate: 0.275, deduction: 908.73 },
  ],
  ...over,
});

const doc = (tables: unknown[], extra: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  publishedAt: '2026-10-25',
  tables,
  ...extra,
});

describe('validateRemoteTables', () => {
  it('aceita um arquivo válido e converte o limite aberto (null) em Infinity', () => {
    const t = { ...table({ id: '2027_oficial', validFrom: '2027-01' }) };
    const json = JSON.parse(JSON.stringify(doc([t])));
    const res = validateRemoteTables(json);
    expect(res?.tables[0].irrfBrackets[1].limit).toBe(Infinity);
    expect(res?.publishedAt).toBe('2026-10-25');
  });

  it('recusa versão de esquema que o app não conhece', () => {
    expect(validateRemoteTables(doc([table({ id: 'x', validFrom: '2027-01' })], { schemaVersion: 2 }))).toBeNull();
  });

  it('recusa tabela incompleta ou com números impossíveis', () => {
    const semSalario = { ...table({ id: 'a', validFrom: '2027-01' }), minimumWage: undefined };
    const aliquotaAbsurda = table({ id: 'b', validFrom: '2027-01', inssRate: 11 });
    const mesInvalido = table({ id: 'c', validFrom: '2027-13' });
    const faixasForaDeOrdem = table({
      id: 'd',
      validFrom: '2027-01',
      irrfBrackets: [
        { faixa: 1, limit: 3000, rate: 0, deduction: 0 },
        { faixa: 2, limit: 2000, rate: 0.075, deduction: 100 },
      ],
    });
    for (const bad of [semSalario, aliquotaAbsurda, mesInvalido, faixasForaDeOrdem]) {
      expect(validateRemoteTables(JSON.parse(JSON.stringify(doc([bad]))))).toBeNull();
    }
  });

  it('recusa conteúdo que não é o arquivo de tabelas', () => {
    expect(validateRemoteTables(null)).toBeNull();
    expect(validateRemoteTables('404: Not Found')).toBeNull();
    expect(validateRemoteTables({ schemaVersion: 1, tables: [] })).toBeNull();
  });
});

describe('selectTableForCompetence', () => {
  const builtin = Object.values(OFFICIAL_TAX_TABLES);

  it('escolhe pela vigência de cada tabela', () => {
    expect(selectTableForCompetence(builtin, '2024-06').id).toBe('2024_oficial');
    expect(selectTableForCompetence(builtin, '2025-04').id).toBe('2025_oficial');
    expect(selectTableForCompetence(builtin, '2025-05').id).toBe('2025_maio_oficial');
    expect(selectTableForCompetence(builtin, '2026-10').id).toBe('2026_oficial');
    expect(selectTableForCompetence(builtin, '2028-03').id).toBe('2027_projetado_ldo');
  });

  it('uma tabela baixada com vigência mais nova passa a valer sozinha', () => {
    const merged = mergeTables(builtin, [table({ id: '2027_oficial', validFrom: '2027-01', minimumWage: 1700 })]);
    expect(selectTableForCompetence(merged, '2027-02').minimumWage).toBe(1700);
    expect(selectTableForCompetence(merged, '2026-12').id).toBe('2026_oficial');
  });

  it('getTaxTableForCompetence continua dando as mesmas tabelas de antes', () => {
    expect(getTaxTableForCompetence('2024-01').id).toBe('2024_oficial');
    expect(getTaxTableForCompetence('2025-04').id).toBe('2025_oficial');
    expect(getTaxTableForCompetence('2025-05').id).toBe('2025_maio_oficial');
    expect(getTaxTableForCompetence('2026-01').id).toBe('2026_oficial');
    expect(getTaxTableForCompetence('2027-06').id).toBe('2027_projetado_ldo');
  });
});

describe('mergeTables', () => {
  it('tabela baixada substitui a embutida de mesmo id e acrescenta as novas', () => {
    const merged = mergeTables(
      [table({ id: 'a', validFrom: '2026-01', minimumWage: 1 })],
      [table({ id: 'a', validFrom: '2026-01', minimumWage: 2 }), table({ id: 'b', validFrom: '2027-01' })]
    );
    expect(merged.map((t) => [t.id, t.minimumWage])).toEqual([
      ['a', 2],
      ['b', 1621],
    ]);
  });
});

describe('o apelido antigo não aparece como tabela', () => {
  it('2025_2026_vigente continua resolvendo, mas não é listado', () => {
    expect(OFFICIAL_TAX_TABLES['2025_2026_vigente']?.id).toBe('2026_oficial');
    expect(Object.keys(OFFICIAL_TAX_TABLES)).not.toContain('2025_2026_vigente');
  });
});

describe('isNewerVersion', () => {
  it('compara versões semânticas, aceitando o "v" da tag', () => {
    expect(isNewerVersion('v1.2.0', '1.1.1')).toBe(true);
    expect(isNewerVersion('1.10.0', '1.9.9')).toBe(true);
    expect(isNewerVersion('v1.1.1', '1.1.1')).toBe(false);
    expect(isNewerVersion('1.0.9', '1.1.1')).toBe(false);
    expect(isNewerVersion('lixo', '1.1.1')).toBe(false);
  });
});

describe('arquivo publicado tax-tables/tabelas.json', () => {
  it('é válido e igual às tabelas embutidas no app', () => {
    const json = JSON.parse(readFileSync('tax-tables/tabelas.json', 'utf-8'));
    const res = validateRemoteTables(json);
    expect(res).not.toBeNull();
    expect(res!.tables).toEqual(Object.values(OFFICIAL_TAX_TABLES));
  });
});

describe('parseStoredRemoteTables', () => {
  it('lê o que o banco devolve: arquivo válido e data da última verificação', () => {
    const json = JSON.parse(JSON.stringify(doc([table({ id: '2027_oficial', validFrom: '2027-01' })])));
    const res = parseStoredRemoteTables({ doc: json, checkedAt: '2026-10-25T10:00:00.000Z' });
    expect(res.doc?.tables[0].id).toBe('2027_oficial');
    expect(res.checkedAt).toBe('2026-10-25T10:00:00.000Z');
  });

  it('banco sem nada ou com conteúdo inválido não aplica tabela nenhuma', () => {
    expect(parseStoredRemoteTables(null)).toEqual({ doc: null, checkedAt: null });
    expect(parseStoredRemoteTables({ doc: { lixo: true }, checkedAt: 5 })).toEqual({ doc: null, checkedAt: null });
  });
});
