import { describe, expect, it } from 'vitest';
import { completeTour, emptyTourState, parseTourState, planScreenTour, planTour, resolveStoredTourState, skipTour } from './tourState';

const BASE = ['competencia', 'faturamento', 'aliquota'];

describe('o que o tutorial mostra ao abrir o app', () => {
  it('primeira vez: boas-vindas', () => {
    expect(planTour(BASE, emptyTourState)).toEqual({ kind: 'welcome' });
  });

  it('depois de fazer o tour inteiro: nada', () => {
    expect(planTour(BASE, completeTour(emptyTourState, BASE))).toEqual({ kind: 'none' });
  });

  it('quem pulou o tour também não vê de novo, mas recebe as novidades depois', () => {
    const pulou = skipTour(emptyTourState, BASE);
    expect(planTour(BASE, pulou)).toEqual({ kind: 'none' });
    expect(planTour([...BASE, 'tirar-folga'], pulou)).toEqual({ kind: 'news', ids: ['tirar-folga'] });
  });

  it('versão nova com um passo novo: mostra só o passo novo', () => {
    const visto = completeTour(emptyTourState, BASE);
    expect(planTour([...BASE, 'tirar-folga'], visto)).toEqual({ kind: 'news', ids: ['tirar-folga'] });
    expect(planTour([...BASE, 'tirar-folga'], completeTour(visto, ['tirar-folga']))).toEqual({ kind: 'none' });
  });

  it('estado salvo corrompido ou de outro formato volta ao início', () => {
    expect(parseTourState('não é json')).toEqual(emptyTourState);
    expect(parseTourState(JSON.stringify({ welcomed: 'sim', seen: 3 }))).toEqual(emptyTourState);
    expect(parseTourState(null)).toEqual(emptyTourState);
    expect(parseTourState(JSON.stringify({ welcomed: true, seen: ['a', 1, 'b'] }))).toEqual({ welcomed: true, seen: ['a', 'b'] });
  });
});

describe('mini-tutorial ao entrar numa tela', () => {
  const HIST = ['hist-adicionar', 'hist-tabela'];
  const welcomed = completeTour(emptyTourState, BASE);

  it('antes das boas-vindas não mostra nada (a primeira abertura cuida disso)', () => {
    expect(planScreenTour(HIST, emptyTourState)).toEqual({ kind: 'none' });
  });

  it('primeira vez na tela: apresentação com todos os passos dela', () => {
    expect(planScreenTour(HIST, welcomed)).toEqual({ kind: 'intro', ids: HIST });
  });

  it('tela já vista com um passo novo: só a novidade', () => {
    const viu = completeTour(welcomed, HIST);
    expect(planScreenTour([...HIST, 'hist-importar'], viu)).toEqual({ kind: 'news', ids: ['hist-importar'] });
    expect(planScreenTour(HIST, viu)).toEqual({ kind: 'none' });
  });

  it('quem escolheu explorar sozinho não recebe as apresentações das telas', () => {
    const pulou = skipTour(emptyTourState, [...BASE, ...HIST]);
    expect(planScreenTour(HIST, pulou)).toEqual({ kind: 'none' });
  });
});

describe('registro do tutorial guardado junto com os dados', () => {
  const visto = JSON.stringify({ welcomed: true, seen: ['competencia'] });

  it('o banco manda: se ele tem o registro, é esse que vale', () => {
    expect(resolveStoredTourState(visto, null)).toEqual({ state: { welcomed: true, seen: ['competencia'] }, migrate: false });
  });

  it('banco ainda sem registro e registro antigo no app: usa o antigo e migra para o banco', () => {
    expect(resolveStoredTourState(null, visto)).toEqual({ state: { welcomed: true, seen: ['competencia'] }, migrate: true });
  });

  it('banco novo (apagado) e nada antigo: o tutorial começa do zero', () => {
    expect(resolveStoredTourState(null, null)).toEqual({ state: emptyTourState, migrate: false });
  });

  it('com o banco já preenchido, o registro antigo é ignorado', () => {
    expect(resolveStoredTourState(JSON.stringify(emptyTourState), visto).state).toEqual(emptyTourState);
  });
});
