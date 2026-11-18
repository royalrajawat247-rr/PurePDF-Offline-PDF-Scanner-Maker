import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CheckSquare,
  Download,
  Eye,
  FileText,
  LayoutGrid,
  LayoutList,
  Lock,
  MoreVertical,
  Pencil,
  Plus,
  Printer,
  Search,
  Share2,
  Tag,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { PRESET_TAGS, type VaultDocument, type VaultSortOption } from '../types';
import {
  collectAllTags,
  filterSelectedDocuments,
  filterVaultDocs,
  formatFileSize,
  pruneSelectedIds,
  selectAllIds,
  sortVaultDocs,
  toggleDocumentTag,
  toggleSelectedId,
} from '../utils/documentMath';
import type { Translations } from '../utils/i18n';

export type VaultLayoutMode = 'list' | 'grid';

const VAULT_LAYOUT_KEY = 'purepdf_vault_layout_v1';

function loadSavedLayoutMode(): VaultLayoutMode {
  try {
    return localStorage.getItem(VAULT_LAYOUT_KEY) === 'grid' ? 'grid' : 'list';
  } catch {
    return 'list';
  }
}

interface VaultViewProps {
  docs: VaultDocument[];
  t: Translations;
  onPreview: (doc: VaultDocument) => void;
  onShare: (doc: VaultDocument) => void;
  onPrint: (doc: VaultDocument) => void;
  onRequestLockToggle: (doc: VaultDocument) => void;
  onUpdateTags: (doc: VaultDocument, nextTags: string[]) => Promise<void>;
  onRename: (doc: VaultDocument, nextName: string) => Promise<void>;
  onScanFirst: () => void;
  onExportZip: () => Promise<void>;
  onExportSelectedZip: (selectedDocs: VaultDocument[]) => Promise<void>;
  onDownload: (doc: VaultDocument) => void;
  onDelete: (doc: VaultDocument) => void;
  onBulkDelete: (ids: string[]) => Promise<void>;
}

const CATEGORY_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'tag:Finance', label: 'Finance' },
  { id: 'tag:Work', label: 'Work' },
  { id: 'tag:Personal', label: 'Personal' },
  { id: 'tag:IDs', label: 'IDs' },
] as const;

export const VaultView: React.FC<VaultViewProps> = ({
  docs,
  t,
  onPreview,
  onShare,
  onPrint,
  onRequestLockToggle,
  onUpdateTags,
  onRename,
  onExportZip,
  onExportSelectedZip,
  onDownload,
  onDelete,
  onBulkDelete,
}) => {
  const [layoutMode, setLayoutMode] = useState<VaultLayoutMode>(() => loadSavedLayoutMode());
  const [exportingZip, setExportingZip] = useState(false);
  const [exportingSelectedZip, setExportingSelectedZip] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState<VaultSortOption>('newest');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [menuDocId, setMenuDocId] = useState<string | null>(null);
  const [renamingInMenu, setRenamingInMenu] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [savingRename, setSavingRename] = useState(false);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [customTagInput, setCustomTagInput] = useState('');

  const menuDoc = useMemo(
    () => (menuDocId ? docs.find((d) => d.id === menuDocId) ?? null : null),
    [docs, menuDocId]
  );

  const closeMenu = () => {
    setMenuDocId(null);
    setConfirmDeleteId(null);
    setRenamingInMenu(false);
    setRenameDraft('');
  };

  useEffect(() => {
    if (!menuDocId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuDocId]);

  const handleSetLayoutMode = (next: VaultLayoutMode) => {
    setLayoutMode(next);
    try {
      localStorage.setItem(VAULT_LAYOUT_KEY, next);
    } catch {
      // Ignore storage errors
    }
  };

  const availableTags = useMemo(() => collectAllTags(docs), [docs]);

  const displayedDocs = useMemo(() => {
    const filtered = filterVaultDocs(docs, query, filter);
    return sortVaultDocs(filtered, sortBy);
  }, [docs, query, filter, sortBy]);

  const totalBytes = useMemo(
    () => docs.reduce((acc, d) => acc + d.size, 0),
    [docs]
  );

  const handleToggleTag = async (doc: VaultDocument, tag: string) => {
    const next = toggleDocumentTag(doc.tags, tag);
    await onUpdateTags(doc, next);
  };

  const handleAddCustomTag = async (doc: VaultDocument, e: React.FormEvent) => {
    e.preventDefault();
    const clean = customTagInput.trim();
    if (!clean) return;
    if (!(doc.tags || []).some((tag) => tag.toLowerCase() === clean.toLowerCase())) {
      await onUpdateTags(doc, [...(doc.tags || []), clean]);
    }
    setCustomTagInput('');
  };

  const activeSelectedIds = useMemo(
    () => pruneSelectedIds(selectedIds, docs),
    [selectedIds, docs]
  );

  const selectedDocs = useMemo(
    () => filterSelectedDocuments(docs, activeSelectedIds),
    [docs, activeSelectedIds]
  );

  const allDisplayedSelected =
    displayedDocs.length > 0 &&
    displayedDocs.every((doc) => activeSelectedIds.includes(doc.id));

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedIds([]);
        setConfirmBulkDelete(false);
      } else {
        setConfirmDeleteId(null);
        setMenuDocId(null);
        setEditingTagsId(null);
      }
      return next;
    });
  };

  const handleToggleSelectDoc = (id: string) => {
    setConfirmBulkDelete(false);
    setSelectedIds((prev) => toggleSelectedId(pruneSelectedIds(prev, docs), id));
  };

  const handleToggleSelectAllDisplayed = () => {
    setConfirmBulkDelete(false);
    if (allDisplayedSelected) {
      const displayedSet = new Set(displayedDocs.map((d) => d.id));
      setSelectedIds((prev) => prev.filter((id) => !displayedSet.has(id)));
    } else {
      const displayedIds = selectAllIds(displayedDocs);
      setSelectedIds((prev) => Array.from(new Set([...pruneSelectedIds(prev, docs), ...displayedIds])));
    }
  };

  const handleBulkExportZipClick = async () => {
    if (selectedDocs.length === 0) return;
    setExportingSelectedZip(true);
    try {
      await onExportSelectedZip(selectedDocs);
    } finally {
      setExportingSelectedZip(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (activeSelectedIds.length === 0) return;
    setDeletingBulk(true);
    try {
      await onBulkDelete(activeSelectedIds);
      setSelectedIds([]);
      setConfirmBulkDelete(false);
      setSelectionMode(false);
    } finally {
      setDeletingBulk(false);
    }
  };

  const handleZipClick = async () => {
    setExportingZip(true);
    try {
      await onExportZip();
    } finally {
      setExportingZip(false);
    }
  };

  const renderTagOrganizer = (doc: VaultDocument) => {
    const docTags = doc.tags || [];
    const tagOptions = Array.from(new Set([...PRESET_TAGS, ...docTags]));
    return (
      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {tagOptions.map((tag) => {
            const active = docTags.some(
              (item) => item.toLowerCase() === tag.toLowerCase()
            );
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleToggleTag(doc, tag)}
                aria-pressed={active}
                className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {active ? `✓ ${tag}` : `+ ${tag}`}
              </button>
            );
          })}
        </div>
        <form
          onSubmit={(e) => handleAddCustomTag(doc, e)}
          className="flex items-center gap-1.5"
        >
          <input
            type="text"
            value={customTagInput}
            onChange={(e) => setCustomTagInput(e.target.value)}
            maxLength={20}
            placeholder="Custom tag..."
            aria-label={`Custom tag for ${doc.name}`}
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
          />
          <button
            type="submit"
            className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold inline-flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>
      </div>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4 select-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t.vault.title}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
            {docs.length} {docs.length === 1 ? t.vault.fileLabel : t.vault.filesLabel} · {formatFileSize(totalBytes)} {t.vault.storedLocally}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {/* List / Grid Layout Switcher */}
          <div
            role="group"
            aria-label={t.vault.layoutToggleLabel}
            className="inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <button
              type="button"
              onClick={() => handleSetLayoutMode('list')}
              aria-pressed={layoutMode === 'list'}
              aria-label={t.vault.listView}
              title={t.vault.listView}
              className={`min-h-[32px] px-2 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                layoutMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.vault.listView}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetLayoutMode('grid')}
              aria-pressed={layoutMode === 'grid'}
              aria-label={t.vault.gridView}
              title={t.vault.gridView}
              className={`min-h-[32px] px-2 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                layoutMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.vault.gridView}</span>
            </button>
          </div>

          <button
            type="button"
            disabled={docs.length === 0}
            onClick={toggleSelectionMode}
            aria-pressed={selectionMode}
            className={`min-h-[36px] sm:min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-all active:scale-95 disabled:opacity-50 ${
              selectionMode
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {selectionMode ? <X className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
            <span>{selectionMode ? t.vault.doneSelecting : t.vault.selectMultiple}</span>
          </button>

          <button
            type="button"
            disabled={docs.length === 0 || exportingZip}
            onClick={handleZipClick}
            className="min-h-[36px] sm:min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{exportingZip ? t.vault.exportingZip : t.vault.exportZip}</span>
          </button>
        </div>
      </div>

      {/* Instant Search Bar + Category Filter Chips + Filter/Sort */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <label htmlFor="vault-search-input" className="sr-only">
            {t.vault.searchPlaceholder}
          </label>
          <input
            id="vault-search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.vault.searchPlaceholder}
            className="w-full pl-9 pr-9 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-[13px] sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-2 focus:outline-blue-600"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Chips (All, Finance, Work, Personal, IDs) */}
        <div
          role="group"
          aria-label="Category filter chips"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5"
        >
          {CATEGORY_CHIPS.map((chip) => {
            const isActive = filter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setFilter(chip.id)}
                className={`min-h-[32px] px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {chip.id === 'all' ? `${chip.label} (${docs.length})` : chip.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="vault-filter-select" className="block text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
              {t.vault.filterLabel}
            </label>
            <select
              id="vault-filter-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full min-h-[38px] px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100"
            >
              <option value="all">{t.vault.allFiles} ({docs.length})</option>
              <optgroup label="Tags">
                {availableTags.map((tag) => (
                  <option key={tag} value={`tag:${tag}`}>
                    Tag: {tag}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Document Type">
                <option value="scanned">Scanned</option>
                <option value="created">Photo PDF</option>
                <option value="merged">Merged</option>
                <option value="compressed">Compressed</option>
                <option value="signed">Signed</option>
                <option value="watermarked">Watermarked</option>
                <option value="ocr">Text (OCR)</option>
                <option value="locked">AES Locked</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label htmlFor="vault-sort-select" className="block text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
              {t.vault.sortLabel}
            </label>
            <select
              id="vault-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as VaultSortOption)}
              className="w-full min-h-[38px] px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name-asc">Name (A–Z)</option>
              <option value="size-desc">Size (Largest)</option>
              <option value="size-asc">Size (Smallest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Bulk Selection Toolbar */}
      {selectionMode && (
        <section
          aria-label="Bulk selection actions"
          className="bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl p-3 space-y-2.5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold tabular-nums">
                {activeSelectedIds.length} {t.vault.selectedCount}
              </span>
              <button
                type="button"
                disabled={displayedDocs.length === 0}
                onClick={handleToggleSelectAllDisplayed}
                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                {allDisplayedSelected ? t.vault.deselectAll : t.vault.selectAll}
              </button>
            </div>

            {confirmBulkDelete ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-red-700 dark:text-red-300 mr-1">
                  {t.vault.confirmBulkDelete}
                </span>
                <button
                  type="button"
                  disabled={deletingBulk}
                  onClick={handleBulkDeleteConfirm}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold"
                >
                  {t.common.confirm}
                </button>
                <button
                  type="button"
                  disabled={deletingBulk}
                  onClick={() => setConfirmBulkDelete(false)}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  {t.common.cancel}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={activeSelectedIds.length === 0 || exportingSelectedZip}
                  onClick={handleBulkExportZipClick}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>
                    {exportingSelectedZip ? t.vault.exportingZip : t.vault.exportSelectedZip}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={activeSelectedIds.length === 0 || deletingBulk}
                  onClick={() => setConfirmBulkDelete(true)}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.common.delete}</span>
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* File List or Visual Grid/Gallery */}
      {docs.length === 0 ? null : displayedDocs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl px-4 py-6 text-center flex flex-col items-center">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {t.vault.noMatchesTitle}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
            {t.vault.noMatchesClear}
          </p>
          {(query || filter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
              className="mt-3 min-h-[36px] px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all"
            >
              {t.vault.clearFilters}
            </button>
          )}
        </div>
      ) : layoutMode === 'grid' ? (
        <div
          data-vault-layout="grid"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3"
        >
          {displayedDocs.map((doc) => {
            const isEditingTags = editingTagsId === doc.id;
            const isSelected = activeSelectedIds.includes(doc.id);
            const docTags = doc.tags || [];

            return (
              <article
                key={doc.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between border transition-colors ${
                  selectionMode && isSelected
                    ? 'border-blue-600 ring-2 ring-blue-500/25'
                    : 'border-slate-200/90 dark:border-slate-800'
                }`}
              >
                {/* Visual Thumbnail Area */}
                <div className="relative">
                  {selectionMode && (
                    <label
                      className="absolute top-2 left-2 z-10 w-8 h-8 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-slate-300 dark:border-slate-600 shadow-sm flex items-center justify-center cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectDoc(doc.id)}
                        aria-label={`Select ${doc.name}`}
                        className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      selectionMode ? handleToggleSelectDoc(doc.id) : onPreview(doc)
                    }
                    aria-label={
                      selectionMode ? `Toggle selection for ${doc.name}` : `Preview ${doc.name}`
                    }
                    className="group relative w-full aspect-[3/4] p-2 bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 overflow-hidden flex items-center justify-center text-left"
                  >
                    {doc.thumbnailDataUrl && !doc.isLocked ? (
                      <img
                        src={doc.thumbnailDataUrl}
                        alt={doc.name}
                        className="w-full h-full object-contain rounded-lg shadow-xs bg-white group-hover:scale-[1.02] transition-transform"
                      />
                    ) : doc.isLocked ? (
                      <div className="p-3 text-center space-y-1.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                          <Lock className="w-4.5 h-4.5" />
                        </div>
                        <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                          AES {t.common.locked}
                        </div>
                      </div>
                    ) : doc.textPreview ? (
                      <div className="w-full h-full p-2.5 bg-white dark:bg-slate-900/90 text-[10px] leading-relaxed text-slate-600 dark:text-slate-300 overflow-hidden font-mono">
                        {doc.textPreview.slice(0, 220)}
                      </div>
                    ) : (
                      <div className="p-3 text-center space-y-1.5">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                          <FileText className="w-4.5 h-4.5" />
                        </div>
                        <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                          {doc.category}
                        </div>
                      </div>
                    )}
                  </button>
                </div>

                {/* Compact Card Footer: Title, Concise Metadata, Share & More */}
                <div className="p-2.5 space-y-2">
                  <div className="flex items-start justify-between gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        selectionMode ? handleToggleSelectDoc(doc.id) : onPreview(doc)
                      }
                      className="min-w-0 flex-1 text-left"
                    >
                      <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate">
                        {doc.name}
                      </h3>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums truncate">
                        {docTags.length > 0 && (
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {docTags[0]}{docTags.length > 1 ? ` +${docTags.length - 1}` : ''} ·{' '}
                          </span>
                        )}
                        {doc.pageCount} {doc.pageCount === 1 ? t.common.page : t.common.pages} · {formatFileSize(doc.size)}
                      </div>
                    </button>

                    {!selectionMode && (
                      <div className="flex items-center shrink-0 -mr-1">
                        <button
                          type="button"
                          onClick={() => onShare(doc)}
                          aria-label={`Share ${doc.name}`}
                          title={t.common.share}
                          className="w-8 h-8 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 flex items-center justify-center transition-all"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeleteId(null);
                            setMenuDocId(doc.id);
                          }}
                          aria-label={`More actions for ${doc.name}`}
                          aria-haspopup="menu"
                          aria-expanded={menuDocId === doc.id}
                          className="w-8 h-8 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 flex items-center justify-center transition-all"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditingTags && renderTagOrganizer(doc)}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div data-vault-layout="list" className="space-y-2">
          {displayedDocs.map((doc) => {
            const isEditingTags = editingTagsId === doc.id;
            const isSelected = activeSelectedIds.includes(doc.id);
            const docTags = doc.tags || [];

            return (
              <article
                key={doc.id}
                className={`rounded-2xl px-3 py-2.5 sm:px-3.5 sm:py-3 shadow-xs space-y-2.5 border transition-colors ${
                  selectionMode && isSelected
                    ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-600 ring-2 ring-blue-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    {selectionMode && (
                      <label className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectDoc(doc.id)}
                          aria-label={`Select ${doc.name}`}
                          className="w-4.5 h-4.5 accent-blue-600 rounded cursor-pointer"
                        />
                      </label>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        selectionMode ? handleToggleSelectDoc(doc.id) : onPreview(doc)
                      }
                      className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 text-left active:opacity-80 transition-opacity"
                    >
                      <div className="w-10 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
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
                        <h3 className="text-[13px] sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {doc.name}
                        </h3>
                        <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 tabular-nums truncate">
                          {docTags.length > 0 && (
                            <>
                              <span className="font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[110px]">
                                {docTags.join(', ')}
                              </span>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          <span className="shrink-0">
                            {doc.pageCount} {doc.pageCount === 1 ? t.common.page : t.common.pages}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="shrink-0">{formatFileSize(doc.size)}</span>
                          {doc.isLocked && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                                {t.common.locked}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>

                  {!selectionMode && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onShare(doc)}
                        aria-label={`Share ${doc.name}`}
                        title={t.common.share}
                        className="w-9 h-9 rounded-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 flex items-center justify-center transition-all"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteId(null);
                          setMenuDocId(doc.id);
                        }}
                        aria-label={`More actions for ${doc.name}`}
                        aria-haspopup="menu"
                        aria-expanded={menuDocId === doc.id}
                        className="w-9 h-9 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 flex items-center justify-center transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline Tag Organizer Panel (opened from three-dot menu) */}
                {isEditingTags && renderTagOrganizer(doc)}
              </article>
            );
          })}
        </div>
      )}

      {/* Sleek Native Bottom-Sheet / Action Menu for Card Actions */}
      {menuDoc && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/45 backdrop-blur-[1px] sm:p-4"
          onClick={closeMenu}
          role="dialog"
          aria-modal="true"
          aria-label={`Actions for ${menuDoc.name}`}
        >
          <div
            className="w-full sm:max-w-xs bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            <div className="sm:hidden flex justify-center pt-2.5 pb-1">
              <div className="w-9 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>

            {/* File Details Summary Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="w-9 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                {menuDoc.thumbnailDataUrl && !menuDoc.isLocked ? (
                  <img
                    src={menuDoc.thumbnailDataUrl}
                    alt={menuDoc.name}
                    className="w-full h-full object-cover"
                  />
                ) : menuDoc.isLocked ? (
                  <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {menuDoc.name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
                  <span className="capitalize">{menuDoc.category}</span> · {menuDoc.pageCount}{' '}
                  {menuDoc.pageCount === 1 ? t.common.page : t.common.pages} ·{' '}
                  {formatFileSize(menuDoc.size)}
                </div>
                <div className="text-[10.5px] text-slate-400 dark:text-slate-500 tabular-nums truncate">
                  {new Date(menuDoc.updatedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {menuDoc.isLocked ? ` · AES ${t.common.locked}` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={closeMenu}
                aria-label={t.common.cancel}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {renamingInMenu ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!renameDraft.trim()) return;
                  setSavingRename(true);
                  try {
                    await onRename(menuDoc, renameDraft);
                    closeMenu();
                  } finally {
                    setSavingRename(false);
                  }
                }}
                className="p-4 space-y-3"
              >
                <label
                  htmlFor="vault-rename-input"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  {t.vault.renamePdf}
                </label>
                <input
                  id="vault-rename-input"
                  type="text"
                  autoFocus
                  maxLength={80}
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  placeholder={t.vault.renamePlaceholder}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-2 focus:outline-blue-600"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={savingRename || !renameDraft.trim()}
                    className="flex-1 min-h-[42px] px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold active:scale-95 transition-all"
                  >
                    {t.common.save}
                  </button>
                  <button
                    type="button"
                    disabled={savingRename}
                    onClick={() => {
                      setRenamingInMenu(false);
                      setRenameDraft('');
                    }}
                    className="flex-1 min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    {t.common.cancel}
                  </button>
                </div>
              </form>
            ) : (
              /* Menu Action Rows */
              <div role="menu" className="p-2 space-y-0.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    const target = menuDoc;
                    closeMenu();
                    onPreview(target);
                  }}
                  className="w-full min-h-[44px] px-3 rounded-xl text-left text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200/70 dark:active:bg-slate-700/70 flex items-center gap-3 transition-colors"
                >
                  <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>{t.common.open}</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setRenameDraft(menuDoc.name);
                    setRenamingInMenu(true);
                  }}
                  className="w-full min-h-[44px] px-3 rounded-xl text-left text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200/70 dark:active:bg-slate-700/70 flex items-center gap-3 transition-colors"
                >
                  <Pencil className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
                  <span>{t.vault.renamePdf}</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    const targetId = menuDoc.id;
                    setCustomTagInput('');
                    setEditingTagsId(editingTagsId === targetId ? null : targetId);
                    closeMenu();
                  }}
                  className="w-full min-h-[44px] px-3 rounded-xl text-left text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200/70 dark:active:bg-slate-700/70 flex items-center justify-between gap-3 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Tag className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
                    <span>{t.vault.tagsBtn}</span>
                  </span>
                  {(menuDoc.tags?.length ?? 0) > 0 && (
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[110px]">
                      {menuDoc.tags?.join(', ')}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    const target = menuDoc;
                    closeMenu();
                    onDownload(target);
                  }}
                  className="w-full min-h-[44px] px-3 rounded-xl text-left text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200/70 dark:active:bg-slate-700/70 flex items-center gap-3 transition-colors"
                >
                  <Download className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
                  <span>{t.common.save}</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    const target = menuDoc;
                    closeMenu();
                    onPrint(target);
                  }}
                  className="w-full min-h-[44px] px-3 rounded-xl text-left text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200/70 dark:active:bg-slate-700/70 flex items-center gap-3 transition-colors"
                >
                  <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
                  <span>{t.common.print}</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    const target = menuDoc;
                    closeMenu();
                    onRequestLockToggle(target);
                  }}
                  className="w-full min-h-[44px] px-3 rounded-xl text-left text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200/70 dark:active:bg-slate-700/70 flex items-center gap-3 transition-colors"
                >
                  {menuDoc.isLocked ? (
                    <>
                      <Unlock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>{t.common.unlock}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0" />
                      <span>{t.common.lock}</span>
                    </>
                  )}
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                {confirmDeleteId === menuDoc.id ? (
                  <div className="flex items-center gap-2 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        const target = menuDoc;
                        closeMenu();
                        onDelete(target);
                      }}
                      aria-label={`Confirm delete ${menuDoc.name}`}
                      className="flex-1 min-h-[42px] px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                    >
                      {t.common.confirm} {t.common.delete}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="flex-1 min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                      {t.common.cancel}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setConfirmDeleteId(menuDoc.id)}
                    className="w-full min-h-[44px] px-3 rounded-xl text-left text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 active:bg-red-100/70 flex items-center gap-3 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span>{t.common.delete}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
