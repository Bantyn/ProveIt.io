import { Component, AfterViewInit, inject, ChangeDetectorRef } from '@angular/core';
import { ModalService } from '../../../services/modal.service';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { firstValueFrom } from 'rxjs';
import gsap from 'gsap';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass, NgIf } from '@angular/common';
import { MorphLoading } from '../ui/morph-loading/morph-loading';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, NgClass, MorphLoading],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements AfterViewInit {
  api = inject(ApiService);
  modalService = inject(ModalService);
  cdr = inject(ChangeDetectorRef);
  forgotMode = false;
  otpSent = false;
  otpVerified = false;
  loading = false;

  forgotForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    otp: new FormControl('', {}),
    newPassword: new FormControl('', {}),
  });

  constructor(public auth: AuthService) {}
  toggleForm() {
    this.auth.loginForm = false;
    this.auth.regForm = true;
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

  back() {
    window.location.href = '/';
  }

  loginForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {}),
  });

  isInvalid(field: string) {
    const control = this.loginForm.get(field);
    return control?.invalid && control?.touched;
  }

  isEmailInvalid() {
    const control = this.loginForm.get('email');
    return control?.invalid && (control?.touched || control?.dirty);
  }
  isPasswordInvalid() {
    const control = this.loginForm.get('password');
    return control?.invalid && (control?.touched || control?.dirty);
  }
  async onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    try {
      await this.auth.loginUser(
        this.loginForm.value.email || '',
        this.loginForm.value.password || '',
      );
    } catch (err) {
      this.modalService.alert('Invalid login credentials.', 'Login Failed');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async loginWithGoogle() {
    this.loading = true;
    try {
      await this.auth.loginWithGoogle();
    } catch (err) {
      this.modalService.alert('Google login failed.', 'Login Failed');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ── Forgot Password Methods ──
  toggleForgotMode() {
    this.forgotMode = !this.forgotMode;
    this.otpSent = false;
    this.otpVerified = false;
    this.forgotForm.reset();
  }

  async sendOtp() {
    const email = this.forgotForm.get('email')?.value;
    if (!email) return;

    this.loading = true;
    try {
      await firstValueFrom(this.api.sendPasswordResetOtp(email));
      this.otpSent = true;
      this.otpVerified = false;
      this.modalService.alert('OTP sent to ' + email, 'OTP Sent');
    } catch (err: any) {
      this.modalService.alert(
        'Failed to send OTP: ' + (err.error?.error || 'Unknown error'),
        'Error',
      );
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async verifyOtp() {
    const { email, otp } = this.forgotForm.value;
    if (!email || !otp) return;

    this.loading = true;
    try {
      await firstValueFrom(this.api.verifyPasswordResetOtp(email, otp));
      this.otpVerified = true;
    } catch (err: any) {
      this.modalService.alert(
        'Failed to verify OTP: ' + (err.error?.error || 'Unknown error'),
        'Error',
      );
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async resetPassword() {
    const { email, otp, newPassword } = this.forgotForm.value;
    if (!email || !otp || !newPassword) return;

    this.loading = true;
    try {
      await firstValueFrom(this.api.resetPasswordWithOtp(email, otp, newPassword));
      await this.modalService.alert('Password reset successfully. Please sign in.', 'Success');
      this.toggleForgotMode();
    } catch (err: any) {
      this.modalService.alert(
        'Failed to reset password: ' + (err.error?.error || 'Unknown error'),
        'Error',
      );
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}
