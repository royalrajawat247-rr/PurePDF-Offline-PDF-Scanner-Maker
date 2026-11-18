import React from 'react';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Download,
  EyeOff,
  FileScan,
  FileText,
  Images,
  Layers,
  Lock,
  Minimize2,
  PenTool,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { ToolId, VaultDocument } from '../types';
import { formatFileSize } from '../utils/documentMath';
import type { Translations } from '../utils/i18n';

interface HomeViewProps {
  recentDocs: VaultDocument[];
  t: Translations;
  onOpenTool: (tool: ToolId) => void;
  onOpenVault: () => void;
  onPreviewDoc: (doc: VaultDocument) => void;
  onDownloadDoc: (doc: VaultDocument) => void;
}

const QUICK_PRO_ACTIONS: Array<{
  id: ToolId;
  title: string;
  subtitle: string;
  Icon: React.FC<{ className?: string }>;
  tintClass: string;
}> = [
  {
    id: 'merge-split',
    title: 'Merge & Split PDF',
    subtitle: 'Combine or extract pages',
    Icon: Layers,
    tintClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
  },
  {
    id: 'compress',
    title: 'Compress PDF',
    subtitle: 'Shrink file size cleanly',
    Icon: Minimize2,
    tintClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
  },
  {
    id: 'esign-lock',
    title: 'E-Sign & Lock',
    subtitle: 'Sign & password protect',
    Icon: PenTool,
    tintClass: 'bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400',
  },
  {
    id: 'ocr',
    title: 'OCR Text Extract',
    subtitle: 'Copy text from scans',
    Icon: FileScan,
    tintClass: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400',
  },
];

export const HomeView: React.FC<HomeViewProps> = ({
  recentDocs,
  t,
  onOpenTool,
  onOpenVault,
  onPreviewDoc,
  onDownloadDoc,
}) => {
  return (
    <div className="space-y-2.5 sm:space-y-4 select-none">
      {/* Compact 2-Column Side-by-Side Hero Action Cards */}
      <section aria-label="Quick scan and build actions" className="grid grid-cols-2 gap-2.5 sm:gap-4">
        <button
          type="button"
          onClick={() => onOpenTool('camera-scan')}
          className="group text-left p-3 sm:p-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 min-h-[94px] sm:min-h-[124px] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Camera className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white" />
            </div>
            <ArrowRight className="w-4 h-4 text-blue-100 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </div>
          <div className="mt-2 sm:mt-3">
            <h2 className="text-[13px] sm:text-lg font-bold tracking-tight text-white leading-snug">
              {t.home.cameraScanTitle}
            </h2>
            <p className="text-[11px] sm:text-xs text-blue-100 mt-0.5 line-clamp-2 leading-snug">
              {t.home.cameraScanDesc}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onOpenTool('photo-to-pdf')}
          className="group text-left p-3 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm transition-all active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 min-h-[94px] sm:min-h-[124px] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Images className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
          <div className="mt-2 sm:mt-3">
            <h2 className="text-[13px] sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-snug">
              {t.home.photoToPdfTitle}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2 leading-snug">
              {t.home.photoToPdfDesc}
            </p>
          </div>
        </button>
      </section>

      {/* Sleek User Trust & Highlights Card */}
      <section
        aria-label="Privacy and quality highlights"
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl px-3 py-2 sm:px-4.5 sm:py-3 shadow-sm"
      >
        <ul className="space-y-1">
          {t.home.trustPoints.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 text-[11.5px] sm:text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Recent Saved Files List (Hidden Until User Saves Their First Real File) */}
      {recentDocs.length > 0 && (
        <section
          aria-label={t.home.recentSavedFiles}
          className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[13px] sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {t.home.recentSavedFiles}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                {t.home.recentSubtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenVault}
              className="min-h-[36px] px-2 py-1 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 active:scale-95 transition-all inline-flex items-center gap-0.5 whitespace-nowrap"
            >
              <span>{t.home.openVault}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentDocs.slice(0, 5).map((doc) => (
              <div
                key={doc.id}
                className="px-3.5 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between gap-2.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onPreviewDoc(doc)}
                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left min-h-[40px] active:opacity-80"
                >
                  <div className="w-8 h-9 sm:w-9 sm:h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                    {doc.thumbnailDataUrl && !doc.isLocked ? (
                      <img
                        src={doc.thumbnailDataUrl}
                        alt={doc.name}
                        className="w-full h-full object-cover"
                      />
                    ) : doc.isLocked ? (
                      <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {doc.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1 mt-0.5 tabular-nums">
                      {doc.tags && doc.tags.length > 0 && (
                        <>
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            {doc.tags.join(', ')}
                          </span>
                          <span aria-hidden="true">·</span>
                        </>
                      )}
                      <span className="capitalize">{doc.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {doc.pageCount} {doc.pageCount === 1 ? t.common.page : t.common.pages}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatFileSize(doc.size)}</span>
                      {doc.isLocked && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            {t.common.locked}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onDownloadDoc(doc)}
                  aria-label={`Download ${doc.name}`}
                  className="min-h-[36px] min-w-[36px] px-2 sm:px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all inline-flex items-center justify-center gap-1.5 text-xs font-semibold shrink-0"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t.common.save}</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Pro Actions 2x2 Compact Grid */}
      <section aria-label="Quick Pro Actions" className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-[13px] sm:text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Quick Pro Actions
          </h2>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            1-Tap Tools
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {QUICK_PRO_ACTIONS.map(({ id, title, subtitle, Icon, tintClass }) => (
            <button
              key={id}
              type="button"
              onClick={() => onOpenTool(id)}
              className="group text-left p-2.5 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm transition-all active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 flex items-center gap-2.5 sm:gap-3 min-h-[64px]"
            >
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${tintClass}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
                  {title}
                </div>
                <div className="text-[10.5px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {subtitle}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Built by RR Tech Labs • Enterprise Security Trust Card */}
      <section
        aria-label="Built by RR Tech Labs Enterprise Security"
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm space-y-2.5"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[13px] sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Built by RR Tech Labs • Enterprise Security
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Private on-device architecture designed for zero data leaks
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 pt-0.5">
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-[11.5px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>256-Bit Local File Encryption</span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-[11.5px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200">
            <EyeOff className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Zero Cloud Tracking</span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-[11.5px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Cpu className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>100% Offline Engine</span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-[11.5px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
            <span>Made for Speed &amp; Privacy — RR Tech Labs</span>
          </div>
        </div>
      </section>
    </div>
  );
};
