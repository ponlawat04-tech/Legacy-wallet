import React from 'react';
import {
  Coins,
  ShieldCheck,
  GitFork,
  Send,
  QrCode,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  Plus,
  ExternalLink,
  Info,
  ChevronRight,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';
import { Currency, HardForkCoinBalance, Language, MarketData, WalletAccount } from '../types/wallet';
import { formatFiat } from '../utils/mockMarket';

export interface ForkCoinAssetInfo {
  symbol: 'BCH' | 'BSV' | 'BTG' | 'XEC';
  name: string;
  forkDate: string;
  replayProtection: string;
  iconBg: string;
  badgeColor: string;
  defaultPriceUsd: number;
  descriptionTh: string;
  descriptionEn: string;
}

export const SUPPORTED_FORK_ASSETS: ForkCoinAssetInfo[] = [
  {
    symbol: 'BCH',
    name: 'Bitcoin Cash',
    forkDate: 'Aug 2017 (Block 478,558)',
    replayProtection: 'SIGHASH_FORKID (BIP-143 modification)',
    iconBg: 'from-emerald-500 to-green-600',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    defaultPriceUsd: 385.50,
    descriptionTh: 'เหรียญแยกสาขาตัวแรก บล็อกขนาดใหญ่ 32MB โอนไวค่าธรรมเนียมต่ำ',
    descriptionEn: 'First major hard fork, 32MB blocksize with low fees',
  },
  {
    symbol: 'BSV',
    name: 'Bitcoin SV',
    forkDate: 'Nov 2018 (Block 556,760)',
    replayProtection: 'Custom Transaction Split / ElectrumSV',
    iconBg: 'from-amber-500 to-yellow-600',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    defaultPriceUsd: 58.20,
    descriptionTh: 'Satoshi Vision บล็อกไร้ขีดจำกัดเพื่อสเกลระบบข้อมูลขนาดใหญ่',
    descriptionEn: 'Satoshi Vision unbounded blocks for enterprise data scaling',
  },
  {
    symbol: 'BTG',
    name: 'Bitcoin Gold',
    forkDate: 'Oct 2017 (Block 491,407)',
    replayProtection: 'SIGHASH_FORKID with 0x44 flag',
    iconBg: 'from-yellow-500 to-amber-600',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    defaultPriceUsd: 32.80,
    descriptionTh: 'Equihash PoW กระจายอำนาจการขุดด้วย GPU ป้องกัน ASIC ผูกขาด',
    descriptionEn: 'Equihash GPU-friendly PoW algorithm against ASIC dominance',
  },
  {
    symbol: 'XEC',
    name: 'eCash',
    forkDate: 'Nov 2020 / Jul 2021 (Block 661,648)',
    replayProtection: 'SIGHASH_FORKID protected protocol',
    iconBg: 'from-cyan-500 to-blue-600',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    defaultPriceUsd: 0.000038,
    descriptionTh: 'เหรียญ eCash (เดิม Bitcoin Cash ABC) มีระบบ Avalanche Consensus',
    descriptionEn: 'eCash (formerly BCH ABC) with Avalanche instant consensus',
  },
];

interface ForkAssetVaultCardProps {
  account: WalletAccount;
  market: MarketData;
  currency: Currency;
  lang: Language;
  onNavigateTab: (tab: any) => void;
  onOpenLegacyScannerModal: () => void;
  onOpenMultiWalletAudit?: () => void;
}

export const ForkAssetVaultCard: React.FC<ForkAssetVaultCardProps> = ({
  account,
  market,
  currency,
  lang,
  onNavigateTab,
  onOpenLegacyScannerModal,
  onOpenMultiWalletAudit,
}) => {
  const forkBalances = account.forkBalances || [];

  // Calculate total fork valuation
  const totalForkValuationUsd = SUPPORTED_FORK_ASSETS.reduce((acc, coin) => {
    const holding = forkBalances.find(f => f.symbol === coin.symbol);
    const amount = holding ? holding.amount : 0;
    const price = market.forkPrices?.[coin.symbol] || coin.defaultPriceUsd;
    return acc + amount * price;
  }, 0);

  return (
    <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden text-slate-100 space-y-3 p-4 sm:p-5">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <GitFork className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-slate-50">
                {lang === 'th' ? 'พอร์ตเหรียญแยกสาขา (Hard Fork Vault)' : 'Hard Fork Asset Vault'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[9px] font-bold border border-cyan-500/30">
                COINOMI COMPATIBLE
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
              {lang === 'th'
                ? 'จัดเก็บ โอนย้าย รับเหรียญ BCH, BSV, BTG, XEC พร้อมระบบกันธุรกรรมซ้ำซ้อน'
                : 'Store, send, receive BCH, BSV, BTG, XEC with replay protection'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenMultiWalletAudit && (
            <button
              type="button"
              onClick={onOpenMultiWalletAudit}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95 shadow-md shadow-amber-500/10"
              title={lang === 'th' ? 'ตรวจสอบกระบวนการดึงเหรียญ Forks' : 'Audit Fork Pipeline'}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'ตรวจสอบกระบวนการ' : 'Audit Pipeline'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenLegacyScannerModal}
            className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95 shadow-md shadow-cyan-500/10"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'สแกน/เคลม' : 'Scan Forks'}</span>
          </button>
        </div>
      </div>

      {/* Portfolio Total Valuation Bar */}
      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-medium">
            {lang === 'th' ? 'มูลค่าประเมินรวม Hard Forks:' : 'Total Fork Portfolio Value:'}
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm font-extrabold text-cyan-300 font-mono">
            {formatFiat(totalForkValuationUsd, currency, market.priceThb, market.priceUsd)}
          </div>
        </div>
      </div>

      {/* 4 Supported Hard Fork Assets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        {SUPPORTED_FORK_ASSETS.map(asset => {
          const holding = forkBalances.find(f => f.symbol === asset.symbol);
          const amount = holding ? holding.amount : 0;
          const livePrice = market.forkPrices?.[asset.symbol] || asset.defaultPriceUsd;
          const valueUsd = amount * livePrice;

          return (
            <div
              key={asset.symbol}
              className={`p-3 rounded-2xl border transition-all ${
                amount > 0
                  ? 'bg-cyan-950/20 border-cyan-500/40 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${asset.iconBg} text-slate-950 font-black font-mono text-xs flex items-center justify-center shadow-md`}>
                    {asset.symbol}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <span>{asset.name}</span>
                      <span className="text-[9px] font-mono text-slate-400">({asset.symbol})</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      ${livePrice < 0.01 ? livePrice.toFixed(6) : livePrice.toFixed(2)} USD
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-xs font-extrabold font-mono ${amount > 0 ? 'text-cyan-300' : 'text-slate-400'}`}>
                    {asset.symbol === 'XEC' ? amount.toLocaleString() : amount.toFixed(6)} {asset.symbol}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    ≈ {formatFiat(valueUsd, currency, market.priceThb, market.priceUsd)}
                  </div>
                </div>
              </div>

              {/* Quick Actions for this Fork Coin */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between gap-1 text-[10px]">
                <span className="text-slate-400 truncate max-w-[130px]" title={asset.replayProtection}>
                  🛡️ {asset.replayProtection.split(' ')[0]}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onNavigateTab('receive')}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
                  >
                    {lang === 'th' ? 'รับ' : 'Receive'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('send')}
                    className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold transition-colors"
                  >
                    {lang === 'th' ? 'โอน' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
