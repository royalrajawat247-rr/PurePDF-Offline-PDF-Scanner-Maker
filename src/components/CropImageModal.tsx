import React, { useState } from 'react';
import { Check, Crop, RotateCcw, X } from 'lucide-react';
import type { CropEdgesPct } from '../utils/documentMath';

interface CropImageModalProps {
  imageUrl: string;
  pageLabel: string;
  onCancel: () => void;
  onApply: (edges: CropEdgesPct) => Promise<void> | void;
}

const DEFAULT_EDGES: CropEdgesPct = { top: 6, right: 6, bottom: 6, left: 6 };

export const CropImageModal: React.FC<CropImageModalProps> = ({
  imageUrl,
  pageLabel,
  onCancel,
  onApply,
}) => {
  const [edges, setEdges] = useState<CropEdgesPct>(DEFAULT_EDGES);
  const [applying, setApplying] = useState(false);

  const updateEdge = (key: keyof CropEdgesPct, rawVal: number) => {
    setEdges((prev) => {
      const next = { ...prev };
      if (key === 'left') {
        next.left = Math.max(0, Math.min(75 - prev.right, rawVal));
      } else if (key === 'right') {
        next.right = Math.max(0, Math.min(75 - prev.left, rawVal));
      } else if (key === 'top') {
        next.top = Math.max(0, Math.min(75 - prev.bottom, rawVal));
      } else {
        next.bottom = Math.max(0, Math.min(75 - prev.top, rawVal));
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    setApplying(true);
    try {
      await onApply(edges);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Crop ${pageLabel}`}
      onClick={onCancel}
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-5 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] pb-safe"
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-0.5">
          <div className="w-9 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Crop className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Crop {pageLabel}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close crop dialog"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Interactive Visual Crop Frame Preview */}
          <div className="relative mx-auto w-fit max-w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700">
            <img
              src={imageUrl}
              alt={pageLabel}
              className="block max-h-[38vh] w-auto object-contain select-none"
            />
            {/* Shaded Outside Crop Regions */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'rgba(15, 23, 42, 0.55)',
                clipPath: `polygon(
                  0% 0%, 100% 0%, 100% 100%, 0% 100%,
                  0% ${edges.top}%,
                  ${edges.left}% ${edges.top}%,
                  ${edges.left}% ${100 - edges.bottom}%,
                  ${100 - edges.right}% ${100 - edges.bottom}%,
                  ${100 - edges.right}% ${edges.top}%,
                  0% ${edges.top}%
                )`,
              }}
            />
            {/* Active Crop Box Border + Corner Marks */}
            <div
              className="absolute pointer-events-none border-2 border-blue-400 shadow-[0_0_0_1px_rgba(255,255,255,0.7)]"
              style={{
                top: `${edges.top}%`,
                right: `${edges.right}%`,
                bottom: `${edges.bottom}%`,
                left: `${edges.left}%`,
              }}
            >
              <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white" />
              <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white" />
              <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white" />
              <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white" />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setEdges({ top: 0, right: 0, bottom: 0, left: 0 })}
              className="min-h-[34px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Full Page</span>
            </button>
            <button
              type="button"
              onClick={() => setEdges({ top: 8, right: 8, bottom: 8, left: 8 })}
              className="min-h-[34px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
            >
              Tight Trim (8%)
            </button>
            <button
              type="button"
              onClick={() => setEdges({ top: 14, right: 10, bottom: 14, left: 10 })}
              className="min-h-[34px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
            >
              Center Focus
            </button>
          </div>

          {/* Edge Sliders */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <label className="space-y-1">
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                <span>Top Trim</span>
                <span>{edges.top}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={45}
                value={edges.top}
                aria-label="Top Trim"
                onChange={(e) => updateEdge('top', Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </label>

            <label className="space-y-1">
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                <span>Bottom Trim</span>
                <span>{edges.bottom}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={45}
                value={edges.bottom}
                aria-label="Bottom Trim"
                onChange={(e) => updateEdge('bottom', Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </label>

            <label className="space-y-1">
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                <span>Left Trim</span>
                <span>{edges.left}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={45}
                value={edges.left}
                aria-label="Left Trim"
                onChange={(e) => updateEdge('left', Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </label>

            <label className="space-y-1">
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                <span>Right Trim</span>
                <span>{edges.right}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={45}
                value={edges.right}
                aria-label="Right Trim"
                onChange={(e) => updateEdge('right', Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </label>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={applying}
            onClick={handleConfirm}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>{applying ? 'Cropping...' : 'Apply Crop'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
