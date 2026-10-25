import { afterEach, describe, expect, it, vi } from 'vitest';
import { runThemeWipe, wipeRadius } from './themeTransition';

type FakeTransition = { ready: Promise<void>; finished: Promise<void>; skipTransition: ReturnType<typeof vi.fn> };

function installFakeDocument(withViewTransitions: boolean) {
  const transitions: FakeTransition[] = [];
  const animate = vi.fn();
  const doc: Record<string, unknown> = {
    documentElement: { clientWidth: 1000, clientHeight: 800, animate },
  };
  if (withViewTransitions) {
    doc.startViewTransition = vi.fn((cb: () => void) => {
      cb();
      const t: FakeTransition = {
        ready: Promise.resolve(),
        finished: new Promise(() => {}),
        skipTransition: vi.fn(),
      };
      transitions.push(t);
      return t;
    });
  }
  vi.stubGlobal('document', doc);
  return { doc, transitions, animate };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('wipeRadius', () => {
  it('cobre a tela inteira a partir de um canto', () => {
    expect(wipeRadius(0, 0, 100, 100)).toBeCloseTo(141.42, 2);
  });

  it('cobre a tela inteira a partir do centro', () => {
    expect(wipeRadius(50, 50, 100, 100)).toBeCloseTo(70.71, 2);
  });
});

describe('runThemeWipe', () => {
  it('sem View Transitions aplica o tema uma vez, na hora', () => {
    installFakeDocument(false);
    const apply = vi.fn();
    runThemeWipe(null, apply);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('com uma transição em andamento, pula a anterior antes de começar outra', () => {
    const { transitions } = installFakeDocument(true);
    const apply = vi.fn();
    runThemeWipe(null, apply);
    runThemeWipe(null, apply);
    expect(transitions).toHaveLength(2);
    expect(transitions[0].skipTransition).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledTimes(2);
  });

  it('anima o círculo a partir do centro do botão de origem', async () => {
    const { animate } = installFakeDocument(true);
    const origin = { getBoundingClientRect: () => ({ left: 10, top: 700, width: 20, height: 20 }) } as unknown as HTMLElement;
    runThemeWipe(origin, () => {});
    await Promise.resolve();
    await Promise.resolve();
    const [keyframes, options] = animate.mock.calls[0];
    expect(keyframes.clipPath[0]).toBe('circle(0px at 20px 710px)');
    expect(options.pseudoElement).toBe('::view-transition-new(root)');
    expect(options.duration).toBe(600);
  });
});
