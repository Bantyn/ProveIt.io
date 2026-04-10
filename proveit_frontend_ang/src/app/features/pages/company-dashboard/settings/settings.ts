import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { NgIf, NgFor, NgClass, TitleCasePipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { AuthService } from '../../../../services/auth.service';
import { ThemeService } from '../../../../services/theme.service';
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
  public theme = inject(ThemeService);
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
    industry: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    logoUrl: [''],
  });

  ngOnInit() {
    this.auth.user$.pipe(take(1)).subscribe((user) => {
      if (user) {
        this.api.getCompanyByOwnerId(user.uid).subscribe({
          next: (data) => {
            this.company = data;
            this.profileForm.patchValue({
              companyName: data.companyName || data.name || '',
              industry: data.industry || '',
              email: data.email || '',
              logoUrl: data.logoUrl || '',
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

    const updates = {
      companyName: formValue.companyName,
      industry: formValue.industry,
      email: formValue.email,
      logoUrl: formValue.logoUrl,
      isProfileCompleted: true,
      updatedAt: new Date().toISOString(),
    };

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
