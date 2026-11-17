import JSZip from 'jszip';
import type { AppSettings, VaultDocument } from '../types';

export function sanitizeArchiveFilename(rawName: string, usedNames: Set<string>): string {
  const cleaned = rawName
    .replace(/[\\/?%*:|"<>]/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || 'document.pdf';

  if (!usedNames.has(cleaned.toLowerCase())) {
    usedNames.add(cleaned.toLowerCase());
    return cleaned;
  }

  const dotIdx = cleaned.lastIndexOf('.');
  const base = dotIdx > 0 ? cleaned.slice(0, dotIdx) : cleaned;
  const ext = dotIdx > 0 ? cleaned.slice(dotIdx) : '';

  let counter = 2;
  let candidate = `${base} (${counter})${ext}`;
  while (usedNames.has(candidate.toLowerCase())) {
    counter++;
    candidate = `${base} (${counter})${ext}`;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

export interface ZipVaultManifest {
  format: 'pdf-studio-zip-archive-v1';
  exportedAt: string;
  documentCount: number;
  settings: AppSettings;
  documents: Array<{
    id: string;
    name: string;
    archivePath: string;
    category: VaultDocument['category'];
    mimeType: VaultDocument['mimeType'];
    size: number;
    pageCount: number;
    createdAt: number;
    updatedAt: number;
    isLocked: boolean;
    tags: string[];
    textPreview?: string;
  }>;
}

export function buildZipManifestData(
  docs: VaultDocument[],
  settings: AppSettings
): { manifest: ZipVaultManifest; entries: Array<{ archivePath: string; data: Uint8Array }> } {
  const usedNames = new Set<string>();
  const entries: Array<{ archivePath: string; data: Uint8Array }> = [];
  const manifestDocs: ZipVaultManifest['documents'] = [];

  for (const doc of docs) {
    const safeFile = sanitizeArchiveFilename(doc.name, usedNames);
    const archivePath = doc.isLocked ? `documents/${safeFile}.aes256` : `documents/${safeFile}`;
    entries.push({ archivePath, data: doc.data });
    manifestDocs.push({
      id: doc.id,
      name: doc.name,
      archivePath,
      category: doc.category,
      mimeType: doc.mimeType,
      size: doc.size,
      pageCount: doc.pageCount,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      isLocked: doc.isLocked,
      tags: doc.tags || [],
      textPreview: doc.textPreview,
    });
  }

  return {
    manifest: {
      format: 'pdf-studio-zip-archive-v1',
      exportedAt: new Date().toISOString(),
      documentCount: docs.length,
      settings,
      documents: manifestDocs,
    },
    entries,
  };
}

export async function exportVaultAsZip(
  docs: VaultDocument[],
  settings: AppSettings,
  options?: { filenamePrefix?: string }
): Promise<{ bytes: Uint8Array; filename: string; fileCount: number }> {
  const zip = new JSZip();
  const { manifest, entries } = buildZipManifestData(docs, settings);

  zip.file('vault-manifest.json', JSON.stringify(manifest, null, 2));
  for (const entry of entries) {
    zip.file(entry.archivePath, entry.data);
  }

  const bytes = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const prefix = options?.filenamePrefix?.trim() || 'PDF-Studio-Vault-Archive';
  const filename = `${prefix}-${new Date().toISOString().slice(0, 10)}.zip`;
  return {
    bytes,
    filename,
    fileCount: docs.length,
  };
}

function dataUrlToUint8(dataUrl: string): Uint8Array {
  const commaIdx = dataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function exportJpgPagesAsZip(
  pages: Array<{ filename: string; dataUrl: string }>
): Promise<Uint8Array> {
  const zip = new JSZip();
  const used = new Set<string>();
  for (const page of pages) {
    const safeName = sanitizeArchiveFilename(page.filename, used);
    zip.file(safeName, dataUrlToUint8(page.dataUrl));
  }
  return zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}
