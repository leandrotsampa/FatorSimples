import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

// Passos do tutorial, na ordem do uso real: mês → faturamento → nota → transferências → Fator R → fechar.
// O id é o que fica marcado como visto; passo com id novo numa versão futura aparece sozinho como novidade.
interface TourStep {
  id: string;
  title: string;
  description: (ctx: { demoRevenue: boolean }) => string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'competencia',
    title: 'Escolha o mês',
    description: () =>
      'Aqui fica o mês que você está calculando (a <b>competência</b>). Use as setas ou clique no nome para trocar.',
    side: 'right',
    align: 'start',
  },
  {
    id: 'faturamento',
    title: 'Quanto a empresa recebeu',
    description: ({ demoRevenue }) =>
      'Some o valor bruto de todas as notas do mês e digite o total aqui. O resto o app calcula na hora.' +
      (demoRevenue ? '<br><span class="fs-tour-note">Coloquei R$ 20.000,00 só para mostrar; ao terminar volta a zero.</span>' : ''),
    side: 'bottom',
    align: 'start',
  },
  {
    id: 'aliquota',
    title: 'A alíquota que vai na nota',
    description: () =>
      'É o percentual do Simples (já com o ISS) para informar na nota fiscal. O botão <b>Copiar</b> deixa o número pronto para colar.',
    side: 'bottom',
    align: 'start',
  },
  {
    id: 'transferencias',
    title: 'As transferências do mês',
    description: () =>
      'Quanto mandar para a sua conta pessoal: o <b>pró-labore líquido</b> e a <b>antecipação de lucros</b>. O que fica na conta da empresa paga o DAS, o INSS, o IRRF e a contabilidade.',
    side: 'top',
    align: 'start',
  },
  {
    id: 'fator-r',
    title: 'Fator R: pagar menos imposto',
    description: () =>
      'Com o pró-labore em pelo menos 28% do faturamento, a empresa paga pelo Anexo III, mais barato. Aqui você vê se está garantido e, se houver folga, pode tirá-la com um clique.',
    side: 'bottom',
    align: 'end',
  },
  {
    id: 'nav-history',
    title: 'Feche o mês no Histórico',
    description: () =>
      'Depois de conferir, clique em <b>Salvar mês</b>. Cadastre também os meses anteriores: a alíquota e o Fator R dependem dos últimos 12 meses.',
    side: 'right',
    align: 'center',
  },
  {
    id: 'como-usar',
    title: 'Quando quiser rever',
    description: () => 'Este passo a passo fica aqui. Novidades de versões futuras aparecem sozinhas, uma vez só.',
    side: 'right',
    align: 'end',
  },
];

export const TOUR_STEP_IDS = TOUR_STEPS.map((s) => s.id);

/**
 * Roda o tutorial com os passos pedidos (todos, ou só as novidades). Passo cujo elemento não está
 * na tela é pulado. onDone recebe os ids mostrados, para marcar como vistos.
 */
export function runTour(opts: {
  ids?: string[];
  news?: boolean;
  demoRevenue: boolean;
  reduceMotion: boolean;
  onDone: (ids: string[]) => void;
}) {
  const chosen = TOUR_STEPS.filter((s) => !opts.ids || opts.ids.includes(s.id));
  if (chosen.length === 0) return;

  const steps: DriveStep[] = chosen.map((s) => ({
    element: `[data-tour="${s.id}"]`,
    skipMissingElement: true,
    waitForElement: 1200,
    popover: {
      title: opts.news ? `Novidade · ${s.title}` : s.title,
      description: s.description({ demoRevenue: opts.demoRevenue }),
      side: s.side,
      align: s.align,
    },
  }));

  const tour = driver({
    steps,
    animate: !opts.reduceMotion,
    smoothScroll: !opts.reduceMotion,
    showProgress: chosen.length > 1,
    progressText: '{{current}} de {{total}}',
    nextBtnText: 'Próximo',
    prevBtnText: 'Voltar',
    doneBtnText: chosen.length > 1 ? 'Concluir' : 'Entendi',
    closeBtnLabel: 'Fechar o tutorial',
    popoverClass: 'fs-tour',
    overlayColor: 'rgb(6 10 8)',
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 16,
    popoverOffset: 12,
    allowKeyboardControl: true,
    overlayClickBehavior: 'none',
    onDestroyed: () => opts.onDone(chosen.map((s) => s.id)),
  });
  tour.drive();
  return tour;
}
