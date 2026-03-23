import { Injectable, signal } from '@angular/core';
import Lenis from 'lenis';

@Injectable({
  providedIn: 'root',
})
export class ScrollService {
  private lenisInstance?: Lenis;
  private isLocked = signal(false);

  setLenis(lenis: Lenis) {
    this.lenisInstance = lenis;
  }

  getLenis(): Lenis | undefined {
    return this.lenisInstance;
  }

  lock() {
    this.isLocked.set(true);
    this.lenisInstance?.stop();
    document.documentElement.classList.add('lenis-stopped');
    document.body.style.overflow = 'hidden';
  }

  unlock() {
    this.isLocked.set(false);
    this.lenisInstance?.start();
    document.documentElement.classList.remove('lenis-stopped');
    document.body.style.overflow = '';
  }

  scrollTo(target: any, options?: any) {
    this.lenisInstance?.scrollTo(target, options);
  }
}
