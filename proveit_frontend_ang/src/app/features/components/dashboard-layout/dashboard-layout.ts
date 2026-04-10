import { Component, Input, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, Router, RouterLink } from '@angular/router';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { Sidebar, SidebarBody, SidebarLink, Logo } from '../sidebar/sidebar';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { DummyDataService } from '../../../services/dummy-data.service';
import { LucideAngularModule } from 'lucide-angular';
import { FormsModule } from '@angular/forms';

import { take } from 'rxjs/operators';

export interface NavItem {
  label: string;
  route: string;
  icon: string;
  badge?: number;
  superAdminOnly?: boolean;
  requiredFeatureKey?: string;
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NgFor, NgIf, DatePipe, Sidebar, SidebarBody, SidebarLink, Logo, LucideAngularModule, FormsModule],
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
  userId = '';
  notifications: any[] = [];
  currentPlanFeatures: any = null;
  pendingAppCount = 0;
  searchQuery: string = '';
  searchResults: any[] = [];
  isSearching: boolean = false;
  isVerified: boolean = false;

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef,
    public dataService: DummyDataService,
    private router: Router
  ) {}

  get unreadNotifsCount() {
    return this.notifications.filter((n) => n.status === 'unread' || !n.status).length;
  }

  get previewNotifications() {
    return this.notifications.slice(0, 5);
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
        this.userId = user.uid;
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
                this.isVerified = company.verificationStatus === 'verified' || company.status === 'verified' || company.verificationStatus === 'approved';
                this.loadCompanyPlanFeatures(company.plan || 'Starter');
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

  get visibleNavItems() {
    return this.navItems.filter((item) => this.isNavItemVisible(item));
  }

  fetchNotifications() {
    if (this.role === 'admin') {
      this.apiService.getAdminNotifications().subscribe({
        next: (notifs: any[]) => {
          this.notifications = this.normalizeNotifications(notifs || []);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.warn('Admin notifications API failed, falling back to logs.', err);
          this.apiService.getAdminLogs().subscribe((logs: any[]) => {
            this.notifications = this.normalizeNotifications(
              (logs || []).slice(0, 10).map((log: any) => ({
                ...log,
                title: log.action || 'Admin Update',
                message: log.description || log.action,
                status: 'unread',
                createdAt: log.createdAt || log.timestamp,
              })),
            );
            this.cdr.detectChanges();
          });
        }
      });
    } else {
      this.authService.user$.pipe(take(1)).subscribe(user => {
        if (user) {
          this.apiService.getCompanyByOwnerId(user.uid).subscribe({
            next: (company) => {
            if (company && company.id) {
               this.apiService.getCompanyDashboard(company.id).subscribe({
                 next: (dash) => {
                   // Compute pending application badge from real data
                   const pendingApps = (dash?.recentApps || []).filter(
                     (a: any) => a.status === 'pending' || a.status === 'under_review'
                   );
                   this.pendingAppCount = pendingApps.length;
                   // Update the Applications nav item badge dynamically
                   const appNav = this.navItems.find(n => n.label === 'Applications');
                   if (appNav) {
                     appNav.badge = this.pendingAppCount > 0 ? this.pendingAppCount : undefined;
                   }

                   if (dash?.recentApps?.length) {
                     this.notifications = this.normalizeNotifications(
                      dash.recentApps.slice(0, 5).map((app: any) => ({
                        id: app.id,
                        title: 'New Application',
                        message: `New application received for ${app.competitionTitle || 'a competition'}`,
                        createdAt: app.submittedAt,
                        status: 'unread',
                        type: 'info',
                      })),
                     );
                   } else {
                     this.notifications = [];
                   }
                   this.cdr.detectChanges();
                 },
                 error: () => {
                   this.notifications = [];
                   this.cdr.detectChanges();
                 }
               });
            } else {
              this.notifications = [];
              this.cdr.detectChanges();
            }
          },
          error: () => {
            this.notifications = [];
            this.cdr.detectChanges();
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
    if (this.notifOpen) {
      this.fetchNotifications();
    }
  }

  clearNotifications() {
    if (!this.userId) return;
    this.apiService.clearUserNotifications(this.userId).subscribe({
      next: () => {
        this.notifications = [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error clearing notifications:', err);
        // Fallback: Clear locally if API fails
        this.notifications = [];
        this.cdr.detectChanges();
      }
    });
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
      'bi-folder': 'folder',
      'bi-calendar': 'calendar',
      'bi-diagram-3-fill': 'git-branch',
    };
    return mapping[biIcon] || 'code';
  }

  logout() {
    this.authService.logOut();
  }

  private loadCompanyPlanFeatures(planName: string) {
    this.apiService.getPlans().subscribe({
      next: (plans: any[]) => {
        const activePlan = (plans || []).find(
          (plan: any) => plan.name?.toUpperCase() === String(planName || 'Starter').toUpperCase(),
        );
        this.currentPlanFeatures = activePlan?.features || null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching plan features for dashboard nav:', err);
        this.currentPlanFeatures = null;
        this.cdr.detectChanges();
      },
    });
  }

  private isNavItemVisible(item: NavItem): boolean {
    if (!item.requiredFeatureKey || this.role !== 'company') {
      return true;
    }

    return !!this.getFeatureValue(item.requiredFeatureKey);
  }

  private getFeatureValue(path: string): any {
    const segments = path.split('.');
    let value = this.currentPlanFeatures;

    for (const segment of segments) {
      value = value?.[segment];
    }

    return value;
  }

  private normalizeNotifications(items: any[]): any[] {
    return (items || [])
      .map((item: any, index: number) => ({
        ...item,
        id: item.id || `notif-${index}`,
        title: item.title || item.type || 'Notification',
        message: item.message || item.description || item.action || 'You have a new update.',
        status: item.status || 'unread',
        createdAt: item.createdAt || item.timestamp || new Date().toISOString(),
      }))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  onSearch(query: string) {
    this.searchQuery = query;
    if (!query || query.length < 2) {
      this.searchResults = [];
      this.isSearching = false;
      return;
    }

    this.isSearching = true;
    
    // Admin Global Search
    if (this.role === 'admin') {
      this.apiService.getUsers().subscribe(users => {
        const userRes = (users || []).filter(u => 
          (u.fullName || u.name || '').toLowerCase().includes(query.toLowerCase()) || 
          (u.email || '').toLowerCase().includes(query.toLowerCase())
        ).map(u => ({ id: u.id || u.uid, title: u.fullName || u.name || 'User', sub: u.email, type: 'User', icon: 'user', route: '/admin/users' }));

        this.apiService.getCompanies().subscribe(companies => {
          const compRes = (companies || []).filter(c => 
            (c.companyName || c.name || '').toLowerCase().includes(query.toLowerCase())
          ).map(c => ({ id: c.id, title: c.companyName || c.name, sub: 'Company', type: 'Company', icon: 'building', route: '/admin/companies' }));

          this.apiService.getCompetitions().subscribe(competitions => {
            const competitionRes = (competitions || []).filter(c => 
              (c.title || '').toLowerCase().includes(query.toLowerCase())
            ).map(c => ({ id: c.id, title: c.title, sub: 'Competition', type: 'Competition', icon: 'trophy', route: '/admin/competitions' }));

            this.searchResults = [...userRes, ...compRes, ...competitionRes].slice(0, 10);
            this.isSearching = false;
            this.cdr.detectChanges();
          });
        });
      });
    } 
    // Company Global Search
    else {
      this.authService.user$.pipe(take(1)).subscribe(user => {
        if (!user) return;
        this.apiService.getCompanyByOwnerId(user.uid).subscribe(company => {
          if (!company || !company.id) return;
          this.apiService.getCompanyCompetitions(company.id).subscribe(comps => {
            const compRes = (comps || []).filter(c => 
              (c.title || '').toLowerCase().includes(query.toLowerCase())
            ).map(c => ({ id: c.id, title: c.title, sub: `Status: ${c.status || 'Active'}`, type: 'Competition', icon: 'trophy', route: '/company/dashboard/competitions' }));

            this.apiService.getCompanyApplications(company.id).subscribe(apps => {
              const appRes = (apps || []).filter(a => 
                (a.candidateName || '').toLowerCase().includes(query.toLowerCase()) ||
                (a.competitionTitle || '').toLowerCase().includes(query.toLowerCase())
              ).map(a => ({ id: a.id, title: a.candidateName || 'Candidate', sub: a.competitionTitle || 'Application', type: 'Application', icon: 'users', route: '/company/dashboard/applications' }));

              this.searchResults = [...compRes, ...appRes].slice(0, 10);
              this.isSearching = false;
              this.cdr.detectChanges();
            });
          });
        });
      });
    }
  }

  navigateToResult(item: any) {
    this.searchQuery = '';
    this.searchResults = [];
    this.isSearching = false;
    this.router.navigate([item.route], { queryParams: { id: item.id, search: item.title } });
  }
}
