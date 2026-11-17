import React, { Component, useCallback, useEffect, useMemo, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { BottomNavAndAd } from './components/BottomNavAndAd';
import { DocumentModal } from './components/DocumentModal';
import { HomeView } from './components/HomeView';
import { PinLockScreen } from './components/PinLockScreen';
import { SettingsView } from './components/SettingsView';
import { ToolsHubView } from './components/ToolsHubView';
import { VaultView } from './components/VaultView';
import { CameraScanTool } from './components/tools/CameraScanTool';
import { CompressTool } from './components/tools/CompressTool';
import { ESignLockTool } from './components/tools/ESignLockTool';
import { MergeSplitTool } from './components/tools/MergeSplitTool';
import { OcrExtractorTool } from './components/tools/OcrExtractorTool';
import { PdfToJpgTool } from './components/tools/PdfToJpgTool';
import { PhotoToPdfTool } from './components/tools/PhotoToPdfTool';
import { WatermarkTool } from './components/tools/WatermarkTool';
import type { AppSettings, TabId, ToolId, VaultDocument } from './types';
import { getTranslations } from './utils/i18n';
import { sendLocalNotification } from './utils/localNotifications';
import {
  deleteDocument,
  deleteDocumentsBulk,
  getAllDocuments,
  loadSettings,
  lockVaultDocument,
  saveDocument,
  saveSettings,
  seedInitialDocumentsIfEmpty,
  triggerDownloadBytes,
  unlockVaultDocument,
  updateDocumentTags,
} from './utils/vaultStorage';
import { exportVaultAsZip } from './utils/zipArchive';

class AppErrorBoundary extends Component<
  { children: React.ReactNode; onReset: () => void },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode; onReset: () => void }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Unexpected processing error.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Recovered from Processing Error
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, message: '' });
              this.props.onReset();
            }}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold"
          >
            Return to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [isPinUnlocked, setIsPinUnlocked] = useState(() => {
    const initial = loadSettings();
    return !(initial.appLockEnabled && initial.appPinHash);
  });
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [toolReturnTab, setToolReturnTab] = useState<TabId>('tools');
  const [docs, setDocs] = useState<VaultDocument[]>([]);
  const [loadingVault, setLoadingVault] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    mode: 'preview' | 'lock' | 'unlock';
    doc: VaultDocument;
  } | null>(null);

  const t = useMemo(() => getTranslations(settings.language), [settings.language]);

  const notify = useCallback(
    (msg: string, pushTitle?: string) => {
      setToastMsg(msg);
      if (pushTitle) {
        void sendLocalNotification(pushTitle, msg, settings.notificationsEnabled);
      }
    },
    [settings.notificationsEnabled]
  );

  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => setToastMsg(null), 3600);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  // Sync Dark Mode class, theme-color meta tag & permanent clean PurePDF title
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
    document.documentElement.lang = settings.language;
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', settings.darkMode ? '#020617' : '#F8FAFC');
    }
    document.title = 'PurePDF';
  }, [settings.darkMode, settings.language]);

  // Toggle Adsterra sponsored ad slot visibility (Tools Hub tab only)
  useEffect(() => {
    const adSlot = document.getElementById('adsterra-tools-slot');
    if (adSlot) {
      const isToolsHub = activeTab === 'tools' && activeTool === null;
      adSlot.style.display = isToolsHub ? 'flex' : 'none';
    }
    return () => {
      const adSlot = document.getElementById('adsterra-tools-slot');
      if (adSlot) {
        adSlot.style.display = 'none';
      }
    };
  }, [activeTab, activeTool]);

  const refreshVault = useCallback(async () => {
    try {
      const loaded = await getAllDocuments();
      setDocs(loaded);
    } catch {
      notify('Unable to refresh local File Vault.');
    }
  }, [notify]);

  useEffect(() => {
    let active = true;
    seedInitialDocumentsIfEmpty()
      .then((initial) => {
        if (active) setDocs(initial);
      })
      .catch(() => {
        if (active) setDocs([]);
      })
      .finally(() => {
        if (active) setLoadingVault(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleUpdateSettings = (next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
    if (!next.appLockEnabled) {
      setIsPinUnlocked(true);
    }
  };

  const handleSelectTab = (tab: TabId) => {
    setActiveTab(tab);
    setActiveTool(null);
  };

  const handleOpenTool = (tool: ToolId, fromTab: TabId) => {
    setToolReturnTab(fromTab);
    setActiveTab('tools');
    setActiveTool(tool);
  };

  const handleSaveToVault = async (doc: VaultDocument) => {
    try {
      await saveDocument(doc);
      await refreshVault();
      const title =
        doc.category === 'compressed'
          ? 'PDF Compressed & Saved'
          : doc.category === 'watermarked'
            ? 'Watermark Applied'
            : 'Document Saved Locally';
      void sendLocalNotification(
        title,
        `"${doc.name}" stored privately in your offline File Vault.`,
        settings.notificationsEnabled
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Unable to save document to offline vault.');
      throw err;
    }
  };

  const handleExportZip = async () => {
    try {
      const currentDocs = await getAllDocuments();
      if (currentDocs.length === 0) {
        notify('File Vault is empty — save a document before exporting a ZIP archive.');
        return;
      }
      const { bytes, filename, fileCount } = await exportVaultAsZip(currentDocs, settings);
      triggerDownloadBytes(bytes, filename, 'application/zip');
      notify(
        `Exported all ${fileCount} vault files to "${filename}".`,
        'ZIP Archive Ready'
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to build ZIP archive.');
    }
  };

  const handleExportSelectedZip = async (selectedDocs: VaultDocument[]) => {
    try {
      if (selectedDocs.length === 0) {
        notify('Select at least one document to export as ZIP.');
        return;
      }
      const { bytes, filename, fileCount } = await exportVaultAsZip(selectedDocs, settings, {
        filenamePrefix: 'PurePDF-Selected-Files',
      });
      triggerDownloadBytes(bytes, filename, 'application/zip');
      notify(
        `Exported ${fileCount} selected ${fileCount === 1 ? 'file' : 'files'} to "${filename}".`,
        'Selected ZIP Ready'
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to export selected files as ZIP.');
    }
  };

  const handleDownloadDoc = (doc: VaultDocument) => {
    try {
      if (doc.isLocked) {
        setModalState({ mode: 'unlock', doc });
        notify('Unlock this file with your password before downloading.');
        return;
      }
      triggerDownloadBytes(doc.data, doc.name, doc.mimeType);
      notify(`Downloading "${doc.name}".`);
    } catch {
      notify(`Unable to download "${doc.name}".`);
    }
  };

  const handleShareDoc = async (doc: VaultDocument) => {
    try {
      if (doc.isLocked) {
        setModalState({ mode: 'unlock', doc });
        notify('Unlock this file before sharing.');
        return;
      }
      const blob = new Blob([new Uint8Array(doc.data)], { type: doc.mimeType });
      const file = new File([blob], doc.name, { type: doc.mimeType });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ title: doc.name, files: [file] });
          return;
        } catch {
          // User canceled or share unsupported -> download fallback
        }
      }
      triggerDownloadBytes(doc.data, doc.name, doc.mimeType);
      notify(`Web Share unavailable in this context; downloaded "${doc.name}" for sharing.`);
    } catch {
      notify(`Unable to share "${doc.name}".`);
    }
  };

  const handlePrintDoc = (doc: VaultDocument) => {
    try {
      if (doc.isLocked) {
        setModalState({ mode: 'unlock', doc });
        notify('Unlock this file before printing.');
        return;
      }
      const blob = new Blob([new Uint8Array(doc.data)], { type: doc.mimeType });
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
        setTimeout(() => {
          URL.revokeObjectURL(url);
          iframe.remove();
        }, 60_000);
      };
      notify(`Prepared "${doc.name}" for printing.`);
    } catch {
      notify(`Unable to prepare "${doc.name}" for printing.`);
    }
  };

  const handleDeleteDoc = async (doc: VaultDocument) => {
    try {
      await deleteDocument(doc.id);
      await refreshVault();
      notify(`Deleted "${doc.name}" from File Vault.`);
    } catch {
      notify(`Failed to delete "${doc.name}".`);
    }
  };

  const handleBulkDeleteDocs = async (ids: string[]) => {
    try {
      const deletedCount = await deleteDocumentsBulk(ids);
      await refreshVault();
      if (deletedCount > 0) {
        notify(
          `Deleted ${deletedCount} selected ${deletedCount === 1 ? 'file' : 'files'} from File Vault.`
        );
      }
    } catch {
      notify('Failed to delete selected documents from File Vault.');
    }
  };

  const handleLockConfirm = async (doc: VaultDocument, password: string) => {
    await lockVaultDocument(doc, password);
    await refreshVault();
    notify(`Locked "${doc.name}" with AES-256 encryption.`);
  };

  const handleUnlockConfirm = async (doc: VaultDocument, password: string) => {
    await unlockVaultDocument(doc, password);
    await refreshVault();
    notify(`Unlocked "${doc.name}".`);
  };

  const handleUpdateTags = async (doc: VaultDocument, nextTags: string[]) => {
    try {
      await updateDocumentTags(doc, nextTags);
      await refreshVault();
    } catch {
      notify('Unable to update document tags.');
    }
  };

  const renderToolSubPage = (tool: ToolId) => {
    const goBack = () => {
      setActiveTool(null);
      setActiveTab(toolReturnTab);
    };
    switch (tool) {
      case 'camera-scan':
        return (
          <CameraScanTool
            scanQuality={settings.scanQuality}
            backLabel={t.common.back}
            onBack={goBack}
            onSaveToVault={handleSaveToVault}
            onNotify={notify}
          />
        );
      case 'photo-to-pdf':
        return (
          <PhotoToPdfTool
            scanQuality={settings.scanQuality}
            backLabel={t.common.back}
            onBack={goBack}
            onSaveToVault={handleSaveToVault}
            onNotify={notify}
          />
        );
      case 'merge-split':
        return (
          <MergeSplitTool
            vaultDocs={docs}
            onBack={goBack}
            onSaveToVault={handleSaveToVault}
            onNotify={notify}
          />
        );
      case 'compress':
        return (
          <CompressTool
            vaultDocs={docs}
            onBack={goBack}
            onSaveToVault={handleSaveToVault}
            onNotify={notify}
          />
        );
      case 'esign-lock':
        return (
          <ESignLockTool
            vaultDocs={docs}
            onBack={goBack}
            onSaveToVault={handleSaveToVault}
            onNotify={notify}
          />
        );
      case 'ocr':
        return (
          <OcrExtractorTool
            onBack={goBack}
            onSaveToVault={handleSaveToVault}
            onNotify={notify}
          />
        );
      case 'pdf-to-jpg':
        return (
          <PdfToJpgTool
            vaultDocs={docs}
            onBack={goBack}
            onNotify={notify}
          />
        );
      case 'watermark':
        return (
          <WatermarkTool
            vaultDocs={docs}
            onBack={goBack}
            onSaveToVault={handleSaveToVault}
            onNotify={notify}
          />
        );
    }
  };

  const showPinScreen =
    settings.appLockEnabled && Boolean(settings.appPinHash) && !isPinUnlocked;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <AppHeader />

      {showPinScreen && settings.appPinHash && (
        <PinLockScreen
          expectedPinHash={settings.appPinHash}
          t={t}
          onUnlock={() => setIsPinUnlocked(true)}
        />
      )}

      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[72px] left-4 right-4 sm:left-auto sm:right-4 z-50 sm:max-w-sm px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs sm:text-sm font-medium shadow-lg"
        >
          {toastMsg}
        </div>
      )}

      <main className="flex-1 w-full max-w-5xl mx-auto px-3.5 sm:px-6 pt-3.5 sm:pt-5 pb-20">
        <AppErrorBoundary
          onReset={() => {
            setActiveTool(null);
            setActiveTab('home');
          }}
        >
          {loadingVault ? (
            <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
              {t.common.loadingVault}
            </div>
          ) : activeTab === 'tools' && activeTool ? (
            renderToolSubPage(activeTool)
          ) : activeTab === 'home' ? (
            <HomeView
              recentDocs={docs}
              t={t}
              onOpenTool={(tool) => handleOpenTool(tool, 'home')}
              onOpenVault={() => handleSelectTab('vault')}
              onPreviewDoc={(doc) => setModalState({ mode: 'preview', doc })}
              onDownloadDoc={handleDownloadDoc}
            />
          ) : activeTab === 'tools' ? (
            <ToolsHubView
              t={t}
              onSelectTool={(tool) => handleOpenTool(tool, 'tools')}
            />
          ) : activeTab === 'vault' ? (
            <VaultView
              docs={docs}
              t={t}
              onPreview={(doc) => setModalState({ mode: 'preview', doc })}
              onShare={handleShareDoc}
              onPrint={handlePrintDoc}
              onRequestLockToggle={(doc) =>
                setModalState({ mode: doc.isLocked ? 'unlock' : 'lock', doc })
              }
              onUpdateTags={handleUpdateTags}
              onExportZip={handleExportZip}
              onExportSelectedZip={handleExportSelectedZip}
              onDownload={handleDownloadDoc}
              onDelete={handleDeleteDoc}
              onBulkDelete={handleBulkDeleteDocs}
            />
          ) : (
            <SettingsView
              settings={settings}
              docCount={docs.length}
              t={t}
              onUpdateSettings={handleUpdateSettings}
              onExportZip={handleExportZip}
              onBackupRestored={refreshVault}
              onLockNow={() => setIsPinUnlocked(false)}
              onNotify={notify}
            />
          )}
        </AppErrorBoundary>
      </main>

      <BottomNavAndAd activeTab={activeTab} t={t} onSelectTab={handleSelectTab} />

      {modalState && (
        <DocumentModal
          mode={modalState.mode}
          doc={modalState.doc}
          onClose={() => setModalState(null)}
          onConfirmLock={handleLockConfirm}
          onConfirmUnlock={handleUnlockConfirm}
          onDownload={handleDownloadDoc}
          onPrint={handlePrintDoc}
        />
      )}
    </div>
  );
}
