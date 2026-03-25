import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../services/auth.service';
import { ApiService } from '../../../../services/api.service';
import { MorphLoading } from '../../../../features/components/ui/morph-loading/morph-loading';
import { forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';
import { RouterLink } from '@angular/router';

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
  imports: [CommonModule, MorphLoading, RouterLink],
  templateUrl: './hiring-pipeline.html',
  styleUrl: './hiring-pipeline.css',
})
export class HiringPipeline implements OnInit {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  draggedApplicationId: string | null = null;
  updatingApplicationId: string | null = null;
  selectedApplication: any | null = null;
  applications: any[] = [];
  companyProfile: any = null;
  currentPlanDetails: any = null;
  featureLocked = false;

  readonly columns: PipelineColumn[] = [
    {
      id: 'submitted',
      title: 'New Submissions',
      subtitle: 'Fresh entries waiting to be reviewed',
      accentClass: 'border-blue-200 bg-blue-50/70',
      headerClass: 'text-blue-700',
    },
    {
      id: 'under_evaluation',
      title: 'Under Evaluation',
      subtitle: 'Projects currently being assessed',
      accentClass: 'border-amber-200 bg-amber-50/70',
      headerClass: 'text-amber-700',
    },
    {
      id: 'winner',
      title: 'Winner',
      subtitle: 'Top candidates ready for next step',
      accentClass: 'border-emerald-200 bg-emerald-50/70',
      headerClass: 'text-emerald-700',
    },
    {
      id: 'interview_scheduled',
      title: 'Interviews',
      subtitle: 'Candidates already moved to interview',
      accentClass: 'border-cyan-200 bg-cyan-50/70',
      headerClass: 'text-cyan-700',
    },
    {
      id: 'not_selected',
      title: 'Not Selected',
      subtitle: 'Candidates not moving forward',
      accentClass: 'border-slate-200 bg-slate-50/90',
      headerClass: 'text-slate-700',
    },
    {
      id: 'rejected',
      title: 'Rejected',
      subtitle: 'Candidates directly rejected in review',
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
            users: this.api.getUsers(),
          }).subscribe({
            next: ({ applications, competitions, users }) => {
              const competitionMap = new Map(
                (competitions || []).map((competition: any) => [
                  competition.id,
                  competition.title || competition.name || 'Competition',
                ]),
              );
              const userMap = new Map((users || []).map((candidate: any) => [candidate.id || candidate.uid, candidate]));

              this.applications = (applications || [])
                .map((application: any) => {
                  const candidate = userMap.get(application.userId) || {};
                  const combinedName = [candidate.firstName, candidate.lastName].filter(Boolean).join(' ').trim();
                  const resolvedName = this.getPreferredCandidateName(application, candidate, combinedName);
                  const candidateEmail =
                    candidate.email ||
                    application.candidateEmail ||
                    (this.looksLikeEmail(application.candidateName) ? application.candidateName : '') ||
                    '';

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

              this.loading = false;
              this.cdr.detectChanges();
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

  getApplicationsForColumn(status: string) {
    return this.applications
      .filter((application) => !application.isArchived && application.status === status)
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
      .filter((application) => application.isArchived)
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
