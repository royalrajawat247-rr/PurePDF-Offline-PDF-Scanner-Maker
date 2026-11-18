import React, { useLayoutEffect, useRef } from 'react';
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

const AD_PARK_HOST_ID = 'adsterra-park-host';

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
  const adSlotRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const slotEl = adSlotRef.current;
    const hostEl = document.getElementById(AD_PARK_HOST_ID);
    if (!slotEl || !hostEl) return;

    const syncPosition = () => {
      const rect = slotEl.getBoundingClientRect();
      hostEl.setAttribute('aria-hidden', 'false');
      hostEl.style.position = 'absolute';
      hostEl.style.left = `${rect.left + window.scrollX}px`;
      hostEl.style.top = `${rect.top + window.scrollY}px`;
      hostEl.style.width = '300px';
      hostEl.style.height = '250px';
      hostEl.style.overflow = 'hidden';
      hostEl.style.borderRadius = '1rem';
      hostEl.style.opacity = '1';
      hostEl.style.pointerEvents = 'auto';
      hostEl.style.zIndex = '20';
    };

    syncPosition();

    const rafId = requestAnimationFrame(syncPosition);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncPosition) : null;
    resizeObserver?.observe(slotEl);
    resizeObserver?.observe(document.body);
    window.addEventListener('resize', syncPosition);
    window.addEventListener('scroll', syncPosition, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', syncPosition);
      window.removeEventListener('scroll', syncPosition);

      hostEl.setAttribute('aria-hidden', 'true');
      hostEl.style.position = 'fixed';
      hostEl.style.left = '-9999px';
      hostEl.style.top = '-9999px';
      hostEl.style.width = '300px';
      hostEl.style.height = '250px';
      hostEl.style.overflow = 'hidden';
      hostEl.style.opacity = '0';
      hostEl.style.pointerEvents = 'none';
      hostEl.style.zIndex = '20';
    };
  }, []);

  return (
    <div className="space-y-2.5 sm:space-y-3 select-none">
      <div>
        <h2 className="text-[15px] sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t.toolsHub.title}
        </h2>
        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {t.toolsHub.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {TOOL_META.map(({ id, Icon, tintClass }) => {
          const copy = t.toolsHub.cards[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTool(id)}
              className="text-left p-2.5 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm transition-all active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 flex flex-col justify-between min-h-[78px] sm:min-h-[108px]"
            >
              <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center ${tintClass}`}>
                <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div className="mt-1.5 sm:mt-2">
                <h3 className="text-[12.5px] sm:text-[15px] font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {copy.title}
                </h3>
                <p className="text-[10.5px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-2 leading-snug">
                  {copy.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-1.5 flex flex-col items-center justify-center">
        <div
          ref={adSlotRef}
          className="w-[300px] h-[250px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-center overflow-hidden"
        />
        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
          Sponsored · RR Tech Labs
        </span>
      </div>
    </div>
  );
};
