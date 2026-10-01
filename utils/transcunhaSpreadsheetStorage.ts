import { TranscunhaSpreadsheetRow } from './transcunhaSpreadsheetParser';
import { supabase } from '../supabase';

const DB_NAME = 'transcunha_storage_db';
const DB_VERSION = 3;
const STORE_NAME = 'spreadsheet_store';

const KEY_ROWS = 'spreadsheet_rows';
const KEY_MASTER_MAX_ROWS = 'spreadsheet_master_max_rows';
const KEY_BACKUP_ROWS = 'spreadsheet_rows_backup_snapshot';
const KEY_RAW_WORKBOOK_BUFFER = 'spreadsheet_raw_workbook_buffer';
const KEY_ACTIVE_SHEET = 'active_sheet';
const KEY_SHEET_NAMES = 'sheet_names';
const KEY_LAST_SAVED = 'last_saved_timestamp';
const KEY_ROW_COUNT = 'total_saved_row_count';
const KEY_SHEET_ROWS_PREFIX = 'spreadsheet_sheet_rows_';

const CLOUD_BACKUP_PATH = 'spreadsheet_backups/transcunha_master_spreadsheet.json';
let cloudBackupDebounceTimer: any = null;

// Cache em memória para leitura síncrona instantânea
let inMemoryRowsCache: TranscunhaSpreadsheetRow[] | null = null;
let inMemoryActiveSheet: string | null = null;
let inMemorySheetNames: string[] | null = null;
let inMemoryRawBuffer: ArrayBuffer | null = null;

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
 * Salva o buffer binário original da planilha (XLSX) para permitir reabertura e troca de abas sem reimportar
 */
export async function saveRawWorkbookBuffer(buffer: ArrayBuffer): Promise<boolean> {
  if (!buffer || buffer.byteLength === 0) return false;
  inMemoryRawBuffer = buffer;

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(buffer, KEY_RAW_WORKBOOK_BUFFER);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('[Transcunha Storage] Erro ao persistir buffer bruto do Excel:', err);
    return false;
  }
}

/**
 * Carrega o buffer binário original salvo da planilha
 */
export async function loadRawWorkbookBuffer(): Promise<ArrayBuffer | null> {
  if (inMemoryRawBuffer && inMemoryRawBuffer.byteLength > 0) {
    return inMemoryRawBuffer;
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_RAW_WORKBOOK_BUFFER);

      tx.oncomplete = () => {
        db.close();
        if (req.result instanceof ArrayBuffer) {
          inMemoryRawBuffer = req.result;
          resolve(req.result);
        } else {
          resolve(null);
        }
      };

      tx.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

/**
 * Salva as linhas no IndexedDB com proteção do Master Dataset (16.819 linhas).
 * Mesmo que o usuário alterne para uma aba com menos registros (ex: 543),
 * os 16.819 registros master continuam protegidos e nunca são sobrescritos acidentalmente.
 */
export async function saveSpreadsheetRowsToIndexedDB(
  rows: TranscunhaSpreadsheetRow[],
  sheetName?: string
): Promise<boolean> {
  if (!Array.isArray(rows) || rows.length === 0) return false;

  inMemoryRowsCache = rows;

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      // 1. Armazenamento da aba ativa
      store.put(rows, KEY_ROWS);
      store.put(Date.now(), KEY_LAST_SAVED);
      store.put(rows.length, KEY_ROW_COUNT);

      // 2. Se for especificada uma aba, salva no bucket individual daquela aba
      if (sheetName) {
        store.put(rows, `${KEY_SHEET_ROWS_PREFIX}${sheetName}`);
      }

      // 3. MASTER DATASET PROTECTION:
      // Se for um dataset massivo (>= 1.000 linhas, como as 16.819 linhas),
      // grava no cofre MASTER_MAX_ROWS e no backup redundante
      if (rows.length >= 1000) {
        store.put(rows, KEY_MASTER_MAX_ROWS);
        store.put(rows, KEY_BACKUP_ROWS);
        scheduleCloudSpreadsheetBackup(rows);
      } else {
        // Se tiver menos de 1.000 linhas (ex: 543 linhas da outra aba):
        // NÃO sobrescreve KEY_MASTER_MAX_ROWS! Apenas salva no backup regular se não houver master
        const checkMaster = store.get(KEY_MASTER_MAX_ROWS);
        checkMaster.onsuccess = () => {
          if (!checkMaster.result || !Array.isArray(checkMaster.result) || checkMaster.result.length === 0) {
            store.put(rows, KEY_BACKUP_ROWS);
          }
        };
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
    console.warn('IndexedDB inacessível ao salvar linhas:', err);
    return false;
  }
}

/**
 * Carrega as linhas salvas no IndexedDB com recuperação inteligente e à prova de perdas:
 * 1. Cache em memória (0ms)
 * 2. KEY_MASTER_MAX_ROWS (as 16.819 linhas importadas pelo usuário)
 * 3. Bucket específico da aba solicitada
 * 4. Tabela primária do IndexedDB
 * 5. Snapshot de segurança redundante
 * 6. Backup persistido em nuvem no Supabase Storage
 */
export async function loadSpreadsheetRowsFromIndexedDB(
  preferredSheet?: string
): Promise<TranscunhaSpreadsheetRow[] | null> {
  // Nível 1: Memória ativa se já contiver o dataset completo
  if (inMemoryRowsCache && inMemoryRowsCache.length >= 1000) {
    if (!preferredSheet || preferredSheet.toUpperCase().includes('TESTE DAVI')) {
      return inMemoryRowsCache;
    }
  }

  // Nível 2: IndexedDB Local com prioridade para o Master Dataset
  try {
    const db = await openDB();
    const rows = await new Promise<TranscunhaSpreadsheetRow[] | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      const reqMaster = store.get(KEY_MASTER_MAX_ROWS);
      const reqPrimary = store.get(KEY_ROWS);
      const reqBackup = store.get(KEY_BACKUP_ROWS);
      const reqSheet = preferredSheet ? store.get(`${KEY_SHEET_ROWS_PREFIX}${preferredSheet}`) : null;

      tx.oncomplete = () => {
        db.close();
        const masterVal = reqMaster.result;
        const primaryVal = reqPrimary.result;
        const backupVal = reqBackup.result;
        const sheetVal = reqSheet ? reqSheet.result : null;

        // Se pediu uma aba secundária específica e ela tem dados próprios
        if (preferredSheet && !preferredSheet.toUpperCase().includes('TESTE DAVI') && Array.isArray(sheetVal) && sheetVal.length > 0) {
          resolve(sheetVal);
          return;
        }

        // Se o Master tiver os 16.819 registros, ele TEM prioridade máxima absoluta
        if (Array.isArray(masterVal) && masterVal.length >= 1000) {
          console.log(`[Transcunha Storage] 🛡️ Carregando ${masterVal.length} registros protegidos do Master Dataset!`);
          resolve(masterVal);
          return;
        }

        // Se primário tiver registros reais
        if (Array.isArray(primaryVal) && primaryVal.length > 0) {
          resolve(primaryVal);
          return;
        }

        // Se backup redundante tiver registros
        if (Array.isArray(backupVal) && backupVal.length > 0) {
          resolve(backupVal);
          return;
        }

        // Se houver dados em qualquer aba
        if (Array.isArray(sheetVal) && sheetVal.length > 0) {
          resolve(sheetVal);
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

  // Nível 3: Nuvem Supabase Storage (caso o IndexedDB local tenha sido limpo ou novo navegador)
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
        saveSpreadsheetRowsToIndexedDB(parsed, 'TESTE DAVI').catch(() => {});
        return parsed;
      }
    }
  } catch (cloudErr) {
    console.warn('[Transcunha Storage] Sem dados ou offline para restauração via nuvem:', cloudErr);
  }

  // Nível 4: Migração legado localStorage (caso exista)
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
 * Remove todos os dados persistidos do IndexedDB, localStorage e nuvem.
 * Chamado EXCLUSIVAMENTE pelo botão "Excluir Planilha" com confirmação do usuário.
 */
export async function clearSpreadsheetStorage(): Promise<void> {
  inMemoryRowsCache = null;
  inMemoryActiveSheet = null;
  inMemorySheetNames = null;
  inMemoryRawBuffer = null;

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

  try {
    await supabase.storage.from('shipment_attachments').remove([CLOUD_BACKUP_PATH]);
  } catch {}
}

/**
 * Leitura síncrona do cache em memória para uso na inicialização do useState
 */
export function getSpreadsheetRowsMemoryCache(): TranscunhaSpreadsheetRow[] | null {
  return inMemoryRowsCache;
}
