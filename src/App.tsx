/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Lock,
  ShieldCheck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

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

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

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

type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  initData?: string;
};

/* -------------------------------------------------------------------------- */
/* Website User ID storage                                                    */
/* -------------------------------------------------------------------------- */

const USER_ID_KEY = 'aviatorPredictorWebsiteUserId';
const REMEMBER_KEY = 'aviatorPredictorRememberUserId';

/* -------------------------------------------------------------------------- */
/* Verification animation                                                     */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Website User ID access screen                                              */
/* -------------------------------------------------------------------------- */

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
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[#050001] text-white flex items-center justify-center p-6">
        <VerificationAnimation text="Loading secure access..." />
      </div>
    );
  }

  if (state === 'verifying') {
    return (
      <div className="min-h-screen bg-[#050001] text-white flex items-center justify-center p-6">
        <VerificationAnimation text="Verifying User ID..." />
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
            The payment could not be verified. Access is granted only after
            Paystack confirms the transaction successfully.
          </p>

          <button
            onClick={() => {
              setUserId('');
              window.history.replaceState({}, '', '/');
            }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold active:scale-[0.98] transition-all"
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
            This User ID was not found or has not been activated.
            <br />
            Purchase a User ID to access Aviator Predictor Pro.
          </p>

          <button
            onClick={onPurchase}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold shadow-[0_0_30px_rgba(239,68,68,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            BUY USER ID — ₦2,000
          </button>

          <button
            onClick={() => {
              setUserId('');
            }}
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
            ACCESS VERIFIED
          </p>

          <h1 className="text-2xl font-black mb-3">
            Welcome to Aviator Predictor Pro
          </h1>

          <p className="text-sm text-zinc-400 leading-relaxed mb-7">
            Your User ID has been verified successfully.
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

  return (
    <div className="min-h-screen bg-[#050001] text-white flex items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-5 rounded-[24px] bg-red-950/60 border border-red-500/30 flex items-center justify-center shadow-[0_0_45px_rgba(239,68,68,0.2)]">
            <ShieldCheck className="w-10 h-10 text-red-400" />
          </div>

          <h1 className="text-2xl font-black tracking-tight">
            Aviator Predictor Pro
          </h1>

          <p className="text-sm text-zinc-500 mt-2">
            Enter your User ID to continue
          </p>
        </div>

        <div className="rounded-[28px] bg-gradient-to-b from-[#180306] to-[#090001] border border-red-950/80 p-5 shadow-[0_0_50px_rgba(239,68,68,0.08)]">
          <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-2">
            User ID
          </label>

          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && userId.trim()) {
                onVerify();
              }
            }}
            inputMode="numeric"
            autoComplete="off"
            placeholder="Enter your User ID"
            className="w-full rounded-2xl bg-black/60 border border-red-950 px-4 py-4 text-white placeholder:text-zinc-700 outline-none focus:border-red-500 transition-colors font-mono"
          />

          <label className="flex items-center gap-3 mt-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 accent-red-600"
            />

            <span className="text-xs text-zinc-400">
              Remember my User ID on this device
            </span>
          </label>

          <button
            onClick={onVerify}
            disabled={!userId.trim()}
            className="w-full mt-5 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold shadow-[0_0_25px_rgba(239,68,68,0.18)] active:scale-[0.98] transition-all"
          >
            VERIFY USER ID
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-red-950" />
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest">
              No User ID?
            </span>
            <div className="h-px flex-1 bg-red-950" />
          </div>

          <button
            onClick={onPurchase}
            className="w-full py-4 rounded-2xl bg-black/50 border border-red-900/70 text-red-300 font-bold hover:bg-red-950/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            BUY USER ID — ₦2,000
          </button>

          <p className="text-[10px] text-zinc-600 text-center mt-4 leading-relaxed">
            Payment is processed through Paystack. Access is granted only after
            successful server-side verification.
          </p>
        </div>

        <div className="text-center mt-5">
          <p className="text-[10px] text-zinc-700 font-mono">
            AVIATOR PREDICTOR PRO · v2.9
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main application                                                           */
/* -------------------------------------------------------------------------- */

export default function App() {
  /* ------------------------------------------------------------------------ */
  /* Existing application state                                               */
  /* ------------------------------------------------------------------------ */

  const [settings, setSettings] = useState<AppSettings>(() =>
    storageService.getSettings()
  );

  const [startupState, setStartupState] = useState<UserStartupState>(() =>
    storageService.getStartupState()
  );

  const [hasEnteredMultiplier, setHasEnteredMultiplier] =
    useState<boolean>(() => storageService.hasEnteredToday());

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const [isShowingRecalibrate, setIsShowingRecalibrate] =
    useState<boolean>(false);

  const [showDailyLimitModal, setShowDailyLimitModal] =
    useState<boolean>(false);

  /* ------------------------------------------------------------------------ */
  /* Telegram authentication                                                  */
  /* ------------------------------------------------------------------------ */

  const [telegramAuth, setTelegramAuth] = useState<TelegramAuth>({
    checked: false,
    authorized: true,
  });

  const [isTelegramMiniApp, setIsTelegramMiniApp] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* Website User ID access                                                   */
  /* ------------------------------------------------------------------------ */

  const [websiteState, setWebsiteState] =
    useState<WebsiteState>('loading');

  const [websiteUserId, setWebsiteUserId] = useState('');

  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return localStorage.getItem(REMEMBER_KEY) === 'true';
  });

  /* ------------------------------------------------------------------------ */
  /* Detect Telegram and validate the real Telegram Mini App session          */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const tg = (
      window as unknown as {
        Telegram?: {
          WebApp?: TelegramWebApp;
        };
      }
    )?.Telegram?.WebApp;

    if (!tg) {
      setIsTelegramMiniApp(false);
      setTelegramAuth({
        checked: true,
        authorized: true,
      });
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
        const data = await res.json().catch(() => null);

        if (!res.ok || !data) {
          throw new Error('Telegram authentication failed');
        }

        return data;
      })
      .then((data) => {
        if (data.authorized) {
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
            role: data.role || 'unpaid',
            user: data.user,
          });
        }
      })
      .catch((err) => {
        console.warn('Telegram auth check error:', err);

        /*
         * Fail closed inside Telegram.
         * Never grant access merely because authentication failed.
         */
        setTelegramAuth({
          checked: true,
          authorized: false,
        });
      });
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Website User ID initialization                                           */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (isTelegramMiniApp) {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    const paymentType = params.get('type');
    const userIdFromUrl = params.get('userId');

    /*
     * Returning from Paystack.
     */
    if (paymentType === 'website-user' && userIdFromUrl) {
      setWebsiteUserId(userIdFromUrl);
      setWebsiteState('payment-verifying');

      fetch(
        `/api/website/user-id/payment-verify?type=website-user&userId=${encodeURIComponent(
          userIdFromUrl
        )}`
      )
        .then(async (res) => {
          const data = await res.json().catch(() => null);

          if (!res.ok) {
            throw new Error(data?.error || 'Payment verification failed');
          }

          return data;
        })
        .then((data) => {
          const verified =
            data?.authorized === true ||
            data?.verified === true ||
            data?.paid === true;

          if (!verified) {
            setWebsiteState('payment-failed');
            return;
          }

          if (rememberMe) {
            localStorage.setItem(USER_ID_KEY, userIdFromUrl);
            localStorage.setItem(REMEMBER_KEY, 'true');
          }

          setWebsiteState('payment-success');

          window.history.replaceState({}, '', '/');
        })
        .catch((err) => {
          console.warn('Website payment verification error:', err);
          setWebsiteState('payment-failed');
        });

      return;
    }

    /*
     * Remembered User ID.
     */
    const savedUserId = localStorage.getItem(USER_ID_KEY);
    const shouldRemember =
      localStorage.getItem(REMEMBER_KEY) === 'true';

    if (savedUserId && shouldRemember) {
      setWebsiteUserId(savedUserId);
      setRememberMe(true);
      setWebsiteState('verifying');

      fetch(
        `/api/website/user-id/verify/${encodeURIComponent(savedUserId)}`
      )
        .then(async (res) => {
          const data = await res.json().catch(() => null);

          if (!res.ok) {
            throw new Error(data?.error || 'User ID verification failed');
          }

          return data;
        })
        .then((data) => {
          const verified =
            data?.authorized === true ||
            data?.verified === true ||
            data?.paid === true;

          setWebsiteState(verified ? 'verified' : 'wrong');
        })
        .catch((err) => {
          console.warn('Saved User ID verification error:', err);
          setWebsiteState('wrong');
        });

      return;
    }

    setWebsiteState('login');
  }, [isTelegramMiniApp, rememberMe]);

  /* ------------------------------------------------------------------------ */
  /* Exist
