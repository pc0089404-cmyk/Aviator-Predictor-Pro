class HapticsService {
  private enabled: boolean = true;

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public triggerSignalLock() {
    if (!this.enabled || typeof window === 'undefined') return;
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([40, 60, 40]);
      } catch {
        // Ignore failure
      }
    }
  }

  public triggerLightPulse() {
    if (!this.enabled || typeof window === 'undefined') return;
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch {
        // Ignore failure
      }
    }
  }

  public triggerCountdownPing() {
    if (!this.enabled || typeof window === 'undefined') return;
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        // Ignore failure
      }
    }
  }
}

export const hapticsService = new HapticsService();
