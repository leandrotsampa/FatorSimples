// Texto de um PDF em linhas, como aparecem na página: os pedaços de uma mesma altura viram uma
// linha, da esquerda para a direita, separados por "|". O leitor (pdf.js) só carrega quando usado

export interface PdfTextItem {
  str: string;
  transform: number[]; // [.., .., .., .., x, y]
}

// Junta os pedaços de texto de uma página em linhas (usado também por scripts/check-import.mts)
export function groupTextLines(items: readonly unknown[]): string[] {
  const rows: { y: number; parts: { x: number; s: string }[] }[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object' || !('str' in item)) continue;
    const { str, transform } = item as PdfTextItem;
    if (!str.trim()) continue;
    const [x, y] = [transform[4], transform[5]];
    // Mesma linha: alturas a até 2 pontos uma da outra
    let row = rows.find((r) => Math.abs(r.y - y) <= 2);
    if (!row) rows.push((row = { y, parts: [] }));
    row.parts.push({ x, s: str.trim() });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map((r) => r.parts.sort((a, b) => a.x - b.x).map((part) => part.s).join(' | '));
}

export async function pdfLines(data: ArrayBuffer): Promise<string[]> {
  const [pdfjs, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const task = pdfjs.getDocument({ data: new Uint8Array(data) });
  const doc = await task.promise;
  const lines: string[] = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const content = await (await doc.getPage(p)).getTextContent();
      lines.push(...groupTextLines(content.items));
    }
  } finally {
    void task.destroy();
  }
  return lines;
}
