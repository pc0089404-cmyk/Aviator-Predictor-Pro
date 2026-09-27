import React from 'react';
import { AppSettings, SoundType, NightModeStyle } from '../types/predictor';
import { audioService } from '../services/audioService';
import { hapticsService } from '../services/hapticsService';
import {
  Volume2,
  VolumeX,
  Bell,
  Vibrate,
  Sparkles,
  Moon,
  Music,
  Play,
  RotateCcw,
  Check,
  Shield,
  Sliders,
  Award,
} from 'lucide-react';

interface ProfileViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onResetApp: () => void;
  onOpenRecalibrate: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  settings,
  onUpdateSettings,
  onResetApp,
  onOpenRecalibrate,
}) => {
  const handleToggle = (key: keyof AppSettings) => {
    const updated = {
      ...settings,
      [key]: !settings[key],
    };
    onUpdateSettings(updated);
    if (key === 'soundEnabled') {
      audioService.setSoundEnabled(updated.soundEnabled);
    }
    if (key === 'hapticEnabled') {
      hapticsService.setEnabled(updated.hapticEnabled);
    }
  };

  const handleSoundTypeChange = (type: SoundType) => {
    const updated: AppSettings = {
      ...settings,
      soundType: type,
    };
    onUpdateSettings(updated);
    audioService.setSoundType(type);
    audioService.playSignalAlert();
    hapticsService.triggerLightPulse();
  };

  const handleNightModeChange = (mode: NightModeStyle) => {
    const updated: AppSettings = {
      ...settings,
      nightMode: mode,
    };
    onUpdateSettings(updated);
  };

  const requestNotifications = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          onUpdateSettings({ ...settings, notificationsEnabled: true });
        } else {
          onUpdateSettings({ ...settings, notificationsEnabled: false });
        }
      } catch {
        onUpdateSettings({ ...settings, notificationsEnabled: !settings.notificationsEnabled });
      }
    } else {
      onUpdateSettings({ ...settings, notificationsEnabled: !settings.notificationsEnabled });
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Profile & Branding Header */}
      <div className="w-full bg-[#120305]/85 border border-red-950/60 rounded-3xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          {/* Replaceable logo asset area */}
          <div
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 p-[2px] shadow-lg shadow-red-950/80 flex-shrink-0"
            title="Aviator Telemetry Hub"
          >
            <div className="w-full h-full bg-[#0d0204] rounded-[14px] flex items-center justify-center relative overflow-hidden">
              <svg
                viewBox="0 0 24 24"
                className="w-7 h-7 text-red-500 transform -rotate-12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z" />
              </svg>
              <div className="absolute inset-0 bg-red-500/10 pointer-events-none" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black uppercase tracking-tight text-white">
                Aviator Predictor Pro
              </h2>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-600/30 text-red-400 border border-red-500/40 tracking-wider">
                PRO
              </span>
            </div>
            <p className="text-xs text-red-400 font-mono font-semibold mt-0.5">
              Version 2.9
            </p>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Mobile-First Analytical Deck</span>
            </div>
          </div>
        </div>
      </div>

      {/* Group 1: Audio & Sound Selector */}
      <div className="w-full bg-[#120305]/85 border border-red-950/60 rounded-3xl p-5 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-red-950/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-950/50 text-red-400">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-red-300">
                Audio & Alerts
              </h3>
              <p className="text-[11px] text-zinc-400 font-sans">
                Corridor lock and countdown sound feedback
              </p>
            </div>
          </div>
        </div>

        {/* Signal Sound Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/60 border border-red-950/60">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                settings.soundEnabled ? 'bg-red-500/20 text-red-400' : 'bg-zinc-900 text-zinc-500'
              }`}
            >
              {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Signal Sound</div>
              <div className="text-xs text-zinc-400">Acoustic chime on telemetry lock</div>
            </div>
          </div>
          <button
            onClick={() => handleToggle('soundEnabled')}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.soundEnabled ? 'bg-red-600' : 'bg-zinc-800'
            }`}
            aria-label="Toggle sound"
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Sound Selector (No Emojis allowed!) */}
        <div className="p-3.5 rounded-2xl bg-black/60 border border-red-950/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-red-300">
              <Music className="w-3.5 h-3.5 text-red-400" />
              <span>Sound Profile Selector</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">No emojis</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* App Base Sound */}
            <button
              type="button"
              onClick={() => handleSoundTypeChange('app_base')}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                settings.soundType === 'app_base'
                  ? 'border-red-500 bg-red-600/20 text-white shadow-md shadow-red-950/60'
                  : 'border-red-950/60 bg-zinc-950/60 text-zinc-400 hover:border-red-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-red-400 font-bold">
                  AV-1
                </span>
                {settings.soundType === 'app_base' && <Check className="w-3.5 h-3.5 text-red-400" />}
              </div>
              <div className="text-xs font-bold text-zinc-100">App Base</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Avionics Tone</div>
            </button>

            {/* iPhone-style Sound */}
            <button
              type="button"
              onClick={() => handleSoundTypeChange('iphone')}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                settings.soundType === 'iphone'
                  ? 'border-red-500 bg-red-600/20 text-white shadow-md shadow-red-950/60'
                  : 'border-red-950/60 bg-zinc-950/60 text-zinc-400 hover:border-red-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 font-bold">
                  iOS
                </span>
                {settings.soundType === 'iphone' && <Check className="w-3.5 h-3.5 text-red-400" />}
              </div>
              <div className="text-xs font-bold text-zinc-100">iPhone-style</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Crystal Chime</div>
            </button>

            {/* Samsung-style Sound */}
            <button
              type="button"
              onClick={() => handleSoundTypeChange('samsung')}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                settings.soundType === 'samsung'
                  ? 'border-red-500 bg-red-600/20 text-white shadow-md shadow-red-950/60'
                  : 'border-red-950/60 bg-zinc-950/60 text-zinc-400 hover:border-red-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold">
                  ONE
                </span>
                {settings.soundType === 'samsung' && <Check className="w-3.5 h-3.5 text-red-400" />}
              </div>
              <div className="text-xs font-bold text-zinc-100">Samsung-style</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Soft Harmonic</div>
            </button>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => audioService.playSignalAlert()}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-semibold py-1.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Test Current Sound</span>
            </button>
          </div>
        </div>

        {/* Haptic Feedback Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/60 border border-red-950/60">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                settings.hapticEnabled ? 'bg-red-500/20 text-red-400' : 'bg-zinc-900 text-zinc-500'
              }`}
            >
              <Vibrate className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Haptic Feedback</div>
              <div className="text-xs text-zinc-400">Subtle vibration pulses on Android and mobile</div>
            </div>
          </div>
          <button
            onClick={() => handleToggle('hapticEnabled')}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.hapticEnabled ? 'bg-red-600' : 'bg-zinc-800'
            }`}
            aria-label="Toggle haptics"
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                settings.hapticEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Group 2: Interface & Notifications */}
      <div className="w-full bg-[#120305]/85 border border-red-950/60 rounded-3xl p-5 shadow-xl backdrop-blur-md space-y-3.5">
        <div className="flex items-center gap-2 pb-2 border-b border-red-950/50">
          <div className="p-1.5 rounded-lg bg-red-950/50 text-red-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-red-300">
              Interface & Visuals
            </h3>
            <p className="text-[11px] text-zinc-400 font-sans">
              Display animation and notification behavior
            </p>
          </div>
        </div>

        {/* Notifications Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/60 border border-red-950/60">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                settings.notificationsEnabled ? 'bg-red-500/20 text-red-400' : 'bg-zinc-900 text-zinc-500'
              }`}
            >
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Notifications</div>
              <div className="text-xs text-zinc-400">Alert when a high signal outlook is generated</div>
            </div>
          </div>
          <button
            onClick={requestNotifications}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.notificationsEnabled ? 'bg-red-600' : 'bg-zinc-800'
            }`}
            aria-label="Toggle notifications"
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                settings.notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Signal Animations Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/60 border border-red-950/60">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                settings.animationsEnabled ? 'bg-red-500/20 text-red-400' : 'bg-zinc-900 text-zinc-500'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100">Signal Animations</div>
              <div className="text-xs text-zinc-400">Circular flight orbit and radar ring sweep</div>
            </div>
          </div>
          <button
            onClick={() => handleToggle('animationsEnabled')}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.animationsEnabled ? 'bg-red-600' : 'bg-zinc-800'
            }`}
            aria-label="Toggle animations"
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                settings.animationsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Night Mode Theme */}
        <div className="p-3.5 rounded-2xl bg-black/60 border border-red-950/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-red-300">
              <Moon className="w-3.5 h-3.5 text-zinc-300" />
              <span>Night Mode Theme</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono uppercase">{settings.nightMode}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleNightModeChange('oled')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                settings.nightMode === 'oled'
                  ? 'border-red-500 bg-red-600/20 text-white'
                  : 'border-red-950/60 bg-zinc-950/60 text-zinc-400 hover:border-red-800'
              }`}
            >
              <div className="text-xs font-semibold text-zinc-200">OLED Pure Black</div>
              <div className="text-[10px] text-zinc-400">Deep battery-saving red</div>
            </button>

            <button
              type="button"
              onClick={() => handleNightModeChange('cockpit')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                settings.nightMode === 'cockpit'
                  ? 'border-red-500 bg-red-600/20 text-white'
                  : 'border-red-950/60 bg-zinc-950/60 text-zinc-400 hover:border-red-800'
              }`}
            >
              <div className="text-xs font-semibold text-zinc-200">Cockpit Slate</div>
              <div className="text-[10px] text-zinc-400">Aeronautical HUD ambient</div>
            </button>
          </div>
        </div>
      </div>

      {/* Group 3: Calibration & Reset Controls */}
      <div className="w-full bg-[#120305]/85 border border-red-950/60 rounded-3xl p-5 shadow-xl backdrop-blur-md space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-red-950/50">
          <div className="p-1.5 rounded-lg bg-red-950/50 text-red-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-red-300">
              Calibration Controls
            </h3>
            <p className="text-[11px] text-zinc-400 font-sans">
              Update observation multipliers or reset local data
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={onOpenRecalibrate}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-black/60 hover:bg-[#1a0408] border border-red-950/80 text-zinc-200 hover:text-white transition-all text-xs font-mono"
          >
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-red-400" />
              <span className="font-bold">Recalibrate Observation Multiplier</span>
            </div>
            <span className="text-[10px] text-red-400 font-bold">TUNE &gt;</span>
          </button>

          <button
            type="button"
            onClick={onResetApp}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-black/60 hover:bg-red-950/30 border border-red-950/80 text-zinc-400 hover:text-red-400 transition-all text-xs font-mono"
          >
            <div className="flex items-center gap-2.5">
              <RotateCcw className="w-4 h-4 text-zinc-500" />
              <span>Reset Configuration & History</span>
            </div>
            <span className="text-[10px] text-zinc-500">CLEAR</span>
          </button>
        </div>
      </div>

      {/* Group 4: Responsible Gaming & Privacy Specifications */}
      <div className="w-full bg-[#120305]/85 border border-red-950/60 rounded-3xl p-5 shadow-xl backdrop-blur-md space-y-3 text-xs text-zinc-300">
        <div className="flex items-center gap-2 text-zinc-200 font-semibold text-sm">
          <Shield className="w-4 h-4 text-amber-400" />
          <span>Responsible Usage & Security Standards</span>
        </div>
        <p className="text-zinc-400 text-[11px] leading-relaxed">
          Aviator Predictor Pro performs local mathematical flight telemetry estimation. Multiplier predictions are calculated algorithmically and are not guaranteed real-world betting outcomes. No private keys, external tokens, or backend credentials are exposed.
        </p>

        <div className="pt-2 border-t border-red-950/50 flex justify-between items-center text-[10px] font-mono text-zinc-500">
          <span>BUILD: v2.9-RELEASE</span>
          <span>NODE: AV-PREDICTOR-CORE</span>
        </div>
      </div>
    </div>
  );
};
