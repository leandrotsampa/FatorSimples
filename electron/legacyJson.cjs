/**
 * Importação única do JSON de reserva das versões antigas (fatorsimples_data.json), que fazia o
 * papel de banco quando o SQLite não carregava. O arquivo só completa o que falta no banco; nada do
 * banco é sobrescrito. Função pura (as operações do banco chegam em `store`), testada em
 * legacyJson.test.ts.
 */
const { appStateEntryFor } = require('./appState.cjs');

const isMonth = (v) => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

function importLegacyData(data, store) {
  const result = { meses: 0, configuracoes: false, tabelas: false, estado: 0 };
  if (!data || typeof data !== 'object') return result;

  if (Array.isArray(data.history)) {
    for (const r of data.history) {
      if (!r || !isMonth(r.yearMonth) || typeof r.revenue !== 'number' || store.hasMonth(r.yearMonth)) continue;
      store.saveMonth({
        id: typeof r.id === 'string' ? r.id : `month-${r.yearMonth}`,
        yearMonth: r.yearMonth,
        revenue: r.revenue,
        payroll: Number(r.payroll) || 0,
        inss: Number(r.inss) || 0,
        irrf: Number(r.irrf) || 0,
        dasPaid: Number(r.dasPaid) || 0,
        notes: typeof r.notes === 'string' ? r.notes : undefined,
      });
      result.meses++;
    }
  }

  if (data.settings && typeof data.settings === 'object' && !store.hasSettings()) {
    store.saveSettings(data.settings);
    result.configuracoes = true;
  }

  if (data.remoteTables && typeof data.remoteTables === 'object' && !store.hasRemoteTables()) {
    store.saveRemoteTables(data.remoteTables);
    result.tabelas = true;
  }

  if (data.appState && typeof data.appState === 'object') {
    for (const [key, value] of Object.entries(data.appState)) {
      const entry = appStateEntryFor(key, value);
      if (!entry || store.getAppState(entry.key) != null) continue;
      store.setAppState(entry.key, entry.value);
      result.estado++;
    }
  }
  return result;
}

module.exports = { importLegacyData };
