import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeTransitionType = 'horizontal' | 'vertical';

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

  /** Cycle through: light -> dark -> system -> light */
  toggle() {
    this.setMode(this.getNextMode());
  }

  async toggleWithTransition(type: ThemeTransitionType = 'horizontal') {
    await this.setDarkModeWithTransition(this.isDark() ? 'light' : 'dark', type);
  }

  async setDarkModeWithTransition(
    mode: Extract<ThemeMode, 'light' | 'dark'>,
    type: ThemeTransitionType = 'horizontal',
  ) {
    if (typeof document === 'undefined') {
      this.setMode(mode);
      return;
    }

    const startViewTransition = (document as Document & {
      startViewTransition?: (callback: () => void) => { ready: Promise<void> };
    }).startViewTransition;

    if (!startViewTransition) {
      this.setMode(mode);
      return;
    }

    const transition = startViewTransition.call(document, () => {
      this.setMode(mode);
    });

    await transition.ready;
    this.triggerThemeTransition(type);
  }

  setMode(mode: ThemeMode) {
    this.mode.set(mode);
    localStorage.setItem(this.STORAGE_KEY, mode);
    this.resolve();
  }

  private getNextMode(): ThemeMode {
    const order: ThemeMode[] = ['light', 'dark', 'system'];
    return order[(order.indexOf(this.mode()) + 1) % order.length];
  }

  private resolve() {
    let dark: boolean;

    switch (this.mode()) {
      case 'dark':
        dark = true;
        break;
      case 'light':
        dark = false;
        break;
      default:
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

  private triggerThemeTransition(type: ThemeTransitionType) {
    const root = document.documentElement as HTMLElement & {
      animate: (
        keyframes: Keyframe[] | PropertyIndexedKeyframes,
        options: KeyframeAnimationOptions & { pseudoElement?: string },
      ) => Animation;
    };

    const keyframes =
      type === 'horizontal'
        ? { clipPath: ['inset(50% 0 50% 0)', 'inset(0 0 0 0)'] }
        : { clipPath: ['inset(0 50% 0 50%)', 'inset(0 0 0 0)'] };

    root.animate(keyframes, {
      duration: 700,
      easing: 'ease-in-out',
      pseudoElement: '::view-transition-new(root)',
    });
  }

  private setFavicon(isDark: boolean) {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;

    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    link.href = isDark ? 'assets/logo/favicon_dark.ico' : 'assets/logo/favicon_light.ico';
  }

  private getStoredMode(): ThemeMode {
    if (typeof localStorage === 'undefined') return 'system';
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  }
}
