import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { NgFor, NgClass, NgIf, TitleCasePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { Router } from '@angular/router';
import { ModalService } from '../../../../services/modal.service';
import { MorphLoading } from '../../../../features/components/ui/morph-loading/morph-loading';
import { forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-company-competitions',
  standalone: true,
  imports: [NgFor, NgClass, NgIf, TitleCasePipe, FormsModule, DatePipe, MorphLoading],
  templateUrl: './competitions.html',
  styleUrl: './competitions.css',
})
export class CompanyCompetitions implements OnInit {
  public router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  
  constructor(
    public api: ApiService,
    private auth: AuthService,
    private modalService: ModalService,
  ) {}

  competitions: any[] = [];
  filter = 'all';
  statusFilters = ['all', 'active', 'draft', 'completed', 'cancelled'];
  userId = '';
  companyProfile: any = null;
  loading = false;
  showUpgradeModal = false;
  searchTerm = '';
  sortKey = 'postedAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  allPlans: any[] = [];
  currentPlanDetails: any = null;

  ngOnInit() {
    this.auth.user$.pipe(take(1)).subscribe((user) => {
      if (user) {
        this.userId = user.uid;
        this.loading = true;

        // 1. Fetch Company profile AND Plans in parallel
        forkJoin({
          profile: this.api.getCompanyByOwnerId(this.userId),
          plans: this.api.getPlans()
        }).subscribe({
          next: ({ profile, plans }) => {
            this.companyProfile = profile;
            this.allPlans = plans || [];
            
            if (profile) {
              const planName = (profile.plan || 'Starter').toUpperCase();
              this.currentPlanDetails = this.allPlans.find(p => p.name.toUpperCase() === planName);
              
              if (profile.id) {
                // 2. Fetch competitions and applications
                forkJoin({
                  competitions: this.api.getCompanyCompetitions(profile.id),
                  applications: this.api.getCompanyApplications(profile.id),
                }).subscribe({
                  next: ({ competitions, applications }) => {
                    this.processData(competitions, applications);
                  },
                  error: (err) => {
                    console.error('Error fetching competitions/applications', err);
                    this.loading = false;
                    this.cdr.detectChanges();
                  }
                });
              } else {
                this.loading = false;
                this.cdr.detectChanges();
              }
            } else {
              this.loading = false;
              this.cdr.detectChanges();
            }
          },
          error: (err) => {
            console.error('Error fetching company profile/plans', err);
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  private processData(competitions: any[], applications: any[]) {
    const applicantCountByCompetition = new Map<string, number>();
    (applications || []).forEach((app: any) => {
      const competitionId = app.competitionId;
      if (!competitionId) return;
      applicantCountByCompetition.set(
        competitionId,
        (applicantCountByCompetition.get(competitionId) || 0) + 1,
      );
    });

    this.competitions = (competitions || []).map((c) => ({
      ...c,
      skills: c.requiredSkills || [],
      deadline: c.projectInfo?.deadline || c.deadline || null,
      deadlineDisplay: c.projectInfo?.deadline || c.deadline || null,
      status: c.status?.toLowerCase() || 'draft',
      applicants: applicantCountByCompetition.get(c.id) ?? 0,
    }));
    this.loading = false;
    this.cdr.detectChanges();
  }

  async updateStatus(comp: any, newStatus: string) {
    const isConfirmed = await this.modalService.confirm(
      `Are you sure you want to set this competition to ${newStatus}?`,
      'Confirm Status Change',
    );
    if (!isConfirmed) return;

    this.api.updateCompetition(comp.id, { status: newStatus.toUpperCase() }).subscribe({
      next: () => {
        comp.status = newStatus;
      },
      error: (err) => this.modalService.alert('Error updating status: ' + err.message, 'Error'),
    });
  }

  edit(comp: any) {
    this.router.navigate(['/company/dashboard/competitions/edit', comp.id]);
  }

  setFilter(f: string) {
    this.filter = f;
  }

  toggleSort(key: string) {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }
  }

  get filtered() {
    let list = [...this.competitions];
    if (this.filter !== 'all') {
      list = list.filter((c) => c.status === this.filter);
    }
    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.title?.toLowerCase().includes(s) ||
          c.skills?.some((sk: string) => sk.toLowerCase().includes(s)),
      );
    }
    list.sort((a, b) => {
      let valA = this.getSortValue(a, this.sortKey);
      let valB = this.getSortValue(b, this.sortKey);
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }

  viewApplications(comp: any) {
    if (comp.applicants > 0) {
      this.router.navigate(['/company/dashboard/applications'], { 
        queryParams: { search: comp.title || comp.id } 
      });
    }
  }

  create() {
    if (!this.userId) {
      this.modalService.alert('Please Login first', 'Login Required');
      return;
    }

    if (this.companyProfile && !this.companyProfile.isProfileCompleted) {
      this.modalService.alert(
        'Action Required: Please complete your company profile in settings before creating competitions.',
        'Profile Incomplete',
      );
      this.router.navigate(['/company/dashboard/settings']);
      return;
    }

    // Dynamic Plan Limitation Check (Monthly Limit)
    const planLimits = this.currentPlanDetails?.features?.competitions;
    const maxAllowed = planLimits?.maxCompetitionsPerMonth || 1;
    
    if (maxAllowed < 999999) {
      // Count competitions created in the current calendar month
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const currentMonthCount = this.competitions.filter(c => {
        if (!c.postedAt) return false;
        const postedDate = new Date(c.postedAt);
        return postedDate.getMonth() === currentMonth && postedDate.getFullYear() === currentYear;
      }).length;

      if (currentMonthCount >= maxAllowed) {
        this.showUpgradeModal = true;
        this.modalService.alert(`Monthly limit reached: Your current plan allows ${maxAllowed} competitions per month.`, 'Upgrade Plan');
        return;
      }
    }

    this.router.navigate(['/company/dashboard/competitions/create']);
  }

  private getSortValue(competition: any, key: string) {
    if (key === 'deadline' || key === 'postedAt') {
      return competition[key] ? new Date(competition[key]).getTime() : 0;
    }

    return competition[key] ?? '';
  }
}
