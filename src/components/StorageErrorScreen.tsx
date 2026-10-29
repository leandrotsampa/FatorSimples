import React, { useState } from 'react';
import { AlertTriangle, FolderOpen, Minus, RotateCw, X } from 'lucide-react';

// Banco não abriu (módulo do SQLite, arquivo bloqueado, pasta sem permissão): o app mostra o
// problema em vez de gravar os dados em outro lugar. Fica no tema claro, sem depender de nada do banco
export const StorageErrorScreen: React.FC<{ message: string; dbPath: string }> = ({ message, dbPath }) => {
  const api = window.electronAPI;
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="app-canvas min-h-screen flex flex-col font-sans text-slate-800">
      {/* Barra da janela: arrastar, minimizar e fechar (a janela não tem a moldura do sistema) */}
      <header className="app-drag h-12 shrink-0 flex items-center justify-end gap-1 px-3">
        {api?.windowControl && api.platform !== 'darwin' && (
          <>
            <button
              type="button"
              onClick={() => api.windowControl?.('minimize')}
              aria-label="Minimizar"
              className="w-8 h-7 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-900/[0.06] cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => api.windowControl?.('close')}
              aria-label="Fechar"
              className="w-8 h-7 flex items-center justify-center rounded-full text-slate-600 hover:bg-rose-500 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div
          role="alert"
          className="w-full max-w-xl bg-white rounded-2xl border border-slate-900/[0.06] shadow-[0_1px_2px_rgba(16,24,20,0.06),0_14px_36px_-18px_rgba(16,40,28,0.22)] p-7"
        >
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 shrink-0 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900">Não foi possível abrir o banco de dados</h1>
              <p className="mt-1 text-sm text-slate-600">
                O FatorSimples guarda tudo neste arquivo e não conseguiu abri-lo. Para não separar os seus dados,
                nada foi gravado em outro lugar.
              </p>
            </div>
          </div>

          <div className="mt-4 px-3 py-2 rounded-lg bg-slate-50 ring-1 ring-inset ring-slate-900/[0.05] font-mono text-xs text-slate-700 break-all">
            {dbPath}
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-800">O que tentar</p>
          <ul className="mt-1.5 space-y-1 text-sm text-slate-600 list-disc pl-5">
            <li>Feche outras janelas do FatorSimples que estejam usando este arquivo.</li>
            <li>Confira se a pasta permite gravar (pendrive protegido, pasta só de leitura ou sincronizada).</li>
            <li>Se o antivírus bloqueou o app, libere o FatorSimples e tente de novo.</li>
          </ul>

          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="mt-4 text-xs font-medium text-slate-500 hover:text-slate-800 underline underline-offset-2 cursor-pointer"
          >
            {showDetails ? 'Esconder detalhes' : 'Ver detalhes técnicos'}
          </button>
          {showDetails && <pre className="mt-2 p-3 rounded-lg bg-slate-900 text-slate-100 text-xs whitespace-pre-wrap break-all">{message}</pre>}

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => api?.relaunchApp?.()}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              Tentar de novo
            </button>
            <button
              type="button"
              onClick={() => api?.openDbFolder?.()}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              Abrir a pasta do banco
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
