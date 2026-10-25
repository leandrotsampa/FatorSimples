import React, { useEffect, useState } from 'react';
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
  AlertTriangle,
} from 'lucide-react';
import { TaxSettings } from '../types/tax';
import { OFFICIAL_TAX_TABLES } from '../utils/taxTablesRegistry';
import { formatCurrency, formatPercent, ANEXO_III_TABLE, ANEXO_V_TABLE } from '../utils/taxCalculations';
import { ModalShell } from './ui/ModalShell';
import { useUiPrefs } from '../hooks/useUiPrefs';
import { playSound } from '../hooks/useSound';
import { CurrencyInput } from './CurrencyInput';
import {
  loadStoredRemoteTables,
  openReleasesPage,
  type StoredRemoteTables,
  type TablesCheckResult,
  type VersionCheckResult,
} from '../utils/remoteTables';

interface SettingsModalProps {
  onClose: () => void;
  settings: TaxSettings;
  onSave: (newSettings: TaxSettings) => void;
  // Busca real: arquivo de tabelas no GitHub e última versão publicada do app
  onCheckUpdates: () => Promise<{ tables: TablesCheckResult; version: VersionCheckResult }>;
  newVersion: string | null;
}

const formatDateBR = (iso: string) => {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('pt-BR') : iso;
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  settings,
  onSave,
  onCheckUpdates,
  newVersion,
}) => {
  const [formData, setFormData] = useState<TaxSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<'tables' | 'parameters' | 'company' | 'auto_explain' | 'interface'>('tables');
  const [uiPrefs, setUiPrefs] = useUiPrefs();
  const [syncStatus, setSyncStatus] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [stored, setStored] = useState<StoredRemoteTables>({ doc: null, checkedAt: null });
  useEffect(() => {
    loadStoredRemoteTables().then(setStored);
  }, []);
  const [latestVersion, setLatestVersion] = useState<string | null>(newVersion);


  // Verificação real: baixa o arquivo de tabelas publicado no GitHub e confere a última versão do app
  const handleSyncTables = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    const { tables, version } = await onCheckUpdates();
    setStored(await loadStoredRemoteTables());
    if (version.kind === 'newer') setLatestVersion(version.version);
    if (version.kind === 'current') setLatestVersion(null);

    if (tables.kind === 'updated') {
      // A tabela escolhida pode ter mudado: traz os valores novos para o formulário
      const fresh = OFFICIAL_TAX_TABLES[formData.taxVersionId];
      if (fresh) {
        setFormData((prev) => ({
          ...prev,
          minimumWage: fresh.minimumWage,
          inssCeiling: fresh.inssCeiling,
          simplifiedIrDeduction: fresh.simplifiedIrDeduction,
          dependentDeduction: fresh.dependentDeduction,
        }));
      }
      setSyncStatus({
        tone: 'ok',
        text: `${tables.changed} ${tables.changed === 1 ? 'tabela atualizada' : 'tabelas atualizadas'} a partir do arquivo publicado em ${formatDateBR(tables.publishedAt)}.`,
      });
    } else if (tables.kind === 'up-to-date') {
      setSyncStatus({ tone: 'ok', text: `As tabelas já estão em dia (arquivo publicado em ${formatDateBR(tables.publishedAt)}).` });
    } else if (tables.kind === 'not-published') {
      setSyncStatus({
        tone: 'warn',
        text: 'O arquivo de tabelas ainda não foi publicado no GitHub. O app segue com as tabelas embutidas.',
      });
    } else if (tables.kind === 'offline') {
      setSyncStatus({ tone: 'warn', text: 'Sem conexão com o GitHub agora. O app segue com as tabelas que já tem.' });
    } else {
      setSyncStatus({
        tone: 'warn',
        text: 'O arquivo de tabelas publicado está incompleto e foi ignorado. O app segue com as tabelas que já tem.',
      });
    }
    setIsSyncing(false);
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
    <ModalShell ariaLabel="Parâmetros fiscais e tabelas de cálculo" panelClassName="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-800 dark:text-slate-100">
        
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
            Tabelas
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
            <span>Como atualiza</span>
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
            INSS e deduções
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
            Empresa
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('interface')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'interface'
                ? 'bg-white text-emerald-700 border border-slate-300 shadow-2xs dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Interface
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
                  <span>Como as tabelas se atualizam</span>
                </div>

                <div className="space-y-2.5 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
                    <strong className="text-slate-900 dark:text-white block mb-0.5">1. A tabela de cada mês</strong>
                    Cada tabela (salário mínimo, teto do INSS, faixas do IRRF) tem um período de vigência. Ao trocar de
                    competência, o app usa a que vale naquele mês.
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
                    <strong className="text-slate-900 dark:text-white block mb-0.5">2. Atualização pelo GitHub do FatorSimples</strong>
                    Quando sai uma lei ou portaria nova, o FatorSimples publica um arquivo de tabelas no GitHub. O app
                    confere esse arquivo ao abrir (no máximo uma vez por dia) e quando você clica em "Verificar
                    atualizações". Só aplica se o arquivo estiver completo; sem internet, segue com as tabelas que já
                    tem. O app não consulta a Receita Federal diretamente: ela não oferece esse serviço.
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
                    <strong className="text-slate-900 dark:text-white block mb-0.5">3. Versão nova do app</strong>
                    Mudanças de regra, como faixas e alíquotas do Simples Nacional ou um imposto novo, exigem uma versão
                    nova. O app avisa quando houver uma e leva à página de download.
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
                      <span>Origem das tabelas</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {stored.doc
                        ? `Arquivo do GitHub do FatorSimples, publicado em ${formatDateBR(stored.doc.publishedAt)}`
                        : `Tabelas embutidas na versão ${__APP_VERSION__} do app`}
                      {' · '}
                      {stored.checkedAt ? `verificado em ${new Date(stored.checkedAt).toLocaleString('pt-BR')}` : 'ainda não verificado'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncTables}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Verificando…' : 'Verificar atualizações'}</span>
                  </button>
                </div>

                {syncStatus && (
                  <div
                    role="status"
                    className={`p-2 rounded-lg text-xs flex items-center gap-1.5 font-medium border ${
                      syncStatus.tone === 'ok'
                        ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200'
                    }`}
                  >
                    {syncStatus.tone === 'ok' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{syncStatus.text}</span>
                  </div>
                )}

                {latestVersion && (
                  <div className="p-2 rounded-lg text-xs flex items-center justify-between gap-2 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 text-sky-900 dark:text-sky-200">
                    <span>
                      A versão <b className="font-num">{latestVersion}</b> do app está disponível (você usa a {__APP_VERSION__}).
                      Mudanças de regra, como faixas do Simples, chegam por versão nova.
                    </span>
                    <button
                      type="button"
                      onClick={openReleasesPage}
                      className="shrink-0 px-3 py-1 rounded-full bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
                    >
                      Baixar
                    </button>
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
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Base legal: {activeVersion.legalBasis}
                  </span>
                </div>

                {/* Toggle de atualização automática */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80">
                  <div>
                    <div className="text-slate-800 dark:text-slate-200 font-bold text-xs">
                      Atualizar automaticamente
                    </div>
                    <div className="text-xs text-slate-500">
                      Usa a tabela vigente em cada mês e confere o GitHub ao abrir o app (no máximo uma vez por dia).
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
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-num">
                    Desconto Simplificado: {formatCurrency(formData.simplifiedIrDeduction)}
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-2xs">
                  <table className="w-full text-left font-num text-[11px]">
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
                    Valores da tabela de {activeVersion.year}
                  </strong>
                  <span>
                    O salário mínimo, o teto do INSS e o desconto simplificado vêm da tabela da competência
                    ({activeVersion.name}): {formatCurrency(activeVersion.minimumWage)} de salário mínimo e{' '}
                    {formatCurrency(activeVersion.inssCeiling)} de teto do INSS
                    {activeVersion.irrfReduction ? `, com a redução do IRRF da ${activeVersion.irrfReduction.legalBasis}` : ''}.
                    Se precisar, ajuste abaixo.
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
                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold font-num">
                      Auto ({activeVersion.year})
                    </span>
                  </div>
                  <input
                    type="number"
                    step="1"
                    value={formData.minimumWage}
                    onChange={(e) => setFormData({ ...formData, minimumWage: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white font-num text-sm focus:outline-none focus:border-emerald-500 shadow-2xs font-bold"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Piso legal obrigatório para retirada de pró-labore.
                  </span>
                </div>

                {/* Teto do INSS */}
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold">
                      Teto Máximo do INSS (R$):
                    </label>
                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold font-num">
                      Auto ({activeVersion.year})
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.inssCeiling}
                    onChange={(e) => setFormData({ ...formData, inssCeiling: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white font-num text-sm focus:outline-none focus:border-emerald-500 shadow-2xs font-bold"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Limite máximo de contribuição individual (11%).
                  </span>
                </div>

                {/* Dependentes */}
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold">
                      Número de Dependentes (IRRF):
                    </label>
                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-num">
                      R$ 189,59/dep
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={formData.dependentsCount}
                    onChange={(e) => setFormData({ ...formData, dependentsCount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white font-num text-sm focus:outline-none focus:border-emerald-500 shadow-2xs font-bold"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Dedução legal de R$ 189,59 por dependente cadastrado.
                  </span>
                </div>

                {/* Desconto Simplificado Mensal */}
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold">
                      Desconto Simplificado IRPF (R$):
                    </label>
                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold font-num">
                      Auto ({activeVersion.year})
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.10"
                    value={formData.simplifiedIrDeduction}
                    onChange={(e) => setFormData({ ...formData, simplifiedIrDeduction: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white font-num text-sm focus:outline-none focus:border-emerald-500 shadow-2xs font-bold"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
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
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white font-num text-xs focus:outline-none focus:border-emerald-500 shadow-2xs font-medium"
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

              {/* Honorários: ficam na conta junto com os impostos e saem do lucro a transferir */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                <label htmlFor="accounting-fee" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Honorários mensais da contabilidade
                </label>
                <CurrencyInput
                  id="accounting-fee"
                  value={formData.accountingFee ?? 0}
                  onChange={(v) => setFormData({ ...formData, accountingFee: v })}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  Na Apuração, esse valor fica na conta junto com os impostos e sai do lucro que você transfere.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: Interface (preferências locais, salvas na hora e fora das configurações fiscais) */}
          {activeTab === 'interface' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div id="ui-sound-label" className="text-slate-900 dark:text-slate-100 font-semibold text-sm">
                      Sons da interface
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                      Cliques, confirmação ao salvar e aviso quando o Fator R cai abaixo de 28%.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={uiPrefs.soundEnabled}
                    aria-labelledby="ui-sound-label"
                    onClick={() => setUiPrefs({ soundEnabled: !uiPrefs.soundEnabled })}
                    className={`relative shrink-0 w-10 h-6 rounded-full transition-colors cursor-pointer ${
                      uiPrefs.soundEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-[var(--duration-base)] ${
                        uiPrefs.soundEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className={uiPrefs.soundEnabled ? '' : 'opacity-50'}>
                  <label htmlFor="ui-sound-volume" className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    <span>Volume</span>
                    <span className="font-num tabular-nums">{Math.round(uiPrefs.soundVolume * 100)}%</span>
                  </label>
                  <input
                    id="ui-sound-volume"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={Math.round(uiPrefs.soundVolume * 100)}
                    disabled={!uiPrefs.soundEnabled}
                    onChange={(e) => setUiPrefs({ soundVolume: Number(e.target.value) / 100 })}
                    className="w-full accent-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                  />
                </div>

                <button
                  type="button"
                  disabled={!uiPrefs.soundEnabled}
                  onClick={() => playSound('success')}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Testar som
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Estas preferências ficam neste computador e são salvas na hora, sem precisar de "Salvar Alterações".
              </p>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full text-xs transition-colors shadow-2xs cursor-pointer"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
    </ModalShell>
  );
};
