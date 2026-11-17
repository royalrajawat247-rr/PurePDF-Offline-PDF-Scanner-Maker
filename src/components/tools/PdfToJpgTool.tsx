import React, { useState } from 'react';
import { Download, FileImage, FileUp, FolderOpen, PackageCheck } from 'lucide-react';
import type { VaultDocument } from '../../types';
import { formatFileSize } from '../../utils/documentMath';
import {
  getPdfPageCount,
  renderPdfToJpgPages,
  type RenderedJpgPage,
} from '../../utils/pdfEngine';
import { triggerDownloadBytes } from '../../utils/vaultStorage';
import { exportJpgPagesAsZip } from '../../utils/zipArchive';
import { SubPageHeader } from '../SubPageHeader';

interface PdfToJpgToolProps {
  vaultDocs: VaultDocument[];
  onBack: () => void;
  onNotify: (msg: string) => void;
}

export const PdfToJpgTool: React.FC<PdfToJpgToolProps> = ({
  vaultDocs,
  onBack,
  onNotify,
}) => {
  const [sourcePdf, setSourcePdf] = useState<{
    name: string;
    bytes: Uint8Array;
    pageCount: number;
  } | null>(null);
  const [scaleOption, setScaleOption] = useState<1.5 | 2.0>(2.0);
  const [qualityOption, setQualityOption] = useState<0.92 | 0.8 | 0.65>(0.92);
  const [progress, setProgress] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [renderedPages, setRenderedPages] = useState<RenderedJpgPage[]>([]);
  const [zipBusy, setZipBusy] = useState(false);

  const unlockedPdfs = vaultDocs.filter(
    (d) => d.mimeType === 'application/pdf' && !d.isLocked
  );

  const loadSource = async (name: string, bytes: Uint8Array) => {
    setErrorMsg(null);
    setRenderedPages([]);
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
      setErrorMsg(`Unable to read "${file.name}". Ensure it is a valid unlocked PDF.`);
    } finally {
      e.target.value = '';
    }
  };

  const handleConvert = async () => {
    if (!sourcePdf) return;
    setErrorMsg(null);
    setProgress(5);
    try {
      const pages = await renderPdfToJpgPages(
        sourcePdf.bytes,
        {
          baseName: sourcePdf.name,
          scale: scaleOption,
          quality: qualityOption,
        },
        (pct) => setProgress(pct)
      );
      setRenderedPages(pages);
      onNotify(`Converted ${pages.length} PDF page(s) to crisp JPG images.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to convert PDF to JPG.');
    } finally {
      setProgress(null);
    }
  };

  const handleDownloadSingleJpg = (page: RenderedJpgPage) => {
    try {
      const a = document.createElement('a');
      a.href = page.dataUrl;
      a.download = page.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      onNotify(`Downloaded "${page.filename}".`);
    } catch {
      setErrorMsg('Failed to trigger image download.');
    }
  };

  const handleDownloadAllZip = async () => {
    if (renderedPages.length === 0 || !sourcePdf) return;
    setZipBusy(true);
    setErrorMsg(null);
    try {
      const zipBytes = await exportJpgPagesAsZip(renderedPages);
      const base = sourcePdf.name.replace(/\.pdf$/i, '').trim() || 'document';
      const zipName = `${base}-JPG-Pages.zip`;
      triggerDownloadBytes(zipBytes, zipName, 'application/zip');
      onNotify(`Exported ${renderedPages.length} JPG images as "${zipName}".`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create ZIP of JPG pages.');
    } finally {
      setZipBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <SubPageHeader
        title="PDF to JPG Converter"
        subtitle="Export every PDF page as high-resolution JPG images or a single ZIP archive"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="jpg-resolution-select"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Output Resolution
            </label>
            <select
              id="jpg-resolution-select"
              value={scaleOption}
              onChange={(e) => setScaleOption(Number(e.target.value) as 1.5 | 2.0)}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            >
              <option value={2.0}>Ultra HD (2.0x Scale)</option>
              <option value={1.5}>Standard Web (1.5x Scale)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="jpg-quality-select"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5"
            >
              JPEG Quality
            </label>
            <select
              id="jpg-quality-select"
              value={qualityOption}
              onChange={(e) => setQualityOption(Number(e.target.value) as 0.92 | 0.8 | 0.65)}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            >
              <option value={0.92}>High (92% Quality)</option>
              <option value={0.8}>Balanced (80% Quality)</option>
              <option value={0.65}>Compact (65% Quality)</option>
            </select>
          </div>
        </div>

        {sourcePdf ? (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {sourcePdf.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                {sourcePdf.pageCount} {sourcePdf.pageCount === 1 ? 'page' : 'pages'} ·{' '}
                {formatFileSize(sourcePdf.bytes.byteLength)}
              </div>
            </div>
            <button
              type="button"
              disabled={progress !== null}
              onClick={handleConvert}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2 shrink-0"
            >
              <FileImage className="w-4 h-4" />
              <span>{progress !== null ? 'Converting...' : 'Convert to JPG'}</span>
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-5 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            Pick a PDF from your device or File Vault to render high-resolution JPG images.
          </p>
        )}

        {progress !== null && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
              <span>Rendering pages to JPEG locally...</span>
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

        {renderedPages.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                Rendered JPG Pages ({renderedPages.length})
              </div>
              <button
                type="button"
                disabled={zipBusy}
                onClick={handleDownloadAllZip}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <PackageCheck className="w-4 h-4" />
                <span>{zipBusy ? 'Packing ZIP...' : 'Download All as ZIP'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {renderedPages.map((pg) => (
                <div
                  key={pg.pageNumber}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-2.5"
                >
                  <div className="aspect-[4/3] rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center">
                    <img
                      src={pg.dataUrl}
                      alt={`Page ${pg.pageNumber}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {pg.filename}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        {pg.width}×{pg.height}px · {formatFileSize(pg.sizeBytes)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadSingleJpg(pg)}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>JPG</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
