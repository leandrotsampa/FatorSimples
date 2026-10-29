import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Copy, Database, Download, FileUp, FolderOpen, HardDrive, Upload, X } from 'lucide-react';
import { TaxSettings, MonthRecord } from '../types/tax';
import { ModalShell } from './ui/ModalShell';
import { btnGhost, btnPrimary, modalPanel, tile } from './ui/card';

interface SqliteManagerModalProps {
  onClose: () => void;
  settings: TaxSettings;
  history: MonthRecord[];
  onExportData: () => void;
  onImportData: (content: string) => void;
  // Abre a importação da declaração do PGDAS-D e dos pagamentos
  onImportDocuments?: () => void;
}

// Uma ação de backup: o que faz, por quê, e o botão
const Action: React.FC<{ icon: React.ElementType; title: string; text: React.ReactNode; children: React.ReactNode }> = ({
  icon: Icon,
  title,
  text,
  children,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 first:pt-0 last:pb-0">
    <span className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
      <Icon className="w-5 h-5" />
    </span>
    <div className="flex-1 min-w-0">
      <div className="font-semibold text-slate-900 dark:text-white">{title}</div>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-snug">{text}</p>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

// Dados e backup: onde fica o banco, como copiar e como trazer dados de outro lugar
export const SqliteManagerModal: React.FC<SqliteManagerModalProps> = ({ onClose, history, onExportData, onImportData, onImportDocuments }) => {
  const [dbPath, setDbPath] = useState<string>('');
  const [storageMode, setStorageMode] = useState<'portable' | 'system'>('portable');
  const [copied, setCopied] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {
      setFileError('Escolha um arquivo .json exportado pelo FatorSimples.');
      return;
    }
    setFileError(null);
    file.text().then(onImportData);
  };

  const copyPath = () => {
    if (!dbPath) return;
    void navigator.clipboard.writeText(dbPath);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ModalShell ariaLabel="Dados e backup" panelClassName={`${modalPanel} w-full max-w-2xl max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden`}>
      <div className="flex items-start justify-between gap-4 px-6 sm:px-8 pt-6 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-[-0.015em] text-slate-900 dark:text-white">Dados e backup</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Tudo fica num arquivo só, neste computador. Nada vai para a internet.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-6 space-y-6">
        {/* Onde fica o banco */}
        <section className={`${tile} p-5`}>
          <div className="flex flex-wrap items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">Onde ficam os seus dados</h3>
            <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
              {!isElectron ? 'Navegador' : isSystem ? 'App instalado' : 'App portátil'}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {!isElectron
              ? 'No navegador, os dados ficam guardados nele mesmo. Use o app para ter o arquivo fatorsimples.sqlite.'
              : isSystem
                ? 'Na pasta de dados do sistema, fora do programa: atualizar ou desinstalar o app não apaga nada.'
                : 'Na mesma pasta do FatorSimples. Copie a pasta inteira para um pendrive ou para a nuvem e os dados vão junto.'}
          </p>
          {isElectron && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <code
                title={dbPath}
                className="flex-1 min-w-0 truncate px-3 py-2 rounded-xl bg-white dark:bg-slate-950 ring-1 ring-inset ring-slate-900/[0.07] dark:ring-white/[0.06] text-xs text-slate-700 dark:text-slate-300 select-all"
              >
                {dbPath || 'fatorsimples.sqlite'}
              </code>
              <button type="button" onClick={copyPath} className={`${btnGhost} h-9`} aria-label="Copiar o caminho do banco">
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
              <button type="button" onClick={() => void window.electronAPI?.openDbFolder?.()} className={`${btnPrimary} h-9`}>
                <FolderOpen className="w-4 h-4" /> Abrir a pasta
              </button>
            </div>
          )}
        </section>

        {/* Backup e transferência */}
        <section>
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-3">Backup e transferência</h3>
          <div className="divide-y divide-slate-900/[0.06] dark:divide-white/[0.06]">
            {isElectron && (
              <Action
                icon={HardDrive}
                title="Copiar o banco inteiro"
                text={
                  <>
                    Com o app fechado, copie o arquivo <b className="font-mono text-[13px]">fatorsimples.sqlite</b>. Ele leva tudo: meses,
                    empresa e preferências.
                  </>
                }
              >
                <span className="text-xs text-slate-500 dark:text-slate-400">Pela pasta, acima</span>
              </Action>
            )}
            <Action
              icon={Download}
              title="Exportar os meses"
              text={`Um arquivo .json com a empresa e ${history.length} ${history.length === 1 ? 'mês' : 'meses'}, para guardar ou mandar à contabilidade.`}
            >
              <button type="button" onClick={onExportData} className={btnGhost}>
                Exportar
              </button>
            </Action>
            <Action icon={Upload} title="Importar de um .json" text="Traz meses exportados de outro computador. Meses que já existem são substituídos.">
              <button type="button" onClick={() => fileRef.current?.click()} className={btnGhost}>
                Escolher arquivo
              </button>
              <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileChange} />
            </Action>
            {onImportDocuments && (
              <Action icon={FileUp} title="Importar os PDFs da Receita" text="A declaração do PGDAS-D e o relatório de pagamentos viram meses do Histórico.">
                <button type="button" onClick={onImportDocuments} className={btnGhost}>
                  Importar PDFs
                </button>
              </Action>
            )}
          </div>
          {fileError && (
            <div role="alert" className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-100 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              {fileError}
            </div>
          )}
        </section>
      </div>

      <div className="flex justify-end px-6 sm:px-8 py-4 border-t border-slate-900/[0.06] dark:border-white/[0.06]">
        <button type="button" onClick={onClose} className={btnGhost}>
          Fechar
        </button>
      </div>
    </ModalShell>
  );
};
