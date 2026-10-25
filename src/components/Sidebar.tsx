import React, { useEffect, useState } from 'react';
import {
  Calculator,
  History,
  Scale,
  FileText,
  Settings,
  Database,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  HardDrive,
} from 'lucide-react';
import { motion } from 'motion/react';
import { AnimatedNumber } from './ui/AnimatedNumber';
import { TaxSettings, MonthRecord } from '../types/tax';
import { formatCurrency, formatPercent, calculateRBT12, resolveFactorR } from '../utils/taxCalculations';
import { storageAdapter } from '../utils/storageAdapter';
import type { StorageMode } from '../types/electron';

const formatPercent1 = (n: number) => formatPercent(n, 1);

interface SidebarProps {
  activeTab: 'apuration' | 'history' | 'comparison' | 'report';
  setActiveTab: (tab: 'apuration' | 'history' | 'comparison' | 'report') => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onOpenSettings: () => void;
  onOpenSqliteManager: () => void;
  settings: TaxSettings;
  history: MonthRecord[];
  theme: 'dark' | 'light';
  toggleTheme: (origin?: HTMLElement | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  selectedMonth,
  setSelectedMonth,
  onOpenSettings,
  onOpenSqliteManager,
  settings,
  history,
  theme,
  toggleTheme,
}) => {
  // Stepper para avançar ou retroceder o mês rapidamente
  const handleStepMonth = (delta: number) => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + delta;

    if (month > 12) {
      month = 1;
      year += 1;
    } else if (month < 1) {
      month = 12;
      year -= 1;
    }

    const nextMonth = `${year}-${String(month).padStart(2, '0')}`;
    setSelectedMonth(nextMonth);
  };

  // Onde o banco está: ao lado do app (Windows/Linux) ou na pasta de dados do sistema (macOS)
  const [storageMode, setStorageMode] = useState<StorageMode>('portable');
  useEffect(() => {
    storageAdapter.getStorageMode().then(setStorageMode);
  }, []);

  // Verifica se a competência selecionada já está salva no histórico
  const isMonthSaved = history.some((h) => h.yearMonth === selectedMonth);

  // Estatísticas dos 12 meses anteriores à competência selecionada
  // Mesmo RBT12 usado na apuração: com menos de 12 meses, média × 12 (LC 123 art. 18 § 2º)
  const { rbt12, rawRbt12, folha12, monthsCount, isProportional } = calculateRBT12(history, selectedMonth, 0, 0);
  const factorR = monthsCount > 0 ? resolveFactorR(folha12, rawRbt12) * 100 : 0;

  interface NavItem {
    id: 'apuration' | 'history' | 'comparison' | 'report';
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }

  const navItems: NavItem[] = [
    {
      id: 'apuration',
      label: 'Apuração do Mês',
      description: 'Cálculo Fator R e DAS',
      icon: Calculator,
    },
    {
      id: 'history',
      label: 'Histórico 12 Meses',
      description: 'RBT12, Folha e Alíquotas',
      icon: History,
      badge: `${history.length}m`,
    },
    {
      id: 'comparison',
      label: 'Comparador Anexos',
      description: 'Anexo III vs Anexo V',
      icon: Scale,
    },
    {
      id: 'report',
      label: 'Relatório Oficial',
      description: 'Demonstrativo Contábil',
      icon: FileText,
    },
  ];

  return (
    <aside className="no-print w-64 md:w-72 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800/90 flex flex-col justify-between select-none shadow-xs transition-colors duration-200 shrink-0 h-screen sticky top-0 z-40">
      
      {/* Top Section */}
      <div className="flex flex-col flex-1 min-h-0">
        
        {/* Brand & Traffic lights */}
        {/* Topo: também arrasta a janela; no macOS deixa espaço para os botões nativos */}
        <div
          className={`app-drag p-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950 ${
            window.electronAPI?.platform === 'darwin' ? 'pt-9' : ''
          }`}
        >
          <div className="flex items-center gap-2.5">
            <img src="./icon.png" alt="" className="w-9 h-9 shrink-0" draggable={false} />
            <div className="min-w-0">
              <h1 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight truncate">
                FatorSimples
                <span className="ml-1.5 text-[10px] font-normal font-mono text-slate-400 dark:text-slate-500">
                  v{__APP_VERSION__}
                </span>
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="truncate">{settings.cityState || 'Brusque - SC'}</span>
                <span className="w-1 h-1 rounded-full bg-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Simples</span>
              </div>
            </div>
          </div>
        </div>

        {/* Competência Selector Widget */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800/70 bg-slate-100/60 dark:bg-slate-900/40">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            <span className="uppercase tracking-wider">Competência Ativa:</span>
            {isMonthSaved ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono font-bold">
                Salvo no SQLite
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-mono">
                Em Apuração
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleStepMonth(-1)}
              className="p-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex-1 relative">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full py-1 px-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-emerald-700 dark:text-emerald-400 font-mono font-bold text-xs text-center focus:outline-none focus:border-emerald-500 shadow-2xs cursor-pointer"
              />
            </div>

            <button
              onClick={() => handleStepMonth(1)}
              className="p-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 overflow-y-auto flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 py-1">
            Menu de Navegação
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`group relative w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors cursor-pointer border border-transparent ${
                  isActive
                    ? 'text-emerald-900 font-bold dark:text-emerald-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                {/* Destaque do item ativo: desliza entre os itens */}
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg bg-emerald-50 border border-emerald-300 shadow-xs dark:bg-emerald-500/15 dark:border-emerald-500/40"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <div className="relative flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-[color,background-color,translate] duration-[var(--duration-micro)] ${
                      isActive
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:translate-x-0.5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs truncate">{item.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate">
                      {item.description}
                    </div>
                  </div>
                </div>

                {item.badge && (
                  <motion.span
                    key={item.badge}
                    initial={{ scale: 0.8, opacity: 0.6 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                    className={`relative text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      isActive
                        ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </motion.span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Mini Fiscal Summary Box */}
        <div className="m-3 p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-[11px]">
            <span>Fator R {selectedMonth}:</span>
            <span
              className={`font-mono font-bold ${
                factorR >= 28 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {monthsCount > 0 ? <AnimatedNumber value={factorR} format={formatPercent1} /> : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-[11px]">
            <span title={isProportional && monthsCount > 0 ? `Média de ${monthsCount} meses × 12` : undefined}>
              RBT12 {isProportional ? '(proporcional)' : '(12m anteriores)'}:
            </span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
              {monthsCount > 0 ? <AnimatedNumber value={rbt12} format={formatCurrency} /> : 'sem histórico'}
            </span>
          </div>
          <div className="pt-1 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>fatorsimples.sqlite</span>
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
              {storageMode === 'system' ? 'Dados do sistema' : 'Junto ao app'}
            </span>
          </div>
        </div>

      </div>

      {/* Sidebar Footer Controls */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 space-y-1 text-xs">
        
        {/* Toggle Theme */}
        <button
          onClick={(e) => toggleTheme(e.currentTarget)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
            <span>Modo Visual</span>
          </span>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {theme === 'dark' ? 'Escuro (Dark)' : 'Claro (Light)'}
          </span>
        </button>

        {/* SQLite Manager */}
        <button
          onClick={onOpenSqliteManager}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Banco SQLite</span>
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
            {storageMode === 'system' ? 'Local' : 'Portátil'}
          </span>
        </button>

        {/* Configurações Fiscais */}
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>Configurações</span>
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            Tabelas 2026/27
          </span>
        </button>

      </div>

    </aside>
  );
};
