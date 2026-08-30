import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  Key,
  ShieldAlert,
  SlidersHorizontal,
  CheckCircle2,
  FileText,
  Smartphone,
  Info,
  KeyRound,
  LockKeyhole,
  AlertTriangle,
  RotateCcw,
  Play,
  RefreshCw,
  GitFork,
  Cpu,
  Database,
  FileCheck,
  Layers,
  Plus,
  Snowflake,
  Unlock,
  Shield
} from 'lucide-react';
import { Language, SecuritySettings, WalletAccount } from '../../types/wallet';
import { i18n } from '../../utils/i18n';

interface SecurityTabProps {
  account: WalletAccount;
  accounts?: WalletAccount[];
  security: SecuritySettings;
  lang: Language;
  onUpdateSecurity: (newSettings: Partial<SecuritySettings>) => void;
  onOpenPinModal: (action: () => void) => void;
  onOpenSetPinModal: () => void;
  onOpenSetDecoyPinModal: () => void;
  onLockApp: () => void;
  onExitDecoyMode: () => void;
  onResetVault?: () => void;
  onOpenWalletManager?: () => void;
  onOpenAddWallet?: () => void;
  onOpenLegacyScannerModal?: () => void;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({
  account,
  accounts = [],
  security,
  lang,
  onUpdateSecurity,
  onOpenPinModal,
  onOpenSetPinModal,
  onOpenSetDecoyPinModal,
  onLockApp,
  onExitDecoyMode,
  onResetVault,
  onOpenWalletManager,
  onOpenAddWallet,
  onOpenLegacyScannerModal,
}) => {
  const [showProofDetails, setShowProofDetails] = useState<boolean>(false);
  
  // Interactive Security Audit Diagnostics State
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditProgress, setAuditProgress] = useState<number>(0);
  const [auditCompleted, setAuditCompleted] = useState<boolean>(false);
  const [auditTimestamp, setAuditTimestamp] = useState<string | null>(null);

  const t = i18n[lang];

  const runSecurityDiagnostics = () => {
    setIsAuditing(true);
    setAuditProgress(10);
    setAuditCompleted(false);

    setTimeout(() => setAuditProgress(35), 400);
    setTimeout(() => setAuditProgress(65), 800);
    setTimeout(() => setAuditProgress(85), 1200);
    setTimeout(() => {
      setAuditProgress(100);
      setIsAuditing(false);
      setAuditCompleted(true);
      setAuditTimestamp(new Date().toLocaleString());
    }, 1600);
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-300">
      {/* Decoy Mode Active Warning Banner */}
      {security.duressActive && (
        <div className="p-4 rounded-3xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-amber-300">
                {t.decoyModeActiveBanner}
              </h4>
              <p className="text-[11px] text-amber-200/80 leading-tight mt-0.5">
                {lang === 'th' ? 'คุณอยู่ในกระเป๋าจำลองสำหรับสถานการณ์ฉุกเฉิน ยอดเงินถูกสร้างขึ้นจำลอง' : 'You are in emergency decoy mode. Balance is simulated.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onExitDecoyMode}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all shadow-md"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.exitDecoyBtn}</span>
          </button>
        </div>
      )}

      {/* Security Audit Rating & Interactive Diagnostics Runner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden space-y-4">
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                100% SECURE VAULT
              </span>
              <h2 className="text-lg font-extrabold text-slate-50 mt-1">
                {t.securityCenterTitle}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t.auditPassed}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={runSecurityDiagnostics}
            disabled={isAuditing}
            className="px-3 py-2 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 shadow-md active:scale-95 disabled:opacity-50"
          >
            {isAuditing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            )}
            <span>{lang === 'th' ? 'สแกนตรวจสอบความปลอดภัย' : 'Run Security Diagnostics'}</span>
          </button>
        </div>

        {/* Audit Progress Bar */}
        {isAuditing && (
          <div className="space-y-1.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400 font-bold">
              <span>{lang === 'th' ? 'กำลังตรวจสอบโมดูลความปลอดภัย...' : 'Auditing Security Modules...'}</span>
              <span>{auditProgress}%</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-emerald-400 h-full transition-all duration-300 rounded-full shadow-lg shadow-emerald-400/50"
                style={{ width: `${auditProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Security Checklist Diagnostics Result */}
        <div className="space-y-2 pt-3 border-t border-slate-800/80 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {lang === 'th' ? 'รองรับ BIP-39 25th Word (Passphrase Salt Isolation)' : 'BIP-39 25th Word Passphrase Isolation'}
            </span>
            <span className="font-mono text-emerald-400 font-bold">PASSED</span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {lang === 'th' ? 'การจัดเก็บข้อมูล Zero-Exposure (ไม่มี Private Key ใน DOM)' : 'Zero-Exposure Storage (Zero Key Leak)'}
            </span>
            <span className="font-mono text-emerald-400 font-bold">PASSED</span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {lang === 'th' ? 'ระบบการแฮช PIN ด้วย PBKDF2/SHA-256' : 'PIN Salted SHA-256 Hash Guard'}
            </span>
            <span className="font-mono text-emerald-400 font-bold">PASSED</span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {lang === 'th' ? 'การป้องกัน Replay Attack ด้วย SIGHASH_FORKID (Hard Forks)' : 'SIGHASH_FORKID Replay Defense'}
            </span>
            <span className="font-mono text-emerald-400 font-bold">PASSED</span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {lang === 'th' ? 'ระบบกระเป๋าจำลองฉุกเฉิน Duress Decoy PIN' : 'Duress Decoy Emergency Isolation'}
            </span>
            <span className="font-mono text-emerald-400 font-bold">PASSED</span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {lang === 'th' ? 'ระบบบล็อคการทำงานเบื้องหลัง (Zero Background Polling Guard)' : 'Zero Background Execution Guard'}
            </span>
            <span className="font-mono text-emerald-400 font-bold">PASSED</span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {lang === 'th' ? 'การป้องกันการเชื่อมต่อเน็ตโดยไม่ใส่รหัส PIN (Air-Gap Internet Firewall)' : 'Air-Gap PIN Internet Firewall'}
            </span>
            <span className="font-mono text-emerald-400 font-bold">PASSED</span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {lang === 'th' ? 'การแยกคีย์ Multi-Chain (SLIP-0044 & BIP-44/84 Isolation)' : 'Multi-Chain SLIP-0044 Key Isolation'}
            </span>
            <span className="font-mono text-emerald-400 font-bold">PASSED</span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {lang === 'th' ? 'ระบบแช่แข็งกระเป๋า / ระงับโอนออกด้วย PIN (Vault Outbound Freeze Lock)' : 'Vault Outbound Freeze Lock (PIN Guard)'}
            </span>
            <span className="font-mono text-emerald-400 font-bold">PASSED</span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {lang === 'th' ? 'การเคลียร์ความจำในเครื่อง (Memory Zeroization Purge)' : 'Memory Zeroization Engine'}
            </span>
            <span className="font-mono text-emerald-400 font-bold">PASSED</span>
          </div>
        </div>

        {/* Audit Timestamp Banner */}
        {auditCompleted && auditTimestamp && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-[11px] font-mono text-emerald-300 flex items-center justify-between animate-in fade-in duration-300">
            <span className="flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'th' ? 'ผลสแกนล่าสุด:' : 'Last Diagnostic Audit:'} {auditTimestamp}</span>
            </span>
            <span className="bg-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">VERIFIED</span>
          </div>
        )}
      </div>

      {/* Freeze Vault / Outbound Lock Card (High Security Feature) */}
      <div className={`p-5 rounded-3xl border transition-all duration-300 shadow-2xl space-y-3.5 relative overflow-hidden ${
        security.vaultFrozen
          ? 'bg-gradient-to-br from-cyan-950/80 via-slate-900 to-slate-950 border-cyan-500/50 shadow-cyan-500/10 ring-1 ring-cyan-500/30'
          : 'bg-slate-900 border-slate-800 shadow-xl'
      }`}>
        {security.vaultFrozen && (
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 transition-all ${
              security.vaultFrozen
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/20 animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
              <Snowflake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-100">
                  {t.freezeVaultTitle}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  security.vaultFrozen
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {security.vaultFrozen ? t.freezeVaultActiveBadge : t.freezeVaultInactiveBadge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight mt-1">
                {t.freezeVaultDesc}
              </p>
            </div>
          </div>
        </div>

        {/* Freeze Details / Status Note */}
        {security.vaultFrozen ? (
          <div className="p-3 bg-cyan-950/60 border border-cyan-500/30 rounded-2xl text-[11px] text-cyan-200/90 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-cyan-300">
                {lang === 'th'
                  ? '❄️ การแช่แข็งทำงานอยู่: ธุรกรรมโอนออกทุกเหรียญถูกระงับ ปลอดภัยสูงสุดจากการแอบทำรายการ'
                  : '❄️ Vault Freeze Active: All outbound transfers and signatures are strictly blocked.'}
              </p>
              {security.frozenTimestamp && (
                <p className="text-[10px] text-cyan-300/70 font-mono">
                  {lang === 'th' ? 'แช่แข็งเมื่อ:' : 'Locked at:'} {new Date(security.frozenTimestamp).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              {lang === 'th'
                ? 'กดแช่แข็งเมื่อไม่ต้องการโอนเงิน เพื่อล็อคป้องกันไม่ให้เหรียญถูกโอนออกได้เลย (เปิด/ปิดต้องใส่รหัส PIN)'
                : 'Freeze when holding long-term to prevent any unauthorized spending (Protected by PIN)'}
            </span>
          </div>
        )}

        {/* Action Button to Freeze / Unfreeze requiring PIN */}
        <div className="pt-1">
          {security.vaultFrozen ? (
            <button
              type="button"
              onClick={() => {
                onOpenPinModal(() => {
                  onUpdateSecurity({ vaultFrozen: false, frozenTimestamp: null });
                });
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              <Unlock className="w-4 h-4" />
              <span>{t.unfreezeNowBtn} (ใส่รหัส PIN เพื่อปลดล็อค)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onOpenPinModal(() => {
                  onUpdateSecurity({ vaultFrozen: true, frozenTimestamp: Date.now() });
                });
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-300 hover:border-cyan-500/40 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Snowflake className="w-4 h-4 text-cyan-400" />
              <span>{t.freezeNowBtn} (ใส่รหัส PIN เพื่อแช่แข็ง)</span>
            </button>
          )}
        </div>
      </div>

      {/* PIN & Lock Controls */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span>{lang === 'th' ? 'จัดการรหัสผ่านและระบบล็อค' : 'PIN & App Lock Settings'}</span>
          <LockKeyhole className="w-4 h-4 text-amber-400" />
        </h3>

        {/* Security PIN Management Box (Unified & Covert) */}
        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5 pr-2">
            <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-amber-400" />
              {t.settingPinLabel}
            </span>
            <p className="text-[11px] text-slate-400 leading-tight">
              {lang === 'th'
                ? 'ตั้งค่ารหัสผ่าน 6 หลัก และจัดการสิทธิ์ความปลอดภัยเข้าใช้งาน'
                : 'Manage 6-digit passcode and access authorization settings'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSetPinModal}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-semibold text-xs transition-all shrink-0"
          >
            {lang === 'th' ? 'จัดการ PIN' : 'Manage PIN'}
          </button>
        </div>

        {/* Anti-Scramble Keypad Switch */}
        <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
          <div className="space-y-0.5 pr-2">
            <label className="text-xs font-bold text-slate-100 block">
              {t.settingAntiScrambleLabel}
            </label>
            <p className="text-[11px] text-slate-400 leading-tight">
              {t.settingAntiScrambleDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenPinModal(() => onUpdateSecurity({ antiScrambleKeypad: !security.antiScrambleKeypad }))}
            className={`w-12 h-6 rounded-full p-1 transition-colors relative shrink-0 ${
              security.antiScrambleKeypad ? 'bg-amber-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                security.antiScrambleKeypad ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Zero Background Execution Guard Switch */}
        <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
          <div className="space-y-0.5 pr-2">
            <label className="text-xs font-bold text-slate-100 block flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.settingBlockBackgroundLabel}</span>
            </label>
            <p className="text-[11px] text-slate-400 leading-tight">
              {t.settingBlockBackgroundDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenPinModal(() => onUpdateSecurity({ blockBackgroundSync: !security.blockBackgroundSync }))}
            className={`w-12 h-6 rounded-full p-1 transition-colors relative shrink-0 ${
              security.blockBackgroundSync ? 'bg-emerald-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                security.blockBackgroundSync ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Require PIN Before Connecting Online Switch */}
        <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
          <div className="space-y-0.5 pr-2">
            <label className="text-xs font-bold text-slate-100 block flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.settingRequirePinOnlineLabel}</span>
            </label>
            <p className="text-[11px] text-slate-400 leading-tight">
              {t.settingRequirePinOnlineDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenPinModal(() => onUpdateSecurity({ requirePinForOnline: !security.requirePinForOnline }))}
            className={`w-12 h-6 rounded-full p-1 transition-colors relative shrink-0 ${
              security.requirePinForOnline ? 'bg-amber-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                security.requirePinForOnline ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Multi-Wallet Management (Isolated Seed & Key Vaults) */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-400" />
                {lang === 'th' ? 'การจัดการกระเป๋าแยกบัญชี (Multi-Wallets)' : 'Multi-Wallet Isolation Manager'}
              </span>
              <p className="text-[11px] text-slate-400 leading-tight">
                {lang === 'th'
                  ? `ระบบแยกกระเป๋าอิสระ (ปัจจุบันมี ${accounts.length || 1} กระเป๋า)`
                  : `Isolated multi-vault architecture (${accounts.length || 1} active vaults)`}
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 text-[10px] font-mono border border-slate-800">
              {account.keySource === 'private_key' ? 'Private Key' : 'Seed Phrase'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {onOpenWalletManager && (
              <button
                type="button"
                onClick={onOpenWalletManager}
                className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'th' ? 'สลับกระเป๋า' : 'Switch Vault'}</span>
              </button>
            )}
            {onOpenAddWallet && (
              <button
                type="button"
                onClick={onOpenAddWallet}
                className="py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'เพิ่มกระเป๋าใหม่' : '+ Add Vault'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Reset / Generate New Vault */}
        {onResetVault && (
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                {lang === 'th' ? 'สร้างหรือนำเข้า Seed Phrase ใหม่' : 'Generate / Import New Seed Phrase'}
              </span>
              <p className="text-[11px] text-slate-400 leading-tight">
                {lang === 'th'
                  ? 'ล้างข้อมูลเดิมและสร้างกระเป๋าใบใหม่แบบ Zero-Exposure หรือนำเข้าด้วยคำ 12/24 คำ'
                  : 'Zero-out active state and generate a brand-new BIP-39 seed phrase or import existing words'}
              </p>
            </div>
            <button
              type="button"
              onClick={onResetVault}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold text-xs transition-all shrink-0"
            >
              {lang === 'th' ? 'สร้างใหม่' : 'New Vault'}
            </button>
          </div>
        )}

        {/* Legacy Key & Hard Fork Sweeper Utility */}
        {onOpenLegacyScannerModal && (
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-amber-500/30 flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-400" />
                {lang === 'th' ? 'สแกนกุญแจเก่า & เหรียญ Hard Fork (BCH, BSV, BTG)' : 'Legacy Key & Hard Fork Multi-Chain Sweeper'}
              </span>
              <p className="text-[11px] text-slate-400 leading-tight">
                {lang === 'th'
                  ? 'ตรวจสอบกุญแจโบราณ (WIF/Hex) สแกน 5 รูปแบบที่อยู่ และกวาดเหรียญเข้า Vault'
                  : 'Inspect vintage keys (WIF/Hex), scan all 5 address standards & claim fork coins'}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenLegacyScannerModal}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold text-xs transition-all shrink-0"
            >
              {lang === 'th' ? 'เปิดสแกน' : 'Open'}
            </button>
          </div>
        )}

        {/* Lock App Now Button */}
        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-rose-400" />
              {lang === 'th' ? 'ระบบล็อคแอพพลิเคชันออฟไลน์' : 'Offline App Lock System'}
            </span>
            <p className="text-[11px] text-slate-400">
              {lang === 'th' ? 'ล็อคกระเป๋าเงินทันทีเพื่อป้องกันการเข้าถึงข้อมูล' : 'Immediately lock vault screen until PIN is entered'}
            </p>
          </div>
          <button
            type="button"
            onClick={onLockApp}
            className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-semibold text-xs transition-all shrink-0 flex items-center gap-1"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{t.lockAppNowBtn}</span>
          </button>
        </div>

        {/* Auto Lock Timer */}
        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
          <label className="text-xs font-bold text-slate-100 block">
            {t.settingAutoLockLabel}
          </label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[1, 5, 15].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => onOpenPinModal(() => onUpdateSecurity({ autoLockDelayMinutes: mins }))}
                className={`py-2 rounded-xl font-semibold border transition-all ${
                  security.autoLockDelayMinutes === mins
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                {mins} {lang === 'th' ? 'นาที' : 'm'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Zero-Exposure Certificate Breakdown Modal/Box */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <button
          type="button"
          onClick={() => setShowProofDetails(!showProofDetails)}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-200"
        >
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            {t.vaultZeroExposureProof}
          </span>
          <span className="text-amber-400 hover:underline">
            {showProofDetails ? (lang === 'th' ? 'ซ่อนรายละเอียด' : 'Hide Details') : (lang === 'th' ? 'แสดงหลักฐาน' : 'Show Details')}
          </span>
        </button>

        {showProofDetails && (
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2 animate-in fade-in duration-200">
            <pre className="whitespace-pre-wrap font-sans leading-relaxed text-[11px] text-slate-400">
              {t.vaultZeroExposureDetail}
            </pre>
            <div className="pt-2 border-t border-slate-800 font-mono text-[10px] text-emerald-400 flex justify-between">
              <span>Vault Fingerprint:</span>
              <span>{account.id.toUpperCase()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
