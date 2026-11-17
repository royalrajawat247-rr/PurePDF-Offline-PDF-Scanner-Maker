import {
  PRESET_TAGS,
  type CompressionPreset,
  type ScanQualityPreset,
  type VaultDocument,
  type VaultSortOption,
} from '../types';

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export function getScanQualityConfig(quality: ScanQualityPreset): {
  maxDimensionPx: number;
  jpegQuality: number;
  pdfCompression: 'NONE' | 'FAST';
  label: string;
} {
  switch (quality) {
    case 'compact':
      return {
        maxDimensionPx: 1100,
        jpegQuality: 0.6,
        pdfCompression: 'FAST',
        label: 'Compact',
      };
    case 'balanced':
      return {
        maxDimensionPx: 1600,
        jpegQuality: 0.8,
        pdfCompression: 'FAST',
        label: 'Balanced',
      };
    case 'high-hd':
    default:
      return {
        maxDimensionPx: 2400,
        jpegQuality: 0.94,
        pdfCompression: 'FAST',
        label: 'High HD',
      };
  }
}

export interface CropEdgesPct {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function computeCropRectPixels(
  naturalW: number,
  naturalH: number,
  edges: CropEdgesPct
): { sx: number; sy: number; sw: number; sh: number } {
  const safeW = Math.max(10, Math.round(naturalW));
  const safeH = Math.max(10, Math.round(naturalH));

  const leftPct = Math.max(0, Math.min(80, edges.left));
  const rightPct = Math.max(0, Math.min(80 - leftPct, edges.right));
  const topPct = Math.max(0, Math.min(80, edges.top));
  const bottomPct = Math.max(0, Math.min(80 - topPct, edges.bottom));

  const sx = Math.round((leftPct / 100) * safeW);
  const sy = Math.round((topPct / 100) * safeH);
  const sw = Math.max(10, Math.round(((100 - leftPct - rightPct) / 100) * safeW));
  const sh = Math.max(10, Math.round(((100 - topPct - bottomPct) / 100) * safeH));

  return {
    sx: Math.min(safeW - 10, sx),
    sy: Math.min(safeH - 10, sy),
    sw: Math.min(safeW - Math.min(safeW - 10, sx), sw),
    sh: Math.min(safeH - Math.min(safeH - 10, sy), sh),
  };
}

/**
 * Parses human page range expressions such as "1-3, 5, 7-8" into 0-based page indices.
 * Ignores out-of-range numbers and deduplicates while preserving order.
 */
export function parsePageRange(input: string, totalPages: number): number[] {
  if (totalPages <= 0) return [];
  const trimmed = input.trim();
  if (!trimmed) return [];

  const result: number[] = [];
  const seen = new Set<number>();
  const parts = trimmed.split(',');

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;

    if (part.includes('-')) {
      const bounds = part.split('-').map((s) => Number.parseInt(s.trim(), 10));
      if (bounds.length !== 2 || Number.isNaN(bounds[0]) || Number.isNaN(bounds[1])) {
        continue;
      }
      const start = Math.max(1, Math.min(bounds[0], bounds[1]));
      const end = Math.min(totalPages, Math.max(bounds[0], bounds[1]));
      if (start > totalPages || end < 1) continue;
      for (let p = start; p <= end; p++) {
        const idx = p - 1;
        if (!seen.has(idx)) {
          seen.add(idx);
          result.push(idx);
        }
      }
    } else {
      const pageNum = Number.parseInt(part, 10);
      if (Number.isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) continue;
      const idx = pageNum - 1;
      if (!seen.has(idx)) {
        seen.add(idx);
        result.push(idx);
      }
    }
  }

  return result;
}

export interface CompressionEstimate {
  estimatedBytes: number;
  reductionPercent: number;
  dpi: number;
  jpegQuality: number;
  renderScale: number;
  label: string;
}

export function getCompressionPresetConfig(preset: CompressionPreset): {
  dpi: number;
  jpegQuality: number;
  renderScale: number;
  ratio: number;
  label: string;
} {
  switch (preset) {
    case 'high':
      return {
        dpi: 150,
        jpegQuality: 0.86,
        renderScale: 1.5,
        ratio: 0.72,
        label: 'High Quality',
      };
    case 'medium':
      return {
        dpi: 110,
        jpegQuality: 0.65,
        renderScale: 1.15,
        ratio: 0.45,
        label: 'Balanced Medium',
      };
    case 'extreme':
      return {
        dpi: 72,
        jpegQuality: 0.38,
        renderScale: 0.85,
        ratio: 0.22,
        label: 'Extreme Compact',
      };
  }
}

export function estimateCompressedSize(
  originalBytes: number,
  preset: CompressionPreset
): CompressionEstimate {
  const cfg = getCompressionPresetConfig(preset);
  if (originalBytes <= 0) {
    return {
      estimatedBytes: 0,
      reductionPercent: 0,
      dpi: cfg.dpi,
      jpegQuality: cfg.jpegQuality,
      renderScale: cfg.renderScale,
      label: cfg.label,
    };
  }
  const estimatedBytes = Math.max(4096, Math.round(originalBytes * cfg.ratio));
  const boundedEstimated = Math.min(originalBytes, estimatedBytes);
  const reductionPercent = Math.max(
    0,
    Math.round(((originalBytes - boundedEstimated) / originalBytes) * 100)
  );
  return {
    estimatedBytes: boundedEstimated,
    reductionPercent,
    dpi: cfg.dpi,
    jpegQuality: cfg.jpegQuality,
    renderScale: cfg.renderScale,
    label: cfg.label,
  };
}

export function reorderItems<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items.slice();
  }
  const copy = items.slice();
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}

export function toggleDocumentTag(tags: string[] | undefined, rawTag: string): string[] {
  const clean = rawTag.trim();
  const current = Array.isArray(tags) ? tags.filter(Boolean) : [];
  if (!clean) return current;
  const existingIdx = current.findIndex((t) => t.toLowerCase() === clean.toLowerCase());
  if (existingIdx !== -1) {
    return current.filter((_, idx) => idx !== existingIdx);
  }
  return [...current, clean];
}

export function collectAllTags(docs: VaultDocument[]): string[] {
  const seen = new Map<string, string>();
  for (const preset of PRESET_TAGS) {
    seen.set(preset.toLowerCase(), preset);
  }
  for (const doc of docs) {
    if (!doc.tags) continue;
    for (const tag of doc.tags) {
      const clean = tag.trim();
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.set(clean.toLowerCase(), clean);
      }
    }
  }
  return Array.from(seen.values());
}

export function filterVaultDocs(
  docs: VaultDocument[],
  query: string,
  filterValue: string
): VaultDocument[] {
  const q = query.trim().toLowerCase();
  return docs.filter((doc) => {
    if (filterValue === 'locked') {
      if (!doc.isLocked) return false;
    } else if (filterValue.startsWith('tag:')) {
      const targetTag = filterValue.slice(4).toLowerCase();
      const hasTag = (doc.tags || []).some((t) => t.toLowerCase() === targetTag);
      if (!hasTag) return false;
    } else if (filterValue !== 'all' && doc.category !== filterValue) {
      return false;
    }
    if (!q) return true;
    const matchesTag = (doc.tags || []).some((t) => t.toLowerCase().includes(q));
    return (
      doc.name.toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q) ||
      matchesTag ||
      (doc.textPreview ? doc.textPreview.toLowerCase().includes(q) : false)
    );
  });
}

export function sortVaultDocs(
  docs: VaultDocument[],
  sortBy: VaultSortOption
): VaultDocument[] {
  const copy = docs.slice();
  switch (sortBy) {
    case 'oldest':
      return copy.sort((a, b) => a.updatedAt - b.updatedAt);
    case 'name-asc':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'size-desc':
      return copy.sort((a, b) => b.size - a.size);
    case 'size-asc':
      return copy.sort((a, b) => a.size - b.size);
    case 'newest':
    default:
      return copy.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

export function validateBackupPayload(payload: unknown): {
  valid: boolean;
  error?: string;
  count?: number;
} {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Backup file must be a JSON object.' };
  }
  const obj = payload as Record<string, unknown>;
  if (obj.version !== 1) {
    return { valid: false, error: 'Unsupported backup format version.' };
  }
  if (!Array.isArray(obj.documents)) {
    return { valid: false, error: 'Backup file is missing the documents list.' };
  }
  for (let i = 0; i < obj.documents.length; i++) {
    const doc = obj.documents[i] as Record<string, unknown>;
    if (
      !doc ||
      typeof doc.id !== 'string' ||
      typeof doc.name !== 'string' ||
      typeof doc.dataBase64 !== 'string'
    ) {
      return { valid: false, error: `Document entry #${i + 1} is invalid or corrupted.` };
    }
  }
  return { valid: true, count: obj.documents.length };
}

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function toggleSelectedId(selectedIds: string[], targetId: string): string[] {
  if (!targetId) return selectedIds.slice();
  if (selectedIds.includes(targetId)) {
    return selectedIds.filter((id) => id !== targetId);
  }
  return [...selectedIds, targetId];
}

export function selectAllIds(docs: Array<Pick<VaultDocument, 'id'>>): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const doc of docs) {
    if (doc.id && !seen.has(doc.id)) {
      seen.add(doc.id);
      ids.push(doc.id);
    }
  }
  return ids;
}

export function pruneSelectedIds(
  selectedIds: string[],
  docs: Array<Pick<VaultDocument, 'id'>>
): string[] {
  const validSet = new Set(docs.map((d) => d.id));
  return selectedIds.filter((id) => validSet.has(id));
}

export function filterSelectedDocuments(
  docs: VaultDocument[],
  selectedIds: string[]
): VaultDocument[] {
  const selectedSet = new Set(selectedIds);
  return docs.filter((doc) => selectedSet.has(doc.id));
}

