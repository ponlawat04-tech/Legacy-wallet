import React, { useState } from 'react';
import {
  History,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  Search,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Language, Transaction } from '../../types/wallet';
import { i18n } from '../../utils/i18n';
import { formatBtc, formatSats } from '../../utils/mockMarket';

interface HistoryTabProps {
  transactions: Transaction[];
  lang: Language;
  onSelectTxDetail: (tx: Transaction) => void;
  onSyncBlockchain?: () => void;
  onNavigateToMarket?: () => void;
  isSyncing?: boolean;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  transactions,
  lang,
  onSelectTxDetail,
  onSyncBlockchain,
  onNavigateToMarket,
  isSyncing = false,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'sent' | 'received'>('all');

  const t = i18n[lang];

  const filteredTxList = transactions.filter(tx => {
    const matchesSearch =
      tx.txid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.recipientAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.senderAddress.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterType === 'all') return matchesSearch;
    return matchesSearch && tx.type === filterType;
  });

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-300">
      {/* Activity & Market Segmented Switcher */}
      {onNavigateToMarket && (
        <div className="flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">
          <button
            type="button"
            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            <History className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'ประวัติรายการ (History)' : 'Tx History'}</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToMarket}
            className="flex-1 py-2 px-3 rounded-xl text-slate-400 hover:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all hover:bg-slate-800/60"
          >
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            <span>{lang === 'th' ? 'สภาวะตลาด & ค่าธรรมเนียม' : 'Market & Fees'}</span>
          </button>
        </div>
      )}

      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-slate-50 flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <span>{t.tabHistory}</span>
          </h2>
          <div className="flex items-center gap-2">
            {onSyncBlockchain && (
              <button
                type="button"
                onClick={onSyncBlockchain}
                disabled={isSyncing}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 text-xs flex items-center gap-1 transition-all border border-slate-700"
                title={lang === 'th' ? 'ดึงประวัติธุรกรรมจริงจากบล็อกเชน' : 'Fetch live transactions from blockchain'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
                <span className="text-[11px] font-medium hidden sm:inline">
                  {lang === 'th' ? 'ซิงค์ Bitcoin' : 'Sync'}
                </span>
              </button>
            )}
            <span className="text-xs text-slate-400 font-mono">
              {filteredTxList.length} {lang === 'th' ? 'รายการ' : 'records'}
            </span>
          </div>
        </div>

        {/* Search Bar & Filter */}
        <div className="space-y-2">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === 'th' ? 'ค้นหาตาม TxID หรือ Address...' : 'Search TxID or Address...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                filterType === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              {lang === 'th' ? 'ทั้งหมด' : 'All'}
            </button>
            <button
              type="button"
              onClick={() => setFilterType('received')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                filterType === 'received'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              {lang === 'th' ? 'รับเข้า' : 'Received'}
            </button>
            <button
              type="button"
              onClick={() => setFilterType('sent')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                filterType === 'sent'
                  ? 'bg-rose-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              {lang === 'th' ? 'โอนออก' : 'Sent'}
            </button>
          </div>
        </div>

        {/* List */}
        {filteredTxList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/60 rounded-3xl border border-slate-800/60">
            {t.noTransactions}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTxList.map((tx) => {
              const isSent = tx.type === 'sent';
              return (
                <div
                  key={tx.id}
                  onClick={() => onSelectTxDetail(tx)}
                  className="p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between gap-3 group"
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
                        {tx.spvVerified ? (
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> SPV OK
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            {tx.status}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 truncate max-w-[150px] sm:max-w-[220px] mt-0.5">
                        {tx.txid.slice(0, 10)}...{tx.txid.slice(-8)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-xs font-bold font-mono ${isSent ? 'text-slate-200' : 'text-emerald-400'}`}>
                      {isSent ? '-' : '+'}{tx.coinSymbol && tx.coinSymbol !== 'BTC' ? `${tx.amountBtc.toLocaleString()} ${tx.coinSymbol}` : formatBtc(tx.amountBtc)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(tx.timestamp).toLocaleDateString()}
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
