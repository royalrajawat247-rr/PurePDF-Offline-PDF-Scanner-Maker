import React, { useEffect, useRef } from 'react';
import {
  Camera,
  FileImage,
  FileScan,
  Images,
  Layers,
  Minimize2,
  PenTool,
  Stamp,
} from 'lucide-react';
import type { ToolId } from '../types';
import type { Translations } from '../utils/i18n';

interface ToolsHubViewProps {
  t: Translations;
  onSelectTool: (tool: ToolId) => void;
}

const TOOL_META: Array<{
  id: ToolId;
  Icon: React.FC<{ className?: string }>;
  tintClass: string;
}> = [
  {
    id: 'camera-scan',
    Icon: Camera,
    tintClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
  },
  {
    id: 'photo-to-pdf',
    Icon: Images,
    tintClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
  },
  {
    id: 'merge-split',
    Icon: Layers,
    tintClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
  },
  {
    id: 'compress',
    Icon: Minimize2,
    tintClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
  },
  {
    id: 'esign-lock',
    Icon: PenTool,
    tintClass: 'bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400',
  },
  {
    id: 'ocr',
    Icon: FileScan,
    tintClass: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400',
  },
  {
    id: 'pdf-to-jpg',
    Icon: FileImage,
    tintClass: 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400',
  },
  {
    id: 'watermark',
    Icon: Stamp,
    tintClass: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
  },
];

export const ToolsHubView: React.FC<ToolsHubViewProps> = ({ t, onSelectTool }) => {
  const adContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = adContainerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const confScript = document.createElement('script');
    confScript.type = 'text/javascript';
    confScript.innerHTML = `atOptions = {
      'key' : '46e4e138f57283796597eb8d3e3aca8b',
      'format' : 'iframe',
      'height' : 250,
      'width' : 300,
      'params' : {}
    };`;

    const adScript = document.createElement('script');
    adScript.type = 'text/javascript';
    adScript.src = 'https://bauval.org';

    container.appendChild(confScript);
    container.appendChild(adScript);

    return () => {
      container.innerHTML = '';
    };
  }, []);

  return (
    <div className="space-y-2.5">
      <div>
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t.toolsHub.title}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {t.toolsHub.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3.5">
        {TOOL_META.map(({ id, Icon, tintClass }) => {
          const copy = t.toolsHub.cards[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTool(id)}
              className="text-left p-2.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 flex flex-col justify-between min-h-[86px] sm:min-h-[116px]"
            >
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${tintClass}`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="mt-1.5 sm:mt-2">
                <h3 className="text-xs sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {copy.title}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-2 leading-snug">
                  {copy.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      <div className="w-full flex flex-col items-center justify-center pt-2">
        <div
          ref={adContainerRef}
          aria-label="Sponsored Ad"
          className="w-[300px] h-[250px] rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex items-center justify-center"
        />
        <span className="text-[10px] text-slate-400 mt-1">Sponsored · RR Tech Labs</span>
      </div>
    </div>
  );
};
