import { Injectable, signal } from '@angular/core';

type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'proveit-theme';
  private mediaQuery?: MediaQueryList;

  /** Reactive signal for the current theme preference */
  readonly mode = signal<ThemeMode>(this.getStoredMode());

  /** Reactive signal for whether dark mode is actually active */
  readonly isDark = signal<boolean>(false);

  initTheme() {
    if (typeof window === 'undefined') return;

    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', () => this.resolve());

    this.resolve();
  }

  /** Cycle through: light → dark → system → light … */
  toggle() {
    const order: ThemeMode[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(this.mode()) + 1) % order.length];
    this.setMode(next);
  }

  setMode(mode: ThemeMode) {
    this.mode.set(mode);
    localStorage.setItem(this.STORAGE_KEY, mode);
    this.resolve();
  }

  // ── private ──────────────────────────────────────────────────────────

  private resolve() {
    let dark: boolean;

    switch (this.mode()) {
      case 'dark':
        dark = true;
        break;
      case 'light':
        dark = false;
        break;
      default: // 'system'
        dark = this.mediaQuery?.matches ?? false;
    }

    this.isDark.set(dark);
    this.applyTheme(dark);
  }

  private applyTheme(isDark: boolean) {
    document.documentElement.classList.toggle('dark', isDark);
    document.body.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    this.setFavicon(isDark);
  }

  private setFavicon(isDark: boolean) {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;

    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    link.href = isDark
      ? 'assets/logo/favicon_dark.ico'
      : 'assets/logo/favicon_light.ico';
  }

  private getStoredMode(): ThemeMode {
    if (typeof localStorage === 'undefined') return 'system';
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return (stored === 'light' || stored === 'dark' || stored === 'system')
      ? stored
      : 'system';
  }
}
