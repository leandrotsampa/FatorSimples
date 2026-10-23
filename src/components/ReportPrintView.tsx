import React from 'react';
import {
  Printer,
  Download,
  Building2,
  FileCheck2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { TaxSettings, MonthRecord, MonthSummaryResult } from '../types/tax';
import {
  formatCurrency,
  formatPercent,
  calculateMonthSummary,
} from '../utils/taxCalculations';
import { OFFICIAL_TAX_TABLES } from '../utils/taxTablesRegistry';

interface ReportPrintViewProps {
  currentRevenue: number;
  prolaboreOverride?: number;
  selectedMonth: string;
  history: MonthRecord[];
  settings: TaxSettings;
  onPrint: () => void;
}

export const ReportPrintView: React.FC<ReportPrintViewProps> = ({
  currentRevenue,
  prolaboreOverride,
  selectedMonth,
  history,
  settings,
  onPrint,
}) => {
  const summary: MonthSummaryResult = calculateMonthSummary(
    currentRevenue,
    history,
    settings,
    selectedMonth,
    prolaboreOverride
  );

  const { prolabore, simples, consolidated } = summary;
  const activeTable =
    OFFICIAL_TAX_TABLES[settings.taxVersionId] ||
    OFFICIAL_TAX_TABLES['2026_oficial'] ||
    Object.values(OFFICIAL_TAX_TABLES)[0];

  return (
    <div className="space-y-6">
      {/* Action Toolbar on Screen (hidden on print) */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <span>Relatório Oficial de Apuração Contábil</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Documento pronto para envio à contabilidade ou arquivamento fiscal do fechamento mensal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrint}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar em PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet (styled with crisp white on print and dark slate preview on screen) */}
      <div className="report-sheet bg-white text-slate-900 p-8 sm:p-10 rounded-xl shadow-xl border border-slate-200 max-w-4xl mx-auto font-sans">
        
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="text-xl font-extrabold tracking-tight text-slate-900 uppercase">
              {settings.companyName || 'EMPRESA CONTRIBUINTE DO SIMPLES NACIONAL'}
            </div>
            <div className="text-xs text-slate-600 mt-1 space-y-0.5 font-mono">
              <div>CNPJ: <span className="font-semibold text-slate-800">{settings.cnpj || '00.000.000/0001-00'}</span></div>
              <div>Município / UF: <span className="font-semibold text-slate-800">{settings.cityState || 'Brusque - SC'}</span></div>
              <div>CNAE Principal: <span className="font-semibold text-slate-800">{settings.cnae}</span></div>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <div className="inline-block bg-slate-100 border border-slate-300 px-3 py-1.5 rounded text-xs font-mono">
              <span className="text-slate-500 uppercase block text-[10px]">Competência:</span>
              <span className="font-bold text-slate-900 text-sm">{selectedMonth}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Data de Emissão: {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="py-4 text-center border-b border-slate-200 bg-slate-50 -mx-8 sm:-mx-10 px-8">
          <h1 className="text-base font-bold text-slate-900 uppercase tracking-wide">
            MEMÓRIA DE CÁLCULO E APURAÇÃO: SIMPLES NACIONAL & FATOR R
          </h1>
          <div className="text-xs text-slate-500 mt-0.5">
            Em conformidade com a Lei Complementar nº 123/2006 (art. 18) e legislação tributária vigente
          </div>
          <div className="text-[11px] text-emerald-800 font-medium mt-1">
            Tabelas Fiscais: {activeTable.name} · Teto INSS: {formatCurrency(settings.inssCeiling)}
          </div>
        </div>

        {/* 1. Resumo Executivo da Apuração */}
        <div className="my-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 border-b border-slate-300 pb-1">
            1. Dados Gerais da Apuração do Mês
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Receita do Mês:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{formatCurrency(currentRevenue)}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="text-slate-500 block text-[11px]">RBT12 Acumulado:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{formatCurrency(simples.rbt12)}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Folha 12m Acumulada:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{formatCurrency(simples.folha12)}</span>
            </div>

            <div className="bg-emerald-50 p-2.5 rounded border border-emerald-200">
              <span className="text-emerald-800 block text-[11px] font-semibold">Fator R Apurado:</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                {formatPercent(simples.factorRPercentage, 2)}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Memória de Cálculo do Simples Nacional (DAS) */}
        <div className="my-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 border-b border-slate-300 pb-1">
            2. Apuração do Simples Nacional (DAS)
          </h3>

          <div className="bg-slate-50 p-3.5 rounded border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span>Enquadramento:</span>
              <span className="font-semibold text-slate-900">
                Anexo {simples.anexoUsed} · Faixa {simples.faixa} (Fator R ≥ 28%)
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span>Alíquota Nominal:</span>
              <span className="font-mono text-slate-900">{formatPercent(simples.nominalRate * 100)}</span>
            </div>

            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span>Parcela a Deduzir:</span>
              <span className="font-mono text-slate-900">{formatCurrency(simples.deduction)}</span>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200 font-mono text-[11px]">
              <span className="text-slate-500 block font-sans text-[10px] uppercase font-semibold">Fórmula da Alíquota Efetiva:</span>
              <span>({formatCurrency(simples.rbt12)} × {formatPercent(simples.nominalRate * 100)} - {formatCurrency(simples.deduction)}) ÷ {formatCurrency(simples.rbt12)} = </span>
              <span className="font-bold text-emerald-700">{formatPercent(simples.effectiveRatePercentage, 4)}</span>
            </div>

            <div className="flex justify-between pt-1 text-sm font-bold">
              <span>Valor da Guia DAS a Recolher:</span>
              <span className="font-mono text-slate-900">{formatCurrency(simples.dasAmount)}</span>
            </div>
          </div>
        </div>

        {/* 3. Memória de Cálculo do Pró-labore e Encargos */}
        <div className="my-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 border-b border-slate-300 pb-1">
            3. Pró-labore dos Sócios / Titulares e Retenções
          </h3>

          <table className="w-full text-xs border border-slate-200 rounded">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-mono">
              <tr>
                <th className="py-2 px-3 text-left">Rubrica</th>
                <th className="py-2 px-3 text-left">Base de Cálculo / Alíquota</th>
                <th className="py-2 px-3 text-right">Valor (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              <tr>
                <td className="py-2 px-3 font-medium font-sans">Pró-labore Bruto (Folha)</td>
                <td className="py-2 px-3 text-slate-600">Proporcional Fator R (28%)</td>
                <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(prolabore.gross)}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans">(-) INSS Retido (Contribuinte Individual)</td>
                <td className="py-2 px-3 text-slate-600">
                  11% {prolabore.inssCeilingApplied ? `(Limitado ao Teto ${formatCurrency(settings.inssCeiling)})` : ''}
                </td>
                <td className="py-2 px-3 text-right text-rose-700 font-semibold">- {formatCurrency(prolabore.inss)}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans">(-) IRRF Retido na Fonte</td>
                <td className="py-2 px-3 text-slate-600">
                  Alíquota {formatPercent(prolabore.irrfRate * 100, 1)} · Método: {prolabore.irrfChosenMethod === 'simplified' ? 'Desconto Simplificado' : 'Deduções Legais'}
                  {prolabore.irrfReduction > 0 &&
                    ` · Tabela ${formatCurrency(prolabore.irrfBeforeReduction)} − Redução Lei 15.270/2025 ${formatCurrency(prolabore.irrfReduction)}`}
                </td>
                <td className="py-2 px-3 text-right text-rose-700 font-semibold">- {formatCurrency(prolabore.irrf)}</td>
              </tr>
              <tr className="bg-slate-50 font-bold">
                <td className="py-2 px-3 text-slate-900 font-sans">(=) Pró-labore Líquido Creditado na PF</td>
                <td className="py-2 px-3 text-slate-600 font-sans font-normal">Disponível em conta bancária do sócio</td>
                <td className="py-2 px-3 text-right text-emerald-700 text-sm">{formatCurrency(prolabore.net)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. Resultado Consolidado & Lucro Isento */}
        <div className="my-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 border-b border-slate-300 pb-1">
            4. Distribuição de Lucros Isentos e Total Disponibilizado na Pessoa Física
          </h3>

          <div className="bg-slate-50 p-3.5 rounded border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span>Faturamento Bruto da PJ:</span>
              <span className="font-mono font-semibold">{formatCurrency(currentRevenue)}</span>
            </div>
            <div className="flex justify-between text-rose-700">
              <span>(-) Imposto Simples Nacional (DAS):</span>
              <span className="font-mono">- {formatCurrency(simples.dasAmount)}</span>
            </div>
            <div className="flex justify-between text-rose-700">
              <span>(-) Pró-labore Bruto pago:</span>
              <span className="font-mono">- {formatCurrency(prolabore.gross)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-900">
              <span>(=) Lucro Líquido Distribuível:</span>
              <span className="font-mono text-emerald-700">{formatCurrency(consolidated.distributableProfit)}</span>
            </div>
            {consolidated.dividendWithholding > 0 && (
              <div className="flex justify-between text-rose-700">
                <span>(-) IR Retido sobre Lucros (10% sobre o total, Lei 15.270/2025):</span>
                <span className="font-mono">- {formatCurrency(consolidated.dividendWithholding)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-300 pt-1.5 font-bold text-sm text-slate-900">
              <span>Total Creditado na Pessoa Física (Pró-labore Líquido + Lucros):</span>
              <span className="font-mono text-emerald-800">{formatCurrency(consolidated.totalPocketCash)}</span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="mt-12 pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="border-b border-slate-400 pb-8 mb-2" />
            <div className="font-bold text-slate-900 uppercase">{settings.companyName || 'Sócio Administrador'}</div>
            <div className="text-slate-500 text-[11px]">Responsável Legal da Empresa</div>
          </div>

          <div>
            <div className="border-b border-slate-400 pb-8 mb-2" />
            <div className="font-bold text-slate-900 uppercase">Contabilidade / Escritório Contábil</div>
            <div className="text-slate-500 text-[11px]">CRC / Brusque - SC</div>
          </div>
        </div>

      </div>
    </div>
  );
};
