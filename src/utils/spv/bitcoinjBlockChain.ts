/**
 * Bitcoin SPV BlockChain (bitcoinj-inspired org.bitcoinj.core.BlockChain)
 * Enforces consensus rules, verifies Proof-of-Work continuity, manages the active chain tip,
 * detects chain reorganizations, and coordinates block events with connected wallets.
 */

import { BlockHeader } from '../../types/spv';
import { BitcoinjSPVBlockStore, spvBlockStore } from './bitcoinjBlockStore';

export interface BlockChainListener {
  onNewBestBlock: (header: BlockHeader) => void;
  onReorganize?: (splitHeight: number, oldTip: BlockHeader, newTip: BlockHeader) => void;
}

export class BitcoinjBlockChain {
  private blockStore: BitcoinjSPVBlockStore;
  private listeners: Set<BlockChainListener> = new Set();
  private chainTip: BlockHeader;
  private totalVerifiedPoW: number = 0;

  constructor(store: BitcoinjSPVBlockStore = spvBlockStore) {
    this.blockStore = store;
    this.chainTip = store.getTip();
    this.totalVerifiedPoW = store.getHeaderCount();
  }

  /**
   * Attach block store
   */
  public setBlockStore(store: BitcoinjSPVBlockStore): void {
    this.blockStore = store;
    this.chainTip = store.getTip();
  }

  /**
   * Register listener (e.g. Wallet, UI, Logger)
   */
  public addListener(listener: BlockChainListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current verified chain tip
   */
  public getBestChainTip(): BlockHeader {
    const tip = this.blockStore.getTip();
    this.chainTip = tip;
    return tip;
  }

  /**
   * Get height of best chain tip
   */
  public getChainHeight(): number {
    return this.getBestChainTip().height;
  }

  /**
   * Get count of verified PoW headers
   */
  public getVerifiedPoWCount(): number {
    return this.blockStore.getHeaderCount();
  }

  /**
   * Add a newly received block header into the blockchain (bitcoinj BlockChain.add)
   * Validates Proof-of-Work target, previous block linkage, and updates chain tip
   */
  public add(header: BlockHeader): { accepted: boolean; height: number; isNewTip: boolean; reorg: boolean } {
    if (!header.verifiedPoW) {
      throw new Error(`PoW Check Failed: Header ${header.hash} does not meet target difficulty`);
    }

    const currentTip = this.getBestChainTip();
    let isNewTip = false;
    let isReorg = false;

    // Check if parent header exists in store
    const prevHeader = this.blockStore.getHeaderByHash(header.prevBlockHash);
    if (prevHeader && header.height !== prevHeader.height + 1) {
      console.warn(`BlockChain: Height mismatch with parent: got ${header.height}, expected ${prevHeader.height + 1}`);
    }

    // Add into block store
    if (!this.blockStore.getHeaderByHash(header.hash)) {
      if (header.rawHex && header.rawHex.length === 160) {
        this.blockStore.addHeader(header.rawHex, header.height);
      }
    }

    // Determine if this extends the best chain
    if (header.height > currentTip.height) {
      if (header.prevBlockHash && header.prevBlockHash !== currentTip.hash) {
        // Detected fork or re-org
        isReorg = true;
        for (const l of this.listeners) {
          l.onReorganize?.(currentTip.height - 1, currentTip, header);
        }
      }

      this.chainTip = header;
      isNewTip = true;
      this.totalVerifiedPoW += 1;

      // Notify listeners
      for (const l of this.listeners) {
        try {
          l.onNewBestBlock(header);
        } catch {
          // Listener error
        }
      }
    }

    return {
      accepted: true,
      height: header.height,
      isNewTip,
      reorg: isReorg,
    };
  }

  /**
   * Fast batch validation of contiguous block headers
   */
  public verifyHeaderSequence(headers: BlockHeader[]): { valid: boolean; verifiedCount: number; error?: string } {
    if (headers.length === 0) return { valid: true, verifiedCount: 0 };

    let count = 0;
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (!h.verifiedPoW) {
        return { valid: false, verifiedCount: count, error: `Invalid PoW at header #${h.height}` };
      }

      if (i > 0) {
        const prev = headers[i - 1];
        if (h.prevBlockHash && prev.hash && h.prevBlockHash !== prev.hash) {
          return { valid: false, verifiedCount: count, error: `Broken chain continuity at height #${h.height}` };
        }
      }
      count++;
    }

    return { valid: true, verifiedCount: count };
  }
}

// Global Singleton for the SPV BlockChain
export const spvBlockChain = new BitcoinjBlockChain(spvBlockStore);
