import React, { useState, useEffect, useRef } from 'react';
import {
  Wallet,
  Send,
  QrCode,
  History,
  Lock,
  Maximize2,
  Minimize2,
  ArrowUp
} from 'lucide-react';
import { ActiveTab, Language } from '../types/wallet';
import { i18n } from '../utils/i18n';
import { triggerHaptic } from '../utils/haptics';

interface MobileFrameProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  lang: Language;
  airGapMode: boolean;
  header?: React.ReactNode;
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  activeTab,
  onTabChange,
  lang,
  airGapMode: _airGapMode,
  header,
  children,
}) => {
  // Check if running on real small screen to default to full screen
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 640;
    }
    return true;
  });
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const mainRef = useRef<HTMLElement | null>(null);

  const t = i18n[lang];

  // Automatically scroll to top smoothly when switching tabs
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop > 220) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }
  };

  const scrollToTop = () => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; matches?: ActiveTab[] }[] = [
    { id: 'home', label: t.tabHome, icon: <Wallet className="w-5 h-5" /> },
    { id: 'send', label: lang === 'th' ? 'โอน/เซ็น' : 'Send & Sign', icon: <Send className="w-5 h-5" />, matches: ['send', 'airgap'] },
    { id: 'receive', label: t.tabReceive, icon: <QrCode className="w-5 h-5" /> },
    { id: 'history', label: t.tabHistory, icon: <History className="w-5 h-5" />, matches: ['history', 'market'] },
    { id: 'security', label: t.tabSecurity, icon: <Lock className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-0 sm:p-3 md:p-5 antialiased selection:bg-amber-500/30">
      {/* View Mode Toggle Bar (Desktop/Tablet Top Bar) */}
      <div className="w-full max-w-lg mb-2 sm:mb-2.5 px-3.5 py-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-2xl flex items-center justify-between shadow-lg text-xs hidden sm:flex">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-bold text-slate-200 tracking-tight text-[11px]">
            {lang === 'th' ? 'ColdVault ระบบความปลอดภัยระดับฮาร์ดแวร์' : 'ColdVault Mobile Security Engine'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileFrame(!isMobileFrame)}
          className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-1.5 transition-all border border-slate-700/80 shadow-sm active:scale-95 text-[11px]"
        >
          {isMobileFrame ? (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'th' ? 'ขยายเต็มจอ' : 'Full Screen'}</span>
            </>
          ) : (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'th' ? 'กรอบมือถือ' : 'Mobile View'}</span>
            </>
          )}
        </button>
      </div>

      {/* Main Container */}
      <div
        className={`w-full bg-slate-950 transition-all duration-300 ${
          isMobileFrame
            ? 'max-w-[440px] h-[100dvh] sm:h-[860px] sm:max-h-[92vh] sm:rounded-[38px] sm:border-[6px] sm:border-slate-800/90 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col relative ring-1 ring-slate-700/40'
            : 'max-w-4xl sm:rounded-3xl sm:border border-slate-800/90 min-h-[100dvh] sm:min-h-[92vh] h-[100dvh] sm:h-[92vh] flex flex-col relative sm:shadow-2xl overflow-hidden'
        }`}
      >
        {/* Top Shortcut Bar - Pinned at the very top, edge-to-edge, zero gap */}
        {header && (
          <div className="w-full shrink-0 z-30">
            {header}
          </div>
        )}

        {/* Content Body with Silky Smooth Scrolling */}
        <main
          ref={mainRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-3 sm:px-4 pt-2.5 sm:pt-3 pb-24 scroll-smooth scrollbar-thin scrollbar-thumb-slate-800 overscroll-y-contain focus:outline-none"
        >
          {children}
        </main>

        {/* Floating Quick Scroll to Top Button */}
        {showScrollTop && (
          <button
            type="button"
            onClick={scrollToTop}
            className="absolute bottom-20 right-4 p-2 rounded-full bg-slate-800/90 hover:bg-amber-500 text-slate-200 hover:text-slate-950 border border-slate-700 shadow-xl backdrop-blur-md transition-all active:scale-90 z-20"
            title={lang === 'th' ? 'เลื่อนขึ้นบนสุด' : 'Scroll to top'}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}

        {/* Bottom Navigation Bar */}
        <nav className="sticky sm:absolute bottom-0 inset-x-0 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/90 px-1.5 sm:px-3 py-2 flex items-center justify-around z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] safe-bottom">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id || Boolean(tab.matches?.includes(activeTab));
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onTabChange(tab.id);
                }}
                className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all relative group flex-1 max-w-[76px] ${
                  isActive
                    ? 'text-amber-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200 font-medium'
                }`}
              >
                {/* Active Glow Backdrop */}
                {isActive && (
                  <div className="absolute inset-0 bg-amber-500/10 rounded-2xl border border-amber-500/20 shadow-sm" />
                )}

                <div className={`transition-transform duration-200 relative z-10 ${isActive ? 'scale-110 -translate-y-0.5' : 'group-hover:scale-105'}`}>
                  {tab.icon}
                </div>

                <span className={`text-[10px] sm:text-[10.5px] mt-1 tracking-tight truncate max-w-full relative z-10 ${isActive ? 'font-bold text-amber-300' : 'text-slate-400'}`}>
                  {tab.label}
                </span>

                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute -bottom-0.5 shadow-sm shadow-amber-400/80" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};


