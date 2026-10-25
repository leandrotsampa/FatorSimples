// Texto copiado para colar em outro sistema (nota fiscal, banco): sem "R$" e sem "%"
export function formatForCopy(value: number, kind: 'percent' | 'money'): string {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: kind === 'money',
  });
}
