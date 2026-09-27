/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppSettings, UserStartupState } from './types/predictor';
import { storageService, defaultSettings } from './services/storageService';
import { firebaseSignalService } from './services/firebase';
import { audioService } from './services/audioService';
import { hapticsService } from './services/hapticsService';
import { usePredictorEngine } from './hooks/usePredictorEngine';
import { Header } from './components/Header';
import { CircularMultiplier } from './components/CircularMultiplier';
import { DashboardCoolStuff } from './components/DashboardCoolStuff';
import { StatsView } from './components/StatsView';
import { ProfileView } from './components/ProfileView';
import { BottomNav, TabType } from './components/BottomNav';
import { FirstMultiplierScreen } from './components/FirstMultiplierScreen';
import { Volume2, VolumeX, Lock, X } from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => storageService.getSettings());
  const [startupState, setStartupState] = useState<UserStartupState>(() => storageService.getStartupState());

  // Show UI page only once a day. If entered today, skip directly to Dashboard even when leaving and coming back!
  const [hasEnteredMultiplier, setHasEnteredMultiplier] = useState<boolean>(() => {
    return storageService.hasEnteredToday();
  });
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isShowingRecalibrate, setIsShowingRecalibrate] = useState<boolean>(false);
  const [showDailyLimitModal, setShowDailyLimitModal] = useState<boolean>(false);
  const [telegramAuth, setTelegramAuth] = useState<{
    checked: boolean;
    authorized: boolean;
    role?: string;
    user?: { id: number; firstName: string; username?: string };
  }>({ checked: false, authorized: true });

  // Validate Telegram Mini App Session on startup with secure server
  useEffect(() => {
    const tg = (window as unknown as { Telegram?: { WebApp?: { ready: () => void; expand: () => void; initData?: string } } })?.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      const initData = tg.initData;
      if (initData) {
        fetch('/api/auth/telegram-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data && data.authorized) {
              setTelegramAuth({
                checked: true,
                authorized: true,
                role: data.role,
                user: data.user,
              });
            } else {
              setTelegramAuth({
                checked: true,
                authorized: false,
                role: data?.role || 'unpaid',
                user: data?.user,
              });
            }
          })
          .catch((err) => {
            console.warn('Telegram auth check error:', err);
            setTelegramAuth({ checked: true, authorized: true });
          });
        return;
      }
    }
    // Outside Telegram WebApp (e.g. browser preview), keep authorized
    setTelegramAuth({ checked: true, authorized: true });
  }, []);

  // Sync services with current settings
  useEffect(() => {
    audioService.setSoundEnabled(settings.soundEnabled);
    audioService.setSoundType(settings.soundType);
    hapticsService.setEnabled(settings.hapticEnabled);
  }, [settings]);

  // Telemetry Engine hook
  const {
    currentSignal,
    history,
    dailyOutlook,
    stats,
    isTransitioning,
    isFirebaseConnected,
    syncSignalNow,
  } = usePredictorEngine({
    settings,
    firstMultiplier: startupState.firstMultiplier,
  });

  // Flow: when user verifies and enters from the First Multiplier screen
  const handleFirstMultiplierContinue = (multiplier: number) => {
    const updated: UserStartupState = {
      hasCompletedStartup: true,
      firstMultiplier: multiplier,
      calibratedAt: Date.now(),
    };
    storageService.saveStartupState(updated);
    storageService.setLastUIPageDate();
    setStartupState(updated);
    setHasEnteredMultiplier(true);
    syncSignalNow();
  };

  // Recalibration confirmation from Dashboard or Profile
  const handleRecalibrateConfirm = (multiplier: number) => {
    const updated: UserStartupState = {
      ...startupState,
      firstMultiplier: multiplier,
      calibratedAt: Date.now(),
    };
    storageService.saveStartupState(updated);
    storageService.setLastUIPageDate();
    setStartupState(updated);
    setIsShowingRecalibrate(false);
    syncSignalNow();
  };

  // Check if UI page can be opened from dashboard (only once a day)
  const handleOpenRecalibrate = () => {
    if (storageService.hasEnteredToday()) {
      setShowDailyLimitModal(true);
    } else {
      setIsShowingRecalibrate(true);
    }
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    storageService.saveSettings(newSettings);
    firebaseSignalService.saveAppSettings(newSettings);
  };

  const handleResetApp = () => {
    if (window.confirm('Reset all saved settings, calibrated multiplier, and telemetry state?')) {
      storageService.resetAllData();
      setSettings(defaultSettings);
      setStartupState({
        hasCompletedStartup: false,
        firstMultiplier: null,
        calibratedAt: null,
      });
      setHasEnteredMultiplier(false);
      setActiveTab('dashboard');
    }
  };

  const toggleSoundShortcut = () => {
    const updated = { ...settings, soundEnabled: !settings.soundEnabled };
    handleUpdateSettings(updated);
    if (updated.soundEnabled) {
      audioService.playLockSound();
    }
  };

  // 0. If opened in Telegram Mini App but unauthenticated / unpaid
  if (telegramAuth.checked && !telegramAuth.authorized) {
    return (
      <div className="min-h-screen bg-[#060002] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-500 mb-4 shadow-xl">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-mono text-white mb-2">ACCESS RESTRICTED</h2>
        <p className="text-xs text-zinc-400 max-w-xs mb-6 font-mono leading-relaxed">
          Aviator Predictor Pro requires an active license. Activate your access for <b>₦2,000 NGN</b> via Paystack to unlock real-time flight telemetry.
        </p>
        <button
          onClick={() => {
            fetch('/api/paystack/initialize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ telegramUserId: telegramAuth.user?.id }),
            })
              .then((r) => r.json())
              .then((d) => {
                if (d.authorizationUrl) {
                  window.location.href = d.authorizationUrl;
                }
              })
              .catch(console.error);
          }}
          className="w-full max-w-xs py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white font-bold rounded-xl shadow-lg border border-red-500/30 mb-3 transition-all cursor-pointer text-sm font-mono"
        >
          💳 PAY ₦2,000 VIA PAYSTACK
        </button>
        <a
          href="https://t.me/AviatorPredictorPro1Bot"
          className="text-xs text-zinc-500 hover:text-red-400 underline font-mono mt-2"
        >
          Return to @AviatorPredictorPro1Bot
        </a>
      </div>
    );
  }

  // 1. App opens into UI page only if NOT entered today. If already entered today, skips directly to Dashboard!
  if (!hasEnteredMultiplier) {
    return (
      <FirstMultiplierScreen
        initialValue={startupState.firstMultiplier}
        onContinue={handleFirstMultiplierContinue}
      />
    );
  }

  // 2. If in recalibration view
  if (isShowingRecalibrate) {
    return (
      <FirstMultiplierScreen
        initialValue={startupState.firstMultiplier}
        onContinue={handleRecalibrateConfirm}
        isRecalibration={true}
        onCancel={() => setIsShowingRecalibrate(false)}
      />
    );
  }

  const isOled = settings.nightMode === 'oled';

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-300 relative overflow-x-hidden ${
        isOled ? 'bg-[#050001] text-white' : 'bg-[#0a0102] text-zinc-100'
      }`}
    >
      {/* Background ambient red glow pools */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-64 bg-red-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="fixed bottom-24 right-0 w-80 h-64 bg-red-800/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Top Header with Real Official Aviator Logo Branding */}
      <Header
        onOpenRecalibrate={handleOpenRecalibrate}
        nightMode={settings.nightMode}
        isOnline={isFirebaseConnected}
        isCalibratedToday={storageService.hasEnteredToday()}
      />

      {/* Main Content Area */}
      <main className="max-w-md mx-auto px-4 pt-2 relative z-10">
        {/* Tab 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-3 pb-24 animate-in fade-in duration-200">
            {/* Quick status bar */}
            <div className="flex items-center justify-between px-1 text-xs font-mono text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="text-[11px] uppercase tracking-wider text-red-300 font-bold">
                  RADAR ACTIVE · 30-50S PACING
                </span>
              </div>

              <button
                onClick={toggleSoundShortcut}
                className="flex items-center gap-1.5 text-[11px] text-zinc-300 hover:text-white px-2.5 py-1 rounded-none bg-[#120103] border border-red-950 hover:border-red-800 transition-colors"
                title="Toggle Audio"
              >
                {settings.soundEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-red-500" />
                    <span>AUDIO ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-zinc-500">MUTED</span>
                  </>
                )}
              </button>
            </div>

            {/* Central Animated Loading Circle (Always showing multiplier and 'x') */}
            <CircularMultiplier
              signal={currentSignal}
              isTransitioning={isTransitioning}
              animationsEnabled={settings.animationsEnabled}
              onManualSync={syncSignalNow}
            />

            {/* Down add cool stuff (Live Flight Trajectory Radar, Telemetry Matrix, Safe Exit Zone, Tactical Triggers) */}
            <DashboardCoolStuff
              signal={currentSignal}
              isTransitioning={isTransitioning}
              onManualSync={syncSignalNow}
              onOpenRecalibrate={handleOpenRecalibrate}
              isCalibratedToday={storageService.hasEnteredToday()}
            />

            {/* Footer Brand Note */}
            <footer className="text-center pt-2 pb-1 text-[11px] font-mono text-zinc-500 space-y-0.5">
              <div className="font-bold text-red-400">
                AVIATOR PREDICTOR PRO · v2.9
              </div>
              <div className="text-[10px]">
                Aeronautical Flight Analytics · High-Contrast Red Theme
              </div>
            </footer>
          </div>
        )}

        {/* Tab 2: STATS */}
        {activeTab === 'stats' && (
          <div className="animate-in fade-in duration-200">
            <StatsView
              currentSignal={currentSignal}
              stats={stats}
              history={history}
              dailyOutlook={dailyOutlook}
            />
          </div>
        )}

        {/* Tab 3: PROFILE */}
        {activeTab === 'profile' && (
          <div className="animate-in fade-in duration-200">
            <ProfileView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onResetApp={handleResetApp}
              onOpenRecalibrate={handleOpenRecalibrate}
            />
          </div>
        )}
      </main>

      {/* Premium 3-Tab Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />

      {/* Daily Access Limit Notice Modal */}
      {showDailyLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-gradient-to-b from-[#180306] via-[#100103] to-[#070001] border border-red-500/50 rounded-[32px] p-6 shadow-[0_0_50px_rgba(239,68,68,0.35)] text-center space-y-4">
            {/* Top close icon */}
            <button
              onClick={() => setShowDailyLimitModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 border border-red-950 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Glowing Icon */}
            <div className="w-14 h-14 mx-auto rounded-full bg-red-950/80 border border-red-500/60 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)]">
              <Lock className="w-7 h-7 text-red-400" />
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-red-400 font-bold px-3 py-1 rounded-full bg-red-950/60 border border-red-900/60 inline-block mb-1.5">
                ONCE PER DAY ACCESS
              </span>
              <h3 className="text-lg font-black uppercase text-white tracking-tight">
                Daily Calibration Locked
              </h3>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                You have already calibrated your flight multiplier for today. Even if you exit and reopen the app, you will land directly on the live dashboard.
              </p>
            </div>

            {/* Status Pod */}
            <div className="p-3.5 rounded-2xl bg-black/75 border border-red-950 text-left space-y-2 font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Active Multiplier:</span>
                <span className="font-bold text-red-400">
                  {startupState.firstMultiplier ? `${startupState.firstMultiplier.toFixed(2)}x` : '2.45x'}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Today's Date:</span>
                <span className="text-zinc-200">{storageService.getTodayDateString()}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400 pt-1.5 border-t border-red-950/60">
                <span>Next Unlock:</span>
                <span className="text-emerald-400 font-bold">Tomorrow at 00:00</span>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => setShowDailyLimitModal(false)}
              className="w-full py-3 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-950 transition-all border border-red-400/40"
            >
              Continue to Dashboard
            </button>

            {/* Quick Test Option to simulate next day without waiting 24h */}
            <div className="pt-1">
              <button
                onClick={() => {
                  storageService.clearLastUIPageDate();
                  setShowDailyLimitModal(false);
                  setIsShowingRecalibrate(true);
                }}
                className="text-[10px] font-mono text-zinc-500 hover:text-red-400 transition-colors underline underline-offset-2"
              >
                Test Next Day Unlock (Reset Daily Limit)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
