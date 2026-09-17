import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Lock,
  Trash2,
  Sparkles,
  Layers,
  ArrowRight,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  X,
  FileText,
  Key,
  Shield,
  Check
} from 'lucide-react';
import { Currency, Language, SecuritySettings, Transaction, WalletAccount } from '../types/wallet';
import {
  AutoBackupConfig,
  BackupPayload,
  BackupSnapshot,
  clearAllBackupSnapshots,
  createBackupSnapshot,
  deleteBackupSnapshot,
  exportBackupData,
  getAutoBackupConfig,
  getBackupSnapshots,
  saveAutoBackupConfig,
  triggerFileDownload,
  validateAndParseBackupFile
} from '../utils/autoBackup';

interface AutoBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  currency: Currency;
  realAccount: WalletAccount;
  accounts: WalletAccount[];
  realTransactions: Transaction[];
  security: SecuritySettings;
  onRestoreData: (restored: BackupPayload) => void;
  onShowToast: (message: string, type?: 'success' | 'info') => void;
}

export const AutoBackupModal: React.FC<AutoBackupModalProps> = ({
  isOpen,
  onClose,
  lang,
  currency,
  realAccount,
  accounts,
  realTransactions,
  security,
  onRestoreData,
  onShowToast,
}) => {
  const [config, setConfig] = useState<AutoBackupConfig>(getAutoBackupConfig());
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState<boolean>(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<BackupSnapshot | null>(null);

  // Export Modal State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportPassword, setExportPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showExportPassword, setShowExportPassword] = useState<boolean>(false);
  const [usePasswordForExport, setUsePasswordForExport] = useState<boolean>(true);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Import / Restore Modal State
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importPassword, setImportPassword] = useState<string>('');
  const [showImportPassword, setShowImportPassword] = useState<boolean>(false);
  const [parsedPreview, setParsedPreview] = useState<BackupPayload | null>(null);
  const [isImportEncrypted, setIsImportEncrypted] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImportValidating, setIsImportValidating] = useState<boolean>(false);
  const [checksumMatches, setChecksumMatches] = useState<boolean>(true);

  // Restore Confirmation Dialog
  const [pendingRestoreSnapshot, setPendingRestoreSnapshot] = useState<BackupSnapshot | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load snapshots when opened
  useEffect(() => {
    if (isOpen) {
      setConfig(getAutoBackupConfig());
      setSnapshots(getBackupSnapshots());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPayload: BackupPayload = {
    version: '1.0',
    appVersion: '3.6.0',
    exportTimestamp: Date.now(),
    realAccount,
    accounts,
    realTransactions,
    security,
    lang,
    currency,
  };

  const handleToggleAutoBackup = () => {
    const updated = saveAutoBackupConfig({ enabled: !config.enabled });
    setConfig(updated);
    onShowToast(
      lang === 'th'
        ? updated.enabled
          ? 'เปิดใช้งานระบบ Auto-Backup อัตโนมัติแล้ว'
          : 'ปิดใช้งาน Auto-Backup ชั่วคราว'
        : updated.enabled
        ? 'Auto-Backup enabled'
        : 'Auto-Backup disabled',
      'info'
    );
  };

  const handleChangeFrequency = (freq: 'on_change' | 'hourly' | 'daily') => {
    const updated = saveAutoBackupConfig({ frequency: freq });
    setConfig(updated);
    onShowToast(
      lang === 'th' ? 'บันทึกความถี่ของ Auto-Backup สำเร็จ' : 'Auto-Backup frequency saved',
      'success'
    );
  };

  const handleCreateManualSnapshot = async () => {
    setIsCreatingSnapshot(true);
    try {
      const { snapshot, isDuplicate } = await createBackupSnapshot(currentPayload, 'manual', true);
      setSnapshots(getBackupSnapshots());
      setConfig(getAutoBackupConfig());
      if (isDuplicate) {
        onShowToast(
          lang === 'th'
            ? 'ข้อมูลปัจจุบันเหมือนกับจุดสำรองล่าสุดแล้ว (บันทึกเรียบร้อย)'
            : 'Snapshot is identical to latest state (Saved)',
          'info'
        );
      } else {
        onShowToast(
          lang === 'th' ? 'สร้างจุดสำรองข้อมูลด่วนสำเร็จ (Snapshot Created)' : 'Snapshot created successfully',
          'success'
        );
      }
    } catch (e: any) {
      onShowToast(lang === 'th' ? 'เกิดข้อผิดพลาดในการสำรองข้อมูล' : 'Error creating snapshot', 'info');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    const updated = deleteBackupSnapshot(id);
    setSnapshots(updated);
    onShowToast(lang === 'th' ? 'ลบจุดสำรองข้อมูลแล้ว' : 'Snapshot deleted', 'info');
  };

  const handleClearAllSnapshots = () => {
    if (
      window.confirm(
        lang === 'th'
          ? 'คุณต้องการลบประวัติจุดสำรองข้อมูลอัตโนมัติทั้งหมดหรือไม่?'
          : 'Are you sure you want to clear all backup snapshots?'
      )
    ) {
      clearAllBackupSnapshots();
      setSnapshots([]);
      onShowToast(lang === 'th' ? 'ล้างประวัติการสำรองข้อมูลทั้งหมดแล้ว' : 'All snapshots cleared', 'info');
    }
  };

  const handleExecuteExport = async () => {
    if (usePasswordForExport) {
      if (!exportPassword || exportPassword.length < 6) {
        setExportFeedback(
          lang === 'th'
            ? 'กรุณากำหนดรหัสผ่านความปลอดภัยอย่างน้อย 6 ตัวอักษร'
            : 'Password must be at least 6 characters'
        );
        return;
      }
      if (exportPassword !== confirmPassword) {
        setExportFeedback(
          lang === 'th' ? 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' : 'Passwords do not match'
        );
        return;
      }
    }

    setExportFeedback(null);
    try {
      const exportResult = await exportBackupData(
        currentPayload,
        usePasswordForExport ? exportPassword : undefined
      );

      triggerFileDownload(exportResult.content, exportResult.filename);
      onShowToast(
        lang === 'th'
          ? `ดาวน์โหลดไฟล์สำรองข้อมูล (${exportResult.filename}) สำเร็จ!`
          : `Backup downloaded (${exportResult.filename})`,
        'success'
      );
      setIsExporting(false);
      setExportPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setExportFeedback(e?.message || 'Export error');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError(null);
    setParsedPreview(null);
    setImportPassword('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setImportFileContent(content);
      await validateImportContent(content, '');
    };
    reader.readAsText(file);
  };

  const validateImportContent = async (content: string, passwordAttempt: string) => {
    setIsImportValidating(true);
    setImportError(null);
    try {
      const res = await validateAndParseBackupFile(content, passwordAttempt);
      setIsImportEncrypted(res.isEncrypted);
      if (res.isValid && res.payload) {
        setParsedPreview(res.payload);
        setChecksumMatches(res.checksumMatch ?? true);
      } else {
        setParsedPreview(null);
        if (res.error) setImportError(res.error);
      }
    } catch (e: any) {
      setImportError(e?.message || 'Failed to read file');
    } finally {
      setIsImportValidating(false);
    }
  };

  const handleExecuteRestore = async (payloadToRestore: BackupPayload) => {
    try {
      // Create Safety Pre-restore rollback snapshot first!
      await createBackupSnapshot(currentPayload, 'pre_restore', true);
      onRestoreData(payloadToRestore);
      onShowToast(
        lang === 'th'
          ? 'กู้คืนข้อมูลสำเร็จเรียบร้อย! (สร้างจุดความปลอดภัย Rollback ให้โดยอัตโนมัติ)'
          : 'Data restored successfully! (Safety rollback point created)',
        'success'
      );
      setPendingRestoreSnapshot(null);
      setImportFileContent(null);
      setParsedPreview(null);
      onClose();
    } catch (e: any) {
      onShowToast(lang === 'th' ? 'เกิดข้อผิดพลาดขณะกู้คืนข้อมูล' : 'Restore failed', 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-100">
                  {lang === 'th' ? 'ระบบ Auto-Backup ข้อมูล' : 'Auto Backup & Data Vault'}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase border flex items-center gap-1 ${
                    config.enabled
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      config.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  {config.enabled
                    ? lang === 'th'
                      ? 'ทำงานอยู่'
                      : 'Active'
                    : lang === 'th'
                    ? 'ปิดชั่วคราว'
                    : 'Paused'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'th'
                  ? 'สำรองข้อมูลอัตโนมัติระดับฮาร์ดแวร์ ปลอดภัย ไม่รั่วไหล ไร้กังวล'
                  : 'Zero-exposure automated state backup with SHA-256 verification'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-200 text-xs sm:text-sm">
          {/* Main Status & Metrics Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 border border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-850">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-slate-200">
                  {lang === 'th' ? 'สถานะการปกป้องข้อมูล' : 'Data Protection Status'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-mono">
                  {config.lastBackupTimestamp
                    ? new Date(config.lastBackupTimestamp).toLocaleString(
                        lang === 'th' ? 'th-TH' : 'en-US',
                        {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        }
                      )
                    : lang === 'th'
                    ? 'ยังไม่มีการสำรอง'
                    : 'No snapshot yet'}
                </span>
                <button
                  type="button"
                  onClick={handleToggleAutoBackup}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all border ${
                    config.enabled
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  }`}
                >
                  {config.enabled
                    ? lang === 'th'
                      ? 'หยุดชั่วคราว'
                      : 'Pause'
                    : lang === 'th'
                    ? 'เปิดใช้งาน'
                    : 'Enable'}
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 pt-3 text-center">
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {lang === 'th' ? 'กระเป๋าที่บันทึก' : 'Wallets'}
                </span>
                <span className="text-base font-black text-amber-400">
                  {accounts.length || 1}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {lang === 'th' ? 'รายการธุรกรรม' : 'Transactions'}
                </span>
                <span className="text-base font-black text-emerald-400">
                  {realTransactions.length}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {lang === 'th' ? 'จุดสำรองประวัติ' : 'Snapshots'}
                </span>
                <span className="text-base font-black text-cyan-400">
                  {snapshots.length}/{config.maxSnapshots}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleCreateManualSnapshot}
              disabled={isCreatingSnapshot}
              className="p-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isCreatingSnapshot ? 'animate-spin' : ''}`} />
              <span>{lang === 'th' ? 'สำรองข้อมูลทันที' : 'Snapshot Now'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsExporting(true);
                setExportFeedback(null);
              }}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-750 active:scale-98 border border-slate-700 text-slate-100 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'th' ? 'ส่งออกไฟล์สำรอง' : 'Export File'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                  fileInputRef.current.click();
                }
              }}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-750 active:scale-98 border border-slate-700 text-slate-100 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'th' ? 'กู้คืนจากไฟล์' : 'Restore File'}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".json,.cbak,.bak"
              className="hidden"
            />
          </div>

          {/* Export Dialog Box (Conditional) */}
          {isExporting && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/50 shadow-xl space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                  <Download className="w-4 h-4" />
                  <span>{lang === 'th' ? 'ส่งออกไฟล์สำรองข้อมูล (Export Backup)' : 'Export Backup File'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExporting(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Password Protection Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <div className="font-bold text-slate-200 text-xs">
                    {lang === 'th' ? 'เข้ารหัสไฟล์ด้วยรหัสผ่าน (AES-256-GCM)' : 'Encrypt file with Password'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {lang === 'th'
                      ? 'ความปลอดภัยสูงสุด ป้องกันผู้อื่นอ่าน Private Data'
                      : 'Military-grade PBKDF2 100k + AES-256-GCM'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={usePasswordForExport}
                  onChange={(e) => setUsePasswordForExport(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              {usePasswordForExport && (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type={showExportPassword ? 'text' : 'password'}
                      value={exportPassword}
                      onChange={(e) => setExportPassword(e.target.value)}
                      placeholder={lang === 'th' ? 'กำหนดรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)...' : 'Set backup password...'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-400 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowExportPassword(!showExportPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                    >
                      {showExportPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <input
                    type={showExportPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={lang === 'th' ? 'ยืนยันรหัสผ่านอีกครั้ง...' : 'Confirm backup password...'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              )}

              {exportFeedback && (
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs">
                  {exportFeedback}
                </div>
              )}

              <button
                type="button"
                onClick={handleExecuteExport}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'ดาวน์โหลดไฟล์เดี๋ยวนี้' : 'Download Encrypted File'}</span>
              </button>
            </div>
          )}

          {/* Import / Restore Preview Box (Conditional) */}
          {importFileContent && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/50 shadow-xl space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <FileCheck className="w-4 h-4" />
                  <span>{lang === 'th' ? `ตรวจพบไฟล์: ${importFileName}` : `Loaded File: ${importFileName}`}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImportFileContent(null);
                    setParsedPreview(null);
                  }}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isImportEncrypted && !parsedPreview && (
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-xs flex items-center gap-2">
                    <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>
                      {lang === 'th'
                        ? 'ไฟล์นี้เข้ารหัสด้วย AES-256 กรุณาใส่รหัสผ่านเพื่อถอดรหัส'
                        : 'File is encrypted. Enter password to decrypt:'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showImportPassword ? 'text' : 'password'}
                        value={importPassword}
                        onChange={(e) => setImportPassword(e.target.value)}
                        placeholder={lang === 'th' ? 'รหัสผ่านถอดรหัสไฟล์...' : 'Decryption password...'}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-400 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowImportPassword(!showImportPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                      >
                        {showImportPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => validateImportContent(importFileContent, importPassword)}
                      disabled={isImportValidating || !importPassword}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shrink-0 disabled:opacity-50"
                    >
                      {isImportValidating ? '...' : lang === 'th' ? 'ถอดรหัส' : 'Unlock'}
                    </button>
                  </div>
                </div>
              )}

              {importError && (
                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {parsedPreview && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{lang === 'th' ? 'กระเป๋าหลัก:' : 'Primary Wallet:'}</span>
                      <span className="font-bold text-amber-400 font-mono">
                        {parsedPreview.realAccount.name} ({parsedPreview.realAccount.address.slice(0, 8)}...)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{lang === 'th' ? 'จำนวนกระเป๋าทั้งหมด:' : 'Total Wallets:'}</span>
                      <span className="font-bold text-slate-200">
                        {parsedPreview.accounts?.length || 1} {lang === 'th' ? 'กระเป๋า' : 'wallets'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{lang === 'th' ? 'รายการธุรกรรม:' : 'Transactions:'}</span>
                      <span className="font-bold text-emerald-400">
                        {parsedPreview.realTransactions?.length || 0} {lang === 'th' ? 'รายการ' : 'items'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{lang === 'th' ? 'การตรวจสอบความสมบูรณ์:' : 'SHA-256 Checksum:'}</span>
                      <span className={`font-bold font-mono ${checksumMatches ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {checksumMatches ? '✓ สมบูรณ์ 100%' : '⚠️ Hash warning'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleExecuteRestore(parsedPreview)}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'ยืนยันกู้คืนข้อมูลเดี๋ยวนี้' : 'Confirm Restore Now'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImportFileContent(null);
                        setParsedPreview(null);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                    >
                      {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Auto Backup Configuration Selector */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-200 text-xs">
                {lang === 'th' ? 'ความถี่ในการสำรองข้อมูลอัตโนมัติ' : 'Auto-Backup Frequency'}
              </div>
              <span className="text-[10px] text-amber-400 font-bold">
                {config.frequency === 'on_change'
                  ? lang === 'th'
                    ? 'ทุกครั้งที่มีการแก้ไข (แนะนำ)'
                    : 'Real-time on change'
                  : config.frequency === 'hourly'
                  ? lang === 'th'
                    ? 'ทุก 1 ชั่วโมง'
                    : 'Hourly'
                  : lang === 'th'
                  ? 'รายวัน'
                  : 'Daily'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleChangeFrequency('on_change')}
                className={`py-1.5 px-2 rounded-xl text-[10.5px] font-bold transition-all border ${
                  config.frequency === 'on_change'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
                }`}
              >
                {lang === 'th' ? '⚡ ทุกการเปลี่ยนแปลง' : 'On Change'}
              </button>
              <button
                type="button"
                onClick={() => handleChangeFrequency('hourly')}
                className={`py-1.5 px-2 rounded-xl text-[10.5px] font-bold transition-all border ${
                  config.frequency === 'hourly'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
                }`}
              >
                {lang === 'th' ? '🕒 ทุก 1 ชม.' : 'Hourly'}
              </button>
              <button
                type="button"
                onClick={() => handleChangeFrequency('daily')}
                className={`py-1.5 px-2 rounded-xl text-[10.5px] font-bold transition-all border ${
                  config.frequency === 'daily'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
                }`}
              >
                {lang === 'th' ? '📅 รายวัน' : 'Daily'}
              </button>
            </div>
          </div>

          {/* Snapshots History Timeline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-300 text-xs">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'th' ? 'ประวัติจุดสำรองข้อมูล (Snapshot Timeline)' : 'Snapshot History'}</span>
                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
                  {snapshots.length}
                </span>
              </div>
              {snapshots.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllSnapshots}
                  className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{lang === 'th' ? 'ล้างทั้งหมด' : 'Clear all'}</span>
                </button>
              )}
            </div>

            {snapshots.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2">
                <HardDrive className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-slate-400 text-xs">
                  {lang === 'th'
                    ? 'ยังไม่มีจุดสำรองข้อมูล ระบบจะสำรองให้อัตโนมัติเมื่อข้อมูลเปลี่ยนแปลง'
                    : 'No snapshots saved yet. Auto-backup will record snapshots as data changes.'}
                </p>
                <button
                  type="button"
                  onClick={handleCreateManualSnapshot}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold"
                >
                  {lang === 'th' ? 'สำรองจุดแรกทันที' : 'Create First Snapshot'}
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="p-3 rounded-2xl bg-slate-950/90 hover:bg-slate-950 border border-slate-800/90 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-100 text-xs">
                          {new Date(snap.timestamp).toLocaleString(
                            lang === 'th' ? 'th-TH' : 'en-US',
                            {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            }
                          )}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            snap.trigger === 'auto_change'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : snap.trigger === 'pre_restore'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {snap.triggerLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                        <span>{snap.accountsCount} {lang === 'th' ? 'กระเป๋า' : 'Wallets'}</span>
                        <span>•</span>
                        <span>{snap.transactionsCount} {lang === 'th' ? 'ธุรกรรม' : 'Txs'}</span>
                        <span>•</span>
                        <span>{(snap.sizeBytes / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span className="text-slate-500 truncate max-w-[90px]">
                          SHA:{snap.checksum.slice(0, 6)}...
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPendingRestoreSnapshot(snap)}
                        className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95"
                        title={lang === 'th' ? 'กู้คืนจุดนี้' : 'Restore this point'}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{lang === 'th' ? 'กู้คืน' : 'Restore'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          const res = await exportBackupData(snap.payload);
                          triggerFileDownload(res.content, `coldvault-${snap.id}.json`);
                          onShowToast(lang === 'th' ? 'ดาวน์โหลดจุดสำรองสำเร็จ' : 'Exported snapshot', 'success');
                        }}
                        className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-all"
                        title={lang === 'th' ? 'ดาวน์โหลดจุดนี้' : 'Export snapshot'}
                      >
                        <Download className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSnapshot(snap.id)}
                        className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 transition-all"
                        title={lang === 'th' ? 'ลบจุดนี้' : 'Delete snapshot'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirm Restore Dialog (Conditional) */}
          {pendingRestoreSnapshot && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-2.5 animate-fadeIn">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {lang === 'th'
                    ? 'ยืนยันกู้คืนข้อมูลจากจุดสำรองเวลานี้?'
                    : 'Confirm Rollback to this Snapshot?'}
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {lang === 'th'
                  ? `ระบบจะทำการย้อนสถานะข้อมูลทั้งหมดกลับไปยังจุดวันที่ ${new Date(
                      pendingRestoreSnapshot.timestamp
                    ).toLocaleString('th-TH')} (${pendingRestoreSnapshot.accountsCount} กระเป๋า, ${
                      pendingRestoreSnapshot.transactionsCount
                    } รายการธุรกรรม) โดยระบบจะสำรองข้อมูลปัจจุบันไว้ให้เป็น Safety Rollback Point โดยอัตโนมัติ`
                  : `This will restore your wallet state to ${new Date(
                      pendingRestoreSnapshot.timestamp
                    ).toLocaleString()}. A safety rollback point of your current state will be generated automatically.`}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleExecuteRestore(pendingRestoreSnapshot.payload)}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
                >
                  {lang === 'th' ? 'ยืนยันย้อนข้อมูล' : 'Confirm Rollback'}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingRestoreSnapshot(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {lang === 'th'
                ? 'ข้อมูลทั้งหมดถูกเก็บไว้ในเครื่อง ไม่ส่งออกภายนอก'
                : 'All backups isolated on client hardware'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors"
          >
            {lang === 'th' ? 'ปิด' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
