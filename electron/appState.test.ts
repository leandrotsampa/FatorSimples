import { describe, expect, it } from 'vitest';
import { appStateEntryFor } from './appState.cjs';

describe('estado do app guardado no banco', () => {
  it('aceita a chave do tutorial com um texto', () => {
    expect(appStateEntryFor('tour', '{"welcomed":true,"seen":[]}')).toEqual({ key: 'tour', value: '{"welcomed":true,"seen":[]}' });
  });

  it('recusa chave desconhecida vinda da página', () => {
    expect(appStateEntryFor('tax_settings', 'x')).toBeNull();
    expect(appStateEntryFor(undefined, 'x')).toBeNull();
  });

  it('recusa valor que não é texto ou é grande demais', () => {
    expect(appStateEntryFor('tour', { welcomed: true })).toBeNull();
    expect(appStateEntryFor('tour', 'x'.repeat(70_000))).toBeNull();
  });
});
