import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { NgFor, NgIf, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-plans',
  standalone: true,
  imports: [NgFor, NgIf, DecimalPipe, RouterLink],
  templateUrl: './plans.html',
})
export class AdminPlans implements OnInit {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
  
  plans: any[] = [];
  loading = false;

  ngOnInit() {
    this.fetchPlans();
  }

  fetchPlans() {
    this.loading = true;
    this.api.getAdminPlans().subscribe({
      next: (data) => {
        this.plans = data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching admin plans:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getFeaturesCount(plan: any): number {
    if (!plan || !plan.features) return 0;
    // Basic count of enabled features
    return 5; // Fallback or logic to count
  }
}
