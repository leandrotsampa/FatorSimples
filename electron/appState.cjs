/**
 * Estado do app guardado no banco, junto com os dados (tabela app_state). Função pura, testada em
 * appState.test.ts: só passam chaves conhecidas e textos de tamanho razoável vindos da página.
 */
const APP_STATE_KEYS = ['tour']; // tutorial: o que já foi mostrado
const MAX_VALUE_LENGTH = 64 * 1024;

function appStateEntryFor(key, value) {
  if (!APP_STATE_KEYS.includes(key)) return null;
  if (typeof value !== 'string' || value.length > MAX_VALUE_LENGTH) return null;
  return { key, value };
}

module.exports = { APP_STATE_KEYS, appStateEntryFor };
