import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Coins,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Cpu,
  ArrowRight,
  Database,
  Activity,
  Check,
  Lock,
  GitFork
} from 'lucide-react';
import { Language, Currency, MarketData, WalletAccount } from '../types/wallet';
import {
  WalletBtcAuditItem,
  WalletForkAuditItem,
  auditAllWalletsBtc,
  auditForkExtractionPipeline
} from '../utils/walletAuditor';
import { formatBtc, formatFiat, formatSats } from '../utils/mockMarket';

interface MultiWalletAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: WalletAccount[];
  activeAccount: WalletAccount;
  market: MarketData;
  currency: Currency;
  lang: Language;
  onApplyUpdatedAccounts: (updated: WalletAccount[]) => void;
}

export const MultiWalletAuditModal: React.FC<MultiWalletAuditModalProps> = ({
  isOpen,
  onClose,
  accounts,
  activeAccount,
  market,
  currency,
  lang,
  onApplyUpdatedAccounts,
}) => {
  const [isAuditingBtc, setIsAuditingBtc] = useState<boolean>(false);
  const [isAuditingForks, setIsAuditingForks] = useState<boolean>(false);
  const [walletAuditItems, setWalletAuditItems] = useState<WalletBtcAuditItem[]>([]);
  const [forkAuditItems, setForkAuditItems] = useState<WalletForkAuditItem[]>([]);
  const [selectedWalletForFork, setSelectedWalletForFork] = useState<string>(activeAccount.id);
  const [activeTab, setActiveTab] = useState<'btc_all' | 'fork_pipeline'>('btc_all');
  const [expandedFork, setExpandedFork] = useState<string | null>(null);

  // Initialize audit items on open
  useEffect(() => {
    if (isOpen) {
      const initialItems: WalletBtcAuditItem[] = accounts.map((acc) => ({
        accountId: acc.id,
        walletName: acc.name,
        address: acc.address,
        addressType: acc.addressType,
        keySource: acc.keySource,
        color: acc.color,
        initialBtc: acc.balanceBtc,
        syncedBtc: acc.balanceBtc,
        syncedSats: acc.balanceSats,
        txCount: 0,
        unconfirmedSats: 0,
        status: 'pending',
      }));
      setWalletAuditItems(initialItems);
      // Run BTC simultaneous audit automatically
      runSimultaneousBtcAudit();
    }
  }, [isOpen, accounts]);

  // Execute simultaneous balance checking for all wallets
  const runSimultaneousBtcAudit = async () => {
    setIsAuditingBtc(true);
    try {
      const result = await auditAllWalletsBtc(accounts, (progress) => {
        setWalletAuditItems(progress);
      });
      onApplyUpdatedAccounts(result.updatedAccounts);
    } catch (e) {
      console.error('Simultaneous BTC audit failed:', e);
    } finally {
      setIsAuditingBtc(false);
    }
  };

  // Run in-depth fork extraction pipeline audit
  const runForkExtractionAudit = async () => {
    const targetAcc = accounts.find((a) => a.id === selectedWalletForFork) || activeAccount;
    setIsAuditingForks(true);
    try {
      const result = await auditForkExtractionPipeline(
        targetAcc.address,
        targetAcc.balanceSats,
        market.forkPrices || {},
        (progress) => {
          setForkAuditItems(progress);
        }
      );
      setForkAuditItems(result);
    } catch (e) {
      console.error('Fork extraction audit failed:', e);
    } finally {
      setIsAuditingForks(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'fork_pipeline' && forkAuditItems.length === 0) {
      runForkExtractionAudit();
    }
  }, [activeTab, selectedWalletForFork]);

  if (!isOpen) return null;

  const totalSatsAudited = walletAuditItems.reduce((acc, curr) => acc + curr.syncedSats, 0);
  const totalBtcAudited = totalSatsAudited / 100000000;
  const totalFiatAudited = totalBtcAudited * (market.priceUsd || 96500);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-100 truncate">
                  {lang === 'th' ? 'ระบบตรวจสอบยอดเหรียญ & Hard Forks' : 'Multi-Wallet & Fork Audit System'}
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                  {accounts.length} Wallets
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {lang === 'th'
                  ? 'ตรวจสอบยอด BTC ทุกกระเป๋าพร้อมกัน + ตรวจสอบกระบวนการดึงเหรียญ Forks'
                  : 'Simultaneous BTC check across all wallets + Fork extraction pipeline verification'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center text-xs font-bold transition-all shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-2xl bg-slate-950 p-1 border border-slate-800/80 mb-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('btc_all')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'btc_all'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? '1. ตรวจสอบ BTC ทุกกระเป๋าพร้อมกัน' : '1. Check All BTC Wallets'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fork_pipeline')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'fork_pipeline'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? '2. ตรวจสอบกระบวนการดึง Forks' : '2. Fork Pipeline Audit'}</span>
          </button>
        </div>

        {/* Tab 1: Check All BTC Wallets Simultaneously */}
        {activeTab === 'btc_all' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Total Balance Summary Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                  {lang === 'th' ? 'ยอดรวมทุกกระเป๋า (Total Audited Balance)' : 'Total Audited Balance Across All Wallets'}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-amber-400 font-mono">
                    {formatBtc(totalBtcAudited)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ({totalSatsAudited.toLocaleString()} sats)
                  </span>
                </div>
                <div className="text-xs font-medium text-emerald-400 mt-0.5">
                  ≈ {formatFiat(totalFiatAudited, currency, market.priceThb, market.priceUsd)}
                </div>
              </div>

              <button
                type="button"
                onClick={runSimultaneousBtcAudit}
                disabled={isAuditingBtc}
                className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAuditingBtc ? 'animate-spin' : ''}`} />
                <span>{isAuditingBtc ? (lang === 'th' ? 'กำลังตรวจสอบ...' : 'Auditing...') : (lang === 'th' ? 'ตรวจสอบใหม่พร้อมกัน' : 'Re-check All')}</span>
              </button>
            </div>

            {/* Wallets Audit List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-medium">
                <span>{lang === 'th' ? `รายการกระเป๋า (${walletAuditItems.length})` : `Wallets List (${walletAuditItems.length})`}</span>
                <span className="text-[11px] text-amber-400/90 font-mono flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {lang === 'th' ? 'ซิงค์แบบ Parallel Asynchronous' : 'Parallel Async Sync'}
                </span>
              </div>

              {walletAuditItems.map((item, idx) => {
                const isVerified = item.status === 'verified';
                const isSyncing = item.status === 'syncing';

                return (
                  <div
                    key={item.accountId}
                    className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color || '#f59e0b' }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-100 truncate">
                            {item.walletName}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {item.addressType.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 truncate max-w-[260px] sm:max-w-[320px]">
                          {item.address}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                      <div className="text-left sm:text-right">
                        <div className="text-xs font-bold font-mono text-slate-100">
                          {formatBtc(item.syncedBtc)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {formatSats(item.syncedSats)} • {item.txCount} txs
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isSyncing ? (
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          </div>
                        ) : isVerified ? (
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400" title="Verified">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400" title={item.error || 'Failed'}>
                            <AlertCircle className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Fork Extraction Pipeline Verification */}
        {activeTab === 'fork_pipeline' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Wallet Selection for Fork Audit */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 block mb-0.5">
                  {lang === 'th' ? 'เลือกกระเป๋าเป้าหมายเพื่อตรวจสอบเหรียญ Forks:' : 'Target Wallet for Fork Inspection:'}
                </span>
                <select
                  value={selectedWalletForFork}
                  onChange={(e) => setSelectedWalletForFork(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-amber-400"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatBtc(acc.balanceBtc)}) - {acc.address.slice(0, 10)}...
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={runForkExtractionAudit}
                disabled={isAuditingForks}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAuditingForks ? 'animate-spin' : ''}`} />
                <span>{isAuditingForks ? (lang === 'th' ? 'กำลังตรวจสอบ...' : 'Verifying...') : (lang === 'th' ? 'ทดสอบดึงยอดใหม่' : 'Re-verify Forks')}</span>
              </button>
            </div>

            {/* Explanation card */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-slate-300 text-xs flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300 block mb-0.5">
                  {lang === 'th' ? 'มาตรฐานการตรวจสอบ Hard Forks' : 'Hard Fork Extraction Standards'}
                </span>
                <p className="text-[11px] text-slate-300/90 leading-relaxed">
                  {lang === 'th'
                    ? 'ระบบจะทำการตรวจสอบ 4 ขั้นตอน: 1. ตรวจประวัติ snapshot ย้อนหลัง 2. แปลง format ที่อยู่ (CashAddr / Base58) 3. เรียก API node ประจำเชน 4. ตรวจสอบกลไกป้องกัน Replay Attack'
                    : '4-step verification: 1. Historical snapshot verification 2. Address translation 3. Dedicated chain RPC query 4. Replay protection audit.'}
                </p>
              </div>
            </div>

            {/* Fork Coins Pipeline Inspection Cards */}
            <div className="space-y-3">
              {forkAuditItems.map((fork) => {
                const isExpanded = expandedFork === fork.symbol;

                return (
                  <div
                    key={fork.symbol}
                    className="rounded-2xl bg-slate-950/90 border border-slate-800 overflow-hidden transition-all"
                  >
                    {/* Header Row */}
                    <div
                      onClick={() => setExpandedFork(isExpanded ? null : fork.symbol)}
                      className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-900/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-black text-xs text-amber-400 shrink-0">
                          {fork.symbol}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-100">{fork.name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-800 text-slate-400">
                              Block #{fork.forkBlock.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {fork.forkDate} • {fork.replayProtection}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-bold font-mono text-slate-100">
                            {fork.balance.toLocaleString()} {fork.symbol}
                          </div>
                          <div className="text-[10px] text-emerald-400 font-mono">
                            ≈ ${fork.valueUsd.toFixed(2)} USD
                          </div>
                        </div>

                        <div className="text-slate-400 hover:text-slate-200">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Step-by-Step Pipeline Drawer */}
                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-800/80 bg-slate-900/40 space-y-2.5 animate-in fade-in duration-150">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {lang === 'th' ? 'ขั้นตอนการตรวจสอบกระบวนการดึงยอด (Execution Steps)' : 'Execution Pipeline Steps'}
                        </span>

                        <div className="space-y-2">
                          {fork.steps.map((step) => {
                            const isDone = step.status === 'completed';
                            const isRun = step.status === 'running';
                            const isFail = step.status === 'failed';

                            return (
                              <div
                                key={step.stepIndex}
                                className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/70 text-xs flex items-start gap-2.5"
                              >
                                <div className="mt-0.5 shrink-0">
                                  {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  ) : isRun ? (
                                    <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                                  ) : isFail ? (
                                    <AlertCircle className="w-4 h-4 text-rose-400" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-slate-500" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-[11px] text-slate-200">
                                      ขั้นตอน {step.stepIndex}: {step.name}
                                    </span>
                                    <span
                                      className={`text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                        isDone
                                          ? 'bg-emerald-500/20 text-emerald-300'
                                          : isRun
                                          ? 'bg-amber-500/20 text-amber-300'
                                          : isFail
                                          ? 'bg-rose-500/20 text-rose-300'
                                          : 'bg-slate-800 text-slate-400'
                                      }`}
                                    >
                                      {step.status.toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-[10.5px] text-slate-400 mt-0.5">
                                    {step.description}
                                  </p>
                                  {step.details && (
                                    <div className="mt-1.5 p-1.5 rounded-lg bg-slate-900 font-mono text-[10px] text-amber-300/90 border border-slate-800">
                                      {step.details}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* API Endpoint & Explorer */}
                        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10.5px] text-slate-400">
                          <span className="truncate max-w-[280px] sm:max-w-[400px]">
                            Endpoint: <code className="text-amber-400">{fork.apiEndpoint}</code>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 mt-4 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px]">
              {lang === 'th' ? 'การตรวจสอบทำงานแบบ Read-Only ปลอดภัย 100%' : '100% Safe Read-Only Verification'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all active:scale-95"
          >
            {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
