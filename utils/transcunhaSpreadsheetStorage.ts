import { TranscunhaSpreadsheetRow } from './transcunhaSpreadsheetParser';

const DB_NAME = 'transcunha_storage_db';
const DB_VERSION = 1;
const STORE_NAME = 'spreadsheet_store';

const KEY_ROWS = 'spreadsheet_rows';
const KEY_ACTIVE_SHEET = 'active_sheet';
const KEY_SHEET_NAMES = 'sheet_names';
const KEY_LAST_SAVED = 'last_saved_timestamp';

// Cache em memória para leitura síncrona instantânea
let inMemoryRowsCache: TranscunhaSpreadsheetRow[] | null = null;
let inMemoryActiveSheet: string | null = null;
let inMemorySheetNames: string[] | null = null;

/**
 * Abre o banco de dados IndexedDB de forma resiliente
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste navegador'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Falha ao abrir IndexedDB'));
    };
  });
}

/**
 * Salva as linhas no IndexedDB (sem limite de 5MB do localStorage).
 * Suporta 16.000+ linhas com dezenas de colunas instantaneamente.
 */
export async function saveSpreadsheetRowsToIndexedDB(rows: TranscunhaSpreadsheetRow[]): Promise<boolean> {
  inMemoryRowsCache = rows;

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      store.put(rows, KEY_ROWS);
      store.put(Date.now(), KEY_LAST_SAVED);

      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };

      tx.onerror = (e) => {
        console.error('Erro na transação do IndexedDB ao salvar linhas:', e);
        db.close();
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('IndexedDB inacessível, tentando fallback:', err);
    // Fallback: se o dataset for pequeno, tenta salvar no localStorage
    if (typeof window !== 'undefined' && rows.length <= 400) {
      try {
        localStorage.setItem('transcunha_spreadsheet_rows', JSON.stringify(rows));
        return true;
      } catch {}
    }
    return false;
  }
}

/**
 * Carrega as linhas salvas no IndexedDB.
 * Se vazio no IndexedDB, migra automaticamente do localStorage se existir.
 */
export async function loadSpreadsheetRowsFromIndexedDB(): Promise<TranscunhaSpreadsheetRow[] | null> {
  if (inMemoryRowsCache && inMemoryRowsCache.length > 0) {
    return inMemoryRowsCache;
  }

  try {
    const db = await openDB();
    const rows = await new Promise<TranscunhaSpreadsheetRow[] | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_ROWS);

      req.onsuccess = () => {
        const val = req.result;
        db.close();
        if (Array.isArray(val) && val.length > 0) {
          resolve(val);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });

    if (rows && rows.length > 0) {
      inMemoryRowsCache = rows;
      return rows;
    }
  } catch (err) {
    console.warn('Falha ao ler IndexedDB:', err);
  }

  // Migração automática a partir do localStorage legado
  if (typeof window !== 'undefined') {
    try {
      const legacy = localStorage.getItem('transcunha_spreadsheet_rows');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryRowsCache = parsed;
          // Migra para o IndexedDB em background
          saveSpreadsheetRowsToIndexedDB(parsed).catch(() => {});
          return parsed;
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Salva metadados da planilha (Aba ativa e lista de abas disponíveis)
 */
export async function saveSpreadsheetMetadata(activeSheet: string, sheetNames: string[]): Promise<void> {
  inMemoryActiveSheet = activeSheet;
  inMemorySheetNames = sheetNames;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('transcunha_spreadsheet_active_sheet', activeSheet);
      localStorage.setItem('transcunha_spreadsheet_sheets', JSON.stringify(sheetNames));
    } catch {}
  }

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(activeSheet, KEY_ACTIVE_SHEET);
    store.put(sheetNames, KEY_SHEET_NAMES);
    tx.oncomplete = () => db.close();
  } catch {}
}

/**
 * Carrega metadados da planilha
 */
export async function loadSpreadsheetMetadata(): Promise<{ activeSheet?: string; sheetNames?: string[] }> {
  let activeSheet = inMemoryActiveSheet || (typeof window !== 'undefined' ? localStorage.getItem('transcunha_spreadsheet_active_sheet') || undefined : undefined);
  let sheetNames = inMemorySheetNames || undefined;

  if (!sheetNames && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('transcunha_spreadsheet_sheets');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) sheetNames = parsed;
      }
    } catch {}
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const reqActive = store.get(KEY_ACTIVE_SHEET);
      const reqSheets = store.get(KEY_SHEET_NAMES);

      tx.oncomplete = () => {
        db.close();
        resolve({
          activeSheet: reqActive.result || activeSheet,
          sheetNames: (Array.isArray(reqSheets.result) && reqSheets.result.length > 0) ? reqSheets.result : sheetNames
        });
      };

      tx.onerror = () => {
        db.close();
        resolve({ activeSheet, sheetNames });
      };
    });
  } catch {
    return { activeSheet, sheetNames };
  }
}

/**
 * Remove os dados persistidos do IndexedDB e do localStorage
 */
export async function clearSpreadsheetStorage(): Promise<void> {
  inMemoryRowsCache = null;
  inMemoryActiveSheet = null;
  inMemorySheetNames = null;

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => db.close();
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('transcunha_spreadsheet_rows');
      localStorage.removeItem('transcunha_spreadsheet_sheets');
      localStorage.removeItem('transcunha_spreadsheet_active_sheet');
    } catch {}
  }
}

/**
 * Leitura síncrona do cache em memória para uso na inicialização do useState
 */
export function getSpreadsheetRowsMemoryCache(): TranscunhaSpreadsheetRow[] | null {
  return inMemoryRowsCache;
}
