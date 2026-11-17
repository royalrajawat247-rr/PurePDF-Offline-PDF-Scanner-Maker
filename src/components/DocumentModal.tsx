import React, { useEffect, useState } from 'react';
import { Download, Lock, Printer, Unlock, X } from 'lucide-react';
import type { VaultDocument } from '../types';
import { formatFileSize } from '../utils/documentMath';
import { renderPdfThumbnails } from '../utils/pdfEngine';

interface DocumentModalProps {
  mode: 'preview' | 'lock' | 'unlock';
  doc: VaultDocument;
  onClose: () => void;
  onConfirmLock: (doc: VaultDocument, password: string) => Promise<void>;
  onConfirmUnlock: (doc: VaultDocument, password: string) => Promise<void>;
  onDownload: (doc: VaultDocument) => void;
  onPrint: (doc: VaultDocument) => void;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  mode,
  doc,
  onClose,
  onConfirmLock,
  onConfirmUnlock,
  onDownload,
  onPrint,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pages, setPages] = useState<string[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (mode === 'preview' && !doc.isLocked && doc.mimeType === 'application/pdf') {
      setLoadingPages(true);
      renderPdfThumbnails(doc.data, 8, 0.9)
        .then((res) => {
          if (!cancelled) setPages(res.thumbnails);
        })
        .catch(() => {
          if (!cancelled) setPages([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingPages(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [mode, doc]);

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (mode === 'lock') {
      if (password.length < 4) {
        setErrorMsg('Password must be at least 4 characters.');
        return;
      }
      if (password !== confirmPw) {
        setErrorMsg('Passwords do not match.');
        return;
      }
      setBusy(true);
      try {
        await onConfirmLock(doc, password);
        onClose();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Unable to lock file.');
      } finally {
        setBusy(false);
      }
    } else if (mode === 'unlock') {
      if (!password) {
        setErrorMsg('Enter the vault password to unlock this document.');
        return;
      }
      setBusy(true);
      try {
        await onConfirmUnlock(doc, password);
        onClose();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Incorrect password.');
      } finally {
        setBusy(false);
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={doc.name}
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {mode === 'lock'
                ? `AES Lock: ${doc.name}`
                : mode === 'unlock'
                  ? `Unlock: ${doc.name}`
                  : doc.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'} · {formatFileSize(doc.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {mode === 'preview' ? (
            doc.isLocked ? (
              <div className="py-8 text-center space-y-3">
                <Lock className="w-10 h-10 text-amber-600 dark:text-amber-400 mx-auto" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  This file is AES-256 encrypted in your File Vault.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Use the Unlock button in the File Vault to decrypt and view its contents.
                </p>
              </div>
            ) : doc.mimeType === 'text/plain' ? (
              <pre className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                {new TextDecoder().decode(doc.data)}
              </pre>
            ) : loadingPages ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Rendering PDF pages locally...
              </p>
            ) : pages.length > 0 ? (
              <div className="space-y-4">
                {pages.map((src, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800"
                  >
                    <img src={src} alt={`Page ${idx + 1}`} className="w-full h-auto" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                Preview is unavailable for password-protected PDFs. Download to open in your PDF viewer.
              </p>
            )
          ) : (
            <form onSubmit={handleSubmitPassword} className="space-y-4">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                {mode === 'lock' ? (
                  <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                ) : (
                  <Unlock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <span>
                  {mode === 'lock'
                    ? 'Encrypts this file locally using AES-256-GCM before storing in IndexedDB. Remember your password—there is no cloud recovery.'
                    : 'Enter the password used to lock this document to restore readable access.'}
                </span>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                  {errorMsg}
                </div>
              )}

              <div>
                <label htmlFor="vault-modal-pw" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <input
                  id="vault-modal-pw"
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                />
              </div>

              {mode === 'lock' && (
                <div>
                  <label htmlFor="vault-modal-pw-confirm" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm Password
                  </label>
                  <input
                    id="vault-modal-pw-confirm"
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold"
                >
                  {busy
                    ? 'Processing...'
                    : mode === 'lock'
                      ? 'Encrypt & Lock'
                      : 'Unlock File'}
                </button>
              </div>
            </form>
          )}
        </div>

        {mode === 'preview' && !doc.isLocked && (
          <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onPrint(doc)}
              className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={() => onDownload(doc)}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
