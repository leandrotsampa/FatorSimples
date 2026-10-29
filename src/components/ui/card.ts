// Superfície padrão dos blocos: branca sobre o fundo verde-acinzentado, com sombra que a destaca;
// no escuro, um degrau acima da noite com borda fina e a aresta de cima levemente iluminada
export const card =
  'bg-white dark:bg-slate-900 border border-slate-900/[0.06] dark:border-white/[0.06] rounded-[22px] shadow-[0_1px_2px_rgba(16,40,28,0.05),0_16px_40px_-20px_rgba(16,60,40,0.24)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_40px_-24px_rgba(0,0,0,0.7)] transition-colors';

// Bloco interno (indicador dentro de um card)
export const tile = 'bg-slate-50 ring-1 ring-inset ring-slate-900/[0.07] dark:bg-slate-950/60 dark:ring-white/[0.05] rounded-2xl';

// Botões: ação principal (verde, com sombra na cor) e secundária. A secundária, no claro, é branca
// com borda e sombra leve (o cinza claro sumia no fundo); no escuro, um degrau acima do cartão
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-[0_8px_20px_-10px_rgba(5,150,105,0.8)] dark:shadow-[0_8px_20px_-12px_rgba(16,185,129,0.6)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer transition-colors';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-white border border-slate-300/90 shadow-[0_1px_2px_rgba(16,40,28,0.08)] hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 text-slate-800 dark:bg-slate-800 dark:border-white/[0.06] dark:shadow-none dark:hover:bg-slate-700 dark:text-slate-100 dark:hover:text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors';

// Opção que se escolhe numa fileira (regra do pró-labore, tema): escolhida, cheia na cor; as outras,
// como o botão secundário, para parecerem clicáveis. Tamanho e texto ficam com quem usa
export const chip = (active: boolean) =>
  `rounded-full border font-semibold transition-colors cursor-pointer ${
    active
      ? 'bg-emerald-600 border-emerald-600 text-white shadow-[0_6px_14px_-8px_rgba(5,150,105,0.8)]'
      : 'bg-white border-slate-300/90 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900 dark:bg-slate-800 dark:border-white/[0.06] dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white'
  }`;

// Campo de texto padrão: alto, cantos suaves, anel verde no foco
export const inputBase =
  'w-full h-11 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 transition-shadow';

// Painel dos modais: cantos largos, borda fina e sombra profunda, nos dois temas
export const modalPanel =
  'bg-white dark:bg-slate-900 rounded-[28px] ring-1 ring-slate-900/[0.06] dark:ring-white/[0.07] shadow-[0_30px_80px_-30px_rgba(10,40,30,0.55)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_30px_80px_-30px_rgba(0,0,0,0.9)] text-slate-800 dark:text-slate-100';
