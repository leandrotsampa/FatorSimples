import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { currentYearMonth, MONTH_SHORT_NAMES, monthLongName, navigateMonth } from '../../utils/monthPicker';
import { instantIf } from '../../utils/motion';

const pad = (m: number) => String(m).padStart(2, '0');

// Grade de meses da competência: ano com setas, 12 meses (o escolhido em verde, os salvos com um ponto,
// o mês atual com contorno) e atalho para o mês atual. Teclado: setas, Home/End, PageUp/PageDown e Enter.
// Meses depois do atual ficam bloqueados: a competência ainda não chegou.
export const MonthPickerPanel: React.FC<{
  value: string;
  savedMonths: Set<string>;
  onSelect: (yearMonth: string) => void;
}> = ({ value, savedMonths, onSelect }) => {
  const reduceMotion = Boolean(useReducedMotion());
  const [viewYear, setViewYear] = useState(() => Number(value.slice(0, 4)));
  const [focused, setFocused] = useState(value);
  const gridRef = useRef<HTMLDivElement>(null);
  const today = currentYearMonth();
  const todayYear = Number(today.slice(0, 4));

  // Foco segue o mês navegado pelo teclado (inclusive ao entrar no painel)
  useEffect(() => {
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-month="${focused}"]`)?.focus();
  }, [focused, viewYear]);

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
          onClick={() => changeYear(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Ano anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold font-num text-slate-900 dark:text-white" aria-live="polite">
          {viewYear}
        </span>
        <button
          type="button"
          onClick={() => changeYear(1)}
          disabled={viewYear >= todayYear}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          aria-label="Próximo ano"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

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
