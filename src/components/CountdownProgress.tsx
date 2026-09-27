import React from 'react';
import { Timer, Zap } from 'lucide-react';

interface CountdownProgressProps {
  remainingSeconds: number;
  totalDuration: number;
  isTransitioning: boolean;
}

export const CountdownProgress: React.FC<CountdownProgressProps> = ({
  remainingSeconds,
  totalDuration,
  isTransitioning,
}) => {
  const percentRemaining = totalDuration > 0 ? (remainingSeconds / totalDuration) * 100 : 0;
  const progressPercent = Math.max(0, Math.min(100, 100 - percentRemaining));
  const isUrgent = remainingSeconds <= 6 && remainingSeconds > 0;

  return (
    <div className="w-full bg-[#0d0204] border border-red-950/80 rounded-2xl p-3.5 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-lg transition-all ${
              isUrgent
                ? 'bg-red-500/25 text-red-400 animate-bounce'
                : 'bg-red-950/50 text-red-400'
            }`}
          >
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-red-400 font-bold">
              SIGNAL CYCLE TIMER
            </div>
            <div className="text-xs text-zinc-300 font-medium">
              {isTransitioning ? (
                <span className="text-amber-400 flex items-center gap-1 font-mono">
                  <Zap className="w-3 h-3 animate-spin" /> ACQUIRING NEXT SIGNAL...
                </span>
              ) : (
                <span className="font-mono text-zinc-300">
                  Adaptive window ({totalDuration}s flight cycle)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Big accurate seconds countdown display */}
        <div className="text-right">
          <div className="font-mono text-xl sm:text-2xl font-black tracking-tight text-white flex items-baseline justify-end gap-1">
            <span className={isUrgent ? 'text-red-400 animate-pulse' : 'text-white'}>
              {remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds}
            </span>
            <span className="text-xs text-red-400 font-mono font-bold">s</span>
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full h-2 bg-black rounded-lg overflow-hidden p-0.5 border border-red-950 relative">
        <div
          className={`h-full rounded-md transition-all duration-300 ease-linear ${
            isUrgent
              ? 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 shadow-[0_0_10px_rgba(239,68,68,0.8)]'
              : 'bg-gradient-to-r from-red-800 via-red-600 to-rose-400 shadow-[0_0_8px_rgba(220,38,38,0.5)]'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Runway Bounds */}
      <div className="flex justify-between items-center mt-1.5 px-0.5 text-[9px] font-mono text-zinc-400">
        <span>0s (ENTRY)</span>
        <span className="text-red-400 font-semibold">~30s MIN</span>
        <span>50s MAX</span>
      </div>
    </div>
  );
};
