import { Component, Input, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, Router, RouterLink } from '@angular/router';
import { NgFor, NgIf, SlicePipe, DatePipe } from '@angular/common';
import { Sidebar, SidebarBody, SidebarLink, Logo } from '../sidebar/sidebar';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { DummyDataService } from '../../../services/dummy-data.service';
import { LucideAngularModule } from 'lucide-angular';

import { take } from 'rxjs/operators';

export interface NavItem {
  label: string;
  route: string;
  icon: string;
  badge?: number;
  superAdminOnly?: boolean;
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NgFor, NgIf, SlicePipe, DatePipe, Sidebar, SidebarBody, SidebarLink, Logo, LucideAngularModule],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css',
})
export class DashboardLayout implements OnInit {
  @ViewChild(SidebarBody) sidebarBody!: SidebarBody;
  @Input() role: 'company' | 'admin' = 'company';
  @Input() navItems: NavItem[] = [];
  userName = 'Loading...';
  userInitials = '...';
  companyName = '';
  companyLogoUrl = '';
  userAvatarUrl = '';
  notifications: any[] = [];

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef,
    public dataService: DummyDataService,
  ) {}

  get unreadNotifsCount() {
    return this.notifications.filter((n) => n.status === 'unread' || !n.status).length;
  }

  sidebarOpen = true;
  notifOpen = false;
  profileOpen = false;

  ngOnInit() {
    // Collapse sidebar on small screens
    if (window.innerWidth < 768) {
      this.sidebarOpen = false;
    }

    this.fetchUserData();
    this.fetchNotifications();
  }

  fetchUserData() {
    this.authService.user$.pipe(take(1)).subscribe((user) => {
      if (user) {
        if (this.role === 'company') {
          this.apiService.getCompanyByOwnerId(user.uid).subscribe({
            next: (company: any) => {
              if (company) {
                this.companyName = company.companyName || company.name || 'Company';
                this.companyLogoUrl =
                  company.logoUrl || company.imageUrl || company.profileImage || '';
                this.userName =
                  company.ownerName || company.contactPerson || user.displayName || this.companyName;
                this.userInitials = this.getInitials(this.companyName);
                this.cdr.detectChanges();
                return;
              }
              this.loadUserFallback(user);
            },
            error: (err: any) => {
              console.error('Error fetching company data:', err);
              this.loadUserFallback(user);
            },
          });
          return;
        }

        this.loadUserFallback(user);
      }
    });
  }

  private loadUserFallback(user: any) {
    this.apiService.getUser(user.uid).subscribe({
      next: (data: any) => {
        if (data) {
          this.userName = data.fullName || data.name || user.displayName || 'User';
          this.userInitials = this.getInitials(this.userName);
          this.companyName = data.companyName || this.companyName;
          this.companyLogoUrl =
            data.logoUrl || data.imageUrl || data.profileImage || this.companyLogoUrl;
          this.userAvatarUrl = data.profileImage || data.imageUrl || '';
          this.cdr.detectChanges();
        }
      },
      error: (err: any) => {
        console.error('Error fetching user data:', err);
        this.userName = user.displayName || 'User';
        this.userInitials = this.getInitials(this.userName);
        this.cdr.detectChanges();
      },
    });
  }

  getSidebarTitle() {
    return this.role === 'company' ? this.companyName || 'Company' : this.userName || 'Admin';
  }

  getSidebarSubtitle() {
    return this.role === 'company' ? 'Company Dashboard' : 'Admin Dashboard';
  }

  getSidebarImage() {
    return '';
  }

  fetchNotifications() {
    if (this.role === 'admin') {
      this.apiService.getAdminNotifications().subscribe({
        next: (notifs: any[]) => {
          this.notifications = (notifs || []).map((n: any) => ({
            ...n,
            status: n.status || 'unread',
            createdAt: n.createdAt || n.timestamp
          }));
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.warn('Admin notifications API failed, falling back to logs.', err);
          // Fallback to logs if notifications endpoint doesn't exist yet
          this.apiService.getAdminLogs().subscribe((logs: any[]) => {
            this.notifications = (logs || []).slice(0, 10).map((log: any) => ({
              ...log,
              message: log.description || log.action,
              status: 'unread',
              createdAt: log.createdAt || log.timestamp
            }));
            this.cdr.detectChanges();
          });
        }
      });
    } else {
      this.authService.user$.pipe(take(1)).subscribe(user => {
        if (user) {
          this.apiService.getCompanyByOwnerId(user.uid).subscribe(company => {
            if (company && company.id) {
               this.apiService.getCompanyDashboard(company.id).subscribe(dash => {
                 if (dash && dash.recentApps) {
                   this.notifications = dash.recentApps.map((app: any) => ({
                     id: app.id,
                     message: `New application received for ${app.competitionTitle || 'a competition'}`,
                     createdAt: app.submittedAt,
                     status: 'unread'
                   }));
                 }
                 
                 // If no recent apps, use dummy as fallback to keep UI alive
                 if (this.notifications.length === 0) {
                   this.notifications = this.dataService.notifications;
                 }
               });
            } else {
              this.notifications = this.dataService.notifications;
            }
          });
        }
      });
    }
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleNotif() {
    this.notifOpen = !this.notifOpen;
    this.profileOpen = false;
  }

  toggleProfile() {
    this.profileOpen = !this.profileOpen;
    this.notifOpen = false;
  }

  getRoleBadge() {
    return this.role === 'admin' ? 'Admin' : 'Company';
  }

  getRoleColor() {
    return this.role === 'admin'
      ? 'bg-(--dd-blue-light)/30 text-(--dd-blue)'
      : 'bg-(--dd-orange)/20 text-(--dd-orange)';
  }

  getLucideIcon(biIcon: string): string {
    const mapping: Record<string, string> = {
      'bi-bar-chart-fill': 'layout-dashboard',
      'bi-people-fill': 'users',
      'bi-buildings': 'building-2',
      'bi-trophy-fill': 'trophy',
      'bi-file-earmark-person': 'user-cog',
      'bi-credit-card-fill': 'wallet',
      'bi-journal-text': 'layers',
      'bi-bell-fill': 'bell',
      'bi-cpu-fill': 'cpu',
      'bi-gear-fill': 'settings',
      'bi-shield-lock-fill': 'shield-check',
      'bi-chat-square-text-fill': 'search',
      'bi-star-fill': 'palette',
      'bi-house': 'house',
      'bi-grid-fill': 'layout-dashboard',
      'bi-person-badge-fill': 'user-cog',
      'bi-calendar-event': 'layers',
      'bi-award-fill': 'trophy',
      'bi-briefcase-fill': 'building-2',
    };
    return mapping[biIcon] || 'code';
  }

  logout() {
    this.authService.logOut();
  }
}
