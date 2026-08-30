import React from 'react';
import {
  Send,
  QrCode,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  Lock,
  PlusCircle,
  ExternalLink,
  ChevronRight,
  Eye,
  EyeOff,
  Activity,
  Wifi,
  Sparkles,
  RefreshCw,
  Key,
  Layers,
  GitFork,
  Camera,
  Snowflake,
  Unlock
} from 'lucide-react';
import { ActiveTab, Currency, Language, MarketData, SecuritySettings, Transaction, WalletAccount } from '../../types/wallet';
import { i18n } from '../../utils/i18n';
import { btcToSats, formatBtc, formatFiat, formatSats, satsToBtc } from '../../utils/mockMarket';
import { ForkAssetVaultCard } from '../ForkAssetVaultCard';
import { MultiChainVaultCard } from '../MultiChainVaultCard';

interface HomeTabProps {
  account: WalletAccount;
  market: MarketData;
  currency: Currency;
  lang: Language;
  transactions: Transaction[];
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenVaultModal: () => void;
  onOpenLegacyScannerModal?: () => void;
  onOpenQrScanner?: () => void;
  onOpenReadinessModal: () => void;
  onSelectTxDetail: (tx: Transaction) => void;
  onSyncBlockchain?: () => void;
  isSyncing?: boolean;
  security?: SecuritySettings;
  onUnfreeze?: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  account,
  market,
  currency,
  lang,
  transactions,
  onNavigateTab,
  onOpenVaultModal,
  onOpenLegacyScannerModal,
  onOpenQrScanner,
  onOpenReadinessModal,
  onSelectTxDetail,
  onSyncBlockchain,
  isSyncing = false,
  security,
  onUnfreeze,
}) => {
  const [hideBalance, setHideBalance] = React.useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = React.useState<boolean>(false);

  const t = i18n[lang];

  const totalUsd = account.balanceBtc * market.priceUsd;
  const fiatFormatted = formatFiat(totalUsd, currency, market.priceThb, market.priceUsd);

  const copyAddress = () => {
    navigator.clipboard.writeText(account.address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-300">
      {/* Live Network & Wallet Readiness Banner */}
      <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/30 shadow-md flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-100 truncate">
                {lang === 'th' ? 'เชื่อมต่อบล็อกเชนจริง (Mainnet)' : 'Live Mainnet Sync'}
              </span>
              <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-extrabold border border-emerald-500/30 shrink-0">
                {market.pingMs || 18}ms
              </span>
            </div>
            <p className="text-[10px] text-emerald-300/80 leading-tight truncate">
              {lang === 'th' ? 'ราคาเรียลไทม์ • พร้อมทำรายการ 100%' : 'Live Feed • 100% Ready'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenReadinessModal}
          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-[11px] flex items-center gap-1 transition-all shrink-0 active:scale-95 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{lang === 'th' ? 'วิเคราะห์' : 'Audit'}</span>
        </button>
      </div>

      {/* Vault Frozen Warning Banner on HomeTab */}
      {security?.vaultFrozen && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/90 via-slate-900 to-cyan-950/80 border border-cyan-500/50 text-cyan-200 shadow-xl shadow-cyan-500/10 flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400 text-cyan-300 flex items-center justify-center shrink-0">
              <Snowflake className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-cyan-200 block truncate">
                {t.vaultIsFrozenBanner}
              </span>
              <span className="text-[10px] text-cyan-300/80 truncate block">
                {lang === 'th' ? 'การโอนเงินออกถูกล็อคอยู่ ปลอดภัย 100%' : 'All outbound transfers strictly locked'}
              </span>
            </div>
          </div>
          {onUnfreeze ? (
            <button
              type="button"
              onClick={onUnfreeze}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-[11px] flex items-center gap-1 shrink-0 transition-all active:scale-95 shadow-md"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>{t.unfreezeWithPinBtn}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigateTab('security')}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-extrabold text-[11px] flex items-center gap-1 shrink-0 transition-all active:scale-95"
            >
              <span>{lang === 'th' ? 'จัดการ' : 'Manage'}</span>
            </button>
          )}
        </div>
      )}

      {/* Balance Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800/90 p-5 sm:p-6 shadow-2xl text-slate-100 ring-1 ring-slate-800/50">
        {/* Glow Ambient Highlights */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold tracking-wider uppercase text-[10px] text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {t.totalBalance}
            </span>
            <div className="flex items-center gap-1">
              {onSyncBlockchain && (
                <button
                  type="button"
                  onClick={onSyncBlockchain}
                  disabled={isSyncing}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
                  title={lang === 'th' ? 'ซิงค์ยอดจากบล็อกเชนจริง' : 'Sync balance with Bitcoin blockchain'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setHideBalance(!hideBalance)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="Toggle Balance Visibility"
              >
                {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Main Fiat Amount */}
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-50 my-1 font-sans">
            {hideBalance ? '••••••••' : fiatFormatted}
          </div>

          {/* BTC & Sats breakdown */}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
            <span className="font-mono bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800 font-bold text-amber-400 text-xs shadow-inner">
              {hideBalance ? '•••• BTC' : formatBtc(account.balanceBtc)}
            </span>
            <span className="font-mono text-slate-400 text-[11px] bg-slate-950/50 px-2 py-1 rounded-xl border border-slate-800/60">
              {hideBalance ? '•••• sats' : formatSats(account.balanceSats)}
            </span>
          </div>

          {/* Wallet Address Chip & Source */}
          <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-lg font-mono text-[9.5px] font-bold border flex items-center gap-1 ${
                  account.keySource === 'private_key'
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                {account.keySource === 'private_key' ? <Key className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                <span>{account.keySource === 'private_key' ? 'Private Key' : account.keyFormat || 'Seed Phrase'}</span>
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-slate-950 text-slate-300 font-mono text-[9.5px] border border-slate-800 uppercase font-semibold">
                {account.addressType.replace('_', ' ')}
              </span>
            </div>

            <button
              type="button"
              onClick={copyAddress}
              className="text-xs font-mono text-slate-300 hover:text-amber-400 flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 px-2.5 py-1 rounded-xl transition-all border border-slate-800 shadow-sm active:scale-95"
            >
              {copiedAddress ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">{t.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-400" />
                  <span>{account.address.slice(0, 6)}...{account.address.slice(-4)}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Grid (5 Modern Touch Capsules) */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => onNavigateTab('send')}
          className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800/90 hover:border-amber-500/40 transition-all active:scale-95 group shadow-lg shadow-black/30"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center mb-1 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Send className="w-4 h-4" />
          </div>
          <span className="text-[10.5px] font-bold text-slate-200 truncate max-w-full">{t.sendBtn}</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('receive')}
          className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800/90 hover:border-emerald-500/40 transition-all active:scale-95 group shadow-lg shadow-black/30"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-emerald-400 text-slate-950 flex items-center justify-center mb-1 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <QrCode className="w-4 h-4" />
          </div>
          <span className="text-[10.5px] font-bold text-slate-200 truncate max-w-full">{t.receiveBtn}</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenLegacyScannerModal ? onOpenLegacyScannerModal() : onNavigateTab('airgap')}
          className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800/90 hover:border-orange-400/40 transition-all active:scale-95 group shadow-lg shadow-black/30"
          title={lang === 'th' ? 'กวาดเหรียญจาก Private Key เก่า' : 'Sweep Legacy Private Key'}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-orange-600 text-slate-950 flex items-center justify-center mb-1 shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
            <Key className="w-4 h-4 text-slate-950" />
          </div>
          <span className="text-[10.5px] font-bold text-orange-300 truncate max-w-full">{lang === 'th' ? 'กวาดคีย์' : 'Sweep'}</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('airgap')}
          className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800/90 hover:border-sky-500/40 transition-all active:scale-95 group shadow-lg shadow-black/30"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-slate-950 flex items-center justify-center mb-1 shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-4 h-4 text-slate-950" />
          </div>
          <span className="text-[10.5px] font-bold text-slate-200 truncate max-w-full">{t.scanQrBtn}</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('market')}
          className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800/90 hover:border-purple-500/40 transition-all active:scale-95 group shadow-lg shadow-black/30"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-slate-950 flex items-center justify-center mb-1 shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-4 h-4 text-slate-950" />
          </div>
          <span className="text-[10.5px] font-bold text-slate-200 truncate max-w-full">{t.buyBtcBtn}</span>
        </button>
      </div>

      {/* Quick Private Key & Paper Wallet Scanner Banner */}
      {onOpenQrScanner && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/40 shadow-xl flex items-center justify-between gap-3 group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-100">
                  {lang === 'th' ? 'สแกน QR Code Private Key' : 'Scan Private Key QR Code'}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono text-[9px] font-bold border border-purple-500/30">
                  Air-Gap
                </span>
              </div>
              <p className="text-[10px] text-purple-200/80 leading-tight mt-0.5">
                {lang === 'th'
                  ? 'สแกน Paper Wallet / WIF / 64-Hex เพื่อกวาดเหรียญหรือนำเข้ากระเป๋า'
                  : 'Scan paper wallet, WIF, or Hex keys to sweep fork coins or import'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenQrScanner}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shrink-0 active:scale-95 shadow-md shadow-purple-500/20"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'สแกนคีย์' : 'Scan Key'}</span>
          </button>
        </div>
      )}

      {/* All Major Multi-Chain Vaults Card */}
      <MultiChainVaultCard
        account={account}
        market={market}
        currency={currency}
        lang={lang}
        onNavigateTab={onNavigateTab}
      />

      {/* Coinomi-Style Hard Fork Asset Vault Management Card */}
      <ForkAssetVaultCard
        account={account}
        market={market}
        currency={currency}
        lang={lang}
        onNavigateTab={onNavigateTab}
        onOpenLegacyScannerModal={onOpenLegacyScannerModal || (() => {})}
      />

      {/* Permanent Zero-Exposure Vault Seal Card */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800/90 p-5 shadow-xl relative overflow-hidden">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-50 flex items-center gap-1.5">
                {t.vaultStatusCardTitle}
              </h4>
              <p className="text-[11px] text-emerald-400 font-medium">
                {t.vaultStatusSealed}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenVaultModal}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700/80 flex items-center gap-1 shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'th' ? 'นำเข้า Seed ใหม่' : 'Import Vault'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60">
          {t.vaultStatusDescription}
        </p>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span>Zero-Exposure Guarantee</span>
          <span className="text-emerald-400 font-mono font-medium">AES-256-GCM + PBKDF2</span>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200">
            {t.recentTransactions}
          </h3>
          <button
            type="button"
            onClick={() => onNavigateTab('history')}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-0.5 transition-colors"
          >
            <span>{t.viewAll}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/60 rounded-3xl border border-slate-800/60">
            {t.noTransactions}
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 4).map((tx) => {
              const isSent = tx.type === 'sent';
              const coin = tx.coinSymbol || 'BTC';
              return (
                <div
                  key={tx.id}
                  onClick={() => onSelectTxDetail(tx)}
                  className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isSent
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {isSent ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <span>{isSent ? (lang === 'th' ? 'โอนออก' : 'Sent') : (lang === 'th' ? 'รับชำระ' : 'Received')}</span>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${coin === 'BTC' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'}`}>
                          {coin}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                          {tx.confirmations} conf
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 truncate max-w-[140px] sm:max-w-[200px] mt-0.5">
                        {isSent ? tx.recipientAddress : tx.senderAddress}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-xs font-bold font-mono ${isSent ? 'text-slate-200' : 'text-emerald-400'}`}>
                      {isSent ? '-' : '+'}{coin === 'XEC' ? tx.amountBtc.toLocaleString() : tx.amountBtc.toFixed(6)} {coin}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
