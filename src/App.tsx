/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
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

import {
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Loader2,
} from 'lucide-react';

const WEBSITE_ADMIN_USER_ID = '9130619144';

const USER_ID_KEY = 'aviatorPredictorWebsiteUserId';
const REMEMBER_KEY = 'aviatorPredictorRememberUserId';

type WebsiteState =
  | 'loading'
  | 'login'
  | 'verifying'
  | 'verified'
  | 'wrong'
  | 'purchasing'
  | 'payment-verifying'
  | 'payment-success'
  | 'payment-failed';

type TelegramUser = {
  id: number;
  firstName: string;
  username?: string;
};

type TelegramAuth = {
  checked: boolean;
  authorized: boolean;
  role?: string;
  user?: TelegramUser;
};

function VerificationAnimation({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 rounded-full border border-red-500/20 animate-ping" />

        <div
          className="absolute inset-2 rounded-full border border-red-500/30 animate-spin"
          style={{ animationDuration: '2s' }}
        />

        <div className="absolute inset-4 rounded-full bg-red-950/70 border border-red-500/50 flex items-center justify-center shadow-[0_0_35px_rgba(239,68,68,0.3)]">
          <ShieldCheck className="w-9 h-9 text-red-400" />
        </div>
      </div>

      <p className="text-sm font-mono text-zinc-300">
        {text}
      </p>

      <div className="flex gap-1 mt-3">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" />

        <span
          className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce"
          style={{ animationDelay: '120ms' }}
        />

        <span
          className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce"
          style={{ animationDelay: '240ms' }}
        />
      </div>
    </div>
  );
}

function WebsiteAccessScreen({
  state,
  userId,
  setUserId,
  rememberMe,
  setRememberMe,
  onVerify,
  onPurchase,
  onEnter,
}: {
  state: WebsiteState;
  userId: string;
  setUserId: (value: string) => void;
  rememberMe: boolean;
  setRememberMe: (value: boolean) => void;
  onVerify: () => void;
  onPurchase: () => void;
  onEnter: () => void;
}) {
  if (
    state === 'loading' ||
    state === 'verifying' ||
    state === 'payment-verifying'
  ) {
    return (
      <div className="min-h-screen bg-[#050001] text-white flex items-center justify-center p-6">
        <VerificationAnimation
          text={
            state === 'payment-verifying'
              ? 'Verifying payment securely...'
              : 'Verifying User ID...'
          }
        />
      </div>
    );
  }

  if (
    state === 'verified' ||
    state === 'payment-success'
  ) {
    return (
      <div className="min-h-screen bg-[#050001] text-white flex items-center justify-center p-5">
        <div className="w-full max-w-sm text-center">

          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />

            <div className="relative w-24 h-24 rounded-full bg-emerald-950/70 border border-emerald-400/50 flex items-center justify-center shadow-[0_0_45px_rgba(16,185,129,0.25)]">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </div>
          </div>

          <p className="text-xs uppercase tracking-[0.25em] text-emerald-400 font-bold mb-2">
            VERIFIED
          </p>

          <h1 className="text-2xl font-black text-white mb-2">
            Aviator Predictor Pro
          </h1>

          <p className="text-sm text-zinc-400 mb-6">
            Your User ID has been verified successfully.
          </p>

          <div className="rounded-2xl border border-red-900/60 bg-[#100103] p-5 mb-5">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
              Your User ID
            </p>

            <p className="text-3xl font-black tracking-[0.15em] text-red-400 break-all">
              {userId}
            </p>
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed mb-6">
            Please save or store this User ID number and don't share it.
            This is the User ID you will use to enter Aviator Predictor Pro
            next time.
          </p>

          <button
            onClick={onEnter}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold shadow-[0_0_30px_rgba(239,68,68,0.2)] active:scale-[0.98] transition-all"
          >
            ENTER AVIATOR PREDICTOR PRO
          </button>
        </div>
      </div>
    );
  }

  if (state === 'purchasing') {
    return (
      <div className="min-h-screen bg-[#050001] text-white flex items-center justify-center p-6">
        <VerificationAnimation text="Opening secure Paystack checkout..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050001] text-white flex items-center justify-center p-5">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">

          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-red-950/60 border border-red-500/40 flex items-center justify-center shadow-[0_0_35px_rgba(239,68,68,0.18)]">
            <ShieldCheck className="w-9 h-9 text-red-400" />
          </div>

          <p className="text-[10px] uppercase tracking-[0.3em] text-red-400 font-bold mb-2">
            SECURE ACCESS
          </p>

          <h1 className="text-2xl font-black">
            Aviator Predictor Pro
          </h1>

          <p className="text-sm text-zinc-500 mt-2">
            Enter your User ID Number
          </p>
        </div>

        {(state === 'wrong' ||
          state === 'payment-failed') && (
          <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-950/30 p-4 flex gap-3">

            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />

            <div>
              <p className="font-bold text-red-300">
                {state === 'wrong'
                  ? 'Wrong User ID'
                  : 'Payment verification failed'}
              </p>

              <p className="text-xs text-zinc-400 mt-1">
                {state === 'wrong'
                  ? 'User ID not found. Buy your User ID to access this bot.'
                  : 'Your payment could not be verified. Please try again.'}
              </p>
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-red-950/80 bg-[#0d0103] p-5 shadow-[0_0_40px_rgba(0,0,0,0.35)]">

          <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">
            User ID Number
          </label>

          <input
            value={userId}
            onChange={(e) =>
              setUserId(
                e.target.value
                  .replace(/\D/g, '')
                  .slice(0, 20)
              )
            }
            inputMode="numeric"
            autoComplete="off"
            placeholder="Enter User ID"
            className="w-full rounded-2xl bg-black/50 border border-red-950 px-4 py-4 text-white text-lg font-mono outline-none focus:border-red-500/60 transition-colors"
          />

          <label className="flex items-center gap-3 mt-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) =>
                setRememberMe(e.target.checked)
              }
              className="w-4 h-4 accent-red-600"
            />

            <span className="text-xs text-zinc-400">
              Remember Me
            </span>
          </label>

          <button
            onClick={onVerify}
            disabled={!userId.trim()}
            className="w-full mt-5 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm transition-all active:scale-[0.98]"
          >
            VERIFY USER ID
          </button>
        </div>

        <div className="flex items-center gap-3 my-6">

          <div className="h-px bg-red-950 flex-1" />

          <span className="text-[10px] uppercase tracking-widest text-zinc-600">
            No User ID?
          </span>

          <div className="h-px bg-red-950 flex-1" />
        </div>

        <button
          onClick={onPurchase}
          className="w-full rounded-2xl border border-red-500/30 bg-red-950/20 py-4 flex items-center justify-center gap-3 text-red-300 font-bold hover:bg-red-950/40 transition-all active:scale-[0.98]"
        >
          <CreditCard className="w-5 h-5" />
          💳 BUY USER ID — ₦2,000
        </button>

        <p className="text-[10px] text-zinc-600 text-center mt-5 leading-relaxed">
          Payment is processed securely through Paystack.
          Access is granted only after successful server-side
          verification.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [settings, setSettings] =
    useState<AppSettings>(() =>
      storageService.getSettings()
    );

  const [startupState, setStartupState] =
    useState<UserStartupState>(() =>
      storageService.getStartupState()
    );

  const [hasEnteredMultiplier, setHasEnteredMultiplier] =
    useState<boolean>(() =>
      storageService.hasEnteredToday()
    );

  const [activeTab, setActiveTab] =
    useState<TabType>('dashboard');

  const [isShowingRecalibrate, setIsShowingRecalibrate] =
    useState<boolean>(false);

  const [showDailyLimitModal, setShowDailyLimitModal] =
    useState<boolean>(false);

  const [telegramAuth, setTelegramAuth] =
    useState<TelegramAuth>({
      checked: false,
      authorized: true,
    });

  const [isTelegramMiniApp, setIsTelegramMiniApp] =
    useState(false);

  const [websiteState, setWebsiteState] =
    useState<WebsiteState>('loading');

  const [websiteUserId, setWebsiteUserId] =
    useState('');

  const [rememberMe, setRememberMe] =
    useState(false);

  /*
   * Verify a website User ID with the secure backend.
   */
  const verifyWebsiteUserId = async (id: string) => {
    const cleanId = id.trim();

    if (!cleanId) {
      setWebsiteState('wrong');
      return;
    }

    setWebsiteState('verifying');

    try {
      const response = await fetch(
        `/api/website/user-id/verify/${encodeURIComponent(
          cleanId
        )}`
      );

      if (!response.ok) {
        throw new Error(
          'Verification request failed'
        );
      }

      const data = await response.json();

      if (
        data?.authorized === true ||
        data?.verified === true
      ) {
        setWebsiteUserId(cleanId);

        if (rememberMe) {
          localStorage.setItem(
            USER_ID_KEY,
            cleanId
          );

          localStorage.setItem(
            REMEMBER_KEY,
            'true'
          );
        }

        setWebsiteState('verified');
      } else {
        setWebsiteState('wrong');
      }
    } catch (error) {
      console.error(
        'User ID verification failed:',
        error
      );

      setWebsiteState('wrong');
    }
  };

  /*
   * Create a real Paystack payment through the secure backend.
   */
  const purchaseWebsiteUserId = async () => {
    setWebsiteState('purchasing');

    try {
      /*
       * Remember the choice before leaving the page
       * for Paystack.
       */
      if (rememberMe) {
        localStorage.setItem(
          REMEMBER_KEY,
          'true'
        );
      } else {
        localStorage.removeItem(
          REMEMBER_KEY
        );
      }

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

      if (
        !response.ok ||
        !data?.authorizationUrl
      ) {
        throw new Error(
          data?.error ||
            'Unable to create payment'
        );
      }

      window.location.href =
        data.authorizationUrl;
    } catch (error) {
      console.error(
        'User ID purchase failed:',
        error
      );

      setWebsiteState('payment-failed');
    }
  };

  /*
   * Enter the existing Aviator Predictor Pro app.
   */
  const completeWebsiteEntry = () => {
    if (rememberMe && websiteUserId) {
      localStorage.setItem(
        USER_ID_KEY,
        websiteUserId
      );

      localStorage.setItem(
        REMEMBER_KEY,
        'true'
      );
    }

    setWebsiteState('verified');
  };

  /*
   * Telegram Mini App authentication and website
   * User ID initialization.
   */
  useEffect(() => {
    let cancelled = false;

    const initializeAccess = async () => {
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
      ).Telegram?.WebApp;

      /*
       * TELEGRAM MINI APP
       */
      if (tg) {
        setIsTelegramMiniApp(true);

        tg.ready();
        tg.expand();

        const initData = tg.initData;

        if (!initData) {
          if (!cancelled) {
            setTelegramAuth({
              checked: true,
              authorized: false,
            });
          }

          return;
        }

        try {
          const response = await fetch(
            '/api/auth/telegram-session',
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                initData,
              }),
            }
          );

          const data =
            await response.json();

          if (cancelled) return;

          if (data?.authorized) {
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
              role:
                data?.role ||
                'unpaid',
              user: data?.user,
            });
          }
        } catch (error) {
          console.error(
            'Telegram authentication failed:',
            error
          );

          if (!cancelled) {
            setTelegramAuth({
              checked: true,
              authorized: false,
            });
          }
        }

        return;
      }

      /*
       * NORMAL WEBSITE / BROWSER
       */
      const savedId =
        localStorage.getItem(
          USER_ID_KEY
        );

      const savedRemember =
        localStorage.getItem(
          REMEMBER_KEY
        ) === 'true';

      if (savedRemember && savedId) {
        setWebsiteUserId(savedId);
        setRememberMe(true);

        try {
          const response =
            await fetch(
              `/api/website/user-id/verify/${encodeURIComponent(
                savedId
              )}`
            );

          const data =
            await response.json();

          if (
            !cancelled &&
            (
              data?.authorized === true ||
              data?.verified === true
            )
          ) {
            setWebsiteState(
              'verified'
            );
          } else if (!cancelled) {
            localStorage.removeItem(
              USER_ID_KEY
            );

            setWebsiteState(
              'login'
            );
          }
        } catch (error) {
          console.error(
            'Saved User ID verification failed:',
            error
          );

          if (!cancelled) {
            setWebsiteState('login');
          }
        }
      } else {
        if (!cancelled) {
          setWebsiteState('login');
        }
      }
    };

    initializeAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Handle return from Paystack website User ID checkout.
   */
  useEffect(() => {
    if (isTelegramMiniApp) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    const type =
      params.get('type');

    const returnedUserId =
      params.get('userId');

    const reference =
      params.get('reference');

    if (
      type !== 'website-user' ||
      !returnedUserId ||
      !reference
    ) {
      return;
    }

    let cancelled = false;

    const verifyPaymentReturn =
      async () => {
        setWebsiteUserId(
          returnedUserId
        );

        setWebsiteState(
          'payment-verifying'
        );

        try {
          const response =
            await fetch(
              `/api/website/user-id/payment-verify?userId=${encodeURIComponent(
                returnedUserId
              )}&reference=${encodeURIComponent(
                reference
              )}`
            );

          const data =
            await response.json();

          if (cancelled) return;

          if (
            response.ok &&
            (
              data?.authorized === true ||
              data?.verified === true
            )
          ) {
            setWebsiteState(
              'payment-success'
            );

            const savedRemember =
              localStorage.getItem(
                REMEMBER_KEY
              ) === 'true';

            if (savedRemember) {
              localStorage.setItem(
                USER_ID_KEY,
                returnedUserId
              );
            }

            window.history.replaceState(
              {},
              '',
              '/'
            );
          } else {
            setWebsiteState(
              'payment-failed'
            );

            window.history.replaceState(
              {},
              '',
              '/'
            );
          }
        } catch (error) {
          console.error(
            'Payment verification failed:',
            error
          );

          if (!cancelled) {
            setWebsiteState(
              'payment-failed'
            );

            window.history.replaceState(
              {},
              '',
              '/'
            );
          }
        }
      };

    verifyPaymentReturn();

    return () => {
      cancelled = true;
    };
  }, [isTelegramMiniApp]);

  /*
   * Keep audio, haptic and other services synchronized
   * with the existing Settings.
   */
  useEffect(() => {
    audioService.setSoundEnabled(
      settings.soundEnabled
    );

    audioService.setSoundType(
      settings.soundType
    );

    hapticsService.setEnabled(
      settings.hapticEnabled
    );
  }, [settings]);

  /*
   * Existing Predictor Engine.
   */
  const {
    currentSignal,
    history,
    dailyO
