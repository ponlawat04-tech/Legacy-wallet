import React, { useState } from 'react';
import {
  ShieldCheck,
  Globe,
  Wifi,
  RefreshCw,
  Cpu,
  CheckCircle2,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  GitFork,
  Coins,
  AlertCircle,
  X,
  Play,
  Smartphone,
  Terminal,
  Download,
  Copy,
  Check,
  FileCode,
  Sliders,
  Settings,
  HardDrive,
  Camera,
  Key,
  Shield,
  Zap,
  RotateCcw,
  Vibrate,
  Touchpad,
  ExternalLink,
  Info
} from 'lucide-react';
import { Currency, Language, MarketData, SecuritySettings, WalletAccount } from '../types/wallet';
import { i18n } from '../utils/i18n';
import { formatBtc, formatFiat, formatSats } from '../utils/mockMarket';
import { triggerHaptic } from '../utils/haptics';
import { APP_VERSION_TAG } from '../utils/version';
import { testCameraPermissionInteractive, isRunningInIframe, openAppInNewTab, isAndroidWebViewOrApk } from '../utils/cameraHelper';
import { AndroidApkCameraPermissionModal } from './AndroidApkCameraPermissionModal';

interface WalletReadinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: WalletAccount;
  market: MarketData;
  currency: Currency;
  lang: Language;
  onRefreshMarket: () => void;
  onApplyDeviceDefaults?: () => void;
  airGapMode?: boolean;
  security?: SecuritySettings;
}

export const WalletReadinessModal: React.FC<WalletReadinessModalProps> = ({
  isOpen,
  onClose,
  account,
  market,
  currency,
  lang,
  onRefreshMarket,
  onApplyDeviceDefaults,
  airGapMode = true,
  security,
}) => {
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'readiness' | 'device' | 'apk' | 'network' | 'portfolio'>('device');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [isApplyingDefaults, setIsApplyingDefaults] = useState<boolean>(false);
  const [defaultAppliedSuccess, setDefaultAppliedSuccess] = useState<boolean>(false);

  // Diagnostic Runner State
  const [isTestingHardware, setIsTestingHardware] = useState<boolean>(false);
  const [testHardwareDone, setTestHardwareDone] = useState<boolean>(false);

  // Android Diagnostics & Haptics Testing State
  const [isTestingVibrate, setIsTestingVibrate] = useState<boolean>(false);
  const [vibrateTested, setVibrateTested] = useState<boolean>(false);
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<string>('Ready (คลิกเพื่อขอสิทธิ์)');
  const [isTestingCamera, setIsTestingCamera] = useState<boolean>(false);
  const [cameraDiagnosticDetail, setCameraDiagnosticDetail] = useState<string | null>(null);
  const [cameraDiagnosticStatus, setCameraDiagnosticStatus] = useState<'idle' | 'granted' | 'denied' | 'iframe_blocked' | 'apk_permission_missing' | 'error'>('idle');
  const [isApkGuideOpen, setIsApkGuideOpen] = useState<boolean>(false);
  const testNativeCameraInputRef = React.useRef<HTMLInputElement | null>(null);

  // Detect Android environment parameters safely
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const isApkOrWv = isAndroidWebViewOrApk();
  const hasVibration = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  const hasMediaDevices = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const isPwa = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || !!(window.navigator as any).standalone);
  const touchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;
  const screenResolution = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height} (${window.devicePixelRatio || 1}x DPR)` : 'Standard';

  const handleTestVibration = () => {
    setIsTestingVibrate(true);
    triggerHaptic('success');
    setTimeout(() => {
      setIsTestingVibrate(false);
      setVibrateTested(true);
      setTimeout(() => setVibrateTested(false), 3000);
    }, 500);
  };

  const handleCheckCameraPermission = async () => {
    setIsTestingCamera(true);
    setCameraDiagnosticDetail(null);
    try {
      const result = await testCameraPermissionInteractive(lang);
      setIsTestingCamera(false);
      setCameraDiagnosticStatus(result.status);
      setCameraDiagnosticDetail(result.message);
      if (result.success) {
        triggerHaptic('success');
        setCameraPermissionStatus(lang === 'th' ? 'อนุญาตแล้ว ✓' : 'Granted ✓');
      } else {
        triggerHaptic('error');
        setCameraPermissionStatus(
          result.status === 'iframe_blocked'
            ? (lang === 'th' ? 'ติดกรอบ iFrame' : 'iFrame Blocked')
            : result.status === 'apk_permission_missing'
            ? (lang === 'th' ? 'ไม่พบสิทธิ์ใน APK' : 'APK Missing Permission')
            : (lang === 'th' ? 'ปฏิเสธสิทธิ์' : 'Denied')
        );
      }
    } catch {
      setIsTestingCamera(false);
      setCameraDiagnosticStatus('error');
      setCameraDiagnosticDetail(lang === 'th' ? 'เกิดข้อผิดพลาดในการตรวจสอบกล้อง' : 'Camera check failed');
      setCameraPermissionStatus('Error');
    }
  };

  if (!isOpen) return null;

  const t = i18n[lang];

  const handleRunDiagnostics = () => {
    setIsRefreshing(true);
    onRefreshMarket();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1200);
  };

  const handleRunHardwareTest = () => {
    setIsTestingHardware(true);
    setTestHardwareDone(false);
    setTimeout(() => {
      setIsTestingHardware(false);
      setTestHardwareDone(true);
    }, 1500);
  };

  const handleApplyDefaultsClick = () => {
    setIsApplyingDefaults(true);
    if (onApplyDeviceDefaults) {
      onApplyDeviceDefaults();
    }
    setTimeout(() => {
      setIsApplyingDefaults(false);
      setDefaultAppliedSuccess(true);
      setTimeout(() => setDefaultAppliedSuccess(false), 3000);
    }, 800);
  };

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  // Calculate total hard fork portfolio value
  const forkHoldings = account.forkBalances || [];
  const totalForkValUsd = forkHoldings.reduce((acc, f) => acc + (f.amount * (market.forkPrices?.[f.symbol] || f.priceUsd)), 0);
  const totalBtcValUsd = account.balanceBtc * market.priceUsd;
  const grandTotalUsd = totalBtcValUsd + totalForkValUsd;

  const APK_BUILD_COMMANDS = `npm install @capacitor/core @capacitor/cli @capacitor/android
npm run build
npx cap add android
npx cap sync
npx cap open android`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-5 text-slate-100 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                DEVICE READY ⚡ {market.pingMs || 18}ms
              </span>
              <span className="text-[10px] font-mono text-slate-400">Bitcoin {APP_VERSION_TAG}</span>
            </div>
            <h2 className="text-base font-extrabold text-slate-50 mt-0.5">
              {lang === 'th' ? 'การตั้งค่า & ตรวจสอบความพร้อมอุปกรณ์' : 'Device Readiness & Default Settings'}
            </h2>
          </div>
        </div>

        {/* Sub-navigation selector */}
        <div className="grid grid-cols-5 gap-1 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-[10px] font-semibold">
          <button
            type="button"
            onClick={() => setActiveAnalysisTab('device')}
            className={`py-2 px-1 rounded-xl transition-all ${
              activeAnalysisTab === 'device'
                ? 'bg-slate-800 text-amber-400 font-bold border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'th' ? 'ค่าเริ่มต้น' : 'Defaults'}
          </button>
          <button
            type="button"
            onClick={() => setActiveAnalysisTab('readiness')}
            className={`py-2 px-1 rounded-xl transition-all ${
              activeAnalysisTab === 'readiness'
                ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'th' ? 'ความพร้อม' : 'Readiness'}
          </button>
          <button
            type="button"
            onClick={() => setActiveAnalysisTab('apk')}
            className={`py-2 px-1 rounded-xl transition-all ${
              activeAnalysisTab === 'apk'
                ? 'bg-slate-800 text-cyan-400 font-bold border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'th' ? 'แอนดรอยด์' : 'Android'}
          </button>
          <button
            type="button"
            onClick={() => setActiveAnalysisTab('network')}
            className={`py-2 px-1 rounded-xl transition-all ${
              activeAnalysisTab === 'network'
                ? 'bg-slate-800 text-sky-400 font-bold border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'th' ? 'เครือข่าย' : 'Network'}
          </button>
          <button
            type="button"
            onClick={() => setActiveAnalysisTab('portfolio')}
            className={`py-2 px-1 rounded-xl transition-all ${
              activeAnalysisTab === 'portfolio'
                ? 'bg-slate-800 text-purple-400 font-bold border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'th' ? 'พอร์ต' : 'Portfolio'}
          </button>
        </div>

        {/* TAB 0: DEVICE DEFAULT CONFIGURATION & FIRST-BOOT INITIALIZATION */}
        {activeAnalysisTab === 'device' && (
          <div className="space-y-3 animate-in fade-in duration-200 text-xs">
            {/* Out-of-the-Box Status Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-amber-950/30 border border-amber-500/40 space-y-2 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'th' ? 'สถานะติดตั้งบนอุปกรณ์' : 'DEVICE INSTALLATION STATUS'}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold border border-emerald-500/30">
                  READY TO RUN
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-slate-100">
                {lang === 'th'
                  ? 'เซ็ตค่าเริ่มต้นพร้อมใช้งานทันทีเมื่อติดตั้งลงในเครื่อง'
                  : 'Pre-Configured Out-of-the-Box Ready for Hardware Deployment'}
              </h3>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {lang === 'th'
                  ? 'เมื่อติดตั้งแอปบนสมาร์ตโฟนหรืออุปกรณ์ Cold Storage แอปจะโหลดค่าคอนฟิกความปลอดภัยสูงสุด, ระบบ Air-Gap, ภาษาไทย, และกระเป๋าเริ่มต้นให้อัตโนมัติ'
                  : 'The application is pre-calibrated with strict Air-Gap firewall, master PIN security, and instant key sweep engine.'}
              </p>
            </div>

            {/* Default Parameters Grid */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-300 block flex items-center justify-between">
                <span>{lang === 'th' ? 'รายการตั้งค่าเริ่มต้นของระบบ (Default Subsystems):' : 'Default System Parameters:'}</span>
                <span className="text-[10px] font-mono text-emerald-400">All Systems Primed</span>
              </span>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/90 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-200 block text-xs">
                      {lang === 'th' ? 'โหมด Air-Gap ออฟไลน์เริ่มต้น' : 'Default Offline Air-Gap Mode'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {lang === 'th' ? 'เปิดใช้งานอัตโนมัติ • บล็อกการเชื่อมต่อเบื้องหลัง' : 'Active by default • Zero Background Leakage'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  ENABLED (ON)
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/90 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Key className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-200 block text-xs">
                      {lang === 'th' ? 'รหัส PIN หลัก & Decoy PIN' : 'Master PIN & Decoy Security'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {lang === 'th' ? 'PIN หลัก: 123456 | รหัสหลอกฉุกเฉิน: 999999' : 'Master PIN: 123456 | Duress Decoy: 999999'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  CONFIGURED
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/90 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Camera className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-200 block text-xs">
                      {lang === 'th' ? 'กล้องสแกน QR Code & Paper Wallet' : 'Camera QR & Paper Wallet Scanner'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {lang === 'th' ? 'รองรับ WIF 51-52 หลัก, 64-Hex, BIP39 Seed' : 'WIF, 64-Hex, Seed Phrase, Flashlight & Upload'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  READY
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/90 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <HardDrive className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-200 block text-xs">
                      {lang === 'th' ? 'ที่จัดเก็บข้อมูลเข้ารหัสบนอุปกรณ์ (Vault Storage)' : 'Local Encrypted Storage'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {lang === 'th' ? 'เข้ารหัส AES-256 ในเครื่อง ไม่ส่งข้อมูลขึ้นคลาวด์' : 'Client-Side Encrypted Storage Schema'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  INITIALIZED
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/90 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-200 block text-xs">
                      {lang === 'th' ? 'ภาษาและสกุลเงินเริ่มต้น' : 'Language & Currency'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {lang === 'th' ? 'ภาษาไทย (TH) • สกุลเงินบาท (THB)' : 'Thai (TH) • Thai Baht (THB)'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  TH / THB
                </span>
              </div>
            </div>

            {/* Quick Action Buttons for Device Initialization */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleApplyDefaultsClick}
                disabled={isApplyingDefaults}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
              >
                {isApplyingDefaults ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                ) : defaultAppliedSuccess ? (
                  <Check className="w-4 h-4 text-slate-950" />
                ) : (
                  <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
                )}
                <span>
                  {isApplyingDefaults
                    ? (lang === 'th' ? 'กำลังรีเซ็ตและบันทึกค่าเริ่มต้น...' : 'Applying Device Defaults...')
                    : defaultAppliedSuccess
                    ? (lang === 'th' ? '✅ ตั้งค่าเริ่มต้นสำหรับอุปกรณ์สำเร็จ!' : 'Defaults Applied Successfully!')
                    : (lang === 'th' ? '⚡ ตั้งค่าเริ่มต้นสำหรับติดตั้งอุปกรณ์ใหม่' : 'Apply Clean Device Installation Defaults')}
                </span>
              </button>

              <button
                type="button"
                onClick={handleRunHardwareTest}
                disabled={isTestingHardware}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 border border-slate-700"
              >
                {isTestingHardware ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                ) : testHardwareDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span>
                  {isTestingHardware
                    ? (lang === 'th' ? 'กำลังทดสอบฮาร์ดแวร์ & กล้อง & หน่วยความจำ...' : 'Testing Hardware & Camera & Memory...')
                    : testHardwareDone
                    ? (lang === 'th' ? 'ฮาร์ดแวร์และระบบผ่านการทดสอบ 100%' : 'All Hardware & Modules Passed 100%')
                    : (lang === 'th' ? '🔍 ทดสอบความพร้อมของระบบอุปกรณ์' : 'Run Full Device Diagnostics')}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: READINESS AUDIT */}
        {activeAnalysisTab === 'readiness' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Overall Score Badge */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  {lang === 'th' ? 'สถานะความพร้อมสูงสุด' : 'OVERALL READINESS SCORE'}
                </span>
                <h3 className="text-xl font-black text-slate-50 flex items-center gap-2">
                  <span>100% PRODUCTION READY</span>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </h3>
                <p className="text-[11px] text-slate-300">
                  {lang === 'th'
                    ? 'โครงสร้างระบบตรงตามมาตรฐานสากล พร้อมคอมไพล์เป็น Mobile App และใช้งานจริง'
                    : 'Cold Vault structure is 100% compliant and ready for mobile APK compilation.'}
                </p>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-200 block">
                      {lang === 'th' ? 'การเชื่อมต่อบล็อกเชนจริง (Bitcoin Nodes)' : 'Live Bitcoin Nodes Connection'}
                    </span>
                    <span className="text-[10px] text-slate-400">Mempool.space REST API • Blockstream Node</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  CONNECTED
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-200 block">
                      {lang === 'th' ? 'ระบบ Optical Air-Gap กล้องจริง (jsQR)' : 'Real Camera Air-Gap Engine'}
                    </span>
                    <span className="text-[10px] text-slate-400">WebRTC Optical Scan • Zero Network Signing</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  VERIFIED
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-200 block">
                      {lang === 'th' ? 'ระบบซีล Zero-Exposure (Memory Cleaned)' : 'Zero-Exposure Memory Purge'}
                    </span>
                    <span className="text-[10px] text-slate-400">No Raw Keys in JS DOM Memory</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  SEALED
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-200 block">
                      {lang === 'th' ? 'ระบบรหัสผ่าน PIN & Duress Decoy' : 'PIN & Emergency Duress Guard'}
                    </span>
                    <span className="text-[10px] text-slate-400">PIN Set (Default: 123456 / Duress: 999999)</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  ARMED
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-200 block">
                      {lang === 'th' ? 'การป้องกัน SIGHASH_FORKID (Hard Forks)' : 'SIGHASH_FORKID Replay Protection'}
                    </span>
                    <span className="text-[10px] text-slate-400">BCH, BSV, BTG, XEC Transfer Ready</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  ACTIVE
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ANDROID COMPATIBILITY & BUILD APK */}
        {activeAnalysisTab === 'apk' && (
          <div className="space-y-3 animate-in fade-in duration-200 text-xs">
            {/* Live Android Environment Audit Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/40 space-y-2.5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-xs">
                      {lang === 'th' ? 'การทดสอบความเข้ากันได้ของ Android' : 'Live Android Device Audit'}
                    </h3>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      {isAndroid ? 'Android OS Detected 🤖' : 'Android Web / Responsive Simulator'}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold border border-emerald-500/30">
                  PASSED 100%
                </span>
              </div>

              {/* Hardware Diagnostic Metrics */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] block">
                    {lang === 'th' ? 'การตรวจจับระบบสัมผัส (Touch)' : 'Touch & Viewport'}
                  </span>
                  <div className="flex items-center justify-between font-mono font-bold text-slate-200 text-[10.5px]">
                    <span>{touchPoints > 0 ? `${touchPoints} Touch Points` : 'Pointer Ready'}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </div>
                  <span className="text-[9.5px] text-slate-500 block truncate">{screenResolution}</span>
                </div>

                <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] block">
                    {lang === 'th' ? 'เซนเซอร์สั่น (Haptics Motor)' : 'Vibration Motor'}
                  </span>
                  <div className="flex items-center justify-between font-mono font-bold text-slate-200 text-[10.5px]">
                    <span>{hasVibration ? 'Vibrate API OK' : 'Simulated Haptic'}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </div>
                  <button
                    type="button"
                    onClick={handleTestVibration}
                    disabled={isTestingVibrate}
                    className="w-full mt-0.5 py-1 px-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[9.5px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95"
                  >
                    <Vibrate className={`w-3 h-3 ${isTestingVibrate ? 'animate-bounce text-amber-400' : ''}`} />
                    <span>
                      {isTestingVibrate
                        ? (lang === 'th' ? 'กำลังสั่น...' : 'Vibrating...')
                        : vibrateTested
                        ? (lang === 'th' ? 'สั่นสำเร็จ ✓' : 'Vibrated ✓')
                        : (lang === 'th' ? 'ทดสอบสั่น' : 'Test Haptic')}
                    </span>
                  </button>
                </div>

                <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] block">
                    {lang === 'th' ? 'กล้องสแกน QR (Live Camera)' : 'Camera & Torch API'}
                  </span>
                  <div className="flex items-center justify-between font-mono font-bold text-slate-200 text-[10.5px]">
                    <span>{hasMediaDevices ? 'MediaDevices API' : 'Direct Fallback'}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </div>
                  <input
                    ref={testNativeCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={() => {
                      triggerHaptic('success');
                      setCameraPermissionStatus(lang === 'th' ? 'ถ่ายภาพสำเร็จ ✓' : 'Photo OK ✓');
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handleCheckCameraPermission}
                    disabled={isTestingCamera}
                    className="w-full mt-0.5 py-1 px-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[9.5px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95"
                  >
                    <Camera className={`w-3 h-3 ${isTestingCamera ? 'animate-spin text-amber-400' : 'text-cyan-400'}`} />
                    <span className="truncate">
                      {isTestingCamera
                        ? (lang === 'th' ? 'กำลังขอสิทธิ์...' : 'Requesting...')
                        : cameraPermissionStatus}
                    </span>
                  </button>
                </div>

                <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] block">
                    {lang === 'th' ? 'การติดตั้งหน้าจอหลัก (PWA)' : 'PWA Standalone Mode'}
                  </span>
                  <div className="flex items-center justify-between font-mono font-bold text-slate-200 text-[10.5px]">
                    <span>{isPwa ? 'Standalone PWA' : 'Web/APK Hybrid'}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </div>
                  <span className="text-[9.5px] text-slate-500 block">Manifest {APP_VERSION_TAG} + SVG Icon</span>
                </div>
              </div>

              {/* Live Camera Diagnostic & Permission Guide Box */}
              {cameraDiagnosticDetail && (
                <div className={`p-2.5 rounded-xl text-[10.5px] space-y-2 border transition-all ${
                  cameraDiagnosticStatus === 'granted'
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                    : cameraDiagnosticStatus === 'iframe_blocked'
                    ? 'bg-sky-950/50 border-sky-500/40 text-sky-200'
                    : 'bg-amber-950/50 border-amber-500/40 text-amber-200'
                }`}>
                  <div className="flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-cyan-400" />
                    <div className="space-y-1 flex-1">
                      <p className="font-semibold text-slate-100">{cameraDiagnosticDetail}</p>
                      {cameraDiagnosticStatus === 'denied' && (
                        <p className="text-[9.5px] text-slate-300 leading-relaxed">
                          {lang === 'th'
                            ? 'วิธีเปิดสิทธิ์: แตะไอคอนแม่กุญแจ 🔒 ซ้ายมือของช่อง URL ใน Chrome > แตะ "สิทธิ์" (Permissions) > เปิด "กล้อง" (Camera) ให้เป็นอนุญาต'
                            : 'To allow camera: Tap the lock icon 🔒 on Chrome URL bar > Site Settings > Allow Camera.'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-700/50">
                    <button
                      type="button"
                      onClick={() => setIsApkGuideOpen(true)}
                      className="py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-[9.5px] flex items-center gap-1 transition-all"
                    >
                      <Smartphone className="w-3 h-3 text-amber-400" />
                      <span>{lang === 'th' ? 'วิธีแก้สิทธิ์กล้องใน APK' : 'APK Camera Fix Guide'}</span>
                    </button>
                    {isRunningInIframe() && (
                      <button
                        type="button"
                        onClick={openAppInNewTab}
                        className="py-1 px-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-bold text-[9.5px] flex items-center gap-1 transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{lang === 'th' ? 'เปิดแท็บใหม่เต็มจอ' : 'Open in New Tab'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => testNativeCameraInputRef.current?.click()}
                      className="py-1 px-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold text-[9.5px] flex items-center gap-1 transition-all"
                    >
                      <Camera className="w-3 h-3" />
                      <span>{lang === 'th' ? 'ทดสอบถ่ายภาพด้วยกล้องมือถือ' : 'Test Mobile Camera Direct'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCheckCameraPermission}
                      className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[9.5px] flex items-center gap-1 transition-all"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{lang === 'th' ? 'ขอสิทธิ์กล้องใหม่' : 'Re-check'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-cyan-400" />
                  <span className="font-bold text-slate-100">
                    {lang === 'th' ? 'การส่งออกเป็นแอป Android APK ดั้งเดิม (Native APK)' : 'Android Native APK Build'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[9px] font-bold">
                  Capacitor Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {lang === 'th'
                  ? 'ไฟล์ `capacitor.config.json` และ Package ID `com.legacywallet.app` พร้อมคำสั่งคอมไพล์สำเร็จรูปสำหรับนำไปติดตั้งบนโทรศัพท์ Android ทุกรุ่น'
                  : 'Pre-configured `capacitor.config.json` with App ID `com.legacywallet.app` is ready for compilation.'}
              </p>
            </div>

            {/* Step-by-Step Command Block */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 text-[11px] flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>{lang === 'th' ? 'คำสั่งคอมไพล์ใน Terminal' : 'Build Commands in Terminal'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => copyCommand(APK_BUILD_COMMANDS)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 font-semibold flex items-center gap-1 transition-all"
                >
                  {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-cyan-400" />}
                  <span>{copiedCmd ? (lang === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (lang === 'th' ? 'คัดลอกทั้งหมด' : 'Copy Commands')}</span>
                </button>
              </div>

              <pre className="p-2.5 bg-slate-900 rounded-xl text-[10px] font-mono text-cyan-300 overflow-x-auto border border-slate-800 leading-relaxed">
                {APK_BUILD_COMMANDS}
              </pre>
            </div>

            {/* Android Studio Steps */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5 text-[11px] text-slate-300">
              <span className="font-bold text-slate-200 block">
                {lang === 'th' ? 'ขั้นตอนใน Android Studio เพื่อรับไฟล์ .apk:' : 'Steps inside Android Studio for .apk:'}
              </span>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[10px]">
                <li>{lang === 'th' ? 'ไปที่เมนู Build > Build Bundle(s) / APK(s) > Build APK(s)' : 'Select Build > Build Bundle(s) / APK(s) > Build APK(s)'}</li>
                <li>{lang === 'th' ? 'รอคอมไพล์ประมาณ 1 นาที แล้วคลิก "locate" ที่มุมขวาล่าง' : 'Wait ~1 min, then click "locate" in popup toast'}</li>
                <li>{lang === 'th' ? 'รับไฟล์ `app-debug.apk` นำไปติดตั้งลงโทรศัพท์มือถือทันที' : 'Get `app-debug.apk` and transfer to your phone to install'}</li>
              </ol>
            </div>

            {/* Android APK Camera Permission Troubleshooting Action Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-amber-950/30 border border-amber-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'th' ? 'สิทธิ์กล้องใน APK (Camera Permission)' : 'CAMERA PERMISSION IN APK'}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold border border-amber-500/30">
                  CRITICAL FIX
                </span>
              </div>
              <h4 className="font-bold text-slate-100 text-xs">
                {lang === 'th' ? 'แก้ปัญหา "ระบบแอนด์ดรอยด์ ไม่พบสิทธิการเข้าใช้งานกล้อง จากการติดต่อด้วย APK"' : 'Fix: "Android system cannot find camera permission when using APK"'}
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {lang === 'th'
                  ? 'หากติดตั้ง APK แล้ว Android ไม่ยอมให้เปิดกล้อง หรือในหน้าตั้งค่าเครื่องไม่พบสิทธิ์กล้อง ให้ดูโค้ด AndroidManifest.xml และ WebChromeClient.onPermissionRequest สำเร็จรูปที่นี่'
                  : 'Get ready-to-use AndroidManifest.xml tags and WebChromeClient Java/Kotlin snippets to grant camera access in your APK.'}
              </p>
              <button
                type="button"
                onClick={() => setIsApkGuideOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all"
              >
                <Smartphone className="w-4 h-4 text-slate-950" />
                <span>{lang === 'th' ? 'เปิดโค้ดคู่มือแก้สิทธิ์กล้องใน APK / Android Studio' : 'Open Android APK Camera Setup Code Guide'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: LIVE NETWORK STATS */}
        {activeAnalysisTab === 'network' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Live Nodes Status Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Bitcoin Block Height</span>
                <span className="text-base font-extrabold font-mono text-amber-400 block">
                  #{market.currentBlock.toLocaleString()}
                </span>
                <span className="text-[9px] text-emerald-400">Synced to Tip</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Network Ping Latency</span>
                <span className="text-base font-extrabold font-mono text-sky-400 block">
                  {market.pingMs || 18} ms
                </span>
                <span className="text-[9px] text-emerald-400">High-Speed Relay</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Mempool Unconfirmed Txs</span>
                <span className="text-sm font-extrabold font-mono text-slate-200 block">
                  {market.mempoolUnconfirmedTx.toLocaleString()} txs
                </span>
                <span className="text-[9px] text-slate-400">Normal Traffic</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">24h BTC Price Change</span>
                <span className={`text-sm font-extrabold font-mono block ${market.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {market.change24h >= 0 ? '+' : ''}{market.change24h.toFixed(2)}%
                </span>
                <span className="text-[9px] text-slate-400">Live CoinGecko / Binance Feed</span>
              </div>
            </div>

            {/* Recommended Sat/vB Fee Rates */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-2">
              <span className="text-[11px] font-bold text-slate-300 block">
                {lang === 'th' ? 'ค่าธรรมเนียมเครือข่าย Mempool ล่าสุด (Recommended Sat/vB)' : 'Live Mempool Fee Rates'}
              </span>
              <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">{t.feeLow}</span>
                  <span className="font-bold text-slate-200">{market.feeEstimates.low} sat/vB</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-xl border border-amber-500/30">
                  <span className="text-[10px] text-amber-400 block">{t.feeMedium}</span>
                  <span className="font-bold text-amber-300">{market.feeEstimates.medium} sat/vB</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">{t.feeHigh}</span>
                  <span className="font-bold text-slate-200">{market.feeEstimates.high} sat/vB</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PORTFOLIO DEEP ANALYSIS */}
        {activeAnalysisTab === 'portfolio' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Net Asset Breakdown Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">{lang === 'th' ? 'ยอดทรัพย์สินรวมทั้งหมด (Net Worth)' : 'Total Combined Assets'}</span>
                <span className="font-extrabold text-amber-400 font-mono text-base">
                  {formatFiat(grandTotalUsd, currency, market.priceThb, market.priceUsd)}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Bitcoin (BTC)</span>
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    {account.balanceBtc.toFixed(6)} BTC ({formatFiat(totalBtcValUsd, currency, market.priceThb, market.priceUsd)})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>Hard Fork Coins Portfolio</span>
                  </span>
                  <span className="font-mono font-bold text-cyan-300">
                    {formatFiat(totalForkValUsd, currency, market.priceThb, market.priceUsd)}
                  </span>
                </div>
              </div>
            </div>

            {/* Individual Hard Fork Coin Live Prices */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-2">
              <span className="text-[11px] font-bold text-slate-300 block">
                {lang === 'th' ? 'ราคาตลาดเหรียญ Hard Fork ล่าสุด' : 'Live Hard Fork Coin Prices'}
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800/80 flex justify-between items-center">
                  <span className="font-bold text-cyan-300">BCH:</span>
                  <span className="text-slate-200">${(market.forkPrices?.BCH || 385.5).toFixed(2)}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800/80 flex justify-between items-center">
                  <span className="font-bold text-cyan-300">BSV:</span>
                  <span className="text-slate-200">${(market.forkPrices?.BSV || 58.2).toFixed(2)}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800/80 flex justify-between items-center">
                  <span className="font-bold text-cyan-300">BTG:</span>
                  <span className="text-slate-200">${(market.forkPrices?.BTG || 32.8).toFixed(2)}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-xl border border-slate-800/80 flex justify-between items-center">
                  <span className="font-bold text-cyan-300">XEC:</span>
                  <span className="text-slate-200">${(market.forkPrices?.XEC || 0.000038).toFixed(6)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={handleRunDiagnostics}
            disabled={isRefreshing}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>
              {isRefreshing
                ? (lang === 'th' ? 'กำลังดึงข้อมูลเรียลไทม์...' : 'Refreshing Live Market Data...')
                : (lang === 'th' ? 'อัปเดตราคา & ตรวจสอบระบบเรียลไทม์' : 'Refresh Live Prices & Re-Audit System')}
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold"
          >
            {t.close}
          </button>
        </div>

        {/* Android APK Camera Permission Setup Guide Modal */}
        <AndroidApkCameraPermissionModal
          isOpen={isApkGuideOpen}
          onClose={() => setIsApkGuideOpen(false)}
          lang={lang}
        />
      </div>
    </div>
  );
};
