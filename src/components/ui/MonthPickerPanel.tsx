import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { currentYearMonth, MONTH_SHORT_NAMES, monthLongName, navigateMonth, pageEndFor, yearPage } from '../../utils/monthPicker';
import { EASE_OUT, instantIf } from '../../utils/motion';

const pad = (m: number) => String(m).padStart(2, '0');

// Grade de meses da competência: ano com setas, 12 meses (o escolhido em verde, os salvos com um ponto,
// o mês atual com contorno) e atalho para o mês atual. Teclado: setas, Home/End, PageUp/PageDown e Enter.
// Meses depois do atual ficam bloqueados: a competência ainda não chegou. Clicar no ano abre a grade
// de anos (12 por página), para pular direto para um ano distante.
export const MonthPickerPanel: React.FC<{
  value: string;
  savedMonths: Set<string>;
  onSelect: (yearMonth: string) => void;
  now?: Date; // relógio do app: o mês atual acompanha a virada do mês com o app aberto
}> = ({ value, savedMonths, onSelect, now }) => {
  const reduceMotion = Boolean(useReducedMotion());
  const [viewYear, setViewYear] = useState(() => Number(value.slice(0, 4)));
  const [focused, setFocused] = useState(value);
  const gridRef = useRef<HTMLDivElement>(null);
  const today = currentYearMonth(now);
  const todayYear = Number(today.slice(0, 4));
  const [view, setView] = useState<'months' | 'years'>('months');
  const [pageEnd, setPageEnd] = useState(() => pageEndFor(Number(value.slice(0, 4)), todayYear));
  const savedYears = new Set([...savedMonths].map((ym) => Number(ym.slice(0, 4))));
  const years = yearPage(pageEnd);

  const openYears = () => {
    setPageEnd(pageEndFor(viewYear, todayYear));
    setView('years');
  };
  const pickYear = (y: number) => {
    const ym = `${y}-${focused.slice(5, 7)}`;
    setViewYear(y);
    setFocused(ym > today ? today : ym);
    setView('months');
  };

  // Foco segue o mês navegado pelo teclado (inclusive ao entrar no painel)
  useEffect(() => {
    if (view !== 'months') return;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-month="${focused}"]`)?.focus();
  }, [focused, viewYear, view]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const next = navigateMonth(focused, e.key, today);
    if (!next) return;
    e.preventDefault();
    setFocused(next);
    setViewYear(Number(next.slice(0, 4)));
  };

  const changeYear = (delta: number) => {
    const y = Math.min(todayYear, viewYear + delta);
    const ym = `${y}-${focused.slice(5, 7)}`;
    setViewYear(y);
    setFocused(ym > today ? today : ym);
  };

  return (
    <div className="w-64">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => (view === 'months' ? changeYear(-1) : setPageEnd(pageEnd - years.length))}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label={view === 'months' ? 'Ano anterior' : 'Anos anteriores'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {view === 'months' ? (
          <button type="button" onClick={openYears} aria-expanded={false} title="Escolher o ano" className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-sm font-bold font-num text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <span aria-live="polite">{viewYear}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          </button>
        ) : (
          <button type="button" onClick={() => setView('months')} aria-expanded title="Voltar para os meses" className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-sm font-bold font-num text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer">
            {years[0]}–{years[years.length - 1]}
            <ChevronDown className="w-3.5 h-3.5 rotate-180 text-slate-500 dark:text-slate-400" />
          </button>
        )}
        <button
          type="button"
          onClick={() => (view === 'months' ? changeYear(1) : setPageEnd(Math.min(todayYear, pageEnd + years.length)))}
          disabled={view === 'months' ? viewYear >= todayYear : pageEnd >= todayYear}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          aria-label={view === 'months' ? 'Próximo ano' : 'Próximos anos'}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {view === 'years' ? (
          <motion.div
            key="years"
            role="group"
            aria-label="Anos"
            className="grid grid-cols-3 gap-1"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
            onKeyDown={(e) => {
              if (e.key !== 'Escape') return;
              e.stopPropagation();
              setView('months');
            }}
          >
            {years.map((y) => {
              const selected = y === viewYear;
              const isThisYear = y === todayYear;
              const saved = savedYears.has(y);
              return (
                <button
                  key={y}
                  type="button"
                  autoFocus={selected}
                  aria-pressed={selected}
                  aria-label={`${y}${saved ? ', com meses salvos' : ''}${isThisYear ? ', ano atual' : ''}`}
                  onClick={() => pickYear(y)}
                  className={`relative h-11 rounded-lg text-sm font-num transition-colors cursor-pointer ${
                    selected
                      ? 'bg-emerald-600 text-white font-semibold dark:bg-emerald-500 dark:text-emerald-950'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  } ${isThisYear && !selected ? 'ring-1 ring-inset ring-emerald-500/60' : ''}`}
                >
                  {y}
                  {saved && (
                    <span
                      className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                        selected ? 'bg-white dark:bg-emerald-950' : 'bg-emerald-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="months"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
          >
      <div ref={gridRef} role="group" aria-label={`Meses de ${viewYear}`} className="grid grid-cols-3 gap-1" onKeyDown={onKeyDown}>
        {MONTH_SHORT_NAMES.map((short, i) => {
          const ym = `${viewYear}-${pad(i + 1)}`;
          const selected = ym === value;
          const saved = savedMonths.has(ym);
          const isToday = ym === today;
          const future = ym > today;
          return (
            <button
              key={ym}
              type="button"
              data-month={ym}
              tabIndex={ym === focused ? 0 : -1}
              aria-pressed={selected}
              disabled={future}
              title={future ? 'Este mês ainda não chegou' : undefined}
              aria-label={`${monthLongName(ym)} de ${viewYear}${saved ? ', salvo no histórico' : ''}${isToday ? ', mês atual' : ''}${future ? ', ainda não chegou' : ''}`}
              onClick={() => onSelect(ym)}
              onFocus={() => setFocused(ym)}
              className={`relative h-11 rounded-lg text-sm capitalize transition-colors ${
                selected
                  ? 'text-white font-semibold dark:text-emerald-950 cursor-pointer'
                  : future
                    ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer'
              } ${isToday && !selected ? 'ring-1 ring-inset ring-emerald-500/60' : ''}`}
            >
              {selected && (
                <motion.span
                  layoutId="month-pick"
                  className="absolute inset-0 rounded-lg bg-emerald-600 dark:bg-emerald-500"
                  transition={instantIf(reduceMotion, { type: 'spring', stiffness: 420, damping: 34 } as const)}
                />
              )}
              <span className="relative">{short}</span>
              {saved && (
                <span
                  className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                    selected ? 'bg-white dark:bg-emerald-950' : 'bg-emerald-500'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-[11px]">
        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> salvo no histórico
        </span>
        <button
          type="button"
          onClick={() => onSelect(today)}
          className="font-semibold text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 cursor-pointer"
        >
          Mês atual
        </button>
      </div>
    </div>
  );
};
