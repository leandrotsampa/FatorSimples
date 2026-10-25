import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

// Copia um valor pronto para colar (nota fiscal, banco) e confirma por um instante
export const CopyButton: React.FC<{ text: string; label: string; className?: string }> = ({ text, label, className = '' }) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Sem permissão da área de transferência: cópia pelo jeito antigo
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label}: copiado` : `Copiar ${label}`}
      title={copied ? 'Copiado' : `Copiar ${text}`}
      className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
        copied
          ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
      } ${className}`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      <span aria-live="polite">{copied ? 'Copiado' : 'Copiar'}</span>
    </button>
  );
};
