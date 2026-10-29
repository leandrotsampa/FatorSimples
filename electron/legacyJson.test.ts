import { describe, expect, it } from 'vitest';
import { importLegacyData } from './legacyJson.cjs';

// Banco falso com as operações que a importação usa
function fakeStore(initial: { months?: string[]; settings?: boolean; remote?: boolean; appState?: Record<string, string> } = {}) {
  const months = new Map<string, unknown>((initial.months ?? []).map((ym) => [ym, { yearMonth: ym, origem: 'banco' }]));
  const state: Record<string, string> = { ...(initial.appState ?? {}) };
  let settings: unknown = initial.settings ? { companyName: 'Do banco' } : null;
  let remote: unknown = initial.remote ? { doc: 'banco' } : null;
  return {
    months,
    state,
    get settings() {
      return settings;
    },
    get remote() {
      return remote;
    },
    hasMonth: (ym: string) => months.has(ym),
    saveMonth: (r: { yearMonth: string }) => void months.set(r.yearMonth, r),
    hasSettings: () => settings != null,
    saveSettings: (s: unknown) => void (settings = s),
    hasRemoteTables: () => remote != null,
    saveRemoteTables: (r: unknown) => void (remote = r),
    getAppState: (k: string) => state[k] ?? null,
    setAppState: (k: string, v: string) => void (state[k] = v),
  };
}

const json = {
  history: [
    { id: 'a', yearMonth: '2026-08', revenue: 1000, payroll: 280, inss: 0, irrf: 0, dasPaid: 0 },
    { id: 'b', yearMonth: '2026-09', revenue: 2000, payroll: 560, inss: 0, irrf: 0, dasPaid: 0 },
    { id: 'c', yearMonth: 'lixo', revenue: 1 },
  ],
  settings: { companyName: 'Do JSON' },
  remoteTables: { doc: 'json', checkedAt: '2026-10-01' },
  appState: { tour: '{"welcomed":true,"seen":[]}', theme: 'roxo' },
};

describe('importação única do JSON de reserva das versões antigas', () => {
  it('banco vazio recebe tudo o que é válido', () => {
    const store = fakeStore();
    const r = importLegacyData(json, store);
    expect([...store.months.keys()].sort()).toEqual(['2026-08', '2026-09']);
    expect(store.settings).toEqual({ companyName: 'Do JSON' });
    expect(store.remote).toEqual({ doc: 'json', checkedAt: '2026-10-01' });
    expect(store.state).toEqual({ tour: '{"welcomed":true,"seen":[]}' }); // tema inválido fica de fora
    expect(r).toEqual({ meses: 2, configuracoes: true, tabelas: true, estado: 1 });
  });

  it('o JSON só completa o que falta: nada do banco é sobrescrito', () => {
    const store = fakeStore({ months: ['2026-09'], settings: true, remote: true, appState: { tour: 'do banco' } });
    const r = importLegacyData(json, store);
    expect((store.months.get('2026-09') as { origem: string }).origem).toBe('banco');
    expect(store.months.has('2026-08')).toBe(true);
    expect(store.settings).toEqual({ companyName: 'Do banco' });
    expect(store.remote).toEqual({ doc: 'banco' });
    expect(store.state.tour).toBe('do banco');
    expect(r).toEqual({ meses: 1, configuracoes: false, tabelas: false, estado: 0 });
  });

  it('arquivo vazio ou em outro formato não quebra', () => {
    const store = fakeStore();
    expect(importLegacyData(null, store)).toEqual({ meses: 0, configuracoes: false, tabelas: false, estado: 0 });
    expect(importLegacyData({ history: 'x' }, store)).toEqual({ meses: 0, configuracoes: false, tabelas: false, estado: 0 });
  });
});
