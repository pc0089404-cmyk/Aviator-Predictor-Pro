import React, { useState, useEffect } from 'react';
import { TelemetryStats } from '../types/predictor';
import { Activity, Clock, ShieldCheck, Gauge, Cpu } from 'lucide-react';

interface StatsSectionProps {
  stats: TelemetryStats;
}

export const StatsSection: React.FC<StatsSectionProps> = ({ stats }) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

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

  return (
    <div className="w-full bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-red-500" />
          <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-zinc-300">
            Session Telemetry Data
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
          <Cpu className="w-3 h-3 text-emerald-400" />
          <span>ENGINE ONLINE</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Total Cycles Observed */}
        <div className="bg-zinc-950/70 border border-zinc-800/60 rounded-xl p-3">
          <div className="text-[10px] uppercase font-mono text-zinc-400 flex items-center gap-1.5">
            <Gauge className="w-3 h-3 text-red-400" />
            <span>Recorded Cycles</span>
          </div>
          <div className="text-xl font-mono font-bold text-white mt-1">
            {stats.totalCyclesObserved}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Application session count</div>
        </div>

        {/* Average Cycle Interval */}
        <div className="bg-zinc-950/70 border border-zinc-800/60 rounded-xl p-3">
          <div className="text-[10px] uppercase font-mono text-zinc-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Avg Cycle Interval</span>
          </div>
          <div className="text-xl font-mono font-bold text-zinc-200 mt-1">
            {stats.averageIntervalSeconds.toFixed(1)}s
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">30s - 50s adaptive pacing</div>
        </div>

        {/* Session Active Time */}
        <div className="bg-zinc-950/70 border border-zinc-800/60 rounded-xl p-3">
          <div className="text-[10px] uppercase font-mono text-zinc-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-blue-400" />
            <span>Client Uptime</span>
          </div>
          <div className="text-xl font-mono font-bold text-zinc-200 mt-1">
            {formatUptime(elapsedSeconds)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Continuous telemetry session</div>
        </div>

        {/* Session Seed Reference */}
        <div className="bg-zinc-950/70 border border-zinc-800/60 rounded-xl p-3">
          <div className="text-[10px] uppercase font-mono text-zinc-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Seed Identifier</span>
          </div>
          <div className="text-xs font-mono font-bold text-emerald-400 mt-2 truncate" title={stats.seedHash}>
            {stats.seedHash.slice(0, 10)}...
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Local cryptographic hash</div>
        </div>
      </div>
    </div>
  );
};
