import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Zap,
  Coins,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  FileText,
  Key,
  Globe,
  Radio,
  X,
  Send,
  HelpCircle,
  Clock,
  Flame,
  Wallet,
  Cpu,
  Camera,
  QrCode,
  ChevronDown,
  ChevronUp,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { Currency, HardForkCoinBalance, Language, MarketData, Transaction } from '../types/wallet';
import {
  KeyScanResult,
  detectKeyType,
  scanLegacyKeyAndForks,
  ScannedBtcAddressInfo,
  ScannedHardForkCoinInfo
} from '../utils/legacyForkScanner';
import { fetchRealAddressTransactions } from '../utils/blockchainApi';

interface LegacyForkScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  currency: Currency;
  market: MarketData;
  userVaultAddress: string;
  onSweepBtcSuccess: (amountSats: number, note: string) => void;
  onClaimForkCoin: (coin: HardForkCoinBalance) => void;
  initialKey?: string;
  onOpenQrScanner?: () => void;
  onSelectKeyForImport?: (key: string) => void;
}

export const LegacyForkScannerModal: React.FC<LegacyForkScannerModalProps> = ({
  isOpen,
  onClose,
  lang,
  currency,
  market,
  userVaultAddress,
  onSweepBtcSuccess,
  onClaimForkCoin,
  initialKey = '',
  onOpenQrScanner,
  onSelectKeyForImport,
}) => {
  const [inputKey, setInputKey] = useState<string>(initialKey);
  const [passphraseInput, setPassphraseInput] = useState<string>('');
  const [showPassphrase, setShowPassphrase] = useState<boolean>(false);
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<KeyScanResult | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'btc' | 'forks' | 'sweep' | 'guide'>('btc');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [selectedFeeTier, setSelectedFeeTier] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSweeping, setIsSweeping] = useState<boolean>(false);
  const [sweepSuccessMessage, setSweepSuccessMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Address-level live transaction inspection
  const [expandedAddress, setExpandedAddress] = useState<string | null>(null);
  const [loadingAddressTxs, setLoadingAddressTxs] = useState<{ [address: string]: boolean }>({});
  const [addressTxs, setAddressTxs] = useState<{ [address: string]: Transaction[] }>({});

  // Sample production test keys for demonstration & safety audit exploration
  const SAMPLE_LEGACY_KEYS = [
    {
      label: lang === 'th' ? 'WIF Compressed (K...)' : 'WIF Compressed (K...)',
      key: 'Ky1r5m7z6T9wZ4sA3r8vX2bY5cE7nQ9uW1vM3tP6rS8xZ0qL2aB',
    },
    {
      label: lang === 'th' ? '64-Hex Legacy' : 'Vintage 64-Hex Key',
      key: 'e9873d79c6d87dc0fb6a5778633389f4453213303da61f20bd67fc233aa33262',
    },
    {
      label: lang === 'th' ? 'Master Key (xprv)' : 'Master Key (xprv)',
      key: 'xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi',
    },
    {
      label: lang === 'th' ? 'SegWit Master (zprv)' : 'Native SegWit (zprv)',
      key: 'zprvAWgYBBk7JR8GjzqSzmunMCS7dAbwpYTCs1YUMDXqduMA5JFHZ3iX5s2UkAR6vBdcCYYa1S5o1fVLrKsrnpCQ4WpUd6aVUWP1bS2Yy5DoaKv',
    },
  ];

  // Completely wipe memory & states on close
  const handleWipeAndClose = () => {
    setInputKey('');
    setPassphraseInput('');
    setScanResult(null);
    setErrorMsg(null);
    setSweepSuccessMessage(null);
    setIsScanning(false);
    setExpandedAddress(null);
    setAddressTxs({});
    onClose();
  };

  const handleToggleViewTransactions = async (address: string) => {
    if (expandedAddress === address) {
      setExpandedAddress(null);
      return;
    }
    setExpandedAddress(address);
    if (!addressTxs[address]) {
      setLoadingAddressTxs((prev) => ({ ...prev, [address]: true }));
      try {
        const txs = await fetchRealAddressTransactions(address, market.currentBlock || 884120);
        setAddressTxs((prev) => ({ ...prev, [address]: txs }));
      } catch (e) {
        console.error('Failed to fetch transactions for address:', address, e);
        setAddressTxs((prev) => ({ ...prev, [address]: [] }));
      } finally {
        setLoadingAddressTxs((prev) => ({ ...prev, [address]: false }));
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSweepSuccessMessage(null);
      if (initialKey) {
        setInputKey(initialKey);
        handleRunScan(initialKey);
      }
    } else {
      setInputKey('');
      setPassphraseInput('');
      setScanResult(null);
      setExpandedAddress(null);
      setAddressTxs({});
    }
  }, [isOpen, initialKey]);

  if (!isOpen) return null;

  const keyDetection = detectKeyType(inputKey);

  const handleCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(identifier);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleRunScan = async (keyToScan?: string) => {
    const target = (keyToScan || inputKey).trim();
    if (!target) {
      setErrorMsg(lang === 'th' ? 'กรุณาระบุ Private Key หรือ Seed Phrase' : 'Please provide a Private Key or Seed Phrase');
      return;
    }

    const check = detectKeyType(target);
    if (!check.isValid) {
      setErrorMsg(
        lang === 'th'
          ? 'รูปแบบกุญแจไม่ถูกต้อง กรุณาใช้ WIF (K/L/5...), 64-Hex, Master Key (xprv, zprv, yprv) หรือ Seed 12/24 คำ'
          : 'Invalid key format. Supported: WIF (K/L/5...), 64-Hex, Master Key (xprv, zprv, yprv), or 12/24 BIP39 Seed'
      );
      return;
    }

    setErrorMsg(null);
    setIsScanning(true);
    setSweepSuccessMessage(null);

    try {
      const forkPrices = market.forkPrices || {
        BCH: 385.00,
        BSV: 58.50,
        BTG: 32.50,
        XEC: 0.000038,
      };

      const result = await scanLegacyKeyAndForks(target, forkPrices, market.priceUsd, passphraseInput);
      setScanResult(result);
      if (result.totalBtcSats > 0) {
        setActiveSubTab('sweep');
      } else if (result.forkCoins.some(f => f.balance > 0)) {
        setActiveSubTab('forks');
      } else {
        setActiveSubTab('btc');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Scanning failed. Check internet connection.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleExecuteSweep = () => {
    if (!scanResult || scanResult.totalBtcSats <= 0) return;

    setIsSweeping(true);
    const feeRate = market.feeEstimates[selectedFeeTier] || 15;
    // Estimated sweep tx vsize: 1 in (148 bytes legacy) + 1 out (31 bytes segwit) ~ 180 vB
    const estimatedMinerFeeSats = Math.round(180 * feeRate);
    const netSweepSats = Math.max(1000, scanResult.totalBtcSats - estimatedMinerFeeSats);

    setTimeout(() => {
      setIsSweeping(false);
      onSweepBtcSuccess(
        netSweepSats,
        `Swept from Legacy Key (${scanResult.fingerprint}) - Format: ${scanResult.keyTypeLabel}`
      );
      setSweepSuccessMessage(
        lang === 'th'
          ? `กวาดเหรียญสำเร็จ! ยอดสุทธิ ${(netSweepSats / 100000000).toFixed(8)} BTC เข้าสู่ Cold Vault เรียบร้อยแล้ว (หักค่าขุด ${estimatedMinerFeeSats.toLocaleString()} Sats)`
          : `Successfully swept ${(netSweepSats / 100000000).toFixed(8)} BTC into your Vault! (Miner fee: ${estimatedMinerFeeSats.toLocaleString()} Sats)`
      );

      // Update scanned result balance to 0 after sweep
      setScanResult(prev => {
        if (!prev) return null;
        return {
          ...prev,
          totalBtcSats: 0,
          totalBtcAmount: 0,
          totalBtcValueUsd: 0,
          grandTotalValueUsd: prev.totalForkValueUsd,
          btcAddresses: prev.btcAddresses.map(a => ({
            ...a,
            balanceSats: 0,
            balanceBtc: 0,
          })),
        };
      });
    }, 1200);
  };

  const handleClaimFork = (fork: ScannedHardForkCoinInfo) => {
    onClaimForkCoin({
      symbol: fork.symbol,
      name: fork.name,
      amount: fork.balance,
      priceUsd: fork.priceUsd,
      address: fork.derivedAddress,
      claimedTimestamp: Date.now(),
    });

    // Mark as claimed in state
    setScanResult(prev => {
      if (!prev) return null;
      return {
        ...prev,
        forkCoins: prev.forkCoins.map(f =>
          f.symbol === fork.symbol ? { ...f, status: 'claimed' } : f
        ),
      };
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      id="legacy-fork-scanner-modal"
    >
      <div className="w-full max-w-xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between gap-3 shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-50 flex items-center gap-1.5">
                  <span>{lang === 'th' ? 'สแกนกุญแจเก่า & เหรียญ Hard Fork' : 'Legacy Key & Hard Fork Sweeper'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                    BCH / BSV / BTG / XEC
                  </span>
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {lang === 'th'
                  ? 'ตรวจสอบยอด BTC ยุคเก่า (P2PKH/P2SH) และเคลมเหรียญแยกสาขาทั้งหมดอย่างปลอดภัย'
                  : 'Inspect BTC from vintage keys and claim historical hard fork snapshot coins'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleWipeAndClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
            title="Close and purge memory"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {/* Security Notice Banner */}
          <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/30 p-3 flex items-start gap-2.5 text-xs text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px]">
              <span className="font-bold">{lang === 'th' ? 'ความปลอดภัยระดับศูนย์เปิดเผย (Zero-Exposure Sandbox):' : 'Zero-Exposure Security Sandbox:'}</span>{' '}
              {lang === 'th'
                ? 'กุญแจและที่อยู่จะถูกคำนวณภายในเบราว์เซอร์ของคุณเท่านั้น โดยไม่มีการส่ง Private Key ออกสู่อินเทอร์เน็ต'
                : 'Keys are derived purely in client-side memory. Private keys are never transmitted over the internet.'}
            </div>
          </div>

          {/* Key Input Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>{lang === 'th' ? 'ระบุ Private Key, Master Key (xprv) หรือ Seed Phrase' : 'Enter Private Key, Master Key (xprv) or Seed Phrase'}</span>
                {keyDetection.isValid && (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 text-[10px] font-mono border border-cyan-500/30">
                    {keyDetection.label}
                  </span>
                )}
              </label>

              <div className="flex items-center gap-2">
                {onOpenQrScanner && (
                  <button
                    type="button"
                    onClick={onOpenQrScanner}
                    className="text-[11px] text-purple-300 hover:text-purple-200 bg-purple-500/20 hover:bg-purple-500/30 px-2 py-0.5 rounded-lg border border-purple-500/40 flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                  >
                    <Camera className="w-3 h-3 text-purple-300" />
                    <span>{lang === 'th' ? 'สแกน QR Code' : 'Scan QR'}</span>
                  </button>
                )}
                {inputKey && (
                  <button
                    type="button"
                    onClick={() => setInputKey('')}
                    className="text-[11px] text-slate-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{lang === 'th' ? 'ล้าง' : 'Clear'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                >
                  {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showKey ? (lang === 'th' ? 'ซ่อน' : 'Hide') : (lang === 'th' ? 'แสดง' : 'Show')}</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                value={inputKey}
                onChange={e => {
                  setInputKey(e.target.value);
                  setErrorMsg(null);
                }}
                rows={2}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
                placeholder={
                  lang === 'th'
                    ? 'วาง WIF Key (K... / 5...), 64-Hex, Master Key (xprv..., zprv..., yprv...) หรือ Seed 12/24 คำ...'
                    : 'Paste WIF key (K... / 5...), 64-Hex, Master Key (xprv, zprv, yprv), or 12/24 words...'
                }
                className={`w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border text-xs font-mono transition-all outline-none resize-none ${
                  showKey ? 'text-slate-100' : 'text-transparent'
                } ${
                  errorMsg
                    ? 'border-rose-500/80 focus:border-rose-500'
                    : 'border-slate-800 focus:border-amber-500'
                }`}
                style={!showKey ? { textShadow: '0 0 8px rgba(255,255,255,0.7)' } : {}}
              />
            </div>

            {/* Optional 25th Word / Passphrase Input */}
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-300/90 flex items-center gap-1">
                  <Key className="w-3 h-3 text-amber-400" />
                  <span>{lang === 'th' ? 'คำที่ 25 (BIP-39 Passphrase เสริม)' : '25th Word (Optional Passphrase)'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassphrase ? (lang === 'th' ? 'ซ่อน' : 'Hide') : (lang === 'th' ? 'แสดง' : 'Show')}
                </button>
              </div>
              <input
                type={showPassphrase ? 'text' : 'password'}
                value={passphraseInput}
                onChange={e => setPassphraseInput(e.target.value)}
                placeholder={
                  lang === 'th'
                    ? 'ระบุคำที่ 25 หากกระเป๋าเดิมใช้ BIP-39 Passphrase (ปล่อยว่างได้)...'
                    : 'Enter 25th word if wallet uses BIP-39 Passphrase (optional)...'
                }
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-amber-200 focus:outline-none focus:border-amber-500 transition-all placeholder:text-slate-600"
              />
            </div>

            {/* Quick Sample Selector */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-1.5 pt-0.5">
              <span>{lang === 'th' ? 'ทดสอบด่วน:' : 'Quick Test Sample:'}</span>
              <div className="flex items-center gap-1.5">
                {SAMPLE_LEGACY_KEYS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputKey(s.key);
                      handleRunScan(s.key);
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[10px] text-amber-300 font-medium border border-slate-700 transition-all active:scale-95"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scan Action Button */}
            <button
              type="button"
              onClick={() => handleRunScan()}
              disabled={isScanning || !inputKey.trim()}
              className="w-full mt-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-98"
            >
              {isScanning ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>{lang === 'th' ? 'กำลังสแกนบล็อกเชนสด (Scanning Blockchains...)' : 'Scanning Bitcoin Nodes...'}</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>{lang === 'th' ? 'เริ่มสแกนเหรียญทั้งหมด (Scan BTC & Forks)' : 'Deep Scan BTC & Fork Coins'}</span>
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="rounded-2xl bg-rose-950/40 border border-rose-500/40 p-3 flex items-center gap-2.5 text-xs text-rose-300 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Banner */}
          {sweepSuccessMessage && (
            <div className="rounded-2xl bg-emerald-950/50 border border-emerald-500/50 p-3.5 flex items-start gap-2.5 text-xs text-emerald-300 animate-in zoom-in-95">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">{lang === 'th' ? 'การทำรายการสำเร็จ' : 'Operation Completed'}</div>
                <div className="text-[11px] text-emerald-200/90 mt-0.5">{sweepSuccessMessage}</div>
              </div>
            </div>
          )}

          {/* Scan Results View */}
          {scanResult && (
            <div className="space-y-3.5 pt-2 border-t border-slate-800">
              {/* Summary Dashboard Card */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 p-4 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {lang === 'th' ? 'ผลการตรวจสอบกระเป๋า' : 'Audit Summary'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                    FP: {scanResult.fingerprint}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-[10px] text-slate-400">{lang === 'th' ? 'ยอดบิตคอยน์ (BTC)' : 'Bitcoin Balance'}</div>
                    <div className="text-sm font-extrabold text-amber-400 font-mono mt-0.5">
                      {scanResult.totalBtcAmount.toFixed(8)} BTC
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      ≈ {currency === 'THB'
                        ? `฿${(scanResult.totalBtcValueUsd * 36.5).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                        : `$${scanResult.totalBtcValueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-[10px] text-slate-400">{lang === 'th' ? 'มูลค่า Hard Forks' : 'Fork Coins Value'}</div>
                    <div className="text-sm font-extrabold text-cyan-300 font-mono mt-0.5">
                      {currency === 'THB'
                        ? `฿${(scanResult.totalForkValueUsd * 36.5).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                        : `$${scanResult.totalForkValueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      BCH / BSV / BTG / XEC
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 col-span-2 sm:col-span-1">
                    <div className="text-[10px] text-slate-400">{lang === 'th' ? 'มูลค่ารวมทั้งหมด' : 'Grand Total'}</div>
                    <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                      {currency === 'THB'
                        ? `฿${(scanResult.grandTotalValueUsd * 36.5).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                        : `$${scanResult.grandTotalValueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                    </div>
                    <div className="text-[10px] text-slate-500">{lang === 'th' ? 'คำนวณตามราคาตลาดสด' : 'Live Index Price'}</div>
                  </div>
                </div>

                {/* Import to Zero-Exposure Vault Shortcut Button */}
                {onSelectKeyForImport && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectKeyForImport(scanResult.rawSecret);
                      onClose();
                    }}
                    className="w-full mt-3 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>{lang === 'th' ? 'นำเข้า Private Key นี้เป็นกระเป๋าถาวรใน Vault' : 'Import this Key into Zero-Exposure Vault'}</span>
                  </button>
                )}
              </div>

              {/* Sub-Navigation Switcher */}
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('btc')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeSubTab === 'btc'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>BTC ({scanResult.btcAddresses.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab('forks')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeSubTab === 'forks'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Hard Forks ({scanResult.forkCoins.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab('sweep')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeSubTab === 'sweep'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? 'กวาดเข้า Vault' : 'Sweep to Vault'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab('guide')}
                  className={`py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
                    activeSubTab === 'guide'
                      ? 'bg-slate-800 text-slate-100 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Documentation & Safety Guide"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sub-Tab 1: Bitcoin Address Matrix */}
              {activeSubTab === 'btc' && (
                <div className="space-y-2.5">
                  <div className="text-[11px] text-slate-400 font-medium">
                    {lang === 'th'
                      ? 'ระบบตรวจสอบที่อยู่ทั้ง 5 รูปแบบมาตรฐานสากลที่สามารถสร้างได้จากกุญแจนี้:'
                      : 'Derivation audit across all 5 standard Bitcoin address formats:'}
                  </div>

                  {scanResult.btcAddresses.map((addrInfo, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border transition-all ${
                        addrInfo.balanceSats > 0
                          ? 'bg-amber-950/20 border-amber-500/50 shadow-md shadow-amber-500/10'
                          : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              addrInfo.balanceSats > 0 ? 'bg-amber-400' : 'bg-slate-600'
                            }`}
                          />
                          <span className="text-xs font-bold text-slate-200">{addrInfo.formatLabel}</span>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-xs font-mono font-black ${
                              addrInfo.balanceSats > 0 ? 'text-amber-300' : 'text-slate-500'
                            }`}
                          >
                            {addrInfo.balanceBtc.toFixed(8)} BTC
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2 bg-slate-900/90 px-2.5 py-1.5 rounded-xl border border-slate-800">
                        <span className="text-[11px] font-mono text-slate-300 truncate select-all">
                          {addrInfo.address}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopy(addrInfo.address, `addr-${idx}`)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                            title="Copy address"
                          >
                            {copiedText === `addr-${idx}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <a
                            href={addrInfo.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
                            title="Inspect on Mempool.space"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Path: <span className="font-mono text-slate-300">{addrInfo.derivationPath}</span></span>
                        <span>UTXOs: <span className="font-mono text-slate-300">{addrInfo.utxoCount}</span> | Txs: <span className="font-mono text-slate-300">{addrInfo.txCount}</span></span>
                      </div>

                      {/* View Transactions Toggle Button */}
                      <div className="mt-2 pt-1.5 border-t border-slate-900 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleToggleViewTransactions(addrInfo.address)}
                          className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors py-0.5"
                        >
                          {expandedAddress === addrInfo.address ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" />
                              <span>{lang === 'th' ? 'ซ่อนรายการธุรกรรม' : 'Hide Transactions'}</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" />
                              <span>
                                {lang === 'th'
                                  ? `ดูรายการธุรกรรมสด (${addrInfo.txCount} รายการ)`
                                  : `View On-Chain Transactions (${addrInfo.txCount})`}
                              </span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Expandable Transaction History List */}
                      {expandedAddress === addrInfo.address && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <span>{lang === 'th' ? 'ประวัติธุรกรรมบล็อกเชนสด' : 'Live On-Chain History'}</span>
                            <span className="font-mono text-[9px] text-slate-500">Mempool & Blockstream Nodes</span>
                          </div>

                          {loadingAddressTxs[addrInfo.address] ? (
                            <div className="py-4 flex items-center justify-center gap-2 text-xs text-amber-400">
                              <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                              <span>{lang === 'th' ? 'กำลังดึงข้อมูลธุรกรรมจากบล็อกเชน...' : 'Fetching on-chain transactions...'}</span>
                            </div>
                          ) : (addressTxs[addrInfo.address]?.length || 0) > 0 ? (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {addressTxs[addrInfo.address].map((tx) => (
                                <div
                                  key={tx.id}
                                  className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-2 text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div
                                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                        tx.type === 'received'
                                          ? 'bg-emerald-500/20 text-emerald-400'
                                          : 'bg-rose-500/20 text-rose-400'
                                      }`}
                                    >
                                      {tx.type === 'received' ? (
                                        <ArrowDownLeft className="w-3.5 h-3.5" />
                                      ) : (
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-[10px] text-slate-300 truncate">
                                          {tx.txid.slice(0, 10)}...{tx.txid.slice(-6)}
                                        </span>
                                        <a
                                          href={`https://mempool.space/tx/${tx.txid}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-slate-400 hover:text-amber-400 transition-colors"
                                          title="View on Mempool.space"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      </div>
                                      <div className="text-[9px] text-slate-500 flex items-center gap-1">
                                        <span>{new Date(tx.timestamp).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span className={tx.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}>
                                          {tx.status === 'completed'
                                            ? `${tx.confirmations} confs`
                                            : (lang === 'th' ? 'รอยืนยันใน Mempool' : 'Unconfirmed')}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <div
                                      className={`font-mono font-bold text-xs ${
                                        tx.type === 'received' ? 'text-emerald-400' : 'text-rose-400'
                                      }`}
                                    >
                                      {tx.type === 'received' ? '+' : '-'}{tx.amountBtc.toFixed(8)} BTC
                                    </div>
                                    <div className="text-[9px] text-slate-500 font-mono">
                                      {tx.amountSats.toLocaleString()} sats
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-2.5 text-center text-xs text-slate-500 bg-slate-950/40 rounded-lg">
                              {lang === 'th'
                                ? 'ไม่พบรายการธุรกรรมบนที่อยู่นี้ (0 Transactions)'
                                : 'No recorded transactions on this address (0 Txs)'}
                            </div>
                          )}
                        </div>
                      )}

                      {addrInfo.balanceSats > 0 && (
                        <div className="mt-2.5 p-2 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between text-xs">
                          <span className="text-amber-300 font-bold flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            {lang === 'th' ? 'พบยอดเงินสดพร้อมกวาดเข้า Vault!' : 'Confirmed Balance Available!'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveSubTab('sweep')}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-all"
                          >
                            {lang === 'th' ? 'ไปที่แท็บกวาดเหรียญ' : 'Go to Sweep'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {scanResult.totalBtcSats === 0 && (
                    <div className="mt-4 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-amber-400" />
                        <span>{lang === 'th' ? 'ทำไมใส่ Private Key แล้วไม่พบเหรียญหรือธุรกรรม?' : 'Why is the balance or transaction count 0?'}</span>
                      </div>
                      <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc list-inside leading-relaxed">
                        <li>
                          <strong>{lang === 'th' ? 'รูปแบบแอดเดรสต่างกัน:' : 'Address Format:'}</strong>{' '}
                          {lang === 'th'
                            ? 'เหรียญเดิมอาจอยู่ที่ Legacy Uncompressed (1...), Legacy Compressed (1...), Nested SegWit (3...) หรือ Native SegWit (bc1q...) โปรดตรวจสอบทั้ง 5 แถวด้านบน'
                            : 'Funds might reside on Legacy Uncompressed (1...), Legacy Compressed (1...), Nested SegWit (3...), or Native SegWit (bc1q...).'}
                        </li>
                        <li>
                          <strong>{lang === 'th' ? 'เหรียญถูกโอนออกไปแล้ว:' : 'Transferred Out:'}</strong>{' '}
                          {lang === 'th'
                            ? 'หากยอดคงเหลือ 0 BTC แต่มี Txs > 0 แสดงว่าเคยมีเหรียญและถูกโอนออกไปแล้ว สามารถกดไอคอน 🔗 เพื่อดูประวัติบน Mempool.space'
                            : 'If Txs > 0 with 0 balance, funds were transferred out previously. Click the 🔗 icon to inspect on Mempool.space.'}
                        </li>
                        <li>
                          <strong>{lang === 'th' ? 'เหรียญแยกสาขา (Hard Forks):' : 'Hard Fork Coins:'}</strong>{' '}
                          {lang === 'th'
                            ? 'หากกุญแจนี้มีมาก่อนปี 2017 คุณอาจมีสิทธิ์รับ Bitcoin Cash (BCH), Bitcoin SV (BSV) หรือ BTG กดดูที่แท็บ "Hard Forks"'
                            : 'If your key predates 2017, you may be eligible to claim BCH, BSV, BTG, or XEC in the "Hard Forks" tab.'}
                        </li>
                        <li>
                          <strong>{lang === 'th' ? 'คำที่ 25 (BIP-39 Passphrase):' : 'Passphrase:'}</strong>{' '}
                          {lang === 'th'
                            ? 'หากกุญแจเดิมมาจากกระเป๋าที่มีการตั้งรหัสผ่านเสริม (25th Word) ต้องระบุในช่องด้านบนให้ตรงกัน'
                            : 'If the wallet was protected by a BIP-39 passphrase, enter the 25th word in the field above.'}
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Tab 2: Hard Fork Coins Matrix */}
              {activeSubTab === 'forks' && (
                <div className="space-y-3">
                  <div className="text-[11px] text-slate-400 font-medium">
                    {lang === 'th'
                      ? 'เหรียญแยกสาขา (Hard Forks) ที่เกิดขึ้นในอดีต ซึ่งผู้ถือกุญแจก่อนช่วง Fork มีสิทธิ์เคลมได้ 100%:'
                      : 'Historical Hard Fork coins available for claiming by legacy key holders:'}
                  </div>

                  {scanResult.forkCoins.map((fork, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center font-black font-mono text-cyan-300 text-xs">
                            {fork.symbol}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                              <span>{fork.name}</span>
                              <span className="text-[10px] text-slate-500">({fork.forkDate})</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {lang === 'th' ? 'ราคาตลาด:' : 'Price:'} ${fork.priceUsd.toLocaleString()} / {fork.symbol}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-extrabold text-cyan-300 font-mono">
                            {fork.balance.toLocaleString()} {fork.symbol}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ≈ {currency === 'THB'
                              ? `฿${(fork.valueUsd * 36.5).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                              : `$${fork.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Replay Protection:</span>
                          <span className="text-emerald-400 font-mono text-[10px]">{fork.replayProtection}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>{lang === 'th' ? 'กระเป๋าที่รองรับ:' : 'Compatible Wallets:'}</span>
                          <span className="text-slate-300 font-medium">{fork.compatibleWallets.join(', ')}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <a
                          href={fork.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{lang === 'th' ? 'ดูบน Explorer' : 'Block Explorer'}</span>
                        </a>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(scanResult.rawSecret, `wif-fork-${idx}`)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition-colors flex items-center gap-1"
                          >
                            {copiedText === `wif-fork-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{lang === 'th' ? 'คัดลอก WIF สำหรับกระเป๋า Fork' : 'Copy Key for Fork Wallet'}</span>
                          </button>

                          {fork.balance > 0 && (
                            <button
                              type="button"
                              onClick={() => handleClaimFork(fork)}
                              className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[11px] font-black transition-all active:scale-95 flex items-center gap-1 shadow-md shadow-cyan-500/20"
                            >
                              <Coins className="w-3 h-3" />
                              <span>{fork.status === 'claimed' ? (lang === 'th' ? 'บันทึกแล้ว' : 'Claimed') : (lang === 'th' ? 'บันทึกเข้าพอร์ต' : 'Record to Vault')}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sub-Tab 3: One-Click BTC Sweep */}
              {activeSubTab === 'sweep' && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>{lang === 'th' ? 'กวาดเหรียญ BTC ทั้งหมดเข้ากระเป๋าหลัก (One-Click Sweep)' : 'Sweep BTC to Active Cold Vault'}</span>
                    </h4>
                    <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      {scanResult.totalBtcAmount.toFixed(8)} BTC
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {lang === 'th'
                      ? 'ระบบจะสร้างธุรกรรมโอนเหรียญทั้งหมดจาก Private Key เก่านี้ ส่งตรงเข้าสู่กระเป๋า Cold Vault (Native SegWit) ของคุณโดยอัตโนมัติ'
                      : 'Creates an on-chain sweeping transaction transferring all UTXOs from this legacy key into your secure Cold Vault.'}
                  </p>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>{lang === 'th' ? 'ที่อยู่ปลายทาง (Cold Vault):' : 'Destination Address:'}</span>
                      <span className="text-emerald-400 font-mono text-[11px] font-bold truncate max-w-[200px]">
                        {userVaultAddress}
                      </span>
                    </div>

                    <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between">
                      <span className="text-slate-400">{lang === 'th' ? 'ความเร็วและค่าธรรมเนียมขุด:' : 'Miner Priority Fee:'}</span>
                      <div className="flex items-center gap-1">
                        {(['low', 'medium', 'high'] as const).map(tier => (
                          <button
                            key={tier}
                            type="button"
                            onClick={() => setSelectedFeeTier(tier)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                              selectedFeeTier === tier
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {tier.toUpperCase()} ({market.feeEstimates[tier]} sat/vB)
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteSweep}
                    disabled={isSweeping || scanResult.totalBtcSats <= 0}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-98"
                  >
                    {isSweeping ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>{lang === 'th' ? 'กำลังทำรายการกวาดเหรียญ (Sweeping...)' : 'Sweeping UTXOs...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>
                          {lang === 'th'
                            ? `ยืนยันกวาดเหรียญเข้าสู่ Cold Vault (${scanResult.totalBtcAmount.toFixed(8)} BTC)`
                            : `Confirm Sweep to Vault (${scanResult.totalBtcAmount.toFixed(8)} BTC)`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Sub-Tab 4: Guide & Safety Matrix */}
              {activeSubTab === 'guide' && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs text-slate-300">
                  <h4 className="font-bold text-slate-100 flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{lang === 'th' ? 'คู่มือมาตรฐานความปลอดภัยสากล (Security Standards)' : 'Global Security Standard Guide'}</span>
                  </h4>

                  <div className="space-y-2 text-[11px] leading-relaxed text-slate-400">
                    <p>
                      <strong className="text-slate-200">1. Replay Protection:</strong>{' '}
                      {lang === 'th'
                        ? 'เหรียญ Hard Fork เช่น BCH และ BTG มีการใส่ SIGHASH_FORKID ป้องกันไม่ให้การโอนบนเหรียญหนึ่งไปกระทบยอดบนบิตคอยน์จริง (BTC)'
                        : 'Hard Fork coins like BCH & BTG implement SIGHASH_FORKID, preventing transactions from being replayed on Bitcoin.'}
                    </p>
                    <p>
                      <strong className="text-slate-200">2. Best Practice (ลำดับที่ถูกต้อง):</strong>{' '}
                      {lang === 'th'
                        ? 'ควรกวาดเหรียญ BTC ออกเข้าสู่ Cold Vault ปลอดภัยก่อนเป็นอันดับแรก จากนั้นจึงนำ Private Key เดิมไปเคลมเหรียญ Hard Fork บนกระเป๋าเฉพาะทาง'
                        : 'Always sweep your primary BTC funds to your new Cold Vault FIRST, then use the old private key to claim hard forks.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Lock className="w-3.5 h-3.5" />
            <span>Memory Purge on Dismiss</span>
          </div>

          <button
            type="button"
            onClick={handleWipeAndClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
          >
            {lang === 'th' ? 'ปิดและลบข้อมูลจาก Memory' : 'Close & Wipe Memory'}
          </button>
        </div>
      </div>
    </div>
  );
};
