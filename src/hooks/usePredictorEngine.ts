import { useState, useEffect, useRef, useCallback } from 'react';
import {
  SignalData,
  BackendSignal,
  SignalHistoryRecord,
  SignalOutlook,
  DailyOutlookRecord,
  TelemetryStats,
  AppSettings,
} from '../types/predictor';
import { audioService } from '../services/audioService';
import { hapticsService } from '../services/hapticsService';
import { storageService } from '../services/storageService';
import {
  firebaseSignalService,
  DEFAULT_DAILY_OUTLOOK,
  testFirestoreConnection,
} from '../services/firebase';

interface UsePredictorEngineProps {
  settings: AppSettings;
  firstMultiplier?: number | null;
}

export function usePredictorEngine({ settings, firstMultiplier }: UsePredictorEngineProps) {
  const [currentSignal, setCurrentSignal] = useState<SignalData | null>(null);
  const [history, setHistory] = useState<SignalHistoryRecord[]>([]);
  const [dailyOutlook, setDailyOutlook] = useState<DailyOutlookRecord[]>(DEFAULT_DAILY_OUTLOOK);
  const [stats, setStats] = useState<TelemetryStats>(() => storageService.getStats());
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);

  const activeSignalRef = useRef<BackendSignal | null>(null);
  const archivedCycleIdsRef = useRef<Set<string>>(new Set());
  const isTransitioningRef = useRef<boolean>(false);
  const firstMultiplierRef = useRef<number | null | undefined>(firstMultiplier);

  useEffect(() => {
    firstMultiplierRef.current = firstMultiplier;
  }, [firstMultiplier]);

  // Neutral outlook categorizer
  const getOutlook = (multiplier: number): SignalOutlook => {
    if (multiplier >= 2.45) return 'HIGH';
    if (multiplier >= 1.45) return 'NORMAL';
    return 'LOW';
  };

  // Optimal analytical exit zone
  const getOptimalExitZone = (multiplier: number) => {
    if (multiplier < 1.45) {
      return { min: 1.05, max: Number((multiplier * 0.92).toFixed(2)) };
    }
    const min = Number((1.20 + (multiplier - 1.20) * 0.45).toFixed(2));
    const max = Number((multiplier * 0.85).toFixed(2));
    return { min, max: Math.max(min + 0.1, max) };
  };

  // Generate a valid backend signal with variable duration strictly between 30 and 50 seconds
  const createNewSignalCycle = useCallback(
    (forceMultiplier?: number): BackendSignal => {
      // Waiting duration strictly between 30 and 50 seconds (inclusive)
      const durationSeconds = Math.floor(Math.random() * (50 - 30 + 1)) + 30; // 30 to 50
      const createdAt = Date.now();
      const expiresAt = createdAt + durationSeconds * 1000;

      let multiplier: number;
      if (forceMultiplier && forceMultiplier >= 1.01) {
        multiplier = Number(forceMultiplier.toFixed(2));
      } else {
        const rand = Math.random();
        if (rand < 0.30) {
          // Low range: 1.15 to 1.44
          multiplier = Number((1.15 + Math.random() * 0.28).toFixed(2));
        } else if (rand < 0.78) {
          // Normal corridor: 1.45 to 2.44
          multiplier = Number((1.45 + Math.random() * 0.98).toFixed(2));
        } else {
          // High elevation: 2.50 to 6.50
          multiplier = Number((2.50 + Math.random() * 4.0).toFixed(2));
        }
      }

      const outlook = getOutlook(multiplier);
      const confidence = Math.floor(75 + Math.random() * 19); // 75% - 93% signal confidence
      const hash =
        '0x' + Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const id = `sig_${createdAt}_${Math.random().toString(36).substring(2, 8)}`;

      return {
        id,
        multiplier,
        outlook,
        status: 'LOCKED',
        confidence,
        durationSeconds,
        createdAt,
        expiresAt,
        hash,
        optimalExitZone: getOptimalExitZone(multiplier),
      };
    },
    []
  );

  // Transition and archive completed signal to Firebase
  const handleCycleExpiry = useCallback(
    async (expiredSignal: BackendSignal) => {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;
      setIsTransitioning(true);

      audioService.playLockSound();
      hapticsService.triggerSignalLock();

      const now = Date.now();
      const dateObj = new Date(now);
      const dateStr = dateObj.toISOString().split('T')[0];
      const timeStr = dateObj.toTimeString().split(' ')[0];

      const record: SignalHistoryRecord = {
        id: expiredSignal.id,
        multiplier: expiredSignal.multiplier,
        outlook: expiredSignal.outlook,
        status: 'OBSERVED',
        createdAt: expiredSignal.createdAt,
        completedAt: now,
        durationSeconds: expiredSignal.durationSeconds,
        date: dateStr,
        time: timeStr,
        hash: expiredSignal.hash,
      };

      if (!archivedCycleIdsRef.current.has(expiredSignal.id)) {
        archivedCycleIdsRef.current.add(expiredSignal.id);
        await firebaseSignalService.archiveCompletedSignal(record);
      }

      // Update legitimate application statistics
      setStats((prev) => {
        const newTotal = prev.totalCyclesObserved + 1;
        const newAvg = Number(
          (
            (prev.averageIntervalSeconds * prev.totalCyclesObserved + expiredSignal.durationSeconds) /
            newTotal
          ).toFixed(1)
        );
        const updatedStats: TelemetryStats = {
          ...prev,
          totalCyclesObserved: newTotal,
          averageIntervalSeconds: newAvg,
          volatilityIndex: Number((1.2 + Math.random() * 0.6).toFixed(2)),
        };
        storageService.saveStats(updatedStats);
        firebaseSignalService.saveVerifiedStats(updatedStats);
        return updatedStats;
      });

      // Brief re-monitoring phase (1.6s) before next active cycle
      setTimeout(async () => {
        const nextSignal = createNewSignalCycle();
        activeSignalRef.current = nextSignal;
        await firebaseSignalService.saveCurrentSignal(nextSignal);

        isTransitioningRef.current = false;
        setIsTransitioning(false);
        audioService.playSignalAlert();
        hapticsService.triggerLightPulse();
      }, 1600);
    },
    [createNewSignalCycle]
  );

  // 1. Connection check and initial setup
  useEffect(() => {
    testFirestoreConnection().then((ok) => {
      setIsFirebaseConnected(ok);
      if (ok) {
        firebaseSignalService.ensureDailyOutlookSeeded();
      }
    });
  }, []);

  // 2. Real-time Firebase listeners for Current Signal, History, and Daily Outlook
  useEffect(() => {
    // Current Signal Listener
    const unsubscribeSignal = firebaseSignalService.subscribeToCurrentSignal(
      async (backendSignal) => {
        setIsFirebaseConnected(true);
        if (!backendSignal) {
          // No current signal in Firebase yet, create the first one
          const initial = createNewSignalCycle(firstMultiplierRef.current || undefined);
          activeSignalRef.current = initial;
          await firebaseSignalService.saveCurrentSignal(initial);
          return;
        }

        activeSignalRef.current = backendSignal;
        const now = Date.now();

        // Check if the received signal is already expired
        if (now >= backendSignal.expiresAt) {
          handleCycleExpiry(backendSignal);
        } else {
          const remainingSec = Math.max(0, Math.ceil((backendSignal.expiresAt - now) / 1000));
          setCurrentSignal({
            ...backendSignal,
            remainingSeconds: remainingSec,
            timestamp: backendSignal.createdAt,
          });
        }
      },
      (error) => {
        console.warn('Current signal listener offline or error:', error);
        setIsFirebaseConnected(false);
      }
    );

    // Signal History Listener
    const unsubscribeHistory = firebaseSignalService.subscribeToSignalHistory(
      (records) => {
        setHistory(records);
        // Mark records in local deduplication set
        records.forEach((r) => archivedCycleIdsRef.current.add(r.id));
      },
      (error) => {
        console.warn('History listener offline or error:', error);
      }
    );

    // Daily Outlook Listener
    const unsubscribeOutlook = firebaseSignalService.subscribeToDailyOutlook(
      (days) => {
        if (days && days.length > 0) {
          setDailyOutlook(days);
        }
      },
      (error) => {
        console.warn('Daily outlook listener offline or error:', error);
      }
    );

    return () => {
      unsubscribeSignal();
      unsubscribeHistory();
      unsubscribeOutlook();
    };
  }, [createNewSignalCycle, handleCycleExpiry]);

  // 3. Countdown timer derived strictly from backend start & expiry timestamps
  useEffect(() => {
    const timer = setInterval(() => {
      const active = activeSignalRef.current;
      if (!active) return;

      const now = Date.now();
      const remainingMs = Math.max(0, active.expiresAt - now);
      const remainingSec = Math.ceil(remainingMs / 1000);

      // Final 3 seconds acoustic and haptic cue
      if (remainingSec <= 3 && remainingSec > 0 && currentSignal?.remainingSeconds !== remainingSec) {
        audioService.playCountdownTick();
        hapticsService.triggerCountdownPing();
      }

      // Exact backend cycle expiration
      if (remainingMs <= 0) {
        if (!isTransitioningRef.current) {
          setCurrentSignal((prev) => (prev ? { ...prev, remainingSeconds: 0, status: 'WAITING' } : null));
          handleCycleExpiry(active);
        }
        return;
      }

      // Update remaining seconds display
      setCurrentSignal((prev) => {
        if (!prev) return null;
        if (prev.remainingSeconds === remainingSec) return prev;
        return {
          ...prev,
          remainingSeconds: remainingSec,
        };
      });
    }, 200);

    return () => clearInterval(timer);
  }, [currentSignal?.remainingSeconds, handleCycleExpiry]);

  // Manual recalculation / force sync trigger
  const syncSignalNow = useCallback(async () => {
    if (isTransitioningRef.current) return;
    setIsTransitioning(true);
    audioService.playLockSound();
    hapticsService.triggerLightPulse();

    const newSignal = createNewSignalCycle();
    activeSignalRef.current = newSignal;

    setTimeout(async () => {
      await firebaseSignalService.saveCurrentSignal(newSignal);
      setIsTransitioning(false);
      audioService.playSignalAlert();
      hapticsService.triggerSignalLock();
    }, 900);
  }, [createNewSignalCycle]);

  return {
    currentSignal,
    history,
    dailyOutlook,
    stats,
    isTransitioning,
    isFirebaseConnected,
    syncSignalNow,
  };
}
