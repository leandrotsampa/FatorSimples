// Roda a importação de documentos do app (a mesma da tela) em PDFs da Receita, fora do navegador,
// e mostra o que seria gravado. Uso: npx tsx scripts/check-import.mts <pdf> [<pdf> ...] [--json saida.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { groupTextLines } from '../src/utils/pdfText';
import { readTaxDocument, type TaxDocument } from '../src/utils/taxDocuments';
import { planDocumentImport } from '../src/utils/documentImport';
import { DEFAULT_SETTINGS } from '../src/utils/taxCalculations';

async function pdfLines(path: string): Promise<string[]> {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(path)) }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) lines.push(...groupTextLines((await (await doc.getPage(p)).getTextContent()).items));
  return lines;
}

const args = process.argv.slice(2);
const jsonAt = args.indexOf('--json');
const out = jsonAt >= 0 ? args.splice(jsonAt, 2)[1] : null;

const docs: TaxDocument[] = [];
for (const path of args) {
  const doc = readTaxDocument(await pdfLines(path));
  if (!doc) throw new Error(`Documento não reconhecido: ${path}`);
  console.log(doc.kind === 'pgdas' ? `PGDAS-D ${doc.yearMonth}` : `Pagamentos: ${doc.payments.length} guias`, '←', path.split(/[\\/]/).pop());
  docs.push(doc);
}

const plan = planDocumentImport(docs, [], DEFAULT_SETTINGS);
for (const { record: r } of plan.rows) {
  const f = (v: number) => v.toFixed(2).padStart(9);
  console.log(r.yearMonth, 'rec', f(r.revenue), 'folha', f(r.payroll), 'DAS', f(r.dasPaid), 'INSS', f(r.inss), 'IRRF', f(r.irrf), r.notes?.includes('estimada') ? '(folha estimada)' : '');
}
console.log(`${plan.rows.length} meses · pagamentos fora: ${plan.paymentsOutside} · RBT12`, plan.rbt12Check, '· anexo', plan.anexoCheck);
if (plan.paymentsSuggestion) console.log('sugere pagamentos:', JSON.stringify(plan.paymentsSuggestion));
for (const d of plan.missingDeclarations) console.log(`falta PGDAS-D ${d.yearMonth} (${d.available ? 'disponível' : 'ainda não existe'}${d.affectsCurrent ? ', muda a apuração atual' : ', corrige o Histórico'}): folha de ${d.months.join(', ')}`);
if (out) {
  const competencias = plan.rows.map(({ record: r }) => ({ yearMonth: r.yearMonth, revenue: r.revenue, payroll: r.payroll, inss: r.inss, irrf: r.irrf, dasPaid: r.dasPaid, notes: r.notes }));
  writeFileSync(out, JSON.stringify({ app: 'FatorSimples', formato: 'dados-competencias', versao: 1, competencias }, null, 2));
}
