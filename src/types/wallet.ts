import { SpvMerkleProof } from './spv';

export type AddressType = 'native_segwit' | 'taproot' | 'legacy' | 'nested_segwit';

export type Language = 'th' | 'en';

export type Currency = 'THB' | 'USD';

export interface HardForkCoinBalance {
  symbol: 'BCH' | 'BSV' | 'BTG' | 'XEC';
  name: string;
  amount: number;
  priceUsd: number;
  address: string;
  claimedTimestamp: number;
}

export interface WalletAccount {
  id: string;
  name: string;
  address: string; // Public receiving address (e.g., bc1q...)
  addressType: AddressType;
  publicKey: string; // Public key for verifying & generating addresses
  balanceBtc: number; // Balance in BTC
  balanceSats: number; // Balance in Satoshis (1 BTC = 100,000,000 Sats)
  keySource?: 'seed_phrase' | 'private_key' | 'master_private_key'; // Type of secret origin
  keyFormat?: string; // 12-words, 18-words, 24-words, WIF, Hex, Master Key (xprv, zprv), BIP-85, etc.
  seedWordCount?: number; // Word count: 12, 15, 16, 18, 20, 21, 24
  isBip85Child?: boolean; // True if derived via BIP-85 deterministic child engine
  bip85ChildIndex?: number; // BIP-85 child index
  isShamirShare?: boolean; // True if derived from SLIP-0039 Shamir Secret Sharing
  color?: string; // Custom theme color identifier
  forkBalances?: HardForkCoinBalance[]; // Hard Fork coin holdings (BCH, BSV, BTG, XEC)
  isVaultSealed: boolean; // True when seed/private key has been permanently sealed
  sealedTimestamp: number | null; // When vault was sealed
  derivationPath: string; // e.g. m/84'/0'/0'/0/0 for Native SegWit
  createdOffline: boolean; // Created during offline cold mode
  has25thWord?: boolean; // True if created/imported with 25th word (BIP39 Passphrase)
  passphraseHint?: string; // Optional hint for the 25th word
  masterFingerprint?: string; // Root master fingerprint e.g. 73C5DA0A
  extendedPublicKey?: string; // Corresponding xpub, zpub, ypub
  masterKeyDepth?: number;    // Depth: 0 for root master key, 3 for account key
}

export interface ZeroExposureVault {
  keyHash: string; // Salted PBKDF2/SHA-256 hash used for signing validation
  isPermanentlySealed: boolean; // Strict true: seed cannot be retrieved by ANY means
  rawSeedPurged: boolean; // True: memory cleared
  vaultFingerprint: string; // Cryptographic fingerprint (e.g. 8C3A-9F21)
  encryptedSignerKey: string; // Encrypted key used ONLY inside WebCrypto memory for signing
}

export interface Transaction {
  id: string;
  txid: string;
  type: 'sent' | 'received' | 'psbt_signed';
  coinSymbol?: 'BTC' | 'BCH' | 'BSV' | 'BTG' | 'XEC';
  amountBtc: number;
  amountSats: number;
  feeSats: number;
  feeRateSatVb: number;
  recipientAddress: string;
  senderAddress: string;
  timestamp: number;
  confirmations: number;
  blockHeight?: number;
  status: 'completed' | 'pending' | 'broadcasted';
  note?: string;
  spvVerified?: boolean;
  spvProof?: SpvMerkleProof;
}

export interface FeeEstimates {
  low: number; // Sat/vB (~1 hr)
  medium: number; // Sat/vB (~30 min)
  high: number; // Sat/vB (~10 min / Next Block)
  custom: number;
}

export interface ForkCoinPrices {
  BCH: number;
  BSV: number;
  BTG: number;
  XEC: number;
}

export interface MarketData {
  priceUsd: number;
  priceThb: number;
  change24h: number;
  high24h: number;
  low24h: number;
  high24hThb?: number;
  low24hThb?: number;
  marketCapUsd: number;
  volume24hUsd: number;
  mempoolUnconfirmedTx: number;
  nextHalvingBlock: number;
  currentBlock: number;
  feeEstimates: FeeEstimates;
  lastUpdated: number;
  pingMs?: number;
  isOnline?: boolean;
  forkPrices?: ForkCoinPrices;
  chainPrices?: Record<string, number>;
}

export interface SecuritySettings {
  pinEnabled: boolean;
  pinHash: string | null;
  duressPinHash: string | null; // Decoy wallet PIN
  antiScrambleKeypad: boolean;
  autoLockDelayMinutes: number; // 1, 5, 15, 30
  biometricsEnabled: boolean;
  airGapMode: boolean; // Simulate disconnected offline state
  duressActive: boolean; // If logged in via duress pin
  blockBackgroundSync: boolean; // Prevent any background polling or interval tasks
  requirePinForOnline: boolean; // Enforce PIN authentication before any internet connection is allowed
  vaultFrozen?: boolean; // True: all outbound transfers/signing locked until unfrozen via PIN
  frozenTimestamp?: number | null; // When vault was frozen
}

export type ActiveTab = 'home' | 'send' | 'receive' | 'airgap' | 'history' | 'market' | 'security';
