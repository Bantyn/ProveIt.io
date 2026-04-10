import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { ModalService } from '../../../services/modal.service';
import { MorphLoading } from '../../components/ui/morph-loading/morph-loading';

import { take } from 'rxjs/operators';

@Component({
  selector: 'app-apply-competition',
  standalone: true,
  imports: [
    CommonModule,
    Navbar,
    Footer,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    MorphLoading,
  ],
  templateUrl: './apply-competition.html',
  styleUrl: './apply-competition.css',
})
export class ApplyCompetition implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private modalService = inject(ModalService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  competitionId: string | null = null;
  competition: any = null;
  user: any = null;
  mongoUser: any = null;
  loading = true;
  submitting = false;

  applyForm = new FormGroup({
    feedback: new FormControl('', [Validators.required, Validators.minLength(5)]),
  });

  ngOnInit(): void {
    this.competitionId = this.route.snapshot.paramMap.get('id');

    this.auth.user$.pipe(take(1)).subscribe((user) => {
      this.user = user;
      if (user) {
        this.api.getUser(user.uid).subscribe({
          next: (data) => {
            this.mongoUser = data;

            // 1. Check for Active/Existing Applications
            this.api.getUserApplications(user.uid).subscribe({
              next: (apps) => {
                // Check if already applied to THIS competition
                const alreadyApplied = apps.find(app => (app.competitionId === this.competitionId || app.id === this.competitionId));
                if (alreadyApplied) {
                  this.modalService.alert(
                    'You have already applied for this competition.',
                    'Already Applied'
                  );
                  this.router.navigate(['/user/applications']);
                  return;
                }

                // Check for ANY active application
                const activeApp = apps.find(app => {
                  const status = (app.status || '').toUpperCase();
                  return status !== 'REJECTED' && status !== 'SELECTED';
                });

                if (activeApp) {
                  this.modalService.alert(
                    'You already have an active application. You cannot apply for a new one until your current application is rejected or completed.',
                    'Application Restriction'
                  );
                  this.router.navigate(['/user/applications']);
                  return;
                }

                // 2. Check Profile Completion
                const completion = this.getProfileCompletion(this.mongoUser);
                if (completion < 100) {
                  this.modalService.alert(
                    `Please complete 100% of your profile to apply. Current progress: ${completion}%.`,
                    'Profile Incomplete',
                  );
                  this.router.navigate(['/user/profile'], {
                    queryParams: { returnUrl: `/user/compition/${this.competitionId}/apply` },
                  });
                  return;
                }
                this.loadCompetition();
                this.cdr.detectChanges();
              },
              error: (err) => {
                console.error('Could not check user applications', err);
                this.loadCompetition(); // Fallback to loading competition anyway
              }
            });
          },
          error: (err) => {
            console.error('Could not load mongo user', err);
            this.router.navigate(['/auth']);
          },
        });
      } else {
        this.router.navigate(['/auth']);
      }
    });
  }

  loadCompetition() {
    if (this.competitionId) {
      this.api.getCompetition(this.competitionId).subscribe({
        next: (data) => {
          this.competition = data;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Could not load competition', err);
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  getProfileCompletion(data: any): number {
    if (!data) return 0;
    if (data.isProfileCompleted) return 100;

    let completedValue = 0;
    const checklist = [
      { bonus: 10, key: 'id' },
      { bonus: 5, key: 'profileImage' },
      { bonus: 35, key: 'fullName' },
      { bonus: 25, key: 'phone' },
      { bonus: 25, key: 'skills' },
    ];

    const profileData = data.profile || {};

    const checks = {
      id: data.id || data._id || data.uid,
      profileImage: profileData.profileImage || data.profileImage,
      fullName: data.fullName,
      phone: profileData.phone || data.phone,
      skills:
        (data.candidateProfile?.skills?.length ? data.candidateProfile.skills : null) ||
        (data.skills?.length ? data.skills : null),
    };

    checklist.forEach((item) => {
      const val = (checks as any)[item.key];
      if (val && (Array.isArray(val) ? val.length > 0 : true)) {
        completedValue += item.bonus;
      }
    });

    return completedValue;
  }

  async onSubmit() {
    if (this.applyForm.invalid) {
      this.applyForm.markAllAsTouched();
      return;
    }

    if (!this.user || !this.mongoUser) {
      await this.modalService.alert('Session expired. Please login again.', 'Error');
      return;
    }

    this.submitting = true;

    const completion = this.getProfileCompletion(this.mongoUser);
    if (completion < 100) {
      this.submitting = false;
      await this.modalService.alert(
        `Please complete 100% of your profile to apply. Current progress: ${completion}%.`,
        'Profile Incomplete',
        'error',
      );
      this.router.navigate(['/user/profile'], {
        queryParams: { returnUrl: `/user/compition/${this.competitionId}/apply` },
      });
      return;
    }

    const formVal = this.applyForm.value;

    const applicationPayload = {
      competitionId: this.competition.id || this.competitionId,
      companyId: this.competition.companyId,
      competitionType: this.competition.competitionType || 'SKILL',
      userId: this.user.uid,
      candidateName: this.user.displayName || this.user.email || 'Unknown User',
      status: 'applied',
      feedback: formVal.feedback,
    };

    if (this.competition.jobId) {
      (applicationPayload as any).jobId = this.competition.jobId;
    }

    this.api.createApplication(applicationPayload).subscribe({
      next: () => {
        this.submitting = false;
        this.modalService.alert(
          'Your application has been successfully submitted!',
          'Application Sent',
          'success',
        );
        this.router.navigate(['/user/compition']);
      },
      error: (err) => {
        this.submitting = false;
        console.error('Submission failed', err);
        this.modalService.alert('Failed to apply. Please try again.', 'Error', 'error');
      },
    });
  }
}
