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
import { Volume2, VolumeX, Lock, X, CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react';

const WEBSITE_ADMIN_USER_ID = '9130619144';
const WEBSITE_USER_ID_STORAGE_KEY = 'aviatorPredictorWebsiteUserId';
const WEBSITE_REMEMBER_STORAGE_KEY = 'aviatorPredictorRememberUserId';

type WebsiteAccessState =
  | 'checking'
  | 'login'
  | 'verifying'
  | 'verified'
  | 'wrong'
  | 'purchasing'
  | 'payment_pending'
  | 'payment_verifying'
  | 'payment_success'
  | 'payment_failed';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => storageService.getSettings());
  const [startupState, setStartupState] = useState<UserStartupState>(() => storageService.getStartupState());

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
  }>({ checked: false, authorized: false });

  // Website User ID state
  const [isTelegramMiniApp, setIsTelegramMiniApp] = useState(false);
  const [websiteAccess, setWebsiteAccess] = useState(false);
  const [websiteUserId, setWebsiteUserId] = useState('');
  const [websiteAccessState, setWebsiteAccessState] = useState<WebsiteAccessState>('checking');
  const [rememberMe, setRememberMe] = useState(true);
  const [websiteError, setWebsiteError] = useState('');

  // Validate Telegram Mini App Session and initialize website access system.
  useEffect(() => {
    const tg = (
      window as unknown as {
        Telegram?: {
          WebApp?: {
            ready: () => void;
            expand: () => void;
            initData?: string;
          };
        };
      }
    )?.Telegram?.WebApp;

    if (tg) {
      setIsTelegramMiniApp(true);

      tg.ready();
      tg.expand();

      const initData = tg.initData;

      if (!initData) {
        setTelegramAuth({
          checked: true,
          authorized: false,
        });
        return;
      }

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
          setTelegramAuth({
            checked: true,
            authorized: false,
          });
        });

      return;
    }

    // Normal browser/website.
    setTelegramAuth({
      checked: true,
      authorized: true,
    });

    const params = new URLSearchParams(window.location.search);
    const returnedUserId = params.get('userId');
    const returnedReference = params.get('reference');
    const paymentType = params.get('type');

    // Handle return from Paystack.
    if (
      window.location.pathname === '/payment-verify' &&
      paymentType === 'website-user' &&
      returnedUserId &&
      returnedReference
    ) {
      setWebsiteUserId(returnedUserId);
      setWebsiteAccessState('payment_verifying');

      fetch(
        `/api/website/user-id/payment-verify?userId=${encodeURIComponent(
          returnedUserId
        )}&reference=${encodeURIComponent(returnedReference)}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data?.verified || data?.authorized || data?.status === 'paid_verified') {
            setWebsiteAccessState('payment_success');
            setWebsiteAccess(true);
            setWebsiteError('');

            localStorage.setItem(
              WEBSITE_USER_ID_STORAGE_KEY,
              returnedUserId
            );

            if (!localStorage.getItem(WEBSITE_REMEMBER_STORAGE_KEY)) {
              localStorage.setItem(
                WEBSITE_REMEMBER_STORAGE_KEY,
                'true'
              );
            }

            window.history.replaceState({}, document.title, '/');
          } else {
            setWebsiteAccessState('payment_failed');
            setWebsiteAccess(false);
            setWebsiteError(
              data?.message ||
                'Payment could not be verified. Please try again.'
            );
          }
        })
        .catch((err) => {
          console.error('Website payment verification error:', err);
          setWebsiteAccessState('payment_failed');
          setWebsiteAccess(false);
          setWebsiteError(
            'We could not verify the payment right now. Please try again.'
          );
        });

      return;
    }

    // Load Remember Me preference.
    const savedRemember =
      localStorage.getItem(WEBSITE_REMEMBER_STORAGE_KEY);

    if (savedRemember !== null) {
      setRememberMe(savedRemember === 'true');
    }

    // Try remembered User ID.
    const savedUserId = localStorage.getItem(
      WEBSITE_USER_ID_STORAGE_KEY
    );

    if (savedUserId) {
      setWebsiteUserId(savedUserId);
      verifyWebsiteUserId(savedUserId, true);
    } else {
      setWebsiteAccessState('login');
    }
  }, []);

  const verifyWebsiteUserId = async (
    id: string,
    automatic = false
  ) => {
    const cleanId = id.trim();

    if (!cleanId) {
      setWebsiteAccessState('login');
      setWebsiteError('Enter your User ID number.');
      return;
    }

    setWebsiteAccessState('verifying');
    setWebsiteError('');

    try {
      const response = await fetch(
        `/api/website/user-id/verify/${encodeURIComponent(cleanId)}`
      );

      const data = await response.json();

      if (
        data?.authorized ||
        data?.accessStatus === 'paid_verified' ||
        data?.role === 'admin' ||
        cleanId === WEBSITE_ADMIN_USER_ID
      ) {
        setWebsiteUserId(cleanId);
        setWebsiteAccessState('verified');
        setWebsiteAccess(true);
        setWebsiteError('');

        if (rememberMe || automatic) {
          localStorage.setItem(
            WEBSITE_USER_ID_STORAGE_KEY,
            cleanId
          );
          localStorage.setItem(
            WEBSITE_REMEMBER_STORAGE_KEY,
            'true'
          );
        }

        return;
      }

      setWebsiteAccess(false);
      setWebsiteAccessState('wrong');
      setWebsiteError('User ID not found.');
    } catch (error) {
      console.error('Website User ID verification error:', error);
      setWebsiteAccess(false);
      setWebsiteAccessState('wrong');
      setWebsiteError(
        'Unable to verify User ID. Please try again.'
      );
    }
  };

  const handleWebsiteVerify = () => {
    verifyWebsiteUserId(websiteUserId, false);
  };

  const handleWebsitePurchase = async () => {
    setWebsiteAccessState('purchasing');
    setWebsiteError('');

    try {
      const response = await fetch(
        '/api/website/user-id/purchase',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rememberMe,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.authorizationUrl) {
        throw new Error(
          data?.message || 'Unable to start payment.'
        );
      }

      if (data.userId) {
        setWebsiteUserId(String(data.userId));

        localStorage.setItem(
          WEBSITE_USER_ID_STORAGE_KEY,
          String(data.userId)
        );
      }

      if (rememberMe) {
        localStorage.setItem(
          WEBSITE_REMEMBER_STORAGE_KEY,
          'true'
        );
      } else {
        localStorage.removeItem(
          WEBSITE_REMEMBER_STORAGE_KEY
        );
      }

      setWebsiteAccessState('payment_pending');

      window.location.href = data.authorizationUrl;
    } catch (error) {
      console.error('Website User ID purchase error:', error);

      setWebsiteAccessState('payment_failed');
      setWebsiteError(
        error instanceof Error
          ? error.message
          : 'Unable to start payment.'
      );
    }
  };

  const handleRememberMeChange = (
    checked: boolean
  ) => {
    setRememberMe(checked);

    localStorage.setItem(
      WEBSITE_REMEMBER_STORAGE_KEY,
      checked ? 'true' : 'false'
    );

    if (!checked) {
      localStorage.removeItem(
        WEBSITE_USER_ID_STORAGE_KEY
      );
    }
  };

  // Sync services with current settings.
  useEffect(() => {
    audioService.setSoundEnabled(settings.soundEnabled);
    audioService.setSoundType(settings.soundType);
    hapticsService.setEnabled(settings.hapticEnabled);
  }, [settings]);

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

  const handleFirstMultiplierContinue = (
    multiplier: number
  ) => {
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

  const handleRecalibrateConfirm = (
    multiplier: number
  ) => {
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

  const handleOpenRecalibrate = () => {
    if (storageService.hasEnteredToday()) {
      setShowDailyLimitModal(true);
    } else {
      setIsShowingRecalibrate(true);
    }
  };

  const handleUpdateSettings = (
    newSettings: AppSettings
  ) => {
    setSettings(newSettings);
    storageService.saveSettings(newSettings);
    firebaseSignalService.saveAppSettings(newSettings);
  };

  const handleResetApp = () => {
    if (
      window.confirm(
        'Reset all saved settings, calibrated multiplier, and telemetry state?'
      )
    ) {
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
    const updated = {
      ...settings,
      soundEnabled: !settings.soundEnabled,
    };

    handleUpdateSettings(updated);

    if (updated.soundEnabled) {
      audioService.playLockSound();
    }
  };

  // ---------------------------------------------------------
  // WEBSITE USER ID GATE
  // ---------------------------------------------------------

  if (
    !isTelegramMiniApp &&
    !websiteAccess
  ) {
    if (
      websiteAccessState === 'checking' ||
      websiteAccessState === 'verifying' ||
      websiteAccessState === 'payment_verifying'
    ) {
      return (
        <div className="min-h-screen bg-[#050001] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="relative w-24 h-24 mb-7">
            <div className="absolute inset-0 rounded-full border-2 border-red-950" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-red-500 animate-spin" />
            <div className="absolute inset-3 rounded-full bg-red-950/30 border border-red-500/30 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-red-400 animate-pulse" />
            </div>
          </div>

          <h2 className="text-xl font-black text-white tracking-wide">
            VERIFYING USER ID
          </h2>

          <p className="text-xs text-zinc-500 font-mono mt-2">
            Checking secure access...
          </p>
        </div>
      );
    }

    if (websiteAccessState === 'verified') {
      return (
        <div className="min-h-screen bg-[#050001] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-20 h-20 rounded-full bg-emerald-950/50 border border-emerald-500/50 flex items-center justify-center mb-5 shadow-[0_0_35px_rgba(16,185,129,0.25)]">
            <CheckCircle2 className="w-11 h-11 text-emerald-400" />
          </div>

          <h2 className="text-2xl font-black">
            USER ID VERIFIED
          </h2>

          <p className="text-zinc-400 text-xs mt-2 font-mono">
            User ID: {websiteUserId}
          </p>

          <button
            onClick={() => {
              setWebsiteAccess(true);
            }}
            className="w-full max-w-xs mt-7 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold shadow-lg active:scale-95 transition-all"
          >
            ENTER AVIATOR PREDICTOR PRO
          </button>
        </div>
      );
    }

    if (websiteAccessState === 'payment_success') {
      return (
        <div className="min-h-screen bg-[#050001] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-20 h-20 rounded-full bg-emerald-950/50 border border-emerald-500/50 flex items-center justify-center mb-5 shadow-[0_0_35px_rgba(16,185,129,0.25)]">
            <CheckCircle2 className="w-11 h-11 text-emerald-400" />
          </div>

          <h2 className="text-2xl font-black">
            PAYMENT APPROVED
          </h2>

          <p className="text-sm text-zinc-300 mt-2">
            Your User ID has been activated.
          </p>

          <div className="mt-5 w-full max-w-xs p-5 rounded-2xl bg-[#120103] border border-red-900/70">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
              Your User ID
            </p>

            <p className="text-3xl font-black text-red-400 font-mono mt-2 tracking-wider">
              {websiteUserId}
            </p>

            <p className="text-[10px] text-zinc-500 mt-3 leading-relaxed">
              Please save this User ID. You will use it to enter Aviator Predictor Pro next time.
            </p>
          </div>

          <button
            onClick={() => {
              setWebsiteAccess(true);
            }}
            className="w-full max-w-xs mt-6 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold shadow-lg active:scale-95 transition-all"
          >
            ENTER AVIATOR PREDICTOR PRO
          </button>
        </div>
      );
    }

    if (
      websiteAccessState === 'purchasing' ||
      websiteAccessState === 'payment_pending'
    ) {
      return (
        <div className="min-h-screen bg-[#050001] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="relative w-24 h-24 mb-7">
            <div className="absolute inset-0 rounded-full border-2 border-red-950" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-red-500 animate-spin" />
            <div className="absolute inset-3 rounded-full bg-red-950/30 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <h2 className="text-xl font-black">
            OPENING PAYSTACK
          </h2>

          <p className="text-xs text-zinc-500 font-mono mt-2">
            Preparing your secure ₦2,000 payment...
          </p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#050001] text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-950/60 border border-red-500/30 flex items-center justify-center shadow-[0_0_35px_rgba(239,68,68,0.2)] mb-5">
              <ShieldCheck className="w-8 h-8 text-red-400" />
            </div>

            <h1 className="text-2xl font-black tracking-tight">
              AVIATOR PREDICTOR PRO
            </h1>

            <p className="text-xs text-zinc-500 font-mono mt-2">
              Secure User ID Access
            </p>
          </div>

          <div className="bg-gradient-to-b from-[#180306] to-[#090001] border border-red-950/80 rounded-[28px] p-6 shadow-2xl">
            <label className="block text-xs font-mono text-zinc-400 mb-2">
              ENTER USER ID NUMBER
            </label>

            <input
              type="text"
              inputMode="numeric"
              value={websiteUserId}
              onChange={(e) => {
                setWebsiteUserId(
                  e.target.value.replace(/\D/g, '')
                );
                setWebsiteError('');
                if (
                  websiteAccessState !== 'login'
                ) {
                  setWebsiteAccessState('login');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleWebsiteVerify();
                }
              }}
              placeholder="Enter your User ID"
              className="w-full bg-black/60 border border-red-950 focus:border-red-500 rounded-2xl px-4 py-4 text-white outline-none font-mono text-lg tracking-wider transition-colors"
            />

            <label className="flex items-center gap-3 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) =>
                  handleRememberMeChange(
                    e.target.checked
                  )
                }
                className="w-4 h-4 accent-red-500"
              />

              <span className="text-xs text-zinc-400">
                Remember Me on this device
              </span>
            </label>

            {websiteAccessState === 'wrong' && (
              <div className="mt-5 p-4 rounded-2xl bg-red-950/30 border border-red-900/70 text-center">
                <div className="text-red-400 text-2xl mb-2">
                  ❌
                </div>

                <p className="font-bold text-red-300">
                  Wrong User ID
                </p>

                <p cl
