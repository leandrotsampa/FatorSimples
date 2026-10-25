import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { EASE_OUT, instantIf } from '../../utils/motion';

// Abertura de cada tela: linha de contexto, título grande revelado da esquerda para a direita,
// descrição curta e ações à direita
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
        <div className="text-xs font-medium text-slate-600 dark:text-slate-400">{eyebrow}</div>
        <motion.h1
          className="text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900 dark:text-white mt-0.5"
          initial={reduceMotion ? false : { clipPath: 'inset(0 100% 0 0)' }}
          animate={{ clipPath: 'inset(0 0% 0 0)' }}
          transition={instantIf(reduceMotion, { duration: 0.55, ease: EASE_OUT, delay: 0.05 })}
        >
          {title}
        </motion.h1>
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
    </header>
  );
};
