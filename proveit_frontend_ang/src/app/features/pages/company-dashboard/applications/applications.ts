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
  statusFilters = ['all', 'submitted', 'under_evaluation', 'winner', 'interview_scheduled', 'not_selected', 'rejected'];
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
  savingEvaluationIds = new Set<string>();
  evaluationModalApplication: any = null;

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

              forkJoin({
                applications: this.api.getCompanyApplications(profile.id),
                competitions: this.api.getCompanyCompetitions(profile.id),
                projects: this.api.getCompanyProjects(profile.id),
              }).subscribe({
                next: (data) => {
                  const compMap = new Map();
                  data.competitions.forEach((c: any) => compMap.set(c.id, c.title || c.name));

                  const projectMap = new Map();
                  data.projects.forEach((project: any) => {
                    if (project.applicationId) {
                      projectMap.set(project.applicationId, project);
                    }
                  });

                  this.applications = data.applications.map((app: any) =>
                    this.decorateApplication(app, compMap, projectMap),
                  );
                  this.loading = false;
                  this.cdr.detectChanges();
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

  async saveEvaluation(a: any) {
    const score = Number(a.manualScoreInput);
    const notes = (a.evaluationNotesInput || '').trim();

    if (!Number.isFinite(score) || score < 0 || score > 100) {
      this.modalService.alert('Please enter a valid score between 0 and 100.', 'Invalid Score');
      return;
    }

    this.savingEvaluationIds.add(a.id);
    this.cdr.detectChanges();

    const nextStatus =
      a.status === 'submitted' || a.status === 'under_review' ? 'under_evaluation' : a.status;

    const updates = {
      score,
      status: nextStatus,
      evaluation: {
        manualScore: score,
        notes,
        evaluatedAt: new Date().toISOString(),
        evaluatedBy: this.userId,
      },
    };

    try {
      await firstValueFrom(this.api.updateApplication(a.id, updates));
      a.score = score;
      a.status = nextStatus;
      a.evaluation = updates.evaluation;
      a.evaluationNotesInput = notes;
      await this.recalculateCompetitionRanks(a.competitionId);
      if (this.evaluationModalApplication?.id === a.id) {
        this.closeEvaluationModal();
      }
    } catch (err: any) {
      console.error('Failed to save evaluation', err);
      await this.modalService.alert(
        err?.error?.error || 'Score could not be saved. Please try again.',
        'Save Failed',
        'error',
      );
    } finally {
      this.savingEvaluationIds.delete(a.id);
      this.cdr.detectChanges();
    }
  }

  openEvaluationModal(application: any) {
    this.evaluationModalApplication = application;
    this.cdr.detectChanges();
  }

  closeEvaluationModal() {
    this.evaluationModalApplication = null;
    this.cdr.detectChanges();
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

  hasScore(score: any): boolean {
    return typeof score === 'number' && Number.isFinite(score);
  }

  private decorateApplication(app: any, compMap: Map<any, any>, projectMap: Map<any, any>) {
    const project = projectMap.get(app.id);
    const manualScore = this.parseNumericValue(app.score ?? app.evaluation?.manualScore);
    const rank = this.parseNumericValue(app.rank);

    return {
      ...app,
      project,
      competitionTitle: compMap.get(app.competitionId) || app.competitionId,
      score: manualScore,
      rank,
      manualScoreInput: manualScore ?? '',
      evaluationNotesInput: app.evaluation?.notes || '',
    };
  }

  private parseNumericValue(value: any): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private getSortValue(application: any, key: string) {
    if (key === 'score' || key === 'rank') {
      return this.parseNumericValue(application[key]) ?? -1;
    }
    if (key === 'submittedAt') {
      return application.submittedAt ? new Date(application.submittedAt).getTime() : 0;
    }
    return application[key] ?? '';
  }

  private async recalculateCompetitionRanks(competitionId: string) {
    const sameCompetition = this.applications
      .filter((app) => app.competitionId === competitionId)
      .sort((a, b) => {
        const scoreDiff = (b.score ?? -1) - (a.score ?? -1);
        if (scoreDiff !== 0) return scoreDiff;
        const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : Number.MAX_SAFE_INTEGER;
        const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : Number.MAX_SAFE_INTEGER;
        return timeA - timeB;
      });

    const updates: Promise<any>[] = [];

    sameCompetition.forEach((app, index) => {
      const nextRank = this.hasScore(app.score) ? index + 1 : null;
      if (app.rank !== nextRank) {
        app.rank = nextRank;
        updates.push(firstValueFrom(this.api.updateApplication(app.id, { rank: nextRank })));
      }
    });

    if (updates.length) {
      await Promise.all(updates);
    }
  }
}
