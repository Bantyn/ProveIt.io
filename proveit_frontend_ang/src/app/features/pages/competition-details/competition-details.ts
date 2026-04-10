import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { ModalService } from '../../../services/modal.service';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { SlideButtonComponent } from '../../components/ui/slide-button/slide-button';

@Component({
  selector: 'app-competition-details',
  standalone: true,
  imports: [CommonModule, Navbar, Footer, RouterLink, DatePipe, SlideButtonComponent],
  templateUrl: './competition-details.html',
  styleUrls: ['./competition-details.css'],
})
export class CompetitionDetails implements OnInit {
  competitionId: string | null = null;
  competition: any = null;
  user: any = null;
  mongoUser: any = null;
  showProfilePrompt: boolean = false;
  isLoading: boolean = true;
  hasAlreadyApplied: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private modalService: ModalService,
  ) {}

  ngOnInit(): void {
    this.competitionId = this.route.snapshot.paramMap.get('id');
    if (this.competitionId) {
      this.api.getCompetition(this.competitionId).subscribe({
        next: (data) => {
          this.competition = data;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Could not load competition', err);
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
    } else {
      this.isLoading = false;
    }

    this.auth.user$.pipe(take(1)).subscribe((user) => {
      this.user = user;
      if (user) {
        this.api.getUser(user.uid).subscribe({
          next: (data) => {
            this.mongoUser = data;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Could not load mongo user', err);
            this.cdr.detectChanges();
          },
        });

        // Check if user has already applied to this competition
        if (this.competitionId) {
          this.api.getUserApplications(user.uid).pipe(take(1)).subscribe({
            next: (apps) => {
              this.hasAlreadyApplied = apps.some((app) => app.competitionId === this.competitionId);
              this.cdr.detectChanges();
            },
            error: () => {},
          });
        }
      } else {
        this.mongoUser = null;
        this.cdr.detectChanges();
      }
    });
  }

  async applyToEvent() {
    if (this.isClosed) {
      await this.modalService.alert(
        'This competition is closed and no longer accepting submissions.',
        'Competition Closed',
      );
      return;
    }

    if (!this.canParticipateYet) {
      await this.modalService.alert(
        this.participationBlockedMessage,
        'Competition Not Open Yet',
      );
      return;
    }

    if (!this.user) {
      await this.modalService.alert('Please login to apply.', 'Login Required');
      this.router.navigate(['/auth']);
      return;
    }

    // Check for existing/active applications
    this.api.getUserApplications(this.user.uid).pipe(take(1)).subscribe({
      next: async (apps) => {
        // 1. Check if already applied to THIS competition
        const alreadyApplied = apps.find((app) => app.competitionId === this.competitionId);
        if (alreadyApplied) {
          await this.modalService.alert(
            'You have already applied for this competition.',
            'Already Applied',
          );
          this.router.navigate(['/user/applications']);
          return;
        }

        // 2. Check for ANY active application across the platform
        const activeApp = apps.find((app) => {
          const status = (app.status || '').toUpperCase();
          return status !== 'REJECTED' && status !== 'SELECTED';
        });

        if (activeApp) {
          await this.modalService.alert(
            'You already have an active application. You cannot apply for a new one until your current application is rejected or completed.',
            'Application Restriction',
          );
          this.router.navigate(['/user/applications']);
          return;
        }

        // --- ENFORCE APPLICATION LIMIT PER COMPETITION ---
        if (this.competition) {
            const internalMax = this.competition.projectInfo?.maxCandidates || 999999;
            
            // Get all applications for this competition to count
            const allApps: any[] = await firstValueFrom(this.api.getCompetitionApplications(this.competitionId!));
            const activeCount = allApps.filter((a: any) => (a.status || '').toUpperCase() !== 'REJECTED').length;

            // Fetch company plan for upper ceiling
            const company: any = await firstValueFrom(this.api.getCompany(this.competition.companyId));
            const plans: any[] = await firstValueFrom(this.api.getPlans());
            const planName = (company?.plan || 'STARTER').toUpperCase();
            const currentPlan = plans.find((p: any) => p.name.toUpperCase() === planName);
            const planMax = currentPlan?.features?.competitions?.maxApplicationsPerCompetition || 50;

            const finalMax = Math.min(internalMax, planMax);

            if (activeCount >= finalMax) {
              await this.modalService.alert(
                `This competition has reached its submission limit (${activeCount}/${finalMax}). Please try another competition.`,
                'Seats Full'
              );
              return;
            }
        }
        // ------------------------------------------------

        if (this.mongoUser && !this.mongoUser.isProfileCompleted) {
          this.showProfilePrompt = true;
          return;
        }

        // Navigate to the submit component
        this.router.navigate([`/user/compition/${this.competitionId}/submit`]);
      },
      error: (err) => {
        console.error('Error checking applications', err);
        // Fallback: navigate anyway, submit page will re-check
        this.router.navigate([`/user/compition/${this.competitionId}/submit`]);
      },
    });
  }

  get canParticipateYet(): boolean {
    if (!this.competition) return false;

    const rawStartDate = this.competition.startDate || this.competition.projectInfo?.startDate;
    if (!rawStartDate) return true;

    const startDate = new Date(rawStartDate);
    startDate.setHours(0, 0, 0, 0);

    const now = new Date();
    // No need to set hours for 'now' if we compare with getTime() or just direct comparison
    // but consistent with current logic:
    now.setHours(0, 0, 0, 0);

    return now >= startDate;
  }

  get isClosed(): boolean {
    if (!this.competition) return false;
    
    // 1. Explicit Status Check
    const status = (this.competition.status || '').toUpperCase();
    if (status === 'CLOSED' || status === 'COMPLETED' || status === 'INACTIVE') return true;

    // 2. End Date / Deadline Check
    const rawEndDate = this.competition.endDate || this.competition.projectInfo?.deadline;
    if (rawEndDate) {
      const endDate = new Date(rawEndDate);
      // If deadline is just a date (00:00:00), assume end of day to be fair
      if (endDate.getHours() === 0 && endDate.getMinutes() === 0) {
        endDate.setHours(23, 59, 59, 999);
      }
      return new Date() > endDate;
    }

    return false;
  }

  get participationBlockedMessage(): string {
    if (!this.competition) return 'This competition is not open for participation yet.';

    const rawStartDate = this.competition.startDate || this.competition.projectInfo?.startDate;
    if (!rawStartDate) return 'This competition is not open for participation yet.';

    return `This competition will open on ${new Date(rawStartDate).toLocaleDateString()}. You can participate after it starts.`;
  }
}
