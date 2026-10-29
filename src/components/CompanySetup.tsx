import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Briefcase, Building2, Check, FileUp, HandCoins, MapPin, ReceiptText, X } from 'lucide-react';
import type { TaxSettings } from '../types/tax';
import { HelpTip, type HelpContent } from './ui/HelpTip';
import { StepTrack } from './ui/StepTrack';
import { CurrencyInput } from './CurrencyInput';
import { btnGhost, btnPrimary, card, tile } from './ui/card';
import { HELP } from './help';
import { companyInitials } from '../utils/companyInitials';
import { formatCurrency } from '../utils/taxCalculations';
import { EASE_OUT } from '../utils/motion';
import { playSound } from '../hooks/useSound';

export type CompanySetupData = Pick<
  TaxSettings,
  'companyName' | 'cnpj' | 'cityState' | 'cnae' | 'accountingFee' | 'prolaboreRule' | 'manualProlaboreAmount'
>;

const STEPS = [
  { title: 'A empresa', icon: Building2, lead: 'Para reconhecer a empresa no app e no Resumo do mês.' },
  { title: 'A atividade', icon: Briefcase, lead: 'A atividade define o anexo do Simples; a cidade, para onde vai o ISS.' },
  { title: 'A contabilidade', icon: ReceiptText, lead: 'Quanto a contabilidade cobra por mês. Fica na conta junto com os impostos.' },
  { title: 'O pró-labore', icon: HandCoins, lead: 'Como o app sugere o pró-labore de cada mês. Dá para trocar a qualquer hora.' },
];

const RULES: { rule: TaxSettings['prolaboreRule']; label: string; text: string; tag?: string }[] = [
  {
    rule: 'auto_28_month',
    label: '28% do faturamento do mês',
    text: 'O jeito mais simples: o pró-labore é 28% do que a empresa faturou no mês. O Fator R fica sempre acima de 28%.',
    tag: 'Recomendado',
  },
  {
    rule: 'exact_rbt12',
    label: 'Sem folga',
    text: 'O menor pró-labore que ainda mantém o Fator R em 28%, compensando os 11 meses anteriores. Paga menos INSS e IRRF, mas exige o histórico completo.',
  },
  { rule: 'manual', label: 'Valor fixo', text: 'Você define um valor e o app avisa quando ele deixa o Fator R abaixo de 28%.' },
];

const inputClass =
  'w-full h-11 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 shadow-2xs';

const Field: React.FC<{ label: string; help: HelpContent; htmlFor: string; hint?: string; optional?: boolean; children: React.ReactNode }> = ({
  label,
  help,
  htmlFor,
  hint,
  optional,
  children,
}) => (
  <div>
    <div className="flex items-center gap-1.5 mb-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {label}
      </label>
      {optional && <span className="text-xs text-slate-500 dark:text-slate-400">opcional</span>}
      <HelpTip help={help} />
    </div>
    {children}
    {hint && <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-snug">{hint}</div>}
  </div>
);

// Cartão que vai se montando ao lado do cadastro, com o que já foi preenchido
const Preview: React.FC<{ data: CompanySetupData; step: number }> = ({ data, step }) => {
  const reduce = Boolean(useReducedMotion());
  const name = data.companyName.trim();
  const rule = RULES.find((r) => r.rule === data.prolaboreRule);
  const rows = [
    { show: step >= 1 || Boolean(data.cityState), icon: MapPin, label: 'Cidade', value: data.cityState || 'Cidade - UF' },
    { show: step >= 1 || Boolean(data.cnae), icon: Briefcase, label: 'Atividade', value: data.cnae || 'CNAE principal' },
    { show: step >= 2, icon: ReceiptText, label: 'Contabilidade', value: `${formatCurrency(data.accountingFee ?? 0)} por mês` },
    {
      show: step >= 3,
      icon: HandCoins,
      label: 'Pró-labore',
      value: data.prolaboreRule === 'manual' ? `${formatCurrency(data.manualProlaboreAmount)} fixo` : (rule?.label ?? ''),
    },
  ];
  return (
    <div className={`${card} p-5`} aria-hidden="true">
      <div className="flex items-center gap-3">
        <motion.span
          key={name ? companyInitials(name) : 'vazio'}
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-base font-bold text-white bg-gradient-to-br from-emerald-500 to-emerald-700"
        >
          {name ? companyInitials(name) : <Building2 className="w-5 h-5" />}
        </motion.span>
        <div className="min-w-0">
          <div className="font-bold text-slate-900 dark:text-white truncate">{name || 'Sua empresa'}</div>
          <div className="text-xs font-num text-slate-500 dark:text-slate-400">CNPJ {data.cnpj || 'não informado'}</div>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        <AnimatePresence initial={false}>
          {rows
            .filter((r) => r.show)
            .map((r) => (
              <motion.li
                key={r.label}
                initial={reduce ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                className={`${tile} flex items-center gap-2.5 px-3 py-2`}
              >
                <r.icon className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400 w-24 shrink-0">{r.label}</span>
                <span className="text-sm text-slate-800 dark:text-slate-100 truncate">{r.value}</span>
              </motion.li>
            ))}
        </AnimatePresence>
      </ul>
    </div>
  );
};

// Cadastro inicial em etapas curtas, uma coisa de cada vez, com ajuda em cada campo
export const CompanySetup: React.FC<{
  settings: TaxSettings;
  onDone: (data: CompanySetupData) => void;
  onCancel: () => void;
  onImport: () => void;
}> = ({ settings, onDone, onCancel, onImport }) => {
  const reduce = Boolean(useReducedMotion());
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [data, setData] = useState<CompanySetupData>({
    companyName: '',
    cnpj: '',
    cityState: '',
    cnae: settings.cnae,
    accountingFee: settings.accountingFee ?? 0,
    prolaboreRule: 'auto_28_month',
    manualProlaboreAmount: settings.manualProlaboreAmount,
  });
  const set = (patch: Partial<CompanySetupData>) => setData((d) => ({ ...d, ...patch }));
  const nameOk = data.companyName.trim().length > 0;
  const last = step === STEPS.length - 1;

  const go = (k: number) => {
    setDir(k > step ? 1 : -1);
    setStep(k);
    playSound('tick');
  };
  const next = () => {
    if (step === 0 && !nameOk) return;
    if (last) onDone({ ...data, companyName: data.companyName.trim() });
    else go(step + 1);
  };

  const Current = STEPS[step];

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className="max-w-6xl mx-auto px-6 lg:px-10 pb-12 pt-2"
    >
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Vamos cadastrar a sua empresa</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-5">
        Tenha o cartão CNPJ por perto. Cada campo tem um "?" que mostra o que é e onde achar a informação.
      </p>

      {/* Atalho: a declaração do PGDAS-D preenche a empresa e os meses anteriores de uma vez */}
      <div className="mb-7 flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-emerald-50 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-500/10 dark:ring-emerald-400/20">
        <FileUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <p className="flex-1 text-sm text-emerald-950 dark:text-emerald-50 leading-relaxed">
          <b>Tem a declaração do PGDAS-D em PDF?</b> Importe e o app preenche a empresa e os meses anteriores, com faturamento, folha e
          DAS.
        </p>
        <button type="button" onClick={onImport} className={btnGhost}>
          Importar documento
        </button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          <StepTrack
            ariaLabel="Etapas do cadastro"
            className="mb-7"
            steps={STEPS.map((s, k) => `${k + 1}. ${s.title}`)}
            icons={STEPS.map((s) => s.icon)}
            current={step}
            done={(k) => k < step || (k === 0 && nameOk && step > 0)}
            invalid={(k) => k === 0 && step > 0 && !nameOk}
            reachable={(k) => k <= step || nameOk}
            onSelect={go}
          />

          <div className="relative min-h-[300px] overflow-x-clip">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                initial={reduce ? false : { x: 48 * dir, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { x: -48 * dir, opacity: 0 }}
                transition={{ duration: 0.32, ease: EASE_OUT }}
                className="space-y-5"
              >
                <div>
                  <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                    <Current.icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    {Current.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{Current.lead}</p>
                </div>

                {step === 0 && (
                  <>
                    <Field label="Razão social" help={HELP.companyName} htmlFor="setup-name" hint="O nome oficial, como está no cartão CNPJ.">
                      <input
                        id="setup-name"
                        autoFocus
                        value={data.companyName}
                        onChange={(e) => set({ companyName: e.target.value })}
                        className={inputClass}
                        placeholder="Ex.: Minha Empresa de Tecnologia LTDA"
                      />
                    </Field>
                    <Field label="CNPJ" help={HELP.cnpj} htmlFor="setup-cnpj" optional>
                      <input
                        id="setup-cnpj"
                        value={data.cnpj}
                        onChange={(e) => set({ cnpj: e.target.value })}
                        className={`${inputClass} font-num`}
                        placeholder="00.000.000/0001-00"
                      />
                    </Field>
                  </>
                )}

                {step === 1 && (
                  <>
                    <Field
                      label="CNAE principal"
                      help={HELP.cnae}
                      htmlFor="setup-cnae"
                      hint="Desenvolvimento de software, consultoria e engenharia ficam no Anexo V, mas vão para o III, mais barato, com o Fator R em 28%."
                    >
                      <input id="setup-cnae" autoFocus value={data.cnae} onChange={(e) => set({ cnae: e.target.value })} className={inputClass} />
                    </Field>
                    <Field label="Cidade / UF" help={HELP.cityState} htmlFor="setup-city" optional>
                      <input
                        id="setup-city"
                        value={data.cityState}
                        onChange={(e) => set({ cityState: e.target.value })}
                        className={inputClass}
                        placeholder="Ex.: Brusque - SC"
                      />
                    </Field>
                  </>
                )}

                {step === 2 && (
                  <Field
                    label="Honorários mensais da contabilidade"
                    help={HELP.accountingFee}
                    htmlFor="setup-fee"
                    optional
                    hint="Na tela do mês, esse valor fica na conta da empresa e sai do lucro que você transfere. Pode deixar zero."
                  >
                    <CurrencyInput id="setup-fee" value={data.accountingFee ?? 0} onChange={(v) => set({ accountingFee: v })} />
                  </Field>
                )}

                {step === 3 && (
                  <div role="radiogroup" aria-label="Como sugerir o pró-labore" className="space-y-2.5">
                    {RULES.map((r) => {
                      const active = data.prolaboreRule === r.rule;
                      return (
                        <button
                          key={r.rule}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => set({ prolaboreRule: r.rule })}
                          className={`w-full text-left flex gap-3 p-4 rounded-2xl ring-1 ring-inset transition-colors cursor-pointer ${
                            active
                              ? 'bg-emerald-50 ring-emerald-500 dark:bg-emerald-500/10 dark:ring-emerald-400/60'
                              : 'bg-white ring-slate-200 hover:ring-emerald-300 dark:bg-slate-900 dark:ring-slate-700'
                          }`}
                        >
                          <span
                            className={`mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center ring-2 ${
                              active ? 'bg-emerald-600 ring-emerald-600 text-white' : 'ring-slate-300 dark:ring-slate-600'
                            }`}
                          >
                            {active && <Check className="w-3 h-3" strokeWidth={3} />}
                          </span>
                          <span>
                            <span className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                              {r.label}
                              {r.tag && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-semibold">{r.tag}</span>
                              )}
                            </span>
                            <span className="block mt-0.5 text-sm text-slate-600 dark:text-slate-400 leading-snug">{r.text}</span>
                          </span>
                        </button>
                      );
                    })}
                    {data.prolaboreRule === 'manual' && (
                      <Field label="Valor do pró-labore" help={HELP.prolabore} htmlFor="setup-manual">
                        <CurrencyInput
                          id="setup-manual"
                          value={data.manualProlaboreAmount}
                          onChange={(v) => set({ manualProlaboreAmount: v })}
                        />
                      </Field>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-900/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-3">
            {step === 0 ? (
              <button type="button" onClick={onCancel} className={btnGhost}>
                <X className="w-4 h-4" /> Cancelar
              </button>
            ) : (
              <button type="button" onClick={() => go(step - 1)} className={btnGhost}>
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
            )}
            <button type="submit" disabled={step === 0 && !nameOk} className={`${btnPrimary} h-11 px-6`}>
              {last ? 'Começar' : 'Continuar'} {last ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </form>

        <div className="hidden lg:block lg:sticky lg:top-4">
          <Preview data={data} step={step} />
          <p className="mt-3 px-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Tudo isso pode ser mudado depois em Configurações → Empresa.
          </p>
        </div>
      </div>
    </motion.div>
  );
};
