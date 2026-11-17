import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  FileUp,
  FolderOpen,
  Layers,
  Scissors,
  Trash2,
} from 'lucide-react';
import type { VaultDocument } from '../../types';
import { formatFileSize, parsePageRange, reorderItems } from '../../utils/documentMath';
import {
  getPdfPageCount,
  mergePdfFiles,
  renderPdfThumbnails,
  splitPdfFile,
} from '../../utils/pdfEngine';
import { triggerDownloadBytes } from '../../utils/vaultStorage';
import { SubPageHeader } from '../SubPageHeader';

interface MergeSplitToolProps {
  vaultDocs: VaultDocument[];
  onBack: () => void;
  onSaveToVault: (doc: VaultDocument) => Promise<void>;
  onNotify: (msg: string) => void;
}

interface PdfQueueItem {
  id: string;
  name: string;
  bytes: Uint8Array;
  pageCount: number;
}

export const MergeSplitTool: React.FC<MergeSplitToolProps> = ({
  vaultDocs,
  onBack,
  onSaveToVault,
  onNotify,
}) => {
  const [mode, setMode] = useState<'merge' | 'split'>('merge');
  const [mergeList, setMergeList] = useState<PdfQueueItem[]>([]);
  const [splitTarget, setSplitTarget] = useState<PdfQueueItem | null>(null);
  const [splitThumbnails, setSplitThumbnails] = useState<string[]>([]);
  const [rangeText, setRangeText] = useState('1');
  const [outputName, setOutputName] = useState('Combined-Document.pdf');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultPdf, setResultPdf] = useState<{ bytes: Uint8Array; name: string } | null>(null);

  const unlockedPdfs = vaultDocs.filter(
    (d) => d.mimeType === 'application/pdf' && !d.isLocked
  );

  const handleUploadMergePdfs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setErrorMsg(null);
    const items: PdfQueueItem[] = [];
    for (const file of Array.from(files)) {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const pageCount = await getPdfPageCount(bytes);
        items.push({
          id: `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          bytes,
          pageCount,
        });
      } catch {
        setErrorMsg(`Could not parse "${file.name}". Ensure it is a valid unlocked PDF.`);
      }
    }
    setMergeList((prev) => [...prev, ...items]);
    setResultPdf(null);
    e.target.value = '';
  };

  const addVaultPdfToMerge = (doc: VaultDocument) => {
    setErrorMsg(null);
    setMergeList((prev) => [
      ...prev,
      {
        id: `v-${doc.id}-${Date.now()}`,
        name: doc.name,
        bytes: doc.data,
        pageCount: doc.pageCount,
      },
    ]);
    setResultPdf(null);
  };

  const loadSplitPdf = async (name: string, bytes: Uint8Array) => {
    setErrorMsg(null);
    setResultPdf(null);
    try {
      const pageCount = await getPdfPageCount(bytes);
      setSplitTarget({ id: `split-${Date.now()}`, name, bytes, pageCount });
      setRangeText(pageCount > 1 ? `1-${Math.min(2, pageCount)}` : '1');
      setOutputName(name.replace(/\.pdf$/i, '') + '-Extracted.pdf');
      const thumbs = await renderPdfThumbnails(bytes, 12, 0.32).catch(() => ({
        pageCount,
        thumbnails: [],
      }));
      setSplitThumbnails(thumbs.thumbnails);
    } catch {
      setErrorMsg('Unable to read PDF. Make sure the file is not password-encrypted.');
    }
  };

  const handleUploadSplitPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      await loadSplitPdf(file.name, bytes);
    } catch {
      setErrorMsg(`Unable to read "${file.name}". Ensure it is a valid unlocked PDF.`);
    } finally {
      e.target.value = '';
    }
  };

  const handleRunMerge = async () => {
    if (mergeList.length < 2) {
      setErrorMsg('Add at least 2 PDF files to merge.');
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      const cleanName = outputName.trim().endsWith('.pdf')
        ? outputName.trim()
        : `${outputName.trim() || 'Merged-Document'}.pdf`;

      const { bytes, pageCount, thumbnailDataUrl } = await mergePdfFiles(
        mergeList.map((m) => m.bytes)
      );
      await onSaveToVault({
        id: `doc-${Date.now()}`,
        name: cleanName,
        category: 'merged',
        mimeType: 'application/pdf',
        size: bytes.byteLength,
        pageCount,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isLocked: false,
        data: bytes,
        thumbnailDataUrl,
      });
      setResultPdf({ bytes, name: cleanName });
      onNotify(`Merged ${mergeList.length} PDFs (${pageCount} pages) into "${cleanName}".`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to merge PDFs.');
    } finally {
      setBusy(false);
    }
  };

  const handleRunSplit = async () => {
    if (!splitTarget) return;
    const indices = parsePageRange(rangeText, splitTarget.pageCount);
    if (indices.length === 0) {
      setErrorMsg(`Enter valid page numbers between 1 and ${splitTarget.pageCount} (e.g. "1-2, 4").`);
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      const cleanName = outputName.trim().endsWith('.pdf')
        ? outputName.trim()
        : `${outputName.trim() || 'Extracted-Pages'}.pdf`;

      const { bytes, pageCount, thumbnailDataUrl } = await splitPdfFile(
        splitTarget.bytes,
        indices
      );
      await onSaveToVault({
        id: `doc-${Date.now()}`,
        name: cleanName,
        category: 'merged',
        mimeType: 'application/pdf',
        size: bytes.byteLength,
        pageCount,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isLocked: false,
        data: bytes,
        thumbnailDataUrl,
      });
      setResultPdf({ bytes, name: cleanName });
      onNotify(`Extracted ${pageCount} page(s) into "${cleanName}".`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to split PDF.');
    } finally {
      setBusy(false);
    }
  };

  const toggleSplitPage = (pageNum: number) => {
    if (!splitTarget) return;
    const current = parsePageRange(rangeText, splitTarget.pageCount);
    const idx = pageNum - 1;
    const next = current.includes(idx)
      ? current.filter((x) => x !== idx)
      : [...current, idx].sort((a, b) => a - b);
    setRangeText(next.map((i) => i + 1).join(', '));
  };

  return (
    <div className="space-y-5">
      <SubPageHeader
        title="Merge & Split PDF"
        subtitle="Combine multiple PDFs or extract selected page ranges locally"
        onBack={onBack}
      />

      {/* Mode Switcher */}
      <div
        role="group"
        aria-label="PDF operation mode"
        className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800"
      >
        <button
          type="button"
          onClick={() => {
            setMode('merge');
            setOutputName('Combined-Document.pdf');
            setResultPdf(null);
            setErrorMsg(null);
          }}
          aria-pressed={mode === 'merge'}
          className={`min-h-[40px] px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
            mode === 'merge'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Merge PDFs</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('split');
            setResultPdf(null);
            setErrorMsg(null);
          }}
          aria-pressed={mode === 'split'}
          className={`min-h-[40px] px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
            mode === 'split'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>Split / Extract</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {mode === 'merge' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer">
              <FileUp className="w-4 h-4" />
              <span>Add PDF Files</span>
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleUploadMergePdfs}
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
                    onClick={() => addVaultPdfToMerge(doc)}
                    className="min-h-[38px] px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-blue-500 inline-flex items-center gap-1.5"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span className="max-w-[140px] truncate">{doc.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {mergeList.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
              Add 2 or more PDF files from your device or File Vault to combine them in order.
            </p>
          ) : (
            <div className="space-y-2">
              {mergeList.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {idx + 1}. {item.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'} · {formatFileSize(item.bytes.byteLength)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => setMergeList((prev) => reorderItems(prev, idx, idx - 1))}
                      aria-label={`Move ${item.name} up`}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-35"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === mergeList.length - 1}
                      onClick={() => setMergeList((prev) => reorderItems(prev, idx, idx + 1))}
                      aria-label={`Move ${item.name} down`}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-35"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMergeList((prev) => prev.filter((x) => x.id !== item.id))}
                      aria-label={`Remove ${item.name}`}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <input
              type="text"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              aria-label="Merged PDF filename"
              className="flex-1 min-w-[200px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            />
            <button
              type="button"
              disabled={mergeList.length < 2 || busy}
              onClick={handleRunMerge}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold"
            >
              {busy ? 'Merging...' : 'Merge PDFs Locally'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer">
              <FileUp className="w-4 h-4" />
              <span>Choose PDF to Split</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleUploadSplitPdf}
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
                    onClick={() => loadSplitPdf(doc.name, doc.data)}
                    className="min-h-[38px] px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:border-blue-500 inline-flex items-center gap-1.5"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span className="max-w-[140px] truncate">{doc.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {!splitTarget ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
              Select a PDF file above to preview its pages and extract specific page ranges.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {splitTarget.name}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {splitTarget.pageCount} total {splitTarget.pageCount === 1 ? 'page' : 'pages'}
                </span>
              </div>

              {splitThumbnails.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {splitThumbnails.map((thumb, idx) => {
                    const pageNum = idx + 1;
                    const selected = parsePageRange(rangeText, splitTarget.pageCount).includes(idx);
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => toggleSplitPage(pageNum)}
                        className={`p-1.5 rounded-xl border text-center transition-colors ${
                          selected
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                        }`}
                      >
                        <img
                          src={thumb}
                          alt={`Page ${pageNum}`}
                          className="w-full aspect-[3/4] object-cover rounded-lg mb-1"
                        />
                        <span className="text-xs font-semibold tabular-nums">
                          Page {pageNum}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="split-range-input" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Pages to Extract (e.g. 1-2, 4)
                  </label>
                  <input
                    id="split-range-input"
                    type="text"
                    value={rangeText}
                    onChange={(e) => setRangeText(e.target.value)}
                    placeholder="1-2, 4"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="split-output-name" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Output Filename
                  </label>
                  <input
                    id="split-output-name"
                    type="text"
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={handleRunSplit}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold"
              >
                {busy ? 'Extracting...' : 'Extract Selected Pages'}
              </button>
            </div>
          )}
        </div>
      )}

      {resultPdf && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              Created <strong>{resultPdf.name}</strong> ({formatFileSize(resultPdf.bytes.byteLength)})
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
  );
};
