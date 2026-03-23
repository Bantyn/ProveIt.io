import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { ModalService } from '../../../../services/modal.service';
import { NgFor, NgClass, NgIf, TitleCasePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { MorphLoading } from '../../../../features/components/ui/morph-loading/morph-loading';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-company-applications',
  standalone: true,
  imports: [NgFor, NgClass, NgIf, TitleCasePipe, DatePipe, FormsModule, MorphLoading, RouterLink],
  templateUrl: './applications.html',
  styleUrl: './applications.css',
})
export class CompanyApplications implements OnInit {
  private route = inject(ActivatedRoute);
  constructor(
    public api: ApiService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
    private modalService: ModalService,
  ) {}
  applications: any[] = [];
  filter = 'all';
  selected: any = null;
  statusFilters = ['all', 'submitted', 'under_evaluation', 'winner', 'interview_scheduled', 'not_selected'];
  userId = '';
  companyId = '';
  loading = false;
  searchTerm = '';
  sortKey = 'submittedAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  companyProfile: any = null;
  allPlans: any[] = [];
  currentPlanDetails: any = null;
  showUpgradeModal = false;

  ngOnInit() {
    this.auth.user$.pipe(take(1)).subscribe((user: any) => {
      if (user) {
        this.userId = user.uid;
        this.loading = true;

        // Check for search query param
        const searchParam = this.route.snapshot.queryParamMap.get('search');
        if (searchParam) {
          this.searchTerm = searchParam;
        }

        // Fetch Company profile AND Plans in parallel
        forkJoin({
          profile: this.api.getCompanyByOwnerId(user.uid),
          plans: this.api.getPlans()
        }).subscribe({
          next: ({ profile, plans }: { profile: any, plans: any[] }) => {
            this.companyProfile = profile;
            this.allPlans = plans || [];
            if (profile) {
              this.companyId = profile.id;
              const planName = (profile.plan || 'Starter').toUpperCase();
              this.currentPlanDetails = this.allPlans.find(p => p.name.toUpperCase() === planName);

              this.api.getCompanyApplications(profile.id).subscribe({
                next: (data) => {
                  this.api.getCompanyCompetitions(profile.id).subscribe({
                    next: (comps) => {
                      const compMap = new Map();
                      comps.forEach((c) => compMap.set(c.id, c.title || c.name));

                      this.applications = data.map((app: any) => ({
                        ...app,
                        competitionTitle: compMap.get(app.competitionId) || app.competitionId,
                        score: app.score || Math.floor(Math.random() * 41) + 60, // Simulated score for now
                        rank: app.rank || Math.floor(Math.random() * 50) + 1, // Simulated rank for now
                      }));
                      this.loading = false;
                      this.cdr.detectChanges();
                    },
                    error: () => {
                      this.applications = data.map((app: any) => ({
                        ...app,
                        score: app.score || '-',
                        rank: app.rank || '-',
                        competitionTitle: app.competitionId,
                      }));
                      this.loading = false;
                      this.cdr.detectChanges();
                    },
                  });
                },
                error: (err) => {
                  console.error(err);
                  this.loading = false;
                  this.cdr.detectChanges();
                },
              });
            } else {
              this.loading = false;
              this.cdr.detectChanges();
            }
          },
          error: (err) => {
            console.error('Error fetching profile/plans', err);
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  setFilter(f: string) {
    this.filter = f;
  }
  select(a: any) {
    this.selected = a;
  }
  close() {
    this.selected = null;
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
    let list = [...this.applications];

    if (this.filter !== 'all') {
      list = list.filter((a) => a.status === this.filter);
    }

    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      list = list.filter(
        (a) =>
          a.candidateName?.toLowerCase().includes(s) ||
          a.competitionTitle?.toLowerCase().includes(s) ||
          a.competitionId?.toLowerCase().includes(s),
      );
    }

    list.sort((a, b) => {
      let valA = a[this.sortKey];
      let valB = b[this.sortKey];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }

  updateStatus(a: any, newStatus: string) {
    // Check for shortlisting limit
    if (newStatus.toUpperCase() === 'SHORTLISTED') {
      const planLimits = this.currentPlanDetails?.features?.competitions;
      const maxShortlisted = planLimits?.maxShortlistedPerCompetition || 5;
      
      const currentShortlisted = this.applications.filter(app => 
        app.competitionId === a.competitionId && app.status.toUpperCase() === 'SHORTLISTED'
      ).length;

      if (currentShortlisted >= maxShortlisted) {
        this.showUpgradeModal = true;
        this.modalService.alert(`Limit reached: Your current plan allows only ${maxShortlisted} shortlisted candidates per competition.`, 'Upgrade Plan');
        return;
      }
    }

    this.api.updateApplication(a.id, { status: newStatus }).subscribe(() => {
      a.status = newStatus;
      this.cdr.detectChanges();
    });
  }

  async scheduleInterview(a: any) {
    // Check if interview enabled
    if (!this.currentPlanDetails?.features?.interviews?.enabled) {
      this.showUpgradeModal = true;
      this.modalService.alert('Interview scheduling is not available in your current plan. Please upgrade to GROWTH or ELITE.', 'Feature Locked');
      return;
    }

    if (!this.companyId) {
      await this.modalService.alert('Company information is missing.', 'Unable to Schedule', 'error');
      return;
    }

    const result = await this.modalService.scheduleInterview(
      'Schedule Interview',
      `Set the interview date and time for ${a.candidateName || 'this candidate'}.`,
    );

    if (!result) return;

    const interviewPayload = {
      applicationId: a.id,
      companyId: this.companyId,
      candidateId: a.userId,
      candidateName: a.candidateName,
      type: 'Final Interview',
      date: result.date,
      time: result.time,
      status: 'scheduled',
      decision: null,
    };

    try {
      const interview = await firstValueFrom(this.api.createInterview(interviewPayload));
      await firstValueFrom(
        this.api.updateApplication(a.id, {
          status: 'interview_scheduled',
          interviewId: interview.id,
          interviewDate: result.date,
          interviewTime: result.time,
        }),
      );

      a.status = 'interview_scheduled';
      a.interviewId = interview.id;
      a.interviewDate = result.date;
      a.interviewTime = result.time;
      this.cdr.detectChanges();
      await this.modalService.alert('Interview scheduled successfully.', 'Success', 'success');
    } catch (err) {
      console.error('Failed to schedule interview', err);
      await this.modalService.alert(
        'Interview could not be scheduled. Please try again.',
        'Error',
        'error',
      );
    }
  }

  filterByCompetition(title: string) {
    this.searchTerm = title;
    this.cdr.detectChanges();
  }
}
