import { Transaction } from '../types/wallet';

export interface RealAddressData {
  address: string;
  balanceSats: number;
  balanceBtc: number;
  unconfirmedSats: number;
  txCount: number;
  isOnline: boolean;
}

/**
 * Fetch real on-chain balance and UTXO stats directly from Bitcoin Mainnet nodes (Mempool.space & Blockstream fallback)
 */
export async function fetchRealAddressData(address: string): Promise<RealAddressData> {
  const cleanAddr = address.trim();
  if (!cleanAddr) {
    return {
      address: '',
      balanceSats: 0,
      balanceBtc: 0,
      unconfirmedSats: 0,
      txCount: 0,
      isOnline: false,
    };
  }

  // Try Mempool.space first, fallback to Blockstream.info
  const endpoints = [
    `https://mempool.space/api/address/${cleanAddr}`,
    `https://blockstream.info/api/address/${cleanAddr}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        const funded = data.chain_stats?.funded_txo_sum || 0;
        const spent = data.chain_stats?.spent_txo_sum || 0;
        const mempoolFunded = data.mempool_stats?.funded_txo_sum || 0;
        const mempoolSpent = data.mempool_stats?.spent_txo_sum || 0;
        
        const confirmedSats = Math.max(0, funded - spent);
        const unconfirmedSats = mempoolFunded - mempoolSpent;
        const totalSats = Math.max(0, confirmedSats + unconfirmedSats);
        const totalBtc = totalSats / 100000000;
        const txCount = (data.chain_stats?.tx_count || 0) + (data.mempool_stats?.tx_count || 0);

        return {
          address: cleanAddr,
          balanceSats: totalSats,
          balanceBtc: totalBtc,
          unconfirmedSats,
          txCount,
          isOnline: true,
        };
      }
    } catch {
      // Try next endpoint
      continue;
    }
  }

  // If offline or completely unreachable, return 0 balance safely
  return {
    address: cleanAddr,
    balanceSats: 0,
    balanceBtc: 0,
    unconfirmedSats: 0,
    txCount: 0,
    isOnline: false,
  };
}

/**
 * Fetch real on-chain transaction history from Bitcoin blockchain for an address
 */
export async function fetchRealAddressTransactions(
  address: string,
  currentTipBlockHeight: number = 884120
): Promise<Transaction[]> {
  const cleanAddr = address.trim();
  if (!cleanAddr) return [];

  const endpoints = [
    `https://mempool.space/api/address/${cleanAddr}/txs`,
    `https://blockstream.info/api/address/${cleanAddr}/txs`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const txsData = await res.json();
        if (!Array.isArray(txsData)) return [];

        const parsedTransactions: Transaction[] = txsData.map((rawTx: any) => {
          const txid = rawTx.txid || '';
          const isConfirmed = !!rawTx.status?.confirmed;
          const blockHeight = rawTx.status?.block_height || null;
          const blockTime = rawTx.status?.block_time;
          const timestamp = blockTime ? blockTime * 1000 : Date.now();
          const confirmations = isConfirmed && blockHeight
            ? Math.max(1, currentTipBlockHeight - blockHeight + 1)
            : 0;

          // Calculate incoming vs outgoing amounts for this address
          let inputSumFromThisAddr = 0;
          let outputSumToThisAddr = 0;
          let senderAddr = 'Unknown';
          let recipientAddr = 'Unknown';

          if (Array.isArray(rawTx.vin)) {
            for (const vin of rawTx.vin) {
              const prevAddr = vin.prevout?.scriptpubkey_address;
              const val = vin.prevout?.value || 0;
              if (prevAddr === cleanAddr) {
                inputSumFromThisAddr += val;
              } else if (prevAddr && senderAddr === 'Unknown') {
                senderAddr = prevAddr;
              }
            }
          }

          if (Array.isArray(rawTx.vout)) {
            for (const vout of rawTx.vout) {
              const outAddr = vout.scriptpubkey_address;
              const val = vout.value || 0;
              if (outAddr === cleanAddr) {
                outputSumToThisAddr += val;
              } else if (outAddr && recipientAddr === 'Unknown') {
                recipientAddr = outAddr;
              }
            }
          }

          const isSent = inputSumFromThisAddr > 0;
          const feeSats = rawTx.fee || 0;
          const vsize = rawTx.vsize || (rawTx.weight ? Math.ceil(rawTx.weight / 4) : 140);
          const feeRateSatVb = vsize > 0 ? Math.max(1, Math.round(feeSats / vsize)) : 10;

          let amountSats = 0;
          if (isSent) {
            // Amount sent to other parties
            amountSats = Math.max(0, inputSumFromThisAddr - outputSumToThisAddr - feeSats);
            if (recipientAddr === 'Unknown') recipientAddr = cleanAddr;
            senderAddr = cleanAddr;
          } else {
            // Amount received into this wallet
            amountSats = outputSumToThisAddr;
            recipientAddr = cleanAddr;
          }

          const amountBtc = amountSats / 100000000;

          return {
            id: `real-tx-${txid.slice(0, 16)}`,
            txid,
            type: isSent ? ('sent' as const) : ('received' as const),
            amountBtc,
            amountSats,
            feeSats,
            feeRateSatVb,
            recipientAddress: recipientAddr,
            senderAddress: senderAddr,
            timestamp,
            confirmations,
            blockHeight,
            status: isConfirmed ? ('completed' as const) : ('pending' as const),
            note: isConfirmed ? 'On-chain Confirmed' : 'Mempool Unconfirmed',
          };
        });

        return parsedTransactions;
      }
    } catch {
      continue;
    }
  }

  return [];
}

/**
 * Broadcast signed raw transaction hex to Bitcoin Mainnet
 */
export async function broadcastRealTxHex(rawHex: string): Promise<{ success: boolean; txid?: string; error?: string }> {
  const cleanHex = rawHex.trim();
  if (!cleanHex) {
    return { success: false, error: 'Empty transaction hex' };
  }

  try {
    const res = await fetch('https://mempool.space/api/tx', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: cleanHex,
    });

    if (res.ok) {
      const txid = await res.text();
      return { success: true, txid };
    } else {
      const errText = await res.text();
      return { success: false, error: errText || 'Broadcast rejected by mempool' };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network connection failed' };
  }
}
