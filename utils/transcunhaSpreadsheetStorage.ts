import { TranscunhaSpreadsheetRow } from './transcunhaSpreadsheetParser';
import { supabase } from '../supabase';

const DB_NAME = 'transcunha_storage_db';
const DB_VERSION = 2;
const STORE_NAME = 'spreadsheet_store';

const KEY_ROWS = 'spreadsheet_rows';
const KEY_BACKUP_ROWS = 'spreadsheet_rows_backup_snapshot';
const KEY_ACTIVE_SHEET = 'active_sheet';
const KEY_SHEET_NAMES = 'sheet_names';
const KEY_LAST_SAVED = 'last_saved_timestamp';
const KEY_ROW_COUNT = 'total_saved_row_count';

const CLOUD_BACKUP_PATH = 'spreadsheet_backups/transcunha_master_spreadsheet.json';
let cloudBackupDebounceTimer: any = null;

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
 * Envia cópia de segurança assíncrona para o Supabase Storage (Nuvem)
 * Garante que mesmo formatando o computador ou trocando de dispositivo, os 16.819 dados existam.
 */
export function scheduleCloudSpreadsheetBackup(rows: TranscunhaSpreadsheetRow[]): void {
  if (!rows || rows.length < 50) return;
  if (cloudBackupDebounceTimer) clearTimeout(cloudBackupDebounceTimer);

  cloudBackupDebounceTimer = setTimeout(async () => {
    try {
      const jsonStr = JSON.stringify(rows);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const file = new File([blob], 'transcunha_master_spreadsheet.json', { type: 'application/json' });
      await supabase.storage
        .from('shipment_attachments')
        .upload(CLOUD_BACKUP_PATH, file, { upsert: true });
      console.log(`[Transcunha Storage] ✅ Backup em nuvem sincronizado no Supabase (${rows.length} linhas)!`);
    } catch (err) {
      console.warn('[Transcunha Storage] Aviso ao enviar backup para nuvem:', err);
    }
  }, 2500);
}

/**
 * Salva as linhas no IndexedDB com snapshot de segurança duplo (sem limite de 5MB).
 * Suporta mais de 16.800 linhas com dezenas de colunas instantaneamente.
 */
export async function saveSpreadsheetRowsToIndexedDB(rows: TranscunhaSpreadsheetRow[]): Promise<boolean> {
  if (!Array.isArray(rows) || rows.length === 0) return false;

  inMemoryRowsCache = rows;

  // Se o dataset for expressivo (ex: 16.819 linhas), agenda backup na nuvem
  if (rows.length > 50) {
    scheduleCloudSpreadsheetBackup(rows);
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      // 1. Armazenamento principal
      store.put(rows, KEY_ROWS);
      store.put(Date.now(), KEY_LAST_SAVED);
      store.put(rows.length, KEY_ROW_COUNT);

      // 2. Snapshot de segurança redundante (garante que se KEY_ROWS for corrompido, este recupera)
      if (rows.length > 30) {
        store.put(rows, KEY_BACKUP_ROWS);
      }

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
    console.warn('IndexedDB inacessível, tentando fallback de segurança:', err);
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
 * Carrega as linhas salvas no IndexedDB com recuperação em 4 níveis:
 * 1. Cache em memória (0ms)
 * 2. Tabela primária do IndexedDB
 * 3. Snapshot de segurança do IndexedDB
 * 4. Backup persistido em nuvem no Supabase Storage
 */
export async function loadSpreadsheetRowsFromIndexedDB(): Promise<TranscunhaSpreadsheetRow[] | null> {
  // Nível 1: Memória ativa
  if (inMemoryRowsCache && inMemoryRowsCache.length > 30) {
    return inMemoryRowsCache;
  }

  // Nível 2 e 3: IndexedDB Local
  try {
    const db = await openDB();
    const rows = await new Promise<TranscunhaSpreadsheetRow[] | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_ROWS);
      const reqBackup = store.get(KEY_BACKUP_ROWS);

      tx.oncomplete = () => {
        db.close();
        const primaryVal = req.result;
        const backupVal = reqBackup.result;

        // Se primário for válido e tiver linhas reais
        if (Array.isArray(primaryVal) && primaryVal.length > 30) {
          resolve(primaryVal);
          return;
        }

        // Se backup tiver as 16.819 linhas recupera dele
        if (Array.isArray(backupVal) && backupVal.length > 30) {
          console.warn(`[Transcunha Storage] Recuperando ${backupVal.length} registros a partir do snapshot de segurança!`);
          resolve(backupVal);
          return;
        }

        if (Array.isArray(primaryVal) && primaryVal.length > 0) {
          resolve(primaryVal);
          return;
        }

        resolve(null);
      };

      tx.onerror = () => {
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

  // Nível 4: Nuvem Supabase Storage
  try {
    const { data, error } = await supabase.storage
      .from('shipment_attachments')
      .download(CLOUD_BACKUP_PATH);

    if (data && !error) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log(`[Transcunha Storage] 🚀 Restaurados ${parsed.length} registros diretamente do Supabase Cloud Backup!`);
        inMemoryRowsCache = parsed;
        saveSpreadsheetRowsToIndexedDB(parsed).catch(() => {});
        return parsed;
      }
    }
  } catch (cloudErr) {
    console.warn('[Transcunha Storage] Sem dados ou offline para restauração via nuvem:', cloudErr);
  }

  // Nível 5: Migração legado localStorage
  if (typeof window !== 'undefined') {
    try {
      const legacy = localStorage.getItem('transcunha_spreadsheet_rows');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryRowsCache = parsed;
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
