// Abaixo desta largura de janela o menu lateral fica recolhido em ícones
export const SIDEBAR_COLLAPSE_BELOW = 1100;

export type SidebarMode = 'expanded' | 'collapsed' | 'overlay';

// Em janela estreita a preferência salva não muda: o menu só recolhe, e expandir abre por cima do conteúdo
export function resolveSidebarMode(
  pref: 'expanded' | 'collapsed',
  windowWidth: number,
  overlayOpen: boolean
): SidebarMode {
  if (windowWidth < SIDEBAR_COLLAPSE_BELOW) return overlayOpen ? 'overlay' : 'collapsed';
  return pref;
}
