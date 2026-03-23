import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { AuthService } from '../../../../services/auth.service';
import { NgFor, NgIf, NgClass, DecimalPipe, DatePipe } from '@angular/common';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-company-reviews',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, DecimalPipe, DatePipe],
  templateUrl: './reviews.html',
  styleUrl: './reviews.css',
})
export class CompanyReviews implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  reviews: any[] = [];
  averageRating: number = 0;
  reviewCount: number = 0;
  isLoading = true;
  companyId: string = '';

  ngOnInit() {
    this.auth.user$.pipe(take(1)).subscribe((user) => {
      if (user) {
        this.api.getCompanyByOwnerId(user.uid).subscribe((company) => {
          if (company) {
            this.companyId = company.id;
            this.averageRating = company.averageRating || 0;
            this.reviewCount = company.reviewCount || 0;
            this.loadReviews(company.id);
          } else {
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        });
      } else {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadReviews(companyId: string) {
    this.api.getCompanyReviews(companyId).subscribe({
      next: (data) => {
        this.reviews = data || [];
        this.reviewCount = this.reviews.length;
        if (this.reviews.length) {
          const sum = this.reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
          this.averageRating = Math.round((sum / this.reviews.length) * 10) / 10;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading reviews:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  reviewCountForStar(star: number): number {
    return this.reviews.filter((r) => Math.round(r.rating) === star).length;
  }

  starBarWidth(star: number): string {
    if (!this.reviews.length) return '0%';
    return `${Math.round((this.reviewCountForStar(star) / this.reviews.length) * 100)}%`;
  }

  get starArray() {
    return [1, 2, 3, 4, 5];
  }
}
