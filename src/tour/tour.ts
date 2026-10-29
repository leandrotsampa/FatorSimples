// O driver.js (e o CSS dele) só carrega quando um tutorial abre: não pesa na abertura do app
import type { DriveStep, Driver } from 'driver.js';

// Passos do tutorial por tela. Na do mês, a ordem do uso real: mês → faturamento → nota → transferências →
// Fator R → fechar. O id é o que fica marcado como visto; passo com id novo numa versão futura aparece
// sozinho como novidade (ids já publicados nunca mudam).
interface TourStep {
  id: string;
  title: string;
  description: (ctx: { demoRevenue: boolean }) => string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

const APURATION_STEPS: TourStep[] = [
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
    description: () =>
      'Em qualquer tela, este botão mostra o passo a passo dela. Cada tela também se apresenta na primeira vez que você entra.',
    side: 'right',
    align: 'end',
  },
];


const HISTORY_STEPS: TourStep[] = [
  {
    id: 'hist-importar',
    title: 'Importe a declaração do Simples',
    description: () =>
      'Com o PDF do <b>PGDAS-D</b> que a contabilidade envia, o app traz a empresa, o faturamento e a folha dos meses anteriores e o DAS. O relatório de pagamentos da Receita completa com o DAS e o DARF pagos.',
    side: 'bottom',
    align: 'end',
  },
  {
    id: 'hist-adicionar',
    title: 'Cadastre os meses anteriores',
    description: () =>
      'Lance o faturamento e o pró-labore dos meses passados (até 12). Sem eles, a alíquota e o Fator R usam só o mês atual e podem sair diferentes do PGDAS.',
    side: 'bottom',
    align: 'end',
  },
  {
    id: 'hist-metricas',
    title: 'Resumo e tendência',
    description: () => 'Os totais dos últimos 12 meses e como o faturamento, a folha e o Fator R vêm evoluindo.',
    side: 'bottom',
    align: 'start',
  },
  {
    id: 'hist-tabela',
    title: 'Seus meses salvos',
    description: () =>
      'Cada linha é um mês fechado. Use o <b>lápis</b> para corrigir e a <b>lixeira</b> para excluir. Mês com Fator R abaixo de 28% ganha um aviso.',
    side: 'top',
    align: 'start',
  },
];

const COMPARISON_STEPS: TourStep[] = [
  {
    id: 'cmp-resultado',
    title: 'Quanto o Fator R já economizou',
    description: () =>
      'Os impostos que você pagou nos meses do histórico comparados com o que pagaria sem o Fator R (Anexo V). O quadro se preenche conforme você salva os meses.',
    side: 'bottom',
    align: 'start',
  },
  {
    id: 'cmp-folga',
    title: 'A folga deste mês',
    description: () => 'Quanto o pró-labore pode baixar, ou o faturamento subir, sem perder os 28%.',
    side: 'top',
    align: 'start',
  },
  {
    id: 'cmp-simulador',
    title: 'Simule outros valores',
    description: () => 'Arraste para ver, com outro faturamento, qual caminho sai mais barato e quanto sobra para você.',
    side: 'top',
    align: 'start',
  },
];

const REPORT_STEPS: TourStep[] = [
  {
    id: 'rel-folha',
    title: 'O mês numa folha só',
    description: () =>
      'Alíquota, DAS, pró-labore, transferências e a memória de cálculo. Serve para conferir ou mandar para a contabilidade.',
    side: 'bottom',
    align: 'start',
  },
  {
    id: 'rel-imprimir',
    title: 'Imprimir ou salvar em PDF',
    description: () => 'Abre a impressão do sistema. Para guardar o arquivo, escolha <b>Salvar como PDF</b>.',
    side: 'bottom',
    align: 'end',
  },
];

const SETTINGS_STEPS: TourStep[] = [
  {
    id: 'cfg-empresa',
    title: 'Empresa e contabilidade',
    description: () =>
      'Razão social, CNPJ e cidade aparecem no topo e no Resumo. Aqui também ficam os <b>honorários da contabilidade</b>, que entram no que fica na conta da empresa.',
    side: 'bottom',
    align: 'center',
  },
  {
    id: 'cfg-tabelas',
    title: 'Tabelas fiscais',
    description: () =>
      'INSS, IR e salário mínimo de cada ano. O app procura tabelas novas sozinho; o botão de verificar faz isso na hora.',
    side: 'bottom',
    align: 'start',
  },
  {
    id: 'cfg-interface',
    title: 'Do seu jeito',
    description: () => 'Sons, animações e o comportamento do menu lateral.',
    side: 'bottom',
    align: 'end',
  },
];

export type TourScreen = 'apuration' | 'history' | 'comparison' | 'report' | 'settings';

export const TOUR_SCREENS: Record<TourScreen, TourStep[]> = {
  apuration: APURATION_STEPS,
  history: HISTORY_STEPS,
  comparison: COMPARISON_STEPS,
  report: REPORT_STEPS,
  settings: SETTINGS_STEPS,
};

export const screenStepIds = (screen: TourScreen) => TOUR_SCREENS[screen].map((s) => s.id);
export const ALL_TOUR_STEP_IDS = Object.values(TOUR_SCREENS).flat().map((s) => s.id);



/**
 * Roda o tutorial com os passos pedidos (todos, ou só as novidades). Passo cujo elemento não está
 * na tela é pulado. onDone recebe os ids mostrados, para marcar como vistos.
 */
export async function runTour(opts: {
  screen: TourScreen;
  ids?: string[];
  news?: boolean;
  demoRevenue: boolean;
  reduceMotion: boolean;
  onDone: (ids: string[]) => void;
}) {
  const chosen = TOUR_SCREENS[opts.screen].filter((s) => !opts.ids || opts.ids.includes(s.id));
  if (chosen.length === 0 || starting) return;
  starting = true;
  const [{ driver }] = await Promise.all([import('driver.js'), import('driver.js/dist/driver.css')]).finally(() => {
    starting = false;
  });

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
  current = tour;
  tour.drive();
  return tour;
}

// Um tutorial por vez: a entrada numa tela não abre outro por cima do que está rodando (nem enquanto carrega)
let current: Driver | null = null;
let starting = false;
export const isTourRunning = () => starting || (current?.isActive() ?? false);
