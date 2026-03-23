import { Component, Input, OnInit, inject, HostListener, ElementRef } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterLinkWithHref } from '@angular/router';
import { NgClass, NgForOf, NgIf, TitleCasePipe } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { shareReplay, distinctUntilChanged, take } from 'rxjs/operators';

type UserRole = 'candidate' | 'company' | 'admin' | null;

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkWithHref, RouterLinkActive, NgClass, NgForOf, NgIf, TitleCasePipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit {
  isLoggedIn: boolean = false;
  role: UserRole = null;
  showProfileDropdown = false;
  mobileMenuOpen = false;
  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private eRef = inject(ElementRef);
  userName: string | null = null;

  @Input() menus: { label: string; route: string }[] = [];

  adv =
    "We're hiring! Build the future with ProveIt.io — work on meaningful products, solve real problems, and grow with a passionate team.";

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.showProfileDropdown = false;
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth >= 768) {
      this.mobileMenuOpen = false;
    }
  }

  ngOnInit() {
    this.checkAuth();
    this.updateMenus();
  }

  private checkAuth() {
    this.isLoggedIn = this.hasCookie('auth_token');
    this.role = this.getCookie('user_role') as UserRole;
    
    this.authService.user$.pipe(take(1)).subscribe((user: any) => {
      if (user) {
        this.apiService.getUser(user.uid).subscribe((data: any) => {
           if (data) this.userName = data.fullName || data.name || user.displayName;
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
          { label: 'Pricing', route: '/pricing' },
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
          { label: 'Competitions', route: '/admin/competitions' }
        ];
      }
    } else {
      const defaultGuestMenus = [
        { label: 'Home', route: '/home' },
        { label: 'Competitions', route: '/user/compition' },
        { label: 'Pricing', route: '/pricing' },
        { label: 'About', route: '/about' },
        { label: 'Contact', route: '/contact' },
        { label: 'Support', route: '/support' },
      ];

      if (!this.menus || this.menus.length === 0) {
        this.menus = defaultGuestMenus;
      } else {
        // Ensure Pricing, Contact, and Support are always present for guests even if menus are passed via @Input
        const hasPricing = this.menus.some((m) => m.label === 'Pricing');
        const hasContact = this.menus.some((m) => m.label === 'Contact');
        const hasSupport = this.menus.some((m) => m.label === 'Support');

        if (!hasPricing) this.menus.push({ label: 'Pricing', route: '/pricing' });
        if (!hasContact) this.menus.push({ label: 'Contact', route: '/contact' });
        if (!hasSupport) this.menus.push({ label: 'Support', route: '/support' });
      }
    }
  }

  private hasCookie(name: string): boolean {
    return document.cookie.split('; ').some((row) => row.startsWith(name + '='));
  }

  private getCookie(name: string): string | null {
    const cookie = document.cookie.split('; ').find((row) => row.startsWith(name + '='));
    return cookie ? cookie.split('=')[1] : null;
  }

  getRoute(menu: { route: string }) {
    return menu.route.startsWith('/') ? menu.route : '/' + menu.route;
  }

  // ── Role Helpers ─────────────────────────────────────────────────────────
  isCandidate() {
    return this.isLoggedIn && this.role === 'candidate';
  }
  isCompany() {
    return this.isLoggedIn && this.role === 'company';
  }
  isAdmin() {
    return this.isLoggedIn && this.role === 'admin';
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

  logout() {
    this.authService.logOut();
    this.mobileMenuOpen = false;
  }

  // Demo login helpers (sets cookies so you can test without a backend)
  demoLogin(role: UserRole) {
    const maxAge = 60 * 60 * 8; // 8 hours
    document.cookie = `auth_token=demo_token; Max-Age=${maxAge}; path=/`;
    document.cookie = `user_role=${role}; Max-Age=${maxAge}; path=/`;
    this.isLoggedIn = true;
    this.role = role;
    this.updateMenus();
    window.location.href = this.getDashboardRoute();
  }

  toggleDropdown() {
    this.showProfileDropdown = !this.showProfileDropdown;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (this.mobileMenuOpen) {
      this.showProfileDropdown = false;
    }
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }
}
