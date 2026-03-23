import { Component, inject } from '@angular/core';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-feedback',
  imports: [Navbar, Footer, FormsModule, NgIf],
  templateUrl: './feedback.html',
  styleUrl: './feedback.css',
})
export class Feedback {
  private api = inject(ApiService);

  form = {
    firstName: '',
    lastName: '',
    email: '',
    subject: '',
    message: '',
  };

  isSubmitting = false;
  submitMessage = '';
  submitState: 'idle' | 'success' | 'error' = 'idle';

  submitContactForm() {
    if (
      !this.form.firstName.trim() ||
      !this.form.email.trim() ||
      !this.form.subject.trim() ||
      !this.form.message.trim()
    ) {
      this.submitState = 'error';
      this.submitMessage = 'Please fill in the required contact details first.';
      return;
    }

    this.isSubmitting = true;
    this.submitState = 'idle';
    this.submitMessage = '';

    const payload = {
      name: `${this.form.firstName} ${this.form.lastName}`.trim(),
      email: this.form.email.trim(),
      subject: this.form.subject.trim(),
      message: this.form.message.trim(),
      source: 'contact',
      priority: 'medium',
    };

    this.api.createSupportTicket(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitState = 'success';
        this.submitMessage = 'Your message has been sent to the admin support desk.';
        this.form = {
          firstName: '',
          lastName: '',
          email: '',
          subject: '',
          message: '',
        };
      },
      error: () => {
        this.isSubmitting = false;
        this.submitState = 'error';
        this.submitMessage = 'We could not send your message right now. Please try again.';
      },
    });
  }
}
