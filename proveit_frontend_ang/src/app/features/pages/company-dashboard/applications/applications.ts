import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { ModalService } from '../../../../services/modal.service';
import { NgFor, NgClass, NgIf, TitleCasePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { MorphLoading } from '../../../../features/components/ui/morph-loading/morph-loading';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  private router = inject(Router);
  constructor(
    public api: ApiService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
    private modalService: ModalService,
  ) {}
  applications: any[] = [];
  competitions: any[] = [];
  selectedCompetition: any = null;
  filter = 'all';
  selected: any = null;
  statusFilters = ['all', 'pending', 'submitted', 'under_evaluation', 'selected', 'winner', 'interview_scheduled', 'not_selected', 'rejected'];
  userId = '';
  companyId = '';
  loading = false;
  searchTerm = '';
  competitionSearchTerm = '';
  sortKey = 'submittedAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  companyProfile: any = null;
  allPlans: any[] = [];
  currentPlanDetails: any = null;
  showUpgradeModal = false;
  savingEvaluationIds = new Set<string>();
  evaluationModalApplication: any = null;
  fullReviewApplication: any = null;
  pendingStatusAfterScore: string | null = null;
  showLeaderboard = false;

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

                  // Enrich applications with profile images
                  this.applications.forEach((app: any) => {
                    if (!app.profileImage && app.userId) {
                      this.api.getUser(app.userId).subscribe({
                        next: (user: any) => {
                          app.profileImage = user?.profileImage || user?.profile?.profileImage || user?.candidateProfile?.profileImage || '';
                          this.cdr.detectChanges();
                        },
                        error: () => {} // Silently skip — initials fallback
                      });
                    }
                  });

                  // Build competition cards with counts
                  this.competitions = (data.competitions || []).map((c: any) => {
                    const appCount = this.applications.filter((a: any) => a.competitionId === c.id).length;
                    return { ...c, applicationCount: appCount };
                  }).sort((a: any, b: any) => {
                    const dateA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
                    const dateB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
                    return dateB - dateA;
                  });

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

  // ── Competition card helpers ──
  selectCompetition(competition: any) {
    this.selectedCompetition = competition;
    this.filter = 'all';
    this.searchTerm = '';
  }

  backToCompetitions() {
    this.selectedCompetition = null;
    this.showLeaderboard = false;
    this.filter = 'all';
    this.searchTerm = '';
  }

  get filteredCompetitions() {
    if (!this.competitionSearchTerm) return this.competitions;
    const s = this.competitionSearchTerm.toLowerCase();
    return this.competitions.filter((c: any) =>
      (c.title || c.name || '').toLowerCase().includes(s)
    );
  }

  getCompetitionStatus(c: any): string {
    if (c.status) return c.status;
    if (c.endDate) {
      return new Date(c.endDate) < new Date() ? 'closed' : 'active';
    }
    return 'active';
  }

  get filtered() {
    let list = [...this.applications];

    // Scope by selected competition
    if (this.selectedCompetition) {
      list = list.filter((a) => a.competitionId === this.selectedCompetition.id);
    }

    if (this.filter === 'pending') {
      list = list.filter((a) => !this.hasScore(a.score));
    } else if (this.filter !== 'all') {
      list = list.filter((a) => a.status === this.filter);
    }

    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      list = list.filter(
        (a) =>
          (a.candidateName || '').toLowerCase().includes(s) ||
          (a.competitionTitle || '').toLowerCase().includes(s) ||
          (a.competitionId || '').toLowerCase().includes(s),
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
        // Apply pending status if set (e.g. select/reject after scoring)
        if (this.pendingStatusAfterScore) {
          const pendingStatus = this.pendingStatusAfterScore;
          this.pendingStatusAfterScore = null;
          try {
            await firstValueFrom(this.api.updateApplication(a.id, { status: pendingStatus }));
            a.status = pendingStatus;
            // Update the applications array in-place
            const idx = this.applications.findIndex((app: any) => app.id === a.id);
            if (idx !== -1) {
              this.applications[idx].status = pendingStatus;
            }
            if (this.fullReviewApplication?.id === a.id) {
              this.fullReviewApplication = { ...this.fullReviewApplication, status: pendingStatus, score: a.score, rank: a.rank };
            }
          } catch (statusErr) {
            console.error('Failed to apply pending status', statusErr);
          }
        } else {
          // No pending status, just update the review page with new score
          if (this.fullReviewApplication?.id === a.id) {
            this.fullReviewApplication = { ...this.fullReviewApplication, score: a.score, rank: a.rank };
          }
        }
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
    this.pendingStatusAfterScore = null;
    this.cdr.detectChanges();
  }

  openFullReview(application: any) {
    this.fullReviewApplication = application;
    this.cdr.detectChanges();
  }

  closeFullReview() {
    this.fullReviewApplication = null;
    this.cdr.detectChanges();
  }

  quickAction(application: any, newStatus: string) {
    // If selecting or rejecting and no score assigned, open evaluation first
    if ((newStatus === 'selected' || newStatus === 'rejected') && !this.hasScore(application.score)) {
      this.pendingStatusAfterScore = newStatus;
      this.openEvaluationModal(application);
      return;
    }

    this.api.updateApplication(application.id, { status: newStatus }).subscribe({
      next: () => {
        application.status = newStatus;
        // Update the applications array in-place
        const idx = this.applications.findIndex((a: any) => a.id === application.id);
        if (idx !== -1) {
          this.applications[idx].status = newStatus;
        }
        // Also update fullReviewApplication if it's the same
        if (this.fullReviewApplication?.id === application.id) {
          this.fullReviewApplication = { ...this.fullReviewApplication, status: newStatus };
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to update status', err);
        this.cdr.detectChanges();
      },
    });
  }

  navigateToPipeline() {
    const competitionId = this.fullReviewApplication?.competitionId;
    this.router.navigate(['/company/dashboard/pipeline'], {
      queryParams: competitionId ? { competition: competitionId } : {},
    });
  }

  navigateToPipelineFor(application: any) {
    const competitionId = application?.competitionId;
    this.router.navigate(['/company/dashboard/pipeline'], {
      queryParams: competitionId ? { competition: competitionId } : {},
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
      competitionId: a.competitionId || '',
      competitionTitle: a.competitionTitle || '',
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

  get leaderboardData(): any[] {
    if (!this.selectedCompetition) return [];
    return this.applications
      .filter((a: any) => a.competitionId === this.selectedCompetition.id && this.hasScore(a.score))
      .sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0))
      .map((a: any, idx: number) => ({ ...a, leaderboardRank: idx + 1 }));
  }

  openLeaderboardFor(competition: any) {
    this.selectCompetition(competition);
    this.showLeaderboard = true;
  }

  async completeReviewPeriod() {
    if (!this.selectedCompetition) return;

    const competitionApps = this.applications.filter(
      (a: any) => a.competitionId === this.selectedCompetition.id
    );

    if (competitionApps.length === 0) {
      await this.modalService.alert('No applications found for this competition.', 'No Data', 'error');
      return;
    }

    // Check for unscored applications
    const unscored = competitionApps.filter((a: any) => !this.hasScore(a.score));
    // Check for unreviewed (not selected/rejected/winner/not_selected)
    const unreviewedStatuses = ['submitted', 'under_review', 'under_evaluation', 'applied'];
    const unreviewed = competitionApps.filter((a: any) => unreviewedStatuses.includes(a.status));

    // Combine issues
    const issues = [...new Set([...unscored, ...unreviewed])];

    if (issues.length > 0) {
      const names = issues.map((a: any) => `• ${a.candidateName || 'Unknown'} (Score: ${this.hasScore(a.score) ? a.score : 'Not given'}, Status: ${a.status})`).join('\n');

      const confirmed = await this.modalService.confirm(
        `The following ${issues.length} application(s) are not fully reviewed:\n\n${names}\n\nDo you want to ignore them and complete the review?`,
        'Incomplete Reviews',
      );

      if (!confirmed) return;
    }

    // Find the highest scored application
    const scoredApps = competitionApps.filter((a: any) => this.hasScore(a.score));

    if (scoredApps.length === 0) {
      await this.modalService.alert('No applications have been scored yet. Please score at least one application before completing the review.', 'No Scores', 'error');
      return;
    }

    scoredApps.sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));
    const winner = scoredApps[0];

    const updates: Promise<any>[] = [];

    for (const app of competitionApps) {
      let newStatus: string;
      if (app.id === winner.id) {
        newStatus = 'selected';
      } else if (app.status === 'selected' || app.status === 'interview_scheduled') {
        // Don't demote already-progressed applications
        continue;
      } else {
        newStatus = 'not_selected';
      }

      if (app.status !== newStatus) {
        updates.push(
          firstValueFrom(this.api.updateApplication(app.id, { status: newStatus })).then(() => {
            app.status = newStatus;
            const idx = this.applications.findIndex((a: any) => a.id === app.id);
            if (idx !== -1) this.applications[idx].status = newStatus;
          })
        );
      }
    }

    try {
      await Promise.all(updates);
      this.cdr.detectChanges();
      await this.modalService.alert(
        `Review complete! ${winner.candidateName || 'Top scorer'} declared as winner with a score of ${winner.score}/100.`,
        'Winner Declared',
        'success',
      );
    } catch (err) {
      console.error('Failed to complete review', err);
      await this.modalService.alert('Something went wrong while completing the review.', 'Error', 'error');
    }
  }

  getInitials(name: string): string {
    if (!name) return 'C';
    return name.split(' ').filter(Boolean).slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('') || 'C';
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
