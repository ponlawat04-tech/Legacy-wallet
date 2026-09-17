import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Sparkles,
  Zap,
  Info,
  QrCode,
  Fingerprint,
  RefreshCw,
  Copy,
  Check,
  Snowflake
} from 'lucide-react';
import { Currency, Language, MarketData, SecuritySettings, Transaction, WalletAccount } from '../types/wallet';
import { formatBtc, formatFiat, formatSats } from '../utils/mockMarket';
import { deriveAllBtcVariantsFromSecret } from '../utils/bitcoinKeyEngine';
import {
  UtxoItem,
  fetchOrDeriveUtxos,
  calculateConsolidationEconomics,
  createBatchConsolidationPSBTPayload
} from '../utils/utxoConsolidation';
import { validateBitcoinAddress } from '../utils/cryptoVault';

interface BatchConsolidationHelperProps {
  account: WalletAccount;
  market: MarketData;
  currency: Currency;
  lang: Language;
  onOpenPinModal: (action: () => void) => void;
  onSendSuccess: (tx: Transaction) => void;
  security?: SecuritySettings;
  onClose?: () => void;
}

export const BatchConsolidationHelper: React.FC<BatchConsolidationHelperProps> = ({
  account,
  market,
  currency,
  lang,
  onOpenPinModal,
  onSendSuccess,
  security,
  onClose
}) => {
  const [utxos, setUtxos] = useState<UtxoItem[]>([]);
  const [selectedUtxoIds, setSelectedUtxoIds] = useState<Set<string>>(new Set());
  const [isLoadingUtxos, setIsLoadingUtxos] = useState<boolean>(true);

  // Fee selection - defaults to LOW-PRIORITY fee rate as requested
  const lowFeeRate = Math.max(1, market.feeEstimates?.low || 3);
  const [selectedFeeRate, setSelectedFeeRate] = useState<number>(lowFeeRate);
  const [feeRateOption, setFeeRateOption] = useState<'low' | 'economy' | 'custom'>('low');
  const [customFeeRate, setCustomFeeRate] = useState<number>(lowFeeRate);

  // Target clean address
  const userVariants = useMemo(() => {
    const secret = account.publicKey || account.address;
    return deriveAllBtcVariantsFromSecret(secret);
  }, [account.publicKey, account.address]);

  const [targetAddress, setTargetAddress] = useState<string>(userVariants.nativeSegwit || account.address);
  const [targetFormatType, setTargetFormatType] = useState<'P2WPKH' | 'P2TR' | 'P2SH' | 'P2PKH'>('P2WPKH');
  const [isCustomTarget, setIsCustomTarget] = useState<boolean>(false);
  const [customTargetInput, setCustomTargetInput] = useState<string>('');

  // PSBT Modal
  const [psbtModal, setPsbtModal] = useState<{ psbtBase64: string; txidHex: string; summary: string } | null>(null);
  const [copiedPsbt, setCopiedPsbt] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load UTXOs on mount or account change
  const loadUtxos = async () => {
    setIsLoadingUtxos(true);
    setErrorMsg(null);
    try {
      const items = await fetchOrDeriveUtxos(account, !!security?.airGapMode);
      setUtxos(items);
      // Auto-select all small/dust UTXOs by default to help user immediately
      const smallIds = new Set(items.filter(u => u.isDustOrSmall).map(u => u.id));
      if (smallIds.size > 0) {
        setSelectedUtxoIds(smallIds);
      } else {
        setSelectedUtxoIds(new Set(items.map(u => u.id)));
      }
    } catch (err) {
      console.error('Failed to load UTXOs:', err);
    } finally {
      setIsLoadingUtxos(false);
    }
  };

  useEffect(() => {
    loadUtxos();
  }, [account.address]);

  // Keep fee rate synchronized with option
  useEffect(() => {
    if (feeRateOption === 'low') {
      setSelectedFeeRate(Math.max(1, market.feeEstimates?.low || 3));
    } else if (feeRateOption === 'economy') {
      const econ = Math.max(1, Math.round((market.feeEstimates?.low || 3) * 1.5));
      setSelectedFeeRate(econ);
    } else {
      setSelectedFeeRate(customFeeRate);
    }
  }, [feeRateOption, market.feeEstimates?.low, customFeeRate]);

  // Selected UTXO items
  const selectedUtxos = useMemo(() => {
    return utxos.filter(u => selectedUtxoIds.has(u.id));
  }, [utxos, selectedUtxoIds]);

  // Economics calculation
  const economics = useMemo(() => {
    return calculateConsolidationEconomics(
      selectedUtxos,
      selectedFeeRate,
      targetFormatType,
      Math.max(45, (market.feeEstimates?.high || 25) * 2)
    );
  }, [selectedUtxos, selectedFeeRate, targetFormatType, market.feeEstimates?.high]);

  // Handle UTXO selection toggles
  const toggleUtxo = (id: string) => {
    setSelectedUtxoIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllSmall = () => {
    const smalls = utxos.filter(u => u.isDustOrSmall).map(u => u.id);
    setSelectedUtxoIds(new Set(smalls));
  };

  const selectAll = () => {
    setSelectedUtxoIds(new Set(utxos.map(u => u.id)));
  };

  const deselectAll = () => {
    setSelectedUtxoIds(new Set());
  };

  // Handle target address selection
  const handleSelectPredefinedTarget = (addr: string, type: 'P2WPKH' | 'P2TR' | 'P2SH' | 'P2PKH') => {
    setIsCustomTarget(false);
    setTargetAddress(addr);
    setTargetFormatType(type);
    setErrorMsg(null);
  };

  const handleCustomTargetChange = (addr: string) => {
    setCustomTargetInput(addr);
    setTargetAddress(addr);
    if (addr.startsWith('bc1p')) setTargetFormatType('P2TR');
    else if (addr.startsWith('bc1q')) setTargetFormatType('P2WPKH');
    else if (addr.startsWith('3')) setTargetFormatType('P2SH');
    else setTargetFormatType('P2PKH');
  };

  // Validation
  const validateConsolidation = (): boolean => {
    setErrorMsg(null);

    if (security?.vaultFrozen) {
      setErrorMsg(
        lang === 'th'
          ? 'กระเป๋าถูกแช่แข็งความปลอดภัย (Frozen Vault) กรุณาปลดล็อคด้วย PIN ก่อนทำรายการ'
          : 'Vault is currently frozen. Please unfreeze with your PIN before transacting.'
      );
      return false;
    }

    if (selectedUtxos.length < 2) {
      setErrorMsg(
        lang === 'th'
          ? 'กรุณาเลือก UTXO อย่างน้อย 2 รายการเพื่อทำการรวมยอด (Consolidate)'
          : 'Please select at least 2 UTXOs to perform batch consolidation.'
      );
      return false;
    }

    if (!targetAddress) {
      setErrorMsg(
        lang === 'th' ? 'กรุณาระบุที่อยู่ปลายทางสำหรับรับเหรียญที่รวมแล้ว' : 'Please select or provide a destination address.'
      );
      return false;
    }

    const addrValidation = validateBitcoinAddress(targetAddress);
    if (!addrValidation.valid) {
      setErrorMsg(
        lang === 'th' ? `ที่อยู่ปลายทางไม่ถูกต้อง: ${addrValidation.error || ''}` : `Invalid destination address: ${addrValidation.error || ''}`
      );
      return false;
    }

    if (economics.netOutputSats <= 546) {
      setErrorMsg(
        lang === 'th'
          ? 'ยอดสุทธิหลังหักค่าธรรมเนียมต่ำกว่า Dust Limit (546 Sats)'
          : 'Net output amount is below Bitcoin dust threshold (546 Sats).'
      );
      return false;
    }

    return true;
  };

  // Broadcast Direct Batch Consolidation
  const handleExecuteConsolidation = () => {
    if (!validateConsolidation()) return;

    onOpenPinModal(() => {
      const txidHex = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const newTx: Transaction = {
        id: `batch-tx-${Date.now()}`,
        txid: txidHex,
        type: 'sent',
        coinSymbol: 'BTC',
        amountBtc: economics.netOutputBtc,
        amountSats: economics.netOutputSats,
        feeSats: economics.feeSats,
        feeRateSatVb: selectedFeeRate,
        recipientAddress: targetAddress,
        senderAddress: account.address,
        timestamp: Date.now(),
        confirmations: 1,
        blockHeight: (market.currentBlock || 884120) + 1,
        status: 'completed',
        note: `Batch UTXO Consolidation (${selectedUtxos.length} inputs -> 1 ${targetFormatType} output @ ${selectedFeeRate} sat/vB)`
      };

      onSendSuccess(newTx);
    });
  };

  // Generate Multi-Input Batch PSBT for Offline Cold Signing
  const handleGenerateBatchPsbt = () => {
    if (!validateConsolidation()) return;

    const payload = createBatchConsolidationPSBTPayload(
      selectedUtxos,
      targetAddress,
      economics.feeSats
    );

    setPsbtModal({
      psbtBase64: payload.psbtBase64,
      txidHex: payload.txidHex,
      summary: payload.rawSummary
    });
  };

  const btcPriceUsd = market.priceUsd || 96500;

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800/90 shadow-xl space-y-3">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <span>{lang === 'th' ? 'เครื่องมือรวม UTXO แบทช์ (Batch Consolidation)' : 'Batch UTXO Consolidation Helper'}</span>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30 font-bold">
                  Low-Fee
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {lang === 'th'
                  ? 'รวมเหรียญย่อย (UTXO Fragments) หลายรายการเข้าเป็น 1 แอดเดรสที่สะอาดด้วยค่าธรรมเนียมต่ำ ลดต้นทุนทำธุรกรรมในอนาคตได้สูงสุด ~70%'
                  : 'Consolidate multiple small UTXOs into a single, cleaner address using a low-priority fee rate to reduce future transaction costs.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadUtxos}
            disabled={isLoadingUtxos}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700 active:scale-95 shrink-0"
            title={lang === 'th' ? 'รีเฟรช UTXO' : 'Refresh UTXOs'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUtxos ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>

        {/* Low-Priority Fee Recommendation Info Tip */}
        <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 flex items-start gap-2.5 text-xs">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="font-bold text-[11.5px] text-indigo-300 block">
              {lang === 'th' ? '💡 ทำไมต้องรวม UTXO ด้วยค่าธรรมเนียมระดับต่ำ (Low-Priority)?' : '💡 Why consolidate at Low-Priority fees?'}
            </span>
            <p className="text-[10.5px] text-slate-300">
              {lang === 'th'
                ? 'การโอนเงินปกติที่ต้องใช้ 5-10 UTXO ในช่วงที่เครือข่ายแออัดจะเสียค่าธรรมเนียมสูงมาก (ตามขนาด vBytes) การรวม UTXO ในช่วงค่าขุดต่ำ (1-5 Sat/vB) จะช่วยให้ในอนาคตคุณใช้เพียง 1 อินพุต ประหยัดเงินได้มหาศาล'
                : 'Spending 5-10 UTXOs during high mempool congestion costs massive fees due to input vBytes. Consolidating into 1 input during low-fee periods permanently slashes your future spending costs.'}
            </p>
          </div>
        </div>

        {/* 1. UTXO Selection Section */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <label className="text-xs font-bold text-slate-200">
                {lang === 'th' ? 'เลือก UTXO ที่ต้องการรวม (Unspent Outputs):' : 'Select UTXOs to Consolidate:'}
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                ({selectedUtxos.length}/{utxos.length})
              </span>
            </div>

            {/* Quick Selection Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={selectAllSmall}
                className="px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-semibold transition-all active:scale-95"
              >
                {lang === 'th' ? 'เฉพาะเหรียญย่อย (<0.005)' : 'Small (<0.005 BTC)'}
              </button>
              <button
                type="button"
                onClick={selectAll}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition-all active:scale-95"
              >
                {lang === 'th' ? 'เลือกหมด' : 'All'}
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-semibold transition-all active:scale-95"
              >
                {lang === 'th' ? 'ล้าง' : 'Clear'}
              </button>
            </div>
          </div>

          {/* UTXO List Card Container */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
            {isLoadingUtxos ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
                <span>{lang === 'th' ? 'กำลังสแกนและวิเคราะห์ UTXO...' : 'Scanning and analyzing UTXOs...'}</span>
              </div>
            ) : utxos.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center text-slate-400 text-xs">
                {lang === 'th' ? 'ไม่พบ UTXO สำหรับบัญชีนี้' : 'No UTXOs found for this account.'}
              </div>
            ) : (
              utxos.map((utxo) => {
                const isSelected = selectedUtxoIds.has(utxo.id);
                return (
                  <div
                    key={utxo.id}
                    onClick={() => toggleUtxo(utxo.id)}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-sm'
                        : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-amber-500 border-amber-400 text-slate-950'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-slate-200 font-bold">
                            {utxo.amountBtc.toFixed(8)} BTC
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            ({utxo.amountSats.toLocaleString()} Sats)
                          </span>
                          {utxo.isDustOrSmall && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/30">
                              {lang === 'th' ? 'เหรียญย่อย' : 'Fragment'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[9.5px] font-mono text-slate-500 truncate mt-0.5">
                          <span className="truncate">TXID: {utxo.txid.slice(0, 10)}...:{utxo.vout}</span>
                          <span>•</span>
                          <span>{utxo.scriptType} (~{utxo.estimatedVBytes} vB)</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-slate-300">
                        {formatFiat(utxo.amountBtc * btcPriceUsd, currency, market.priceThb, market.priceUsd)}
                      </div>
                      <div className="text-[9.5px] text-emerald-400 font-mono">
                        {utxo.confirmations > 0 ? `${utxo.confirmations} confs` : 'unconfirmed'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 2. Destination Clean Address Selection */}
        <div className="space-y-2 pt-1 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lang === 'th' ? 'เลือกแอดเดรสปลายทางที่สะอาด (Clean Target):' : 'Consolidate into Clean Address:'}</span>
            </label>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold">
              Target: {targetFormatType}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectPredefinedTarget(userVariants.nativeSegwit, 'P2WPKH')}
              className={`p-2 rounded-xl text-left border transition-all ${
                !isCustomTarget && targetFormatType === 'P2WPKH'
                  ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-bold text-[10.5px] text-indigo-300 flex items-center gap-1">
                <span>Native SegWit</span>
                <span className="text-[8.5px] px-1 bg-indigo-500/30 rounded">P2WPKH</span>
              </div>
              <div className="font-mono text-[9px] text-slate-400 truncate mt-0.5">
                {userVariants.nativeSegwit.slice(0, 8)}...{userVariants.nativeSegwit.slice(-4)}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPredefinedTarget(userVariants.taproot, 'P2TR')}
              className={`p-2 rounded-xl text-left border transition-all ${
                !isCustomTarget && targetFormatType === 'P2TR'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-bold text-[10.5px] text-emerald-300 flex items-center gap-1">
                <span>Taproot</span>
                <span className="text-[8.5px] px-1 bg-emerald-500/30 rounded">P2TR</span>
              </div>
              <div className="font-mono text-[9px] text-slate-400 truncate mt-0.5">
                {userVariants.taproot.slice(0, 8)}...{userVariants.taproot.slice(-4)}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPredefinedTarget(userVariants.nestedSegwit, 'P2SH')}
              className={`p-2 rounded-xl text-left border transition-all ${
                !isCustomTarget && targetFormatType === 'P2SH'
                  ? 'bg-sky-500/20 border-sky-500 text-sky-200 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-bold text-[10.5px] text-sky-300 flex items-center gap-1">
                <span>Nested SegWit</span>
                <span className="text-[8.5px] px-1 bg-sky-500/30 rounded">P2SH</span>
              </div>
              <div className="font-mono text-[9px] text-slate-400 truncate mt-0.5">
                {userVariants.nestedSegwit.slice(0, 7)}...{userVariants.nestedSegwit.slice(-4)}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsCustomTarget(true);
                setTargetAddress(customTargetInput);
              }}
              className={`p-2 rounded-xl text-left border transition-all ${
                isCustomTarget
                  ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-bold text-[10.5px] text-amber-300">
                {lang === 'th' ? 'ที่อยู่อื่นๆ' : 'Custom Addr'}
              </div>
              <div className="font-mono text-[9px] text-slate-400 truncate mt-0.5">
                {customTargetInput ? customTargetInput.slice(0, 8) + '...' : (lang === 'th' ? 'ระบุเอง' : 'Manual')}
              </div>
            </button>
          </div>

          {isCustomTarget && (
            <input
              type="text"
              value={customTargetInput}
              onChange={(e) => handleCustomTargetChange(e.target.value)}
              placeholder="bc1q... หรือ bc1p... หรือ 3... หรือ 1..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-2.5 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          )}
        </div>

        {/* 3. Low-Priority Fee Selection */}
        <div className="space-y-2 pt-1 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'th' ? 'เลือกระดับค่าธรรมเนียม (แนะนำระดับต่ำสำหรับงานรวมยอด):' : 'Consolidation Fee Rate (Low-Priority Recommended):'}</span>
            </label>
            <span className="text-[11px] font-mono text-amber-400 font-bold">
              {selectedFeeRate} Sat/vB
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFeeRateOption('low')}
              className={`p-2.5 rounded-2xl border text-center transition-all ${
                feeRateOption === 'low'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider font-bold">
                {lang === 'th' ? 'ประหยัดสุด (Low)' : 'Low Priority'}
              </div>
              <div className="text-[11px] font-mono font-bold mt-0.5">
                {lowFeeRate} Sat/vB
              </div>
              <div className="text-[9px] text-slate-400">~1 hr+ (Ideal)</div>
            </button>

            <button
              type="button"
              onClick={() => setFeeRateOption('economy')}
              className={`p-2.5 rounded-2xl border text-center transition-all ${
                feeRateOption === 'economy'
                  ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-bold shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider font-bold">
                {lang === 'th' ? 'ปานกลาง (Economy)' : 'Economy'}
              </div>
              <div className="text-[11px] font-mono font-bold mt-0.5">
                {Math.max(2, Math.round(lowFeeRate * 1.5))} Sat/vB
              </div>
              <div className="text-[9px] text-slate-400">~30-60m</div>
            </button>

            <button
              type="button"
              onClick={() => setFeeRateOption('custom')}
              className={`p-2.5 rounded-2xl border text-center transition-all ${
                feeRateOption === 'custom'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider font-bold">
                {lang === 'th' ? 'กำหนดเอง (Custom)' : 'Custom'}
              </div>
              <div className="text-[11px] font-mono font-bold mt-0.5">
                {customFeeRate} Sat/vB
              </div>
              <div className="text-[9px] text-slate-400">Manual Rate</div>
            </button>
          </div>

          {feeRateOption === 'custom' && (
            <div className="flex items-center gap-2 p-2 bg-slate-950 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400">{lang === 'th' ? 'กำหนด Sat/vB:' : 'Set Sat/vB:'}</span>
              <input
                type="number"
                min="1"
                max="100"
                value={customFeeRate}
                onChange={(e) => setCustomFeeRate(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 bg-slate-900 border border-slate-700 rounded-xl p-1 text-center text-xs font-mono text-slate-100"
              />
            </div>
          )}
        </div>

        {/* 4. Financial & Future Savings Analytics Box */}
        <div className="p-3.5 bg-slate-950 rounded-3xl border border-slate-800 space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-slate-800/80 pb-2">
            <span className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'th' ? 'สรุปการรวมยอดและการประหยัดในอนาคต' : 'Consolidation Economics & Savings'}</span>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
              {economics.savingsPercentage > 0 ? `-${economics.savingsPercentage}% Fee Cost` : 'Batch Ready'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">{lang === 'th' ? 'จำนวนอินพุตที่รวม' : 'Inputs Consolidated'}:</span>
              <span className="font-mono text-slate-100 font-bold text-xs">
                {economics.inputsCount} UTXOs ➔ 1 Clean Output
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">{lang === 'th' ? 'ขนาดธุรกรรมโดยประมาณ' : 'Estimated Size'}:</span>
              <span className="font-mono text-amber-400 font-bold text-xs">
                ~{economics.estimatedVBytes} vBytes
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">{lang === 'th' ? 'ค่าธรรมเนียมรวมยอดตอนนี้' : 'Consolidation Fee Now'}:</span>
              <span className="font-mono text-rose-300 font-bold text-xs">
                {economics.feeSats.toLocaleString()} Sats (~{formatFiat(economics.feeBtc * btcPriceUsd, currency, market.priceThb, market.priceUsd)})
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">{lang === 'th' ? 'ยอดสุทธิที่จะได้รับ' : 'Net Consolidated Output'}:</span>
              <span className="font-mono text-emerald-400 font-bold text-xs">
                {economics.netOutputBtc.toFixed(8)} BTC
              </span>
            </div>
          </div>

          {/* Future Cost Comparison Callout */}
          {economics.inputsCount >= 2 && (
            <div className="p-2.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-[11px] space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span>{lang === 'th' ? '💰 ประหยัดค่าธรรมเนียมในอนาคตโดยประมาณ:' : '💰 Estimated Future Cost Savings:'}</span>
                <span className="text-emerald-400 font-mono font-extrabold text-xs">
                  +{economics.estimatedFutureSavingsSats.toLocaleString()} Sats (~{formatFiat(economics.estimatedFutureSavingsBtc * btcPriceUsd, currency, market.priceThb, market.priceUsd)})
                </span>
              </div>
              <p className="text-[10px] text-slate-300 leading-snug">
                {lang === 'th'
                  ? `หากโอนทั้ง ${economics.inputsCount} UTXOs นี้ในอนาคตช่วงค่าธรรมเนียมสูง จะต้องเสีย ~${economics.futureCostWithoutSats.toLocaleString()} Sats การรวมเหรียญไว้ก่อนตอนนี้ช่วยให้คุณเสียเพียง ~${economics.futureCostWithSats.toLocaleString()} Sats (รวมค่าธรรมเนียมที่จ่ายตอนนี้แล้ว)`
                  : `Spending these ${economics.inputsCount} UTXOs separately during future high-fee periods would cost ~${economics.futureCostWithoutSats.toLocaleString()} Sats. By consolidating now, future spends will only cost ~${economics.futureCostWithSats.toLocaleString()} Sats.`}
              </p>
            </div>
          )}
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleGenerateBatchPsbt}
            disabled={selectedUtxos.length < 2}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center justify-center gap-2 active:scale-95"
          >
            <QrCode className="w-4 h-4 text-cyan-400" />
            <span>{lang === 'th' ? 'เซ็นแอร์แกปออฟไลน์ (Batch PSBT)' : 'Air-Gap Batch PSBT'}</span>
          </button>

          <button
            type="button"
            onClick={handleExecuteConsolidation}
            disabled={selectedUtxos.length < 2}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <Fingerprint className="w-4 h-4" />
            <span>
              {lang === 'th'
                ? `ยืนยัน PIN รวม ${selectedUtxos.length} UTXOs ทันที`
                : `Authorize & Consolidate ${selectedUtxos.length} UTXOs`}
            </span>
          </button>
        </div>
      </div>

      {/* Batch PSBT Modal for Air-Gap Signing */}
      {psbtModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 text-center">
            <h3 className="text-sm font-bold text-slate-100 flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>{lang === 'th' ? 'Batch PSBT สำหรับอุปกรณ์ออฟไลน์' : 'Air-Gap Batch PSBT'}</span>
            </h3>

            <p className="text-[11px] text-slate-400">
              {psbtModal.summary}
            </p>

            <div className="p-4 bg-white rounded-2xl mx-auto w-fit">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(psbtModal.psbtBase64)}`}
                alt="Batch PSBT QR"
                className="w-40 h-40 object-contain"
              />
            </div>

            <div className="space-y-1 text-[10px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-left truncate">
              <div>Inputs: {selectedUtxos.length} UTXOs</div>
              <div>Target: {targetAddress.slice(0, 16)}...</div>
              <div>Fee Rate: {selectedFeeRate} sat/vB</div>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(psbtModal.psbtBase64);
                setCopiedPsbt(true);
                setTimeout(() => setCopiedPsbt(false), 2000);
              }}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold transition-all border border-slate-700 flex items-center justify-center gap-2"
            >
              {copiedPsbt ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedPsbt ? 'Copied' : (lang === 'th' ? 'คัดลอกรหัส Batch PSBT' : 'Copy Batch PSBT')}</span>
            </button>

            <button
              type="button"
              onClick={() => setPsbtModal(null)}
              className="w-full py-2 rounded-xl bg-slate-950 text-slate-400 hover:text-slate-200 text-xs font-semibold"
            >
              {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
