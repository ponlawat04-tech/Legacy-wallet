import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Key,
  ShieldCheck,
  Search,
  ExternalLink,
  ArrowRight,
  Sparkles,
  Lock,
  Copy,
  Check,
  Clipboard,
  X,
  HelpCircle,
  Eye,
  EyeOff,
  Coins,
  History,
  Plus
} from 'lucide-react';
import { AddressType, Language, WalletAccount, ZeroExposureVault } from '../types/wallet';
import {
  deriveAllBtcVariantsFromSecret,
  AllBtcAddressFormats,
  parseAndValidatePrivateKey
} from '../utils/bitcoinKeyEngine';
import {
  deriveBitcoinAddress,
  decryptZeroExposureVault,
  sealZeroExposureVault,
} from '../utils/cryptoVault';
import { fetchRealAddressData } from '../utils/blockchainApi';
import { readClipboardSafely } from '../utils/clipboard';

export interface AddressTypeOption {
  type: AddressType;
  label: string;
  subLabel: string;
  prefix: string;
  path: string;
  scriptType: string;
  address: string;
  publicKey: string;
  description: string;
  feeBadge: string;
  feeBadgeColor: string;
  balanceBtc: number;
  balanceSats: number;
  txCount: number;
  isScanning: boolean;
  hasFunds: boolean;
  hasHistory: boolean;
}

interface AddressTypeSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  currentAccount: WalletAccount;
  allAccounts: WalletAccount[];
  onSwitchAddressType: (
    targetAccountId: string,
    newAddressType: AddressType,
    newAddress: string,
    newPublicKey: string,
    newDerivationPath: string,
    scannedBalanceBtc: number,
    scannedBalanceSats: number
  ) => void;
  onAddParallelWallet: (
    newAccount: WalletAccount,
    vault?: ZeroExposureVault
  ) => void;
  onShowToast: (message: string, type?: 'success' | 'info') => void;
  userPin?: string;
  onOpenPinModal?: (callback: () => void) => void;
  isDeviceOnline?: boolean;
}

export const AddressTypeSwitchModal: React.FC<AddressTypeSwitchModalProps> = ({
  isOpen,
  onClose,
  lang,
  currentAccount,
  allAccounts,
  onSwitchAddressType,
  onAddParallelWallet,
  onShowToast,
  userPin = '123456',
  onOpenPinModal,
  isDeviceOnline = true,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(currentAccount.id);
  const [selectedTargetType, setSelectedTargetType] = useState<AddressType>(currentAccount.addressType);
  
  // Secret / Unlock State
  const [secretInput, setSecretInput] = useState<string>('');
  const [passphraseInput, setPassphraseInput] = useState<string>('');
  const [pinInput, setPinInput] = useState<string>('');
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [unlockMethod, setUnlockMethod] = useState<'pin' | 'manual'>('pin');
  
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [unlockedSecret, setUnlockedSecret] = useState<string | null>(null);
  
  // Blockchain scanning state
  const [isScanningAll, setIsScanningAll] = useState<boolean>(false);
  const [scanResults, setScanResults] = useState<Record<string, { balanceBtc: number; balanceSats: number; txCount: number }>>({});
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [isApplyingChange, setIsApplyingChange] = useState<boolean>(false);

  // Sync selected account when currentAccount changes
  useEffect(() => {
    if (isOpen) {
      setSelectedAccountId(currentAccount.id);
      setSelectedTargetType(currentAccount.addressType);
      setDecryptError(null);
      setSecretInput('');
      setPassphraseInput('');
      setPinInput('');
      setUnlockedSecret(null);

      // Check if there is an encrypted vault stored for this account
      const storedVault = localStorage.getItem(`COLDVAULT_ENCRYPTED_SIGNER_${currentAccount.id}`);
      if (!storedVault) {
        setUnlockMethod('manual');
      } else {
        setUnlockMethod('pin');
      }
    }
  }, [isOpen, currentAccount]);

  const targetAccount = useMemo(() => {
    return allAccounts.find(a => a.id === selectedAccountId) || currentAccount;
  }, [allAccounts, selectedAccountId, currentAccount]);

  // Derive addresses across all 4 types from unlockedSecret, secretInput, or existing account data
  const derivedFormats: AllBtcAddressFormats = useMemo(() => {
    const activeSecret = unlockedSecret || secretInput.trim();
    if (activeSecret) {
      return deriveAllBtcVariantsFromSecret(activeSecret, passphraseInput);
    }
    // Fallback: derive variants from existing public key or address
    return deriveAllBtcVariantsFromSecret(targetAccount.publicKey || targetAccount.address, '');
  }, [unlockedSecret, secretInput, passphraseInput, targetAccount]);

  // Construct 4 address type options
  const addressTypeOptions: AddressTypeOption[] = useMemo(() => {
    const types: Array<{
      type: AddressType;
      label: string;
      subLabel: string;
      prefix: string;
      path: string;
      scriptType: string;
      address: string;
      publicKey: string;
      description: string;
      feeBadge: string;
      feeBadgeColor: string;
    }> = [
      {
        type: 'native_segwit',
        label: 'Native SegWit (Bech32)',
        subLabel: 'bc1q...',
        prefix: 'bc1q',
        path: "m/84'/0'/0'/0/0",
        scriptType: 'P2WPKH (Witness v0)',
        address: derivedFormats.nativeSegwit,
        publicKey: derivedFormats.pubKeyCompressedHex,
        description:
          lang === 'th'
            ? 'มาตรฐานใหม่ ค่าธรรมเนียมถูกที่สุด ประหยัดกว่า ~38% เป็นค่าเริ่มต้นของกระเป๋าสมัยใหม่'
            : 'Modern standard with lowest transaction fees (~38% savings). Default for modern wallets.',
        feeBadge: lang === 'th' ? 'ค่าธรรมเนียมต่ำสุด' : 'Lowest Fee',
        feeBadgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      },
      {
        type: 'nested_segwit',
        label: 'Nested SegWit (P2SH)',
        subLabel: '3...',
        prefix: '3',
        path: "m/49'/0'/0'/0/0",
        scriptType: 'P2SH-P2WPKH',
        address: derivedFormats.nestedSegwit,
        publicKey: derivedFormats.pubKeyCompressedHex,
        description:
          lang === 'th'
            ? 'SegWit ในกล่อง P2SH ใช้รับเงินจากเว็บเทรดหรือแอปเก่าที่ยังไม่รองรับ bc1q (ประหยัด ~26%)'
            : 'Wrapped SegWit in P2SH. Best for receiving from legacy exchanges not supporting bc1q.',
        feeBadge: lang === 'th' ? 'ความเข้ากันได้สูง' : 'High Compatibility',
        feeBadgeColor: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
      },
      {
        type: 'legacy',
        label: 'Legacy (P2PKH)',
        subLabel: '1...',
        prefix: '1',
        path: "m/44'/0'/0'/0/0",
        scriptType: 'P2PKH',
        address: derivedFormats.legacyCompressed,
        publicKey: derivedFormats.pubKeyCompressedHex,
        description:
          lang === 'th'
            ? 'รูปแบบบิตคอยน์ดั้งเดิมตั้งแต่ปี 2009 หากกระเป๋าเก่าของคุณ (ก่อนปี 2017) ไม่แสดงยอด ให้เลือกรูปแบบนี้'
            : 'Original 2009 Bitcoin format. If your old wallet (pre-2017) shows 0 BTC, choose this format.',
        feeBadge: lang === 'th' ? 'รองรับระบบเก่า 100%' : '100% Legacy Support',
        feeBadgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      },
      {
        type: 'taproot',
        label: 'Taproot (Bech32m)',
        subLabel: 'bc1p...',
        prefix: 'bc1p',
        path: "m/86'/0'/0'/0/0",
        scriptType: 'P2TR (Schnorr / Witness v1)',
        address: derivedFormats.taproot,
        publicKey: derivedFormats.pubKeyCompressedHex,
        description:
          lang === 'th'
            ? 'อัปเกรด BIP-86 ล่าสุด ใช้ลายเซ็น Schnorr เพิ่มความเป็นส่วนตัวและรองรับ Smart Contract/Ordinals'
            : 'BIP-86 Taproot upgrade with Schnorr signatures, enhanced privacy, and Ordinals compatibility.',
        feeBadge: lang === 'th' ? 'ความเป็นส่วนตัวสูงสุด' : 'Max Privacy',
        feeBadgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      },
    ];

    return types.map(t => {
      const scan = scanResults[t.address];
      const balanceBtc = scan ? scan.balanceBtc : 0;
      const balanceSats = scan ? scan.balanceSats : 0;
      const txCount = scan ? scan.txCount : 0;
      const hasFunds = balanceSats > 0;
      const hasHistory = txCount > 0;

      return {
        ...t,
        balanceBtc,
        balanceSats,
        txCount,
        isScanning: isScanningAll,
        hasFunds,
        hasHistory,
      };
    });
  }, [derivedFormats, lang, scanResults, isScanningAll]);

  // Automatically scan on-chain balances when addresses are derived
  const handleScanAllOnChain = async () => {
    if (!isDeviceOnline) {
      onShowToast(
        lang === 'th' ? 'อุปกรณ์อยู่ในโหมดออฟไลน์ ไม่สามารถสแกนบล็อกเชนได้' : 'Device is offline. Cannot scan blockchain.',
        'info'
      );
      return;
    }

    setIsScanningAll(true);
    const newResults: Record<string, { balanceBtc: number; balanceSats: number; txCount: number }> = {};

    try {
      await Promise.all(
        addressTypeOptions.map(async opt => {
          if (!opt.address) return;
          try {
            const data = await fetchRealAddressData(opt.address);
            newResults[opt.address] = {
              balanceBtc: data.balanceBtc,
              balanceSats: data.balanceSats,
              txCount: data.txCount,
            };
          } catch {
            newResults[opt.address] = { balanceBtc: 0, balanceSats: 0, txCount: 0 };
          }
        })
      );

      setScanResults(newResults);

      // Check if any non-current address has funds
      const foundWithFunds = addressTypeOptions.find(
        o => (newResults[o.address]?.balanceSats || 0) > 0 && o.type !== targetAccount.addressType
      );

      if (foundWithFunds) {
        setSelectedTargetType(foundWithFunds.type);
        onShowToast(
          lang === 'th'
            ? `🎉 ตรวจพบเหรียญ ${newResults[foundWithFunds.address]?.balanceBtc.toFixed(8)} BTC ในประเภท [${foundWithFunds.label}]!`
            : `🎉 Found ${newResults[foundWithFunds.address]?.balanceBtc.toFixed(8)} BTC in [${foundWithFunds.label}]!`,
          'success'
        );
      } else {
        onShowToast(
          lang === 'th' ? 'สแกนเสร็จสิ้น ตรวจสอบผลลัพธ์ในรายการด้านล่าง' : 'Scan complete. See results below.',
          'info'
        );
      }
    } catch (e) {
      console.error('Scan error:', e);
    } finally {
      setIsScanningAll(false);
    }
  };

  // Trigger scan when modal opens or addresses change
  useEffect(() => {
    if (isOpen && isDeviceOnline && derivedFormats.nativeSegwit) {
      handleScanAllOnChain();
    }
  }, [isOpen, derivedFormats.nativeSegwit]);

  // Unlock using PIN from stored encrypted vault
  const handleUnlockWithPin = async (pinToUse?: string) => {
    const pin = pinToUse || pinInput;
    if (!pin) {
      setDecryptError(lang === 'th' ? 'กรุณากรอก PIN 6 หลัก' : 'Please enter 6-digit PIN');
      return;
    }

    const storedEncrypted = localStorage.getItem(`COLDVAULT_ENCRYPTED_SIGNER_${targetAccount.id}`);
    const storedFp = localStorage.getItem(`COLDVAULT_VAULT_FINGERPRINT_${targetAccount.id}`);

    if (!storedEncrypted) {
      setDecryptError(
        lang === 'th'
          ? 'กระเป๋านี้ไม่ได้บันทึก Vault เข้ารหัสไว้ กรุณาเลือกแท็บ "วาง Seed Phrase / Private Key"'
          : 'No encrypted vault found for this account. Please use "Paste Seed / Key".'
      );
      setUnlockMethod('manual');
      return;
    }

    setIsDecrypting(true);
    setDecryptError(null);

    try {
      const fingerprint = storedFp || targetAccount.address.slice(-8);
      const res = await decryptZeroExposureVault(storedEncrypted, pin, fingerprint);

      if (res.success && res.decryptedSecret) {
        setUnlockedSecret(res.decryptedSecret);
        onShowToast(
          lang === 'th' ? '🔓 ปลดล็อคถอดรหัสกุญแจสำเร็จ!' : '🔓 Key unlocked successfully!',
          'success'
        );
      } else {
        setDecryptError(res.error || (lang === 'th' ? 'PIN ไม่ถูกต้อง' : 'Incorrect PIN'));
      }
    } catch (e: any) {
      setDecryptError(e.message || 'Decryption error');
    } finally {
      setIsDecrypting(false);
    }
  };

  // Paste from clipboard helper
  const handlePasteSecret = async () => {
    try {
      const res = await readClipboardSafely();
      if (res.text) {
        setSecretInput(res.text.trim());
        setUnlockedSecret(null);
        onShowToast(lang === 'th' ? 'วางข้อมูลเรียบร้อย' : 'Pasted from clipboard', 'info');
      }
    } catch (e) {
      // ignore
    }
  };

  // Copy address helper
  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
    onShowToast(lang === 'th' ? 'คัดลอกที่อยู่แล้ว' : 'Address copied', 'info');
  };

  // Action 1: Switch Current Wallet's Address Type
  const handleExecuteSwitch = async () => {
    const selectedOption = addressTypeOptions.find(o => o.type === selectedTargetType);
    if (!selectedOption) return;

    if (selectedOption.type === targetAccount.addressType) {
      onShowToast(
        lang === 'th'
          ? 'กระเป๋าปัจจุบันอยู่ในประเภทนี้อยู่แล้ว'
          : 'Current wallet is already in this address format.',
        'info'
      );
      return;
    }

    setIsApplyingChange(true);

    try {
      // Re-seal vault under new address format if secret is available
      const activeSecret = unlockedSecret || secretInput.trim();
      if (activeSecret) {
        const { vault: newVault } = await sealZeroExposureVault(
          activeSecret,
          userPin,
          targetAccount.name,
          selectedOption.type,
          passphraseInput,
          targetAccount.keySource || 'seed_phrase',
          targetAccount.keyFormat
        );

        // Store updated encrypted vault
        try {
          localStorage.setItem(`COLDVAULT_ENCRYPTED_SIGNER_${targetAccount.id}`, newVault.encryptedSignerKey);
          localStorage.setItem(`COLDVAULT_VAULT_FINGERPRINT_${targetAccount.id}`, newVault.vaultFingerprint);
        } catch (e) {
          // ignore
        }
      }

      onSwitchAddressType(
        targetAccount.id,
        selectedOption.type,
        selectedOption.address,
        selectedOption.publicKey,
        selectedOption.path,
        selectedOption.balanceBtc,
        selectedOption.balanceSats
      );

      onShowToast(
        lang === 'th'
          ? `🔄 เปลี่ยนประเภทกระเป๋าเป็น [${selectedOption.label}] สำเร็จ! ระบบกำลังซิงค์บล็อกเชน...`
          : `🔄 Switched address type to [${selectedOption.label}] successfully! Syncing blockchain...`,
        'success'
      );

      setIsApplyingChange(false);
      onClose();
    } catch (e: any) {
      setIsApplyingChange(false);
      onShowToast(e.message || 'Failed to switch address type', 'info');
    }
  };

  // Action 2: Add as Parallel / Sibling Wallet
  const handleExecuteAddParallel = async () => {
    const selectedOption = addressTypeOptions.find(o => o.type === selectedTargetType);
    if (!selectedOption) return;

    setIsApplyingChange(true);

    try {
      const suffix =
        selectedOption.type === 'legacy'
          ? 'Legacy'
          : selectedOption.type === 'nested_segwit'
          ? 'Nested SegWit'
          : selectedOption.type === 'taproot'
          ? 'Taproot'
          : 'Native SegWit';

      const newAccountName = `${targetAccount.name} (${suffix})`;
      const activeSecret = unlockedSecret || secretInput.trim();

      let parallelVault: ZeroExposureVault | undefined = undefined;

      if (activeSecret) {
        const { vault } = await sealZeroExposureVault(
          activeSecret,
          userPin,
          newAccountName,
          selectedOption.type,
          passphraseInput,
          targetAccount.keySource || 'seed_phrase',
          targetAccount.keyFormat
        );
        parallelVault = vault;
      }

      const newParallelAccount: WalletAccount = {
        id: `btc-vault-${Math.random().toString(36).substring(2, 9)}`,
        name: newAccountName,
        address: selectedOption.address,
        addressType: selectedOption.type,
        publicKey: selectedOption.publicKey,
        balanceBtc: selectedOption.balanceBtc,
        balanceSats: selectedOption.balanceSats,
        keySource: targetAccount.keySource,
        keyFormat: targetAccount.keyFormat,
        color: selectedOption.type === 'legacy' ? '#f59e0b' : selectedOption.type === 'nested_segwit' ? '#6366f1' : '#10b981',
        isVaultSealed: true,
        sealedTimestamp: Date.now(),
        derivationPath: selectedOption.path,
        createdOffline: true,
        has25thWord: targetAccount.has25thWord,
      };

      if (parallelVault) {
        localStorage.setItem(`COLDVAULT_ENCRYPTED_SIGNER_${newParallelAccount.id}`, parallelVault.encryptedSignerKey);
        localStorage.setItem(`COLDVAULT_VAULT_FINGERPRINT_${newParallelAccount.id}`, parallelVault.vaultFingerprint);
      }

      onAddParallelWallet(newParallelAccount, parallelVault);

      onShowToast(
        lang === 'th'
          ? `➕ เพิ่มกระเป๋าคู่ขนาน "${newAccountName}" เรียบร้อยแล้ว!`
          : `➕ Added parallel wallet "${newAccountName}" successfully!`,
        'success'
      );

      setIsApplyingChange(false);
      onClose();
    } catch (e: any) {
      setIsApplyingChange(false);
      onShowToast(e.message || 'Failed to add parallel wallet', 'info');
    }
  };

  // Best recommended option based on on-chain scan results
  const recommendedOption = useMemo(() => {
    return addressTypeOptions.find(o => o.hasFunds && o.type !== targetAccount.addressType);
  }, [addressTypeOptions, targetAccount.addressType]);

  if (!isOpen) return null;

  return (
    <div
      id="address-type-switch-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="address-type-switch-modal-container"
        className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto flex flex-col space-y-5"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-100">
                  {lang === 'th' ? 'เปลี่ยนประเภท Address & กู้คืนเหรียญ' : 'Change Address Type & Scan Funds'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                  BIP-44/49/84/86
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'th'
                  ? 'แก้ปัญหาไม่พบเหรียญหรือธุรกรรมไม่ขึ้น เนื่องจากกระเป๋าถูกตั้งค่าผิดประเภท'
                  : 'Recover funds if your wallet format doesn\'t match where coins were sent'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Wallet Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0"
              style={{ backgroundColor: targetAccount.color || '#f59e0b' }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200 truncate">{targetAccount.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase border ${
                    targetAccount.addressType === 'native_segwit'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : targetAccount.addressType === 'nested_segwit'
                      ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                      : targetAccount.addressType === 'taproot'
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {targetAccount.addressType === 'native_segwit'
                    ? 'SegWit (bc1q)'
                    : targetAccount.addressType === 'nested_segwit'
                    ? 'Nested (3...)'
                    : targetAccount.addressType === 'taproot'
                    ? 'Taproot (bc1p)'
                    : 'Legacy (1...)'}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                {targetAccount.address}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">{lang === 'th' ? 'ยอดปัจจุบัน' : 'Current Balance'}</span>
              <span className="text-xs font-mono font-extrabold text-slate-100">
                {targetAccount.balanceBtc.toFixed(8)} BTC
              </span>
            </div>
            {allAccounts.length > 1 && (
              <select
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-2 py-1 focus:outline-none focus:border-amber-500"
              >
                {allAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.addressType})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Informative Problem & Solution Notice */}
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200 leading-relaxed">
          <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">
              {lang === 'th' ? 'ทำไมกระเป๋าถึงแสดงยอดเป็น 0?' : 'Why is your balance showing 0 BTC?'}
            </span>{' '}
            {lang === 'th'
              ? 'ใน Bitcoin เมล็ดพันธุ์ (Seed) หรือ Private Key อันเดียวกัน สามารถสร้าง Address ได้ 4 รูปแบบ หากคุณเคยรับเหรียญไว้ในกระเป๋าเก่าแบบ Legacy (ขึ้นต้นด้วย 1...) แต่แอปนำเข้ามาเป็น SegWit (bc1q...) บล็อกเชนจะค้นหาคนละที่อยู่ ทำให้ยอดเงินและประวัติธุรกรรมไม่แสดง'
              : 'In Bitcoin, the same Seed or Private Key derives 4 different address types. If your funds were sent to a Legacy address (1...), but the app imported as SegWit (bc1q...), the blockchain searches the wrong address, showing 0 balance and 0 txs.'}
          </div>
        </div>

        {/* Recommended Option Alert if On-Chain Funds Detected */}
        {recommendedOption && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-emerald-300">
                  {lang === 'th'
                    ? `✨ ตรวจพบยอดเงิน ${recommendedOption.balanceBtc.toFixed(8)} BTC ในประเภท [${recommendedOption.label}]!`
                    : `✨ Found ${recommendedOption.balanceBtc.toFixed(8)} BTC in [${recommendedOption.label}]!`}
                </div>
                <div className="text-[11px] text-emerald-400/90 mt-0.5 font-mono">
                  {recommendedOption.address}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTargetType(recommendedOption.type)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shrink-0 transition-colors shadow-md"
            >
              {lang === 'th' ? 'เลือกรูปแบบนี้' : 'Select Format'}
            </button>
          </div>
        )}

        {/* Secret Verification / Unlock Section */}
        {!unlockedSecret && (
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                {lang === 'th' ? 'ขั้นตอนที่ 1: ปลดล็อคกุญแจเพื่อถอดรหัส Address ทั้ง 4 รูปแบบ' : 'Step 1: Unlock Key to Derive All 4 Formats'}
              </span>
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setUnlockMethod('pin')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${
                    unlockMethod === 'pin' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lang === 'th' ? 'ด้วย PIN' : 'With PIN'}
                </button>
                <button
                  type="button"
                  onClick={() => setUnlockMethod('manual')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${
                    unlockMethod === 'manual' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lang === 'th' ? 'วาง Seed/Key' : 'Paste Seed/Key'}
                </button>
              </div>
            </div>

            {unlockMethod === 'pin' ? (
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder={lang === 'th' ? 'กรอก PIN 6 หลักของกระเป๋า' : 'Enter 6-digit Wallet PIN'}
                  className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500 font-mono tracking-widest text-center"
                />
                <button
                  type="button"
                  onClick={() => handleUnlockWithPin()}
                  disabled={isDecrypting || pinInput.length < 4}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition-colors shrink-0"
                >
                  {isDecrypting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    lang === 'th' ? 'ถอดรหัส' : 'Unlock'
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <textarea
                    rows={2}
                    value={secretInput}
                    onChange={e => setSecretInput(e.target.value)}
                    placeholder={
                      lang === 'th'
                        ? 'วาง Seed Phrase (12/24 คำ) หรือ Private Key (WIF / 64-Hex / xprv)'
                        : 'Paste Seed Phrase (12/24 words) or Private Key (WIF / 64-Hex / xprv)'
                    }
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs p-2.5 rounded-xl focus:outline-none focus:border-amber-500 font-mono resize-none pr-16"
                  />
                  <button
                    type="button"
                    onClick={handlePasteSecret}
                    className="absolute top-2.5 right-2 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-400 font-bold flex items-center gap-1 border border-slate-700"
                  >
                    <Clipboard className="w-3 h-3" />
                    {lang === 'th' ? 'วาง' : 'Paste'}
                  </button>
                </div>
                {targetAccount.has25thWord && (
                  <input
                    type="text"
                    value={passphraseInput}
                    onChange={e => setPassphraseInput(e.target.value)}
                    placeholder={lang === 'th' ? 'คำที่ 25 (BIP-39 Passphrase) หากมี' : '25th Word Passphrase (if any)'}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs px-3 py-1.5 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                )}
              </div>
            )}

            {decryptError && (
              <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{decryptError}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: 4 Address Types Grid & On-Chain Scanning */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              {lang === 'th' ? 'ขั้นตอนที่ 2: เลือกประเภท Address ที่ต้องการใช้งาน' : 'Step 2: Select Target Address Format'}
            </span>
            <button
              type="button"
              onClick={handleScanAllOnChain}
              disabled={isScanningAll}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors active:scale-95 disabled:opacity-50 border border-slate-700"
              title={lang === 'th' ? 'สแกนยอดเหรียญบนบล็อกเชนทั้ง 4 รูปแบบ' : 'Scan live on-chain balances'}
            >
              <Search className={`w-3 h-3 text-amber-400 ${isScanningAll ? 'animate-spin' : ''}`} />
              <span>{isScanningAll ? (lang === 'th' ? 'กำลังสแกน...' : 'Scanning...') : (lang === 'th' ? 'สแกนบล็อกเชน' : 'Scan On-Chain')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {addressTypeOptions.map(opt => {
              const isSelected = selectedTargetType === opt.type;
              const isCurrent = targetAccount.addressType === opt.type;

              return (
                <div
                  key={opt.type}
                  onClick={() => setSelectedTargetType(opt.type)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10 ring-1 ring-amber-500'
                      : opt.hasFunds
                      ? 'bg-emerald-500/10 border-emerald-500/60 hover:border-emerald-400'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Top Row: Format Label & Current Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold text-slate-100 truncate">{opt.label}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[9px] font-bold border border-slate-700 shrink-0">
                            {lang === 'th' ? 'ปัจจุบัน' : 'Current'}
                          </span>
                        )}
                      </div>
                      <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold shrink-0 border ${opt.feeBadgeColor}`}>
                        {opt.feeBadge}
                      </span>
                    </div>

                    {/* Derivation Path & Script Type */}
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-1">
                      <span>{opt.path}</span>
                      <span>•</span>
                      <span>{opt.scriptType}</span>
                    </div>

                    {/* Full Address Display with Copy */}
                    <div className="mt-2 p-2 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-slate-300 truncate select-all">
                        {opt.address || 'Deriving...'}
                      </span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleCopy(opt.address);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 shrink-0 transition-colors"
                        title={lang === 'th' ? 'คัดลอกที่อยู่นี้' : 'Copy address'}
                      >
                        {copiedAddress === opt.address ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                      {opt.description}
                    </p>
                  </div>

                  {/* Bottom Row: On-Chain Balance Status */}
                  <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {opt.hasFunds ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-bold font-mono text-xs">
                          <Coins className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          {opt.balanceBtc.toFixed(8)} BTC
                        </span>
                      ) : opt.hasHistory ? (
                        <span className="flex items-center gap-1 text-amber-400 font-mono text-[11px]">
                          <History className="w-3 h-3 shrink-0" />
                          {opt.txCount} txs (0 BTC)
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[10px]">
                          0.00 BTC (0 txs)
                        </span>
                      )}
                    </div>

                    {isSelected ? (
                      <span className="flex items-center gap-1 text-amber-400 font-bold text-[10px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {lang === 'th' ? 'เลือกแล้ว' : 'Selected'}
                      </span>
                    ) : opt.hasFunds ? (
                      <span className="text-emerald-400 text-[10px] font-bold underline">
                        {lang === 'th' ? 'พบเหรียญ!' : 'Funds Found!'}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition-colors order-2 sm:order-1"
          >
            {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleExecuteAddParallel}
            disabled={isApplyingChange}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors order-3 sm:order-2"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'th' ? 'เพิ่มเป็นกระเป๋าคู่ขนานใหม่' : 'Add as Parallel Sibling'}</span>
          </button>

          <button
            type="button"
            onClick={handleExecuteSwitch}
            disabled={isApplyingChange || selectedTargetType === targetAccount.addressType}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-amber-500/20 order-1 sm:order-3"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isApplyingChange ? 'animate-spin' : ''}`} />
            <span>
              {lang === 'th'
                ? `เปลี่ยนประเภทกระเป๋านี้ทันที (${
                    selectedTargetType === 'legacy'
                      ? 'Legacy'
                      : selectedTargetType === 'nested_segwit'
                      ? 'Nested'
                      : selectedTargetType === 'taproot'
                      ? 'Taproot'
                      : 'SegWit'
                  })`
                : `Switch Current Wallet to ${selectedTargetType}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
