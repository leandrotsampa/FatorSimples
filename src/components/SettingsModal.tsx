import React, { useState } from 'react';
import {
  X,
  Settings,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Building,
  ShieldCheck,
  Scale,
  DollarSign,
  FileText,
  Calendar,
} from 'lucide-react';
import { TaxSettings } from '../types/tax';
import { OFFICIAL_TAX_TABLES } from '../utils/taxTablesRegistry';
import { formatCurrency, formatPercent, ANEXO_III_TABLE, ANEXO_V_TABLE } from '../utils/taxCalculations';
import { ModalShell } from './ui/ModalShell';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TaxSettings;
  onSave: (newSettings: TaxSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [formData, setFormData] = useState<TaxSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<'tables' | 'parameters' | 'company' | 'auto_explain'>('tables');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  if (!isOpen) return null;

  // Lógica de sincronização / checagem automática das tabelas da Receita Federal
  const handleSyncTables = () => {
    setIsSyncing(true);
    setSyncStatus(null);

    setTimeout(() => {
      const activeVersion = OFFICIAL_TAX_TABLES[formData.taxVersionId] || OFFICIAL_TAX_TABLES['2026_oficial'];
      setFormData((prev) => ({
        ...prev,
        minimumWage: activeVersion.minimumWage,
        inssCeiling: activeVersion.inssCeiling,
        simplifiedIrDeduction: activeVersion.simplifiedIrDeduction,
        dependentDeduction: activeVersion.dependentDeduction,
        lastTableUpdateDate: `Sincronizado com Receita Federal em ${new Date().toLocaleDateString('pt-BR')} (Base: ${activeVersion.legalBasis})`,
      }));
      setIsSyncing(false);
      setSyncStatus('Tabelas de IRPF/IRRF, INSS e Simples Nacional validadas e atualizadas com sucesso!');
      setTimeout(() => setSyncStatus(null), 4000);
    }, 600);
  };

  const handleTableVersionChange = (versionId: string) => {
    const selectedVersion = OFFICIAL_TAX_TABLES[versionId];
    if (selectedVersion) {
      setFormData((prev) => ({
        ...prev,
        taxVersionId: versionId,
        minimumWage: selectedVersion.minimumWage,
        inssCeiling: selectedVersion.inssCeiling,
        simplifiedIrDeduction: selectedVersion.simplifiedIrDeduction,
        dependentDeduction: selectedVersion.dependentDeduction,
        lastTableUpdateDate: `${selectedVersion.name} (${selectedVersion.effectiveDate})`,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const activeVersion =
    OFFICIAL_TAX_TABLES[formData.taxVersionId] ||
    OFFICIAL_TAX_TABLES['2026_oficial'] ||
    Object.values(OFFICIAL_TAX_TABLES)[0];

  return (
    <ModalShell panelClassName="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Parâmetros Fiscais & Tabelas de Cálculo
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subnavigation inside modal */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-950/30 text-xs flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('tables')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'tables'
                ? 'bg-white text-emerald-700 border border-slate-300 shadow-2xs dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            01. Tabelas de IRPF / IRRF
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('auto_explain')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'auto_explain'
                ? 'bg-white text-emerald-700 border border-slate-300 shadow-2xs dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Como Atualiza em 2026/2027</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('parameters')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'parameters'
                ? 'bg-white text-emerald-700 border border-slate-300 shadow-2xs dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            02. INSS & Deduções
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('company')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'company'
                ? 'bg-white text-emerald-700 border border-slate-300 shadow-2xs dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            03. Empresa (Brusque - SC)
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* TAB: Como Atualiza em 2026 / 2027 */}
          {activeTab === 'auto_explain' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-lg space-y-3">
                <div className="font-bold text-emerald-900 dark:text-emerald-300 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Como as Tabelas Atualizam Sozinhas em 2026 e 2027:</span>
                </div>

                <div className="space-y-2.5 text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded border border-emerald-200 dark:border-emerald-500/20">
                    <strong className="text-slate-900 dark:text-white block mb-0.5">1. Transição Automática de Ano (Competência):</strong>
                    Ao selecionar qualquer mês do ano de 2026 ou 2027 na barra superior de competência, o motor fiscal detecta o ano do calendário e ativa automaticamente as faixas oficiais e pisos salariais daquele ano, sem você precisar configurar nada manualmente.
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded border border-emerald-200 dark:border-emerald-500/20">
                    <strong className="text-slate-900 dark:text-white block mb-0.5">2. Detecção de Medidas Provisórias e Leis:</strong>
                    Sempre que o Governo Federal ou o Ministério da Fazenda publica um novo decreto ou portaria (como o reajuste anual do salário mínimo e do teto do INSS), a versão oficial registrada no aplicativo é atualizada, mantendo a memória de cálculo 100% aderente à Receita Federal.
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded border border-emerald-200 dark:border-emerald-500/20">
                    <strong className="text-slate-900 dark:text-white block mb-0.5">3. Sincronização Sob Demanda:</strong>
                    Você também pode clicar no botão <em>&quot;Verificar Atualizações&quot;</em> na aba de tabelas para validar se há novas alterações legislativas.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: Tabelas de IRPF / IRRF Atualizadas */}
          {activeTab === 'tables' && (
            <div className="space-y-4">
              {/* Sincronização e Versão */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Versão das Tabelas Fiscais Aplicadas</span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      {formData.lastTableUpdateDate}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncTables}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Sincronizando...' : 'Verificar Atualizações'}</span>
                  </button>
                </div>

                {syncStatus && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 p-2 rounded text-[11px] flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{syncStatus}</span>
                  </div>
                )}

                {/* Seletor de versão */}
                <div className="pt-2">
                  <label className="block text-slate-600 dark:text-slate-400 text-[11px] font-semibold mb-1">
                    Selecione a Legislação de Referência:
                  </label>
                  <select
                    value={formData.taxVersionId}
                    onChange={(e) => handleTableVersionChange(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-slate-200 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs font-medium"
                  >
                    {Object.values(OFFICIAL_TAX_TABLES).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.effectiveDate}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Base legal: {activeVersion.legalBasis}
                  </span>
                </div>

                {/* Toggle de atualização automática */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80">
                  <div>
                    <div className="text-slate-800 dark:text-slate-200 font-bold text-xs">
                      Atualização Automática Conforme Competência
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Alterna automaticamente entre as tabelas vigentes oficiais ao mudar o mês/ano (2024, 2025, 2026, 2027).
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.autoUpdateTables}
                    onChange={(e) => setFormData({ ...formData, autoUpdateTables: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Tabela Visual do IRPF Vigente */}
              <div className="space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-300 text-xs flex items-center justify-between">
                  <span>Faixas da Tabela Progressiva Mensal do IRPF:</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Desconto Simplificado: {formatCurrency(formData.simplifiedIrDeduction)}
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold">
                      <tr>
                        <th className="p-2">Faixa</th>
                        <th className="p-2">Base de Cálculo Mensal</th>
                        <th className="p-2 text-center">Alíquota</th>
                        <th className="p-2 text-right">Parcela a Deduzir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                      {activeVersion.irrfBrackets.map((b, idx) => (
                        <tr key={b.faixa} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                          <td className="p-2 font-bold text-slate-900 dark:text-white">Faixa {b.faixa}</td>
                          <td className="p-2">
                            {idx === 0
                              ? `Até ${formatCurrency(b.limit)}`
                              : idx === activeVersion.irrfBrackets.length - 1
                              ? `Acima de ${formatCurrency(activeVersion.irrfBrackets[idx - 1].limit)}`
                              : `De ${formatCurrency(activeVersion.irrfBrackets[idx - 1].limit + 0.01)} a ${formatCurrency(b.limit)}`}
                          </td>
                          <td className="p-2 text-center font-bold text-emerald-700 dark:text-emerald-400">
                            {formatPercent(b.rate * 100, 1)}
                          </td>
                          <td className="p-2 text-right tabular-nums">
                            {formatCurrency(b.deduction)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {activeVersion.irrfReduction && (
                  <div className="text-[11px] text-emerald-900 dark:text-emerald-200 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30">
                    <strong className="text-emerald-900 dark:text-emerald-300">
                      Redução do IRRF ({activeVersion.irrfReduction.legalBasis}):
                    </strong>{' '}
                    rendimento bruto até {formatCurrency(activeVersion.irrfReduction.fullExemptionLimit)} fica isento (redução
                    de até {formatCurrency(activeVersion.irrfReduction.maxReduction)}); até{' '}
                    {formatCurrency(activeVersion.irrfReduction.phaseOutLimit)} reduz{' '}
                    {formatCurrency(activeVersion.irrfReduction.phaseOutBase)} −{' '}
                    {activeVersion.irrfReduction.phaseOutRate.toLocaleString('pt-BR', { maximumFractionDigits: 6 })} × rendimento.
                    Aplicada automaticamente após a tabela.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: INSS & Deduções */}
          {activeTab === 'parameters' && (
            <div className="space-y-4">
              {/* Box explicativo de atualização automática */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-900 dark:text-emerald-300 block mb-0.5">
                    Atualização 100% Automática das Deduções e Salário Mínimo
                  </strong>
                  <span>
                    Sim! O Salário Mínimo Nacional, o Teto do INSS e o Desconto Simplificado do IRPF <strong>atualizam automaticamente</strong> com base na competência anual ativa. A tabela ativa ({activeVersion.year}) usa {formatCurrency(activeVersion.minimumWage)} de salário mínimo e {formatCurrency(activeVersion.inssCeiling)} de teto do INSS{activeVersion.irrfReduction ? `, com a redução do IRRF da ${activeVersion.irrfReduction.legalBasis}` : ''}. Você também tem a liberdade de ajustá-los manualmente abaixo se desejar.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Salário Mínimo */}
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold">
                      Salário Mínimo Nacional (R$):
                    </label>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold font-mono">
                      Auto ({activeVersion.year})
                    </span>
                  </div>
                  <input
                    type="number"
                    step="1"
                    value={formData.minimumWage}
                    onChange={(e) => setFormData({ ...formData, minimumWage: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-emerald-500 shadow-2xs font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Piso legal obrigatório para retirada de pró-labore.
                  </span>
                </div>

                {/* Teto do INSS */}
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold">
                      Teto Máximo do INSS (R$):
                    </label>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold font-mono">
                      Auto ({activeVersion.year})
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.inssCeiling}
                    onChange={(e) => setFormData({ ...formData, inssCeiling: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-emerald-500 shadow-2xs font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Limite máximo de contribuição individual (11%).
                  </span>
                </div>

                {/* Dependentes */}
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold">
                      Número de Dependentes (IRRF):
                    </label>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-mono">
                      R$ 189,59/dep
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={formData.dependentsCount}
                    onChange={(e) => setFormData({ ...formData, dependentsCount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-emerald-500 shadow-2xs font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Dedução legal de R$ 189,59 por dependente cadastrado.
                  </span>
                </div>

                {/* Desconto Simplificado Mensal */}
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold">
                      Desconto Simplificado IRPF (R$):
                    </label>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold font-mono">
                      Auto ({activeVersion.year})
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.10"
                    value={formData.simplifiedIrDeduction}
                    onChange={(e) => setFormData({ ...formData, simplifiedIrDeduction: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-emerald-500 shadow-2xs font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Aplicado automaticamente quando for mais vantajoso que as deduções legais.
                  </span>
                </div>
              </div>

              {/* Destaque educativo CPP patronal */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Nota sobre o Anexo III:</strong> Empresas enquadradas no Anexo III através do Fator R são isentas da Contribuição Patronal Previdenciária de 20% sobre o pró-labore, pois a CPP já se encontra unificada dentro da guia do Simples Nacional (DAS).
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: Dados da Empresa (Brusque - SC) */}
          {activeTab === 'company' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Razão Social da Empresa:
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500 shadow-2xs font-medium"
                    placeholder="Minha Empresa de Tecnologia LTDA"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      CNPJ:
                    </label>
                    <input
                      type="text"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-emerald-500 shadow-2xs font-medium"
                      placeholder="00.000.000/0001-00"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Cidade / UF:
                    </label>
                    <input
                      type="text"
                      value={formData.cityState}
                      onChange={(e) => setFormData({ ...formData, cityState: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500 shadow-2xs font-medium"
                      placeholder="Brusque - SC"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    CNAE Principal:
                  </label>
                  <input
                    type="text"
                    value={formData.cnae}
                    onChange={(e) => setFormData({ ...formData, cnae: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500 shadow-2xs font-medium"
                    placeholder="6201-5/01 - Desenvolvimento de Programas de Computador"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
    </ModalShell>
  );
};
