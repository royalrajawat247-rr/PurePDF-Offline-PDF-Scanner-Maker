import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const AppHeader: React.FC = () => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md select-none">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center min-w-0">
          <h1 className="text-[16px] sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
            PurePDF
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[10.5px] sm:text-xs font-semibold whitespace-nowrap"
            aria-label="100% Offline On-Device"
          >
            <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>100% Offline • On-Device</span>
          </div>
        </div>
      </div>
    </header>
  );
};
