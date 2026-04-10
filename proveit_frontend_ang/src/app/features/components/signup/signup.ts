import { Component, AfterViewInit, OnInit, inject } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { ModalService } from '../../../services/modal.service';
import gsap from 'gsap';
import { ReactiveFormsModule, FormControl, Validators, FormGroup } from '@angular/forms';
import { NgClass, NgIf } from '@angular/common';
import { MorphLoading } from '../ui/morph-loading/morph-loading';
import {
  AuthModeOption,
  AuthModeSwitcher,
} from '../ui/auth-mode-switcher/auth-mode-switcher';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, NgClass, MorphLoading, AuthModeSwitcher],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup implements AfterViewInit, OnInit {
  modalService = inject(ModalService);
  roleOptions: AuthModeOption[] = [
    { value: 'candidate', label: 'Candidate', icon: 'bi bi-person' },
    { value: 'company', label: 'Company', icon: 'bi bi-building' },
  ];

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    this.signupForm.get('role')?.valueChanges.subscribe((role) => {
      const usernameControl = this.signupForm.get('username');
      if (role === 'candidate') {
        usernameControl?.setValidators([
          Validators.required,
          Validators.minLength(3),
          Validators.pattern(/^[a-zA-Z0-9_]+$/),
        ]);
      } else {
        usernameControl?.setValidators([Validators.required, Validators.minLength(2)]);
      }
      usernameControl?.updateValueAndValidity();
    });

    // Trigger initial validation
    this.signupForm.get('role')?.updateValueAndValidity({ emitEvent: true });
  }

  ngAfterViewInit(): void {
    gsap.from('.auth-item', {
      opacity: 0,
      y: 24,
      duration: 0.8,
      ease: 'power3.out',
      stagger: 0.12,
    });
  }

  toggleForm() {
    this.auth.loginForm = true;
    this.auth.regForm = false;
  }

  showData = false;
  loading = false;
  signupForm = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),

    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),

    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
    role: new FormControl('candidate', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  isInvalid(field: string) {
    const control = this.signupForm.get(field);
    return control?.invalid && control?.touched;
  }
  isUsernameInvalid() {
    const control = this.signupForm.get('username');
    return control?.invalid && (control?.touched || control?.dirty);
  }
  isEmailInvalid() {
    const control = this.signupForm.get('email');
    return control?.invalid && (control?.touched || control?.dirty);
  }
  isPasswordInvalid() {
    const control = this.signupForm.get('password');
    return control?.invalid && (control?.touched || control?.dirty);
  }

  getErrorMessage(controlName: string) {
    const control = this.signupForm.get(controlName);
    if (!control?.hasError('required')) {
    }
  }
  async onSubmit() {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    try {
      await this.auth.registerUser(
        this.signupForm.value.email || '',
        this.signupForm.value.password || '',
        this.signupForm.value.username || '',
        this.signupForm.value.role || 'candidate',
      );
      this.showData = true;
    } catch (err) {
      this.modalService.alert('Registration failed. Please try again.', 'Error');
    } finally {
      this.loading = false;
    }
  }
  back() {
    window.location.href = '/';
  }

  get activeRole() {
    return this.signupForm.get('role')?.value || 'candidate';
  }

  setActiveRole(role: string) {
    this.signupForm.get('role')?.setValue(role);
    this.signupForm.get('role')?.markAsDirty();
    this.signupForm.get('role')?.updateValueAndValidity();
  }
}
