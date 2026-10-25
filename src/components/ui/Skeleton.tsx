import React from 'react';
import { card } from './card';

// Bloco cinza com brilho passando, no lugar do conteúdo enquanto os dados carregam
export const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton rounded-lg ${className}`} />
);

// Esqueleto de uma tela: cabeçalho, faixa de entrada e três cards
export const PageSkeleton: React.FC = () => (
  <div className="space-y-5" aria-busy="true" aria-label="Carregando dados">
    <div className="space-y-2">
      <SkeletonBlock className="h-3 w-40" />
      <SkeletonBlock className="h-8 w-72" />
      <SkeletonBlock className="h-4 w-96 max-w-full" />
    </div>
    <div className={`${card} p-5`}>
      <SkeletonBlock className="h-10 w-full" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`${card} p-5 space-y-3`}>
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-8 w-40" />
          <SkeletonBlock className="h-3 w-32" />
        </div>
      ))}
    </div>
  </div>
);
