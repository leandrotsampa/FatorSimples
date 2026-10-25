import React from 'react';
import { Building2, ChevronRight, MapPin } from 'lucide-react';
import type { TaxSettings } from '../types/tax';
import { companyInitials } from '../utils/companyInitials';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const greeting = (hour: number) => (hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite');

// Pílula flutuante, no estilo do cabeçalho do vídeo de referência
const pill =
  'h-9 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur ring-1 ring-slate-900/[0.06] dark:ring-white/[0.07] shadow-[0_1px_2px_rgba(16,24,20,0.06),0_8px_20px_-12px_rgba(16,40,28,0.25)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]';

// Barra de título da janela: arrasta a janela e deixa espaço para os botões nativos
export const TopBar: React.FC<{ settings: TaxSettings; onEditCompany: () => void }> = ({ settings, onEditCompany }) => {
  const now = new Date();
  const name = settings.companyName.trim() || 'Sua empresa';

  return (
    <header className="no-print app-drag titlebar-safe h-12 shrink-0 pl-4 sm:pl-6 flex items-center justify-between gap-3 z-30">
      <button
        type="button"
        onClick={onEditCompany}
        title="Editar os dados da empresa"
        className={`${pill} group min-w-0 flex items-center gap-2.5 pl-1 pr-3 cursor-pointer transition-colors hover:bg-white dark:hover:bg-slate-900`}
      >
        <span
          aria-hidden="true"
          className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold tracking-wide text-white bg-gradient-to-br from-emerald-500 to-emerald-700 dark:from-emerald-400 dark:to-emerald-600 dark:text-emerald-950"
        >
          {settings.companyName.trim() ? companyInitials(name) : <Building2 className="w-3.5 h-3.5" />}
        </span>
        <span className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{name}</span>
        <span className="hidden sm:flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 shrink-0">
          <span className="w-px h-3.5 bg-slate-900/10 dark:bg-white/10 mr-1.5" />
          <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          {settings.cityState || 'Cidade - UF'}
        </span>
        <span className="hidden lg:flex items-center text-xs font-num text-slate-500 dark:text-slate-400 shrink-0">
          <span className="w-px h-3.5 bg-slate-900/10 dark:bg-white/10 mx-2" />
          CNPJ {settings.cnpj || 'não informado'}
        </span>
        <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
      </button>

      <div className={`${pill} hidden md:flex items-center gap-2 px-3.5 text-xs shrink-0`}>
        <span className="font-semibold text-slate-800 dark:text-slate-100">{greeting(now.getHours())}</span>
        <span className="w-1 h-1 rounded-full bg-emerald-500" />
        <span className="text-slate-600 dark:text-slate-400">
          {WEEKDAYS[now.getDay()]}, {now.getDate()} de {MONTHS[now.getMonth()]}
        </span>
      </div>
    </header>
  );
};
