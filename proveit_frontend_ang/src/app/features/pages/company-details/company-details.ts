import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { firstValueFrom } from 'rxjs';
import { MorphLoading } from '../../components/ui/morph-loading/morph-loading';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-company-details',
  standalone: true,
  imports: [
    CommonModule,
    Navbar,
    Footer,
    RouterLink,
    DatePipe,
    FormsModule,
    MorphLoading,
  ],
  templateUrl: './company-details.html',
  styleUrl: './company-details.css',
})
export class CompanyDetails implements OnInit {
  companyId: string | null = null;
  company: any = null;
  competitions: any[] = [];
  reviews: any[] = [];
  isLoading: boolean = true;
  activeTab: 'about' | 'jobs' | 'details' | 'contact' = 'about';

  // Modal state
  showReviewModal: boolean = false;
  newRating: number = 0;
  hoveredRating: number = 0;
  newReviewText: string = '';
  reviewSubmitted: boolean = false;
  isSubmitting: boolean = false;
  submitError: string = '';
  selectedCompetitionId: string = '';

  // Current logged-in user
  private currentUser: any = null;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.companyId = this.route.snapshot.paramMap.get('id');

    // Capture the auth user
    this.auth.user$.pipe(take(1)).subscribe((user) => {
      this.currentUser = user;
    });

    if (this.companyId) {
      this.fetchCompanyDetails(this.companyId);
      this.fetchCompanyCompetitions(this.companyId);
      this.fetchCompanyReviews(this.companyId);
    } else {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  fetchCompanyDetails(id: string) {
    this.api.getCompany(id).subscribe({
      next: (data) => {
        this.company = data;
        this.checkLoadingState();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Could not load company details', err);
        this.checkLoadingState();
        this.cdr.detectChanges();
      },
    });
  }

  fetchCompanyCompetitions(id: string) {
    this.api.getCompanyCompetitions(id).subscribe({
      next: (data) => {
        this.competitions = data || [];
        this.checkLoadingState();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Could not load company competitions', err);
        this.checkLoadingState();
        this.cdr.detectChanges();
      },
    });
  }

  fetchCompanyReviews(id: string) {
    this.api.getCompanyReviews(id).subscribe({
      next: (data) => {
        this.reviews = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Could not load reviews', err);
        this.cdr.detectChanges();
      },
    });
  }

  checkLoadingState() {
    this.isLoading = false;
  }

  setActiveTab(tab: 'about' | 'jobs' | 'details' | 'contact') {
    this.activeTab = tab;
  }

  openReviewModal() {
    this.showReviewModal = true;
    this.newRating = 0;
    this.hoveredRating = 0;
    this.newReviewText = '';
    this.reviewSubmitted = false;
    this.isSubmitting = false;
    this.submitError = '';
    this.selectedCompetitionId = '';
  }

  closeReviewModal() {
    this.showReviewModal = false;
  }

  onRatingChange(rating: number) {
    this.newRating = rating;
  }

  async submitReview() {
    if (!this.newRating || this.isSubmitting) return;

    // Guard: must be logged in
    if (!this.currentUser) {
      this.submitError = 'Please log in to submit a review.';
      this.cdr.detectChanges();
      return;
    }

    this.isSubmitting = true;
    this.submitError = '';

    const selectedComp = this.competitions.find(c => c.id === this.selectedCompetitionId);

    const payload = {
      authorId: this.currentUser.uid,
      authorName: this.currentUser.displayName || this.currentUser.email || 'User',
      rating: this.newRating,
      comment: this.newReviewText.trim(),
      competitionId: this.selectedCompetitionId || null,
      competitionName: selectedComp ? (selectedComp.title || selectedComp.name) : null,
    };

    try {
      const result = await firstValueFrom(this.api.submitCompanyReview(this.companyId!, payload));

      // Update local averageRating & reviewCount from server response
      if (this.company) {
        this.company.averageRating = result.averageRating;
        this.company.reviewCount = result.reviewCount;
      }

      // Reload all reviews to get the freshly persisted list
      this.fetchCompanyReviews(this.companyId!);

      this.reviewSubmitted = true;
      setTimeout(() => this.closeReviewModal(), 1800);
    } catch (err: any) {
      const msg = err?.error?.error || 'Failed to submit review. Please try again.';
      this.submitError = msg;
    } finally {
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  /* ── Star-bar helpers ─────────────────────────────────────── */
  /** Returns the count of reviews at a given star level */
  reviewCountForStar(star: number): number {
    return this.reviews.filter((r) => Math.round(r.rating) === star).length;
  }

  /** Returns the bar width percentage for a given star level */
  starBarWidth(star: number): string {
    if (!this.reviews.length) return '0%';
    const pct = (this.reviewCountForStar(star) / this.reviews.length) * 100;
    return `${Math.round(pct)}%`;
  }
}
