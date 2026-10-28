import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDownToLine, Building2, ChevronRight, Copy, MapPin, Minus, Square, X } from 'lucide-react';
import type { TaxSettings } from '../types/tax';
import { companyInitials } from '../utils/companyInitials';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const greeting = (hour: number) => (hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite');

// Pílula flutuante, no estilo do cabeçalho do vídeo de referência
const pill =
  'h-9 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur ring-1 ring-slate-900/[0.06] dark:ring-white/[0.07] shadow-[0_1px_2px_rgba(16,24,20,0.06),0_8px_20px_-12px_rgba(16,40,28,0.25)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]';

// Minimizar, maximizar/restaurar e fechar desenhados pelo app (Windows e Linux): fazem parte da página,
// então trocam de tema junto com ela. No macOS ficam os botões coloridos do sistema
const WindowControls: React.FC = () => {
  const api = window.electronAPI;
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    api?.isWindowMaximized?.().then(setMaximized);
    return api?.onWindowMaximized?.(setMaximized);
  }, [api]);
  if (!api?.windowControl || api.platform === 'darwin') return null;

  const button =
    'w-8 h-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 transition-colors cursor-pointer';
  return (
    <div className={`${pill} flex items-center gap-0.5 px-1 shrink-0`} role="group" aria-label="Janela">
      <button
        type="button"
        onClick={() => api.windowControl?.('minimize')}
        className={`${button} hover:bg-slate-900/[0.06] hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white`}
        title="Minimizar"
        aria-label="Minimizar"
      >
        <Minus className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => api.windowControl?.('toggle-maximize')}
        className={`${button} hover:bg-slate-900/[0.06] hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white`}
        title={maximized ? 'Restaurar' : 'Maximizar'}
        aria-label={maximized ? 'Restaurar' : 'Maximizar'}
      >
        {maximized ? (
          <Copy className="w-3 h-3 -scale-x-100" strokeWidth={2} />
        ) : (
          <Square className="w-3 h-3" strokeWidth={2} />
        )}
      </button>
      <button
        type="button"
        onClick={() => api.windowControl?.('close')}
        className={`${button} hover:bg-rose-500 hover:text-white dark:hover:bg-rose-500 dark:hover:text-white`}
        title="Fechar"
        aria-label="Fechar"
      >
        <X className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
    </div>
  );
};

const secondaryNoticeButton =
  'h-7 px-2 rounded-full text-emerald-800/80 hover:text-emerald-950 hover:bg-emerald-600/10 dark:text-emerald-200/80 dark:hover:text-white dark:hover:bg-emerald-400/10 transition-colors cursor-pointer whitespace-nowrap';

// Aviso discreto de versão nova (portátil e instalado): "Baixar" abre a página da versão no GitHub;
// "Mais tarde" esconde até a próxima abertura; "Ignorar esta versão" só volta com outra mais nova
const UpdateNotice: React.FC<{ version: string; onDownload: () => void; onLater: () => void; onIgnore: () => void }> = ({
  version,
  onDownload,
  onLater,
  onIgnore,
}) => (
  <motion.div
    role="status"
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
    transition={{ duration: 0.25 }}
    className="h-9 flex items-center gap-1 pl-3 pr-1 rounded-full text-xs shrink-0 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-100 dark:ring-emerald-400/25"
  >
    <span className="relative flex w-2 h-2 mr-1" aria-hidden="true">
      <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
      <span className="relative w-2 h-2 rounded-full bg-emerald-500" />
    </span>
    <span className="whitespace-nowrap">
      Versão <b className="font-num font-semibold">{version}</b>
      <span className="hidden xl:inline"> disponível</span> —
    </span>
    <button
      type="button"
      onClick={onDownload}
      title="Abre a página da versão no navegador"
      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full font-semibold text-emerald-800 hover:bg-emerald-600 hover:text-white dark:text-emerald-300 dark:hover:bg-emerald-500 dark:hover:text-emerald-950 transition-colors cursor-pointer"
    >
      <ArrowDownToLine className="w-3.5 h-3.5" />
      Baixar
    </button>
    <span className="w-px h-3.5 bg-emerald-700/20 dark:bg-emerald-300/20 mx-0.5" aria-hidden="true" />
    <button
      type="button"
      onClick={onLater}
      title="Esconder até a próxima abertura do app"
      className={secondaryNoticeButton}
    >
      Mais tarde
    </button>
    <button
      type="button"
      onClick={onIgnore}
      title={`Não avisar mais sobre a versão ${version}; avisa de novo quando sair outra mais nova`}
      className={secondaryNoticeButton}
    >
      Ignorar esta versão
    </button>
  </motion.div>
);

// Barra de título da janela: arrasta a janela (duplo clique maximiza) e traz os botões da janela
export const TopBar: React.FC<{
  settings: TaxSettings;
  onEditCompany: () => void;
  newVersion?: string | null;
  onDownloadNewVersion?: () => void;
  onLaterNewVersion?: () => void;
  onIgnoreNewVersion?: () => void;
}> = ({ settings, onEditCompany, newVersion, onDownloadNewVersion, onLaterNewVersion, onIgnoreNewVersion }) => {
  const now = new Date();
  const name = settings.companyName.trim() || 'Sua empresa';

  return (
    <header className="no-print app-drag h-12 shrink-0 pl-4 sm:pl-6 pr-3 flex items-center justify-between gap-3 z-30">
      <button
        type="button"
        onClick={onEditCompany}
        title="Editar os dados da empresa"
        className={`${pill} group min-w-0 overflow-hidden flex items-center gap-2.5 pl-1 pr-3 cursor-pointer transition-colors hover:bg-white dark:hover:bg-slate-900`}
      >
        <span
          aria-hidden="true"
          className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold tracking-wide text-white bg-gradient-to-br from-emerald-500 to-emerald-700 dark:from-emerald-400 dark:to-emerald-600 dark:text-emerald-950"
        >
          {settings.companyName.trim() ? companyInitials(name) : <Building2 className="w-3.5 h-3.5" />}
        </span>
        <span className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{name}</span>
        <span className={`hidden ${newVersion ? 'xl:flex' : 'sm:flex'} items-center gap-1 text-xs text-slate-600 dark:text-slate-400 shrink-0`}>
          <span className="w-px h-3.5 bg-slate-900/10 dark:bg-white/10 mr-1.5" />
          <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          {settings.cityState || 'Cidade - UF'}
        </span>
        <span className={`hidden ${newVersion ? '2xl:flex' : 'lg:flex'} items-center text-xs font-num text-slate-500 dark:text-slate-400 shrink-0`}>
          <span className="w-px h-3.5 bg-slate-900/10 dark:bg-white/10 mx-2" />
          CNPJ {settings.cnpj || 'não informado'}
        </span>
        <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
      </button>

      <div className="flex items-center gap-2 shrink-0">
        <AnimatePresence>
          {newVersion && (
            <UpdateNotice
              key={newVersion}
              version={newVersion}
              onDownload={() => onDownloadNewVersion?.()}
              onLater={() => onLaterNewVersion?.()}
              onIgnore={() => onIgnoreNewVersion?.()}
            />
          )}
        </AnimatePresence>
        {/* Com o aviso de versão nova, a saudação (e a cidade e o CNPJ da empresa) só aparecem em janelas largas */}
        <div className={`${pill} hidden ${newVersion ? '2xl:flex' : 'md:flex'} items-center gap-2 px-3.5 text-xs shrink-0`}>
          <span className="font-semibold text-slate-800 dark:text-slate-100">{greeting(now.getHours())}</span>
          <span className="w-1 h-1 rounded-full bg-emerald-500" />
          <span className="text-slate-600 dark:text-slate-400">
            {WEEKDAYS[now.getDay()]}, {now.getDate()} de {MONTHS[now.getMonth()]}
          </span>
        </div>
        <WindowControls />
      </div>
    </header>
  );
};
