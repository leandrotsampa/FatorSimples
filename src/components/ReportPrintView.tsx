import React from 'react';
import { FileCheck2, Printer } from 'lucide-react';
import { TaxSettings, MonthRecord, MonthSummaryResult } from '../types/tax';
import {
  formatCurrency,
  formatPercent,
  calculateMonthSummary,
} from '../utils/taxCalculations';
import { monthLongName } from '../utils/monthPicker';
import { dasDueDate, formatDueDate } from '../utils/dasDueDate';
import { OFFICIAL_TAX_TABLES } from '../utils/taxTablesRegistry';
import { PageHeader } from './ui/PageHeader';

interface ReportPrintViewProps {
  currentRevenue: number;
  prolaboreOverride?: number;
  selectedMonth: string;
  history: MonthRecord[];
  settings: TaxSettings;
  onPrint: () => void;
}

// "2026-10" -> "Outubro de 2026"
const competenceLong = (yearMonth: string) => `${monthLongName(yearMonth)} de ${yearMonth.slice(0, 4)}`;

// Regra que definiu o pró-labore (em mês salvo, deduzida do valor gravado)
const RULE_LABEL: Record<TaxSettings['prolaboreRule'], string> = {
  auto_28_month: '28% do faturamento do mês',
  exact_rbt12: 'Mínimo para manter o Fator R em 28%',
  manual: 'Valor definido manualmente',
};

const Section: React.FC<{ n: number; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
  <section className="mt-7 break-inside-avoid">
    <h2 className="flex items-baseline gap-2 text-sm font-bold text-slate-900 pb-1.5 mb-2 border-b border-slate-300">
      <span className="font-num text-emerald-700">{n}.</span>
      {title}
    </h2>
    {children}
  </section>
);

// Linha do documento: rótulo, observação opcional ao centro e valor à direita.
// Colunas de largura fixa (não "auto"): cada linha é uma grade própria, e assim todas alinham entre si
const Row: React.FC<{
  label: React.ReactNode;
  note?: React.ReactNode;
  value: React.ReactNode;
  tone?: 'normal' | 'minus' | 'total' | 'result';
}> = ({ label, note, value, tone = 'normal' }) => (
  <div
    className={`grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)_8.5rem] items-baseline gap-x-4 py-1.5 text-xs ${
      tone === 'total' || tone === 'result' ? 'border-t border-slate-300 font-semibold text-slate-900' : 'text-slate-700'
    } ${tone === 'result' ? 'text-sm' : ''}`}
  >
    <span>{label}</span>
    <span className="text-[11px] font-normal text-slate-500">{note}</span>
    <span
      className={`font-num tabular-nums text-right ${
        tone === 'minus' ? 'text-rose-700' : tone === 'result' ? 'text-emerald-800 font-bold' : 'text-slate-900'
      }`}
    >
      {value}
    </span>
  </div>
);

const SummaryTile: React.FC<{ label: string; value: string; detail: React.ReactNode; tone?: 'normal' | 'good' | 'bad' }> = ({
  label,
  value,
  detail,
  tone = 'normal',
}) => (
  <div
    className={`p-3 rounded-lg border ${
      tone === 'good' ? 'border-emerald-300 bg-emerald-50' : tone === 'bad' ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'
    }`}
  >
    <div className="text-[11px] text-slate-500">{label}</div>
    <div
      className={`mt-0.5 font-num font-bold text-base ${
        tone === 'good' ? 'text-emerald-800' : tone === 'bad' ? 'text-rose-700' : 'text-slate-900'
      }`}
    >
      {value}
    </div>
    <div className="mt-0.5 text-[11px] text-slate-500">{detail}</div>
  </div>
);

// Dado da empresa ainda não cadastrado: aparece como pendente, nunca com um valor de exemplo
const Pending: React.FC = () => <span className="italic font-normal text-slate-400">não informado</span>;

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
  // Mês ainda não salvo no histórico: o resumo sai marcado como rascunho (inclusive na impressão)
  const isDraft = !history.some((h) => h.yearMonth === selectedMonth);
  const activeTable =
    OFFICIAL_TAX_TABLES[settings.taxVersionId] ||
    OFFICIAL_TAX_TABLES['2026_oficial'] ||
    Object.values(OFFICIAL_TAX_TABLES)[0];
  const dasDue = formatDueDate(dasDueDate(selectedMonth));
  const prolaboreTaxes = prolabore.inss + prolabore.irrf;
  const monthTaxes = consolidated.totalTaxes + consolidated.dividendWithholding;

  return (
    <div className="page-stagger space-y-5">
      {/* Cabeçalho na tela (some na impressão) */}
      <div className="no-print">
        <PageHeader
          eyebrow={
            <span className="flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Para guardar ou enviar
            </span>
          }
          title="Resumo do mês"
          description="Documento pronto para envio à contabilidade ou arquivamento fiscal do fechamento mensal."
          actions={
            <button
              onClick={onPrint}
              data-tour="rel-imprimir"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-full transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar em PDF</span>
            </button>
          }
        />
      </div>

      {/* Folha do documento: sempre branca, na tela e na impressão */}
      <div className="report-sheet bg-white text-slate-900 p-8 sm:p-10 rounded-xl shadow-xl border border-slate-200 max-w-4xl mx-auto font-sans">
        {isDraft && (
          <div className="mb-5 px-3 py-2 rounded-lg border-2 border-dashed border-amber-500 text-amber-800 text-xs font-semibold text-center">
            Rascunho: este mês ainda não está salvo no histórico. Os valores podem mudar.
          </div>
        )}

        {/* Cabeçalho do documento */}
        <header data-tour="rel-folha" className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b-2 border-slate-900">
          <div className="min-w-0">
            <div className="text-xl font-extrabold tracking-tight text-slate-900">
              {settings.companyName || <Pending />}
            </div>
            <div className="mt-1.5 grid gap-0.5 text-xs text-slate-600">
              <div>
                CNPJ <span className="font-num font-semibold text-slate-800">{settings.cnpj || <Pending />}</span>
              </div>
              <div>
                Município/UF <span className="font-semibold text-slate-800">{settings.cityState || <Pending />}</span>
              </div>
              <div>
                CNAE principal <span className="font-semibold text-slate-800">{settings.cnae || <Pending />}</span>
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <div className="text-[11px] text-slate-500">Competência</div>
            <div className="text-lg font-bold text-slate-900">{competenceLong(selectedMonth)}</div>
            <div className="mt-1 text-[11px] text-slate-500">Emitido em {new Date().toLocaleDateString('pt-BR')}</div>
          </div>
        </header>

        {/* Título do documento entre duas linhas: a do cabeçalho, acima, e a sua, abaixo */}
        <h1 className="py-3 text-center text-base font-bold text-slate-900 border-b-2 border-slate-900">
          Apuração mensal · Simples Nacional e Fator R
        </h1>

        {/* Os números que importam */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <SummaryTile label="Faturamento" value={formatCurrency(currentRevenue)} detail="Notas emitidas no mês" />
          <SummaryTile
            label="Impostos do mês"
            value={formatCurrency(monthTaxes)}
            detail={`DAS ${formatCurrency(consolidated.dasAmount)} + pró-labore ${formatCurrency(prolaboreTaxes)}`}
          />
          <SummaryTile
            label="Para o sócio"
            value={formatCurrency(consolidated.totalPocketCash)}
            detail="Pró-labore líquido + lucros"
          />
          <SummaryTile
            label="Fator R"
            value={formatPercent(simples.factorRPercentage, 2)}
            detail={`Anexo ${simples.anexoUsed}${simples.isQualifiedForAnexo3 ? ' · acima de 28%' : ' · abaixo de 28%'}`}
            tone={simples.isQualifiedForAnexo3 ? 'good' : 'bad'}
          />
        </div>

        <Section n={1} title="Simples Nacional (DAS)">
          <Row label="Faturamento do mês" value={formatCurrency(currentRevenue)} />
          <Row
            label="RBT12 (receita dos 12 meses anteriores)"
            note={simples.isProportional ? `média de ${simples.monthsCount} ${simples.monthsCount === 1 ? 'mês' : 'meses'} × 12` : undefined}
            value={formatCurrency(simples.rbt12)}
          />
          <Row label="Folha dos 12 meses anteriores" value={formatCurrency(simples.folha12)} />
          <Row
            label="Fator R"
            note={simples.isQualifiedForAnexo3 ? 'acima de 28%: Anexo III' : 'abaixo de 28%: Anexo V'}
            value={formatPercent(simples.factorRPercentage, 2)}
          />
          <Row
            label={`Anexo ${simples.anexoUsed}, faixa ${simples.faixa}`}
            note={`nominal ${formatPercent(simples.nominalRate * 100)} · parcela a deduzir ${formatCurrency(simples.deduction)}`}
            value={formatPercent(simples.effectiveRatePercentage, 2)}
          />
          <div className="my-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
            <div className="text-slate-500">Alíquota efetiva = (RBT12 × alíquota nominal − parcela a deduzir) ÷ RBT12</div>
            <div className="mt-0.5 font-num text-slate-800">
              ({formatCurrency(simples.rbt12)} × {formatPercent(simples.nominalRate * 100)} − {formatCurrency(simples.deduction)}) ÷{' '}
              {formatCurrency(simples.rbt12)} = <b className="text-emerald-800">{formatPercent(simples.effectiveRatePercentage, 4)}</b>
            </div>
          </div>
          <Row label="CPP (INSS patronal)" value="incluída no DAS" />
          <Row label="DAS a recolher" note={`vence em ${dasDue}`} value={formatCurrency(simples.dasAmount)} tone="result" />
        </Section>

        <Section n={2} title="Pró-labore">
          <Row label="Pró-labore bruto" note={RULE_LABEL[settings.prolaboreRule]} value={formatCurrency(prolabore.gross)} />
          <Row
            label="(−) INSS retido"
            note={`11% contribuinte individual${prolabore.inssCeilingApplied ? ` · limitado ao teto de ${formatCurrency(settings.inssCeiling)}` : ''}`}
            value={`− ${formatCurrency(prolabore.inss)}`}
            tone="minus"
          />
          <Row
            label="(−) IRRF retido"
            note={
              <>
                alíquota {formatPercent(prolabore.irrfRate * 100, 1)} ·{' '}
                {prolabore.irrfChosenMethod === 'simplified' ? 'desconto simplificado' : 'deduções legais'}
                {prolabore.irrfReduction > 0 &&
                  ` · tabela ${formatCurrency(prolabore.irrfBeforeReduction)} − redução Lei 15.270/2025 ${formatCurrency(prolabore.irrfReduction)}`}
              </>
            }
            value={`− ${formatCurrency(prolabore.irrf)}`}
            tone="minus"
          />
          <Row label="Total retido do pró-labore" note="INSS + IRRF" value={formatCurrency(prolaboreTaxes)} tone="total" />
          <Row label="Pró-labore líquido" note="creditado na conta do sócio" value={formatCurrency(prolabore.net)} tone="result" />
        </Section>

        <Section n={3} title="Lucros e total para o sócio">
          <Row label="Faturamento do mês" value={formatCurrency(currentRevenue)} />
          <Row label="(−) DAS" value={`− ${formatCurrency(simples.dasAmount)}`} tone="minus" />
          <Row label="(−) Pró-labore bruto" value={`− ${formatCurrency(prolabore.gross)}`} tone="minus" />
          {consolidated.accountingFee > 0.005 && (
            <Row label="(−) Honorários da contabilidade" value={`− ${formatCurrency(consolidated.accountingFee)}`} tone="minus" />
          )}
          <Row label="Lucro distribuível" value={formatCurrency(consolidated.distributableProfit)} tone="total" />
          {consolidated.dividendWithholding > 0 ? (
            <Row
              label="(−) IR retido sobre lucros"
              note="10% sobre o total, Lei 15.270/2025"
              value={`− ${formatCurrency(consolidated.dividendWithholding)}`}
              tone="minus"
            />
          ) : (
            <Row label="IR sobre lucros" value="isento" />
          )}
          <Row label="Antecipação de lucros" note="isenta de IR para o sócio" value={formatCurrency(consolidated.taxFreeDividends)} />
          <Row
            label="Total para o sócio"
            note="pró-labore líquido + antecipação de lucros"
            value={formatCurrency(consolidated.totalPocketCash)}
            tone="result"
          />
        </Section>

        {/* Assinaturas */}
        <div className="mt-14 grid grid-cols-2 gap-10 text-center text-xs break-inside-avoid">
          <div>
            <div className="border-b border-slate-400 h-10 mb-2" />
            <div className="font-semibold text-slate-900">{settings.companyName || 'Empresa'}</div>
            <div className="text-[11px] text-slate-500">Sócio administrador</div>
          </div>
          <div>
            <div className="border-b border-slate-400 h-10 mb-2" />
            <div className="font-semibold text-slate-900">Contabilidade</div>
            <div className="text-[11px] text-slate-500">CRC{settings.cityState ? ` · ${settings.cityState}` : ''}</div>
          </div>
        </div>

        <footer className="mt-8 pt-3 border-t border-slate-200 text-[10px] text-slate-500 flex flex-wrap justify-between gap-2">
          <span>Cálculo conforme a LC 123/2006 · Tabelas: {activeTable.name}</span>
          <span>Gerado pelo FatorSimples em {new Date().toLocaleDateString('pt-BR')}</span>
        </footer>
      </div>
    </div>
  );
};
