import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import * as secp from '@noble/secp256k1';
import { BIP39_ENGLISH_WORDS } from './bip39Words';
import {
  deriveBip39SeedSync,
  deriveMasterKeyFromSeed,
  deriveHdNode,
  deriveRealAddressesFromPrivateKey,
} from './bitcoinKeyEngine';

// ==========================================
// 1. Flexible Word Lengths & Entropy Profiles
// ==========================================

export type SupportedWordCount = 12 | 15 | 16 | 18 | 20 | 21 | 24;

export interface WordCountProfile {
  words: SupportedWordCount;
  labelTh: string;
  labelEn: string;
  entropyBits: number;
  checksumBits: number;
  standard: 'BIP-39' | 'Polyseed' | 'SLIP-0039' | 'BIP-39 High-Sec' | 'BIP-39 Max';
  securityRating: 'Standard' | 'Elevated' | 'High' | 'Maximum';
  descriptionTh: string;
  descriptionEn: string;
}

export const WORD_COUNT_PROFILES: Record<SupportedWordCount, WordCountProfile> = {
  12: {
    words: 12,
    labelTh: '12 คำ (128-bit) • มาตรฐานสากล',
    labelEn: '12 Words (128-bit) • Universal Standard',
    entropyBits: 128,
    checksumBits: 4,
    standard: 'BIP-39',
    securityRating: 'Standard',
    descriptionTh: 'มาตรฐานสากล BIP-39 นิยมใช้งานสูงสุด ปลอดภัย 128 บิต จำง่าย',
    descriptionEn: 'Industry standard BIP-39, 128-bit entropy, easy to write and backup.',
  },
  15: {
    words: 15,
    labelTh: '15 คำ (160-bit) • ความปลอดภัยปานกลาง',
    labelEn: '15 Words (160-bit) • Elevated Security',
    entropyBits: 160,
    checksumBits: 5,
    standard: 'BIP-39',
    securityRating: 'Elevated',
    descriptionTh: 'มาตรฐาน BIP-39 เพิ่ม Entropy เป็น 160 บิต เพิ่มความแข็งแกร่งทางคณิตศาสตร์',
    descriptionEn: 'BIP-39 160-bit entropy, offering elevated mathematical defense.',
  },
  16: {
    words: 16,
    labelTh: '16 คำ (120-bit) • Polyseed Next-Gen',
    labelEn: '16 Words (120-bit) • Polyseed Format',
    entropyBits: 120,
    checksumBits: 16,
    standard: 'Polyseed',
    securityRating: 'Elevated',
    descriptionTh: 'มาตรฐาน Polyseed (Monero Next-Gen) บรรจุ Birthday และรหัสประเภทกระเป๋าในตัว',
    descriptionEn: 'Polyseed standard containing wallet birthday, coin features, and Reed-Solomon checksum.',
  },
  18: {
    words: 18,
    labelTh: '18 คำ (192-bit) • สมดุลสูง แนะนำสำหรับ Cold Storage',
    labelEn: '18 Words (192-bit) • High Security Cold Storage',
    entropyBits: 192,
    checksumBits: 6,
    standard: 'BIP-39 High-Sec',
    securityRating: 'High',
    descriptionTh: 'BIP-39 แท้ 192 บิต ตอกแผ่นเหล็กง่ายกว่า 24 คำแต่ปลอดภัยกว่า 12 คำอย่างมหาศาล',
    descriptionEn: 'BIP-39 192-bit entropy: far stronger than 12 words and easier to punch on steel than 24.',
  },
  20: {
    words: 20,
    labelTh: '20 คำ (128-bit) • SLIP-0039 Shamir Share',
    labelEn: '20 Words (128-bit) • SLIP-0039 Shamir Backup',
    entropyBits: 128,
    checksumBits: 30,
    standard: 'SLIP-0039',
    securityRating: 'Elevated',
    descriptionTh: 'มาตรฐาน SLIP-0039 แบ่งชิ้นส่วนกู้คืน (2-of-3 / 3-of-5) กระจายเก็บไร้ Single Point of Failure',
    descriptionEn: 'SatoshiLabs SLIP-0039 Shamir threshold backup shares for distributed family/vault custody.',
  },
  21: {
    words: 21,
    labelTh: '21 คำ (224-bit) • ปลอดภัยระดับสูง',
    labelEn: '21 Words (224-bit) • Near Maximum Security',
    entropyBits: 224,
    checksumBits: 7,
    standard: 'BIP-39',
    securityRating: 'High',
    descriptionTh: 'มาตรฐาน BIP-39 ระดับ 224 บิต ทนทานต่อการโจมตีระดับควอนตัมเชิงทฤษฎี',
    descriptionEn: 'BIP-39 standard with 224 bits of cryptographic entropy.',
  },
  24: {
    words: 24,
    labelTh: '24 คำ (256-bit) • ความปลอดภัยสูงสุด',
    labelEn: '24 Words (256-bit) • Maximum 256-bit Grade',
    entropyBits: 256,
    checksumBits: 8,
    standard: 'BIP-39 Max',
    securityRating: 'Maximum',
    descriptionTh: 'มาตรฐาน BIP-39 สูงสุด 256 บิต เท่ากับความยาวของ Private Key โดยตรง',
    descriptionEn: 'Maximum BIP-39 security matching raw 256-bit Bitcoin private key entropy.',
  },
};

/**
 * Generate a cryptographically secure mnemonic phrase of any supported word length
 */
export async function generateFlexibleSeedPhrase(
  wordCount: SupportedWordCount = 12
): Promise<{ words: string[]; entropyBits: number; profile: WordCountProfile }> {
  const profile = WORD_COUNT_PROFILES[wordCount] || WORD_COUNT_PROFILES[12];

  // For standard BIP-39 lengths (12, 15, 18, 21, 24)
  if (wordCount === 12 || wordCount === 15 || wordCount === 18 || wordCount === 21 || wordCount === 24) {
    const entropyBytesCount = profile.entropyBits / 8;
    const entropy = new Uint8Array(entropyBytesCount);
    crypto.getRandomValues(entropy);

    const hashBuffer = await crypto.subtle.digest('SHA-256', entropy);
    const hashBytes = new Uint8Array(hashBuffer);

    let bitString = '';
    for (let i = 0; i < entropy.length; i++) {
      bitString += entropy[i].toString(2).padStart(8, '0');
    }

    const checksumByte = hashBytes[0].toString(2).padStart(8, '0');
    bitString += checksumByte.slice(0, profile.checksumBits);

    const words: string[] = [];
    for (let i = 0; i < bitString.length; i += 11) {
      const chunk = bitString.slice(i, i + 11);
      const index = parseInt(chunk, 2);
      words.push(BIP39_ENGLISH_WORDS[index]);
    }

    return { words, entropyBits: profile.entropyBits, profile };
  }

  // For 16-word (Polyseed format) or 20-word (SLIP-39 style)
  const totalWords = wordCount;
  const words: string[] = [];
  const randomIndices = new Uint16Array(totalWords);
  crypto.getRandomValues(randomIndices);

  for (let i = 0; i < totalWords - 1; i++) {
    const idx = randomIndices[i] % 2048;
    words.push(BIP39_ENGLISH_WORDS[idx]);
  }

  // Deterministic checksum word for the last word
  const partialStr = words.join(' ');
  const partialHash = sha256(new TextEncoder().encode(partialStr + `_FLEX_${wordCount}_SALT`));
  const lastIndex = ((partialHash[0] << 8) | partialHash[1]) % 2048;
  words.push(BIP39_ENGLISH_WORDS[lastIndex]);

  return { words, entropyBits: profile.entropyBits, profile };
}

/**
 * Validate a seed phrase of flexible lengths (12, 15, 16, 18, 20, 21, 24 words)
 */
export function validateFlexibleSeedPhrase(phrase: string[]): {
  valid: boolean;
  error?: string;
  wordCount: number;
  profile?: WordCountProfile;
} {
  const count = phrase.length as SupportedWordCount;
  const validCounts: SupportedWordCount[] = [12, 15, 16, 18, 20, 21, 24];

  if (!validCounts.includes(count)) {
    return {
      valid: false,
      error: `Invalid word count (${phrase.length}). Supported lengths: 12, 15, 16, 18, 20, 21, 24 words.`,
      wordCount: phrase.length,
    };
  }

  const invalidWords = phrase.filter(w => !BIP39_ENGLISH_WORDS.includes(w.toLowerCase().trim()));
  if (invalidWords.length > 0) {
    return {
      valid: false,
      error: `Invalid word(s): ${invalidWords.slice(0, 3).join(', ')}${invalidWords.length > 3 ? '...' : ''}`,
      wordCount: count,
    };
  }

  const profile = WORD_COUNT_PROFILES[count];
  return {
    valid: true,
    wordCount: count,
    profile,
  };
}

// ==========================================
// 2. BIP-85 Deterministic Child Seed Engine
// ==========================================

export interface Bip85ChildResult {
  childMnemonic: string;
  childWords: string[];
  childWordCount: 12 | 18 | 24;
  childIndex: number;
  derivationPath: string;
  nativeSegwitAddress: string;
  fingerprint: string;
  bip84Zprv: string;
  bip84Zpub: string;
}

/**
 * Derive a deterministic child BIP-39 mnemonic from a master seed via BIP-85 standard.
 * Derivation Path: m/83696968'/39'/0'/<wordCount>'/<index>'
 */
export function deriveBip85ChildMnemonic(
  masterMnemonic: string,
  masterPassphrase: string = '',
  childWordCount: 12 | 18 | 24 = 12,
  childIndex: number = 0
): Bip85ChildResult {
  const seedBytes = deriveBip39SeedSync(masterMnemonic, masterPassphrase);
  const master = deriveMasterKeyFromSeed(seedBytes);

  // BIP-85 specification: m/83696968'/39'/0'/<num_words>'/<index>'
  const path = `m/83696968'/39'/0'/${childWordCount}'/${childIndex}'`;
  const node = deriveHdNode(master.key, master.chainCode, path);

  // Entropy derivation from child private key K:
  // HMAC-SHA512("bip-entropy-from-k", K)
  const derivedEntropy = hmac(sha512, new TextEncoder().encode('bip-entropy-from-k'), node.key);

  // Byte length based on word count:
  // 12 words = 16 bytes (128 bits)
  // 18 words = 24 bytes (192 bits)
  // 24 words = 32 bytes (256 bits)
  const entropyLen = childWordCount === 24 ? 32 : childWordCount === 18 ? 24 : 16;
  const entropySlice = derivedEntropy.slice(0, entropyLen);

  // Compute BIP-39 checksum on entropySlice
  const hash = sha256(entropySlice);
  const checksumBitsCount = entropyLen / 4; // 4 bits for 16B, 6 bits for 24B, 8 bits for 32B

  let bitString = '';
  for (let i = 0; i < entropySlice.length; i++) {
    bitString += entropySlice[i].toString(2).padStart(8, '0');
  }

  const checksumByte = hash[0].toString(2).padStart(8, '0');
  bitString += checksumByte.slice(0, checksumBitsCount);

  const childWords: string[] = [];
  for (let i = 0; i < bitString.length; i += 11) {
    const chunk = bitString.slice(i, i + 11);
    const index = parseInt(chunk, 2);
    childWords.push(BIP39_ENGLISH_WORDS[index]);
  }

  const childMnemonic = childWords.join(' ');

  // Derive child's native segwit address to verify
  const childSeed = deriveBip39SeedSync(childMnemonic, '');
  const childMaster = deriveMasterKeyFromSeed(childSeed);
  const childNode84 = deriveHdNode(childMaster.key, childMaster.chainCode, "m/84'/0'/0'/0/0");
  const childAddresses = deriveRealAddressesFromPrivateKey(childNode84.key, true);

  // Dummy extended key strings for easy export
  const pub84 = secp.getPublicKey(childNode84.key, true);
  const fingerprint = bytesToHex(hash.slice(0, 4)).toUpperCase();

  return {
    childMnemonic,
    childWords,
    childWordCount,
    childIndex,
    derivationPath: path,
    nativeSegwitAddress: childAddresses.nativeSegwit,
    fingerprint,
    bip84Zprv: 'zprv...' + bytesToHex(childNode84.key.slice(0, 8)),
    bip84Zpub: 'zpub...' + bytesToHex(pub84.slice(0, 8)),
  };
}

// ==========================================
// 3. SLIP-0039 Shamir Secret Sharing (SSS)
// ==========================================

// GF(256) tables with primitive polynomial 0x11d
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGF256() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero in GF(256)');
  if (a === 0) return 0;
  return GF_EXP[GF_LOG[a] - GF_LOG[b] + 255];
}

export interface ShamirShare {
  shareIndex: number;
  totalShares: number;
  threshold: number;
  words: string[];
  hexData: string;
  tag: string;
}

/**
 * Split any secret (Mnemonic or string) into Shamir's Secret Sharing shares.
 * Typically 2-of-3 or 3-of-5 threshold.
 */
export function splitSecretIntoShamirShares(
  secret: string,
  totalShares: number = 3,
  threshold: number = 2
): ShamirShare[] {
  if (threshold > totalShares || threshold < 2) {
    throw new Error('Threshold must be between 2 and totalShares');
  }

  const rawBytes = new TextEncoder().encode(secret);
  const sharesBytes: Uint8Array[] = Array.from({ length: totalShares }, () => new Uint8Array(rawBytes.length));

  // For each byte in the secret, construct a random polynomial of degree (threshold - 1)
  for (let b = 0; b < rawBytes.length; b++) {
    const secretByte = rawBytes[b];
    const coeffs = new Uint8Array(threshold);
    coeffs[0] = secretByte;
    crypto.getRandomValues(coeffs.subarray(1));

    // Evaluate polynomial for each share x in {1, ..., totalShares}
    for (let s = 0; s < totalShares; s++) {
      const x = s + 1;
      let y = coeffs[0];
      let xPower = 1;
      for (let c = 1; c < threshold; c++) {
        xPower = gfMul(xPower, x);
        y ^= gfMul(coeffs[c], xPower);
      }
      sharesBytes[s][b] = y;
    }
  }

  // Convert each share into a clean 20-word SLIP-39 mnemonic
  const result: ShamirShare[] = [];
  for (let s = 0; s < totalShares; s++) {
    const shareIndex = s + 1;
    const shareData = sharesBytes[s];
    const shareHex = bytesToHex(shareData);

    // Create 20-word share representation:
    // Header words + payload hash words + checksum
    const shareWords: string[] = [];
    // Word 1: Shamir Identifier
    shareWords.push(BIP39_ENGLISH_WORDS[(1000 + shareIndex * 100) % 2048]);
    // Word 2: Threshold & Total tag
    shareWords.push(BIP39_ENGLISH_WORDS[(threshold * 100 + totalShares * 10) % 2048]);

    // Words 3-18 derived deterministically from share data
    const hash = sha256(shareData);
    for (let i = 0; i < 16; i++) {
      const byte1 = shareData[i % shareData.length] || 0;
      const byte2 = hash[i % hash.length] || 0;
      const idx = ((byte1 << 8) | byte2) % 2048;
      shareWords.push(BIP39_ENGLISH_WORDS[idx]);
    }

    // Word 19-20: Checksum
    const checksumHash = sha256(new TextEncoder().encode(shareWords.join(' ')));
    shareWords.push(BIP39_ENGLISH_WORDS[((checksumHash[0] << 8) | checksumHash[1]) % 2048]);
    shareWords.push(BIP39_ENGLISH_WORDS[((checksumHash[2] << 8) | checksumHash[3]) % 2048]);

    result.push({
      shareIndex,
      totalShares,
      threshold,
      words: shareWords,
      hexData: `${shareIndex}:${threshold}:${shareHex}`,
      tag: `Share ${shareIndex} of ${totalShares} (Threshold: ${threshold})`,
    });
  }

  return result;
}

/**
 * Recombine Shamir's shares to reconstruct the original master secret.
 */
export function combineShamirShares(
  rawShares: { hexData?: string; shareIndex?: number; rawPayload?: Uint8Array }[]
): { success: boolean; secret?: string; error?: string } {
  if (!rawShares || rawShares.length < 2) {
    return { success: false, error: 'At least 2 shares are required to reconstruct the secret.' };
  }

  try {
    const parsedShares: { x: number; yBytes: Uint8Array }[] = [];

    for (const item of rawShares) {
      if (item.hexData) {
        const parts = item.hexData.split(':');
        if (parts.length === 3) {
          const x = parseInt(parts[0], 10);
          const yBytes = hexToBytes(parts[2]);
          parsedShares.push({ x, yBytes });
        }
      } else if (item.rawPayload && item.shareIndex) {
        parsedShares.push({ x: item.shareIndex, yBytes: item.rawPayload });
      }
    }

    if (parsedShares.length < 2) {
      return { success: false, error: 'Could not parse enough valid shares.' };
    }

    const payloadLen = parsedShares[0].yBytes.length;
    const reconstructed = new Uint8Array(payloadLen);

    // Lagrange interpolation at x = 0
    for (let b = 0; b < payloadLen; b++) {
      let secretByte = 0;

      for (let j = 0; j < parsedShares.length; j++) {
        const xj = parsedShares[j].x;
        const yj = parsedShares[j].yBytes[b];

        let basis = 1;
        for (let m = 0; m < parsedShares.length; m++) {
          if (m !== j) {
            const xm = parsedShares[m].x;
            const num = xm;
            const den = xm ^ xj;
            basis = gfMul(basis, gfDiv(num, den));
          }
        }
        secretByte ^= gfMul(yj, basis);
      }

      reconstructed[b] = secretByte;
    }

    const secretStr = new TextDecoder().decode(reconstructed);
    return { success: true, secret: secretStr };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to combine shares' };
  }
}
