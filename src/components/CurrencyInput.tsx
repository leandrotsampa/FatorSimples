import React, { useState } from 'react';

// "30.000,50" / "30000.5" / "30000" -> 30000.5
export const parseCurrencyInput = (text: string): number => {
  const clean = text.replace(/[^\d.,]/g, '');
  if (!clean) return 0;
  const normalized = clean.includes(',')
    ? clean.replace(/\./g, '').replace(',', '.')
    : /^\d+\.\d{1,2}$/.test(clean)
      ? clean
      : clean.replace(/\./g, '');
  const value = parseFloat(normalized);
  return isNaN(value) ? 0 : value;
};

const formatCurrencyInput = (value: number): string =>
  value > 0 ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

interface CurrencyInputProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  readOnly?: boolean;
  required?: boolean;
  ariaLabel?: string;
  className?: string;
}

/**
 * Campo de valor em reais só por digitação: sem setas, sem validação de "step" do navegador
 * e sem a rolagem do mouse alterando o valor. Formata no padrão brasileiro ao sair do campo.
 */
export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  id,
  value,
  onChange,
  readOnly,
  required,
  ariaLabel,
  className = '',
}) => {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className={`relative ${className}`}>
      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 dark:text-slate-400 text-sm">
        R$
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={ariaLabel}
        readOnly={readOnly}
        required={required}
        placeholder="0,00"
        value={draft ?? formatCurrencyInput(value)}
        onFocus={(e) => {
          if (readOnly) return;
          setDraft(formatCurrencyInput(value));
          e.target.select();
        }}
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(parseCurrencyInput(e.target.value));
        }}
        onBlur={() => setDraft(null)}
        className="w-full h-10 pl-10 pr-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-right text-base font-semibold font-num tabular-nums text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 read-only:cursor-not-allowed read-only:text-slate-500 dark:read-only:text-slate-400 read-only:bg-slate-50 dark:read-only:bg-slate-900"
      />
    </div>
  );
};
