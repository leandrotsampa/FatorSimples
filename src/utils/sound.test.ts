import { describe, expect, it } from 'vitest';
import { createSoundPlayer, crossedBelowTarget, soundRecipe, type SoundName } from './sound';
import { DEFAULT_UI_PREFS, type UiPrefs } from '../hooks/useUiPrefs';

const NAMES: SoundName[] = ['tick', 'whoosh', 'success', 'delete', 'warning'];

// AudioContext falso: registra osciladores criados e os valores de ganho agendados
function fakeAudio() {
  const created: number[] = [];
  const gainTargets: number[] = [];
  let contexts = 0;
  class FakeParam {
    value = 0;
    setValueAtTime(_v: number) {}
    linearRampToValueAtTime(_v: number) {}
    exponentialRampToValueAtTime(_v: number) {}
  }
  class FakeGainParam extends FakeParam {
    setValueAtTime(v: number) { gainTargets.push(v); }
    linearRampToValueAtTime(v: number) { gainTargets.push(v); }
    exponentialRampToValueAtTime(v: number) { gainTargets.push(v); }
  }
  class FakeNode {
    connect() { return this; }
    disconnect() {}
  }
  class FakeContext {
    currentTime = 0;
    state = 'running';
    destination = new FakeNode();
    constructor() { contexts++; }
    resume() { return Promise.resolve(); }
    createOscillator() {
      created.push(1);
      return Object.assign(new FakeNode(), {
        type: 'sine',
        frequency: new FakeParam(),
        start() {},
        stop() {},
      });
    }
    createGain() {
      return Object.assign(new FakeNode(), { gain: new FakeGainParam() });
    }
  }
  return { FakeContext, created, gainTargets, contexts: () => contexts };
}

describe('soundRecipe', () => {
  it('nenhum som passa de 150 ms nem de ganho 0,2', () => {
    for (const n of NAMES) {
      const r = soundRecipe(n);
      const end = Math.max(...r.notes.map((x) => x.startMs + x.durationMs));
      expect(end).toBeLessThanOrEqual(150);
      expect(r.peakGain).toBeLessThanOrEqual(0.2);
    }
  });
});

describe('createSoundPlayer', () => {
  it('com os sons desligados não cria contexto de áudio', () => {
    const a = fakeAudio();
    const p = createSoundPlayer(() => ({ ...DEFAULT_UI_PREFS, soundEnabled: false }), { AudioContext: a.FakeContext as never, now: () => 0 });
    p.play('success');
    expect(a.contexts()).toBe(0);
  });

  it('descarta o mesmo som repetido em menos de 60 ms', () => {
    const a = fakeAudio();
    let t = 0;
    const prefs: UiPrefs = { ...DEFAULT_UI_PREFS, soundEnabled: true };
    const p = createSoundPlayer(() => prefs, { AudioContext: a.FakeContext as never, now: () => t });
    p.play('tick');
    t = 30;
    p.play('tick');
    expect(a.created.length).toBe(1);
    t = 110;
    p.play('tick');
    expect(a.created.length).toBe(2);
  });

  it('aplica o volume escolhido sobre o ganho do som', () => {
    const a = fakeAudio();
    const prefs: UiPrefs = { ...DEFAULT_UI_PREFS, soundEnabled: true, soundVolume: 0.5 };
    const p = createSoundPlayer(() => prefs, { AudioContext: a.FakeContext as never, now: () => 0 });
    p.play('success');
    expect(Math.max(...a.gainTargets)).toBeCloseTo(soundRecipe('success').peakGain * 0.5, 6);
  });

  it('sem áudio no sistema fica em silêncio, sem erro', () => {
    const prefs: UiPrefs = { ...DEFAULT_UI_PREFS, soundEnabled: true };
    class Broken {
      constructor() { throw new Error('sem áudio'); }
    }
    const p = createSoundPlayer(() => prefs, { AudioContext: Broken as never, now: () => 0 });
    expect(() => p.play('tick')).not.toThrow();
  });
});

describe('crossedBelowTarget', () => {
  it('só avisa quando sai de "dentro da meta" para "fora"', () => {
    expect(crossedBelowTarget(null, false)).toBe(false);
    expect(crossedBelowTarget(true, false)).toBe(true);
    expect(crossedBelowTarget(false, false)).toBe(false);
    expect(crossedBelowTarget(false, true)).toBe(false);
  });
});
