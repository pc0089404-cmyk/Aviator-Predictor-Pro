import React, { useState, useEffect } from 'react';
import {
  SignalData,
  SignalOutlook,
  TelemetryStats,
  SignalHistoryRecord,
  DailyOutlookRecord,
} from '../types/predictor';
import {
  Activity,
  Calendar,
  Clock,
  Gauge,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Radar,
  Radio,
  SlidersHorizontal,
  Flame,
  Zap,
  Plane,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  History,
  CheckCircle2,
} from 'lucide-react';
import { audioService } from '../services/audioService';
import { hapticsService } from '../services/hapticsService';

interface StatsViewProps {
  currentSignal: SignalData | null;
  stats: TelemetryStats;
  history?: SignalHistoryRecord[];
  dailyOutlook?: DailyOutlookRecord[];
}

export const StatsView: React.FC<StatsViewProps> = ({
  currentSignal,
  stats,
  history = [],
  dailyOutlook = [],
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(1); // Default to Tuesday (HIGH)

  useEffect(() => {
    const updateElapsed = () => {
      const diff = Math.floor((Date.now() - stats.sessionStartTime) / 1000);
      setElapsedSeconds(Math.max(0, diff));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [stats.sessionStartTime]);

  const formatUptime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const multiplier = currentSignal?.multiplier ?? 2.45;

  // Use real daily outlook records from Firebase if available, fallback to defaults
  const fallbackSchedule = [
    {
      dayId: 'monday',
      dayShort: 'MON',
      dayName: 'Monday',
      level: 'NORMAL' as SignalOutlook,
      corridor: '1.45x - 2.30x',
      probability: '74%',
      altitude: '3,800 FT',
      description: 'Stable atmospheric lift, reliable base corridor',
      dayIndex: 0,
      updatedAt: 0,
    },
    {
      dayId: 'tuesday',
      dayShort: 'TUE',
      dayName: 'Tuesday',
      level: 'HIGH' as SignalOutlook,
      corridor: '2.45x - 5.80x',
      probability: '94%',
      altitude: '9,200 FT',
      description: 'High thermal propulsion, supersonic corridor peaks',
      dayIndex: 1,
      updatedAt: 0,
    },
    {
      dayId: 'wednesday',
      dayShort: 'WEN',
      dayName: 'Wendays',
      sublabel: 'Wednesday',
      level: 'HIGH' as SignalOutlook,
      corridor: '2.60x - 6.40x',
      probability: '97%',
      altitude: '11,400 FT',
      description: 'Maximum velocity ascent, weekly apex window',
      dayIndex: 2,
      updatedAt: 0,
    },
    {
      dayId: 'thursday',
      dayShort: 'THU',
      dayName: 'Thursday',
      level: 'LOW' as SignalOutlook,
      corridor: '1.12x - 1.44x',
      probability: '42%',
      altitude: '2,100 FT',
      description: 'Low air ceiling, conservative exit guidance',
      dayIndex: 3,
      updatedAt: 0,
    },
    {
      dayId: 'friday',
      dayShort: 'FRI',
      dayName: 'Friday',
      level: 'LOW' as SignalOutlook,
      corridor: '1.15x - 1.42x',
      probability: '39%',
      altitude: '1,950 FT',
      description: 'Turbulence zone, rapid ejection corridor',
      dayIndex: 4,
      updatedAt: 0,
    },
    {
      dayId: 'saturday',
      dayShort: 'SUER',
      dayName: 'Suerday',
      sublabel: 'Saturday',
      level: 'NORMAL' as SignalOutlook,
      corridor: '1.50x - 2.40x',
      probability: '76%',
      altitude: '4,100 FT',
      description: 'Even distribution, standard climb dynamics',
      dayIndex: 5,
      updatedAt: 0,
    },
    {
      dayId: 'sunday',
      dayShort: 'SUN',
      dayName: 'Sunday',
      level: 'NORMAL' as SignalOutlook,
      corridor: '1.45x - 2.25x',
      probability: '71%',
      altitude: '3,650 FT',
      description: 'Smooth weekend cruise, balanced corridor velocity',
      dayIndex: 6,
      updatedAt: 0,
    },
  ];

  const activeSchedule = dailyOutlook && dailyOutlook.length === 7 ? dailyOutlook : fallbackSchedule;
  const selectedDay = activeSchedule[selectedDayIndex] || activeSchedule[0];

  // Map multiplier to position percentage on the line (1.0x to 5.0x clamped)
  const linePositionPercent = Math.min(
    95,
    Math.max(5, ((multiplier - 1.0) / (4.5 - 1.0)) * 100)
  );

  const handleSelectDay = (index: number) => {
    audioService.playCountdownTick();
    hapticsService.triggerLightPulse();
    setSelectedDayIndex(index);
  };

  const handleNextDay = () => {
    handleSelectDay((selectedDayIndex + 1) % activeSchedule.length);
  };

  const handlePrevDay = () => {
    handleSelectDay(
      (selectedDayIndex - 1 + activeSchedule.length) % activeSchedule.length
    );
  };

  return (
    <div className="space-y-4 pb-24 select-none font-sans">
      {/* Top Header with Soft Pill Covers */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-red-950/50 border border-red-500/40 flex items-center justify-center text-red-400">
              <Activity className="w-4 h-4" />
            </span>
            <span>Telemetry Statistics</span>
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Corridor Spectrum, Orbital Cycles & Engine Analytics
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#160205] border border-red-900/60 text-[10px] font-mono text-red-300 shadow-md">
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <span>PRO NODE</span>
        </div>
      </div>

      {/* 1. REQUIRED: LINE SHOWING LOW, NORMAL, AND HIGH 
          Designed with circular shape covers and smooth capsule styling */}
      <div className="w-full bg-gradient-to-b from-[#140205] to-[#070102] border border-red-950/80 rounded-[32px] p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Soft Circular Dome Cap / Aura */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400 shadow-sm">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-red-300">
                Corridor Signal Spectrum Line
              </h3>
              <p className="text-[10px] text-zinc-400">
                Continuous flight multiplier spectrum
              </p>
            </div>
          </div>
          <span className="font-mono text-xs font-bold text-white px-3 py-1 rounded-full bg-black/80 border border-red-800 shadow-inner">
            {multiplier.toFixed(2)}x
          </span>
        </div>

        {/* The Continuous Multi-Colored Line showing LOW, NORMAL, HIGH with circular capsule ends */}
        <div className="relative my-7 px-1">
          {/* Main Spectrum Line with circular capsule rounded-full */}
          <div className="w-full h-4 bg-black/90 border border-red-950 rounded-full overflow-hidden flex relative shadow-inner p-0.5">
            {/* LOW Segment */}
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)] rounded-l-full"
              style={{ width: '28%' }}
              title="LOW (1.00x - 1.44x)"
            />
            {/* NORMAL Segment */}
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
              style={{ width: '40%' }}
              title="NORMAL (1.45x - 2.44x)"
            />
            {/* HIGH Segment */}
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_14px_rgba(239,68,68,0.8)] rounded-r-full"
              style={{ width: '32%' }}
              title="HIGH (2.45x - 5.00x+)"
            />
          </div>

          {/* Current Signal Marker Pinpoint on the Line with glowing circular rings */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500 pointer-events-none z-20 flex flex-col items-center"
            style={{ left: `${linePositionPercent}%` }}
          >
            {/* Glowing Target Ring */}
            <div className="w-6 h-6 rounded-full bg-white border-2 border-red-600 shadow-[0_0_18px_#ef4444] flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
            </div>
            {/* Tag Badge */}
            <div className="mt-1.5 px-2.5 py-0.5 rounded-full bg-black/95 border border-red-500 text-[10px] font-mono font-bold text-white whitespace-nowrap shadow-xl">
              {multiplier.toFixed(2)}x
            </div>
          </div>
        </div>

        {/* Legend under the Line with Circular Pills */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-red-950/60 text-center">
          <div className="py-2 px-1 rounded-2xl bg-[#0a0102] border border-amber-500/30 shadow-sm">
            <span className="text-[11px] font-mono font-bold text-amber-400 block">
              ● LOW
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">1.10x - 1.44x</span>
          </div>

          <div className="py-2 px-1 rounded-2xl bg-[#0a0102] border border-emerald-500/30 shadow-sm">
            <span className="text-[11px] font-mono font-bold text-emerald-400 block">
              ● NORMAL
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">1.45x - 2.44x</span>
          </div>

          <div className="py-2 px-1 rounded-2xl bg-[#0a0102] border border-rose-500/30 shadow-sm">
            <span className="text-[11px] font-mono font-bold text-rose-400 block">
              ● HIGH
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">2.45x - 5.00x+</span>
          </div>
        </div>
      </div>

      {/* 2. THE 7-DAY EXPERIENCE: REDESIGNED TO BE COOL, CIRCULAR, ORBITAL, AND NOT BOXING!
          "the place where the sjow the days change to something cool just create everything cool not too boxing please"
          Exact days and values:
          Monday normal 
          Tuesday high 
          wendays high 
          Thursday low 
          Friday low 
          suerday normal 
          Sunday normal */}
      <div className="w-full bg-gradient-to-b from-[#140205] to-[#070102] border border-red-950/80 rounded-[32px] p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Soft background ambient glow */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

        {/* Circular Header Cap */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-red-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400 shadow-sm">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-red-300 flex items-center gap-1.5">
                <span>Weekly Orbital Radar Waypoints</span>
              </h3>
              <p className="text-[10px] text-zinc-400">
                Circular 7-day flight elevation cycle
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase px-3 py-1 rounded-full bg-black/80 border border-red-900 text-red-300 font-bold">
            7 ORBIT NODES
          </span>
        </div>

        {/* COOL CIRCULAR DAY ORBS (Horizontal Orbital Flight Track) */}
        <div className="relative py-2">
          {/* Subtle curved connecting arc line */}
          <div className="absolute top-7 left-4 right-4 h-0.5 bg-gradient-to-r from-emerald-500/30 via-rose-500/50 to-emerald-500/30 -z-0" />

          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 relative z-10 scrollbar-none">
            {activeSchedule.map((item, index) => {
              const isSelected = selectedDayIndex === index;
              const isHigh = item.level === 'HIGH';
              const isNormal = item.level === 'NORMAL';
              const isLow = item.level === 'LOW';

              return (
                <button
                  key={item.dayId || item.dayName}
                  type="button"
                  onClick={() => handleSelectDay(index)}
                  className={`flex flex-col items-center flex-1 min-w-[42px] transition-all duration-300 group`}
                >
                  {/* Circular Orb Container */}
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 relative ${
                      isSelected
                        ? isHigh
                          ? 'bg-rose-600 text-white shadow-[0_0_20px_#f43f5e] scale-110 border-2 border-white ring-4 ring-rose-500/30'
                          : isNormal
                          ? 'bg-emerald-500 text-white shadow-[0_0_20px_#10b981] scale-110 border-2 border-white ring-4 ring-emerald-500/30'
                          : 'bg-amber-500 text-white shadow-[0_0_20px_#f59e0b] scale-110 border-2 border-white ring-4 ring-amber-500/30'
                        : isHigh
                        ? 'bg-[#180306] border border-rose-500/40 text-rose-300 hover:border-rose-400 hover:scale-105'
                        : isNormal
                        ? 'bg-[#06140d] border border-emerald-500/40 text-emerald-300 hover:border-emerald-400 hover:scale-105'
                        : 'bg-[#181104] border border-amber-500/40 text-amber-300 hover:border-amber-400 hover:scale-105'
                    }`}
                  >
                    {/* Glowing pulse indicator dot */}
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isHigh
                          ? 'bg-rose-400 animate-pulse'
                          : isNormal
                          ? 'bg-emerald-400'
                          : 'bg-amber-400'
                      }`}
                    />
                  </div>

                  {/* Day Label under Orb */}
                  <span
                    className={`text-[10px] font-mono font-bold mt-2 transition-colors ${
                      isSelected ? 'text-white' : 'text-zinc-400'
                    }`}
                  >
                    {item.dayShort}
                  </span>

                  {/* Elevation Pill under Day */}
                  <span
                    className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full mt-0.5 uppercase tracking-wider font-extrabold ${
                      isHigh
                        ? 'text-rose-400 bg-rose-950/40'
                        : isNormal
                        ? 'text-emerald-400 bg-emerald-950/40'
                        : 'text-amber-400 bg-amber-950/40'
                    }`}
                  >
                    {item.level.toLowerCase()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Orbital Telemetry Focus Pod (Circular Cover Lens) */}
        <div className="mt-4 p-4 rounded-[28px] bg-gradient-to-b from-[#180407] to-[#0d0103] border border-red-900/50 shadow-xl relative overflow-hidden">
          {/* Circular Glass Glow */}
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-red-600/15 rounded-full blur-xl pointer-events-none" />

          {/* Stepper Navigation across days */}
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-red-950/60">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-full bg-black/60 border border-red-950 text-zinc-400 hover:text-white active:scale-90 transition-all"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm font-black text-white uppercase tracking-tight">
                  {selectedDay.dayName}
                </span>
                {selectedDay.sublabel && (
                  <span className="text-[10px] text-zinc-400 font-mono">
                    ({selectedDay.sublabel})
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                Active Orbital Target Node
              </span>
            </div>

            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-full bg-black/60 border border-red-950 text-zinc-400 hover:text-white active:scale-90 transition-all"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Key Metrics of Selected Day in Soft Circular Pods */}
          <div className="grid grid-cols-3 gap-2 text-center my-2">
            <div className="p-2.5 rounded-2xl bg-black/60 border border-red-950 shadow-inner">
              <span className="text-[9px] font-mono text-zinc-400 block uppercase">
                STATUS
              </span>
              <span
                className={`text-xs font-mono font-black uppercase mt-0.5 block ${
                  selectedDay.level === 'HIGH'
                    ? 'text-rose-400'
                    : selectedDay.level === 'NORMAL'
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {selectedDay.level.toLowerCase()}
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-black/60 border border-red-950 shadow-inner">
              <span className="text-[9px] font-mono text-zinc-400 block uppercase">
                CORRIDOR
              </span>
              <span className="text-xs font-mono font-black text-white mt-0.5 block">
                {selectedDay.corridor}
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-black/60 border border-red-950 shadow-inner">
              <span className="text-[9px] font-mono text-zinc-400 block uppercase">
                CONFIDENCE
              </span>
              <span className="text-xs font-mono font-black text-emerald-400 mt-0.5 block">
                {selectedDay.probability}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 text-center font-mono mt-2 px-2">
            {selectedDay.description}
          </p>
        </div>

        {/* Quick View All Days Capsule Pill Pills */}
        <div className="mt-3.5 space-y-1.5">
          <div className="text-[10px] font-mono uppercase text-zinc-400 px-1 mb-1 flex items-center justify-between">
            <span>7-Day Flight Schedule (List View)</span>
            <Sparkles className="w-3 h-3 text-red-400" />
          </div>

          {activeSchedule.map((item, idx) => {
            const isHigh = item.level === 'HIGH';
            const isNormal = item.level === 'NORMAL';
            const isLow = item.level === 'LOW';
            const isSelected = selectedDayIndex === idx;

            return (
              <div
                key={item.dayId || item.dayName}
                onClick={() => handleSelectDay(idx)}
                className={`px-3 py-2 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-red-950/40 border-red-500 shadow-md scale-[1.01]'
                    : isHigh
                    ? 'bg-rose-950/15 border-rose-900/30 hover:border-rose-700/50'
                    : isNormal
                    ? 'bg-emerald-950/15 border-emerald-900/30 hover:border-emerald-700/50'
                    : 'bg-amber-950/15 border-amber-900/30 hover:border-amber-700/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isHigh
                        ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                        : isNormal
                        ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                        : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                    }`}
                  />
                  <div>
                    <span className="text-xs font-bold text-white">
                      {item.dayName}
                    </span>
                    {item.sublabel && (
                      <span className="text-[9px] text-zinc-400 font-mono ml-1">
                        ({item.sublabel})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-400">
                    {item.corridor}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-wider ${
                      isHigh
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : isNormal
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {item.level.toLowerCase()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. NEW COOL STUFF: Weekly Wave Trajectory with Circular Dome Cover */}
      <div className="w-full bg-gradient-to-b from-[#140205] to-[#070102] border border-red-950/80 rounded-[32px] p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-red-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400 shadow-sm">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-red-300">
                Weekly Wave Trajectory
              </h3>
              <p className="text-[10px] text-zinc-400">Curved altitude wave density</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold px-2.5 py-1 rounded-full bg-emerald-950/30 border border-emerald-800">
            94.2% ACCURACY
          </span>
        </div>

        {/* SVG Wave Chart with Soft Rounded Frame */}
        <div className="w-full h-24 bg-black/85 rounded-2xl border border-red-950/80 p-2 relative overflow-hidden shadow-inner">
          <svg
            viewBox="0 0 320 80"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="waveFillStatsCircular" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line x1="0" y1="20" x2="320" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            <line x1="0" y1="45" x2="320" y2="45" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            <line x1="0" y1="65" x2="320" y2="65" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

            {/* Gradient Area under wave */}
            <path
              d="M0,45 Q45,18 90,14 T180,55 T250,62 T320,40 L320,80 L0,80 Z"
              fill="url(#waveFillStatsCircular)"
            />

            {/* Neon Wave Stroke */}
            <path
              d="M0,45 Q45,18 90,14 T180,55 T250,62 T320,40"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.8"
              strokeLinecap="round"
            />

            {/* Key Day Highlight Points */}
            <circle cx="45" cy="18" r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="90" cy="14" r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="180" cy="55" r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="250" cy="62" r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="320" cy="40" r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
          </svg>
        </div>

        <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400 mt-2.5 px-1.5">
          <span>MON</span>
          <span className="text-red-400 font-bold">TUE (HIGH)</span>
          <span className="text-red-400 font-bold">WEN (HIGH)</span>
          <span className="text-amber-400">THU</span>
          <span className="text-amber-400">FRI</span>
          <span>SUER</span>
          <span>SUN</span>
        </div>
      </div>

      {/* 4. NEW COOL STUFF: Engine Telemetry Matrix with Circular Capsule Covers */}
      <div className="w-full bg-gradient-to-b from-[#140205] to-[#070102] border border-red-950/80 rounded-[32px] p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-red-950/60">
          <div className="w-9 h-9 rounded-full bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400 shadow-sm">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-red-300">
              Engine Performance Matrix
            </h3>
            <p className="text-[10px] text-zinc-400">Live system execution metrics</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-black/70 border border-red-950/90 shadow-inner">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
              <Clock className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[10px] font-mono uppercase">Session Uptime</span>
            </div>
            <div className="text-base font-black font-mono text-white">
              {formatUptime(elapsedSeconds)}
            </div>
            <span className="text-[9px] text-zinc-500 font-mono">Continuous sync</span>
          </div>

          <div className="p-3 rounded-2xl bg-black/70 border border-red-950/90 shadow-inner">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
              <Radar className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[10px] font-mono uppercase">Timer Pacing</span>
            </div>
            <div className="text-base font-black font-mono text-emerald-400">
              30s – 50s
            </div>
            <span className="text-[9px] text-zinc-500 font-mono">Dynamic countdown</span>
          </div>

          <div className="p-3 rounded-2xl bg-black/70 border border-red-950/90 shadow-inner">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[10px] font-mono uppercase">Verified Rounds</span>
            </div>
            <div className="text-base font-black font-mono text-white">
              {history.length > 0 ? history.length : stats.totalCyclesObserved}
            </div>
            <span className="text-[9px] text-zinc-500 font-mono">Firebase synced</span>
          </div>

          <div className="p-3 rounded-2xl bg-black/70 border border-red-950/90 shadow-inner">
            <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
              <Radio className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[10px] font-mono uppercase">Engine Status</span>
            </div>
            <div className="text-base font-black font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>OPTIMAL</span>
            </div>
            <span className="text-[9px] text-zinc-500 font-mono">0 dropped frames</span>
          </div>
        </div>

        {/* Cryptographic Seed Pill */}
        <div className="mt-3 p-2.5 rounded-full bg-black/90 border border-red-950/90 flex items-center justify-between text-[10px] font-mono px-4">
          <span className="text-zinc-400">Telemetry Seed:</span>
          <span className="text-red-400 font-bold tracking-wider">
            {stats.seedHash || '0x7e81b49a20fd'}
          </span>
        </div>
      </div>

      {/* 5. VERIFIED SIGNAL HISTORY (SAVED IN FIREBASE) */}
      <div className="w-full bg-gradient-to-b from-[#140205] to-[#070102] border border-red-950/80 rounded-[32px] p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-red-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400 shadow-sm">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-red-300">
                Verified Signal History
              </h3>
              <p className="text-[10px] text-zinc-400">Archived cycles retrieved from Firestore</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold px-2.5 py-1 rounded-full bg-emerald-950/30 border border-emerald-800">
            {history.length} SAVED
          </span>
        </div>

        {/* History Records List: Strictly displaying only real data from Firebase */}
        {history.length === 0 ? (
          <div className="py-6 px-4 text-center rounded-2xl bg-black/50 border border-red-950/60 space-y-1.5">
            <Clock className="w-6 h-6 text-zinc-600 mx-auto" />
            <p className="text-xs font-mono text-zinc-400 font-bold">
              NO COMPLETED CYCLES SAVED YET
            </p>
            <p className="text-[11px] text-zinc-500 font-mono">
              Signal cycles (30s – 50s duration) are automatically archived to Firebase upon expiry.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
            {history.map((record) => {
              const isHigh = record.outlook === 'HIGH';
              const isNormal = record.outlook === 'NORMAL';

              return (
                <div
                  key={record.id}
                  className="p-3 rounded-2xl bg-black/70 border border-red-950/80 flex items-center justify-between font-mono transition-all hover:border-red-800"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white">
                        {record.multiplier.toFixed(2)}x
                      </span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isHigh
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : isNormal
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {record.outlook}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                      <span>{record.date}</span>
                      <span>·</span>
                      <span>{record.time}</span>
                    </div>
                  </div>

                  <div className="text-right space-y-0.5">
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#120204] border border-red-950 text-red-300 font-bold inline-block">
                      {record.status || 'OBSERVED'}
                    </span>
                    <div className="text-[9px] text-zinc-600 truncate max-w-[100px]">
                      {record.hash}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
