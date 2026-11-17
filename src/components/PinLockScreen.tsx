import React, { useCallback, useEffect, useState } from 'react';
import { Delete, Lock, ShieldCheck } from 'lucide-react';
import { verifyFourDigitPin } from '../utils/appSecurity';
import type { Translations } from '../utils/i18n';

interface PinLockScreenProps {
  expectedPinHash: string;
  t: Translations;
  onUnlock: () => void;
}

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  expectedPinHash,
  t,
  onUnlock,
}) => {
  const [digits, setDigits] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const attemptVerify = useCallback(
    async (candidate: string) => {
      if (candidate.length !== 4 || checking) return;
      setChecking(true);
      try {
        const ok = await verifyFourDigitPin(candidate, expectedPinHash);
        if (ok) {
          setErrorMsg(null);
          setDigits('');
          onUnlock();
        } else {
          setErrorMsg(t.pinScreen.wrongPin);
          setDigits('');
        }
      } catch {
        setErrorMsg(t.pinScreen.wrongPin);
        setDigits('');
      } finally {
        setChecking(false);
      }
    },
    [checking, expectedPinHash, onUnlock, t.pinScreen.wrongPin]
  );

  const appendDigit = useCallback(
    (d: string) => {
      if (checking) return;
      setErrorMsg(null);
      setDigits((prev) => {
        if (prev.length >= 4) return prev;
        const next = prev + d;
        if (next.length === 4) {
          void attemptVerify(next);
        }
        return next;
      });
    },
    [attemptVerify, checking]
  );

  const handleBackspace = useCallback(() => {
    if (checking) return;
    setErrorMsg(null);
    setDigits((prev) => prev.slice(0, -1));
  }, [checking]);

  const handleClear = useCallback(() => {
    if (checking) return;
    setErrorMsg(null);
    setDigits('');
  }, [checking]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        appendDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [appendDigit, handleBackspace, handleClear]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.pinScreen.title}
      className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center px-5 py-6"
    >
      <div className="w-full max-w-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm text-center space-y-5">
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t.pinScreen.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.pinScreen.subtitle}
          </p>
        </div>

        {/* 4 PIN Dots */}
        <div className="flex items-center justify-center gap-3.5 py-1" aria-live="polite">
          {[0, 1, 2, 3].map((idx) => {
            const filled = idx < digits.length;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  filled
                    ? 'bg-blue-600 border-blue-600 scale-110'
                    : errorMsg
                      ? 'border-red-400 dark:border-red-500 bg-transparent'
                      : 'border-slate-300 dark:border-slate-600 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-xl px-3 py-2"
          >
            {errorMsg}
          </div>
        )}

        {/* Touch Numeric Keypad */}
        <div className="space-y-2.5">
          {KEYPAD_ROWS.map((row) => (
            <div key={row.join('-')} className="grid grid-cols-3 gap-2.5">
              {row.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => appendDigit(num)}
                  className="h-13 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-blue-50 dark:active:bg-blue-950/50 border border-slate-200 dark:border-slate-700 text-lg font-bold text-slate-900 dark:text-slate-100 transition-colors tabular-nums"
                >
                  {num}
                </button>
              ))}
            </div>
          ))}

          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={handleClear}
              aria-label={t.pinScreen.clear}
              className="h-13 rounded-2xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t.pinScreen.clear}
            </button>
            <button
              type="button"
              onClick={() => appendDigit('0')}
              className="h-13 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-blue-50 dark:active:bg-blue-950/50 border border-slate-200 dark:border-slate-700 text-lg font-bold text-slate-900 dark:text-slate-100 transition-colors tabular-nums"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              aria-label={t.pinScreen.backspace}
              className="h-13 rounded-2xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{t.pinScreen.offlineBadge}</span>
        </div>
      </div>
    </div>
  );
};
