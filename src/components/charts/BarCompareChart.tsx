import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { linearScale, niceTicks, validIndex } from '../../utils/chartGeometry';
import { DURATION, EASE_OUT, instantIf } from '../../utils/motion';
import { ChartTooltip } from './ChartTooltip';

interface BarSeries {
  label: string;
  values: number[];
}

const PAD = { left: 64, right: 12, top: 10, bottom: 26 };

// Barras agrupadas por mês (a × b) que crescem de baixo para cima; o tooltip mostra a diferença
export const BarCompareChart: React.FC<{
  labels: string[];
  a: BarSeries;
  b: BarSeries;
  format: (n: number) => string;
  formatAxis?: (n: number) => string;
  height?: number;
}> = ({ labels, a, b, format, formatAxis = format, height = 220 }) => {
  const reduceMotion = Boolean(useReducedMotion());
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [rawHover, setHover] = useState<number | null>(null);

  const n = labels.length;
  const hasData = n > 0;
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasData]);

  const hover = validIndex(rawHover, n);
  if (n === 0) return null;
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const bottom = height - PAD.bottom;
  const safe = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);
  const max = Math.max(0, ...a.values.map(safe), ...b.values.map(safe));
  const ticks = niceTicks(max, 4);
  const y = linearScale([0, ticks[ticks.length - 1] || 1], [bottom, PAD.top]);
  const slot = n > 0 ? innerW / n : 0;
  const barW = Math.max(3, Math.min(22, slot * 0.3));
  const gap = Math.min(4, barW * 0.25);

  const bar = (v: number, x: number, i: number, cls: string) => {
    const h = bottom - y(safe(v));
    return (
      <motion.rect
        x={x}
        width={barW}
        rx={Math.min(4, barW / 2)}
        className={cls}
        initial={reduceMotion ? false : { y: bottom, height: 0 }}
        animate={{ y: bottom - h, height: h }}
        transition={instantIf(reduceMotion, { duration: DURATION.chart, ease: EASE_OUT, delay: i * 0.03 })}
      />
    );
  };

  return (
    <div ref={boxRef} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible" aria-hidden="true">
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={PAD.left + innerW}
                y1={y(t)}
                y2={y(t)}
                className="stroke-slate-200/80 dark:stroke-white/5"
                strokeDasharray={t === 0 ? undefined : '3 4'}
              />
              <text x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-slate-500 dark:fill-slate-400 text-[10px] font-num">
                {formatAxis(t)}
              </text>
            </g>
          ))}
          {labels.map((l, i) => {
            const cx = PAD.left + slot * (i + 0.5);
            return (
              <g key={`${l}-${i}`}>
                {hover === i && (
                  <rect x={cx - slot / 2 + 2} y={PAD.top} width={slot - 4} height={bottom - PAD.top} rx={8} className="fill-slate-100 dark:fill-white/5" />
                )}
                <g key={`${labels.join('|')}-${i}`}>
                  {bar(a.values[i], cx - barW - gap / 2, i, 'fill-emerald-500 dark:fill-emerald-400')}
                  {bar(b.values[i], cx + gap / 2, i, 'fill-slate-300 dark:fill-slate-600')}
                </g>
                <text x={cx} y={height - 8} textAnchor="middle" className="fill-slate-500 dark:fill-slate-400 text-[10px] font-num">
                  {l}
                </text>
                <rect
                  x={cx - slot / 2}
                  y={PAD.top}
                  width={slot}
                  height={bottom - PAD.top}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                />
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && width > 0 && (
        <ChartTooltip x={PAD.left + slot * (hover + 0.5)} y={(PAD.top + bottom) / 2} containerWidth={width}>
          <div className="font-semibold text-slate-900 dark:text-white mb-1">{labels[hover]}</div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {a.label}
            </span>
            <span className="font-num font-semibold text-slate-900 dark:text-white">{format(a.values[hover] ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              {b.label}
            </span>
            <span className="font-num font-semibold text-slate-900 dark:text-white">{format(b.values[hover] ?? 0)}</span>
          </div>
          {(() => {
            const diff = (b.values[hover] ?? 0) - (a.values[hover] ?? 0);
            return (
              <div className="flex items-center justify-between gap-4 mt-1 pt-1 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">{diff >= 0 ? 'Economia' : 'Pagou a mais'}</span>
                <span className={`font-num font-bold ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {format(Math.abs(diff))}
                </span>
              </div>
            );
          })()}
        </ChartTooltip>
      )}
    </div>
  );
};
