// Monograma da empresa no topo: iniciais das duas primeiras palavras que contam
// (sem tipo societário nem preposições); uma palavra só usa as duas primeiras letras
const IGNORED = new Set(['ltda', 'me', 'epp', 'eireli', 'sa', 's/a', 'ss', 'slu', 'da', 'de', 'do', 'das', 'dos', 'e']);

export function companyInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => w && !IGNORED.has(w.toLowerCase()));
  if (words.length === 0) return 'FS';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
