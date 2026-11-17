import React, { useState } from 'react';
import { Check, Copy, Download, FilePlus2, FileScan, Upload } from 'lucide-react';
import type { VaultDocument } from '../../types';
import { extractTextFromImage } from '../../utils/ocrEngine';
import { createSampleDocumentImage } from '../../utils/sampleDocs';
import { triggerDownloadBytes } from '../../utils/vaultStorage';
import { SubPageHeader } from '../SubPageHeader';

interface OcrExtractorToolProps {
  onBack: () => void;
  onSaveToVault: (doc: VaultDocument) => Promise<void>;
  onNotify: (msg: string) => void;
}

export const OcrExtractorTool: React.FC<OcrExtractorToolProps> = ({
  onBack,
  onSaveToVault,
  onNotify,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read selected image file.'));
        reader.readAsDataURL(file);
      });
      setImageUrl(dataUrl);
      setExtractedText('');
      setStatusMsg(null);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Unable to read image file.');
    } finally {
      e.target.value = '';
    }
  };

  const handleLoadSample = () => {
    setImageUrl(createSampleDocumentImage('receipt'));
    setExtractedText('');
    setStatusMsg(null);
  };

  const handleRunOcr = async () => {
    if (!imageUrl) return;
    setProgress(5);
    setStatusMsg('Starting local OCR extraction...');
    try {
      const result = await extractTextFromImage(imageUrl, (pct, status) => {
        setProgress(pct);
        setStatusMsg(status);
      });
      setExtractedText(result.text);
      setStatusMsg(
        result.note ||
          `Extracted locally (${result.confidence}% confidence). You can edit the text below.`
      );
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'OCR text extraction failed.');
    } finally {
      setProgress(null);
    }
  };

  const handleCopy = async () => {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      onNotify('Extracted text copied to clipboard.');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      onNotify('Select and copy the text directly from the editor.');
    }
  };

  const handleSaveTxt = async () => {
    if (!extractedText.trim()) return;
    try {
      const bytes = new TextEncoder().encode(extractedText);
      const filename = `Extracted-Text-${new Date().toISOString().slice(0, 10)}.txt`;

      await onSaveToVault({
        id: `ocr-${Date.now()}`,
        name: filename,
        category: 'ocr',
        mimeType: 'text/plain',
        size: bytes.byteLength,
        pageCount: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isLocked: false,
        data: bytes,
        textPreview: extractedText.slice(0, 400),
      });

      triggerDownloadBytes(bytes, filename, 'text/plain;charset=utf-8');
      onNotify(`Saved "${filename}" to your device and File Vault.`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Unable to save extracted text.');
    }
  };

  const wordCount = extractedText.trim() ? extractedText.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-5">
      <SubPageHeader
        title="OCR Text Extractor"
        subtitle="Extract editable text from document images locally with Copy & Save TXT"
        onBack={onBack}
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Upload Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadImage}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            onClick={handleLoadSample}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold inline-flex items-center gap-2"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Load Sample Receipt</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Source Image Preview */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 flex flex-col justify-between min-h-[260px]">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Source document for OCR"
                className="w-full max-h-72 object-contain rounded-lg"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <FileScan className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload a document image or click Load Sample Receipt to test local OCR.
                </p>
              </div>
            )}

            <button
              type="button"
              disabled={!imageUrl || progress !== null}
              onClick={handleRunOcr}
              className="mt-3 w-full min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              <FileScan className="w-4 h-4" />
              <span>{progress !== null ? 'Extracting...' : 'Extract Text Locally'}</span>
            </button>
          </div>

          {/* Editable Text Result */}
          <div className="flex flex-col space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <label htmlFor="ocr-output-area" className="font-semibold text-slate-700 dark:text-slate-300">
                Extracted Editable Text
              </label>
              <span>
                {wordCount} words · {extractedText.length} chars
              </span>
            </div>

            <textarea
              id="ocr-output-area"
              rows={10}
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              placeholder="Extracted text will appear here. You can also edit or paste text before saving as TXT..."
              className="w-full flex-1 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 font-mono leading-relaxed resize-y"
            />

            {progress !== null && (
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {statusMsg && (
              <p className="text-xs text-slate-600 dark:text-slate-400">{statusMsg}</p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={!extractedText}
                onClick={handleCopy}
                className="min-h-[44px] flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 disabled:opacity-50 text-sm font-semibold inline-flex items-center justify-center gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                disabled={!extractedText.trim()}
                onClick={handleSaveTxt}
                className="min-h-[44px] flex-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Save TXT</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
