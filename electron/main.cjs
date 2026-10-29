/**
 * Processo Principal do Electron (main.cjs)
 * Responsável por gerenciar o ciclo de vida da aplicação desktop, janelas
 * e comunicação direta com o Banco de Dados SQLite local (fatorsimples.sqlite).
 */

const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { windowChromeOptions, windowControlFor, shortcutFor } = require('./windowChrome.cjs');
const { ensureSettingsColumns } = require('./settingsSchema.cjs');
const { portableDirectoryFor } = require('./dataDirectory.cjs');
const { APP_STATE_KEYS, appStateEntryFor } = require('./appState.cjs');
const { importLegacyData } = require('./legacyJson.cjs');

let mainWindow = null;
let db = null;
// Problema ao abrir o banco: a interface mostra a tela de erro (não existe banco paralelo)
let storageError = null;
let dbPath = '';
// 'portable' = banco ao lado do app; 'system' = pasta de dados do sistema (userData)
let storageMode = 'portable';

// Pasta onde o banco fica ao lado do app (modo portátil), ou null para a pasta de dados do usuário
function getPortableDirectory() {
  return portableDirectoryFor({
    env: process.env,
    platform: process.platform,
    isPackaged: app.isPackaged,
    exePath: app.getPath('exe'),
    cwd: process.cwd(),
  });
}

// Pasta dos dados: ao lado do app quando possível e gravável; senão, a pasta de dados do sistema
function getDataDirectory() {
  const portableDir = getPortableDirectory();
  if (portableDir) {
    try {
      fs.accessSync(portableDir, fs.constants.W_OK);
      storageMode = 'portable';
      return portableDir;
    } catch (err) {
      // pasta restrita (ex.: C:\Program Files): cai para a pasta de dados do sistema
    }
  }
  const userDataDir = app.getPath('userData');
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }
  storageMode = 'system';
  return userDataDir;
}

// Inicialização do Banco de Dados SQLite local
function initDatabase() {
  dbPath = path.join(getDataDirectory(), 'fatorsimples.sqlite');

  console.log(`[FatorSimples] Banco de Dados SQLite (${storageMode}): ${dbPath}`);

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

      -- Tabelas fiscais baixadas do GitHub (arquivo validado inteiro, em JSON) e a última verificação
      CREATE TABLE IF NOT EXISTS remote_tax_tables (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        doc TEXT,
        checked_at TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Estado do app que acompanha os dados (ex.: o que o tutorial já mostrou)
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value TEXT,
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
    // Colunas novas em bancos de versões anteriores (ex.: honorários da contabilidade)
    try {
      ensureSettingsColumns(db);
    } catch (migrationErr) {
      console.error('[FatorSimples] Falha ao atualizar a estrutura do banco.', migrationErr);
      try { db.close(); } catch (e) {}
      db = null;
      storageError = { message: `Não foi possível atualizar a estrutura do banco: ${migrationErr.message}`, dbPath };
      return;
    }
    importLegacyJson();
  } catch (err) {
    console.error('[FatorSimples] Não foi possível abrir o banco SQLite.', err);
    try { if (db) db.close(); } catch (e) {}
    db = null;
    storageError = { message: err && err.message ? err.message : String(err), dbPath };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 980,
    minHeight: 650,
    title: 'FatorSimples - Calculadora Simples Nacional & Fator R',
    backgroundColor: '#e7eee9', // fundo do tema claro (padrão) até a interface carregar
    // Barra de título e botões da janela desenhados pelo app (no macOS, os botões do sistema)
    ...windowChromeOptions(process.platform),
    // Ícone da janela/barra de tarefas (copiado de public/ para dist/ no build)
    icon: path.join(__dirname, '..', 'dist', 'icon.png'),
    // Só aparece com a interface desenhada (sem janela vazia piscando na abertura)
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      // Corretor ortográfico não é usado (só números e nomes); guarda o JS compilado para as próximas aberturas
      spellcheck: false,
      v8CacheOptions: 'bypassHeatCheck',
    },
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  // Garantia: se a interface demorar ou falhar ao carregar, a janela aparece mesmo assim
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) mainWindow.show();
  }, 4000);

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

  // Ícone do botão maximizar/restaurar acompanha o estado da janela (também ao arrastar ou dar duplo clique)
  const sendMaximized = () => mainWindow.webContents.send('window:maximized', mainWindow.isMaximized());
  mainWindow.on('maximize', sendMaximized);
  mainWindow.on('unmaximize', sendMaximized);

  // Atalhos que vinham do menu padrão (zoom sempre; recarregar e DevTools só fora do build)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const action = shortcutFor(input, app.isPackaged);
    if (!action) return;
    event.preventDefault();
    const wc = mainWindow.webContents;
    const zoom = (delta) => wc.setZoomLevel(Math.min(3, Math.max(-3, wc.getZoomLevel() + delta)));
    if (action === 'zoom-in') zoom(0.5);
    else if (action === 'zoom-out') zoom(-0.5);
    else if (action === 'zoom-reset') wc.setZoomLevel(0);
    else if (action === 'reload') wc.reload();
    else if (action === 'devtools') wc.toggleDevTools();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Sem a barra File/Edit/View/Window. No macOS fica um menu mínimo: sem o menu Editar
// o Cmd+C/V para de funcionar nos campos
function setupApplicationMenu() {
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }]));
  } else {
    Menu.setApplicationMenu(null);
  }
}

// Operações do banco, usadas pelos canais IPC e pela importação do JSON antigo
const dataOps = {
  getHistory() {
    return db.prepare('SELECT * FROM monthly_history ORDER BY year_month DESC').all().map((r) => ({
      id: r.id,
      yearMonth: r.year_month,
      revenue: r.revenue,
      payroll: r.payroll,
      inss: r.inss,
      irrf: r.irrf,
      dasPaid: r.das_paid,
      notes: r.notes || undefined,
    }));
  },
  hasMonth(yearMonth) {
    return Boolean(db.prepare('SELECT 1 FROM monthly_history WHERE year_month = ?').get(yearMonth));
  },
  saveMonth(record) {
    db.prepare(`
      INSERT OR REPLACE INTO monthly_history (id, year_month, revenue, payroll, inss, irrf, das_paid, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(record.id, record.yearMonth, record.revenue, record.payroll, record.inss, record.irrf, record.dasPaid, record.notes || null);
  },
  getSettings() {
    const row = db.prepare('SELECT * FROM tax_settings WHERE id = 1').get();
    if (!row) return null;
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
      accountingFee: row.accounting_fee || 0,
      autoUpdateTables: Boolean(row.auto_update_tables),
      lastTableUpdateDate: row.last_table_update_date,
    };
  },
  hasSettings() {
    return Boolean(db.prepare('SELECT 1 FROM tax_settings WHERE id = 1').get());
  },
  saveSettings(settings) {
    db.prepare(`
      INSERT OR REPLACE INTO tax_settings (
        id, company_name, cnpj, city_state, cnae, tax_version_id, minimum_wage,
        inss_ceiling, inss_rate, dependents_count, simplified_ir_deduction,
        dependent_deduction, prolabore_rule, manual_prolabore_amount, auto_update_tables,
        last_table_update_date, accounting_fee, updated_at
      ) VALUES (
        1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
      )
    `).run(
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
      settings.lastTableUpdateDate || '',
      Number(settings.accountingFee) || 0
    );
  },
  getRemoteTables() {
    const row = db.prepare('SELECT doc, checked_at FROM remote_tax_tables WHERE id = 1').get();
    if (!row) return null;
    let doc = null;
    try { doc = row.doc ? JSON.parse(row.doc) : null; } catch (e) {}
    return { doc, checkedAt: row.checked_at || null };
  },
  hasRemoteTables() {
    return Boolean(db.prepare('SELECT 1 FROM remote_tax_tables WHERE id = 1').get());
  },
  saveRemoteTables(stored) {
    const doc = stored && stored.doc ? JSON.stringify(stored.doc) : null;
    const checkedAt = stored && typeof stored.checkedAt === 'string' ? stored.checkedAt : null;
    db.prepare(
      'INSERT OR REPLACE INTO remote_tax_tables (id, doc, checked_at, updated_at) VALUES (1, ?, ?, CURRENT_TIMESTAMP)'
    ).run(doc, checkedAt);
  },
  getAppState(key) {
    const row = db.prepare('SELECT value FROM app_state WHERE key = ?').get(key);
    return row ? row.value : null;
  },
  setAppState(key, value) {
    db.prepare('INSERT OR REPLACE INTO app_state (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(key, value);
  },
};

// JSON de reserva das versões até a 1.4.0 (fazia o papel de banco quando o SQLite não carregava):
// importado uma vez para o banco e renomeado para .importado. Não é mais gravado
function importLegacyJson() {
  const file = path.join(path.dirname(dbPath), 'fatorsimples_data.json');
  if (!db || !fs.existsSync(file)) return;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const result = db.transaction(() => importLegacyData(data, dataOps))();
    fs.renameSync(file, `${file}.importado`);
    console.log('[FatorSimples] JSON de reserva antigo importado para o banco:', result);
  } catch (e) {
    console.error('[FatorSimples] Não foi possível importar o JSON de reserva antigo:', e);
  }
}

// Configuração dos canais IPC do SQLite para o Renderer (React)
function setupIpcHandlers() {
  // Página de versões do FatorSimples no navegador (endereço fixo: o renderer não escolhe a URL)
  // Tentar de novo depois de um erro ao abrir o banco
  ipcMain.handle('app:relaunch', () => {
    app.relaunch();
    app.exit(0);
  });

  ipcMain.handle('app:open-releases', () => {
    shell.openExternal('https://github.com/leandrotsampa/FatorSimples/releases/latest');
  });

  // Botões da janela desenhados pelo app (minimizar, maximizar/restaurar e fechar)
  ipcMain.handle('window:control', (event, action) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const control = windowControlFor(action);
    if (!win || !control) return;
    if (control === 'minimize') win.minimize();
    else if (control === 'close') win.close();
    else if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.handle('window:is-maximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return Boolean(win && win.isMaximized());
  });

  ipcMain.handle('sqlite:get-db-path', () => {
    return dbPath;
  });

  ipcMain.handle('sqlite:get-storage-mode', () => {
    return storageMode;
  });

  ipcMain.handle('sqlite:open-db-folder', async () => {
    if (fs.existsSync(dbPath)) {
      shell.showItemInFolder(dbPath);
    } else {
      shell.openPath(path.dirname(dbPath));
    }
    return true;
  });

  // Dados: o SQLite é a única fonte. Sem banco (o módulo não carregou), a interface mostra a tela
  // de erro; os canais devolvem vazio e não gravam em lugar nenhum
  ipcMain.on('app-state:initial', (event) => {
    const state = {};
    for (const key of APP_STATE_KEYS) state[key] = db ? dataOps.getAppState(key) : null;
    event.returnValue = { state, storageError };
  });

  ipcMain.handle('sqlite:get-history', () => (db ? dataOps.getHistory() : []));

  ipcMain.handle('sqlite:save-month', (event, record) => {
    if (!db) return false;
    dataOps.saveMonth(record);
    return true;
  });

  ipcMain.handle('sqlite:delete-month', (event, id) => {
    if (!db) return false;
    db.prepare('DELETE FROM monthly_history WHERE id = ?').run(id);
    return true;
  });

  ipcMain.handle('sqlite:clear-history', () => {
    if (!db) return false;
    db.prepare('DELETE FROM monthly_history').run();
    return true;
  });

  // Estado do app guardado junto com os dados: tutorial, tema, preferências e versão ignorada
  ipcMain.handle('sqlite:get-app-state', (event, key) => {
    if (!db || !APP_STATE_KEYS.includes(key)) return null;
    return dataOps.getAppState(key);
  });

  ipcMain.handle('sqlite:set-app-state', (event, key, value) => {
    const entry = appStateEntryFor(key, value);
    if (!db || !entry) return false;
    dataOps.setAppState(entry.key, entry.value);
    return true;
  });

  ipcMain.handle('sqlite:get-remote-tables', () => (db ? dataOps.getRemoteTables() : null));

  ipcMain.handle('sqlite:save-remote-tables', (event, stored) => {
    if (!db) return false;
    dataOps.saveRemoteTables(stored);
    return true;
  });

  ipcMain.handle('sqlite:get-settings', () => (db ? dataOps.getSettings() : null));

  ipcMain.handle('sqlite:save-settings', (event, settings) => {
    if (!db) return false;
    dataOps.saveSettings(settings);
    return true;
  });
}

// Inicialização do app
app.whenReady().then(() => {
  initDatabase();
  setupIpcHandlers();
  setupApplicationMenu();
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
