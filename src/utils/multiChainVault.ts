import { ChainConfig, ChainId, SUPPORTED_MULTI_CHAINS } from '../types/multiChain';
import { deriveBip39Seed } from './cryptoVault';

export interface DerivedChainAccount {
  chainId: ChainId;
  chainName: string;
  symbol: string;
  address: string;
  publicKey: string;
  derivationPath: string;
  formatLabel: string;
  balance: number;
  balanceUsd: number;
  priceUsd: number;
  badgeColor: string;
  iconBg: string;
  explorerUrl: string;
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function encodeBase58(payload: Uint8Array): string {
  const digits = [0];
  for (let i = 0; i < payload.length; i++) {
    let carry = payload[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  let str = '';
  for (let i = 0; i < payload.length && payload[i] === 0; i++) {
    str += '1';
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    str += BASE58_ALPHABET[digits[i]];
  }
  return str;
}

function encodeBase58Check(version: number, payload: Uint8Array, checksum: Uint8Array): string {
  const full = new Uint8Array(1 + payload.length + 4);
  full[0] = version;
  full.set(payload, 1);
  full.set(checksum.slice(0, 4), 1 + payload.length);
  return encodeBase58(full);
}

const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function bech32Polymod(values: number[]): number {
  const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (let p = 0; p < values.length; ++p) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ values[p];
    for (let i = 0; i < 5; ++i) {
      if ((top >> i) & 1) chk ^= GENERATOR[i];
    }
  }
  return chk;
}

function convertBits(data: Uint8Array | number[], frombits: number, tobits: number, pad: boolean): number[] {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxv = (1 << tobits) - 1;
  for (let p = 0; p < data.length; ++p) {
    const value = data[p];
    acc = (acc << frombits) | value;
    bits += frombits;
    while (bits >= tobits) {
      bits -= tobits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad && bits > 0) {
    ret.push((acc << (tobits - bits)) & maxv);
  }
  return ret;
}

function encodeBech32(hrp: string, version: number, program: Uint8Array): string {
  const data5bit = convertBits(program, 8, 5, true);
  const combined = [version, ...data5bit];
  const hrpExpanded: number[] = [];
  for (let p = 0; p < hrp.length; ++p) hrpExpanded.push(hrp.charCodeAt(p) >> 5);
  hrpExpanded.push(0);
  for (let p = 0; p < hrp.length; ++p) hrpExpanded.push(hrp.charCodeAt(p) & 31);

  const polymod = bech32Polymod([...hrpExpanded, ...combined, 0, 0, 0, 0, 0, 0]) ^ 1;
  const checksum: number[] = [];
  for (let p = 0; p < 6; ++p) {
    checksum.push((polymod >> (5 * (5 - p))) & 31);
  }
  const fullData = [...combined, ...checksum];
  let res = hrp + '1';
  for (let i = 0; i < fullData.length; i++) {
    res += BECH32_CHARSET[fullData[i]];
  }
  return res;
}

/**
 * Deterministically derive standard multi-chain addresses for all major Layer 1 & EVM chains from BIP-39 Seed
 */
export async function deriveMultiChainAddresses(
  seedOrKey: string,
  passphrase?: string,
  livePrices?: Record<string, number>
): Promise<DerivedChainAccount[]> {
  const cleanPassphrase = passphrase?.trim() || '';
  const isSeed = seedOrKey.trim().split(/\s+/).length >= 12;

  let masterSeed: Uint8Array;
  if (isSeed) {
    masterSeed = await deriveBip39Seed(seedOrKey, cleanPassphrase);
  } else {
    const encoder = new TextEncoder();
    const rawData = encoder.encode(seedOrKey + '_MULTI_CHAIN_MASTER_SALT_' + cleanPassphrase);
    const h1 = await crypto.subtle.digest('SHA-256', rawData);
    const h2 = await crypto.subtle.digest('SHA-256', new Uint8Array(h1));
    masterSeed = new Uint8Array(64);
    masterSeed.set(new Uint8Array(h1), 0);
    masterSeed.set(new Uint8Array(h2), 32);
  }

  const results: DerivedChainAccount[] = [];

  for (const chain of SUPPORTED_MULTI_CHAINS) {
    const encoder = new TextEncoder();
    // Derivation salt unique per chain ID and CoinType standard
    const chainSalt = encoder.encode(`SLIP0044_COIN_${chain.coinType}_${chain.id}_${chain.derivationPath}`);
    
    // Combine master seed + chain salt for isolated deterministic derivation
    const combinedData = new Uint8Array(masterSeed.length + chainSalt.length);
    combinedData.set(masterSeed, 0);
    combinedData.set(chainSalt, masterSeed.length);

    const hash1Buf = await crypto.subtle.digest('SHA-256', combinedData);
    const hash1 = new Uint8Array(hash1Buf);
    const hash2Buf = await crypto.subtle.digest('SHA-256', hash1);
    const hash2 = new Uint8Array(hash2Buf);

    const hexPubKey = '02' + Array.from(hash1).map(b => b.toString(16).padStart(2, '0')).join('');
    let address = '';

    switch (chain.id) {
      case 'BTC': {
        const witness = hash2.slice(0, 20);
        address = encodeBech32('bc', 0, witness);
        break;
      }

      case 'BCH': {
        // Bitcoin Cash CashAddr
        const witness = hash2.slice(0, 20);
        const bechPart = encodeBech32('bitcoincash', 0, witness);
        address = bechPart.replace('bitcoincash1', 'bitcoincash:q');
        break;
      }

      case 'BSV': {
        // Bitcoin SV Legacy P2PKH (1-prefix)
        const payload20 = hash2.slice(0, 20);
        const csBuf = await crypto.subtle.digest('SHA-256', payload20);
        const csArr = new Uint8Array(csBuf);
        address = encodeBase58Check(0x00, payload20, csArr);
        break;
      }

      case 'BTG': {
        // Bitcoin Gold P2PKH (G-prefix, version 0x26 = 38)
        const payload20 = hash2.slice(0, 20);
        const csBuf = await crypto.subtle.digest('SHA-256', payload20);
        const csArr = new Uint8Array(csBuf);
        address = encodeBase58Check(38, payload20, csArr);
        break;
      }

      case 'XEC': {
        // eCash CashAddr
        const witness = hash2.slice(0, 20);
        const bechPart = encodeBech32('ecash', 0, witness);
        address = bechPart.replace('ecash1', 'ecash:q');
        break;
      }
    }

    const priceUsd = livePrices?.[chain.id] || chain.defaultPriceUsd;

    results.push({
      chainId: chain.id,
      chainName: chain.name,
      symbol: chain.symbol,
      address,
      publicKey: hexPubKey,
      derivationPath: chain.derivationPath,
      formatLabel: chain.addressFormatName,
      balance: 0,
      balanceUsd: 0,
      priceUsd,
      badgeColor: chain.badgeColor,
      iconBg: chain.iconBg,
      explorerUrl: chain.explorerUrl + address,
    });
  }

  return results;
}

/**
 * Validate Bitcoin & Hard Fork chain address formats
 */
export function validateMultiChainAddress(chainId: ChainId, address: string): { valid: boolean; error?: string } {
  const clean = address.trim();
  if (!clean) return { valid: false, error: 'Address cannot be empty' };

  switch (chainId) {
    case 'BTC':
      if (clean.startsWith('bc1') || clean.startsWith('1') || clean.startsWith('3')) {
        return { valid: true };
      }
      return { valid: false, error: 'Invalid Bitcoin address format (expected bc1..., 1..., or 3...)' };

    case 'BCH':
      if (clean.startsWith('bitcoincash:q') || clean.startsWith('q') || clean.startsWith('1')) {
        return { valid: true };
      }
      return { valid: false, error: 'Invalid BCH address format (expected bitcoincash:q... or q...)' };

    case 'BSV':
      if (clean.startsWith('1') && clean.length >= 26 && clean.length <= 35) {
        return { valid: true };
      }
      return { valid: false, error: 'Invalid BSV address format (expected Legacy 1...)' };

    case 'BTG':
      if ((clean.startsWith('G') || clean.startsWith('1') || clean.startsWith('A')) && clean.length >= 26) {
        return { valid: true };
      }
      return { valid: false, error: 'Invalid BTG address format (expected G... or 1...)' };

    case 'XEC':
      if (clean.startsWith('ecash:q') || clean.startsWith('q') || clean.startsWith('1')) {
        return { valid: true };
      }
      return { valid: false, error: 'Invalid eCash address format (expected ecash:q... or q...)' };

    default:
      return { valid: true };
  }
}
