import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Calculator, Check, FileUp, HandCoins, Moon, Percent, Scale, Sun } from 'lucide-react';
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
// Fim da barra do Fator R: a meta de 28% fica a 70% dela
const SCALE_MAX = 0.4;

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

          {/* Vitrine: um mês de exemplo contando a história inteira. O pró-labore sobe e desce, o Fator R
              cruza a meta de 28% e, com ele, o anexo e o DAS do mês trocam */}
          <motion.div
            className="relative"
            aria-hidden="true"
            initial={reduce ? false : { opacity: 0, scale: 0.95, rotate: -1.2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.15 }}
          >
            {/* Brilho atrás do cartão, na cor do resultado */}
            <motion.div
              className="absolute -inset-6 rounded-[44px] blur-3xl"
              animate={{ backgroundColor: anexo3 ? 'rgba(16,185,129,0.22)' : 'rgba(244,63,94,0.16)' }}
              transition={{ duration: 0.8 }}
            />
            <div className={`${card} relative p-6 sm:p-7 overflow-hidden`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Um mês de exemplo</span>
                <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ao vivo
                </span>
              </div>

              {/* Entradas: o que a empresa faturou e quanto você retira */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Faturamento</div>
                  <div className="text-2xl font-bold font-num tabular-nums text-slate-900 dark:text-white">{formatCurrency(REVENUE)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Pró-labore</div>
                  <AnimatedNumber
                    value={REVENUE * factor}
                    format={formatCurrency}
                    className="text-2xl font-bold font-num tabular-nums text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Fator R com a meta marcada */}
              <div className="mt-6">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Fator R</span>
                  <AnimatedNumber
                    value={factor * 100}
                    format={(n) => `${n.toFixed(1).replace('.', ',')}%`}
                    className={`text-2xl font-bold font-num tabular-nums transition-colors duration-500 ${
                      anexo3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  />
                </div>
                <div className="relative mt-3 pt-5">
                  <span
                    className="absolute top-0 -translate-x-1/2 text-[11px] font-semibold px-1.5 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    style={{ left: `${(0.28 / SCALE_MAX) * 100}%` }}
                  >
                    meta 28%
                  </span>
                  <div className="relative h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    {/* Zona do Anexo III, à direita da meta */}
                    <div
                      className="absolute inset-y-0 right-0 bg-emerald-500/10 dark:bg-emerald-400/10"
                      style={{ left: `${(0.28 / SCALE_MAX) * 100}%` }}
                    />
                    <motion.div
                      className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${
                        anexo3 ? 'from-emerald-400 to-emerald-600' : 'from-rose-400 to-rose-600'
                      }`}
                      animate={{ width: `${(factor / SCALE_MAX) * 100}%` }}
                      transition={{ duration: 0.5, ease: EASE_OUT }}
                    />
                  </div>
                  <div
                    className="absolute top-4 bottom-0 w-0.5 -translate-x-1/2 rounded bg-slate-900 dark:bg-white"
                    style={{ left: `${(0.28 / SCALE_MAX) * 100}%` }}
                  />
                </div>
              </div>

              {/* Os dois anexos, os dois legíveis: o da vez acende */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                {(['III', 'V'] as const).map((a) => {
                  const active = (a === 'III') === anexo3;
                  const good = a === 'III';
                  return (
                    <div
                      key={a}
                      className={`relative p-3.5 rounded-2xl ring-1 ring-inset transition-all duration-500 ${
                        active
                          ? good
                            ? 'bg-emerald-50 ring-emerald-500/50 dark:bg-emerald-500/10 dark:ring-emerald-400/40'
                            : 'bg-rose-50 ring-rose-500/50 dark:bg-rose-500/10 dark:ring-rose-400/40'
                          : 'bg-slate-50 ring-slate-900/[0.07] dark:bg-slate-950/60 dark:ring-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold ${
                            active ? (good ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300') : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          Anexo {a}
                        </span>
                        {active && (
                          <motion.span
                            initial={reduce ? false : { scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${good ? 'bg-emerald-600' : 'bg-rose-600'}`}
                          >
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </motion.span>
                        )}
                      </div>
                      <div
                        className={`mt-0.5 text-xl font-bold font-num ${
                          active ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {`${((good ? RATE_III : RATE_V) * 100).toFixed(1).replace('.', ',')}%`}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{good ? 'com Fator R ≥ 28%' : 'abaixo de 28%'}</div>
                    </div>
                  );
                })}
              </div>

              {/* Resultado: o DAS do mês e a diferença */}
              <div className="mt-5 pt-4 border-t border-slate-900/[0.06] dark:border-white/[0.06] flex items-end justify-between gap-3">
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">DAS do mês</div>
                  <AnimatedNumber value={das} format={formatCurrency} className="text-3xl font-bold font-num tabular-nums text-slate-900 dark:text-white" />
                </div>
                <motion.span
                  key={anexo3 ? 'menos' : 'mais'}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                  className={`mb-1 inline-flex items-center h-7 px-3 rounded-full text-xs font-semibold font-num ${
                    anexo3
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200'
                  }`}
                >
                  {formatCurrency(REVENUE * (RATE_V - RATE_III))} {anexo3 ? 'a menos' : 'a mais'}
                </motion.span>
              </div>
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
