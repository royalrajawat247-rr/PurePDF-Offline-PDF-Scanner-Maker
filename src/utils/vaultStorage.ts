import type { AppSettings, BackupPayload, SerializedVaultDocument, VaultDocument } from '../types';
import { base64ToUint8, uint8ToBase64, validateBackupPayload } from './documentMath';
import { decryptBytesWithPassword, encryptBytesWithPassword } from './pdfCrypto';

const DB_NAME = 'pdfStudioVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'documents';
const SETTINGS_KEY = 'pdf_studio_settings_v1';

const LEGACY_DEMO_NAMES = new Set([
  'Q4 Expense Invoice.pdf',
  'Vendor NDA Agreement.pdf',
  'Office Supply Receipt #4082.pdf',
]);

const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  notificationsEnabled: true,
  appLockEnabled: false,
  appPinHash: null,
  scanQuality: 'high-hd',
  language: 'en',
};

export function normalizeSettings(raw?: Partial<AppSettings> | null): AppSettings {
  const appPinHash =
    typeof raw?.appPinHash === 'string' && raw.appPinHash.length >= 16 ? raw.appPinHash : null;
  const scanQuality =
    raw?.scanQuality === 'balanced' || raw?.scanQuality === 'compact' ? raw.scanQuality : 'high-hd';
  const language = raw?.language === 'hi' ? 'hi' : 'en';
  return {
    darkMode: Boolean(raw?.darkMode),
    notificationsEnabled:
      typeof raw?.notificationsEnabled === 'boolean'
        ? raw.notificationsEnabled
        : DEFAULT_SETTINGS.notificationsEnabled,
    appLockEnabled: Boolean(raw?.appLockEnabled && appPinHash),
    appPinHash,
    scanQuality,
    language,
  };
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return normalizeSettings(parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
  } catch {
    // Ignore quota failures
  }
}

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is unavailable in this browser context.'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB vault.'));
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Failed to initialize IndexedDB.'));
    }
  });
}

export async function getAllDocuments(): Promise<VaultDocument[]> {
  try {
    const db = await openVaultDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = (req.result || []) as VaultDocument[];
        rows.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(rows);
      };
      req.onerror = () => reject(req.error || new Error('Failed to read documents from vault.'));
      tx.onabort = () => reject(tx.error || new Error('Vault read transaction aborted.'));
    });
  } catch {
    return [];
  }
}

export async function saveDocument(doc: VaultDocument): Promise<void> {
  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(doc);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to save document to IndexedDB.'));
      tx.onabort = () => reject(tx.error || new Error('Storage quota may be full; save aborted.'));
    });
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : 'Unable to save file to local IndexedDB vault.'
    );
  }
}

export async function deleteDocument(id: string): Promise<void> {
  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to delete document.'));
      tx.onabort = () => reject(tx.error || new Error('Delete transaction aborted.'));
    });
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : 'Unable to delete document from local vault.'
    );
  }
}

export async function deleteDocumentsBulk(ids: string[]): Promise<number> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return 0;
  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const id of uniqueIds) {
        store.delete(id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to delete selected documents.'));
      tx.onabort = () => reject(tx.error || new Error('Bulk delete transaction aborted.'));
    });
    return uniqueIds.length;
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : 'Unable to delete selected documents from local vault.'
    );
  }
}

export async function loadInitialDocuments(): Promise<VaultDocument[]> {
  let hadLegacySeedFlag = false;
  try {
    hadLegacySeedFlag = localStorage.getItem('pdf_studio_seeded_v1') !== null;
    localStorage.removeItem('pdf_studio_seeded_v1');
  } catch {
    hadLegacySeedFlag = false;
  }

  const docs = await getAllDocuments();
  if (!hadLegacySeedFlag) {
    return docs;
  }

  const legacyDemoIds = docs
    .filter((doc) => LEGACY_DEMO_NAMES.has(doc.name))
    .map((doc) => doc.id);

  if (legacyDemoIds.length > 0) {
    try {
      await deleteDocumentsBulk(legacyDemoIds);
      return docs.filter((doc) => !LEGACY_DEMO_NAMES.has(doc.name));
    } catch {
      return docs;
    }
  }

  return docs;
}

export async function lockVaultDocument(
  doc: VaultDocument,
  password: string
): Promise<VaultDocument> {
  if (doc.isLocked) throw new Error('Document is already locked.');
  const encrypted = await encryptBytesWithPassword(doc.data, password);
  const updated: VaultDocument = {
    ...doc,
    isLocked: true,
    data: encrypted,
    updatedAt: Date.now(),
  };
  await saveDocument(updated);
  return updated;
}

export async function unlockVaultDocument(
  doc: VaultDocument,
  password: string
): Promise<VaultDocument> {
  if (!doc.isLocked) return doc;
  const plain = await decryptBytesWithPassword(doc.data, password);
  const updated: VaultDocument = {
    ...doc,
    isLocked: false,
    data: plain,
    size: plain.byteLength,
    updatedAt: Date.now(),
  };
  await saveDocument(updated);
  return updated;
}

export async function updateDocumentTags(
  doc: VaultDocument,
  tags: string[]
): Promise<VaultDocument> {
  const updated: VaultDocument = {
    ...doc,
    tags,
    updatedAt: Date.now(),
  };
  await saveDocument(updated);
  return updated;
}

export async function renameVaultDocument(
  doc: VaultDocument,
  nextName: string
): Promise<VaultDocument> {
  const trimmed = nextName.trim();
  if (!trimmed) {
    throw new Error('Document name cannot be empty.');
  }
  const origExtMatch = /\.(pdf|txt)$/i.exec(doc.name);
  const hasExt = /\.(pdf|txt)$/i.test(trimmed);
  const finalName = !hasExt && origExtMatch ? `${trimmed}${origExtMatch[0]}` : trimmed;

  const updated: VaultDocument = {
    ...doc,
    name: finalName,
    updatedAt: Date.now(),
  };
  await saveDocument(updated);
  return updated;
}

export async function exportVaultBackupJson(settings: AppSettings): Promise<string> {
  const docs = await getAllDocuments();
  const serialized: SerializedVaultDocument[] = docs.map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category,
    mimeType: d.mimeType,
    size: d.size,
    pageCount: d.pageCount,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    isLocked: d.isLocked,
    tags: d.tags || [],
    dataBase64: uint8ToBase64(d.data),
    thumbnailDataUrl: d.thumbnailDataUrl,
    textPreview: d.textPreview,
  }));

  const payload: BackupPayload = {
    version: 1,
    exportedAt: Date.now(),
    settings,
    documents: serialized,
  };
  return JSON.stringify(payload, null, 2);
}

export async function importVaultBackupJson(
  jsonText: string
): Promise<{ importedCount: number; settings?: AppSettings }> {
  const parsed = JSON.parse(jsonText) as unknown;
  const validation = validateBackupPayload(parsed);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid backup JSON file.');
  }
  const payload = parsed as BackupPayload;
  for (const item of payload.documents) {
    const bytes = base64ToUint8(item.dataBase64);
    const doc: VaultDocument = {
      id: item.id,
      name: item.name,
      category: item.category || 'created',
      mimeType: item.mimeType || 'application/pdf',
      size: item.size || bytes.byteLength,
      pageCount: item.pageCount || 1,
      createdAt: item.createdAt || Date.now(),
      updatedAt: item.updatedAt || Date.now(),
      isLocked: Boolean(item.isLocked),
      tags: Array.isArray(item.tags) ? item.tags : [],
      data: bytes,
      thumbnailDataUrl: item.thumbnailDataUrl,
      textPreview: item.textPreview,
    };
    await saveDocument(doc);
  }
  const restoredSettings = payload.settings ? normalizeSettings(payload.settings) : undefined;
  if (restoredSettings) {
    saveSettings(restoredSettings);
  }
  return {
    importedCount: payload.documents.length,
    settings: restoredSettings,
  };
}

export function triggerDownloadBytes(
  bytes: Uint8Array,
  filename: string,
  mimeType: string
): void {
  try {
    const blob = new Blob([new Uint8Array(bytes)], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch {
    // Prevent download failure from crashing caller
  }
}
