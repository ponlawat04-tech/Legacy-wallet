import React, { useMemo, useState } from 'react';
import {
  Coins,
  Copy,
  Check,
  ExternalLink,
  Send,
  QrCode,
  Sparkles,
  TrendingUp,
  Search,
  Key,
  ShieldCheck,
  ChevronRight,
  ArrowUpRight,
  PieChart,
  RefreshCw,
  Info
} from 'lucide-react';
import { Currency, Language, MarketData, WalletAccount } from '../types/wallet';
import { formatBtc, formatFiat, formatSats } from '../utils/mockMarket';

export interface WalletHoldingsCardProps {
  account: WalletAccount;
  market: MarketData;
  currency: Currency;
  lang: Language;
  onNavigateTab: (tab: any) => void;
  onOpenLegacyScannerModal?: () => void;
  onSyncBlockchain?: () => void;
  isSyncing?: boolean;
}

export interface CoinHoldingItem {
  symbol: 'BTC' | 'BCH' | 'BSV' | 'BTG' | 'XEC';
  name: string;
  networkName: string;
  amount: number;
  amountFormatted: string;
  satsFormatted?: string;
  priceUsd: number;
  priceFormatted: string;
  valueUsd: number;
  valueFormatted: string;
  percentOfPortfolio: number;
  isNative: boolean;
  iconBg: string;
  badgeColor: string;
  address: string;
  explorerUrl: string;
  hasReplayProtection: boolean;
  replayMethod?: string;
}

export const WalletHoldingsCard: React.FC<WalletHoldingsCardProps> = ({
  account,
  market,
  currency,
  lang,
  onNavigateTab,
  onOpenLegacyScannerModal,
  onSyncBlockchain,
  isSyncing = false,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'held' | 'forks'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);

  // Compute all holdings
  const holdings: CoinHoldingItem[] = useMemo(() => {
    const forkBalances = account.forkBalances || [];

    // BTC Primary
    const btcAmount = account.balanceBtc || 0;
    const btcPrice = market.priceUsd || 96500;
    const btcValueUsd = btcAmount * btcPrice;

    // BCH
    const bchHolding = forkBalances.find((f) => f.symbol === 'BCH');
    const bchAmount = bchHolding ? bchHolding.amount : 0;
    const bchPrice = market.forkPrices?.['BCH'] || 385.5;
    const bchValueUsd = bchAmount * bchPrice;

    // BSV
    const bsvHolding = forkBalances.find((f) => f.symbol === 'BSV');
    const bsvAmount = bsvHolding ? bsvHolding.amount : 0;
    const bsvPrice = market.forkPrices?.['BSV'] || 58.2;
    const bsvValueUsd = bsvAmount * bsvPrice;

    // BTG
    const btgHolding = forkBalances.find((f) => f.symbol === 'BTG');
    const btgAmount = btgHolding ? btgHolding.amount : 0;
    const btgPrice = market.forkPrices?.['BTG'] || 32.8;
    const btgValueUsd = btgAmount * btgPrice;

    // XEC
    const xecHolding = forkBalances.find((f) => f.symbol === 'XEC');
    const xecAmount = xecHolding ? xecHolding.amount : 0;
    const xecPrice = market.forkPrices?.['XEC'] || 0.000038;
    const xecValueUsd = xecAmount * xecPrice;

    const totalPortfolioUsd = Math.max(0.0001, btcValueUsd + bchValueUsd + bsvValueUsd + btgValueUsd + xecValueUsd);

    const btcExchangeRate = currency === 'THB' ? market.priceThb : market.priceUsd;

    const items: CoinHoldingItem[] = [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        networkName: lang === 'th' ? 'เครือข่าย Bitcoin' : 'Bitcoin Core Network',
        amount: btcAmount,
        amountFormatted: formatBtc(btcAmount),
        satsFormatted: formatSats(account.balanceSats || Math.round(btcAmount * 100000000)),
        priceUsd: btcPrice,
        priceFormatted: formatFiat(btcPrice, currency, market.priceThb, btcPrice),
        valueUsd: btcValueUsd,
        valueFormatted: formatFiat(btcValueUsd, currency, btcAmount * market.priceThb, btcValueUsd),
        percentOfPortfolio: Math.min(100, Math.round((btcValueUsd / totalPortfolioUsd) * 100)),
        isNative: true,
        iconBg: 'from-amber-500 to-orange-600',
        badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        address: account.address,
        explorerUrl: `https://mempool.space/address/${account.address}`,
        hasReplayProtection: true,
      },
      {
        symbol: 'BCH',
        name: 'Bitcoin Cash',
        networkName: lang === 'th' ? 'แยกสาขาปี 2017 (32MB Block)' : 'Hard Fork 2017 (32MB Block)',
        amount: bchAmount,
        amountFormatted: `${bchAmount.toFixed(6)} BCH`,
        priceUsd: bchPrice,
        priceFormatted: formatFiat(bchPrice, currency, bchPrice * 34, bchPrice),
        valueUsd: bchValueUsd,
        valueFormatted: formatFiat(bchValueUsd, currency, bchValueUsd * 34, bchValueUsd),
        percentOfPortfolio: Math.round((bchValueUsd / totalPortfolioUsd) * 100),
        isNative: false,
        iconBg: 'from-emerald-500 to-green-600',
        badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        address: account.address,
        explorerUrl: `https://blockchair.com/bitcoin-cash/address/${account.address}`,
        hasReplayProtection: true,
        replayMethod: 'SIGHASH_FORKID (BIP-143)',
      },
      {
        symbol: 'BSV',
        name: 'Bitcoin SV',
        networkName: lang === 'th' ? 'Satoshi Vision (บล็อกองค์กร)' : 'Satoshi Vision (Enterprise Blocks)',
        amount: bsvAmount,
        amountFormatted: `${bsvAmount.toFixed(6)} BSV`,
        priceUsd: bsvPrice,
        priceFormatted: formatFiat(bsvPrice, currency, bsvPrice * 34, bsvPrice),
        valueUsd: bsvValueUsd,
        valueFormatted: formatFiat(bsvValueUsd, currency, bsvValueUsd * 34, bsvValueUsd),
        percentOfPortfolio: Math.round((bsvValueUsd / totalPortfolioUsd) * 100),
        isNative: false,
        iconBg: 'from-yellow-500 to-amber-600',
        badgeColor: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
        address: account.address,
        explorerUrl: `https://blockchair.com/bitcoin-sv/address/${account.address}`,
        hasReplayProtection: true,
        replayMethod: 'Tx Split / ElectrumSV',
      },
      {
        symbol: 'BTG',
        name: 'Bitcoin Gold',
        networkName: lang === 'th' ? 'Equihash PoW (ขุดด้วย GPU)' : 'Equihash PoW (GPU Mining)',
        amount: btgAmount,
        amountFormatted: `${btgAmount.toFixed(6)} BTG`,
        priceUsd: btgPrice,
        priceFormatted: formatFiat(btgPrice, currency, btgPrice * 34, btgPrice),
        valueUsd: btgValueUsd,
        valueFormatted: formatFiat(btgValueUsd, currency, btgValueUsd * 34, btgValueUsd),
        percentOfPortfolio: Math.round((btgValueUsd / totalPortfolioUsd) * 100),
        isNative: false,
        iconBg: 'from-amber-400 to-yellow-500',
        badgeColor: 'bg-amber-400/15 text-amber-200 border-amber-400/30',
        address: account.address,
        explorerUrl: `https://explorer.bitcoingold.org/insight/address/${account.address}`,
        hasReplayProtection: true,
        replayMethod: 'SIGHASH_FORKID 0x44',
      },
      {
        symbol: 'XEC',
        name: 'eCash',
        networkName: lang === 'th' ? 'Avalanche Consensus (BCH ABC)' : 'Avalanche Consensus (BCH ABC)',
        amount: xecAmount,
        amountFormatted: `${xecAmount.toLocaleString()} XEC`,
        priceUsd: xecPrice,
        priceFormatted: formatFiat(xecPrice, currency, xecPrice * 34, xecPrice),
        valueUsd: xecValueUsd,
        valueFormatted: formatFiat(xecValueUsd, currency, xecValueUsd * 34, xecValueUsd),
        percentOfPortfolio: Math.round((xecValueUsd / totalPortfolioUsd) * 100),
        isNative: false,
        iconBg: 'from-cyan-500 to-blue-600',
        badgeColor: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        address: account.address,
        explorerUrl: `https://blockchair.com/ecash/address/${account.address}`,
        hasReplayProtection: true,
        replayMethod: 'SIGHASH_FORKID Engine',
      },
    ];

    return items;
  }, [account.balanceBtc, account.balanceSats, account.forkBalances, account.address, market, currency, lang]);

  // Overall calculations
  const totalPortfolioUsd = useMemo(() => {
    return holdings.reduce((acc, item) => acc + item.valueUsd, 0);
  }, [holdings]);

  const totalHeldCount = useMemo(() => {
    return holdings.filter((item) => item.amount > 0).length;
  }, [holdings]);

  const totalPortfolioFormatted = useMemo(() => {
    const btcHolding = holdings.find((h) => h.symbol === 'BTC');
    const totalThb = (btcHolding?.amount || 0) * market.priceThb + (totalPortfolioUsd - (btcHolding?.valueUsd || 0)) * 34;
    return formatFiat(totalPortfolioUsd, currency, totalThb, totalPortfolioUsd);
  }, [totalPortfolioUsd, currency, market.priceThb, holdings]);

  const filteredHoldings = useMemo(() => {
    return holdings.filter((item) => {
      // Query match
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matches =
          item.name.toLowerCase().includes(q) ||
          item.symbol.toLowerCase().includes(q) ||
          item.networkName.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Filter tabs
      if (filterMode === 'held') {
        return item.amount > 0;
      }
      if (filterMode === 'forks') {
        return !item.isNative;
      }
      return true;
    });
  }, [holdings, filterMode, searchQuery]);

  const copyAddress = (symbol: string, address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedSymbol(symbol);
    setTimeout(() => setCopiedSymbol(null), 2000);
  };

  return (
    <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden p-4 sm:p-5 space-y-3.5">
      {/* Header Section */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 truncate">
                {lang === 'th' ? 'เหรียญและจำนวนที่ถือครอง' : 'Assets & Balances'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                {totalHeldCount > 0
                  ? (lang === 'th' ? `ถือครอง ${totalHeldCount} เหรียญ` : `${totalHeldCount} Active Coins`)
                  : (lang === 'th' ? '5 เหรียญที่รองรับ' : '5 Supported Assets')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {lang === 'th'
                ? 'ยอดเงินคงเหลือและสินทรัพย์ที่ถือครองจริงในกระเป๋าของคุณ'
                : 'Real on-chain holdings and balances in this vault'}
            </p>
          </div>
        </div>

        {/* Sync Blockchain action */}
        {onSyncBlockchain && (
          <button
            type="button"
            onClick={onSyncBlockchain}
            disabled={isSyncing}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-amber-400 text-xs font-semibold transition-all border border-slate-700/80 flex items-center gap-1.5 shrink-0 active:scale-95"
            title={lang === 'th' ? 'รีเฟรชยอดเงินจากบล็อกเชน' : 'Refresh balances from blockchain'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden xs:inline text-[11px]">{lang === 'th' ? 'อัปเดตยอด' : 'Refresh'}</span>
          </button>
        )}
      </div>

      {/* Portfolio Summary Strip */}
      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-850 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'th' ? 'มูลค่ารวมทุกเหรียญในพอร์ต (Total Portfolio Valuation):' : 'Total Vault Portfolio Valuation:'}</span>
          </span>
          <span className="text-sm font-extrabold text-amber-400 font-mono">
            {totalPortfolioFormatted}
          </span>
        </div>

        {/* Visual Allocation Bar */}
        <div className="space-y-1">
          <div className="w-full h-2 rounded-full bg-slate-850 overflow-hidden flex">
            {holdings.map((coin) => {
              // Allocation segment
              if (coin.amount <= 0 && totalHeldCount > 0) return null;
              const widthPct = totalHeldCount === 0
                ? (coin.symbol === 'BTC' ? 100 : 0)
                : Math.max(coin.percentOfPortfolio, coin.amount > 0 ? 3 : 0);

              const colorClass =
                coin.symbol === 'BTC'
                  ? 'bg-amber-500'
                  : coin.symbol === 'BCH'
                  ? 'bg-emerald-500'
                  : coin.symbol === 'BSV'
                  ? 'bg-yellow-500'
                  : coin.symbol === 'BTG'
                  ? 'bg-orange-400'
                  : 'bg-cyan-500';

              return (
                <div
                  key={coin.symbol}
                  style={{ width: `${widthPct}%` }}
                  className={`h-full ${colorClass} transition-all duration-500`}
                  title={`${coin.symbol}: ${coin.amountFormatted} (${coin.percentOfPortfolio}%)`}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-0.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-slate-300 font-bold">BTC</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>BCH</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                <span>BSV</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span>BTG</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                <span>XEC</span>
              </span>
            </div>
            <span className="text-slate-400">100% On-Chain</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', labelTh: 'เหรียญทั้งหมด', labelEn: 'All Coins', count: holdings.length },
            { id: 'held', labelTh: 'มีเหรียญ (>0)', labelEn: 'Holdings (>0)', count: totalHeldCount },
            { id: 'forks', labelTh: 'เหรียญแยกสาขา', labelEn: 'Hard Forks', count: 4 },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterMode(tab.id as any)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                filterMode === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{lang === 'th' ? tab.labelTh : tab.labelEn}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  filterMode === tab.id ? 'bg-slate-950 text-amber-300' : 'bg-slate-850 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'th' ? 'ค้นหาชื่อเหรียญ...' : 'Search asset...'}
            className="w-full sm:w-44 bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
          />
        </div>
      </div>

      {/* Asset List */}
      <div className="space-y-2">
        {filteredHoldings.map((coin) => {
          const isCopied = copiedSymbol === coin.symbol;
          const isPositive = coin.amount > 0;

          return (
            <div
              key={coin.symbol}
              className={`p-3.5 rounded-2xl border transition-all ${
                isPositive
                  ? 'bg-slate-950 border-amber-500/30 shadow-md hover:border-amber-500/50'
                  : 'bg-slate-950/70 border-slate-850 hover:border-slate-750'
              }`}
            >
              {/* Main Asset Row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${coin.iconBg} text-slate-950 font-black text-sm flex items-center justify-center shadow-md shrink-0`}
                  >
                    {coin.symbol}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-100 text-sm truncate">{coin.name}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${coin.badgeColor}`}>
                        {coin.symbol}
                      </span>
                      {coin.isNative ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {lang === 'th' ? 'เหรียญหลัก' : 'Primary'}
                        </span>
                      ) : isPositive ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {lang === 'th' ? 'มีเหรียญ' : 'Holding'}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
                          0.00
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="truncate">{coin.networkName}</span>
                      <span className="text-slate-600">•</span>
                      <span className="font-mono text-slate-300">{coin.priceFormatted}</span>
                    </div>
                  </div>
                </div>

                {/* Amount & Valuation */}
                <div className="text-right shrink-0">
                  <div
                    className={`text-sm sm:text-base font-extrabold font-mono ${
                      isPositive ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  >
                    {coin.amountFormatted}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    ≈ {coin.valueFormatted}
                  </div>
                </div>
              </div>

              {/* Satoshi breakdown for BTC */}
              {coin.symbol === 'BTC' && coin.satsFormatted && (
                <div className="mt-2 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">{lang === 'th' ? 'หน่วยย่อย Satoshis:' : 'Sub-units (Satoshis):'}</span>
                  <span className="text-amber-300 font-bold">{coin.satsFormatted} sats</span>
                </div>
              )}

              {/* Action Bar */}
              <div className="mt-3 pt-2.5 border-t border-slate-850/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => copyAddress(coin.symbol, coin.address)}
                    className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[11px] font-mono transition-colors border border-slate-800 flex items-center gap-1 shrink-0"
                    title={lang === 'th' ? 'คัดลอกแอดเดรสสำหรับรับเหรียญ' : 'Copy Receiving Address'}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-bold text-[10px]">{lang === 'th' ? 'คัดลอกแล้ว' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span className="text-[10px] truncate max-w-[90px] sm:max-w-[130px]">
                          {coin.address.slice(0, 6)}...{coin.address.slice(-4)}
                        </span>
                      </>
                    )}
                  </button>

                  <a
                    href={coin.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors border border-slate-800 shrink-0"
                    title="View Explorer"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Send / Receive / Sweep Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {!coin.isNative && (
                    <button
                      type="button"
                      onClick={() => onOpenLegacyScannerModal ? onOpenLegacyScannerModal() : onNavigateTab('airgap')}
                      className="px-2 py-1 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 font-bold text-[10px] border border-orange-500/30 flex items-center gap-1 transition-all active:scale-95"
                      title={lang === 'th' ? 'กวาดเหรียญจาก Private Key หรือ Address เก่า' : 'Sweep from Legacy Key'}
                    >
                      <Key className="w-2.5 h-2.5" />
                      <span>{lang === 'th' ? 'กวาดเหรียญ' : 'Sweep'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onNavigateTab('receive')}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10.5px] border border-slate-700 flex items-center gap-1 transition-all active:scale-95"
                  >
                    <QrCode className="w-3 h-3 text-emerald-400" />
                    <span>{lang === 'th' ? 'รับ' : 'Receive'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigateTab('send')}
                    className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[10.5px] shadow-sm shadow-amber-500/20 flex items-center gap-1 transition-all active:scale-95"
                  >
                    <Send className="w-3 h-3" />
                    <span>{lang === 'th' ? 'โอน' : 'Send'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legacy Key Sweep & Pre-Fork Asset Recovery Assistance */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-950 to-orange-950/20 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-300">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <Key className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-200 block truncate">
              {lang === 'th' ? 'มีกระเป๋า Bitcoin เก่าก่อนปี 2017 หรือไม่?' : 'Hold legacy pre-fork Bitcoin keys?'}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">
              {lang === 'th'
                ? 'สแกนคีย์เพื่อรับสิทธิ์และกวาดเหรียญ BCH, BSV, BTG, XEC อัตโนมัติ'
                : 'Automated claim & sweep engine for BCH, BSV, BTG, and XEC'}
            </span>
          </div>
        </div>

        {onOpenLegacyScannerModal && (
          <button
            type="button"
            onClick={onOpenLegacyScannerModal}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shrink-0 active:scale-95 transition-all self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'สแกนกวาดเหรียญ Fork' : 'Sweep Fork Coins'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
