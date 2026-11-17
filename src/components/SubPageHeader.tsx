import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface SubPageHeaderProps {
  title: string;
  subtitle?: string;
  backLabel?: string;
  onBack: () => void;
}

export const SubPageHeader: React.FC<SubPageHeaderProps> = ({
  title,
  subtitle,
  backLabel = 'Back',
  onBack,
}) => {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
      <button
        type="button"
        onClick={onBack}
        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 text-sm font-semibold shrink-0 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{backLabel}</span>
      </button>
      <div className="min-w-0">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
