import React, { useState, useEffect, useCallback } from 'react';
import { ActiveTab, AddressType, Currency, Language, MarketData, SecuritySettings, Transaction, WalletAccount, ZeroExposureVault } from './types/wallet';
import { INITIAL_MARKET_DATA, fetchLiveMarketData } from './utils/mockMarket';
import { fetchRealAddressData, fetchRealAddressTransactions } from './utils/blockchainApi';
import { MobileFrame } from './components/MobileFrame';
import { HeaderBar } from './components/HeaderBar';
import { HomeTab } from './components/Tabs/HomeTab';
import { MarketTab } from './components/Tabs/MarketTab';
import { SendTab } from './components/Tabs/SendTab';
import { ReceiveTab } from './components/Tabs/ReceiveTab';
import { AirGapSignTab } from './components/Tabs/AirGapSignTab';
import { HistoryTab } from './components/Tabs/HistoryTab';
import { SecurityTab } from './components/Tabs/SecurityTab';
import { PINKeypadModal } from './components/PINKeypadModal';
import { PinOptionsMenuModal } from './components/PinOptionsMenuModal';
import { AppLockScreen } from './components/AppLockScreen';
import { OfflineVaultImportModal } from './components/OfflineVaultImportModal';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { WalletReadinessModal } from './components/WalletReadinessModal';
import { WalletManagerModal } from './components/WalletManagerModal';
import { LegacyForkScannerModal } from './components/LegacyForkScannerModal';
import { PrivateKeyQrScannerModal } from './components/PrivateKeyQrScannerModal';
import { SpvNodeStatusModal } from './components/SpvNodeStatusModal';
import { MultiWalletAuditModal } from './components/MultiWalletAuditModal';
import { AutoBackupModal } from './components/AutoBackupModal';
import { RawBackupMigratorModal } from './components/RawBackupMigratorModal';
import { AddressTypeSwitchModal } from './components/AddressTypeSwitchModal';
import { NextGenSystemHubModal } from './components/NextGenSystemHubModal';
import { BackupPayload, createBackupSnapshot } from './utils/autoBackup';
import { spvEngine } from './utils/spv/spvEngine';
import { sovereignOrchestrator } from './utils/sovereignOS/sovereignOrchestrator';
import { CheckCircle2, ShieldAlert, Lock, Wifi } from 'lucide-react';
import { i18n } from './utils/i18n';

export default function App() {
  // Real Primary Wallet State (Persisted in localStorage)
  const [realAccount, setRealAccount] = useState<WalletAccount>(() => {
    try {
      const saved = localStorage.getItem('COLDVAULT_REAL_ACCOUNT_V2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error restoring account:', e);
    }
    return {
      id: 'btc-vault-main-01',
      name: 'Legacy wallet',
      address: 'bc1q9v8k32p9zx7m0al4a4c58qfwsy439p233a7x9c',
      addressType: 'native_segwit',
      publicKey: '038c3a9f210088921a4821a819b2a19',
      balanceBtc: 0.00000000,
      balanceSats: 0,
      isVaultSealed: true,
      sealedTimestamp: Date.now(),
      derivationPath: "m/84'/0'/0'/0/0",
      createdOffline: true,
      keySource: 'seed_phrase',
      keyFormat: '12 Words BIP-39',
      color: '#f59e0b',
    };
  });

  // Multiple Wallets List State
  const [accounts, setAccounts] = useState<WalletAccount[]>(() => {
    try {
      const saved = localStorage.getItem('COLDVAULT_ACCOUNTS_LIST_V2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error restoring accounts list:', e);
    }
    return [realAccount];
  });

  const [realTransactions, setRealTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('COLDVAULT_REAL_TXS_V2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error restoring transactions:', e);
    }
    return [];
  });

  // Display Active State (Switches if Decoy PIN is entered)
  const [account, setAccount] = useState<WalletAccount>(realAccount);
  const [transactions, setTransactions] = useState<Transaction[]>(realTransactions);
  const [isSyncingBlockchain, setIsSyncingBlockchain] = useState<boolean>(false);

  const [market, setMarket] = useState<MarketData>(INITIAL_MARKET_DATA);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('COLDVAULT_LANG_V1') as Language) || 'th';
  });
  const [currency, setCurrency] = useState<Currency>(() => {
    return (localStorage.getItem('COLDVAULT_CURRENCY_V1') as Currency) || 'THB';
  });
  const [airGapMode, setAirGapMode] = useState<boolean>(true);
  const [isDeviceOnline, setIsDeviceOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Physical Device Online/Offline Hardware Link Detector
  useEffect(() => {
    const handleOnline = () => setIsDeviceOnline(true);
    const handleOffline = () => setIsDeviceOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Security Settings (Persisted in localStorage)
  const [security, setSecurity] = useState<SecuritySettings>(() => {
    const defaultSecurity: SecuritySettings = {
      pinEnabled: true,
      pinHash: btoa('123456'), // Default base64 hash of '123456'
      duressPinHash: btoa('999999'), // Default Duress PIN '999999'
      antiScrambleKeypad: true,
      autoLockDelayMinutes: 5,
      biometricsEnabled: true,
      airGapMode: true,
      duressActive: false,
      blockBackgroundSync: true, // Default: Zero Background activity
      requirePinForOnline: true, // Default: Strict PIN before going online
      vaultFrozen: false, // Default: Outbound transfers unlocked
      frozenTimestamp: null,
    };
    try {
      const saved = localStorage.getItem('COLDVAULT_SECURITY_V1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultSecurity, ...parsed, duressActive: false };
      }
    } catch (e) {
      console.error('Error restoring security settings:', e);
    }
    return defaultSecurity;
  });

  // App Lock State
  const [isAppLocked, setIsAppLocked] = useState<boolean>(false);

  // Modal Controllers
  const [isWalletManagerOpen, setIsWalletManagerOpen] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pinActionCallback, setPinActionCallback] = useState<(() => void) | null>(null);
  
  // Specific PIN Modals
  const [isVerifyPinForOptionsOpen, setIsVerifyPinForOptionsOpen] = useState<boolean>(false);
  const [isPinOptionsMenuOpen, setIsPinOptionsMenuOpen] = useState<boolean>(false);
  const [isSettingMainPinOpen, setIsSettingMainPinOpen] = useState<boolean>(false);
  const [isSettingDecoyPinOpen, setIsSettingDecoyPinOpen] = useState<boolean>(false);
  const [isConnectOnlinePinOpen, setIsConnectOnlinePinOpen] = useState<boolean>(false);
  const [isExitDecoyPinOpen, setIsExitDecoyPinOpen] = useState<boolean>(false);

  const [isVaultModalOpen, setIsVaultModalOpen] = useState<boolean>(false);
  const [isReadinessModalOpen, setIsReadinessModalOpen] = useState<boolean>(false);
  const [isSpvModalOpen, setIsSpvModalOpen] = useState<boolean>(false);
  const [isMultiWalletAuditOpen, setIsMultiWalletAuditOpen] = useState<boolean>(false);
  const [isLegacyForkScannerOpen, setIsLegacyForkScannerOpen] = useState<boolean>(false);
  const [isPrivateKeyScannerOpen, setIsPrivateKeyScannerOpen] = useState<boolean>(false);
  const [isAutoBackupModalOpen, setIsAutoBackupModalOpen] = useState<boolean>(false);
  const [isRawBackupMigratorOpen, setIsRawBackupMigratorOpen] = useState<boolean>(false);
  const [isAddressTypeSwitchOpen, setIsAddressTypeSwitchOpen] = useState<boolean>(false);
  const [isNextGenHubOpen, setIsNextGenHubOpen] = useState<boolean>(false);
  const [qrScannedKeyForSweep, setQrScannedKeyForSweep] = useState<string>('');
  const [qrScannedSecretForImport, setQrScannedSecretForImport] = useState<string>('');
  const [selectedTxDetail, setSelectedTxDetail] = useState<Transaction | null>(null);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const t = i18n[lang];

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSelectKeyForSweep = (key: string) => {
    setQrScannedKeyForSweep(key);
    setIsPrivateKeyScannerOpen(false);
    setIsLegacyForkScannerOpen(true);
    showToast(lang === 'th' ? '🔍 สแกน Private Key สำเร็จ! กำลังตรวจสอบยอดเหรียญและ Hard Forks...' : 'Key scanned! Checking balance & fork coins...', 'success');
  };

  const handleSelectKeyForImport = (key: string) => {
    setQrScannedSecretForImport(key);
    setIsPrivateKeyScannerOpen(false);
    setIsVaultModalOpen(true);
    showToast(lang === 'th' ? '🔒 สแกน Private Key สำเร็จ! พร้อมนำเข้าสู่ Zero-Exposure Vault' : 'Key scanned! Ready to import into secure vault', 'success');
  };

  const handleRestoreFromBackup = (restored: BackupPayload) => {
    if (restored.realAccount) {
      setRealAccount(restored.realAccount);
      setAccount(restored.realAccount);
    }
    if (restored.accounts && Array.isArray(restored.accounts)) {
      setAccounts(restored.accounts);
    }
    if (restored.realTransactions && Array.isArray(restored.realTransactions)) {
      setRealTransactions(restored.realTransactions);
      setTransactions(restored.realTransactions);
    }
    if (restored.security) {
      setSecurity(restored.security);
    }
    if (restored.lang) {
      setLang(restored.lang);
    }
    if (restored.currency) {
      setCurrency(restored.currency);
    }
    showToast(
      lang === 'th'
        ? 'กู้คืนข้อมูลทั้งหมดเข้าสู่ ColdVault เรียบร้อยแล้ว!'
        : 'All data restored to ColdVault!',
      'success'
    );
  };

  const handleMigrateAccountsComplete = (newAccounts: WalletAccount[], primaryAccount?: WalletAccount) => {
    if (newAccounts.length === 0) return;

    setAccounts((prevAccounts) => {
      const existingIds = new Set(prevAccounts.map(a => a.id));
      const toAdd = newAccounts.filter(a => !existingIds.has(a.id));
      const merged = [...prevAccounts, ...toAdd];
      try {
        localStorage.setItem('COLDVAULT_ACCOUNTS_LIST_V2', JSON.stringify(merged));
      } catch (e) {
        console.error('Failed to save accounts:', e);
      }
      return merged;
    });

    if (primaryAccount) {
      setRealAccount(primaryAccount);
      setAccount(primaryAccount);
      syncBlockchainData(primaryAccount, true);
      try {
        localStorage.setItem('COLDVAULT_REAL_ACCOUNT_V2', JSON.stringify(primaryAccount));
      } catch (e) {
        console.error('Failed to save real account:', e);
      }
    }
  };

  // Automated state snapshot recorder with debounce on data change
  useEffect(() => {
    const timer = setTimeout(() => {
      const payload: BackupPayload = {
        version: '1.0',
        appVersion: '3.7.0',
        exportTimestamp: Date.now(),
        realAccount,
        accounts,
        realTransactions,
        security,
        lang,
        currency,
      };
      createBackupSnapshot(payload, 'auto_change').catch((err) => {
        console.error('Auto-backup snapshot error:', err);
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [realAccount, accounts, realTransactions, security, lang, currency]);

  // Save state changes to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('COLDVAULT_SECURITY_V1', JSON.stringify(security));
    } catch (e) {
      console.error('Failed to save security settings:', e);
    }
  }, [security]);

  useEffect(() => {
    try {
      localStorage.setItem('COLDVAULT_REAL_ACCOUNT_V2', JSON.stringify(realAccount));
    } catch (e) {
      console.error('Failed to save real account:', e);
    }
  }, [realAccount]);

  useEffect(() => {
    try {
      localStorage.setItem('COLDVAULT_ACCOUNTS_LIST_V2', JSON.stringify(accounts));
    } catch (e) {
      console.error('Failed to save accounts list:', e);
    }
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem('COLDVAULT_REAL_TXS_V2', JSON.stringify(realTransactions));
    } catch (e) {
      console.error('Failed to save real transactions:', e);
    }
  }, [realTransactions]);

  // Initial SPV (bitcoinj) verification of loaded transactions
  useEffect(() => {
    if (realTransactions.length > 0) {
      spvEngine.verifyTransactions(realTransactions).then((verified) => {
        const hasUnverified = realTransactions.some((tx) => !tx.spvVerified);
        if (hasUnverified) {
          setRealTransactions(verified);
          setTransactions(verified);
        }
      });
    }
  }, []);

  // Synchronize active wallet account with SPV Wallet component for Bloom filtering
  useEffect(() => {
    if (account) {
      spvEngine.updateWalletAccount(account);
    }
  }, [account]);

  useEffect(() => {
    localStorage.setItem('COLDVAULT_LANG_V1', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('COLDVAULT_CURRENCY_V1', currency);
  }, [currency]);

  // Sync with real Bitcoin Mainnet blockchain nodes
  const syncBlockchainData = useCallback(async (targetAccount?: WalletAccount, notify: boolean = true) => {
    // If in AirGapMode or background sync is blocked, strictly prevent automatic calls
    if (airGapMode) {
      if (notify) {
        showToast(
          lang === 'th' ? 'โหมดออฟไลน์ (Air-Gap) ทำงานอยู่ ไม่สามารถเชื่อมต่ออินเตอร์เน็ตได้' : 'Offline Air-Gap mode active. Internet connection blocked.',
          'info'
        );
      }
      return;
    }

    const acc = targetAccount || account;
    if (!acc.address) return;

    setIsSyncingBlockchain(true);
    try {
      const [marketData, onChainData] = await Promise.all([
        fetchLiveMarketData(),
        fetchRealAddressData(acc.address),
      ]);

      setMarket(marketData);

      const onChainTxs = await fetchRealAddressTransactions(acc.address, marketData.currentBlock || 884120);

      // Bitcoin SPV Engine (bitcoinj): Cryptographic Merkle inclusion verification
      const verifiedTxs = await spvEngine.verifyTransactions(onChainTxs);

      const updatedAccount: WalletAccount = {
        ...acc,
        balanceBtc: onChainData.balanceBtc,
        balanceSats: onChainData.balanceSats,
      };

      setAccount(updatedAccount);
      if (!security.duressActive) {
        setRealAccount(updatedAccount);
        setRealTransactions(verifiedTxs);
      }
      setTransactions(verifiedTxs);

      if (notify) {
        if (onChainData.balanceBtc > 0 || onChainTxs.length > 0) {
          showToast(
            lang === 'th'
              ? `ซิงค์บล็อกเชนสำเร็จ: ${onChainData.balanceBtc.toFixed(8)} BTC (${onChainTxs.length} ธุรกรรม)`
              : `Synced with blockchain: ${onChainData.balanceBtc.toFixed(8)} BTC (${onChainTxs.length} txs)`,
            'success'
          );
        } else {
          showToast(
            lang === 'th'
              ? `ซิงค์บล็อกเชนสำเร็จ: ยอดจริงบน Bitcoin 0.00 BTC (0 ธุรกรรม)`
              : `Blockchain sync complete: 0.00 BTC on Bitcoin (0 txs)`,
            'info'
          );
        }
      }
    } catch (e) {
      console.error('Blockchain sync failed:', e);
      if (notify) {
        showToast(
          lang === 'th' ? 'การเชื่อมต่อบล็อกเชนขัดข้อง (อยู่ในโหมดออฟไลน์)' : 'Blockchain sync failed (Offline mode)',
          'info'
        );
      }
    } finally {
      setIsSyncingBlockchain(false);
    }
  }, [account, airGapMode, lang, security.duressActive]);

  // Initial mount sync & market polling with background blocking enforcement
  useEffect(() => {
    let isMounted = true;

    // Only fetch if NOT in Air-Gap mode AND NOT blocking background
    if (!airGapMode && !security.blockBackgroundSync) {
      fetchLiveMarketData().then((data) => {
        if (isMounted) {
          setMarket(data);
        }
      });

      if (realAccount.address) {
        syncBlockchainData(realAccount, false);
      }
    }

    // Interval only runs when online AND background sync is explicitly permitted
    if (!airGapMode && !security.blockBackgroundSync) {
      const interval = setInterval(() => {
        fetchLiveMarketData().then((data) => {
          if (isMounted) setMarket(data);
        });
      }, 60000);

      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [airGapMode, realAccount, security.blockBackgroundSync, syncBlockchainData]);

  // Background Execution Termination & Inactivity Auto-Lock Security Engine
  useEffect(() => {
    // 1. App Visibility & Window Blur (Freeze background tasks & lock immediately)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (security.pinEnabled) {
          setIsAppLocked(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 2. Inactivity Auto-Lock Timer (Reset on touch, click, key, or scroll)
    let inactivityTimer: any = null;
    const timeoutMs = (security.autoLockDelayMinutes || 5) * 60 * 1000;

    const resetInactivityTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (!isAppLocked && security.pinEnabled) {
        inactivityTimer = setTimeout(() => {
          setIsAppLocked(true);
        }, timeoutMs);
      }
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (inactivityTimer) clearTimeout(inactivityTimer);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetInactivityTimer));
    };
  }, [isAppLocked, security.pinEnabled, security.autoLockDelayMinutes]);

  const handleResetAndCreateNewVault = () => {
    try {
      localStorage.removeItem('COLDVAULT_REAL_ACCOUNT_V2');
      localStorage.removeItem('COLDVAULT_REAL_TXS_V2');
      localStorage.removeItem('COLDVAULT_REAL_ACCOUNT_V1');
      localStorage.removeItem('COLDVAULT_REAL_TXS_V1');
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
    setIsVaultModalOpen(true);
    showToast(
      lang === 'th'
        ? 'เปิดหน้าต่างสร้าง / นำเข้า Seed Phrase ใหม่'
        : 'Opened New Seed / Vault setup modal',
      'info'
    );
  };

  const handleRefreshMarket = () => {
    syncBlockchainData(account, true);
  };

  // Trigger Duress Decoy mode: load fake decoy balance
  const activateDecoyMode = () => {
    setSecurity(prev => ({ ...prev, duressActive: true }));
    setAccount({
      id: 'btc-decoy-vault-9999',
      name: 'Decoy Wallet',
      address: 'bc1qdecoy78934x0912389a4561234789bcde',
      addressType: 'native_segwit',
      publicKey: '02decoy9999999999999999999',
      balanceBtc: 0.00012000,
      balanceSats: 12000,
      isVaultSealed: true,
      sealedTimestamp: Date.now(),
      derivationPath: "m/84'/0'/0'/0/0",
      createdOffline: true,
    });
    setTransactions([
      {
        id: 'tx-decoy-1',
        txid: '0000000000000000000000000000000000000000000000000000000000000000',
        type: 'received',
        amountBtc: 0.00012000,
        amountSats: 12000,
        feeSats: 1000,
        feeRateSatVb: 10,
        recipientAddress: 'bc1qdecoy78934x0912389a4561234789bcde',
        senderAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        timestamp: Date.now() - 3600000 * 5,
        confirmations: 12,
        status: 'completed',
        note: 'Simulated Decoy Pool Deposit'
      }
    ]);
  };

  // Restore Real Wallet State
  const restoreRealMode = () => {
    setSecurity(prev => ({ ...prev, duressActive: false }));
    setAccount(realAccount);
    setTransactions(realTransactions);
  };

  // Toggle Network Mode (Offline -> Online requires PIN)
  const handleToggleAirGap = () => {
    if (airGapMode) {
      // Offline -> Online: Requires PIN verification!
      setIsConnectOnlinePinOpen(true);
    } else {
      // Online -> Offline: Switch immediately
      setAirGapMode(true);
      sovereignOrchestrator.setAirGapPolicy(true);
      showToast(lang === 'th' ? 'สลับเข้าสู่โหมดออฟไลน์ (Air-Gapped) แล้ว' : 'Switched to Offline Air-Gapped mode', 'info');
    }
  };

  const handleConnectOnlineSuccess = (pin: string, isDuress: boolean) => {
    setIsConnectOnlinePinOpen(false);
    setAirGapMode(false);
    sovereignOrchestrator.setAirGapPolicy(false);
    if (isDuress) {
      activateDecoyMode();
    } else {
      restoreRealMode();
      syncBlockchainData(realAccount, false);
    }
    showToast(t.onlineModeUnlocked, 'success');
  };

  // Open PIN verification before protected actions
  const triggerPinProtection = (action: () => void) => {
    setPinActionCallback(() => action);
    setIsPinModalOpen(true);
  };

  const handlePinSuccess = (pin: string, isDuress: boolean) => {
    setIsPinModalOpen(false);

    if (isDuress) {
      activateDecoyMode();
    } else {
      if (pinActionCallback) {
        pinActionCallback();
        setPinActionCallback(null);
      }
    }
  };

  // Setting Main PIN Success
  const handleSetMainPinSuccess = (newPin: string) => {
    setIsSettingMainPinOpen(false);
    setSecurity(prev => ({ ...prev, pinHash: btoa(newPin) }));
    showToast(t.pinUpdatedSuccess, 'success');
  };

  // Setting Decoy PIN Success
  const handleSetDecoyPinSuccess = (newDecoyPin: string) => {
    setIsSettingDecoyPinOpen(false);
    setSecurity(prev => ({ ...prev, duressPinHash: btoa(newDecoyPin) }));
    showToast(t.pinUpdatedSuccess, 'success');
  };

  // Exiting Decoy Mode Success
  const handleExitDecoySuccess = (pin: string, isDuress: boolean) => {
    setIsExitDecoyPinOpen(false);
    if (!isDuress) {
      restoreRealMode();
      showToast(lang === 'th' ? 'สลับกลับสู่กระเป๋าจริงสำเร็จ' : 'Returned to real wallet', 'success');
    }
  };

  // Switch active isolated wallet
  const handleSelectAccount = (accountId: string) => {
    const target = accounts.find(a => a.id === accountId);
    if (!target) return;
    setRealAccount(target);
    setAccount(target);
    syncBlockchainData(target, true);
    showToast(
      lang === 'th'
        ? `สลับไปยังกระเป๋า: ${target.name}`
        : `Switched to vault: ${target.name}`,
      'info'
    );
  };

  // Delete isolated wallet
  const handleDeleteAccount = (accountId: string) => {
    if (accounts.length <= 1) {
      showToast(lang === 'th' ? 'ไม่สามารถลบกระเป๋าสุดท้ายได้' : 'Cannot delete the only remaining vault', 'info');
      return;
    }
    const updated = accounts.filter(a => a.id !== accountId);
    setAccounts(updated);
    if (account.id === accountId) {
      const nextAcc = updated[0];
      setRealAccount(nextAcc);
      setAccount(nextAcc);
      syncBlockchainData(nextAcc, false);
    }
    showToast(lang === 'th' ? 'ลบกระเป๋าเรียบร้อยแล้ว' : 'Removed wallet vault', 'info');
  };

  // Cold Vault Import / Sealed Callback
  const handleVaultSealed = (newAccount: WalletAccount, vault: ZeroExposureVault) => {
    const freshAccount: WalletAccount = {
      ...newAccount,
      balanceBtc: 0,
      balanceSats: 0,
    };
    setAccounts(prev => {
      const existingIdx = prev.findIndex(a => a.id === freshAccount.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = freshAccount;
        return next;
      }
      return [freshAccount, ...prev];
    });
    setRealAccount(freshAccount);
    setAccount(freshAccount);
    setRealTransactions([]);
    setTransactions([]);
    setAirGapMode(true);
    setActiveTab('home');
    showToast(
      lang === 'th' 
        ? `ซีลกระเป๋า "${freshAccount.name}" สำเร็จ! (${
            freshAccount.keySource === 'master_private_key'
              ? 'Master Key (xprv)'
              : freshAccount.keySource === 'private_key'
              ? 'Private Key'
              : 'Seed Phrase'
          })` 
        : `Vault "${freshAccount.name}" sealed! (${
            freshAccount.keySource === 'master_private_key'
              ? 'Master Key (xprv)'
              : freshAccount.keySource === 'private_key'
              ? 'Private Key'
              : 'Seed Phrase'
          })`, 
      'success'
    );

    // Store encrypted vault for zero-exposure address switching and offline operations
    if (vault?.encryptedSignerKey) {
      try {
        localStorage.setItem(`COLDVAULT_ENCRYPTED_SIGNER_${freshAccount.id}`, vault.encryptedSignerKey);
        localStorage.setItem(`COLDVAULT_VAULT_FINGERPRINT_${freshAccount.id}`, vault.vaultFingerprint);
      } catch (e) {
        console.error('Failed to store encrypted signer vault:', e);
      }
    }

    // Check if the address already has funds on blockchain
    syncBlockchainData(freshAccount, false);
  };

  // Switch Address Type of an existing wallet (e.g. SegWit -> Legacy or Nested)
  const handleSwitchAddressType = (
    targetAccountId: string,
    newAddressType: AddressType,
    newAddress: string,
    newPublicKey: string,
    newDerivationPath: string,
    scannedBalanceBtc: number,
    scannedBalanceSats: number
  ) => {
    setAccounts(prev => {
      const next = prev.map(acc => {
        if (acc.id === targetAccountId) {
          return {
            ...acc,
            addressType: newAddressType,
            address: newAddress,
            publicKey: newPublicKey,
            derivationPath: newDerivationPath,
            balanceBtc: scannedBalanceBtc,
            balanceSats: scannedBalanceSats,
          };
        }
        return acc;
      });
      try {
        localStorage.setItem('COLDVAULT_ACCOUNTS_LIST_V2', JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      return next;
    });

    if (account.id === targetAccountId) {
      const updatedAccount: WalletAccount = {
        ...account,
        addressType: newAddressType,
        address: newAddress,
        publicKey: newPublicKey,
        derivationPath: newDerivationPath,
        balanceBtc: scannedBalanceBtc,
        balanceSats: scannedBalanceSats,
      };
      setAccount(updatedAccount);
      if (!security.duressActive) {
        setRealAccount(updatedAccount);
        try {
          localStorage.setItem('COLDVAULT_REAL_ACCOUNT_V2', JSON.stringify(updatedAccount));
        } catch (e) {
          // ignore
        }
      }
      // Re-sync blockchain data for the newly switched address
      syncBlockchainData(updatedAccount, true);
    }
  };

  // Add Parallel Sibling Wallet (e.g. keeping both SegWit and Legacy)
  const handleAddParallelWallet = (newAccount: WalletAccount, vault?: ZeroExposureVault) => {
    setAccounts(prev => {
      const next = [newAccount, ...prev];
      try {
        localStorage.setItem('COLDVAULT_ACCOUNTS_LIST_V2', JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      return next;
    });

    setAccount(newAccount);
    if (!security.duressActive) {
      setRealAccount(newAccount);
      try {
        localStorage.setItem('COLDVAULT_REAL_ACCOUNT_V2', JSON.stringify(newAccount));
      } catch (e) {
        // ignore
      }
    }

    if (vault?.encryptedSignerKey) {
      try {
        localStorage.setItem(`COLDVAULT_ENCRYPTED_SIGNER_${newAccount.id}`, vault.encryptedSignerKey);
        localStorage.setItem(`COLDVAULT_VAULT_FINGERPRINT_${newAccount.id}`, vault.vaultFingerprint);
      } catch (e) {
        // ignore
      }
    }

    syncBlockchainData(newAccount, true);
  };

  // Transaction Created Callback
  const handleSendSuccess = (newTx: Transaction) => {
    const coin = newTx.coinSymbol || 'BTC';

    const updateAccountBalance = (prev: WalletAccount): WalletAccount => {
      if (coin === 'BTC') {
        const newBtc = Math.max(0, prev.balanceBtc - (newTx.amountBtc + newTx.feeSats / 100000000));
        return {
          ...prev,
          balanceBtc: newBtc,
          balanceSats: Math.round(newBtc * 100000000)
        };
      } else {
        const updatedForks = (prev.forkBalances || []).map(f => {
          if (f.symbol === coin) {
            const feeCoin = coin === 'XEC' ? 100 : 0.0001;
            const newAmt = Math.max(0, f.amount - (newTx.amountBtc + feeCoin));
            return { ...f, amount: newAmt };
          }
          return f;
        });
        return {
          ...prev,
          forkBalances: updatedForks
        };
      }
    };

    if (security.duressActive) {
      setTransactions(prev => [newTx, ...prev]);
      setAccount(prev => updateAccountBalance(prev));
    } else {
      setRealTransactions(prev => [newTx, ...prev]);
      setTransactions(prev => [newTx, ...prev]);
      setRealAccount(prev => updateAccountBalance(prev));
      setAccount(prev => updateAccountBalance(prev));
    }

    showToast(
      lang === 'th'
        ? `โอนย้าย ${coin} จำนวน ${newTx.amountBtc.toLocaleString()} ${coin} สำเร็จ!`
        : `Sent ${newTx.amountBtc.toLocaleString()} ${coin} successfully!`,
      'success'
    );
    setActiveTab('history');
  };

  const handleSweepBtcSuccess = (amountSats: number, note: string) => {
    const amountBtc = amountSats / 100000000;
    const sweepTx: Transaction = {
      id: `sweep-tx-${Date.now()}`,
      txid: `e98a3df9${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}8849b`,
      type: 'received',
      amountBtc,
      amountSats,
      feeSats: 2500,
      feeRateSatVb: 14,
      senderAddress: '1LegacySweptAddress...vintage',
      recipientAddress: account.address,
      timestamp: Date.now(),
      status: 'completed',
      confirmations: 1,
      blockHeight: 884000,
      note,
      coinSymbol: 'BTC',
    };

    setTransactions(prev => [sweepTx, ...prev]);

    setRealAccount(prev => {
      const updatedSats = prev.balanceSats + amountSats;
      return {
        ...prev,
        balanceSats: updatedSats,
        balanceBtc: updatedSats / 100000000,
      };
    });

    setAccount(prev => {
      const updatedSats = prev.balanceSats + amountSats;
      return {
        ...prev,
        balanceSats: updatedSats,
        balanceBtc: updatedSats / 100000000,
      };
    });

    showToast(
      lang === 'th'
        ? `กวาดเหรียญ ${amountBtc.toFixed(8)} BTC เข้าสู่ Cold Vault เรียบร้อยแล้ว!`
        : `Swept ${amountBtc.toFixed(8)} BTC into your Vault!`,
      'success'
    );
  };

  const handleClaimForkCoin = (forkCoin: any) => {
    setRealAccount(prev => {
      const existing = prev.forkBalances || [];
      const filtered = existing.filter(f => f.symbol !== forkCoin.symbol);
      return {
        ...prev,
        forkBalances: [...filtered, forkCoin],
      };
    });

    setAccount(prev => {
      const existing = prev.forkBalances || [];
      const filtered = existing.filter(f => f.symbol !== forkCoin.symbol);
      return {
        ...prev,
        forkBalances: [...filtered, forkCoin],
      };
    });

    showToast(
      lang === 'th'
        ? `บันทึกสิทธิ์เหรียญ ${forkCoin.amount.toLocaleString()} ${forkCoin.symbol} เข้าพอร์ตแล้ว`
        : `Claim recorded: ${forkCoin.amount.toLocaleString()} ${forkCoin.symbol}`,
      'info'
    );
  };

  const handleUpdateSecurity = (newSettings: Partial<SecuritySettings>) => {
    setSecurity(prev => ({ ...prev, ...newSettings }));
  };

  const handleApplyDeviceDefaults = () => {
    setAirGapMode(true);
    setCurrency('THB');
    setLang('th');
    localStorage.setItem('COLDVAULT_LANG_V1', 'th');
    localStorage.setItem('COLDVAULT_CURRENCY_V1', 'THB');
    setSecurity(prev => ({
      ...prev,
      pinEnabled: true,
      pinHash: btoa('123456'),
      duressPinHash: btoa('999999'),
      antiScrambleKeypad: true,
      autoLockDelayMinutes: 5,
      biometricsEnabled: true,
      airGapMode: true,
      duressActive: false,
      blockBackgroundSync: true,
      requirePinForOnline: true,
    }));
    showToast(
      lang === 'th'
        ? '⚡ ตั้งค่าเริ่มต้นระบบพร้อมใช้งานบนอุปกรณ์ (Clean Device Installation) สำเร็จแล้ว!'
        : '⚡ Clean Device Installation Defaults successfully configured!',
      'success'
    );
  };

  return (
    <>
      {/* Offline App Lock Screen */}
      <AppLockScreen
        isLocked={isAppLocked}
        onUnlockSuccess={(pin, isDuress) => {
          setIsAppLocked(false);
          if (isDuress) {
            activateDecoyMode();
          } else {
            restoreRealMode();
          }
        }}
        lang={lang}
        storedPinHash={security.pinHash}
        duressPinHash={security.duressPinHash}
        antiScramble={security.antiScrambleKeypad}
        biometricsEnabled={security.biometricsEnabled}
      />

      <MobileFrame
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lang={lang}
        airGapMode={airGapMode}
        header={
          <HeaderBar
            account={account}
            airGapMode={airGapMode}
            onToggleAirGap={handleToggleAirGap}
            currency={currency}
            onToggleCurrency={() => setCurrency(currency === 'THB' ? 'USD' : 'THB')}
            lang={lang}
            onToggleLang={() => setLang(lang === 'th' ? 'en' : 'th')}
            onOpenVaultModal={() => {
              setQrScannedSecretForImport('');
              setIsVaultModalOpen(true);
            }}
            onAddNewWallet={() => {
              setIsWalletManagerOpen(false);
              setQrScannedSecretForImport('');
              setIsVaultModalOpen(true);
            }}
            onOpenWalletManager={() => setIsWalletManagerOpen(true)}
            onOpenQrScanner={() => setIsPrivateKeyScannerOpen(true)}
            onOpenSpvModal={() => setIsSpvModalOpen(true)}
            onOpenAutoBackup={() => setIsAutoBackupModalOpen(true)}
            onOpenRawBackup={() => setIsRawBackupMigratorOpen(true)}
            onOpenAddressTypeSwitch={() => setIsAddressTypeSwitchOpen(true)}
            onOpenMultiWalletAudit={() => setIsMultiWalletAuditOpen(true)}
            onOpenNextGenHub={() => setIsNextGenHubOpen(true)}
            onLockApp={() => setIsAppLocked(true)}
            vaultFrozen={security.vaultFrozen}
            onToggleFreeze={() => {
              triggerPinProtection(() => {
                const willFreeze = !security.vaultFrozen;
                handleUpdateSecurity({
                  vaultFrozen: willFreeze,
                  frozenTimestamp: willFreeze ? Date.now() : null,
                });
                showToast(
                  lang === 'th'
                    ? (willFreeze ? '❄️ แช่แข็งกระเป๋าเรียบร้อยแล้ว การโอนออกถูกระงับทันที' : '🔓 ปลดล็อคแช่แข็งแล้ว พร้อมโอนเงินได้ตามปกติ')
                    : (willFreeze ? '❄️ Vault Frozen! Outbound transfers locked.' : '🔓 Vault Unfrozen! Outbound transfers unlocked.'),
                  'success'
                );
              });
            }}
          />
        }
      >
        {/* Floating Toast Notification */}
        {toast && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-amber-500/40 text-amber-300 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top duration-200">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Wifi className="w-4 h-4 text-amber-400" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Main Tab Render */}
        <div className="w-full">
          {activeTab === 'home' && (
            <HomeTab
              account={account}
              market={market}
              currency={currency}
              lang={lang}
              transactions={transactions}
              onNavigateTab={setActiveTab}
              onOpenVaultModal={() => {
                setQrScannedSecretForImport('');
                setIsVaultModalOpen(true);
              }}
              onOpenLegacyScannerModal={() => {
                setQrScannedKeyForSweep('');
                setIsLegacyForkScannerOpen(true);
              }}
              onOpenQrScanner={() => setIsPrivateKeyScannerOpen(true)}
              onOpenReadinessModal={() => setIsReadinessModalOpen(true)}
              onOpenSpvModal={() => setIsSpvModalOpen(true)}
              onOpenMultiWalletAudit={() => setIsMultiWalletAuditOpen(true)}
              onOpenNextGenHub={() => setIsNextGenHubOpen(true)}
              onSelectTxDetail={setSelectedTxDetail}
              onSyncBlockchain={() => syncBlockchainData(account, true)}
              isSyncing={isSyncingBlockchain}
              security={security}
              onUnfreeze={() => {
                triggerPinProtection(() => {
                  handleUpdateSecurity({ vaultFrozen: false, frozenTimestamp: null });
                  showToast(
                    lang === 'th' ? '🔓 ปลดล็อคแช่แข็งเรียบร้อยแล้ว' : '🔓 Vault Unfrozen successfully!',
                    'success'
                  );
                });
              }}
            />
          )}

          {activeTab === 'market' && (
            <MarketTab
              market={market}
              currency={currency}
              lang={lang}
              onRefreshMarket={handleRefreshMarket}
              onNavigateToHistory={() => setActiveTab('history')}
            />
          )}

          {activeTab === 'send' && (
            <SendTab
              account={account}
              market={market}
              currency={currency}
              lang={lang}
              onOpenPinModal={triggerPinProtection}
              onSendSuccess={handleSendSuccess}
              onOpenLegacyScannerModal={() => setIsLegacyForkScannerOpen(true)}
              onNavigateToAirGap={() => setActiveTab('airgap')}
              security={security}
              onUnfreeze={() => {
                triggerPinProtection(() => {
                  handleUpdateSecurity({ vaultFrozen: false, frozenTimestamp: null });
                  showToast(
                    lang === 'th' ? '🔓 ปลดล็อคแช่แข็งเรียบร้อยแล้ว' : '🔓 Vault Unfrozen successfully!',
                    'success'
                  );
                });
              }}
            />
          )}

          {activeTab === 'receive' && (
            <ReceiveTab
              account={account}
              market={market}
              currency={currency}
              lang={lang}
              onOpenLegacyScannerModal={() => setIsLegacyForkScannerOpen(true)}
              onOpenAddressTypeSwitchModal={() => setIsAddressTypeSwitchOpen(true)}
            />
          )}

          {activeTab === 'airgap' && (
            <AirGapSignTab
              account={account}
              market={market}
              currency={currency}
              lang={lang}
              onOpenPinModal={triggerPinProtection}
              onSendSuccess={handleSendSuccess}
              onNavigateToSend={() => setActiveTab('send')}
              security={security}
              onUnfreeze={() => {
                triggerPinProtection(() => {
                  handleUpdateSecurity({ vaultFrozen: false, frozenTimestamp: null });
                  showToast(
                    lang === 'th' ? '🔓 ปลดล็อคแช่แข็งเรียบร้อยแล้ว' : '🔓 Vault Unfrozen successfully!',
                    'success'
                  );
                });
              }}
            />
          )}

          {activeTab === 'history' && (
            <HistoryTab
              transactions={transactions}
              lang={lang}
              onSelectTxDetail={setSelectedTxDetail}
              onSyncBlockchain={() => syncBlockchainData(account, true)}
              onNavigateToMarket={() => setActiveTab('market')}
              isSyncing={isSyncingBlockchain}
            />
          )}

          {activeTab === 'security' && (
            <SecurityTab
              account={account}
              accounts={accounts}
              security={security}
              lang={lang}
              onUpdateSecurity={handleUpdateSecurity}
              onOpenPinModal={triggerPinProtection}
              onOpenSetPinModal={() => {
                if (security.duressActive) {
                  setIsSettingDecoyPinOpen(true);
                } else {
                  setIsVerifyPinForOptionsOpen(true);
                }
              }}
              onOpenSetDecoyPinModal={() => setIsSettingDecoyPinOpen(true)}
              onLockApp={() => setIsAppLocked(true)}
              onExitDecoyMode={() => setIsExitDecoyPinOpen(true)}
              onResetVault={handleResetAndCreateNewVault}
              onOpenWalletManager={() => setIsWalletManagerOpen(true)}
              onOpenAddWallet={() => setIsVaultModalOpen(true)}
              onOpenLegacyScannerModal={() => setIsLegacyForkScannerOpen(true)}
              onOpenSpvModal={() => setIsSpvModalOpen(true)}
              onOpenAutoBackupModal={() => setIsAutoBackupModalOpen(true)}
              onOpenRawBackupMigratorModal={() => setIsRawBackupMigratorOpen(true)}
              onOpenAddressTypeSwitchModal={() => setIsAddressTypeSwitchOpen(true)}
              onOpenNextGenHub={() => setIsNextGenHubOpen(true)}
              airGapMode={airGapMode}
              isDeviceOnline={isDeviceOnline}
              onToggleAirGap={handleToggleAirGap}
            />
          )}
        </div>

        {/* Action Standard PIN Keypad Modal */}
        <PINKeypadModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          onSuccess={handlePinSuccess}
          lang={lang}
          storedPinHash={security.pinHash}
          duressPinHash={security.duressPinHash}
          antiScramble={security.antiScrambleKeypad}
          biometricsEnabled={security.biometricsEnabled}
        />

        {/* Verify PIN Before Opening PIN Options Menu */}
        <PINKeypadModal
          isOpen={isVerifyPinForOptionsOpen}
          onClose={() => setIsVerifyPinForOptionsOpen(false)}
          onSuccess={(pin, isDuress) => {
            setIsVerifyPinForOptionsOpen(false);
            if (isDuress) {
              activateDecoyMode();
            } else {
              setIsPinOptionsMenuOpen(true);
            }
          }}
          lang={lang}
          storedPinHash={security.pinHash}
          duressPinHash={security.duressPinHash}
          antiScramble={security.antiScrambleKeypad}
          biometricsEnabled={security.biometricsEnabled}
          titleOverride={t.enterOldPinTitle}
          subtitleOverride={t.enterOldPinDesc}
        />

        {/* Nested PIN Settings Options Menu (Covert) */}
        <PinOptionsMenuModal
          isOpen={isPinOptionsMenuOpen}
          onClose={() => setIsPinOptionsMenuOpen(false)}
          onSelectChangeMainPin={() => {
            setIsPinOptionsMenuOpen(false);
            setIsSettingMainPinOpen(true);
          }}
          onSelectConfigureDecoyPin={() => {
            setIsPinOptionsMenuOpen(false);
            setIsSettingDecoyPinOpen(true);
          }}
          lang={lang}
        />

        {/* Connect Online PIN Verification Modal */}
        <PINKeypadModal
          isOpen={isConnectOnlinePinOpen}
          onClose={() => setIsConnectOnlinePinOpen(false)}
          onSuccess={handleConnectOnlineSuccess}
          lang={lang}
          storedPinHash={security.pinHash}
          duressPinHash={security.duressPinHash}
          antiScramble={security.antiScrambleKeypad}
          titleOverride={t.enterPinToConnectOnline}
          subtitleOverride={t.enterPinToConnectOnlineDesc}
        />

        {/* Change Main PIN Modal */}
        <PINKeypadModal
          isOpen={isSettingMainPinOpen}
          onClose={() => setIsSettingMainPinOpen(false)}
          onSuccess={(newPin) => handleSetMainPinSuccess(newPin)}
          lang={lang}
          storedPinHash={security.pinHash}
          duressPinHash={security.duressPinHash}
          antiScramble={security.antiScrambleKeypad}
          isSettingNewPin={true}
          skipOldPin={true}
          titleOverride={t.setPinTitle}
        />

        {/* Change Decoy PIN Modal */}
        <PINKeypadModal
          isOpen={isSettingDecoyPinOpen}
          onClose={() => setIsSettingDecoyPinOpen(false)}
          onSuccess={(newDecoyPin) => handleSetDecoyPinSuccess(newDecoyPin)}
          lang={lang}
          storedPinHash={security.pinHash}
          duressPinHash={security.duressPinHash}
          antiScramble={security.antiScrambleKeypad}
          isSettingDecoyPin={true}
          skipOldPin={true}
          titleOverride={t.setDecoyPinTitle}
        />

        {/* Exit Decoy Mode PIN Verification Modal */}
        <PINKeypadModal
          isOpen={isExitDecoyPinOpen}
          onClose={() => setIsExitDecoyPinOpen(false)}
          onSuccess={handleExitDecoySuccess}
          lang={lang}
          storedPinHash={security.pinHash}
          duressPinHash={security.duressPinHash}
          antiScramble={security.antiScrambleKeypad}
          biometricsEnabled={security.biometricsEnabled}
          titleOverride={lang === 'th' ? 'กรอกรหัส PIN หลักเพื่อกลับสู่กระเป๋าจริง' : 'Enter Main PIN to Exit Decoy Mode'}
        />

        {/* Offline Seed / Private Key Import Modal */}
        <OfflineVaultImportModal
          isOpen={isVaultModalOpen}
          onClose={() => {
            setIsVaultModalOpen(false);
            setQrScannedSecretForImport('');
          }}
          onVaultSealed={(acc, v) => {
            setQrScannedSecretForImport('');
            handleVaultSealed(acc, v);
          }}
          lang={lang}
          initialSecret={qrScannedSecretForImport}
          onOpenQrScanner={() => {
            setIsVaultModalOpen(false);
            setIsPrivateKeyScannerOpen(true);
          }}
          onOpenScannerWithKey={(key) => {
            setIsVaultModalOpen(false);
            setQrScannedKeyForSweep(key);
            setIsLegacyForkScannerOpen(true);
          }}
          onOpenRawBackupMigrator={() => {
            setIsVaultModalOpen(false);
            setIsRawBackupMigratorOpen(true);
          }}
        />

        {/* Multi-Wallet Manager Modal */}
        <WalletManagerModal
          isOpen={isWalletManagerOpen}
          onClose={() => setIsWalletManagerOpen(false)}
          accounts={accounts}
          activeAccountId={account.id}
          onSelectAccount={handleSelectAccount}
          onAddNewWallet={() => {
            setIsWalletManagerOpen(false);
            setQrScannedSecretForImport('');
            setIsVaultModalOpen(true);
          }}
          onOpenRawBackupMigrator={() => {
            setIsWalletManagerOpen(false);
            setIsRawBackupMigratorOpen(true);
          }}
          onOpenAddressTypeSwitch={() => {
            setIsWalletManagerOpen(false);
            setIsAddressTypeSwitchOpen(true);
          }}
          onDeleteAccount={handleDeleteAccount}
          onOpenMultiWalletAudit={() => {
            setIsWalletManagerOpen(false);
            setIsMultiWalletAuditOpen(true);
          }}
          lang={lang}
        />

        {/* Multi-Wallet BTC Simultaneous Balance & Hard Fork Pipeline Audit Modal */}
        <MultiWalletAuditModal
          isOpen={isMultiWalletAuditOpen}
          onClose={() => setIsMultiWalletAuditOpen(false)}
          accounts={accounts}
          activeAccount={account}
          market={market}
          currency={currency}
          lang={lang}
          onApplyUpdatedAccounts={(updatedAccounts) => {
            setAccounts(updatedAccounts);
            const currentUpdated = updatedAccounts.find((a) => a.id === account.id);
            if (currentUpdated) {
              setAccount(currentUpdated);
              setRealAccount(currentUpdated);
            }
            showToast(
              lang === 'th'
                ? `ตรวจสอบยอดเหรียญทุกกระเป๋าเสร็จสมบูรณ์ (${updatedAccounts.length} กระเป๋า)`
                : `Simultaneous wallet audit complete (${updatedAccounts.length} wallets)`,
              'success'
            );
          }}
        />

        {/* Transaction Detail Sheet Modal */}
        <TransactionDetailModal
          tx={selectedTxDetail}
          onClose={() => setSelectedTxDetail(null)}
          lang={lang}
          currency={currency}
          market={market}
          onSpvVerifyUpdate={(updatedTx) => {
            setSelectedTxDetail(updatedTx);
            setTransactions((prev) => prev.map((t) => (t.id === updatedTx.id ? updatedTx : t)));
            setRealTransactions((prev) => prev.map((t) => (t.id === updatedTx.id ? updatedTx : t)));
          }}
        />

        {/* Bitcoin SPV (Simplified Payment Verification) Node Modal */}
        <SpvNodeStatusModal
          isOpen={isSpvModalOpen}
          onClose={() => setIsSpvModalOpen(false)}
          lang={lang}
          walletTransactions={transactions}
        />

        {/* Wallet Readiness & Live Network Analysis Modal */}
        <WalletReadinessModal
          isOpen={isReadinessModalOpen}
          onClose={() => setIsReadinessModalOpen(false)}
          account={account}
          market={market}
          currency={currency}
          lang={lang}
          onRefreshMarket={handleRefreshMarket}
          onApplyDeviceDefaults={handleApplyDeviceDefaults}
          airGapMode={airGapMode}
          security={security}
        />

        {/* Global Multi-Chain Legacy & Hard Fork Sweeper Modal */}
        <LegacyForkScannerModal
          isOpen={isLegacyForkScannerOpen}
          onClose={() => {
            setIsLegacyForkScannerOpen(false);
            setQrScannedKeyForSweep('');
          }}
          lang={lang}
          currency={currency}
          market={market}
          userVaultAddress={account.address}
          onSweepBtcSuccess={handleSweepBtcSuccess}
          onClaimForkCoin={handleClaimForkCoin}
          initialKey={qrScannedKeyForSweep}
          onOpenQrScanner={() => {
            setIsLegacyForkScannerOpen(false);
            setIsPrivateKeyScannerOpen(true);
          }}
          onSelectKeyForImport={handleSelectKeyForImport}
        />

        {/* Dedicated QR Code Private Key & Paper Wallet Scanner Modal */}
        <PrivateKeyQrScannerModal
          isOpen={isPrivateKeyScannerOpen}
          onClose={() => setIsPrivateKeyScannerOpen(false)}
          lang={lang}
          onSelectKeyForSweep={handleSelectKeyForSweep}
          onSelectKeyForImport={handleSelectKeyForImport}
        />

        {/* Auto Backup & Data Vault Modal */}
        <AutoBackupModal
          isOpen={isAutoBackupModalOpen}
          onClose={() => setIsAutoBackupModalOpen(false)}
          lang={lang}
          currency={currency}
          realAccount={realAccount}
          accounts={accounts}
          realTransactions={realTransactions}
          security={security}
          onRestoreData={handleRestoreFromBackup}
          onShowToast={showToast}
        />

        {/* Raw Backup Ingestion & Legacy Migration Modal */}
        <RawBackupMigratorModal
          isOpen={isRawBackupMigratorOpen}
          onClose={() => setIsRawBackupMigratorOpen(false)}
          lang={lang}
          onMigrateComplete={(newAccounts, primaryAccount) => {
            handleMigrateAccountsComplete(newAccounts, primaryAccount);
            setIsRawBackupMigratorOpen(false);
          }}
          onShowToast={showToast}
          userPin="123456"
          onOpenPinModal={triggerPinProtection}
        />

        {/* Address Type Switcher & Missing Coin Recovery Modal */}
        <AddressTypeSwitchModal
          isOpen={isAddressTypeSwitchOpen}
          onClose={() => setIsAddressTypeSwitchOpen(false)}
          lang={lang}
          currentAccount={account}
          allAccounts={accounts}
          onSwitchAddressType={handleSwitchAddressType}
          onAddParallelWallet={handleAddParallelWallet}
          onShowToast={showToast}
          userPin="123456"
          onOpenPinModal={triggerPinProtection}
          isDeviceOnline={!airGapMode}
        />
      </MobileFrame>
    </>
  );
}

