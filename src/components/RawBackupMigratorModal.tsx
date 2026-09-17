import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  FileText,
  Upload,
  Clipboard,
  Key,
  Layers,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Trash2,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  Database,
  Check,
  X,
  HelpCircle,
} from 'lucide-react';
import { AddressType, Language, WalletAccount } from '../types/wallet';
import {
  parseRawBackupData,
  decryptRawBackupPayload,
  executeBatchMigration,
  RawBackupParseResult,
  DiscoveredWalletItem,
} from '../utils/rawBackupMigrator';
import { readClipboardSafely } from '../utils/clipboard';

interface RawBackupMigratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onMigrateComplete: (newAccounts: WalletAccount[], primaryAccount?: WalletAccount) => void;
  onShowToast: (message: string, type?: 'success' | 'info') => void;
  userPin?: string;
  onOpenPinModal?: (action: () => void) => void;
}

// Sample presets for user testing
const SAMPLE_PRESETS = {
  bitcoin_core: `# * Created on 2013-11-05T04:47:00Z - Bitcoin Core dumpwallet
# * Extended private masterkey: xprv9s21ZrQH143K25Qhmo3CPGoUTRtsZxGS3mM8Jb1R3H9hcvcQ1b2q71F7A48xG28c11qK4n342kM2m6Q4cK2v3gD
KxZCtssS3LzqdGvLXoK1hLw5C2V48D93r1g6F8kH7n2m1q4w5e6 2013-11-05T04:47:00Z label=Mining%20Rewards # addr=1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
5Kb8kLf5zgWQEtJjAuUQ2WBa9Sk387W7hKnpUHsgu6LtTLotb13 2014-02-18T10:15:30Z label=Cold%20Savings # addr=1HLoD9E4SDFFPDiYfNYnkBLQmm5PxYVQu3
L2G1L7n5m3q1w4e7r9t2y5u8i1o4p7a9s2d5f8g1h4j7k9l2z5x 2015-06-20T12:00:00Z label=reserve
L4rK9w5e6r7t8y1u2i3o4p5a6s7d8f9g1h2j3k4l5z6x7c8v9b1 2016-08-11T14:30:00Z label=Donation%20Box # addr=3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy`,

  electrum: `{
  "wallet_type": "standard",
  "seed_version": 17,
  "keystore": {
    "type": "bip39",
    "seed": "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    "passphrase": "",
    "derivation": "m/84'/0'/0'",
    "root_fingerprint": "73c5da0a",
    "xprv": "zprvAdG4iTXWBoARxkkzNpNh8r6Qag3irQB8PHgNeKMyTp1UiMXfZrbBt2mDo2f6K4n342kM2m6Q4cK2v3gD4f5h6j7k8l9z0x1c2v3b4n5",
    "xpub": "zpub6rFR7y4Q2AijBEqTUquhMRQWfqpTtCHGwncWzasAZUjz2K1n1n4w7m4v5x8z1b2c3d4e5f6g7h8j9k0l1m2n3p4q5r6s7t8u9v0"
  }
}`,

  descriptor: `wpkh([73c5da0a/84'/0'/0']xprv9s21ZrQH143K25Qhmo3CPGoUTRtsZxGS3mM8Jb1R3H9hcvcQ1b2q71F7A48xG28c11qK4n342kM2m6Q4cK2v3gD/0/*)
pkh([73c5da0a/44'/0'/0']xprv9s21ZrQH143K25Qhmo3CPGoUTRtsZxGS3mM8Jb1R3H9hcvcQ1b2q71F7A48xG28c11qK4n342kM2m6Q4cK2v3gD/0/*)
tr([73c5da0a/86'/0'/0']xprv9s21ZrQH143K25Qhmo3CPGoUTRtsZxGS3mM8Jb1R3H9hcvcQ1b2q71F7A48xG28c11qK4n342kM2m6Q4cK2v3gD/0/*)`,

  paper_csv: `Label,Private Key (WIF),Address
Primary Savings,5Kb8kLf5zgWQEtJjAuUQ2WBa9Sk387W7hKnpUHsgu6LtTLotb13,1HLoD9E4SDFFPDiYfNYnkBLQmm5PxYVQu3
Legacy Cold Storage,KxZCtssS3LzqdGvLXoK1hLw5C2V48D93r1g6F8kH7n2m1q4w5e6,1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
SegWit Vault,L4rK9w5e6r7t8y1u2i3o4p5a6s7d8f9g1h2j3k4l5z6x7c8v9b1,bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq`,
};

export const RawBackupMigratorModal: React.FC<RawBackupMigratorModalProps> = ({
  isOpen,
  onClose,
  lang,
  onMigrateComplete,
  onShowToast,
  userPin = '123456',
  onOpenPinModal,
}) => {
  const [rawText, setRawText] = useState<string>('');
  const [parseResult, setParseResult] = useState<RawBackupParseResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Decryption state for password-protected backups
  const [decryptPassword, setDecryptPassword] = useState<string>('');
  const [showDecryptPassword, setShowDecryptPassword] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  // Target Migration Settings
  const [targetAddressType, setTargetAddressType] = useState<AddressType>('native_segwit');
  const [setAsPrimaryWallet, setSetAsPrimaryWallet] = useState<boolean>(true);
  const [migrationPin, setMigrationPin] = useState<string>(userPin || '123456');

  // Migration Execution State
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [migrationProgress, setMigrationProgress] = useState<number>(0);
  const [migratedSummary, setMigratedSummary] = useState<{
    accounts: WalletAccount[];
    errors: string[];
  } | null>(null);

  // Expanded item address detail index
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Parse whenever rawText changes with slight debounce
  useEffect(() => {
    if (!rawText.trim()) {
      setParseResult(null);
      setDecryptError(null);
      return;
    }

    setIsAnalyzing(true);
    const timer = setTimeout(() => {
      try {
        const result = parseRawBackupData(rawText);
        setParseResult(result);
        setDecryptError(null);
      } catch (err: any) {
        console.error('Error parsing raw backup:', err);
      } finally {
        setIsAnalyzing(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [rawText]);

  if (!isOpen) return null;

  // Toggle item selection
  const handleToggleItem = (id: string) => {
    if (!parseResult) return;
    const updatedItems = parseResult.items.map(item =>
      item.id === id ? { ...item, selected: !item.selected } : item
    );
    setParseResult({ ...parseResult, items: updatedItems });
  };

  // Toggle select all
  const handleToggleSelectAll = () => {
    if (!parseResult) return;
    const allSelected = parseResult.items.every(i => i.selected);
    const updatedItems = parseResult.items.map(item => ({
      ...item,
      selected: !allSelected,
    }));
    setParseResult({ ...parseResult, items: updatedItems });
  };

  // Update item label
  const handleUpdateItemLabel = (id: string, newLabel: string) => {
    if (!parseResult) return;
    const updatedItems = parseResult.items.map(item =>
      item.id === id ? { ...item, label: newLabel } : item
    );
    setParseResult({ ...parseResult, items: updatedItems });
  };

  // Handle clipboard paste
  const handlePasteClipboard = async () => {
    try {
      const { text, error } = await readClipboardSafely();
      if (text) {
        setRawText(text);
        onShowToast(
          lang === 'th' ? 'วางข้อมูลสำรองจากคลิปบอร์ดแล้ว' : 'Pasted backup data from clipboard',
          'info'
        );
      } else if (error) {
        onShowToast(
          lang === 'th' ? 'กรุณาวางด้วยปุ่มลัด Ctrl+V / Command+V' : 'Please paste using Ctrl+V / Command+V',
          'info'
        );
      }
    } catch {
      onShowToast(
        lang === 'th' ? 'ไม่สามารถอ่านคลิปบอร์ดได้ กรุณาวางด้วย Ctrl+V / Command+V' : 'Clipboard inaccessible, please paste manually',
        'info'
      );
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        onShowToast(
          lang === 'th' ? `โหลดไฟล์ "${file.name}" สำเร็จ!` : `Loaded file "${file.name}"!`,
          'success'
        );
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  // Handle preset selection
  const handleLoadPreset = (key: keyof typeof SAMPLE_PRESETS) => {
    setRawText(SAMPLE_PRESETS[key]);
    onShowToast(
      lang === 'th' ? 'โหลดตัวอย่างข้อมูลสำรองแล้ว' : 'Loaded sample backup data',
      'info'
    );
  };

  // Handle decrypt
  const handleDecrypt = async () => {
    if (!decryptPassword.trim()) {
      setDecryptError(lang === 'th' ? 'กรุณากรอกรหัสผ่านเพื่อถอดรหัส' : 'Please enter decryption password');
      return;
    }

    setIsDecrypting(true);
    setDecryptError(null);

    const { decryptedText, success, error } = await decryptRawBackupPayload(rawText, decryptPassword);
    setIsDecrypting(false);

    if (success && decryptedText) {
      setRawText(decryptedText);
      setDecryptPassword('');
      onShowToast(
        lang === 'th' ? 'ถอดรหัสข้อมูลสำรองสำเร็จ!' : 'Backup successfully decrypted!',
        'success'
      );
    } else {
      setDecryptError(
        lang === 'th'
          ? `ถอดรหัสไม่สำเร็จ: ${error || 'รหัสผ่านไม่ถูกต้อง'}`
          : `Decryption failed: ${error || 'Incorrect password'}`
      );
    }
  };

  // Execute Migration
  const handleRunMigration = async () => {
    if (!parseResult || parseResult.items.length === 0) return;
    const selectedItems = parseResult.items.filter(i => i.selected);

    if (selectedItems.length === 0) {
      onShowToast(
        lang === 'th' ? 'กรุณาเลือกอย่างน้อย 1 รายการเพื่อย้ายข้อมูล' : 'Please select at least 1 item to migrate',
        'info'
      );
      return;
    }

    setIsMigrating(true);
    setMigrationProgress(20);

    try {
      setMigrationProgress(50);
      const { migratedAccounts, errors } = await executeBatchMigration(
        selectedItems,
        migrationPin || '123456',
        targetAddressType,
        'slate'
      );

      setMigrationProgress(100);
      setMigratedSummary({ accounts: migratedAccounts, errors });

      if (migratedAccounts.length > 0) {
        const primary = setAsPrimaryWallet ? migratedAccounts[0] : undefined;
        onMigrateComplete(migratedAccounts, primary);
        onShowToast(
          lang === 'th'
            ? `ย้ายกระเป๋าสำเร็จ ${migratedAccounts.length} บัญชีเข้าสู่ระบบ Zero-Exposure Vault แล้ว!`
            : `Successfully migrated ${migratedAccounts.length} vault(s) into Zero-Exposure Vault!`,
          'success'
        );
      }
    } catch (err: any) {
      setMigratedSummary({
        accounts: [],
        errors: [err?.message || 'Migration encountered an error'],
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const selectedCount = parseResult?.items.filter(i => i.selected).length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-slate-100 tracking-tight truncate">
                  {lang === 'th' ? 'กู้คืนจากข้อมูล Backup ดิบ' : 'Raw Backup Data Migrator'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Zero-Exposure
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Multi-Format
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {lang === 'th'
                  ? 'แปลงข้อมูล Bitcoin Core dump, Electrum, Sparrow, Descriptors และ Paper Wallet เข้าสู่แอพพลิเคชัน'
                  : 'Import legacy wallet dumps, descriptors, keys & files directly into sealed vaults'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-all shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* MIGRATION COMPLETED VIEW */}
          {migratedSummary && (
            <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-4 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-300">
                    {lang === 'th' ? 'ย้ายข้อมูลกระเป๋าสำเร็จเรียบร้อย!' : 'Migration Completed Successfully!'}
                  </h4>
                  <p className="text-xs text-emerald-400/80">
                    {lang === 'th'
                      ? `สร้างกระเป๋าใหม่แบบ Zero-Exposure และซีลด้วย PIN เรียบร้อยแล้ว (${migratedSummary.accounts.length} บัญชี)`
                      : `Successfully created and sealed ${migratedSummary.accounts.length} vault account(s)`}
                  </p>
                </div>
              </div>

              {/* List of migrated accounts */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {migratedSummary.accounts.map((acc, idx) => (
                  <div
                    key={acc.id || idx}
                    className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-bold text-slate-200 truncate">
                        <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{acc.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">({acc.addressType})</span>
                      </div>
                      <p className="text-[11px] font-mono text-emerald-400 truncate mt-0.5">
                        {acc.address}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                      Sealed
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMigratedSummary(null);
                    setRawText('');
                    setParseResult(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
                >
                  {lang === 'th' ? 'ย้ายชุดข้อมูลอื่นเพิ่ม' : 'Migrate Another Backup'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
                >
                  <span>{lang === 'th' ? 'เริ่มใช้งานกระเป๋าที่กู้คืนแล้ว' : 'Open Migrated Vault'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {!migratedSummary && (
            <>
              {/* TOP ACTION BAR: PRESETS, PASTE & UPLOAD */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {lang === 'th' ? 'ตัวอย่างข้อมูล:' : 'Samples:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset('bitcoin_core')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all font-mono text-[10px]"
                  >
                    Bitcoin Core Dump
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset('electrum')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all font-mono text-[10px]"
                  >
                    Electrum JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset('descriptor')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all font-mono text-[10px]"
                  >
                    Descriptor (BIP-380)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset('paper_csv')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all font-mono text-[10px]"
                  >
                    Paper CSV
                  </button>
                </div>

                {/* Paste & Upload Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'วางจากคลิปบอร์ด' : 'Paste'}</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.txt,.dat,.csv,.bak,.tsv,.wallet"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'เลือกไฟล์' : 'Upload File'}</span>
                  </button>

                  {rawText && (
                    <button
                      type="button"
                      onClick={() => setRawText('')}
                      className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700/60 transition-all"
                      title={lang === 'th' ? 'ล้างข้อมูล' : 'Clear text'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* RAW TEXT INPUT AREA */}
              <div className="relative">
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={
                    lang === 'th'
                      ? 'วางข้อความข้อมูลดิบจากการ backup ที่นี่...\n\nตัวอย่างที่รองรับ:\n• ผลลัพธ์จากคำสั่ง dumpwallet ของ Bitcoin Core\n• ไฟล์ JSON ของ Electrum, Sparrow, Wasabi, Trezor\n• ข้อความ Output Descriptor: wpkh(xprv.../0/*)\n• รายการ Private Key รูปแบบ WIF หรือ Hex หลายบรรทัด\n• ข้อความ Seed Phrase พร้อม Passphrase หรือ Derivation Path'
                      : 'Paste raw backup text or file contents here...\n\nSupported Formats:\n• Bitcoin Core "dumpwallet" output lines\n• Electrum / Sparrow / Trezor backup JSON\n• Output Descriptors: wpkh(xprv.../0/*)\n• Multi-line WIF / Hex private keys\n• Mnemonic seed notes with derivation path'
                  }
                  rows={7}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 leading-relaxed resize-y selection:bg-amber-500/30"
                />

                {isAnalyzing && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] text-amber-400 font-mono">
                    <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                    <span>{lang === 'th' ? 'กำลังตรวจสอบ...' : 'Analyzing...'}</span>
                  </div>
                )}
              </div>

              {/* PARSED STATUS & RECOGNITION BADGE */}
              {parseResult && (
                <div
                  className={`p-3.5 rounded-2xl border transition-all ${
                    parseResult.format === 'unknown'
                      ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                      : parseResult.isEncrypted
                      ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                      : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-100">
                        {parseResult.formatLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                      <span>{parseResult.metadata.rawLinesCount} lines</span>
                      {parseResult.items.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 font-bold border border-slate-700">
                          {lang === 'th'
                            ? `พบ ${parseResult.items.length} รายการ`
                            : `Found ${parseResult.items.length} items`}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {parseResult.formatDescription}
                  </p>
                </div>
              )}

              {/* ENCRYPTED BACKUP PASSWORD PROMPT */}
              {parseResult && parseResult.isEncrypted && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-bold text-amber-300">
                      {lang === 'th' ? 'ข้อมูลถูกเข้ารหัสไว้ กรุณากรอกรหัสผ่านเพื่อถอดรหัส' : 'Encrypted Backup Detected'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showDecryptPassword ? 'text' : 'password'}
                        value={decryptPassword}
                        onChange={(e) => setDecryptPassword(e.target.value)}
                        placeholder={lang === 'th' ? 'รหัสผ่านถอดรหัสไฟล์ backup...' : 'Enter backup password...'}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 pr-9 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleDecrypt();
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowDecryptPassword(!showDecryptPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showDecryptPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleDecrypt}
                      disabled={isDecrypting || !decryptPassword}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shrink-0"
                    >
                      {isDecrypting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Lock className="w-3.5 h-3.5" />
                      )}
                      <span>{lang === 'th' ? 'ถอดรหัส' : 'Decrypt'}</span>
                    </button>
                  </div>

                  {decryptError && (
                    <p className="text-[11px] text-rose-400 font-mono">
                      {decryptError}
                    </p>
                  )}
                </div>
              )}

              {/* DISCOVERED ITEMS LIST */}
              {parseResult && parseResult.items.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">
                        {lang === 'th' ? 'รายการกุญแจและกระเป๋าที่ค้นพบ' : 'Discovered Keys & Vaults'}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        ({selectedCount}/{parseResult.items.length} {lang === 'th' ? 'เลือกแล้ว' : 'selected'})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
                    >
                      {parseResult.items.every(i => i.selected)
                        ? (lang === 'th' ? 'ยกเลิกการเลือกทั้งหมด' : 'Deselect All')
                        : (lang === 'th' ? 'เลือกทั้งหมด' : 'Select All')}
                    </button>
                  </div>

                  {/* Item Cards */}
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {parseResult.items.map((item, index) => {
                      const isExpanded = expandedItemId === item.id;
                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-2xl border transition-all ${
                            item.selected
                              ? 'bg-slate-950/80 border-slate-700/80'
                              : 'bg-slate-950/40 border-slate-800/40 opacity-70'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {/* Checkbox */}
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => handleToggleItem(item.id)}
                              className="mt-1 w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-900 border-slate-700 cursor-pointer"
                            />

                            {/* Item Content */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <input
                                    type="text"
                                    value={item.label}
                                    onChange={(e) => handleUpdateItemLabel(item.id, e.target.value)}
                                    className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-amber-500 text-xs font-bold text-slate-100 focus:outline-none px-1 py-0.5 rounded truncate max-w-[200px] sm:max-w-none"
                                  />
                                  <span
                                    className={`px-1.5 py-0.2 rounded-md text-[9px] font-mono font-bold shrink-0 ${
                                      item.sourceType === 'master_seed'
                                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                        : item.sourceType === 'extended_key'
                                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    }`}
                                  >
                                    {item.keyFormat}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 font-mono shrink-0"
                                >
                                  <span>{isExpanded ? 'Hide' : 'Details'}</span>
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              </div>

                              {/* Primary Derived Native Segwit Address */}
                              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 truncate">
                                <span className="text-[10px] text-slate-500 uppercase font-semibold">SegWit:</span>
                                <span className="text-emerald-400 truncate">{item.addresses.nativeSegwit}</span>
                              </div>

                              {/* Badges / Notes */}
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[10px]">
                                {item.isAddressMatched && (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
                                    <Check className="w-2.5 h-2.5" />
                                    <span>{lang === 'th' ? 'ตรงกับที่อยู่ใน Backup' : 'Matched Backup Address'}</span>
                                  </span>
                                )}
                                {item.derivationPath && (
                                  <span className="text-slate-500 font-mono">
                                    Path: {item.derivationPath}
                                  </span>
                                )}
                                {item.passphrase && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-mono">
                                    +Passphrase
                                  </span>
                                )}
                                {item.notes && !item.isAddressMatched && (
                                  <span className="text-slate-500 truncate max-w-[200px]">
                                    {item.notes}
                                  </span>
                                )}
                              </div>

                              {/* Expanded Address Standards Drawer */}
                              {isExpanded && (
                                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2 mt-2 text-[10px] font-mono animate-in fade-in">
                                  <span className="text-slate-400 font-bold uppercase text-[9px] block">
                                    {lang === 'th' ? 'ที่อยู่ทุกมาตรฐานที่อนุพันธ์ได้ (Derived Addresses):' : 'Derived Multi-Standard Addresses:'}
                                  </span>

                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-slate-400">Native SegWit (BIP-84):</span>
                                      <span className="text-emerald-400 truncate">{item.addresses.nativeSegwit}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-slate-400">Taproot (BIP-86):</span>
                                      <span className="text-amber-300 truncate">{item.addresses.taproot}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-slate-400">Nested SegWit (BIP-49):</span>
                                      <span className="text-slate-300 truncate">{item.addresses.nestedSegwit}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-slate-400">Legacy P2PKH (BIP-44):</span>
                                      <span className="text-slate-300 truncate">{item.addresses.legacyCompressed}</span>
                                    </div>
                                    {item.addresses.bchCashAddr && (
                                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                                        <span className="text-teal-400">Bitcoin Cash (BCH):</span>
                                        <span className="text-teal-300 truncate">{item.addresses.bchCashAddr}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TARGET MIGRATION SETTINGS CARD */}
              {parseResult && parseResult.items.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{lang === 'th' ? 'การตั้งค่า Zero-Exposure Sealing ก่อนนำเข้า' : 'Target Vault Sealing Configuration'}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Target Address Format */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-400">
                        {lang === 'th' ? 'รูปแบบที่อยู่เป้าหมายหลัก' : 'Default Address Standard'}
                      </label>
                      <select
                        value={targetAddressType}
                        onChange={(e) => setTargetAddressType(e.target.value as AddressType)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="native_segwit">Native SegWit (bc1q) - BIP-84 [แนะนำ]</option>
                        <option value="taproot">Taproot (bc1p) - BIP-86</option>
                        <option value="nested_segwit">Nested SegWit (3...) - BIP-49</option>
                        <option value="legacy">Legacy (1...) - BIP-44</option>
                      </select>
                    </div>

                    {/* Migration Mode */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-400">
                        {lang === 'th' ? 'การสลับกระเป๋าหลังนำเข้า' : 'Post-Migration Action'}
                      </label>
                      <label className="flex items-center gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={setAsPrimaryWallet}
                          onChange={(e) => setSetAsPrimaryWallet(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-950 border-slate-700 cursor-pointer"
                        />
                        <span className="text-xs text-slate-200">
                          {lang === 'th' ? 'สลับเป็นกระเป๋าหลักทันที' : 'Switch to primary vault'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="p-3 bg-emerald-950/20 rounded-xl border border-emerald-500/30 flex items-start gap-2.5 text-[11px] text-emerald-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      {lang === 'th'
                        ? 'ข้อมูลความลับดิบ (Raw Secrets) จะถูกซีลเข้ารหัสด้วย AES-GCM-256 ผ่านรหัส PIN 6 หลัก และถูกล้างออกจากหน่วยความจำ RAM อย่างถาวร (Zero-Exposure Guarantee)'
                        : 'Raw secrets will be sealed with AES-GCM-256 using your PIN, and purged permanently from JavaScript runtime memory.'}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        {!migratedSummary && (
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
            >
              {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={handleRunMigration}
              disabled={isMigrating || !parseResult || selectedCount === 0}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
            >
              {isMigrating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{lang === 'th' ? `กำลังซีลกระเป๋า (${migrationProgress}%)...` : `Sealing (${migrationProgress}%)...`}</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>
                    {lang === 'th'
                      ? `นำเข้า ${selectedCount} บัญชีสู่ ColdVault`
                      : `Migrate ${selectedCount} Vault(s) to ColdVault`}
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
