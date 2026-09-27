import React from 'react';
import { SignalData, SignalOutlook } from '../types/predictor';
import { RefreshCw, Zap, Clock, ShieldCheck } from 'lucide-react';

interface CircularMultiplierProps {
  signal: SignalData | null;
  isTransitioning: boolean;
  animationsEnabled: boolean;
  onManualSync: () => void;
}

export const CircularMultiplier: React.FC<CircularMultiplierProps> = ({
  signal,
  isTransitioning,
  animationsEnabled,
  onManualSync,
}) => {
  const multiplier = signal?.multiplier ?? 2.45;
  const outlook: SignalOutlook = signal?.outlook ?? 'NORMAL';
  const confidence = signal?.confidence ?? 86;
  const remainingSeconds = signal?.remainingSeconds ?? 35;
  const durationSeconds = signal?.durationSeconds ?? 45;

  // Percentage for the loading circle countdown (0% to 100%)
  const progressRatio = Math.max(0, Math.min(1, remainingSeconds / Math.max(1, durationSeconds)));
  const strokeDashoffset = 565 * (1 - progressRatio); // 2 * PI * r (r=90 => circumference ~565.48)

  const getOutlookDetails = (out: SignalOutlook) => {
    switch (out) {
      case 'HIGH':
        return {
          label: 'HIGH OUTLOOK',
          color: 'text-rose-400',
          bg: 'bg-rose-500/20 border-rose-500/40',
          glow: 'rgba(244, 63, 94, 0.45)',
        };
      case 'NORMAL':
        return {
          label: 'NORMAL CORRIDOR',
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/20 border-emerald-500/40',
          glow: 'rgba(52, 211, 153, 0.45)',
        };
      case 'LOW':
        return {
          label: 'LOW RANGE',
          color: 'text-amber-400',
          bg: 'bg-amber-500/20 border-amber-500/40',
          glow: 'rgba(251, 191, 36, 0.45)',
        };
    }
  };

  const outlookInfo = getOutlookDetails(outlook);

  return (
    <div className="relative flex flex-col items-center justify-center my-3 select-none">
      {/* Ambient background crimson glow */}
      <div
        className="absolute w-80 h-80 rounded-full blur-[85px] pointer-events-none transition-all duration-700"
        style={{
          backgroundColor: isTransitioning
            ? 'rgba(239, 68, 68, 0.35)'
            : 'rgba(220, 38, 38, 0.22)',
        }}
      />

      {/* Main Animated Loading Circle Container */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
        {/* Layer 1: SVG Progress Track and Rotating Arc */}
        <svg
          className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none"
          viewBox="0 0 200 200"
        >
          {/* Background circle track */}
          <circle
            cx="100"
            cy="100"
            r="90"
            className="stroke-red-950/40"
            strokeWidth="5"
            fill="none"
          />

          {/* Animated Countdown Progress Meter (loads 30s-50s) */}
          <circle
            cx="100"
            cy="100"
            r="90"
            className="stroke-red-600 transition-all duration-300 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]"
            strokeWidth="6"
            strokeDasharray="565.48"
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        {/* Layer 2: Rotating Outer Orbital Laser Ring */}
        <div
          className={`absolute inset-0 rounded-full ${
            animationsEnabled ? 'animate-spin-slow' : ''
          }`}
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg, rgba(239, 68, 68, 0.1) 180deg, rgba(239, 68, 68, 0.95) 340deg, #ffffff 360deg)',
            padding: '2px',
          }}
        >
          <div className="w-full h-full bg-[#070102] rounded-full" />
        </div>

        {/* Orbiting Plane / Glowing Beacon Head */}
        {animationsEnabled && (
          <div
            className="absolute inset-0 rounded-full animate-spin-slow pointer-events-none"
            style={{ animationDuration: '9s' }}
          >
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_14px_#ff1744] border-2 border-white flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              </div>
            </div>
          </div>
        )}

        {/* Layer 3: Secondary Counter-Rotating Telemetry Dashed Ring */}
        <div
          className={`absolute inset-4 rounded-full border border-dashed border-red-500/30 pointer-events-none ${
            animationsEnabled ? 'animate-spin-reverse' : ''
          }`}
          style={{ animationDuration: '16s' }}
        />

        {/* Layer 4: Deep Red/Black Cockpit Core Center */}
        <div className="absolute inset-6 rounded-full bg-gradient-to-b from-[#1c0307] via-[#100103] to-[#060001] border-2 border-red-500/40 shadow-[inset_0_0_40px_rgba(239,68,68,0.3)] flex flex-col items-center justify-center p-3 text-center z-10 overflow-hidden">
          {/* Subtle radar grid background */}
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.18)_0,transparent_75%)] pointer-events-none" />

          {/* Top Status inside circle */}
          <div className="relative z-10 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/80 border border-red-500/40 text-[10px] font-mono font-bold tracking-wider text-red-300">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isTransitioning ? 'bg-amber-400 animate-spin' : 'bg-red-500 animate-pulse'
                }`}
              />
              {isTransitioning ? 'ACQUIRING...' : 'LIVE SIGNAL'}
            </span>
          </div>

          {/* THE MULTIPLIER AND PROMINENT 'X' DISPLAY */}
          <div className="relative z-10 my-0.5 flex items-baseline justify-center gap-0.5">
            <span className="font-mono text-5xl sm:text-6xl font-black tracking-tight text-white drop-shadow-[0_4px_20px_rgba(255,255,255,0.25)]">
              {isTransitioning ? '---' : multiplier.toFixed(2)}
            </span>
            <span className="font-mono text-3xl sm:text-4xl font-black text-red-500 drop-shadow-[0_0_16px_rgba(239,68,68,0.85)] ml-0.5">
              x
            </span>
          </div>

          {/* Integrated 30-50s Loading Countdown readout inside circle */}
          <div className="relative z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-black/60 border border-red-950 text-[10px] font-mono text-zinc-300 mb-1.5">
            <Clock className="w-3 h-3 text-red-400" />
            <span>CYCLE: </span>
            <strong className="text-white font-bold">{remainingSeconds}s</strong>
            <span className="text-zinc-500">/ {durationSeconds}s</span>
          </div>

          {/* Outlook Badge */}
          <div className="relative z-10">
            <div
              className={`px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-black tracking-wider ${outlookInfo.bg} ${outlookInfo.color}`}
            >
              {isTransitioning ? 'CALIBRATING' : outlookInfo.label}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Recalculate Trigger directly under circle */}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={onManualSync}
          disabled={isTransitioning}
          className="flex items-center gap-2 px-4 py-1.5 rounded-sm bg-[#160205] hover:bg-[#250409] active:scale-95 border border-red-950 text-xs font-mono font-bold text-zinc-200 hover:text-white transition-all shadow-md"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-red-400 ${isTransitioning ? 'animate-spin' : ''}`}
          />
          <span>{isTransitioning ? 'Syncing...' : 'Recalculate Cycle'}</span>
        </button>

        <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 px-2 py-1 rounded-sm bg-black border border-red-950">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>CONF: <strong className="text-white">{confidence}%</strong></span>
        </div>
      </div>
    </div>
  );
};
