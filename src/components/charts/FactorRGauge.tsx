import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { arcPath, clamp } from '../../utils/chartGeometry';
import { formatPercent } from '../../utils/taxCalculations';
import { DURATION, EASE_OUT, instantIf } from '../../utils/motion';
import { AnimatedNumber } from '../ui/AnimatedNumber';

const GAUGE_MAX = 40;

const SIZES = {
  sm: { w: 76, stroke: 7, showValue: false },
  lg: { w: 220, stroke: 14, showValue: true },
} as const;

// Meio círculo de 0% a 40% com a meta (28%) marcada; o arco cheio corre até o valor
export const FactorRGauge: React.FC<{ value: number; threshold?: number; size?: 'sm' | 'lg' }> = ({
  value,
  threshold = 28,
  size = 'lg',
}) => {
  const reduceMotion = Boolean(useReducedMotion());
  const { w, stroke, showValue } = SIZES[size];
  const r = (w - stroke) / 2;
  const cx = w / 2;
  const cy = r + stroke / 2;
  const h = cy + stroke / 2;
  const safe = Number.isFinite(value) ? value : 0;
  const frac = clamp(safe, 0, GAUGE_MAX) / GAUGE_MAX;
  const ok = safe >= threshold;
  const arc = arcPath(cx, cy, r, 180, 360);

  // Marca da meta atravessando o arco
  const tAng = ((180 + (180 * threshold) / GAUGE_MAX) * Math.PI) / 180;
  const tIn = r - stroke / 2 - 3;
  const tOut = r + stroke / 2 + 3;

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: w }}>
      <svg
        width={w}
        height={h + 4}
        viewBox={`0 -2 ${w} ${h + 4}`}
        role="img"
        aria-label={`Fator R ${formatPercent(safe)}, meta de ${threshold}%`}
        className="overflow-visible"
      >
        <path d={arc} fill="none" strokeWidth={stroke} strokeLinecap="round" className="stroke-slate-200 dark:stroke-slate-800" />
        <motion.path
          d={arc}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={`transition-colors ${ok ? 'stroke-emerald-500 dark:stroke-emerald-400' : 'stroke-rose-500 dark:stroke-rose-400'}`}
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: Math.max(frac, 0.001) }}
          transition={instantIf(reduceMotion, { duration: DURATION.chart, ease: EASE_OUT })}
        />
        <line
          x1={cx + tIn * Math.cos(tAng)}
          y1={cy + tIn * Math.sin(tAng)}
          x2={cx + tOut * Math.cos(tAng)}
          y2={cy + tOut * Math.sin(tAng)}
          strokeWidth={2}
          strokeLinecap="round"
          className="stroke-slate-900 dark:stroke-white"
        />
      </svg>
      {showValue && (
        <div className="absolute bottom-0 flex flex-col items-center">
          <AnimatedNumber
            value={safe}
            format={formatPercent}
            className={`text-3xl font-bold font-num tracking-tight ${ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
          />
          <span className="text-[11px] text-slate-500 dark:text-slate-400">meta {threshold}%</span>
        </div>
      )}
    </div>
  );
};
