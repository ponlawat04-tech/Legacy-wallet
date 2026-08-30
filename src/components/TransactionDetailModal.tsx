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
  ShieldCheck
} from 'lucide-react';
import { Currency, Language, MarketData, Transaction } from '../types/wallet';
import { i18n } from '../utils/i18n';
import { formatBtc, formatFiat, formatSats } from '../utils/mockMarket';

interface TransactionDetailModalProps {
  tx: Transaction | null;
  onClose: () => void;
  lang: Language;
  currency: Currency;
  market: MarketData;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  tx,
  onClose,
  lang,
  currency,
  market,
}) => {
  const [copiedTxid, setCopiedTxid] = useState<boolean>(false);

  const t = i18n[lang];

  if (!tx) return null;

  const isSent = tx.type === 'sent';

  const copyTxid = () => {
    navigator.clipboard.writeText(tx.txid);
    setCopiedTxid(true);
    setTimeout(() => setCopiedTxid(false), 2000);
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
            {isSent ? '-' : '+'}{formatBtc(tx.amountBtc)}
          </div>
          <p className="text-xs text-slate-400">
            ≈ {formatFiat(tx.amountBtc * market.priceUsd, currency, market.priceThb, market.priceUsd)}
          </p>
        </div>

        {/* Ledger Details List */}
        <div className="space-y-2.5 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs">
          <div>
            <span className="text-slate-500 text-[10px] block">Transaction ID (TxID):</span>
            <div className="flex items-center justify-between gap-1 mt-0.5">
              <span className="font-mono text-amber-400 font-medium truncate">
                {tx.txid.slice(0, 16)}...{tx.txid.slice(-8)}
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
              {tx.confirmations} Blocks
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Network Fee:</span>
            <span className="font-mono text-slate-300">
              {formatSats(tx.feeSats)} ({tx.feeRateSatVb} sat/vB)
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Recipient:</span>
            <span className="font-mono text-slate-300 truncate max-w-[160px]">
              {tx.recipientAddress}
            </span>
          </div>

          {tx.note && (
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-slate-500 text-[10px] block">Memo:</span>
              <span className="text-slate-300 italic">{tx.note}</span>
            </div>
          )}
        </div>

        {/* External Link */}
        <a
          href={`https://mempool.space/tx/${tx.txid}`}
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
