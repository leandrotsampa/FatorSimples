import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  BookmarkCheck,
  ChevronDown,
  Receipt,
  ShieldCheck,
  UserRound,
  Lock,
  Pencil,
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
  getActiveTaxTable,
  shiftYearMonth,
  FACTOR_R_NEAR_MISS,
} from '../utils/taxCalculations';
import { CurrencyInput } from './CurrencyInput';
import { SegmentedControl } from './ui/SegmentedControl';
import { AnimatePresence, motion } from 'motion/react';
import { DURATION, EASE_OUT } from '../utils/motion';

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
}

const MONTH_NAMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// "2026-10" -> "out/2026"
const formatCompetence = (yearMonth: string) => {
  const [y, m] = yearMonth.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]}/${y}`;
};

const card =
  'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-sm ring-1 ring-slate-900/5 dark:ring-transparent transition-colors';

const STRATEGIES: { rule: TaxSettings['prolaboreRule']; label: string; title: string }[] = [
  { rule: 'auto_28_month', label: '28% do mês', title: 'Aplica 28% do faturamento do mês' },
  {
    rule: 'exact_rbt12',
    label: 'Ajuste RBT12',
    title: 'Compensa os 11 meses anteriores para o Fator R da próxima competência fechar em 28%',
  },
  { rule: 'manual', label: 'Manual', title: 'Definir manualmente o valor bruto do pró-labore' },
];

// Resposta principal do mês (DAS, pró-labore, Fator R)
const AnswerCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: React.ReactNode;
  tone?: 'neutral' | 'good' | 'bad';
}> = ({ icon, label, value, detail, tone = 'neutral' }) => (
  <div
    className={`${card} p-5 ${
      tone === 'good'
        ? 'border-2 border-emerald-500 dark:border-emerald-500/70'
        : tone === 'bad'
          ? 'border-2 border-rose-500 dark:border-rose-500/70'
          : ''
    }`}
  >
    <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
      {icon}
      {label}
    </div>
    <div
      className={`text-3xl font-bold font-mono tabular-nums tracking-tight mt-1.5 ${
        tone === 'good'
          ? 'text-emerald-700 dark:text-emerald-400'
          : tone === 'bad'
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-slate-900 dark:text-white'
      }`}
    >
      {value}
    </div>
    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{detail}</div>
  </div>
);

// Indicador da faixa sempre visível
const Indicator: React.FC<{ label: string; value: string; detail: string; valueClass?: string }> = ({
  label,
  value,
  detail,
  valueClass = 'text-slate-900 dark:text-white',
}) => (
  <div className="bg-slate-50 dark:bg-slate-950/60 rounded-lg px-3 py-2.5 min-w-0">
    <div className="text-xs text-slate-600 dark:text-slate-400">{label}</div>
    <div className={`text-base font-bold font-mono tabular-nums mt-0.5 truncate ${valueClass}`}>{value}</div>
    <div className="text-xs text-slate-500 dark:text-slate-500 truncate">{detail}</div>
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
      className={`font-mono tabular-nums text-right ${
        strong ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'
      }`}
    >
      {value}
    </span>
  </div>
);

// Seção recolhível de detalhes (memória de cálculo)
const DetailSection: React.FC<{ title: string; summary: React.ReactNode; children: React.ReactNode }> = ({
  title,
  summary,
  children,
}) => (
  <details className="group border-t border-slate-200 dark:border-slate-800 first:border-t-0">
    <summary className="flex items-center justify-between gap-4 py-3.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-emerald-500 rounded">
      <span className="text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
      <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 min-w-0">
        <span className="truncate">{summary}</span>
        <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" />
      </span>
    </summary>
    <div className="pb-4 pl-1">{children}</div>
  </details>
);

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
}) => {
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);

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
  const dasDueMonth = shiftYearMonth(selectedMonth, 1).split('-');
  const savingsThisMonth = simples.anexoUsed === 'III' ? simples.anexoVDasAmount - simples.dasAmount : 0;

  // Para onde vai a receita do mês
  const breakdown = [
    { label: 'Pró-labore líquido', value: consolidated.prolaboreNet, color: 'bg-emerald-600 dark:bg-emerald-500' },
    { label: 'Lucro distribuído', value: consolidated.taxFreeDividends, color: 'bg-emerald-300 dark:bg-emerald-700' },
    { label: 'IR sobre lucros', value: consolidated.dividendWithholding, color: 'bg-rose-300 dark:bg-rose-800' },
    { label: 'DAS', value: consolidated.dasAmount, color: 'bg-amber-500 dark:bg-amber-500' },
    { label: 'INSS + IRRF', value: consolidated.prolaboreTaxes, color: 'bg-rose-500 dark:bg-rose-500' },
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
    <div className="space-y-4 transition-colors duration-200">
      {/* Aviso de sucesso ao salvar */}
      {savedSuccessMessage && (
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
      )}

      {/* Entrada: faturamento, estratégia do pró-labore e salvar */}
      <section className={`${card} p-5`}>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-x-5 gap-y-4 lg:items-start">
          <div className="min-w-0">
            <label htmlFor="apuration-revenue" className="block h-5 text-sm text-slate-600 dark:text-slate-400 mb-1.5">
              Faturamento de {formatCompetence(selectedMonth)}
            </label>
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
            <div className="h-5 text-sm text-slate-600 dark:text-slate-400 mb-1.5">Pró-labore</div>
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
                  transition={{ duration: DURATION.base, ease: EASE_OUT }}
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
                className="w-full lg:w-auto h-10 flex items-center justify-center gap-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                title="Competência já gravada: a edição é feita pelo Histórico"
              >
                <Pencil className="w-4 h-4" />
                Editar no histórico
              </button>
            ) : (
              <button
                onClick={handleSaveMonth}
                disabled={!hasRevenue}
                className="w-full lg:w-auto h-10 flex items-center justify-center gap-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg cursor-pointer"
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
            <b className="font-mono">{formatCurrency(Math.max(0.01, simples.factorRShortfall))}</b> de folha nos meses anteriores
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
                Informe o faturamento de {formatCompetence(selectedMonth)} para calcular o DAS, o pró-labore e o Fator R
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Use as notas fiscais emitidas no mês. Os atalhos repetem o último mês salvo ou a média dos 12 meses.
              </p>
            </div>
          </div>

          {simples.monthsCount > 0 ? (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Indicator
                label="Fator R deste mês"
                value={formatPercent(simples.factorRPercentage)}
                detail={`Anexo ${simples.anexoUsed} · definido pelos meses anteriores`}
                valueClass={simples.isQualifiedForAnexo3 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
              />
              <Indicator
                label={`RBT12${simples.isProportional ? ' (proporcional)' : ''}`}
                value={formatCurrency(simples.rbt12)}
                detail={
                  simples.isProportional
                    ? `Média de ${simples.monthsCount} ${simples.monthsCount === 1 ? 'mês' : 'meses'} × 12`
                    : 'Soma dos 12 meses anteriores'
                }
              />
              <Indicator
                label="Alíquota efetiva do DAS"
                value={formatPercent(simples.effectiveRatePercentage)}
                detail={`Anexo ${simples.anexoUsed}, faixa ${simples.faixa} · DAS = faturamento × alíquota`}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              Sem meses anteriores no histórico: o RBT12 deste mês será o próprio faturamento × 12 (primeiro mês de atividade).
            </p>
          )}
        </section>
      ) : (
        <>
          {/* Três respostas do mês */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AnswerCard
              icon={<Receipt className="w-4 h-4" />}
              label="Pagar de DAS"
              value={formatCurrency(simples.dasAmount)}
              detail={`Vence em 20/${dasDueMonth[1]}/${dasDueMonth[0]}`}
            />
            <AnswerCard
              icon={<UserRound className="w-4 h-4" />}
              label="Retirar de pró-labore"
              value={formatCurrency(prolabore.gross)}
              detail={`Líquido ${formatCurrency(prolabore.net)}`}
            />
            <AnswerCard
              icon={next.isQualifiedForAnexo3 ? <ShieldCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              label={`Fator R em ${formatCompetence(next.yearMonth)}`}
              value={formatPercent(next.factorRPercentage)}
              tone={next.isQualifiedForAnexo3 ? 'good' : 'bad'}
              detail={
                next.isQualifiedForAnexo3
                  ? `Garantido · folga de ${formatCurrency(Math.max(0, margin.prolaboreMargin))}`
                  : `Cai no Anexo V · faltam ${formatCurrency(-margin.prolaboreMargin)} de pró-labore`
              }
            />
          </div>

          {/* Indicadores do mês, sempre visíveis */}
          <section className={`${card} p-3`}>
            <div className="text-xs text-slate-600 dark:text-slate-400 px-1 pb-2">
              Indicadores de {formatCompetence(selectedMonth)}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
              <Indicator
                label="Alíquota efetiva"
                value={formatPercent(simples.effectiveRatePercentage)}
                detail={`nominal ${formatPercent(simples.nominalRate * 100)}`}
              />
              <Indicator label="Enquadramento" value={`Anexo ${simples.anexoUsed}`} detail={`faixa ${simples.faixa}`} />
              <Indicator
                label="Fator R do mês"
                value={formatPercent(simples.factorRPercentage)}
                detail={simples.monthsCount === 0 ? 'primeiro mês' : '12 meses anteriores'}
                valueClass={simples.isQualifiedForAnexo3 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
              />
              <Indicator
                label="RBT12"
                value={formatCurrency(simples.rbt12)}
                detail={simples.isProportional ? 'proporcional' : '12 meses completos'}
              />
              <Indicator
                label="Sem Fator R"
                value={formatPercent(simples.anexoVEffectiveRate * 100)}
                detail={`DAS ${formatCurrency(simples.anexoVDasAmount)}`}
              />
              <Indicator
                label="Carga total"
                value={formatPercent(consolidated.totalTaxBurdenPercent, 1)}
                detail={formatCurrency(consolidated.totalTaxes)}
              />
            </div>
          </section>

          {/* No bolso do sócio */}
          <section className={`${card} p-5`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">No bolso do sócio</span>
                <span className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(consolidated.totalPocketCash)}
                </span>
              </div>
              {savingsThisMonth > 0.005 && (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Economia com Fator R neste mês:{' '}
                  <b className="font-mono text-emerald-700 dark:text-emerald-400">{formatCurrency(savingsThisMonth)}</b> de DAS
                </span>
              )}
            </div>
            <div className="flex h-2.5 rounded overflow-hidden mt-3 bg-slate-100 dark:bg-slate-800" aria-hidden="true">
              {breakdown.map((p) => (
                <div key={p.label} className={p.color} style={{ width: `${(p.value / breakdownTotal) * 100}%` }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-sm text-slate-600 dark:text-slate-400">
              {breakdown.map((p) => (
                <span key={p.label} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-sm ${p.color}`} />
                  {p.label} <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">{formatCurrency(p.value)}</span>
                </span>
              ))}
            </div>
          </section>

          {/* Memória de cálculo */}
          <section className={`${card} px-5 py-1`}>
            <DetailSection
              title="Memória de cálculo do DAS"
              summary={`${formatCurrency(currentRevenue)} × ${formatPercent(simples.effectiveRatePercentage)}`}
            >
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-sm font-mono space-y-1 mb-2">
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
                margin.revenueMargin >= 0
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
              title="Lucro distribuído"
              summary={
                consolidated.dividendWithholding > 0
                  ? `IR retido ${formatCurrency(consolidated.dividendWithholding)}`
                  : 'sem retenção'
              }
            >
              <DetailRow label="Faturamento − DAS − pró-labore bruto" value={formatCurrency(consolidated.distributableProfit)} />
              {dividendRule ? (
                <DetailRow
                  label={`IR retido (${formatPercent(dividendRule.rate * 100, 0)} sobre o total acima de ${formatCurrency(dividendRule.monthlyThreshold)}/mês)`}
                  value={`− ${formatCurrency(consolidated.dividendWithholding)}`}
                />
              ) : (
                <DetailRow label="IR sobre lucros" value="isento nesta competência" />
              )}
              <DetailRow label="Lucro distribuído líquido" value={formatCurrency(consolidated.taxFreeDividends)} strong />
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Considera um único sócio recebendo todo o lucro do mês, antes das despesas operacionais.
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
