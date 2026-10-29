import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  HandCoins,
  Minus,
  Moon,
  Palette,
  Plus,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sun,
  Volume2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { TaxSettings } from '../types/tax';
import { OFFICIAL_TAX_TABLES } from '../utils/taxTablesRegistry';
import { formatCurrency, formatPercent } from '../utils/taxCalculations';
import { ModalShell } from './ui/ModalShell';
import { useUiPrefs } from '../hooks/useUiPrefs';
import { playSound } from '../hooks/useSound';
import { CurrencyInput } from './CurrencyInput';
import { HelpTip, type HelpContent } from './ui/HelpTip';
import { HELP } from './help';
import { btnGhost, btnPrimary, chip, inputBase, modalPanel, tile } from './ui/card';
import { EASE_OUT } from '../utils/motion';
import {
  loadStoredRemoteTables,
  openReleasesPage,
  type StoredRemoteTables,
  type TablesCheckResult,
  type VersionCheckResult,
} from '../utils/remoteTables';

export type SettingsTab = 'company' | 'prolabore' | 'tables' | 'interface';

interface SettingsModalProps {
  onClose: () => void;
  initialTab?: SettingsTab;
  settings: TaxSettings;
  onSave: (newSettings: TaxSettings) => void;
  // Busca real: arquivo de tabelas no GitHub e última versão publicada do app
  onCheckUpdates: () => Promise<{ tables: TablesCheckResult; version: VersionCheckResult }>;
  newVersion: string | null;
  theme: 'dark' | 'light';
  toggleTheme: (origin?: HTMLElement | null) => void;
}

const formatDateBR = (iso: string) => {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('pt-BR') : iso;
};

// Seções na ordem de quem usa: primeiro a empresa e o pró-labore, depois as regras do cálculo
const SECTIONS: { id: SettingsTab; title: string; hint: string; icon: LucideIcon; tour?: string }[] = [
  { id: 'company', title: 'Empresa', hint: 'Nome, CNPJ e contabilidade', icon: Building2, tour: 'cfg-empresa' },
  { id: 'prolabore', title: 'Pró-labore', hint: 'Regra e dependentes', icon: HandCoins, tour: 'cfg-prolabore' },
  { id: 'tables', title: 'Tabelas fiscais', hint: 'Mínimo, INSS e IRRF', icon: Scale, tour: 'cfg-tabelas' },
  { id: 'interface', title: 'Aparência e sons', hint: 'Tema e sons', icon: Palette, tour: 'cfg-interface' },
];

const RULES: { rule: TaxSettings['prolaboreRule']; label: string; text: string; tag?: string }[] = [
  {
    rule: 'auto_28_month',
    label: '28% do faturamento do mês',
    text: 'O jeito mais simples: o pró-labore é 28% do que a empresa faturou no mês, e o Fator R fica sempre em 28% ou mais.',
    tag: 'Recomendado',
  },
  {
    rule: 'exact_rbt12',
    label: 'Sem folga',
    text: 'O menor pró-labore que ainda mantém o Fator R em 28%, compensando os 11 meses anteriores. Paga menos INSS e IRRF, mas precisa do Histórico completo.',
  },
  { rule: 'manual', label: 'Valor fixo', text: 'Você define um valor e o app avisa quando ele deixa o Fator R abaixo de 28%.' },
];

const DEPENDENT_HELP: HelpContent = {
  title: 'Dependentes no IRRF',
  body: 'Filhos, cônjuge ou outras pessoas que você declara como dependentes no Imposto de Renda. Cada um reduz a base do IRRF retido no pró-labore.',
  where: 'Na sua declaração do Imposto de Renda, em "Dependentes". Combine com a contabilidade, que informa o mesmo número na DCTFWeb.',
};

const TABLE_HELP: HelpContent = {
  title: 'Tabela fiscal',
  body: 'O salário mínimo, o teto do INSS e as faixas do IRRF mudam por lei, em geral uma vez por ano. Com a atualização automática, o app usa em cada mês a tabela que valia naquele mês.',
};

// Rótulo + ajuda + campo
const Field: React.FC<{
  label: string;
  htmlFor?: string;
  help?: HelpContent;
  hint?: React.ReactNode;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ label, htmlFor, help, hint, optional, className = '', children }) => (
  <div className={className}>
    <div className="flex items-center gap-1.5 mb-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {label}
      </label>
      {optional && <span className="text-xs text-slate-500 dark:text-slate-400">opcional</span>}
      {help && <HelpTip help={help} />}
    </div>
    {children}
    {hint && <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-snug">{hint}</div>}
  </div>
);

// Interruptor liga/desliga
const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; labelledBy: string; disabled?: boolean }> = ({
  checked,
  onChange,
  labelledBy,
  disabled,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-labelledby={labelledBy}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative shrink-0 w-11 h-6 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
      checked ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
    }`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-[var(--duration-base)] ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

// Bloco de uma seção: título pequeno e conteúdo
const Group: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <section className={className}>
    {title && <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-3">{title}</h3>}
    {children}
  </section>
);

// Aviso dentro da seção (sincronização, versão nova)
const Notice: React.FC<{ tone: 'ok' | 'warn' | 'info'; children: React.ReactNode; action?: React.ReactNode }> = ({ tone, children, action }) => (
  <div
    role="status"
    className={`flex flex-wrap items-center gap-x-3 gap-y-2 p-3 rounded-xl text-sm ${
      tone === 'ok'
        ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100'
        : tone === 'warn'
          ? 'bg-amber-50 text-amber-950 dark:bg-amber-400/10 dark:text-amber-100'
          : 'bg-sky-50 text-sky-950 dark:bg-sky-400/10 dark:text-sky-100'
    }`}
  >
    {tone === 'ok' ? (
      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
    ) : (
      <AlertTriangle className={`w-4 h-4 shrink-0 ${tone === 'warn' ? 'text-amber-600 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400'}`} />
    )}
    <span className="flex-1 min-w-[12rem]">{children}</span>
    {action}
  </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  initialTab = 'company',
  settings,
  onSave,
  onCheckUpdates,
  newVersion,
  theme,
  toggleTheme,
}) => {
  const reduce = Boolean(useReducedMotion());
  const [formData, setFormData] = useState<TaxSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [uiPrefs, setUiPrefs] = useUiPrefs();
  const [syncStatus, setSyncStatus] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [stored, setStored] = useState<StoredRemoteTables>({ doc: null, checkedAt: null });
  const [manualValues, setManualValues] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    loadStoredRemoteTables().then(setStored);
  }, []);
  const [latestVersion, setLatestVersion] = useState<string | null>(newVersion);
  const set = (patch: Partial<TaxSettings>) => setFormData((prev) => ({ ...prev, ...patch }));

  const goTo = (tab: SettingsTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    bodyRef.current?.scrollTo({ top: 0 });
    playSound('tick');
  };

  // Verificação real: baixa o arquivo de tabelas publicado no GitHub e confere a última versão do app
  const handleSyncTables = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      await runSync();
    } catch {
      setSyncStatus({ tone: 'warn', text: 'Não foi possível verificar agora. O app segue com as tabelas que já tem.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const runSync = async () => {
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
  const section = SECTIONS.find((s) => s.id === activeTab) ?? SECTIONS[0];

  return (
    <ModalShell ariaLabel="Configurações" panelClassName={`${modalPanel} w-full max-w-4xl h-[min(44rem,calc(100vh-3rem))] flex overflow-hidden`}>
      {/* Menu das seções */}
      <nav
        aria-label="Seções das configurações"
        className="hidden sm:flex w-60 shrink-0 flex-col gap-1 p-4 bg-slate-50/80 dark:bg-slate-950/50 border-r border-slate-900/[0.06] dark:border-white/[0.05]"
      >
        <div className="px-2 pt-1 pb-4">
          <h2 className="text-xl font-bold tracking-[-0.01em] text-slate-900 dark:text-white">Configurações</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Mudanças valem ao salvar</p>
        </div>
        {SECTIONS.map((s) => {
          const active = s.id === activeTab;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(s.id)}
              data-tour={s.tour}
              aria-current={active ? 'page' : undefined}
              className={`relative w-full flex items-center gap-3 px-2.5 py-2.5 rounded-2xl text-left transition-colors cursor-pointer ${
                active ? 'text-slate-900 dark:text-white' : 'text-slate-600 hover:bg-slate-900/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.04]'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="settings-nav-active"
                  className="absolute inset-0 rounded-2xl bg-white shadow-[0_1px_2px_rgba(16,40,28,0.06),0_8px_20px_-12px_rgba(16,60,40,0.3)] ring-1 ring-slate-900/[0.05] dark:bg-slate-800 dark:ring-white/[0.06] dark:shadow-none"
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span
                className={`relative w-9 h-9 shrink-0 rounded-xl flex items-center justify-center transition-colors ${
                  active
                    ? 'bg-emerald-600 text-white shadow-[0_6px_14px_-8px_rgba(5,150,105,0.9)]'
                    : 'bg-white text-slate-500 ring-1 ring-slate-900/[0.06] dark:bg-slate-900 dark:text-slate-400 dark:ring-white/[0.06]'
                }`}
              >
                <s.icon className="w-[18px] h-[18px]" />
              </span>
              <span className="relative min-w-0">
                <span className="block text-sm font-semibold">{s.title}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">{s.hint}</span>
              </span>
            </button>
          );
        })}
        <div className="mt-auto px-2 text-[11px] text-slate-500 dark:text-slate-500 font-num">FatorSimples {__APP_VERSION__}</div>
      </nav>

      <form onSubmit={handleSubmit} className="flex-1 min-w-0 flex flex-col">
        {/* Título da seção */}
        <div className="flex items-start justify-between gap-4 px-6 sm:px-8 pt-6 pb-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-[-0.015em] text-slate-900 dark:text-white">{section.title}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{section.hint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar configurações"
            title="Fechar"
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Seções em abas no celular (o menu lateral some em telas estreitas) */}
        <div className="sm:hidden flex gap-1.5 px-6 pb-3 overflow-x-auto">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" onClick={() => goTo(s.id)} className={`${chip(s.id === activeTab)} shrink-0 h-8 px-3 text-xs`}>
              {s.title}
            </button>
          ))}
        </div>

        <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 sm:px-8 pb-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="space-y-8 pt-1"
            >
              {activeTab === 'company' && (
                <>
                  <div className="grid sm:grid-cols-2 gap-x-4 gap-y-5">
                    <Field label="Razão social" htmlFor="cfg-name" help={HELP.companyName} className="sm:col-span-2">
                      <input
                        id="cfg-name"
                        value={formData.companyName}
                        onChange={(e) => set({ companyName: e.target.value })}
                        className={inputBase}
                        placeholder="Ex.: Minha Empresa de Tecnologia LTDA"
                      />
                    </Field>
                    <Field label="CNPJ" htmlFor="cfg-cnpj" help={HELP.cnpj}>
                      <input
                        id="cfg-cnpj"
                        value={formData.cnpj}
                        onChange={(e) => set({ cnpj: e.target.value })}
                        className={`${inputBase} font-num`}
                        placeholder="00.000.000/0001-00"
                      />
                    </Field>
                    <Field label="Cidade / UF" htmlFor="cfg-city" help={HELP.cityState}>
                      <input
                        id="cfg-city"
                        value={formData.cityState}
                        onChange={(e) => set({ cityState: e.target.value })}
                        className={inputBase}
                        placeholder="Ex.: Brusque - SC"
                      />
                    </Field>
                    <Field
                      label="CNAE principal"
                      htmlFor="cfg-cnae"
                      help={HELP.cnae}
                      className="sm:col-span-2"
                      hint="A atividade define o anexo do Simples. Software, consultoria e engenharia vão para o Anexo III, mais barato, com o Fator R em 28%."
                    >
                      <input id="cfg-cnae" value={formData.cnae} onChange={(e) => set({ cnae: e.target.value })} className={inputBase} />
                    </Field>
                  </div>

                  <Group title="Contabilidade">
                    <Field
                      label="Honorários mensais"
                      htmlFor="accounting-fee"
                      help={HELP.accountingFee}
                      optional
                      hint="Na tela do mês, esse valor fica na conta da empresa junto com os impostos e sai do lucro que você transfere."
                    >
                      <CurrencyInput
                        id="accounting-fee"
                        value={formData.accountingFee ?? 0}
                        onChange={(v) => set({ accountingFee: v })}
                        className="sm:max-w-xs"
                      />
                    </Field>
                  </Group>
                </>
              )}

              {activeTab === 'prolabore' && (
                <>
                  <Group title="Como o mês começa">
                    <p className="text-sm text-slate-600 dark:text-slate-400 -mt-1.5 mb-3">
                      A regra que a tela do mês usa ao abrir uma competência nova. Dá para trocar em cada mês.
                    </p>
                    <div role="radiogroup" aria-label="Regra do pró-labore" className="space-y-2.5">
                      {RULES.map((r) => {
                        const active = formData.prolaboreRule === r.rule;
                        return (
                          <button
                            key={r.rule}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => set({ prolaboreRule: r.rule })}
                            className={`w-full text-left flex gap-3 p-4 rounded-2xl ring-1 ring-inset transition-colors cursor-pointer ${
                              active
                                ? 'bg-emerald-50 ring-emerald-500 dark:bg-emerald-500/10 dark:ring-emerald-400/50'
                                : 'bg-white ring-slate-200 hover:ring-emerald-300 dark:bg-slate-950/40 dark:ring-white/[0.07] dark:hover:ring-emerald-400/40'
                            }`}
                          >
                            <span
                              className={`mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center ring-2 transition-colors ${
                                active ? 'bg-emerald-600 ring-emerald-600 text-white' : 'ring-slate-300 dark:ring-slate-600'
                              }`}
                            >
                              {active && <Check className="w-3 h-3" strokeWidth={3} />}
                            </span>
                            <span>
                              <span className="flex flex-wrap items-center gap-2 font-semibold text-slate-900 dark:text-white">
                                {r.label}
                                {r.tag && <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-semibold">{r.tag}</span>}
                              </span>
                              <span className="block mt-0.5 text-sm text-slate-600 dark:text-slate-400 leading-snug">{r.text}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <AnimatePresence initial={false}>
                      {formData.prolaboreRule === 'manual' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: EASE_OUT }}
                          className="overflow-hidden"
                        >
                          <Field label="Valor do pró-labore" htmlFor="cfg-manual" help={HELP.prolabore} className="pt-4">
                            <CurrencyInput
                              id="cfg-manual"
                              value={formData.manualProlaboreAmount}
                              onChange={(v) => set({ manualProlaboreAmount: v })}
                              className="sm:max-w-xs"
                            />
                          </Field>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Group>

                  <Group title="Imposto de Renda">
                    <Field
                      label="Dependentes"
                      help={DEPENDENT_HELP}
                      hint={`Cada dependente reduz a base do IRRF em ${formatCurrency(formData.dependentDeduction)}.`}
                    >
                      <div className="inline-flex items-center gap-1 p-1 rounded-full bg-slate-100 dark:bg-slate-950 ring-1 ring-inset ring-slate-900/[0.05] dark:ring-white/[0.06]">
                        <button
                          type="button"
                          aria-label="Menos um dependente"
                          disabled={formData.dependentsCount <= 0}
                          onClick={() => set({ dependentsCount: Math.max(0, formData.dependentsCount - 1) })}
                          className="w-9 h-9 rounded-full flex items-center justify-center bg-white text-slate-700 shadow-sm hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center text-lg font-semibold font-num tabular-nums text-slate-900 dark:text-white" aria-live="polite">
                          {formData.dependentsCount}
                        </span>
                        <button
                          type="button"
                          aria-label="Mais um dependente"
                          disabled={formData.dependentsCount >= 15}
                          onClick={() => set({ dependentsCount: Math.min(15, formData.dependentsCount + 1) })}
                          className="w-9 h-9 rounded-full flex items-center justify-center bg-white text-slate-700 shadow-sm hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </Field>
                  </Group>

                  <div className={`${tile} flex gap-3 p-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed`}>
                    <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      <b className="text-slate-900 dark:text-white">Sem INSS patronal à parte.</b> No Simples, os 20% de contribuição da
                      empresa sobre o pró-labore já estão dentro do DAS. Do pró-labore saem só o INSS de 11% e o IRRF.
                    </span>
                  </div>
                </>
              )}

              {activeTab === 'tables' && (
                <>
                  <div className={`${tile} p-5 space-y-4`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div id="cfg-auto-label" className="font-semibold text-slate-900 dark:text-white">
                          Atualizar sozinho
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 max-w-md">
                          Usa em cada mês a tabela que valia naquele mês e procura tabelas novas ao abrir o app, no máximo uma vez por dia.
                        </p>
                      </div>
                      <Switch checked={formData.autoUpdateTables} onChange={(v) => set({ autoUpdateTables: v })} labelledBy="cfg-auto-label" />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-900/[0.06] dark:border-white/[0.06]">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {stored.doc
                          ? `Tabelas do GitHub do FatorSimples, publicadas em ${formatDateBR(stored.doc.publishedAt)}`
                          : `Tabelas que vieram com a versão ${__APP_VERSION__}`}
                        <span className="block text-xs text-slate-500 dark:text-slate-500">
                          {stored.checkedAt ? `Verificado em ${new Date(stored.checkedAt).toLocaleString('pt-BR')}` : 'Ainda não verificado'}
                        </span>
                      </div>
                      <button type="button" onClick={handleSyncTables} disabled={isSyncing} className={btnGhost}>
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Verificando…' : 'Verificar agora'}
                      </button>
                    </div>
                    {syncStatus && <Notice tone={syncStatus.tone}>{syncStatus.text}</Notice>}
                    {latestVersion && (
                      <Notice
                        tone="info"
                        action={
                          <button type="button" onClick={openReleasesPage} className={`${btnPrimary} h-8 px-3.5 text-xs`}>
                            Baixar
                          </button>
                        }
                      >
                        A versão <b className="font-num">{latestVersion}</b> está disponível (você usa a {__APP_VERSION__}). Mudanças nas
                        faixas do Simples chegam por versão nova.
                      </Notice>
                    )}
                  </div>

                  <Group>
                    <Field label="Tabela usada" htmlFor="cfg-table" help={TABLE_HELP} hint={`Base legal: ${activeVersion.legalBasis}`}>
                      <div className="relative">
                        <select
                          id="cfg-table"
                          value={formData.taxVersionId}
                          onChange={(e) => handleTableVersionChange(e.target.value)}
                          className={`${inputBase} appearance-none pr-10 cursor-pointer font-medium`}
                        >
                          {Object.values(OFFICIAL_TAX_TABLES).map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.effectiveDate})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      </div>
                    </Field>
                  </Group>

                  <Group title={`Valores de ${activeVersion.year}`}>
                    <div className="grid sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Salário mínimo', value: formData.minimumWage },
                        { label: 'Teto do INSS', value: formData.inssCeiling },
                        { label: 'Desconto simplificado do IR', value: formData.simplifiedIrDeduction },
                      ].map((v) => (
                        <div key={v.label} className={`${tile} px-4 py-3`}>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{v.label}</div>
                          <div className="text-lg font-semibold font-num tabular-nums text-slate-900 dark:text-white">{formatCurrency(v.value)}</div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setManualValues((v) => !v)}
                      aria-expanded={manualValues}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 cursor-pointer"
                    >
                      Ajustar à mão
                      <ChevronDown className={`w-4 h-4 transition-transform ${manualValues ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {manualValues && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: EASE_OUT }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3 grid sm:grid-cols-3 gap-3">
                            <Field label="Salário mínimo" htmlFor="cfg-min">
                              <CurrencyInput id="cfg-min" value={formData.minimumWage} onChange={(v) => set({ minimumWage: v })} />
                            </Field>
                            <Field label="Teto do INSS" htmlFor="cfg-ceiling">
                              <CurrencyInput id="cfg-ceiling" value={formData.inssCeiling} onChange={(v) => set({ inssCeiling: v })} />
                            </Field>
                            <Field label="Desconto simplificado" htmlFor="cfg-simpl">
                              <CurrencyInput
                                id="cfg-simpl"
                                value={formData.simplifiedIrDeduction}
                                onChange={(v) => set({ simplifiedIrDeduction: v })}
                              />
                            </Field>
                          </div>
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            Só para casos especiais. Com "Atualizar sozinho" ligado, cada mês volta a usar a tabela oficial dele.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Group>

                  <Group title="Faixas do IRRF mensal">
                    <div className="rounded-2xl ring-1 ring-slate-900/[0.07] dark:ring-white/[0.06] overflow-hidden">
                      <table className="w-full text-sm font-num">
                        <thead className="bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-500 dark:text-slate-400">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-medium">Base de cálculo</th>
                            <th className="px-4 py-2.5 text-right font-medium">Alíquota</th>
                            <th className="px-4 py-2.5 text-right font-medium">Parcela a deduzir</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/[0.05] dark:divide-white/[0.05] text-slate-700 dark:text-slate-300 tabular-nums">
                          {activeVersion.irrfBrackets.map((b, idx) => (
                            <tr key={b.faixa}>
                              <td className="px-4 py-2.5">
                                {idx === 0
                                  ? `Até ${formatCurrency(b.limit)}`
                                  : idx === activeVersion.irrfBrackets.length - 1
                                    ? `Acima de ${formatCurrency(activeVersion.irrfBrackets[idx - 1].limit)}`
                                    : `${formatCurrency(activeVersion.irrfBrackets[idx - 1].limit + 0.01)} a ${formatCurrency(b.limit)}`}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-slate-900 dark:text-white">{formatPercent(b.rate * 100, 1)}</td>
                              <td className="px-4 py-2.5 text-right">{formatCurrency(b.deduction)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {activeVersion.irrfReduction && (
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        <b className="text-slate-800 dark:text-slate-200">Redução da {activeVersion.irrfReduction.legalBasis}:</b> pró-labore
                        até {formatCurrency(activeVersion.irrfReduction.fullExemptionLimit)} fica sem IRRF, e até{' '}
                        {formatCurrency(activeVersion.irrfReduction.phaseOutLimit)} o imposto diminui. O app aplica sozinho.
                      </p>
                    )}
                  </Group>

                  <details className={`${tile} group p-4`}>
                    <summary className="flex items-center justify-between gap-3 cursor-pointer list-none font-semibold text-slate-900 dark:text-white">
                      Como as tabelas se atualizam
                      <ChevronDown className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" />
                    </summary>
                    <ol className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed list-decimal pl-5 marker:text-slate-400">
                      <li>
                        <b className="text-slate-800 dark:text-slate-200">Uma tabela por período.</b> Salário mínimo, teto do INSS e faixas do
                        IRRF têm vigência; ao trocar de mês, o app usa a que valia naquele mês.
                      </li>
                      <li>
                        <b className="text-slate-800 dark:text-slate-200">Tabelas novas pelo GitHub.</b> Quando sai uma lei ou portaria, o
                        FatorSimples publica as tabelas no GitHub. O app confere ao abrir e quando você clica em "Verificar agora", e só aplica
                        um arquivo completo. Sem internet, segue com as tabelas que já tem.
                      </li>
                      <li>
                        <b className="text-slate-800 dark:text-slate-200">Regras novas por versão nova.</b> Mudanças nas faixas do Simples ou
                        um imposto novo chegam numa versão nova do app, que avisa quando ela sair.
                      </li>
                    </ol>
                  </details>
                </>
              )}

              {activeTab === 'interface' && (
                <>
                  <Group title="Tema">
                    <div className="grid grid-cols-2 gap-3 max-w-md">
                      {(['light', 'dark'] as const).map((t) => {
                        const active = theme === t;
                        const Icon = t === 'light' ? Sun : Moon;
                        return (
                          <button
                            key={t}
                            type="button"
                            aria-pressed={active}
                            onClick={(e) => !active && toggleTheme(e.currentTarget)}
                            className={`text-left rounded-2xl p-2 ring-1 ring-inset transition-colors cursor-pointer ${
                              active ? 'ring-2 ring-emerald-500' : 'ring-slate-200 hover:ring-emerald-300 dark:ring-white/[0.08] dark:hover:ring-emerald-400/40'
                            }`}
                          >
                            {/* Miniatura do tema */}
                            <span
                              aria-hidden="true"
                              className={`block h-20 rounded-xl p-2 ${t === 'light' ? 'bg-[#e7eee9]' : 'bg-[#0a1216]'}`}
                            >
                              <span className={`flex h-full gap-1.5`}>
                                <span className={`w-6 rounded-md ${t === 'light' ? 'bg-white' : 'bg-[#152127]'}`} />
                                <span className="flex-1 flex flex-col gap-1.5">
                                  <span className={`h-6 rounded-md ${t === 'light' ? 'bg-white' : 'bg-[#152127]'}`} />
                                  <span className={`flex-1 rounded-md ${t === 'light' ? 'bg-white' : 'bg-[#152127]'} flex items-end p-1.5`}>
                                    <span className="h-1.5 w-8 rounded-full bg-emerald-500" />
                                  </span>
                                </span>
                              </span>
                            </span>
                            <span className="mt-2 px-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                              <Icon className={`w-4 h-4 ${t === 'light' ? 'text-amber-500' : 'text-emerald-400'}`} />
                              {t === 'light' ? 'Claro' : 'Escuro'}
                              {active && <Check className="w-4 h-4 ml-auto text-emerald-600 dark:text-emerald-400" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </Group>

                  <Group title="Sons">
                    <div className={`${tile} p-5 space-y-5`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div id="ui-sound-label" className="font-semibold text-slate-900 dark:text-white">
                            Sons da interface
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                            Cliques, confirmação ao salvar e aviso quando o Fator R cai abaixo de 28%.
                          </p>
                        </div>
                        <Switch checked={uiPrefs.soundEnabled} onChange={(v) => setUiPrefs({ soundEnabled: v })} labelledBy="ui-sound-label" />
                      </div>
                      <div className={`flex flex-wrap items-center gap-4 ${uiPrefs.soundEnabled ? '' : 'opacity-50'}`}>
                        <Volume2 className="w-4 h-4 text-slate-500" />
                        <label htmlFor="ui-sound-volume" className="sr-only">
                          Volume
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
                          className="flex-1 min-w-[10rem] accent-emerald-600 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span className="w-10 text-right text-sm font-num tabular-nums text-slate-700 dark:text-slate-300">
                          {Math.round(uiPrefs.soundVolume * 100)}%
                        </span>
                        <button type="button" disabled={!uiPrefs.soundEnabled} onClick={() => playSound('success')} className={`${btnGhost} h-9`}>
                          Testar
                        </button>
                      </div>
                    </div>
                  </Group>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Rodapé fixo */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 sm:px-8 py-4 border-t border-slate-900/[0.06] dark:border-white/[0.06]">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {activeTab === 'interface' ? 'Tema e sons valem na hora, sem precisar salvar.' : 'Os cálculos usam os novos valores depois de salvar.'}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className={btnGhost}>
              Cancelar
            </button>
            <button type="submit" className={btnPrimary}>
              Salvar
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
};
