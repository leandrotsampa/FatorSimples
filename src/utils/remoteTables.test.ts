import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { isNewerThanBuiltin, planStartupChecks, shouldShowUpdateNotice, isNewerVersion, mergeTables, parseStoredRemoteTables, selectTableForCompetence, validateRemoteTables } from './remoteTables';
import { BUILTIN_TABLES_DATE } from './taxTablesRegistry';
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

describe('ids e valores do arquivo baixado (entrada não confiável)', () => {
  it('recusa ids perigosos ou que colidem com o registro', () => {
    for (const id of ['__proto__', '2025_2026_vigente', '2026', 'Ano-2027', 'constructor', '']) {
      const json = JSON.parse(JSON.stringify(doc([table({ id, validFrom: '2027-01' })])));
      expect(validateRemoteTables(json)).toBeNull();
    }
  });

  it('recusa valores fora da realidade (ex.: erro de digitação no salário mínimo)', () => {
    const bad = [
      table({ id: 'a_2027', validFrom: '2027-01', minimumWage: 16210 }),
      table({ id: 'b_2027', validFrom: '2027-01', inssCeiling: 100 }),
      table({ id: 'c_2027', validFrom: '2027-01', dependentDeduction: 99999 }),
    ];
    for (const t of bad) expect(validateRemoteTables(JSON.parse(JSON.stringify(doc([t]))))).toBeNull();
  });

  it('recusa arquivo com tabelas demais', () => {
    const many = Array.from({ length: 60 }, (_, i) => table({ id: `t_${i}`, validFrom: '2027-01' }));
    expect(validateRemoteTables(JSON.parse(JSON.stringify(doc(many))))).toBeNull();
  });
});

describe('tabelas guardadas mais velhas que as embutidas', () => {
  it('só valem se o arquivo for mais novo que as tabelas desta versão do app', () => {
    expect(isNewerThanBuiltin('2026-11-02')).toBe(true);
    expect(isNewerThanBuiltin(BUILTIN_TABLES_DATE)).toBe(false);
    expect(isNewerThanBuiltin('2025-01-01')).toBe(false);
  });

  it('o arquivo publicado tem a data das tabelas embutidas', () => {
    const json = JSON.parse(readFileSync('tax-tables/tabelas.json', 'utf-8'));
    expect(json.publishedAt).toBe(BUILTIN_TABLES_DATE);
  });
});

describe('o que o app confere ao abrir', () => {
  const agora = new Date('2026-10-28T12:00:00Z');

  it('a versão nova é conferida em toda abertura, mesmo com a atualização de tabelas desligada', () => {
    expect(planStartupChecks({ autoUpdateTables: false, checkedAt: null, now: agora }).version).toBe(true);
    expect(planStartupChecks({ autoUpdateTables: true, checkedAt: '2026-10-28T11:00:00Z', now: agora }).version).toBe(true);
  });

  it('as tabelas fiscais continuam no máximo uma vez por dia, e só com a opção ligada', () => {
    expect(planStartupChecks({ autoUpdateTables: true, checkedAt: '2026-10-28T11:00:00Z', now: agora }).tables).toBe(false);
    expect(planStartupChecks({ autoUpdateTables: true, checkedAt: '2026-10-27T11:00:00Z', now: agora }).tables).toBe(true);
    expect(planStartupChecks({ autoUpdateTables: false, checkedAt: null, now: agora }).tables).toBe(false);
  });
});

describe('aviso de versão nova: Mais tarde e Ignorar esta versão', () => {
  it('mostra quando há versão nova e nada foi escolhido', () => {
    expect(shouldShowUpdateNotice({ latest: '1.3.4', ignored: null, later: false })).toBe(true);
  });

  it('sem versão nova não mostra', () => {
    expect(shouldShowUpdateNotice({ latest: null, ignored: null, later: false })).toBe(false);
  });

  it('"Mais tarde" esconde só nesta abertura', () => {
    expect(shouldShowUpdateNotice({ latest: '1.3.4', ignored: null, later: true })).toBe(false);
  });

  it('"Ignorar esta versão" esconde essa versão e volta a avisar quando sair outra mais nova', () => {
    expect(shouldShowUpdateNotice({ latest: '1.3.4', ignored: '1.3.4', later: false })).toBe(false);
    expect(shouldShowUpdateNotice({ latest: '1.3.5', ignored: '1.3.4', later: false })).toBe(true);
    expect(shouldShowUpdateNotice({ latest: '1.4.0', ignored: 'v1.3.4', later: false })).toBe(true);
  });
});

describe('versão ignorada corrompida', () => {
  it('é desconsiderada: o aviso não some para sempre', () => {
    expect(shouldShowUpdateNotice({ latest: '1.3.4', ignored: 'lixo', later: false })).toBe(true);
  });
});
