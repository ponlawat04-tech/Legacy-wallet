import React from 'react';
import { Wifi, WifiOff, ShieldCheck, Globe, DollarSign, Wallet, Lock, ChevronDown, Key, Layers, Camera, QrCode, Snowflake } from 'lucide-react';
import { Currency, Language, WalletAccount } from '../types/wallet';
import { i18n } from '../utils/i18n';

interface HeaderBarProps {
  account: WalletAccount;
  airGapMode: boolean;
  onToggleAirGap: () => void;
  currency: Currency;
  onToggleCurrency: () => void;
  lang: Language;
  onToggleLang: () => void;
  onOpenVaultModal: () => void;
  onOpenWalletManager?: () => void;
  onOpenQrScanner?: () => void;
  onLockApp?: () => void;
  vaultFrozen?: boolean;
  onToggleFreeze?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  account,
  airGapMode,
  onToggleAirGap,
  currency,
  onToggleCurrency,
  lang,
  onToggleLang,
  onOpenVaultModal,
  onOpenWalletManager,
  onOpenQrScanner,
  onLockApp,
  vaultFrozen = false,
  onToggleFreeze,
}) => {
  const t = i18n[lang];
  const isKey = account.keySource === 'private_key';

  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 px-3.5 py-2.5 text-slate-100 flex items-center justify-between gap-2">
      {/* Brand & Account Name (Clickable to switch wallet) */}
      <button
        type="button"
        onClick={onOpenWalletManager || onOpenVaultModal}
        className="flex items-center gap-2 text-left group p-1 -ml-1 rounded-2xl hover:bg-slate-900/80 transition-all min-w-0"
        title={lang === 'th' ? 'คลิกเพื่อสลับหรือเพิ่มกระเป๋า' : 'Click to switch or add wallets'}
      >
        <div
          className="w-8.5 h-8.5 rounded-xl p-0.5 shadow-md flex items-center justify-center shrink-0"
          style={{
            background: account.color
              ? `linear-gradient(135deg, ${account.color}, #0f172a)`
              : isKey
              ? 'linear-gradient(135deg, #a855f7, #6b21a8)'
              : 'linear-gradient(135deg, #f59e0b, #d97706)',
            boxShadow: `0 4px 12px ${account.color ? `${account.color}33` : isKey ? '#a855f733' : '#f59e0b33'}`,
          }}
        >
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            {isKey ? (
              <Key className="w-3.5 h-3.5 text-purple-400" />
            ) : (
              <span className="font-extrabold text-amber-400 text-sm leading-none">₿</span>
            )}
          </div>
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-xs sm:text-sm tracking-tight text-slate-100 group-hover:text-amber-400 transition-colors truncate">
              {account.name}
            </span>
            {account.has25thWord && (
              <span
                className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[8.5px] font-mono font-bold border border-amber-500/30 shrink-0"
                title={lang === 'th' ? 'กระเป๋านี้มีคำที่ 25 (BIP-39 Passphrase)' : '25th Word Protected'}
              >
                +25th
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-amber-400 transition-colors shrink-0" />
            {account.isVaultSealed && (
              <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" title={t.vaultSealedBadge} />
            )}
          </div>
          <span className="text-[9.5px] font-mono text-slate-400 truncate max-w-[100px] sm:max-w-[140px]">
            {account.address.slice(0, 6)}...{account.address.slice(-4)}
          </span>
        </div>
      </button>

      {/* Control Buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {/* QR Private Key Scanner Button */}
        {onOpenQrScanner && (
          <button
            type="button"
            onClick={onOpenQrScanner}
            className="p-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition-all active:scale-95 shadow-sm"
            title={lang === 'th' ? 'สแกน QR Code Private Key' : 'Scan Private Key QR'}
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Freeze / Outbound Lock Indicator & Quick Toggle */}
        <button
          type="button"
          onClick={onToggleFreeze}
          className={`px-2 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all border shadow-sm active:scale-95 ${
            vaultFrozen
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 animate-pulse shadow-cyan-500/20'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
          }`}
          title={
            vaultFrozen
              ? (lang === 'th' ? 'กระเป๋าถูกแช่แข็งอยู่ (คลิกเพื่อปลดล็อคด้วย PIN)' : 'Vault is Frozen (Click to unfreeze with PIN)')
              : (lang === 'th' ? 'สถานะกระเป๋า: ปกติ (คลิกเพื่อแช่แข็งด้วย PIN)' : 'Vault Status: Active (Click to freeze with PIN)')
          }
        >
          <Snowflake className={`w-3 h-3 ${vaultFrozen ? 'text-cyan-300' : 'text-slate-400'}`} />
          <span>{vaultFrozen ? (lang === 'th' ? 'แช่แข็ง ❄️' : 'Frozen') : (lang === 'th' ? 'ปกติ' : 'Ready')}</span>
        </button>

        {/* Air Gap Network Toggle */}
        <button
          type="button"
          onClick={onToggleAirGap}
          className={`px-2 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all border shadow-sm active:scale-95 ${
            airGapMode
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
          }`}
          title={airGapMode ? t.offlineMode : t.onlineMode}
        >
          {airGapMode ? (
            <>
              <WifiOff className="w-3 h-3 text-amber-400" />
              <span>{lang === 'th' ? 'Air-Gap' : 'Air-Gap'}</span>
            </>
          ) : (
            <>
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span>{lang === 'th' ? 'Online' : 'Online'}</span>
            </>
          )}
        </button>

        {/* Currency Switcher */}
        <button
          type="button"
          onClick={onToggleCurrency}
          className="px-2 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-[10.5px] font-bold transition-all active:scale-95"
        >
          {currency === 'THB' ? '฿ THB' : '$ USD'}
        </button>

        {/* Language Switcher */}
        <button
          type="button"
          onClick={onToggleLang}
          className="px-2 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[10.5px] font-bold flex items-center gap-1 transition-all active:scale-95"
        >
          <Globe className="w-3 h-3 text-slate-400" />
          <span>{lang === 'th' ? 'TH' : 'EN'}</span>
        </button>

        {/* Lock App Quick Button */}
        {onLockApp && (
          <button
            type="button"
            onClick={onLockApp}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-800 text-slate-400 transition-all active:scale-95"
            title={t.lockAppNowBtn}
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
};

