import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { NgIf, NgFor, NgClass, TitleCasePipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { AuthService } from '../../../../services/auth.service';
import { ModalService } from '../../../../services/modal.service';
import { MorphLoading } from '../../../../features/components/ui/morph-loading/morph-loading';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-company-settings',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, ReactiveFormsModule, TitleCasePipe, MorphLoading],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class CompanySettings implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private modalService = inject(ModalService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  activeTab = 'profile';
  tabs = ['profile', 'branding', 'security'];
  company: any = {};
  saved = false;
  isLoading = true;
  isSaving = false;
  filter = 'profile';
  statusFilters = ['profile', 'branding', 'security'];
  setFilter(f: string) {
    this.filter = f;
  }
  profileForm: FormGroup = this.fb.group({
    companyName: ['', Validators.required],
    ownerName: ['', Validators.required],
    tagline: [''],
    industry: ['', Validators.required],
    size: ['', Validators.required],
    location: ['', Validators.required],
    foundedYear: [''],
    website: [''],
    email: ['', [Validators.required, Validators.email]],
    description: ['', Validators.required],
    mission: [''],
    culture: [''],
    benefits: [''],
    logoUrl: [''],
    bannerUrl: [''],
    linkedin: [''],
    twitter: [''],
  });

  ngOnInit() {
    this.auth.user$.pipe(take(1)).subscribe((user) => {
      if (user) {
        this.api.getCompanyByOwnerId(user.uid).subscribe({
          next: (data) => {
            this.company = data;
            this.profileForm.patchValue({
              ...data,
              benefits:
                data.benefits && Array.isArray(data.benefits) ? data.benefits.join(', ') : '',
              linkedin: data.socialLinks?.linkedin || '',
              twitter: data.socialLinks?.twitter || '',
            });
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Failed to load company details', err);
            this.isLoading = false;
            this.cdr.detectChanges();
          },
        });
      }
    });
  }

  save() {
    if (this.profileForm.invalid || !this.company.id) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formValue = this.profileForm.value;

    const benefitsArray = formValue.benefits
      ? formValue.benefits
          .split(',')
          .map((b: string) => b.trim())
          .filter((b: string) => b)
      : [];

    const updates = {
      ...formValue,
      benefits: benefitsArray,
      socialLinks: {
        linkedin: formValue.linkedin,
        twitter: formValue.twitter,
      },
      isProfileCompleted: true,
      updatedAt: new Date().toISOString(),
    };

    delete updates.linkedin;
    delete updates.twitter;

    this.api.updateCompany(this.company.id, updates).subscribe({
      next: (res) => {
        this.saved = true;
        this.isSaving = false;
        // update local company object so view reflects changes
        this.company = { ...this.company, ...updates };
        this.cdr.detectChanges();
        setTimeout(() => {
          this.saved = false;
          this.cdr.detectChanges();
        }, 2500);
      },
      error: (err) => {
        this.isSaving = false;
        this.cdr.detectChanges();
        this.modalService.alert('Failed to update profile: ' + err.message, 'Error');
      },
    });
  }
}
