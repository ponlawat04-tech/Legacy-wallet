import React, { useState } from 'react';
import {
  GitFork,
  Share2,
  Copy,
  Check,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Lock,
  Layers,
  Key,
  Info
} from 'lucide-react';
import { Language } from '../types/wallet';
import {
  deriveBip85ChildMnemonic,
  splitSecretIntoShamirShares,
  combineShamirShares,
  ShamirShare,
  Bip85ChildResult,
  SupportedWordCount,
  WORD_COUNT_PROFILES
} from '../utils/advancedWalletEngines';

interface AdvancedWalletEnginesTabProps {
  lang: Language;
  onApplySeedToVault: (
    words: string[],
    meta: {
      wordCount: SupportedWordCount;
      accountName: string;
      isBip85?: boolean;
      bip85Index?: number;
      isShamir?: boolean;
    }
  ) => void;
  currentSeedWords?: string[];
}

export const AdvancedWalletEnginesTab: React.FC<AdvancedWalletEnginesTabProps> = ({
  lang,
  onApplySeedToVault,
  currentSeedWords,
}) => {
  const [subTab, setSubTab] = useState<'bip85' | 'shamir'>('bip85');

  // --- BIP-85 State ---
  const [bip85MasterSeed, setBip85MasterSeed] = useState<string>(
    currentSeedWords && currentSeedWords.some(w => w) ? currentSeedWords.filter(Boolean).join(' ') : ''
  );
  const [bip85Passphrase, setBip85Passphrase] = useState<string>('');
  const [bip85ChildLength, setBip85ChildLength] = useState<12 | 18 | 24>(12);
  const [bip85Index, setBip85Index] = useState<number>(0);
  const [bip85Result, setBip85Result] = useState<Bip85ChildResult | null>(null);
  const [bip85Error, setBip85Error] = useState<string | null>(null);
  const [bip85Copied, setBip85Copied] = useState<boolean>(false);

  // --- Shamir State ---
  const [shamirSubMode, setShamirSubMode] = useState<'split' | 'combine'>('split');
  const [shamirInputSecret, setShamirInputSecret] = useState<string>(
    currentSeedWords && currentSeedWords.some(w => w) ? currentSeedWords.filter(Boolean).join(' ') : ''
  );
  const [shamirTotalShares, setShamirTotalShares] = useState<number>(3);
  const [shamirThreshold, setShamirThreshold] = useState<number>(2);
  const [generatedShares, setGeneratedShares] = useState<ShamirShare[]>([]);
  const [copiedShareIndex, setCopiedShareIndex] = useState<number | null>(null);

  // Combine state
  const [combineInput1, setCombineInput1] = useState<string>('');
  const [combineInput2, setCombineInput2] = useState<string>('');
  const [recoveredSecret, setRecoveredSecret] = useState<string | null>(null);
  const [shamirError, setShamirError] = useState<string | null>(null);

  // Derive BIP-85 Child
  const handleDeriveBip85 = async () => {
    setBip85Error(null);
    setBip85Result(null);

    const clean = bip85MasterSeed.trim();
    if (!clean) {
      setBip85Error(lang === 'th' ? 'กรุณากรอก Master Seed Phrase ต้นทาง' : 'Please enter master seed phrase');
      return;
    }

    const words = clean.split(/\s+/);
    if (![12, 15, 16, 18, 20, 21, 24].includes(words.length)) {
      setBip85Error(
        lang === 'th'
          ? `จำนวนคำของ Seed แม่ต้องเป็น 12, 15, 16, 18, 20, 21 หรือ 24 คำ (ปัจจุบันมี ${words.length} คำ)`
          : `Master seed length must be 12, 15, 16, 18, 20, 21, or 24 words (got ${words.length})`
      );
      return;
    }

    try {
      const res = await deriveBip85ChildMnemonic(clean, bip85ChildLength, bip85Index, bip85Passphrase);
      setBip85Result(res);
    } catch (err: any) {
      setBip85Error(err.message || 'BIP-85 derivation failed');
    }
  };

  const handleApplyBip85Child = () => {
    if (!bip85Result) return;
    onApplySeedToVault(bip85Result.childMnemonic, {
      wordCount: bip85ChildLength,
      accountName:
        lang === 'th'
          ? `BIP-85 Child #${bip85Index} (${bip85ChildLength} คำ)`
          : `BIP-85 Child #${bip85Index} (${bip85ChildLength}w)`,
      isBip85: true,
      bip85Index: bip85Index,
    });
  };

  // Generate Shamir Shares
  const handleGenerateShamir = async () => {
    setShamirError(null);
    setGeneratedShares([]);
    const clean = shamirInputSecret.trim();
    if (!clean) {
      setShamirError(lang === 'th' ? 'กรุณากรอก Seed Phrase หรือ Secret' : 'Please enter secret to split');
      return;
    }

    try {
      const shares = await splitSecretIntoShamirShares(clean, shamirTotalShares, shamirThreshold);
      setGeneratedShares(shares);
    } catch (err: any) {
      setShamirError(err.message || 'Shamir split failed');
    }
  };

  // Combine Shamir Shares
  const handleCombineShamir = async () => {
    setShamirError(null);
    setRecoveredSecret(null);

    const share1 = combineInput1.trim();
    const share2 = combineInput2.trim();

    if (!share1 || !share2) {
      setShamirError(
        lang === 'th'
          ? 'กรุณาระบุแผ่นสำรองอย่างน้อย 2 แผ่นเพื่อกู้คืน (2-of-3 Threshold)'
          : 'Please enter at least 2 shares to recover'
      );
      return;
    }

    try {
      const recovered = await combineShamirShares([share1, share2]);
      setRecoveredSecret(recovered);
    } catch (err: any) {
      setShamirError(err.message || 'Failed to combine shares');
    }
  };

  const handleApplyRecoveredSecret = () => {
    if (!recoveredSecret) return;
    const words = recoveredSecret.split(/\s+/);
    const count = (words.length in WORD_COUNT_PROFILES ? words.length : 12) as SupportedWordCount;
    onApplySeedToVault(words, {
      wordCount: count,
      accountName: lang === 'th' ? 'กระเป๋ากู้คืนจาก Shamir 20 คำ' : 'Recovered Shamir Vault',
      isShamir: true,
    });
  };

  const handleCopyText = (text: string, shareIdx?: number) => {
    navigator.clipboard.writeText(text);
    if (shareIdx !== undefined) {
      setCopiedShareIndex(shareIdx);
      setTimeout(() => setCopiedShareIndex(null), 2000);
    } else {
      setBip85Copied(true);
      setTimeout(() => setBip85Copied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub Mode Selector */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => setSubTab('bip85')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            subTab === 'bip85'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitFork className="w-4 h-4" />
          <span>{lang === 'th' ? 'BIP-85 คลอด Seed ลูก' : 'BIP-85 Child Seeds'}</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('shamir')}
          className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            subTab === 'shamir'
              ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>{lang === 'th' ? 'SLIP-0039 Shamir (20 คำ)' : 'SLIP-0039 Shamir'}</span>
        </button>
      </div>

      {/* BIP-85 Tab */}
      {subTab === 'bip85' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-200">
            <div className="font-bold flex items-center gap-1.5 text-emerald-300 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>{lang === 'th' ? 'BIP-85: ระบบคลอด Seed ลูก 2-3 ชั้น' : 'BIP-85 Deterministic Child Seeds'}</span>
            </div>
            <p className="text-[11px] text-emerald-100/80 leading-relaxed">
              {lang === 'th'
                ? 'ใช้ Seed แม่หลัก 1 ชุด คลอด Seed ลูกชุดใหม่ (12, 18, 24 คำ) ออกมาได้ไม่จำกัดแบบ Deterministic โดยหาก Seed ลูกถูกแฮก จะไม่สามารถคำนวณย้อนกลับมาหา Seed แม่ หรือ Seed ลูกคนอื่นได้เด็ดขาด'
                : 'Derive independent child mnemonics from one master seed. If a child seed is compromised, the master seed and sibling seeds remain 100% mathematically secure.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {lang === 'th' ? 'Seed Phrase แม่ (Master Mnemonic 12-24 คำ)' : 'Master Seed Phrase (12-24 words)'}
            </label>
            <textarea
              rows={2}
              value={bip85MasterSeed}
              onChange={(e) => setBip85MasterSeed(e.target.value)}
              placeholder={
                lang === 'th'
                  ? 'กรอกคำ Seed แม่หลักคั่นด้วยช่องว่าง...'
                  : 'Enter master seed phrase words separated by spaces...'
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                {lang === 'th' ? 'Passphrase เสริม (เกราะชั้นที่ 2)' : 'Optional Passphrase'}
              </label>
              <input
                type="password"
                value={bip85Passphrase}
                onChange={(e) => setBip85Passphrase(e.target.value)}
                placeholder="25th word salt..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                {lang === 'th' ? 'ขนาดคำ Seed ลูก' : 'Child Word Count'}
              </label>
              <div className="grid grid-cols-3 gap-1">
                {([12, 18, 24] as const).map((len) => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => setBip85ChildLength(len)}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      bip85ChildLength === len
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {len}w
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                {lang === 'th' ? 'ดัชนีลูก (Child Index)' : 'Child Index'}
              </label>
              <input
                type="number"
                min={0}
                max={999999}
                value={bip85Index}
                onChange={(e) => setBip85Index(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleDeriveBip85}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Sparkles className="w-4 h-4" />
            <span>{lang === 'th' ? 'คำนวณคลอด Seed ลูก (Derive BIP-85)' : 'Derive BIP-85 Child Seed'}</span>
          </button>

          {bip85Error && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{bip85Error}</span>
            </div>
          )}

          {bip85Result && (
            <div className="p-4 bg-slate-950 border border-emerald-500/40 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <div className="font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px]">
                    {bip85Result.derivationPath}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(bip85Result.childMnemonic.join(' '))}
                  className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center gap-1"
                >
                  {bip85Copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{bip85Copied ? 'Copied' : 'Copy Words'}</span>
                </button>
              </div>

              {/* Word Pills Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                {bip85Result.childMnemonic.map((w, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs font-mono text-slate-200 bg-slate-800/60 px-2 py-1 rounded-lg">
                    <span className="text-[10px] text-slate-500">{idx + 1}.</span>
                    <span className="font-bold text-emerald-300">{w}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Native SegWit: <span className="font-mono text-slate-200">{bip85Result.childReceiveAddress.slice(0, 14)}...</span></span>
                <span>Root FP: <span className="font-mono text-slate-200">{bip85Result.childFingerprint}</span></span>
              </div>

              <button
                type="button"
                onClick={handleApplyBip85Child}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
              >
                <span>{lang === 'th' ? 'นำ Seed ลูกนี้ไปซีลเป็นกระเป๋าใหม่ (Use Child Seed)' : 'Use Child Seed to Seal Vault'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Shamir (SLIP-0039) Tab */}
      {subTab === 'shamir' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-xs text-indigo-200">
            <div className="font-bold flex items-center gap-1.5 text-indigo-300 mb-1">
              <Share2 className="w-4 h-4" />
              <span>{lang === 'th' ? 'SLIP-0039: แบ่งความลับเป็น 20 คำ (2-of-3 Shamir)' : 'SLIP-0039 Shamir Secret Sharing'}</span>
            </div>
            <p className="text-[11px] text-indigo-100/80 leading-relaxed">
              {lang === 'th'
                ? 'แยก Seed Phrase ออกเป็นแผ่นสำรอง 20 คำ เช่น 3 แผ่น โดยต้องการเพียง 2 แผ่นใดก็ได้เพื่อนำมากู้คืนความลับต้นฉบับ ป้องกันกรณีแผ่นใดแผ่นหนึ่งสูญหายหรือถูกขโมย'
                : 'Split seed into 20-word distributed backup shares (e.g. 2-of-3 threshold). Any 2 shares can reconstruct the master secret.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setShamirSubMode('split')}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                shamirSubMode === 'split' ? 'bg-indigo-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'th' ? 'แบ่งแผ่นสำรอง 20 คำ (Split)' : 'Split into 20-Word Shares'}
            </button>
            <button
              type="button"
              onClick={() => setShamirSubMode('combine')}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                shamirSubMode === 'combine' ? 'bg-indigo-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'th' ? 'รวมแผ่นกู้คืน (Combine)' : 'Combine & Reconstruct'}
            </button>
          </div>

          {shamirSubMode === 'split' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'th' ? 'Seed Phrase หรือ Secret ที่ต้องการแบ่ง' : 'Seed Phrase or Secret to Split'}
                </label>
                <textarea
                  rows={2}
                  value={shamirInputSecret}
                  onChange={(e) => setShamirInputSecret(e.target.value)}
                  placeholder="Enter 12-24 word seed phrase to split..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'th' ? 'จำนวนแผ่นทั้งหมด (N Shares)' : 'Total Shares (N)'}
                  </label>
                  <select
                    value={shamirTotalShares}
                    onChange={(e) => setShamirTotalShares(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-200"
                  >
                    <option value={3}>3 Shares (แผ่น)</option>
                    <option value={5}>5 Shares (แผ่น)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {lang === 'th' ? 'เกณฑ์ขั้นต่ำในการกู้คืน (K Threshold)' : 'Threshold (K)'}
                  </label>
                  <select
                    value={shamirThreshold}
                    onChange={(e) => setShamirThreshold(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-200"
                  >
                    <option value={2}>2-of-N (ต้องการ 2 แผ่น)</option>
                    <option value={3} disabled={shamirTotalShares < 3}>3-of-N (ต้องการ 3 แผ่น)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateShamir}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Share2 className="w-4 h-4" />
                <span>{lang === 'th' ? `สร้างแผ่นสำรอง 20 คำ (${shamirThreshold}-of-${shamirTotalShares})` : `Generate ${shamirThreshold}-of-${shamirTotalShares} Shares`}</span>
              </button>

              {shamirError && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{shamirError}</span>
                </div>
              )}

              {generatedShares.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  {generatedShares.map((share) => (
                    <div key={share.index} className="p-3 bg-slate-950 border border-indigo-500/30 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-indigo-300">
                          {lang === 'th' ? `แผ่นที่ ${share.index} จาก ${share.totalShares}` : `Share #${share.index} of ${share.totalShares}`}
                          <span className="ml-2 text-[10px] font-normal text-slate-400">(Threshold: {share.threshold})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(share.mnemonicWords.join(' '), share.index)}
                          className="text-[11px] text-indigo-300 hover:text-indigo-200 flex items-center gap-1 font-semibold"
                        >
                          {copiedShareIndex === share.index ? <Check className="w-3.5 h-3.5 text-indigo-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedShareIndex === share.index ? 'คัดลอกแล้ว' : 'คัดลอก 20 คำ'}</span>
                        </button>
                      </div>
                      <div className="text-[11px] font-mono text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed break-words">
                        {share.mnemonicWords.join(' ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'th' ? 'แผ่นสำรองใบที่ 1 (20 คำ หรือ Share Hex)' : 'Share #1 (20 words or hex)'}
                </label>
                <textarea
                  rows={2}
                  value={combineInput1}
                  onChange={(e) => setCombineInput1(e.target.value)}
                  placeholder="Paste 20 words of Share 1..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'th' ? 'แผ่นสำรองใบที่ 2 (20 คำ หรือ Share Hex)' : 'Share #2 (20 words or hex)'}
                </label>
                <textarea
                  rows={2}
                  value={combineInput2}
                  onChange={(e) => setCombineInput2(e.target.value)}
                  placeholder="Paste 20 words of Share 2..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              <button
                type="button"
                onClick={handleCombineShamir}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Lock className="w-4 h-4" />
                <span>{lang === 'th' ? 'รวมแผ่นเพื่อกู้คืน Secret ต้นฉบับ' : 'Combine Shares to Recover Secret'}</span>
              </button>

              {shamirError && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{shamirError}</span>
                </div>
              )}

              {recoveredSecret && (
                <div className="p-4 bg-slate-950 border border-indigo-500/40 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{lang === 'th' ? 'กู้คืน Secret ต้นฉบับสำเร็จ!' : 'Secret Successfully Reconstructed!'}</span>
                  </div>
                  <div className="text-xs font-mono text-emerald-300 bg-slate-900/90 p-3 rounded-xl border border-slate-800 break-words">
                    {recoveredSecret}
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyRecoveredSecret}
                    className="w-full py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                  >
                    <span>{lang === 'th' ? 'นำไปสร้างกระเป๋าใหม่ (Import Recovered Secret)' : 'Seal Recovered Secret into Vault'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
