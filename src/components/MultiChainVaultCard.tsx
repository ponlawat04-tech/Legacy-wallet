import React, { useEffect, useState } from 'react';
import {
  Layers,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  QrCode,
  Key,
  Info,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Search,
  Filter
} from 'lucide-react';
import { Currency, Language, MarketData, WalletAccount } from '../types/wallet';
import { DerivedChainAccount, deriveMultiChainAddresses } from '../utils/multiChainVault';
import { SUPPORTED_MULTI_CHAINS } from '../types/multiChain';
import { formatFiat } from '../utils/mockMarket';

interface MultiChainVaultCardProps {
  account: WalletAccount;
  market: MarketData;
  currency: Currency;
  lang: Language;
  onNavigateTab: (tab: any) => void;
  onSelectChainForReceive?: (chainId: string) => void;
}

export const MultiChainVaultCard: React.FC<MultiChainVaultCardProps> = ({
  account,
  market,
  currency,
  lang,
  onNavigateTab,
  onSelectChainForReceive,
}) => {
  const [chainAccounts, setChainAccounts] = useState<DerivedChainAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedChain, setCopiedChain] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'btc' | 'forks'>('all');
  const [activeChainDetail, setActiveChainDetail] = useState<DerivedChainAccount | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // Derive addresses for all supported chains from the current account's public key / address base
    deriveMultiChainAddresses(account.publicKey || account.address, account.has25thWord ? 'passphrase' : '', market.chainPrices)
      .then((derived) => {
        if (isMounted) {
          setChainAccounts(derived);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [account.publicKey, account.address, account.has25thWord, market.chainPrices]);

  const copyAddress = (chainId: string, address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedChain(chainId);
    setTimeout(() => setCopiedChain(null), 2000);
  };

  const filteredChains = chainAccounts.filter(c => {
    const matchesSearch = c.chainName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.address.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedCategory === 'btc') {
      return c.chainId === 'BTC';
    }
    if (selectedCategory === 'forks') {
      return c.chainId !== 'BTC';
    }
    return true;
  });

  return (
    <div className="rounded-3xl bg-slate-900 border border-slate-800/90 p-4 sm:p-5 shadow-xl relative overflow-hidden space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 shrink-0">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-slate-50 truncate">
                {lang === 'th' ? 'แอดเดรสบิตคอยน์ & เหรียญแยกสาขา' : 'Bitcoin & Hard Fork Vault Addresses'}
              </h3>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold border border-amber-500/30 shrink-0">
                {SUPPORTED_MULTI_CHAINS.length} Coins
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {lang === 'th' ? 'BTC, BCH, BSV, BTG, XEC (BIP-44/84 Deterministic Keys)' : 'Native support for Bitcoin & Hard Fork blockchains'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('receive')}
          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-[11px] font-bold transition-all border border-slate-700/80 flex items-center gap-1 shrink-0 active:scale-95"
        >
          <QrCode className="w-3.5 h-3.5 text-amber-400" />
          <span>{lang === 'th' ? 'รับเหรียญ' : 'Receive'}</span>
        </button>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {(['all', 'btc', 'forks'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all shrink-0 uppercase tracking-wider text-[9.5px] ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat === 'all'
                ? (lang === 'th' ? 'ทั้งหมด' : 'All')
                : cat === 'btc'
                ? 'Bitcoin'
                : (lang === 'th' ? 'เหรียญแยกสาขา' : 'Forks')}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'th' ? 'ค้นหาเครือข่าย/เหรียญ...' : 'Search chains...'}
            className="w-full sm:w-40 bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
          />
        </div>
      </div>

      {/* Chain List Cards */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400 space-y-2">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-400" />
          <p>{lang === 'th' ? 'กำลังคำนวณที่อยู่กระเป๋าบิตคอยน์และเหรียญแยกสาขาตามมาตรฐาน BIP-44/84...' : 'Deriving Bitcoin & fork keys via BIP-44/84...'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {filteredChains.map((c) => {
            const isCopied = copiedChain === c.chainId;
            const livePrice = market.chainPrices?.[c.chainId] || c.priceUsd;
            const priceFormatted = formatFiat(livePrice, currency, livePrice * 34.0, livePrice);

            return (
              <div
                key={c.chainId}
                className="p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800/90 hover:border-indigo-500/40 transition-all flex flex-col justify-between gap-2 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${c.iconBg} flex items-center justify-center text-slate-950 font-extrabold text-xs shadow-sm shrink-0`}>
                      {c.symbol.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-100 truncate">{c.chainName}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold border shrink-0 ${c.badgeColor}`}>
                          {c.symbol}
                        </span>
                      </div>
                      <span className="text-[9.5px] text-slate-400 block font-mono truncate">
                        {c.formatLabel}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold font-mono text-slate-200 block">
                      {priceFormatted}
                    </span>
                    <span className="text-[8.5px] font-mono text-emerald-400 font-semibold">
                      Live Rate
                    </span>
                  </div>
                </div>

                {/* Address bar & Quick Copy */}
                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80 bg-slate-900/60 px-2.5 py-1.5 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px] sm:max-w-[240px]" title={c.address}>
                    {c.address}
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => copyAddress(c.chainId, c.address)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-indigo-300 transition-colors border border-slate-700/60 active:scale-95"
                      title="Copy Address"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={c.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors border border-slate-700/60 active:scale-95"
                      title="View on Explorer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Zero-Exposure Derivation Notice */}
      <div className="p-2.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-xs flex items-center justify-between text-indigo-300 gap-2">
        <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] leading-tight">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            {lang === 'th'
              ? 'คำนวณกุญแจทุกเครือข่ายแบบ Deterministic (SLIP-0044 & BIP-44/84) ปลอดภัย 100%'
              : 'Deterministic derivation across all major chains (SLIP-0044 & BIP-44/84).'}
          </span>
        </span>
        <span className="font-mono text-[9px] bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30 text-indigo-200 font-bold shrink-0">
          AIR-GAP
        </span>
      </div>
    </div>
  );
};
