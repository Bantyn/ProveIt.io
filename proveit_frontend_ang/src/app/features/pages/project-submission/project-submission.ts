import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { ModalService } from '../../../services/modal.service';
import { MorphLoading } from '../../components/ui/morph-loading/morph-loading';
import { take } from 'rxjs/operators';
import { FaqAccordion, FaqItem } from '../../components/faq-accordion/faq-accordion';

@Component({
  selector: 'app-project-submission',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    RouterLink, 
    Navbar, 
    Footer, 
    MorphLoading,
    FaqAccordion
  ],
  templateUrl: './project-submission.html',
  styleUrl: './project-submission.css',
})
export class ProjectSubmission implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private modalService = inject(ModalService);

  competitionId: string = '';
  competition: any = null;
  user: any = null;
  mongoUser: any = null;

  submissionForm!: FormGroup;
  isSubmitting = false;
  loading = true;

  howItWorksItems: FaqItem[] = [
    {
      question: 'How do I submit my project?',
      answer: 'Use one main submission link and a short summary. That keeps the demo flow fast while still giving reviewers enough context.',
      meta: 'Submission'
    },
    {
      question: 'What should I include in the summary?',
      answer: 'Mention what the project does, the stack you used, and anything the reviewer should open first.',
      meta: 'Summary'
    },
    {
      question: 'Can I edit my submission later?',
      answer: 'Once submitted, your application moves to the evaluation phase. However, you can update your external repository before the deadline if the company permits.',
      meta: 'Edits'
    }
  ];

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.competitionId = params.get('id') || '';
      if (!this.competitionId) {
        this.router.navigate(['/user/compition']);
        return;
      }
      this.loadComponentData();
    });

    this.initForm();

    // Watch submissionType to dynamically adjust validation
    this.submissionForm.get('submissionType')?.valueChanges.subscribe((type) => {
      this.updateValidation(type);
    });
  }

  initForm() {
    this.submissionForm = this.fb.group({
      projectTitle: ['', [Validators.required, Validators.minLength(3)]],
      shortDescription: ['', [Validators.required, Validators.maxLength(500)]],
      submissionType: ['GITHUB', Validators.required],
      submissionLink: ['', [Validators.required, Validators.pattern('https?://.+')]],
      liveDemoLink: ['', Validators.pattern('https?://.+')],
      techStack: ['', Validators.required],
    });
  }

  updateValidation(submissionType: string) {
    const submissionLinkCtrl = this.submissionForm.get('submissionLink');
    submissionLinkCtrl?.setValidators([Validators.required, Validators.pattern('https?://.+')]);
    submissionLinkCtrl?.updateValueAndValidity();
  }

  loadComponentData() {
    this.auth.user$.pipe(take(1)).subscribe((user) => {
      if (!user) {
        this.router.navigate(['/auth']);
        return;
      }
      this.user = user;

      this.api.getUser(user.uid).subscribe({
        next: (mongoUser) => {
          this.mongoUser = mongoUser;
          const completion = this.getProfileCompletion(mongoUser);

          if (completion < 100) {
            this.modalService.alert(
              `Please complete 100% of your profile to submit projects. Current progress: ${completion}%.`,
              'Profile Incomplete',
              'error',
            );
            this.router.navigate(['/user/profile'], {
              queryParams: { returnUrl: `/user/compition/${this.competitionId}/submit` },
            });
            return;
          }

          // Check application constraints
          this.api.getUserApplications(user.uid).pipe(take(1)).subscribe({
            next: async (apps) => {
              // Check if candidate already has a non-rejected submission for THIS competition
              const existingApp = apps.find((app) => app.competitionId === this.competitionId);
              
              if (existingApp) {
                const status = (existingApp.status || '').toUpperCase();
                
                if (status === 'REJECTED') {
                  // ✅ Allow resubmission after rejection — proceed normally
                } else {
                  // ❌ Block: they have an active or pending submission
                  await this.modalService.alert(
                    `You have already submitted a project for this competition. Current status: ${existingApp.status}. You can only resubmit after your application is rejected.`,
                    'Already Submitted',
                  );
                  this.router.navigate(['/user/applications']);
                  return;
                }
              }

              const activeAppFromSameCompany = apps.find((app) => {
                const status = (app.status || '').toUpperCase();
                // Check if active app is from a DIFFERENT competition but from SAME COMPANY
                return app.competitionId !== this.competitionId 
                  && app.companyId === this.competition?.companyId
                  && status !== 'REJECTED' 
                  && status !== 'SELECTED';
              });

              if (activeAppFromSameCompany) {
                await this.modalService.alert(
                  'You already have an active application with this company for another competition. You cannot apply for a new one until your current application is rejected or completed.',
                  'Application Restriction',
                );
                this.router.navigate(['/user/applications']);
                return;
              }

              this.loadCompetitionDetails();
            },
            error: (err) => {
              console.error('Could not check user applications', err);
              this.loadCompetitionDetails(); // Fallback anyway
            }
          });
        },
        error: (err) => {
          console.error('Could not load mongo user', err);
          this.router.navigate(['/auth']);
        },
      });
    });
  }

  loadCompetitionDetails() {
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

  onSubmit() {
    if (this.submissionForm.invalid || !this.user || !this.competition) {
      if (!this.competition) console.error('Competition not loaded yet');
      this.submissionForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.submissionForm.value;
    const projectSummary = (formValue.shortDescription || '').trim();

    // 1. Create Application
    const applicationPayload = {
      competitionId: this.competition.id || this.competitionId,
      companyId: this.competition.companyId,
      competitionType: this.competition.competitionType || 'SKILL',
      userId: this.user.uid,
      candidateName: this.user.displayName || this.user.email || 'Unknown User',
      status: 'submitted',  // Directly to submitted state
      feedback: projectSummary,
      projectSummary: projectSummary,
      submissionLink: formValue.submissionLink,
    };

    if (this.competition.jobId) {
      (applicationPayload as any).jobId = this.competition.jobId;
    }

    this.api.createApplication(applicationPayload).subscribe({
      next: (createdApp: any) => {
        const applicationId = createdApp.id || createdApp._id;

        const techStack = formValue.techStack
          .split(',')
          .map((t: string) => t.trim())
          .filter((t: string) => t.length > 0);

        // 2. Create Project
        const projectPayload = {
          applicationId: applicationId,
          userId: this.user.uid,
          companyId: this.competition.companyId,
          competitionId: this.competition.id || this.competitionId,
          candidateName: this.user.displayName || this.user.email || 'Unknown User',
          title: formValue.projectTitle,
          description: formValue.shortDescription,
          submissionType: formValue.submissionType,
          submissionLink: formValue.submissionLink,
          techStack: techStack,
          liveDemoLink: formValue.liveDemoLink || '',
          aiScore: 0,
          plagiarism: '0%',
          status: 'pending',
          submittedAt: new Date().toISOString(),
        };

        this.api.createProject(projectPayload).subscribe({
          next: (newProject) => {
            // 3. Update application with new projectId
            this.api.updateApplication(applicationId, { projectId: newProject.id }).subscribe({
              next: () => {
                this.isSubmitting = false;
                this.modalService
                  .alert('Your application & project have been successfully submitted!', 'Success!', 'success')
                  .then(() => {
                    this.router.navigate(['/user/applications']);
                  });
              },
              error: (err) => {
                console.error('Failed to link project to application', err);
                this.isSubmitting = false;
                // Still considered a success globally
                this.modalService.alert('Submitted but project linking failed.', 'Partial Success', 'info')
                  .then(() => {
                    this.router.navigate(['/user/applications']);
                  });
              }
            });
          },
          error: (err) => {
            console.error('Project creation failed', err);
            this.isSubmitting = false;
            this.modalService.alert('Application created but Project Submission failed. Please try saving it later via My Applications.', 'Error', 'error');
            this.router.navigate(['/user/applications']);
          }
        });
      },
      error: (err) => {
        console.error('Application creation failed', err);
        this.isSubmitting = false;
        this.modalService.alert(
          err?.error?.error || 'Failed to submit application. Please try again later.',
          'Submission Error',
          'error',
        );
      }
    });
  }
}
