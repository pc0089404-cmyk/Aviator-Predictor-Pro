import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  BackendSignal,
  SignalHistoryRecord,
  DailyOutlookRecord,
  AppSettings,
  TelemetryStats,
} from '../types/predictor';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  const path = 'signals/current';
  try {
    await getDocFromServer(doc(db, 'signals', 'current'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is currently offline or unreachable.');
    }
    return false;
  }
}

// Default 7-day schedule to seed into Firebase if empty
export const DEFAULT_DAILY_OUTLOOK: DailyOutlookRecord[] = [
  {
    dayId: 'monday',
    dayName: 'Monday',
    dayShort: 'MON',
    dayIndex: 0,
    level: 'NORMAL',
    corridor: '1.45x - 2.30x',
    probability: '74%',
    altitude: '3,800 FT',
    description: 'Stable atmospheric lift, reliable base corridor',
    updatedAt: Date.now(),
  },
  {
    dayId: 'tuesday',
    dayName: 'Tuesday',
    dayShort: 'TUE',
    dayIndex: 1,
    level: 'HIGH',
    corridor: '2.45x - 5.80x',
    probability: '94%',
    altitude: '9,200 FT',
    description: 'High thermal propulsion, supersonic corridor peaks',
    updatedAt: Date.now(),
  },
  {
    dayId: 'wednesday',
    dayName: 'Wendays',
    sublabel: 'Wednesday',
    dayShort: 'WEN',
    dayIndex: 2,
    level: 'HIGH',
    corridor: '2.60x - 6.40x',
    probability: '97%',
    altitude: '11,400 FT',
    description: 'Maximum velocity ascent, weekly apex window',
    updatedAt: Date.now(),
  },
  {
    dayId: 'thursday',
    dayName: 'Thursday',
    dayShort: 'THU',
    dayIndex: 3,
    level: 'LOW',
    corridor: '1.12x - 1.44x',
    probability: '42%',
    altitude: '2,100 FT',
    description: 'Low air ceiling, conservative exit guidance',
    updatedAt: Date.now(),
  },
  {
    dayId: 'friday',
    dayName: 'Friday',
    dayShort: 'FRI',
    dayIndex: 4,
    level: 'LOW',
    corridor: '1.15x - 1.42x',
    probability: '39%',
    altitude: '1,950 FT',
    description: 'Turbulence zone, rapid ejection corridor',
    updatedAt: Date.now(),
  },
  {
    dayId: 'saturday',
    dayName: 'Suerday',
    sublabel: 'Saturday',
    dayShort: 'SUER',
    dayIndex: 5,
    level: 'NORMAL',
    corridor: '1.50x - 2.40x',
    probability: '76%',
    altitude: '4,100 FT',
    description: 'Even distribution, standard climb dynamics',
    updatedAt: Date.now(),
  },
  {
    dayId: 'sunday',
    dayName: 'Sunday',
    dayShort: 'SUN',
    dayIndex: 6,
    level: 'NORMAL',
    corridor: '1.45x - 2.25x',
    probability: '71%',
    altitude: '3,650 FT',
    description: 'Smooth weekend cruise, balanced corridor velocity',
    updatedAt: Date.now(),
  },
];

class FirebaseSignalService {
  private hasInitializedOutlook = false;

  // Initialize weekly outlook collection in Firestore if needed
  public async ensureDailyOutlookSeeded(): Promise<void> {
    if (this.hasInitializedOutlook) return;
    const path = 'daily_outlook';
    try {
      const snap = await getDocs(collection(db, path));
      if (snap.empty) {
        for (const day of DEFAULT_DAILY_OUTLOOK) {
          const docRef = doc(db, 'daily_outlook', day.dayId);
          await setDoc(docRef, day);
        }
      }
      this.hasInitializedOutlook = true;
    } catch (error) {
      console.warn('Could not seed daily outlook, will retry on next check:', error);
    }
  }

  // Real-time listener for current signal cycle
  public subscribeToCurrentSignal(
    onSignal: (signal: BackendSignal | null) => void,
    onError: (err: unknown) => void
  ): () => void {
    const docPath = 'signals/current';
    return onSnapshot(
      doc(db, 'signals', 'current'),
      (snapshot) => {
        if (snapshot.exists()) {
          onSignal(snapshot.data() as BackendSignal);
        } else {
          onSignal(null);
        }
      },
      (error) => {
        onError(error);
      }
    );
  }

  // Create a new signal cycle in Firestore
  public async saveCurrentSignal(signal: BackendSignal): Promise<void> {
    const docPath = 'signals/current';
    try {
      await setDoc(doc(db, 'signals', 'current'), signal);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  }

  // Archive a completed signal cycle into signal_history
  public async archiveCompletedSignal(record: SignalHistoryRecord): Promise<void> {
    const docPath = `signal_history/${record.id}`;
    try {
      // First check if already archived to avoid duplicate writes
      const existing = await getDoc(doc(db, 'signal_history', record.id));
      if (!existing.exists()) {
        await setDoc(doc(db, 'signal_history', record.id), record);
      }
    } catch (error) {
      console.error('Failed to archive completed signal:', error);
    }
  }

  // Real-time listener for saved signal history
  public subscribeToSignalHistory(
    onHistory: (records: SignalHistoryRecord[]) => void,
    onError: (err: unknown) => void
  ): () => void {
    const colPath = 'signal_history';
    const q = query(collection(db, colPath), orderBy('completedAt', 'desc'), limit(30));
    return onSnapshot(
      q,
      (snapshot) => {
        const records: SignalHistoryRecord[] = [];
        snapshot.forEach((doc) => {
          records.push(doc.data() as SignalHistoryRecord);
        });
        onHistory(records);
      },
      (error) => {
        onError(error);
      }
    );
  }

  // Real-time listener for daily outlook
  public subscribeToDailyOutlook(
    onOutlook: (days: DailyOutlookRecord[]) => void,
    onError: (err: unknown) => void
  ): () => void {
    const colPath = 'daily_outlook';
    return onSnapshot(
      collection(db, colPath),
      (snapshot) => {
        const days: DailyOutlookRecord[] = [];
        snapshot.forEach((doc) => {
          days.push(doc.data() as DailyOutlookRecord);
        });
        // Sort by dayIndex 0 to 6
        days.sort((a, b) => a.dayIndex - b.dayIndex);
        if (days.length > 0) {
          onOutlook(days);
        } else {
          // If empty, trigger seed and emit default
          this.ensureDailyOutlookSeeded();
          onOutlook(DEFAULT_DAILY_OUTLOOK);
        }
      },
      (error) => {
        onError(error);
      }
    );
  }

  // Save/update global app settings in Firestore
  public async saveAppSettings(settings: AppSettings): Promise<void> {
    const docPath = 'settings/app';
    try {
      await setDoc(doc(db, 'settings', 'app'), {
        ...settings,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.warn('Unable to sync settings to Firestore:', error);
    }
  }

  // Save/update verified statistics in Firestore
  public async saveVerifiedStats(stats: TelemetryStats): Promise<void> {
    const docPath = 'verified_stats/app';
    try {
      await setDoc(doc(db, 'verified_stats', 'app'), {
        id: 'app',
        totalCyclesObserved: stats.totalCyclesObserved,
        averageIntervalSeconds: stats.averageIntervalSeconds,
        sessionStartTime: stats.sessionStartTime,
        volatilityIndex: stats.volatilityIndex,
        seedHash: stats.seedHash,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.warn('Unable to sync verified stats to Firestore:', error);
    }
  }
}

export const firebaseSignalService = new FirebaseSignalService();
