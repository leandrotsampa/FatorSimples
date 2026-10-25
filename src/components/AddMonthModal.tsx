import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Calculator, Sparkles } from 'lucide-react';
import { MonthRecord, TaxSettings } from '../types/tax';
import {
  formatCurrency,
  calculateProlabore,
  calculateSimplesNacional,
  settingsForCompetence,
} from '../utils/taxCalculations';
import { CurrencyInput } from './CurrencyInput';
import { ModalShell } from './ui/ModalShell';

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
  const [revenue, setRevenue] = useState<number>(20000);
  const [payroll, setPayroll] = useState<number>(5600);
  const [inss, setInss] = useState<number>(616);
  const [irrf, setIrrf] = useState<number>(0);
  const [dasPaid, setDasPaid] = useState<number>(1200);
  const [notes, setNotes] = useState<string>('');

  const recalculateTaxes = React.useCallback((revVal: number, payVal: number, ym: string) => {
    // INSS e IRRF pelas tabelas da própria competência
    const prolabore = calculateProlabore(payVal, settingsForCompetence(settings, ym));
    setInss(prolabore.inss);
    setIrrf(prolabore.irrf);

    const simples = calculateSimplesNacional(revVal, payVal, existingHistory, ym);
    setDasPaid(simples.dasAmount);
  }, [settings, existingHistory]);

  useEffect(() => {
    if (recordToEdit) {
      setYearMonth(recordToEdit.yearMonth);
      setRevenue(recordToEdit.revenue);
      setPayroll(recordToEdit.payroll);
      setInss(recordToEdit.inss);
      setIrrf(recordToEdit.irrf);
      setDasPaid(recordToEdit.dasPaid);
      setNotes(recordToEdit.notes || '');
    } else {
      // Padrão: competência selecionada no app (ou o mês anterior)
      const now = new Date();
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const defaultYm =
        defaultYearMonth || `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
      setYearMonth(defaultYm);
      setRevenue(20000);
      setPayroll(5600); // 28% of 20000
      recalculateTaxes(20000, 5600, defaultYm);
      setNotes('');
    }
  }, [recordToEdit, recalculateTaxes, defaultYearMonth]);


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
    if (!yearMonth) return;

    const newRecord: MonthRecord = {
      id: recordToEdit ? recordToEdit.id : `month-${yearMonth}-${Date.now()}`,
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
    <ModalShell ariaLabel={recordToEdit ? 'Editar competência no histórico' : 'Adicionar nova competência'} panelClassName="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden text-xs text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              {recordToEdit ? 'Editar Competência no Histórico' : 'Adicionar Nova Competência'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Competência (Mês / Ano):
            </label>
            <input
              type="month"
              required
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white font-num focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center justify-between">
                <span>Receita Bruta (R$):</span>
              </label>
              <CurrencyInput ariaLabel="Receita bruta" required value={revenue} onChange={handleRevenueChange} />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center justify-between">
                <span>Folha / Pró-labore:</span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-num font-bold">
                  {revenue > 0 ? `${((payroll / revenue) * 100).toFixed(1)}%` : ''}
                </span>
              </label>
              <CurrencyInput ariaLabel="Folha / pró-labore" required value={payroll} onChange={handlePayrollChange} />
            </div>
          </div>

          {/* Quick Auto-calc banner */}
          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 pb-1 border-b border-slate-200 dark:border-slate-800">
              <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Impostos Calculados Automaticamente:
              </span>
              <button
                type="button"
                onClick={() => recalculateTaxes(revenue, payroll, yearMonth)}
                className="text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer font-bold"
              >
                Recalcular
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] font-num">
              <div>
                <span className="text-slate-500 block">INSS (11%):</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{formatCurrency(inss)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">IRRF Retido:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">{formatCurrency(irrf)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Guia DAS:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">{formatCurrency(dasPaid)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Observações (Opcional):
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Mês com faturamento extra de projeto..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-800 dark:text-slate-300 text-xs focus:outline-none focus:border-emerald-500 shadow-2xs"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full transition-colors shadow-2xs cursor-pointer"
            >
              {recordToEdit ? 'Salvar Modificações' : 'Adicionar ao Histórico'}
            </button>
          </div>
        </form>
    </ModalShell>
  );
};
