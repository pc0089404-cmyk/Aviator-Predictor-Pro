import React from 'react';
import { Compass, BarChart3, User } from 'lucide-react';
import { hapticsService } from '../services/hapticsService';
import { audioService } from '../services/audioService';

export type TabType = 'dashboard' | 'stats' | 'profile';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const tabs: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Compass,
    },
    {
      id: 'stats',
      label: 'Stats',
      icon: BarChart3,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
    },
  ];

  const handleTabClick = (id: TabType) => {
    if (id !== activeTab) {
      hapticsService.triggerLightPulse();
      audioService.playCountdownTick();
      onChangeTab(id);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 pb-safe pointer-events-auto"
      aria-label="Bottom Navigation"
    >
      <div className="max-w-md mx-auto px-4 pb-3">
        <div className="bg-[#120305]/95 backdrop-blur-xl border border-red-950/80 rounded-3xl p-1.5 shadow-[0_-8px_30px_rgba(220,38,38,0.15)] flex items-center justify-around">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={`relative flex-1 py-2.5 px-3 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {/* Active Pill Glow Indicator */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600/30 via-red-600/40 to-rose-600/30 border border-red-500/40 rounded-2xl shadow-[0_0_15px_rgba(239,68,68,0.35)] -z-0" />
                )}

                <div className="relative z-10 flex flex-col items-center gap-1">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? 'text-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'text-zinc-400'
                    }`}
                  />
                  <span
                    className={`text-[11px] font-mono tracking-wider uppercase font-bold transition-colors ${
                      isActive ? 'text-white' : 'text-zinc-400'
                    }`}
                  >
                    {tab.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
