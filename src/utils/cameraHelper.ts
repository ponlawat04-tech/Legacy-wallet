/**
 * Camera Utility & Android Permissions Diagnostic Helper
 * Provides robust camera streaming with tiered fallbacks and iframe sandbox detection
 */

export interface CameraTestResult {
  success: boolean;
  status: 'granted' | 'denied' | 'not_supported' | 'iframe_blocked' | 'apk_permission_missing' | 'error';
  message: string;
  isIframe: boolean;
  isAndroid: boolean;
  isAndroidApkOrWebView: boolean;
}

export function isAndroidEnvironment(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
}

export function isAndroidWebViewOrApk(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  if (!isAndroid) return false;

  // Common indicators of WebView or APK wrappers:
  // 1. 'wv' in userAgent (Chrome WebView)
  // 2. 'Version/X.X Chrome/...' where Version is present (Android WebView default)
  // 3. window.Capacitor, window.Android, window.cordova
  const hasWv = /wv|Android.*Version\/[\d.]+/i.test(ua);
  const hasNativeBridge = typeof window !== 'undefined' && (
    !!(window as any).Capacitor || 
    !!(window as any).Android || 
    !!(window as any).cordova ||
    !!(window as any).flutter_inappwebview
  );
  return hasWv || hasNativeBridge;
}

export function isRunningInIframe(): boolean {

  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

export function openAppInNewTab(): void {
  if (typeof window !== 'undefined') {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Tiered Camera Stream Constraints for Android, iOS, and Desktop
 */
export function getCameraConstraints(facing: 'environment' | 'user' = 'environment'): MediaStreamConstraints[] {
  return [
    {
      video: {
        facingMode: { ideal: facing },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    },
    {
      video: {
        facingMode: { ideal: facing },
      },
      audio: false,
    },
    {
      video: {
        facingMode: facing,
      },
      audio: false,
    },
    {
      video: true,
      audio: false,
    },
  ];
}

/**
 * Attempts to request live camera stream with full fallback tiers
 */
export async function acquireCameraStream(facing: 'environment' | 'user' = 'environment'): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('NOT_SUPPORTED');
  }

  const constraintTiers = getCameraConstraints(facing);
  let lastError: any = null;

  for (const constraints of constraintTiers) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (stream) return stream;
    } catch (err: any) {
      lastError = err;
      // If user specifically clicked Deny in Android prompt, break immediately
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        break;
      }
    }
  }

  throw lastError || new Error('UNKNOWN_CAMERA_ERROR');
}

/**
 * Interactively tests camera permission on Android and returns detailed status
 */
export async function testCameraPermissionInteractive(lang: 'th' | 'en' = 'th'): Promise<CameraTestResult> {
  const inIframe = isRunningInIframe();
  const isAndroid = isAndroidEnvironment();
  const isApkOrWv = isAndroidWebViewOrApk();

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return {
      success: false,
      status: 'not_supported',
      message: lang === 'th' 
        ? 'เบราว์เซอร์หรือสภาพแวดล้อมนี้ไม่รองรับ WebRTC MediaDevices API (สามารถใช้ปุ่ม "ถ่ายภาพด้วยกล้องมือถือ Native Direct" แทนได้ทันที)'
        : 'WebRTC MediaDevices API is not supported in this browser. Please use Native Camera Photo capture.',
      isIframe: inIframe,
      isAndroid,
      isAndroidApkOrWebView: isApkOrWv,
    };
  }

  try {
    const stream = await acquireCameraStream('environment');
    // Successfully acquired! Stop tracks immediately so camera light turns off
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        // ignore
      }
    });

    return {
      success: true,
      status: 'granted',
      message: lang === 'th'
        ? 'อนุญาตสิทธิ์กล้องแล้ว (พร้อมใช้งานกล้องสดสแกน QR Code 100%)'
        : 'Camera permission granted and ready for live QR scanning.',
      isIframe: inIframe,
      isAndroid,
      isAndroidApkOrWebView: isApkOrWv,
    };
  } catch (err: any) {
    const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
    const isOverconstrained = err?.name === 'OverconstrainedError';

    if (isDenied) {
      if (inIframe) {
        return {
          success: false,
          status: 'iframe_blocked',
          message: lang === 'th'
            ? 'ถูกจำกัดสิทธิ์โดยกรอบพรีวิว iFrame (แตะ "เปิดในแท็บใหม่" เพื่อเปิดกล้องสดบน Chrome หรือใช้ปุ่ม "ถ่ายภาพด้วยกล้องมือถือ")'
            : 'Blocked by iFrame container policy. Tap "Open in New Tab" to grant permission or use direct photo snap.',
          isIframe: true,
          isAndroid,
          isAndroidApkOrWebView: isApkOrWv,
        };
      }

      if (isApkOrWv) {
        return {
          success: false,
          status: 'apk_permission_missing',
          message: lang === 'th'
            ? 'ระบบ Android ไม่พบสิทธิ์กล้องในไฟล์ APK (AndroidManifest.xml ขาด android.permission.CAMERA หรือ MainActivity ขาด WebChromeClient.onPermissionRequest)'
            : 'Android APK missing camera permission in AndroidManifest.xml or WebChromeClient.onPermissionRequest in MainActivity.',
          isIframe: false,
          isAndroid,
          isAndroidApkOrWebView: true,
        };
      }

      return {
        success: false,
        status: 'denied',
        message: lang === 'th'
          ? 'สิทธิ์กล้องถูกปฏิเสธในอุปกรณ์ (หากเปิดผ่าน APK ให้ตรวจสอบ AndroidManifest.xml หรือแตะไอคอนแม่กุญแจ 🔒 ที่แถบ URL เพื่ออนุญาต)'
          : 'Camera permission denied. If using APK, check AndroidManifest.xml or allow camera in app permissions.',
        isIframe: false,
        isAndroid,
        isAndroidApkOrWebView: isApkOrWv,
      };
    }

    if (isOverconstrained) {
      return {
        success: false,
        status: 'error',
        message: lang === 'th'
          ? 'ความละเอียดกล้องไม่รองรับ แต่สามารถใช้ปุ่ม "ถ่ายภาพด้วยกล้องมือถือ" แทนได้'
          : 'Camera resolution overconstrained.',
        isIframe: inIframe,
        isAndroid,
        isAndroidApkOrWebView: isApkOrWv,
      };
    }

    return {
      success: false,
      status: 'error',
      message: lang === 'th'
        ? `ไม่สามารถเปิดกล้องได้: ${err?.message || 'ข้อผิดพลาดไม่ทราบสาเหตุ'} (แนะนำใช้ปุ่มถ่ายภาพหรือตรวจสอบสิทธิ์ APK)`
        : `Camera error: ${err?.message || 'Unknown error'}`,
      isIframe: inIframe,
      isAndroid,
      isAndroidApkOrWebView: isApkOrWv,
    };
  }
}
