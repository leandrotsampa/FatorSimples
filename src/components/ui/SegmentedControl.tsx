import React from 'react';
import { motion } from 'motion/react';

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  title?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  ariaLabel: string;
  // Identificador único na tela: é o que faz a pílula deslizar entre as opções
  layoutId: string;
  className?: string;
}

// Seletor de opções com a pílula ativa deslizando até a opção escolhida
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
  ariaLabel,
  layoutId,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`grid h-10 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-300 dark:border-slate-700 text-sm ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            disabled={disabled}
            aria-pressed={active}
            title={o.title}
            className={`relative px-2 rounded-md cursor-pointer disabled:cursor-not-allowed transition-colors duration-[var(--duration-base)] ${
              active
                ? 'text-white font-semibold dark:text-emerald-950'
                : 'text-slate-600 dark:text-slate-400 enabled:hover:text-slate-900 dark:enabled:hover:text-slate-200'
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-md bg-emerald-600 dark:bg-emerald-500"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
