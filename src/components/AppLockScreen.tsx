import React from 'react';
import { ShieldCheck, Lock, WifiOff, ShieldAlert } from 'lucide-react';
import { Language } from '../types/wallet';
import { i18n } from '../utils/i18n';
import { PINKeypadModal } from './PINKeypadModal';

interface AppLockScreenProps {
  isLocked: boolean;
  onUnlockSuccess: (pin: string, isDuress: boolean) => void;
  lang: Language;
  storedPinHash: string | null;
  duressPinHash: string | null;
  antiScramble: boolean;
  biometricsEnabled?: boolean;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
  isLocked,
  onUnlockSuccess,
  lang,
  storedPinHash,
  duressPinHash,
  antiScramble,
  biometricsEnabled = true,
}) => {
  if (!isLocked) return null;

  const t = i18n[lang];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Lock Screen Card */}
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-4 mb-4">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-xl shadow-amber-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center text-amber-400">
            <Lock className="w-8 h-8" />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-50 tracking-tight">
            {t.appLockedTitle}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-[260px] mx-auto">
            {t.appLockedSubtitle}
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-amber-300 font-semibold">
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span>{t.offlineMode}</span>
        </div>
      </div>

      {/* Embedded PIN Keypad directly for frictionless unlock */}
      <PINKeypadModal
        isOpen={isLocked}
        onClose={() => {}} // Cannot dismiss lock screen without valid PIN
        onSuccess={onUnlockSuccess}
        lang={lang}
        storedPinHash={storedPinHash}
        duressPinHash={duressPinHash}
        antiScramble={antiScramble}
        biometricsEnabled={biometricsEnabled}
        titleOverride={t.enterPinTitle}
      />
    </div>
  );
};
