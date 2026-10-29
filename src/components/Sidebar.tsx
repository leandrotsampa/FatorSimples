import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronDown,
  CalendarDays,
  LifeBuoy,
  ArrowDownToLine,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AnimatedNumber } from './ui/AnimatedNumber';
import { RailTooltip } from './ui/RailTooltip';
import { LiquidIndicator } from './ui/LiquidIndicator';
import { MonthPickerPanel } from './ui/MonthPickerPanel';
import { currentYearMonth, isFutureMonth, MONTH_SHORT_NAMES, monthLongName } from '../utils/monthPicker';
import { playSound } from '../hooks/useSound';
import { TaxSettings, MonthRecord } from '../types/tax';
import { formatCurrency, formatPercent, calculateRBT12, resolveFactorR, shiftYearMonth } from '../utils/taxCalculations';
import { storageAdapter } from '../utils/storageAdapter';
import { DURATION, EASE_OUT, instantIf } from '../utils/motion';
import type { StorageMode } from '../types/electron';

const formatPercent1 = (n: number) => formatPercent(n, 1);


// Larguras do menu: expandido (o de sempre) e recolhido em trilho de ícones
const WIDTH_EXPANDED = 288;
const WIDTH_COLLAPSED = 68;
// Espaço entre a cápsula do menu e a borda da janela
const GUTTER = 12;
// Topo do botão de recolher: centrado no logo (36 px) do cabeçalho do menu, que muda de respiro
// recolhido (12 px) ou aberto (16 px); no macOS o cabeçalho desce para os botões do sistema
const toggleTop = (expanded: boolean) => {
  const headerPadTop = window.electronAPI?.platform === 'darwin' ? 36 : expanded ? 16 : 12;
  return GUTTER + headerPadTop + 18 - 14;
};
const widthSpring = { type: 'spring', stiffness: 400, damping: 40 } as const;

interface SidebarProps {
  activeTab: 'apuration' | 'history' | 'comparison' | 'report';
  setActiveTab: (tab: 'apuration' | 'history' | 'comparison' | 'report') => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onOpenSettings: () => void;
  onOpenSqliteManager: () => void;
  onOpenTutorial: () => void;
  settings: TaxSettings;
  history: MonthRecord[];
  theme: 'dark' | 'light';
  toggleTheme: (origin?: HTMLElement | null) => void;
  isLoading?: boolean;
  // Versão mais nova do app publicada no GitHub (null quando em dia ou sem verificar)
  newVersion?: string | null;
  // Aviso de versão nova no rodapé do menu (null = não mostrar)
  updateNotice?: string | null;
  now?: Date; // relógio do app (virada da hora e do dia)
  onDownloadUpdate?: () => void;
  onLaterUpdate?: () => void;
  onIgnoreUpdate?: () => void;
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
  onOpenTutorial,
  settings,
  history,
  theme,
  toggleTheme,
  isLoading = false,
  newVersion = null,
  updateNotice = null,
  now,
  onDownloadUpdate,
  onLaterUpdate,
  onIgnoreUpdate,
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
  // Competência que ainda não chegou fica bloqueada
  const atCurrentMonth = selectedMonth >= currentYearMonth(now);
  const goToMonth = (next: string) => {
    if (next === selectedMonth || isFutureMonth(next, currentYearMonth(now))) return;
    playSound('tick');
    setStep((s) => ({ n: s.n + 1, dir: next > selectedMonth ? 1 : -1 }));
    setSelectedMonth(next);
  };
  const handleStepMonth = (delta: number) => goToMonth(shiftYearMonth(selectedMonth, delta));

  // Onde o banco está: ao lado do app (Windows/Linux) ou na pasta de dados do sistema (macOS)
  const [storageMode, setStorageMode] = useState<StorageMode>('portable');
  useEffect(() => {
    storageAdapter.getStorageMode().then(setStorageMode);
  }, []);

  // Grade de meses da competência: painel flutuante abaixo do bloco (expandido) ou à direita do ícone (recolhido)
  const navRef = useRef<HTMLElement>(null);
  const monthButtonRef = useRef<HTMLButtonElement>(null);
  const monthAnchorRef = useRef<HTMLButtonElement>(null);
  const monthPanelRef = useRef<HTMLDivElement>(null);
  const [monthPanelPos, setMonthPanelPos] = useState<{ x: number; y: number } | null>(null);
  const toggleMonthPanel = () => {
    if (monthPanelPos) {
      setMonthPanelPos(null);
      return;
    }
    if (collapsed) {
      const r = monthButtonRef.current?.getBoundingClientRect();
      if (r) setMonthPanelPos({ x: r.right + 10, y: r.top });
    } else {
      const r = monthAnchorRef.current?.closest('[data-month-block]')?.getBoundingClientRect();
      if (r) setMonthPanelPos({ x: r.left, y: r.bottom + 8 });
    }
  };
  const anchorOf = () => (collapsed ? monthButtonRef.current : monthAnchorRef.current);
  const pickMonth = (ym: string) => {
    goToMonth(ym);
    setMonthPanelPos(null);
    anchorOf()?.focus();
  };
  useEffect(() => {
    if (!monthPanelPos) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMonthPanelPos(null);
      anchorOf()?.focus();
    };
    // O próprio painel leva o foco para o mês escolhido ao abrir
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!monthPanelRef.current?.contains(t) && !anchorOf()?.contains(t)) setMonthPanelPos(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [monthPanelPos]);
  // Expandir ou recolher o menu muda o lugar do painel: fecha
  useEffect(() => {
    setMonthPanelPos(null);
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
      label: 'Mês',
      description: 'Alíquota da nota e transferências',
      icon: Calculator,
    },
    {
      id: 'history',
      label: 'Histórico',
      description: 'Meses anteriores',
      icon: History,
      badge: `${history.length}m`,
    },
    {
      id: 'comparison',
      label: 'Vale a pena?',
      description: 'Com e sem o Fator R',
      icon: Scale,
    },
    {
      id: 'report',
      label: 'Resumo do mês',
      description: 'Para guardar ou enviar',
      icon: FileText,
    },
  ];

  const [yearStr, monthNum] = selectedMonth.split('-');
  const monthShort = MONTH_SHORT_NAMES[parseInt(monthNum, 10) - 1] ?? '';
  const savedMonths = new Set(history.map((h) => h.yearMonth));

  const competenceStatus = (
    <span className="inline-flex items-center gap-1">
      <span className={`w-1.5 h-1.5 rounded-full ${isMonthSaved ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      <span className={isMonthSaved ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>
        {isMonthSaved ? 'Salvo' : 'Em apuração'}
      </span>
    </span>
  );

  const stepButtonClass =
    'w-8 shrink-0 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer';

  const monthBlock = (
    <div
      data-month-block
      className="flex items-stretch gap-1 p-1 rounded-xl bg-slate-50 dark:bg-slate-950/60 ring-1 ring-slate-900/[0.06] dark:ring-white/[0.07]"
    >
      <button type="button" onClick={() => handleStepMonth(-1)} className={stepButtonClass} title="Mês anterior" aria-label="Mês anterior">
        <ChevronLeft className="w-4 h-4" />
      </button>

      <button
        ref={monthAnchorRef}
        type="button"
        onClick={toggleMonthPanel}
        aria-haspopup="dialog"
        aria-expanded={Boolean(monthPanelPos)}
        aria-label={`Competência ${monthLongName(selectedMonth)} de ${yearStr}, ${isMonthSaved ? 'salva no histórico' : 'em apuração'}. Escolher outro mês`}
        className="flex-1 min-w-0 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer overflow-hidden active:transform-none"
      >
        <motion.div
          key={step.n}
          initial={step.n === 0 || reduceMotion ? false : { x: step.dir * 18, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: DURATION.base, ease: EASE_OUT }}
          className="flex flex-col items-center leading-tight"
        >
          <span className="flex items-center gap-1 text-sm font-bold text-slate-900 dark:text-white">
            {monthLongName(selectedMonth)}
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-[var(--duration-base)] ${monthPanelPos ? 'rotate-180' : ''}`}
            />
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            <span className="font-num">{yearStr}</span>
            <span aria-hidden="true">·</span>
            {competenceStatus}
          </span>
        </motion.div>
      </button>

      <button
        type="button"
        onClick={() => handleStepMonth(1)}
        disabled={atCurrentMonth}
        className={`${stepButtonClass} disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
        title={atCurrentMonth ? 'O próximo mês ainda não chegou' : 'Próximo mês'}
        aria-label={atCurrentMonth ? 'Próximo mês (ainda não chegou)' : 'Próximo mês'}
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
        animate={{ width: (mode === 'expanded' ? WIDTH_EXPANDED : WIDTH_COLLAPSED) + GUTTER }}
        transition={widthTransition}
      >
        <motion.aside
          className="absolute top-3 bottom-3 left-3 rounded-[22px] bg-white dark:bg-slate-900 ring-1 ring-slate-900/[0.06] dark:ring-white/[0.07] shadow-[0_1px_2px_rgba(16,24,20,0.06),0_18px_40px_-20px_rgba(16,40,28,0.28)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_48px_-24px_rgba(0,0,0,0.9)] flex flex-col justify-between select-none overflow-hidden"
          initial={false}
          animate={{ width: expanded ? WIDTH_EXPANDED : WIDTH_COLLAPSED }}
          transition={widthTransition}
        >
          {/* Top Section */}
          <div className="flex flex-col flex-1 min-h-0">
            {/* Topo: também arrasta a janela; no macOS deixa espaço para os botões nativos */}
            <div
              className={`app-drag border-b border-slate-900/[0.06] dark:border-white/[0.06] ${
                collapsed ? 'px-2 py-3' : 'p-4'
              } ${window.electronAPI?.platform === 'darwin' ? 'pt-9' : ''}`}
            >
              <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'gap-2.5'}`}>
                <img src="./icon.png" alt="" className="w-9 h-9 shrink-0" draggable={false} />
                <Reveal show={expanded} className="min-w-0 flex-1">
                  <h1 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight truncate">
                    FatorSimples
                  </h1>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="truncate">{settings.cityState || 'Brusque - SC'}</span>
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Simples</span>
                  </div>
                </Reveal>
              </div>
            </div>

            {/* Competência */}
            <div
              data-tour="competencia"
              className={`border-b border-slate-900/[0.06] dark:border-white/[0.06] ${
                collapsed ? 'p-2' : 'p-3'
              }`}
            >
              {expanded ? (
                <Reveal show>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-1.5">
                    Competência
                  </div>
                  {monthBlock}
                </Reveal>
              ) : (
                <RailTooltip
                  enabled={!monthPanelPos}
                  label={`${monthLongName(selectedMonth)} de ${yearStr}`}
                  detail={isMonthSaved ? 'Salva no histórico' : 'Em apuração'}
                >
                  <button
                    ref={monthButtonRef}
                    onClick={toggleMonthPanel}
                    aria-label={`Competência ${monthLongName(selectedMonth)} de ${yearStr}. Escolher outro mês`}
                    aria-haspopup="dialog"
                    aria-expanded={Boolean(monthPanelPos)}
                    className="relative w-full flex flex-col items-center gap-0.5 py-1.5 rounded-md text-emerald-700 dark:text-emerald-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <CalendarDays className="w-4 h-4" />
                    <span className="text-[11px] font-num font-bold">{monthShort}</span>
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
                      data-tour={`nav-${item.id}`}
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
                            <span className="absolute -top-1 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-slate-600 text-white dark:bg-slate-300 dark:text-slate-900 text-[11px] font-bold font-num leading-4 text-center ring-2 ring-white dark:ring-slate-950">
                              {history.length > 99 ? '99+' : history.length}
                            </span>
                          )}
                        </div>
                        <Reveal show={expanded} className="min-w-0">
                          <div className="text-xs truncate">{item.label}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate">
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
                          className={`relative text-[11px] px-1.5 py-0.2 rounded font-num font-bold ${
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
                className="m-3 p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-900/[0.06] dark:border-white/[0.06] rounded-lg text-xs space-y-1.5 shadow-2xs whitespace-nowrap"
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
              </Reveal>
            ) : (
              <div className="flex justify-center py-3">
                <RailTooltip
                  enabled
                  label={`Fator R ${selectedMonth}: ${isLoading ? 'carregando…' : monthsCount > 0 ? formatPercent1(factorR) : '—'}`}
                  detail={`RBT12: ${isLoading ? 'carregando…' : monthsCount > 0 ? formatCurrency(rbt12) : 'sem histórico'}`}
                >
                  <span
                    tabIndex={0}
                    role="img"
                    aria-label={isLoading ? 'Carregando o Fator R e o RBT12' : `Fator R ${selectedMonth}: ${monthsCount > 0 ? formatPercent1(factorR) : 'sem histórico'}. RBT12: ${
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
            className={`border-t border-slate-900/[0.06] dark:border-white/[0.06] space-y-1 text-xs ${
              collapsed ? 'p-2' : 'p-3'
            }`}
          >
            {/* Versão nova: cartão verde no rodapé (menu aberto) ou ícone de download com dica (recolhido) */}
            <AnimatePresence initial={false}>
              {updateNotice && (
                <motion.div
                  key={updateNotice}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={instantIf(reduceMotion, { duration: DURATION.base, ease: EASE_OUT })}
                  className="overflow-hidden"
                >
                  {expanded ? (
                    <div
                      role="status"
                      // Mesmo vocabulário do app: fundo do item ativo do menu, ícone em quadrado verde,
                      // botão principal em pílula verde e textos secundários em cinza
                      className="mb-2 p-3 rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/15 dark:ring-emerald-500/30"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg bg-emerald-600 text-white shadow-[0_4px_10px_-4px_rgba(5,150,105,0.6)]">
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-slate-900 dark:text-white">
                            Versão <span className="font-num">{updateNotice}</span> disponível
                          </p>
                          <p className="mt-0.5 text-[11px] leading-snug text-slate-600 dark:text-slate-400">
                            Você usa a <span className="font-num">{__APP_VERSION__}</span>. Seus dados continuam.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDownloadUpdate?.()}
                        title="Abre a página da versão no navegador"
                        className="mt-3 w-full h-8 flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                        Baixar no GitHub
                      </button>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() => onLaterUpdate?.()}
                          title="Esconder até a próxima abertura do app"
                          className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          Mais tarde
                        </button>
                        <button
                          type="button"
                          onClick={() => onIgnoreUpdate?.()}
                          title={`Não avisar mais sobre a versão ${updateNotice}; avisa de novo quando sair outra mais nova`}
                          className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          Ignorar esta versão
                        </button>
                      </div>
                    </div>
                  ) : (
                    <RailTooltip enabled label={`Versão ${updateNotice} disponível`} detail="Clique para baixar no GitHub">
                      <button
                        type="button"
                        onClick={() => onDownloadUpdate?.()}
                        aria-label={`Versão ${updateNotice} disponível. Baixar no GitHub`}
                        className="mb-1 w-full h-9 flex items-center justify-center rounded-md cursor-pointer"
                      >
                        <span className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-600 text-white shadow-[0_6px_16px_-6px_rgba(5,150,105,0.6)] hover:bg-emerald-500 transition-colors">
                          <ArrowDownToLine className="w-4 h-4" />
                        </span>
                      </button>
                    </RailTooltip>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

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

            {/* Tutorial: rever o passo a passo quando quiser */}
            <RailTooltip enabled={collapsed} label="Como usar" detail="Rever o passo a passo">
              <button
                onClick={onOpenTutorial}
                data-tour="como-usar"
                className={footerButtonClass}
                aria-label={collapsed ? 'Como usar' : undefined}
              >
                <span className="flex items-center gap-2">
                  <LifeBuoy className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  {expanded && <span className="whitespace-nowrap">Como usar</span>}
                </span>
                {expanded && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">1 min</span>
                )}
              </button>
            </RailTooltip>

            {/* SQLite Manager */}
            <RailTooltip enabled={collapsed} label="Dados e backup" detail={storageMode === 'system' ? 'Neste computador' : 'Junto ao app'}>
              <button
                onClick={onOpenSqliteManager}
                className={footerButtonClass}
                aria-label={collapsed ? 'Dados e backup' : undefined}
              >
                <span className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {expanded && <span className="whitespace-nowrap">Dados e backup</span>}
                </span>
                {expanded && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-num">
                    {storageMode === 'system' ? 'Local' : 'Portátil'}
                  </span>
                )}
              </button>
            </RailTooltip>

            {/* Configurações Fiscais */}
            <RailTooltip
              enabled={collapsed}
              label="Configurações"
              detail={newVersion ? `Versão ${newVersion} disponível` : 'Empresa, tabelas e interface'}
            >
              <button
                onClick={onOpenSettings}
                className={footerButtonClass}
                aria-label={collapsed ? `Configurações${newVersion ? `, versão ${newVersion} disponível` : ''}` : undefined}
              >
                <span className="relative flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  {collapsed && newVersion && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-sky-500 ring-2 ring-white dark:ring-slate-950" />
                  )}
                  {expanded && <span className="whitespace-nowrap">Configurações</span>}
                </span>
                {expanded &&
                  (newVersion ? (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-semibold whitespace-nowrap">
                      Versão {newVersion}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      v{__APP_VERSION__}
                    </span>
                  ))}
              </button>
            </RailTooltip>
          </div>
        </motion.aside>
      </motion.div>

      {/* Recolher/expandir: botão redondo encaixado na borda do menu, na altura do logo, no visual das pílulas
          (branco com a seta verde; o anel na cor do fundo recorta a borda do menu).
          Vai para o fim da página: o Electron aplica as áreas de arrastar na ordem do documento, e a barra
          do topo (arrastável), que vinha depois, "engolia" a metade do botão que fica sobre ela */}
      {createPortal(
        <motion.button
          type="button"
          onClick={onToggleMode}
          className="group app-no-drag no-print fixed z-[55] w-7 h-7 rounded-full flex items-center justify-center bg-white text-emerald-700 ring-1 ring-slate-900/[0.08] shadow-[0_0_0_3px_var(--canvas),0_6px_14px_-6px_rgba(16,40,28,0.45)] hover:bg-emerald-600 hover:text-white hover:ring-emerald-600 dark:bg-slate-800 dark:text-emerald-400 dark:ring-white/10 dark:shadow-[0_0_0_3px_var(--canvas),0_6px_14px_-6px_rgba(0,0,0,0.9)] dark:hover:bg-emerald-500 dark:hover:text-emerald-950 dark:hover:ring-emerald-500 transition-colors cursor-pointer"
          title={expanded ? 'Recolher menu (Ctrl+B)' : 'Expandir menu (Ctrl+B)'}
          aria-label={expanded ? 'Recolher menu' : 'Expandir menu'}
          aria-expanded={expanded}
          initial={false}
          animate={{
            left: GUTTER + (expanded ? WIDTH_EXPANDED : WIDTH_COLLAPSED) - 14,
            top: toggleTop(expanded),
          }}
          transition={widthTransition}
        >
          <motion.span
            className="flex"
            initial={false}
            animate={{ rotate: expanded ? 0 : 180 }}
            transition={instantIf(reduceMotion, { type: 'spring', stiffness: 380, damping: 26 } as const)}
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-px" strokeWidth={2.5} />
          </motion.span>
        </motion.button>,
        document.body
      )}

      {/* Grade de meses da competência */}
      <AnimatePresence>
        {monthPanelPos && (
          <motion.div
            ref={monthPanelRef}
            key="month-panel"
            role="dialog"
            aria-label="Escolher a competência"
            className="no-print app-no-drag fixed z-[60] p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl"
            style={{ left: monthPanelPos.x, top: monthPanelPos.y }}
            initial={collapsed ? { opacity: 0, x: -6 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={collapsed ? { opacity: 0, x: -6 } : { opacity: 0, y: -6 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT }}
          >
            <MonthPickerPanel value={selectedMonth} savedMonths={savedMonths} onSelect={pickMonth} now={now} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
