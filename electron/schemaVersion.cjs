// Versão da estrutura do banco (PRAGMA user_version). Sobe quando uma versão do app muda tabelas.
// Um banco gravado por uma versão mais nova do app não é aberto por uma mais antiga: ela não
// conhece as mudanças e poderia gravar por cima delas
const SCHEMA_VERSION = 1;

function schemaCheck(current) {
  const v = Number(current) || 0;
  if (v > SCHEMA_VERSION) return 'newer';
  if (v < SCHEMA_VERSION) return 'upgrade';
  return 'ok';
}

module.exports = { SCHEMA_VERSION, schemaCheck };
