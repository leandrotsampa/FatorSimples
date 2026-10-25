import { useEffect, useRef, useState } from 'react';
import { easeOutCubic, lerp, prefersReducedMotion } from '../utils/motion';

// Valor exibido num instante da contagem; no fim devolve exatamente o alvo
export function countUpFrame(from: number, to: number, elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0 || elapsedMs >= durationMs) return to;
  return lerp(from, to, easeOutCubic(Math.max(0, elapsedMs) / durationMs));
}

// Número que conta até `value`. Se o valor mudar no meio (ex.: digitando o faturamento),
// recomeça a partir do que está na tela, nunca do zero.
export function useCountUp(value: number, durationMs = 450): number {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0));
  const shownRef = useRef(shown);

  useEffect(() => {
    if (prefersReducedMotion()) {
      shownRef.current = value;
      setShown(value);
      return;
    }
    const from = shownRef.current;
    if (from === value) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const v = countUpFrame(from, value, now - start, durationMs);
      shownRef.current = v;
      setShown(v);
      if (v !== value) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return shown;
}
