import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Eraser,
  FileUp,
  FolderOpen,
  Lock,
  PenTool,
  RotateCcw,
} from 'lucide-react';
import type { VaultDocument } from '../../types';
import { formatFileSize } from '../../utils/documentMath';
import { getPdfPageCount, signAndLockPdf } from '../../utils/pdfEngine';
import { triggerDownloadBytes } from '../../utils/vaultStorage';
import { SubPageHeader } from '../SubPageHeader';

interface ESignLockToolProps {
  vaultDocs: VaultDocument[];
  onBack: () => void;
  onSaveToVault: (doc: VaultDocument) => Promise<void>;
  onNotify: (msg: string) => void;
}

export const ESignLockTool: React.FC<ESignLockToolProps> = ({
  vaultDocs,
  onBack,
  onSaveToVault,
  onNotify,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const historyRef = useRef<ImageData[]>([]);

  const [inkColor, setInkColor] = useState<'#0F172A' | '#2563EB' | '#1E293B'>('#0F172A');
  const [penWidth, setPenWidth] = useState<number>(3);
  const [hasStroke, setHasStroke] = useState(false);

  const [targetPdf, setTargetPdf] = useState<{
    name: string;
    bytes: Uint8Array;
    pageCount: number;
  } | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [position, setPosition] = useState<'bottom-right' | 'bottom-center' | 'bottom-left'>(
    'bottom-right'
  );

  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultPdf, setResultPdf] = useState<{
    name: string;
    bytes: Uint8Array;
    isEncrypted: boolean;
  } | null>(null);

  const unlockedPdfs = vaultDocs.filter(
    (d) => d.mimeType === 'application/pdf' && !d.isLocked
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 680;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (historyRef.current.length > 20) historyRef.current.shift();

    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pt = getPoint(e);
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x + 0.1, pt.y + 0.1);
    ctx.stroke();
    setHasStroke(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pt = getPoint(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    historyRef.current = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
  };

  const undoCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const last = historyRef.current.pop();
    if (last) {
      ctx.putImageData(last, 0, 0);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasStroke(false);
    }
  };

  const loadPdf = async (name: string, bytes: Uint8Array) => {
    setErrorMsg(null);
    setResultPdf(null);
    try {
      const pageCount = await getPdfPageCount(bytes);
      setTargetPdf({ name, bytes, pageCount });
      setPageNumber(1);
    } catch {
      setErrorMsg('Cannot open PDF. Ensure it is an unencrypted valid PDF.');
    }
  };

  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      await loadPdf(file.name, bytes);
    } catch {
      setErrorMsg(`Failed to read "${file.name}". Ensure it is a valid unlocked PDF.`);
    } finally {
      e.target.value = '';
    }
  };

  const handleApplyAndSave = async () => {
    if (!targetPdf) {
      setErrorMsg('Select a target PDF document first.');
      return;
    }
    if (!hasStroke && !enablePassword) {
      setErrorMsg('Draw a signature or enable password protection before saving.');
      return;
    }
    if (enablePassword) {
      if (password.trim().length < 4) {
        setErrorMsg('Password must be at least 4 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    }

    setBusy(true);
    setErrorMsg(null);
    try {
      const sigDataUrl = hasStroke && canvasRef.current ? canvasRef.current.toDataURL('image/png') : null;
      const { bytes, pageCount, thumbnailDataUrl, isPdfEncrypted } = await signAndLockPdf(
        targetPdf.bytes,
        sigDataUrl,
        { pageNumber, position },
        enablePassword ? password.trim() : undefined
      );

      const suffix = enablePassword && hasStroke ? '-signed-locked' : enablePassword ? '-locked' : '-signed';
      const outName = targetPdf.name.replace(/\.pdf$/i, '') + `${suffix}.pdf`;

      await onSaveToVault({
        id: `doc-${Date.now()}`,
        name: outName,
        category: 'signed',
        mimeType: 'application/pdf',
        size: bytes.byteLength,
        pageCount,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isLocked: false,
        data: bytes,
        thumbnailDataUrl,
      });

      setResultPdf({ name: outName, bytes, isEncrypted: isPdfEncrypted });
      onNotify(
        isPdfEncrypted
          ? `Saved password-protected PDF "${outName}" to File Vault.`
          : `Saved signed PDF "${outName}" to File Vault.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to sign or encrypt PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <SubPageHeader
        title="E-Sign & Password Lock"
        subtitle="Draw your signature on-device and apply PDF password encryption"
        onBack={onBack}
      />

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Step 1: Target PDF */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          1. Select Target PDF
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <label className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer">
            <FileUp className="w-4 h-4" />
            <span>Choose PDF</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleUploadPdf}
              className="sr-only"
            />
          </label>
          {unlockedPdfs.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => loadPdf(doc.name, doc.data)}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                targetPdf?.name === doc.name
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-500'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
              <span className="max-w-[140px] truncate">{doc.name}</span>
            </button>
          ))}
        </div>

        {targetPdf && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label htmlFor="sign-page-num" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Target Page (1–{targetPdf.pageCount})
              </label>
              <input
                id="sign-page-num"
                type="number"
                min={1}
                max={targetPdf.pageCount}
                value={pageNumber}
                onChange={(e) =>
                  setPageNumber(Math.max(1, Math.min(targetPdf.pageCount, Number(e.target.value) || 1)))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="sign-pos" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Signature Placement
              </label>
              <select
                id="sign-pos"
                value={position}
                onChange={(e) => setPosition(e.target.value as typeof position)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-center">Bottom Center</option>
                <option value="bottom-left">Bottom Left</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Signature Canvas Pad */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            2. Draw Touch Signature
          </h3>
          <div className="flex items-center gap-2">
            {(
              [
                ['#0F172A', 'Black Ink'],
                ['#2563EB', 'Blue Ink'],
              ] as Array<['#0F172A' | '#2563EB', string]>
            ).map(([color, label]) => (
              <button
                key={color}
                type="button"
                onClick={() => setInkColor(color)}
                aria-label={label}
                aria-pressed={inkColor === color}
                className={`min-h-[36px] px-2.5 py-1 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 ${
                  inkColor === color
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span>{label.split(' ')[0]}</span>
              </button>
            ))}

            <select
              aria-label="Pen thickness"
              value={penWidth}
              onChange={(e) => setPenWidth(Number(e.target.value))}
              className="min-h-[36px] px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
            >
              <option value={2}>Fine</option>
              <option value={3}>Medium</option>
              <option value={5}>Bold</option>
            </select>
          </div>
        </div>

        <div className="relative rounded-xl border border-slate-300 dark:border-slate-700 bg-white overflow-hidden">
          <canvas
            ref={canvasRef}
            data-testid="signature-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full h-44 sm:h-52 block touch-none cursor-crosshair"
          />
          {!hasStroke && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
              Sign here using your finger, stylus, or mouse
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={undoCanvas}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={clearCanvas}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Clear Pad</span>
          </button>
        </div>
      </div>

      {/* Step 3: Password Protection Toggle */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                3. PDF Password Lock Protection
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Require a password whenever opening the exported PDF
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={enablePassword}
            aria-label="Enable PDF password lock"
            onClick={() => setEnablePassword((prev) => !prev)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ${
              enablePassword ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                enablePassword ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {enablePassword && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label htmlFor="pdf-lock-pw" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Document Password
              </label>
              <input
                id="pdf-lock-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 4 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label htmlFor="pdf-lock-pw-confirm" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Confirm Password
              </label>
              <input
                id="pdf-lock-pw-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={!targetPdf || busy}
          onClick={handleApplyAndSave}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2"
        >
          <PenTool className="w-4 h-4" />
          <span>{busy ? 'Processing PDF...' : 'Apply & Save Signed PDF'}</span>
        </button>

        {resultPdf && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Saved <strong>{resultPdf.name}</strong> ({formatFileSize(resultPdf.bytes.byteLength)})
                {resultPdf.isEncrypted ? ' · Password Encrypted' : ''}
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
