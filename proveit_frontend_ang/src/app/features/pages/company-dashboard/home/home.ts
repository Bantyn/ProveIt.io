import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { AuthService } from '../../../../services/auth.service';
import { NgFor, NgClass, NgIf } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { StatsCard } from '../../../../features/components/ui/stats-card/stats-card';
import { AreaChart } from '../../../../features/components/ui/area-chart/area-chart';

import { take } from 'rxjs/operators';

@Component({
  selector: 'app-company-home',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, RouterLink, StatsCard, AreaChart],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class CompanyHome implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  stats: any[] = [];
  recentComps: any[] = [];
  recentApps: any[] = [];
  companyName: string = 'Company';
  companyProfile: any = null;
  isLoading: boolean = true;

  // Chart state
  chartLabels: string[] = [];
  applicationData: number[] = [];
  shortlistedData: number[] = [];

  planName = '';
  planPrice = 0;
  planLimit: any = '';
  subEndDate = '';

  ngOnInit() {
    this.isLoading = true;
    this.auth.user$.pipe(take(1)).subscribe((user: any) => {
      if (user) {
        this.api.getCompanyByOwnerId(user.uid).subscribe((company) => {
          if (company) {
            this.companyProfile = company;
            this.companyName = company.companyName || 'Company';
            this.planName = company.plan || 'Free';
            this.planLimit = company.plan === 'Pro' ? 20 : company.plan === 'Plus' ? 5 : 1;
            this.planPrice = company.plan === 'Pro' ? 12999 : company.plan === 'Plus' ? 4999 : 0;
            this.subEndDate = company.updatedAt
              ? new Date(new Date(company.updatedAt).setFullYear(new Date(company.updatedAt).getFullYear() + 1)).toLocaleDateString()
              : 'N/A';

            this.cdr.detectChanges();

            this.api.getCompanyDashboard(company.id).subscribe({
              next: (data) => {
                if (data.stats) this.stats = data.stats;
                
                // Robust Analytics Mapping
                if (data.analytics) {
                  this.chartLabels = data.analytics.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                  this.applicationData = data.analytics.applicationData || data.analytics.dailyApplications || [];
                  this.shortlistedData = data.analytics.shortlistedData || data.analytics.dailyShortlisted || [];
                  
                  if (this.chartLabels.length <= 1) {
                    this.chartLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                  }
                } else {
                  // Final fallback to show zero state
                  this.chartLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                  this.applicationData = [0, 0, 0, 0, 0, 0, 0];
                  this.shortlistedData = [0, 0, 0, 0, 0, 0, 0];
                }

                if (data.recentComps) {
                  this.recentComps = data.recentComps.map((c: any) => ({
                    ...c,
                    applicants: c.applicants !== undefined ? c.applicants : 
                                 c.applicantCount !== undefined ? c.applicantCount : 
                                 c.applicantsCount !== undefined ? c.applicantsCount :
                                 c.applicationsCount !== undefined ? c.applicationsCount : 0,
                    deadline: c.deadline || c.projectInfo?.deadline || null,
                  }));
                }
                if (data.recentApps) {
                  this.recentApps = data.recentApps.map((a: any) => ({
                    ...a,
                    candidateName: a.candidateName || a.user?.fullName || a.user?.name || a.email || 'Candidate',
                    score: a.score !== undefined ? a.score : (a.result?.score || 0),
                    rank: a.rank || a.position || '-',
                    status: a.status || 'pending',
                    submittedAt: a.submittedAt || a.createdAt || null,
                    competitionTitle: a.competitionTitle || a.competitionName || a.competitionId || 'Competition',
                  }));
                }
                this.isLoading = false;
                this.cdr.detectChanges();
              },
              error: (err) => {
                console.error('Error fetching dashboard data', err);
                this.isLoading = false;
                this.cdr.detectChanges();
              },
            });
          } else {
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        });
      } else {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewApplications(comp: any) {
    if (comp.applicants > 0) {
      this.router.navigate(['/company/dashboard/applications'], { 
        queryParams: { search: comp.title || comp.id } 
      });
    }
  }

  formatStatus(status: string | undefined | null): string {
    if (!status) return 'Unknown';
    return status
      .toString()
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  formatDate(dateValue: string | null | undefined): string {
    if (!dateValue) return 'No deadline';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return String(dateValue);
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatSubmittedAt(dateValue: string | null | undefined): string {
    if (!dateValue) return '—';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  getScoreClass(score: number | string): string {
    const value = Number(score);
    if (Number.isNaN(value)) return 'bg-slate-100 text-slate-600';
    if (value >= 90) return 'bg-green-50 text-green-600';
    if (value >= 80) return 'bg-amber-50 text-amber-600';
    return 'bg-rose-50 text-rose-600';
  }

  getStatusClass(status: string | undefined | null): string {
    const value = (status || '').toLowerCase();
    if (['active', 'shortlisted', 'accepted', 'winner', 'interview_scheduled'].includes(value)) {
      return 'bg-green-50 text-green-600';
    }
    if (['under_review', 'submitted', 'pending'].includes(value)) {
      return 'bg-amber-100 text-amber-600';
    }
    if (['rejected', 'not_selected', 'cancelled'].includes(value)) {
      return 'bg-rose-50 text-rose-600';
    }
    return 'bg-slate-100 text-slate-600';
  }
}
