import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  BookmarkCheck,
  ChevronDown,
  Receipt,
  ShieldCheck,
  Lock,
  Pencil,
  FileText,
} from 'lucide-react';
import {
  TaxSettings,
  MonthRecord,
  MonthSummaryResult,
} from '../types/tax';
import {
  formatCurrency,
  formatPercent,
  calculateMonthSummary,
  calculateFactorRMargin,
  calculateSlackRelease,
  getActiveTaxTable,
  shiftYearMonth,
  FACTOR_R_NEAR_MISS,
} from '../utils/taxCalculations';
import { CurrencyInput } from './CurrencyInput';
import { HelpTip, type HelpContent } from './ui/HelpTip';
import { HELP } from './help';
import { SegmentedControl } from './ui/SegmentedControl';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { DURATION, EASE_OUT, instantIf } from '../utils/motion';
import { AnimatedNumber } from './ui/AnimatedNumber';
import { CopyButton } from './ui/CopyButton';
import { formatForCopy } from '../utils/copyFormat';
import { Sparkline } from './charts/Sparkline';
import { FactorRGauge } from './charts/FactorRGauge';
import type { ChartTone } from './charts/tones';
import { playSound } from '../hooks/useSound';
import { crossedBelowTarget } from '../utils/sound';
import { card, tile } from './ui/card';
import { PageHeader } from './ui/PageHeader';

interface MonthApurationViewProps {
  currentRevenue: number;
  setCurrentRevenue: (revenue: number) => void;
  prolaboreRule: TaxSettings['prolaboreRule'];
  setProlaboreRule: (rule: TaxSettings['prolaboreRule']) => void;
  manualProlabore: number;
  setManualProlabore: (value: number) => void;
  prolaboreOverride?: number;
  savedRecord: MonthRecord | null; // competência já gravada: somente leitura
  onEditSavedRecord: (record: MonthRecord) => void;
  selectedMonth: string;
  history: MonthRecord[];
  settings: TaxSettings;
  onSaveCurrentMonthToHistory: (record: MonthRecord) => void;
  onNavigateToHistory: () => void;
  onOpenSettings?: () => void;
}

const MONTH_NAMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTH_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// "2026-10" -> "Outubro de 2026"
const formatCompetenceLong = (yearMonth: string) => {
  const [y, m] = yearMonth.split('-').map(Number);
  return `${MONTH_FULL[m - 1]} de ${y}`;
};

// "2026-10" -> "out/2026"
const formatCompetence = (yearMonth: string) => {
  const [y, m] = yearMonth.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]}/${y}`;
};

const formatPercent1 = (n: number) => formatPercent(n, 1);


const STRATEGIES: { rule: TaxSettings['prolaboreRule']; label: string; title: string }[] = [
  { rule: 'auto_28_month', label: '28% do mês', title: 'Aplica 28% do faturamento do mês' },
  {
    rule: 'exact_rbt12',
    label: 'Sem folga',
    title: 'Menor pró-labore que mantém o Fator R em 28% na próxima competência (compensa os 11 meses anteriores)',
  },
  { rule: 'manual', label: 'Manual', title: 'Definir manualmente o valor bruto do pró-labore' },
];

// Entrada em cascata dos blocos da apuração (só na montagem, não a cada tecla)
const cascade = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const cascadeItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } },
};

// Valor numérico conta até o resultado; texto (ex.: "Anexo III") aparece direto
const ValueText: React.FC<{ value: number | string; format?: (n: number) => string }> = ({ value, format }) =>
  typeof value === 'number' && format ? <AnimatedNumber value={value} format={format} /> : <>{value}</>;

// Resposta principal do mês (DAS, pró-labore, Fator R)
const AnswerCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | string;
  format?: (n: number) => string;
  detail: React.ReactNode;
  tone?: 'neutral' | 'good' | 'bad';
  aside?: React.ReactNode;
  tourId?: string; // âncora do tutorial
}> = ({ icon, label, value, format, detail, tone = 'neutral', aside, tourId }) => (
  <motion.div
    variants={cascadeItem}
    data-tour={tourId}
    className={`${card} p-5 ${
      tone === 'good'
        ? 'ring-2 ring-inset ring-emerald-500/70 dark:ring-emerald-500/60'
        : tone === 'bad'
          ? 'ring-2 ring-inset ring-rose-500/70 dark:ring-rose-500/60'
          : ''
    }`}
  >
    <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
      {icon}
      {label}
    </div>
    <div className="flex items-end justify-between gap-3 mt-1.5">
      <div
        className={`text-3xl font-bold font-num tabular-nums tracking-tight transition-colors duration-[var(--duration-base)] ${
          tone === 'good'
            ? 'text-emerald-700 dark:text-emerald-400'
            : tone === 'bad'
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-900 dark:text-white'
        }`}
      >
        <ValueText value={value} format={format} />
      </div>
      {aside && <div className="shrink-0 -mb-1">{aside}</div>}
    </div>
    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{detail}</div>
  </motion.div>
);

// Indicador da faixa sempre visível
const Indicator: React.FC<{
  label: string;
  value: number | string;
  format?: (n: number) => string;
  detail: string;
  valueClass?: string;
  // Tendência dos meses anteriores (mini gráfico no canto, sem mudar a altura do bloco)
  trend?: number[];
  trendTone?: ChartTone;
  help?: HelpContent;
}> = ({
  label,
  value,
  format,
  detail,
  valueClass = 'text-slate-900 dark:text-white',
  trend,
  trendTone = 'emerald',
  help,
}) => (
  <div
    className={`${tile} relative px-3 py-2.5 min-w-0 ring-1 ring-transparent hover:ring-emerald-500/30 hover:-translate-y-px transition-[box-shadow,translate,color] duration-[var(--duration-micro)]`}
  >
    {trend && (
      <div className="absolute right-2.5 bottom-2.5 opacity-80" title="Tendência mês a mês">
        <Sparkline values={trend} tone={trendTone} width={44} height={18} />
      </div>
    )}
    <div className="flex items-center gap-0.5 h-5 text-xs text-slate-600 dark:text-slate-400">
      {label}
      {help && <HelpTip help={help} />}
    </div>
    <div className={`text-base font-bold font-num tabular-nums mt-0.5 truncate transition-colors ${valueClass}`}>
      <ValueText value={value} format={format} />
    </div>
    <div className={`text-xs text-slate-500 dark:text-slate-500 truncate ${trend && trend.length > 1 ? 'pr-12' : ''}`} title={detail}>
      {detail}
    </div>
  </div>
);

// Uma transferência do mês: o valor a mandar para a conta pessoal
const TransferRow: React.FC<{
  step: number;
  title: string;
  hint: string;
  value: number;
  detail: React.ReactNode;
}> = ({ step, title, hint, value, detail }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50">
    <span
      className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-white/10"
      aria-hidden="true"
    >
      {step}
    </span>
    <div className="min-w-0 flex-1">
      <div className="text-sm font-semibold text-slate-900 dark:text-white">
        {title} <span className="font-normal text-slate-500 dark:text-slate-400">· {hint}</span>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{detail}</div>
    </div>
    <AnimatedNumber
      value={value}
      format={formatCurrency}
      className="text-xl font-bold font-num tabular-nums text-slate-900 dark:text-white"
    />
  </div>
);

// Linha de memória de cálculo
const DetailRow: React.FC<{ label: React.ReactNode; value: React.ReactNode; strong?: boolean }> = ({
  label,
  value,
  strong,
}) => (
  <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 text-sm">
    <span className="text-slate-600 dark:text-slate-400">{label}</span>
    <span
      className={`font-num tabular-nums text-right ${
        strong ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'
      }`}
    >
      {value}
    </span>
  </div>
);

// Seção recolhível de detalhes (memória de cálculo)
// Seção recolhível: o chevron gira e o conteúdo abre com altura animada (Enter/Espaço no botão)
const DetailSection: React.FC<{ title: string; summary: React.ReactNode; children: React.ReactNode }> = ({
  title,
  summary,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const reduceMotion = Boolean(useReducedMotion());
  const contentId = React.useId();
  return (
    <div className="border-t border-slate-200 dark:border-slate-800 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={open ? contentId : undefined}
        className="w-full flex items-center justify-between gap-4 py-3.5 cursor-pointer rounded text-left active:transform-none"
      >
        <span className="text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
        <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 min-w-0">
          <span className="truncate">{summary}</span>
          <motion.span
            className="shrink-0"
            animate={{ rotate: open ? 180 : 0 }}
            transition={instantIf(reduceMotion, { duration: DURATION.base, ease: EASE_OUT })}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={contentId}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={instantIf(reduceMotion, { duration: DURATION.base, ease: EASE_OUT })}
            className="overflow-hidden"
          >
            <div className="pb-4 pl-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const MonthApurationView: React.FC<MonthApurationViewProps> = ({
  currentRevenue,
  setCurrentRevenue,
  prolaboreRule,
  setProlaboreRule,
  manualProlabore,
  setManualProlabore,
  prolaboreOverride,
  savedRecord,
  onEditSavedRecord,
  selectedMonth,
  history,
  settings,
  onSaveCurrentMonthToHistory,
  onNavigateToHistory,
  onOpenSettings,
}) => {
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);

  // Logo depois de salvar, o botão mostra um check por um instante
  // (só na competência que acabou de ser salva; trocar de mês não leva o "Salvo" junto)
  const [justSavedMonth, setJustSavedMonth] = useState<string | null>(null);
  const justSavedTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(justSavedTimer.current), []);
  const justSaved = justSavedMonth === selectedMonth;
  const reduceMotion = Boolean(useReducedMotion());
  const sizeTransition = instantIf(reduceMotion, { duration: DURATION.base, ease: EASE_OUT });

  // Último faturamento salvo e média dos 12 meses, para os atalhos
  const lastRecordedMonth = history.find((h) => h.yearMonth !== selectedMonth) || history[0];
  const lastRevenue = lastRecordedMonth ? lastRecordedMonth.revenue : null;
  const recentHistory = history.slice(0, 12);
  const average12mRevenue =
    recentHistory.length > 0
      ? Math.round(recentHistory.reduce((acc, cur) => acc + cur.revenue, 0) / recentHistory.length)
      : null;

  // Apuração em tempo real com base no faturamento e histórico
  const summary: MonthSummaryResult = calculateMonthSummary(
    currentRevenue,
    history,
    settings,
    selectedMonth,
    prolaboreOverride
  );

  const { prolabore, simples, consolidated, next } = summary;
  const isReadOnly = savedRecord !== null;
  const hasRevenue = currentRevenue > 0;
  const dividendRule = getActiveTaxTable(settings)?.dividendWithholding;
  const margin = calculateFactorRMargin(currentRevenue, prolabore.gross, history, settings, selectedMonth);
  // Folga de menos de R$ 1 é "no limite" (evita "folga de R$ 0,00" e "passou R$ 0,00")
  const atLimit = Math.abs(margin.prolaboreMargin) < 1;
  // Quanto a mais chega para você ao trocar para o pró-labore mínimo (sem folga)
  const slack = calculateSlackRelease(currentRevenue, history, { ...settings, prolaboreRule }, selectedMonth, summary);
  const canReleaseSlack =
    !isReadOnly && prolaboreRule !== 'exact_rbt12' && next.isQualifiedForAnexo3 && slack.extraForYou >= 1;
  const dasDueMonth = shiftYearMonth(selectedMonth, 1).split('-');
  const savingsThisMonth = simples.anexoUsed === 'III' ? simples.anexoVDasAmount - simples.dasAmount : 0;

  // Tendências dos indicadores: até 12 meses salvos antes da competência, do mais antigo ao mais recente
  const priorMonths = history
    .filter((h) => h.yearMonth < selectedMonth && h.revenue > 0)
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
    .slice(-12);
  const trendFactorR = priorMonths.map((h) => (h.payroll / h.revenue) * 100);
  const trendRevenue = priorMonths.map((h) => h.revenue);

  // Aviso sonoro só quando uma mudança do usuário faz o Fator R da próxima competência sair da meta.
  // Trocar de competência zera a referência: carregar um mês que já estava abaixo não avisa.
  const qualified = hasRevenue ? next.isQualifiedForAnexo3 : null;
  const qualifiedRef = useRef<{ month: string; value: boolean | null }>({ month: selectedMonth, value: null });
  useEffect(() => {
    const ref = qualifiedRef.current;
    if (ref.month !== selectedMonth) {
      qualifiedRef.current = { month: selectedMonth, value: qualified };
      return;
    }
    if (qualified !== null && crossedBelowTarget(ref.value, qualified)) playSound('warning');
    ref.value = qualified;
  }, [selectedMonth, qualified]);

  // Para onde vai a receita do mês
  const breakdown = [
    { label: 'Pró-labore líquido', value: consolidated.prolaboreNet, color: 'bg-emerald-600 dark:bg-emerald-500' },
    { label: 'Antecipação de lucros', value: consolidated.taxFreeDividends, color: 'bg-emerald-300 dark:bg-emerald-700' },
    { label: 'IR sobre lucros', value: consolidated.dividendWithholding, color: 'bg-rose-300 dark:bg-rose-800' },
    { label: 'DAS', value: consolidated.dasAmount, color: 'bg-amber-500 dark:bg-amber-500' },
    { label: 'INSS + IRRF', value: consolidated.prolaboreTaxes, color: 'bg-rose-500 dark:bg-rose-500' },
    { label: 'Contabilidade', value: consolidated.accountingFee, color: 'bg-slate-400 dark:bg-slate-500' },
  ].filter((p) => p.value > 0.005);
  const breakdownTotal = breakdown.reduce((acc, p) => acc + p.value, 0) || 1;

  // Ao passar para o manual, parte do valor que estava sendo usado
  const handleSelectRule = (rule: TaxSettings['prolaboreRule']) => {
    if (isReadOnly) return;
    if (rule === 'manual' && prolaboreRule !== 'manual') {
      setManualProlabore(Math.round(prolabore.gross * 100) / 100);
    }
    setProlaboreRule(rule);
  };

  // Salva a apuração do mês no histórico permanente
  const handleSaveMonth = () => {
    if (isReadOnly) return;
    const newRecord: MonthRecord = {
      id: `record-${selectedMonth}-${Date.now()}`,
      yearMonth: selectedMonth,
      revenue: currentRevenue,
      payroll: prolabore.gross,
      inss: prolabore.inss,
      irrf: prolabore.irrf,
      dasPaid: simples.dasAmount,
      isCurrentMonth: true,
      notes: `Apuração salva em ${new Date().toLocaleDateString('pt-BR')} via FatorSimples`,
    };

    onSaveCurrentMonthToHistory(newRecord);
    setJustSavedMonth(selectedMonth);
    window.clearTimeout(justSavedTimer.current);
    justSavedTimer.current = window.setTimeout(() => setJustSavedMonth(null), 1200);
    setSavedSuccessMessage(`Apuração de ${formatCompetence(selectedMonth)} salva no histórico`);
    setTimeout(() => setSavedSuccessMessage(null), 4000);
  };

  const shortcutClass = (active: boolean) =>
    `text-xs px-2.5 py-1 rounded-md border tabular-nums cursor-pointer transition-colors ${
      active
        ? 'bg-emerald-50 text-emerald-800 border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300'
        : 'bg-transparent text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:text-slate-900 dark:hover:text-slate-200'
    }`;

  return (
    <div className="page-stagger space-y-5">
      {/* Abertura: a competência e o resumo do que importa no mês */}
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <span>Apuração do mês</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isReadOnly ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span>{isReadOnly ? 'salva no histórico' : 'em andamento'}</span>
          </span>
        }
        title={formatCompetenceLong(selectedMonth)}
        description={
          hasRevenue ? (
            <>
              DAS de <b className="font-num font-semibold text-slate-900 dark:text-white">{formatCurrency(simples.dasAmount)}</b>{' '}
              vence em 20/{dasDueMonth[1]}/{dasDueMonth[0]} ·{' '}
              {next.isQualifiedForAnexo3 ? (
                atLimit ? (
                  <>Fator R garantido em {formatCompetence(next.yearMonth)}, no limite</>
                ) : (
                  <>
                    Fator R garantido em {formatCompetence(next.yearMonth)} com folga de{' '}
                    <b className="font-num font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(Math.max(0, margin.prolaboreMargin))}
                    </b>
                  </>
                )
              ) : (
                <>
                  Fator R abaixo de 28% em {formatCompetence(next.yearMonth)}: faltam{' '}
                  <b className="font-num font-semibold text-rose-600 dark:text-rose-400">
                    {formatCurrency(-margin.prolaboreMargin)}
                  </b>{' '}
                  de pró-labore
                </>
              )}
            </>
          ) : (
            'Comece pelo faturamento das notas emitidas no mês; o resto é calculado na hora.'
          )
        }
      />

      {/* Aviso de sucesso ao salvar */}
      <div>
      <AnimatePresence>
      {savedSuccessMessage && (
        <motion.div
          key="saved"
          initial={{ opacity: 0, y: -12, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={sizeTransition}
          className="overflow-hidden"
        >
        <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200 px-4 py-2.5 rounded-lg flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{savedSuccessMessage}</span>
          </div>
          <button
            onClick={onNavigateToHistory}
            className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 hover:underline underline-offset-2 ml-4 cursor-pointer"
          >
            Ver no histórico
          </button>
        </div>
        </motion.div>
      )}
      </AnimatePresence>
      </div>

      {/* Entrada: faturamento, estratégia do pró-labore e salvar */}
      <section className={`${card} p-5`}>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-x-5 gap-y-4 lg:items-start">
          <div className="min-w-0" data-tour="faturamento">
            <div className="flex items-center gap-1 h-5 mb-1.5">
              <label htmlFor="apuration-revenue" className="text-sm text-slate-600 dark:text-slate-400">
                Faturamento de {formatCompetence(selectedMonth)}
              </label>
              <HelpTip help={HELP.revenue} />
            </div>
            <CurrencyInput
              id="apuration-revenue"
              value={currentRevenue}
              onChange={setCurrentRevenue}
              readOnly={isReadOnly}
            />
            {!isReadOnly && (lastRevenue !== null || average12mRevenue !== null) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {lastRevenue !== null && (
                  <button
                    type="button"
                    onClick={() => setCurrentRevenue(lastRevenue)}
                    className={shortcutClass(currentRevenue === lastRevenue)}
                    title="Repetir o faturamento do último mês salvo"
                  >
                    Último: {formatCurrency(lastRevenue)}
                  </button>
                )}
                {average12mRevenue !== null && average12mRevenue !== lastRevenue && (
                  <button
                    type="button"
                    onClick={() => setCurrentRevenue(average12mRevenue)}
                    className={shortcutClass(currentRevenue === average12mRevenue)}
                    title="Usar a média de faturamento dos últimos 12 meses salvos"
                  >
                    Média: {formatCurrency(average12mRevenue)}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1 h-5 text-sm text-slate-600 dark:text-slate-400 mb-1.5">
              Pró-labore <HelpTip help={HELP.prolabore} />
            </div>
            <SegmentedControl
              options={STRATEGIES.map((s) => ({ value: s.rule, label: s.label, title: s.title }))}
              value={prolaboreRule}
              onChange={handleSelectRule}
              disabled={isReadOnly}
              ariaLabel="Estratégia do pró-labore"
              layoutId="prolabore-rule"
            />
            <AnimatePresence initial={false}>
              {prolaboreRule === 'manual' && !isReadOnly && (
                <motion.div
                  key="manual-prolabore"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={sizeTransition}
                  // Folga de 1px para o anel de foco do campo não ser cortado
                  className="overflow-hidden -mx-px px-px pb-px"
                >
                  <CurrencyInput
                    className="mt-2"
                    ariaLabel="Pró-labore bruto manual"
                    value={manualProlabore}
                    onChange={setManualProlabore}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <span className="hidden lg:block h-5 mb-1.5" aria-hidden="true" />
            {savedRecord ? (
              <button
                onClick={() => onEditSavedRecord(savedRecord)}
                className={`w-full lg:w-auto h-10 flex items-center justify-center gap-2 px-4 font-semibold text-sm rounded-full border cursor-pointer transition-colors duration-[var(--duration-number)] ${
                  justSaved
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-300'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                }`}
                title="Competência já gravada: a edição é feita pelo Histórico"
              >
                <span className="relative w-4 h-4">
                  <AnimatePresence initial={false} mode="popLayout">
                    {justSaved ? (
                      <motion.span
                        key="ok"
                        className="absolute inset-0"
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="edit"
                        className="absolute inset-0"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                      >
                        <Pencil className="w-4 h-4" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                {justSaved ? 'Salvo' : 'Editar no histórico'}
              </button>
            ) : (
              <button
                onClick={handleSaveMonth}
                disabled={!hasRevenue}
                className="w-full lg:w-auto h-10 flex items-center justify-center gap-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-full cursor-pointer"
                title={hasRevenue ? 'Salvar a apuração deste mês no histórico' : 'Informe o faturamento para salvar'}
              >
                <BookmarkCheck className="w-4 h-4" />
                Salvar mês
              </button>
            )}
          </div>
        </div>

        {savedRecord && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 text-sm text-sky-900 dark:text-sky-200">
            <Lock className="w-4 h-4 shrink-0" />
            <span>{formatCompetence(selectedMonth)} já está salvo no histórico. Para alterar, use "Editar no histórico".</span>
          </div>
        )}
      </section>

      {/* Fator R abaixo de 28% por centavos: provável arredondamento da folha */}
      {simples.monthsCount > 0 && simples.factorRShortfall > 0 && simples.factorRShortfall <= FACTOR_R_NEAR_MISS && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 text-sm text-amber-900 dark:text-amber-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            O Fator R de {formatCompetence(selectedMonth)} ficou em {formatPercent(Math.floor(simples.factorRPercentage * 10000) / 10000, 4)}: faltaram{' '}
            <b className="font-num">{formatCurrency(Math.max(0.01, simples.factorRShortfall))}</b> de folha nos meses anteriores
            para chegar a 28%. O app aplica o Anexo V. Provavelmente é arredondamento de centavos; confira com a contabilidade
            como o mês foi apurado no PGDAS.
          </span>
        </div>
      )}

      {!hasRevenue ? (
        /* Sem faturamento: só o que já é conhecido pelo histórico */
        <section className={`${card} p-5`}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Quando receber, informe o faturamento de {formatCompetence(selectedMonth)}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Some o valor bruto de todas as notas do mês. O app calcula o DAS e quanto transferir para você.
              </p>
            </div>
          </div>

          {simples.monthsCount > 0 ? (
            <>
            {/* Alíquota para a nota: já conhecida antes do faturamento, pelos meses anteriores */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-500/30">
              <div>
                <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                  Alíquota para a nota de {formatCompetence(selectedMonth)}
                </div>
                <div className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                  Alíquota efetiva do Simples (já inclui o ISS) · Anexo {simples.anexoUsed}, faixa {simples.faixa}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AnimatedNumber
                  value={simples.effectiveRatePercentage}
                  format={formatPercent}
                  className="text-3xl font-bold font-num tabular-nums text-emerald-800 dark:text-emerald-300"
                />
                <CopyButton text={formatForCopy(simples.effectiveRatePercentage, 'percent')} label="alíquota para a nota" />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Indicator
                label="Fator R deste mês"
                trend={trendFactorR}
                trendTone={simples.isQualifiedForAnexo3 ? 'emerald' : 'rose'}
                value={simples.factorRPercentage}
                format={formatPercent}
                detail={`${simples.isQualifiedForAnexo3 ? '✓ acima' : '⚠ abaixo'} de 28% · Anexo ${simples.anexoUsed}`}
                valueClass={simples.isQualifiedForAnexo3 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
              />
              <Indicator
                label={`RBT12${simples.isProportional ? ' (proporcional)' : ''}`}
                trend={trendRevenue}
                trendTone="sky"
                value={simples.rbt12}
                format={formatCurrency}
                detail={
                  simples.isProportional
                    ? `Média de ${simples.monthsCount} ${simples.monthsCount === 1 ? 'mês' : 'meses'} × 12`
                    : 'Soma dos 12 meses anteriores'
                }
              />
            </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              Sem meses anteriores no histórico, a alíquota depende do faturamento deste mês: informe o valor acima. Se a
              empresa já faturava antes, cadastre os meses anteriores no Histórico para a alíquota sair certa.
            </p>
          )}
        </section>
      ) : (
        <>
          {/* Três respostas do mês */}
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4" variants={cascade} initial="hidden" animate="show">
            <AnswerCard
              icon={<FileText className="w-4 h-4" />}
              label="Alíquota para a nota"
              tourId="aliquota"
              value={simples.effectiveRatePercentage}
              format={formatPercent}
              aside={<CopyButton text={formatForCopy(simples.effectiveRatePercentage, 'percent')} label="alíquota para a nota" />}
              detail={`Simples (com ISS) · Anexo ${simples.anexoUsed}, faixa ${simples.faixa}`}
            />
            <AnswerCard
              icon={<Receipt className="w-4 h-4" />}
              label="DAS do mês"
              value={simples.dasAmount}
              format={formatCurrency}
              detail={`Vence em 20/${dasDueMonth[1]}/${dasDueMonth[0]} · fica na conta`}
            />
            <AnswerCard
              icon={next.isQualifiedForAnexo3 ? <ShieldCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              label={`Fator R em ${formatCompetence(next.yearMonth)}`}
              tourId="fator-r"
              aside={<FactorRGauge value={next.factorRPercentage} size="sm" />}
              value={next.factorRPercentage}
              format={formatPercent}
              tone={next.isQualifiedForAnexo3 ? 'good' : 'bad'}
              detail={
                <>
                  {!next.isQualifiedForAnexo3
                    ? `Cai no Anexo V · faltam ${formatCurrency(-margin.prolaboreMargin)} de pró-labore`
                    : atLimit
                      ? prolaboreRule === 'exact_rbt12'
                        ? 'Garantido · sem folga, pró-labore no mínimo'
                        : 'Garantido · no limite, sem folga'
                      : `Garantido · folga de ${formatCurrency(Math.max(0, margin.prolaboreMargin))}`}
                  {(canReleaseSlack || (!isReadOnly && !next.isQualifiedForAnexo3)) && (
                    <button
                      type="button"
                      onClick={() => handleSelectRule('exact_rbt12')}
                      title={
                        canReleaseSlack
                          ? `Pró-labore de ${formatCurrency(prolabore.gross)} para ${formatCurrency(slack.minProlabore)}: menos INSS e IRRF, mais antecipação de lucros`
                          : `Pró-labore de ${formatCurrency(prolabore.gross)} para ${formatCurrency(slack.minProlabore)}`
                      }
                      className={`mt-2.5 flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                        canReleaseSlack
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400'
                          : 'bg-rose-600 text-white hover:bg-rose-500'
                      }`}
                    >
                      {canReleaseSlack ? (
                        <>
                          Tirar a folga <span className="font-num opacity-90">· +{formatCurrency(slack.extraForYou)} para você</span>
                        </>
                      ) : (
                        <>
                          Ajustar pró-labore para <span className="font-num">{formatCurrency(slack.minProlabore)}</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              }
            />
          </motion.div>

          {/* Indicadores do mês, sempre visíveis */}
          <section className={`${card} p-3`}>
            <div className="text-xs text-slate-600 dark:text-slate-400 px-1 pb-2">
              Indicadores de {formatCompetence(selectedMonth)}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
              <Indicator
                label="Enquadramento"
                value={`Anexo ${simples.anexoUsed}`}
                detail={`faixa ${simples.faixa} · nominal ${formatPercent(simples.nominalRate * 100)}`}
              />
              <Indicator
                label="Fator R do mês"
                help={HELP.factorR}
                trend={trendFactorR}
                trendTone={simples.isQualifiedForAnexo3 ? 'emerald' : 'rose'}
                value={simples.factorRPercentage}
                format={formatPercent}
                detail={
                  simples.monthsCount === 0
                    ? 'primeiro mês'
                    : `${simples.isQualifiedForAnexo3 ? '✓ acima' : '⚠ abaixo'} de 28% · 12 meses`
                }
                valueClass={simples.isQualifiedForAnexo3 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
              />
              <Indicator
                label="RBT12"
                help={HELP.rbt12}
                trend={trendRevenue}
                trendTone="sky"
                value={simples.rbt12}
                format={formatCurrency}
                detail={simples.isProportional ? 'proporcional' : '12 meses completos'}
              />
              <Indicator
                label="Sem Fator R"
                value={simples.anexoVEffectiveRate * 100}
                format={formatPercent}
                detail={`DAS ${formatCurrency(simples.anexoVDasAmount)}`}
              />
              <Indicator
                label="Carga total"
                value={consolidated.totalTaxBurdenPercent}
                format={formatPercent1}
                detail={formatCurrency(consolidated.totalTaxes)}
              />
            </div>
          </section>

          {/* Transferências do mês: o que vai para você e o que fica na conta da empresa */}
          <section className={`${card} p-5`} data-tour="transferencias">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Transferências do mês</span>
                <span className="text-sm text-slate-600 dark:text-slate-400">· para você</span>
                <AnimatedNumber
                  value={consolidated.totalPocketCash}
                  format={formatCurrency}
                  className="text-2xl font-bold font-num tabular-nums text-emerald-700 dark:text-emerald-400"
                />
              </div>
              {savingsThisMonth > 0.005 && (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Economia com Fator R neste mês:{' '}
                  <b className="font-num text-emerald-700 dark:text-emerald-400">{formatCurrency(savingsThisMonth)}</b> de DAS
                </span>
              )}
            </div>
            {/* Barra cresce a partir de zero a cada competência e se ajusta suave ao mudar os valores */}
            <div
              key={selectedMonth}
              className="flex h-2.5 rounded overflow-hidden mt-3 bg-slate-100 dark:bg-slate-800"
              aria-hidden="true"
            >
              {breakdown.map((p) => (
                <motion.div
                  key={p.label}
                  className={p.color}
                  initial={reduceMotion ? false : { width: 0 }}
                  animate={{ width: `${(p.value / breakdownTotal) * 100}%` }}
                  transition={instantIf(reduceMotion, { duration: DURATION.number, ease: EASE_OUT })}
                />
              ))}
            </div>

            {consolidated.shortfall > 0.005 && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 ring-1 ring-inset ring-rose-300/70 dark:ring-rose-500/30 text-sm text-rose-900 dark:text-rose-200"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  ⚠ O faturamento não cobre o pró-labore, o DAS e a contabilidade: faltam{' '}
                  <b className="font-num">{formatCurrency(consolidated.shortfall)}</b> na conta da empresa. Reduza o
                  pró-labore (opção Manual) ou deposite a diferença antes de pagar os impostos.
                </span>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <TransferRow
                step={1}
                title="Pró-labore líquido"
                hint="para a sua conta pessoal"
                value={prolabore.net}
                detail={
                  <>
                    Bruto <span className="font-num">{formatCurrency(prolabore.gross)}</span> − INSS{' '}
                    <span className="font-num">{formatCurrency(prolabore.inss)}</span> − IRRF{' '}
                    <span className="font-num">{formatCurrency(prolabore.irrf)}</span>
                  </>
                }
              />
              <TransferRow
                step={2}
                title="Antecipação de lucros"
                hint="para a sua conta pessoal"
                value={consolidated.taxFreeDividends}
                detail={
                  consolidated.dividendWithholding > 0.005 ? (
                    <>
                      Já descontado o IR retido de <span className="font-num">{formatCurrency(consolidated.dividendWithholding)}</span>
                    </>
                  ) : (
                    'Isento de imposto de renda'
                  )
                }
              />

              {/* Fica na conta da empresa: impostos e contabilidade */}
              <div className="p-3.5 rounded-xl ring-1 ring-inset ring-amber-300/70 dark:ring-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    Fica na conta da empresa{' '}
                    <span className="font-normal text-slate-500 dark:text-slate-400">· impostos e contabilidade</span>
                  </div>
                  <AnimatedNumber
                    value={consolidated.keepInAccount}
                    format={formatCurrency}
                    className="text-xl font-bold font-num tabular-nums text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-600 dark:text-slate-400">
                  <span>
                    DAS <span className="font-num text-slate-800 dark:text-slate-200">{formatCurrency(simples.dasAmount)}</span>{' '}
                    (vence 20/{dasDueMonth[1]})
                  </span>
                  <span>
                    INSS <span className="font-num text-slate-800 dark:text-slate-200">{formatCurrency(prolabore.inss)}</span>
                  </span>
                  <span>
                    IRRF <span className="font-num text-slate-800 dark:text-slate-200">{formatCurrency(prolabore.irrf)}</span>
                  </span>
                  {consolidated.dividendWithholding > 0.005 && (
                    <span>
                      IR sobre lucros{' '}
                      <span className="font-num text-slate-800 dark:text-slate-200">{formatCurrency(consolidated.dividendWithholding)}</span>
                    </span>
                  )}
                  {consolidated.accountingFee > 0.005 ? (
                    <span>
                      Contabilidade{' '}
                      <span className="font-num text-slate-800 dark:text-slate-200">{formatCurrency(consolidated.accountingFee)}</span>
                    </span>
                  ) : (
                    onOpenSettings && (
                      <button
                        type="button"
                        onClick={onOpenSettings}
                        className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400 cursor-pointer"
                      >
                        + informar honorários da contabilidade
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Memória de cálculo */}
          <section className={`${card} px-5 py-1`}>
            <DetailSection
              title="Memória de cálculo do DAS"
              summary={`${formatCurrency(currentRevenue)} × ${formatPercent(simples.effectiveRatePercentage)}`}
            >
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm font-num space-y-1 mb-2">
                <div className="text-slate-600 dark:text-slate-400 font-sans">
                  Alíquota efetiva (LC 123/2006) = (RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12
                </div>
                <div className="text-emerald-700 dark:text-emerald-400 overflow-x-auto">
                  ({formatCurrency(simples.rbt12)} × {formatPercent(simples.nominalRate * 100)} − {formatCurrency(simples.deduction)}) ÷{' '}
                  {formatCurrency(simples.rbt12)} = {formatPercent(simples.effectiveRatePercentage)}
                </div>
              </div>
              <DetailRow
                label="RBT12"
                value={`${formatCurrency(simples.rbt12)} · ${
                  simples.monthsCount === 0
                    ? '1º mês: receita × 12'
                    : simples.isProportional
                      ? `média de ${simples.monthsCount} meses × 12`
                      : '12 meses completos'
                }`}
              />
              <DetailRow label={`Anexo ${simples.anexoUsed}, faixa ${simples.faixa}`} value={`nominal ${formatPercent(simples.nominalRate * 100)} · dedução ${formatCurrency(simples.deduction)}`} />
              <DetailRow label="CPP (INSS patronal)" value="incluída no DAS" />
              <DetailRow
                label={`Prevista para ${formatCompetence(next.yearMonth)}`}
                value={`${formatPercent(next.effectiveRatePercentage)} · Anexo ${next.anexoUsed}`}
              />
              <DetailRow label="DAS do mês" value={formatCurrency(simples.dasAmount)} strong />
            </DetailSection>

            <DetailSection
              title="Impostos do pró-labore"
              summary={`INSS ${formatCurrency(prolabore.inss)} · IRRF ${formatCurrency(prolabore.irrf)}`}
            >
              <DetailRow label="Pró-labore bruto" value={formatCurrency(prolabore.gross)} />
              <DetailRow
                label={`INSS ${formatPercent(settings.inssRate * 100, 0)}${prolabore.inssCeilingApplied ? ` (teto ${formatCurrency(settings.inssCeiling)})` : ''}`}
                value={`− ${formatCurrency(prolabore.inss)}`}
              />
              <DetailRow
                label={`IRRF pela tabela (${prolabore.irrfChosenMethod === 'simplified' ? 'desconto simplificado' : 'deduções legais'}, ${formatPercent(prolabore.irrfRate * 100, 1)})`}
                value={formatCurrency(prolabore.irrfBeforeReduction)}
              />
              {prolabore.irrfReduction > 0 && (
                <DetailRow label="Redução da Lei 15.270/2025" value={`− ${formatCurrency(prolabore.irrfReduction)}`} />
              )}
              <DetailRow label="IRRF retido" value={`− ${formatCurrency(prolabore.irrf)}`} />
              <DetailRow label="Pró-labore líquido" value={formatCurrency(prolabore.net)} strong />
            </DetailSection>

            <DetailSection
              title="Fator R e folga"
              summary={
                atLimit
                  ? 'no limite'
                  : margin.revenueMargin >= 0
                  ? `pode faturar mais ${formatCurrency(margin.revenueMargin)}`
                  : `passou ${formatCurrency(-margin.revenueMargin)} do limite`
              }
            >
              <DetailRow
                label={`Fator R em ${formatCompetence(next.yearMonth)} (11 meses anteriores + este)`}
                value={formatPercent(next.factorRPercentage)}
              />
              <DetailRow label="Pró-labore mínimo para manter 28%" value={formatCurrency(margin.minProlabore)} />
              <DetailRow
                label="Folga no pró-labore"
                value={
                  margin.prolaboreMargin >= 0
                    ? `pode reduzir ${formatCurrency(margin.prolaboreMargin)}`
                    : `precisa aumentar ${formatCurrency(-margin.prolaboreMargin)}`
                }
              />
              <DetailRow label="Faturamento máximo com este pró-labore" value={formatCurrency(margin.revenueCeiling)} />
              <DetailRow
                label={`DAS em jogo em ${formatCompetence(next.yearMonth)} se cair no Anexo V`}
                value={formatCurrency(margin.dasAtStake)}
                strong
              />
            </DetailSection>

            <DetailSection
              title="Antecipação de lucros"
              summary={
                consolidated.dividendWithholding > 0
                  ? `IR retido ${formatCurrency(consolidated.dividendWithholding)}`
                  : 'sem retenção'
              }
            >
              <DetailRow
                label={
                  consolidated.accountingFee > 0.005
                    ? 'Faturamento − DAS − pró-labore bruto − contabilidade'
                    : 'Faturamento − DAS − pró-labore bruto'
                }
                value={formatCurrency(consolidated.distributableProfit)}
              />
              {dividendRule ? (
                <DetailRow
                  label={`IR retido (${formatPercent(dividendRule.rate * 100, 0)} sobre o total acima de ${formatCurrency(dividendRule.monthlyThreshold)}/mês)`}
                  value={`− ${formatCurrency(consolidated.dividendWithholding)}`}
                />
              ) : (
                <DetailRow label="IR sobre lucros" value="isento nesta competência" />
              )}
              <DetailRow label="Antecipação de lucros líquida" value={formatCurrency(consolidated.taxFreeDividends)} strong />
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Considera um único sócio recebendo todo o lucro do mês. Das despesas da empresa, só os honorários da
                contabilidade (se informados nas Configurações) são descontados.
                {dividendRule &&
                  ' O IR retido sobre lucros é antecipação do IR mínimo anual e é ajustado na declaração.'}
              </p>
            </DetailSection>
          </section>
        </>
      )}
    </div>
  );
};
