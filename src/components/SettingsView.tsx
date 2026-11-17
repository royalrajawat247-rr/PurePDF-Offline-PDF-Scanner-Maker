import React, { useState } from 'react';
import {
  Archive,
  Bell,
  Download,
  Globe,
  KeyRound,
  Lock,
  Mail,
  Moon,
  Share2,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sun,
  Upload,
} from 'lucide-react';
import type { AppLanguage, AppSettings, ScanQualityPreset } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { hashFourDigitPin, isValidFourDigitPin } from '../utils/appSecurity';
import type { Translations } from '../utils/i18n';
import {
  getNotificationPermission,
  requestLocalNotificationPermission,
  sendLocalNotification,
} from '../utils/localNotifications';
import {
  exportVaultBackupJson,
  importVaultBackupJson,
  triggerDownloadBytes,
} from '../utils/vaultStorage';

interface SettingsViewProps {
  settings: AppSettings;
  docCount: number;
  t: Translations;
  onUpdateSettings: (next: AppSettings) => void;
  onExportZip: () => Promise<void>;
  onBackupRestored: () => Promise<void>;
  onLockNow: () => void;
  onNotify: (msg: string, pushTitle?: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  docCount,
  t,
  onUpdateSettings,
  onExportZip,
  onBackupRestored,
  onLockNow,
  onNotify,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [busyExport, setBusyExport] = useState(false);
  const [busyZip, setBusyZip] = useState(false);
  const [notifPerm, setNotifPerm] = useState(() => getNotificationPermission());

  // 4-Digit App PIN Lock inline setup state
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinDraft, setPinDraft] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [savingPin, setSavingPin] = useState(false);

  const handleExportJson = async () => {
    setBusyExport(true);
    setRestoreError(null);
    try {
      const json = await exportVaultBackupJson(settings);
      const bytes = new TextEncoder().encode(json);
      const filename = `PurePDF-Backup-${new Date().toISOString().slice(0, 10)}.json`;
      triggerDownloadBytes(bytes, filename, 'application/json');
      onNotify(
        `Exported ${docCount} vault files and settings to "${filename}".`,
        'Backup Complete'
      );
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Failed to export JSON backup.');
    } finally {
      setBusyExport(false);
    }
  };

  const handleExportZip = async () => {
    setBusyZip(true);
    setRestoreError(null);
    try {
      await onExportZip();
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Failed to export ZIP archive.');
    } finally {
      setBusyZip(false);
    }
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreError(null);
    try {
      const text = await file.text();
      const res = await importVaultBackupJson(text);
      if (res.settings) {
        onUpdateSettings(res.settings);
      }
      await onBackupRestored();
      onNotify(
        `Restored ${res.importedCount} document(s) from offline backup.`,
        'Vault Restored'
      );
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Failed to restore backup file.');
    } finally {
      e.target.value = '';
    }
  };

  const handleToggleNotifications = async () => {
    const nextEnabled = !settings.notificationsEnabled;
    onUpdateSettings({ ...settings, notificationsEnabled: nextEnabled });
    if (nextEnabled) {
      const perm = await requestLocalNotificationPermission();
      setNotifPerm(perm);
      if (perm === 'granted') {
        await sendLocalNotification(
          'Local Alerts Enabled',
          'You will receive on-device notifications when PDFs are saved, compressed, or backed up.',
          true
        );
        onNotify('On-device local notifications enabled (zero server or login required).');
      } else if (perm === 'denied') {
        onNotify('Browser notifications are blocked in site settings; in-app alerts remain active.');
      } else {
        onNotify('Local alert preference enabled.');
      }
    } else {
      onNotify('Local browser notifications muted; in-app status alerts remain active.');
    }
  };

  const handleTogglePinLock = () => {
    setPinError(null);
    if (settings.appLockEnabled) {
      onUpdateSettings({
        ...settings,
        appLockEnabled: false,
      });
      setShowPinSetup(false);
      onNotify('4-digit App Security Lock disabled.');
      return;
    }

    if (settings.appPinHash) {
      onUpdateSettings({
        ...settings,
        appLockEnabled: true,
      });
      onNotify('4-digit App Security Lock enabled.');
      return;
    }

    setPinDraft('');
    setPinConfirm('');
    setShowPinSetup(true);
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    if (!isValidFourDigitPin(pinDraft)) {
      setPinError(t.settings.pinFormatError);
      return;
    }
    if (pinDraft !== pinConfirm) {
      setPinError(t.settings.pinMismatchError);
      return;
    }
    setSavingPin(true);
    try {
      const hash = await hashFourDigitPin(pinDraft);
      onUpdateSettings({
        ...settings,
        appLockEnabled: true,
        appPinHash: hash,
      });
      setShowPinSetup(false);
      setPinDraft('');
      setPinConfirm('');
      onNotify('4-digit App Security PIN saved & enabled on this device.');
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'Unable to save PIN.');
    } finally {
      setSavingPin(false);
    }
  };

  const handleShareApp = async () => {
    const shareTitle = 'PurePDF — 100% Offline PDF Scanner & Studio';
    const shareText =
      'Scan documents, convert photos to PDF, merge, compress, e-sign, and lock files 100% offline with zero login or server uploads.';
    const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User canceled or Web Share unsupported in context -> clipboard fallback
      }
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareTitle}\n${shareText}\n${shareUrl}`);
        onNotify('App link copied! Paste in WhatsApp or Messages to share PurePDF.');
        return;
      }
    } catch {
      // Ignore clipboard permission errors
    }

    onNotify('Share PurePDF directly using your browser menu or copy the app address.');
  };

  const qualityOptions: Array<{
    id: ScanQualityPreset;
    title: string;
    sub: string;
  }> = [
    { id: 'high-hd', title: t.settings.qualityHighHd, sub: t.settings.qualityHighHdSub },
    { id: 'balanced', title: t.settings.qualityBalanced, sub: t.settings.qualityBalancedSub },
    { id: 'compact', title: t.settings.qualityCompact, sub: t.settings.qualityCompactSub },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t.settings.title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {t.settings.subtitle}
        </p>
      </div>

      {/* Preferences: Dark Mode, Alerts, Language Switcher & Default Scan Quality */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800">
        {/* Dark Mode */}
        <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              {settings.darkMode ? (
                <Moon className="w-5 h-5 text-blue-400" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500" />
              )}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.settings.darkMode}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {settings.darkMode ? t.settings.darkModeActive : t.settings.lightModeActive}
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={settings.darkMode}
            aria-label="Toggle Dark Mode"
            onClick={() =>
              onUpdateSettings({ ...settings, darkMode: !settings.darkMode })
            }
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ${
              settings.darkMode ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                settings.darkMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Local Alerts */}
        <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.settings.localAlerts}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {notifPerm === 'granted' && settings.notificationsEnabled
                  ? t.settings.localAlertsGranted
                  : notifPerm === 'denied'
                    ? t.settings.localAlertsDenied
                    : t.settings.localAlertsDesc}
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={settings.notificationsEnabled}
            aria-label="Toggle Local Notifications"
            onClick={handleToggleNotifications}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ${
              settings.notificationsEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Default Scan Quality Selector */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.settings.scanQualityTitle}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {t.settings.scanQualityDesc}
              </div>
            </div>
          </div>

          <div
            role="group"
            aria-label={t.settings.scanQualityTitle}
            className="grid grid-cols-3 gap-2"
          >
            {qualityOptions.map((opt) => {
              const selected = settings.scanQuality === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    onUpdateSettings({ ...settings, scanQuality: opt.id });
                    onNotify(`Default Scan Quality set to ${opt.title}.`);
                  }}
                  className={`min-h-[52px] px-2.5 py-2 rounded-xl border text-center transition-colors ${
                    selected
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-bold leading-tight">{opt.title}</div>
                  <div className="text-[10.5px] opacity-80 mt-0.5 leading-tight">{opt.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language Switcher (English / हिंदी) */}
        <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.settings.languageTitle}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {t.settings.languageDesc}
              </div>
            </div>
          </div>

          <div
            role="group"
            aria-label={t.settings.languageTitle}
            className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0"
          >
            {(
              [
                ['en', 'English'],
                ['hi', 'हिंदी'],
              ] as Array<[AppLanguage, string]>
            ).map(([langCode, label]) => {
              const active = settings.language === langCode;
              return (
                <button
                  key={langCode}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    onUpdateSettings({ ...settings, language: langCode });
                    onNotify(langCode === 'hi' ? 'ऐप भाषा हिंदी में बदली गई।' : 'Language set to English.');
                  }}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security: 4-Digit App PIN Lock */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.settings.pinLockTitle}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {settings.appLockEnabled
                  ? t.settings.pinLockActiveDesc
                  : t.settings.pinLockInactiveDesc}
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={settings.appLockEnabled}
            aria-label="Toggle App Security Lock"
            onClick={handleTogglePinLock}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ${
              settings.appLockEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                settings.appLockEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {settings.appLockEnabled && !showPinSetup && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setPinDraft('');
                setPinConfirm('');
                setPinError(null);
                setShowPinSetup(true);
              }}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t.settings.changePin}
            </button>
            <button
              type="button"
              onClick={onLockNow}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{t.settings.lockAppNow}</span>
            </button>
          </div>
        )}

        {showPinSetup && (
          <form
            onSubmit={handleSavePin}
            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
          >
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {t.settings.setPinPrompt}
            </p>
            {pinError && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                {pinError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                value={pinDraft}
                onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder={t.settings.enterPinPlaceholder}
                aria-label={t.settings.enterPinPlaceholder}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-center tracking-widest font-bold"
              />
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder={t.settings.confirmPinPlaceholder}
                aria-label={t.settings.confirmPinPlaceholder}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-center tracking-widest font-bold"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={savingPin}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold"
              >
                {t.settings.saveEnablePin}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPinSetup(false);
                  setPinError(null);
                }}
                className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                {t.common.cancel}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Vault Archive (ZIP) & Backup/Restore */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {t.settings.dataPortabilityTitle}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.settings.dataPortabilityDesc}
          </p>
        </div>

        {restoreError && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
            {restoreError}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={busyZip || docCount === 0}
            onClick={handleExportZip}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            <Archive className="w-4 h-4" />
            <span>{busyZip ? t.settings.packingZip : t.settings.exportZipBtn}</span>
          </button>

          <button
            type="button"
            disabled={busyExport}
            onClick={handleExportJson}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 text-sm font-semibold inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{busyExport ? t.settings.exportingJson : t.settings.exportJsonBtn}</span>
          </button>

          <label className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-semibold inline-flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>{t.settings.restoreJsonBtn}</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleImportJson}
              className="sr-only"
            />
          </label>
        </div>
      </section>

      {/* Share PurePDF App & Install */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800">
        <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.settings.shareAppBtn}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.settings.shareAppDesc}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleShareApp}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 shrink-0"
          >
            <Share2 className="w-4 h-4" />
            <span>{t.settings.shareAppBtn}</span>
          </button>
        </div>

        <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t.settings.installPwaTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isInstalled
                  ? t.settings.installPwaInstalled
                  : isIOS
                    ? t.settings.installPwaIos
                    : t.settings.installPwaDefault}
              </p>
            </div>
          </div>

          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={install}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs sm:text-sm font-semibold shrink-0"
            >
              {t.settings.installNowBtn}
            </button>
          )}
        </div>
      </section>

      {/* Complete 100% Local On-Device Privacy Policy & Support */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t.settings.privacyTitle}
            </h3>
          </div>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {t.settings.privacyBadge}
          </span>
        </div>

        <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
          <p>
            <strong>{t.settings.privacyZeroLoginTitle}</strong> {t.settings.privacyZeroLoginBody}
          </p>
          <p>
            <strong>{t.settings.privacyZeroUploadsTitle}</strong> {t.settings.privacyZeroUploadsBody}
          </p>
          <p>
            <strong>{t.settings.privacyOwnershipTitle}</strong> {t.settings.privacyOwnershipBody}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {t.settings.supportPrompt}
          </div>
          <a
            href="mailto:royalrajawat247@gmail.com?subject=PurePDF%20Support"
            className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 shrink-0 transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span>{t.settings.contactSupportBtn}</span>
          </a>
        </div>
      </section>
    </div>
  );
};
