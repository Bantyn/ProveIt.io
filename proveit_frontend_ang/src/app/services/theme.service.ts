import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private mediaQuery?: MediaQueryList;

  initTheme() {
    if (typeof window === 'undefined') return;

    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.applyTheme(this.mediaQuery.matches);

    this.mediaQuery.addEventListener('change', (event) => {
      this.applyTheme(event.matches);
    });
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
}
