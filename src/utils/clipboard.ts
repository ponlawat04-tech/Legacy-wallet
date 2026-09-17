/**
 * Clipboard & Key Normalization Utilities
 * Handles safe reading from navigator.clipboard with permissions/iframe fallback,
 * and robust cleaning/normalization for Private Keys and Seed Phrases copied from external sources.
 */

/**
 * Normalizes and extracts key/seed text copied from external sources:
 * - Trims whitespaces & zero-width characters
 * - Strips quotes (", ', `, “)
 * - Strips common prefix labels ("Private Key:", "WIF:", "Secret:", "key:")
 * - Strips URI schemes ("bitcoin:", "wif:")
 * - Strips 0x prefix if 66-hex characters
 * - Extracts valid key if surrounded by multi-line text or comments
 */
export function cleanAndNormalizeKeyString(rawInput: string): string {
  if (!rawInput) return '';
  let clean = rawInput.trim();

  // Strip wrapping quotes or backticks
  clean = clean.replace(/^["'`“‘]+|["'`”’]+$/g, '').trim();

  // Strip URI or label prefixes
  clean = clean.replace(/^(private[\s_-]?key|wif|secret|key|privkey|xpub|zpub|ypub|xpup|zpup|ypup)\s*[:=]\s*/i, '').trim();
  clean = clean.replace(/^(bitcoin|wif|secret|key):\/?\/?/i, '').trim();

  // Strip 0x or 0X from 66-char hex string
  if (/^0x[0-9a-fA-F]{64}$/i.test(clean)) {
    clean = clean.slice(2);
  }

  // Auto-correct common "pup" typo for extended public keys (e.g. xpup -> xpub, zpup -> zpub)
  if (/^xpup/i.test(clean)) {
    clean = 'xpub' + clean.slice(4);
  } else if (/^zpup/i.test(clean)) {
    clean = 'zpub' + clean.slice(4);
  } else if (/^ypup/i.test(clean)) {
    clean = 'ypub' + clean.slice(4);
  } else if (/^tpup/i.test(clean)) {
    clean = 'tpub' + clean.slice(4);
  } else if (/^vpup/i.test(clean)) {
    clean = 'vpub' + clean.slice(4);
  } else if (/^upup/i.test(clean)) {
    clean = 'upub' + clean.slice(4);
  }

  // If multiline or comments, check if any line contains a recognized key
  if (clean.includes('\n')) {
    const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      let sub = line.replace(/^["'`“‘]+|["'`”’]+$/g, '').trim();
      sub = sub.replace(/^(private[\s_-]?key|wif|secret|key|privkey|xpub|zpub|ypub|xpup|zpup|ypup)\s*[:=]\s*/i, '').trim();
      if (/^0x[0-9a-fA-F]{64}$/i.test(sub)) {
        sub = sub.slice(2);
      }
      if (/^xpup/i.test(sub)) sub = 'xpub' + sub.slice(4);
      if (/^zpup/i.test(sub)) sub = 'zpub' + sub.slice(4);
      if (/^ypup/i.test(sub)) sub = 'ypub' + sub.slice(4);

      if (
        ((sub.length === 51 || sub.length === 52) && (sub.startsWith('5') || sub.startsWith('K') || sub.startsWith('L'))) ||
        /^[0-9a-fA-F]{64}$/.test(sub) ||
        /^[xyzuvt]prv/i.test(sub) ||
        /^[xyzuvt]pub/i.test(sub) ||
        (sub.startsWith('S') && (sub.length === 22 || sub.length === 30))
      ) {
        return sub;
      }
    }
  }

  return clean;
}

export interface ParsedSeedOrKey {
  type: 'seed_12' | 'seed_24' | 'key' | 'single_word' | 'unknown';
  words?: string[];
  key?: string;
  word?: string;
  isMasterKey?: boolean;
  isExtendedPublicKey?: boolean;
}

/**
 * Intelligently parse pasted text into either seed words or clean private key
 */
export function parsePastedSeedOrKey(rawInput: string): ParsedSeedOrKey {
  if (!rawInput || !rawInput.trim()) {
    return { type: 'unknown' };
  }

  const raw = rawInput.trim();

  // Strip numbers like "1. abandon 2. ability" or "#1 abandon #2 ability"
  const strippedNumbering = raw.replace(/(?:^|\s)(?:#?\d+[\.:\-\)\s]+)/g, ' ');
  const wordTokens = strippedNumbering
    .split(/[\s,;\n\r]+/)
    .map(w => w.trim().toLowerCase())
    .filter(w => /^[a-z]+$/.test(w));

  if (wordTokens.length === 24) {
    return {
      type: 'seed_24',
      words: wordTokens,
    };
  }

  if (wordTokens.length === 12) {
    return {
      type: 'seed_12',
      words: wordTokens,
    };
  }

  // Check if it is a single word pasted into an individual input box
  if (wordTokens.length === 1 && raw.split(/\s+/).length === 1 && wordTokens[0].length >= 3 && wordTokens[0].length <= 8) {
    return {
      type: 'single_word',
      word: wordTokens[0],
    };
  }

  // Otherwise, treat as private key candidate or extended public key
  const cleanKey = cleanAndNormalizeKeyString(raw);
  const isMasterKey = ['xprv', 'yprv', 'zprv', 'tprv', 'uprv', 'vprv'].some(p => cleanKey.toLowerCase().startsWith(p));
  const isExtendedPublicKey = ['xpub', 'ypub', 'zpub', 'tpub', 'upub', 'vpub'].some(p => cleanKey.toLowerCase().startsWith(p));

  if (cleanKey.length >= 20) {
    return {
      type: 'key',
      key: cleanKey,
      isMasterKey,
      isExtendedPublicKey,
    };
  }

  return {
    type: 'unknown',
    key: cleanKey,
  };
}

/**
 * Safely reads text from navigator.clipboard with error handling for iframe restrictions
 */
export async function readClipboardSafely(): Promise<{ text: string; error?: string }> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        return { text: text.trim() };
      }
    }
  } catch (err: any) {
    console.warn('navigator.clipboard.readText error (permission or iframe):', err);
    return { text: '', error: err?.message || 'Permission denied' };
  }
  return { text: '' };
}
