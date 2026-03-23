import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { NgIf, NgClass } from '@angular/common';
import { DatePicker } from '../../../../components/ui/date-picker/date-picker';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { ApiService } from '../../../../../services/api.service';
import { AuthService } from '../../../../../services/auth.service';
import { ModalService } from '../../../../../services/modal.service';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import {
  FluidDropdown,
  DropdownOption,
} from '../../../../../features/components/ui/fluid-dropdown/fluid-dropdown';
import { MorphLoading } from '../../../../../features/components/ui/morph-loading/morph-loading';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-create-competition',
  standalone: true,
  imports: [
    NgIf,
    NgClass,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    DatePicker,
    FluidDropdown,
    MorphLoading,
  ],
  templateUrl: './create-competition.html',
  styleUrl: './create-competition.css',
})
export class CreateCompetition implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private modalService = inject(ModalService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  userId = '';
  companyFirestoreId = '';
  companyName = '';
  loading = false;
  isEditMode = false;
  compId: string | null = null;
  fetchingData = false;

  competitionTypeOptions: DropdownOption[] = [
    { value: 'SKILL', label: 'Skill Competition', icon: 'bi bi-lightning-fill' },
    { value: 'HIRING', label: 'Hiring Challenge', icon: 'bi bi-briefcase-fill' },
  ];

  difficultyOptions: DropdownOption[] = [
    { value: 'EASY', label: 'Easy', icon: 'bi bi-emoji-smile-fill' },
    { value: 'MEDIUM', label: 'Medium', icon: 'bi bi-emoji-neutral-fill' },
    { value: 'HARD', label: 'Hard', icon: 'bi bi-emoji-frown-fill' },
  ];

  industryOptions: DropdownOption[] = [
    { value: 'TECHNOLOGY', label: 'Technology', icon: 'bi bi-cpu' },
    { value: 'FINANCE', label: 'Finance', icon: 'bi bi-bank' },
    { value: 'HEALTHCARE', label: 'Healthcare', icon: 'bi bi-heart-pulse' },
    { value: 'EDUCATION', label: 'Education', icon: 'bi bi-book' },
    { value: 'RETAIL', label: 'Retail', icon: 'bi bi-cart' },
    { value: 'MANUFACTURING', label: 'Manufacturing', icon: 'bi bi-building' },
    { value: 'OTHER', label: 'Other', icon: 'bi bi-grid' },
  ];

  compForm = new FormGroup({
    title: new FormControl('', [Validators.required, Validators.minLength(5)]),
    description: new FormControl('', [Validators.required]),
    competitionType: new FormControl('SKILL', [Validators.required]),
    difficulty: new FormControl('MEDIUM', [Validators.required]),
    deadline: new FormControl('', [Validators.required]),
    startDate: new FormControl('', [Validators.required]),
    endDate: new FormControl('', [Validators.required]),
    rules: new FormControl(''),
    requiredSkills: new FormControl(''),
    img_url: new FormControl('', [Validators.required]),
    maxCandidates: new FormControl(50, [Validators.required, Validators.min(1)]),
    industry: new FormControl('TECHNOLOGY', [Validators.required]),
  });

  ngOnInit() {
    this.compId = this.route.snapshot.paramMap.get('id');
    if (this.compId) {
      this.isEditMode = true;
      this.fetchingData = true;
      this.api.getCompetition(this.compId).subscribe({
        next: (comp) => {
          this.compForm.patchValue({
            title: comp.title || comp.name,
            description: comp.description,
            competitionType: comp.competitionType || comp.projectType || 'SKILL',
            difficulty: comp.projectInfo?.difficulty || 'MEDIUM',
            deadline: comp.projectInfo?.deadline
              ? comp.projectInfo.deadline.split('T')[0]
              : comp.deadline
                ? comp.deadline.split('T')[0]
                : '',
            startDate: comp.startDate ? comp.startDate.split('T')[0] : '',
            endDate: comp.endDate ? comp.endDate.split('T')[0] : '',
            rules: comp.rules || (comp.responsibilities ? comp.responsibilities.join('\n') : ''),
            requiredSkills: comp.requiredSkills
              ? comp.requiredSkills.join(', ')
              : comp.skillsRequired
                ? comp.skillsRequired.join(', ')
                : '',
            img_url: comp.img_url || '',
            maxCandidates: comp.projectInfo?.maxCandidates || comp.maxCandidates || 50,
            industry: comp.industry || 'TECHNOLOGY',
          });
          this.fetchingData = false;
        },
        error: (err) => {
          console.error('Failed to load competition details', err);
          this.fetchingData = false;
          this.modalService.alert('Could not load competition data for editing.', 'Error');
          this.router.navigate(['/company/dashboard/competitions']);
        },
      });
    }

    this.auth.user$.pipe(take(1)).subscribe((user) => {
      if (user) {
        this.userId = user.uid;
        // Verify profile is completed and company is approved
        this.api.getCompanyByOwnerId(user.uid).subscribe((profile) => {
          if (profile) {
            if (!profile.isProfileCompleted) {
              this.modalService.alert('Please complete your profile first.', 'Action Required');
              this.router.navigate(['/company/dashboard/settings']);
              this.cdr.detectChanges();
              return;
            }

            if (profile.verificationStatus !== 'verified') {
              this.modalService.alert(
                'Your account is pending admin approval. You can only create competitions once verified.', 
                'Approval Pending'
              );
              this.router.navigate(['/company/dashboard']);
              this.cdr.detectChanges();
              return;
            }
          }

          if (profile) {
            this.companyFirestoreId = profile.id;
            this.companyName = profile.companyName || '';

            // If not edit mode, check Free Tier limit
            if (!this.isEditMode) {
              const isFreeTier = !profile.subscriptionId;
              if (isFreeTier) {
                this.api.getCompanyCompetitions(profile.id).subscribe((comps) => {
                  if (comps && comps.length >= 1) {
                    this.modalService.alert(
                      'Free tier limit reached. You can only create 1 competition on the free tier.',
                      'Upgrade Required',
                    );
                    this.router.navigate(['/company/dashboard/competitions']);
                  }
                  this.cdr.detectChanges();
                });
              }
            }
          }
          this.cdr.detectChanges();
        });
      }
    });
  }

  onSubmit() {
    if (this.compForm.invalid || !this.userId) {
      this.compForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formVal = this.compForm.value;

    const payload = {
      companyId: this.companyFirestoreId,
      ownerId: this.userId,
      title: formVal.title,
      description: formVal.description,
      competitionType: formVal.competitionType,
      rules: formVal.rules,
      requiredSkills: formVal.requiredSkills?.split(',').map((s) => s.trim()) || [],
      startDate: formVal.startDate ? new Date(formVal.startDate).toISOString() : null,
      endDate: formVal.endDate ? new Date(formVal.endDate).toISOString() : null,
      projectInfo: {
        title: formVal.title,
        difficulty: formVal.difficulty,
        deadline: formVal.deadline ? new Date(formVal.deadline).toISOString() : null,
        maxCandidates: formVal.maxCandidates || 50,
        maxSubmissions: 1,
      },
      status: this.isEditMode ? undefined : 'ACTIVE', // default to ACTIVE on creation
      visibility: 'public',
      companyName: this.companyName,
      img_url: formVal.img_url,
      industry: formVal.industry,
    };

    if (this.isEditMode && this.compId) {
      this.api.updateCompetition(this.compId, payload).subscribe({
        next: (res) => {
          this.loading = false;
          this.router.navigate(['/company/dashboard/competitions']);
        },
        error: (err) => {
          this.loading = false;
          this.modalService.alert('Error updating competition: ' + err.message, 'Error');
        },
      });
    } else {
      this.api.createCompetition(payload).subscribe({
        next: (res) => {
          this.loading = false;
          this.router.navigate(['/company/dashboard/competitions']);
        },
        error: (err) => {
          this.loading = false;
          this.modalService.alert('Error creating competition: ' + err.message, 'Error');
        },
      });
    }
  }

  // ── Date picker helpers ────────────────────────────────────────────────────

  get startDateValue(): Date | null {
    const v = this.compForm.get('startDate')?.value;
    return v ? new Date(v) : null;
  }

  get endDateValue(): Date | null {
    const v = this.compForm.get('endDate')?.value;
    return v ? new Date(v) : null;
  }

  get deadlineValue(): Date | null {
    const v = this.compForm.get('deadline')?.value;
    return v ? new Date(v) : null;
  }

  onStartDateChange(date: Date | null) {
    this.compForm.get('startDate')?.setValue(date ? date.toISOString().split('T')[0] : '');
  }

  onEndDateChange(date: Date | null) {
    this.compForm.get('endDate')?.setValue(date ? date.toISOString().split('T')[0] : '');
  }

  onDeadlineChange(date: Date | null) {
    this.compForm.get('deadline')?.setValue(date ? date.toISOString().split('T')[0] : '');
  }
}
