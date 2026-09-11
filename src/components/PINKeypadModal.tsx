import React, { useState, useEffect } from 'react';
import { Lock, Delete, ShieldAlert, CheckCircle2, Eye, EyeOff, Info, RotateCcw } from 'lucide-react';
import { Language } from '../types/wallet';
import { i18n } from '../utils/i18n';
import { triggerHaptic } from '../utils/haptics';

interface PINKeypadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pin: string, isDuress: boolean) => void;
  lang: Language;
  storedPinHash: string | null;
  duressPinHash: string | null;
  antiScramble: boolean;
  titleOverride?: string;
  subtitleOverride?: string;
  isSettingNewPin?: boolean;
  isSettingDecoyPin?: boolean;
  skipOldPin?: boolean;
}

export const PINKeypadModal: React.FC<PINKeypadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  lang,
  storedPinHash,
  duressPinHash,
  antiScramble,
  titleOverride,
  subtitleOverride,
  isSettingNewPin = false,
  isSettingDecoyPin = false,
  skipOldPin = false,
}) => {
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [step, setStep] = useState<'enter_old' | 'enter' | 'create' | 'confirm'>('enter');
  const [error, setError] = useState<string | null>(null);
  const [keypadOrder, setKeypadOrder] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
  const [showNumbers, setShowNumbers] = useState<boolean>(true);

  const t = i18n[lang];

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setConfirmPin('');
      setError(null);
      if (skipOldPin && (isSettingNewPin || isSettingDecoyPin)) {
        setStep('create');
      } else if ((isSettingNewPin || isSettingDecoyPin) && storedPinHash) {
        setStep('enter_old');
      } else if (isSettingNewPin || isSettingDecoyPin || !storedPinHash) {
        setStep('create');
      } else {
        setStep('enter');
      }
      scrambleKeypad();
    }
  }, [isOpen, isSettingNewPin, isSettingDecoyPin, storedPinHash, skipOldPin]);

  const scrambleKeypad = () => {
    if (antiScramble) {
      const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
      }
      setKeypadOrder(numbers);
    } else {
      setKeypadOrder([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
    }
  };

  if (!isOpen) return null;

  const handleKeyPress = (num: number) => {
    triggerHaptic('light');
    setError(null);
    if (step === 'enter_old') {
      if (pin.length < 6) {
        const nextPin = pin + num.toString();
        setPin(nextPin);
        if (nextPin.length === 6) {
          const isOldValid = !storedPinHash || btoa(nextPin) === storedPinHash;
          if (isOldValid) {
            triggerHaptic('success');
            setTimeout(() => {
              setPin('');
              setStep('create');
              setError(null);
            }, 150);
          } else {
            triggerHaptic('error');
            setError(t.enterOldPinError);
            setPin('');
          }
        }
      }
    } else if (step === 'enter') {
      if (pin.length < 6) {
        const nextPin = pin + num.toString();
        setPin(nextPin);
        if (nextPin.length === 6) {
          validateEnteredPin(nextPin);
        }
      }
    } else if (step === 'create') {
      if (pin.length < 6) {
        const nextPin = pin + num.toString();
        setPin(nextPin);
        if (nextPin.length === 6) {
          triggerHaptic('medium');
          setTimeout(() => {
            setConfirmPin('');
            setStep('confirm');
          }, 200);
        }
      }
    } else if (step === 'confirm') {
      if (confirmPin.length < 6) {
        const nextConfirm = confirmPin + num.toString();
        setConfirmPin(nextConfirm);
        if (nextConfirm.length === 6) {
          if (nextConfirm === pin) {
            if (isSettingDecoyPin) {
              // Check if decoy PIN is identical to main PIN
              const isMainPin = !!storedPinHash && btoa(nextConfirm) === storedPinHash;
              if (isMainPin) {
                triggerHaptic('error');
                setError(t.decoyPinSameAsMainError);
                setPin('');
                setConfirmPin('');
                setStep('create');
                return;
              }
              triggerHaptic('success');
              onSuccess(nextConfirm, true);
            } else {
              triggerHaptic('success');
              onSuccess(nextConfirm, false);
            }
          } else {
            triggerHaptic('error');
            setError(lang === 'th' ? 'รหัส PIN ไม่ตรงกัน กรุณาตั้งใหม่' : 'PINs do not match. Try again.');
            setPin('');
            setConfirmPin('');
            setStep('create');
          }
        }
      }
    }

    if (antiScramble) {
      scrambleKeypad();
    }
  };

  const validateEnteredPin = (enteredPin: string) => {
    if (!storedPinHash) {
      triggerHaptic('success');
      onSuccess(enteredPin, false);
      return;
    }

    const enteredHash = btoa(enteredPin);
    const isPrimaryValid = enteredHash === storedPinHash;
    const isDuressValid = !!duressPinHash && enteredHash === duressPinHash;

    if (isDuressValid) {
      triggerHaptic('success');
      onSuccess(enteredPin, true);
    } else if (isPrimaryValid) {
      triggerHaptic('success');
      onSuccess(enteredPin, false);
    } else {
      triggerHaptic('error');
      setError(t.pinErrorMsg);
      setPin('');
    }
  };

  const handleDelete = () => {
    triggerHaptic('light');
    setError(null);
    if (step === 'confirm') {
      setConfirmPin(prev => prev.slice(0, -1));
    } else {
      setPin(prev => prev.slice(0, -1));
    }
  };

  const currentPinLength = step === 'confirm' ? confirmPin.length : pin.length;

  const defaultTitle = step === 'enter_old'
    ? t.enterOldPinTitle
    : step === 'create'
    ? (isSettingDecoyPin ? t.setDecoyPinTitle : t.setPinTitle)
    : step === 'confirm'
    ? t.confirmPinTitle
    : isSettingDecoyPin
    ? t.setDecoyPinTitle
    : isSettingNewPin
    ? t.setPinTitle
    : t.enterPinTitle;

  const defaultSubtitle = step === 'enter_old'
    ? t.enterOldPinDesc
    : step === 'create'
    ? (isSettingDecoyPin ? (lang === 'th' ? 'กรอกรหัส PIN ปลอม 6 หลักใหม่' : 'Enter new 6-digit Decoy PIN') : (lang === 'th' ? 'กรอกรหัส PIN 6 หลักใหม่' : 'Enter new 6-digit Main PIN'))
    : step === 'confirm'
    ? (lang === 'th' ? 'กรอกรหัส PIN อีกครั้งเพื่อยืนยัน' : 'Enter 6-digit PIN again to confirm')
    : (antiScramble ? (
        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
          <ShieldAlert className="w-3.5 h-3.5" />
          {lang === 'th' ? 'แป้นพิมพ์สลับปุ่ม Anti-Keylogger ทำงานอยู่' : 'Anti-Keylogger Scramble Active'}
        </span>
      ) : (
        t.enterPinDesc
      ));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 flex flex-col items-center">
        {/* Header Icon */}
        <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400 shadow-lg shadow-amber-500/5">
          <Lock className="w-7 h-7" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-slate-50 text-center">
          {titleOverride && step !== 'enter_old' && step !== 'confirm' ? titleOverride : defaultTitle}
        </h3>

        <p className="text-xs text-slate-400 text-center mt-1 mb-6 px-2">
          {subtitleOverride && step !== 'enter_old' && step !== 'confirm' ? subtitleOverride : defaultSubtitle}
        </p>

        {/* Default PIN Hint Banner */}
        <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl p-2.5 text-[11px] font-mono text-amber-300 text-center mb-5 flex items-center justify-center gap-2 shadow-inner">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {lang === 'th'
              ? 'รหัส PIN เริ่มต้น: 123456 (รหัสฉุกเฉิน: 999999)'
              : 'Default PIN: 123456 (Duress: 999999)'}
          </span>
        </div>

        {/* PIN Indicators */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {[0, 1, 2, 3, 4, 5].map(idx => {
            const filled = idx < currentPinLength;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  filled
                    ? 'bg-amber-400 scale-110 shadow-md shadow-amber-500/50'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="w-full bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 text-xs text-rose-400 text-center mb-4 flex items-center justify-center gap-1.5 animate-bounce">
            <ShieldAlert className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Keypad Grid (3 columns x 4 rows) */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mb-4">
          {/* Top 3 rows: first 9 digits */}
          {keypadOrder.slice(0, 9).map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="w-16 h-16 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 active:scale-95 transition-all text-2xl font-bold text-slate-100 flex items-center justify-center shadow-sm"
            >
              {showNumbers ? num : '•'}
            </button>
          ))}

          {/* Bottom Row: [Eye Toggle] [10th Digit] [Delete] */}
          <button
            type="button"
            onClick={() => setShowNumbers(!showNumbers)}
            className="w-16 h-16 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 flex items-center justify-center text-xs"
            title="Toggle Number Mask"
          >
            {showNumbers ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>

          {/* 10th Scrambled Digit */}
          {keypadOrder.length >= 10 && (
            <button
              key={keypadOrder[9]}
              type="button"
              onClick={() => handleKeyPress(keypadOrder[9])}
              className="w-16 h-16 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 active:scale-95 transition-all text-2xl font-bold text-slate-100 flex items-center justify-center shadow-sm"
            >
              {showNumbers ? keypadOrder[9] : '•'}
            </button>
          )}

          <button
            type="button"
            onClick={handleDelete}
            className="w-16 h-16 rounded-2xl bg-slate-800/40 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 flex items-center justify-center active:scale-95 transition-all"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Quick Default Fill button for ease of use */}
        {step === 'enter' && (
          <button
            type="button"
            onClick={() => {
              validateEnteredPin('123456');
            }}
            className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all mb-2"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'th' ? 'ปลดล็อกด้วยรหัสเริ่มต้น (123456)' : 'Unlock with Default PIN (123456)'}</span>
          </button>
        )}

        {/* Cancel Button */}
        <button
          type="button"
          onClick={onClose}
          className="mt-2 text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
        >
          {t.cancel}
        </button>
      </div>
    </div>
  );
};
