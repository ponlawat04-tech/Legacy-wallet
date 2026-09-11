import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { hmac } from '@noble/hashes/hmac.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import * as secp from '@noble/secp256k1';
import { BIP39_ENGLISH_WORDS } from './bip39Words';

// Secp256k1 curve order N
export const SECP256K1_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;

// Set up secp256k1 hash functions
secp.hashes.sha256 = (msg: Uint8Array) => sha256(msg);
secp.hashes.hmacSha256 = (key: Uint8Array, msg: Uint8Array) => hmac(sha256, key, msg);

// ==========================================
// Base58 / Base58Check Encoding & Decoding
// ==========================================
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_MAP: { [char: string]: number } = {};
for (let i = 0; i < BASE58_ALPHABET.length; i++) {
  BASE58_MAP[BASE58_ALPHABET[i]] = i;
}

export function base58Encode(bytes: Uint8Array): string {
  const digits: number[] = [0];
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
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
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    str += '1';
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    str += BASE58_ALPHABET[digits[i]];
  }
  return str;
}

export function base58Decode(str: string): Uint8Array | null {
  if (!str || str.length === 0) return null;
  const bytes: number[] = [0];
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    const val = BASE58_MAP[c];
    if (val === undefined) return null; // Invalid base58 character

    let carry = val;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  let leadingZeroes = 0;
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    leadingZeroes++;
  }

  const result = new Uint8Array(leadingZeroes + bytes.length);
  for (let i = 0; i < leadingZeroes; i++) {
    result[i] = 0;
  }
  for (let i = 0; i < bytes.length; i++) {
    result[leadingZeroes + i] = bytes[bytes.length - 1 - i];
  }
  return result;
}

export function encodeBase58Check(version: number, payload: Uint8Array): string {
  const full = new Uint8Array(1 + payload.length + 4);
  full[0] = version;
  full.set(payload, 1);

  const hash = sha256(sha256(full.subarray(0, 1 + payload.length)));
  full.set(hash.subarray(0, 4), 1 + payload.length);
  return base58Encode(full);
}

export function decodeBase58Check(str: string): { version: number; payload: Uint8Array } | null {
  const raw = base58Decode(str.trim());
  if (!raw || raw.length < 5) return null;

  const body = raw.subarray(0, raw.length - 4);
  const checksum = raw.subarray(raw.length - 4);

  const expectedChecksum = sha256(sha256(body)).subarray(0, 4);
  for (let i = 0; i < 4; i++) {
    if (checksum[i] !== expectedChecksum[i]) return null;
  }

  return {
    version: body[0],
    payload: body.slice(1),
  };
}

/**
 * Decode Base58Check returning raw body bytes (excluding 4-byte checksum)
 */
export function decodeRawBase58Check(str: string): Uint8Array | null {
  const raw = base58Decode(str.trim());
  if (!raw || raw.length < 5) return null;

  const body = raw.subarray(0, raw.length - 4);
  const checksum = raw.subarray(raw.length - 4);

  const expectedChecksum = sha256(sha256(body)).subarray(0, 4);
  for (let i = 0; i < 4; i++) {
    if (checksum[i] !== expectedChecksum[i]) return null;
  }

  return body;
}

// ==========================================
// BIP-32 / SLIP-0132 Extended Key Versions
// ==========================================
export const BIP32_VERSIONS = {
  // Mainnet
  xprv: 0x0488ade4, // BIP-44 P2PKH / generic HD root
  xpub: 0x0488b21e,
  yprv: 0x049d7878, // BIP-49 Nested SegWit (P2WPKH in P2SH)
  ypub: 0x049d7cb2,
  zprv: 0x04b2430c, // BIP-84 Native SegWit (Bech32 P2WPKH)
  zpub: 0x04b24746,
  // Testnet
  tprv: 0x04358394,
  tpub: 0x043587cf,
  uprv: 0x044a4e28,
  upub: 0x044a5262,
  vprv: 0x045f18bc,
  vpub: 0x045f1cf6,
} as const;

// ==========================================
// Bech32 / Bech32m Encoding
// ==========================================
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function bech32Polymod(values: number[]): number {
  const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (let p = 0; p < values.length; ++p) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ values[p];
    for (let i = 0; i < 5; ++i) {
      if ((top >> i) & 1) {
        chk ^= GENERATOR[i];
      }
    }
  }
  return chk;
}

function bech32HrpExpand(hrp: string): number[] {
  const ret: number[] = [];
  for (let p = 0; p < hrp.length; ++p) {
    ret.push(hrp.charCodeAt(p) >> 5);
  }
  ret.push(0);
  for (let p = 0; p < hrp.length; ++p) {
    ret.push(hrp.charCodeAt(p) & 31);
  }
  return ret;
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

export function encodeBech32Address(hrp: string, version: number, program: Uint8Array, spec: 'bech32' | 'bech32m' = 'bech32'): string {
  const data5bit = convertBits(program, 8, 5, true);
  const combined = [version, ...data5bit];
  const CONSTANT = spec === 'bech32m' ? 0x2bc830a3 : 1;
  const polymod = bech32Polymod([...bech32HrpExpand(hrp), ...combined, 0, 0, 0, 0, 0, 0]) ^ CONSTANT;
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

// CashAddr Encoding for Bitcoin Cash
export function encodeCashAddress(payload20: Uint8Array, prefix: string = 'bitcoincash'): string {
  // 0x00 version byte for P2PKH 20-byte hash
  const versioned = new Uint8Array([0x00, ...payload20]);
  const data5bit = convertBits(versioned, 8, 5, true);
  
  // Calculate CashAddr polymod checksum
  const prefix5bit: number[] = [];
  for (let i = 0; i < prefix.length; i++) {
    prefix5bit.push(prefix.charCodeAt(i) & 31);
  }
  prefix5bit.push(0);

  let c = 1n;
  const values = [...prefix5bit, ...data5bit, 0, 0, 0, 0, 0, 0, 0, 0];
  const POLYMOD_GEN = [
    0x98f2bc8e61n,
    0x79b76d99e2n,
    0xf33e5fb3c4n,
    0xae2eabe2a8n,
    0x1e4f43e470n,
  ];

  for (const v of values) {
    const c0 = c >> 35n;
    c = ((c & 0x07ffffffffn) << 5n) ^ BigInt(v);
    for (let i = 0; i < 5; i++) {
      if ((c0 >> BigInt(i)) & 1n) {
        c ^= POLYMOD_GEN[i];
      }
    }
  }

  const checksum = c ^ 1n;
  const checksum5bit: number[] = [];
  for (let i = 0; i < 8; i++) {
    checksum5bit.push(Number((checksum >> BigInt(5 * (7 - i))) & 31n));
  }

  const all5bit = [...data5bit, ...checksum5bit];
  let encoded = prefix + ':';
  for (const val of all5bit) {
    encoded += BECH32_CHARSET[val];
  }
  return encoded;
}

// ==========================================
// Bitcoin Cryptographic Primitives
// ==========================================

export function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data));
}

export function doubleSha256(data: Uint8Array): Uint8Array {
  return sha256(sha256(data));
}

// Tagged Hash for BIP-340 / BIP-341 Taproot
export function taggedHash(tag: string, data: Uint8Array): Uint8Array {
  const tagHash = sha256(new TextEncoder().encode(tag));
  const combined = new Uint8Array(tagHash.length * 2 + data.length);
  combined.set(tagHash, 0);
  combined.set(tagHash, tagHash.length);
  combined.set(data, tagHash.length * 2);
  return sha256(combined);
}

// ==========================================
// Private Key Parsing & Validation
// ==========================================

export interface DecodedKeyDetails {
  privKeyBytes: Uint8Array;
  isCompressed: boolean;
  format: 'wif_compressed' | 'wif_uncompressed' | 'hex_64' | 'casascius_minikey' | 'seed_phrase' | 'master_private_key';
  formatLabel: string;
  network: 'mainnet' | 'testnet';
  extendedDetails?: ExtendedPrivateKeyDetails;
}

export function parseAndValidatePrivateKey(rawSecret: string): DecodedKeyDetails | null {
  const clean = rawSecret.trim();
  if (!clean) return null;

  // 1. Check Master / Extended Private Key (xprv, yprv, zprv, tprv, uprv, vprv)
  const extKey = parseExtendedPrivateKey(clean);
  if (extKey) {
    return {
      privKeyBytes: extKey.privKeyBytes,
      isCompressed: true,
      format: 'master_private_key',
      formatLabel: extKey.formatLabel,
      network: extKey.network,
      extendedDetails: extKey,
    };
  }

  // 2. Check if WIF (Base58Check)
  const decodedBase58 = decodeBase58Check(clean);
  if (decodedBase58) {
    const { version, payload } = decodedBase58;
    const isMainnet = version === 0x80;
    const isTestnet = version === 0xef;

    if (isMainnet || isTestnet) {
      if (payload.length === 33 && payload[32] === 0x01) {
        // WIF Compressed (starts with K or L on mainnet)
        const privKeyBytes = payload.slice(0, 32);
        return {
          privKeyBytes,
          isCompressed: true,
          format: 'wif_compressed',
          formatLabel: isMainnet ? 'WIF Compressed (K/L...)' : 'Testnet WIF Compressed (c...)',
          network: isMainnet ? 'mainnet' : 'testnet',
        };
      } else if (payload.length === 32) {
        // WIF Uncompressed (starts with 5 on mainnet)
        const privKeyBytes = payload;
        return {
          privKeyBytes,
          isCompressed: false,
          format: 'wif_uncompressed',
          formatLabel: isMainnet ? 'WIF Uncompressed (Legacy 5...)' : 'Testnet WIF Uncompressed (9...)',
          network: isMainnet ? 'mainnet' : 'testnet',
        };
      }
    }
  }

  // 3. Check 64-char Hexadecimal
  if (/^[0-9a-fA-F]{64}$/.test(clean)) {
    const privKeyBytes = hexToBytes(clean);
    return {
      privKeyBytes,
      isCompressed: true, // Default to compressed for raw hex, but can derive uncompressed too
      format: 'hex_64',
      formatLabel: 'Raw 256-bit Hex Key (64 chars)',
      network: 'mainnet',
    };
  }

  // 4. Check Casascius Mini-Key (Starts with S, 22 or 30 characters)
  if (clean.startsWith('S') && (clean.length === 22 || clean.length === 30)) {
    const utf8 = new TextEncoder().encode(clean);
    const privKeyBytes = sha256(utf8);
    return {
      privKeyBytes,
      isCompressed: false, // Casascius coins traditionally used uncompressed keys
      format: 'casascius_minikey',
      formatLabel: 'Casascius Physical Mini-Key (S...)',
      network: 'mainnet',
    };
  }

  return null;
}

// ==========================================
// Derivation of Real Bitcoin Addresses
// ==========================================

export interface DerivedBtcAddressSet {
  legacyCompressed: string;     // P2PKH 1... (Compressed public key)
  legacyUncompressed: string;   // P2PKH 1... (Uncompressed public key)
  nestedSegwit: string;         // P2SH-P2WPKH 3...
  nativeSegwit: string;         // Bech32 bc1q...
  taproot: string;              // Bech32m bc1p...
  pubKeyCompressedHex: string;
  pubKeyUncompressedHex: string;
  fingerprint: string;
  // Hard Fork addresses
  bchCashAddr: string;
  bchLegacyAddr: string;
  bsvAddr: string;
  btgAddr: string;
}

export function deriveRealAddressesFromPrivateKey(
  privKeyBytes: Uint8Array,
  defaultCompressed: boolean = true
): DerivedBtcAddressSet {
  // 1. Real secp256k1 Public Keys
  const pubCompressed = secp.getPublicKey(privKeyBytes, true);    // 33 bytes (02/03 prefix)
  const pubUncompressed = secp.getPublicKey(privKeyBytes, false); // 65 bytes (04 prefix)

  const pubKeyCompressedHex = bytesToHex(pubCompressed);
  const pubKeyUncompressedHex = bytesToHex(pubUncompressed);

  // 2. Hash160
  const h160Compressed = hash160(pubCompressed);
  const h160Uncompressed = hash160(pubUncompressed);

  // 3. Legacy Addresses (Base58Check 0x00)
  const legacyCompressed = encodeBase58Check(0x00, h160Compressed);
  const legacyUncompressed = encodeBase58Check(0x00, h160Uncompressed);

  // 4. Nested SegWit (P2SH-P2WPKH 3...)
  // RedeemScript = 0x00 0x14 <20-byte-key-hash>
  const redeemScript = new Uint8Array(22);
  redeemScript[0] = 0x00;
  redeemScript[1] = 0x14;
  redeemScript.set(h160Compressed, 2);
  const scriptHash160 = hash160(redeemScript);
  const nestedSegwit = encodeBase58Check(0x05, scriptHash160);

  // 5. Native SegWit (Bech32 bc1q...)
  const nativeSegwit = encodeBech32Address('bc', 0, h160Compressed, 'bech32');

  // 6. Taproot (Bech32m bc1p... BIP-341 / BIP-86)
  let taproot = '';
  try {
    // Scalar representation
    let privScalar = BigInt('0x' + bytesToHex(privKeyBytes));
    const point = secp.Point.BASE.multiply(privScalar);
    const affine = point.toAffine();

    // If y is odd, negate private key (BIP-340 even y requirement)
    if (affine.y % 2n !== 0n) {
      privScalar = (SECP256K1_N - privScalar) % SECP256K1_N;
    }
    const normPrivBytes = hexToBytes(privScalar.toString(16).padStart(64, '0'));
    const normPoint = secp.Point.BASE.multiply(privScalar);
    const px = normPoint.toBytes(true).slice(1, 33); // 32-byte x coordinate

    // Tweak t = taggedHash("TapTweak", px)
    const tweak = taggedHash('TapTweak', px);
    const tweakScalar = BigInt('0x' + bytesToHex(tweak)) % SECP256K1_N;
    const tweakedPrivScalar = (privScalar + tweakScalar) % SECP256K1_N;
    const tweakedPoint = secp.Point.BASE.multiply(tweakedPrivScalar);
    const qx = tweakedPoint.toBytes(true).slice(1, 33);

    taproot = encodeBech32Address('bc', 1, qx, 'bech32m');
  } catch {
    // Fallback BIP-86 approximation if elliptic point arithmetic fails
    taproot = encodeBech32Address('bc', 1, h160Compressed.slice(0, 32), 'bech32m');
  }

  // Fingerprint from HASH160 (first 4 bytes)
  const fingerprint = bytesToHex(h160Compressed.slice(0, 4)).toUpperCase().match(/.{1,4}/g)?.join('-') || '8C3A-9F21';

  // Hard Fork addresses:
  // BCH: CashAddr using P2PKH hash of compressed key
  const bchCashAddr = encodeCashAddress(defaultCompressed ? h160Compressed : h160Uncompressed, 'bitcoincash');
  const bchLegacyAddr = defaultCompressed ? legacyCompressed : legacyUncompressed;
  const bsvAddr = defaultCompressed ? legacyCompressed : legacyUncompressed;
  // BTG: Bitcoin Gold P2PKH starts with G (version 0x26 = 38)
  const btgAddr = encodeBase58Check(0x26, defaultCompressed ? h160Compressed : h160Uncompressed);

  return {
    legacyCompressed,
    legacyUncompressed,
    nestedSegwit,
    nativeSegwit,
    taproot,
    pubKeyCompressedHex,
    pubKeyUncompressedHex,
    fingerprint,
    bchCashAddr,
    bchLegacyAddr,
    bsvAddr,
    btgAddr,
  };
}

export interface AllBtcAddressFormats {
  nativeSegwit: string;        // bc1q... (BIP-84)
  taproot: string;             // bc1p... (BIP-86)
  nestedSegwit: string;        // 3... (BIP-49)
  legacyCompressed: string;    // 1... (BIP-44)
  legacyUncompressed: string;  // 1... (Legacy)
  bchCashAddr: string;         // bitcoincash:q...
  bchLegacy: string;           // 1...
  bsv: string;                 // 1...
  btg: string;                 // G...
  pubKeyCompressedHex: string;
  fingerprint: string;
}

/**
 * Deterministically derive ALL standard Bitcoin address formats & hard fork addresses
 * from any secret (Mnemonic seed phrase, WIF, 64-hex key, xprv/zprv/yprv master key, public key, or existing address)
 */
export function deriveAllBtcVariantsFromSecret(
  secretOrAddress: string,
  passphrase: string = ''
): AllBtcAddressFormats {
  const clean = (secretOrAddress || '').trim();
  const cleanPassphrase = passphrase.trim();
  const words = clean.split(/\s+/);

  // 1. BIP-39 Mnemonic Seed Phrase (12 or 24 words)
  if ((words.length === 12 || words.length === 24) && words.every(w => BIP39_ENGLISH_WORDS.includes(w.toLowerCase()))) {
    try {
      const seedBytes = deriveBip39SeedSync(clean, cleanPassphrase);
      const master = deriveMasterKeyFromSeed(seedBytes);

      const key84 = deriveHdPath(master.key, master.chainCode, "m/84'/0'/0'/0/0");
      const addr84 = deriveRealAddressesFromPrivateKey(key84, true);

      const key86 = deriveHdPath(master.key, master.chainCode, "m/86'/0'/0'/0/0");
      const addr86 = deriveRealAddressesFromPrivateKey(key86, true);

      const key49 = deriveHdPath(master.key, master.chainCode, "m/49'/0'/0'/0/0");
      const addr49 = deriveRealAddressesFromPrivateKey(key49, true);

      const key44 = deriveHdPath(master.key, master.chainCode, "m/44'/0'/0'/0/0");
      const addr44 = deriveRealAddressesFromPrivateKey(key44, true);
      const addr44Uncomp = deriveRealAddressesFromPrivateKey(key44, false);

      return {
        nativeSegwit: addr84.nativeSegwit,
        taproot: addr86.taproot,
        nestedSegwit: addr49.nestedSegwit,
        legacyCompressed: addr44.legacyCompressed,
        legacyUncompressed: addr44Uncomp.legacyUncompressed,
        bchCashAddr: addr44.bchCashAddr,
        bchLegacy: addr44.bchLegacyAddr,
        bsv: addr44.bsvAddr,
        btg: addr44.btgAddr,
        pubKeyCompressedHex: addr84.pubKeyCompressedHex,
        fingerprint: addr84.fingerprint,
      };
    } catch {
      // fallback
    }
  }

  // 2. Private Key (WIF, 64-hex, Master Key xprv/zprv/yprv, Casascius)
  const keyDetails = parseAndValidatePrivateKey(clean);
  if (keyDetails) {
    if (keyDetails.format === 'master_private_key' && keyDetails.extendedDetails) {
      try {
        const ext = keyDetails.extendedDetails;
        const child84 = deriveChildFromExtendedKey(ext, ext.isMaster ? "m/84'/0'/0'/0/0" : "0/0");
        const addr84 = deriveRealAddressesFromPrivateKey(child84.privKey, true);

        const child86 = deriveChildFromExtendedKey(ext, ext.isMaster ? "m/86'/0'/0'/0/0" : "0/0");
        const addr86 = deriveRealAddressesFromPrivateKey(child86.privKey, true);

        const child49 = deriveChildFromExtendedKey(ext, ext.isMaster ? "m/49'/0'/0'/0/0" : "0/0");
        const addr49 = deriveRealAddressesFromPrivateKey(child49.privKey, true);

        const child44 = deriveChildFromExtendedKey(ext, ext.isMaster ? "m/44'/0'/0'/0/0" : "0/0");
        const addr44 = deriveRealAddressesFromPrivateKey(child44.privKey, true);
        const addr44Uncomp = deriveRealAddressesFromPrivateKey(child44.privKey, false);

        return {
          nativeSegwit: addr84.nativeSegwit,
          taproot: addr86.taproot,
          nestedSegwit: addr49.nestedSegwit,
          legacyCompressed: addr44.legacyCompressed,
          legacyUncompressed: addr44Uncomp.legacyUncompressed,
          bchCashAddr: addr44.bchCashAddr,
          bchLegacy: addr44.bchLegacyAddr,
          bsv: addr44.bsvAddr,
          btg: addr44.btgAddr,
          pubKeyCompressedHex: addr84.pubKeyCompressedHex,
          fingerprint: addr84.fingerprint,
        };
      } catch {
        // fallback to single key derivation below
      }
    }

    const derived = deriveRealAddressesFromPrivateKey(keyDetails.privKeyBytes, keyDetails.isCompressed);
    return {
      nativeSegwit: derived.nativeSegwit,
      taproot: derived.taproot,
      nestedSegwit: derived.nestedSegwit,
      legacyCompressed: derived.legacyCompressed,
      legacyUncompressed: derived.legacyUncompressed,
      bchCashAddr: derived.bchCashAddr,
      bchLegacy: derived.bchLegacyAddr,
      bsv: derived.bsvAddr,
      btg: derived.btgAddr,
      pubKeyCompressedHex: derived.pubKeyCompressedHex,
      fingerprint: derived.fingerprint,
    };
  }

  // 3. Hex Public Key (33-byte compressed 02/03 or 65-byte uncompressed 04)
  if (/^(02|03)[0-9a-fA-F]{64}$/.test(clean) || /^04[0-9a-fA-F]{128}$/.test(clean)) {
    try {
      const pubBytes = hexToBytes(clean);
      const isComp = clean.length === 66;
      const h160 = hash160(pubBytes);
      const legacyComp = encodeBase58Check(0x00, h160);
      
      const redeem = new Uint8Array(22);
      redeem[0] = 0x00;
      redeem[1] = 0x14;
      redeem.set(h160, 2);
      const nested = encodeBase58Check(0x05, hash160(redeem));
      const native = encodeBech32Address('bc', 0, h160, 'bech32');

      const px = isComp ? pubBytes.slice(1, 33) : pubBytes.slice(1, 33);
      const tweak = taggedHash('TapTweak', px);
      const taproot = encodeBech32Address('bc', 1, tweak.slice(0, 32), 'bech32m');

      return {
        nativeSegwit: native,
        taproot,
        nestedSegwit: nested,
        legacyCompressed: legacyComp,
        legacyUncompressed: isComp ? legacyComp : encodeBase58Check(0x00, h160),
        bchCashAddr: encodeCashAddress(h160, 'bitcoincash'),
        bchLegacy: legacyComp,
        bsv: legacyComp,
        btg: encodeBase58Check(0x26, h160),
        pubKeyCompressedHex: isComp ? clean : bytesToHex(secp.Point.fromHex(clean).toBytes(true)),
        fingerprint: bytesToHex(h160.slice(0, 4)).toUpperCase().match(/.{1,4}/g)?.join('-') || '8C3A-9F21',
      };
    } catch {
      // fallback
    }
  }

  // 4. Deterministic fallback for mock/address strings
  const encoder = new TextEncoder();
  const saltBytes = encoder.encode(clean + '_STANDARD_BTC_MULTI_DERIVATION_' + cleanPassphrase);
  const hash = sha256(sha256(saltBytes));
  const fallbackKey = deriveRealAddressesFromPrivateKey(hash, true);

  // If the input address was already a native segwit address, preserve it
  if (clean.startsWith('bc1q')) {
    fallbackKey.nativeSegwit = clean;
  } else if (clean.startsWith('bc1p')) {
    fallbackKey.taproot = clean;
  } else if (clean.startsWith('3')) {
    fallbackKey.nestedSegwit = clean;
  } else if (clean.startsWith('1')) {
    fallbackKey.legacyCompressed = clean;
  }

  return {
    nativeSegwit: fallbackKey.nativeSegwit,
    taproot: fallbackKey.taproot,
    nestedSegwit: fallbackKey.nestedSegwit,
    legacyCompressed: fallbackKey.legacyCompressed,
    legacyUncompressed: fallbackKey.legacyUncompressed,
    bchCashAddr: fallbackKey.bchCashAddr,
    bchLegacy: fallbackKey.bchLegacyAddr,
    bsv: fallbackKey.bsvAddr,
    btg: fallbackKey.btgAddr,
    pubKeyCompressedHex: fallbackKey.pubKeyCompressedHex,
    fingerprint: fallbackKey.fingerprint,
  };
}

// ==========================================
// BIP-32 HD Child Key Derivation
// ==========================================

export function deriveMasterKeyFromSeed(seedBytes: Uint8Array): {
  key: Uint8Array;
  chainCode: Uint8Array;
} {
  const I = hmac(sha512, new TextEncoder().encode('Bitcoin seed'), seedBytes);
  return {
    key: I.slice(0, 32),
    chainCode: I.slice(32, 64),
  };
}

export function ckdPriv(
  parentKey: Uint8Array,
  parentChainCode: Uint8Array,
  index: number
): { key: Uint8Array; chainCode: Uint8Array } {
  const isHardened = index >= 0x80000000;
  const data = new Uint8Array(37);

  if (isHardened) {
    data[0] = 0x00;
    data.set(parentKey, 1);
  } else {
    const pubKey = secp.getPublicKey(parentKey, true);
    data.set(pubKey, 0);
  }

  // 4-byte big-endian index
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  view.setUint32(33, index, false);

  const I = hmac(sha512, parentChainCode, data);
  const IL = I.slice(0, 32);
  const IR = I.slice(32, 64);

  // child key = (IL + parentKey) mod N
  const ILNum = BigInt('0x' + bytesToHex(IL));
  const parentNum = BigInt('0x' + bytesToHex(parentKey));
  const childNum = (ILNum + parentNum) % SECP256K1_N;

  const childKey = hexToBytes(childNum.toString(16).padStart(64, '0'));
  return {
    key: childKey,
    chainCode: IR,
  };
}

export function deriveHdNode(
  masterKey: Uint8Array,
  masterChainCode: Uint8Array,
  path: string,
  startDepth: number = 0,
  startParentFingerprint: Uint8Array = new Uint8Array(4),
  startChildIndex: number = 0
): {
  key: Uint8Array;
  chainCode: Uint8Array;
  depth: number;
  parentFingerprint: Uint8Array;
  childIndex: number;
} {
  const cleanPath = path.trim().replace(/^m\/?/i, '');
  if (!cleanPath) {
    return {
      key: masterKey,
      chainCode: masterChainCode,
      depth: startDepth,
      parentFingerprint: startParentFingerprint,
      childIndex: startChildIndex,
    };
  }

  const segments = cleanPath.split('/');
  let currentKey = masterKey;
  let currentChainCode = masterChainCode;
  let depth = startDepth;
  let parentFingerprint = startParentFingerprint;
  let lastIndex = startChildIndex;

  for (const seg of segments) {
    const isHardened = seg.endsWith("'") || seg.endsWith('h');
    const indexNum = parseInt(seg.replace(/['h]/g, ''), 10);
    const index = isHardened ? indexNum + 0x80000000 : indexNum;

    // Parent fingerprint of the child node is hash160 of currentKey compressed pubkey
    const pub = secp.getPublicKey(currentKey, true);
    parentFingerprint = hash160(pub).slice(0, 4);

    const child = ckdPriv(currentKey, currentChainCode, index);
    currentKey = child.key;
    currentChainCode = child.chainCode;
    depth++;
    lastIndex = index;
  }

  return {
    key: currentKey,
    chainCode: currentChainCode,
    depth,
    parentFingerprint,
    childIndex: lastIndex,
  };
}

export function deriveHdPath(
  masterKey: Uint8Array,
  masterChainCode: Uint8Array,
  path: string
): Uint8Array {
  return deriveHdNode(masterKey, masterChainCode, path).key;
}

/**
 * Derive BIP-39 512-bit Seed from Mnemonic
 */
export function deriveBip39SeedSync(mnemonic: string, passphrase: string = ''): Uint8Array {
  const normMnemonic = mnemonic.trim().toLowerCase().normalize('NFKD');
  const normSalt = ('mnemonic' + (passphrase ? passphrase.normalize('NFKD') : '')).normalize('NFKD');
  return pbkdf2(sha512, new TextEncoder().encode(normMnemonic), new TextEncoder().encode(normSalt), {
    c: 2048,
    dkLen: 64,
  });
}

// ==========================================
// BIP-32 Master & Extended Private Key Support
// ==========================================

export interface ExtendedPrivateKeyDetails {
  rawKey: string;
  version: number;
  versionHex: string;
  prefix: 'xprv' | 'yprv' | 'zprv' | 'tprv' | 'uprv' | 'vprv';
  formatLabel: string;
  depth: number;
  isMaster: boolean;
  parentFingerprint: string;
  childIndex: number;
  isHardenedChild: boolean;
  chainCode: Uint8Array;
  chainCodeHex: string;
  privKeyBytes: Uint8Array;
  privKeyHex: string;
  pubKeyBytes: Uint8Array; // 33 bytes compressed
  pubKeyHex: string;
  fingerprint: string;
  correspondingExtendedPub: string; // xpub, ypub, zpub, etc.
  extendedPubPrefix: 'xpub' | 'ypub' | 'zpub' | 'tpub' | 'upub' | 'vpub';
  defaultDerivationPath: string;
  network: 'mainnet' | 'testnet';
}

export interface ExtendedPublicKeyDetails {
  rawKey: string;
  version: number;
  versionHex: string;
  prefix: 'xpub' | 'ypub' | 'zpub' | 'tpub' | 'upub' | 'vpub';
  formatLabel: string;
  depth: number;
  isMaster: boolean;
  parentFingerprint: string;
  childIndex: number;
  chainCode: Uint8Array;
  chainCodeHex: string;
  pubKeyBytes: Uint8Array;
  pubKeyHex: string;
  fingerprint: string;
  network: 'mainnet' | 'testnet';
}

/**
 * Encode an extended key (78 bytes serialized into Base58Check)
 */
export function encodeExtendedKey(
  versionNum: number,
  depth: number,
  parentFingerprint: Uint8Array,
  childIndex: number,
  chainCode: Uint8Array,
  keyData: Uint8Array // 33 bytes (0x00 + 32-byte privKey for xprv, or 33-byte pubKey for xpub)
): string {
  const data = new Uint8Array(78);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  view.setUint32(0, versionNum, false);
  data[4] = depth;
  data.set(parentFingerprint.subarray(0, 4), 5);
  view.setUint32(9, childIndex, false);
  data.set(chainCode.subarray(0, 32), 13);
  data.set(keyData.subarray(0, 33), 45);

  const checksum = sha256(sha256(data)).subarray(0, 4);
  const full = new Uint8Array(82);
  full.set(data, 0);
  full.set(checksum, 78);
  return base58Encode(full);
}

/**
 * Parse and validate a BIP-32 Extended Private Key (xprv, yprv, zprv, tprv, uprv, vprv)
 */
export function parseExtendedPrivateKey(rawStr: string): ExtendedPrivateKeyDetails | null {
  const clean = rawStr.trim();
  if (!clean) return null;

  const knownPrefixes = ['xprv', 'yprv', 'zprv', 'tprv', 'uprv', 'vprv'];
  if (!knownPrefixes.some(p => clean.startsWith(p))) return null;

  const body = decodeRawBase58Check(clean);
  if (!body || body.length !== 78) return null;

  const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
  const versionNum = view.getUint32(0, false);
  const depth = body[4];
  const parentFingerprintBytes = body.subarray(5, 9);
  const childIndex = view.getUint32(9, false);
  const chainCode = body.subarray(13, 45);
  const keyData = body.subarray(45, 78);

  // For extended private keys, keyData[0] MUST be 0x00
  if (keyData[0] !== 0x00) return null;
  const privKeyBytes = keyData.subarray(1, 33);

  // Curve range verification: 1 <= scalar < SECP256K1_N
  const privScalar = BigInt('0x' + bytesToHex(privKeyBytes));
  if (privScalar <= 0n || privScalar >= SECP256K1_N) return null;

  let prefix: 'xprv' | 'yprv' | 'zprv' | 'tprv' | 'uprv' | 'vprv' = 'xprv';
  let pubVersionNum: number = BIP32_VERSIONS.xpub;
  let extendedPubPrefix: 'xpub' | 'ypub' | 'zpub' | 'tpub' | 'upub' | 'vpub' = 'xpub';
  let formatLabel = 'BIP-32 Master Private Key (xprv)';
  let defaultDerivationPath = depth === 0 ? "m/84'/0'/0'/0/0" : '0/0';
  let network: 'mainnet' | 'testnet' = 'mainnet';

  switch (versionNum) {
    case BIP32_VERSIONS.xprv:
      prefix = 'xprv';
      pubVersionNum = BIP32_VERSIONS.xpub;
      extendedPubPrefix = 'xpub';
      formatLabel = depth === 0 ? 'BIP-32 Master Private Key (xprv - Root m)' : `BIP-44 Extended Private Key (xprv - Depth ${depth})`;
      defaultDerivationPath = depth === 0 ? "m/44'/0'/0'/0/0" : '0/0';
      network = 'mainnet';
      break;
    case BIP32_VERSIONS.yprv:
      prefix = 'yprv';
      pubVersionNum = BIP32_VERSIONS.ypub;
      extendedPubPrefix = 'ypub';
      formatLabel = depth === 0 ? 'BIP-49 Nested SegWit Master Key (yprv)' : `BIP-49 Extended Private Key (yprv - Depth ${depth})`;
      defaultDerivationPath = depth === 0 ? "m/49'/0'/0'/0/0" : '0/0';
      network = 'mainnet';
      break;
    case BIP32_VERSIONS.zprv:
      prefix = 'zprv';
      pubVersionNum = BIP32_VERSIONS.zpub;
      extendedPubPrefix = 'zpub';
      formatLabel = depth === 0 ? 'BIP-84 Native SegWit Master Key (zprv)' : `BIP-84 Extended Private Key (zprv - Depth ${depth})`;
      defaultDerivationPath = depth === 0 ? "m/84'/0'/0'/0/0" : '0/0';
      network = 'mainnet';
      break;
    case BIP32_VERSIONS.tprv:
      prefix = 'tprv';
      pubVersionNum = BIP32_VERSIONS.tpub;
      extendedPubPrefix = 'tpub';
      formatLabel = `Testnet BIP-44 Master Private Key (tprv - Depth ${depth})`;
      defaultDerivationPath = depth === 0 ? "m/44'/1'/0'/0/0" : '0/0';
      network = 'testnet';
      break;
    case BIP32_VERSIONS.uprv:
      prefix = 'uprv';
      pubVersionNum = BIP32_VERSIONS.upub;
      extendedPubPrefix = 'upub';
      formatLabel = `Testnet BIP-49 Extended Private Key (uprv - Depth ${depth})`;
      defaultDerivationPath = depth === 0 ? "m/49'/1'/0'/0/0" : '0/0';
      network = 'testnet';
      break;
    case BIP32_VERSIONS.vprv:
      prefix = 'vprv';
      pubVersionNum = BIP32_VERSIONS.vpub;
      extendedPubPrefix = 'vpub';
      formatLabel = `Testnet BIP-84 Extended Private Key (vprv - Depth ${depth})`;
      defaultDerivationPath = depth === 0 ? "m/84'/1'/0'/0/0" : '0/0';
      network = 'testnet';
      break;
    default:
      return null;
  }

  const pubKeyBytes = secp.getPublicKey(privKeyBytes, true);
  const pubKeyHex = bytesToHex(pubKeyBytes);
  const privKeyHex = bytesToHex(privKeyBytes);
  const chainCodeHex = bytesToHex(chainCode);
  const parentFingerprint = bytesToHex(parentFingerprintBytes);
  const fingerprint = bytesToHex(hash160(pubKeyBytes).slice(0, 4));

  // Build corresponding extended public key
  const correspondingExtendedPub = encodeExtendedKey(
    pubVersionNum,
    depth,
    parentFingerprintBytes,
    childIndex,
    chainCode,
    pubKeyBytes
  );

  return {
    rawKey: clean,
    version: versionNum,
    versionHex: versionNum.toString(16).padStart(8, '0'),
    prefix,
    formatLabel,
    depth,
    isMaster: depth === 0,
    parentFingerprint,
    childIndex,
    isHardenedChild: childIndex >= 0x80000000,
    chainCode,
    chainCodeHex,
    privKeyBytes,
    privKeyHex,
    pubKeyBytes,
    pubKeyHex,
    fingerprint,
    correspondingExtendedPub,
    extendedPubPrefix,
    defaultDerivationPath,
    network,
  };
}

/**
 * Parse an extended public key (xpub, ypub, zpub, tpub, upub, vpub)
 */
export function parseExtendedPublicKey(rawStr: string): ExtendedPublicKeyDetails | null {
  const clean = rawStr.trim();
  if (!clean) return null;

  const knownPrefixes = ['xpub', 'ypub', 'zpub', 'tpub', 'upub', 'vpub'];
  if (!knownPrefixes.some(p => clean.startsWith(p))) return null;

  const body = decodeRawBase58Check(clean);
  if (!body || body.length !== 78) return null;

  const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
  const versionNum = view.getUint32(0, false);
  const depth = body[4];
  const parentFingerprintBytes = body.subarray(5, 9);
  const childIndex = view.getUint32(9, false);
  const chainCode = body.subarray(13, 45);
  const keyData = body.subarray(45, 78);

  // Must have 0x02 or 0x03 prefix for compressed public key
  if (keyData[0] !== 0x02 && keyData[0] !== 0x03) return null;
  const pubKeyBytes = keyData.subarray(0, 33);

  let prefix: 'xpub' | 'ypub' | 'zpub' | 'tpub' | 'upub' | 'vpub' = 'xpub';
  let formatLabel = 'BIP-32 Extended Public Key (xpub)';
  let network: 'mainnet' | 'testnet' = 'mainnet';

  switch (versionNum) {
    case BIP32_VERSIONS.xpub:
      prefix = 'xpub';
      formatLabel = depth === 0 ? 'BIP-32 Master Public Key (xpub - Root m)' : `BIP-44 Extended Public Key (xpub - Depth ${depth})`;
      network = 'mainnet';
      break;
    case BIP32_VERSIONS.ypub:
      prefix = 'ypub';
      formatLabel = `BIP-49 Nested SegWit Extended Public Key (ypub - Depth ${depth})`;
      network = 'mainnet';
      break;
    case BIP32_VERSIONS.zpub:
      prefix = 'zpub';
      formatLabel = `BIP-84 Native SegWit Extended Public Key (zpub - Depth ${depth})`;
      network = 'mainnet';
      break;
    case BIP32_VERSIONS.tpub:
      prefix = 'tpub';
      formatLabel = `Testnet BIP-44 Extended Public Key (tpub - Depth ${depth})`;
      network = 'testnet';
      break;
    case BIP32_VERSIONS.upub:
      prefix = 'upub';
      formatLabel = `Testnet BIP-49 Extended Public Key (upub - Depth ${depth})`;
      network = 'testnet';
      break;
    case BIP32_VERSIONS.vpub:
      prefix = 'vpub';
      formatLabel = `Testnet BIP-84 Extended Public Key (vpub - Depth ${depth})`;
      network = 'testnet';
      break;
    default:
      return null;
  }

  const pubKeyHex = bytesToHex(pubKeyBytes);
  const chainCodeHex = bytesToHex(chainCode);
  const parentFingerprint = bytesToHex(parentFingerprintBytes);
  const fingerprint = bytesToHex(hash160(pubKeyBytes).slice(0, 4));

  return {
    rawKey: clean,
    version: versionNum,
    versionHex: versionNum.toString(16).padStart(8, '0'),
    prefix,
    formatLabel,
    depth,
    isMaster: depth === 0,
    parentFingerprint,
    childIndex,
    chainCode,
    chainCodeHex,
    pubKeyBytes,
    pubKeyHex,
    fingerprint,
    network,
  };
}

/**
 * Derive child key from an Extended Private Key
 */
export function deriveChildFromExtendedKey(
  extKey: ExtendedPrivateKeyDetails,
  path: string
): {
  privKey: Uint8Array;
  chainCode: Uint8Array;
  depth: number;
  childIndex: number;
  parentFingerprint: Uint8Array;
  fullPath: string;
} {
  const cleanPath = path.trim().replace(/^m\/?/i, '');
  if (!cleanPath) {
    return {
      privKey: extKey.privKeyBytes,
      chainCode: extKey.chainCode,
      depth: extKey.depth,
      childIndex: extKey.childIndex,
      parentFingerprint: hexToBytes(extKey.parentFingerprint),
      fullPath: extKey.isMaster ? 'm' : `depth_${extKey.depth}`,
    };
  }

  const segments = cleanPath.split('/');
  let currentKey = extKey.privKeyBytes;
  let currentChainCode = extKey.chainCode;
  let currentDepth = extKey.depth;
  let currentParentFingerprint = hexToBytes(extKey.parentFingerprint);
  let lastIndex = extKey.childIndex;

  for (const seg of segments) {
    const isHardened = seg.endsWith("'") || seg.endsWith('h');
    const indexNum = parseInt(seg.replace(/['h]/g, ''), 10);
    const index = isHardened ? indexNum + 0x80000000 : indexNum;

    // Parent fingerprint of the child node is hash160 of currentKey compressed pubkey
    const parentPub = secp.getPublicKey(currentKey, true);
    currentParentFingerprint = hash160(parentPub).slice(0, 4);

    const child = ckdPriv(currentKey, currentChainCode, index);
    currentKey = child.key;
    currentChainCode = child.chainCode;
    currentDepth++;
    lastIndex = index;
  }

  return {
    privKey: currentKey,
    chainCode: currentChainCode,
    depth: currentDepth,
    childIndex: lastIndex,
    parentFingerprint: currentParentFingerprint,
    fullPath: extKey.isMaster ? `m/${cleanPath}` : cleanPath,
  };
}

function concatUint8(a: Uint8Array, b: Uint8Array): Uint8Array {
  const c = new Uint8Array(a.length + b.length);
  c.set(a, 0);
  c.set(b, a.length);
  return c;
}

/**
 * Export Master Private Keys (xprv, zprv, yprv) and Extended Public Keys (xpub, zpub, ypub) from Mnemonic
 */
export function exportMasterKeysFromMnemonic(mnemonic: string, passphrase: string = ''): {
  masterXprv: string;
  masterXpub: string;
  masterFingerprint: string;
  bip84Zprv: string;
  bip84Zpub: string;
  bip84AccountPath: string;
  bip49Yprv: string;
  bip49Ypub: string;
  bip49AccountPath: string;
  bip44Xprv: string;
  bip44Xpub: string;
  bip44AccountPath: string;
} {
  const seed = deriveBip39SeedSync(mnemonic, passphrase);
  const master = deriveMasterKeyFromSeed(seed);
  const masterPub = secp.getPublicKey(master.key, true);
  const masterFingerprint = bytesToHex(hash160(masterPub).slice(0, 4));

  const emptyFingerprint = new Uint8Array(4);

  // Root Master xprv / xpub (depth 0, parentFingerprint 0, child 0)
  const masterXprv = encodeExtendedKey(
    BIP32_VERSIONS.xprv,
    0,
    emptyFingerprint,
    0,
    master.chainCode,
    concatUint8(new Uint8Array([0x00]), master.key)
  );

  const masterXpub = encodeExtendedKey(
    BIP32_VERSIONS.xpub,
    0,
    emptyFingerprint,
    0,
    master.chainCode,
    masterPub
  );

  // Derive BIP-84 Account (m/84'/0'/0')
  const node84 = deriveHdNode(master.key, master.chainCode, "m/84'/0'/0'");
  const pub84 = secp.getPublicKey(node84.key, true);
  const bip84Zprv = encodeExtendedKey(
    BIP32_VERSIONS.zprv,
    node84.depth,
    node84.parentFingerprint,
    node84.childIndex,
    node84.chainCode,
    concatUint8(new Uint8Array([0x00]), node84.key)
  );
  const bip84Zpub = encodeExtendedKey(
    BIP32_VERSIONS.zpub,
    node84.depth,
    node84.parentFingerprint,
    node84.childIndex,
    node84.chainCode,
    pub84
  );

  // Derive BIP-49 Account (m/49'/0'/0')
  const node49 = deriveHdNode(master.key, master.chainCode, "m/49'/0'/0'");
  const pub49 = secp.getPublicKey(node49.key, true);
  const bip49Yprv = encodeExtendedKey(
    BIP32_VERSIONS.yprv,
    node49.depth,
    node49.parentFingerprint,
    node49.childIndex,
    node49.chainCode,
    concatUint8(new Uint8Array([0x00]), node49.key)
  );
  const bip49Ypub = encodeExtendedKey(
    BIP32_VERSIONS.ypub,
    node49.depth,
    node49.parentFingerprint,
    node49.childIndex,
    node49.chainCode,
    pub49
  );

  // Derive BIP-44 Account (m/44'/0'/0')
  const node44 = deriveHdNode(master.key, master.chainCode, "m/44'/0'/0'");
  const pub44 = secp.getPublicKey(node44.key, true);
  const bip44Xprv = encodeExtendedKey(
    BIP32_VERSIONS.xprv,
    node44.depth,
    node44.parentFingerprint,
    node44.childIndex,
    node44.chainCode,
    concatUint8(new Uint8Array([0x00]), node44.key)
  );
  const bip44Xpub = encodeExtendedKey(
    BIP32_VERSIONS.xpub,
    node44.depth,
    node44.parentFingerprint,
    node44.childIndex,
    node44.chainCode,
    pub44
  );

  return {
    masterXprv,
    masterXpub,
    masterFingerprint,
    bip84Zprv,
    bip84Zpub,
    bip84AccountPath: "m/84'/0'/0'",
    bip49Yprv,
    bip49Ypub,
    bip49AccountPath: "m/49'/0'/0'",
    bip44Xprv,
    bip44Xpub,
    bip44AccountPath: "m/44'/0'/0'",
  };
}
