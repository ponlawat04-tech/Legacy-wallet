/**
 * Types for Bitcoin SPV (Simplified Payment Verification) Engine
 * Modeled after the bitcoinj library architecture and Bitcoin Core BIP-37 / BIP-157
 */

export interface SpvCheckpoint {
  height: number;
  hash: string;
  merkleRoot: string;
  time: number;
  bits: number;
  targetHex: string;
  chainWork: string;
  notes?: string;
}

export interface BlockHeader {
  height: number;
  hash: string;            // Block hash (hex, big-endian display)
  version: number;         // 4 bytes
  prevBlockHash: string;   // 32 bytes (hex, big-endian)
  merkleRoot: string;      // 32 bytes (hex, big-endian)
  time: number;            // Timestamp in seconds (uint32)
  bits: number;            // Compact target nBits (uint32)
  targetHex: string;       // 256-bit Proof-of-Work target
  nonce: number;           // Nonce (uint32)
  rawHex: string;          // 80 bytes raw hex
  chainWork: string;       // Cumulative Proof-of-Work (hex string)
  difficulty: number;      // Relative to Genesis block
  verifiedPoW: boolean;    // doubleSha256(rawHex) <= target
}

export interface SpvMerkleProof {
  txid: string;
  blockHeight: number;
  blockHash: string;
  merkleRoot: string;
  merkleBranch: string[];  // Sibling hashes along the Merkle tree branch
  txIndex: number;         // Position in the block (0-indexed)
  totalTransactions?: number;
  verified: boolean;
  verifiedAt: number;      // Epoch ms
  proofType: 'bitcoinj_BIP37' | 'BIP157_Golomb' | 'MerkleBranch';
  verifyingPeers: string[];
  blockPoWValid: boolean;
  confirmations: number;
}

export interface SpvPeer {
  id: string;
  host: string;
  port: number;
  type: 'p2p_dns_seed' | 'electrum_spv' | 'bitcoin_node' | 'p2p_gateway';
  height: number;
  bestBlockHash: string;
  latencyMs: number;
  connected: boolean;
  status: 'connected' | 'connecting' | 'idle' | 'failed';
  lastPing: number;
  userAgent?: string;
  protocolVersion: number;
  isConsensusAgreed?: boolean;
}

export interface SpvSyncState {
  isSyncing: boolean;
  syncProgress: number;          // 0 to 100%
  headerTipHeight: number;
  headerTipHash: string;
  checkpointHeight: number;
  totalHeadersStored: number;
  connectedPeersCount: number;
  peers: SpvPeer[];
  lastSyncTimestamp: number;
  cumulativeWork: string;
  consensusStatus: 'healthy' | 'verifying' | 'reorganizing' | 'offline';
  verifiedTxCount: number;
  bloomFilterLoaded: boolean;
  engineName: string;            // 'bitcoinj SPV Engine'
  engineVersion: string;
}

export interface SpvVerificationResult {
  valid: boolean;
  txid: string;
  blockHeight: number;
  blockHash: string;
  computedRoot: string;
  expectedRoot: string;
  merkleBranchLength: number;
  powVerified: boolean;
  details: string;
  timestamp: number;
}

export interface SpvDownloadProgress {
  status: 'idle' | 'discovering' | 'connecting' | 'loading_filter' | 'downloading' | 'synced' | 'error';
  startBlock: number;
  currentBlock: number;
  targetBlock: number;
  percent: number;
  headersDownloaded: number;
  totalHeaders: number;
  downloadSpeedHeadersPerSec: number;
  activePeerHost?: string;
  bytesReceived: number;
  timeRemainingSec?: number;
  errorMessage?: string;
}

export interface SpvP2PLogMessage {
  id: string;
  timestamp: number;
  source: 'Wallet' | 'BlockStore' | 'BlockChain' | 'PeerGroup' | 'P2P';
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

export interface SpvArchitectureComponents {
  wallet: {
    name: string;
    classRef: string;
    status: 'ready' | 'filtering' | 'synced';
    activeAddressesCount: number;
    bloomFilterElements: number;
    bloomFilterFpRate: number;
  };
  blockStore: {
    name: string;
    classRef: string;
    status: 'active' | 'saving';
    headersCount: number;
    storageType: string;
    fileSizeBytes: number;
  };
  blockChain: {
    name: string;
    classRef: string;
    status: 'verifying' | 'synced' | 'reorganizing';
    bestHeight: number;
    bestHash: string;
    chainWork: string;
    verifiedPoWHeaders: number;
  };
  peerGroup: {
    name: string;
    classRef: string;
    status: 'connecting' | 'downloading' | 'connected' | 'idle';
    connectedPeers: number;
    totalPeers: number;
    dnsSeedsResolved: number;
  };
}

export interface MainnetParameterItem {
  id: string;
  category: 'network_wire' | 'consensus_pow' | 'cryptography_keys' | 'genesis_checkpoints' | 'dns_seeds';
  name: string;
  key: string;
  value: string | number;
  hexValue?: string;
  expectedValue: string | number;
  status: 'valid' | 'invalid' | 'warning';
  bipReference?: string;
  descriptionTh: string;
  descriptionEn: string;
}

export interface MainnetVerificationReport {
  timestamp: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  overallStatus: 'PASS' | 'FAIL';
  networkName: string;
  protocolVersion: number;
  magicHex: string;
  port: number;
  checks: MainnetParameterItem[];
}
