import React, { useMemo, useState } from 'react';
import {
  Archive,
  CheckSquare,
  Download,
  Eye,
  FileText,
  LayoutGrid,
  LayoutList,
  Lock,
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
  onExportZip: () => Promise<void>;
  onExportSelectedZip: (selectedDocs: VaultDocument[]) => Promise<void>;
  onDownload: (doc: VaultDocument) => void;
  onDelete: (doc: VaultDocument) => void;
  onBulkDelete: (ids: string[]) => Promise<void>;
}

export const VaultView: React.FC<VaultViewProps> = ({
  docs,
  t,
  onPreview,
  onShare,
  onPrint,
  onRequestLockToggle,
  onUpdateTags,
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
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [customTagInput, setCustomTagInput] = useState('');

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t.vault.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
            {docs.length} {docs.length === 1 ? t.vault.fileLabel : t.vault.filesLabel} · {formatFileSize(totalBytes)} {t.vault.storedLocally}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
          {/* List / Grid Layout Switcher */}
          <div
            role="group"
            aria-label={t.vault.layoutToggleLabel}
            className="inline-flex items-center gap-0.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <button
              type="button"
              onClick={() => handleSetLayoutMode('list')}
              aria-pressed={layoutMode === 'list'}
              aria-label={t.vault.listView}
              title={t.vault.listView}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
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
              className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
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
            className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50 ${
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
            className="min-h-[42px] px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{exportingZip ? t.vault.exportingZip : t.vault.exportZip}</span>
          </button>
        </div>
      </div>

      {/* Search + Filter & Sort Dropdowns */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <label htmlFor="vault-search-input" className="sr-only">
            {t.vault.searchPlaceholder}
          </label>
          <input
            id="vault-search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.vault.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-2 focus:outline-blue-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label htmlFor="vault-filter-select" className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              {t.vault.filterLabel}
            </label>
            <select
              id="vault-filter-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100"
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
            <label htmlFor="vault-sort-select" className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              {t.vault.sortLabel}
            </label>
            <select
              id="vault-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as VaultSortOption)}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100"
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
      {displayedDocs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
          <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t.vault.noMatchesTitle}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {query || filter !== 'all'
              ? t.vault.noMatchesClear
              : t.vault.noMatchesEmpty}
          </p>
        </div>
      ) : layoutMode === 'grid' ? (
        <div
          data-vault-layout="grid"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
        >
          {displayedDocs.map((doc) => {
            const isConfirming = confirmDeleteId === doc.id;
            const isEditingTags = editingTagsId === doc.id;
            const isSelected = activeSelectedIds.includes(doc.id);
            const docTags = doc.tags || [];

            return (
              <article
                key={doc.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between border transition-colors ${
                  selectionMode && isSelected
                    ? 'border-blue-600 ring-2 ring-blue-500/25'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Large Visual Thumbnail Area */}
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
                        <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                          <Lock className="w-5 h-5" />
                        </div>
                        <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                          AES {t.common.locked}
                        </div>
                      </div>
                    ) : doc.textPreview ? (
                      <div className="w-full h-full p-3 bg-white dark:bg-slate-900/90 text-[10px] leading-relaxed text-slate-600 dark:text-slate-300 overflow-hidden font-mono">
                        {doc.textPreview.slice(0, 220)}
                      </div>
                    ) : (
                      <div className="p-3 text-center space-y-1.5">
                        <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                          {doc.category}
                        </div>
                      </div>
                    )}
                  </button>
                </div>

                {/* Card Details & Actions */}
                <div className="p-2.5 sm:p-3 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        selectionMode ? handleToggleSelectDoc(doc.id) : onPreview(doc)
                      }
                      className="w-full text-left"
                    >
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {doc.name}
                      </h3>
                    </button>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums truncate">
                      {doc.pageCount} {doc.pageCount === 1 ? t.common.page : t.common.pages} · {formatFileSize(doc.size)}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomTagInput('');
                          setEditingTagsId(isEditingTags ? null : doc.id);
                        }}
                        aria-expanded={isEditingTags}
                        aria-label={`Tags for ${doc.name}`}
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline truncate inline-flex items-center gap-1"
                      >
                        <Tag className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {docTags.length > 0 ? docTags.join(', ') : `+ ${t.vault.tagsBtn}`}
                        </span>
                      </button>
                    </div>
                  </div>

                  {isEditingTags && renderTagOrganizer(doc)}

                  {isConfirming ? (
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          onDelete(doc);
                          setConfirmDeleteId(null);
                        }}
                        aria-label={`Confirm delete ${doc.name}`}
                        className="flex-1 min-h-[34px] px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold"
                      >
                        {t.common.confirm}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="flex-1 min-h-[34px] px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold"
                      >
                        {t.common.cancel}
                      </button>
                    </div>
                  ) : (
                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-4 gap-1">
                      <button
                        type="button"
                        onClick={() => onDownload(doc)}
                        aria-label={`Download ${doc.name}`}
                        title={t.common.save}
                        className="min-h-[36px] rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onShare(doc)}
                        aria-label={`Share ${doc.name}`}
                        title={t.common.share}
                        className="min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequestLockToggle(doc)}
                        aria-label={doc.isLocked ? `Unlock ${doc.name}` : `Lock ${doc.name}`}
                        title={doc.isLocked ? t.common.unlock : t.common.lock}
                        className={`min-h-[36px] rounded-lg border flex items-center justify-center transition-colors ${
                          doc.isLocked
                            ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {doc.isLocked ? (
                          <Unlock className="w-3.5 h-3.5" />
                        ) : (
                          <Lock className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(doc.id)}
                        aria-label={`Delete ${doc.name}`}
                        title={t.common.delete}
                        className="min-h-[36px] rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div data-vault-layout="list" className="space-y-3">
          {displayedDocs.map((doc) => {
            const formattedDate = new Date(doc.updatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const isConfirming = confirmDeleteId === doc.id;
            const isEditingTags = editingTagsId === doc.id;
            const isSelected = activeSelectedIds.includes(doc.id);
            const docTags = doc.tags || [];

            return (
              <article
                key={doc.id}
                className={`rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-2.5 border transition-colors ${
                  selectionMode && isSelected
                    ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-600 ring-2 ring-blue-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
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
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <div className="w-10 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                        {doc.thumbnailDataUrl && !doc.isLocked ? (
                          <img
                            src={doc.thumbnailDataUrl}
                            alt={doc.name}
                            className="w-full h-full object-cover"
                          />
                        ) : doc.isLocked ? (
                          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                          {doc.name}
                        </h3>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5 tabular-nums">
                        {docTags.length > 0 && (
                          <>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {docTags.join(', ')}
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
                        <span aria-hidden="true">·</span>
                        <span>{formattedDate}</span>
                        {doc.isLocked && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              AES {t.common.locked}
                            </span>
                          </>
                        )}
                      </div>
                      </div>
                    </button>
                  </div>

                  {!selectionMode && (
                    <button
                      type="button"
                      onClick={() => onDownload(doc)}
                      aria-label={`Download ${doc.name}`}
                      className="min-h-[40px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t.common.save}</span>
                    </button>
                  )}
                </div>

                {/* Inline Tag Organizer Panel (when opened) */}
                {isEditingTags && renderTagOrganizer(doc)}

                {/* Real Actions Row */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onPreview(doc)}
                      aria-label={`Preview ${doc.name}`}
                      className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{t.common.open}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCustomTagInput('');
                        setEditingTagsId(isEditingTags ? null : doc.id);
                      }}
                      aria-expanded={isEditingTags}
                      aria-label={`Tags for ${doc.name}`}
                      className={`min-h-[38px] px-2.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 ${
                        isEditingTags
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>{t.vault.tagsBtn}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onShare(doc)}
                      aria-label={`Share ${doc.name}`}
                      className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{t.common.share}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onPrint(doc)}
                      aria-label={`Print ${doc.name}`}
                      className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{t.common.print}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRequestLockToggle(doc)}
                      aria-label={doc.isLocked ? `Unlock ${doc.name}` : `Lock ${doc.name}`}
                      className={`min-h-[38px] px-2.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 ${
                        doc.isLocked
                          ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {doc.isLocked ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>{t.common.unlock}</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>{t.common.lock}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {isConfirming ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onDelete(doc);
                          setConfirmDeleteId(null);
                        }}
                        aria-label={`Confirm delete ${doc.name}`}
                        className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                      >
                        {t.common.confirm}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                      >
                        {t.common.cancel}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(doc.id)}
                      aria-label={`Delete ${doc.name}`}
                      className="min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.common.delete}</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
