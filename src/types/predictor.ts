export type SignalOutlook = 'HIGH' | 'NORMAL' | 'LOW';

export type SignalStatus = 'CALCULATING' | 'LOCKED' | 'MONITORING' | 'WAITING';

export type SoundType = 'app_base' | 'iphone' | 'samsung';

export type NightModeStyle = 'oled' | 'cockpit';

export interface SignalData {
  id: string;
  multiplier: number;
  outlook: SignalOutlook;
  confidence: number;
  durationSeconds: number;
  remainingSeconds: number;
  optimalExitZone: {
    min: number;
    max: number;
  };
  status: SignalStatus;
  timestamp: number;
  createdAt?: number;
  expiresAt?: number;
  hash: string;
}

export interface BackendSignal {
  id: string;
  multiplier: number;
  outlook: SignalOutlook;
  status: SignalStatus;
  confidence: number;
  durationSeconds: number;
  createdAt: number;
  expiresAt: number;
  hash: string;
  optimalExitZone: {
    min: number;
    max: number;
  };
}

export interface SignalHistoryRecord {
  id: string;
  multiplier: number;
  outlook: SignalOutlook;
  status: string;
  createdAt: number;
  completedAt: number;
  durationSeconds: number;
  date: string;
  time: string;
  hash: string;
  timestamp?: number;
}

export interface DailyOutlookRecord {
  dayId: string;
  dayName: string;
  dayShort: string;
  sublabel?: string;
  dayIndex: number;
  level: SignalOutlook;
  corridor: string;
  probability: string;
  altitude: string;
  description: string;
  updatedAt: number;
}

export interface AppSettings {
  soundEnabled: boolean;
  soundType: SoundType;
  notificationsEnabled: boolean;
  hapticEnabled: boolean;
  animationsEnabled: boolean;
  nightMode: NightModeStyle;
}

export interface UserStartupState {
  hasCompletedStartup: boolean;
  firstMultiplier: number | null;
  calibratedAt: number | null;
}

export interface TelemetryStats {
  totalCyclesObserved: number;
  averageIntervalSeconds: number;
  sessionStartTime: number;
  volatilityIndex: number;
  seedHash: string;
}
