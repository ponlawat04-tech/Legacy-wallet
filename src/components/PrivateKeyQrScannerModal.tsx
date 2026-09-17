import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  QrCode,
  ShieldCheck,
  Zap,
  Key,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  SwitchCamera,
  Upload,
  Layers,
  Search,
  ArrowRight,
  X,
  Flashlight,
  FileText,
  Radio,
  CheckCircle2,
  Cpu,
  Wallet,
  ExternalLink,
  HelpCircle,
  Clipboard
} from 'lucide-react';
import jsQR from 'jsqr';
import { Language, Currency } from '../types/wallet';
import { detectKeyType, scanLegacyKeyAndForks } from '../utils/legacyForkScanner';
import { acquireCameraStream, isRunningInIframe, openAppInNewTab, isAndroidWebViewOrApk } from '../utils/cameraHelper';
import { AndroidApkCameraPermissionModal } from './AndroidApkCameraPermissionModal';
import { cleanAndNormalizeKeyString, readClipboardSafely } from '../utils/clipboard';

export type KeyTypeDetection = ReturnType<typeof detectKeyType>;

interface PrivateKeyQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSelectKeyForSweep?: (key: string) => void;
  onSelectKeyForImport?: (key: string) => void;
}

export const PrivateKeyQrScannerModal: React.FC<PrivateKeyQrScannerModalProps> = ({
  isOpen,
  onClose,
  lang,
  onSelectKeyForSweep,
  onSelectKeyForImport,
}) => {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isApkGuideOpen, setIsApkGuideOpen] = useState<boolean>(false);

  const [scannedRaw, setScannedRaw] = useState<string | null>(null);
  const [keyInfo, setKeyInfo] = useState<KeyTypeDetection | null>(null);
  const [showKeySecret, setShowKeySecret] = useState<boolean>(false);
  const [derivedPreview, setDerivedPreview] = useState<{
    legacy?: string;
    segwit?: string;
    nativeSegwit?: string;
    taproot?: string;
  } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Manual fallback paste/input
  const [manualInputOpen, setManualInputOpen] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraShutterInputRef = useRef<HTMLInputElement | null>(null);

  // Clean key strings (e.g. from bitcoin: URIs, quotes, 0x prefixes, or spaces)
  const cleanExtractedKey = (raw: string): string => {
    if (!raw) return '';
    let clean = raw.trim();
    if (clean.startsWith('bitcoin:') || clean.startsWith('ethereum:') || clean.startsWith('solana:')) {
      // Check for uri parameters like ?key= or path
      if (clean.includes('key=')) {
        const match = clean.match(/key=([^&]+)/);
        if (match && match[1]) clean = decodeURIComponent(match[1]);
      } else if (clean.includes('privkey=')) {
        const match = clean.match(/privkey=([^&]+)/);
        if (match && match[1]) clean = decodeURIComponent(match[1]);
      } else {
        const afterScheme = clean.split(':')[1] || '';
        clean = afterScheme.split('?')[0].trim();
      }
    }
    return cleanAndNormalizeKeyString(clean);
  };

  const handleDirectPaste = async () => {
    const result = await readClipboardSafely();
    if (result.text) {
      const cleaned = cleanExtractedKey(result.text);
      if (cleaned) {
        setManualText(cleaned);
        processDecodedString(cleaned);
      }
    } else {
      // If clipboard read is restricted, open manual input so user can tap and paste
      setManualInputOpen(true);
    }
  };

  const processDecodedString = (text: string) => {
    const cleaned = cleanExtractedKey(text);
    setScannedRaw(cleaned);

    const detected = detectKeyType(cleaned);
    setKeyInfo(detected);

    if (detected.isValid) {
      scanLegacyKeyAndForks(cleaned, { BCH: 0, BSV: 0, BTG: 0, XEC: 0 }, 0)
        .then((res) => {
          const legacy = res.btcAddresses.find((a) => a.format === 'legacy_p2pkh')?.address;
          const segwit = res.btcAddresses.find((a) => a.format === 'nested_p2sh')?.address;
          const nativeSegwit = res.btcAddresses.find((a) => a.format === 'native_segwit')?.address;
          const taproot = res.btcAddresses.find((a) => a.format === 'taproot')?.address;
          setDerivedPreview({
            legacy,
            segwit,
            nativeSegwit,
            taproot,
          });
        })
        .catch(() => {
          setDerivedPreview(null);
        });
    } else {
      setDerivedPreview(null);
    }

    // Stop camera stream once QR is captured
    stopCamera();
  };

  // Camera Management
  const startCamera = async () => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          lang === 'th'
            ? 'เบราว์เซอร์ไม่รองรับการเปิดกล้องสด (แนะนำให้ใช้ปุ่ม "ถ่ายภาพด้วยกล้องมือถือ")'
            : 'Live camera streaming is not supported. Please use "Camera Photo" capture.'
        );
        return;
      }

      const stream = await acquireCameraStream(cameraFacing);
      streamRef.current = stream;

      // Check for torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities: any = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        if (capabilities.torch) {
          setHasTorch(true);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play();
        setIsCameraActive(true);
        startScanningLoop();
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setIsCameraActive(false);
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      const inIframe = isRunningInIframe();
      const inApk = isAndroidWebViewOrApk();

      if (isDenied) {
        if (inApk) {
          setCameraError(
            lang === 'th'
              ? 'ระบบแอนด์ดรอยด์ไม่พบสิทธิ์การเข้าใช้งานกล้องจาก APK (ต้องประกาศใน AndroidManifest.xml และตั้งค่า WebChromeClient.onPermissionRequest ใน MainActivity)'
              : 'Android system did not find camera permission in APK. Requires AndroidManifest.xml declaration and WebChromeClient.onPermissionRequest.'
          );
        } else if (inIframe) {
          setCameraError(
            lang === 'th'
              ? 'ระบบพรีวิว iFrame จำกัดการเข้าถึงกล้อง (แตะ "เปิดในแท็บใหม่" เพื่อเปิดกล้องสดบน Chrome หรือใช้ปุ่ม "ถ่ายภาพด้วยกล้องมือถือ")'
              : 'Camera blocked by iFrame preview policy. Open in a new tab or use "Direct Camera Photo".'
          );
        } else {
          setCameraError(
            lang === 'th'
              ? 'สิทธิ์กล้องถูกปฏิเสธ (โปรดแตะไอคอนแม่กุญแจ 🔒 ที่แถบที่อยู่ URL ด้านบน > เลือก "สิทธิ์" > อนุญาตกล้อง หรือใช้ปุ่ม "ถ่ายภาพด้วยกล้องมือถือ")'
              : 'Camera permission denied. Tap lock icon 🔒 in browser URL bar to allow camera, or use "Camera Photo".'
          );
        }
      } else {
        setCameraError(
          lang === 'th'
            ? `ไม่สามารถเปิดกล้องได้: ${err?.message || 'อุปกรณ์ไม่พร้อมใช้งาน'} (สามารถใช้ปุ่ม "ถ่ายภาพด้วยกล้องมือถือ" หรืออัปโหลดภาพได้ทันที)`
            : `Unable to access camera: ${err?.message || 'Device unavailable'}. Please use "Camera Photo" or file upload.`
        );
      }
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {
        // ignore
      }
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && (track as any).applyConstraints) {
      try {
        const newState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: newState }],
        });
        setIsTorchOn(newState);
      } catch (e) {
        console.warn('Torch toggle failed:', e);
      }
    }
  };

  const toggleCameraFacing = () => {
    const next = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(next);
  };

  const startScanningLoop = () => {
    const tick = () => {
      if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data && code.data.trim().length > 0) {
          processDecodedString(code.data);
          return; // Stop animation loop
        }
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  };

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          processDecodedString(code.data);
        } else {
          alert(
            lang === 'th'
              ? 'ไม่พบ QR Code ในภาพที่เลือก กรุณาตรวจสอบว่าภาพมีความชัดเจน'
              : 'No QR code found in selected image. Please ensure good lighting and contrast.'
          );
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  useEffect(() => {
    if (isOpen) {
      setScannedRaw(null);
      setKeyInfo(null);
      setShowKeySecret(false);
      setDerivedPreview(null);
      setManualInputOpen(false);
      setManualText('');
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, cameraFacing]);

  if (!isOpen) return null;

  const handleCopyKey = () => {
    if (!scannedRaw) return;
    navigator.clipboard.writeText(scannedRaw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetScanner = () => {
    setScannedRaw(null);
    setKeyInfo(null);
    setShowKeySecret(false);
    setDerivedPreview(null);
    startCamera();
  };

  const handleManualSubmit = () => {
    if (!manualText.trim()) return;
    processDecodedString(manualText.trim());
    setManualInputOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      id="private-key-qr-scanner-modal"
    >
      <div className="w-full max-w-lg max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between gap-3 shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-purple-500/20 shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-50 flex items-center gap-1.5">
                  <span>{lang === 'th' ? 'สแกน QR Code Private Key' : 'Scan Private Key QR'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[9px] font-bold border border-purple-500/30">
                    Air-Gap Safe
                  </span>
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {lang === 'th'
                  ? 'สแกน Paper Wallet, WIF, 64-Hex, หรือ Seed 12/24 คำ จากกล้องหรือภาพ'
                  : 'Scan paper wallets, WIF keys, 64-hex strings, or 12/24 seed phrases'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsApkGuideOpen(true)}
              className="px-2 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1 transition-all"
              title="Android APK Camera Permission Guide"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{lang === 'th' ? 'คู่มือสิทธิ์กล้อง APK' : 'APK Camera Help'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
              title="Close scanner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {/* Zero-Exposure Sandbox Alert */}
          <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/30 p-3 flex items-center gap-2.5 text-xs text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] leading-tight">
              {lang === 'th'
                ? 'การสแกนและคำนวณรหัสเกิดขึ้นในหน่วยความจำเครื่องเท่านั้น (100% Client-Side) ปลอดภัยไร้การรั่วไหล'
                : '100% local client-side memory processing. Private keys are never transmitted online.'}
            </span>
          </div>

          {/* Camera Viewfinder & Video Canvas (Shown when no key scanned yet) */}
          {!scannedRaw ? (
            <div className="space-y-3">
              <div className="relative w-full aspect-square sm:aspect-[4/3] rounded-3xl bg-slate-950 border-2 border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
                {/* Hidden canvas for jsQR analysis */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Live Video element */}
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
                  autoPlay
                  muted
                  playsInline
                />

                {/* Viewfinder Overlays */}
                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                    {/* Corner Guides */}
                    <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-purple-500/40 rounded-3xl">
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-purple-400 rounded-tl-xl" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-purple-400 rounded-tr-xl" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-purple-400 rounded-bl-xl" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-purple-400 rounded-br-xl" />

                      {/* Animated Laser Scanning Line */}
                      <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_12px_rgba(168,85,247,0.9)] animate-bounce duration-1000 top-1/2" />
                    </div>
                  </div>
                )}

                {/* Camera Inactive / Error Fallback */}
                {!isCameraActive && (
                  <div className="p-5 text-center space-y-3 max-w-sm">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">
                        {lang === 'th' ? 'กล้องสดไม่พร้อมใช้งาน' : 'Camera Inactive'}
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        {cameraError || (lang === 'th' ? 'กรุณากดเปิดกล้องสด หรือใช้ปุ่มถ่ายภาพด้วยกล้องมือถือ' : 'Please start camera or use direct camera photo.')}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      {/* Direct Android Native Camera Photo Shutter */}
                      <button
                        type="button"
                        onClick={() => cameraShutterInputRef.current?.click()}
                        className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                      >
                        <Camera className="w-4 h-4" />
                        <span>{lang === 'th' ? 'ถ่ายภาพด้วยกล้องมือถือ (Native Direct)' : 'Take Photo with Mobile Camera'}</span>
                      </button>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="flex-1 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all active:scale-95"
                        >
                          {lang === 'th' ? 'ลองเปิดกล้องสดใหม่' : 'Retry Live Camera'}
                        </button>

                        {isRunningInIframe() && (
                          <button
                            type="button"
                            onClick={openAppInNewTab}
                            className="py-2 px-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-semibold flex items-center gap-1 transition-all active:scale-95"
                            title="Open in new window to grant Android camera permission"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{lang === 'th' ? 'เปิดแท็บใหม่' : 'New Tab'}</span>
                          </button>
                        )}
                      </div>

                      {/* APK Camera Permission Help Shortcut */}
                      <button
                        type="button"
                        onClick={() => setIsApkGuideOpen(true)}
                        className="w-full py-2 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span>{lang === 'th' ? '📱 ติดปัญหาไม่พบสิทธิ์กล้องใน APK? ดูวิธีแก้' : '📱 APK Camera Permission Fix Guide'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Top Controls Overlay on Viewfinder */}
                {isCameraActive && (
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    {hasTorch && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2 rounded-xl border backdrop-blur-md transition-all ${
                          isTorchOn
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/40'
                            : 'bg-black/60 text-slate-200 border-white/20 hover:bg-black/80'
                        }`}
                        title="Toggle Flashlight"
                      >
                        <Flashlight className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="p-2 rounded-xl bg-black/60 hover:bg-black/80 border border-white/20 text-slate-200 backdrop-blur-md transition-all"
                      title="Switch Camera (Front/Back)"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <input
                ref={cameraShutterInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />

              {/* Bottom Quick Action Triggers (4 Options including Instant Paste) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handleDirectPaste}
                  className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/40 hover:to-indigo-600/40 border border-purple-500/50 text-purple-200 text-[11px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md text-center"
                  title={lang === 'th' ? 'กดวาง Private Key จากคลิปบอร์ดทันที' : 'Instant Paste Key from Clipboard'}
                >
                  <Clipboard className="w-4 h-4 text-purple-300 shrink-0" />
                  <span className="truncate">{lang === 'th' ? '📋 กดวาง Key' : '📋 Paste Key'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => cameraShutterInputRef.current?.click()}
                  className="p-2.5 sm:p-3 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-[11px] sm:text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md text-center"
                >
                  <Camera className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="truncate">{lang === 'th' ? 'ถ่ายภาพกล้อง' : 'Camera Photo'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 sm:p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] sm:text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md text-center"
                >
                  <Upload className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="truncate">{lang === 'th' ? 'อัปโหลดภาพ' : 'Upload QR'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setManualInputOpen(!manualInputOpen)}
                  className={`p-2.5 sm:p-3 rounded-2xl border text-[11px] sm:text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md text-center ${
                    manualInputOpen
                      ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-200'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate">{lang === 'th' ? 'พิมพ์ข้อความ' : 'Manual Input'}</span>
                </button>
              </div>

              {/* Manual Input Dropdown */}
              {manualInputOpen && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300">
                      {lang === 'th' ? 'วาง Private Key หรือ Seed Phrase โดยตรง' : 'Paste Private Key or Seed Phrase'}
                    </label>
                    <button
                      type="button"
                      onClick={handleDirectPaste}
                      className="px-2 py-0.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-bold text-[10.5px] border border-purple-500/40 flex items-center gap-1 transition-all active:scale-95"
                    >
                      <Clipboard className="w-3 h-3 text-purple-300" />
                      <span>{lang === 'th' ? '📋 กดวาง' : '📋 Paste'}</span>
                    </button>
                  </div>
                  <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      if (pasted) {
                        e.preventDefault();
                        const cleaned = cleanExtractedKey(pasted);
                        setManualText(cleaned);
                        processDecodedString(cleaned);
                      }
                    }}
                    placeholder="WIF (5/K/L...), 64-Hex, or 12/24 words..."
                    rows={2}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleManualSubmit}
                    disabled={!manualText.trim()}
                    className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-slate-950 font-bold text-xs transition-all"
                  >
                    {lang === 'th' ? 'ประมวลผลกุญแจ' : 'Process Key'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Scanned Key Result Panel */
            <div className="space-y-4 animate-in zoom-in-95 duration-200">
              <div className="p-4 rounded-3xl bg-slate-950 border border-purple-500/40 shadow-xl space-y-3">
                {/* Result Top Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-100 block">
                        {lang === 'th' ? 'ตรวจพบ Private Key สำเร็จ' : 'Private Key Successfully Decoded'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Format: <strong className="text-purple-300">{keyInfo?.label || 'Custom Key'}</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetScanner}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-700"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'สแกนใหม่' : 'Rescan'}</span>
                  </button>
                </div>

                {/* Key String Box */}
                <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Key className="w-3 h-3 text-purple-400" />
                      <span>{lang === 'th' ? 'ค่ากุญแจที่ถอดรหัสได้' : 'Decoded Secret Key'}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowKeySecret(!showKeySecret)}
                        className="text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] flex items-center gap-1"
                      >
                        {showKeySecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showKeySecret ? (lang === 'th' ? 'ซ่อน' : 'Hide') : (lang === 'th' ? 'แสดง' : 'Show')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        className="text-slate-400 hover:text-purple-300 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] flex items-center gap-1"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs font-mono text-purple-200 break-all select-all font-semibold">
                    {showKeySecret ? scannedRaw : '••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                  </p>
                </div>

                {/* Derived Bitcoin Addresses Preview */}
                {derivedPreview && (
                  <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2 text-xs">
                    <span className="text-[11px] font-bold text-slate-300 block">
                      {lang === 'th' ? 'ที่อยู่ Bitcoin ที่คำนวณได้ (Derived Addresses)' : 'Derived Bitcoin Public Addresses'}
                    </span>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      {derivedPreview.nativeSegwit && (
                        <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl">
                          <span className="text-slate-400">Native SegWit (bc1q):</span>
                          <span className="text-amber-400 font-bold truncate max-w-[170px] sm:max-w-[220px]">
                            {derivedPreview.nativeSegwit}
                          </span>
                        </div>
                      )}
                      {derivedPreview.legacy && (
                        <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl">
                          <span className="text-slate-400">Legacy (1...):</span>
                          <span className="text-slate-300 truncate max-w-[170px] sm:max-w-[220px]">
                            {derivedPreview.legacy}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: Sweep or Import */}
              <div className="space-y-2 pt-1">
                {onSelectKeyForSweep && (
                  <button
                    type="button"
                    onClick={() => {
                      if (scannedRaw) {
                        onSelectKeyForSweep(scannedRaw);
                        onClose();
                      }
                    }}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-98"
                  >
                    <Search className="w-4 h-4" />
                    <span>
                      {lang === 'th'
                        ? 'สแกนยอด & กวาดเหรียญเก่า (Sweep BTC & Hard Forks)'
                        : 'Sweep BTC & Claim Hard Forks'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {onSelectKeyForImport && (
                  <button
                    type="button"
                    onClick={() => {
                      if (scannedRaw) {
                        onSelectKeyForImport(scannedRaw);
                        onClose();
                      }
                    }}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all active:scale-98"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>
                      {lang === 'th'
                        ? 'นำเข้าเป็นกระเป๋าถาวร (Import into Secure Vault)'
                        : 'Import as Permanent Vault Wallet'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
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
