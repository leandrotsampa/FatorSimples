/**
 * Moldura da janela: barra de título desenhada pelo app (sem o menu nativo)
 * e os atalhos que antes vinham do menu padrão do Electron.
 * Funções puras, testadas em windowChrome.test.ts.
 */

const TITLEBAR_HEIGHT = 40;

// Cores dos botões nativos (minimizar/maximizar/fechar) iguais ao fundo da janela (--canvas em index.css)
function titleBarOverlayFor(theme) {
  return theme === 'light'
    ? { color: '#e7eee9', symbolColor: '#334155', height: TITLEBAR_HEIGHT }
    : { color: '#080b0a', symbolColor: '#aeb9b2', height: TITLEBAR_HEIGHT };
}

function windowChromeOptions(platform, theme) {
  if (platform === 'darwin') {
    return { titleBarStyle: 'hiddenInset' };
  }
  return { titleBarStyle: 'hidden', titleBarOverlay: titleBarOverlayFor(theme) };
}

// Atalho de teclado tratado pelo app; null deixa a tecla seguir para a página
function shortcutFor(input, isPackaged) {
  const mod = input.control || input.meta;
  if (!mod) return null;
  const key = String(input.key).toLowerCase();
  if (key === '=' || key === '+') return 'zoom-in';
  if (key === '-') return 'zoom-out';
  if (key === '0') return 'zoom-reset';
  if (isPackaged) return null;
  if (key === 'r' && !input.shift) return 'reload';
  if (key === 'i' && input.shift) return 'devtools';
  return null;
}

module.exports = { TITLEBAR_HEIGHT, titleBarOverlayFor, windowChromeOptions, shortcutFor };
