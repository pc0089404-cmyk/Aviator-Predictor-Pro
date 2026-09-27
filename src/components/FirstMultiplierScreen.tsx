import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  X,
  Delete,
  RotateCcw,
  Radar,
  Flame,
} from 'lucide-react';
import { audioService } from '../services/audioService';
import { hapticsService } from '../services/hapticsService';
import { AviatorLogo } from './AviatorLogo';

interface FirstMultiplierScreenProps {
  initialValue?: number | null;
  onContinue: (multiplier: number) => void;
  isRecalibration?: boolean;
  onCancel?: () => void;
}

export const FirstMultiplierScreen: React.FC<FirstMultiplierScreenProps> = ({
  initialValue,
  onContinue,
  isRecalibration = false,
  onCancel,
}) => {
  const [inputValue, setInputValue] = useState<string>(
    initialValue && initialValue >= 1.01 ? initialValue.toFixed(2) : '2.45'
  );
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyProgress, setVerifyProgress] = useState<number>(0);
  const [verifyStep, setVerifyStep] = useState<string>('Calibrating Flight Telemetry...');

  // Soft capsule presets
  const presets = ['1.50', '1.85', '2.45', '3.50', '5.00'];

  // Strict decimal validation:
  // Numbers without a decimal point (like 67, 5, 3) MUST show WRONG/Incorrect!
  const rawInput = inputValue.trim();
  const cleanInput = rawInput.toLowerCase().replace(/x$/, '').trim();
  const hasDecimal = cleanInput.includes('.');
  const decimalParts = cleanInput.split('.');

  const hasValidDecimalFormat =
    hasDecimal &&
    decimalParts.length === 2 &&
    decimalParts[0].length > 0 &&
    decimalParts[1].length >= 1 &&
    decimalParts[1].length <= 2;

  const parsedNumber = parseFloat(cleanInput);
  const isNumberValid =
    !isNaN(parsedNumber) && parsedNumber >= 1.01 && parsedNumber <= 250;

  // Format must strictly have dot (.) and valid range
  const isValid = hasValidDecimalFormat && isNumberValid;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    val = val.replace(/[^0-9.xX]/g, '');
    setInputValue(val);
  };

  const handleAppendChar = (char: string) => {
    audioService.playCountdownTick();
    hapticsService.triggerLightPulse();
    if (char === 'CLEAR') {
      setInputValue('');
      return;
    }
    if (char === 'DEL') {
      setInputValue((prev) => prev.slice(0, -1));
      return;
    }
    // Prevent multiple dots
    if (char === '.' && inputValue.includes('.')) {
      return;
    }
    // Prevent multiple x's
    if ((char === 'x' || char === 'X') && (inputValue.includes('x') || inputValue.includes('X'))) {
      return;
    }
    setInputValue((prev) => prev + char);
  };

  const handleSelectPreset = (preset: string) => {
    audioService.playCountdownTick();
    hapticsService.triggerLightPulse();
    setInputValue(preset);
  };

  const handleStartVerification = () => {
    if (!isValid) {
      audioService.playCountdownTick();
      return;
    }

    audioService.playSignalAlert();
    hapticsService.triggerSignalLock();
    setIsVerifying(true);
    setVerifyProgress(18);
    setVerifyStep('Syncing Aviator Flight Altitude...');

    setTimeout(() => {
      setVerifyProgress(52);
      setVerifyStep('Calibrating Trajectory Corridor...');
    }, 380);

    setTimeout(() => {
      setVerifyProgress(84);
      setVerifyStep('Locking Telemetry Vectors...');
    }, 720);

    setTimeout(() => {
      setVerifyProgress(100);
      setVerifyStep('Calibrated! Launching Flight Radar...');
    }, 1050);

    setTimeout(() => {
      onContinue(Number(parsedNumber.toFixed(2)));
    }, 1300);
  };

  // Dedicated Circular/Capsule Verify Animation Loading Screen
  if (isVerifying) {
    return (
      <div className="min-h-screen w-full bg-[#050001] text-white flex flex-col items-center justify-center px-6 relative select-none">
        {/* Soft radial pulse background */}
        <div className="absolute w-96 h-96 bg-red-600/20 rounded-full blur-[140px] pointer-events-none animate-pulse" />

        <div className="relative z-10 w-full max-w-sm bg-gradient-to-b from-[#140205] to-[#080102] border border-red-500/40 rounded-[36px] p-7 shadow-[0_0_60px_rgba(239,68,68,0.28)] text-center space-y-6 backdrop-blur-2xl">
          {/* Top Logo */}
          <div className="flex justify-center pb-3 border-b border-red-950/60">
            <AviatorLogo size="sm" showText={true} />
          </div>

          {/* Smooth Circular Scanning Radar */}
          <div className="relative w-28 h-28 mx-auto my-3">
            {/* Outer soft ring */}
            <div className="absolute inset-0 rounded-full border-2 border-red-950/80 shadow-[inset_0_0_20px_rgba(239,68,68,0.2)]" />
            {/* Rotating gradient ring */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-red-500 border-r-rose-400 animate-spin" />
            {/* Counter rotating dashed ring */}
            <div
              className="absolute inset-2.5 rounded-full border border-dashed border-red-500/40 animate-spin"
              style={{ animationDirection: 'reverse', animationDuration: '7s' }}
            />
            {/* Center icon & progress */}
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <Zap className="w-7 h-7 text-red-500 animate-pulse drop-shadow-[0_0_10px_#ef4444]" />
              <span className="text-[11px] font-mono font-bold text-red-300 mt-1">
                {verifyProgress}%
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-red-400 font-bold block mb-1">
              CALIBRATING MULTIPLIER
            </span>
            <div className="text-4xl font-black text-white font-mono flex items-baseline justify-center gap-1">
              <span>{parsedNumber.toFixed(2)}</span>
              <span className="text-red-500 text-2xl font-bold">x</span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-2.5 flex items-center justify-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>{verifyStep}</span>
            </p>
          </div>

          {/* Smooth Pill Progress Bar */}
          <div className="w-full bg-black/80 h-2.5 border border-red-950/90 overflow-hidden rounded-full p-0.5">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-red-400 transition-all duration-300 rounded-full shadow-[0_0_14px_rgba(239,68,68,0.9)]"
              style={{ width: `${verifyProgress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#050001] text-white flex flex-col justify-between py-4 px-4 select-none relative overflow-hidden font-sans">
      {/* Background crimson ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-64 bg-red-600/15 rounded-full blur-[130px] pointer-events-none" />

      <div className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-between relative z-10">
        <div>
          {/* Header with authentic Aviator Logo and soft pill styling */}
          <div className="flex items-center justify-between pb-3.5 border-b border-red-950/60">
            <AviatorLogo size="md" showText={true} />

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#120204] border border-red-950 text-[10px] font-mono text-red-400">
                <Radar className="w-3 h-3 text-red-500 animate-spin" style={{ animationDuration: '4s' }} />
                <span>RADAR READY</span>
              </div>

              {isRecalibration && onCancel && (
                <button
                  onClick={onCancel}
                  className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Screen Title */}
          <div className="mt-4 mb-3 text-center">
            <h1 className="text-xl font-black uppercase tracking-tight text-white flex items-center justify-center gap-2">
              <Flame className="w-5 h-5 text-red-500" />
              <span>{isRecalibration ? 'Recalibrate Multiplier' : 'Calibrate Multiplier'}</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Enter flight baseline multiplier (e.g.{' '}
              <span className="text-red-400 font-mono font-bold">2.45x</span>)
            </p>
          </div>

          {/* SOFT, CURVED CAPSULE MULTIPLIER DISPLAY (NOT BOXY, SOFT & EASY) */}
          <div
            className={`p-4 rounded-[32px] border transition-all duration-300 shadow-2xl backdrop-blur-xl relative overflow-hidden ${
              isValid
                ? 'bg-gradient-to-b from-[#140407] to-[#0a0102] border-emerald-500/70 shadow-[0_0_25px_rgba(16,185,129,0.22)]'
                : rawInput.length === 0
                ? 'bg-gradient-to-b from-[#100204] to-[#070102] border-red-950/80 shadow-none'
                : 'bg-gradient-to-b from-[#180306] to-[#0a0102] border-rose-500/70 shadow-[0_0_25px_rgba(239,68,68,0.26)]'
            }`}
          >
            {/* Soft decorative ambient circular aura inside */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

            {/* Capsule Header */}
            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-red-300 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>FLIGHT MULTIPLIER</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded-full bg-black/60 border border-red-950">
                DECIMAL FORMAT
              </span>
            </div>

            {/* Input Row: Soft Curved Pill with Locked 'x' */}
            <div className="flex items-center justify-between bg-black/85 border border-red-950/90 rounded-full px-5 py-3 shadow-inner">
              <input
                id="multiplier-input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                autoFocus
                placeholder="2.45"
                value={inputValue}
                onChange={handleInputChange}
                className="font-mono text-3xl sm:text-4xl font-black tracking-tight bg-transparent outline-none w-full text-white placeholder-zinc-700"
              />
              <span className="font-mono text-3xl font-black text-red-500 pl-2 select-none">
                x
              </span>
            </div>

            {/* Soft Status Badge: Shows clear WRONG when missing '.' or 'x' */}
            <div className="mt-3 pt-2.5 border-t border-red-950/60 flex items-center justify-between text-xs font-mono">
              {isValid ? (
                <div className="flex items-center gap-2 text-emerald-400 font-bold px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/40">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>CORRECT · {parsedNumber.toFixed(2)}x READY</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-rose-400 font-bold animate-pulse px-3 py-1 rounded-full bg-rose-950/40 border border-rose-500/40">
                  <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>
                    {!hasDecimal
                      ? 'WRONG: Missing dot (.) e.g. 2.45'
                      : 'WRONG: Invalid format (use 2.45)'}
                  </span>
                </div>
              )}

              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-black border border-red-950 text-zinc-400 font-bold">
                {isValid ? 'VERIFIED' : 'WRONG'}
              </span>
            </div>
          </div>

          {/* Quick Odds Capsules (Soft, Round Pills) */}
          <div className="mt-3.5">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-zinc-400 mb-2 px-1">
              <span>Quick Odds Select</span>
              <Sparkles className="w-3 h-3 text-red-400" />
            </div>
            <div className="grid grid-cols-5 gap-2">
              {presets.map((p) => {
                const isSelected = inputValue.trim().replace(/x$/i, '') === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`py-2 rounded-full border text-xs font-mono font-bold transition-all active:scale-90 shadow-sm ${
                      isSelected
                        ? 'border-red-500 bg-red-600 text-white shadow-lg shadow-red-900/50'
                        : 'border-red-950/80 bg-[#120204] text-zinc-300 hover:border-red-800'
                    }`}
                  >
                    {p}x
                  </button>
                );
              })}
            </div>
          </div>

          {/* Soft Circular Keypad (Soft, round buttons, free & effortless to use) */}
          <div className="mt-3.5 p-3 bg-gradient-to-b from-[#120205] to-[#080102] border border-red-950/80 rounded-[30px] shadow-xl">
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleAppendChar(digit)}
                  className="py-3 rounded-2xl bg-[#190306] hover:bg-[#25050a] active:bg-red-600 border border-red-950/90 text-sm font-bold text-zinc-200 hover:text-white transition-all active:scale-95 shadow-sm"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={() => handleAppendChar('DEL')}
                className="py-3 rounded-2xl bg-[#190306] hover:bg-rose-950/50 active:bg-red-800 border border-red-950/90 text-xs font-bold text-red-400 hover:text-red-300 transition-all active:scale-95 flex items-center justify-center shadow-sm"
                title="Backspace"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-red-950/60 text-[10px] font-mono text-zinc-400 px-1">
              <button
                type="button"
                onClick={() => handleAppendChar('CLEAR')}
                className="flex items-center gap-1.5 text-zinc-400 hover:text-red-400 px-2 py-1 rounded-full bg-black/40 border border-red-950"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear All</span>
              </button>
              <span className="text-zinc-500">Tap below to verify</span>
            </div>
          </div>
        </div>

        {/* Action Button: Verify and Enter Dashboard (Soft rounded pill) */}
        <div className="pt-3 pb-1 space-y-2">
          <button
            type="button"
            onClick={handleStartVerification}
            disabled={!isValid}
            className={`w-full py-4 rounded-full font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-2xl ${
              isValid
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white shadow-[0_4px_25px_rgba(239,68,68,0.45)] hover:brightness-110 cursor-pointer border border-red-400/40'
                : 'bg-zinc-900/90 text-zinc-600 cursor-not-allowed border border-zinc-800'
            }`}
          >
            <span>{isRecalibration ? 'Apply Multiplier' : 'Verify & Enter Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400 font-mono text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>Aviator Live Stream · Verified Telemetry Corridor</span>
          </div>
        </div>
      </div>
    </div>
  );
};

