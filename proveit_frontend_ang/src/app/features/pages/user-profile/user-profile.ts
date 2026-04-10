import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { NgIf, NgFor, NgClass, CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { ModalService } from '../../../services/modal.service';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { MorphLoading } from '../../components/ui/morph-loading/morph-loading';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgFor,
    NgClass,
    ReactiveFormsModule,
    Navbar,
    Footer,
    RouterLink,
    MorphLoading,
  ],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css',
})
export class UserProfile implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private modalService = inject(ModalService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  user: any = null;
  saved = false;
  isLoading = true;
  isSaving = false;
  returnUrl: string | null = null;
  editingSection: string | null = null;
  profileCompletion: number = 0;

  checklist: any[] = [
    { label: 'Setup account', bonus: 10, key: 'id', complete: true },
    { label: 'Upload your photo', bonus: 5, key: 'profileImage', complete: false },
    { label: 'Name', bonus: 35, key: 'fullName', complete: false },
    { label: 'Phone', bonus: 25, key: 'phone', complete: false },
    { label: 'Skills', bonus: 25, key: 'skills', complete: false },
  ];

  profileForm: FormGroup = this.fb.group({
    fullName: ['', Validators.required],
    email: [{ value: '', disabled: true }],
    phone: ['', Validators.required],
    skills: ['', Validators.required],
    profileImage: [''],
    github: [''],
    resumeUrl: [''],
  });

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.returnUrl = params['returnUrl'] || null;
    });

    this.auth.user$.pipe(take(1)).subscribe((authUser: any) => {
      if (authUser) {
        this.api.getUser(authUser.uid).subscribe({
          next: (data: any) => {
            this.user = data;

            const profileData = data.profile || {};
            const candidateProfile = data.candidateProfile || {};

            const skillsStr =
              candidateProfile.skills?.map((s: any) => s.name).join(', ') ||
              data.skills?.join(', ') ||
              '';

            this.profileForm.patchValue({
              fullName: data.fullName || authUser.displayName || '',
              email: data.email || authUser.email || '',
              phone: profileData.phone || data.phone || '',
              skills: skillsStr,
              profileImage: profileData.profileImage || data.profileImage || '',
              github: data.github || candidateProfile.github || '',
              resumeUrl: data.resumeUrl || candidateProfile.resumeUrl || '',
            });

            this.calculateProgress();
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            console.error('Failed to load user details', err);
            this.user = { id: authUser.uid, ...authUser };
            this.profileForm.patchValue({
              fullName: authUser.displayName || '',
              email: authUser.email || '',
            });
            this.calculateProgress();
            this.isLoading = false;
            this.cdr.detectChanges();
          },
        });
      } else {
        this.isLoading = false;
        this.cdr.detectChanges();
        this.router.navigate(['/auth']);
      }
    });

    this.profileForm.valueChanges.subscribe(() => {
      this.calculateProgress();
    });
  }

  calculateProgress() {
    let completedValue = 0;
    const formVal = this.profileForm.getRawValue();

    this.checklist.forEach((item) => {
      const val = formVal[item.key] || this.user?.[item.key];
      item.complete = !!val;
      if (item.complete) {
        completedValue += item.bonus;
      }
    });
    this.profileCompletion = completedValue;
  }

  toggleEdit(section: string | null) {
    this.editingSection = this.editingSection === section ? null : section;
    this.cdr.detectChanges();
  }

  save() {
    if (this.profileForm.invalid) {
      console.warn('Form validation failed:', this.profileForm.errors);
      // Log which controls are invalid
      Object.keys(this.profileForm.controls).forEach((key) => {
        const controlErrors = this.profileForm.get(key)?.errors;
        if (controlErrors) console.warn(`Control ${key} is invalid:`, controlErrors);
      });
      this.profileForm.markAllAsTouched();
      this.modalService.alert('Please fill in all required fields correctly.', 'Validation Error');
      return;
    }

    if (!this.user && !this.auth.user$) {
      this.modalService.alert('User session not found.', 'Error');
      return;
    }

    this.isSaving = true;
    const formValue = this.profileForm.value;

    const skillsArray = formValue.skills
      ? formValue.skills
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s)
      : [];

    const updates = {
      fullName: formValue.fullName,
      phone: formValue.phone,
      skills: skillsArray,
      profileImage: formValue.profileImage,
      github: formValue.github,
      resumeUrl: formValue.resumeUrl,
      isProfileCompleted: true,
      updatedAt: new Date().toISOString(),
    };

    const userId = this.user?.id || this.user?.uid || this.user?._id;

    if (!userId) {
      this.auth.user$
        .subscribe((u) => {
          if (u?.uid) {
            this.performUpdate(u.uid, updates);
          } else {
            this.modalService.alert('Session expired. Please login again.', 'Error');
            this.isSaving = false;
          }
        })
        .unsubscribe();
      return;
    }

    this.performUpdate(userId, updates);
  }

  private performUpdate(userId: string, updates: any) {
    this.api.updateUser(userId, updates).subscribe({
      next: (res: any) => {
        this.saved = true;
        this.isSaving = false;
        this.user = { ...this.user, ...updates };
        this.editingSection = null;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.saved = false;
          if (this.returnUrl) {
            this.router.navigateByUrl(this.returnUrl);
          }
        }, 1500);
      },
      error: (err: any) => {
        this.isSaving = false;
        console.error('Failed to update profile:', err);
        this.modalService.alert(
          'Failed to save profile. ' + (err.error?.message || err.message),
          'Error',
        );
      },
    });
  }
}
