import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  History,
  Plus,
  Trash2,
  Edit2,
  FileUp,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { MonthRecord } from '../types/tax';
import {
  formatCurrency,
  formatPercent,
  calculateSimplesNacional,
  calculateRBT12,
  resolveFactorR,
  shiftYearMonth,
  FACTOR_R_NEAR_MISS,
} from '../utils/taxCalculations';
import { card } from './ui/card';
import { PageHeader } from './ui/PageHeader';
import { SegmentedControl } from './ui/SegmentedControl';
import { AnimatedNumber } from './ui/AnimatedNumber';
import { AreaChart } from './charts/AreaChart';
import { Sparkline } from './charts/Sparkline';
import type { ChartTone } from './charts/tones';
import { selectHistoryRange, type HistoryRange } from '../utils/historyRange';
import { clamp } from '../utils/chartGeometry';
import { DURATION, EASE_OUT } from '../utils/motion';
import { isPayrollEstimated } from '../utils/documentImport';
import { MONTH_SHORT_NAMES } from '../utils/monthPicker';

const MONTH_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTH_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// "2026-09" -> "set/26" e "setembro de 2026"
const formatShortMonth = (ym: string) => `${MONTH_SHORT[Number(ym.slice(5, 7)) - 1]}/${ym.slice(2, 4)}`;
const formatLongMonth = (ym: string) => `${MONTH_LONG[Number(ym.slice(5, 7)) - 1]} de ${ym.slice(0, 4)}`;

// Eixo em reais compacto: "R$ 20 mil"
const formatCompactCurrency = (v: number) =>
  v >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : `R$ ${Math.round(v)}`;

// Métrica do topo: valor que conta até o número e a tendência dos 12 meses
const Metric: React.FC<{
  label: string;
  value: number;
  format: (n: number) => string;
  detail: string;
  trend: number[];
  tone: ChartTone;
  valueClass?: string;
}> = ({ label, value, format, detail, trend, tone, valueClass = 'text-slate-900 dark:text-white' }) => (
  <div className="bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl">
    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">{label}</div>
    <div className="flex items-end justify-between gap-2 mt-0.5">
      <AnimatedNumber value={value} format={format} className={`text-lg font-bold font-num tabular-nums ${valueClass}`} />
      <span title="Tendência mês a mês">
        <Sparkline values={trend} tone={tone} width={64} height={22} />
      </span>
    </div>
    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate" title={detail}>{detail}</div>
  </div>
);

const TooltipRow: React.FC<{ label: string; value: string; dot: string; valueClass?: string }> = ({
  label,
  value,
  dot,
  valueClass = 'text-slate-900 dark:text-white',
}) => (
  <div className="flex items-center justify-between gap-4">
    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      {label}
    </span>
    <span className={`font-num font-semibold ${valueClass}`}>{value}</span>
  </div>
);

interface HistoryTableProps {
  history: MonthRecord[];
  onAddMonth: () => void;
  onEditMonth: (record: MonthRecord) => void;
  onDeleteMonth: (id: string) => void;
  onImportDocuments: () => void;
  onClearHistory: () => void;
  // Mês recém-salvo ou editado: a linha pisca em verde
  highlightId?: string;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({
  history,
  onAddMonth,
  onEditMonth,
  onDeleteMonth,
  onImportDocuments,
  onClearHistory,
  highlightId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const reduceMotion = Boolean(useReducedMotion());
  // Cascata das linhas só na primeira montagem; depois (busca, novos meses) entram só com fade
  const introDone = useRef(false);
  useEffect(() => {
    const t = window.setTimeout(() => (introDone.current = true), 700);
    return () => window.clearTimeout(t);
  }, []);

  // Ordena por competência decrescente (mais recente no topo)
  const sortedHistory = [...history].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));

  // Filtra por termo se digitado
  const filteredHistory = sortedHistory.filter((item) =>
    item.yearMonth.includes(searchTerm) || (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calcula totais dos últimos 12 meses
  const last12 = sortedHistory.slice(0, 12);
  const totalRevenue12 = last12.reduce((acc, m) => acc + m.revenue, 0);
  const totalPayroll12 = last12.reduce((acc, m) => acc + m.payroll, 0);
  const totalDas12 = last12.reduce((acc, m) => acc + m.dasPaid, 0);
  const totalInss12 = last12.reduce((acc, m) => acc + m.inss, 0);
  const totalIrrf12 = last12.reduce((acc, m) => acc + m.irrf, 0);
  // Fator R que vale para a competência seguinte à mais recente (12 meses anteriores a ela)
  const nextCompetence = sortedHistory.length > 0 ? shiftYearMonth(sortedHistory[0].yearMonth, 1) : '';
  const nextRbt = nextCompetence ? calculateRBT12(history, nextCompetence, 0, 0) : null;
  const overallFactorR = nextRbt ? resolveFactorR(nextRbt.folha12, nextRbt.rawRbt12) * 100 : 0;
  const isOverallQualified = overallFactorR >= 28;

  // Fator R efetivamente usado na apuração de cada competência (12 meses anteriores a ela)
  const apurationByMonth = new Map(
    history.map((m) => [m.yearMonth, calculateSimplesNacional(m.revenue, m.payroll, history, m.yearMonth)])
  );

  // Folhas estimadas pelo DARF na importação: o Fator R dos meses que dependem delas é estimado
  const estimatedMonths = new Set(history.filter(isPayrollEstimated).map((m) => m.yearMonth));
  const estimatedInWindow = (ym: string) =>
    Array.from({ length: 12 }, (_, k) => shiftYearMonth(ym, -(k + 1))).filter((m) => estimatedMonths.has(m));

  // Últimos 12 meses em ordem cronológica (tendências) e meses do gráfico conforme o intervalo
  const last12Asc = [...last12].reverse();
  const [range, setRange] = useState<HistoryRange>('12m');
  const chartMonths = selectHistoryRange(history, range);

  return (
    <div className="page-stagger space-y-5">
      <PageHeader
        eyebrow={`${history.length} ${history.length === 1 ? 'mês salvo' : 'meses salvos'}`}
        title="Histórico de faturamento e folha"
        description="A alíquota de cada mês depende do faturamento dos 12 meses anteriores. Cadastre aqui os meses que faltam ou corrija algum valor."
        actions={
          <>
            <button
              onClick={onImportDocuments}
              data-tour="hist-importar"
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-full transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
              title="Traz os meses da declaração do PGDAS-D e do relatório de pagamentos da Receita"
            >
              <FileUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Importar PGDAS-D</span>
            </button>
            <button
              onClick={onAddMonth}
              data-tour="hist-adicionar"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-full transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Competência</span>
            </button>
          </>
        }
      />

      {/* Métricas rápidas com a tendência de cada uma */}
      <section className={`${card} p-5`} data-tour="hist-metricas">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric
            label={`RBT12 ${nextCompetence ? `para ${nextCompetence}` : '(12 meses)'}`}
            value={nextRbt?.rbt12 ?? totalRevenue12}
            format={formatCurrency}
            detail={
              nextRbt?.isProportional
                ? `Média de ${nextRbt.monthsCount} ${nextRbt.monthsCount === 1 ? 'mês' : 'meses'} × 12 (proporcional)`
                : 'Faturamento dos 12 meses anteriores: define a alíquota'
            }
            trend={last12Asc.map((m) => m.revenue)}
            tone="emerald"
          />
          <Metric
            label={`Folha ${nextCompetence ? `para ${nextCompetence}` : '(12 meses)'}`}
            value={nextRbt?.folha12 ?? totalPayroll12}
            format={formatCurrency}
            detail="Pró-labore + encargos pagos"
            trend={last12Asc.map((m) => m.payroll)}
            tone="amber"
          />
          <Metric
            label={`Fator R ${nextCompetence ? `para ${nextCompetence}` : 'acumulado 12m'}`}
            value={overallFactorR}
            format={formatPercent}
            valueClass={isOverallQualified ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
            detail={isOverallQualified ? 'Enquadrado no Anexo III (≥ 28%)' : 'Abaixo de 28% (Anexo V)'}
            trend={last12Asc.map((m) => (m.revenue > 0 ? (m.payroll / m.revenue) * 100 : 0))}
            tone={isOverallQualified ? 'emerald' : 'rose'}
          />
          <Metric
            label="Total DAS recolhido (12m)"
            value={totalDas12}
            format={formatCurrency}
            detail={`INSS: ${formatCurrency(totalInss12)} · IR: ${formatCurrency(totalIrrf12)}`}
            trend={last12Asc.map((m) => m.dasPaid)}
            tone="sky"
          />
        </div>
      </section>

      {/* Evolução: faturamento e folha (R$) com o Fator R (%) e a meta de 28% */}
      {chartMonths.length > 0 && (
        <section className={`${card} p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Evolução mensal
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Faturamento</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Folha / pró-labore</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-500" /> Fator R</span>
                <span className="flex items-center gap-1.5"><span className="w-3 border-t-2 border-dashed border-sky-500/70" /> Meta 28%</span>
              </div>
            </div>
            <SegmentedControl
              className="w-64"
              options={[
                { value: '12m', label: '12 meses' },
                { value: '6m', label: '6 meses' },
                { value: 'year', label: 'Este ano' },
              ]}
              value={range}
              onChange={setRange}
              ariaLabel="Intervalo do gráfico"
              layoutId="history-range"
            />
          </div>
          <AreaChart
            labels={chartMonths.map((m) => formatShortMonth(m.yearMonth))}
            series={[
              { key: 'rev', label: 'Faturamento', tone: 'emerald', values: chartMonths.map((m) => m.revenue), kind: 'area', axis: 'left' },
              { key: 'pay', label: 'Folha', tone: 'amber', values: chartMonths.map((m) => m.payroll), kind: 'area', axis: 'left' },
              {
                key: 'fr',
                label: 'Fator R',
                tone: 'sky',
                // Limitado a 100% no desenho (o tooltip mostra o valor real)
                values: chartMonths.map((m) => clamp(m.revenue > 0 ? (m.payroll / m.revenue) * 100 : 0, 0, 100)),
                kind: 'line',
                axis: 'right',
              },
            ]}
            threshold={{ axis: 'right', value: 28, label: 'Meta 28%' }}
            formatLeft={formatCompactCurrency}
            formatRight={(v) => `${Math.round(v)}%`}
            tooltip={(i) => {
              const m = chartMonths[i];
              if (!m) return null;
              const fr = m.revenue > 0 ? (m.payroll / m.revenue) * 100 : 0;
              return (
                <>
                  <div className="font-semibold text-slate-900 dark:text-white mb-1">{formatLongMonth(m.yearMonth)}</div>
                  <TooltipRow label="Faturamento" value={formatCurrency(m.revenue)} dot="bg-emerald-500" />
                  <TooltipRow label="Folha" value={formatCurrency(m.payroll)} dot="bg-amber-500" />
                  <TooltipRow
                    label="Folha/receita"
                    value={formatPercent(fr, 1)}
                    dot="bg-sky-500"
                    valueClass={fr >= 28 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
                  />
                  <TooltipRow label="DAS pago" value={formatCurrency(m.dasPaid)} dot="bg-slate-400" />
                </>
              );
            }}
          />
        </section>
      )}

      {/* Main Table View */}
      <section className={`${card} overflow-hidden`} data-tour="hist-tabela">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por competência (ex: 2026-08)..."
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-emerald-500 w-full sm:w-64 font-num shadow-2xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs cursor-pointer font-medium"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-500">
              Total de registros: {filteredHistory.length}
            </span>
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer ml-2 font-medium"
              >
                Limpar Todos
              </button>
            )}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600 stroke-[1.5]" />
            <div className="font-bold text-slate-800 dark:text-slate-300 text-sm">
              Nenhuma competência cadastrada no histórico
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Adicione os faturamentos dos meses anteriores para o sistema calcular o RBT12 com precisão, ou importe a declaração do PGDAS-D: ela traz os meses anteriores de uma vez.
            </p>
            {history.length === 0 && (
              <button
                onClick={onImportDocuments}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-full transition-colors shadow-xs cursor-pointer"
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Importar a declaração do PGDAS-D</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 border-b border-slate-900/[0.06] dark:border-white/[0.06] text-xs whitespace-nowrap">
                <tr>
                  <th className="py-3 px-3 font-medium">Competência</th>
                  <th className="py-3 px-3 font-medium text-right">Receita bruta</th>
                  <th className="py-3 px-3 font-medium text-right">Folha / pró-labore</th>
                  <th
                    className="py-3 px-3 font-medium text-center"
                    title="Fator R usado na apuração da competência: folha ÷ receita dos 12 meses anteriores"
                  >
                    Fator R da apuração
                  </th>
                  <th className="py-3 px-3 font-medium text-right">INSS</th>
                  <th className="py-3 px-3 font-medium text-right">IRRF</th>
                  <th className="py-3 px-3 font-medium text-right">DAS</th>
                  <th className="py-3 px-3 font-medium text-center"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-num">
                <AnimatePresence initial>
                {filteredHistory.map((item, idx) => {
                  const apuration = apurationByMonth.get(item.yearMonth);
                  const factorR = apuration?.factorRPercentage ?? 0;
                  const isOk = apuration?.isQualifiedForAnexo3 ?? false;
                  const monthRatio = item.revenue > 0 ? (item.payroll / item.revenue) * 100 : 0;
                  // Abaixo de 28% com folha estimada na janela: aviso em âmbar, não o alerta do Anexo V
                  const estimatedWindow = estimatedInWindow(item.yearMonth);
                  const isEstimated = !isOk && estimatedWindow.length > 0;

                  return (
                    <motion.tr
                      key={item.id}
                      layout={reduceMotion ? false : 'position'}
                      initial={reduceMotion ? false : introDone.current ? { opacity: 0 } : { opacity: 0, y: 8 }}
                      animate={{ opacity: idx < 12 ? 1 : 0.75, y: 0 }}
                      exit={{ opacity: 0, x: -16, transition: { duration: DURATION.base } }}
                      transition={{
                        duration: DURATION.base,
                        ease: EASE_OUT,
                        delay: introDone.current || reduceMotion ? 0 : Math.min(idx * 0.03, 0.3),
                      }}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        idx < 12 ? 'bg-white dark:bg-slate-900/50' : 'bg-slate-50/50 dark:bg-slate-950/30'
                      } ${item.id === highlightId ? 'row-flash' : ''}`}
                    >
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                          {MONTH_SHORT_NAMES[Number(item.yearMonth.slice(5, 7)) - 1]}/{item.yearMonth.slice(0, 4)}
                        </span>
                        {idx === 0 && (
                          <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 font-sans font-semibold">
                            mais recente
                          </span>
                        )}
                        {idx >= 12 && (
                          <span
                            className="ml-2 text-[11px] text-slate-500 dark:text-slate-400 font-sans"
                            title="Fora dos 12 meses que entram no RBT12 e no Fator R do mês atual"
                          >
                            fora dos 12m
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right text-slate-900 dark:text-slate-100 font-bold tabular-nums">
                        {formatCurrency(item.revenue)}
                      </td>

                      <td className="py-3 px-3 text-right text-amber-700 dark:text-amber-300 font-semibold tabular-nums">
                        {isPayrollEstimated(item) && (
                          <span
                            className="mr-1 font-sans font-semibold text-slate-500 dark:text-slate-400 cursor-help"
                            title="Folha estimada pelo DARF pago (a declaração importada não trazia a deste mês). A declaração do PGDAS-D que cobre este mês traz a folha real."
                          >
                            <span aria-hidden="true">≈</span>
                            <span className="sr-only">estimada:</span>
                          </span>
                        )}
                        {formatCurrency(item.payroll)}
                      </td>

                      <td className="py-3 px-3 text-center tabular-nums">
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            isOk
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : isEstimated
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                          }`}
                          title={
                            isEstimated
                              ? `Estimado: usa folha estimada pelo DARF em ${estimatedWindow.map((m) => `${m.slice(5)}/${m.slice(0, 4)}`).join(', ')}. Importe a declaração do PGDAS-D que traz a folha real desses meses.`
                              : `Folha ÷ receita só deste mês: ${formatPercent(monthRatio, 1)}`
                          }
                        >
                          {formatPercent(factorR, 1)}
                          <span className="text-[11px] font-normal text-slate-500">
                            {apuration && (isEstimated ? 'estimado' : `Anexo ${apuration.anexoUsed}${apuration.monthsCount === 0 ? ' · 1º mês' : ''}`)}
                          </span>
                          {!isEstimated && apuration && apuration.factorRShortfall > 0 && apuration.factorRShortfall <= FACTOR_R_NEAR_MISS && (
                            <span
                              className="text-amber-600 dark:text-amber-400"
                              title={`Abaixo de 28% por ${formatCurrency(Math.max(0.01, apuration.factorRShortfall))} de folha (${formatPercent(Math.floor(factorR * 10000) / 10000, 4)}). Provável arredondamento de centavos: confira como o mês foi apurado no PGDAS.`}
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                        {formatCurrency(item.inss)}
                      </td>

                      <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                        {formatCurrency(item.irrf)}
                      </td>

                      <td className="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                        {formatCurrency(item.dasPaid)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-2 font-sans">
                          <button
                            onClick={() => onEditMonth(item)}
                            className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Editar valores desta competência"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteMonth(item.id)}
                            className="p-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Excluir competência"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
