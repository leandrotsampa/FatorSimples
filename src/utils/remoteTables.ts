import { BUILTIN_TABLES_DATE, OFFICIAL_TAX_TABLES, selectTableForCompetence, type TaxTableVersion } from './taxTablesRegistry';

/**
 * Atualização real das tabelas fiscais: o app baixa o arquivo tax-tables/tabelas.json publicado no
 * GitHub do FatorSimples, valida e aplica por cima das tabelas embutidas. Também confere se existe
 * uma versão mais nova do app (para mudanças que exigem código, como faixas do Simples).
 * Sem internet, tudo segue com as tabelas embutidas.
 */

const REPO = 'leandrotsampa/FatorSimples';
export const TABLES_URL = `https://raw.githubusercontent.com/${REPO}/main/tax-tables/tabelas.json`;
export const LATEST_RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`;
export const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`;

const SUPPORTED_SCHEMA = 1;
const MAX_TABLES = 50;
// Ids aceitos: minúsculas, dígitos e "_", com ao menos uma letra ou "_" (id só de dígitos mudaria a
// ordem do objeto); nunca nomes especiais nem o apelido antigo do registro
const ID_PATTERN = /^(?=.*[a-z_])[a-z0-9_]{1,40}$/;
const RESERVED_IDS = new Set(['__proto__', 'constructor', 'prototype', '2025_2026_vigente']);
const STORAGE_KEY = 'fatorsimples_remote_tables_v1';
const FETCH_TIMEOUT_MS = 8000;

export interface RemoteTablesDoc {
  schemaVersion: number;
  publishedAt: string;
  tables: TaxTableVersion[];
}

export { selectTableForCompetence };

const isMonth = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const isNum = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

function validateTable(raw: unknown): TaxTableVersion | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  if (!isText(t.id) || !ID_PATTERN.test(t.id) || RESERVED_IDS.has(t.id)) return null;
  if (!isText(t.name) || !isText(t.legalBasis) || !isMonth(t.validFrom)) return null;
  if (t.validTo !== undefined && (!isMonth(t.validTo) || t.validTo < t.validFrom)) return null;
  if (!isNum(t.year, 2000, 2100) || typeof t.effectiveDate !== 'string') return null;
  if (!isNum(t.minimumWage, 500, 10_000) || !isNum(t.inssRate, 0, 0.5)) return null;
  if (!isNum(t.inssCeiling, t.minimumWage, 100_000)) return null;
  if (!isNum(t.dependentDeduction, 0, 2_000) || !isNum(t.simplifiedIrDeduction, 0, 5_000)) return null;
  if (!Array.isArray(t.irrfBrackets) || t.irrfBrackets.length === 0) return null;

  const brackets: TaxTableVersion['irrfBrackets'] = [];
  for (let i = 0; i < t.irrfBrackets.length; i++) {
    const b = t.irrfBrackets[i] as Record<string, unknown>;
    const last = i === t.irrfBrackets.length - 1;
    // JSON não tem Infinity: a última faixa (sem teto) vem como null
    const limit = last && (b?.limit === null || b?.limit === undefined) ? Infinity : b?.limit;
    if (!b || !isNum(b.faixa, 1, 50) || !isNum(b.rate, 0, 0.6) || !isNum(b.deduction, 0, 50_000)) return null;
    if (!(limit === Infinity || isNum(limit, 0, 1_000_000))) return null;
    if (brackets.length > 0 && (limit as number) <= brackets[brackets.length - 1].limit) return null;
    brackets.push({ faixa: b.faixa, limit: limit as number, rate: b.rate, deduction: b.deduction });
  }

  const table: TaxTableVersion = {
    id: t.id,
    name: t.name,
    year: t.year,
    effectiveDate: t.effectiveDate,
    validFrom: t.validFrom,
    ...(t.validTo !== undefined ? { validTo: t.validTo as string } : {}),
    legalBasis: t.legalBasis,
    minimumWage: t.minimumWage,
    inssCeiling: t.inssCeiling,
    inssRate: t.inssRate,
    dependentDeduction: t.dependentDeduction,
    simplifiedIrDeduction: t.simplifiedIrDeduction,
    irrfBrackets: brackets,
  };
  // Regras opcionais (redução do IRRF e retenção sobre lucros) seguem o formato das embutidas
  if (t.irrfReduction !== undefined) {
    const r = t.irrfReduction as Record<string, unknown>;
    if (!r || !isText(r.legalBasis) || ![r.fullExemptionLimit, r.maxReduction, r.phaseOutLimit, r.phaseOutBase].every((v) => isNum(v)) || !isNum(r.phaseOutRate, 0, 1)) {
      return null;
    }
    table.irrfReduction = r as unknown as TaxTableVersion['irrfReduction'];
  }
  if (t.dividendWithholding !== undefined) {
    const d = t.dividendWithholding as Record<string, unknown>;
    if (!d || !isText(d.legalBasis) || !isNum(d.monthlyThreshold) || !isNum(d.rate, 0, 1)) return null;
    table.dividendWithholding = d as unknown as TaxTableVersion['dividendWithholding'];
  }
  return table;
}

// Confere o arquivo inteiro: qualquer tabela inválida recusa o arquivo (nada pela metade)
export function validateRemoteTables(raw: unknown): RemoteTablesDoc | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (d.schemaVersion !== SUPPORTED_SCHEMA || !isText(d.publishedAt) || !Array.isArray(d.tables)) return null;
  if (d.tables.length === 0 || d.tables.length > MAX_TABLES) return null;
  const tables: TaxTableVersion[] = [];
  for (const t of d.tables) {
    const v = validateTable(t);
    if (!v) return null;
    tables.push(v);
  }
  return { schemaVersion: SUPPORTED_SCHEMA, publishedAt: d.publishedAt, tables };
}

// O arquivo só vale se for mais novo que as tabelas embutidas nesta versão do app
export function isNewerThanBuiltin(publishedAt: string): boolean {
  return publishedAt > BUILTIN_TABLES_DATE;
}

// Tabela baixada substitui a embutida de mesmo id; ids novos entram no fim
export function mergeTables(builtin: TaxTableVersion[], remote: TaxTableVersion[]): TaxTableVersion[] {
  const byId = new Map(builtin.map((t) => [t.id, t]));
  for (const t of remote) byId.set(t.id, t);
  return [...byId.values()];
}

// "v1.2.0" é mais nova que "1.1.1"? (versões semânticas; texto inválido nunca é "mais nova")
export function isNewerVersion(candidate: string, current: string): boolean {
  const parse = (v: string) => {
    const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(v.trim());
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  };
  const a = parse(candidate);
  const b = parse(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// Estado salvo e aplicação no registro

export interface StoredRemoteTables {
  doc: RemoteTablesDoc | null; // último arquivo válido baixado
  checkedAt: string | null; // última verificação (ISO), com ou sem novidade
}

const toPlain = (doc: RemoteTablesDoc) => JSON.parse(JSON.stringify(doc, (_k, v) => (v === Infinity ? null : v)));

// O que o banco (ou o armazenamento do navegador) devolve, já validado
export function parseStoredRemoteTables(raw: unknown): StoredRemoteTables {
  if (!raw || typeof raw !== 'object') return { doc: null, checkedAt: null };
  const r = raw as Record<string, unknown>;
  return {
    doc: validateRemoteTables(r.doc),
    checkedAt: typeof r.checkedAt === 'string' ? r.checkedAt : null,
  };
}

// No Electron fica no banco SQLite (vai junto com o app portátil); no navegador, no localStorage
export async function loadStoredRemoteTables(): Promise<StoredRemoteTables> {
  try {
    if (window.electronAPI?.getRemoteTables) return parseStoredRemoteTables(await window.electronAPI.getRemoteTables());
    const raw = localStorage.getItem(STORAGE_KEY);
    return parseStoredRemoteTables(raw ? JSON.parse(raw) : null);
  } catch {
    return { doc: null, checkedAt: null };
  }
}

async function saveStoredRemoteTables(stored: StoredRemoteTables): Promise<void> {
  const plain = { doc: stored.doc ? toPlain(stored.doc) : null, checkedAt: stored.checkedAt };
  try {
    if (window.electronAPI?.saveRemoteTables) {
      await window.electronAPI.saveRemoteTables(plain);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plain));
  } catch {
    // Sem armazenamento: vale só nesta sessão
  }
}

// Aplica as tabelas baixadas por cima das embutidas (o registro é lido a cada cálculo)
export function applyRemoteTables(doc: RemoteTablesDoc | null): boolean {
  if (!doc || !isNewerThanBuiltin(doc.publishedAt)) return false;
  for (const t of doc.tables) OFFICIAL_TAX_TABLES[t.id] = t;
  return true;
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export type TablesCheckResult =
  | { kind: 'updated'; publishedAt: string; changed: number }
  | { kind: 'up-to-date'; publishedAt: string }
  | { kind: 'offline' }
  | { kind: 'not-published' }
  | { kind: 'invalid' };

const sameTable = (a: TaxTableVersion | undefined, b: TaxTableVersion) =>
  !!a && JSON.stringify(a, (_k, v) => (v === Infinity ? null : v)) === JSON.stringify(b, (_k, v) => (v === Infinity ? null : v));

// Baixa o arquivo de tabelas, valida, aplica e guarda; nunca lança erro
export async function checkRemoteTables(): Promise<TablesCheckResult> {
  let raw: unknown;
  try {
    raw = await fetchJson(TABLES_URL);
  } catch (e) {
    // 404: o arquivo ainda não está publicado no GitHub (diferente de estar sem internet)
    return (e as { status?: number })?.status === 404 ? { kind: 'not-published' } : { kind: 'offline' };
  }
  const doc = validateRemoteTables(raw);
  const checkedAt = new Date().toISOString();
  if (!doc) {
    await saveStoredRemoteTables({ ...(await loadStoredRemoteTables()), checkedAt });
    return { kind: 'invalid' };
  }
  // Arquivo publicado igual ou mais velho que as tabelas desta versão: nada a aplicar
  if (!isNewerThanBuiltin(doc.publishedAt)) {
    await saveStoredRemoteTables({ doc: null, checkedAt });
    return { kind: 'up-to-date', publishedAt: doc.publishedAt };
  }
  const changed = doc.tables.filter((t) => !sameTable(OFFICIAL_TAX_TABLES[t.id], t)).length;
  applyRemoteTables(doc);
  await saveStoredRemoteTables({ doc, checkedAt });
  return changed > 0 ? { kind: 'updated', publishedAt: doc.publishedAt, changed } : { kind: 'up-to-date', publishedAt: doc.publishedAt };
}

export type VersionCheckResult = { kind: 'newer'; version: string } | { kind: 'current' } | { kind: 'offline' };

// Confere a última versão publicada no GitHub; nunca lança erro
export async function checkLatestVersion(currentVersion: string): Promise<VersionCheckResult> {
  try {
    const data = (await fetchJson(LATEST_RELEASE_API)) as { tag_name?: unknown };
    const tag = typeof data?.tag_name === 'string' ? data.tag_name : '';
    return isNewerVersion(tag, currentVersion) ? { kind: 'newer', version: tag.replace(/^v/, '') } : { kind: 'current' };
  } catch {
    return { kind: 'offline' };
  }
}

// Página de versões: no Electron pelo navegador do sistema; no navegador, numa aba nova
export function openReleasesPage() {
  if (window.electronAPI?.openReleasesPage) void window.electronAPI.openReleasesPage();
  else window.open(RELEASES_PAGE, '_blank', 'noopener');
}

// Aviso de versão nova: "Mais tarde" esconde só nesta abertura; "Ignorar esta versão" esconde
// aquela versão até sair outra mais nova
export function shouldShowUpdateNotice(opts: { latest: string | null; ignored: string | null; later: boolean }): boolean {
  if (!opts.latest || opts.later) return false;
  const ignoredIsValid = !!opts.ignored && /^v?\d+\.\d+\.\d+/.test(opts.ignored.trim());
  return !ignoredIsValid || isNewerVersion(opts.latest, opts.ignored as string);
}

// Versão ignorada: fica neste computador (é sobre o app instalado, não sobre os dados)
const IGNORED_VERSION_KEY = 'fatorsimples_ignored_version';
export function loadIgnoredVersion(): string | null {
  try {
    return localStorage.getItem(IGNORED_VERSION_KEY);
  } catch {
    return null;
  }
}
export function saveIgnoredVersion(version: string) {
  try {
    localStorage.setItem(IGNORED_VERSION_KEY, version);
  } catch {
    // sem armazenamento: o aviso volta na próxima abertura
  }
}

// Ao abrir: a versão nova é conferida sempre (aviso de atualização para portátil e instalado);
// as tabelas fiscais, no máximo uma vez por dia e só com a atualização automática ligada
export function planStartupChecks(opts: {
  autoUpdateTables: boolean;
  checkedAt: string | null;
  now?: Date;
}): { version: boolean; tables: boolean } {
  return { version: true, tables: opts.autoUpdateTables && shouldAutoCheck(opts.checkedAt, opts.now) };
}

// Verificação automática no máximo uma vez por dia
export function shouldAutoCheck(checkedAt: string | null, now = new Date()): boolean {
  if (!checkedAt) return true;
  const last = new Date(checkedAt).getTime();
  return !Number.isFinite(last) || now.getTime() - last >= 24 * 60 * 60 * 1000;
}
