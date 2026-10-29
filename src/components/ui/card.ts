// Superfície padrão dos blocos: branca sobre o fundo verde-acinzentado, com sombra que a destaca;
// no escuro, um tom acima do fundo com borda fina e brilho sutil na aresta de cima
export const card =
  'bg-white dark:bg-slate-900 border border-slate-900/[0.06] dark:border-white/[0.07] rounded-2xl shadow-[0_1px_2px_rgba(16,24,20,0.06),0_14px_36px_-18px_rgba(16,40,28,0.22)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_40px_-24px_rgba(0,0,0,0.8)] transition-colors';

// Bloco interno (indicador dentro de um card)
export const tile = 'bg-slate-50 ring-1 ring-inset ring-slate-900/[0.04] dark:bg-slate-950/70 dark:ring-white/[0.04] rounded-xl';

// Botões: ação principal (verde) e secundária (contorno)
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm cursor-pointer transition-colors';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-sm cursor-pointer transition-colors';
