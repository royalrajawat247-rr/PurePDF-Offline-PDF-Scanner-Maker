import React from 'react';
import { FolderLock, Home, LayoutGrid, Settings } from 'lucide-react';
import type { TabId } from '../types';
import type { Translations } from '../utils/i18n';

interface BottomNavAndAdProps {
  activeTab: TabId;
  t: Translations;
  onSelectTab: (tab: TabId) => void;
}

export const BottomNavAndAd: React.FC<BottomNavAndAdProps> = ({
  activeTab,
  t,
  onSelectTab,
}) => {
  const navItems: Array<{ id: TabId; label: string; Icon: React.FC<{ className?: string }> }> = [
    { id: 'home', label: t.nav.home, Icon: Home },
    { id: 'tools', label: t.nav.tools, Icon: LayoutGrid },
    { id: 'vault', label: t.nav.vault, Icon: FolderLock },
    { id: 'settings', label: t.nav.settings, Icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 no-print">
      {/* <!-- AD_SLOT --> */}

      {/* Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Primary navigation"
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
      >
        <div className="max-w-5xl mx-auto grid grid-cols-4 h-14">
          {navItems.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectTab(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
