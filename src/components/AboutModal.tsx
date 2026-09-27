import React from 'react';
import { X, Shield, Terminal, Plane, Lock, Award } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
              <Plane className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Aviator Predictor Pro
              </h2>
              <p className="text-xs text-red-400 font-mono font-semibold">Version 2.9</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            aria-label="Close about modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto py-4 space-y-4 text-xs text-zinc-300">
          <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold text-sm">
              <Award className="w-4 h-4 text-red-500" />
              <span>System Overview</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Aviator Predictor Pro delivers high-frequency mathematical telemetry and dynamic curve estimation for aeronautical crash multiplier trajectories. The application runs local telemetry pacing with adaptive 30–50 second intervals.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold text-sm">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Production Security & Privacy</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Strict isolation architecture is maintained. Cryptographic session seeds are tracked locally and no sensitive backend credentials, bot tokens, or private secrets are exposed to client runtimes.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold text-sm">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Responsible Usage Policy</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Flight outcomes are determined by random number generators and inherently carry risk. Signals represent algorithmic corridor estimates and are never guaranteed. Always implement responsible risk management and stop limits.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-1 text-zinc-400 font-mono text-[11px]">
            <div className="flex justify-between py-1 border-b border-zinc-800/50">
              <span>Platform Build</span>
              <span className="text-zinc-200">v2.9.4 Mobile-Optimized</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800/50">
              <span>Cycle Pacing</span>
              <span className="text-zinc-200">30s - 50s Variable</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800/50">
              <span>Signal Status</span>
              <span className="text-emerald-400 font-bold">ONLINE</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Telemetry Node</span>
              <span className="text-zinc-300">AV-PRO-CORE</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800/80 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
