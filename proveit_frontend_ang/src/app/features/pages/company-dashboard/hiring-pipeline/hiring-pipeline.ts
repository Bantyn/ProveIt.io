import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../services/auth.service';
import { ApiService } from '../../../../services/api.service';
import { MorphLoading } from '../../../../features/components/ui/morph-loading/morph-loading';
import { ModalService } from '../../../../services/modal.service';
import { firstValueFrom, forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface PipelineColumn {
  id: string;
  title: string;
  subtitle: string;
  accentClass: string;
  headerClass: string;
}

@Component({
  selector: 'app-hiring-pipeline',
  standalone: true,
  imports: [CommonModule, MorphLoading, RouterLink, FormsModule],
  templateUrl: './hiring-pipeline.html',
  styleUrl: './hiring-pipeline.css',
})
export class HiringPipeline implements OnInit {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
  private modalService = inject(ModalService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = false;
  draggedApplicationId: string | null = null;
  updatingApplicationId: string | null = null;
  selectedApplication: any | null = null;
  applications: any[] = [];
  competitions: any[] = [];
  selectedCompetition: any = null;
  competitionSearchTerm = '';
  companyProfile: any = null;
  currentPlanDetails: any = null;
  featureLocked = false;

  readonly columns: PipelineColumn[] = [
    {
      id: 'shortlisted',
      title: 'Shortlisted',
      subtitle: 'Candidates moved to the next round',
      accentClass: 'border-emerald-200 bg-emerald-50/70',
      headerClass: 'text-emerald-700',
    },
    {
      id: 'interview_scheduled',
      title: 'Interview Scheduled',
      subtitle: 'Candidates moved to interview stage',
      accentClass: 'border-cyan-200 bg-cyan-50/70',
      headerClass: 'text-cyan-700',
    },
    {
      id: 'hired',
      title: 'Hired',
      subtitle: 'Candidates who passed the interview',
      accentClass: 'border-violet-200 bg-violet-50/70',
      headerClass: 'text-violet-700',
    },
    {
      id: 'rejected',
      title: 'Rejected',
      subtitle: 'Candidates not moving forward',
      accentClass: 'border-rose-200 bg-rose-50/80',
      headerClass: 'text-rose-700',
    },
  ];

  ngOnInit() {
    this.auth.user$.pipe(take(1)).subscribe((user) => {
      if (!user) return;

      this.loading = true;
      forkJoin({
        company: this.api.getCompanyByOwnerId(user.uid),
        plans: this.api.getPlans(),
      }).subscribe({
        next: ({ company, plans }) => {
          if (!company?.id) {
            this.loading = false;
            this.cdr.detectChanges();
            return;
          }

          this.companyProfile = company;
          const planName = (company.plan || 'Starter').toUpperCase();
          this.currentPlanDetails = (plans || []).find((plan: any) => plan.name?.toUpperCase() === planName) || null;
          this.featureLocked = !this.currentPlanDetails?.features?.pipeline?.enabled;

          if (this.featureLocked) {
            this.loading = false;
            this.cdr.detectChanges();
            return;
          }

          forkJoin({
            applications: this.api.getCompanyApplications(company.id),
            competitions: this.api.getCompanyCompetitions(company.id),
          }).subscribe({
            next: ({ applications, competitions }) => {
              const competitionMap = new Map(
                (competitions || []).map((competition: any) => [
                  competition.id,
                  competition.title || competition.name || 'Competition',
                ]),
              );

              this.applications = (applications || [])
                .map((application: any) => {
                  const resolvedName = application.candidateName || 'Candidate';
                  const candidateEmail = application.candidateEmail || '';

                  return {
                    ...application,
                    candidateName: resolvedName,
                    candidateEmail,
                    competitionTitle:
                      competitionMap.get(application.competitionId) || application.competitionId || 'Competition',
                    score: Number.isFinite(Number(application.score)) ? Number(application.score) : null,
                    rank: Number.isFinite(Number(application.rank)) ? Number(application.rank) : null,
                  };
                });

              // Enrich with profile images from user profiles
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
              this.competitions = (competitions || []).map((c: any) => {
                const appCount = this.applications.filter((a: any) => a.competitionId === c.id).length;
                return { ...c, applicationCount: appCount };
              }).sort((a: any, b: any) => {
                const dateA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
                const dateB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
                return dateB - dateA;
              });

              this.loading = false;
              this.cdr.detectChanges();

              // Auto-select competition from query param
              const competitionParam = this.route.snapshot.queryParamMap.get('competition');
              if (competitionParam) {
                const match = this.competitions.find((c: any) => c.id === competitionParam);
                if (match) {
                  this.selectCompetition(match);
                }
              }
            },
            error: (error) => {
              console.error('Failed to load hiring pipeline data', error);
              this.loading = false;
              this.cdr.detectChanges();
            },
          });
        },
        error: (error) => {
          console.error('Failed to load company or plans for pipeline', error);
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
    });
  }

  // ── Competition card helpers ──
  selectCompetition(competition: any) {
    this.selectedCompetition = competition;
  }

  backToCompetitions() {
    this.selectedCompetition = null;
  }

  navigateToInterviews() {
    const competitionId = this.selectedCompetition?.id;
    this.router.navigate(['/company/dashboard/interviews'], {
      queryParams: competitionId ? { competition: competitionId } : {},
    });
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

  getApplicationsForColumn(status: string) {
    return this.applications
      .filter((application) => {
        const matchesStatus = !application.isArchived && application.status === status;
        if (!this.selectedCompetition) return matchesStatus;
        return matchesStatus && application.competitionId === this.selectedCompetition.id;
      })
      .sort((a, b) => {
        const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
        const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
        if (rankA !== rankB) return rankA - rankB;

        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return dateB - dateA;
      });
  }

  get archivedApplications() {
    return this.applications
      .filter((application) => {
        if (!application.isArchived) return false;
        if (!this.selectedCompetition) return true;
        return application.competitionId === this.selectedCompetition.id;
      })
      .sort((a, b) => {
        const archivedA = a.archivedAt ? new Date(a.archivedAt).getTime() : 0;
        const archivedB = b.archivedAt ? new Date(b.archivedAt).getTime() : 0;
        return archivedB - archivedA;
      });
  }

  onDragStart(applicationId: string) {
    this.draggedApplicationId = applicationId;
  }

  onDragEnd() {
    this.draggedApplicationId = null;
  }

  allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent, nextStatus: string) {
    event.preventDefault();

    if (!this.draggedApplicationId) return;

    const application = this.applications.find((item) => item.id === this.draggedApplicationId);
    if (!application || application.status === nextStatus) {
      this.draggedApplicationId = null;
      return;
    }

    // If dropping into interview_scheduled, open the scheduling modal
    if (nextStatus === 'interview_scheduled') {
      this.draggedApplicationId = null;
      this.scheduleInterview(application);
      return;
    }

    this.updatingApplicationId = application.id;
    this.api.updateApplication(application.id, { status: nextStatus }).subscribe({
      next: () => {
        application.status = nextStatus;
        this.draggedApplicationId = null;
        this.updatingApplicationId = null;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to move application in pipeline', error);
        this.draggedApplicationId = null;
        this.updatingApplicationId = null;
        this.cdr.detectChanges();
      },
    });
  }

  archiveApplication(application: any) {
    if (!application || this.updatingApplicationId) return;

    this.updatingApplicationId = application.id;
    const archivePayload = {
      isArchived: true,
      archivedAt: new Date().toISOString(),
    };

    this.api.updateApplication(application.id, archivePayload).subscribe({
      next: () => {
        application.isArchived = true;
        application.archivedAt = archivePayload.archivedAt;
        this.updatingApplicationId = null;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to archive application', error);
        this.updatingApplicationId = null;
        this.cdr.detectChanges();
      },
    });
  }

  unarchiveApplication(application: any) {
    if (!application || this.updatingApplicationId) return;

    this.updatingApplicationId = application.id;
    this.api.updateApplication(application.id, {
      isArchived: false,
      archivedAt: null,
    }).subscribe({
      next: () => {
        application.isArchived = false;
        application.archivedAt = null;
        if (this.selectedApplication?.id === application.id) {
          this.selectedApplication = {
            ...application,
            isArchived: false,
            archivedAt: null,
          };
        }
        this.updatingApplicationId = null;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to unarchive application', error);
        this.updatingApplicationId = null;
        this.cdr.detectChanges();
      },
    });
  }

  trackByApplication(_: number, application: any) {
    return application.id;
  }

  openDetailsModal(application: any) {
    this.selectedApplication = application;
  }

  closeDetailsModal() {
    this.selectedApplication = null;
  }

  async scheduleInterview(application: any) {
    if (!this.companyProfile?.id) {
      await this.modalService.alert('Company information is missing.', 'Unable to Schedule', 'error');
      return;
    }

    // Resolve candidateId from multiple possible fields
    const candidateId = application.userId || application.candidateId || application.uid || '';
    if (!candidateId) {
      await this.modalService.alert('Candidate information is missing for this application.', 'Unable to Schedule', 'error');
      return;
    }

    const result = await this.modalService.scheduleInterview(
      'Schedule Interview',
      `Set the interview date and time for ${application.candidateName || 'this candidate'}.`,
    );

    if (!result) return;

    const interviewPayload = {
      applicationId: application.id,
      companyId: this.companyProfile.id,
      candidateId,
      candidateName: application.candidateName || 'Candidate',
      competitionId: application.competitionId || '',
      competitionTitle: application.competitionTitle || '',
      type: 'Final Interview',
      date: result.date,
      time: result.time,
      meetingLink: result.meetingLink || '',
      status: 'scheduled',
      decision: null,
    };

    try {
      const interview = await firstValueFrom(this.api.createInterview(interviewPayload));
      await firstValueFrom(
        this.api.updateApplication(application.id, {
          status: 'interview_scheduled',
          interviewId: interview.id,
          interviewDate: result.date,
          interviewTime: result.time,
        }),
      );

      application.status = 'interview_scheduled';
      application.interviewId = interview.id;
      application.interviewDate = result.date;
      application.interviewTime = result.time;
      this.cdr.detectChanges();
      await this.modalService.alert('Interview scheduled successfully.', 'Success', 'success');
    } catch (err: any) {
      console.error('Failed to schedule interview', err);

      // Handle duplicate interview (409) — interview already exists, just move the card
      if (err?.status === 409) {
        const existingId = err?.error?.existingInterviewId;
        await firstValueFrom(
          this.api.updateApplication(application.id, {
            status: 'interview_scheduled',
            ...(existingId ? { interviewId: existingId } : {}),
            interviewDate: result.date,
            interviewTime: result.time,
          }),
        );
        application.status = 'interview_scheduled';
        this.cdr.detectChanges();
        await this.modalService.alert('Interview was already scheduled. Candidate moved to Interview stage.', 'Info', 'success');
        return;
      }

      const errorMsg = err?.error?.error || 'Interview could not be scheduled. Please try again.';
      await this.modalService.alert(errorMsg, 'Error', 'error');
    }
  }

  getCandidateInitials(name: string): string {
    if (!name) return 'C';

    const parts = name
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2);

    if (!parts.length) return 'C';
    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
  }

  private getPreferredCandidateName(application: any, candidate: any, combinedName: string): string {
    const possibleNames = [
      candidate.fullName,
      combinedName,
      candidate.name,
      candidate.displayName,
      candidate.profile?.fullName,
      application.user?.fullName,
      application.user?.name,
      application.user?.displayName,
      !this.looksLikeEmail(application.candidateName) ? application.candidateName : '',
    ];

    const name = possibleNames.find((value) => typeof value === 'string' && value.trim());
    if (name) return name.trim();

    return this.getDisplayNameFromEmail(candidate.email || application.candidateEmail || application.candidateName) || 'Candidate';
  }

  private getDisplayNameFromEmail(email: string): string {
    if (!email || !email.includes('@')) return '';

    const localPart = email.split('@')[0];
    return localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private looksLikeEmail(value: string): boolean {
    return typeof value === 'string' && value.includes('@');
  }
}
