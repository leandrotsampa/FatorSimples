// Tema ao abrir: a escolha salva da pessoa; na primeira vez, o claro
export function resolveInitialTheme(saved: string | null): 'dark' | 'light' {
  return saved === 'dark' ? 'dark' : 'light';
}
