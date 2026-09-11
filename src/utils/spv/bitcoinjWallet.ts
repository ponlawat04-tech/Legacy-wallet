/**
 * Bitcoin SPV Wallet (bitcoinj-inspired org.bitcoinj.wallet.Wallet)
 * Holds watched keys and addresses, generates BIP-37 Bloom filter bytes
 * for decentralized peer filtering, and tracks received transaction scripts.
 */

import { WalletAccount, Transaction } from '../../types/wallet';

export interface BloomFilterConfig {
  sizeBytes: number;
  hashFunctions: number;
  tweak: number;
  flags: number;
  filterHex: string;
  elementsCount: number;
  falsePositiveRate: number;
}

export class BitcoinjWallet {
  private watchedAddresses: Set<string> = new Set();
  private watchedOutpoints: Set<string> = new Set();
  private walletAccount: WalletAccount | null = null;
  private bloomFilter: BloomFilterConfig | null = null;
  private lastMatchedTxids: Set<string> = new Set();

  constructor() {
    this.refreshBloomFilter();
  }

  /**
   * Set the active wallet account to extract addresses and keys
   */
  public setAccount(account: WalletAccount): void {
    this.walletAccount = account;
    this.watchedAddresses.clear();

    if (account.address) {
      this.watchedAddresses.add(account.address);
    }
    if (account.publicKey) {
      this.watchedAddresses.add(account.publicKey);
    }

    this.refreshBloomFilter();
  }

  /**
   * Add a custom address or public key script to the watch list
   */
  public addWatchedAddress(address: string): void {
    if (address) {
      this.watchedAddresses.add(address.trim());
      this.refreshBloomFilter();
    }
  }

  /**
   * Get all currently watched addresses
   */
  public getWatchedAddresses(): string[] {
    return Array.from(this.watchedAddresses);
  }

  /**
   * Calculate BIP-37 Bloom filter for the wallet (bitcoinj BloomFilter.java)
   * Formula: size = (-1 / (ln(2)^2) * N * ln(P)) / 8 bytes
   * N = element count, P = false positive rate (0.0001)
   */
  public refreshBloomFilter(): BloomFilterConfig {
    const N = Math.max(1, this.watchedAddresses.size + 1);
    const P = 0.0001;
    const LN2_SQUARED = 0.4804530139;

    // Filter byte size
    const rawBits = Math.ceil((-1 / LN2_SQUARED) * N * Math.log(P));
    const sizeBytes = Math.min(36000, Math.max(32, Math.ceil(rawBits / 8)));
    const hashFuncs = Math.min(50, Math.round((sizeBytes * 8 / N) * 0.69314718));
    const tweak = 0x48f2a71c;

    // Deterministic synthetic filter payload derived from watched elements
    const filterArray = new Uint8Array(sizeBytes);
    let seed = tweak;
    for (const addr of this.watchedAddresses) {
      for (let i = 0; i < addr.length; i++) {
        seed = (seed * 31 + addr.charCodeAt(i)) >>> 0;
        const bitIdx = seed % (sizeBytes * 8);
        filterArray[Math.floor(bitIdx / 8)] |= (1 << (bitIdx % 8));
      }
    }

    const filterHex = Array.from(filterArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    this.bloomFilter = {
      sizeBytes,
      hashFunctions: hashFuncs,
      tweak,
      flags: 1, // BLOOM_UPDATE_ALL
      filterHex,
      elementsCount: N,
      falsePositiveRate: P,
    };

    return this.bloomFilter;
  }

  /**
   * Get the current active Bloom filter
   */
  public getBloomFilter(): BloomFilterConfig {
    if (!this.bloomFilter) {
      return this.refreshBloomFilter();
    }
    return this.bloomFilter;
  }

  /**
   * Check if a transaction is relevant to this wallet
   */
  public isTransactionRelevant(tx: Transaction): boolean {
    const addrs = this.watchedAddresses;
    if (addrs.has(tx.recipientAddress) || addrs.has(tx.senderAddress)) {
      this.lastMatchedTxids.add(tx.txid.toLowerCase());
      return true;
    }
    return false;
  }

  /**
   * Get status summary for architecture display
   */
  public getStatus() {
    return {
      name: 'Wallet',
      classRef: 'org.bitcoinj.wallet.Wallet',
      status: (this.watchedAddresses.size > 0 ? 'ready' : 'filtering') as 'ready' | 'filtering' | 'synced',
      activeAddressesCount: this.watchedAddresses.size,
      bloomFilterElements: this.bloomFilter?.elementsCount || 4,
      bloomFilterFpRate: this.bloomFilter?.falsePositiveRate || 0.0001,
    };
  }
}

// Global Singleton for the SPV Wallet representation
export const spvWallet = new BitcoinjWallet();
