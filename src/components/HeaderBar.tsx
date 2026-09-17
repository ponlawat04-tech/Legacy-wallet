import React, { useState } from 'react';
import {
  Wifi,
  WifiOff,
  ShieldCheck,
  Globe,
  DollarSign,
  Lock,
  ChevronDown,
  Key,
  Layers,
  Camera,
  Snowflake,
  Cpu,
  HardDrive,
  Plus,
  Database,
  Copy,
  Check,
  Coins,
  Sparkles
} from 'lucide-react';
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
  onAddNewWallet?: () => void;
  onOpenWalletManager?: () => void;
  onOpenQrScanner?: () => void;
  onOpenSpvModal?: () => void;
  onOpenAutoBackup?: () => void;
  onOpenRawBackup?: () => void;
  onOpenAddressTypeSwitch?: () => void;
  onOpenMultiWalletAudit?: () => void;
  onOpenNextGenHub?: () => void;
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
  onAddNewWallet,
  onOpenWalletManager,
  onOpenQrScanner,
  onOpenSpvModal,
  onOpenAutoBackup,
  onOpenRawBackup,
  onOpenAddressTypeSwitch,
  onOpenMultiWalletAudit,
  onOpenNextGenHub,
  onLockApp,
  vaultFrozen = false,
  onToggleFreeze,
}) => {
  const t = i18n[lang];
  const [copied, setCopied] = useState<boolean>(false);
  const isMaster = account.keySource === 'master_private_key';
  const isKey = account.keySource === 'private_key';

  const handleTriggerAddWallet = onAddNewWallet || onOpenVaultModal;

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (account?.address) {
      navigator.clipboard.writeText(account.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="w-full bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/90 text-slate-100 flex flex-col shrink-0 z-30 select-none shadow-md">
      {/* TIER 1: PRIMARY HEADER ROW (Wallet Identity + Primary Safeguard Controls) */}
      <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-2.5 min-w-0">
        {/* Left: Active Wallet Identity & Selector */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Wallet Avatar Button */}
          <button
            type="button"
            onClick={onOpenWalletManager || onOpenVaultModal}
            className="w-9 h-9 rounded-xl p-0.5 shadow-md flex items-center justify-center shrink-0 cursor-pointer hover:opacity-90 active:scale-95 transition-transform"
            style={{
              background: account.color
                ? `linear-gradient(135deg, ${account.color}, #0f172a)`
                : isMaster
                ? 'linear-gradient(135deg, #06b6d4, #0891b2)'
                : isKey
                ? 'linear-gradient(135deg, #a855f7, #6b21a8)'
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
              boxShadow: `0 4px 12px ${account.color ? `${account.color}33` : isMaster ? '#06b6d433' : isKey ? '#a855f733' : '#f59e0b33'}`,
            }}
            title={lang === 'th' ? 'คลิกเพื่อสลับกระเป๋าหรือเปิดเมนูจัดการ' : 'Click to switch wallets or open manager'}
          >
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              {isMaster ? (
                <Key className="w-4 h-4 text-cyan-400" />
              ) : isKey ? (
                <Key className="w-4 h-4 text-purple-400" />
              ) : (
                <span className="font-extrabold text-amber-400 text-sm leading-none">₿</span>
              )}
            </div>
          </button>

          {/* Account Details & Status Badges */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={onOpenWalletManager || onOpenVaultModal}
                className="font-bold text-xs sm:text-sm tracking-tight text-slate-100 hover:text-amber-400 transition-colors truncate text-left flex items-center gap-1 group cursor-pointer max-w-[110px] xs:max-w-[140px] sm:max-w-[190px]"
                title={lang === 'th' ? 'คลิกเพื่อสลับกระเป๋าหรือเปิดเมนูจัดการ' : 'Click to switch wallets or open manager'}
              >
                <span className="truncate">{account.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors shrink-0" />
              </button>

              {/* Address Type Badge */}
              {onOpenAddressTypeSwitch && (
                <button
                  type="button"
                  onClick={onOpenAddressTypeSwitch}
                  className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold uppercase tracking-wider shrink-0 border cursor-pointer hover:brightness-125 transition-all active:scale-95 ${
                    account.addressType === 'native_segwit'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : account.addressType === 'taproot'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : account.addressType === 'nested_segwit'
                      ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                      : 'bg-orange-500/15 text-orange-300 border-orange-500/30'
                  }`}
                  title={lang === 'th' ? 'สลับประเภท Address หรือสแกนหาเหรียญ' : 'Switch Address Type / Scan Coins'}
                >
                  {account.addressType === 'native_segwit'
                    ? 'SegWit'
                    : account.addressType === 'taproot'
                    ? 'Taproot'
                    : account.addressType === 'nested_segwit'
                    ? 'Nested'
                    : 'Legacy'}
                </button>
              )}

              {account.has25thWord && (
                <span
                  className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[8.5px] font-mono font-bold border border-amber-500/30 shrink-0 hidden xs:inline-block"
                  title={lang === 'th' ? 'กระเป๋านี้มีคำที่ 25 (BIP-39 Passphrase)' : '25th Word Protected'}
                >
                  +25th
                </span>
              )}

              {account.isVaultSealed && (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 hidden xs:inline-block" title={t.vaultSealedBadge} />
              )}
            </div>

            {/* Truncated Address with One-Tap Copy */}
            <div className="flex items-center gap-1.5 text-[9.5px] text-slate-400 font-mono">
              <button
                type="button"
                onClick={handleCopyAddress}
                className="hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer group"
                title={lang === 'th' ? 'คลิกเพื่อคัดลอกแอดเดรส' : 'Click to copy address'}
              >
                <span className="truncate max-w-[85px] xs:max-w-[110px] sm:max-w-[150px]">
                  {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </span>
                {copied ? (
                  <span className="text-[8.5px] text-emerald-400 font-sans font-bold flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5" />
                    <span className="hidden xs:inline">{lang === 'th' ? 'คัดลอกแล้ว' : 'Copied'}</span>
                  </span>
                ) : (
                  <Copy className="w-2.5 h-2.5 text-slate-500 group-hover:text-slate-300 shrink-0" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Essential Primary Controls (Strictly uncrowded, guaranteed touch targets) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Air Gap Network Toggle */}
          <button
            type="button"
            onClick={onToggleAirGap}
            className={`h-8 px-2.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all border shadow-sm active:scale-95 cursor-pointer ${
              airGapMode
                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/40'
            }`}
            title={airGapMode ? t.offlineMode : t.onlineMode}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${airGapMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            {airGapMode ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-sans font-bold text-[10px] sm:text-[11px]">Air-Gap</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-sans font-bold text-[10px] sm:text-[11px]">Online</span>
              </>
            )}
          </button>

          {/* Freeze / Outbound Lock Alert Button (Prominent when frozen) */}
          {vaultFrozen && (
            <button
              type="button"
              onClick={onToggleFreeze}
              className="h-8 px-2 rounded-xl text-[10.5px] font-bold flex items-center gap-1 transition-all border shadow-sm active:scale-95 bg-cyan-500/20 text-cyan-300 border-cyan-500/50 animate-pulse shadow-cyan-500/20 cursor-pointer"
              title={lang === 'th' ? 'กระเป๋าถูกแช่แข็งอยู่ (คลิกเพื่อปลดล็อคด้วย PIN)' : 'Vault is Frozen (Click to unfreeze with PIN)'}
            >
              <Snowflake className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden xs:inline text-[10px]">{lang === 'th' ? 'แช่แข็ง' : 'Frozen'}</span>
            </button>
          )}

          {/* Quick Lock App Button */}
          {onLockApp && (
            <button
              type="button"
              onClick={onLockApp}
              className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-800 text-slate-400 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm"
              title={t.lockAppNowBtn}
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* TIER 2: DEDICATED QUICK SHORTCUT TAB BAR (แท็บบาร์คีย์ลัดด้านบน) */}
      {/* Horizontally scrollable, generous tap targets, single-line non-overlapping labels */}
      <div className="w-full bg-slate-900/80 backdrop-blur-md border-t border-slate-800/80 px-2.5 sm:px-3 py-1.5 flex items-center overflow-x-auto scrollbar-none scroll-touch gap-1.5 select-none">
        {/* 0. Next-Gen OS Sovereign Matrix Shortcut */}
        {onOpenNextGenHub && (
          <button
            type="button"
            onClick={onOpenNextGenHub}
            className="h-7.5 px-2.5 rounded-lg bg-gradient-to-r from-amber-500/25 to-amber-400/10 hover:from-amber-500/35 hover:to-amber-400/20 border border-amber-500/40 text-amber-300 text-[11px] font-extrabold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer shadow-sm shadow-amber-500/10 whitespace-nowrap"
            title={lang === 'th' ? 'ศูนย์บูรณาการและควบคุม Sovereign Matrix Gen-4' : 'Next-Gen Sovereign Matrix Hub'}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>{lang === 'th' ? '⚡ Next-Gen OS' : '⚡ Next-Gen OS'}</span>
            <span className="px-1 py-0.2 rounded bg-amber-500/25 text-[8.5px] font-mono text-amber-200">v4.0</span>
          </button>
        )}

        {/* 1. Add Wallet Shortcut */}
        <button
          type="button"
          onClick={handleTriggerAddWallet}
          className="h-7.5 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
          title={lang === 'th' ? 'เพิ่มกระเป๋าใหม่ (Seed Phrase / Private Key)' : 'Add New Wallet'}
        >
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          <span>{lang === 'th' ? 'เพิ่มกระเป๋า' : 'Add Wallet'}</span>
        </button>

        {/* 2. QR Scanner Shortcut */}
        {onOpenQrScanner && (
          <button
            type="button"
            onClick={onOpenQrScanner}
            className="h-7.5 px-2.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/50 text-purple-300 text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
            title={lang === 'th' ? 'สแกน QR Code Private Key หรือ Seed' : 'Scan Key QR'}
          >
            <Camera className="w-3.5 h-3.5 text-purple-400" />
            <span>{lang === 'th' ? 'สแกน QR' : 'Scan QR'}</span>
          </button>
        )}

        {/* 3. Decentralized SPV Node Shortcut */}
        {onOpenSpvModal && (
          <button
            type="button"
            onClick={onOpenSpvModal}
            className="h-7.5 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
            title={lang === 'th' ? 'โหนด SPV ไร้ตัวกลาง (bitcoinj Engine & Merkle Proof)' : 'Decentralized SPV Node'}
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>{lang === 'th' ? 'โหนด SPV' : 'SPV Node'}</span>
          </button>
        )}

        {/* 4. Switch Address Type Shortcut */}
        {onOpenAddressTypeSwitch && (
          <button
            type="button"
            onClick={onOpenAddressTypeSwitch}
            className="h-7.5 px-2.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-500/50 text-sky-300 text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
            title={lang === 'th' ? 'สลับประเภท Address (SegWit, Taproot, Nested, Legacy)' : 'Switch Address Type'}
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>{lang === 'th' ? 'ประเภท Address' : 'Address Type'}</span>
          </button>
        )}

        {/* 5. Freeze / Unfreeze Outbound Shortcut */}
        {onToggleFreeze && (
          <button
            type="button"
            onClick={onToggleFreeze}
            className={`h-7.5 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap border ${
              vaultFrozen
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700/70 hover:text-cyan-300'
            }`}
            title={
              vaultFrozen
                ? (lang === 'th' ? 'กระเป๋าถูกแช่แข็งอยู่ (คลิกเพื่อปลดล็อคด้วย PIN)' : 'Vault Frozen (Click to unfreeze)')
                : (lang === 'th' ? 'แช่แข็งระงับการโอนออกทันทีด้วย PIN' : 'Freeze Vault Outbound Transfers')
            }
          >
            <Snowflake className={`w-3.5 h-3.5 ${vaultFrozen ? 'text-cyan-300' : 'text-slate-400'}`} />
            <span>{vaultFrozen ? (lang === 'th' ? 'ปลดแช่แข็ง' : 'Unfreeze') : (lang === 'th' ? 'แช่แข็งกระเป๋า' : 'Freeze Vault')}</span>
          </button>
        )}

        {/* 6. Multi-Wallet Audit Shortcut */}
        {onOpenMultiWalletAudit && (
          <button
            type="button"
            onClick={onOpenMultiWalletAudit}
            className="h-7.5 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
            title={lang === 'th' ? 'ตรวจสอบยอดทุกกระเป๋าพร้อมกัน & Hard Forks' : 'Audit All Wallets'}
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'th' ? 'ตรวจทุกกระเป๋า' : 'Audit All'}</span>
          </button>
        )}

        {/* 7. Auto Backup Shortcut */}
        {onOpenAutoBackup && (
          <button
            type="button"
            onClick={onOpenAutoBackup}
            className="h-7.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
            title={lang === 'th' ? 'สำรองข้อมูลกระเป๋าอัตโนมัติ (Encrypted JSON)' : 'Auto Backup'}
          >
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>{lang === 'th' ? 'สำรองข้อมูล' : 'Auto Backup'}</span>
          </button>
        )}

        {/* 8. Raw Backup Migrator Shortcut */}
        {onOpenRawBackup && (
          <button
            type="button"
            onClick={onOpenRawBackup}
            className="h-7.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
            title={lang === 'th' ? 'กู้คืนจาก Backup ดิบ (dumpwallet, Electrum, Descriptors)' : 'Raw Backup Migrator'}
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'th' ? 'กู้คืนดิบ' : 'Raw Migrator'}</span>
          </button>
        )}

        {/* 9. Currency Switcher Shortcut */}
        <button
          type="button"
          onClick={onToggleCurrency}
          className="h-7.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 text-slate-300 hover:text-amber-300 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
          title={lang === 'th' ? 'สลับการแสดงผลสกุลเงิน (THB / USD)' : 'Toggle Currency (THB / USD)'}
        >
          <DollarSign className="w-3.5 h-3.5 text-amber-400" />
          <span>{currency === 'THB' ? 'THB (฿)' : 'USD ($)'}</span>
        </button>

        {/* 10. Language Switcher Shortcut */}
        <button
          type="button"
          onClick={onToggleLang}
          className="h-7.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 text-slate-300 hover:text-slate-100 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
          title={lang === 'th' ? 'สลับภาษา (TH / EN)' : 'Toggle Language (TH / EN)'}
        >
          <Globe className="w-3.5 h-3.5 text-sky-400" />
          <span>{lang === 'th' ? 'ภาษาไทย' : 'English'}</span>
        </button>
      </div>
    </header>
  );
};


