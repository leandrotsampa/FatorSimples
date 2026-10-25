import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  History,
  Gauge,
  SlidersHorizontal,
} from 'lucide-react';
import { TaxSettings, MonthRecord } from '../types/tax';
import {
  formatCurrency,
  formatPercent,
  calculateMonthSummary,
  compareRealizedMonths,
  compareFactorRStrategies,
  calculateFactorRMargin,
  settingsForCompetence,
  StrategyCost,
  FACTOR_R_NEAR_MISS,
} from '../utils/taxCalculations';
import { card } from './ui/card';
import { PageHeader } from './ui/PageHeader';
import { AnimatedNumber } from './ui/AnimatedNumber';
import { FactorRGauge } from './charts/FactorRGauge';
import { BarCompareChart } from './charts/BarCompareChart';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { DURATION, EASE_OUT, instantIf } from '../utils/motion';

interface ComparisonViewProps {
  currentRevenue: number;
  prolaboreOverride?: number;
  selectedMonth: string;
  history: MonthRecord[];
  settings: TaxSettings;
}

const formatYearMonth = (yearMonth: string) => {
  const [y, m] = yearMonth.split('-');
  return `${m}/${y}`;
};

// Valor com sinal: verde quando favorece o usuário, vermelho quando custa mais
const SignedCurrency: React.FC<{ value: number; className?: string }> = ({ value, className = '' }) => {
  const positive = value >= 0.005;
  const negative = value <= -0.005;
  const color = positive
    ? 'text-emerald-700 dark:text-emerald-400'
    : negative
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-slate-500 dark:text-slate-400';
  return (
    <span className={`${color} ${className}`}>
      {positive ? '+' : negative ? '−' : ''}
      {formatCurrency(Math.abs(value))}
    </span>
  );
};

// Mesmo valor com sinal, contando até o resultado
const signedFormat = (v: number) => `${v >= 0.005 ? '+' : v <= -0.005 ? '−' : ''}${formatCurrency(Math.abs(v))}`;
const AnimatedSignedCurrency: React.FC<{ value: number; className?: string; durationMs?: number }> = ({
  value,
  className = '',
  durationMs,
}) => {
  const color =
    value >= 0.005
      ? 'text-emerald-700 dark:text-emerald-400'
      : value <= -0.005
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-slate-500 dark:text-slate-400';
  return <AnimatedNumber value={value} format={signedFormat} durationMs={durationMs} className={`${color} ${className}`} />;
};

// Eixo em reais compacto: "R$ 4 mil"
const MONTH_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
// "2026-09" -> "set/26"
const formatShortMonth = (ym: string) => `${MONTH_SHORT[Number(ym.slice(5, 7)) - 1]}/${ym.slice(2, 4)}`;

const formatCompactCurrency = (v: number) =>
  v >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : `R$ ${Math.round(v)}`;

// Contagem curta no simulador, para acompanhar o arraste do slider
const SIM_COUNT_MS = 250;

const StrategyRows: React.FC<{ cost: StrategyCost; revenue: number }> = ({ cost, revenue }) => (
  <div className="mt-3 space-y-1.5 text-xs">
    {[
      [`DAS Anexo ${cost.anexo} (${formatPercent(cost.effectiveRatePercentage)})`, cost.das],
      ['Pró-labore bruto', cost.prolaboreGross],
      ['INSS do sócio (11%)', cost.inss],
      ['IRRF do pró-labore', cost.irrf],
    ].map(([label, value]) => (
      <div key={label as string} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
        <span className="text-slate-600 dark:text-slate-400">{label}</span>
        <AnimatedNumber
          value={value as number}
          format={formatCurrency}
          durationMs={SIM_COUNT_MS}
          className="font-num tabular-nums text-slate-800 dark:text-slate-200"
        />
      </div>
    ))}
    <div className="flex justify-between py-1.5 px-2 rounded bg-slate-50 dark:bg-slate-950/40">
      <span className="font-semibold text-slate-700 dark:text-slate-300">Tributos (DAS + INSS + IRRF)</span>
      <span className="font-num font-bold tabular-nums text-slate-900 dark:text-white">
        <AnimatedNumber value={cost.totalTaxes} format={formatCurrency} durationMs={SIM_COUNT_MS} /> (
        {formatPercent(revenue > 0 ? (cost.totalTaxes / revenue) * 100 : 0, 1)})
      </span>
    </div>
    {cost.dividendWithholding > 0 && (
      <div className="flex justify-between py-1 px-2">
        <span className="text-slate-600 dark:text-slate-400">IR retido sobre lucros (10%, acima de R$ 50 mil)</span>
        <span className="font-num tabular-nums text-rose-600 dark:text-rose-400">
          −{formatCurrency(cost.dividendWithholding)}
        </span>
      </div>
    )}
    <div className="flex justify-between py-1.5 px-2">
      <span className="text-slate-600 dark:text-slate-400">Disponível ao sócio</span>
      <span className="font-num font-semibold tabular-nums text-slate-900 dark:text-white">
        {formatCurrency(cost.availableToPartner)}
      </span>
    </div>
  </div>
);

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  currentRevenue,
  prolaboreOverride,
  selectedMonth,
  history,
  settings,
}) => {
  const reduceMotion = Boolean(useReducedMotion());
  const monthSettings = settingsForCompetence(settings, selectedMonth);

  // ===== 1. Realizado x sem Fator R (últimos 12 meses registrados até a competência) =====
  const realized = compareRealizedMonths(history, settings, selectedMonth, 12);
  const totalResult = realized.reduce((acc, r) => acc + r.result, 0);
  const totalReal = realized.reduce((acc, r) => acc + r.realTotal, 0);
  const totalSemFatorR = realized.reduce((acc, r) => acc + r.semFatorR.totalTaxes, 0);
  const totalMissed = realized.reduce((acc, r) => acc + r.missedSavings, 0);
  const monthsInIII = realized.filter((r) => r.anexoUsed === 'III').length;
  const dasDivergences = realized.filter(
    (r) => r.dasInformed && Math.abs(r.dasReal - r.dasExpected) > 1
  ).length;

  // ===== 2. Folga do Fator R da competência selecionada =====
  const selectedRecord = history.find((h) => h.yearMonth === selectedMonth);
  const marginRevenue = selectedRecord ? selectedRecord.revenue : currentRevenue;
  const marginProlabore = selectedRecord
    ? selectedRecord.payroll
    : calculateMonthSummary(currentRevenue, history, monthSettings, selectedMonth, prolaboreOverride).prolabore.gross;
  const margin = calculateFactorRMargin(marginRevenue, marginProlabore, history, monthSettings, selectedMonth);
  const currentSimples = calculateMonthSummary(marginRevenue, history, monthSettings, selectedMonth, marginProlabore).simples;
  const hasMarginData = marginRevenue > 0;

  // ===== 3. Simulador "e se" centrado no faturamento real =====
  const averageRevenue =
    realized.length > 0 ? realized.reduce((acc, r) => acc + r.record.revenue, 0) / realized.length : 0;
  const baseRevenue = Math.round(marginRevenue || averageRevenue || 25000);
  const [simulatedRevenue, setSimulatedRevenue] = useState<number>(baseRevenue);
  useEffect(() => {
    setSimulatedRevenue(baseRevenue);
  }, [selectedMonth, baseRevenue]);

  const simulation = compareFactorRStrategies(simulatedRevenue, history, monthSettings, selectedMonth);
  const sliderMax = Math.max(50000, Math.ceil((baseRevenue * 3) / 5000) * 5000);
  const tiers = [0.5, 0.75, 1, 1.25, 1.5, 2].map((f) =>
    f === 1 ? baseRevenue : Math.round((baseRevenue * f) / 100) * 100
  );


  return (
    <div className="page-stagger space-y-5">
      <PageHeader
        eyebrow="Com e sem o Fator R · com base no seu histórico"
        title="O Fator R está valendo a pena para você?"
        description="Comparamos o que está registrado no seu histórico (DAS + INSS + IRRF) com o que pagaria sem o Fator R: Anexo V com pró-labore de 1 salário mínimo, mesmo faturamento e mesmo RBT12, nas tabelas de cada competência."
      />

      {/* Resultado real */}
      <section className={`${card} p-5`} data-tour="cmp-resultado">
        {realized.length === 0 ? (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/30 text-xs text-amber-900 dark:text-amber-200">
            <History className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Nenhuma competência registrada até {formatYearMonth(selectedMonth)}. Cadastre os meses no Histórico para ver
              o resultado real. O simulador abaixo continua disponível.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 ring-2 ring-emerald-500/60 shadow-[0_8px_24px_-12px_rgba(5,150,105,0.45)]">
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Resultado real em {realized.length} {realized.length === 1 ? 'mês' : 'meses'}
              </div>
              <div className="text-lg font-extrabold font-num tabular-nums mt-0.5">
                <AnimatedSignedCurrency value={totalResult} />
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                {totalResult >= 0 ? 'economizados frente ao Anexo V' : 'pagos a mais que no Anexo V'}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Tributos pagos × sem Fator R</div>
              <div className="text-sm font-bold font-num tabular-nums text-slate-900 dark:text-white mt-1">
                <AnimatedNumber value={totalReal} format={formatCurrency} />
              </div>
              <div className="text-[11px] font-num tabular-nums text-slate-500 dark:text-slate-400">
                vs {formatCurrency(totalSemFatorR)}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Meses no Anexo III</div>
              <div className="text-sm font-bold font-num tabular-nums text-slate-900 dark:text-white mt-1">
                {monthsInIII} de {realized.length}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Fator R ≥ 28% na apuração</div>
            </div>
            <div
              className={`p-3.5 rounded-xl ${
                totalMissed > 0 ? 'bg-rose-50 dark:bg-rose-950/30 ring-1 ring-rose-300/70 dark:ring-rose-500/30' : 'bg-slate-50 dark:bg-slate-950/50'
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Economia perdida</div>
              <div className="text-sm font-bold font-num tabular-nums mt-1">
                {totalMissed > 0 ? (
                  <AnimatedNumber value={totalMissed} format={formatCurrency} className="text-rose-600 dark:text-rose-400" />
                ) : (
                  <span className="text-slate-900 dark:text-white">{formatCurrency(0)}</span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">em meses que caíram no Anexo V</div>
            </div>
          </div>
        )}
      </section>

      {/* Folga do Fator R */}
      <section className={`${card} p-5`} data-tour="cmp-folga">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
          <Gauge className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Folga do Fator R · {formatYearMonth(selectedMonth)} → {formatYearMonth(margin.nextYearMonth)}
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
          O Fator R de {formatYearMonth(margin.nextYearMonth)} usa os 11 meses anteriores + o faturamento e o pró-labore de{' '}
          {formatYearMonth(selectedMonth)}
          {selectedRecord ? ' (valores registrados)' : ' (valores da Apuração em andamento)'}.
        </p>

        {!hasMarginData ? (
          <div className="mt-4 text-xs text-slate-600 dark:text-slate-400 p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
            Informe o faturamento de {formatYearMonth(selectedMonth)} na Apuração para calcular a folga.
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-col lg:flex-row gap-4 lg:items-center">
            <div className="flex flex-col items-center shrink-0 px-2">
              <FactorRGauge value={margin.nextFactorRPercentage} size="lg" />
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Fator R projetado para {formatYearMonth(margin.nextYearMonth)}
              </div>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50">
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Fator R</div>
                <div className="mt-1 font-num tabular-nums text-slate-900 dark:text-white">
                  {formatYearMonth(selectedMonth)}: <b>{formatPercent(currentSimples.factorRPercentage)}</b> (Anexo{' '}
                  {currentSimples.anexoUsed})
                </div>
                <div className="font-num tabular-nums text-slate-900 dark:text-white">
                  {formatYearMonth(margin.nextYearMonth)}:{' '}
                  <b className={margin.isNextQualified ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                    {formatPercent(margin.nextFactorRPercentage)}
                  </b>{' '}
                  (Anexo {margin.isNextQualified ? 'III' : 'V'})
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50">
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Pró-labore deste mês</div>
                <div className="mt-1 font-num tabular-nums text-slate-900 dark:text-white">
                  Atual: <b>{formatCurrency(marginProlabore)}</b>
                </div>
                <div className="font-num tabular-nums text-slate-900 dark:text-white">
                  Mínimo p/ manter: <b>{formatCurrency(margin.minProlabore)}</b>
                </div>
                <div className="mt-1">
                  {margin.prolaboreMargin >= 0 ? (
                    <span className="text-slate-600 dark:text-slate-400">
                      Pode reduzir até <SignedCurrency value={margin.prolaboreMargin} className="font-num font-bold" />
                      {margin.marginCost > 0.005 && <> e economizar {formatCurrency(margin.marginCost)} de INSS/IRRF</>}
                    </span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      Precisa aumentar {formatCurrency(-margin.prolaboreMargin)}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50">
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Faturamento deste mês</div>
                <div className="mt-1 font-num tabular-nums text-slate-900 dark:text-white">
                  Atual: <b>{formatCurrency(marginRevenue)}</b>
                </div>
                <div className="font-num tabular-nums text-slate-900 dark:text-white">
                  Limite c/ pró-labore atual: <b>{formatCurrency(margin.revenueCeiling)}</b>
                </div>
                <div className="mt-1">
                  {margin.revenueMargin >= 0 ? (
                    <span className="text-slate-600 dark:text-slate-400">
                      Ainda pode faturar <SignedCurrency value={margin.revenueMargin} className="font-num font-bold" />
                    </span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      Passou {formatCurrency(-margin.revenueMargin)} do limite
                    </span>
                  )}
                </div>
              </div>
            </div>
            </div>

            <div
              className={`mt-3 flex items-start gap-2 p-3 rounded-xl text-xs border ${
                margin.isNextQualified
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-500/30 text-rose-900 dark:text-rose-200'
              }`}
            >
              {margin.isNextQualified ? (
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>
                {margin.isNextQualified
                  ? `Fator R garantido para ${formatYearMonth(margin.nextYearMonth)}.`
                  : `Com estes valores, ${formatYearMonth(margin.nextYearMonth)} cai no Anexo V.`}{' '}
                O que está em jogo: cerca de <b className="font-num">{formatCurrency(margin.dasAtStake)}</b> a mais de DAS
                em {formatYearMonth(margin.nextYearMonth)}, se o faturamento se repetir.
              </span>
            </div>
          </>
        )}
      </section>

      {/* Realizado mês a mês */}
      {realized.length > 0 && (
        <section className={`${card} overflow-hidden`}>
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Realizado × sem Fator R, mês a mês
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              "Sem Fator R" = DAS no Anexo V + INSS/IRRF de um pró-labore de 1 salário mínimo. Resultado positivo = você pagou
              menos que pagaria.
            </div>
          </div>

          {/* Tributos pagos × sem Fator R, por mês */}
          <div className="px-4 pt-4">
            <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Tributos pagos</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" /> Sem Fator R</span>
            </div>
            <BarCompareChart
              labels={realized.map((r) => formatShortMonth(r.record.yearMonth))}
              a={{ label: 'Tributos pagos', values: realized.map((r) => r.realTotal) }}
              b={{ label: 'Sem Fator R', values: realized.map((r) => r.semFatorR.totalTaxes) }}
              format={formatCurrency}
              formatAxis={formatCompactCurrency}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-num uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 font-bold">Competência</th>
                  <th className="py-2.5 px-4 text-right font-bold">Receita</th>
                  <th className="py-2.5 px-4 font-bold">Fator R</th>
                  <th className="py-2.5 px-4 text-right font-bold">DAS pago</th>
                  <th className="py-2.5 px-4 text-right font-bold">INSS + IRRF</th>
                  <th className="py-2.5 px-4 text-right font-bold">Total pago</th>
                  <th className="py-2.5 px-4 text-right font-bold">Sem Fator R</th>
                  <th className="py-2.5 px-4 text-right font-bold">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-num">
                {[...realized].reverse().map((r) => {
                  const qualified = r.anexoUsed === 'III';
                  const barWidth = Math.min(100, (r.factorRPercentage / 40) * 100);
                  const divergent = r.dasInformed && Math.abs(r.dasReal - r.dasExpected) > 1;
                  return (
                    <tr
                      key={r.record.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 ${
                        r.record.yearMonth === selectedMonth ? 'bg-emerald-50/60 dark:bg-emerald-500/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-200 whitespace-nowrap">
                        {formatYearMonth(r.record.yearMonth)}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {formatCurrency(r.record.revenue)}
                      </td>
                      <td className="py-2.5 px-4 min-w-[150px]">
                        <div className="flex items-center gap-2">
                          <div className="relative h-1.5 w-16 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <motion.div
                              className={`h-full ${qualified ? 'bg-emerald-500' : 'bg-rose-500'}`}
                              initial={reduceMotion ? false : { width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              transition={instantIf(reduceMotion, { duration: DURATION.number, ease: EASE_OUT })}
                            />
                            <div className="absolute top-0 bottom-0 w-px bg-slate-900 dark:bg-white" style={{ left: '70%' }} />
                          </div>
                          <span
                            className={`tabular-nums font-semibold ${
                              qualified ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {formatPercent(r.factorRPercentage, 1)}
                          </span>
                          <span className="text-[11px] text-slate-500">{r.anexoUsed}</span>
                          {r.factorRShortfall > 0 && r.factorRShortfall <= FACTOR_R_NEAR_MISS && (
                            <span
                              className="text-amber-600 dark:text-amber-400"
                              title={`Abaixo de 28% por ${formatCurrency(Math.max(0.01, r.factorRShortfall))} de folha (${formatPercent(Math.floor(r.factorRPercentage * 10000) / 10000, 4)}). Provável arredondamento de centavos: confira como o mês foi apurado no PGDAS.`}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {formatCurrency(r.dasReal)}
                        {!r.dasInformed && (
                          <span className="ml-1 text-[11px] text-slate-500" title="DAS não informado no histórico: valor calculado">
                            calc.
                          </span>
                        )}
                        {divergent && (
                          <span
                            className="ml-1 inline-flex align-middle text-amber-600 dark:text-amber-400"
                            title={`DAS informado difere do calculado (${formatCurrency(r.dasExpected)}). Confira a guia ou o histórico.`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {formatCurrency(r.record.inss + r.record.irrf)}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(r.realTotal)}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {formatCurrency(r.semFatorR.totalTaxes)}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-bold whitespace-nowrap">
                        <SignedCurrency value={r.result} />
                        {r.missedSavings > 0.005 && (
                          <div className="text-[11px] font-normal text-rose-600 dark:text-rose-400">
                            com Fator R: −{formatCurrency(r.missedSavings)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 font-num">
                <tr>
                  <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white" colSpan={5}>
                    Total
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums font-bold text-slate-900 dark:text-white">
                    {formatCurrency(totalReal)}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums font-bold text-slate-700 dark:text-slate-300">
                    {formatCurrency(totalSemFatorR)}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums font-extrabold">
                    <SignedCurrency value={totalResult} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {dasDivergences > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {dasDivergences} {dasDivergences === 1 ? 'competência tem' : 'competências têm'} DAS informado diferente do
              calculado. O resultado usa o valor informado.
            </div>
          )}
        </section>
      )}

      {/* Simulador */}
      <section className={`${card} p-5`} data-tour="cmp-simulador">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          E se… simulador para {formatYearMonth(selectedMonth)}
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
          {realized.length === 0 ? 'Sem histórico, os valores são ilustrativos: usa' : 'Usa'} o RBT12 da competência (
          {formatCurrency(simulation.rbt12)}) e compara as duas estratégias mantidas de
          forma contínua.
        </p>

        <div className="mt-4 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2 mb-2">
            <label htmlFor="sim-revenue" className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Faturamento do mês
            </label>
            <span className="text-base font-bold text-emerald-700 dark:text-emerald-400 font-num tabular-nums">
              {formatCurrency(simulatedRevenue)}
            </span>
          </div>
          <input
            id="sim-revenue"
            type="range"
            min="1000"
            max={sliderMax}
            step="500"
            value={Math.min(simulatedRevenue, sliderMax)}
            onChange={(e) => setSimulatedRevenue(parseFloat(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-500 font-num mt-1">
            <span>{formatCurrency(1000)}</span>
            <button
              type="button"
              onClick={() => setSimulatedRevenue(baseRevenue)}
              className="underline hover:text-emerald-600 cursor-pointer"
            >
              voltar ao real ({formatCurrency(baseRevenue)})
            </button>
            <span>{formatCurrency(sliderMax)}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { key: 'com', title: 'Com Fator R', subtitle: 'Anexo III · pró-labore de 28%', cost: simulation.comFatorR, wins: simulation.savings >= 0 },
            { key: 'sem', title: 'Sem Fator R', subtitle: 'Anexo V · pró-labore de 1 salário mínimo', cost: simulation.semFatorR, wins: simulation.savings < 0 },
          ].map((s) => (
            <div key={s.key} className="relative rounded-xl p-4 bg-slate-50 dark:bg-slate-950/50">
              {/* Destaque do mais vantajoso: desliza até o card vencedor */}
              {s.wins && (
                <motion.span
                  layoutId="sim-winner"
                  className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-emerald-500 shadow-[0_8px_24px_-12px_rgba(5,150,105,0.45)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{s.title}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{s.subtitle}</div>
                </div>
                <AnimatePresence initial={false}>
                  {s.wins && (
                    <motion.span
                      key="winner-badge"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: DURATION.base, ease: EASE_OUT }}
                      className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mais vantajoso
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="relative">
                <StrategyRows cost={s.cost} revenue={simulatedRevenue} />
              </div>
            </div>
          ))}
        </div>

        {/* Proporção dos custos: as duas barras se ajustam enquanto o slider anda */}
        <div className="mt-4 space-y-2 text-[11px]">
          {[
            { key: 'com', label: 'Com Fator R', value: simulation.comFatorR.totalTaxes, bar: 'bg-emerald-500 dark:bg-emerald-400' },
            { key: 'sem', label: 'Sem Fator R', value: simulation.semFatorR.totalTaxes, bar: 'bg-slate-400 dark:bg-slate-500' },
          ].map((b) => {
            const maxCost = Math.max(simulation.comFatorR.totalTaxes, simulation.semFatorR.totalTaxes, 1);
            return (
              <div key={b.key} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-slate-600 dark:text-slate-400">{b.label}</span>
                <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${b.bar}`}
                    initial={false}
                    animate={{ width: `${(Math.max(0, b.value) / maxCost) * 100}%` }}
                    transition={instantIf(reduceMotion, { duration: DURATION.base, ease: EASE_OUT })}
                  />
                </div>
                <AnimatedNumber
                  value={b.value}
                  format={formatCurrency}
                  durationMs={SIM_COUNT_MS}
                  className="w-24 shrink-0 text-right font-num font-semibold text-slate-800 dark:text-slate-200"
                />
              </div>
            );
          })}
        </div>

        <div className="mt-3 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="grid [&>*]:[grid-area:1/1]">
          <AnimatePresence initial={false}>
            {simulation.savings >= 0 ? (
              <motion.span
                key="compensa"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DURATION.micro }}
              >
                Manter o Fator R economiza{' '}
                <AnimatedSignedCurrency value={simulation.savings} durationMs={SIM_COUNT_MS} className="font-num font-bold" /> por
                mês (<AnimatedSignedCurrency value={simulation.savings * 12} durationMs={SIM_COUNT_MS} className="font-num" /> em 12
                meses).
              </motion.span>
            ) : (
              <motion.span
                key="nao-compensa"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DURATION.micro }}
              >
                Neste faturamento o Fator R <b>não compensa</b>: custa{' '}
                <AnimatedNumber value={-simulation.savings} format={formatCurrency} durationMs={SIM_COUNT_MS} className="font-num" /> a
                mais por mês.
              </motion.span>
            )}
          </AnimatePresence>
          </span>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-num uppercase text-[11px]">
              <tr>
                <th className="py-2 px-4 font-bold">Faturamento</th>
                <th className="py-2 px-4 text-right font-bold">Tributos c/ Fator R</th>
                <th className="py-2 px-4 text-right font-bold">Tributos s/ Fator R</th>
                <th className="py-2 px-4 text-right font-bold">Diferença no mês</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-num">
              {tiers.map((rev) => {
                const t = compareFactorRStrategies(rev, history, monthSettings, selectedMonth);
                return (
                  <tr key={rev} className={rev === baseRevenue ? 'bg-emerald-50/60 dark:bg-emerald-500/10' : ''}>
                    <td className="py-2 px-4 font-bold text-slate-900 dark:text-slate-200 tabular-nums">
                      {formatCurrency(rev)}
                      {rev === baseRevenue && <span className="ml-1 text-[11px] font-normal text-slate-500">real</span>}
                    </td>
                    <td className="py-2 px-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {formatCurrency(t.comFatorR.totalTaxes)}
                    </td>
                    <td className="py-2 px-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {formatCurrency(t.semFatorR.totalTaxes)}
                    </td>
                    <td className="py-2 px-4 text-right tabular-nums font-bold">
                      <SignedCurrency value={t.savings} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Premissas */}
      <section className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2 px-1">
        <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          Premissas: CPP (INSS patronal) incluída no DAS nos Anexos III e V; "Disponível ao sócio" = receita − tributos − IR retido sobre
          lucros, antes das despesas operacionais, considerando um único sócio. A partir de 2026, lucro distribuído acima de
          R$ 50 mil no mês sofre retenção de 10% sobre o total (antecipação do IR mínimo anual, ajustada na declaração). O INSS de 11% também conta para a
          aposentadoria do sócio. Ao mudar de estratégia, o Fator R leva até 12 meses para refletir a nova folha.
        </span>
      </section>
    </div>
  );
};
