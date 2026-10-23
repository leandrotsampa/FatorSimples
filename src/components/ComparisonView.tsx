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
        <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">{formatCurrency(value as number)}</span>
      </div>
    ))}
    <div className="flex justify-between py-1.5 px-2 rounded bg-slate-50 dark:bg-slate-950/40">
      <span className="font-semibold text-slate-700 dark:text-slate-300">Tributos (DAS + INSS + IRRF)</span>
      <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
        {formatCurrency(cost.totalTaxes)} ({formatPercent(revenue > 0 ? (cost.totalTaxes / revenue) * 100 : 0, 1)})
      </span>
    </div>
    {cost.dividendWithholding > 0 && (
      <div className="flex justify-between py-1 px-2">
        <span className="text-slate-600 dark:text-slate-400">IR retido sobre lucros (10%, acima de R$ 50 mil)</span>
        <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400">
          −{formatCurrency(cost.dividendWithholding)}
        </span>
      </div>
    )}
    <div className="flex justify-between py-1.5 px-2">
      <span className="text-slate-600 dark:text-slate-400">Disponível ao sócio</span>
      <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
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

  const card =
    'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-sm ring-1 ring-slate-900/5 dark:ring-transparent transition-colors';

  return (
    <div className="space-y-6 transition-colors duration-200">
      {/* Cabeçalho + resultado real */}
      <section className={`${card} p-5`}>
        <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wide uppercase">
            Comparador de Anexos · baseado no seu histórico
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            O Fator R está valendo a pena para você?
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Comparamos o que você efetivamente pagou (DAS + INSS + IRRF registrados) com o que pagaria sem o Fator R:
            Anexo V com pró-labore de 1 salário mínimo, mesmo faturamento e mesmo RBT12, nas tabelas de cada competência.
          </p>
        </div>

        {realized.length === 0 ? (
          <div className="mt-4 flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/30 text-xs text-amber-900 dark:text-amber-200">
            <History className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Nenhuma competência registrada até {formatYearMonth(selectedMonth)}. Cadastre os meses no Histórico para ver
              o resultado real. O simulador abaixo continua disponível.
            </span>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40">
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Resultado real em {realized.length} {realized.length === 1 ? 'mês' : 'meses'}
              </div>
              <div className="text-lg font-extrabold font-mono tabular-nums mt-0.5">
                <SignedCurrency value={totalResult} />
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                {totalResult >= 0 ? 'economizados frente ao Anexo V' : 'pagos a mais que no Anexo V'}
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Tributos pagos × sem Fator R</div>
              <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                {formatCurrency(totalReal)}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                vs {formatCurrency(totalSemFatorR)}
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Meses no Anexo III</div>
              <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                {monthsInIII} de {realized.length}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Fator R ≥ 28% na apuração</div>
            </div>
            <div
              className={`p-3.5 rounded-lg border ${
                totalMissed > 0
                  ? 'border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40'
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Economia perdida</div>
              <div className="text-sm font-bold font-mono tabular-nums mt-1">
                {totalMissed > 0 ? (
                  <span className="text-rose-600 dark:text-rose-400">{formatCurrency(totalMissed)}</span>
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
      <section className={`${card} p-5`}>
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
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Fator R</div>
                <div className="mt-1 font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatYearMonth(selectedMonth)}: <b>{formatPercent(currentSimples.factorRPercentage)}</b> (Anexo{' '}
                  {currentSimples.anexoUsed})
                </div>
                <div className="font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatYearMonth(margin.nextYearMonth)}:{' '}
                  <b className={margin.isNextQualified ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                    {formatPercent(margin.nextFactorRPercentage)}
                  </b>{' '}
                  (Anexo {margin.isNextQualified ? 'III' : 'V'})
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Pró-labore deste mês</div>
                <div className="mt-1 font-mono tabular-nums text-slate-900 dark:text-white">
                  Atual: <b>{formatCurrency(marginProlabore)}</b>
                </div>
                <div className="font-mono tabular-nums text-slate-900 dark:text-white">
                  Mínimo p/ manter: <b>{formatCurrency(margin.minProlabore)}</b>
                </div>
                <div className="mt-1">
                  {margin.prolaboreMargin >= 0 ? (
                    <span className="text-slate-600 dark:text-slate-400">
                      Pode reduzir até <SignedCurrency value={margin.prolaboreMargin} className="font-mono font-bold" />
                      {margin.marginCost > 0.005 && <> e economizar {formatCurrency(margin.marginCost)} de INSS/IRRF</>}
                    </span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      Precisa aumentar {formatCurrency(-margin.prolaboreMargin)}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Faturamento deste mês</div>
                <div className="mt-1 font-mono tabular-nums text-slate-900 dark:text-white">
                  Atual: <b>{formatCurrency(marginRevenue)}</b>
                </div>
                <div className="font-mono tabular-nums text-slate-900 dark:text-white">
                  Limite c/ pró-labore atual: <b>{formatCurrency(margin.revenueCeiling)}</b>
                </div>
                <div className="mt-1">
                  {margin.revenueMargin >= 0 ? (
                    <span className="text-slate-600 dark:text-slate-400">
                      Ainda pode faturar <SignedCurrency value={margin.revenueMargin} className="font-mono font-bold" />
                    </span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      Passou {formatCurrency(-margin.revenueMargin)} do limite
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div
              className={`mt-3 flex items-start gap-2 p-3 rounded-lg text-xs border ${
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
                O que está em jogo: cerca de <b className="font-mono">{formatCurrency(margin.dasAtStake)}</b> a mais de DAS
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

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-mono uppercase text-[11px]">
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
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
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
                            <div
                              className={`h-full ${qualified ? 'bg-emerald-500' : 'bg-rose-500'}`}
                              style={{ width: `${barWidth}%` }}
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
                          <span className="text-[10px] text-slate-500">{r.anexoUsed}</span>
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
                          <span className="ml-1 text-[10px] text-slate-500" title="DAS não informado no histórico: valor calculado">
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
                          <div className="text-[10px] font-normal text-rose-600 dark:text-rose-400">
                            com Fator R: −{formatCurrency(r.missedSavings)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 font-mono">
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
      <section className={`${card} p-5`}>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          E se… simulador para {formatYearMonth(selectedMonth)}
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
          Usa o RBT12 real da competência ({formatCurrency(simulation.rbt12)}) e compara as duas estratégias mantidas de
          forma contínua.
        </p>

        <div className="mt-4 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2 mb-2">
            <label htmlFor="sim-revenue" className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Faturamento do mês
            </label>
            <span className="text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
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
          <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
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
            <div
              key={s.key}
              className={`rounded-lg p-4 border ${
                s.wins ? 'border-2 border-emerald-500' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{s.title}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{s.subtitle}</div>
                </div>
                {s.wins && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mais vantajoso
                  </span>
                )}
              </div>
              <StrategyRows cost={s.cost} revenue={simulatedRevenue} />
            </div>
          ))}
        </div>

        <div className="mt-3 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          {simulation.savings >= 0 ? (
            <span>
              Manter o Fator R economiza <SignedCurrency value={simulation.savings} className="font-mono font-bold" /> por mês
              (<SignedCurrency value={simulation.savings * 12} className="font-mono" /> em 12 meses).
            </span>
          ) : (
            <span>
              Neste faturamento o Fator R <b>não compensa</b>: custa {formatCurrency(-simulation.savings)} a mais por mês.
            </span>
          )}
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-mono uppercase text-[11px]">
              <tr>
                <th className="py-2 px-4 font-bold">Faturamento</th>
                <th className="py-2 px-4 text-right font-bold">Tributos c/ Fator R</th>
                <th className="py-2 px-4 text-right font-bold">Tributos s/ Fator R</th>
                <th className="py-2 px-4 text-right font-bold">Diferença no mês</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
              {tiers.map((rev) => {
                const t = compareFactorRStrategies(rev, history, monthSettings, selectedMonth);
                return (
                  <tr key={rev} className={rev === baseRevenue ? 'bg-emerald-50/60 dark:bg-emerald-500/10' : ''}>
                    <td className="py-2 px-4 font-bold text-slate-900 dark:text-slate-200 tabular-nums">
                      {formatCurrency(rev)}
                      {rev === baseRevenue && <span className="ml-1 text-[10px] font-normal text-slate-500">real</span>}
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
