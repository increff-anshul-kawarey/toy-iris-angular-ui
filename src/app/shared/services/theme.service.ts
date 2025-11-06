import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  systemPrefersDark: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_STORAGE_KEY = 'toyiris-theme';
  private readonly systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  // Signals for reactive theme state
  private readonly _themeMode = signal<ThemeMode>('system');
  private readonly _systemPrefersDark = signal<boolean>(this.systemThemeQuery.matches);
  private readonly _isDark = computed(() => {
    const mode = this._themeMode();
    if (mode === 'system') {
      return this._systemPrefersDark();
    }
    return mode === 'dark';
  });

  // BehaviorSubject for backward compatibility
  private readonly themeStateSubject = new BehaviorSubject<ThemeState>({
    mode: this._themeMode(),
    isDark: this._isDark(),
    systemPrefersDark: this._systemPrefersDark()
  });

  // Public observables
  public readonly themeState$ = this.themeStateSubject.asObservable();
  public readonly isDark$ = new Observable<boolean>(subscriber => {
    const subscription = this.themeState$.subscribe(state => subscriber.next(state.isDark));
    return () => subscription.unsubscribe();
  });

  constructor() {
    this.initializeTheme();
    this.setupSystemThemeListener();
  }

  /**
   * Get the current theme mode
   */
  get themeMode(): ThemeMode {
    return this._themeMode();
  }

  /**
   * Get whether the current theme is dark
   */
  get isDark(): boolean {
    return this._isDark();
  }

  /**
   * Get whether the system prefers dark mode
   */
  get systemPrefersDark(): boolean {
    return this._systemPrefersDark();
  }

  /**
   * Set the theme mode
   */
  setTheme(mode: ThemeMode): void {
    this._themeMode.set(mode);
    this.updateThemeState();
    this.applyTheme();
    this.saveThemePreference(mode);
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): void {
    const currentMode = this._themeMode();
    if (currentMode === 'system') {
      // If system mode, toggle to the opposite of current system preference
      this.setTheme(this._systemPrefersDark() ? 'light' : 'dark');
    } else {
      // Toggle between light and dark
      this.setTheme(currentMode === 'light' ? 'dark' : 'light');
    }
  }

  /**
   * Set theme to light mode
   */
  setLightTheme(): void {
    this.setTheme('light');
  }

  /**
   * Set theme to dark mode
   */
  setDarkTheme(): void {
    this.setTheme('dark');
  }

  /**
   * Set theme to system preference
   */
  setSystemTheme(): void {
    this.setTheme('system');
  }

  /**
   * Get the effective theme (resolves 'system' to actual light/dark)
   */
  getEffectiveTheme(): 'light' | 'dark' {
    return this._isDark() ? 'dark' : 'light';
  }

  /**
   * Check if a specific theme mode is active
   */
  isThemeMode(mode: ThemeMode): boolean {
    return this._themeMode() === mode;
  }

  /**
   * Get theme icon based on current mode
   */
  getThemeIcon(): string {
    const mode = this._themeMode();
    if (mode === 'system') {
      return 'computer';
    }
    return this._isDark() ? 'light_mode' : 'dark_mode';
  }

  /**
   * Get theme label for UI display
   */
  getThemeLabel(): string {
    const mode = this._themeMode();
    switch (mode) {
      case 'light':
        return 'Light Mode';
      case 'dark':
        return 'Dark Mode';
      case 'system':
        return 'System Theme';
      default:
        return 'Theme';
    }
  }

  /**
   * Get next theme mode for cycling through options
   */
  getNextThemeMode(): ThemeMode {
    const current = this._themeMode();
    switch (current) {
      case 'light':
        return 'dark';
      case 'dark':
        return 'system';
      case 'system':
        return 'light';
      default:
        return 'light';
    }
  }

  /**
   * Initialize theme from localStorage or system preference
   */
  private initializeTheme(): void {
    const savedTheme = this.getSavedThemePreference();
    const mode = savedTheme || 'system';
    
    this._themeMode.set(mode);
    this.updateThemeState();
    this.applyTheme();
  }

  /**
   * Setup listener for system theme changes
   */
  private setupSystemThemeListener(): void {
    this.systemThemeQuery.addEventListener('change', (e) => {
      this._systemPrefersDark.set(e.matches);
      this.updateThemeState();
      
      // Reapply theme if in system mode
      if (this._themeMode() === 'system') {
        this.applyTheme();
      }
    });
  }

  /**
   * Apply the current theme to the document
   */
  private applyTheme(): void {
    const isDark = this._isDark();
    const root = document.documentElement;
    
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
    }

    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(isDark);
  }

  /**
   * Update meta theme-color for mobile browsers
   */
  private updateMetaThemeColor(isDark: boolean): void {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    
    const color = isDark ? '#1a1a1a' : '#ffffff';
    metaThemeColor.setAttribute('content', color);
  }

  /**
   * Update the theme state subject
   */
  private updateThemeState(): void {
    this.themeStateSubject.next({
      mode: this._themeMode(),
      isDark: this._isDark(),
      systemPrefersDark: this._systemPrefersDark()
    });
  }

  /**
   * Save theme preference to localStorage
   */
  private saveThemePreference(mode: ThemeMode): void {
    try {
      localStorage.setItem(this.THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.warn('Failed to save theme preference to localStorage:', error);
    }
  }

  /**
   * Get saved theme preference from localStorage
   */
  private getSavedThemePreference(): ThemeMode | null {
    try {
      const saved = localStorage.getItem(this.THEME_STORAGE_KEY);
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        return saved as ThemeMode;
      }
    } catch (error) {
      console.warn('Failed to read theme preference from localStorage:', error);
    }
    return null;
  }

  /**
   * Reset theme to system preference
   */
  resetTheme(): void {
    this.setTheme('system');
  }

  /**
   * Clear saved theme preference
   */
  clearThemePreference(): void {
    try {
      localStorage.removeItem(this.THEME_STORAGE_KEY);
      this.resetTheme();
    } catch (error) {
      console.warn('Failed to clear theme preference from localStorage:', error);
    }
  }

  /**
   * Get theme statistics for debugging
   */
  getThemeInfo(): {
    mode: ThemeMode;
    isDark: boolean;
    systemPrefersDark: boolean;
    effectiveTheme: 'light' | 'dark';
    savedPreference: string | null;
    supportsSystemTheme: boolean;
  } {
    return {
      mode: this._themeMode(),
      isDark: this._isDark(),
      systemPrefersDark: this._systemPrefersDark(),
      effectiveTheme: this.getEffectiveTheme(),
      savedPreference: this.getSavedThemePreference(),
      supportsSystemTheme: 'matchMedia' in window
    };
  }
}
