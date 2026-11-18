import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { DURATION, EASE_OUT } from '../../utils/motion';

const PANEL_WIDTH = 380;

// Link discreto que abre um painel flutuante com detalhes (ex.: as contas do Fator R no cartão do topo).
// Flutua sobre a página para não esticar o cartão; fecha com Esc, clique fora ou mudança de tamanho da janela.
export const InfoPopover: React.FC<{ label: string; title: string; children: React.ReactNode }> = ({ label, title, children }) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; above: boolean } | null>(null);

  const close = (refocus: boolean) => {
    setPos(null);
    if (refocus) btnRef.current?.focus();
  };
  const toggle = () => {
    if (pos) return close(false);
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const above = r.bottom + 300 > window.innerHeight && r.top > 300;
    const x = Math.min(Math.max(12, r.right - PANEL_WIDTH), window.innerWidth - PANEL_WIDTH - 12);
    setPos({ x, y: above ? window.innerHeight - r.top + 8 : r.bottom + 8, above });
  };

  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(true);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !btnRef.current?.contains(t)) close(false);
    };
    const onResize = () => close(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', onResize);
    };
  }, [pos]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={Boolean(pos)}
        className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400 cursor-pointer"
      >
        {label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-[var(--duration-base)] ${pos ? 'rotate-180' : ''}`} />
      </button>
      {createPortal(
        <AnimatePresence>
          {pos && (
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-label={title}
              className="app-no-drag no-print fixed z-[60] p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl"
              style={{ left: pos.x, width: PANEL_WIDTH, ...(pos.above ? { bottom: pos.y } : { top: pos.y }) }}
              initial={{ opacity: 0, y: pos.above ? 6 : -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: pos.above ? 6 : -6 }}
              transition={{ duration: DURATION.base, ease: EASE_OUT }}
            >
              <div className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{title}</div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
