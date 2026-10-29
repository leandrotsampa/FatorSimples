// Links que o app pode abrir no navegador do sistema: só https e só os sites de onde vêm os
// documentos (Receita Federal e Simples Nacional) e as versões do app no GitHub
const ALLOWED_HOSTS = ['receita.fazenda.gov.br', 'receitafederal.gov.br', 'gov.br', 'github.com'];

function isAllowedExternalUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && ALLOWED_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

module.exports = { isAllowedExternalUrl };
