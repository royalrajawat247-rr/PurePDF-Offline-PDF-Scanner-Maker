import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Crop,
  Download,
  FilePlus2,
  Images,
  RotateCw,
  Trash2,
} from 'lucide-react';
import type { PageSizeOption, ScanQualityPreset, VaultDocument } from '../../types';
import { formatFileSize, reorderItems, type CropEdgesPct } from '../../utils/documentMath';
import { cropDataUrl, rotateDataUrl90 } from '../../utils/imageFilters';
import { generatePdfFromImages } from '../../utils/pdfEngine';
import { createSampleDocumentImage } from '../../utils/sampleDocs';
import { triggerDownloadBytes } from '../../utils/vaultStorage';
import { CropImageModal } from '../CropImageModal';
import { SubPageHeader } from '../SubPageHeader';

interface PhotoToPdfToolProps {
  scanQuality: ScanQualityPreset;
  backLabel?: string;
  onBack: () => void;
  onSaveToVault: (doc: VaultDocument) => Promise<void>;
  onNotify: (msg: string) => void;
}

interface PhotoItem {
  id: string;
  name: string;
  dataUrl: string;
}

export const PhotoToPdfTool: React.FC<PhotoToPdfToolProps> = ({
  scanQuality,
  backLabel,
  onBack,
  onSaveToVault,
  onNotify,
}) => {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [pageSize, setPageSize] = useState<PageSizeOption>('a4');
  const [outputName, setOutputName] = useState(
    () => `Photo-Bundle-${new Date().toISOString().slice(0, 10)}.pdf`
  );
  const [building, setBuilding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultPdf, setResultPdf] = useState<{ bytes: Uint8Array; name: string } | null>(null);
  const [croppingPhotoId, setCroppingPhotoId] = useState<string | null>(null);

  const handleSelectFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setErrorMsg(null);

    try {
      const added: PhotoItem[] = [];
      for (const file of Array.from(files)) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error(`Failed to read "${file.name}".`));
          reader.readAsDataURL(file);
        });
        added.push({
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          dataUrl,
        });
      }
      setPhotos((prev) => [...prev, ...added]);
      setResultPdf(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load one or more selected images.');
    } finally {
      e.target.value = '';
    }
  };

  const handleAddSamples = () => {
    try {
      setErrorMsg(null);
      const sample1: PhotoItem = {
        id: `sample-1-${Date.now()}`,
        name: 'Sample Invoice Page.jpg',
        dataUrl: createSampleDocumentImage('invoice'),
      };
      const sample2: PhotoItem = {
        id: `sample-2-${Date.now() + 1}`,
        name: 'Sample Receipt Page.jpg',
        dataUrl: createSampleDocumentImage('receipt'),
      };
      setPhotos((prev) => [...prev, sample1, sample2]);
      setResultPdf(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not load sample pages.');
    }
  };

  const handleRotatePhoto = async (id: string) => {
    const target = photos.find((p) => p.id === id);
    if (!target) return;
    setErrorMsg(null);
    try {
      const rotatedUrl = await rotateDataUrl90(target.dataUrl);
      setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, dataUrl: rotatedUrl } : p)));
      setResultPdf(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to rotate image.');
    }
  };

  const handleApplyCrop = async (edges: CropEdgesPct) => {
    if (!croppingPhotoId) return;
    const target = photos.find((p) => p.id === croppingPhotoId);
    if (!target) {
      setCroppingPhotoId(null);
      return;
    }
    setErrorMsg(null);
    try {
      const croppedUrl = await cropDataUrl(target.dataUrl, edges);
      setPhotos((prev) =>
        prev.map((p) => (p.id === croppingPhotoId ? { ...p, dataUrl: croppedUrl } : p))
      );
      setResultPdf(null);
      setCroppingPhotoId(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to crop image.');
    }
  };

  const handleGeneratePdf = async () => {
    if (photos.length === 0) return;
    setBuilding(true);
    setErrorMsg(null);
    try {
      const cleanName = outputName.trim().endsWith('.pdf')
        ? outputName.trim()
        : `${outputName.trim() || 'Photo-PDF'}.pdf`;

      const { bytes, pageCount, thumbnailDataUrl } = await generatePdfFromImages(
        photos.map((p) => ({ dataUrl: p.dataUrl })),
        { pageSize, marginMm: pageSize === 'auto' ? 0 : 8, title: cleanName, scanQuality }
      );

      const doc: VaultDocument = {
        id: `doc-${Date.now()}`,
        name: cleanName,
        category: 'created',
        mimeType: 'application/pdf',
        size: bytes.byteLength,
        pageCount,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isLocked: false,
        data: bytes,
        thumbnailDataUrl,
      };
      await onSaveToVault(doc);
      setResultPdf({ bytes, name: cleanName });
      onNotify(`Created "${cleanName}" (${pageCount} pages) and saved to File Vault.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to build or save PDF.');
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="space-y-5">
      <SubPageHeader
        title="Photo to PDF Builder"
        subtitle="Combine multiple gallery images, reorder pages, and export via jsPDF"
        backLabel={backLabel}
        onBack={onBack}
      />

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors">
              <Images className="w-4 h-4" />
              <span>Select Gallery Images</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleSelectFiles}
                className="sr-only"
              />
            </label>

            <button
              type="button"
              onClick={handleAddSamples}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold inline-flex items-center gap-2"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Add Sample Pages</span>
            </button>
          </div>

          <div
            role="group"
            aria-label="Page size"
            className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800"
          >
            {(
              [
                ['a4', 'A4'],
                ['auto', 'Auto Fit'],
                ['letter', 'Letter'],
              ] as Array<[PageSizeOption, string]>
            ).map(([opt, label]) => (
              <button
                key={opt}
                type="button"
                onClick={() => setPageSize(opt)}
                aria-pressed={pageSize === opt}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  pageSize === opt
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Page Reorder List */}
        {photos.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            <Images className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No images selected yet
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select photos from your device or click Add Sample Pages to test ordering and export.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={photo.dataUrl}
                      alt={photo.name}
                      className="w-12 h-14 object-contain bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {photo.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        Page {index + 1} of {photos.length}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => setPhotos((prev) => reorderItems(prev, index, index - 1))}
                      aria-label={`Move ${photo.name} up`}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 disabled:opacity-35"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === photos.length - 1}
                      onClick={() => setPhotos((prev) => reorderItems(prev, index, index + 1))}
                      aria-label={`Move ${photo.name} down`}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 disabled:opacity-35"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((p) => p.id !== photo.id))}
                      aria-label={`Remove ${photo.name}`}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
                  <button
                    type="button"
                    onClick={() => handleRotatePhoto(photo.id)}
                    aria-label={`Rotate 90° ${photo.name}`}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Rotate 90°</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCroppingPhotoId(photo.id)}
                    aria-label={`Crop Page ${photo.name}`}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    <span>Crop Page</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Export Controls */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="photo-pdf-name" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Output PDF Filename
            </label>
            <input
              id="photo-pdf-name"
              type="text"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <button
            type="button"
            disabled={photos.length === 0 || building}
            onClick={handleGeneratePdf}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold self-end transition-colors"
          >
            {building ? 'Generating PDF...' : `Generate PDF (${photos.length})`}
          </button>
        </div>

        {resultPdf && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                PDF ready: <strong>{resultPdf.name}</strong> ({formatFileSize(resultPdf.bytes.byteLength)})
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

      {croppingPhotoId && (() => {
        const idx = photos.findIndex((p) => p.id === croppingPhotoId);
        const photo = photos[idx];
        if (!photo) return null;
        return (
          <CropImageModal
            imageUrl={photo.dataUrl}
            pageLabel={`Page ${idx + 1} (${photo.name})`}
            onCancel={() => setCroppingPhotoId(null)}
            onApply={handleApplyCrop}
          />
        );
      })()}
    </div>
  );
};
