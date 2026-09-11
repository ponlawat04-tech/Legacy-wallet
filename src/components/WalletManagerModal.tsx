import React from 'react';
import {
  Wallet,
  ShieldCheck,
  Plus,
  Trash2,
  Check,
  Key,
  Layers,
  Sparkles,
  ExternalLink,
  Lock,
  ArrowRight
} from 'lucide-react';
import { Language, WalletAccount } from '../types/wallet';
import { i18n } from '../utils/i18n';

interface WalletManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: WalletAccount[];
  activeAccountId: string;
  onSelectAccount: (accountId: string) => void;
  onOpenAddWalletModal: () => void;
  onDeleteAccount: (accountId: string) => void;
  lang: Language;
}

export const WalletManagerModal: React.FC<WalletManagerModalProps> = ({
  isOpen,
  onClose,
  accounts,
  activeAccountId,
  onSelectAccount,
  onOpenAddWalletModal,
  onDeleteAccount,
  lang,
}) => {
  const t = i18n[lang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {lang === 'th' ? 'จัดการกระเป๋าแยกบัญชี' : 'Manage Multi-Wallets'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {lang === 'th'
                  ? `มี ${accounts.length} กระเป๋า (แยก Seed Phrase และ Private Key)`
                  : `${accounts.length} isolated vaults (Seed & Key)`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center text-xs font-bold transition-all"
          >
            ✕
          </button>
        </div>

        {/* Wallets List */}
        <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 mb-4">
          {accounts.map((acc) => {
            const isActive = acc.id === activeAccountId;
            const isMaster = acc.keySource === 'master_private_key';
            const isKey = acc.keySource === 'private_key';

            return (
              <div
                key={acc.id}
                onClick={() => {
                  onSelectAccount(acc.id);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                  isActive
                    ? 'bg-slate-850 border-amber-500/60 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/40'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: acc.color || (isMaster ? '#06b6d4' : isKey ? '#a855f7' : '#f59e0b') }}
                    />
                    <span className="font-bold text-xs text-slate-100">
                      {acc.name}
                    </span>
                    {isActive && (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold border border-amber-500/30">
                        {lang === 'th' ? 'กำลังใช้งาน' : 'Active'}
                      </span>
                    )}
                  </div>

                  {/* Type Badges */}
                  <div className="flex items-center gap-1">
                    {acc.has25thWord && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        title={lang === 'th' ? 'มีคำที่ 25 (BIP-39 Passphrase)' : '25th Word (Passphrase Active)'}
                      >
                        <ShieldCheck className="w-2.5 h-2.5" />
                        <span>{lang === 'th' ? 'คำที่ 25' : '+25th'}</span>
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 border ${
                        isMaster
                          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                          : isKey
                          ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {isMaster ? <Sparkles className="w-3 h-3 text-cyan-400" /> : isKey ? <Key className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                      <span>{isMaster ? 'Master Key' : isKey ? 'Private Key' : 'Seed Phrase'}</span>
                    </span>
                  </div>
                </div>

                {/* Address & Format */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-1">
                  <span className="truncate max-w-[200px] sm:max-w-[240px]">
                    {acc.address}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">
                    {acc.addressType.replace('_', ' ')}
                  </span>
                </div>

                {/* Balance & Actions */}
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-800/60">
                  <div className="text-xs">
                    <span className="font-bold text-slate-200">
                      {acc.balanceBtc.toFixed(8)} BTC
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1">
                      ({acc.balanceSats.toLocaleString()} sats)
                    </span>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {accounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteAccount(acc.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                        title={lang === 'th' ? 'ลบกระเป๋านี้' : 'Remove wallet'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isActive && (
                      <Check className="w-4 h-4 text-emerald-400 ml-1" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button: Add New Wallet */}
        <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAddWalletModal();
            }}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'th' ? '+ เพิ่มกระเป๋าใหม่ (Seed / Private Key)' : '+ Add New Wallet (Seed / Key)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
