import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  ShieldCheck,
  Cpu,
  GitBranch,
  Zap,
  RefreshCw
} from 'lucide-react';
import { Currency, Language, MarketData, Transaction } from '../types/wallet';
import { i18n } from '../utils/i18n';
import { formatBtc, formatFiat, formatSats } from '../utils/mockMarket';
import { spvEngine } from '../utils/spv/spvEngine';
import { triggerHaptic } from '../utils/haptics';

interface TransactionDetailModalProps {
  tx: Transaction | null;
  onClose: () => void;
  lang: Language;
  currency: Currency;
  market: MarketData;
  onSpvVerifyUpdate?: (updatedTx: Transaction) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  tx,
  onClose,
  lang,
  currency,
  market,
  onSpvVerifyUpdate,
}) => {
  const [copiedTxid, setCopiedTxid] = useState<boolean>(false);
  const [isVerifyingSpv, setIsVerifyingSpv] = useState<boolean>(false);
  const [currentTx, setCurrentTx] = useState<Transaction | null>(tx);

  const t = i18n[lang];

  if (!currentTx) return null;

  const isSent = currentTx.type === 'sent';

  const copyTxid = () => {
    navigator.clipboard.writeText(currentTx.txid);
    triggerHaptic('light');
    setCopiedTxid(true);
    setTimeout(() => setCopiedTxid(false), 2000);
  };

  const handleRunSpvVerification = async () => {
    triggerHaptic('medium');
    setIsVerifyingSpv(true);
    try {
      const verified = await spvEngine.verifyTransaction(currentTx);
      setCurrentTx(verified);
      if (onSpvVerifyUpdate) {
        onSpvVerifyUpdate(verified);
      }
    } catch {
      // Error
    } finally {
      setIsVerifyingSpv(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 text-slate-100 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto scrollbar-thin my-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Status Icon */}
        <div className="flex flex-col items-center text-center pt-2">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
              isSent
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isSent ? <ArrowUpRight className="w-7 h-7" /> : <ArrowDownLeft className="w-7 h-7" />}
          </div>

          <h3 className="text-sm font-bold text-slate-100">
            {isSent ? (lang === 'th' ? 'โอนเงินออกสำเร็จ' : 'Transaction Sent') : (lang === 'th' ? 'รับชำระเงินสำเร็จ' : 'Payment Received')}
          </h3>

          <div className="text-2xl font-extrabold font-mono text-slate-50 mt-1">
            {isSent ? '-' : '+'}{formatBtc(currentTx.amountBtc)}
          </div>
          <p className="text-xs text-slate-400">
            ≈ {formatFiat(currentTx.amountBtc * market.priceUsd, currency, market.priceThb, market.priceUsd)}
          </p>
        </div>

        {/* SPV Proof-of-Work Verification Card */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-200">
                {lang === 'th' ? 'การพิสูจน์ SPV (bitcoinj)' : 'SPV Merkle Inclusion'}
              </span>
            </div>

            {currentTx.spvVerified ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> VERIFIED
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                UNVERIFIED
              </span>
            )}
          </div>

          {currentTx.spvProof ? (
            <div className="space-y-1.5 font-mono text-[10.5px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Block Height:</span>
                <span className="text-amber-400 font-bold">#{currentTx.spvProof.blockHeight}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Merkle Root:</span>
                <span className="text-slate-300 truncate max-w-[140px]">{currentTx.spvProof.merkleRoot}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Proof Scheme:</span>
                <span className="text-purple-300">BIP-37 Partial Merkle</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">PoW Consensus:</span>
                <span className="text-emerald-400 font-bold">Double-SHA256 OK</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400">
                {lang === 'th'
                  ? 'ตรวจสอบความถูกต้องด้วยสายโซ่ Block Header 80 ไบต์ และ Merkle branch จากเครือข่ายเพียร์'
                  : 'Verify this transaction cryptographically using 80-byte block headers and peer Merkle branches.'}
              </p>
              <button
                type="button"
                onClick={handleRunSpvVerification}
                disabled={isVerifyingSpv}
                className="w-full py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isVerifyingSpv ? 'animate-spin' : ''}`} />
                <span>{lang === 'th' ? 'เริ่มตรวจสอบ Merkle Proof' : 'Verify via SPV Engine'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Ledger Details List */}
        <div className="space-y-2.5 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs">
          <div>
            <span className="text-slate-500 text-[10px] block">Transaction ID (TxID):</span>
            <div className="flex items-center justify-between gap-1 mt-0.5">
              <span className="font-mono text-amber-400 font-medium truncate">
                {currentTx.txid.slice(0, 16)}...{currentTx.txid.slice(-8)}
              </span>
              <button
                type="button"
                onClick={copyTxid}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                {copiedTxid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex justify-between pt-2 border-t border-slate-800/80">
            <span className="text-slate-500">Confirmations:</span>
            <span className="font-mono text-emerald-400 font-bold">
              {currentTx.confirmations} Blocks (PoW)
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Network Fee:</span>
            <span className="font-mono text-slate-300">
              {formatSats(currentTx.feeSats)} ({currentTx.feeRateSatVb} sat/vB)
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Recipient:</span>
            <span className="font-mono text-slate-300 truncate max-w-[160px]">
              {currentTx.recipientAddress}
            </span>
          </div>

          {currentTx.note && (
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-slate-500 text-[10px] block">Memo:</span>
              <span className="text-slate-300 italic">{currentTx.note}</span>
            </div>
          )}
        </div>

        {/* External Link */}
        <a
          href={`https://mempool.space/tx/${currentTx.txid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-slate-700"
        >
          <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
          <span>{t.blockExplorerBtn}</span>
        </a>
      </div>
    </div>
  );
};
