import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { sha256 } from '@noble/hashes/sha2.js';
import {
  parseExtendedPrivateKey,
  parseAndValidatePrivateKey,
  deriveRealAddressesFromPrivateKey,
  decodeBase58Check,
  base58Encode,
  ExtendedPrivateKeyDetails,
  DerivedBtcAddressSet,
} from './bitcoinKeyEngine';
import {
  validateFlexibleSeedPhrase,
  generateFlexibleSeedPhrase,
  SupportedWordCount,
} from './advancedWalletEngines';
import { BIP39_ENGLISH_WORDS } from './bip39Words';
import { AddressType, WalletAccount } from '../types/wallet';
import { sealZeroExposureVault } from './cryptoVault';

export type RawBackupFormatType =
  | 'bitcoin_core_dump'
  | 'electrum_json'
  | 'sparrow_json'
  | 'output_descriptor'
  | 'csv_key_list'
  | 'mnemonic_dump'
  | 'extended_key'
  | 'coldvault_backup'
  | 'encrypted_backup'
  | 'unknown';

export interface DiscoveredWalletItem {
  id: string;
  sourceType: 'master_seed' | 'extended_key' | 'private_key';
  label: string;
  rawSecret: string; // seed phrase, xprv, or WIF/hex
  passphrase?: string;
  derivationPath?: string;
  seedWordCount?: number;
  originalAddressInBackup?: string;
  isAddressMatched?: boolean;
  addresses: DerivedBtcAddressSet;
  keyFormat: string;
  notes?: string;
  selected: boolean;
}

export interface RawBackupParseResult {
  format: RawBackupFormatType;
  formatLabel: string;
  formatDescription: string;
  isEncrypted: boolean;
  encryptionHint?: string;
  items: DiscoveredWalletItem[];
  metadata: {
    rawLinesCount: number;
    detectedAt: number;
    creationDate?: string;
    originalWalletName?: string;
    transactionCountFound?: number;
  };
  error?: string;
}

/**
 * Clean and normalize text
 */
function cleanText(input: string): string {
  return input.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

/**
 * Check if text looks like a valid BIP-39 mnemonic phrase
 */
function extractMnemonicFromText(text: string): { mnemonic: string; wordCount: SupportedWordCount; passphrase?: string; derivation?: string } | null {
  // Normalize words
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0);

  const supportedCounts: SupportedWordCount[] = [24, 21, 20, 18, 16, 15, 12];
  
  // Try to find continuous chunk of BIP-39 words
  for (const count of supportedCounts) {
    if (words.length >= count) {
      for (let i = 0; i <= words.length - count; i++) {
        const slice = words.slice(i, i + count);
        const validCheck = validateFlexibleSeedPhrase(slice);
        if (validCheck.valid) {
          // Check if there is a passphrase or derivation path nearby
          let passphrase: string | undefined;
          let derivation: string | undefined;

          const passMatch = text.match(/(?:passphrase|password|25th word|salt)[:=]\s*([^\n\r]+)/i);
          if (passMatch) passphrase = passMatch[1].trim();

          const derivMatch = text.match(/(?:derivation|path)[:=]\s*(m\/[0-9'/]+)/i);
          if (derivMatch) derivation = derivMatch[1].trim();

          return {
            mnemonic: slice.join(' '),
            wordCount: count,
            passphrase,
            derivation,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Parse Output Descriptors (BIP-380, BIP-384, BIP-386)
 * e.g., wpkh([fingerprint/84'/0'/0']xprv.../0/*)
 */
function parseOutputDescriptors(text: string): DiscoveredWalletItem[] {
  const items: DiscoveredWalletItem[] = [];
  const lines = text.split('\n');

  // Regex to find xprv/yprv/zprv inside descriptors
  const descRegex = /(?:wpkh|pkh|sh|tr|wsh)\s*\(\s*(?:\[([0-9a-fA-F]{8})?([/0-9'h]+)?\])?\s*([xyzuvt]prv[0-9a-zA-Z]+)(?:\/([0-9'/*h]+))?\s*\)/g;

  let match: RegExpExecArray | null;
  let idx = 1;

  while ((match = descRegex.exec(text)) !== null) {
    const originFingerprint = match[1];
    const originPath = match[2];
    const extKeyStr = match[3];
    const subPath = match[4];

    const parsedExt = parseExtendedPrivateKey(extKeyStr);
    if (parsedExt) {
      const derivedAddrs = deriveRealAddressesFromPrivateKey(parsedExt.privKeyBytes, true);
      const label = originPath ? `Descriptor ${match[0].slice(0, 4)}(${originPath})` : `Descriptor Wallet #${idx}`;
      
      items.push({
        id: `desc-${idx}-${Date.now()}`,
        sourceType: 'extended_key',
        label,
        rawSecret: extKeyStr,
        derivationPath: originPath || parsedExt.defaultDerivationPath,
        addresses: derivedAddrs,
        keyFormat: parsedExt.formatLabel,
        notes: `Subpath: ${subPath || '0/*'}, Origin: ${originFingerprint || 'Unknown'}`,
        selected: true,
      });
      idx++;
    }
  }

  return items;
}

/**
 * Parse Bitcoin Core dumpwallet text
 */
function parseBitcoinCoreDump(text: string): DiscoveredWalletItem[] {
  const items: DiscoveredWalletItem[] = [];
  const lines = text.split('\n');

  let masterExtKey: string | null = null;
  let dumpDate = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for dump date
    if (trimmed.startsWith('# * Created on')) {
      dumpDate = trimmed.replace('# * Created on', '').trim();
    }

    // Check for extended master private key
    if (trimmed.includes('extended private masterkey:') || trimmed.startsWith('# extended private masterkey:')) {
      const parts = trimmed.split(':');
      if (parts[1]) {
        const potentialKey = parts[1].trim();
        const parsed = parseExtendedPrivateKey(potentialKey);
        if (parsed) {
          masterExtKey = potentialKey;
          const addrs = deriveRealAddressesFromPrivateKey(parsed.privKeyBytes, true);
          items.push({
            id: `dump-master-${Date.now()}`,
            sourceType: 'extended_key',
            label: 'Bitcoin Core Master HD Key (xprv)',
            rawSecret: potentialKey,
            derivationPath: parsed.defaultDerivationPath,
            addresses: addrs,
            keyFormat: parsed.formatLabel,
            notes: 'Root Master Private Key extracted from dump header',
            selected: true,
          });
        }
      }
    }

    // Check individual key lines: <WIF> <timestamp> label=<label> # addr=<address>
    if (!trimmed.startsWith('#')) {
      const parts = trimmed.split(/\s+/);
      const potentialWif = parts[0];
      const legacyKey = parseAndValidatePrivateKey(potentialWif);

      if (legacyKey) {
        const addrMatch = trimmed.match(/addr=([13bc][0-9a-zA-Z]+)/);
        const labelMatch = trimmed.match(/label=([^#\s]+)/);
        const originalAddress = addrMatch ? addrMatch[1] : undefined;
        const itemLabel = labelMatch ? decodeURIComponent(labelMatch[1]) : `Key #${items.length + 1}`;

        const derivedAddrs = deriveRealAddressesFromPrivateKey(legacyKey.privKeyBytes, legacyKey.isCompressed);
        const isMatched = originalAddress
          ? originalAddress === derivedAddrs.legacyCompressed ||
            originalAddress === derivedAddrs.legacyUncompressed ||
            originalAddress === derivedAddrs.nestedSegwit ||
            originalAddress === derivedAddrs.nativeSegwit
          : false;

        items.push({
          id: `core-key-${items.length + 1}`,
          sourceType: 'private_key',
          label: itemLabel === 'reserve' ? `Reserved Key #${items.length + 1}` : itemLabel,
          rawSecret: potentialWif,
          originalAddressInBackup: originalAddress,
          isAddressMatched: isMatched,
          addresses: derivedAddrs,
          keyFormat: legacyKey.formatLabel,
          notes: isMatched ? 'Verified against dump address' : undefined,
          selected: itemLabel !== 'reserve', // don't pre-select reserve pool keys if there are labeled keys
        });
      }
    }
  }

  // If no items were selected (e.g. all reserve keys), select top 5
  if (items.length > 0 && !items.some(i => i.selected)) {
    for (let i = 0; i < Math.min(items.length, 5); i++) {
      items[i].selected = true;
    }
  }

  return items;
}

/**
 * Parse Electrum JSON backup file
 */
function parseElectrumJson(jsonObj: any): DiscoveredWalletItem[] {
  const items: DiscoveredWalletItem[] = [];

  const keystore = jsonObj.keystore || jsonObj;
  if (!keystore) return items;

  // 1. Check if seed phrase exists
  if (keystore.seed && typeof keystore.seed === 'string') {
    const seed = keystore.seed.trim();
    const mnemonicInfo = extractMnemonicFromText(seed);
    if (mnemonicInfo) {
      // In Electrum, standard seed can derive addresses
      // Create seed item
      items.push({
        id: `electrum-seed-${Date.now()}`,
        sourceType: 'master_seed',
        label: 'Electrum Mnemonic Seed',
        rawSecret: mnemonicInfo.mnemonic,
        passphrase: keystore.passphrase,
        derivationPath: keystore.derivation || "m/84'/0'/0'",
        seedWordCount: mnemonicInfo.wordCount,
        addresses: deriveRealAddressesFromPrivateKey(sha256(new TextEncoder().encode(mnemonicInfo.mnemonic)).subarray(0, 32), true),
        keyFormat: `Electrum Seed (${mnemonicInfo.wordCount} words)`,
        notes: `Seed Type: ${keystore.seed_type || 'standard'}, Derivation: ${keystore.derivation || 'BIP-84'}`,
        selected: true,
      });
    }
  }

  // 2. Check xprv / master key
  if (keystore.xprv && typeof keystore.xprv === 'string') {
    const parsedExt = parseExtendedPrivateKey(keystore.xprv);
    if (parsedExt) {
      const derived = deriveRealAddressesFromPrivateKey(parsedExt.privKeyBytes, true);
      items.push({
        id: `electrum-xprv-${Date.now()}`,
        sourceType: 'extended_key',
        label: 'Electrum Master Private Key',
        rawSecret: keystore.xprv,
        derivationPath: keystore.derivation || parsedExt.defaultDerivationPath,
        addresses: derived,
        keyFormat: parsedExt.formatLabel,
        notes: `Root Fingerprint: ${keystore.root_fingerprint || parsedExt.fingerprint}`,
        selected: items.length === 0, // select if no seed item
      });
    }
  }

  return items;
}

/**
 * Parse CSV / TSV or line-by-line list of keys/addresses
 */
function parseCsvOrKeyList(text: string): DiscoveredWalletItem[] {
  const items: DiscoveredWalletItem[] = [];
  const lines = text.split('\n');

  let idx = 1;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Split by comma, tab, or semicolon
    const parts = trimmed.split(/[,;\t|]+/).map(p => p.trim());
    
    let foundKey: string | null = null;
    let foundAddr: string | null = null;
    let foundLabel: string | null = null;

    for (const part of parts) {
      const legKey = parseAndValidatePrivateKey(part);
      if (legKey) {
        foundKey = part;
      } else if (/^[13bc1q][0-9a-zA-Z]{25,62}$/.test(part)) {
        foundAddr = part;
      } else if (part.length > 0 && !foundLabel && !part.startsWith('0x')) {
        foundLabel = part;
      }
    }

    if (foundKey) {
      const legKey = parseAndValidatePrivateKey(foundKey)!;
      const derivedAddrs = deriveRealAddressesFromPrivateKey(legKey.privKeyBytes, legKey.isCompressed);
      const isMatched = foundAddr
        ? foundAddr === derivedAddrs.legacyCompressed ||
          foundAddr === derivedAddrs.legacyUncompressed ||
          foundAddr === derivedAddrs.nestedSegwit ||
          foundAddr === derivedAddrs.nativeSegwit
        : false;

      items.push({
        id: `csv-key-${idx}`,
        sourceType: 'private_key',
        label: foundLabel || `Imported Key #${idx}`,
        rawSecret: foundKey,
        originalAddressInBackup: foundAddr || undefined,
        isAddressMatched: isMatched,
        addresses: derivedAddrs,
        keyFormat: legKey.formatLabel,
        notes: isMatched ? 'Matches address in line' : undefined,
        selected: true,
      });
      idx++;
    }
  }

  return items;
}

/**
 * Main Raw Backup Inspector & Parser
 */
export function parseRawBackupData(rawInput: string): RawBackupParseResult {
  const cleaned = cleanText(rawInput);
  const linesCount = cleaned ? cleaned.split('\n').length : 0;

  if (!cleaned) {
    return {
      format: 'unknown',
      formatLabel: 'Unknown / Empty',
      formatDescription: 'No data provided',
      isEncrypted: false,
      items: [],
      metadata: { rawLinesCount: 0, detectedAt: Date.now() },
    };
  }

  // 1. Check if input is a JSON object
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsedJson = JSON.parse(cleaned);

      // 1.1 Check if it is a ColdVault Backup payload
      if (parsedJson.realAccount || (parsedJson.accounts && Array.isArray(parsedJson.accounts))) {
        const items: DiscoveredWalletItem[] = [];
        const accounts = parsedJson.accounts || (parsedJson.realAccount ? [parsedJson.realAccount] : []);
        
        for (let i = 0; i < accounts.length; i++) {
          const acc = accounts[i];
          items.push({
            id: `coldvault-${acc.id || i}`,
            sourceType: acc.keySource === 'master_private_key' ? 'extended_key' : acc.keySource === 'private_key' ? 'private_key' : 'master_seed',
            label: acc.name || `Vault #${i + 1}`,
            rawSecret: acc.address, // Public record representation
            derivationPath: acc.derivationPath,
            originalAddressInBackup: acc.address,
            isAddressMatched: true,
            addresses: {
              legacyCompressed: acc.address,
              legacyUncompressed: acc.address,
              nestedSegwit: acc.address,
              nativeSegwit: acc.address,
              taproot: acc.address,
              pubKeyCompressedHex: acc.publicKey || '',
              pubKeyUncompressedHex: '',
              fingerprint: acc.fingerprint || '',
              bchCashAddr: '',
              bchLegacyAddr: '',
              bsvAddr: '',
              btgAddr: '',
            },
            keyFormat: acc.keyFormat || 'ColdVault Account',
            notes: `Balance: ${acc.balanceBtc || 0} BTC`,
            selected: true,
          });
        }

        return {
          format: 'coldvault_backup',
          formatLabel: 'ColdVault Application Snapshot (JSON)',
          formatDescription: `Exported ColdVault snapshot containing ${items.length} account(s) and full transaction metadata`,
          isEncrypted: false,
          items,
          metadata: {
            rawLinesCount: linesCount,
            detectedAt: Date.now(),
            creationDate: parsedJson.exportTimestamp ? new Date(parsedJson.exportTimestamp).toLocaleString() : undefined,
            originalWalletName: parsedJson.realAccount?.name,
            transactionCountFound: parsedJson.realTransactions?.length || 0,
          },
        };
      }

      // 1.2 Check if it is an Encrypted payload (ColdVault AES or Web3 Keystore)
      if (
        (parsedJson.iv && parsedJson.ciphertext && parsedJson.salt) ||
        (parsedJson.crypto && parsedJson.crypto.ciphertext) ||
        (parsedJson.Crypto && parsedJson.Crypto.ciphertext) ||
        (parsedJson.use_encryption === true && parsedJson.keystore)
      ) {
        return {
          format: 'encrypted_backup',
          formatLabel: 'Encrypted Vault Backup (Password Protected)',
          formatDescription: 'Encrypted ciphertext detected. Enter the backup password below to decrypt and extract keys.',
          isEncrypted: true,
          encryptionHint: parsedJson.salt ? 'AES-256-GCM / PBKDF2' : 'Keystore V3 / Scrypt',
          items: [],
          metadata: { rawLinesCount: linesCount, detectedAt: Date.now() },
        };
      }

      // 1.3 Check if it is Electrum JSON
      if (parsedJson.keystore || parsedJson.seed_version || parsedJson.wallet_type) {
        const items = parseElectrumJson(parsedJson);
        return {
          format: 'electrum_json',
          formatLabel: 'Electrum Wallet Backup (JSON)',
          formatDescription: `Recognized Electrum wallet format (${parsedJson.wallet_type || 'standard'}). Found ${items.length} keys/seed.`,
          isEncrypted: false,
          items,
          metadata: { rawLinesCount: linesCount, detectedAt: Date.now(), originalWalletName: parsedJson.wallet_type },
        };
      }

      // 1.4 Check Sparrow / Wasabi / Trezor / Coldcard generic JSON
      if (parsedJson.bip84 || parsedJson.bip49 || parsedJson.bip44 || parsedJson.descriptor) {
        const items: DiscoveredWalletItem[] = [];
        const extKeys = [parsedJson.bip84?.xprv, parsedJson.bip49?.yprv, parsedJson.bip44?.xprv].filter(Boolean);
        for (const k of extKeys) {
          const parsed = parseExtendedPrivateKey(k);
          if (parsed) {
            items.push({
              id: `json-ext-${items.length + 1}`,
              sourceType: 'extended_key',
              label: `Account (${parsed.prefix})`,
              rawSecret: k,
              derivationPath: parsed.defaultDerivationPath,
              addresses: deriveRealAddressesFromPrivateKey(parsed.privKeyBytes, true),
              keyFormat: parsed.formatLabel,
              selected: true,
            });
          }
        }
        if (items.length > 0) {
          return {
            format: 'sparrow_json',
            formatLabel: 'Hardware / Multi-Account JSON Export',
            formatDescription: `Exported multi-account JSON. Extracted ${items.length} extended private keys.`,
            isEncrypted: false,
            items,
            metadata: { rawLinesCount: linesCount, detectedAt: Date.now() },
          };
        }
      }
    } catch {
      // Fall through to text analysis
    }
  }

  // 2. Check for Bitcoin Core dumpwallet format
  if (cleaned.includes('extended private masterkey:') || cleaned.includes('# * Created on') || cleaned.includes('reserve=1')) {
    const items = parseBitcoinCoreDump(cleaned);
    if (items.length > 0) {
      return {
        format: 'bitcoin_core_dump',
        formatLabel: 'Bitcoin Core "dumpwallet" Text Export',
        formatDescription: `Found ${items.length} keys (including master HD key and address labels) from Bitcoin Core node backup`,
        isEncrypted: false,
        items,
        metadata: { rawLinesCount: linesCount, detectedAt: Date.now() },
      };
    }
  }

  // 3. Check for Output Descriptors (BIP-380 / BIP-384 / BIP-386)
  if (/(?:wpkh|pkh|sh|tr|wsh)\s*\(/i.test(cleaned)) {
    const descItems = parseOutputDescriptors(cleaned);
    if (descItems.length > 0) {
      return {
        format: 'output_descriptor',
        formatLabel: 'Bitcoin Output Descriptor (BIP-380/386)',
        formatDescription: `Parsed ${descItems.length} descriptor expressions containing active private derivation keys`,
        isEncrypted: false,
        items: descItems,
        metadata: { rawLinesCount: linesCount, detectedAt: Date.now() },
      };
    }
  }

  // 4. Check for Standalone Extended Private Key (xprv, yprv, zprv)
  const extKeyParsed = parseExtendedPrivateKey(cleaned);
  if (extKeyParsed) {
    const derived = deriveRealAddressesFromPrivateKey(extKeyParsed.privKeyBytes, true);
    return {
      format: 'extended_key',
      formatLabel: 'BIP-32 Extended Master Private Key',
      formatDescription: `${extKeyParsed.formatLabel} detected. Can derive all child addresses and accounts.`,
      isEncrypted: false,
      items: [
        {
          id: `ext-key-${Date.now()}`,
          sourceType: 'extended_key',
          label: extKeyParsed.isMaster ? 'Master Private Key (Root m)' : 'Extended Account Key',
          rawSecret: cleaned,
          derivationPath: extKeyParsed.defaultDerivationPath,
          addresses: derived,
          keyFormat: extKeyParsed.formatLabel,
          notes: `Depth: ${extKeyParsed.depth}, Network: ${extKeyParsed.network}`,
          selected: true,
        },
      ],
      metadata: { rawLinesCount: linesCount, detectedAt: Date.now() },
    };
  }

  // 5. Check for Mnemonic Seed Phrase in plaintext dump
  const mnemonicMatch = extractMnemonicFromText(cleaned);
  if (mnemonicMatch) {
    // Generate sample addresses for preview
    const sampleBytes = sha256(new TextEncoder().encode(mnemonicMatch.mnemonic)).subarray(0, 32);
    const derived = deriveRealAddressesFromPrivateKey(sampleBytes, true);

    return {
      format: 'mnemonic_dump',
      formatLabel: `Mnemonic Seed Phrase (${mnemonicMatch.wordCount} Words)`,
      formatDescription: `Valid ${mnemonicMatch.wordCount}-word seed phrase detected in backup notes`,
      isEncrypted: false,
      items: [
        {
          id: `mnemonic-${Date.now()}`,
          sourceType: 'master_seed',
          label: `Recovered Seed Vault (${mnemonicMatch.wordCount} words)`,
          rawSecret: mnemonicMatch.mnemonic,
          passphrase: mnemonicMatch.passphrase,
          derivationPath: mnemonicMatch.derivation || "m/84'/0'/0'",
          seedWordCount: mnemonicMatch.wordCount,
          addresses: derived,
          keyFormat: `${mnemonicMatch.wordCount}-word BIP-39 Seed Phrase`,
          notes: mnemonicMatch.passphrase ? `Includes 25th word passphrase: "${mnemonicMatch.passphrase}"` : undefined,
          selected: true,
        },
      ],
      metadata: { rawLinesCount: linesCount, detectedAt: Date.now() },
    };
  }

  // 6. Check for CSV / TSV / line-by-line Private Keys
  const csvItems = parseCsvOrKeyList(cleaned);
  if (csvItems.length > 0) {
    return {
      format: 'csv_key_list',
      formatLabel: 'Paper Wallet / Private Key List (WIF/CSV)',
      formatDescription: `Found ${csvItems.length} individual private key(s) in line-by-line format`,
      isEncrypted: false,
      items: csvItems,
      metadata: { rawLinesCount: linesCount, detectedAt: Date.now() },
    };
  }

  // 7. Check if Base64 encoded payload
  if (/^[A-Za-z0-9+/=]{40,}$/.test(cleaned.replace(/\s+/g, ''))) {
    try {
      const decoded = atob(cleaned.replace(/\s+/g, ''));
      const subResult = parseRawBackupData(decoded);
      if (subResult.format !== 'unknown' && subResult.items.length > 0) {
        return {
          ...subResult,
          formatLabel: `Base64 Encoded (${subResult.formatLabel})`,
          formatDescription: `Successfully decoded Base64 layer: ${subResult.formatDescription}`,
        };
      }
    } catch {
      // Not base64
    }
  }

  // Fallback: Unknown
  return {
    format: 'unknown',
    formatLabel: 'Unrecognized Raw Backup Format',
    formatDescription: 'Could not automatically identify any Bitcoin Core dump, Electrum JSON, seed phrase, or private key. Please check the text or format.',
    isEncrypted: false,
    items: [],
    metadata: { rawLinesCount: linesCount, detectedAt: Date.now() },
  };
}

/**
 * Decrypt password-protected raw backup (ColdVault AES-GCM or generic PBKDF2)
 */
export async function decryptRawBackupPayload(
  rawText: string,
  password: string
): Promise<{ decryptedText: string; success: boolean; error?: string }> {
  try {
    const cleaned = cleanText(rawText);
    const parsed = JSON.parse(cleaned);

    // Standard ColdVault AES-GCM format: { salt, iv, ciphertext }
    if (parsed.salt && parsed.iv && parsed.ciphertext) {
      const encoder = new TextEncoder();
      const salt = hexToBytes(parsed.salt);
      const iv = hexToBytes(parsed.iv);
      const ciphertext = hexToBytes(parsed.ciphertext);

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: parsed.iterations || 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        derivedKey,
        ciphertext
      );

      const decryptedText = new TextDecoder().decode(decrypted);
      return { decryptedText, success: true };
    }

    return {
      decryptedText: '',
      success: false,
      error: 'Unsupported encryption wrapper format',
    };
  } catch (err: any) {
    return {
      decryptedText: '',
      success: false,
      error: err?.message || 'Incorrect password or corrupted ciphertext',
    };
  }
}

/**
 * Execute Batch Migration into ColdVault App
 * Converts selected DiscoveredWalletItem records into sealed ZeroExposureVault accounts
 */
export async function executeBatchMigration(
  itemsToMigrate: DiscoveredWalletItem[],
  userPin: string,
  targetAddressType: AddressType = 'native_segwit',
  vaultColorPrefix: string = 'slate'
): Promise<{ migratedAccounts: WalletAccount[]; errors: string[] }> {
  const migratedAccounts: WalletAccount[] = [];
  const errors: string[] = [];

  for (let i = 0; i < itemsToMigrate.length; i++) {
    const item = itemsToMigrate[i];
    if (!item.selected) continue;

    try {
      let keySource: 'seed_phrase' | 'private_key' | 'master_private_key' = 'seed_phrase';
      if (item.sourceType === 'extended_key') {
        keySource = 'master_private_key';
      } else if (item.sourceType === 'private_key') {
        keySource = 'private_key';
      }

      const accountName = item.label || `Migrated Vault #${i + 1}`;

      const { account } = await sealZeroExposureVault(
        item.rawSecret,
        userPin,
        accountName,
        targetAddressType,
        item.passphrase,
        keySource,
        item.keyFormat,
        vaultColorPrefix
      );

      // Preserve seed word count and notes
      if (item.seedWordCount) {
        account.seedWordCount = item.seedWordCount;
      }
      if (item.passphrase) {
        account.has25thWord = true;
      }

      migratedAccounts.push(account);
    } catch (err: any) {
      errors.push(`Error migrating ${item.label}: ${err?.message || 'Failed to seal'}`);
    }
  }

  return { migratedAccounts, errors };
}
