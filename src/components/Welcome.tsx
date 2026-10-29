import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Calculator, FileUp, HandCoins, Moon, Percent, Scale, Sun } from 'lucide-react';
import type { TaxSettings } from '../types/tax';
import { CompanySetup, type CompanySetupData } from './CompanySetup';
import { btnGhost, btnPrimary, card } from './ui/card';
import { formatCurrency } from '../utils/taxCalculations';
import { EASE_OUT } from '../utils/motion';
import { AnimatedNumber } from './ui/AnimatedNumber';

const FEATURES = [
  { icon: Percent, title: 'A alíquota para a nota', text: 'Quanto de imposto sai de cada nota do mês, com a tabela do ano.' },
  { icon: Scale, title: 'Fator R em 28%', text: 'O pró-labore que mantém a empresa no Anexo III, o mais barato.' },
  { icon: HandCoins, title: 'Quanto transferir para você', text: 'Pró-labore e lucro do mês, já sem INSS, IRRF e DAS.' },
  { icon: Calculator, title: 'Vale a pena?', text: 'Com e sem o Fator R, lado a lado, em reais.' },
];

// Vitrine: o Fator R sobe e desce e a alíquota troca de anexo ao cruzar os 28%
const SHOWCASE = [0.22, 0.25, 0.27, 0.285, 0.3, 0.31, 0.26];
const REVENUE = 20000;
const RATE_III = 0.06;
const RATE_V = 0.155;

// Primeira abertura, com o app ainda sem nada: um exemplo, o cadastro da empresa ou os documentos
export const Welcome: React.FC<{
  dark: boolean;
  settings: TaxSettings;
  onDemo: () => void;
  onImport: () => void;
  onSetup: (company: CompanySetupData) => void;
  toggleTheme: (origin?: HTMLElement | null) => void;
  // Saindo do exemplo ("Usar o meu"), começa direto no cadastro
  initialStage?: 'welcome' | 'setup';
}> = ({ dark, settings, onDemo, onImport, onSetup, toggleTheme, initialStage = 'welcome' }) => {
  const reduce = Boolean(useReducedMotion());
  const [stage, setStage] = useState<'welcome' | 'setup'>(initialStage);
  const [k, setK] = useState(3);
  useEffect(() => {
    if (reduce || stage !== 'welcome') return;
    const t = window.setInterval(() => setK((n) => (n + 1) % SHOWCASE.length), 2200);
    return () => window.clearInterval(t);
  }, [reduce, stage]);

  const factor = SHOWCASE[k];
  const anexo3 = factor >= 0.28;
  const das = REVENUE * (anexo3 ? RATE_III : RATE_V);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {stage === 'welcome' ? (
        <motion.div
          key="welcome"
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="max-w-6xl mx-auto px-6 lg:px-10 py-6 lg:py-12 grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center"
        >
          <div>
            <motion.h1
              className="text-[2.6rem] sm:text-[3.3rem] leading-[1.04] font-extrabold tracking-tight text-slate-900 dark:text-white text-balance"
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
            >
              Pague o Simples certo, todo mês, sem planilha.
            </motion.h1>
            <motion.p
              className="mt-5 text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
            >
              Informe o faturamento do mês e veja a alíquota, o DAS, o pró-labore que mantém o Fator R em 28% e quanto transferir para
              você. As tabelas do Simples se atualizam sozinhas.
            </motion.p>

            <motion.div
              className="mt-8 flex flex-wrap items-center gap-3"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.2 }}
            >
              <button type="button" onClick={() => setStage('setup')} className={`${btnPrimary} h-12 px-6 text-[15px]`}>
                Cadastrar minha empresa <ArrowRight className="w-4 h-4" />
              </button>
              <button type="button" onClick={onDemo} className={`${btnGhost} h-12`}>
                Explorar com um exemplo
              </button>
            </motion.div>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <FileUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Tem a declaração do PGDAS-D em PDF?
              <button
                type="button"
                onClick={onImport}
                className="font-semibold text-emerald-700 dark:text-emerald-300 underline underline-offset-4 decoration-emerald-300 hover:decoration-emerald-600 cursor-pointer"
              >
                Importar o documento
              </button>
              e pular o cadastro.
            </p>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
              Seus dados ficam só neste computador.
              <button
                type="button"
                onClick={(e) => toggleTheme(e.currentTarget)}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full border border-slate-300/90 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 dark:bg-slate-800 dark:border-transparent dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                title="Trocar entre claro e escuro"
              >
                {dark ? <Moon className="w-4 h-4 text-emerald-300" /> : <Sun className="w-4 h-4 text-amber-500" />}
                {dark ? 'Escuro' : 'Claro'}
              </button>
            </p>

            <div className="mt-10 grid sm:grid-cols-2 gap-x-6 gap-y-5">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  className="flex gap-3"
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.35 + i * 0.08 }}
                >
                  <span className="w-10 h-10 shrink-0 rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-900/[0.06] dark:ring-white/[0.08] flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                    <f.icon className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white text-[15px]">{f.title}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 leading-snug mt-0.5">{f.text}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Vitrine: um mês de exemplo, com o Fator R cruzando os 28% */}
          <motion.div
            className={`${card} p-6 sm:p-7`}
            aria-hidden="true"
            initial={reduce ? false : { opacity: 0, scale: 0.95, rotate: -1.2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.15 }}
          >
            <div className="text-sm text-slate-500 dark:text-slate-400">Faturamento do mês</div>
            <div className="text-3xl font-extrabold font-num tabular-nums text-slate-900 dark:text-white">{formatCurrency(REVENUE)}</div>

            <div className="mt-6 flex items-baseline justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-300">Fator R</span>
              <AnimatedNumber
                value={factor * 100}
                format={(n) => `${n.toFixed(1).replace('.', ',')}%`}
                className={`text-xl font-bold font-num tabular-nums ${anexo3 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
              />
            </div>
            <div className="relative mt-2 h-3 rounded-full bg-slate-100 dark:bg-slate-800">
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-full ${anexo3 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                animate={{ width: `${(factor / 0.4) * 100}%` }}
                transition={{ type: 'spring', stiffness: 60, damping: 14 }}
              />
              <div className="absolute -top-1 -bottom-1 w-0.5 bg-slate-900/70 dark:bg-white/80 rounded" style={{ left: `${(0.28 / 0.4) * 100}%` }} />
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400" style={{ paddingLeft: `calc(${(0.28 / 0.4) * 100}% - 0.9rem)` }}>
              28%
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {(['III', 'V'] as const).map((a) => {
                const active = (a === 'III') === anexo3;
                return (
                  <div
                    key={a}
                    className={`p-3.5 rounded-xl ring-1 ring-inset transition-colors ${
                      active
                        ? a === 'III'
                          ? 'bg-emerald-50 ring-emerald-500/40 dark:bg-emerald-500/10'
                          : 'bg-rose-50 ring-rose-500/40 dark:bg-rose-500/10'
                        : 'ring-slate-900/[0.06] dark:ring-white/[0.06] opacity-55'
                    }`}
                  >
                    <div className="text-xs text-slate-500 dark:text-slate-400">Anexo {a}</div>
                    <div className="text-lg font-bold font-num text-slate-900 dark:text-white">
                      {`${((a === 'III' ? RATE_III : RATE_V) * 100).toFixed(1).replace('.', ',')}%`}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex items-baseline justify-between border-t border-slate-900/[0.06] dark:border-white/[0.06] pt-4">
              <span className="text-sm text-slate-600 dark:text-slate-300">DAS do mês</span>
              <AnimatedNumber value={das} format={formatCurrency} className="text-2xl font-extrabold font-num tabular-nums text-slate-900 dark:text-white" />
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 text-right">
              {anexo3 ? `${formatCurrency(REVENUE * (RATE_V - RATE_III))} a menos que no Anexo V` : 'Abaixo de 28%: paga pelo Anexo V'}
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div key="setup">
          <CompanySetup settings={settings} onDone={onSetup} onCancel={() => setStage('welcome')} onImport={onImport} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
