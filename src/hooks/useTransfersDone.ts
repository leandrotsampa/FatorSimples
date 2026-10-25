import { useState } from 'react';

// Transferências do mês já feitas (pró-labore, lucro), por competência. Preferência deste
// computador: fica no localStorage, como o tema
export type TransferKey = 'prolabore' | 'lucro';
type TransfersDone = Record<string, Partial<Record<TransferKey, boolean>>>;

const STORAGE_KEY = 'fatorsimples_transfers_done_v1';

export function parseTransfersDone(raw: string | null): TransfersDone {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: TransfersDone = {};
    for (const [ym, v] of Object.entries(parsed)) {
      if (!/^\d{4}-\d{2}$/.test(ym) || !v || typeof v !== 'object') continue;
      const entry: Partial<Record<TransferKey, boolean>> = {};
      for (const k of ['prolabore', 'lucro'] as const) {
        if (typeof (v as Record<string, unknown>)[k] === 'boolean') entry[k] = (v as Record<string, boolean>)[k];
      }
      out[ym] = entry;
    }
    return out;
  } catch {
    return {};
  }
}

export function toggleTransferDone(state: TransfersDone, yearMonth: string, key: TransferKey): TransfersDone {
  const current = state[yearMonth] ?? {};
  return { ...state, [yearMonth]: { ...current, [key]: !current[key] } };
}

export function useTransfersDone(yearMonth: string): [Partial<Record<TransferKey, boolean>>, (key: TransferKey) => void] {
  const [state, setState] = useState<TransfersDone>(() => {
    try {
      return parseTransfersDone(localStorage.getItem(STORAGE_KEY));
    } catch {
      return {};
    }
  });
  const toggle = (key: TransferKey) => {
    setState((prev) => {
      const next = toggleTransferDone(prev, yearMonth, key);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Fallback
      }
      return next;
    });
  };
  return [state[yearMonth] ?? {}, toggle];
}
