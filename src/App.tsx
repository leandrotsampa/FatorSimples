import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Sidebar } from './components/Sidebar';
import { MonthApurationView } from './components/MonthApurationView';
import type { SettingsTab } from './components/SettingsModal';
import { TopBar } from './components/TopBar';
import { MonthRecord, TaxSettings } from './types/tax';
import {
  DEFAULT_SETTINGS,
  generateSampleHistory,
  fillMissingTaxes,
} from './utils/taxCalculations';
import { getTaxTableForCompetence, OFFICIAL_TAX_TABLES } from './utils/taxTablesRegistry';
import {
  applyRemoteTables,
  checkLatestVersion,
  checkRemoteTables,
  loadStoredRemoteTables,
  planStartupChecks,
  openReleasesPage,
  shouldShowUpdateNotice,
  loadIgnoredVersion,
  saveIgnoredVersion,
  type TablesCheckResult,
  type VersionCheckResult,
} from './utils/remoteTables';
import { buildDataExport, parseDataImport, DataImport } from './utils/dataTransfer';

import { storageAdapter } from './utils/storageAdapter';
import { runThemeWipe } from './utils/themeTransition';
import { competenceInputs } from './utils/competenceInputs';
import { PageSkeleton } from './components/ui/Skeleton';
import { useAppDialog } from './components/ui/AppDialog';
import { resolveInitialTheme } from './utils/initialTheme';
import { getPref, setPref } from './utils/appPrefs';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { EASE_OUT, instantIf } from './utils/motion';
import { useUiPrefs } from './hooks/useUiPrefs';
import { useClock } from './hooks/useClock';
import { playSound } from './hooks/useSound';
import { ALL_TOUR_STEP_IDS, isTourRunning, runTour, screenStepIds, type TourScreen } from './tour/tour';
import { completeTour, initTourState, loadTourState, planScreenTour, planTour, saveTourState, skipTour } from './tour/tourState';

const SETTINGS_STORAGE_KEY = 'fatorsimples_settings_v2';
const HISTORY_STORAGE_KEY = 'fatorsimples_history_v2';
// Telas e diálogos fora da tela do mês carregam sob demanda (pacote inicial menor) e são
// pré-carregados logo depois da abertura, para a navegação continuar instantânea
const loadHistory = () => import('./components/HistoryTable');
const loadComparison = () => import('./components/ComparisonView');
const loadReport = () => import('./components/ReportPrintView');
const loadSettings = () => import('./components/SettingsModal');
const loadAddMonth = () => import('./components/AddMonthModal');
const loadSqlite = () => import('./components/SqliteManagerModal');
const HistoryTable = lazy(() => loadHistory().then((m) => ({ default: m.HistoryTable })));
const ComparisonView = lazy(() => loadComparison().then((m) => ({ default: m.ComparisonView })));
const ReportPrintView = lazy(() => loadReport().then((m) => ({ default: m.ReportPrintView })));
const SettingsModal = lazy(() => loadSettings().then((m) => ({ default: m.SettingsModal })));
const AddMonthModal = lazy(() => loadAddMonth().then((m) => ({ default: m.AddMonthModal })));
const SqliteManagerModal = lazy(() => loadSqlite().then((m) => ({ default: m.SqliteManagerModal })));
const preloadDeferredChunks = () => {
  for (const load of [loadHistory, loadComparison, loadReport, loadSettings, loadAddMonth, loadSqlite]) void load();
};

export default function App() {
  // Relógio do app: com a janela aberta por dias, a saudação e o mês atual acompanham a virada
  const now = useClock();
  // Tema visual (dark ou light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return resolveInitialTheme(getPref('theme'));
  });

  // Troca o tema com o círculo saindo do botão clicado; o DOM é a fonte da verdade
  // para o tema atual, assim cliques seguidos nunca usam um estado defasado
  // Um segundo clique antes de a transição aplicar o primeiro parte do tema pendente
  const pendingThemeRef = useRef<'dark' | 'light' | null>(null);
  const toggleTheme = (origin?: HTMLElement | null) => {
    const current =
      pendingThemeRef.current ?? (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    pendingThemeRef.current = next;
    setPref('theme', next);
    playSound('whoosh');
    runThemeWipe(origin ?? null, () => {
      document.documentElement.classList.toggle('dark', next === 'dark');
      flushSync(() => setTheme(next));
      if (pendingThemeRef.current === next) pendingThemeRef.current = null;
    });
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Inicialização da Competência Atual (ex: 2026-01 ou ano atual)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Valores da competência em apuração; são recarregados a cada troca de competência
  const [currentRevenue, setCurrentRevenue] = useState<number>(0);
  // Estratégia do pró-labore da competência (padrão: 28%) e valor usado no modo manual
  const [prolaboreRule, setProlaboreRule] = useState<TaxSettings['prolaboreRule']>('auto_28_month');
  const [manualProlabore, setManualProlabore] = useState<number>(0);

  // Menu lateral: segue só a escolha do usuário (expandido fica expandido até ele recolher)
  const [uiPrefs, setUiPrefs] = useUiPrefs();
  const sidebarMode = uiPrefs.sidebar;
  const toggleSidebar = () => {
    playSound('tick');
    setUiPrefs({ sidebar: uiPrefs.sidebar === 'expanded' ? 'collapsed' : 'expanded' });
  };
  const toggleSidebarRef = useRef(toggleSidebar);
  toggleSidebarRef.current = toggleSidebar;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebarRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Aba ativa e o container que rola (volta ao topo ao trocar de aba)
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduceMotion = Boolean(useReducedMotion());
  const [activeTab, setActiveTab] = useState<'apuration' | 'history' | 'comparison' | 'report'>('apuration');
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  // Modais
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('tables');
  const openSettings = (tab: SettingsTab = 'tables') => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };
  const [isSqliteManagerOpen, setIsSqliteManagerOpen] = useState(false);
  const [isAddMonthOpen, setIsAddMonthOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<MonthRecord | null>(null);

  // Configurações fiscais: no desktop só do SQLite (carregadas logo abaixo; banco novo começa no
  // padrão); no navegador, do localStorage. O armazenamento interno do Electron é comum a todas as
  // cópias do app no computador e não vale como dado
  const [settings, setSettings] = useState<TaxSettings>(() => {
    if (storageAdapter.isElectron()) return DEFAULT_SETTINGS;
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SETTINGS;
  });

  // Histórico de competências com persistência no SQLite (se Electron) ou localStorage (se web)
  // No Electron o banco é a fonte da verdade: começa vazio e carrega do SQLite logo abaixo
  const [history, setHistory] = useState<MonthRecord[]>(() => {
    if (storageAdapter.isElectron()) return [];
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return [];
  });

  // Ao trocar de competência (ou quando o registro dela mudar no histórico), carrega os valores
  // reais salvos; competência ainda em apuração começa zerada na regra dos 28%
  const selectedRecord = history.find((h) => h.yearMonth === selectedMonth);
  const selectedRecordKey = selectedRecord
    ? `${selectedRecord.id}|${selectedRecord.revenue}|${selectedRecord.payroll}`
    : '';
  // Ajuste feito durante o render (não num efeito): nunca existe um render com a competência nova
  // e os valores da anterior, que faria contagens e o aviso sonoro reagirem a um estado misturado
  const competenceKey = `${selectedMonth}|${selectedRecordKey}`;
  const [loadedCompetenceKey, setLoadedCompetenceKey] = useState('');
  if (loadedCompetenceKey !== competenceKey) {
    const inputs = competenceInputs(selectedRecord, settings);
    setLoadedCompetenceKey(competenceKey);
    setCurrentRevenue(inputs.revenue);
    setProlaboreRule(inputs.rule);
    setManualProlabore(inputs.manualProlabore);
  }

  // Competência salva usa exatamente o pró-labore gravado; em apuração, só o manual define valor
  const apurationSettings: TaxSettings = { ...settings, prolaboreRule };
  const apurationProlabore = selectedRecord
    ? selectedRecord.payroll
    : prolaboreRule === 'manual'
      ? manualProlabore
      : undefined;

  // Carrega do SQLite na inicialização se estiver rodando no Electron. Até a primeira leitura
  // as telas mostram o esqueleto, em vez de piscar o aviso de "nenhuma competência"
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(() => !storageAdapter.isElectron());
  useEffect(() => {
    if (storageAdapter.isElectron()) {
      storageAdapter.forgetLegacyBrowserCopies();
      Promise.all([
        storageAdapter.loadSettings().then(setSettings),
        storageAdapter.loadHistory().then(setHistory),
      ]).finally(() => setIsHistoryLoaded(true));
    }
  }, []);

  // Grava sempre que alterar; no desktop, só depois de ler o banco (senão o padrão da abertura
  // sobrescreveria as configurações salvas)
  useEffect(() => {
    if (!isHistoryLoaded) return;
    storageAdapter.saveSettings(settings);
  }, [settings, isHistoryLoaded]);

  useEffect(() => {
    if (storageAdapter.isElectron()) return; // no desktop o histórico vive só no SQLite
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Erro ao salvar history:', e);
    }
  }, [history]);

  // Atualização das tabelas pelo GitHub e aviso de versão nova do app. Ao abrir, no máximo uma
  // vez por dia (se a atualização automática estiver ligada); e sempre que o usuário pedir
  const [tablesRevision, setTablesRevision] = useState(0);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  // Balão de versão nova no item Configurações do menu: "Mais tarde" vale só nesta abertura; "Ignorar esta versão"
  // fica guardado e só volta a avisar quando sair outra mais nova
  const [updateLater, setUpdateLater] = useState(false);
  const [ignoredVersion, setIgnoredVersion] = useState<string | null>(loadIgnoredVersion);
  const showUpdateNotice = shouldShowUpdateNotice({ latest: newVersion, ignored: ignoredVersion, later: updateLater });
  const runUpdateCheck = async (): Promise<{ tables: TablesCheckResult; version: VersionCheckResult }> => {
    const [tables, version] = await Promise.all([checkRemoteTables(), checkLatestVersion(__APP_VERSION__)]);
    if (tables.kind === 'updated') setTablesRevision((r) => r + 1);
    if (version.kind !== 'offline') setNewVersion(version.kind === 'newer' ? version.version : null);
    return { tables, version };
  };
  // Com o app aberto por muito tempo, a versão nova também é conferida a cada 6 horas
  useEffect(() => {
    const timer = window.setInterval(() => {
      void checkLatestVersion(__APP_VERSION__).then((version) => {
        if (version.kind === 'newer') setNewVersion(version.version);
      });
    }, 6 * 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Ao abrir: aplica as tabelas já baixadas (guardadas no banco) e confere o GitHub se for a hora
  const [remoteTablesLoaded, setRemoteTablesLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    Promise.all([
      loadStoredRemoteTables(),
      // No Electron a configuração verdadeira está no banco
      storageAdapter.isElectron() ? storageAdapter.loadSettings() : Promise.resolve(settings),
    ]).then(([stored, savedSettings]) => {
      if (!alive) return;
      if (applyRemoteTables(stored.doc)) setTablesRevision((r) => r + 1);
      setRemoteTablesLoaded(true);
      // Versão nova: conferida em toda abertura; tabelas fiscais: no máximo uma vez por dia
      const checks = planStartupChecks({ autoUpdateTables: savedSettings.autoUpdateTables, checkedAt: stored.checkedAt });
      if (checks.tables) void runUpdateCheck();
      else
        void checkLatestVersion(__APP_VERSION__).then((version) => {
          if (alive && version.kind === 'newer') setNewVersion(version.version);
        });
    });
    return () => {
      alive = false;
    };
    // Só na abertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tabela da competência selecionada (reaplicada também quando chegam tabelas novas do GitHub)
  const appliedRevision = useRef(0);
  useEffect(() => {
    if (settings.autoUpdateTables && selectedMonth) {
      const tablesChanged = appliedRevision.current !== tablesRevision;
      appliedRevision.current = tablesRevision;
      const targetTable = getTaxTableForCompetence(selectedMonth);
      // Reaplica também quando a tabela oficial do mesmo ano foi revisada no app (o nome muda);
      // ajustes manuais feitos depois da aplicação não são sobrescritos
      const isOutdated =
        targetTable &&
        (tablesChanged ||
          targetTable.id !== settings.taxVersionId ||
          !(settings.lastTableUpdateDate ?? '').includes(targetTable.name));
      if (isOutdated) {
        setSettings((prev) => ({
          ...prev,
          taxVersionId: targetTable.id,
          minimumWage: targetTable.minimumWage,
          inssCeiling: targetTable.inssCeiling,
          simplifiedIrDeduction: targetTable.simplifiedIrDeduction,
          dependentDeduction: targetTable.dependentDeduction,
          lastTableUpdateDate: `Tabela da competência ${selectedMonth}: ${targetTable.name}`,
        }));
      }
    }
  }, [selectedMonth, settings.autoUpdateTables, settings.taxVersionId, settings.lastTableUpdateDate, tablesRevision]);

  // Ações de gerenciamento de dados
  // Último mês salvo/editado: o Histórico destaca a linha por um instante
  const [lastSavedId, setLastSavedId] = useState<string | undefined>(undefined);
  const lastSavedTimer = useRef<number | undefined>(undefined);

  const handleSaveMonthToHistory = (newRecord: MonthRecord) => {
    setLastSavedId(newRecord.id);
    window.clearTimeout(lastSavedTimer.current);
    lastSavedTimer.current = window.setTimeout(() => setLastSavedId(undefined), 1500);
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.yearMonth !== newRecord.yearMonth);
      return [newRecord, ...filtered];
    });
    // Grava no SQLite nativo se estiver no Electron
    storageAdapter.saveMonth(newRecord);
    playSound('success');
  };

  const handleEditMonth = (record: MonthRecord) => {
    setRecordToEdit(record);
    setIsAddMonthOpen(true);
  };

  // Confirmações e avisos no tema do app
  const { dialog, confirm, notify } = useAppDialog();

  // Tutorial por tela. Na do mês, mês vazio ganha um faturamento de exemplo que volta a zero no fim
  const TOUR_DEMO_REVENUE = 20000;
  const startTour = (screen: TourScreen, ids?: string[], news = false) => {
    if (screen !== 'settings') setActiveTab(screen);
    const demo = screen === 'apuration' && !selectedRecord && currentRevenue <= 0;
    if (demo) setCurrentRevenue(TOUR_DEMO_REVENUE);
    // Espera a tela (ou o modal) montar antes de destacar
    window.setTimeout(() => {
      runTour({
        screen,
        ids,
        news,
        demoRevenue: demo,
        reduceMotion,
        onDone: (shown) => {
          if (demo) setCurrentRevenue((r) => (r === TOUR_DEMO_REVENUE ? 0 : r));
          saveTourState(completeTour(loadTourState(), shown));
        },
      });
    }, 450);
  };

  // Primeira abertura: boas-vindas; depois de atualizar o app: só os passos novos da tela do mês
  const tourChecked = useRef(false);
  const [tourReady, setTourReady] = useState(false);
  const appReady = isHistoryLoaded && remoteTablesLoaded;
  // Com a primeira tela pronta, baixa o resto em segundo plano (quando o navegador estiver livre)
  useEffect(() => {
    if (!appReady) return;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300));
    idle(preloadDeferredChunks);
  }, [appReady]);
  useEffect(() => {
    if (!appReady || tourChecked.current) return;
    tourChecked.current = true;
    // O registro do tutorial vem do banco (junto com os dados) antes de decidir o que mostrar
    void initTourState().then(() => {
      setTourReady(true);
      const plan = planTour(screenStepIds('apuration'), loadTourState());
      if (plan.kind === 'news') {
        startTour('apuration', plan.ids, true);
      } else if (plan.kind === 'welcome') {
        void confirm({
          title: 'Bem-vindo ao FatorSimples',
          message:
            'Em 1 minuto você vê o essencial: a alíquota para a nota, quanto transferir para você e como o Fator R economiza imposto.',
          confirmLabel: 'Mostrar como funciona',
          cancelLabel: 'Explorar sozinho',
        }).then((ok) => {
          if (ok) startTour('apuration');
          // Explorar sozinho: nenhuma tela se apresenta; só novidades futuras e o "Como usar"
          else saveTourState(skipTour(loadTourState(), ALL_TOUR_STEP_IDS));
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appReady]);

  // As outras telas se apresentam na primeira vez que a pessoa entra nelas
  const currentScreen: TourScreen = isSettingsOpen ? 'settings' : activeTab;
  useEffect(() => {
    if (!tourReady || currentScreen === 'apuration' || isTourRunning()) return;
    const plan = planScreenTour(screenStepIds(currentScreen), loadTourState());
    if (plan.kind !== 'none') startTour(currentScreen, plan.ids, plan.kind === 'news');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourReady, currentScreen]);

  const handleDeleteMonth = async (id: string) => {
    const rec = history.find((h) => h.id === id);
    const ok = await confirm({
      title: 'Excluir competência',
      message: `Remover ${rec ? rec.yearMonth : 'esta competência'} do histórico? Isso muda o RBT12 e a alíquota dos meses seguintes.`,
      confirmLabel: 'Excluir',
      tone: 'danger',
    });
    if (ok) {
      setHistory((prev) => prev.filter((item) => item.id !== id));
      storageAdapter.deleteMonth(id);
      playSound('delete');
    }
  };

  // Exemplo só pode ser gerado com o histórico vazio, para nunca sobrescrever dados reais
  const handleGenerateSample = () => {
    if (history.length > 0) {
      void notify({
        title: 'Histórico já tem meses',
        message: 'Os meses de exemplo só podem ser gerados com o histórico vazio, para nunca se misturarem aos seus.',
      });
      return;
    }
    const sample = generateSampleHistory(currentRevenue || 25000, 0.285);
    setHistory(sample);
    if (storageAdapter.isElectron()) {
      sample.forEach((rec) => storageAdapter.saveMonth(rec));
    }
  };

  // Meses de exemplo (id "sample-…"): entram nos cálculos, então ficam sinalizados e removíveis
  const hasSampleMonths = history.some((h) => h.id.startsWith('sample-'));
  const handleRemoveSample = () => {
    const samples = history.filter((h) => h.id.startsWith('sample-'));
    setHistory((prev) => prev.filter((h) => !h.id.startsWith('sample-')));
    samples.forEach((rec) => storageAdapter.deleteMonth(rec.id));
    playSound('delete');
  };

  const handleClearHistory = async () => {
    const ok = await confirm({
      title: 'Limpar todo o histórico',
      message: `Apagar as ${history.length} competências do histórico? Não dá para desfazer; faça um backup em "Dados e backup" antes, se quiser.`,
      confirmLabel: 'Apagar tudo',
      tone: 'danger',
    });
    if (ok) {
      setHistory([]);
      storageAdapter.clearHistory();
      playSound('delete');
    }
  };

  // Exportar somente os dados das competências (JSON)
  const handleExportData = () => {
    const blob = new Blob([buildDataExport(history, settings)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fatorsimples-dados-${selectedMonth}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Importar dados (JSON): empresa só é alterada se vier no arquivo; competências mesclam por mês
  const handleImportData = async (content: string) => {
    let imported: DataImport;
    try {
      imported = parseDataImport(content);
    } catch (e) {
      void notify({ title: 'Não deu para importar', message: e instanceof Error ? e.message : 'Erro ao processar o arquivo selecionado.' });
      return;
    }

    const { company } = imported;
    // INSS, IRRF e DAS zerados são calculados com o histórico já mesclado (o DAS depende do RBT12)
    const importedMonthsSet = new Set(imported.records.map((r) => r.yearMonth));
    const { records, filledFields } = fillMissingTaxes(
      imported.records,
      [...imported.records, ...history.filter((h) => !importedMonthsSet.has(h.yearMonth))],
      settings
    );
    if (!company && records.length === 0) {
      void notify({ title: 'Nada para importar', message: 'O arquivo não contém dados da empresa nem competências.' });
      return;
    }

    const existingMonths = new Set(history.map((h) => h.yearMonth));
    const overwritten = records.filter((r) => existingMonths.has(r.yearMonth)).length;
    const lines = ['Importar do arquivo:'];
    if (company) lines.push(`• Dados da empresa${company.companyName ? `: ${company.companyName}` : ''}`);
    if (records.length > 0) {
      lines.push(`• ${records.length} competência(s)` + (overwritten > 0 ? ` (${overwritten} já existente(s) será(ão) substituída(s))` : ''));
    }
    if (filledFields > 0) {
      lines.push(`• ${filledFields} valor(es) de INSS, IRRF ou DAS zerados serão calculados`);
    }
    if (!(await confirm({ title: 'Importar dados', message: lines.slice(1).join('\n'), confirmLabel: 'Importar' }))) return;

    if (company) {
      setSettings((prev) => ({ ...prev, ...company }));
    }
    if (records.length > 0) {
      const importedMonths = new Set(records.map((r) => r.yearMonth));
      setHistory((prev) => [...records, ...prev.filter((h) => !importedMonths.has(h.yearMonth))]);
      records.forEach((rec) => storageAdapter.saveMonth(rec));
    }

    setIsSqliteManagerOpen(false);
    void notify({ title: 'Dados importados', message: 'Os dados do arquivo já estão no app.' });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`min-h-screen flex flex-row font-sans overflow-hidden ${
      theme === 'dark'
        ? 'text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-200'
        : 'text-slate-800 selection:bg-emerald-500/20 selection:text-emerald-800'
    } app-canvas`}>
      {/* Menu Lateral Desktop (Sidebar) */}
      <Sidebar
        now={now}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        onOpenSettings={() => openSettings()}
        onOpenSqliteManager={() => setIsSqliteManagerOpen(true)}
        onOpenTutorial={() => startTour(activeTab)}
        settings={settings}
        history={history}
        theme={theme}
        toggleTheme={toggleTheme}
        isLoading={!(isHistoryLoaded && remoteTablesLoaded)}
        newVersion={shouldShowUpdateNotice({ latest: newVersion, ignored: ignoredVersion, later: false }) ? newVersion : null}
        updateNotice={showUpdateNotice ? newVersion : null}
        onDownloadUpdate={openReleasesPage}
        onLaterUpdate={() => setUpdateLater(true)}
        onIgnoreUpdate={() => {
          if (!newVersion) return;
          saveIgnoredVersion(newVersion);
          setIgnoredVersion(newVersion);
        }}
        mode={sidebarMode}
        onToggleMode={toggleSidebar}
      />

      {/* Viewport principal: barra de título fixa e, abaixo dela, a área que rola
          (assim a barra de rolagem nunca passa por baixo dos botões nativos da janela) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <TopBar settings={settings} onEditCompany={() => openSettings('company')} now={now} />

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* Main Content View */}
        <main className="relative p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {hasSampleMonths && (
            <div
              role="status"
              className="no-print mb-5 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 ring-1 ring-inset ring-sky-200 dark:ring-sky-800/60 text-sm text-sky-900 dark:text-sky-200"
            >
              <span>
                <b>Você está usando meses de exemplo.</b> Eles entram nos cálculos; remova antes de lançar os seus.
              </span>
              <button
                type="button"
                onClick={handleRemoveSample}
                className="px-3 py-1 rounded-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer"
              >
                Remover exemplo
              </button>
            </div>
          )}
          {/* Troca de tela sem vazio: a anterior sai por cima (popLayout) enquanto a nova
              surge de um véu desfocado; os blocos da nova entram em sequência (page-stagger) */}
          <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={activeTab}
            className="page-transition"
            initial={reduceMotion ? false : { opacity: 0, filter: 'blur(6px)', scale: 0.995 }}
            animate={{
              opacity: 1,
              filter: 'blur(0px)',
              scale: 1,
              transition: instantIf(reduceMotion, { duration: 0.42, ease: EASE_OUT }),
              transitionEnd: { filter: 'none', transform: 'none' },
            }}
            exit={{ opacity: 0, filter: 'blur(4px)', transition: instantIf(reduceMotion, { duration: 0.18, ease: EASE_OUT }) }}
          >
          {!(isHistoryLoaded && remoteTablesLoaded) ? (
            <PageSkeleton />
          ) : (
          <Suspense fallback={<PageSkeleton />}>
          {activeTab === 'apuration' && (
            <MonthApurationView
              currentRevenue={currentRevenue}
              setCurrentRevenue={setCurrentRevenue}
              prolaboreRule={prolaboreRule}
              setProlaboreRule={setProlaboreRule}
              manualProlabore={manualProlabore}
              setManualProlabore={setManualProlabore}
              prolaboreOverride={apurationProlabore}
              savedRecord={selectedRecord ?? null}
              onEditSavedRecord={handleEditMonth}
              selectedMonth={selectedMonth}
              history={history}
              settings={apurationSettings}
              onSaveCurrentMonthToHistory={handleSaveMonthToHistory}
              onNavigateToHistory={() => setActiveTab('history')}
              onOpenSettings={() => openSettings()}
            />
          )}

          {activeTab === 'history' && (
            <HistoryTable
              history={history}
              onAddMonth={() => {
                setRecordToEdit(null);
                setIsAddMonthOpen(true);
              }}
              onEditMonth={handleEditMonth}
              onDeleteMonth={handleDeleteMonth}
              onGenerateSample={handleGenerateSample}
              onClearHistory={handleClearHistory}
              highlightId={lastSavedId}
            />
          )}

          {activeTab === 'comparison' && (
            <ComparisonView
              currentRevenue={currentRevenue}
              prolaboreOverride={apurationProlabore}
              selectedMonth={selectedMonth}
              history={history}
              settings={apurationSettings}
            />
          )}

          {activeTab === 'report' && (
            <ReportPrintView
              currentRevenue={currentRevenue}
              prolaboreOverride={apurationProlabore}
              selectedMonth={selectedMonth}
              history={history}
              settings={apurationSettings}
              onPrint={handlePrint}
            />
          )}
          </Suspense>
          )}
          </motion.div>
          </AnimatePresence>
        </main>
        </div>
      </div>

      {/* Modais: montados só enquanto abertos, para a saída animar (ModalShell) */}
      <AnimatePresence>
      {isSettingsOpen && (
      <Suspense key="settings" fallback={null}>
      <SettingsModal
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsTab}
        settings={settings}
        onSave={setSettings}
        onCheckUpdates={runUpdateCheck}
        newVersion={newVersion}
      />
      </Suspense>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {isSqliteManagerOpen && (
      <Suspense key="sqlite" fallback={null}>
      <SqliteManagerModal
        onClose={() => setIsSqliteManagerOpen(false)}
        settings={settings}
        history={history}
        onExportData={handleExportData}
        onImportData={handleImportData}
      />
      </Suspense>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {isAddMonthOpen && (
      <Suspense key="add-month" fallback={null}>
      <AddMonthModal
        onClose={() => {
          setIsAddMonthOpen(false);
          setRecordToEdit(null);
        }}
        onSave={(record) => {
          handleSaveMonthToHistory(record);
        }}
        recordToEdit={recordToEdit}
        defaultYearMonth={selectedMonth}
        settings={settings}
        existingHistory={history}
      />
      </Suspense>
      )}
      </AnimatePresence>
      {dialog}
    </div>
  );
}
