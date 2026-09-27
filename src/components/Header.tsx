import React from 'react';
import { Sliders, Radio } from 'lucide-react';
import { NightModeStyle } from '../types/predictor';
import { AviatorLogo } from './AviatorLogo';

interface HeaderProps {
  onOpenRecalibrate: () => void;
  nightMode: NightModeStyle;
  isOnline: boolean;
  isCalibratedToday?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenRecalibrate,
  isCalibratedToday = false,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-red-950/80 bg-[#070102]/95 backdrop-blur-xl transition-colors shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        {/* Real Authentic Aviator Logo prominently displayed up top */}
        <div className="flex items-center gap-2">
          <AviatorLogo size="md" showText={true} />
        </div>

        {/* Right side: Real-time Online Sync status + Calibrate button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 border border-red-950 text-[10px] font-mono text-zinc-300">
            <Radio className="w-3 h-3 text-red-500 animate-pulse" />
            <span className="text-zinc-200 font-bold">LIVE</span>
          </div>

          <button
            onClick={onOpenRecalibrate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-600/30 to-rose-600/30 hover:from-red-600/40 hover:to-rose-600/40 active:scale-95 border border-red-500/50 text-red-200 hover:text-white transition-all text-xs font-mono font-bold shadow-sm"
            title={isCalibratedToday ? 'Daily calibration completed (1/day)' : 'Calibrate Baseline Multiplier'}
          >
            <Sliders className="w-3.5 h-3.5 text-red-400" />
            <span>Calibrate</span>
            {isCalibratedToday && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 font-bold">
                1/DAY
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
