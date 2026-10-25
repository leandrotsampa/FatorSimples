// Abaixo desta largura o menu lateral fica recolhido e expandir abre por cima do conteúdo.
// Fica abaixo da largura mínima da janela do Electron (980px): no app desktop o menu expandido
// sempre empurra o conteúdo e continua aberto ao escolher uma opção (notebooks com escala de
// 125%/150% deixam a janela com menos de 1100px úteis)
export const SIDEBAR_COLLAPSE_BELOW = 900;

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
