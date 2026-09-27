import { AppSettings, UserStartupState, SignalHistoryRecord, TelemetryStats } from '../types/predictor';

const SETTINGS_KEY = 'aviator_pro_settings_v2';
const STARTUP_KEY = 'aviator_pro_startup_v2';
const HISTORY_KEY = 'aviator_pro_history_v2';
const STATS_KEY = 'aviator_pro_stats_v2';
const UI_PAGE_DATE_KEY = 'aviator_pro_last_ui_page_date_v1';

export const defaultSettings: AppSettings = {
  soundEnabled: true,
  soundType: 'app_base',
  notificationsEnabled: false,
  hapticEnabled: true,
  animationsEnabled: true,
  nightMode: 'oled',
};

export const defaultStartupState: UserStartupState = {
  hasCompletedStartup: false,
  firstMultiplier: null,
  calibratedAt: null,
};

class StorageService {
  public getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) {
        return { ...defaultSettings, ...JSON.parse(data) };
      }
    } catch {
      // fallback
    }
    return defaultSettings;
  }

  public saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }

  public getStartupState(): UserStartupState {
    try {
      const data = localStorage.getItem(STARTUP_KEY);
      if (data) {
        return { ...defaultStartupState, ...JSON.parse(data) };
      }
    } catch {
      // fallback
    }
    return defaultStartupState;
  }

  public saveStartupState(state: UserStartupState): void {
    try {
      localStorage.setItem(STARTUP_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }

  public getSignalHistory(): SignalHistoryRecord[] {
    try {
      const data = localStorage.getItem(HISTORY_KEY);
      if (data) {
        const parsed: SignalHistoryRecord[] = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          const deduped: SignalHistoryRecord[] = [];
          for (const item of parsed) {
            if (item && item.id && !seen.has(item.id)) {
              seen.add(item.id);
              deduped.push(item);
            }
          }
          return deduped;
        }
      }
    } catch {
      // fallback
    }
    return [];
  }

  public saveSignalHistory(history: SignalHistoryRecord[]): void {
    try {
      // deduplicate and keep max 30 records
      const seen = new Set<string>();
      const deduped: SignalHistoryRecord[] = [];
      for (const item of history) {
        if (item && item.id && !seen.has(item.id)) {
          seen.add(item.id);
          deduped.push(item);
        }
      }
      const trimmed = deduped.slice(0, 30);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    } catch {
      // ignore
    }
  }

  public getStats(): TelemetryStats {
    try {
      const data = localStorage.getItem(STATS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }
    return {
      totalCyclesObserved: 0,
      averageIntervalSeconds: 38.0,
      sessionStartTime: Date.now(),
      volatilityIndex: 1.42,
      seedHash: this.generateSeedHash(),
    };
  }

  public saveStats(stats: TelemetryStats): void {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
      // ignore
    }
  }

  public generateSeedHash(): string {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 16; i++) {
      hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
  }

  public getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  public getLastUIPageDate(): string | null {
    try {
      const stored = localStorage.getItem(UI_PAGE_DATE_KEY);
      if (stored) return stored;

      // If user has already completed startup in the past, seed today's date so reload won't kick them out
      const startup = this.getStartupState();
      if (startup.hasCompletedStartup) {
        const today = this.getTodayDateString();
        this.setLastUIPageDate(today);
        return today;
      }
    } catch {
      // fallback
    }
    return null;
  }

  public setLastUIPageDate(dateStr?: string): void {
    try {
      const val = dateStr || this.getTodayDateString();
      localStorage.setItem(UI_PAGE_DATE_KEY, val);
    } catch {
      // ignore
    }
  }

  public clearLastUIPageDate(): void {
    try {
      localStorage.removeItem(UI_PAGE_DATE_KEY);
    } catch {
      // ignore
    }
  }

  public hasEnteredToday(): boolean {
    const lastDate = this.getLastUIPageDate();
    const today = this.getTodayDateString();
    return lastDate === today;
  }

  public resetAllData(): void {
    try {
      localStorage.removeItem(SETTINGS_KEY);
      localStorage.removeItem(STARTUP_KEY);
      localStorage.removeItem(HISTORY_KEY);
      localStorage.removeItem(STATS_KEY);
      localStorage.removeItem(UI_PAGE_DATE_KEY);
    } catch {
      // ignore
    }
  }
}

export const storageService = new StorageService();
