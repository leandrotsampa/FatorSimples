// Cores dos gráficos por tom, em classes Tailwind para acompanhar o tema claro/escuro.
// "color" alimenta o currentColor dos gradientes e das bolinhas.
export type ChartTone = 'emerald' | 'rose' | 'amber' | 'sky';

export const TONES: Record<ChartTone, { stroke: string; color: string; fill: string }> = {
  emerald: {
    stroke: 'stroke-emerald-500 dark:stroke-emerald-400',
    color: 'text-emerald-500 dark:text-emerald-400',
    fill: 'fill-emerald-500 dark:fill-emerald-400',
  },
  rose: {
    stroke: 'stroke-rose-500 dark:stroke-rose-400',
    color: 'text-rose-500 dark:text-rose-400',
    fill: 'fill-rose-500 dark:fill-rose-400',
  },
  amber: {
    stroke: 'stroke-amber-500 dark:stroke-amber-400',
    color: 'text-amber-500 dark:text-amber-400',
    fill: 'fill-amber-500 dark:fill-amber-400',
  },
  sky: {
    stroke: 'stroke-sky-500 dark:stroke-sky-400',
    color: 'text-sky-500 dark:text-sky-400',
    fill: 'fill-sky-500 dark:fill-sky-400',
  },
};
