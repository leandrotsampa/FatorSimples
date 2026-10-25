import { describe, expect, it } from 'vitest';
import { portableDirectoryFor } from './dataDirectory.cjs';

const base = {
  env: {},
  platform: 'win32',
  isPackaged: true,
  exePath: 'C:\\Programas\\FatorSimples\\FatorSimples.exe',
  cwd: 'C:\\projeto',
};

describe('onde o banco fica', () => {
  it('Windows portátil: ao lado do .exe que a pessoa abriu (não na cópia temporária)', () => {
    expect(portableDirectoryFor({ ...base, env: { PORTABLE_EXECUTABLE_DIR: 'D:\\Meus\\FatorSimples' } })).toBe(
      'D:\\Meus\\FatorSimples'
    );
  });

  it('Windows instalado: na pasta de dados do usuário, para atualizar ou desinstalar sem perder nada', () => {
    expect(portableDirectoryFor(base)).toBeNull();
  });

  it('Linux AppImage: ao lado do arquivo .AppImage', () => {
    expect(
      portableDirectoryFor({ ...base, platform: 'linux', env: { APPIMAGE: '/home/eu/apps/FatorSimples.AppImage' } })
    ).toBe('/home/eu/apps');
  });

  it('macOS: na pasta de dados do usuário', () => {
    expect(
      portableDirectoryFor({ ...base, platform: 'darwin', exePath: '/Applications/FatorSimples.app/Contents/MacOS/FatorSimples' })
    ).toBeNull();
  });

  it('em desenvolvimento: na pasta do projeto', () => {
    expect(portableDirectoryFor({ ...base, isPackaged: false })).toBe('C:\\projeto');
  });
});
