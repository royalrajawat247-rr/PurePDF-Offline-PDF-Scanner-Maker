import React, { useState } from 'react';
import { CheckCircle2, Download, FileUp, FolderOpen, Stamp } from 'lucide-react';
import type { VaultDocument, WatermarkColor, WatermarkPosition } from '../../types';
import { formatFileSize } from '../../utils/documentMath';
import { getPdfPageCount, watermarkPdfFile } from '../../utils/pdfEngine';
import { triggerDownloadBytes } from '../../utils/vaultStorage';
import { SubPageHeader } from '../SubPageHeader';

interface WatermarkToolProps {
  vaultDocs: VaultDocument[];
  onBack: () => void;
  onSaveToVault: (doc: VaultDocument) => Promise<void>;
  onNotify: (msg: string) => void;
}

export const WatermarkTool: React.FC<WatermarkToolProps> = ({
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
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [position, setPosition] = useState<WatermarkPosition>('diagonal');
  const [color, setColor] = useState<WatermarkColor>('slate');
  const [opacityPct, setOpacityPct] = useState(28);
  const [fontSize, setFontSize] = useState(42);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedDoc, setSavedDoc] = useState<VaultDocument | null>(null);

  const unlockedPdfs = vaultDocs.filter(
    (d) => d.mimeType === 'application/pdf' && !d.isLocked
  );

  const loadSource = async (name: string, bytes: Uint8Array) => {
    setErrorMsg(null);
    setSavedDoc(null);
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
      setErrorMsg(`Unable to read "${file.name}". Make sure it is a valid unlocked PDF.`);
    } finally {
      e.target.value = '';
    }
  };

  const handleApplyWatermark = async () => {
    if (!sourcePdf) return;
    if (!watermarkText.trim()) {
      setErrorMsg('Please enter watermark text.');
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      const { bytes, pageCount, thumbnailDataUrl } = await watermarkPdfFile(
        sourcePdf.bytes,
        {
          text: watermarkText.trim(),
          position,
          opacity: opacityPct / 100,
          fontSize,
          color,
        }
      );
      const outName = sourcePdf.name.replace(/\.pdf$/i, '') + '-watermarked.pdf';
      const newDoc: VaultDocument = {
        id: `doc-${Date.now()}`,
        name: outName,
        category: 'watermarked',
        mimeType: 'application/pdf',
        size: bytes.byteLength,
        pageCount,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isLocked: false,
        tags: ['Work'],
        data: bytes,
        thumbnailDataUrl,
      };
      await onSaveToVault(newDoc);
      setSavedDoc(newDoc);
      onNotify(`Stamped watermark across ${pageCount} page(s) in "${outName}".`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to apply watermark.');
    } finally {
      setBusy(false);
    }
  };

  const previewColorClass =
    color === 'blue'
      ? 'text-blue-600'
      : color === 'red'
        ? 'text-red-600'
        : 'text-slate-700';

  return (
    <div className="space-y-5">
      <SubPageHeader
        title="Add PDF Watermark"
        subtitle="Stamp custom text across every page of your PDF locally"
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

        {/* Watermark Configuration + Live Stamp Preview */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4 items-start">
          <div className="space-y-3.5">
            <div>
              <label
                htmlFor="watermark-text-input"
                className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
              >
                Watermark Text
              </label>
              <input
                id="watermark-text-input"
                type="text"
                maxLength={48}
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="e.g. CONFIDENTIAL or DRAFT"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="watermark-position-select"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
                >
                  Placement
                </label>
                <select
                  id="watermark-position-select"
                  value={position}
                  onChange={(e) => setPosition(e.target.value as WatermarkPosition)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                >
                  <option value="diagonal">Diagonal Center</option>
                  <option value="bottom-center">Bottom Footer</option>
                  <option value="top-right">Top Right Stamp</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="watermark-color-select"
                  className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1"
                >
                  Ink Color
                </label>
                <select
                  id="watermark-color-select"
                  value={color}
                  onChange={(e) => setColor(e.target.value as WatermarkColor)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                >
                  <option value="slate">Slate Gray</option>
                  <option value="blue">Electric Blue</option>
                  <option value="red">Stamp Red</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="watermark-opacity-range"
                  className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 tabular-nums"
                >
                  <span>Opacity</span>
                  <span>{opacityPct}%</span>
                </label>
                <input
                  id="watermark-opacity-range"
                  type="range"
                  min={10}
                  max={75}
                  value={opacityPct}
                  onChange={(e) => setOpacityPct(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label
                  htmlFor="watermark-size-range"
                  className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 tabular-nums"
                >
                  <span>Size</span>
                  <span>{fontSize}pt</span>
                </label>
                <input
                  id="watermark-size-range"
                  type="range"
                  min={18}
                  max={68}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Live Miniature Page Preview */}
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Page Stamp Preview
            </span>
            <div className="relative w-36 h-48 rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden flex items-center justify-center p-3 select-none">
              <div className="w-full space-y-2 opacity-25 pointer-events-none">
                <div className="h-2 bg-slate-400 rounded w-3/4" />
                <div className="h-1.5 bg-slate-300 rounded w-full" />
                <div className="h-1.5 bg-slate-300 rounded w-5/6" />
                <div className="h-1.5 bg-slate-300 rounded w-full" />
                <div className="h-1.5 bg-slate-300 rounded w-2/3" />
              </div>
              <span
                style={{ opacity: opacityPct / 100 }}
                className={`absolute font-extrabold tracking-wider uppercase text-center truncate max-w-[130px] pointer-events-none ${previewColorClass} ${
                  position === 'diagonal'
                    ? '-rotate-45 text-sm'
                    : position === 'top-right'
                      ? 'top-2.5 right-2.5 text-[10px]'
                      : 'bottom-2.5 inset-x-2 text-[10px]'
                }`}
              >
                {watermarkText || 'WATERMARK'}
              </span>
            </div>
          </div>
        </div>

        {sourcePdf && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2 tabular-nums">
            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
              Selected: {sourcePdf.name}
            </span>
            <span>
              {sourcePdf.pageCount} {sourcePdf.pageCount === 1 ? 'page' : 'pages'} ·{' '}
              {formatFileSize(sourcePdf.bytes.byteLength)}
            </span>
          </div>
        )}

        <button
          type="button"
          disabled={!sourcePdf || busy}
          onClick={handleApplyWatermark}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2"
        >
          <Stamp className="w-4 h-4" />
          <span>{busy ? 'Stamping Pages...' : 'Apply Watermark & Save to Vault'}</span>
        </button>

        {savedDoc && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Saved &ldquo;{savedDoc.name}&rdquo; to offline File Vault</span>
            </div>
            <button
              type="button"
              onClick={() => triggerDownloadBytes(savedDoc.data, savedDoc.name, 'application/pdf')}
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
