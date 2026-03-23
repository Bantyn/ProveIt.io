import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { NgFor, NgClass, NgIf, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-faq-testimonials',
  standalone: true,
  imports: [NgFor, NgClass, NgIf, UpperCasePipe, FormsModule],
  templateUrl: './faq-testimonials.html',
})
export class AdminFaqTestimonials implements OnInit {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
  faqs: any[] = [];
  testimonials: any[] = [];
  searchTerm = '';

  ngOnInit() {
    this.api.getFaqs().subscribe({
      next: (data) => {
        this.faqs = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.cdr.detectChanges();
      },
    });
    this.api.getTestimonials().subscribe({
      next: (data) => {
        this.testimonials = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.cdr.detectChanges();
      },
    });
  }

  get filteredFaqs() {
    return this.faqs.filter((f) => {
      return (
        !this.searchTerm ||
        f.question?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        f.category?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    });
  }

  getStars(n: number) {
    return new Array(n || 5);
  }
}
