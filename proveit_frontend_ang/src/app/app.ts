import { Component, signal, AfterViewInit, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, NgIf } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { AiWidget } from './features/components/ai-widget/ai-widget';
import { CustomModal } from './features/components/custom-modal/custom-modal';
import { ScrollService } from './services/scroll.service';
import { SystemSettingsService } from './services/system-settings.service';
import { filter } from 'rxjs/operators';
import { NavigationEnd } from '@angular/router';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AiWidget, CustomModal, NgIf],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, AfterViewInit, OnDestroy {
  protected readonly title = signal('ProveIt.io | Skill based Hiring Platform');
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private scrollService = inject(ScrollService);
  private systemSettings = inject(SystemSettingsService);
  private maintenanceMode = signal(false);
  protected cursorFollowerEnabled = signal(false);
  protected cursorFollowerVisible = signal(false);
  protected cursorFollowerTransform = signal('translate3d(-100px, -100px, 0) translate(-50%, -50%)');
  protected cursorFollowerInteractive = signal(false);
  private cursorAnimationFrameId?: number;
  private cleanupMouseFollower?: () => void;

  ngOnInit(): void {
    this.systemSettings.refresh().subscribe({
      next: () => {
        this.maintenanceMode.set(this.systemSettings.currentSettings.maintenanceMode);
        this.handleMaintenanceRoute(this.router.url);
      },
      error: () => {
        this.maintenanceMode.set(false);
      },
    });

    this.systemSettings.settings$.subscribe((settings) => {
      this.maintenanceMode.set(settings.maintenanceMode);
      this.handleMaintenanceRoute(this.router.url);
    });

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.handleMaintenanceRoute((event as NavigationEnd).urlAfterRedirects);
      });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initSmoothScroll();
      this.initMouseFollower();
    }
  }

  ngOnDestroy(): void {
    if (this.cursorAnimationFrameId) {
      cancelAnimationFrame(this.cursorAnimationFrameId);
    }

    this.cleanupMouseFollower?.();
  }

  showGlobalUi(): boolean {
    return !this.router.url.startsWith('/maintenance');
  }

  private handleMaintenanceRoute(url: string): void {
    const isAdminRoute = url.startsWith('/admin');
    const isMaintenanceRoute = url.startsWith('/maintenance');

    if (this.maintenanceMode() && !isAdminRoute && !isMaintenanceRoute) {
      this.router.navigateByUrl('/maintenance');
      return;
    }

    if (!this.maintenanceMode() && isMaintenanceRoute) {
      this.router.navigateByUrl('/');
    }
  }

  private initSmoothScroll(): void {
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    // Register lenis in our service
    this.scrollService.setLenis(lenis);
  }

  private initMouseFollower(): void {
    const supportsFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!supportsFinePointer || prefersReducedMotion) {
      return;
    }

    this.cursorFollowerEnabled.set(true);
    const interactiveSelector = 'a, button, [role="button"]';
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let velocityX = 0;
    let velocityY = 0;

    const setInteractiveState = (target: EventTarget | null) => {
      const element = target instanceof Element ? target.closest(interactiveSelector) : null;
      this.cursorFollowerInteractive.set(!!element);
    };

    const animate = () => {
      velocityX += (targetX - currentX) * 0.16;
      velocityY += (targetY - currentY) * 0.16;
      velocityX *= 0.72;
      velocityY *= 0.72;
      currentX += velocityX;
      currentY += velocityY;

      this.cursorFollowerTransform.set(
        `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`,
      );
      this.cursorAnimationFrameId = requestAnimationFrame(animate);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== 'mouse') {
        return;
      }

      targetX = event.clientX;
      targetY = event.clientY;
      setInteractiveState(event.target);

      if (!this.cursorFollowerVisible()) {
        currentX = event.clientX;
        currentY = event.clientY;
        velocityX = 0;
        velocityY = 0;
        this.cursorFollowerTransform.set(
          `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`,
        );
        this.cursorFollowerVisible.set(true);
      }
    };

    const hideFollower = () => {
      this.cursorFollowerVisible.set(false);
      this.cursorFollowerInteractive.set(false);
    };

    const handlePointerOver = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== 'mouse') {
        return;
      }

      setInteractiveState(event.target);
    };

    const handlePointerLeave = (event: MouseEvent) => {
      if (!event.relatedTarget) {
        hideFollower();
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerover', handlePointerOver, { passive: true });
    window.addEventListener('pointerdown', handlePointerMove, { passive: true });
    window.addEventListener('mouseout', handlePointerLeave);
    window.addEventListener('blur', hideFollower);
    document.addEventListener('visibilitychange', hideFollower);

    this.cursorAnimationFrameId = requestAnimationFrame(animate);

    this.cleanupMouseFollower = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerover', handlePointerOver);
      window.removeEventListener('pointerdown', handlePointerMove);
      window.removeEventListener('mouseout', handlePointerLeave);
      window.removeEventListener('blur', hideFollower);
      document.removeEventListener('visibilitychange', hideFollower);
    };
  }
}
