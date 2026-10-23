import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig(() => {
  return {
    // Caminhos relativos para o Electron carregar dist/index.html via file://
    base: './',
    // Versão do package.json exibida no app (a mesma do nome do executável)
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
  };
});
