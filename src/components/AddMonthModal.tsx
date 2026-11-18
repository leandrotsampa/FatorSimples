import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { MonthRecord, TaxSettings } from '../types/tax';
import {
  formatCurrency,
  calculateProlabore,
  calculateSimplesNacional,
  settingsForCompetence,
  shiftYearMonth,
} from '../utils/taxCalculations';
import { CurrencyInput } from './CurrencyInput';
import { HelpTip } from './ui/HelpTip';
import { HELP } from './help';
import { ModalShell } from './ui/ModalShell';
import { btnGhost, btnPrimary, inputBase, modalPanel, tile } from './ui/card';
import { currentYearMonth, isFutureMonth } from '../utils/monthPicker';
import { MonthPickerField } from './ui/MonthPickerField';

interface AddMonthModalProps {
  onClose: () => void;
  onSave: (record: MonthRecord) => void;
  recordToEdit?: MonthRecord | null;
  defaultYearMonth?: string;
  settings: TaxSettings;
  existingHistory: MonthRecord[];
}

export const AddMonthModal: React.FC<AddMonthModalProps> = ({
  onClose,
  onSave,
  recordToEdit,
  defaultYearMonth,
  settings,
  existingHistory,
}) => {
  const [yearMonth, setYearMonth] = useState<string>('');
  const [revenue, setRevenue] = useState<number>(0);
  const [payroll, setPayroll] = useState<number>(0);
  const [inss, setInss] = useState<number>(0);
  const [irrf, setIrrf] = useState<number>(0);
  const [dasPaid, setDasPaid] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const recalculateTaxes = React.useCallback((revVal: number, payVal: number, ym: string) => {
    // INSS e IRRF pelas tabelas da própria competência
    const prolabore = calculateProlabore(payVal, settingsForCompetence(settings, ym));
    setInss(prolabore.inss);
    setIrrf(prolabore.irrf);

    const simples = calculateSimplesNacional(revVal, payVal, existingHistory, ym);
    setDasPaid(simples.dasAmount);
  }, [settings, existingHistory]);

  const loadRecord = (rec: MonthRecord) => {
    setYearMonth(rec.yearMonth);
    setRevenue(rec.revenue);
    setPayroll(rec.payroll);
    setInss(rec.inss);
    setIrrf(rec.irrf);
    setDasPaid(rec.dasPaid);
    setNotes(rec.notes || '');
  };

  const savedMonths = React.useMemo(() => new Set(existingHistory.map((h) => h.yearMonth)), [existingHistory]);

  // Valores iniciais só ao abrir (editar: o registro; novo: um mês ainda fora do histórico)
  useEffect(() => {
    if (recordToEdit) {
      loadRecord(recordToEdit);
      return;
    }
    // Mês novo nunca começa num mês salvo (esses são alterados pelo Editar): a competência aberta no app,
    // senão o mês atual, senão o primeiro mês livre antes dele
    const today = currentYearMonth();
    const isFree = (ym: string) => ym <= today && !savedMonths.has(ym);
    let ym = defaultYearMonth && isFree(defaultYearMonth) ? defaultYearMonth : today;
    for (let i = 0; i < 240 && !isFree(ym); i++) ym = shiftYearMonth(ym, -1);
    setYearMonth(ym);
    setRevenue(0);
    setPayroll(0);
    setNotes('');
    recalculateTaxes(0, 0, ym);
  }, [recordToEdit, defaultYearMonth]);

  // Novo mês: a grade só deixa escolher meses livres; os impostos passam a usar as tabelas e o histórico do mês escolhido
  const handleMonthChange = (ym: string) => {
    if (savedMonths.has(ym)) return;
    setYearMonth(ym);
    recalculateTaxes(revenue, payroll, ym);
  };

  const handleRevenueChange = (val: number) => {
    setRevenue(val);
    const suggestedPayroll = Math.max(settings.minimumWage, Math.round(val * 0.28));
    setPayroll(suggestedPayroll);
    recalculateTaxes(val, suggestedPayroll, yearMonth);
  };

  const handlePayrollChange = (val: number) => {
    setPayroll(val);
    recalculateTaxes(revenue, val, yearMonth);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearMonth || isFutureMonth(yearMonth)) return;
    // Mês novo não sobrescreve um mês salvo
    if (!recordToEdit && savedMonths.has(yearMonth)) return;

    const newRecord: MonthRecord = {
      id: recordToEdit?.id ?? `month-${yearMonth}-${Date.now()}`,
      yearMonth,
      revenue,
      payroll,
      inss,
      irrf,
      dasPaid,
      notes: notes || undefined,
    };

    onSave(newRecord);
    onClose();
  };

  return (
    <ModalShell ariaLabel={recordToEdit ? 'Editar competência no histórico' : 'Adicionar nova competência'} panelClassName={`${modalPanel} max-w-lg w-full overflow-hidden text-sm`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-2">
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.015em] text-slate-900 dark:text-white">
              {recordToEdit ? 'Editar mês' : 'Novo mês no Histórico'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">Faturamento e pró-labore de um mês já fechado.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 pt-4 pb-6 space-y-5">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label htmlFor="add-month-ym" className="text-sm font-semibold text-slate-800 dark:text-slate-100">Competência</label>
              <HelpTip help={HELP.competence} />
            </div>
            <MonthPickerField
              id="add-month-ym"
              value={yearMonth}
              savedMonths={savedMonths}
              onChange={handleMonthChange}
              readOnly={Boolean(recordToEdit)}
              blockSaved
            />
            {recordToEdit && (
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                A competência não muda na edição. Para lançar estes valores em outro mês, exclua este registro e adicione o mês certo.
              </p>
            )}
            {isFutureMonth(yearMonth) && (
              <p role="alert" className="mt-1.5 text-xs text-rose-700 dark:text-rose-300">
                Este mês ainda não chegou. Escolha o mês atual ou um anterior.
              </p>
            )}
            {!recordToEdit && (
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Os meses que já estão no histórico ficam bloqueados. Para alterar um deles, use Editar na lista.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                Faturamento <HelpTip help={HELP.revenue} />
              </div>
              <CurrencyInput ariaLabel="Receita bruta" required value={revenue} onChange={handleRevenueChange} />
            </div>

            <div>
              <div className="flex items-center justify-between gap-1.5 mb-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <span className="flex items-center gap-1.5">Pró-labore <HelpTip help={HELP.payroll} /></span>
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-num">
                  {revenue > 0 ? `${((payroll / revenue) * 100).toFixed(1).replace('.', ',')}% da receita` : ''}
                </span>
              </div>
              <CurrencyInput ariaLabel="Folha / pró-labore" required value={payroll} onChange={handlePayrollChange} />
            </div>
          </div>

          {/* Quick Auto-calc banner */}
          <div className={`${tile} p-4`}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Impostos do mês, calculados
                <HelpTip help={HELP.monthTaxes} />
              </span>
              <button
                type="button"
                onClick={() => recalculateTaxes(revenue, payroll, yearMonth)}
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 cursor-pointer"
              >
                Recalcular
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3 font-num tabular-nums">
              {[
                { label: 'INSS (11%)', value: inss },
                { label: 'IRRF', value: irrf },
                { label: 'DAS', value: dasPaid },
              ].map((t) => (
                <div key={t.label}>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-sans">{t.label}</div>
                  <div className="text-[15px] font-semibold text-slate-900 dark:text-white">{formatCurrency(t.value)}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="add-month-notes" className="flex items-center gap-1.5 mb-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
              Anotações <span className="text-xs font-normal text-slate-500 dark:text-slate-400">opcional</span>
            </label>
            <input
              id="add-month-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: mês com faturamento extra de projeto"
              className={inputBase}
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-900/[0.06] dark:border-white/[0.06] flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className={btnGhost}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!yearMonth || isFutureMonth(yearMonth) || revenue <= 0}
              title={revenue <= 0 ? 'Informe o faturamento do mês' : undefined}
              className={btnPrimary}
            >
              {recordToEdit ? 'Salvar alterações' : 'Adicionar ao Histórico'}
            </button>
          </div>
        </form>
    </ModalShell>
  );
};
