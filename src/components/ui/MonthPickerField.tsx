import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, ChevronDown, Lock } from 'lucide-react';
import { MonthPickerPanel } from './MonthPickerPanel';
import { inputBase } from './card';
import { currentYearMonth, monthLongName } from '../../utils/monthPicker';
import { DURATION, EASE_OUT } from '../../utils/motion';

// Campo de competência dos formulários: mostra o mês escolhido e abre a mesma grade de meses do menu lateral.
// A grade vai para o fim da página (portal): o painel dos modais corta o que passa da borda (overflow-hidden).
// readOnly: mostra a competência travada (ex.: edição de um mês do histórico), sem abrir a grade.
export const MonthPickerField: React.FC<{
  id?: string;
  value: string;
  savedMonths: Set<string>;
  onChange: (yearMonth: string) => void;
  readOnly?: boolean;
  blockSaved?: boolean; // meses salvos não podem ser escolhidos (cadastro de mês novo)
}> = ({ id, value, savedMonths, onChange, readOnly = false, blockSaved = false }) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [openUp, setOpenUp] = useState(false);

  const close = (refocus: boolean) => {
    setPos(null);
    if (refocus) triggerRef.current?.focus();
  };
  const toggle = () => {
    if (pos) return close(false);
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) setPos({ x: r.left, y: r.bottom + 8 });
  };

  // Sem espaço abaixo do campo: abre para cima
  useLayoutEffect(() => {
    if (!pos || !panelRef.current || !triggerRef.current) return;
    const panelH = panelRef.current.offsetHeight;
    const r = triggerRef.current.getBoundingClientRect();
    const up = r.bottom + 8 + panelH > window.innerHeight - 8 && r.top - 8 - panelH > 8;
    setOpenUp(up);
    if (up) setPos({ x: r.left, y: r.top - 8 - panelH });
  }, [pos === null]); // só ao abrir

  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Fecha só a grade, não o modal em volta
      e.stopPropagation();
      close(true);
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) close(false);
    };
    // A grade fica presa à tela: mudou o tamanho da janela, fecha
    const onResize = () => close(false);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', onResize);
    };
  }, [pos]);

  const year = value.slice(0, 4);
  const saved = savedMonths.has(value);
  const label = value ? (
    <span className="font-num font-semibold truncate">
      {monthLongName(value)} de {year}
    </span>
  ) : (
    <span className="text-slate-400 dark:text-slate-500">Escolha o mês</span>
  );

  if (readOnly) {
    return (
      <div
        id={id}
        role="textbox"
        aria-readonly="true"
        aria-label={`Competência ${monthLongName(value)} de ${year}`}
        className={`${inputBase} flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <CalendarDays className="w-4 h-4 shrink-0 text-slate-400" />
          {label}
        </span>
        <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
      </div>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={Boolean(pos)}
        aria-label={value ? `Competência ${monthLongName(value)} de ${year}${saved ? ', salva no histórico' : ''}. Escolher outro mês` : 'Escolher a competência'}
        className={`${inputBase} flex items-center justify-between gap-2 text-left cursor-pointer`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <CalendarDays className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          {label}
          {saved && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Salvo
            </span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-[var(--duration-base)] ${pos ? 'rotate-180' : ''}`} />
      </button>

      {createPortal(
        <AnimatePresence>
          {pos && (
            <motion.div
              ref={panelRef}
              key="month-field-panel"
              role="dialog"
              aria-label="Escolher a competência"
              // Camada 80: acima dos modais (70)
              className="app-no-drag fixed z-[80] p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl"
              style={{ left: pos.x, top: pos.y }}
              initial={{ opacity: 0, y: openUp ? 6 : -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: openUp ? 6 : -6 }}
              transition={{ duration: DURATION.base, ease: EASE_OUT }}
            >
              <MonthPickerPanel
                value={value || currentYearMonth()}
                savedMonths={savedMonths}
                blockSaved={blockSaved}
                onSelect={(ym) => {
                  onChange(ym);
                  close(true);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
