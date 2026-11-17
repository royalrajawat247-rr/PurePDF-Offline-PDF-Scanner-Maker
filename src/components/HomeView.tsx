import React from 'react';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Images,
  Lock,
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

export const HomeView: React.FC<HomeViewProps> = ({
  recentDocs,
  t,
  onOpenTool,
  onOpenVault,
  onPreviewDoc,
  onDownloadDoc,
}) => {
  return (<>
    <div className="space-y-3 sm:space-y-4">
      {/* Compact 2-Column Side-by-Side Hero Action Cards */}
      <section aria-label="Quick scan and build actions" className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => onOpenTool('camera-scan')}
          className="group text-left p-3.5 sm:p-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 min-h-[106px] sm:min-h-[128px] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <ArrowRight className="w-4 h-4 text-blue-100 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </div>
          <div className="mt-2 sm:mt-3">
            <h2 className="text-sm sm:text-lg font-bold tracking-tight text-white leading-snug">
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
          className="group text-left p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 min-h-[106px] sm:min-h-[128px] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Images className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
          <div className="mt-2 sm:mt-3">
            <h2 className="text-sm sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-snug">
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
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2.5 sm:px-5 sm:py-3.5 shadow-sm"
      >
        <ul className="space-y-1.5">
          {t.home.trustPoints.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Recent Saved Files List (Immediately Visible Above the Fold) */}
      <section
        aria-label={t.home.recentSavedFiles}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              {t.home.recentSavedFiles}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              {t.home.recentSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenVault}
            className="min-h-[40px] px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 inline-flex items-center gap-1 whitespace-nowrap"
          >
            <span>{t.home.openVault}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {recentDocs.length === 0 ? (
          <div className="p-6 text-center">
            <FileText className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t.home.noSavedDocs}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t.home.noSavedDocsHint}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentDocs.slice(0, 5).map((doc) => (
              <div
                key={doc.id}
                className="px-4 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onPreviewDoc(doc)}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left min-h-[44px]"
                >
                  <div className="w-9 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                    {doc.thumbnailDataUrl && !doc.isLocked ? (
                      <img
                        src={doc.thumbnailDataUrl}
                        alt={doc.name}
                        className="w-full h-full object-cover"
                      />
                    ) : doc.isLocked ? (
                      <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {doc.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5 tabular-nums">
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
                  className="min-h-[40px] min-w-[40px] px-2.5 sm:px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 text-xs font-semibold shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.common.save}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
          <div className="w-full flex flex-col items-center justify-center pt-2 pb-1">
     <iframe
       title="Sponsored Ad"
       width="300"
       height="250"
       scrolling="no"
       frameBorder="0"
       className="rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900"
       srcDoc={'<html><body style="margin:0;padding:0;overflow:hidden;"><script>atOptions={"key":"3c871837a782b0b2e79d79d8fce4060f","format":"iframe","height":250,"width":300,"params":{}};</script><script src="https://bauval.org"></script></body></html>'}
     />
     <span className="text-[10px] text-slate-400 mt-1">Sponsored • RR Tech Labs</span>
   </div>
        </div>
  </div>
  </>
);
};
