import React from 'react';
import { AppSettings, SoundType, NightModeStyle } from '../types/predictor';
import { audioService } from '../services/audioService';
import { hapticsService } from '../services/hapticsService';
import {
  X,
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
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onResetApp: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetApp,
}) => {
  if (!isOpen) return null;

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
    // Play preview
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Telemetry Settings
            </h2>
            <p className="text-xs text-zinc-400 font-mono">Audio, feedback and system preferences</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="overflow-y-auto py-3 space-y-4 pr-1">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/60 border border-zinc-850">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${settings.soundEnabled ? 'bg-red-500/15 text-red-400' : 'bg-zinc-800 text-zinc-500'}`}>
                {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-200">Signal Sound</div>
                <div className="text-xs text-zinc-400">Play alert sound on signal lock and countdown</div>
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
          <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-850 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400">
                <Music className="w-3.5 h-3.5 text-red-400" />
                <span>Audio Profile Tone</span>
              </div>
              <span className="text-[11px] text-zinc-400">No emojis used</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* App Base Sound */}
              <button
                type="button"
                onClick={() => handleSoundTypeChange('app_base')}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  settings.soundType === 'app_base'
                    ? 'border-red-500 bg-red-500/10 text-white shadow-sm'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-red-400 font-bold">AV-1</span>
                  {settings.soundType === 'app_base' && <Check className="w-3.5 h-3.5 text-red-400" />}
                </div>
                <div className="text-xs font-semibold text-zinc-200">App Base</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Avionics Tone</div>
              </button>

              {/* iPhone-style Sound */}
              <button
                type="button"
                onClick={() => handleSoundTypeChange('iphone')}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  settings.soundType === 'iphone'
                    ? 'border-red-500 bg-red-500/10 text-white shadow-sm'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">iOS</span>
                  {settings.soundType === 'iphone' && <Check className="w-3.5 h-3.5 text-red-400" />}
                </div>
                <div className="text-xs font-semibold text-zinc-200">iPhone-style</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Crystal Glass</div>
              </button>

              {/* Samsung-style Sound */}
              <button
                type="button"
                onClick={() => handleSoundTypeChange('samsung')}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  settings.soundType === 'samsung'
                    ? 'border-red-500 bg-red-500/10 text-white shadow-sm'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold">ONE</span>
                  {settings.soundType === 'samsung' && <Check className="w-3.5 h-3.5 text-red-400" />}
                </div>
                <div className="text-xs font-semibold text-zinc-200">Samsung-style</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Soft Harmonic</div>
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => audioService.playSignalAlert()}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-medium py-1 px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Test Current Sound</span>
              </button>
            </div>
          </div>

          {/* Notifications Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/60 border border-zinc-850">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${settings.notificationsEnabled ? 'bg-red-500/15 text-red-400' : 'bg-zinc-800 text-zinc-500'}`}>
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-200">Notifications</div>
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

          {/* Haptic Feedback Toggle (Android phone optimization) */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/60 border border-zinc-850">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${settings.hapticEnabled ? 'bg-red-500/15 text-red-400' : 'bg-zinc-800 text-zinc-500'}`}>
                <Vibrate className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-200">Haptic Feedback</div>
                <div className="text-xs text-zinc-400">Vibration patterns on mobile devices and Android</div>
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

          {/* Signal Animations Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/60 border border-zinc-850">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${settings.animationsEnabled ? 'bg-red-500/15 text-red-400' : 'bg-zinc-800 text-zinc-500'}`}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-200">Signal Animations</div>
                <div className="text-xs text-zinc-400">Flight curve and radar trajectory motion</div>
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
          <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-850">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400">
                <Moon className="w-3.5 h-3.5 text-zinc-300" />
                <span>Night Mode Display</span>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono uppercase">{settings.nightMode}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleNightModeChange('oled')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  settings.nightMode === 'oled'
                    ? 'border-red-500 bg-red-500/10 text-white'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="text-xs font-semibold text-zinc-200">OLED Pure Black</div>
                <div className="text-[10px] text-zinc-400">High-contrast battery saver</div>
              </button>

              <button
                type="button"
                onClick={() => handleNightModeChange('cockpit')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  settings.nightMode === 'cockpit'
                    ? 'border-red-500 bg-red-500/10 text-white'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="text-xs font-semibold text-zinc-200">Cockpit Slate</div>
                <div className="text-[10px] text-zinc-400">Aeronautical HUD ambient</div>
              </button>
            </div>
          </div>

          {/* Reset / Recalibrate State */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onResetApp}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-900/50 text-xs font-medium transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Configuration & History</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800/80 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-red-900/40"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
