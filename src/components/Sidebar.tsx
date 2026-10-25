import React, { useEffect, useRef, useState } from 'react';
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
  HardDrive,
  CalendarDays,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AnimatedNumber } from './ui/AnimatedNumber';
import { RailTooltip } from './ui/RailTooltip';
import { LiquidIndicator } from './ui/LiquidIndicator';
import { playSound } from '../hooks/useSound';
import { TaxSettings, MonthRecord } from '../types/tax';
import { formatCurrency, formatPercent, calculateRBT12, resolveFactorR } from '../utils/taxCalculations';
import { storageAdapter } from '../utils/storageAdapter';
import { DURATION, EASE_OUT, instantIf } from '../utils/motion';
import type { StorageMode } from '../types/electron';

const formatPercent1 = (n: number) => formatPercent(n, 1);

const MONTH_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Larguras do menu: expandido (o de sempre) e recolhido em trilho de ícones
const WIDTH_EXPANDED = 288;
const WIDTH_COLLAPSED = 68;
const widthSpring = { type: 'spring', stiffness: 400, damping: 40 } as const;

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
  isLoading?: boolean;
  mode: 'expanded' | 'collapsed';
  onToggleMode: () => void;
}

// Texto que some na hora ao recolher e aparece logo depois da largura ao expandir
const Reveal: React.FC<{ show: boolean; children: React.ReactNode; className?: string }> = ({
  show,
  children,
  className,
}) =>
  show ? (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.micro, delay: 0.06 }}
    >
      {children}
    </motion.div>
  ) : null;

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
  isLoading = false,
  mode,
  onToggleMode,
}) => {
  const expanded = mode !== 'collapsed';
  const collapsed = !expanded;
  const reduceMotion = Boolean(useReducedMotion());
  const widthTransition = instantIf(reduceMotion, widthSpring);

  // Stepper para avançar ou retroceder o mês rapidamente
  // Troca pelas setas: o mês desliza na direção usada (digitar no campo não anima)
  const [step, setStep] = useState<{ n: number; dir: number }>({ n: 0, dir: 0 });
  const handleStepMonth = (delta: number) => {
    playSound('tick');
    setStep((s) => ({ n: s.n + 1, dir: delta }));
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

  // Seletor de competência no menu recolhido: painel flutuante à direita do botão
  const navRef = useRef<HTMLElement>(null);
  const monthButtonRef = useRef<HTMLButtonElement>(null);
  const monthPanelRef = useRef<HTMLDivElement>(null);
  const [monthPanelPos, setMonthPanelPos] = useState<{ x: number; y: number } | null>(null);
  const toggleMonthPanel = () => {
    if (monthPanelPos) {
      setMonthPanelPos(null);
      return;
    }
    const r = monthButtonRef.current?.getBoundingClientRect();
    if (r) setMonthPanelPos({ x: r.right + 10, y: r.top });
  };
  useEffect(() => {
    if (!monthPanelPos) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMonthPanelPos(null);
      monthButtonRef.current?.focus();
    };
    // Leva o foco para dentro do painel recém-aberto
    const focusFrame = requestAnimationFrame(() =>
      monthPanelRef.current?.querySelector<HTMLElement>('button, input')?.focus()
    );
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!monthPanelRef.current?.contains(t) && !monthButtonRef.current?.contains(t)) setMonthPanelPos(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [monthPanelPos]);
  // Ao expandir o menu o painel não faz mais sentido
  useEffect(() => {
    if (expanded) setMonthPanelPos(null);
  }, [expanded]);

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

  const [, monthNum] = selectedMonth.split('-');
  const monthShort = MONTH_SHORT[parseInt(monthNum, 10) - 1] ?? '';

  const competenceStatus = isMonthSaved ? (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-num font-bold">
      Salvo no SQLite
    </span>
  ) : (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-num">
      Em Apuração
    </span>
  );

  const monthStepper = (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleStepMonth(-1)}
        className="p-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="Mês anterior"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex-1 relative overflow-hidden rounded-md">
        <motion.div
          key={step.n}
          initial={step.n === 0 || reduceMotion ? false : { x: step.dir * 18, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: DURATION.base, ease: EASE_OUT }}
        >
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="Competência ativa"
            className="w-full py-1 px-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-emerald-700 dark:text-emerald-400 font-num font-bold text-xs text-center focus:outline-none focus:border-emerald-500 shadow-2xs cursor-pointer"
          />
        </motion.div>
      </div>

      <button
        onClick={() => handleStepMonth(1)}
        className="p-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="Próximo mês"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  // Anel do Fator R no menu recolhido (0 a 40%, meta em 28%)
  const ringPct = Math.min(1, Math.max(0, factorR / 40));
  const ringOk = factorR >= 28;

  const footerButtonClass = `w-full flex items-center rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
    collapsed ? 'justify-center h-9' : 'justify-between px-2.5 py-1.5'
  }`;

  return (
    <>
      {/* Espaço que o menu ocupa no layout */}
      <motion.div
        className="no-print shrink-0 h-screen sticky top-0 z-50"
        initial={false}
        animate={{ width: mode === 'expanded' ? WIDTH_EXPANDED : WIDTH_COLLAPSED }}
        transition={widthTransition}
      >
        <motion.aside
          className="absolute inset-y-0 left-0 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800/90 flex flex-col justify-between select-none shadow-xs overflow-x-hidden"
          initial={false}
          animate={{ width: expanded ? WIDTH_EXPANDED : WIDTH_COLLAPSED }}
          transition={widthTransition}
        >
          {/* Top Section */}
          <div className="flex flex-col flex-1 min-h-0">
            {/* Topo: também arrasta a janela; no macOS deixa espaço para os botões nativos */}
            <div
              className={`app-drag border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950 ${
                collapsed ? 'px-2 py-3' : 'p-4'
              } ${window.electronAPI?.platform === 'darwin' ? 'pt-9' : ''}`}
            >
              <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'gap-2.5'}`}>
                <img src="./icon.png" alt="" className="w-9 h-9 shrink-0" draggable={false} />
                <Reveal show={expanded} className="min-w-0 flex-1">
                  <h1 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight truncate">
                    FatorSimples
                    <span className="ml-1.5 text-[10px] font-normal font-num text-slate-400 dark:text-slate-500">
                      v{__APP_VERSION__}
                    </span>
                  </h1>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="truncate">{settings.cityState || 'Brusque - SC'}</span>
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Simples</span>
                  </div>
                </Reveal>
                <button
                  onClick={onToggleMode}
                  className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  title={expanded ? 'Recolher menu (Ctrl+B)' : 'Expandir menu (Ctrl+B)'}
                  aria-label={expanded ? 'Recolher menu' : 'Expandir menu'}
                  aria-expanded={expanded}
                >
                  {expanded ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Competência */}
            <div
              className={`border-b border-slate-200 dark:border-slate-800/70 bg-slate-100/60 dark:bg-slate-900/40 ${
                collapsed ? 'p-2' : 'p-3'
              }`}
            >
              {expanded ? (
                <Reveal show>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    <span className="uppercase tracking-wider">Competência Ativa:</span>
                    {competenceStatus}
                  </div>
                  {monthStepper}
                </Reveal>
              ) : (
                <RailTooltip enabled={!monthPanelPos} label="Competência ativa" detail={selectedMonth}>
                  <button
                    ref={monthButtonRef}
                    onClick={toggleMonthPanel}
                    aria-label={`Competência ${selectedMonth}`}
                    aria-expanded={Boolean(monthPanelPos)}
                    className="relative w-full flex flex-col items-center gap-0.5 py-1.5 rounded-md text-emerald-700 dark:text-emerald-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <CalendarDays className="w-4 h-4" />
                    <span className="text-[10px] font-num font-bold">{monthShort}</span>
                    <span
                      className={`absolute top-1 right-2 w-1.5 h-1.5 rounded-full ${
                        isMonthSaved ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                  </button>
                </RailTooltip>
              )}
            </div>

            {/* Navigation Links */}
            <nav
              ref={navRef}
              className={`relative space-y-1 overflow-y-auto overflow-x-hidden flex-1 ${collapsed ? 'p-2' : 'p-3'}`}
            >
              {/* Destaque do item ativo: escorre de um item para o outro, como líquido */}
              <LiquidIndicator
                containerRef={navRef}
                axis="y"
                activeKey={activeTab}
                layoutKey={mode}
                className={`rounded-xl ${
                  collapsed
                    ? 'bg-emerald-600 shadow-[0_6px_16px_-6px_rgba(5,150,105,0.6)] dark:bg-emerald-500'
                    : 'bg-emerald-50 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/15 dark:ring-emerald-500/30'
                }`}
              />
              <Reveal
                show={expanded}
                className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 py-1 whitespace-nowrap"
              >
                Menu de Navegação
              </Reveal>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <RailTooltip key={item.id} enabled={collapsed} label={item.label} detail={item.description}>
                    <button
                      onClick={() => {
                        if (!isActive) playSound('tick');
                        setActiveTab(item.id);
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      data-liquid-active={isActive}
                      aria-label={collapsed ? item.label : undefined}
                      className={`group relative w-full flex items-center rounded-xl text-left transition-colors cursor-pointer border border-transparent ${
                        collapsed ? 'justify-center p-1.5' : 'justify-between p-2.5'
                      } ${
                        isActive
                          ? 'text-emerald-900 font-bold dark:text-emerald-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                      }`}
                    >
                      <div className="relative flex items-center gap-2.5 min-w-0">
                        <div
                          className={`relative rounded-lg flex items-center justify-center shrink-0 transition-[color,background-color,translate] duration-[var(--duration-micro)] ${
                            collapsed ? 'w-9 h-9' : 'w-7 h-7'
                          } ${
                            isActive
                              ? collapsed
                                ? 'text-white dark:text-emerald-950'
                                : 'bg-emerald-600 text-white'
                              : collapsed
                                ? 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:translate-x-0.5'
                          }`}
                        >
                          <Icon className={collapsed ? 'w-[18px] h-[18px]' : 'w-4 h-4'} />
                          {/* No menu recolhido o contador vira uma bolinha com o número */}
                          {collapsed && item.badge && history.length > 0 && (
                            <span className="absolute -top-1 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold font-num leading-4 text-center ring-2 ring-white dark:ring-slate-950">
                              {history.length > 99 ? '99+' : history.length}
                            </span>
                          )}
                        </div>
                        <Reveal show={expanded} className="min-w-0">
                          <div className="text-xs truncate">{item.label}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate">
                            {item.description}
                          </div>
                        </Reveal>
                      </div>

                      {expanded && item.badge && (
                        <motion.span
                          key={item.badge}
                          initial={{ scale: 0.8, opacity: 0.6 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                          className={`relative text-[10px] px-1.5 py-0.2 rounded font-num font-bold ${
                            isActive
                              ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {item.badge}
                        </motion.span>
                      )}
                    </button>
                  </RailTooltip>
                );
              })}
            </nav>

            {/* Mini Fiscal Summary Box */}
            {expanded ? (
              <Reveal
                show
                className="m-3 p-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1.5 shadow-2xs whitespace-nowrap"
              >
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                  <span>Fator R {selectedMonth}:</span>
                  <span
                    className={`font-num font-bold ${
                      factorR >= 28 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {monthsCount > 0 ? <AnimatedNumber value={factorR} format={formatPercent1} /> : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                  <span title={isProportional && monthsCount > 0 ? `Média de ${monthsCount} meses × 12` : undefined}>
                    RBT12 {isProportional ? '(proporcional)' : '(12m anteriores)'}:
                  </span>
                  <span className="font-num font-semibold text-slate-800 dark:text-slate-200">
                    {isLoading ? (
                      <span className="skeleton inline-block h-3 w-20 rounded align-middle" />
                    ) : monthsCount > 0 ? (
                      <AnimatedNumber value={rbt12} format={formatCurrency} />
                    ) : (
                      'sem histórico'
                    )}
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
              </Reveal>
            ) : (
              <div className="flex justify-center py-3">
                <RailTooltip
                  enabled
                  label={`Fator R ${selectedMonth}: ${monthsCount > 0 ? formatPercent1(factorR) : '—'}`}
                  detail={`RBT12: ${monthsCount > 0 ? formatCurrency(rbt12) : 'sem histórico'}`}
                >
                  <span
                    tabIndex={0}
                    role="img"
                    aria-label={`Fator R ${selectedMonth}: ${monthsCount > 0 ? formatPercent1(factorR) : 'sem histórico'}. RBT12: ${
                      monthsCount > 0 ? formatCurrency(rbt12) : 'sem histórico'
                    }`}
                    className="block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" className="-rotate-90">
                      <circle cx="16" cy="16" r="12" fill="none" strokeWidth="4" className="stroke-slate-200 dark:stroke-slate-800" />
                      {monthsCount > 0 && (
                        <motion.circle
                          cx="16"
                          cy="16"
                          r="12"
                          fill="none"
                          strokeWidth="4"
                          strokeLinecap="round"
                          className={ringOk ? 'stroke-emerald-500' : 'stroke-rose-500'}
                          initial={reduceMotion ? false : { pathLength: 0 }}
                          animate={{ pathLength: ringPct }}
                          transition={instantIf(reduceMotion, { duration: DURATION.number, ease: EASE_OUT })}
                        />
                      )}
                    </svg>
                  </span>
                </RailTooltip>
              </div>
            )}
          </div>

          {/* Sidebar Footer Controls */}
          <div
            className={`border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 space-y-1 text-xs ${
              collapsed ? 'p-2' : 'p-3'
            }`}
          >
            {/* Tema: um botão; o ícone gira entre sol e lua e o círculo da troca nasce nele */}
            <RailTooltip enabled={collapsed} label="Tema" detail={theme === 'dark' ? 'Escuro (clique para claro)' : 'Claro (clique para escuro)'}>
              <button
                onClick={(e) => toggleTheme(e.currentTarget)}
                className={footerButtonClass}
                aria-label={`Tema ${theme === 'dark' ? 'escuro' : 'claro'}. Trocar para ${theme === 'dark' ? 'claro' : 'escuro'}`}
              >
                <span className="flex items-center gap-2">
                  <span className="relative w-4 h-4">
                    <AnimatePresence initial={false}>
                      <motion.span
                        key={theme}
                        className="absolute inset-0 flex items-center justify-center"
                        initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
                        animate={{ rotate: 0, scale: 1, opacity: 1 }}
                        exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                      >
                        {theme === 'dark' ? (
                          <Moon className="w-4 h-4 text-indigo-300" />
                        ) : (
                          <Sun className="w-4 h-4 text-amber-500" />
                        )}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  {expanded && <span className="whitespace-nowrap">Tema</span>}
                </span>
                {expanded && (
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {theme === 'dark' ? 'Escuro' : 'Claro'}
                  </span>
                )}
              </button>
            </RailTooltip>

            {/* SQLite Manager */}
            <RailTooltip enabled={collapsed} label="Banco SQLite" detail={storageMode === 'system' ? 'Local' : 'Portátil'}>
              <button
                onClick={onOpenSqliteManager}
                className={footerButtonClass}
                aria-label={collapsed ? 'Banco SQLite' : undefined}
              >
                <span className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {expanded && <span className="whitespace-nowrap">Banco SQLite</span>}
                </span>
                {expanded && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-num">
                    {storageMode === 'system' ? 'Local' : 'Portátil'}
                  </span>
                )}
              </button>
            </RailTooltip>

            {/* Configurações Fiscais */}
            <RailTooltip enabled={collapsed} label="Configurações" detail="Tabelas 2026/27">
              <button
                onClick={onOpenSettings}
                className={footerButtonClass}
                aria-label={collapsed ? 'Configurações' : undefined}
              >
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  {expanded && <span className="whitespace-nowrap">Configurações</span>}
                </span>
                {expanded && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-num whitespace-nowrap">
                    Tabelas 2026/27
                  </span>
                )}
              </button>
            </RailTooltip>
          </div>
        </motion.aside>
      </motion.div>

      {/* Painel da competência aberto a partir do menu recolhido */}
      <AnimatePresence>
        {collapsed && monthPanelPos && (
          <motion.div
            ref={monthPanelRef}
            key="month-panel"
            role="dialog"
            aria-label="Competência ativa"
            className="no-print fixed z-[60] w-64 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl"
            style={{ left: monthPanelPos.x, top: monthPanelPos.y }}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT }}
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              <span className="uppercase tracking-wider">Competência Ativa:</span>
              {competenceStatus}
            </div>
            {monthStepper}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
