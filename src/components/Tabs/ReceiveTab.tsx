import React, { useEffect, useMemo, useState } from 'react';
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
  Search,
  Sparkles,
  Cpu,
  BadgePercent,
  RefreshCw,
} from 'lucide-react';
import { Currency, Language, MarketData, WalletAccount } from '../../types/wallet';
import { i18n } from '../../utils/i18n';
import { formatFiat } from '../../utils/mockMarket';
import { SUPPORTED_MULTI_CHAINS, ChainId, ChainConfig } from '../../types/multiChain';
import { deriveMultiChainAddresses, DerivedChainAccount } from '../../utils/multiChainVault';
import { deriveAllBtcVariantsFromSecret, AllBtcAddressFormats } from '../../utils/bitcoinKeyEngine';

interface ReceiveTabProps {
  account: WalletAccount;
  market: MarketData;
  currency: Currency;
  lang: Language;
  onOpenLegacyScannerModal?: () => void;
  onOpenAddressTypeSwitchModal?: () => void;
}

type BtcFormatKey = 'native_segwit' | 'taproot' | 'nested_segwit' | 'legacy_compressed' | 'legacy_uncompressed';
type BchFormatKey = 'cashaddr' | 'legacy';

export const ReceiveTab: React.FC<ReceiveTabProps> = ({
  account,
  market,
  currency,
  lang,
  onOpenLegacyScannerModal,
  onOpenAddressTypeSwitchModal,
}) => {
  const [selectedChainId, setSelectedChainId] = useState<ChainId>('BTC');
  const [activeBtcFormat, setActiveBtcFormat] = useState<BtcFormatKey>('native_segwit');
  const [activeBchFormat, setActiveBchFormat] = useState<BchFormatKey>('cashaddr');

  const [derivedChains, setDerivedChains] = useState<DerivedChainAccount[]>([]);
  const [requestedAmountStr, setRequestedAmountStr] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [searchChain, setSearchChain] = useState<string>('');

  const t = i18n[lang];

  // Deterministically derive all Bitcoin address formats from account
  const btcVariants: AllBtcAddressFormats = useMemo(() => {
    return deriveAllBtcVariantsFromSecret(
      account.publicKey || account.address,
      account.has25thWord ? 'passphrase' : ''
    );
  }, [account.publicKey, account.address, account.has25thWord]);

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

  // Determine active address and metadata based on selected format
  let currentDisplayAddress = activeDerived.address;
  let currentFormatLabel = activeDerived.formatLabel || activeChainConfig.addressFormatName;
  let currentDerivationPath = activeChainConfig.derivationPath;
  let currentScriptType = 'P2WPKH';
  let currentFeeSavings = lang === 'th' ? 'ประหยัดค่าขุด ~38%' : 'Lowest Fee (~38% cheaper)';
  let formatDescription = '';

  if (selectedChainId === 'BTC') {
    if (activeBtcFormat === 'native_segwit') {
      currentDisplayAddress = btcVariants.nativeSegwit;
      currentFormatLabel = 'Native SegWit (Bech32)';
      currentDerivationPath = "m/84'/0'/0'/0/0";
      currentScriptType = 'P2WPKH (Witness v0)';
      currentFeeSavings = lang === 'th' ? 'ประหยัดค่าขุดสูงสุด (~38%)' : 'Lowest Fee (~38% cheaper)';
      formatDescription = lang === 'th'
        ? 'มาตรฐานสากลยุคใหม่ ค่าธรรมเนียมต่ำที่สุด รองรับกระเป๋าหลักและ Exchange ชั้นนำทั้งหมด'
        : 'Modern standard with lowest transaction fees. Supported by almost all modern wallets and exchanges.';
    } else if (activeBtcFormat === 'taproot') {
      currentDisplayAddress = btcVariants.taproot;
      currentFormatLabel = 'Taproot (Bech32m)';
      currentDerivationPath = "m/86'/0'/0'/0/0";
      currentScriptType = 'P2TR (Witness v1 Schnorr)';
      currentFeeSavings = lang === 'th' ? 'ความเป็นส่วนตัวสูงสุด (Schnorr)' : 'Maximum Privacy (Schnorr)';
      formatDescription = lang === 'th'
        ? 'อัปเกรดล่าสุดของบิตคอยน์ ใช้ลายเซ็น Schnorr ช่วยซ่อนสคริปต์ธุรกรรมและเพิ่มความเป็นส่วนตัวสูงสุด'
        : 'Latest Bitcoin upgrade featuring Schnorr signatures, batching, and enhanced on-chain privacy.';
    } else if (activeBtcFormat === 'nested_segwit') {
      currentDisplayAddress = btcVariants.nestedSegwit;
      currentFormatLabel = 'Nested SegWit (P2SH - 3...)';
      currentDerivationPath = "m/49'/0'/0'/0/0";
      currentScriptType = 'P2SH-P2WPKH';
      currentFeeSavings = lang === 'th' ? 'เข้ากันได้กับเว็บเทรดเก่า (~26%)' : 'High Compatibility (~26% cheaper)';
      formatDescription = lang === 'th'
        ? 'ใช้ SegWit ครอบใน P2SH เหมาะสำหรับรับเงินจากระบบหรือเว็บเทรดที่ยังไม่รองรับ bc1q'
        : 'Wrapped SegWit inside P2SH. Ideal for receiving from older platforms that do not yet support bc1q.';
    } else if (activeBtcFormat === 'legacy_compressed') {
      currentDisplayAddress = btcVariants.legacyCompressed;
      currentFormatLabel = 'Legacy (P2PKH - 1...) Compressed';
      currentDerivationPath = "m/44'/0'/0'/0/0";
      currentScriptType = 'P2PKH (Compressed)';
      currentFeeSavings = lang === 'th' ? 'รูปแบบดั้งเดิมสากล' : 'Universal Vintage Standard';
      formatDescription = lang === 'th'
        ? 'รูปแบบดั้งเดิมตั้งแต่ยุคแรกของ Satoshi รองรับได้ 100% บนทุกโปรแกรมในโลก'
        : 'The original Bitcoin address format. Compatible with 100% of all software and hardware wallets.';
    } else if (activeBtcFormat === 'legacy_uncompressed') {
      currentDisplayAddress = btcVariants.legacyUncompressed;
      currentFormatLabel = 'Legacy (P2PKH - 1...) Uncompressed';
      currentDerivationPath = 'Vintage (Casascius)';
      currentScriptType = 'P2PKH (Uncompressed)';
      currentFeeSavings = lang === 'th' ? 'Paper Wallet โบราณ / Casascius' : 'Antique Paper Wallet / Casascius';
      formatDescription = lang === 'th'
        ? 'รูปแบบสำหรับ Paper Wallet โบราณ และเหรียญทางกายภาพ Casascius Physical Bitcoin (ปี 2011–2013)'
        : 'Format used by antique physical Casascius Bitcoins and early 2011-2013 paper wallets.';
    }
  } else if (selectedChainId === 'BCH') {
    if (activeBchFormat === 'cashaddr') {
      currentDisplayAddress = btcVariants.bchCashAddr.startsWith('bitcoincash:') ? btcVariants.bchCashAddr : `bitcoincash:${btcVariants.bchCashAddr}`;
      currentFormatLabel = 'CashAddr (BCH Standard)';
      currentDerivationPath = "m/44'/145'/0'/0/0";
      currentScriptType = 'P2PKH CashAddr';
      formatDescription = lang === 'th' ? 'มาตรฐานทางการของ Bitcoin Cash ป้องกันการโอนผิดเข้าเครือข่าย BTC' : 'Official Bitcoin Cash standard preventing accidental sends to BTC.';
    } else {
      currentDisplayAddress = btcVariants.bchLegacy;
      currentFormatLabel = 'Legacy (1...) Format';
      currentDerivationPath = "m/44'/145'/0'/0/0";
      currentScriptType = 'Legacy P2PKH';
      formatDescription = lang === 'th' ? 'รูปแบบดั้งเดิม สำหรับระบบหรือกระเป๋าเก่าที่ไม่รองรับ CashAddr' : 'Original Legacy address format for older exchanges.';
    }
  }

  const getUriScheme = (chainId: ChainId): string => {
    switch (chainId) {
      case 'BTC': return 'bitcoin';
      case 'BCH': return 'bitcoincash';
      case 'BSV': return 'bitcoinsv';
      case 'BTG': return 'bitcoingold';
      case 'XEC': return 'ecash';
      default: return 'bitcoin';
    }
  };

  const requestedAmount = parseFloat(requestedAmountStr) || 0;
  const uriScheme = getUriScheme(selectedChainId);
  const cleanAddrForUri = currentDisplayAddress.startsWith('bitcoincash:')
    ? currentDisplayAddress.replace('bitcoincash:', '')
    : currentDisplayAddress;

  const qrUri = requestedAmount > 0
    ? `${uriScheme}:${cleanAddrForUri}?amount=${requestedAmount}`
    : `${uriScheme}:${cleanAddrForUri}`;

  const copyAddress = () => {
    navigator.clipboard.writeText(currentDisplayAddress);
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
      {/* Bitcoin & Fork Selector Carousel */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'th' ? 'เลือกเหรียญรับโอน (Bitcoin & Forks)' : 'Select Asset (Bitcoin & Forks)'}</span>
          </span>
          <span className="text-[10px] text-amber-400 font-mono">
            {SUPPORTED_MULTI_CHAINS.length} Coins
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

      {/* Bitcoin Address Format Selector Tabs */}
      {selectedChainId === 'BTC' && (
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'th' ? 'ตัวเลือกรูปแบบที่อยู่รับ BTC (Address Formats)' : 'BTC Address Format Options'}</span>
            </span>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              5 Formats Available
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveBtcFormat('native_segwit')}
              className={`p-2 rounded-xl text-left border transition-all ${
                activeBtcFormat === 'native_segwit'
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <div className="text-[11px] font-bold truncate">Native SegWit</div>
              <div className="text-[9.5px] font-mono text-slate-400">bc1q... (BIP-84)</div>
              <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">★ แนะนำ / ค่าขุดต่ำสุด</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveBtcFormat('taproot')}
              className={`p-2 rounded-xl text-left border transition-all ${
                activeBtcFormat === 'taproot'
                  ? 'bg-purple-500/15 border-purple-500/50 text-purple-300 ring-1 ring-purple-500/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <div className="text-[11px] font-bold truncate">Taproot</div>
              <div className="text-[9.5px] font-mono text-slate-400">bc1p... (BIP-86)</div>
              <div className="text-[9px] text-purple-400 font-semibold mt-0.5">🔒 ส่วนตัวสูงสุด</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveBtcFormat('nested_segwit')}
              className={`p-2 rounded-xl text-left border transition-all ${
                activeBtcFormat === 'nested_segwit'
                  ? 'bg-sky-500/15 border-sky-500/50 text-sky-300 ring-1 ring-sky-500/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <div className="text-[11px] font-bold truncate">Nested SegWit</div>
              <div className="text-[9.5px] font-mono text-slate-400">3... (BIP-49)</div>
              <div className="text-[9px] text-sky-400 font-semibold mt-0.5">รองรับเว็บเทรดเก่า</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveBtcFormat('legacy_compressed')}
              className={`p-2 rounded-xl text-left border transition-all ${
                activeBtcFormat === 'legacy_compressed'
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <div className="text-[11px] font-bold truncate">Legacy P2PKH</div>
              <div className="text-[9.5px] font-mono text-slate-400">1... (Compressed)</div>
              <div className="text-[9px] text-amber-400 font-semibold mt-0.5">ดั้งเดิมสากล</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveBtcFormat('legacy_uncompressed')}
              className={`p-2 rounded-xl text-left border transition-all col-span-2 sm:col-span-1 ${
                activeBtcFormat === 'legacy_uncompressed'
                  ? 'bg-orange-500/15 border-orange-500/50 text-orange-300 ring-1 ring-orange-500/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <div className="text-[11px] font-bold truncate">Legacy Uncompressed</div>
              <div className="text-[9.5px] font-mono text-slate-400">1... (Antique)</div>
              <div className="text-[9px] text-orange-400 font-semibold mt-0.5">Paper / Casascius</div>
            </button>
          </div>

          {/* Direct Switch Wallet Address Type Button */}
          {onOpenAddressTypeSwitchModal && (
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-800/80">
              <span className="text-[10.5px] text-slate-400">
                {lang === 'th' ? 'ต้องการเปลี่ยน Address ถาวรของกระเป๋านี้ หรือหายอดเหรียญ?' : 'Need to change wallet format permanently or scan missing coins?'}
              </span>
              <button
                type="button"
                onClick={onOpenAddressTypeSwitchModal}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10.5px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm shrink-0"
              >
                <RefreshCw className="w-3 h-3 text-amber-400" />
                <span>{lang === 'th' ? 'สลับประเภทกระเป๋า & สแกนเหรียญ' : 'Switch Wallet Type & Scan'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bitcoin Cash (BCH) Format Selector */}
      {selectedChainId === 'BCH' && (
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-200">
            <span>{lang === 'th' ? 'ตัวเลือกรูปแบบที่อยู่รับ BCH' : 'BCH Address Formats'}</span>
            <span className="text-[10px] text-emerald-400 font-mono">CashAddr & Legacy</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveBchFormat('cashaddr')}
              className={`p-2.5 rounded-xl text-left border transition-all ${
                activeBchFormat === 'cashaddr'
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-xs font-bold">CashAddr (ทางการ)</div>
              <div className="text-[10px] font-mono text-slate-400 truncate">bitcoincash:q...</div>
            </button>
            <button
              type="button"
              onClick={() => setActiveBchFormat('legacy')}
              className={`p-2.5 rounded-xl text-left border transition-all ${
                activeBchFormat === 'legacy'
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-xs font-bold">Legacy (ดั้งเดิม)</div>
              <div className="text-[10px] font-mono text-slate-400 truncate">1... (เข้ากันได้สูง)</div>
            </button>
          </div>
        </div>
      )}

      {/* Main Receiving QR & Details Card */}
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
            {formatDescription || (lang === 'th'
              ? `แสดง QR Code หรือแชร์ที่อยู่เพื่อรับสินทรัพย์บนเครือข่าย ${activeChainConfig.name}`
              : `Show QR code or copy address to receive assets on ${activeChainConfig.name} network`)}
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
            {currentFormatLabel}
          </div>
        </div>

        {/* Address Chip & Copy Button */}
        <div className="w-full bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col items-center gap-2">
          <div className="w-full flex items-center justify-between text-[10.5px]">
            <span className="text-slate-400 font-medium">
              {t.accountNameLabel}: <strong className="text-slate-200">{account.name}</strong>
            </span>
            <span className="text-amber-400 font-mono font-bold text-[10px]">
              {currentFormatLabel}
            </span>
          </div>

          <p className="text-xs font-mono text-amber-400 font-bold break-all px-2 select-all leading-relaxed bg-slate-900/80 py-2 rounded-xl w-full border border-slate-800/80">
            {currentDisplayAddress}
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
              href={`${activeChainConfig.explorerUrl}${cleanAddrForUri}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 transition-colors border border-slate-700 flex items-center justify-center active:scale-95"
              title="View on Block Explorer"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Technical Specification Matrix */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2 text-left bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800 text-[10.5px]">
          <div>
            <span className="text-slate-500 block text-[9px]">Derivation Path:</span>
            <span className="font-mono text-slate-300 font-semibold truncate block">{currentDerivationPath}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px]">Script Type:</span>
            <span className="font-mono text-indigo-400 font-semibold truncate block">{currentScriptType}</span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-slate-500 block text-[9px]">Fee Efficiency:</span>
            <span className="text-emerald-400 font-semibold text-[10px] truncate block">{currentFeeSavings}</span>
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
              ? `ที่อยู่นี้ถูกคำนวณแบบแยกเครือข่ายอย่างสมบูรณ์ ปลอดภัยตามมาตรฐาน BIP-44/84/86 และ SLIP-0044`
              : `Address deterministically derived per standard BIP-44/84/86 & SLIP-0044 multi-chain specifications.`}
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

