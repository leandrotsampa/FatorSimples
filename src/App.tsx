import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Sidebar } from './components/Sidebar';
import { MonthApurationView } from './components/MonthApurationView';
import { HistoryTable } from './components/HistoryTable';
import { ComparisonView } from './components/ComparisonView';
import { ReportPrintView } from './components/ReportPrintView';
import { SettingsModal } from './components/SettingsModal';
import { AddMonthModal } from './components/AddMonthModal';
import { SqliteManagerModal } from './components/SqliteManagerModal';
import { MonthRecord, TaxSettings } from './types/tax';
import {
  DEFAULT_SETTINGS,
  generateSampleHistory,
  fillMissingTaxes,
} from './utils/taxCalculations';
import { getTaxTableForCompetence, OFFICIAL_TAX_TABLES } from './utils/taxTablesRegistry';
import { buildDataExport, parseDataImport, DataImport } from './utils/dataTransfer';

import { storageAdapter } from './utils/storageAdapter';
import { runThemeWipe } from './utils/themeTransition';
import { competenceInputs } from './utils/competenceInputs';
import { AnimatePresence, motion } from 'motion/react';
import { DURATION, EASE_OUT } from './utils/motion';
import { useUiPrefs } from './hooks/useUiPrefs';
import { playSound } from './hooks/useSound';

const SETTINGS_STORAGE_KEY = 'fatorsimples_settings_v2';
const HISTORY_STORAGE_KEY = 'fatorsimples_history_v2';
const THEME_STORAGE_KEY = 'fatorsimples_theme_v2';

export default function App() {
  // Tema visual (dark ou light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    } catch {
      // Fallback
    }
    return 'dark';
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
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Fallback
    }
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
    window.electronAPI?.setTitleBarTheme?.(theme);
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
  const [activeTab, setActiveTab] = useState<'apuration' | 'history' | 'comparison' | 'report'>('apuration');
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  // Modais
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSqliteManagerOpen, setIsSqliteManagerOpen] = useState(false);
  const [isAddMonthOpen, setIsAddMonthOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<MonthRecord | null>(null);

  // Configurações fiscais com persistência no SQLite (se Electron) ou localStorage (se web)
  const [settings, setSettings] = useState<TaxSettings>(() => {
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

  // Carrega do SQLite na inicialização se estiver rodando no Electron
  useEffect(() => {
    if (storageAdapter.isElectron()) {
      storageAdapter.loadSettings().then((s) => s && setSettings(s));
      storageAdapter.loadHistory().then(setHistory);
    }
  }, []);

  // Salva no LocalStorage e SQLite sempre que alterar
  useEffect(() => {
    storageAdapter.saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Erro ao salvar history:', e);
    }
  }, [history]);

  // ATUALIZAÇÃO AUTOMÁTICA DE TABELAS CONFORME A COMPETÊNCIA SELECIONADA
  useEffect(() => {
    if (settings.autoUpdateTables && selectedMonth) {
      const targetTable = getTaxTableForCompetence(selectedMonth);
      // Reaplica também quando a tabela oficial do mesmo ano foi revisada no app (o nome muda);
      // ajustes manuais feitos depois da aplicação não são sobrescritos
      const isOutdated =
        targetTable &&
        (targetTable.id !== settings.taxVersionId ||
          !(settings.lastTableUpdateDate ?? '').includes(targetTable.name));
      if (isOutdated) {
        setSettings((prev) => ({
          ...prev,
          taxVersionId: targetTable.id,
          minimumWage: targetTable.minimumWage,
          inssCeiling: targetTable.inssCeiling,
          simplifiedIrDeduction: targetTable.simplifiedIrDeduction,
          dependentDeduction: targetTable.dependentDeduction,
          lastTableUpdateDate: `Auto-atualizado p/ competência ${selectedMonth}: ${targetTable.name}`,
        }));
      }
    }
  }, [selectedMonth, settings.autoUpdateTables, settings.taxVersionId, settings.lastTableUpdateDate]);

  // Ações de gerenciamento de dados
  const handleSaveMonthToHistory = (newRecord: MonthRecord) => {
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

  const handleDeleteMonth = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover esta competência do histórico?')) {
      setHistory((prev) => prev.filter((item) => item.id !== id));
      storageAdapter.deleteMonth(id);
      playSound('delete');
    }
  };

  // Exemplo só pode ser gerado com o histórico vazio, para nunca sobrescrever dados reais
  const handleGenerateSample = () => {
    if (history.length > 0) {
      alert('O histórico já possui competências. Os meses de exemplo só podem ser gerados com o histórico vazio.');
      return;
    }
    const sample = generateSampleHistory(currentRevenue || 25000, 0.285);
    setHistory(sample);
    if (storageAdapter.isElectron()) {
      sample.forEach((rec) => storageAdapter.saveMonth(rec));
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Tem certeza que deseja limpar todo o histórico de competências?')) {
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
  const handleImportData = (content: string) => {
    let imported: DataImport;
    try {
      imported = parseDataImport(content);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao processar o arquivo selecionado.');
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
      alert('O arquivo não contém dados da empresa nem competências.');
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
    if (!window.confirm(lines.join('\n'))) return;

    if (company) {
      setSettings((prev) => ({ ...prev, ...company }));
    }
    if (records.length > 0) {
      const importedMonths = new Set(records.map((r) => r.yearMonth));
      setHistory((prev) => [...records, ...prev.filter((h) => !importedMonths.has(h.yearMonth))]);
      records.forEach((rec) => storageAdapter.saveMonth(rec));
    }

    alert('Dados importados com sucesso!');
    setIsSqliteManagerOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`min-h-screen flex flex-row font-sans overflow-hidden ${
      theme === 'dark'
        ? 'bg-slate-950 text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-200'
        : 'bg-slate-100 text-slate-800 selection:bg-emerald-500/20 selection:text-emerald-800'
    }`}>
      {/* Menu Lateral Desktop (Sidebar) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSqliteManager={() => setIsSqliteManagerOpen(true)}
        settings={settings}
        history={history}
        theme={theme}
        toggleTheme={toggleTheme}
        mode={sidebarMode}
        onToggleMode={toggleSidebar}
      />

      {/* Viewport principal: barra de título fixa e, abaixo dela, a área que rola
          (assim a barra de rolagem nunca passa por baixo dos botões nativos da janela) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Barra de título da janela: arrasta a janela e deixa espaço para os botões nativos */}
        <header className={`no-print app-drag titlebar-safe h-10 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pl-6 flex items-center justify-between z-30`}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {settings.companyName || 'Empresa Simples Nacional'}
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
            <span className="text-xs font-num font-bold text-emerald-700 dark:text-emerald-400 hidden sm:inline">
              {settings.cityState || 'Brusque - SC'}
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden md:inline">|</span>
            <span className="text-[11px] font-num text-slate-500 dark:text-slate-400 hidden md:inline">
              CNPJ: {settings.cnpj || '00.000.000/0001-00'}
            </span>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* Main Content View */}
        <main className="relative p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Troca de tela sem vazio: a anterior sai por cima (popLayout) enquanto a nova
              surge de um véu desfocado; os blocos da nova entram em sequência (page-stagger) */}
          <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={activeTab}
            className="page-transition"
            initial={{ opacity: 0, filter: 'blur(6px)', scale: 0.995 }}
            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, transition: { duration: 0.42, ease: EASE_OUT } }}
            exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.18, ease: EASE_OUT } }}
          >
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
          </motion.div>
          </AnimatePresence>
        </main>
        </div>
      </div>

      {/* Modais: montados só enquanto abertos, para a saída animar (ModalShell) */}
      <AnimatePresence>
      {isSettingsOpen && (
      <SettingsModal
        key="settings"
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={setSettings}
      />
      )}
      </AnimatePresence>

      <AnimatePresence>
      {isSqliteManagerOpen && (
      <SqliteManagerModal
        key="sqlite"
        onClose={() => setIsSqliteManagerOpen(false)}
        settings={settings}
        history={history}
        onExportData={handleExportData}
        onImportData={handleImportData}
      />
      )}
      </AnimatePresence>

      <AnimatePresence>
      {isAddMonthOpen && (
      <AddMonthModal
        key="add-month"
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
      )}
      </AnimatePresence>
    </div>
  );
}
