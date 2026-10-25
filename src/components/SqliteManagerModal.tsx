import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Download,
  Upload,
  HardDrive,
  Cloud,
  CheckCircle2,
  Copy,
  Code2,
  Share2,
  FolderOpen,
  FolderSync,
  Laptop,
} from 'lucide-react';
import { TaxSettings, MonthRecord } from '../types/tax';
import { generateSqliteDump } from '../utils/sqliteExport';
import { ModalShell } from './ui/ModalShell';

interface SqliteManagerModalProps {
  onClose: () => void;
  settings: TaxSettings;
  history: MonthRecord[];
  onExportData: () => void;
  onImportData: (content: string) => void;
}

export const SqliteManagerModal: React.FC<SqliteManagerModalProps> = ({
  onClose,
  settings,
  history,
  onExportData,
  onImportData,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'portability' | 'schema' | 'electron'>('portability');
  const [dbPath, setDbPath] = useState<string>('');
  const [storageMode, setStorageMode] = useState<'portable' | 'system'>('portable');
  const isElectron = Boolean(window.electronAPI?.isElectron);
  const isSystem = storageMode === 'system';

  useEffect(() => {
    if (window.electronAPI?.getDbPath) {
      window.electronAPI.getDbPath().then((p) => {
        if (p) setDbPath(p);
      });
      window.electronAPI.getStorageMode?.().then(setStorageMode);
    }
  }, []);


  const sqlDump = generateSqliteDump(settings, history);

  const handleOpenFolder = async () => {
    if (window.electronAPI?.openDbFolder) {
      await window.electronAPI.openDbFolder();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      alert('Selecione um arquivo .json válido.');
      return;
    }

    file.text().then(onImportData);
  };

  const copySqlSchema = () => {
    navigator.clipboard.writeText(sqlDump);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  return (
    <ModalShell ariaLabel="Banco SQLite local" panelClassName="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Banco SQLite local
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-950/30 text-xs">
          <button
            onClick={() => setActiveTab('portability')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === 'portability'
                ? 'bg-white text-emerald-700 border border-slate-300 shadow-2xs dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            01. Onde ficam os dados
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === 'schema'
                ? 'bg-white text-emerald-700 border border-slate-300 shadow-2xs dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            02. Tabelas e Schema SQL
          </button>

          <button
            onClick={() => setActiveTab('electron')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === 'electron'
                ? 'bg-white text-emerald-700 border border-slate-300 shadow-2xs dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            03. Empacotamento Portátil
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* TAB 1: Portabilidade */}
          {activeTab === 'portability' && (
            <div className="space-y-4">
              
              {/* Box Portabilidade Direta */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 rounded-lg text-emerald-950 dark:text-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{isSystem ? 'Salvo na pasta de dados do sistema' : 'Salvo na mesma pasta do aplicativo'}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-semibold font-mono">
                    {isSystem ? 'Pasta do sistema' : 'Modo Portátil Ativo'}
                  </span>
                </div>

                <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                  O arquivo de banco <strong className="text-emerald-700 dark:text-emerald-300 font-mono">fatorsimples.sqlite</strong> é gravado {isSystem ? <strong>na pasta de dados do sistema, fora do aplicativo, e continua lá quando você atualizar o app</strong> : <strong>diretamente ao lado do arquivo do aplicativo</strong>}:
                </p>

                {/* Diagrama de Pasta */}
                <div className="bg-slate-900 text-slate-200 p-3 rounded-md font-mono text-[11px] border border-slate-800">
                  {isSystem ? (
                    <>
                      <div className="text-emerald-400 font-semibold mb-1">📁 ~/Library/Application Support/FatorSimples/</div>
                      <div className="pl-4 text-emerald-300">└── 💾 <span className="font-semibold text-emerald-400">fatorsimples.sqlite</span> &nbsp;(Banco com todos os meses e alíquotas)</div>
                    </>
                  ) : (
                    <>
                      <div className="text-emerald-400 font-semibold mb-1">📁 MinhaPasta (ou Pendrive / OneDrive / Google Drive):</div>
                      <div className="pl-4 text-slate-300">├── 🚀 <span className="text-sky-300 font-semibold">FatorSimples (.exe ou .AppImage)</span> &nbsp;(Seu aplicativo)</div>
                      <div className="pl-4 text-emerald-300">└── 💾 <span className="font-semibold text-emerald-400">fatorsimples.sqlite</span> &nbsp;(Banco com todos os meses e alíquotas)</div>
                    </>
                  )}
                </div>

                {/* Caminho Atual Detectado */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-emerald-200 dark:border-emerald-800/40 text-[11px]">
                  <div className="text-slate-600 dark:text-slate-400 truncate">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Local do banco: </span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-300">
                      {dbPath || (isElectron ? 'fatorsimples.sqlite' : 'fatorsimples.sqlite (Modo Navegador / Web)')}
                    </span>
                  </div>

                  {isElectron && (
                    <button
                      onClick={handleOpenFolder}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium transition-colors cursor-pointer text-[10px] shrink-0"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Abrir pasta do banco</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Dicas de Sincronização entre Computadores */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div className="bg-slate-50 dark:bg-slate-950/70 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                    <FolderSync className="w-4 h-4 text-sky-500" />
                    <span>1. Usar no Pendrive ou Nuvem</span>
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    Basta copiar a pasta do executável para um <strong>Pendrive</strong> ou para o <strong>Google Drive / OneDrive</strong>. Ao abrir em qualquer máquina, o histórico carrega automaticamente da pasta.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/70 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                    <Laptop className="w-4 h-4 text-emerald-500" />
                    <span>2. Transferência Rápida (.json)</span>
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    Você também pode exportar os dados das competências em <code className="text-emerald-600 dark:text-emerald-400">.json</code> abaixo a qualquer momento para backup ou envio para seu contador.
                  </p>
                </div>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Exportar Dados (.json)</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    Gera um arquivo JSON com os dados da empresa e as {history.length} competências cadastradas (faturamento, folha e impostos).
                  </p>
                  <button
                    onClick={onExportData}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-md transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar Dados (.json)</span>
                  </button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Importar Dados</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    Carregue um arquivo .json. Dados da empresa só mudam se estiverem no arquivo; meses já existentes são substituídos.
                  </p>
                  <label className="w-full py-2 px-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Selecionar Arquivo no PC</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Schema SQL */}
          {activeTab === 'schema' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Script de Estrutura SQLite (Tabelas e View RBT12):
                </span>
                <button
                  onClick={copySqlSchema}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-[11px] font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  {copiedCode ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Copiado!' : 'Copiar SQL'}</span>
                </button>
              </div>

              <pre className="bg-slate-950 text-emerald-400 p-4 rounded-lg font-mono text-[10px] overflow-x-auto max-h-72 border border-slate-800 leading-relaxed">
                {sqlDump}
              </pre>
            </div>
          )}

          {/* TAB 3: Electron Code */}
          {activeTab === 'electron' && (
            <div className="space-y-3">
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                O arquivo <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-emerald-600 dark:text-emerald-400 font-mono">electron/main.cjs</code> do projeto já está programado para detectar a pasta física do <code className="font-mono text-sky-500">.exe</code> (ou pendrive) e salvar o <code className="font-mono text-emerald-500">fatorsimples.sqlite</code> lado a lado:
              </p>

              <pre className="bg-slate-950 text-slate-200 p-4 rounded-lg font-mono text-[10px] overflow-x-auto max-h-72 border border-slate-800 leading-relaxed">
{`// electron/main.cjs - Modo Portátil nativo
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');

// 1. Detecta a pasta onde o .exe está rodando (Pendrive / Pasta local / Nuvem)
function getExecutableDirectory() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) return process.env.PORTABLE_EXECUTABLE_DIR;
  if (app.isPackaged) return path.dirname(app.getPath('exe'));
  return process.cwd();
}

// 2. Grava o banco fatorsimples.sqlite exatamente na mesma pasta do .exe
const dbPath = path.join(getExecutableDirectory(), 'fatorsimples.sqlite');
const db = new Database(dbPath);

// 3. Permite abrir a pasta no Windows Explorer com 1 clique
ipcMain.handle('sqlite:open-db-folder', () => {
  shell.showItemInFolder(dbPath);
});`}
              </pre>

              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/40 rounded text-sky-900 dark:text-sky-300 text-[11px]">
                💡 <strong>Dica de Empacotamento:</strong> Se for gerar o instalador com <code className="font-mono">electron-builder</code>, basta usar o target <code className="font-mono font-bold">portable</code> para Windows. O arquivo gerado será um executável único que você pode levar para qualquer computador.
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-200 rounded-md font-semibold text-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
    </ModalShell>
  );
};
