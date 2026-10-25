import React from 'react';
import { motion } from 'motion/react';
import { DURATION, EASE_OUT } from '../../utils/motion';

// Fundo + painel de modal com entrada e saída animadas.
// A saída depende de o modal ser montado dentro de um <AnimatePresence> (ver App.tsx).
export const ModalShell: React.FC<{ children: React.ReactNode; panelClassName: string }> = ({
  children,
  panelClassName,
}) => (
  <motion.div
    className="app-no-drag fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: DURATION.base, ease: EASE_OUT }}
  >
    <motion.div
      role="dialog"
      aria-modal="true"
      className={panelClassName}
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 8 }}
      transition={{ duration: DURATION.base, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  </motion.div>
);
