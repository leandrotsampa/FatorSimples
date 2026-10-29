/**
 * Estado do app guardado no banco, junto com os dados (tabela app_state): o tutorial, o tema, as
 * preferências de interface e a versão ignorada. Função pura, testada em appState.test.ts: só passam
 * chaves conhecidas, cada uma com o formato dela.
 */
const VALIDATORS = {
  tour: (v) => v.length <= 64 * 1024, // o que o tutorial já mostrou
  theme: (v) => v === 'light' || v === 'dark',
  uiPrefs: (v) => v.length <= 4 * 1024, // sons e menu recolhido
  ignoredVersion: (v) => /^v?\d+\.\d+\.\d+$/.test(v), // "Ignorar esta versão"
};
const APP_STATE_KEYS = Object.keys(VALIDATORS);

function appStateEntryFor(key, value) {
  if (!APP_STATE_KEYS.includes(key) || typeof value !== 'string') return null;
  return VALIDATORS[key](value) ? { key, value } : null;
}

module.exports = { APP_STATE_KEYS, appStateEntryFor };
