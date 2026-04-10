import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { ModalService } from '../../../services/modal.service';
import { take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { SlideButtonComponent } from '../../components/ui/slide-button/slide-button';

@Component({
  selector: 'app-competition-details',
  standalone: true,
  imports: [CommonModule, Navbar, Footer, RouterLink, SlideButtonComponent],
  templateUrl: './competition-details.html',
  styleUrl: './competition-details.css',
})
export class CompetitionDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private modalService = inject(ModalService);

  competitionId: string | null = null;
  competition: any = null;
  user: any = null;
  mongoUser: any = null;
  isLoading = true;
  showProfilePrompt = false;
  hasAlreadyApplied = false;

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.competitionId = params.get('id');
      if (this.competitionId) {
        this.loadCompetition(this.competitionId);
      }
    });

    this.auth.user$.pipe(take(1)).subscribe((user) => {
      this.user = user;
      if (user) {
        this.api.getUser(user.uid).subscribe((data) => {
          this.mongoUser = data;
        });

        // Also check if user has already applied
        this.api.getUserApplications(user.uid).pipe(take(1)).subscribe((apps) => {
          this.hasAlreadyApplied = !!apps.find((app: any) => app.competitionId === this.competitionId);
        });
      }
    });
  }

  loadCompetition(id: string) {
    this.api.getCompetition(id).subscribe({
      next: (data) => {
        this.competition = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load competition', err);
        this.isLoading = false;
      },
    });
  }

  async applyToEvent() {
    if (this.isClosed) {
      await this.modalService.alert('This competition has already ended.', 'Closed');
      return;
    }

    if (this.isCancelled) {
      await this.modalService.alert('This competition has been cancelled.', 'Cancelled');
      return;
    }

    if (!this.canParticipateYet) {
      await this.modalService.alert(this.participationBlockedMessage, 'Not Yet Open');
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

        // 2. Check for active application from the SAME COMPANY
        const activeAppFromSameCompany = apps.find((app) => {
          const status = (app.status || '').toUpperCase();
          const isSameCompany = app.companyId === this.competition?.companyId;
          return isSameCompany && status !== 'REJECTED' && status !== 'SELECTED';
        });

        if (activeAppFromSameCompany) {
          await this.modalService.alert(
            'You already have an active application with this company. You cannot apply for a new one until your current application is rejected or completed.',
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
    now.setHours(0, 0, 0, 0);

    return now >= startDate;
  }

  get isClosed(): boolean {
    if (!this.competition) return false;
    
    const status = (this.competition.status || '').toUpperCase();
    if (status === 'CLOSED' || status === 'COMPLETED' || status === 'INACTIVE') return true;

    const rawEndDate = this.competition.endDate || this.competition.projectInfo?.deadline;
    if (rawEndDate) {
      const endDate = new Date(rawEndDate);
      if (endDate.getHours() === 0 && endDate.getMinutes() === 0) {
        endDate.setHours(23, 59, 59, 999);
      }
      return new Date() > endDate;
    }

    return false;
  }

  get isCancelled(): boolean {
    if (!this.competition) return false;
    const status = (this.competition.status || '').toUpperCase();
    return status === 'CANCELLED' || status === 'CANCEL';
  }

  get participationBlockedMessage(): string {
    if (!this.competition) return 'This competition is not open for participation yet.';

    const rawStartDate = this.competition.startDate || this.competition.projectInfo?.startDate;
    if (!rawStartDate) return 'This competition is not open for participation yet.';

    return `This competition will open on ${new Date(rawStartDate).toLocaleDateString()}. You can participate after it starts.`;
  }
}
