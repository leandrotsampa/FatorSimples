// O que o tutorial já mostrou: boas-vindas feitas e os passos vistos (por id).
// Passo com id novo numa versão futura aparece sozinho, como novidade.
export interface TourState {
  welcomed: boolean;
  seen: string[];
}

export const emptyTourState: TourState = { welcomed: false, seen: [] };

export type TourPlan = { kind: 'welcome' } | { kind: 'news'; ids: string[] } | { kind: 'none' };

export function planTour(stepIds: string[], state: TourState): TourPlan {
  if (!state.welcomed) return { kind: 'welcome' };
  const unseen = stepIds.filter((id) => !state.seen.includes(id));
  return unseen.length > 0 ? { kind: 'news', ids: unseen } : { kind: 'none' };
}

// Ao entrar numa tela: primeira vez mostra os passos dela; depois, só passos novos.
// Antes das boas-vindas nada aparece (a primeira abertura decide se a pessoa quer o tutorial)
export type ScreenTourPlan = { kind: 'intro' | 'news'; ids: string[] } | { kind: 'none' };

export function planScreenTour(screenIds: string[], state: TourState): ScreenTourPlan {
  if (!state.welcomed) return { kind: 'none' };
  const unseen = screenIds.filter((id) => !state.seen.includes(id));
  if (unseen.length === 0) return { kind: 'none' };
  return { kind: unseen.length < screenIds.length ? 'news' : 'intro', ids: unseen };
}

// Terminou (ou fechou) o tour: estes passos não voltam sozinhos
export function completeTour(state: TourState, ids: string[]): TourState {
  return { welcomed: true, seen: [...new Set([...state.seen, ...ids])] };
}

// "Explorar sozinho": conta como visto, para só as novidades futuras aparecerem
export const skipTour = completeTour;

export function parseTourState(raw: string | null): TourState {
  if (!raw) return emptyTourState;
  try {
    const v = JSON.parse(raw);
    if (typeof v?.welcomed !== 'boolean' || !Array.isArray(v.seen)) return emptyTourState;
    return { welcomed: v.welcomed, seen: v.seen.filter((s: unknown): s is string => typeof s === 'string') };
  } catch {
    return emptyTourState;
  }
}

// Registro antigo (versões até 1.3.2): ficava no armazenamento interno do app, fora do banco
const LEGACY_KEY = 'fatorsimples_tour_v1';
// Chave no banco (tabela app_state), junto com os dados: banco novo traz o tutorial de volta
const DB_KEY = 'tour';

// O banco manda; o registro antigo só vale (e é migrado) enquanto o banco ainda não tem o seu
export function resolveStoredTourState(
  dbRaw: string | null,
  legacyRaw: string | null
): { state: TourState; migrate: boolean } {
  if (dbRaw != null) return { state: parseTourState(dbRaw), migrate: false };
  if (legacyRaw != null) return { state: parseTourState(legacyRaw), migrate: true };
  return { state: emptyTourState, migrate: false };
}

const readLegacy = () => {
  try {
    return localStorage.getItem(LEGACY_KEY);
  } catch {
    return null;
  }
};

// Cópia em memória: carregada uma vez na abertura; cada mudança vai para o banco
let cache: TourState = emptyTourState;

export async function initTourState(): Promise<void> {
  const api = window.electronAPI;
  if (!api?.getAppState || !api.setAppState) {
    // Navegador: continua no armazenamento do navegador
    cache = parseTourState(readLegacy());
    return;
  }
  const { state, migrate } = resolveStoredTourState(await api.getAppState(DB_KEY).catch(() => null), readLegacy());
  cache = state;
  if (migrate) {
    await api.setAppState(DB_KEY, JSON.stringify(state)).catch(() => undefined);
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      // sem armazenamento: nada a limpar
    }
  }
}

export function loadTourState(): TourState {
  return cache;
}

export function saveTourState(state: TourState) {
  cache = state;
  const api = window.electronAPI;
  if (api?.setAppState) {
    void api.setAppState(DB_KEY, JSON.stringify(state)).catch(() => undefined);
    return;
  }
  try {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(state));
  } catch {
    // Sem armazenamento: o tutorial só volta a aparecer na próxima abertura
  }
}
