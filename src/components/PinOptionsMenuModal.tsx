import React from 'react';
import { KeyRound, ShieldAlert, X, ChevronRight, ShieldCheck } from 'lucide-react';
import { Language } from '../types/wallet';
import { i18n } from '../utils/i18n';

interface PinOptionsMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChangeMainPin: () => void;
  onSelectConfigureDecoyPin: () => void;
  lang: Language;
}

export const PinOptionsMenuModal: React.FC<PinOptionsMenuModalProps> = ({
  isOpen,
  onClose,
  onSelectChangeMainPin,
  onSelectConfigureDecoyPin,
  lang,
}) => {
  if (!isOpen) return null;

  const t = i18n[lang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 flex flex-col items-center relative">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Icon */}
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
          <KeyRound className="w-7 h-7" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-extrabold text-slate-50 text-center">
          {t.pinOptionsTitle}
        </h3>
        <p className="text-xs text-slate-400 text-center mt-1 mb-5 px-2">
          {t.pinOptionsSubtitle}
        </p>

        {/* Options List */}
        <div className="w-full space-y-3">
          {/* Option 1: Change Main PIN */}
          <button
            type="button"
            onClick={onSelectChangeMainPin}
            className="w-full p-4 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between text-left group transition-all"
          >
            <div className="flex items-start gap-3 pr-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                  {t.changeMainPinOptionTitle}
                </h4>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  {t.changeMainPinOptionDesc}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 transition-colors shrink-0" />
          </button>

          {/* Option 2: Configure Emergency Duress PIN */}
          <button
            type="button"
            onClick={onSelectConfigureDecoyPin}
            className="w-full p-4 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between text-left group transition-all"
          >
            <div className="flex items-start gap-3 pr-2">
              <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                  {t.configureDuressPinOptionTitle}
                </h4>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                  {t.configureDuressPinOptionDesc}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 transition-colors shrink-0" />
          </button>
        </div>

        <div className="mt-5 text-[10px] text-slate-500 text-center flex items-center justify-center gap-1 font-mono">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Authenticated session via Main PIN</span>
        </div>
      </div>
    </div>
  );
};
