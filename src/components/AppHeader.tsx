import React, { useState } from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const AppHeader: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIosTip, setShowIosTip] = useState(false);

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        <div className="flex items-center min-w-0">
          <h1 className="text-[15px] sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
            PurePDF
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={install}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Install App
            </button>
          )}
          {!isInstalled && !isInstallable && isIOS && (
            <button
              type="button"
              onClick={() => setShowIosTip((prev) => !prev)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              Install PWA
            </button>
          )}

          <div
            className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[10.5px] sm:text-xs font-semibold whitespace-nowrap"
            aria-label="100% Offline On-Device"
          >
            <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>100% Offline • On-Device</span>
          </div>
        </div>
      </div>

      {showIosTip && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-3">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-slate-700 dark:text-slate-200 flex items-center justify-between gap-2">
            <span>
              Tap Safari&apos;s <strong>Share</strong> icon and choose <strong>Add to Home Screen</strong> to install offline.
            </span>
            <button
              type="button"
              onClick={() => setShowIosTip(false)}
              className="font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
