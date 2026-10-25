import React from 'react';
import { useCountUp } from '../../hooks/useCountUp';

// Número que conta até o valor; o texto final é sempre exatamente format(value)
export const AnimatedNumber: React.FC<{ value: number; format: (n: number) => string; className?: string }> = ({
  value,
  format,
  className,
}) => {
  const shown = useCountUp(value);
  return <span className={className}>{format(shown)}</span>;
};
