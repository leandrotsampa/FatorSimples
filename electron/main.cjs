/**
 * Processo Principal do Electron (main.cjs)
 * Responsável por gerenciar o ciclo de vida da aplicação desktop, janelas
 * e comunicação direta com o Banco de Dados SQLite local (fatorsimples.sqlite).
 */

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let db = null;
let dbPath = '';

// Obtém o diretório físico onde o arquivo .exe está localizado (Modo Portátil)
function getExecutableDirectory() {
  // 1. Se gerado como executável portátil (electron-builder portable):
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return process.env.PORTABLE_EXECUTABLE_DIR;
  }
  // 2. Se for o executável .exe empacotado (Windows / Mac / Linux):
  if (app.isPackaged) {
    return path.dirname(app.getPath('exe'));
  }
  // 3. Em desenvolvimento local:
  return process.cwd();
}

// Inicialização do Banco de Dados SQLite Local na própria pasta do executável
function initDatabase() {
  const targetDir = getExecutableDirectory();
  const portablePath = path.join(targetDir, 'fatorsimples.sqlite');

  // Verifica permissão de escrita na pasta do .exe
  try {
    fs.accessSync(targetDir, fs.constants.W_OK);
    dbPath = portablePath;
  } catch (err) {
    // Fallback caso o executável seja colocado em pasta restrita do sistema (ex: C:\Program Files)
    const userDataDir = app.getPath('userData');
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    dbPath = path.join(userDataDir, 'fatorsimples.sqlite');
  }

  console.log(`[FatorSimples] Banco de Dados SQLite configurado na pasta do .exe: ${dbPath}`);

  try {
    // Tenta carregar better-sqlite3 nativo se instalado
    const Database = require('better-sqlite3');
    db = new Database(dbPath);
    console.log('[FatorSimples] Driver better-sqlite3 inicializado com sucesso.');

    // Cria as tabelas do Simples Nacional e Histórico
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS tax_settings (
        id INTEGER PRIMARY KEY,
        company_name TEXT NOT NULL,
        cnpj TEXT,
        city_state TEXT,
        cnae TEXT,
        tax_version_id TEXT,
        minimum_wage REAL,
        inss_ceiling REAL,
        inss_rate REAL,
        dependents_count INTEGER,
        simplified_ir_deduction REAL,
        dependent_deduction REAL,
        prolabore_rule TEXT,
        manual_prolabore_amount REAL,
        auto_update_tables INTEGER DEFAULT 1,
        last_table_update_date TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS monthly_history (
        id TEXT PRIMARY KEY,
        year_month TEXT NOT NULL UNIQUE,
        revenue REAL NOT NULL,
        payroll REAL NOT NULL,
        inss REAL DEFAULT 0,
        irrf REAL DEFAULT 0,
        das_paid REAL DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE VIEW IF NOT EXISTS v_rbt12_summary AS
      SELECT 
        COUNT(*) as total_months,
        SUM(revenue) as rbt12,
        SUM(payroll) as folha12,
        (SUM(payroll) / SUM(revenue)) * 100 as factor_r_percent
      FROM (
        SELECT revenue, payroll FROM monthly_history ORDER BY year_month DESC LIMIT 12
      );
    `);
  } catch (err) {
    console.warn('[FatorSimples] better-sqlite3 não encontrado ou pendente de build nativo. Usando fallback de persistência em arquivo estruturado JSON/SQLite no disco.');
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 980,
    minHeight: 650,
    title: 'FatorSimples - Calculadora Simples Nacional & Fator R',
    backgroundColor: '#020617',
    // Ícone da janela/barra de tarefas (copiado de public/ para dist/ no build)
    icon: path.join(__dirname, '..', 'dist', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Em desenvolvimento abre porta 3000, em produção carrega dist/index.html
  const devUrl = 'http://localhost:3000';
  const prodPath = path.join(__dirname, '..', 'dist', 'index.html');

  if (process.env.NODE_ENV === 'development' || !fs.existsSync(prodPath)) {
    mainWindow.loadURL(devUrl).catch(() => {
      mainWindow.loadFile(prodPath);
    });
  } else {
    mainWindow.loadFile(prodPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Caminho de fallback portátil na pasta do .exe
function getFallbackFilePath() {
  const targetDir = getExecutableDirectory();
  try {
    fs.accessSync(targetDir, fs.constants.W_OK);
    return path.join(targetDir, 'fatorsimples_data.json');
  } catch (err) {
    return path.join(app.getPath('userData'), 'fatorsimples_data.json');
  }
}

// Configuração dos canais IPC do SQLite para o Renderer (React)
function setupIpcHandlers() {
  ipcMain.handle('sqlite:get-db-path', () => {
    return dbPath;
  });

  ipcMain.handle('sqlite:open-db-folder', async () => {
    const targetDir = getExecutableDirectory();
    if (fs.existsSync(dbPath)) {
      shell.showItemInFolder(dbPath);
    } else {
      shell.openPath(targetDir);
    }
    return true;
  });

  ipcMain.handle('sqlite:get-history', () => {
    if (db) {
      const rows = db.prepare('SELECT * FROM monthly_history ORDER BY year_month DESC').all();
      return rows.map((r) => ({
        id: r.id,
        yearMonth: r.year_month,
        revenue: r.revenue,
        payroll: r.payroll,
        inss: r.inss,
        irrf: r.irrf,
        dasPaid: r.das_paid,
        notes: r.notes || undefined,
      }));
    }
    // Fallback de arquivo caso o driver nativo esteja sendo compilado
    const fallbackFile = getFallbackFilePath();
    if (fs.existsSync(fallbackFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(fallbackFile, 'utf-8'));
        return data.history || [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  ipcMain.handle('sqlite:save-month', (event, record) => {
    if (db) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO monthly_history (id, year_month, revenue, payroll, inss, irrf, das_paid, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        record.id,
        record.yearMonth,
        record.revenue,
        record.payroll,
        record.inss,
        record.irrf,
        record.dasPaid,
        record.notes || null
      );
      return true;
    }
    // Fallback de persistência no disco
    const fallbackFile = getFallbackFilePath();
    let data = { history: [], settings: null };
    if (fs.existsSync(fallbackFile)) {
      try { data = JSON.parse(fs.readFileSync(fallbackFile, 'utf-8')); } catch (e) {}
    }
    data.history = [record, ...(data.history || []).filter((h) => h.yearMonth !== record.yearMonth)];
    fs.writeFileSync(fallbackFile, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  });

  ipcMain.handle('sqlite:delete-month', (event, id) => {
    if (db) {
      db.prepare('DELETE FROM monthly_history WHERE id = ?').run(id);
      return true;
    }
    const fallbackFile = getFallbackFilePath();
    if (fs.existsSync(fallbackFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(fallbackFile, 'utf-8'));
        data.history = (data.history || []).filter((h) => h.id !== id);
        fs.writeFileSync(fallbackFile, JSON.stringify(data, null, 2), 'utf-8');
      } catch (e) {}
    }
    return true;
  });

  ipcMain.handle('sqlite:clear-history', () => {
    if (db) {
      db.prepare('DELETE FROM monthly_history').run();
      return true;
    }
    const fallbackFile = getFallbackFilePath();
    if (fs.existsSync(fallbackFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(fallbackFile, 'utf-8'));
        data.history = [];
        fs.writeFileSync(fallbackFile, JSON.stringify(data, null, 2), 'utf-8');
      } catch (e) {}
    }
    return true;
  });

  ipcMain.handle('sqlite:get-settings', () => {
    if (db) {
      const row = db.prepare('SELECT * FROM tax_settings WHERE id = 1').get();
      if (row) {
        return {
          companyName: row.company_name,
          cnpj: row.cnpj,
          cityState: row.city_state,
          cnae: row.cnae,
          taxVersionId: row.tax_version_id,
          minimumWage: row.minimum_wage,
          inssCeiling: row.inss_ceiling,
          inssRate: row.inss_rate,
          dependentsCount: row.dependents_count,
          simplifiedIrDeduction: row.simplified_ir_deduction,
          dependentDeduction: row.dependent_deduction,
          prolaboreRule: row.prolabore_rule,
          manualProlaboreAmount: row.manual_prolabore_amount || 2500,
          autoUpdateTables: Boolean(row.auto_update_tables),
          lastTableUpdateDate: row.last_table_update_date,
        };
      }
    }
    const fallbackFile = getFallbackFilePath();
    if (fs.existsSync(fallbackFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(fallbackFile, 'utf-8'));
        return data.settings || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  ipcMain.handle('sqlite:save-settings', (event, settings) => {
    if (db) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO tax_settings (
          id, company_name, cnpj, city_state, cnae, tax_version_id, minimum_wage,
          inss_ceiling, inss_rate, dependents_count, simplified_ir_deduction,
          dependent_deduction, prolabore_rule, manual_prolabore_amount, auto_update_tables,
          last_table_update_date, updated_at
        ) VALUES (
          1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
        )
      `);
      stmt.run(
        settings.companyName || '',
        settings.cnpj || '',
        settings.cityState || '',
        settings.cnae || '',
        settings.taxVersionId || '2026_oficial',
        settings.minimumWage,
        settings.inssCeiling,
        settings.inssRate,
        settings.dependentsCount,
        settings.simplifiedIrDeduction,
        settings.dependentDeduction,
        settings.prolaboreRule,
        settings.manualProlaboreAmount || 2500,
        settings.autoUpdateTables ? 1 : 0,
        settings.lastTableUpdateDate || ''
      );
      return true;
    }
    const fallbackFile = getFallbackFilePath();
    let data = { history: [], settings: null };
    if (fs.existsSync(fallbackFile)) {
      try { data = JSON.parse(fs.readFileSync(fallbackFile, 'utf-8')); } catch (e) {}
    }
    data.settings = settings;
    fs.writeFileSync(fallbackFile, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  });
}

// Inicialização do app
app.whenReady().then(() => {
  initDatabase();
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
