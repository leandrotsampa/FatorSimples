import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, schemaCheck } from './schemaVersion.cjs';

describe('versão da estrutura do banco', () => {
  it('banco novo ou de versões anteriores é atualizado', () => {
    expect(schemaCheck(0)).toBe('upgrade');
    expect(schemaCheck(SCHEMA_VERSION - 1)).toBe('upgrade');
  });

  it('banco da mesma versão abre normalmente', () => {
    expect(schemaCheck(SCHEMA_VERSION)).toBe('ok');
  });

  it('banco de uma versão mais nova do app não é aberto', () => {
    expect(schemaCheck(SCHEMA_VERSION + 1)).toBe('newer');
  });
});
