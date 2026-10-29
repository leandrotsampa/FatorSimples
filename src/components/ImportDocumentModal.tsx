import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CircleCheck,
  ClipboardCheck,
  ExternalLink,
  FileText,
  FileUp,
  Loader2,
  Receipt,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ModalShell } from './ui/ModalShell';
import { HelpTip } from './ui/HelpTip';
import { btnGhost, btnPrimary, tile } from './ui/card';
import { HELP } from './help';
import type { MonthRecord, TaxSettings } from '../types/tax';
import { PAYMENTS_SOURCE_URL, PGDAS_SOURCE_URL, readTaxDocument, type TaxDocument } from '../utils/taxDocuments';
import { applyDocumentImport, planDocumentImport, type DocumentImportPlan } from '../utils/documentImport';
import { formatCurrency } from '../utils/taxCalculations';
import { EASE_OUT } from '../utils/motion';
import { playSound } from '../hooks/useSound';

const brMonth = (ym: string) => `${ym.slice(5, 7)}/${ym.slice(0, 4)}`;

export type DocumentImportResult = ReturnType<typeof applyDocumentImport>;

interface LoadedFile {
  name: string;
  doc: TaxDocument;
}

const describe = (doc: TaxDocument) =>
  doc.kind === 'pgdas'
    ? `Declaração do PGDAS-D de ${brMonth(doc.yearMonth)}`
    : `Pagamentos: ${doc.payments.length} ${doc.payments.length === 1 ? 'guia' : 'guias'}`;

const Section: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode; tone?: 'ok' | 'warn' }> = ({
  icon: Icon,
  title,
  children,
  tone,
}) => (
  <section
    className={`p-4 rounded-2xl ${
      tone === 'ok'
        ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-600/15 dark:bg-emerald-500/10 dark:ring-emerald-400/20'
        : tone === 'warn'
          ? 'bg-amber-50 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-400/10 dark:ring-amber-300/20'
          : tile
    }`}
  >
    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white mb-2.5">
      <Icon className={`w-4 h-4 ${tone === 'warn' ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-400'}`} />
      {title}
    </h3>
    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{children}</div>
  </section>
);

const SourceLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300 underline underline-offset-2"
  >
    {children} <ExternalLink className="w-3.5 h-3.5" />
  </a>
);

// Importa a declaração do PGDAS-D e o relatório de pagamentos: escolher os PDFs, conferir e importar
export const ImportDocumentModal: React.FC<{
  history: MonthRecord[];
  settings: TaxSettings;
  // Grava; devolve false se o banco recusou (a janela continua na conferência)
  onApply: (result: DocumentImportResult) => Promise<boolean>;
  onClose: () => void;
}> = ({ history, settings, onApply, onClose }) => {
  const reduce = Boolean(useReducedMotion());
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'files' | 'check' | 'done'>('files');
  const [files, setFiles] = useState<LoadedFile[]>([]);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  // Resumo do que foi importado (o plano é refeito com o histórico já atualizado e zera)
  const [imported, setImported] = useState<{ months: number; company: boolean } | null>(null);

  const read = async (list: File[]) => {
    setError(null);
    const pdfs = list.filter((f) => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
    if (pdfs.length === 0) {
      setError('Escolha os arquivos em PDF: a declaração do PGDAS-D e, se tiver, o relatório de pagamentos.');
      playSound('warning');
      return;
    }
    setReading(true);
    const unknown: string[] = [];
    const loaded: LoadedFile[] = [];
    try {
      const { pdfLines } = await import('../utils/pdfText');
      for (const f of pdfs) {
        try {
          const doc = readTaxDocument(await pdfLines(await f.arrayBuffer()));
          if (doc) loaded.push({ name: f.name, doc });
          else unknown.push(f.name);
        } catch {
          unknown.push(f.name);
        }
      }
    } finally {
      setReading(false);
    }
    if (loaded.length > 0) {
      // O mesmo arquivo de novo substitui o anterior
      setFiles((prev) => [...prev.filter((p) => !loaded.some((l) => l.name === p.name)), ...loaded]);
      playSound('success');
    }
    if (unknown.length > 0) {
      setError(
        `Não reconheci ${unknown.length === 1 ? 'o arquivo' : 'os arquivos'} ${unknown.join(', ')}. O app lê a declaração do PGDAS-D e o relatório de pagamentos da Receita.`
      );
      playSound('warning');
    }
  };

  const plan: DocumentImportPlan | null = useMemo(
    () => (files.length ? planDocumentImport(files.map((f) => f.doc), history, settings) : null),
    [files, history, settings]
  );
  const hasPgdas = files.some((f) => f.doc.kind === 'pgdas');
  const nothingToDo = plan ? plan.rows.length === 0 && plan.companyChanges.length === 0 && plan.removedSamples === 0 : true;
  const missingPayroll = plan?.rows.filter((r) => r.payrollMissing) ?? [];
  const rbt12Ok = plan?.rbt12Check ? Math.abs(plan.rbt12Check.app - plan.rbt12Check.declared) < 0.01 : null;

  const [saving, setSaving] = useState(false);
  const confirmImport = async () => {
    if (!plan || saving) return;
    const summary = { months: plan.rows.length, company: Boolean(plan.company && plan.companyChanges.length) };
    setSaving(true);
    const ok = await onApply(applyDocumentImport(plan, history, settings));
    setSaving(false);
    if (!ok) return;
    setImported(summary);
    playSound('success');
    setStep('done');
  };

  return (
    <ModalShell
      ariaLabel="Importar documentos da Receita"
      panelClassName="bg-white dark:bg-slate-900 rounded-[28px] w-full max-w-2xl shadow-2xl ring-1 ring-slate-900/[0.06] dark:ring-white/[0.08] overflow-hidden"
    >
      <div className="relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 z-10 w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {step === 'done' && imported ? (
          <div className="p-8 text-center">
            <motion.div
              className="mx-auto w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-[0_16px_40px_-12px_rgba(16,185,129,0.8)]"
              initial={reduce ? false : { scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 16 }}
            >
              <ClipboardCheck className="w-9 h-9" />
            </motion.div>
            <h2 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">Pronto, os documentos estão no app</h2>
            <p className="mt-1 text-slate-600 dark:text-slate-300 text-balance">
              {imported.months} {imported.months === 1 ? 'mês' : 'meses'} no Histórico
              {imported.company ? ' e os dados da empresa' : ''}. Quando chegar a declaração do próximo mês, é só importar de novo: nada se
              repete.
            </p>
            <button type="button" onClick={onClose} className={`${btnPrimary} mt-7`}>
              Continuar
            </button>
          </div>
        ) : (
          <div className="p-6 sm:p-7">
            <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Importar documentos da Receita</div>

            <div className="relative mt-4 min-h-[330px] max-h-[calc(100vh-13rem)] overflow-y-auto overflow-x-clip -mx-1 px-1">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={step}
                  initial={reduce ? false : { x: step === 'check' ? 40 : -40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { x: step === 'check' ? -40 : 40, opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                  className="space-y-5"
                >
                  {step === 'files' && (
                    <>
                      <div>
                        <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white text-balance">
                          Traga a declaração do Simples
                          <HelpTip help={HELP.pgdasDocument} />
                        </h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          A <b className="text-slate-900 dark:text-white">declaração do PGDAS-D</b> traz a empresa, o faturamento dos meses
                          anteriores, a folha e o DAS. O <b className="text-slate-900 dark:text-white">relatório de pagamentos</b> completa
                          com o DAS e o DARF do pró-labore pagos. Pode trazer os dois juntos ou um de cada vez.
                        </p>
                      </div>

                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragging(false);
                          void read([...(e.dataTransfer.files ?? [])]);
                        }}
                        className={`rounded-2xl border-2 border-dashed px-6 py-7 text-center transition-colors ${
                          dragging
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                            : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/40'
                        }`}
                      >
                        <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 flex items-center justify-center">
                          {reading ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileText className="w-6 h-6" />}
                        </div>
                        <div className="mt-3 font-semibold text-slate-900 dark:text-white">
                          {reading ? 'Lendo os documentos…' : 'Arraste os PDFs para cá'}
                        </div>
                        {!reading && (
                          <>
                            <div className="text-sm text-slate-500 dark:text-slate-400">ou</div>
                            <button type="button" onClick={() => fileRef.current?.click()} className={`${btnPrimary} mt-2`}>
                              <FileUp className="w-4 h-4" /> Escolher os arquivos
                            </button>
                          </>
                        )}
                        <input
                          ref={fileRef}
                          type="file"
                          multiple
                          accept="application/pdf,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const list = [...(e.target.files ?? [])];
                            e.target.value = '';
                            if (list.length) void read(list);
                          }}
                        />
                      </div>

                      {files.length > 0 && (
                        <ul className="space-y-2" aria-label="Documentos lidos">
                          {files.map((f) => (
                            <li key={f.name} className={`${tile} flex items-center gap-3 px-3.5 py-2.5`}>
                              <CircleCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">{describe(f.doc)}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{f.name}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setFiles((prev) => prev.filter((p) => p.name !== f.name))}
                                aria-label={`Tirar ${f.name}`}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {error && (
                        <div role="alert" className="flex gap-2.5 p-3.5 rounded-2xl bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200 text-sm">
                          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className={`${tile} p-4`}>
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Declaração do PGDAS-D
                          </div>
                          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            A contabilidade envia todo mês, junto com a guia do DAS. Ou baixe no{' '}
                            <SourceLink href={PGDAS_SOURCE_URL}>Portal do Simples Nacional</SourceLink>, em{' '}
                            <b className="text-slate-800 dark:text-slate-200">PGDAS-D → Consultar Declaração</b>.
                          </p>
                        </div>
                        <div className={`${tile} p-4`}>
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                            <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Pagamentos
                          </div>
                          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            Em <SourceLink href={PAYMENTS_SOURCE_URL}>servicos.receitafederal.gov.br</SourceLink>, entre com o certificado
                            ou o gov.br da empresa, consulte os pagamentos e salve em PDF.
                          </p>
                        </div>
                      </div>

                      <p className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        Os arquivos são lidos só neste computador. O app guarda os valores de cada mês e os dados da empresa, nunca o PDF.
                      </p>
                    </>
                  )}

                  {step === 'check' && plan && (
                    <>
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Confira antes de importar</h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          Os documentos são a palavra da Receita: nos meses que eles cobrem, os valores deles substituem os do app.
                        </p>
                      </div>

                      {plan.otherCompany && (
                        <Section icon={AlertTriangle} title="Documento de outra empresa" tone="warn">
                          Os documentos são do CNPJ <b>{plan.otherCompany}</b>, e o app está com <b>{settings.cnpj}</b>. Importar mistura os
                          meses das duas empresas.
                        </Section>
                      )}

                      {plan.company && plan.companyChanges.length > 0 && (
                        <Section icon={Building2} title="Dados da empresa">
                          <ul className="space-y-1">
                            {plan.companyChanges.map((c) => (
                              <li key={c.label} className="flex flex-wrap items-baseline justify-between gap-x-4">
                                <span className="text-slate-500 dark:text-slate-400">{c.label}</span>
                                <span className="font-semibold text-slate-900 dark:text-white text-right">{c.to}</span>
                              </li>
                            ))}
                          </ul>
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">O CNAE não vem na declaração: confira em Configurações → Empresa.</p>
                        </Section>
                      )}

                      {plan.rows.length > 0 ? (
                        <section className={`${tile} p-4`}>
                          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white mb-2.5">
                            <ClipboardCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            {plan.rows.length} {plan.rows.length === 1 ? 'mês' : 'meses'} no Histórico
                            {plan.replaced > 0 && (
                              <span className="font-normal text-slate-500 dark:text-slate-400">
                                ({plan.replaced} {plan.replaced === 1 ? 'atualizado' : 'atualizados'})
                              </span>
                            )}
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm font-num tabular-nums">
                              <thead>
                                <tr className="text-xs text-slate-500 dark:text-slate-400 text-right">
                                  <th className="text-left font-medium pb-1.5">Mês</th>
                                  <th className="font-medium pb-1.5">Faturamento</th>
                                  <th className="font-medium pb-1.5">Folha</th>
                                  <th className="font-medium pb-1.5">DAS</th>
                                  <th className="font-medium pb-1.5">INSS + IRRF</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-900/[0.05] dark:divide-white/[0.05]">
                                {plan.rows.map(({ record: r, isNew, payrollMissing }) => (
                                  <tr key={r.yearMonth} className="text-right text-slate-800 dark:text-slate-200">
                                    <td className="text-left py-1.5">
                                      {brMonth(r.yearMonth)}
                                      {!isNew && <span className="ml-1.5 text-[11px] text-amber-700 dark:text-amber-300">atualiza</span>}
                                    </td>
                                    <td className="py-1.5">{formatCurrency(r.revenue)}</td>
                                    <td className={`py-1.5 ${payrollMissing ? 'text-amber-700 dark:text-amber-300' : ''}`}>
                                      {payrollMissing ? 'sem folha' : formatCurrency(r.payroll)}
                                    </td>
                                    <td className="py-1.5">{formatCurrency(r.dasPaid)}</td>
                                    <td className="py-1.5">{formatCurrency(r.inss + r.irrf)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      ) : (
                        <Section icon={CircleCheck} title="O Histórico já está igual aos documentos" tone="ok">
                          Nenhum mês muda com esta importação.
                        </Section>
                      )}

                      {plan.rbt12Check && (
                        <Section icon={rbt12Ok ? CircleCheck : AlertTriangle} title="Conferência do RBT12" tone={rbt12Ok ? 'ok' : 'warn'}>
                          {rbt12Ok ? (
                            <>
                              Com os meses importados, o app chega ao mesmo RBT12 da declaração de {brMonth(plan.rbt12Check.yearMonth)}:{' '}
                              <b className="font-num">{formatCurrency(plan.rbt12Check.declared)}</b>.
                            </>
                          ) : (
                            <>
                              A declaração de {brMonth(plan.rbt12Check.yearMonth)} tem RBT12 de{' '}
                              <b className="font-num">{formatCurrency(plan.rbt12Check.declared)}</b>, e o app chega a{' '}
                              <b className="font-num">{formatCurrency(plan.rbt12Check.app)}</b>. Algum mês do Histórico está diferente do que
                              foi declarado.
                            </>
                          )}
                        </Section>
                      )}

                      {(missingPayroll.length > 0 || plan.paymentsOutside > 0 || plan.removedSamples > 0) && (
                        <Section icon={AlertTriangle} title="Bom saber" tone="warn">
                          <ul className="list-disc pl-5 space-y-1">
                            {missingPayroll.length > 0 && (
                              <li>
                                {missingPayroll.length === 1 ? 'O mês' : 'Os meses'} {missingPayroll.map((r) => brMonth(r.record.yearMonth)).join(', ')}{' '}
                                {missingPayroll.length === 1 ? 'fica' : 'ficam'} sem folha: a declaração traz só a dos 12 meses anteriores. A
                                do mês declarado vem na declaração seguinte, ou você lança no Histórico.
                              </li>
                            )}
                            {plan.paymentsOutside > 0 && (
                              <li>
                                {plan.paymentsOutside} {plan.paymentsOutside === 1 ? 'mês pago fica' : 'meses pagos ficam'} de fora por não ter
                                faturamento no app.{!hasPgdas && ' Importe também a declaração do PGDAS-D para trazê-los.'}
                              </li>
                            )}
                            {plan.removedSamples > 0 && <li>Os {plan.removedSamples} meses de exemplo saem do Histórico.</li>}
                          </ul>
                        </Section>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              {step === 'check' ? (
                <button type="button" onClick={() => setStep('files')} className={btnGhost}>
                  <ArrowLeft className="w-4 h-4" /> Documentos
                </button>
              ) : (
                <span />
              )}
              {step === 'files' ? (
                <button type="button" disabled={!plan || reading} onClick={() => setStep('check')} className={btnPrimary}>
                  Conferir
                </button>
              ) : (
                <button type="button" disabled={nothingToDo || saving} onClick={() => void confirmImport()} className={btnPrimary}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Importar
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
};
