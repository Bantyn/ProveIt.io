import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  inject,
  HostListener,
  ElementRef,
  AfterViewInit,
  ViewChild,
  ViewChildren,
  QueryList,
  Renderer2,
  NgZone,
} from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
  RouterLinkWithHref,
  Router,
  NavigationEnd,
} from '@angular/router';
import { NgClass, NgForOf, NgIf, TitleCasePipe } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { ThemeService } from '../../../services/theme.service';
import { take, filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

type UserRole = 'candidate' | 'company' | 'admin' | null;

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkWithHref,
    RouterLinkActive,
    NgClass,
    NgForOf,
    NgIf,
    TitleCasePipe,
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit, AfterViewInit, OnDestroy {
  isLoggedIn = false;
  role: UserRole = null;
  showProfileDropdown = false;
  mobileMenuOpen = false;

  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private eRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  private zone = inject(NgZone);
  private router = inject(Router);
  readonly theme = inject(ThemeService);

  userName: string | null = null;
  userProfileImage: string = '';

  @Input() menus: { label: string; route: string }[] = [];
  @Input() transparent = false;

  @ViewChild('slidingPill', { static: false }) slidingPill!: ElementRef<HTMLSpanElement>;
  @ViewChild('navPillContainer', { static: false }) navPillContainer!: ElementRef<HTMLDivElement>;
  @ViewChildren(RouterLinkActive) routerLinkActives!: QueryList<RouterLinkActive>;

  adv =
    "We're hiring! Build the future with ProveIt.io — work on meaningful products, solve real problems, and grow with a passionate team.";

  private routerSub?: Subscription;
  private raf?: number;

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.showProfileDropdown = false;
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth >= 768) this.mobileMenuOpen = false;
    this.schedulePillUpdate();
  }

  ngOnInit() {
    // Reactively update auth status whenever it changes
    this.authService.isLoggedIn$.subscribe(() => {
      this.checkAuth();
      this.updateMenus();
    });
  }

  ngAfterViewInit() {
    // First render: set pill instantly (no animation yet)
    this.setPillInstant();

    // After each navigation: animate pill to new active
    this.zone.runOutsideAngular(() => {
      this.routerSub = this.router.events
        .pipe(filter((e) => e instanceof NavigationEnd))
        .subscribe(() => {
          // Small rAF delay so Angular renders the new routerLinkActive state
          this.schedulePillUpdate();
        });
    });
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
    if (this.raf) cancelAnimationFrame(this.raf);
  }

  /** Called immediately on link click — snaps the pill to clicked element BEFORE navigation */
  onNavClick(index: number) {
    this.zone.runOutsideAngular(() => {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(() => this.movePillToIndex(index));
    });
    this.closeMobileMenu();
  }

  /** Schedule a rAF-based update (with transition) */
  private schedulePillUpdate(double = false) {
    this.zone.runOutsideAngular(() => {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(() => {
        // Double rAF ensures Angular's routerLinkActive has stabilised
        if (double) {
          this.raf = requestAnimationFrame(() => this.movePillToActive());
        } else {
          this.movePillToActive();
        }
      });
    });
  }

  /** Set pill position immediately with NO transition (first render or resize) */
  private setPillInstant() {
    this.zone.runOutsideAngular(() => {
      this.raf = requestAnimationFrame(() => {
        const pill = this.slidingPill?.nativeElement;
        if (!pill) return;
        // Temporarily disable transition so initial placement is instant
        this.renderer.setStyle(pill, 'transition', 'none');
        this.movePillToActive();
        // Re-enable transition on next frame
        requestAnimationFrame(() => {
          this.renderer.removeStyle(pill, 'transition');
        });
      });
    });
  }

  /** Move pill to the currently active nav link */
  private movePillToActive() {
    const pill = this.slidingPill?.nativeElement;
    const container = this.navPillContainer?.nativeElement;
    if (!pill || !container) return;

    const navLinks = container.querySelectorAll<HTMLElement>('a.nav-link');
    let activeEl: HTMLElement | null = null;

    // Find the active link — check data-nav-index via routerLinkActives
    this.routerLinkActives.forEach((rla, i) => {
      if (rla.isActive && navLinks[i]) activeEl = navLinks[i];
    });

    this.applyPillToElement(pill, container, activeEl);
  }

  /** Move pill to a specific index element */
  private movePillToIndex(index: number) {
    const pill = this.slidingPill?.nativeElement;
    const container = this.navPillContainer?.nativeElement;
    if (!pill || !container) return;

    const navLinks = container.querySelectorAll<HTMLElement>('a.nav-link');
    const target = navLinks[index] ?? null;
    this.applyPillToElement(pill, container, target);
  }

  /** Apply pill geometry to a target element */
  private applyPillToElement(
    pill: HTMLElement,
    container: HTMLElement,
    target: HTMLElement | null,
  ) {
    if (!target) {
      this.renderer.setStyle(pill, 'opacity', '0');
      return;
    }

    // Use getBoundingClientRect for accuracy
    const cr = container.getBoundingClientRect();
    const tr = target.getBoundingClientRect();

    const left = tr.left - cr.left + container.scrollLeft;
    const top = tr.top - cr.top + container.scrollTop;

    this.renderer.setStyle(pill, 'left', `${left}px`);
    this.renderer.setStyle(pill, 'top', `${top}px`);
    this.renderer.setStyle(pill, 'width', `${tr.width}px`);
    this.renderer.setStyle(pill, 'height', `${tr.height}px`);
    this.renderer.setStyle(pill, 'opacity', '1');
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  private checkAuth() {
    this.isLoggedIn = this.hasCookie('auth_token');
    this.role = this.getCookie('user_role') as UserRole;
    this.authService.user$.pipe(take(1)).subscribe((user: any) => {
      if (user) {
        this.apiService.getUser(user.uid).subscribe((data: any) => {
          if (data) {
            this.userName = data.fullName || data.name || user.displayName;
            this.userProfileImage =
              data.profileImage || data.logoUrl || data.imageUrl || user.photoURL || '';
          }
        });
      }
    });
  }

  private updateMenus() {
    if (this.isLoggedIn) {
      if (this.role === 'candidate') {
        this.menus = [
          { label: 'Home', route: '/home' },
          { label: 'Competitions', route: '/user/compition' },
          { label: 'Company', route: '/user/company' },
          { label: 'About', route: '/about' },
          { label: 'Contact', route: '/contact' },
          { label: 'Support', route: '/support' },
        ];
      } else if (this.role === 'company') {
        this.menus = [
          { label: 'Dashboard', route: '/company/dashboard' },
          { label: 'Competitions', route: '/company/dashboard/competitions' },
          { label: 'Applications', route: '/company/dashboard/applications' },
          { label: 'Pricing', route: '/pricing' },
          { label: 'About', route: '/about' },
          { label: 'Contact', route: '/contact' },
          { label: 'Support', route: '/support' },
        ];
      } else if (this.role === 'admin') {
        this.menus = [
          { label: 'Dashboard', route: '/admin/overview' },
          { label: 'Users', route: '/admin/users' },
          { label: 'Companies', route: '/admin/companies' },
          { label: 'Competitions', route: '/admin/competitions' },
        ];
      }
    } else {
      const defaultGuestMenus = [
        { label: 'Home', route: '/home' },
        { label: 'Competitions', route: '/user/compition' },
        { label: 'Company', route: '/user/company' },
        { label: 'Pricing', route: '/pricing' },
        { label: 'About', route: '/about' },
        { label: 'Contact', route: '/contact' },
        { label: 'Support', route: '/support' },
      ];
      if (!this.menus || this.menus.length === 0) {
        this.menus = defaultGuestMenus;
      } else {
        if (!this.menus.some((m) => m.label === 'Pricing'))
          this.menus.push({ label: 'Pricing', route: '/pricing' });
        if (!this.menus.some((m) => m.label === 'Contact'))
          this.menus.push({ label: 'Contact', route: '/contact' });
        if (!this.menus.some((m) => m.label === 'Support'))
          this.menus.push({ label: 'Support', route: '/support' });
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private hasCookie(name: string) {
    return document.cookie.split('; ').some((r) => r.startsWith(name + '='));
  }
  private getCookie(name: string): string | null {
    const c = document.cookie.split('; ').find((r) => r.startsWith(name + '='));
    return c ? c.split('=')[1] : null;
  }

  getRoute(menu: { route: string }) {
    return menu.route.startsWith('/') ? menu.route : '/' + menu.route;
  }

  getDashboardRoute(): string {
    switch (this.role) {
      case 'candidate':
        return '/user/applications';
      case 'company':
        return '/company/dashboard';
      case 'admin':
        return '/admin/overview';
      default:
        return '/auth';
    }
  }

  goToLogin() {
    this.authService.loginForm = true;
    this.authService.regForm = false;
    this.closeMobileMenu();
    this.router.navigate(['/auth']);
  }

  logout() {
    this.authService.logOut();
    this.mobileMenuOpen = false;
  }
  toggleDropdown() {
    this.showProfileDropdown = !this.showProfileDropdown;
  }
  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (this.mobileMenuOpen) this.showProfileDropdown = false;
  }
  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }

  demoLogin(role: UserRole) {
    const maxAge = 60 * 60 * 8;
    document.cookie = `auth_token=demo_token; Max-Age=${maxAge}; path=/`;
    document.cookie = `user_role=${role}; Max-Age=${maxAge}; path=/`;
    this.isLoggedIn = true;
    this.role = role;
    this.updateMenus();
    window.location.href = this.getDashboardRoute();
  }
}
