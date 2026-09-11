import React, { useState } from 'react';
import {
  TrendingUp,
  History,
  Activity,
  Zap,
  Clock,
  Layers,
  ArrowRightLeft,
  RefreshCw,
  Gauge,
  Flame,
  Globe,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Currency, Language, MarketData } from '../../types/wallet';
import { i18n } from '../../utils/i18n';
import { btcToSats, formatFiat, satsToBtc } from '../../utils/mockMarket';
import { SUPPORTED_MULTI_CHAINS } from '../../types/multiChain';

interface MarketTabProps {
  market: MarketData;
  currency: Currency;
  lang: Language;
  onRefreshMarket: () => void;
  onNavigateToHistory?: () => void;
}

export const MarketTab: React.FC<MarketTabProps> = ({
  market,
  currency,
  lang,
  onRefreshMarket,
  onNavigateToHistory,
}) => {
  const [calcBtc, setCalcBtc] = useState<string>('0.01');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const t = i18n[lang];

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefreshMarket();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const parsedBtc = parseFloat(calcBtc) || 0;
  const satsCalculated = btcToSats(parsedBtc);
  const usdCalculated = parsedBtc * market.priceUsd;
  const thbCalculated = parsedBtc * market.priceThb;

  const currentBlock = market.currentBlock || 884120;
  const nextHalvingBlock = 1050000;
  const blocksRemaining = nextHalvingBlock - currentBlock;
  const daysRemaining = Math.round((blocksRemaining * 10) / (60 * 24)); // 10 min per block

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-300">
      {/* Activity & Market Segmented Switcher */}
      {onNavigateToHistory && (
        <div className="flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={onNavigateToHistory}
            className="flex-1 py-2 px-3 rounded-xl text-slate-400 hover:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all hover:bg-slate-800/60"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'th' ? 'ประวัติรายการ (History)' : 'Tx History'}</span>
          </button>
          <button
            type="button"
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'สภาวะตลาด & ค่าธรรมเนียม' : 'Market & Fees'}</span>
          </button>
        </div>
      )}

      {/* Price Banner */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Activity className="w-4 h-4 text-amber-400" />
            {lang === 'th' ? 'ราคาบิตคอยน์สด (Live Bitcoin Price)' : 'Live Bitcoin Price'}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700/80 active:rotate-180"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>

        <div className="flex items-baseline gap-3 my-2">
          <div className="text-3xl font-extrabold text-slate-50 font-mono">
            {currency === 'THB'
              ? `฿${market.priceThb.toLocaleString('th-TH')}`
              : `$${market.priceUsd.toLocaleString('en-US')}`}
          </div>
          <div
            className={`px-2 py-0.5 rounded-lg text-xs font-bold font-mono ${
              market.change24h >= 0
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
            }`}
          >
            {market.change24h >= 0 ? '+' : ''}{market.change24h.toFixed(2)}%
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-800 text-xs">
          <div>
            <span className="text-slate-500 text-[11px]">
              {lang === 'th' ? 'ราคาสูงสุด 24 ชม. (High):' : '24h High:'}
            </span>
            <span className="font-mono text-slate-200 font-semibold block mt-0.5">
              {currency === 'THB'
                ? `฿${(market.high24hThb || Math.round(market.high24h * (market.priceThb / (market.priceUsd || 1)))).toLocaleString('th-TH')}`
                : `$${market.high24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[11px]">
              {lang === 'th' ? 'ราคาต่ำสุด 24 ชม. (Low):' : '24h Low:'}
            </span>
            <span className="font-mono text-slate-200 font-semibold block mt-0.5">
              {currency === 'THB'
                ? `฿${(market.low24hThb || Math.round(market.low24h * (market.priceThb / (market.priceUsd || 1)))).toLocaleString('th-TH')}`
                : `$${market.low24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
          </div>
        </div>
      </div>

      {/* Bitcoin & Hard Fork Live Rates Matrix */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-amber-400" />
            {lang === 'th' ? 'ราคาบิตคอยน์และเหรียญแยกสาขา (Bitcoin & Hard Forks)' : 'Bitcoin & Hard Fork Assets Live Rates'}
          </h3>
          <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            {SUPPORTED_MULTI_CHAINS.length} Coins
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {SUPPORTED_MULTI_CHAINS.map((chain) => {
            const price = market.chainPrices?.[chain.id] || chain.defaultPriceUsd;
            const priceFormatted = formatFiat(price, currency, price * 34.0, price);

            return (
              <div
                key={chain.id}
                className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800/90 flex flex-col justify-between gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${chain.iconBg}`} />
                    <span className="text-xs font-bold text-slate-200">{chain.symbol}</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase">{chain.name.slice(0, 8)}</span>
                </div>
                <div className="text-xs font-mono font-extrabold text-slate-100 mt-1">
                  {priceFormatted}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mempool Fee Rates Box */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Gauge className="w-4 h-4 text-amber-400" />
            {lang === 'th' ? 'ค่าธรรมเนียม Mempool ปัจจุบัน (Sat/vB)' : 'Live Mempool Fee Rates'}
          </h3>
          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            Realtime
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-center">
            <span className="text-[10px] font-semibold text-slate-400 block mb-1">
              {lang === 'th' ? 'ประหยัด (~1 ชม.)' : 'Low (~1 hr)'}
            </span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              {market.feeEstimates.low} <span className="text-[10px] text-slate-500">sat/vB</span>
            </span>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-2xl border border-amber-500/40 text-center">
            <span className="text-[10px] font-semibold text-amber-300 block mb-1">
              {lang === 'th' ? 'ปานกลาง (~30 นาที)' : 'Medium (~30m)'}
            </span>
            <span className="text-lg font-bold font-mono text-amber-400">
              {market.feeEstimates.medium} <span className="text-[10px] text-slate-500">sat/vB</span>
            </span>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-2xl border border-rose-500/40 text-center">
            <span className="text-[10px] font-semibold text-rose-300 block mb-1">
              {lang === 'th' ? 'ด่วนที่สุด (บล็อกถัดไป)' : 'High (Next Block)'}
            </span>
            <span className="text-lg font-bold font-mono text-rose-400">
              {market.feeEstimates.high} <span className="text-[10px] text-slate-500">sat/vB</span>
            </span>
          </div>
        </div>
      </div>

      {/* Satoshi / BTC Converter */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-amber-400" />
          {lang === 'th' ? 'เครื่องคำนวณแปลงค่า Satoshi / BTC / บาท' : 'Satoshi & Currency Converter'}
        </h3>

        <div className="space-y-2">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Bitcoin Amount (BTC)</label>
            <input
              type="number"
              step="0.0001"
              value={calcBtc}
              onChange={(e) => setCalcBtc(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-sm font-mono text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Satoshis:</span>
              <span className="font-mono text-amber-400 font-bold text-sm">
                {satsCalculated.toLocaleString('en-US')} sats
              </span>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
              <span className="text-slate-500 text-[10px] block">THB / USD:</span>
              <span className="font-mono text-slate-100 font-bold text-sm">
                {currency === 'THB' ? `฿${thbCalculated.toLocaleString('th-TH', { maximumFractionDigits: 0 })}` : `$${usdCalculated.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Network Stats Card */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-500" />
          {lang === 'th' ? 'ข้อมูลเครือข่ายบิตคอยน์ (Network Metrics)' : 'Bitcoin Network Stats'}
        </h3>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
            <span className="text-slate-500 text-[10px] block">Current Block:</span>
            <span className="font-mono text-slate-200 font-bold text-sm">
              #{currentBlock.toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
            <span className="text-slate-500 text-[10px] block">Next Halving (~5th):</span>
            <span className="font-mono text-amber-400 font-bold text-sm">
              ~{daysRemaining} {lang === 'th' ? 'วัน' : 'days'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
