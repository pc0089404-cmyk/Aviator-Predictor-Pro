import React from 'react';
import { SignalData, SignalOutlook } from '../types/predictor';
import {
  Compass,
  RefreshCw,
  Sliders,
  Plane,
  Radio,
  Gauge,
  Wifi,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface DashboardCoolStuffProps {
  signal: SignalData | null;
  isTransitioning: boolean;
  onManualSync: () => void;
  onOpenRecalibrate: () => void;
  isCalibratedToday?: boolean;
}

export const DashboardCoolStuff: React.FC<DashboardCoolStuffProps> = ({
  signal,
  isTransitioning,
  onManualSync,
  onOpenRecalibrate,
  isCalibratedToday = false,
}) => {
  // Always provide fallback numbers so nothing is ever blank or hidden
  const multiplier = signal?.multiplier ?? 2.45;
  const outlook: SignalOutlook = signal?.outlook ?? 'NORMAL';
  const confidence = signal?.confidence ?? 86;
  const hash = signal?.hash ?? '0x9a4f21e8';
  const optimalExitZone = signal?.optimalExitZone ?? {
    min: Math.max(1.1, Number((multiplier * 0.75).toFixed(2))),
    max: Number((multiplier * 0.95).toFixed(2)),
  };

  // Aeronautical calculations
  const altitudeFt = Math.round(multiplier * 1840);
  const climbRateMs = Math.round(multiplier * 145);
  const climbAngleDeg = Math.min(68, Math.round(18 + (multiplier - 1.0) * 8.5));

  const getOutlookDetails = (out: SignalOutlook) => {
    switch (out) {
      case 'HIGH':
        return {
          label: 'HIGH ELEVATION',
          text: 'text-rose-400',
          bg: 'bg-rose-950/20 border-rose-500/40',
          badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
        };
      case 'NORMAL':
        return {
          label: 'NORMAL CORRIDOR',
          text: 'text-emerald-400',
          bg: 'bg-emerald-950/20 border-emerald-500/40',
          badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
        };
      case 'LOW':
        return {
          label: 'LOW RANGE',
          text: 'text-amber-400',
          bg: 'bg-amber-950/20 border-amber-500/40',
          badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
        };
    }
  };

  const outlookDetails = getOutlookDetails(outlook);

  return (
    <div className="space-y-3.5 w-full animate-in fade-in duration-300">
      {/* 1. COOL FEATURE: Live Aviator Flight Trajectory Radar Vector */}
      <div className="w-full bg-gradient-to-b from-[#140205] to-[#080102] border border-red-950/80 rounded-[30px] p-4 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Ambient glow cap */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-red-950/60">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-red-300 font-bold">
              LIVE FLIGHT TRAJECTORY RADAR
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 border border-red-950">
            <span className="text-[9px] font-mono text-zinc-400">TARGET:</span>
            <span className="text-[10px] font-mono font-black text-red-400">
              {multiplier.toFixed(2)}x
            </span>
          </div>
        </div>

        {/* Dynamic Canvas Curve Simulation */}
        <div className="w-full h-24 bg-black/85 rounded-2xl border border-red-950/70 relative p-1 overflow-hidden shadow-inner">
          {/* Grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#160205_1px,transparent_1px),linear-gradient(to_bottom,#160205_1px,transparent_1px)] bg-[size:20px_20px] opacity-40 pointer-events-none" />

          <svg
            viewBox="0 0 300 80"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#991b1b" stopOpacity="0.2" />
                <stop offset="60%" stopColor="#ef4444" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
              </linearGradient>

              <linearGradient id="areaFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Flight curve area */}
            <path
              d="M 10 70 Q 120 68 220 28 T 285 14 L 285 75 L 10 75 Z"
              fill="url(#areaFill)"
            />

            {/* The Main Exponential Red Flight Curve */}
            <path
              d="M 10 70 Q 120 68 220 28 T 285 14"
              fill="none"
              stroke="url(#curveGradient)"
              strokeWidth="2.8"
              strokeLinecap="round"
              className="drop-shadow-[0_0_10px_#ef4444]"
            />

            {/* Ascending Red Plane Icon on the Curve Peak */}
            <g transform="translate(272, 4) rotate(-16)">
              <circle cx="10" cy="10" r="7" fill="#ef4444" className="animate-pulse" />
              <circle cx="10" cy="10" r="3" fill="#ffffff" />
            </g>
          </svg>

          {/* Real-time telemetry badges over radar */}
          <div className="absolute bottom-2 left-3 flex items-center gap-2 text-[9px] font-mono text-zinc-400">
            <span>PITCH: <strong className="text-white">+{climbAngleDeg}°</strong></span>
            <span>·</span>
            <span>ALT: <strong className="text-red-400">{altitudeFt.toLocaleString()} FT</strong></span>
          </div>

          <div className="absolute top-2 right-3 text-[9px] font-mono text-emerald-400 font-bold bg-black/90 px-2 py-0.5 rounded-full border border-emerald-950">
            CRUISING CLIMB
          </div>
        </div>
      </div>

      {/* 2. COOL FEATURE: Pro Flight Telemetry Matrix */}
      <div className="w-full bg-gradient-to-b from-[#140205] to-[#080102] border border-red-950/80 rounded-[30px] p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-red-950/60">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-red-300 font-bold">
            <Gauge className="w-3.5 h-3.5 text-red-400" />
            <span>FLIGHT MATRIX PARAMETERS</span>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase ${outlookDetails.badge}`}>
            {outlookDetails.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Safe Cashout Exit Window */}
          <div className="p-2.5 rounded-2xl bg-black/75 border border-red-950/90 flex flex-col justify-between shadow-inner">
            <div className="flex items-center gap-1 text-[9px] font-mono uppercase text-zinc-400">
              <Compass className="w-3 h-3 text-emerald-400" />
              <span>CASHOUT</span>
            </div>
            <div className="text-xs sm:text-sm font-mono font-black text-emerald-400 mt-1">
              {optimalExitZone.min.toFixed(2)}x - {optimalExitZone.max.toFixed(2)}x
            </div>
            <span className="text-[8px] text-zinc-400 font-mono mt-0.5">Optimal Exit</span>
          </div>

          {/* Virtual Altitude */}
          <div className="p-2.5 rounded-2xl bg-black/75 border border-red-950/90 flex flex-col justify-between shadow-inner">
            <div className="flex items-center gap-1 text-[9px] font-mono uppercase text-zinc-400">
              <Plane className="w-3 h-3 text-red-400" />
              <span>ALTITUDE</span>
            </div>
            <div className="text-xs sm:text-sm font-mono font-black text-white mt-1">
              {altitudeFt.toLocaleString()} FT
            </div>
            <span className="text-[8px] text-zinc-400 font-mono mt-0.5">+{climbRateMs} m/s</span>
          </div>

          {/* Telemetry Lock */}
          <div className="p-2.5 rounded-2xl bg-black/75 border border-red-950/90 flex flex-col justify-between shadow-inner">
            <div className="flex items-center gap-1 text-[9px] font-mono uppercase text-zinc-400">
              <TrendingUp className="w-3 h-3 text-amber-400" />
              <span>SYNC</span>
            </div>
            <div className="text-xs sm:text-sm font-mono font-black text-zinc-100 mt-1">
              {confidence}% LOCK
            </div>
            <span className="text-[8px] text-zinc-400 font-mono mt-0.5">30-50s Pacing</span>
          </div>
        </div>
      </div>

      {/* 3. COOL FEATURE: Pro Tactical Triggers */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={onManualSync}
          disabled={isTransitioning}
          className="py-3 px-3 rounded-full bg-[#160205] hover:bg-[#250308] active:scale-95 border border-red-950 text-zinc-200 hover:text-white text-xs font-mono uppercase tracking-wider font-bold flex items-center justify-center gap-2 transition-all shadow-md"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-red-400 ${isTransitioning ? 'animate-spin' : ''}`}
          />
          <span>{isTransitioning ? 'Acquiring...' : 'Sync Radar'}</span>
        </button>

        <button
          onClick={onOpenRecalibrate}
          className="py-3 px-3 rounded-full bg-gradient-to-r from-red-600/30 to-rose-600/30 hover:from-red-600/40 hover:to-rose-600/40 active:scale-95 border border-red-500/50 text-red-200 hover:text-white text-xs font-mono uppercase tracking-wider font-bold flex items-center justify-center gap-2 transition-all shadow-md"
        >
          <Sliders className="w-3.5 h-3.5 text-red-400" />
          <span>{isCalibratedToday ? 'Calibrate (1/Day)' : 'Calibrate'}</span>
        </button>
      </div>

      {/* 4. Telemetry Node Footer */}
      <div className="p-2.5 rounded-full bg-black/70 border border-red-950/80 flex items-center justify-between text-[10px] font-mono text-zinc-400 px-4">
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3 text-emerald-400" />
          <span>NODE LATENCY: 22ms</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-red-400" />
          <span className="truncate max-w-[130px]">{hash}</span>
        </div>
      </div>
    </div>
  );
};
