import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { EASE_OUT, instantIf } from '../../utils/motion';

// Abertura de cada tela: título grande revelado da esquerda para a direita, com o contexto (o que é
// a tela, o estado do mês) numa etiqueta ao lado, descrição curta embaixo e ações à direita
export const PageHeader: React.FC<{
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ eyebrow, title, description, actions }) => {
  const reduceMotion = Boolean(useReducedMotion());
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <motion.h1
            className="text-[2rem] leading-[1.1] font-bold tracking-[-0.02em] text-slate-900 dark:text-white text-balance"
            initial={reduceMotion ? false : { clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={instantIf(reduceMotion, { duration: 0.55, ease: EASE_OUT, delay: 0.05 })}
          >
            {title}
          </motion.h1>
          <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-white/80 ring-1 ring-slate-900/[0.07] text-xs font-medium text-slate-600 dark:bg-slate-900/80 dark:ring-white/[0.07] dark:text-slate-300">
            {eyebrow}
          </span>
        </div>
        {description && <p className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-400 mt-1.5 max-w-3xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
    </header>
  );
};
