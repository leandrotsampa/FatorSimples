import React, { useState, useEffect } from 'react';
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
  calculateGoldRuleProlabore,
  fillMissingTaxes,
} from './utils/taxCalculations';
import { getTaxTableForCompetence, OFFICIAL_TAX_TABLES } from './utils/taxTablesRegistry';
import { buildDataExport, parseDataImport, DataImport } from './utils/dataTransfer';

import { storageAdapter } from './utils/storageAdapter';
import { runThemeWipe } from './utils/themeTransition';

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
  const toggleTheme = (origin?: HTMLElement | null) => {
    const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Fallback
    }
    runThemeWipe(origin ?? null, () => {
      document.documentElement.classList.toggle('dark', next === 'dark');
      flushSync(() => setTheme(next));
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

  // Aba ativa
  const [activeTab, setActiveTab] = useState<'apuration' | 'history' | 'comparison' | 'report'>('apuration');

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
  useEffect(() => {
    if (selectedRecord) {
      // Pró-labore salvo igual aos 28% (tolerância de 1 centavo de arredondamento) = regra 28%
      const goldRule = calculateGoldRuleProlabore(selectedRecord.revenue, settings);
      const isGoldRule = Math.abs(selectedRecord.payroll - goldRule) <= 0.01 + 1e-9;
      setCurrentRevenue(selectedRecord.revenue);
      setProlaboreRule(isGoldRule ? 'auto_28_month' : 'manual');
      setManualProlabore(selectedRecord.payroll);
    } else {
      setCurrentRevenue(0);
      setProlaboreRule('auto_28_month');
      setManualProlabore(0);
    }
  }, [selectedMonth, selectedRecordKey]);

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
  };

  const handleEditMonth = (record: MonthRecord) => {
    setRecordToEdit(record);
    setIsAddMonthOpen(true);
  };

  const handleDeleteMonth = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover esta competência do histórico?')) {
      setHistory((prev) => prev.filter((item) => item.id !== id));
      storageAdapter.deleteMonth(id);
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
      />

      {/* Viewport Principal com Rolagem Independente */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Window Bar (Cabeçalho de Aplicação Desktop) */}
        <header className="no-print bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {settings.companyName || 'Empresa Simples Nacional'}
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
            <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 hidden sm:inline">
              {settings.cityState || 'Brusque - SC'}
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden md:inline">|</span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hidden md:inline">
              CNPJ: {settings.cnpj || '00.000.000/0001-00'}
            </span>
          </div>
        </header>

        {/* Main Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
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
        </main>
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={setSettings}
      />

      <SqliteManagerModal
        isOpen={isSqliteManagerOpen}
        onClose={() => setIsSqliteManagerOpen(false)}
        settings={settings}
        history={history}
        onExportData={handleExportData}
        onImportData={handleImportData}
      />

      <AddMonthModal
        isOpen={isAddMonthOpen}
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
    </div>
  );
}
