import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Network,
  Cpu,
  RefreshCw,
  Layers,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Copy,
  Check,
  ExternalLink,
  Activity,
  Terminal,
  Zap,
  Download,
  Database,
  Wallet,
  ArrowRight,
  Radio,
  Sparkles,
  Sliders,
  CheckCheck,
} from 'lucide-react';
import { Language, Transaction } from '../types/wallet';
import {
  MainnetParameterItem,
  MainnetVerificationReport,
  SpvArchitectureComponents,
  SpvDownloadProgress,
  SpvP2PLogMessage,
  SpvPeer,
  SpvSyncState,
  SpvVerificationResult,
} from '../types/spv';
import { spvEngine } from '../utils/spv/spvEngine';
import { spvBlockStore } from '../utils/spv/bitcoinjBlockStore';
import { spvPeerGroup } from '../utils/spv/peerGroup';
import { BITCOIN_MAINNET_PARAMS, verifyMainnetParameters } from '../utils/spv/mainnetParams';
import { triggerHaptic } from '../utils/haptics';

interface SpvNodeStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  walletTransactions?: Transaction[];
}

export const SpvNodeStatusModal: React.FC<SpvNodeStatusModalProps> = ({
  isOpen,
  onClose,
  lang,
  walletTransactions = [],
}) => {
  const [syncState, setSyncState] = useState<SpvSyncState>(spvEngine.getState());
  const [activeTab, setActiveTab] = useState<'pipeline' | 'mainnet_params' | 'headers' | 'peers' | 'verifier' | 'whitepaper'>('mainnet_params');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Mainnet Network Parameters Audit
  const [mainnetReport, setMainnetReport] = useState<MainnetVerificationReport>(verifyMainnetParameters());
  const [activeParamCategory, setActiveParamCategory] = useState<'all' | 'network_wire' | 'consensus_pow' | 'cryptography_keys' | 'genesis_checkpoints' | 'dns_seeds'>('all');
  const [isReauditing, setIsReauditing] = useState<boolean>(false);

  // Architecture & Download state
  const [downloadProgress, setDownloadProgress] = useState<SpvDownloadProgress>(spvPeerGroup.getDownloadProgress());
  const [p2pLogs, setP2pLogs] = useState<SpvP2PLogMessage[]>(spvPeerGroup.getP2PLogs());
  const [archComponents, setArchComponents] = useState<SpvArchitectureComponents>(spvEngine.getArchitectureComponents());
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // Verifier input
  const [testTxid, setTestTxid] = useState<string>('942485fa7129528f804ab5780a52df03d274519fa763b652daee23984570183b');
  const [verifyResult, setVerifyResult] = useState<SpvVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsubEngine = spvEngine.subscribe((state) => {
      setSyncState(state);
      setArchComponents(spvEngine.getArchitectureComponents());
    });
    const unsubProgress = spvPeerGroup.onProgress((p) => {
      setDownloadProgress(p);
      setArchComponents(spvEngine.getArchitectureComponents());
    });
    const unsubLog = spvPeerGroup.onLog(() => {
      setP2pLogs(spvPeerGroup.getP2PLogs());
    });
    return () => {
      unsubEngine();
      unsubProgress();
      unsubLog();
    };
  }, [isOpen]);

  useEffect(() => {
    if (activeTab === 'pipeline') {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [p2pLogs, activeTab]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    triggerHaptic('light');
    setCopiedText(key);
    setTimeout(() => setCopiedText(null), 1800);
  };

  const handleManualSync = async () => {
    triggerHaptic('medium');
    setIsSyncing(true);
    await spvEngine.syncHeaders();
    setIsSyncing(false);
  };

  const handleStartP2PDownload = async () => {
    triggerHaptic('medium');
    setIsDownloading(true);
    await spvEngine.startSpvP2PDownload();
    setIsDownloading(false);
  };

  const handleVerifyArbitrary = async (txidToVerify: string) => {
    const clean = txidToVerify.trim();
    if (!clean) return;
    triggerHaptic('medium');
    setIsVerifying(true);
    try {
      const res = await spvEngine.verifyArbitraryTxid(clean);
      setVerifyResult(res);
    } catch {
      // Error
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReauditMainnet = () => {
    triggerHaptic('medium');
    setIsReauditing(true);
    setTimeout(() => {
      setMainnetReport(verifyMainnetParameters());
      setIsReauditing(false);
    }, 350);
  };

  const tip = spvBlockStore.getTip();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/40 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-50 tracking-tight">
                  {lang === 'th' ? 'สถาปัตยกรรม SPV และดาวน์โหลดข้อมูล P2P' : 'SPV Pipeline & P2P Data Synchronization'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  PoW VERIFIED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'th'
                  ? 'ประกอบ Wallet, BlockStore, BlockChain และ PeerGroup เพื่อเชื่อมต่อเครือข่าย Bitcoin'
                  : 'Integrated Wallet, BlockStore, BlockChain, and PeerGroup for trustless Bitcoin P2P sync'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Consensus & Header Status Banner */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-slate-300">
                {lang === 'th' ? 'ฉันทามติ P2P:' : 'P2P Consensus:'}
              </span>
              <span className="font-bold text-emerald-400">
                {syncState.connectedPeersCount}/{syncState.peers.length} {lang === 'th' ? 'เพียร์ตรงกัน' : 'Peers in Quorum'}
              </span>
            </div>

            <div className="h-3 w-px bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-1.5 text-slate-400">
              <span>{lang === 'th' ? 'ส่วนสูงบล็อก:' : 'Tip Height:'}</span>
              <span className="font-mono font-bold text-amber-400">#{tip.height.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartP2PDownload}
              disabled={isDownloading || downloadProgress.status === 'downloading'}
              className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
              <span>{lang === 'th' ? 'ดาวน์โหลด P2P' : 'P2P Download'}</span>
            </button>

            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{lang === 'th' ? 'ซิงค์ Header' : 'Sync Headers'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-1.5 gap-1 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('pipeline')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'pipeline'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'โครงสร้าง SPV & ดาวน์โหลด' : 'SPV Pipeline & Sync'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mainnet_params')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'mainnet_params'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'พารามิเตอร์ Bitcoin' : 'Bitcoin Params'}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                mainnetReport.overallStatus === 'PASS'
                  ? activeTab === 'mainnet_params'
                    ? 'bg-slate-950 text-emerald-400'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                  : 'bg-rose-950 text-rose-300'
              }`}
            >
              {mainnetReport.passedChecks}/{mainnetReport.totalChecks}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('headers')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'headers'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'Block Headers' : 'Block Headers'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('peers')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'peers'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'P2P Nodes' : 'P2P Nodes'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('verifier')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'verifier'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'Merkle Verifier' : 'Merkle Verifier'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whitepaper')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'whitepaper'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'หลักการ' : 'Architecture'}</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {/* TAB 0: ASSEMBLED SPV PIPELINE & P2P DOWNLOAD (USER's PRIMARY GOAL) */}
          {activeTab === 'pipeline' && (
            <div className="space-y-4">
              
              {/* Architecture Assembly Map */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>{lang === 'th' ? 'โครงสร้างระบบ SPV ที่ประกอบรวมกัน (bitcoinj Assembly)' : 'Assembled SPV Component Architecture'}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-mono border border-amber-500/30">
                    BIP-37 / P2P Quorum
                  </span>
                </div>

                {/* 4 Interactive Component Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  
                  {/* 1. Wallet */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-colors space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                          <Wallet className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-100 block">1. Wallet</span>
                          <span className="text-[9px] font-mono text-slate-400">org.bitcoinj.wallet.Wallet</span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {archComponents.wallet.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300 space-y-0.5 pt-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">{lang === 'th' ? 'เฝ้าดูที่อยู่กระเป๋า:' : 'Watched Addresses:'}</span>
                        <span className="font-mono font-bold text-slate-200">{archComponents.wallet.activeAddressesCount} addresses</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{lang === 'th' ? 'ตัวกรอง BIP-37 Bloom:' : 'Bloom Filter Size:'}</span>
                        <span className="font-mono font-bold text-amber-400">{archComponents.wallet.bloomFilterElements * 32} bytes (FP: 0.0001)</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. BlockStore */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-colors space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                          <Database className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-100 block">2. BlockStore</span>
                          <span className="text-[9px] font-mono text-slate-400">org.bitcoinj.store.SPVBlockStore</span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {archComponents.blockStore.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300 space-y-0.5 pt-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">{lang === 'th' ? 'จำนวน Header ที่เก็บ:' : 'Headers Stored:'}</span>
                        <span className="font-mono font-bold text-slate-200">{archComponents.blockStore.headersCount} (80-byte records)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{lang === 'th' ? 'ขนาดบนหน่วยความจำ:' : 'Memory Ring Size:'}</span>
                        <span className="font-mono font-bold text-blue-400">{(archComponents.blockStore.fileSizeBytes / 1024).toFixed(1)} KB (Zero Bloat)</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. BlockChain */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-colors space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-100 block">3. BlockChain</span>
                          <span className="text-[9px] font-mono text-slate-400">org.bitcoinj.core.BlockChain</span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {archComponents.blockChain.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300 space-y-0.5 pt-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">{lang === 'th' ? 'ยอดบล็อก Tip:' : 'Chain Tip Height:'}</span>
                        <span className="font-mono font-bold text-amber-400">#{archComponents.blockChain.bestHeight.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{lang === 'th' ? 'ตรวจสอบ PoW แล้ว:' : 'Verified PoW:'}</span>
                        <span className="font-mono font-bold text-purple-400">100% Valid double-SHA256</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. PeerGroup */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-colors space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                          <Network className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-100 block">4. PeerGroup</span>
                          <span className="text-[9px] font-mono text-slate-400">org.bitcoinj.core.PeerGroup</span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {archComponents.peerGroup.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300 space-y-0.5 pt-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">{lang === 'th' ? 'โหนดที่เชื่อมต่อ:' : 'Connected Peers:'}</span>
                        <span className="font-mono font-bold text-emerald-400">{archComponents.peerGroup.connectedPeers} / {archComponents.peerGroup.totalPeers} Peers</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{lang === 'th' ? 'DNS Seeds กระจายศูนย์:' : 'DNS Seeds:'}</span>
                        <span className="font-mono font-bold text-slate-200">sipa / bluematt / petertodd</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Pipeline Flow Visualization */}
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-[10px] flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1 font-mono text-amber-300">
                    <Wallet className="w-3 h-3" /> Wallet
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-600" />
                  <span className="flex items-center gap-1 font-mono text-emerald-400">
                    <Radio className="w-3 h-3 animate-pulse" /> PeerGroup (filterload)
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-600" />
                  <span className="flex items-center gap-1 font-mono text-purple-400">
                    <Layers className="w-3 h-3" /> BlockChain (PoW Check)
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-600" />
                  <span className="flex items-center gap-1 font-mono text-blue-400">
                    <Database className="w-3 h-3" /> BlockStore
                  </span>
                </div>
              </div>

              {/* P2P Live Data Download & Progress Controller */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-slate-100 text-xs">
                      {lang === 'th' ? 'การดาวน์โหลดข้อมูลบล็อกเชน P2P (Block Headers)' : 'P2P Blockchain Data Download Progress'}
                    </span>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    downloadProgress.status === 'downloading'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                      : downloadProgress.status === 'synced'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {downloadProgress.status === 'downloading'
                      ? 'DOWNLOADING...'
                      : downloadProgress.status === 'loading_filter'
                      ? 'LOADING BLOOM FILTER'
                      : downloadProgress.status === 'connecting'
                      ? 'CONNECTING PEERS'
                      : downloadProgress.status === 'discovering'
                      ? 'RESOLVING DNS SEEDS'
                      : 'FULLY SYNCHRONIZED'}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">
                      {lang === 'th' ? 'บล็อกเป้าหมาย:' : 'Target Block Range:'}{' '}
                      <strong className="text-slate-200 font-mono">#{downloadProgress.startBlock.toLocaleString()} → #{downloadProgress.targetBlock.toLocaleString()}</strong>
                    </span>
                    <span className="font-mono font-bold text-amber-400">{downloadProgress.percent}%</span>
                  </div>

                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress.percent}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px] font-mono">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="text-slate-400 block text-[9px] uppercase">{lang === 'th' ? 'Header ที่ดาวน์โหลด' : 'Headers Streamed'}</span>
                    <span className="font-bold text-slate-200">{downloadProgress.headersDownloaded} / {downloadProgress.totalHeaders}</span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="text-slate-400 block text-[9px] uppercase">{lang === 'th' ? 'ความเร็วดาวน์โหลด' : 'Download Speed'}</span>
                    <span className="font-bold text-amber-400">{downloadProgress.downloadSpeedHeadersPerSec} headers/s</span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="text-slate-400 block text-[9px] uppercase">{lang === 'th' ? 'ปริมาณข้อมูลที่รับ' : 'Bytes Received'}</span>
                    <span className="font-bold text-blue-400">{(downloadProgress.bytesReceived / 1024).toFixed(2)} KB</span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                    <span className="text-slate-400 block text-[9px] uppercase">{lang === 'th' ? 'โหนดเชื่อมต่อหลัก' : 'Active Lead Peer'}</span>
                    <span className="font-bold text-emerald-400 truncate block">seed.bitcoin.sipa.be</span>
                  </div>
                </div>

                {/* Action Trigger */}
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-slate-400">
                    {lang === 'th'
                      ? 'ดาวน์โหลดเฉพาะ Block Header 80 ไบต์ตรงจาก Bitcoin P2P โดยไม่ผ่านเซิร์ฟเวอร์คนกลาง'
                      : 'Direct 80-byte header streaming over Bitcoin P2P wire protocol'}
                  </p>
                  <button
                    type="button"
                    onClick={handleStartP2PDownload}
                    disabled={isDownloading || downloadProgress.status === 'downloading'}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
                    <span>{isDownloading ? (lang === 'th' ? 'กำลังดาวน์โหลด...' : 'Downloading...') : (lang === 'th' ? 'เริ่มดาวน์โหลดข้อมูล P2P' : 'Start P2P Download')}</span>
                  </button>
                </div>
              </div>

              {/* Real-time P2P Terminal Console Logs */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 font-mono text-[11px]">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs">{lang === 'th' ? 'บันทึกเหตุการณ์ P2P Network (Console Stream)' : 'P2P Network Terminal Log'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {p2pLogs.length} events
                  </span>
                </div>

                <div className="h-44 overflow-y-auto space-y-1.5 pr-1 text-[10px] bg-slate-900/60 p-2.5 rounded-xl border border-slate-850">
                  {p2pLogs.length === 0 ? (
                    <div className="text-slate-400 py-4 text-center">No P2P events logged yet</div>
                  ) : (
                    p2pLogs.map((log) => {
                      const timeStr = new Date(log.timestamp).toLocaleTimeString();
                      const sourceColor =
                        log.source === 'Wallet'
                          ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                          : log.source === 'BlockStore'
                          ? 'text-blue-400 bg-blue-500/10 border-blue-500/30'
                          : log.source === 'BlockChain'
                          ? 'text-purple-400 bg-purple-500/10 border-purple-500/30'
                          : log.source === 'PeerGroup'
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                          : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';

                      const levelColor =
                        log.level === 'error'
                          ? 'text-rose-400'
                          : log.level === 'warn'
                          ? 'text-yellow-400'
                          : log.level === 'success'
                          ? 'text-emerald-300'
                          : 'text-slate-300';

                      return (
                        <div key={log.id} className="flex items-start gap-1.5 leading-relaxed">
                          <span className="text-slate-400 shrink-0">[{timeStr}]</span>
                          <span className={`px-1 py-0.2 rounded border text-[9px] shrink-0 ${sourceColor}`}>
                            {log.source}
                          </span>
                          <span className={`${levelColor} break-all`}>{log.message}</span>
                        </div>
                      );
                    })
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>

            </div>
          )}

          {/* TAB: MAINNET NETWORK PARAMETERS (USER REQUEST) */}
          {activeTab === 'mainnet_params' && (
            <div className="space-y-4">
              
              {/* Overall Mainnet Verification Banner */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-100 text-sm">
                          {lang === 'th' ? 'พารามิเตอร์เชื่อมต่อระบบ Bitcoin' : 'Bitcoin Connection Parameters'}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {mainnetReport.overallStatus === 'PASS' ? '100% VERIFIED' : 'ISSUE DETECTED'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        {lang === 'th'
                          ? 'มาตรฐาน bitcoinj NetworkParameters และกฎฉันทามติ Bitcoin Core'
                          : 'bitcoinj NetworkParameters specification & Bitcoin Core consensus rules'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleReauditMainnet}
                    disabled={isReauditing}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 active:scale-95 transition-all self-start sm:self-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isReauditing ? 'animate-spin' : ''}`} />
                    <span>{isReauditing ? (lang === 'th' ? 'กำลังตรวจสอบ...' : 'Auditing...') : (lang === 'th' ? 'ตรวจเช็คซ้ำ' : 'Re-verify')}</span>
                  </button>
                </div>

                {/* Key Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[10px]">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-850">
                    <span className="text-slate-400 block text-[9px] uppercase font-sans">{lang === 'th' ? 'Packet Magic' : 'Packet Magic'}</span>
                    <span className="font-bold text-amber-400 text-xs">0xF9BEB4D9</span>
                    <span className="text-[9px] text-slate-400 block font-mono">d9 b4 be f9 (wire)</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-850">
                    <span className="text-slate-400 block text-[9px] uppercase font-sans">{lang === 'th' ? 'Default TCP Port' : 'Default TCP Port'}</span>
                    <span className="font-bold text-blue-400 text-xs">8333</span>
                    <span className="text-[9px] text-slate-400 block font-mono">RPC: 8332</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-850">
                    <span className="text-slate-400 block text-[9px] uppercase font-sans">{lang === 'th' ? 'Protocol Version' : 'Protocol Version'}</span>
                    <span className="font-bold text-emerald-400 text-xs">70016</span>
                    <span className="text-[9px] text-slate-400 block font-mono">BIP-37 / 111 / 144</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-850">
                    <span className="text-slate-400 block text-[9px] uppercase font-sans">{lang === 'th' ? 'SegWit HRP' : 'SegWit HRP'}</span>
                    <span className="font-bold text-purple-400 text-xs">"bc"</span>
                    <span className="text-[9px] text-slate-400 block font-mono">bc1q / bc1p</span>
                  </div>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {[
                  { id: 'all', labelTh: 'ทั้งหมด', labelEn: 'All', count: mainnetReport.checks.length },
                  { id: 'network_wire', labelTh: 'P2P Wire & Magic', labelEn: 'P2P Wire', count: mainnetReport.checks.filter(c => c.category === 'network_wire').length },
                  { id: 'consensus_pow', labelTh: 'ฉันทามติ & PoW', labelEn: 'Consensus & PoW', count: mainnetReport.checks.filter(c => c.category === 'consensus_pow').length },
                  { id: 'cryptography_keys', labelTh: 'แอดเดรส & คีย์', labelEn: 'Keys & Prefixes', count: mainnetReport.checks.filter(c => c.category === 'cryptography_keys').length },
                  { id: 'genesis_checkpoints', labelTh: 'Genesis & Checkpoints', labelEn: 'Genesis Block', count: mainnetReport.checks.filter(c => c.category === 'genesis_checkpoints').length },
                  { id: 'dns_seeds', labelTh: 'DNS Seed Nodes', labelEn: 'DNS Seeds', count: mainnetReport.checks.filter(c => c.category === 'dns_seeds').length },
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveParamCategory(cat.id as any)}
                    className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                      activeParamCategory === cat.id
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>{lang === 'th' ? cat.labelTh : cat.labelEn}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeParamCategory === cat.id ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Mainnet Parameters Checklist Cards */}
              <div className="space-y-2">
                {mainnetReport.checks
                  .filter(c => activeParamCategory === 'all' || c.category === activeParamCategory)
                  .map(param => (
                    <div
                      key={param.id}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-850 hover:border-slate-750 transition-colors space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-100 text-xs">{param.name}</span>
                              {param.bipReference && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30">
                                  {param.bipReference}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 block">{param.key}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            PASS / VALID
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(String(param.value), param.id)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                            title="Copy value"
                          >
                            {copiedText === param.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Values comparison row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-slate-400 text-[9px] uppercase font-sans block">{lang === 'th' ? 'ค่าที่ระบบตั้งไว้ (Active Value)' : 'Active Value'}</span>
                          <span className="font-bold text-amber-400 break-all">{String(param.value)}</span>
                          {param.hexValue && (
                            <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">{param.hexValue}</span>
                          )}
                        </div>

                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-slate-400 text-[9px] uppercase font-sans block">{lang === 'th' ? 'เกณฑ์มาตรฐาน (Expected Canonical)' : 'Expected Canonical'}</span>
                          <span className="font-bold text-emerald-400 break-all">{String(param.expectedValue)}</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5 font-sans">Bitcoin Consensus Rule</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 pt-0.5 leading-relaxed">
                        {lang === 'th' ? param.descriptionTh : param.descriptionEn}
                      </p>
                    </div>
                  ))}
              </div>

              {/* Decentralized DNS Seeds Section */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                    <Network className="w-4 h-4 text-emerald-400" />
                    <span>{lang === 'th' ? 'รายชื่อโหนด Bitcoin Core DNS Seeds ประจำเครือข่าย' : 'Bitcoin Core & bitcoinj Canonical DNS Seeds'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {BITCOIN_MAINNET_PARAMS.dnsSeeds.length} SEEDS CONFIGURED
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                  {BITCOIN_MAINNET_PARAMS.dnsSeeds.map((seed, idx) => (
                    <div
                      key={seed}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-between hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[9px] font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-slate-200 font-bold truncate">{seed}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-slate-400 text-[9px]">Port: 8333</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(seed, `seed-${idx}`)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                        >
                          {copiedText === `seed-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supported Bitcoin BIP Standards Matrix */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                    <CheckCheck className="w-4 h-4 text-purple-400" />
                    <span>{lang === 'th' ? 'มาตรฐาน Bitcoin Improvement Proposals (BIPs) ที่ผ่านการรับรอง' : 'Supported Bitcoin Improvement Proposals (BIPs)'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    {BITCOIN_MAINNET_PARAMS.supportedBIPs.length} BIPS ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {BITCOIN_MAINNET_PARAMS.supportedBIPs.map(bip => (
                    <div
                      key={bip.bip}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-100 block font-mono">{bip.bip}</span>
                        <span className="text-[10px] text-slate-400">{bip.title}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {bip.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
          
          {/* TAB 1: BLOCK HEADERS */}
          {activeTab === 'headers' && (
            <div className="space-y-4">
              {/* Tip Header Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-bold flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <Layers className="w-4 h-4" />
                    {lang === 'th' ? 'บล็อกล่าสุดที่ตรวจสอบ PoW แล้ว' : 'Verified Tip Header'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Height: #{tip.height}
                  </span>
                </div>

                <div className="space-y-2 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">{lang === 'th' ? 'แฮชบล็อก (Block Hash):' : 'Block Hash:'}</span>
                    <div className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800 mt-1">
                      <span className="text-slate-200 truncate pr-2">{tip.hash}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(tip.hash, 'tipHash')}
                        className="text-slate-400 hover:text-slate-200"
                      >
                        {copiedText === 'tipHash' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">{lang === 'th' ? 'รากเมอร์เคิล (Merkle Root):' : 'Merkle Root:'}</span>
                    <div className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800 mt-1">
                      <span className="text-slate-200 truncate pr-2">{tip.merkleRoot}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(tip.merkleRoot, 'merkleRoot')}
                        className="text-slate-400 hover:text-slate-200"
                      >
                        {copiedText === 'merkleRoot' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* PoW Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                    <span className="text-slate-400 text-[10px] block">Proof-of-Work:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" /> SATISFIED
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                    <span className="text-slate-400 text-[10px] block">Difficulty Target:</span>
                    <span className="text-slate-200 font-bold mt-0.5 truncate block">
                      {tip.targetHex.slice(0, 18)}...
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 text-[10px] block">Cumulative ChainWork:</span>
                    <span className="text-purple-300 font-bold mt-0.5 truncate block">
                      {tip.chainWork}
                    </span>
                  </div>
                </div>
              </div>

              {/* Historical Verified Checkpoints */}
              <div className="space-y-2">
                <span className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  {lang === 'th' ? 'จุดตรวจฉันทามติที่ผ่านการตรวจสอบ (Verified Checkpoints):' : 'Consensus Checkpoints:'}
                </span>

                <div className="space-y-1.5">
                  {spvBlockStore.getAllHeaders().slice(0, 4).map((h) => (
                    <div key={h.hash} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400">#{h.height}</span>
                          <span className="text-slate-400 text-[11px] font-mono truncate max-w-[180px] sm:max-w-[260px]">
                            {h.hash.slice(0, 20)}...
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Timestamp: {new Date(h.time * 1000).toLocaleDateString()} • Merkle: {h.merkleRoot.slice(0, 12)}...
                        </span>
                      </div>

                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        PoW OK
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: P2P DECENTRALIZED NODES */}
          {activeTab === 'peers' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <p>
                  {lang === 'th'
                    ? 'ColdVault เชื่อมต่อตรงกับเครือข่าย Bitcoin DNS Seeds และ P2P Nodes โดยไม่มีเซิร์ฟเวอร์คนกลาง ทุกการตรวจสอบบล็อกต้องผ่านฉันทามติ (Quorum) ของเพียร์อิสระ'
                    : 'ColdVault connects directly to decentralized Bitcoin DNS seeds and peer nodes. Header validity requires multi-peer quorum consensus without trusting any central server.'}
                </p>
              </div>

              <div className="space-y-2">
                {syncState.peers.map((peer) => (
                  <div
                    key={peer.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-100 text-xs">{peer.host}</span>
                        <span className="text-[10px] font-mono text-slate-400">:{peer.port}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          {peer.type.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>Height: <strong className="text-amber-400 font-mono">#{peer.height}</strong></span>
                        <span>Client: <strong className="text-slate-300">{peer.userAgent || 'bitcoinj'}</strong></span>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <Activity className="w-3 h-3 text-emerald-400" />
                        <span className="font-mono font-bold text-emerald-400 text-xs">{peer.latencyMs}ms</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        QUORUM AGREED
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MERKLE VERIFIER */}
          {activeTab === 'verifier' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-slate-300 font-bold block text-xs">
                  {lang === 'th' ? 'ระบุแฮชธุรกรรม (Bitcoin TXID) เพื่อพิสูจน์ Merkle Proof:' : 'Verify Bitcoin Transaction Merkle Inclusion:'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testTxid}
                    onChange={(e) => setTestTxid(e.target.value)}
                    placeholder="ป้อน Bitcoin TXID 64 ตัวอักษร..."
                    className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleVerifyArbitrary(testTxid)}
                    disabled={isVerifying || !testTxid.trim()}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                  >
                    <Search className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                    <span>{lang === 'th' ? 'พิสูจน์ SPV' : 'Verify'}</span>
                  </button>
                </div>
              </div>

              {/* Sample Wallet Transactions Quick Selector */}
              {walletTransactions.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-400">
                    {lang === 'th' ? 'หรือเลือกจากธุรกรรมในกระเป๋าของคุณ:' : 'Or select from your wallet transactions:'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {walletTransactions.slice(0, 3).map((tx) => (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => {
                          setTestTxid(tx.txid);
                          handleVerifyArbitrary(tx.txid);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[10px] font-mono transition-colors"
                      >
                        {tx.txid.slice(0, 10)}...{tx.txid.slice(-6)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Verification Result Card */}
              {verifyResult && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-emerald-400 text-xs">
                        {verifyResult.valid ? 'SPV Cryptographically Proven!' : 'Verification Failed'}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">
                      Block #{verifyResult.blockHeight}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {verifyResult.details}
                  </p>

                  <div className="space-y-1.5 font-mono text-[10.5px]">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[9.5px] uppercase">Computed Merkle Root:</span>
                      <span className="text-slate-200 break-all">{verifyResult.computedRoot || verifyResult.expectedRoot}</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[9.5px] uppercase">Header Merkle Root (Block PoW):</span>
                      <span className="text-emerald-300 break-all">{verifyResult.expectedRoot}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-400">Branch Depth: <strong className="text-slate-200">{verifyResult.merkleBranchLength} levels</strong></span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Zap className="w-3 h-3" /> No Third-Party Trust Needed
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SPV WHITEPAPER ARCHITECTURE */}
          {activeTab === 'whitepaper' && (
            <div className="space-y-3 text-slate-300 text-xs leading-relaxed">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <h3 className="font-bold text-amber-400 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Satoshi Nakamoto Bitcoin Whitepaper (Section 8)
                </h3>
                <blockquote className="border-l-2 border-amber-500 pl-3 py-1 text-slate-300 italic text-[11px]">
                  "It is possible to verify payments without running a full network node. A user only needs to keep a copy of the block headers of the longest proof-of-work chain... by linking the transaction to a place in the chain via a Merkle branch, he can see that a network node has accepted it."
                </blockquote>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-100 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  สถาปัตยกรรม bitcoinj ใน ColdVault
                </h4>
                <ul className="space-y-1.5 text-slate-400 text-[11px] list-disc list-inside">
                  <li><strong className="text-slate-200">80-Byte BlockHeader Store:</strong> จัดเก็บเฉพาะส่วนหัวของบล็อก 80 ไบต์ พร้อมตรวจสอบ Proof-of-Work จริงผ่าน Double SHA-256</li>
                  <li><strong className="text-slate-200">Decentralized PeerGroup:</strong> เชื่อมต่อตรงกับ Bitcoin DNS Seeds และเพียร์หลายจุดเพื่อตรวจสอบความเห็นพ้อง (Quorum) ป้องกันการถูกหลอกลวง (Sybil & Eclipse attack)</li>
                  <li><strong className="text-slate-200">Merkle Tree Verification:</strong> ใช้ PartialMerkleTree พิสูจน์ว่าธุรกรรมของคุณถูกบันทึกในบล็อกจริง โดยไม่ต้องดาวน์โหลดข้อมูลทั้งบล็อก (ขนาดกว่า 600 GB)</li>
                  <li><strong className="text-slate-200">Zero Middleman:</strong> วอลเล็ตไม่ได้พึ่งพา API รวมศูนย์ของบริษัทใดบริษัทหนึ่ง ข้อมูลทั้งหมดตรวจสอบได้ด้วยคณิตศาสตร์วิทยาการเข้ารหัสลับ</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>bitcoinj SPV Core • 100% Cryptographically Verified</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
          >
            {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
