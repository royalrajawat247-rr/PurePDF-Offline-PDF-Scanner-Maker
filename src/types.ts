export type TabId = 'home' | 'tools' | 'vault' | 'settings';

export type ToolId =
  | 'camera-scan'
  | 'photo-to-pdf'
  | 'merge-split'
  | 'compress'
  | 'esign-lock'
  | 'ocr'
  | 'pdf-to-jpg'
  | 'watermark';

export type VaultCategory =
  | 'scanned'
  | 'created'
  | 'merged'
  | 'compressed'
  | 'signed'
  | 'ocr'
  | 'watermarked';

export type WatermarkPosition = 'diagonal' | 'bottom-center' | 'top-right';
export type WatermarkColor = 'slate' | 'blue' | 'red';

export type VaultSortOption = 'newest' | 'oldest' | 'name-asc' | 'size-desc' | 'size-asc';

export const PRESET_TAGS = ['Finance', 'Work', 'Personal', 'IDs'] as const;

export type CompressionPreset = 'high' | 'medium' | 'extreme';

export type ScanQualityPreset = 'high-hd' | 'balanced' | 'compact';

export type AppLanguage = 'en' | 'hi';

export type PageSizeOption = 'a4' | 'auto' | 'letter';

export type ScanFilterMode = 'original' | 'magic-color' | 'bw-crisp';

export interface VaultDocument {
  id: string;
  name: string;
  category: VaultCategory;
  mimeType: 'application/pdf' | 'text/plain';
  size: number;
  pageCount: number;
  createdAt: number;
  updatedAt: number;
  isLocked: boolean;
  tags?: string[];
  /** Plain bytes when unlocked, or AES-256-GCM encrypted envelope bytes when locked */
  data: Uint8Array;
  /** Optional PNG data URL thumbnail of first page */
  thumbnailDataUrl?: string;
  /** Optional extracted text preview */
  textPreview?: string;
}

export interface AppSettings {
  darkMode: boolean;
  notificationsEnabled: boolean;
  appLockEnabled: boolean;
  appPinHash: string | null;
  scanQuality: ScanQualityPreset;
  language: AppLanguage;
}

export interface SerializedVaultDocument {
  id: string;
  name: string;
  category: VaultCategory;
  mimeType: 'application/pdf' | 'text/plain';
  size: number;
  pageCount: number;
  createdAt: number;
  updatedAt: number;
  isLocked: boolean;
  tags?: string[];
  dataBase64: string;
  thumbnailDataUrl?: string;
  textPreview?: string;
}

export interface BackupPayload {
  version: 1;
  exportedAt: number;
  settings: AppSettings;
  documents: SerializedVaultDocument[];
}
