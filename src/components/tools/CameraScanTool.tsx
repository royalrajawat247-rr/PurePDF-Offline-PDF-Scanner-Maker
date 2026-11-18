import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Crop, Download, RotateCw, Trash2, Upload } from 'lucide-react';
import type { ScanFilterMode, ScanQualityPreset, VaultDocument } from '../../types';
import { formatFileSize, type CropEdgesPct } from '../../utils/documentMath';
import { applyScanFilterToDataUrl, cropDataUrl, rotateDataUrl90 } from '../../utils/imageFilters';
import { generatePdfFromImages } from '../../utils/pdfEngine';
import { triggerDownloadBytes } from '../../utils/vaultStorage';
import { CropImageModal } from '../CropImageModal';
import { SubPageHeader } from '../SubPageHeader';

interface CameraScanToolProps {
  scanQuality: ScanQualityPreset;
  backLabel?: string;
  onBack: () => void;
  onSaveToVault: (doc: VaultDocument) => Promise<void>;
  onNotify: (msg: string) => void;
}

interface ScannedPage {
  id: string;
  originalUrl: string;
  filteredUrl: string;
  filter: ScanFilterMode;
}

export const CameraScanTool: React.FC<CameraScanToolProps> = ({
  scanQuality,
  backLabel,
  onBack,
  onSaveToVault,
  onNotify,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ScanFilterMode>('magic-color');
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [docName, setDocName] = useState(
    () => `Scanned-Doc-${new Date().toISOString().slice(0, 10)}.pdf`
  );
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedPdf, setSavedPdf] = useState<{ bytes: Uint8Array; name: string } | null>(null);
  const [croppingPageId, setCroppingPageId] = useState<string | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    setErrorMsg(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Live camera is unavailable on this browser. Please use Upload Photo below.');
      return;
    }
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        await video.play().catch(() => {
          // autoPlay + playsInline + muted handles inline playback on mobile WebViews
        });
      }
      setCameraActive(true);
    } catch {
      setCameraError('Camera permission denied or no camera detected. Please allow camera access or use Upload Photo.');
      setCameraActive(false);
    }
  };

  useEffect(() => {
    return () => {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  const addPageFromDataUrl = async (rawUrl: string) => {
    try {
      setErrorMsg(null);
      const filteredUrl = await applyScanFilterToDataUrl(rawUrl, activeFilter, scanQuality);
      setPages((prev) => [
        ...prev,
        {
          id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          originalUrl: rawUrl,
          filteredUrl,
          filter: activeFilter,
        },
      ]);
      setSavedPdf(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to process image page.');
    }
  };

  const captureFromVideo = async () => {
    try {
      const video = videoRef.current;
      if (!video || !cameraActive || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        setErrorMsg('Camera feed is still initializing. Please try again in a moment.');
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/jpeg', 0.95);
      canvas.width = 0;
      canvas.height = 0;
      await addPageFromDataUrl(url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to capture camera frame.');
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setErrorMsg(null);
    try {
      for (const file of Array.from(files)) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error(`Failed to read "${file.name}".`));
          reader.readAsDataURL(file);
        });
        await addPageFromDataUrl(dataUrl);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not load selected image file.');
    } finally {
      e.target.value = '';
    }
  };


  const handleChangeFilter = async (nextFilter: ScanFilterMode) => {
    setActiveFilter(nextFilter);
    if (pages.length === 0) return;
    setErrorMsg(null);
    try {
      const updated = await Promise.all(
        pages.map(async (p) => ({
          ...p,
          filter: nextFilter,
          filteredUrl: await applyScanFilterToDataUrl(p.originalUrl, nextFilter, scanQuality),
        }))
      );
      setPages(updated);
      setSavedPdf(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to apply enhancement filter.');
    }
  };

  const removePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
    setSavedPdf(null);
  };

  const handleRotatePage = async (id: string) => {
    const target = pages.find((p) => p.id === id);
    if (!target) return;
    setErrorMsg(null);
    try {
      const rotatedOriginal = await rotateDataUrl90(target.originalUrl);
      const rotatedFiltered = await applyScanFilterToDataUrl(
        rotatedOriginal,
        target.filter,
        scanQuality
      );
      setPages((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, originalUrl: rotatedOriginal, filteredUrl: rotatedFiltered }
            : p
        )
      );
      setSavedPdf(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to rotate page.');
    }
  };

  const handleApplyCrop = async (edges: CropEdgesPct) => {
    if (!croppingPageId) return;
    const target = pages.find((p) => p.id === croppingPageId);
    if (!target) {
      setCroppingPageId(null);
      return;
    }
    setErrorMsg(null);
    try {
      const croppedOriginal = await cropDataUrl(target.originalUrl, edges);
      const croppedFiltered = await applyScanFilterToDataUrl(
        croppedOriginal,
        target.filter,
        scanQuality
      );
      setPages((prev) =>
        prev.map((p) =>
          p.id === croppingPageId
            ? { ...p, originalUrl: croppedOriginal, filteredUrl: croppedFiltered }
            : p
        )
      );
      setSavedPdf(null);
      setCroppingPageId(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to crop page.');
    }
  };

  const handleSaveAsPdf = async () => {
    if (pages.length === 0) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const cleanName = docName.trim().endsWith('.pdf')
        ? docName.trim()
        : `${docName.trim() || 'Scanned-Document'}.pdf`;

      const { bytes, pageCount, thumbnailDataUrl } = await generatePdfFromImages(
        pages.map((p) => ({ dataUrl: p.filteredUrl })),
        { pageSize: 'a4', marginMm: 6, title: cleanName, scanQuality }
      );

      const newDoc: VaultDocument = {
        id: `doc-${Date.now()}`,
        name: cleanName,
        category: 'scanned',
        mimeType: 'application/pdf',
        size: bytes.byteLength,
        pageCount,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isLocked: false,
        data: bytes,
        thumbnailDataUrl,
      };
      await onSaveToVault(newDoc);
      setSavedPdf({ bytes, name: cleanName });
      onNotify(`Saved "${cleanName}" (${formatFileSize(bytes.byteLength)}) to File Vault.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate or save PDF.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <SubPageHeader
        title="Camera Document Scanner"
        subtitle="Capture pages with Magic Color, B&W Crisp, or Original enhancement"
        backLabel={backLabel}
        onBack={onBack}
      />

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Camera / Viewfinder Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-[4/3] sm:aspect-video flex flex-col items-center justify-center text-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${
              cameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-0'
            }`}
          />
          {!cameraActive && (
            <div className="relative z-10 p-6 max-w-md space-y-3">
              <Camera className="w-10 h-10 text-blue-400 mx-auto" />
              <p className="text-sm font-medium text-slate-200">
                {cameraError || 'Start your device rear camera to scan physical documents, or upload a photo.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={startCamera}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold transition-all"
                >
                  Enable Live Camera
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {cameraActive && (
              <button
                type="button"
                onClick={captureFromVideo}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold inline-flex items-center gap-2 transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Frame</span>
              </button>
            )}
            <label className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 text-sm font-semibold inline-flex items-center gap-2 cursor-pointer transition-all">
              <Upload className="w-4 h-4" />
              <span>Upload Photo</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleUploadImage}
                className="sr-only"
              />
            </label>
          </div>

          {/* Filter Mode Selector */}
          <div
            role="group"
            aria-label="Scan enhancement filter"
            className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800"
          >
            {(
              [
                ['magic-color', 'Magic Color'],
                ['bw-crisp', 'B&W Crisp'],
                ['original', 'Original'],
              ] as Array<[ScanFilterMode, string]>
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleChangeFilter(mode)}
                aria-pressed={activeFilter === mode}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeFilter === mode
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Captured Pages Queue */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            Captured Pages ({pages.length})
          </h3>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="scan-doc-name" className="sr-only">
              PDF File Name
            </label>
            <input
              id="scan-doc-name"
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Document name.pdf"
              className="flex-1 sm:w-60 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
            />
            <button
              type="button"
              disabled={pages.length === 0 || saving}
              onClick={handleSaveAsPdf}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold whitespace-nowrap transition-colors"
            >
              {saving ? 'Generating...' : 'Save as PDF'}
            </button>
          </div>
        </div>

        {savedPdf && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Saved <strong>{savedPdf.name}</strong> ({formatFileSize(savedPdf.bytes.byteLength)})
              </span>
            </div>
            <button
              type="button"
              onClick={() => triggerDownloadBytes(savedPdf.bytes, savedPdf.name, 'application/pdf')}
              className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        )}

        {pages.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
            No pages scanned yet. Enable the live camera to capture a frame or upload a photo.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {pages.map((page, index) => (
              <div
                key={page.id}
                className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden"
              >
                <img
                  src={page.filteredUrl}
                  alt={`Scanned page ${index + 1}`}
                  className="w-full aspect-[3/4] object-contain bg-slate-100 dark:bg-slate-800"
                />
                <div className="p-1.5 sm:p-2 space-y-1.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between gap-2 px-0.5">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                      Page {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePage(page.id)}
                      aria-label={`Remove scanned page ${index + 1}`}
                      className="min-h-[30px] min-w-[30px] flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => handleRotatePage(page.id)}
                      aria-label={`Rotate 90° page ${index + 1}`}
                      className="min-h-[34px] px-0.5 sm:px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[9.5px] sm:text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-0.5 sm:gap-1 whitespace-nowrap"
                    >
                      <RotateCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                      <span>Rotate 90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCroppingPageId(page.id)}
                      aria-label={`Crop page ${index + 1}`}
                      className="min-h-[34px] px-0.5 sm:px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[9.5px] sm:text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-0.5 sm:gap-1 whitespace-nowrap"
                    >
                      <Crop className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                      <span>Crop Page</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {croppingPageId && (() => {
        const idx = pages.findIndex((p) => p.id === croppingPageId);
        const page = pages[idx];
        if (!page) return null;
        return (
          <CropImageModal
            imageUrl={page.filteredUrl}
            pageLabel={`Page ${idx + 1}`}
            onCancel={() => setCroppingPageId(null)}
            onApply={handleApplyCrop}
          />
        );
      })()}
    </div>
  );
};
