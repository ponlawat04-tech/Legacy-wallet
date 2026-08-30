import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  WifiOff,
  Key,
  Lock,
  EyeOff,
  Sparkles,
  Check,
  AlertTriangle,
  Info,
  Layers,
  ArrowRight,
  Palette,
  X,
  RotateCcw,
  Trash2,
  Camera,
  QrCode
} from 'lucide-react';
import { AddressType, Language, WalletAccount, ZeroExposureVault } from '../types/wallet';
import { i18n } from '../utils/i18n';
import { getWordSuggestions, isValidBip39Word } from '../utils/bip39Words';
import {
  generateOfflinePrivateKey,
  generateOfflineSeedPhrase,
  sealZeroExposureVault,
  validatePrivateKey,
  validateSeedPhrase
} from '../utils/cryptoVault';

interface OfflineVaultImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVaultSealed: (account: WalletAccount, vault: ZeroExposureVault) => void;
  lang: Language;
  initialSecret?: string;
  initialTab?: '12' | '24' | 'key';
  onOpenQrScanner?: () => void;
}

const WALLET_COLORS = [
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Purple Royal', hex: '#a855f7' },
  { name: 'Emerald Green', hex: '#10b981' },
  { name: 'Sky Blue', hex: '#0284c7' },
  { name: 'Rose Red', hex: '#f43f5e' },
  { name: 'Cyan Neon', hex: '#06b6d4' },
];

export const OfflineVaultImportModal: React.FC<OfflineVaultImportModalProps> = ({
  isOpen,
  onClose,
  onVaultSealed,
  lang,
  initialSecret,
  initialTab,
  onOpenQrScanner,
}) => {
  const [tab, setTab] = useState<'12' | '24' | 'key'>('12');
  const [seedWords, setSeedWords] = useState<string[]>(Array(12).fill(''));
  const [privateKeyInput, setPrivateKeyInput] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('#f59e0b');
  const [addressType, setAddressType] = useState<AddressType>('native_segwit');
  const [pinCode, setPinCode] = useState<string>('123456');
  
  const [passphrase25thWord, setPassphrase25thWord] = useState<string>('');
  const [enablePassphrase, setEnablePassphrase] = useState<boolean>(false);
  const [showPassphrase, setShowPassphrase] = useState<boolean>(false);
  
  const [activeWordIdx, setActiveWordIdx] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isAirGapped, setIsAirGapped] = useState<boolean>(true);

  const t = i18n[lang];

  // Completely wipe and reset all sensitive input states whenever modal opens or closes
  const resetForm = (targetTab: '12' | '24' | 'key' = '12') => {
    setTab(targetTab);
    setSeedWords(Array(targetTab === '24' ? 24 : 12).fill(''));
    setPrivateKeyInput('');
    setAccountName('');
    setPassphrase25thWord('');
    setEnablePassphrase(false);
    setActiveWordIdx(null);
    setSuggestions([]);
    setError(null);
    setIsProcessing(false);
    setSelectedColor(targetTab === 'key' ? '#a855f7' : targetTab === '24' ? '#0284c7' : '#f59e0b');
  };

  useEffect(() => {
    if (isOpen) {
      if (initialSecret) {
        const parts = initialSecret.trim().split(/[\s,]+/);
        if (parts.length === 24) {
          resetForm('24');
          setSeedWords(parts.map(p => p.toLowerCase()));
          setAccountName(lang === 'th' ? 'กระเป๋า Seed Phrase 24 คำ' : 'Coldcard Seed Vault (24 words)');
        } else if (parts.length === 12) {
          resetForm('12');
          setSeedWords(parts.map(p => p.toLowerCase()));
          setAccountName(lang === 'th' ? 'กระเป๋า Seed Phrase 12 คำ' : 'Seed Vault (12 words)');
        } else {
          resetForm('key');
          setPrivateKeyInput(initialSecret.trim());
          setAccountName(lang === 'th' ? 'กระเป๋า Private Key พิเศษ' : 'Imported Private Key Vault');
        }
      } else if (initialTab) {
        resetForm(initialTab);
      } else {
        resetForm('12');
      }
    }
  }, [isOpen, initialSecret, initialTab]);

  if (!isOpen) return null;

  const handleClose = () => {
    resetForm('12');
    onClose();
  };

  const handleTabChange = (newTab: '12' | '24' | 'key') => {
    setTab(newTab);
    setError(null);
    if (newTab === '12') {
      setSeedWords(Array(12).fill(''));
      if (!accountName || accountName.startsWith('Private Key') || accountName.startsWith('กระเป๋า') || accountName.startsWith('Seed Vault')) {
        setAccountName(lang === 'th' ? 'กระเป๋า Seed Phrase 12 คำ' : 'Seed Vault (12 words)');
      }
      setSelectedColor('#f59e0b');
    } else if (newTab === '24') {
      setSeedWords(Array(24).fill(''));
      if (!accountName || accountName.startsWith('Private Key') || accountName.startsWith('กระเป๋า') || accountName.startsWith('Seed Vault')) {
        setAccountName(lang === 'th' ? 'กระเป๋า Seed Phrase 24 คำ' : 'Coldcard Seed Vault (24 words)');
      }
      setSelectedColor('#0284c7');
    } else {
      setPrivateKeyInput('');
      if (!accountName || accountName.startsWith('Seed Vault') || accountName.startsWith('กระเป๋า') || accountName.startsWith('Private Key')) {
        setAccountName(lang === 'th' ? 'กระเป๋า Private Key พิเศษ' : 'Isolated Private Key Vault');
      }
      setSelectedColor('#a855f7');
    }
  };

  const handleClearInputs = () => {
    if (tab === '12') {
      setSeedWords(Array(12).fill(''));
    } else if (tab === '24') {
      setSeedWords(Array(24).fill(''));
    } else {
      setPrivateKeyInput('');
    }
    setPassphrase25thWord('');
    setError(null);
    setSuggestions([]);
  };

  const handleWordChange = (val: string, index: number) => {
    setError(null);
    const newWords = [...seedWords];
    newWords[index] = val.toLowerCase().trim();
    setSeedWords(newWords);

    if (val.length >= 2) {
      setActiveWordIdx(index);
      setSuggestions(getWordSuggestions(val));
    } else {
      setSuggestions([]);
    }
  };

  const applySuggestion = (word: string, index: number) => {
    const newWords = [...seedWords];
    newWords[index] = word;
    setSeedWords(newWords);
    setSuggestions([]);
    setActiveWordIdx(null);
  };

  const handleGenerateRandomSeed = async () => {
    const count = tab === '24' ? 24 : 12;
    const generated = await generateOfflineSeedPhrase(count);
    setSeedWords(generated);
    setError(null);
  };

  const handleGenerateRandomKey = () => {
    const randomKey = generateOfflinePrivateKey();
    setPrivateKeyInput(randomKey.wif);
    setError(null);
  };

  const handlePasteFullSeed = (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const parts = pasted.trim().split(/[\s,]+/);
    if (parts.length === 12 || parts.length === 24) {
      if (parts.length === 24 && tab !== '24') {
        setTab('24');
      } else if (parts.length === 12 && tab !== '12') {
        setTab('12');
      }
      setSeedWords(parts.map(p => p.toLowerCase()));
      setError(null);
    } else if (parts.length === 1 && (parts[0].length === 64 || parts[0].length === 51 || parts[0].length === 52)) {
      setTab('key');
      setPrivateKeyInput(parts[0]);
    } else {
      setError(lang === 'th' ? 'จำนวนคำที่วางไม่ถูกต้อง (ต้องเป็น 12 หรือ 24 คำ)' : 'Pasted text must be exactly 12 or 24 words.');
    }
  };

  const handleSealSubmit = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      let secretToSeal = '';
      const keySource = tab === 'key' ? 'private_key' : 'seed_phrase';
      const keyFormat = tab === '12' ? '12-word BIP39' : tab === '24' ? '24-word BIP39' : (privateKeyInput.length === 64 ? '64-Hex' : 'WIF');

      if (tab === '12' || tab === '24') {
        const validation = validateSeedPhrase(seedWords);
        if (!validation.valid) {
          setError(validation.error || 'Invalid seed phrase');
          setIsProcessing(false);
          return;
        }
        secretToSeal = seedWords.join(' ');
      } else {
        const validation = validatePrivateKey(privateKeyInput);
        if (!validation.valid) {
          setError(validation.error || 'Invalid private key format');
          setIsProcessing(false);
          return;
        }
        secretToSeal = privateKeyInput.trim();
      }

      const finalName = accountName.trim() || (keySource === 'private_key' ? 'Private Key Vault' : `Seed Vault (${tab} Words)`);

      // Execute Zero-Exposure Permanent Sealing
      const { account, vault } = await sealZeroExposureVault(
        secretToSeal,
        pinCode,
        finalName,
        addressType,
        (tab === '12' || tab === '24') && enablePassphrase ? passphrase25thWord : undefined,
        keySource,
        keyFormat,
        selectedColor
      );

      // Brief delay for smooth visual feedback
      setTimeout(() => {
        setIsProcessing(false);
        onVaultSealed(account, vault);
        resetForm('12');
        onClose();
      }, 700);
    } catch (err: any) {
      setIsProcessing(false);
      setError(err.message || 'Sealing process failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-lg p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Air Gap Banner */}
        <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                {t.offlineStep1Title}
              </div>
              <p className="text-[11px] text-amber-200/80 leading-tight mt-0.5">
                {t.offlineStep1Desc}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAirGapped(!isAirGapped)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
              isAirGapped
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {isAirGapped ? 'Air-Gapped' : 'Online'}
          </button>
        </div>

        {/* Modal Header with Close Button */}
        <div className="flex items-start justify-between mb-4 gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-50 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              {lang === 'th' ? 'เพิ่มกระเป๋าใหม่ (แยก Seed / Private Key)' : 'Add Isolated Vault (Seed / Key)'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'th'
                ? 'นำเข้าหรือสร้าง Seed Phrase และ Private Key แยกเป็นคนละกระเป๋าได้อย่างอิสระ'
                : 'Import or generate isolated Bitcoin wallets with independent keys and seeds'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-4">
          <button
            type="button"
            onClick={() => handleTabChange('12')}
            className={`py-2 px-1 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1 ${
              tab === '12'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Seed 12 คำ</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('24')}
            className={`py-2 px-1 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1 ${
              tab === '24'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Seed 24 คำ</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('key')}
            className={`py-2 px-1 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1 ${
              tab === 'key'
                ? 'bg-purple-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Private Key</span>
          </button>
        </div>

        {/* Quick Action bar for Seed / Key */}
        {tab === '12' || tab === '24' ? (
          <div className="flex items-center justify-between mb-3 text-xs gap-2 flex-wrap">
            <span className="text-slate-400 font-medium">
              {lang === 'th' ? `ระบุคำตามลำดับ (1-${seedWords.length}) หรือวางทั้งประโยค` : `Enter words in order (1-${seedWords.length})`}
            </span>
            <div className="flex items-center gap-1.5">
              {onOpenQrScanner && (
                <button
                  type="button"
                  onClick={onOpenQrScanner}
                  className="inline-flex items-center gap-1 text-purple-300 hover:text-purple-200 font-semibold text-xs bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 px-2.5 py-1 rounded-lg transition-all shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5 text-purple-300" />
                  <span>{lang === 'th' ? 'สแกน QR' : 'Scan QR'}</span>
                </button>
              )}
              {(seedWords.some(w => w.length > 0) || passphrase25thWord) && (
                <button
                  type="button"
                  onClick={handleClearInputs}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-300 font-medium text-xs bg-slate-800/80 hover:bg-rose-500/10 border border-slate-700 hover:border-rose-500/30 px-2 py-1 rounded-lg transition-all"
                  title="Clear inputs"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{lang === 'th' ? 'ล้างคำ' : 'Clear'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleGenerateRandomSeed}
                className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold text-xs bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? `สุ่มสร้าง Seed ${tab} คำ` : `Generate ${tab} Words`}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-3 text-xs gap-2 flex-wrap">
            <span className="text-slate-400 font-medium">
              {lang === 'th' ? 'กรอก Private Key (WIF หรือ 64-Hex)' : 'Enter WIF or 64-char Hex Private Key'}
            </span>
            <div className="flex items-center gap-1.5">
              {onOpenQrScanner && (
                <button
                  type="button"
                  onClick={onOpenQrScanner}
                  className="inline-flex items-center gap-1 text-purple-300 hover:text-purple-200 font-semibold text-xs bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 px-2.5 py-1 rounded-lg transition-all shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5 text-purple-300" />
                  <span>{lang === 'th' ? 'สแกน QR Private Key' : 'Scan Key QR'}</span>
                </button>
              )}
              {privateKeyInput && (
                <button
                  type="button"
                  onClick={handleClearInputs}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-300 font-medium text-xs bg-slate-800/80 hover:bg-rose-500/10 border border-slate-700 hover:border-rose-500/30 px-2 py-1 rounded-lg transition-all"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{lang === 'th' ? 'ล้าง' : 'Clear'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleGenerateRandomKey}
                className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 font-semibold text-xs bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 px-2.5 py-1 rounded-lg transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'สุ่มสร้าง Private Key' : 'Generate Key'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Word Inputs Grid or Private Key Box */}
        {(tab === '12' || tab === '24') ? (
          <div className="relative mb-4">
            <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-1 p-1`}>
              {seedWords.map((word, idx) => {
                const isValid = isValidBip39Word(word);
                return (
                  <div key={idx} className="relative flex items-center">
                    <span className="absolute left-2.5 text-[10px] font-mono text-slate-500 select-none">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={word}
                      onChange={(e) => handleWordChange(e.target.value, idx)}
                      onPaste={handlePasteFullSeed}
                      placeholder="..."
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck="false"
                      className={`w-full bg-slate-950/80 border text-xs text-slate-100 rounded-xl pl-8 pr-2 py-2 focus:outline-none focus:ring-1 transition-all ${
                        word.length > 0
                          ? isValid
                            ? 'border-emerald-500/50 focus:ring-emerald-500'
                            : 'border-rose-500/50 focus:ring-rose-500'
                          : 'border-slate-800 focus:ring-amber-500'
                      }`}
                    />
                    {word && isValid && (
                      <Check className="w-3.5 h-3.5 text-emerald-400 absolute right-2 pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Word Suggestion Bar */}
            {suggestions.length > 0 && activeWordIdx !== null && (
              <div className="mt-2 p-2 bg-slate-950 border border-amber-500/40 rounded-xl flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] text-amber-400 font-bold shrink-0">
                  {lang === 'th' ? 'คำแนะนำ:' : 'Suggest:'}
                </span>
                {suggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => applySuggestion(sug, activeWordIdx)}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 rounded-lg text-xs font-mono border border-amber-500/30 transition-all shrink-0"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}

            {/* 25th Word / BIP39 Passphrase Extension */}
            <div className="mt-3 p-3 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5 cursor-pointer">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {lang === 'th'
                      ? tab === '12' ? 'คำที่ 13 (BIP-39 Passphrase Extension)' : 'คำที่ 25 (BIP-39 Passphrase Extension)'
                      : tab === '12' ? '13th Word (BIP-39 Passphrase Extension)' : '25th Word (BIP-39 Passphrase Extension)'}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setEnablePassphrase(!enablePassphrase)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all border ${
                    enablePassphrase
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {enablePassphrase ? (lang === 'th' ? 'เปิดใช้งาน' : 'Enabled') : (lang === 'th' ? 'ไม่ระบุ' : 'Disabled')}
                </button>
              </div>

              {enablePassphrase && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <div className="relative flex items-center">
                    <input
                      type={showPassphrase ? 'text' : 'password'}
                      value={passphrase25thWord}
                      onChange={(e) => setPassphrase25thWord(e.target.value)}
                      placeholder={
                        lang === 'th'
                          ? `กรอก${tab === '12' ? 'คำที่ 13' : 'คำที่ 25'} หรือ Passphrase ป้องกันพิเศษ...`
                          : `Enter ${tab === '12' ? '13th' : '25th'} word / optional passphrase...`
                      }
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck="false"
                      className="w-full bg-slate-900 border border-amber-500/40 rounded-xl pl-3 pr-16 py-2 text-xs font-mono text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      className="absolute right-2 text-[10px] text-slate-400 hover:text-slate-200 px-2 py-1 bg-slate-800/80 rounded-lg border border-slate-700/80"
                    >
                      {showPassphrase ? (lang === 'th' ? 'ซ่อน' : 'Hide') : (lang === 'th' ? 'แสดง' : 'Show')}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {lang === 'th'
                      ? '💡 คำที่ 25 (Passphrase) ทำหน้าที่เป็นกุญแจแยกกระเป๋าอิสระ (Plausible Deniability) แม้ผู้ไม่หวังดีได้คำ Seed 24 คำไป ก็ไม่สามารถเข้าถึงเหรียญในกระเป๋านี้ได้หากไม่มีคำที่ 25'
                      : '💡 The 25th word (BIP-39 Passphrase) creates an isolated decoy/hidden wallet with full plausible deniability.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-4 space-y-2">
            <label className="block text-xs font-medium text-slate-300">
              Private Key (WIF เช่น 5K..., L..., K... หรือ 64-Hex)
            </label>
            <textarea
              value={privateKeyInput}
              onChange={(e) => setPrivateKeyInput(e.target.value)}
              onPaste={handlePasteFullSeed}
              placeholder={lang === 'th' ? 'วาง Private Key หรือกด "สุ่มสร้าง Private Key" ด้านบน...' : 'Paste WIF / Hex private key or click Generate above...'}
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs font-mono text-purple-200 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
            />
            <p className="text-[10px] text-slate-400">
              {lang === 'th'
                ? '🔒 Private Key จะถูกนำเข้าเป็นกระเป๋าเดี่ยว (Single-Key Vault) และถูกซีล Zero-Exposure ทันที'
                : '🔒 Imported as an isolated single-key vault with immediate zero-exposure memory sealing.'}
            </p>
          </div>
        )}

        {/* Configuration Options */}
        <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              {lang === 'th' ? 'ชื่อกระเป๋าบัญชีนี้' : 'Wallet Name / Label'}
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder={tab === 'key' ? 'Private Key Vault #1' : `Seed Vault (${tab} words)`}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Color Tag Picker */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
              <Palette className="w-3 h-3 text-slate-400" />
              <span>{lang === 'th' ? 'สีระบุกระเป๋า' : 'Wallet Tag Color'}</span>
            </label>
            <div className="flex items-center gap-2">
              {WALLET_COLORS.map((col) => (
                <button
                  key={col.hex}
                  type="button"
                  onClick={() => setSelectedColor(col.hex)}
                  className={`w-6 h-6 rounded-full transition-all flex items-center justify-center ${
                    selectedColor === col.hex ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: col.hex }}
                  title={col.name}
                >
                  {selectedColor === col.hex && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Address Type Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              {t.addressTypeLabel}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <label
                onClick={() => setAddressType('native_segwit')}
                className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                  addressType === 'native_segwit'
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <span>Native SegWit (bc1q)</span>
                {addressType === 'native_segwit' && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </label>

              <label
                onClick={() => setAddressType('taproot')}
                className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                  addressType === 'taproot'
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <span>Taproot (bc1p)</span>
                {addressType === 'taproot' && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </label>
            </div>
          </div>
        </div>

        {/* Permanent Zero-Exposure Guarantee Box */}
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl mb-4 flex items-start gap-2.5">
          <EyeOff className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-rose-200/90 leading-tight">
            <strong>{lang === 'th' ? 'Zero-Exposure Isolation:' : 'Zero-Exposure Isolation:'}</strong>{' '}
            {lang === 'th'
              ? 'ข้อมูลคีย์ถูกแยกออกจากกันโดยสิ้นเชิงและจะถูกเข้ารหัสลง WebCrypto ทันทีหลังซีล'
              : 'Keys and seeds are strictly isolated and zeroed out from active memory immediately.'}
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-2 mt-auto pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleSealSubmit}
            className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 text-slate-950 ${
              tab === 'key'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 shadow-purple-500/20'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-amber-500/20'
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                {lang === 'th' ? 'กำลังซีลกระเป๋าแยกบัญชี...' : 'Sealing Isolated Vault...'}
              </span>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>{lang === 'th' ? 'บันทึกและซีลกระเป๋า (Seal Vault)' : 'Confirm & Seal Vault'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
