import React, { useState } from 'react';
import {
  History,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
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

interface HistoryTableProps {
  history: MonthRecord[];
  onAddMonth: () => void;
  onEditMonth: (record: MonthRecord) => void;
  onDeleteMonth: (id: string) => void;
  onGenerateSample: () => void;
  onClearHistory: () => void;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({
  history,
  onAddMonth,
  onEditMonth,
  onDeleteMonth,
  onGenerateSample,
  onClearHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

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

  // Encontra a maior receita para cálculo de escala de barras
  const maxRevenue = Math.max(...sortedHistory.map((m) => m.revenue), 10000);

  return (
    <div className="page-stagger space-y-5">
      <PageHeader
        eyebrow="Memória fiscal permanente"
        title="Histórico de faturamento e folha"
        description="O Simples Nacional calcula a alíquota pela receita bruta dos 12 meses anteriores à apuração (RBT12). Cadastre ou edite as competências abaixo."
        actions={
          <>
            {history.length === 0 && (
              <button
                onClick={onGenerateSample}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-full transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                title="Preenche 11 meses anteriores com dados realistas para simulação imediata"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Gerar 11 Meses Exemplo</span>
              </button>
            )}
            <button
              onClick={onAddMonth}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-full transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Competência</span>
            </button>
          </>
        }
      />

      {/* Métricas rápidas */}
      <section className={`${card} p-5`}>
        {/* 4 Key Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* RBT12 Acumulado */}
          <div className="bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl transition-colors">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">RBT12 (Últimos 12 Meses):</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white font-num mt-0.5 tabular-nums">
              {formatCurrency(totalRevenue12)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Base da Alíquota do Simples</div>
          </div>

          {/* Folha 12 Acumulada */}
          <div className="bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl transition-colors">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Folha Total (12 Meses):</div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-200 font-num mt-0.5 tabular-nums">
              {formatCurrency(totalPayroll12)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Pró-labore + Encargos pagos</div>
          </div>

          {/* Fator R Geral */}
          <div className="bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl transition-colors">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
              Fator R {nextCompetence ? `para ${nextCompetence}` : 'Acumulado 12m'}:
            </div>
            <div className="text-lg font-bold font-num mt-0.5 tabular-nums flex items-center gap-1.5">
              <span className={isOverallQualified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                {formatPercent(overallFactorR, 2)}
              </span>
              {isOverallQualified ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {isOverallQualified ? 'Enquadrado no Anexo III (≥ 28%)' : 'Abaixo de 28% (Anexo V)'}
            </div>
          </div>

          {/* Total Simples Pago */}
          <div className="bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl transition-colors">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Total DAS Recolhido (12m):</div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-200 font-num mt-0.5 tabular-nums">
              {formatCurrency(totalDas12)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              INSS: {formatCurrency(totalInss12)} · IR: {formatCurrency(totalIrrf12)}
            </div>
          </div>
        </div>
      </section>

      {/* Visual Timeline Chart: Receita vs Folha vs Meta 28% */}
      {sortedHistory.length > 0 && (
        <section className={`${card} p-5`}>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800 text-xs">
            <div className="font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Evolução Mensal (Faturamento vs Folha / Fator R)</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-600 dark:text-slate-400 font-num">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs inline-block" /> Faturamento
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 bg-amber-400 rounded-xs inline-block" /> Folha / Pró-labore
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-0.5 bg-sky-500 inline-block" /> Meta 28%
              </span>
            </div>
          </div>

          {/* Bar Chart list */}
          <div className="space-y-3">
            {sortedHistory.slice(0, 12).map((item) => {
              const revPercent = Math.min(100, (item.revenue / maxRevenue) * 100);
              const payPercent = Math.min(100, (item.payroll / maxRevenue) * 100);
              const target28Percent = revPercent * 0.28;
              const monthFactorR = item.revenue > 0 ? (item.payroll / item.revenue) * 100 : 0;
              const isMonthOk = monthFactorR >= 28;

              return (
                <div key={item.id} className="group text-xs">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-num font-bold text-slate-800 dark:text-slate-300 w-20">
                      {item.yearMonth}
                    </span>
                    <div className="flex items-center gap-3 font-num">
                      <span className="text-slate-700 dark:text-slate-300">Rev: {formatCurrency(item.revenue)}</span>
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">Folha: {formatCurrency(item.payroll)}</span>
                      <span className={`font-bold ${isMonthOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        Folha/receita: {formatPercent(monthFactorR, 1)}
                      </span>
                    </div>
                  </div>

                  {/* Dual Bar */}
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-950 rounded-sm overflow-hidden relative flex items-center border border-slate-200 dark:border-slate-800">
                    {/* Revenue bar */}
                    <div
                      className="bg-emerald-500/80 h-full rounded-l-xs transition-all"
                      style={{ width: `${revPercent}%` }}
                    />
                    {/* Payroll bar overlayed or beside */}
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-amber-400/90 rounded-l-xs transition-all"
                      style={{ width: `${payPercent}%` }}
                    />
                    {/* 28% Target marker tick */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-sky-500 dark:bg-sky-300 z-10"
                      style={{ left: `${target28Percent}%` }}
                      title="Linha de corte 28%"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Table View */}
      <section className={`${card} overflow-hidden`}>
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
              Adicione os faturamentos dos meses anteriores para o sistema calcular o RBT12 com precisão, ou clique em &quot;Gerar 11 Meses Exemplo&quot;.
            </p>
            {history.length === 0 && (
              <button
                onClick={onGenerateSample}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gerar 11 Meses de Exemplo Agora</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-num uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-bold">Competência</th>
                  <th className="py-3 px-4 font-bold text-right">Receita Bruta</th>
                  <th className="py-3 px-4 font-bold text-right">Folha / Pró-labore</th>
                  <th
                    className="py-3 px-4 font-bold text-center"
                    title="Fator R usado na apuração da competência: folha ÷ receita dos 12 meses anteriores"
                  >
                    Fator R (apuração)
                  </th>
                  <th className="py-3 px-4 font-bold text-right">INSS Retido</th>
                  <th className="py-3 px-4 font-bold text-right">IRRF Retido</th>
                  <th className="py-3 px-4 font-bold text-right">Guia DAS</th>
                  <th className="py-3 px-4 font-bold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-num">
                {filteredHistory.map((item, idx) => {
                  const apuration = apurationByMonth.get(item.yearMonth);
                  const factorR = apuration?.factorRPercentage ?? 0;
                  const isOk = apuration?.isQualifiedForAnexo3 ?? false;
                  const monthRatio = item.revenue > 0 ? (item.payroll / item.revenue) * 100 : 0;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        idx < 12 ? 'bg-white dark:bg-slate-900/50' : 'bg-slate-50/50 dark:bg-slate-950/30 opacity-75'
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                        <span>{item.yearMonth}</span>
                        {idx === 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 rounded font-sans font-semibold">
                            Mais Recente
                          </span>
                        )}
                        {idx >= 12 && (
                          <span className="text-[10px] px-1 py-0.2 text-slate-500 font-sans">
                            (Fora 12m)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right text-slate-900 dark:text-slate-100 font-bold tabular-nums">
                        {formatCurrency(item.revenue)}
                      </td>

                      <td className="py-3 px-4 text-right text-amber-700 dark:text-amber-300 font-semibold tabular-nums">
                        {formatCurrency(item.payroll)}
                      </td>

                      <td className="py-3 px-4 text-center tabular-nums">
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            isOk ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                          title={`Folha ÷ receita só deste mês: ${formatPercent(monthRatio, 1)}`}
                        >
                          {formatPercent(factorR, 1)}
                          <span className="text-[10px] font-normal text-slate-500">
                            {apuration && `Anexo ${apuration.anexoUsed}${apuration.monthsCount === 0 ? ' · 1º mês' : ''}`}
                          </span>
                          {apuration && apuration.factorRShortfall > 0 && apuration.factorRShortfall <= FACTOR_R_NEAR_MISS && (
                            <span
                              className="text-amber-600 dark:text-amber-400"
                              title={`Abaixo de 28% por ${formatCurrency(Math.max(0.01, apuration.factorRShortfall))} de folha (${formatPercent(Math.floor(factorR * 10000) / 10000, 4)}). Provável arredondamento de centavos: confira como o mês foi apurado no PGDAS.`}
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                        {formatCurrency(item.inss)}
                      </td>

                      <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300 tabular-nums">
                        {formatCurrency(item.irrf)}
                      </td>

                      <td className="py-3 px-4 text-right text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                        {formatCurrency(item.dasPaid)}
                      </td>

                      <td className="py-3 px-4 text-center">
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
