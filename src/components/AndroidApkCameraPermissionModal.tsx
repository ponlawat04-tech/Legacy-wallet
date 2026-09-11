import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Camera,
  ShieldAlert,
  Check,
  Copy,
  Terminal,
  Code2,
  FileCode,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  CheckCircle2,
  HelpCircle,
  FolderSync
} from 'lucide-react';
import { Language } from '../types/wallet';

interface AndroidApkCameraPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const AndroidApkCameraPermissionModal: React.FC<AndroidApkCameraPermissionModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<'manifest' | 'java' | 'kotlin' | 'capacitor' | 'settings'>('manifest');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copySnippet = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const MANIFEST_SNIPPET = `<!-- วางไว้ใต้แท็ก <manifest> ใน android/app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.legacywallet.app">

    <!-- 1. สิทธิ์การเข้าใช้งานกล้องสำหรับสแกน QR Code (จำเป็นอย่างยิ่ง) -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.FLASHLIGHT" />

    <!-- 2. คุณสมบัติฮาร์ดแวร์กล้อง (required="false" เพื่อให้ลงได้ทุกอุปกรณ์) -->
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
    <uses-feature android:name="android.hardware.camera.flash" android:required="false" />

    <!-- 3. สำหรับ Android 11+ (API 30+) เพื่อให้เรียกใช้ Intent กล้องระบบได้ -->
    <queries>
        <intent>
            <action android:name="android.media.action.IMAGE_CAPTURE" />
        </intent>
        <intent>
            <action android:name="android.intent.action.GET_CONTENT" />
        </intent>
    </queries>

</manifest>`;

  const JAVA_SNIPPET = `package com.legacywallet.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {
    private static final int CAMERA_PERMISSION_CODE = 101;
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // 1. ขอสิทธิ์กล้องระดับระบบ Android OS (Runtime Permission)
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.CAMERA},
                    CAMERA_PERMISSION_CODE);
        }

        webView = findViewById(R.id.webview);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        // 2. สำคัญที่สุดสำหรับ WebRTC getUserMedia ใน WebView!
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    // อนุญาตสิทธิ์กล้องให้ WebRTC สตรีมกล้องสดได้
                    request.grant(request.getResources());
                });
            }
        });

        webView.loadUrl("file:///android_asset/dist/index.html");
    }
}`;

  const KOTLIN_SNIPPET = `package com.legacywallet.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
    private val CAMERA_REQUEST_CODE = 101
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // 1. ขอ Runtime Permission จาก Android OS
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), CAMERA_REQUEST_CODE)
        }

        webView = findViewById(R.id.webview)
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
        }

        // 2. อนุญาต WebChromeClient สำหรับ WebRTC getUserMedia
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                runOnUiThread {
                    request?.grant(request.resources)
                }
            }
        }

        webView.loadUrl("file:///android_asset/dist/index.html")
    }
}`;

  const CAPACITOR_COMMANDS = `# ขั้นตอนการสร้าง Android APK ด้วย Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android
npm run build
npx cap add android

# นำโค้ด Manifest ไปวางใน android/app/src/main/AndroidManifest.xml
# จากนั้นซิงค์โปรเจกต์
npx cap sync android
npx cap open android

# ใน Android Studio:
# ไปที่เมนู Build > Build Bundle(s) / APK(s) > Build APK(s)`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 p-5 text-slate-100 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
            <Smartphone className="w-6 h-6" />
          </div>
          <div className="min-w-0 pr-8">
            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2 flex-wrap">
              <span>{lang === 'th' ? 'การแก้ปัญหาสิทธิ์กล้องบน Android APK' : 'Android APK Camera Permission Fix'}</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
                APK & WebView
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {lang === 'th'
                ? 'สาเหตุและวิธีแก้ไขเมื่อ Android แจ้งเตือน: "ไม่พบสิทธิการเข้าใช้งานกล้อง จากการติดต่อด้วย APK"'
                : 'Root cause and fix for: "Android system cannot find camera permission from APK"'}
            </p>
          </div>
        </div>

        {/* Root Causes Alert Card */}
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{lang === 'th' ? 'ทำไมระบบ Android จึงแจ้งว่าไม่พบสิทธิ์กล้อง?' : 'Why does Android report No Camera Permission?'}</span>
          </div>
          <ul className="space-y-1.5 text-slate-300 text-[11px] list-disc list-inside">
            <li>
              <strong className="text-amber-300">{lang === 'th' ? 'สาเหตุหลักที่ 1 (ใน Manifest):' : 'Cause 1 (Manifest):'}</strong>{' '}
              {lang === 'th'
                ? 'ไฟล์ AndroidManifest.xml ของ APK ไม่ได้ประกาศแท็ก <uses-permission android:name="android.permission.CAMERA" /> ส่งผลให้ Android ในหน้าการตั้งค่าแอปไม่ปรากฏตัวเลือกกล้องให้เปิดสิทธิ์'
                : 'AndroidManifest.xml did not declare android.permission.CAMERA, so Android OS completely hides the Camera permission toggle in App Settings.'}
            </li>
            <li>
              <strong className="text-amber-300">{lang === 'th' ? 'สาเหตุหลักที่ 2 (ใน WebView):' : 'Cause 2 (WebView WebChromeClient):'}</strong>{' '}
              {lang === 'th'
                ? 'ใน Android WebView สตรีมกล้อง WebRTC (getUserMedia) จะถูกบล็อกอัตโนมัติ หากใน MainActivity ไม่ได้ใส่โค้ด WebChromeClient.onPermissionRequest'
                : 'Android WebView blocks WebRTC getUserMedia by default unless WebChromeClient.onPermissionRequest is overridden in MainActivity.'}
            </li>
            <li>
              <strong className="text-amber-300">{lang === 'th' ? 'สาเหตุหลักที่ 3 (Runtime Permission):' : 'Cause 3 (Runtime Permission):'}</strong>{' '}
              {lang === 'th'
                ? 'Android 6.0+ ต้องมีการเรียก ActivityCompat.requestPermissions ในตอนเริ่มแอป'
                : 'Android 6.0+ requires requesting runtime camera permission before launching the camera stream.'}
            </li>
          </ul>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('manifest')}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center truncate ${
              activeTab === 'manifest'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">AndroidManifest</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('java')}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center truncate ${
              activeTab === 'java'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">MainActivity.java</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kotlin')}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center truncate ${
              activeTab === 'kotlin'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">MainActivity.kt</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('capacitor')}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center truncate ${
              activeTab === 'capacitor'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Capacitor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`col-span-2 sm:col-span-1 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center truncate ${
              activeTab === 'settings'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{lang === 'th' ? 'การตั้งค่าเครื่อง' : 'App Settings'}</span>
          </button>
        </div>

        {/* Tab 1: AndroidManifest.xml */}
        {activeTab === 'manifest' && (
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-amber-400" />
                <span>ตำแหน่งไฟล์: <code className="text-amber-300 font-mono">android/app/src/main/AndroidManifest.xml</code></span>
              </span>
              <button
                type="button"
                onClick={() => copySnippet(MANIFEST_SNIPPET, 'manifest')}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 active:scale-95"
              >
                {copiedKey === 'manifest' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{copiedKey === 'manifest' ? (lang === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (lang === 'th' ? 'คัดลอกโค้ด' : 'Copy XML')}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-[10.5px] text-amber-300 overflow-x-auto leading-relaxed max-h-60">
              {MANIFEST_SNIPPET}
            </pre>
            <p className="text-[11px] text-slate-400 leading-normal">
              {lang === 'th'
                ? '💡 เมื่อใส่แท็กนี้แล้วคอมไพล์ APK ใหม่ ระบบ Android OS จะยอมให้แอปเข้าถึงกล้อง และจะแสดงสิทธิ์กล้องในหน้า "ข้อมูลแอปพลิเคชัน" (App Info) ของเครื่อง'
                : '💡 After adding this tag and rebuilding the APK, Android OS will recognize camera permissions in App Info settings.'}
            </p>
          </div>
        )}

        {/* Tab 2: MainActivity.java */}
        {activeTab === 'java' && (
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-amber-400" />
                <span>โค้ด Java สำหรับ Android Studio WebView</span>
              </span>
              <button
                type="button"
                onClick={() => copySnippet(JAVA_SNIPPET, 'java')}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 active:scale-95"
              >
                {copiedKey === 'java' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{copiedKey === 'java' ? (lang === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (lang === 'th' ? 'คัดลอก Java' : 'Copy Java')}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-[10.5px] text-cyan-300 overflow-x-auto leading-relaxed max-h-60">
              {JAVA_SNIPPET}
            </pre>
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-[11px] text-indigo-300 space-y-1">
              <strong>สำคัญมาก (Key Note):</strong>
              <p>
                ในเมธอด <code className="text-amber-300">onPermissionRequest</code> ต้องสั่ง <code className="text-emerald-400">request.grant(request.getResources());</code> บน <code className="text-cyan-300">runOnUiThread</code> เพื่อให้ WebView ปลดล็อก WebRTC กล้องสด
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: MainActivity.kt */}
        {activeTab === 'kotlin' && (
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-amber-400" />
                <span>โค้ด Kotlin สำหรับ Android Studio WebView</span>
              </span>
              <button
                type="button"
                onClick={() => copySnippet(KOTLIN_SNIPPET, 'kotlin')}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 active:scale-95"
              >
                {copiedKey === 'kotlin' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{copiedKey === 'kotlin' ? (lang === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (lang === 'th' ? 'คัดลอก Kotlin' : 'Copy Kotlin')}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-[10.5px] text-purple-300 overflow-x-auto leading-relaxed max-h-60">
              {KOTLIN_SNIPPET}
            </pre>
          </div>
        )}

        {/* Tab 4: Capacitor */}
        {activeTab === 'capacitor' && (
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>คำสั่งคอมไพล์ APK ด้วย Capacitor CLI</span>
              </span>
              <button
                type="button"
                onClick={() => copySnippet(CAPACITOR_COMMANDS, 'cap')}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 active:scale-95"
              >
                {copiedKey === 'cap' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span>{copiedKey === 'cap' ? (lang === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (lang === 'th' ? 'คัดลอกคำสั่ง' : 'Copy Commands')}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-[10.5px] text-cyan-300 overflow-x-auto leading-relaxed max-h-60">
              {CAPACITOR_COMMANDS}
            </pre>
          </div>
        )}

        {/* Tab 5: Android Phone Settings Guide */}
        {activeTab === 'settings' && (
          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'th' ? 'วิธีตรวจสอบและเปิดสิทธิ์ในเครื่องโทรศัพท์ Android:' : 'How to check & enable in Android Phone Settings:'}</span>
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px]">
                <li>{lang === 'th' ? 'เปิดแอป "การตั้งค่า" (Settings) ในโทรศัพท์' : 'Open Phone "Settings"'}</li>
                <li>{lang === 'th' ? 'เลือกเมนู "แอป" หรือ "การจัดการแอป" (Apps / App Management)' : 'Go to "Apps" or "Manage Apps"'}</li>
                <li>{lang === 'th' ? 'ค้นหาและเลือกแอปกระเป๋าของคุณ (Legacy Wallet)' : 'Find and tap your app (e.g. Legacy Wallet)'}</li>
                <li>{lang === 'th' ? 'แตะที่หัวข้อ "การอนุญาต" หรือ "สิทธิ์" (Permissions)' : 'Tap "Permissions"'}</li>
                <li>
                  {lang === 'th' ? (
                    <span>
                      หากมีคำว่า <strong className="text-emerald-400">"กล้อง" (Camera)</strong> ให้แตะและเลือก <strong>"อนุญาตขณะใช้งานแอปเท่านั้น"</strong>
                    </span>
                  ) : (
                    <span>
                      If <strong className="text-emerald-400">"Camera"</strong> is listed, tap it and select <strong>"Allow only while using the app"</strong>
                    </span>
                  )}
                </li>
              </ol>

              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[10.5px] text-amber-200">
                <strong>{lang === 'th' ? '⚠️ หากในหน้านั้นไม่มีคำว่า "กล้อง" ปรากฏอยู่เลย:' : '⚠️ If "Camera" is not listed at all:'}</strong>
                <p className="mt-0.5">
                  {lang === 'th'
                    ? 'แสดงว่าไฟล์ APK ที่คุณติดตั้งไม่ได้ระบุ `<uses-permission android:name="android.permission.CAMERA" />` ใน AndroidManifest.xml จึงทำให้ระบบปฏิบัติการ Android ปิดกั้นไว้ ต้องเพิ่มโค้ดใน Manifest แล้วคอมไพล์สร้าง APK ใหม่'
                    : 'It means the installed APK did not declare CAMERA permission in AndroidManifest.xml. You must add the permission and rebuild the APK.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instant Fallbacks Available In This App */}
        <div className="p-3.5 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Sparkles className="w-4 h-4" />
            <span>{lang === 'th' ? 'ทางเลือกที่ใช้งานได้ทันที (โดยไม่ต้องรอแก้ APK)' : 'Instant Workarounds (No Rebuild Needed)'}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-slate-200 block flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'th' ? 'ปุ่มถ่ายภาพกล้องมือถือ' : 'Native Shutter Button'}</span>
              </span>
              <p className="text-slate-400 text-[10px] leading-tight">
                {lang === 'th'
                  ? 'ใช้ปุ่ม "ถ่ายภาพด้วยกล้องมือถือ" ระบบจะเรียกแอปกล้องระบบของโทรศัพท์มาถ่ายภาพนิ่ง QR เพื่อถอดรหัสได้ทันที'
                  : 'Tap "Mobile Camera Direct" to launch native camera shutter and decode QR photo.'}
              </p>
            </div>

            <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-slate-200 block flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                <span>{lang === 'th' ? 'เปิดผ่านเบราว์เซอร์ปกติ' : 'Open in Google Chrome'}</span>
              </span>
              <p className="text-slate-400 text-[10px] leading-tight">
                {lang === 'th'
                  ? 'เปิด URL เว็บใน Google Chrome บนมือถือ Chrome จะขอสิทธิ์กล้องสด WebRTC ได้ตามปกติ 100%'
                  : 'Open the URL in standard mobile Chrome browser for 100% full WebRTC camera support.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-98"
          >
            {lang === 'th' ? 'เข้าใจแล้วและปิดหน้าต่าง' : 'Got It & Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
