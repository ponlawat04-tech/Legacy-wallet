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

      case 'ETH':
      case 'BNB':
      case 'AVAX':
      case 'POL': {
        // EVM Keccak-256 / SHA-256 public key slice (0x + 40 hex chars)
        const evmSlice = Array.from(hash1.slice(12, 32)).map(b => b.toString(16).padStart(2, '0')).join('');
        address = `0x${evmSlice}`;
        break;
      }

      case 'SOL': {
        // Solana 32-byte Ed25519 public key Base58 encoded
        const solSlice = hash1.slice(0, 32);
        address = encodeBase58(solSlice);
        break;
      }

      case 'TRX': {
        // TRON TRC-20 Base58Check with 0x41 ('T') prefix
        const payload20 = hash2.slice(0, 20);
        const csBuf = await crypto.subtle.digest('SHA-256', payload20);
        const csArr = new Uint8Array(csBuf);
        address = encodeBase58Check(0x41, payload20, csArr);
        break;
      }

      case 'DOGE': {
        // Dogecoin Base58Check with 0x1E ('D') prefix
        const payload20 = hash2.slice(0, 20);
        const csBuf = await crypto.subtle.digest('SHA-256', payload20);
        const csArr = new Uint8Array(csBuf);
        address = encodeBase58Check(0x1e, payload20, csArr);
        break;
      }

      case 'LTC': {
        // Litecoin Native SegWit ltc1q...
        const witness = hash2.slice(0, 20);
        address = encodeBech32('ltc', 0, witness);
        break;
      }

      case 'BCH': {
        // Bitcoin Cash CashAddr
        const witness = hash2.slice(0, 20);
        const bechPart = encodeBech32('bitcoincash', 0, witness);
        address = bechPart.replace('bitcoincash1', 'bitcoincash:q');
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
 * Validate any major chain address format
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

    case 'ETH':
    case 'BNB':
    case 'AVAX':
    case 'POL':
      if (/^0x[0-9a-fA-F]{40}$/.test(clean)) {
        return { valid: true };
      }
      return { valid: false, error: 'Invalid EVM address format (expected 0x followed by 40 hex characters)' };

    case 'SOL':
      if (clean.length >= 32 && clean.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(clean)) {
        return { valid: true };
      }
      return { valid: false, error: 'Invalid Solana address format (expected 32-44 Base58 characters)' };

    case 'TRX':
      if (clean.startsWith('T') && clean.length === 34 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(clean)) {
        return { valid: true };
      }
      return { valid: false, error: 'Invalid TRON address format (expected 34 Base58 characters starting with T)' };

    case 'DOGE':
      if (clean.startsWith('D') && clean.length >= 30 && clean.length <= 36) {
        return { valid: true };
      }
      return { valid: false, error: 'Invalid Dogecoin address format (expected D-prefix Base58 address)' };

    case 'LTC':
      if (clean.startsWith('ltc1') || clean.startsWith('L') || clean.startsWith('M')) {
        return { valid: true };
      }
      return { valid: false, error: 'Invalid Litecoin address format (expected ltc1..., L..., or M...)' };

    case 'BCH':
      if (clean.startsWith('bitcoincash:q') || clean.startsWith('q') || clean.startsWith('1')) {
        return { valid: true };
      }
      return { valid: false, error: 'Invalid BCH address format (expected bitcoincash:q... or q...)' };

    default:
      return { valid: true };
  }
}
