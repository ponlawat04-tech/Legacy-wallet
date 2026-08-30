import React, { useRef, useState } from 'react';
import {
  Send,
  QrCode,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  Info,
  GitFork,
  Coins,
  Camera,
  Upload,
  Layers,
  Search,
  Key,
  Zap,
  Snowflake,
  Unlock
} from 'lucide-react';
import jsQR from 'jsqr';
import { Currency, FeeEstimates, Language, MarketData, SecuritySettings, Transaction, WalletAccount } from '../../types/wallet';
import { i18n } from '../../utils/i18n';
import { btcToSats, formatBtc, formatFiat, formatSats, satsToBtc } from '../../utils/mockMarket';
import { createPSBTPayload, validateBitcoinAddress, validateForkAddress } from '../../utils/cryptoVault';
import { SUPPORTED_MULTI_CHAINS, ChainId, ChainConfig } from '../../types/multiChain';
import { validateMultiChainAddress } from '../../utils/multiChainVault';

interface SendTabProps {
  account: WalletAccount;
  market: MarketData;
  currency: Currency;
  lang: Language;
  onOpenPinModal: (action: () => void) => void;
  onSendSuccess: (tx: Transaction) => void;
  onOpenLegacyScannerModal?: () => void;
  security?: SecuritySettings;
  onUnfreeze?: () => void;
}

export const SendTab: React.FC<SendTabProps> = ({
  account,
  market,
  currency,
  lang,
  onOpenPinModal,
  onSendSuccess,
  onOpenLegacyScannerModal,
  security,
  onUnfreeze,
}) => {
  const [selectedChainId, setSelectedChainId] = useState<ChainId>('BTC');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [feeSpeed, setFeeSpeed] = useState<'low' | 'medium' | 'high' | 'custom'>('medium');
  const [customFeeRate, setCustomFeeRate] = useState<number>(18);
  const [note, setNote] = useState<string>('');

  const [addressValidation, setAddressValidation] = useState<{ valid: boolean; type?: string; error?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [psbtModalData, setPsbtModalData] = useState<{ psbtBase64: string; txidHex: string } | null>(null);
  const [copiedPsbt, setCopiedPsbt] = useState<boolean>(false);

  const addressQrInputRef = useRef<HTMLInputElement | null>(null);
  const addressCameraShutterRef = useRef<HTMLInputElement | null>(null);

  const handleAddressQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          let addr = code.data.trim();
          if (addr.includes('?')) {
            addr = addr.split('?')[0];
          }
          if (addr.includes(':')) {
            addr = addr.split(':')[1];
          }
          handleAddressChange(addr);
        } else {
          alert(lang === 'th' ? 'ไม่พบ QR Code ในภาพที่เลือก' : 'No QR code found in selected image.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const t = i18n[lang];
  const activeChain = SUPPORTED_MULTI_CHAINS.find(c => c.id === selectedChainId) || SUPPORTED_MULTI_CHAINS[0];

  // Calculate balance for selected chain
  const getAvailableBalance = (): number => {
    if (selectedChainId === 'BTC') return account.balanceBtc;
    if (selectedChainId === 'BCH') {
      const fork = account.forkBalances?.find(f => f.symbol === 'BCH');
      return fork ? fork.amount : 0.05;
    }
    // Dynamic simulated balance for other major chains in cold vault
    return 1.25;
  };

  const getCoinPriceUsd = (): number => {
    return market.chainPrices?.[selectedChainId] || activeChain.defaultPriceUsd;
  };

  const handleChainChange = (chainId: ChainId) => {
    setSelectedChainId(chainId);
    setError(null);
    setRecipientAddress('');
    setAmountStr('');
    setAddressValidation(null);
  };

  const handleAddressChange = (val: string) => {
    setRecipientAddress(val);
    setError(null);
    if (val.trim()) {
      const res = validateMultiChainAddress(selectedChainId, val);
      setAddressValidation(res);
    } else {
      setAddressValidation(null);
    }
  };

  const getActiveFeeRate = (): number => {
    if (feeSpeed === 'low') return market.feeEstimates.low;
    if (feeSpeed === 'medium') return market.feeEstimates.medium;
    if (feeSpeed === 'high') return market.feeEstimates.high;
    return customFeeRate;
  };

  // Estimate virtual bytes size & fees per chain
  const satVbRate = getActiveFeeRate();
  const getEstimatedFeeCoin = (): number => {
    switch (selectedChainId) {
      case 'BTC':
        return satsToBtc(140 * satVbRate);
      case 'ETH':
        return 0.0012; // ~21000 gas * 15 gwei
      case 'SOL':
        return 0.000005; // 5000 lamports
      case 'BNB':
        return 0.0003;
      case 'TRX':
        return 1.5; // bandwidth / energy
      case 'DOGE':
        return 0.5;
      case 'LTC':
        return 0.0005;
      case 'BCH':
        return 0.0001;
      case 'AVAX':
        return 0.002;
      case 'POL':
        return 0.01;
      default:
        return 0.0001;
    }
  };

  const estimatedFeeCoin = getEstimatedFeeCoin();
  const availableBalance = getAvailableBalance();
  const amountNum = parseFloat(amountStr) || 0;
  const totalDeductedCoin = amountNum + estimatedFeeCoin;

  const handleMaxClick = () => {
    const maxAvailable = Math.max(0, availableBalance - estimatedFeeCoin);
    setAmountStr(maxAvailable > 0 ? maxAvailable.toFixed(activeChain.decimals <= 8 ? 6 : 4) : '0');
  };

  const validateSendForm = (): boolean => {
    setError(null);

    if (security?.vaultFrozen) {
      setError(t.vaultIsFrozenSendWarning);
      return false;
    }

    const addrCheck = validateMultiChainAddress(selectedChainId, recipientAddress);
    if (!addrCheck.valid) {
      setError(addrCheck.error || `Invalid ${activeChain.name} address`);
      return false;
    }

    if (amountNum <= 0) {
      setError(lang === 'th' ? 'กรุณาระบุจำนวนที่ต้องการโอน' : 'Please enter a valid amount to send');
      return false;
    }

    if (selectedChainId === 'BTC' && (amountNum * 100000000) < 546) {
      setError(lang === 'th' ? 'จำนวนเงินต้องไม่ต่ำกว่า Dust Limit (546 Sats)' : 'Amount must be above Bitcoin dust limit (546 Sats)');
      return false;
    }

    if (totalDeductedCoin > availableBalance) {
      setError(
        lang === 'th'
          ? `ยอดเงิน ${activeChain.symbol} ไม่เพียงพอรวมค่าธรรมเนียมเครือข่าย`
          : `Insufficient ${activeChain.symbol} balance including network fee`
      );
      return false;
    }

    return true;
  };

  const handleDirectSendRequest = () => {
    if (!validateSendForm()) return;

    onOpenPinModal(() => {
      const txidHex = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        txid: txidHex,
        type: 'sent',
        coinSymbol: selectedChainId as any,
        amountBtc: amountNum,
        amountSats: Math.round(amountNum * 100000000),
        feeSats: Math.round(estimatedFeeCoin * 100000000),
        feeRateSatVb: satVbRate,
        recipientAddress,
        senderAddress: account.address,
        timestamp: Date.now(),
        confirmations: 1,
        blockHeight: market.currentBlock + 1,
        status: 'completed',
        note: note || `${activeChain.name} Transfer (${activeChain.addressFormatName})`
      };

      onSendSuccess(newTx);
      setRecipientAddress('');
      setAmountStr('');
      setAddressValidation(null);
    });
  };

  const handleGeneratePsbt = () => {
    if (!validateSendForm()) return;

    const payload = createPSBTPayload(
      account.address,
      recipientAddress,
      Math.round(amountNum * 100000000),
      Math.round(estimatedFeeCoin * 100000000)
    );

    setPsbtModalData({
      psbtBase64: payload.psbtBase64,
      txidHex: payload.txidHex
    });
  };

  return (
    <div className="space-y-3.5 pb-20 animate-in fade-in duration-300">
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800/90 shadow-xl space-y-3.5">
        {/* Title Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h2 className="text-sm sm:text-base font-bold text-slate-50 flex items-center gap-2">
            <Send className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
            <span>{t.sendTitle}</span>
          </h2>
          <span className="text-[10px] sm:text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
            {t.availableBalance}: {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {activeChain.symbol}
          </span>
        </div>

        {/* Vault Frozen Warning Banner */}
        {security?.vaultFrozen && (
          <div className="p-3.5 rounded-2xl bg-cyan-950/70 border border-cyan-500/50 text-cyan-200 shadow-lg shadow-cyan-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                <Snowflake className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-cyan-200">
                    {t.vaultIsFrozenBanner}
                  </span>
                </div>
                <p className="text-[11px] text-cyan-300/80 leading-tight">
                  {t.vaultIsFrozenSendWarning}
                </p>
              </div>
            </div>
            {onUnfreeze && (
              <button
                type="button"
                onClick={onUnfreeze}
                className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-all shadow-md active:scale-95"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>{t.unfreezeWithPinBtn}</span>
              </button>
            )}
          </div>
        )}

        {/* Sweep Private Key Banner Option */}
        {onOpenLegacyScannerModal && (
          <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 border border-amber-500/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-amber-200 block truncate">
                  {lang === 'th' ? 'ต้องการกวาดเหรียญจาก Private Key หรือ Paper Wallet?' : 'Need to sweep from a Private Key?'}
                </span>
                <span className="text-[9.5px] text-slate-400 truncate block">
                  {lang === 'th' ? 'กวาดเหรียญ BTC และ Fork เก่าทั้งหมดเข้ากระเป๋าหลัก' : 'Transfer all legacy UTXOs and fork coins directly into Vault'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenLegacyScannerModal}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0 transition-all active:scale-95 shadow-md shadow-amber-500/20"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'กวาดคีย์' : 'Sweep Key'}</span>
            </button>
          </div>
        )}

        {/* Multi-Chain Selector Tabs */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>{lang === 'th' ? 'เลือกเครือข่ายที่ต้องการโอน (Multi-Chain)' : 'Select Multi-Chain Network'}</span>
            </span>
            <span className="text-[10px] text-indigo-400 font-mono">
              {SUPPORTED_MULTI_CHAINS.length} Chains
            </span>
          </label>
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-2xl border border-slate-800 overflow-x-auto scrollbar-none">
            {SUPPORTED_MULTI_CHAINS.map((chain) => {
              const isActive = selectedChainId === chain.id;
              return (
                <button
                  key={chain.id}
                  type="button"
                  onClick={() => handleChainChange(chain.id)}
                  className={`py-1.5 px-3 rounded-xl font-bold text-xs font-mono transition-all flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? `bg-gradient-to-r ${chain.iconBg} text-slate-950 shadow-md font-extrabold`
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                  <span>{chain.symbol}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Chain Details Banner */}
        <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${activeChain.iconBg} shrink-0`} />
            <span className="font-bold text-slate-200 truncate">{activeChain.name}</span>
            <span className="text-[9.5px] font-mono text-slate-400 truncate">({activeChain.addressFormatName})</span>
          </div>
          <div className="font-mono text-slate-300 font-bold shrink-0 text-[11px]">
            1 {activeChain.symbol} ≈ ${getCoinPriceUsd().toLocaleString()}
          </div>
        </div>

        {/* Recipient Address */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-300">
              {t.recipientAddress} ({activeChain.symbol})
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={addressCameraShutterRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleAddressQrUpload}
                className="hidden"
              />
              <input
                ref={addressQrInputRef}
                type="file"
                accept="image/*"
                onChange={handleAddressQrUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => addressCameraShutterRef.current?.click()}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold active:scale-95"
                title="Scan QR with Camera"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'สแกน QR' : 'Scan'}</span>
              </button>
              <button
                type="button"
                onClick={() => addressQrInputRef.current?.click()}
                className="text-[11px] text-slate-400 hover:text-slate-300 flex items-center gap-1 font-semibold active:scale-95"
                title="Upload QR Image"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'เลือกภาพ' : 'Upload'}</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder={
                selectedChainId === 'ETH' || selectedChainId === 'BNB' || selectedChainId === 'AVAX' || selectedChainId === 'POL'
                  ? '0x71C...3a9'
                  : selectedChainId === 'SOL'
                  ? '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
                  : selectedChainId === 'TRX'
                  ? 'TXj3v8k32p9zx7m0al4a4c58qfwsy439'
                  : selectedChainId === 'DOGE'
                  ? 'DP3p5d72q9q29a4m27t4a4c58qfwsy43'
                  : selectedChainId === 'LTC'
                  ? 'ltc1q9v8k32p9zx7m0al4a4c58qfwsy439'
                  : 'bc1q9v8k32p9zx7m0al4a4c58qfwsy439...'
              }
              className={`w-full bg-slate-950 border rounded-2xl p-3 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 ${
                addressValidation?.valid
                  ? 'border-emerald-500/80 focus:ring-emerald-500'
                  : addressValidation?.error
                  ? 'border-rose-500 focus:ring-rose-500'
                  : 'border-slate-800 focus:ring-indigo-500'
              }`}
            />
            {addressValidation?.valid && (
              <span className="absolute right-3 top-3 text-emerald-400 flex items-center gap-1 text-[10px] font-bold uppercase">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{addressValidation.type || 'Valid'}</span>
              </span>
            )}
          </div>
          {addressValidation?.error && (
            <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{addressValidation.error}</span>
            </p>
          )}
        </div>

        {/* Amount Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-300">
              {t.amountToSend} ({activeChain.symbol})
            </label>
            <button
              type="button"
              onClick={handleMaxClick}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider active:scale-95"
            >
              MAX
            </button>
          </div>

          <div className="relative">
            <input
              type="number"
              step={activeChain.decimals <= 8 ? '0.0001' : '0.000001'}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="absolute right-3 top-3 flex items-center gap-1.5 text-xs font-bold text-indigo-400">
              <span>{activeChain.symbol}</span>
            </div>
          </div>
          {amountNum > 0 && (
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              ≈ {formatFiat(amountNum * getCoinPriceUsd(), currency, market.priceThb, market.priceUsd)}
            </p>
          )}
        </div>

        {/* Fee Priority Selection */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
            {lang === 'th' ? 'ความเร็วและค่าธรรมเนียมเครือข่าย' : 'Network Speed & Gas'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as const).map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => setFeeSpeed(speed)}
                className={`p-2.5 rounded-2xl border text-center transition-all active:scale-95 ${
                  feeSpeed === speed
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-[10.5px] uppercase tracking-wider">{speed}</div>
                <div className="text-[9.5px] font-mono text-slate-300 mt-0.5">
                  {speed === 'low' ? '~1 hr' : speed === 'medium' ? '~15-30m' : '< 5m'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Transaction Summary Box */}
        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>{lang === 'th' ? 'ค่าธรรมเนียมเครือข่ายโดยประมาณ' : 'Estimated Network Fee'}:</span>
            <span className="font-mono text-slate-200 font-bold">
              {estimatedFeeCoin.toFixed(6)} {activeChain.symbol}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>{lang === 'th' ? 'รวมยอดหักจากกระเป๋า' : 'Total Amount Deducted'}:</span>
            <span className="font-mono text-amber-400 font-extrabold">
              {totalDeductedCoin.toFixed(6)} {activeChain.symbol}
            </span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {selectedChainId === 'BTC' && (
            <button
              type="button"
              onClick={handleGeneratePsbt}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center justify-center gap-2 active:scale-95"
            >
              <QrCode className="w-4 h-4 text-sky-400" />
              <span>{lang === 'th' ? 'เซ็นผ่าน QR (Air-Gap PSBT)' : 'Air-Gap QR Sign'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDirectSendRequest}
            className={`w-full py-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 ${
              selectedChainId === 'BTC'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-slate-950 shadow-indigo-500/20 sm:col-span-2'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>{lang === 'th' ? `ใส่รหัส PIN เพื่อยืนยันโอน ${activeChain.symbol}` : `Confirm Send ${activeChain.symbol}`}</span>
          </button>
        </div>
      </div>

      {/* PSBT Modal */}
      {psbtModalData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 text-center">
            <h3 className="text-sm font-bold text-slate-100 flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Air-Gap Signed QR Payload</span>
            </h3>
            <div className="p-4 bg-white rounded-2xl mx-auto w-fit">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(psbtModalData.psbtBase64)}`}
                alt="PSBT QR"
                className="w-40 h-40 object-contain"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(psbtModalData.psbtBase64);
                setCopiedPsbt(true);
                setTimeout(() => setCopiedPsbt(false), 2000);
              }}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold transition-all border border-slate-700 flex items-center justify-center gap-2"
            >
              {copiedPsbt ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedPsbt ? 'Copied' : 'Copy PSBT Payload'}</span>
            </button>
            <button
              type="button"
              onClick={() => setPsbtModalData(null)}
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
