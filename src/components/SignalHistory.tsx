import React from 'react';
import { SignalHistoryRecord } from '../types/predictor';
import { History, Trash2 } from 'lucide-react';

interface SignalHistoryProps {
  history: SignalHistoryRecord[];
  onClearHistory: () => void;
}

export const SignalHistory: React.FC<SignalHistoryProps> = ({
  history,
  onClearHistory,
}) => {
  const formatTimeAgo = (timestamp?: number) => {
    if (!timestamp) return 'just now';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const getOutlookColor = (outlook: string) => {
    switch (outlook) {
      case 'HIGH':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'NORMAL':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'LOW':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default:
        return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    }
  };

  return (
    <div className="w-full bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-red-500" />
          <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-zinc-300">
            Recent Telemetry Log ({history.length})
          </h3>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-red-400 p-1 transition-colors"
            title="Clear history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="py-6 text-center rounded-xl bg-zinc-950/50 border border-zinc-850">
          <p className="text-xs text-zinc-400 font-mono">
            Awaiting first flight cycle completion...
          </p>
          <p className="text-[10px] text-zinc-400 mt-1">
            Historical signals will log automatically as cycles finish.
          </p>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {history.map((record, index) => (
            <div
              key={`${record.id}-${index}`}
              className={`flex-shrink-0 px-3 py-2 rounded-xl border flex flex-col items-center justify-center min-w-[76px] transition-all hover:scale-105 ${getOutlookColor(
                record.outlook
              )}`}
            >
              <span className="font-mono text-sm font-black tracking-tight">
                {record.multiplier.toFixed(2)}x
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">
                {record.outlook}
              </span>
              <span className="text-[9px] text-zinc-400 font-mono mt-1">
                {formatTimeAgo(record.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
