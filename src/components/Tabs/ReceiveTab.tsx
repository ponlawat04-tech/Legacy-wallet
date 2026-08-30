import React, { useEffect, useState } from 'react';
import {
  QrCode,
  Copy,
  Check,
  ShieldCheck,
  Share2,
  Info,
  Key,
  Zap,
  ChevronRight,
  GitFork,
  ArrowRight,
  Layers,
  ExternalLink,
  Search
} from 'lucide-react';
import { Currency, Language, MarketData, WalletAccount } from '../../types/wallet';
import { i18n } from '../../utils/i18n';
import { formatFiat } from '../../utils/mockMarket';
import { SUPPORTED_MULTI_CHAINS, ChainId, ChainConfig } from '../../types/multiChain';
import { deriveMultiChainAddresses, DerivedChainAccount } from '../../utils/multiChainVault';

interface ReceiveTabProps {
  account: WalletAccount;
  market: MarketData;
  currency: Currency;
  lang: Language;
  onOpenLegacyScannerModal?: () => void;
}

export const ReceiveTab: React.FC<ReceiveTabProps> = ({
  account,
  market,
  currency,
  lang,
  onOpenLegacyScannerModal,
}) => {
  const [selectedChainId, setSelectedChainId] = useState<ChainId>('BTC');
  const [derivedChains, setDerivedChains] = useState<DerivedChainAccount[]>([]);
  const [requestedAmountStr, setRequestedAmountStr] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [searchChain, setSearchChain] = useState<string>('');

  const t = i18n[lang];

  useEffect(() => {
    let isMounted = true;
    deriveMultiChainAddresses(account.publicKey || account.address, account.has25thWord ? 'passphrase' : '', market.chainPrices)
      .then((derived) => {
        if (isMounted) {
          setDerivedChains(derived);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [account.publicKey, account.address, account.has25thWord, market.chainPrices]);

  const activeChainConfig = SUPPORTED_MULTI_CHAINS.find(c => c.id === selectedChainId) || SUPPORTED_MULTI_CHAINS[0];
  const activeDerived = derivedChains.find(d => d.chainId === selectedChainId) || {
    address: account.address,
    formatLabel: activeChainConfig.addressFormatName,
  };

  const getUriScheme = (chainId: ChainId): string => {
    switch (chainId) {
      case 'BTC': return 'bitcoin';
      case 'ETH': return 'ethereum';
      case 'SOL': return 'solana';
      case 'BNB': return 'binance';
      case 'TRX': return 'tron';
      case 'DOGE': return 'dogecoin';
      case 'LTC': return 'litecoin';
      case 'BCH': return 'bitcoincash';
      case 'AVAX': return 'avalanche';
      case 'POL': return 'polygon';
      default: return 'crypto';
    }
  };

  const requestedAmount = parseFloat(requestedAmountStr) || 0;
  const uriScheme = getUriScheme(selectedChainId);
  const qrUri = requestedAmount > 0
    ? `${uriScheme}:${activeDerived.address}?amount=${requestedAmount}`
    : `${uriScheme}:${activeDerived.address}`;

  const copyAddress = () => {
    navigator.clipboard.writeText(activeDerived.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentCoinPrice = market.chainPrices?.[selectedChainId] || activeChainConfig.defaultPriceUsd;

  const filteredChainsList = SUPPORTED_MULTI_CHAINS.filter(c => 
    c.name.toLowerCase().includes(searchChain.toLowerCase()) || 
    c.symbol.toLowerCase().includes(searchChain.toLowerCase())
  );

  return (
    <div className="space-y-3.5 pb-20 animate-in fade-in duration-300">
      {/* Multi-Chain Selector Carousel */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>{lang === 'th' ? 'เลือกเครือข่ายรับเหรียญ' : 'Select Receiving Chain'}</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {SUPPORTED_MULTI_CHAINS.length} Chains
          </span>
        </div>

        <div className="p-1 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {filteredChainsList.map(chain => {
            const isSelected = selectedChainId === chain.id;
            return (
              <button
                key={chain.id}
                type="button"
                onClick={() => {
                  setSelectedChainId(chain.id);
                  setRequestedAmountStr('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? `bg-gradient-to-r ${chain.iconBg} text-slate-950 shadow-md`
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                <span>{chain.symbol}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800/90 shadow-xl space-y-3.5 flex flex-col items-center text-center">
        {/* Header */}
        <div>
          <div className="flex items-center justify-center gap-1.5">
            <h2 className="text-sm sm:text-base font-bold text-slate-50 flex items-center justify-center gap-1.5">
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
              {lang === 'th' ? `รับ ${activeChainConfig.name}` : `Receive ${activeChainConfig.name}`}
            </h2>
            <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-mono font-bold border ${activeChainConfig.badgeColor}`}>
              {activeChainConfig.symbol}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {lang === 'th'
              ? `แสดง QR Code หรือแชร์ที่อยู่เพื่อรับสินทรัพย์บนเครือข่าย ${activeChainConfig.name}`
              : `Show QR code or copy address to receive assets on ${activeChainConfig.name} network`}
          </p>
        </div>

        {/* QR Code Container */}
        <div className="p-3.5 bg-white rounded-3xl shadow-2xl border-4 border-slate-800 flex flex-col items-center justify-center my-1">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUri)}`}
            alt={`${activeChainConfig.symbol} Address QR`}
            className="w-44 h-44 sm:w-52 sm:h-52 object-contain"
          />
          <div className="mt-1.5 text-[9.5px] font-mono text-slate-800 font-bold tracking-tight uppercase">
            {activeDerived.formatLabel || activeChainConfig.addressFormatName}
          </div>
        </div>

        {/* Address Chip & Copy Button */}
        <div className="w-full bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col items-center gap-2">
          <span className="text-[10.5px] text-slate-400 font-medium">
            {t.accountNameLabel}: <strong className="text-slate-200">{account.name} ({activeChainConfig.symbol})</strong>
          </span>
          <p className="text-xs font-mono text-amber-400 font-bold break-all px-2 select-all leading-relaxed bg-slate-900/80 py-1.5 rounded-xl w-full border border-slate-800/80">
            {activeDerived.address}
          </p>

          <div className="w-full flex items-center gap-1.5">
            <button
              type="button"
              onClick={copyAddress}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold transition-all border border-slate-700 flex items-center justify-center gap-1.5 shadow-md active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">{t.copiedSuccess}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>{t.copyAddressBtn}</span>
                </>
              )}
            </button>
            <a
              href={`${activeChainConfig.explorerUrl}${activeDerived.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 transition-colors border border-slate-700 flex items-center justify-center active:scale-95"
              title="View on Block Explorer"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Derivation Path Details */}
        <div className="w-full grid grid-cols-2 gap-2 text-left bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800 text-[10.5px]">
          <div>
            <span className="text-slate-500 block text-[9.5px]">Derivation Path:</span>
            <span className="font-mono text-slate-300 font-semibold">{activeChainConfig.derivationPath}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[9.5px]">SLIP-0044 CoinType:</span>
            <span className="font-mono text-indigo-400 font-semibold">{activeChainConfig.coinType}</span>
          </div>
        </div>

        {/* Optional Amount Specification */}
        <div className="w-full text-left pt-2 border-t border-slate-800/80">
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            {t.specifyAmount} ({activeChainConfig.symbol})
          </label>
          <div className="relative flex items-center">
            <input
              type="number"
              step={activeChainConfig.decimals === 6 ? '1' : '0.0001'}
              value={requestedAmountStr}
              onChange={(e) => setRequestedAmountStr(e.target.value)}
              placeholder="0.00000000"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <span className="absolute right-3 text-xs font-bold text-amber-400">
              {activeChainConfig.symbol}
            </span>
          </div>
          {requestedAmount > 0 && (
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              ≈ {formatFiat(requestedAmount * currentCoinPrice, currency, market.priceThb, market.priceUsd)}
            </p>
          )}
        </div>

        {/* Protocol Security Notice */}
        <div className="w-full p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center gap-2 text-left">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
          <p className="text-[10.5px] text-indigo-300 leading-tight">
            {lang === 'th'
              ? `ที่อยู่นี้ถูกคำนวณแบบแยกเครือข่ายอย่างสมบูรณ์ ปลอดภัยตามมาตรฐาน BIP-44/84 และ SLIP-0044`
              : `Address deterministically derived per standard BIP-44/84 & SLIP-0044 multi-chain specifications.`}
          </p>
        </div>

        {/* Sweep from Legacy Key Option */}
        {onOpenLegacyScannerModal && (
          <div className="w-full p-3 bg-slate-950/90 border border-amber-500/30 rounded-2xl flex items-center justify-between text-left gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Key className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-100 truncate">
                  {lang === 'th' ? 'กวาดเหรียญจาก Private Key เก่า' : 'Sweep from Legacy Key'}
                </div>
                <div className="text-[9.5px] text-slate-400 truncate">
                  {lang === 'th' ? 'สแกน BTC และ Hard Forks (BCH, BSV, BTG, XEC)' : 'Deep scan BTC & Hard Fork snapshot balances'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenLegacyScannerModal}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all shrink-0 flex items-center gap-1 active:scale-95"
            >
              <span>{lang === 'th' ? 'สแกน' : 'Scan'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
