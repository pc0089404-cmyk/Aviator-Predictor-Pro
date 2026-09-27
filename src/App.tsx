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
  Volume2,
  VolumeX,
  Lock,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Loader2,
} from 'lucide-react';

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

const USER_ID_KEY = 'aviatorPredictorWebsiteUserId';
const REMEMBER_KEY = 'aviatorPredictorRememberUserId';

function VerificationAnimation({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
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

      <p className="text-sm font-mono text-zinc-300">{text}</p>

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
  if (state === 'loading' || state === 'verifying') {
    return (
      <div className="min-h-screen bg-[#050001] text-white flex items-center justify-center p-6">
        <VerificationAnimation
          text={
            state === 'loading'
              ? 'Loading secure access...'
              : 'Verifying User ID...'
          }
        />
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

  if (state === 'payment-verifying') {
    return (
      <div className="min-h-screen bg-[#050001] text-white flex items-center justify-center p-6">
        <VerificationAnimation text="Verifying payment securely..." />
      </div>
    );
  }

  if (state === 'payment-failed') {
    return (
      <div className="min-h-screen bg-[#050001] text-white flex items-center justify-center p-5">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-red-950/70 border border-red-500/50 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>

          <p className="text-xs uppercase tracking-[0.25em] text-red-400 font-bold mb-2">
            PAYMENT NOT VERIFIED
          </p>

          <h1 className="text-2xl font-black mb-3">
            Payment Not Completed
          </h1>

          <p className="text-sm text-zinc-400 leading-relaxed mb-6">
            The payment could not be verified. You have not been charged access
            unless Paystack confirms the transaction successfully.
          </p>

          <button
            onClick={() => {
              setUserId('');
              window.history.replaceState({}, '', '/');
            }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold"
          >
            TRY AGAIN
          </button>
        </div>
      </div>
    );
  }

  if (state === 'wrong') {
    return (
      <div className="min-h-screen bg-[#050001] text-white flex items-center justify-center p-5">
        <div className="w-full max-w-sm text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping" />

            <div className="relative w-24 h-24 rounded-full bg-red-950/70 border border-red-500/60 flex items-center justify-center shadow-[0_0_45px_rgba(239,68,68,0.3)]">
              <X className="w-12 h-12 text-red-400" />
            </div>
          </div>

          <p className="text-xs uppercase tracking-[0.25em] text-red-400 font-bold mb-2">
            ACCESS DENIED
          </p>

          <h1 className="text-2xl font-black mb-2">
            Wrong User ID
          </h1>

          <p className="text-sm text-zinc-400 mb-7">
            User ID not found.
            <br />
            Buy your User ID to access this bot.
          </p>

          <button
            onClick={onPurchase}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold shadow-[0_0_30px_rgba(239,68,68,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            BUY USER ID — ₦2,000
          </button>

          <button
            onClick={() => setUserId('')}
            className="mt-4 text-xs text-zinc-500 hover:text-white underline"
          >
            Try another User ID
          </button>
        </div>
      </div>
    );
  }

  if (state === 'verified' || state === 'payment-success') {
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
              YOUR USER ID
            </p>

            <p className="text-3xl font-black tracking-[0.15em] text-red-400 break-all">
              {userId}
            </p>
          </div>

          {state === 'payment-success' && (
            <p className="text-xs text-emerald-400 mb-4">
              Payment successfully verified.
            </p>
          )}

          <p className="text-xs text-zinc-500 leading-relaxed mb-6">
            Please save or store this User ID number and don't share it.
            This is the User ID you will use to enter Aviator Predictor Pro
            next time.
          </p>

          <label className="flex items-center justify-center gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 accent-red-600"
            />
            <span className="text-sm text-zinc-300">Remember Me</span>
          </label>

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

          <h1 className="text-2xl font-black mb-2">
            Aviator Predictor Pro
          </h1>

          <p className="text-sm text-zinc-400 leading-relaxed">
            Enter your User ID Number to access the application.
          </p>
        </div>

        <div className="rounded-3xl border border-red-950/80 bg-[#100103] p-5 shadow-[0_0_40px_rgba(239,68,68,0.08)]">
          <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
            User ID Number
          </label>

          <input
            value={userId}
            onChange={(e) =>
              setUserId(e.target.value.replace(/\D/g, '').slice(0, 20))
            }
            inputMode="numeric"
            autoComplete="off"
            placeholder="Enter User ID"
            className="w-full bg-black/50 border border-red-950 rounded-2xl px-4 py-4 text-white outline-none focus:border-red-500 transition-colors text-center tracking-[0.15em]"
          />

          <label className="flex items-center gap-3 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 accent-red-600"
            />
            <span className="text-sm text-zinc-400">Remember Me</span>
          </label>

          <button
            onClick={onVerify}
            disabled={!userId.trim()}
            className="w-full mt-5 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold shadow-lg active:scale-[0.98] transition-all"
          >
            VERIFY USER ID
          </button>

          <div className="flex items-center gap-2 justify-center mt-5 text-[10px] text-zinc-600 font-mono">
            <Lock className="w-3 h-3" />
            Secure server-side verification
          </div>
        </div>

        <p className="text-center text-[10px] text-zinc-600 mt-6">
          Aviator Predictor Pro · v2.9
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() =>
    storageService.getSettings()
  );

  const [startupState, setStartupState] =
    useState<UserStartupState>(() =>
      storageService.getStartupState()
    );

  const [hasEnteredMultiplier, setHasEnteredMultiplier] =
    useState<boolean>(() => storageService.hasEnteredToday());

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
   * Detect Telegram Mini App.
   *
   * Telegram authentication remains separate from the website
   * User ID system.
   */
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

    if (!tg) {
      setIsTelegramMiniApp(false);
      return;
    }

    setIsTelegramMiniApp(true);

    tg.ready();
    tg.expand();

    const initData = tg.initData;

    if (!initData) {
      setTelegramAuth({
        checked: true,
        authorized: false,
        role: 'unauthorized',
      });
      return;
    }

    fetch('/api/auth/telegram-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        initData,
      }),
    })
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error || 'Telegram authentication failed'
          );
        }

        return data;
      })
      .then((data) => {
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
            role: data?.role || 'unpaid',
            user: data?.user,
          });
        }
      })
      .catch((err) => {
        console.warn('Telegram auth check error:', err);

        /*
         * IMPORTANT:
         * Authentication failure must NOT grant access.
         */
        setTelegramAuth({
          checked: true,
          authorized: false,
          role: 'unauthorized',
        });
      });
  }, []);

  /*
   * Website User ID startup.
   * This runs only outside Telegram Mini App.
   */
  useEffect(() => {
    if (isTelegramMiniApp) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const paymentVerify =
      params.get('type') === 'website-user';

    const remember =
      localStorage.getItem(REMEMBER_KEY) === 'true';

    setRememberMe(remember);

    const savedUserId =
      localStorage.getItem(USER_ID_KEY);

    if (paymentVerify) {
      const returnedUserId =
        params.get('userId') || savedUserId || '';

      if (!returnedUserId) {
        setWebsiteState('login');
        return;
      }

      setWebsiteUserId(returnedUserId);
      setWebsiteState('payment-verifying');

      fetch(
        `/api/website/user-id/payment-verify?type=website-user&userId=${encodeURIComponent(
          returnedUserId
        )}`
      )
        .then(async (res) => {
          const data = await res.json();

          if (!res.ok) {
            throw new Error(
              data?.error || 'Payment verification failed'
            );
          }

          return data;
        })
        .then((data) => {
          if (data?.authorized || data?.verified || data?.paid) {
            if (remember) {
              localStorage.setItem(
                USER_ID_KEY,
                returnedUserId
              );
            }

            setWebsiteState('payment-success');

            window.history.replaceState(
              {},
              '',
              window.location.pathname
            );
          } else {
            setWebsiteState('payment-failed');
          }
        })
        .catch((err) => {
          console.error(
            'Website payment verification error:',
            err
          );

          setWebsiteState('payment-failed');
        });

      return;
    }

    if (savedUserId && remember) {
      setWebsiteUserId(savedUserId);
      setWebsiteState('verifying');

      fetch(
        `/api/website/user-id/verify/${encodeURIComponent(
          savedUserId
        )}`
      )
        .then(async (res) => {
          const data = await res.json();

          if (!res.ok) {
            throw new Error(
              data?.error || 'Verification failed'
            );
          }

          return data;
        })
        .then((data) => {
          if (data?.authorized || data?.verified || data?.paid) {
            setWebsiteState('verified');
          } else {
            localStorage.removeItem(USER_ID_KEY);
            setWebsiteUserId('');
            setWebsiteState('login');
          }
        })
        .catch(() => {
          setWebsiteState('login');
        });

      return;
    }

    setWebsiteState('login');
  }, [isTelegramMiniApp]);

  /*
   * Website User ID verification.
   */
  const handleWebsiteVerify = async () => {
    const id = websiteUserId.trim();

    if (!id) {
      return;
    }

    setWebsiteState('verifying');

    try {
      const response = await fetch(
        `/api/website/user-id/verify/${encodeURIComponent(id)}`
      );

      const data = await response.json();

      if (
        response.ok &&
        (data?.authorized ||
          data?.verified ||
          data?.paid)
      ) {
        if (rememberMe) {
          localStorage.setItem(
            USER_ID_KEY,
            id
          );

          localStorage.setItem(
            REMEMBER_KEY,
            'true'
          );
        } else {
          localStorage.removeItem(USER_ID_KEY);
          localStorage.setItem(
            REMEMBER_KEY,
            'false'
          );
        }

        setWebsiteState('verified');
      } else {
        setWebsiteState('wrong');
      }
    } catch (error) {
      console.error(
        'Website User ID verification error:',
        error
      );

      setWebsiteState('wrong');
    }
  };

  /*
   * Start a REAL Paystack transaction.
   */
  const handleWebsitePurchase = async () => {
    setWebsiteState('purchasing');

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

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to initialize payment'
        );
      }

      if (!data?.authorizationUrl) {
        throw new Error(
          'Paystack checkout URL was not returned'
        );
      }

      if (data?.userId) {
        setWebsiteUserId(
          String(data.userId)
        );
      }

      window.location.href =
        data.authorizationUrl;
    } catch (error) {
      console.error(
        'Paystack initialization error:',
        error
      );

      setWebsiteState('payment-failed');
    }
  };

  /*
            
