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

describe('preferências do app guardadas no banco', () => {
  it('tema: só claro ou escuro', () => {
    expect(appStateEntryFor('theme', 'dark')).toEqual({ key: 'theme', value: 'dark' });
    expect(appStateEntryFor('theme', 'light')).toEqual({ key: 'theme', value: 'light' });
    expect(appStateEntryFor('theme', 'roxo')).toBeNull();
  });

  it('sons e menu: texto curto', () => {
    expect(appStateEntryFor('uiPrefs', '{"soundEnabled":true}')).toEqual({ key: 'uiPrefs', value: '{"soundEnabled":true}' });
    expect(appStateEntryFor('uiPrefs', 'x'.repeat(5000))).toBeNull();
  });

  it('versão ignorada: só número de versão', () => {
    expect(appStateEntryFor('ignoredVersion', '1.4.1')).toEqual({ key: 'ignoredVersion', value: '1.4.1' });
    expect(appStateEntryFor('ignoredVersion', '<script>')).toBeNull();
  });
});
