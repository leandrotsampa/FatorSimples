// Gera tax-tables/tabelas.json a partir das tabelas embutidas no app.
// Uso (ao mudar a legislação): edite src/utils/taxTablesRegistry.ts, rode
//   npx tsx scripts/export-tax-tables.ts
// e publique o arquivo na branch main. Os apps instalados baixam na próxima verificação.
import { writeFileSync } from 'node:fs';
import { OFFICIAL_TAX_TABLES } from '../src/utils/taxTablesRegistry';

const doc = {
  schemaVersion: 1,
  publishedAt: new Date().toISOString().slice(0, 10),
  tables: Object.values(OFFICIAL_TAX_TABLES),
};
// JSON não tem Infinity: a faixa sem teto vai como null
writeFileSync('tax-tables/tabelas.json', JSON.stringify(doc, (_k, v) => (v === Infinity ? null : v), 2) + '\n');
console.log(`tax-tables/tabelas.json: ${doc.tables.length} tabelas, publicado em ${doc.publishedAt}`);
