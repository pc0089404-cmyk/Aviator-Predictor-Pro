import React from 'react';
import { SignalData, SignalOutlook } from '../types/predictor';
import { ShieldAlert, Compass, TrendingUp, Radio } from 'lucide-react';

interface MainSignalCardProps {
  signal: SignalData | null;
  isTransitioning: boolean;
}

export const MainSignalCard: React.FC<MainSignalCardProps> = ({
  signal,
  isTransitioning,
}) => {
  if (!signal) return null;

  const { multiplier, outlook, optimalExitZone } = signal;

  const getOutlookDetails = (out: SignalOutlook) => {
    switch (out) {
      case 'HIGH':
        return {
          label: 'HIGH OUTLOOK',
          badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          indicator: 'bg-rose-500',
          desc: 'Elevated flight corridor expected; dynamic altitude.',
        };
      case 'NORMAL':
        return {
          label: 'NORMAL RANGE',
          badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          indicator: 'bg-emerald-400',
          desc: 'Consistent flight corridor within standard parameters.',
        };
      case 'LOW':
        return {
          label: 'LOW RANGE',
          badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          indicator: 'bg-amber-400',
          desc: 'Early exit pattern projected; tighter variance.',
        };
    }
  };

  const outlookConfig = getOutlookDetails(outlook);

  return (
    <div className="w-full bg-[#120305]/80 border border-red-950/60 rounded-3xl p-4 shadow-xl backdrop-blur-md space-y-3.5">
      {/* Outlook Corridor Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-950/50 text-red-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-red-300">
              Corridor Outlook
            </div>
            <div className="text-xs text-zinc-300 font-medium">
              {outlookConfig.desc}
            </div>
          </div>
        </div>

        <div className={`px-2.5 py-1 rounded-full border text-[11px] font-mono font-bold tracking-wider ${outlookConfig.badge}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${outlookConfig.indicator}`} />
          {outlookConfig.label}
        </div>
      </div>

      {/* Operational Flight Parameters */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Recommended Safe Cashout Target Zone */}
        <div className="bg-black/60 border border-red-950/60 rounded-2xl p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono text-zinc-400 mb-1">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>Optimal Exit Zone</span>
          </div>
          <div className="text-base font-mono font-bold text-emerald-400">
            {optimalExitZone.min.toFixed(2)}x - {optimalExitZone.max.toFixed(2)}x
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Conservative target window</div>
        </div>

        {/* Telemetry Outlook Ceiling */}
        <div className="bg-black/60 border border-red-950/60 rounded-2xl p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono text-zinc-400 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-red-400" />
            <span>Projected Ceiling</span>
          </div>
          <div className="text-base font-mono font-bold text-zinc-100">
            {multiplier.toFixed(2)}x Peak
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Algorithmic probability limit</div>
        </div>
      </div>

      {/* Compliance / Disclaimer notice banner */}
      <div className="pt-2 border-t border-red-950/40 flex items-start gap-2 text-[10px] text-zinc-400 leading-snug">
        <ShieldAlert className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
        <p>
          Flight trajectory estimations represent mathematical signal indicators and are not guaranteed betting outcomes.
        </p>
      </div>
    </div>
  );
};
