import React, { useState } from 'react';
import { CheckCircle2, Download, FileUp, FolderOpen, Minimize2 } from 'lucide-react';
import type { CompressionPreset, VaultDocument } from '../../types';
import { estimateCompressedSize, formatFileSize } from '../../utils/documentMath';
import { compressPdfFile, getPdfPageCount } from '../../utils/pdfEngine';
import { triggerDownloadBytes } from '../../utils/vaultStorage';
import { SubPageHeader } from '../SubPageHeader';

interface CompressToolProps {
  vaultDocs: VaultDocument[];
  onBack: () => void;
  onSaveToVault: (doc: VaultDocument) => Promise<void>;
  onNotify: (msg: string) => void;
}

export const CompressTool: React.FC<CompressToolProps> = ({
  vaultDocs,
  onBack,
  onSaveToVault,
  onNotify,
}) => {
  const [sourcePdf, setSourcePdf] = useState<{
    name: string;
    bytes: Uint8Array;
    pageCount: number;
  } | null>(null);
  const [preset, setPreset] = useState<CompressionPreset>('medium');
  const [progress, setProgress] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultPdf, setResultPdf] = useState<{
    name: string;
    bytes: Uint8Array;
    originalSize: number;
  } | null>(null);

  const unlockedPdfs = vaultDocs.filter(
    (d) => d.mimeType === 'application/pdf' && !d.isLocked
  );

  const loadSource = async (name: string, bytes: Uint8Array) => {
    setErrorMsg(null);
    setResultPdf(null);
    try {
      const pageCount = await getPdfPageCount(bytes);
      setSourcePdf({ name, bytes, pageCount });
    } catch {
      setErrorMsg('Cannot read PDF. Make sure it is a valid, unencrypted PDF.');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      await loadSource(file.name, bytes);
    } catch {
      setErrorMsg(`Could not read "${file.name}". Please pick a valid PDF file.`);
    } finally {
      e.target.value = '';
    }
  };

  const estimate = estimateCompressedSize(sourcePdf?.bytes.byteLength || 0, preset);

  const handleCompress = async () => {
    if (!sourcePdf) return;
    setErrorMsg(null);
    setProgress(5);
    try {
      const { bytes, pageCount, thumbnailDataUrl } = await compressPdfFile(
        sourcePdf.bytes,
        preset,
        (pct) => setProgress(pct)
      );
      const outName = sourcePdf.name.replace(/\.pdf$/i, '') + `-${preset}-compressed.pdf`;
      await onSaveToVault({
        id: `doc-${Date.now()}`,
        name: outName,
        category: 'compressed',
        mimeType: 'application/pdf',
        size: bytes.byteLength,
        pageCount,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isLocked: false,
        data: bytes,
        thumbnailDataUrl,
      });
      setResultPdf({ name: outName, bytes, originalSize: sourcePdf.bytes.byteLength });
      onNotify(`Compressed "${outName}" to ${formatFileSize(bytes.byteLength)}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'PDF compression failed.');
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="space-y-5">
      <SubPageHeader
        title="Smart PDF Compressor"
        subtitle="Optimize PDF size locally using High, Medium, or Extreme quality presets"
        onBack={onBack}
      />

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <label className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer">
            <FileUp className="w-4 h-4" />
            <span>Select PDF File</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleUpload}
              className="sr-only"
            />
          </label>

          {unlockedPdfs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">From Vault:</span>
              {unlockedPdfs.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => loadSource(doc.name, doc.data)}
                  className="min-h-[38px] px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:border-blue-500 inline-flex items-center gap-1.5"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                  <span className="max-w-[140px] truncate">{doc.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Compression Presets */}
        <div>
          <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
            Compression Preset
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(
              [
                ['high', 'High Quality', '150 DPI · Crisp text & graphics'],
                ['medium', 'Medium Balanced', '110 DPI · Ideal for email & sharing'],
                ['extreme', 'Extreme Compact', '72 DPI · Maximum space savings'],
              ] as Array<[CompressionPreset, string, string]>
            ).map(([key, label, desc]) => {
              const active = preset === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPreset(key)}
                  aria-pressed={active}
                  className={`p-3.5 rounded-xl border text-left transition-colors min-h-[76px] ${
                    active
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Size Reduction Preview */}
        {sourcePdf ? (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {sourcePdf.name}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {sourcePdf.pageCount} {sourcePdf.pageCount === 1 ? 'page' : 'pages'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700 tabular-nums">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Original Size</div>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {formatFileSize(sourcePdf.bytes.byteLength)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Estimated Output</div>
                <div className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  {formatFileSize(estimate.estimatedBytes)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Projected Savings</div>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  -{estimate.reductionPercent}%
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-5 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            Pick a PDF from your device or File Vault to preview projected file-size savings.
          </p>
        )}

        {progress !== null && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
              <span>Re-encoding pages locally...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={!sourcePdf || progress !== null}
          onClick={handleCompress}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2"
        >
          <Minimize2 className="w-4 h-4" />
          <span>{progress !== null ? 'Compressing...' : 'Compress & Save to Vault'}</span>
        </button>

        {resultPdf && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300 tabular-nums">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Compressed to <strong>{formatFileSize(resultPdf.bytes.byteLength)}</strong> (was{' '}
                {formatFileSize(resultPdf.originalSize)})
              </span>
            </div>
            <button
              type="button"
              onClick={() => triggerDownloadBytes(resultPdf.bytes, resultPdf.name, 'application/pdf')}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
