import React from 'react';
import {
  Calculator,
  History,
  Scale,
  FileText,
  Settings,
  Download,
  Upload,
  RotateCcw,
  Printer,
  Sparkles,
  Sun,
  Moon,
  Database,
} from 'lucide-react';
import { TaxSettings } from '../types/tax';

interface DesktopHeaderProps {
  activeTab: 'apuration' | 'history' | 'comparison' | 'report';
  setActiveTab: (tab: 'apuration' | 'history' | 'comparison' | 'report') => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onOpenSettings: () => void;
  onOpenSqliteManager: () => void;
  onExportSqlite?: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
  onResetData: () => void;
  onPrintReport: () => void;
  settings: TaxSettings;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedMonth,
  setSelectedMonth,
  onOpenSettings,
  onOpenSqliteManager,
  onExportJson,
  onImportJson,
  onResetData,
  onPrintReport,
  settings,
  theme,
  toggleTheme,
}) => {
  return (
    <header className="no-print bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 select-none shadow-xs transition-colors duration-200">
      {/* Native Desktop Window Bar (macOS / Windows style) */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100/90 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400 transition-colors">
        {/* Window controls traffic lights */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block hover:opacity-80 cursor-default" title="Fechar" />
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block hover:opacity-80 cursor-default" title="Minimizar" />
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block hover:opacity-80 cursor-default" title="Maximizar" />
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5 text-sm">
            <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            FatorSimples
          </span>
          <span className="text-slate-400 dark:text-slate-600">·</span>
          <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px] font-medium truncate max-w-[220px]">
            {settings.companyName || 'Empresa Simples'}
          </span>
          <span className="text-slate-500 dark:text-slate-500">({settings.cityState || 'SC'})</span>
        </div>

        {/* Center: Reference Month selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1 rounded-md border border-slate-300 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Competência:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-emerald-700 dark:text-emerald-400 font-mono font-semibold text-xs focus:outline-none cursor-pointer"
          />
        </div>

        {/* Right: Quick system utilities */}
        <div className="flex items-center gap-1">
          {/* Light/Dark mode toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Mudar para Modo Claro (Light)' : 'Mudar para Modo Escuro (Dark)'}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer flex items-center gap-1"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
            <span className="text-[11px] font-medium hidden sm:inline">
              {theme === 'dark' ? 'Claro' : 'Escuro'}
            </span>
          </button>

          <div className="w-[1px] h-3.5 bg-slate-300 dark:bg-slate-800 mx-1" />

          {/* SQLite Manager & Portability Modal Button */}
          <button
            onClick={onOpenSqliteManager}
            title="Gerenciador de Banco de Dados SQLite (Portabilidade entre computadores)"
            className="p-1.5 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px]">Banco SQLite</span>
          </button>

          <button
            onClick={onPrintReport}
            title="Imprimir Apuração / Salvar PDF"
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onExportJson}
            title="Exportar Backup (JSON)"
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onImportJson}
            title="Importar Backup (JSON)"
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetData}
            title="Restaurar Exemplo Inicial"
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-slate-300 dark:bg-slate-800 mx-1" />

          <button
            onClick={onOpenSettings}
            title="Parâmetros Fiscais & Configurações"
            className="p-1.5 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1 cursor-pointer font-medium"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="text-[11px]">Configurações</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-2.5">
        <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/50 p-1 rounded-lg border border-slate-200 dark:border-slate-800/80">
          <button
            onClick={() => setActiveTab('apuration')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'apuration'
                ? 'bg-white text-emerald-700 border border-slate-300 shadow-xs dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>01. Apuração do Mês</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-emerald-700 border border-slate-300 shadow-xs dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>02. Histórico RBT12</span>
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'comparison'
                ? 'bg-white text-emerald-700 border border-slate-300 shadow-xs dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>03. Análise Anexo III vs V</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'report'
                ? 'bg-white text-emerald-700 border border-slate-300 shadow-xs dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>04. Relatório para Contador</span>
          </button>
        </nav>

        {/* Right info kicker */}
        <div className="hidden lg:flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-700 dark:text-slate-300">
            <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Fator R Simples:</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">Folha / RBT12 ≥ 28%</span>
          </div>
        </div>
      </div>
    </header>
  );
};
