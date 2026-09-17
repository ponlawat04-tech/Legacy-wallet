import { Currency, Language, SecuritySettings, Transaction, WalletAccount } from '../types/wallet';
import { APP_VERSION } from './version';

export interface BackupPayload {
  version: string; // e.g. "1.0"
  appVersion: string;
  exportTimestamp: number;
  realAccount: WalletAccount;
  accounts: WalletAccount[];
  realTransactions: Transaction[];
  security: SecuritySettings;
  lang: Language;
  currency: Currency;
  spvMetadata?: {
    tipHeight?: number;
    tipHash?: string;
    verifiedProofsCount?: number;
  };
}

export type BackupTriggerType = 'auto_change' | 'scheduled' | 'manual' | 'pre_restore';

export interface BackupSnapshot {
  id: string;
  timestamp: number;
  trigger: BackupTriggerType;
  triggerLabel: string;
  accountsCount: number;
  transactionsCount: number;
  checksum: string;
  sizeBytes: number;
  payload: BackupPayload;
}

export interface AutoBackupConfig {
  enabled: boolean;
  frequency: 'on_change' | 'hourly' | 'daily';
  maxSnapshots: number;
  lastBackupTimestamp: number | null;
  notifyOnAutoBackup: boolean;
}

const CONFIG_STORAGE_KEY = 'COLDVAULT_AUTO_BACKUP_CONFIG_V1';
const SNAPSHOTS_STORAGE_KEY = 'COLDVAULT_AUTO_BACKUP_SNAPSHOTS_V1';

const DEFAULT_CONFIG: AutoBackupConfig = {
  enabled: true,
  frequency: 'on_change',
  maxSnapshots: 10,
  lastBackupTimestamp: null,
  notifyOnAutoBackup: false,
};

/**
 * SHA-256 Checksum Calculation using native WebCrypto
 */
export async function calculateSha256(text: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // Basic fallback if crypto.subtle is not accessible
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
}

/**
 * Load Auto-Backup Configuration
 */
export function getAutoBackupConfig(): AutoBackupConfig {
  if (typeof localStorage === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('Error loading auto-backup config:', e);
  }
  return DEFAULT_CONFIG;
}

/**
 * Save Auto-Backup Configuration
 */
export function saveAutoBackupConfig(updates: Partial<AutoBackupConfig>): AutoBackupConfig {
  const current = getAutoBackupConfig();
  const next = { ...current, ...updates };
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error('Error saving auto-backup config:', e);
    }
  }
  return next;
}

/**
 * Get all existing local backup snapshots
 */
export function getBackupSnapshots(): BackupSnapshot[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => b.timestamp - a.timestamp);
      }
    }
  } catch (e) {
    console.error('Error loading backup snapshots:', e);
  }
  return [];
}

/**
 * Save Backup Snapshots list to localStorage
 */
function saveBackupSnapshotsList(snapshots: BackupSnapshot[], maxSnapshots: number = 10): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const trimmed = snapshots.slice(0, maxSnapshots);
    localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Error saving backup snapshots list:', e);
  }
}

/**
 * Create a new Backup Snapshot
 * Will avoid creating duplicate snapshots if data has not changed compared to the latest snapshot
 */
export async function createBackupSnapshot(
  payload: BackupPayload,
  trigger: BackupTriggerType = 'auto_change',
  force: boolean = false
): Promise<{ snapshot: BackupSnapshot | null; isDuplicate: boolean }> {
  const config = getAutoBackupConfig();
  if (!config.enabled && trigger === 'auto_change' && !force) {
    return { snapshot: null, isDuplicate: false };
  }

  const payloadStr = JSON.stringify(payload);
  const checksum = await calculateSha256(payloadStr);
  const existing = getBackupSnapshots();

  // Check if latest snapshot is identical to avoid clutter
  if (!force && existing.length > 0 && existing[0].checksum === checksum) {
    return { snapshot: existing[0], isDuplicate: true };
  }

  const triggerLabels: Record<BackupTriggerType, { th: string; en: string }> = {
    auto_change: {
      th: 'สำรองอัตโนมัติ (ตรวจพบการเปลี่ยนแปลง)',
      en: 'Auto-Backup (Data Modified)',
    },
    scheduled: {
      th: 'สำรองตามกำหนดเวลา',
      en: 'Scheduled Backup',
    },
    manual: {
      th: 'สำรองข้อมูลด้วยตนเอง',
      en: 'Manual Snapshot',
    },
    pre_restore: {
      th: 'จุดสำรองความปลอดภัยก่อนกู้คืน (Rollback Point)',
      en: 'Safety Rollback (Pre-Restore)',
    },
  };

  const newSnapshot: BackupSnapshot = {
    id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    trigger,
    triggerLabel: triggerLabels[trigger]?.th || 'สำรองข้อมูลอัตโนมัติ',
    accountsCount: payload.accounts.length,
    transactionsCount: payload.realTransactions.length,
    checksum,
    sizeBytes: new Blob([payloadStr]).size,
    payload,
  };

  const updatedSnapshots = [newSnapshot, ...existing];
  saveBackupSnapshotsList(updatedSnapshots, config.maxSnapshots || 10);
  saveAutoBackupConfig({ lastBackupTimestamp: newSnapshot.timestamp });

  return { snapshot: newSnapshot, isDuplicate: false };
}

/**
 * Delete a specific snapshot
 */
export function deleteBackupSnapshot(snapshotId: string): BackupSnapshot[] {
  const existing = getBackupSnapshots();
  const filtered = existing.filter(s => s.id !== snapshotId);
  saveBackupSnapshotsList(filtered);
  return filtered;
}

/**
 * Clear all snapshots
 */
export function clearAllBackupSnapshots(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(SNAPSHOTS_STORAGE_KEY);
  }
}

/**
 * AES-GCM 256-bit Key Derivation from password using PBKDF2
 */
async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Export Backup as JSON or Encrypted File
 */
export async function exportBackupData(
  payload: BackupPayload,
  password?: string
): Promise<{
  filename: string;
  content: string;
  isEncrypted: boolean;
  checksum: string;
}> {
  const payloadStr = JSON.stringify(payload, null, 2);
  const checksum = await calculateSha256(payloadStr);
  const dateStr = new Date().toISOString().slice(0, 10);

  if (password && password.trim().length > 0) {
    // Encrypt with AES-GCM 256-bit
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKeyFromPassword(password.trim(), salt);

    const encoder = new TextEncoder();
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(payloadStr)
    );

    const exportEnvelope = {
      coldvaultEncryptedBackup: true,
      version: '1.0',
      appVersion: APP_VERSION,
      cipher: 'AES-256-GCM',
      kdf: 'PBKDF2-SHA256-100k',
      saltHex: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
      ivHex: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
      ciphertextBase64: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
      checksum,
      timestamp: Date.now(),
    };

    return {
      filename: `coldvault-backup-encrypted-${dateStr}.cbak`,
      content: JSON.stringify(exportEnvelope, null, 2),
      isEncrypted: true,
      checksum,
    };
  }

  // Plain JSON export
  const exportEnvelope = {
    coldvaultBackup: true,
    version: '1.0',
    appVersion: APP_VERSION,
    checksum,
    timestamp: Date.now(),
    payload,
  };

  return {
    filename: `coldvault-backup-${dateStr}.json`,
    content: JSON.stringify(exportEnvelope, null, 2),
    isEncrypted: false,
    checksum,
  };
}

/**
 * Trigger browser file download
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string = 'application/json'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Parse & Validate Import File Content (Encrypted or Plain)
 */
export async function validateAndParseBackupFile(
  rawText: string,
  password?: string
): Promise<{
  isValid: boolean;
  isEncrypted: boolean;
  payload?: BackupPayload;
  error?: string;
  checksumMatch?: boolean;
}> {
  try {
    const data = JSON.parse(rawText);

    // Encrypted file case
    if (data.coldvaultEncryptedBackup) {
      if (!password || !password.trim()) {
        return {
          isValid: false,
          isEncrypted: true,
          error: 'ไฟล์นี้ได้รับการเข้ารหัสความปลอดภัยด้วย AES-256-GCM กรุณาป้อนรหัสผ่านเพื่อถอดรหัสข้อมูล',
        };
      }

      try {
        const salt = new Uint8Array(data.saltHex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
        const iv = new Uint8Array(data.ivHex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
        const key = await deriveKeyFromPassword(password.trim(), salt);

        const binaryStr = atob(data.ciphertextBase64);
        const encryptedBytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          encryptedBytes[i] = binaryStr.charCodeAt(i);
        }

        const decryptedBuffer = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          encryptedBytes
        );

        const decoder = new TextDecoder();
        const decryptedText = decoder.decode(decryptedBuffer);
        const parsedPayload: BackupPayload = JSON.parse(decryptedText);

        const calcChecksum = await calculateSha256(decryptedText);
        const checksumMatch = data.checksum ? calcChecksum === data.checksum : true;

        return {
          isValid: true,
          isEncrypted: true,
          payload: parsedPayload,
          checksumMatch,
        };
      } catch (err) {
        return {
          isValid: false,
          isEncrypted: true,
          error: 'รหัสผ่านถอดรหัสไม่ถูกต้อง หรือไฟล์สำรองข้อมูลเสียหาย (AES Decryption Failed)',
        };
      }
    }

    // Unencrypted file case
    if (data.coldvaultBackup && data.payload) {
      const payload = data.payload as BackupPayload;
      if (!payload.accounts || !Array.isArray(payload.accounts)) {
        return {
          isValid: false,
          isEncrypted: false,
          error: 'รูปแบบข้อมูลภายในไฟล์สำรองไม่ถูกต้อง (Missing accounts array)',
        };
      }

      const payloadStr = JSON.stringify(payload, null, 2);
      const calcChecksum = await calculateSha256(payloadStr);
      const checksumMatch = data.checksum ? calcChecksum === data.checksum : true;

      return {
        isValid: true,
        isEncrypted: false,
        payload,
        checksumMatch,
      };
    }

    // Direct payload format
    if (data.accounts && Array.isArray(data.accounts) && data.realAccount) {
      return {
        isValid: true,
        isEncrypted: false,
        payload: data as BackupPayload,
        checksumMatch: true,
      };
    }

    return {
      isValid: false,
      isEncrypted: false,
      error: 'ไฟล์นี้ไม่ใช่รูปแบบไฟล์สำรองข้อมูลของ ColdVault ที่ถูกต้อง',
    };
  } catch (e: any) {
    return {
      isValid: false,
      isEncrypted: false,
      error: `ไม่สามารถอ่านข้อมูลในไฟล์ได้: ${e?.message || 'Invalid JSON syntax'}`,
    };
  }
}
