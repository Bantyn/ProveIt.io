import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { ModalService } from '../../../../services/modal.service';
import {
  NgFor,
  NgClass,
  NgIf,
  NgStyle,
  TitleCasePipe,
  DecimalPipe,
  SlicePipe,
} from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-billing',
  standalone: true,
  imports: [NgFor, NgClass, NgIf, NgStyle, TitleCasePipe, DecimalPipe, FormsModule],
  templateUrl: './billing.html',
})
export class AdminBilling implements OnInit {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
  private modal = inject(ModalService);
  private router = inject(Router);

  plans: any[] = [];
  transactions: any[] = [];
  stats: any = {
    totalRevenue: 0,
    activeSubscriptions: 0,
    refundsIssued: 0,
    totalTransactions: 0,
  };

  ngOnInit() {
    this.fetchBillingData();
  }

  fetchBillingData() {
    this.api.getAdminStats().subscribe({
      next: (data) => {
        this.stats = {
          totalRevenue: data.totalRevenue || 0,
          activeSubscriptions: data.activeSubscriptions || 0,
          refundsIssued: data.refundsIssued || 0,
          totalTransactions: data.totalTransactions || 0,
        };
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching admin stats:', err),
    });

    this.api.getAdminPayments().subscribe({
      next: (data) => {
        this.transactions = (data || []).map((p: any) => {
          const cid = String(p.companyId || 'NA');
          return {
            ...p,
            companyIdInitials: cid.slice(0, 2).toUpperCase(),
            description: p.description || 'Plan Upgrade',
            method: p.method || 'UPI',
            date: p.date || p.createdAt || 'N/A',
          };
        });
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching admin payments:', err),
    });

    this.api.getAdminPlans().subscribe({
      next: (data) => {
        this.plans = data || []; // Removed .slice(0,3)
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching admin plans:', err),
    });
  }

  /** Navigate to the Edit Plan dedicated page */
  openEditPlan(plan: any) {
    if (!plan?.id) {
      this.modal.alert('Plan ID not found. Please refresh the page.', 'Error');
      return;
    }
    this.router.navigate(['/admin/billing/edit', plan.id]);
  }

  processRefund(transaction: any) {
    transaction.status = 'refunded';
    this.cdr.detectChanges();
  }

  /** Convert nested features object → readable string list for card display */
  getFeaturesList(plan: any): string[] {
    if (!plan || !plan.features) return [];
    if (Array.isArray(plan.features)) return plan.features;

    const list: string[] = [];
    const comps = plan.features.competitions || {};
    const interviews = plan.features.interviews || {};
    const analytics = plan.features.analytics || {};
    const branding = plan.features.branding || {};
    const ai = plan.features.ai || {};
    const messaging = plan.features.messaging || {};
    const support = plan.features.support || {};

    if (comps.maxCompetitionsPerMonth >= 999999) list.push('Unlimited Competitions/mo');
    else if (comps.maxCompetitionsPerMonth) list.push(`${comps.maxCompetitionsPerMonth} Competitions/mo`);

    if (comps.maxApplicationsPerCompetition >= 999999) list.push('Unlimited Candidates/competition');
    else if (comps.maxApplicationsPerCompetition) list.push(`${comps.maxApplicationsPerCompetition} Candidates/competition`);

    if (comps.maxShortlistedPerCompetition >= 999999 || comps.maxShortlistedPerCompetition === -1) list.push('Unlimited Shortlisting');
    else if (comps.maxShortlistedPerCompetition) list.push(`Shortlist up to ${comps.maxShortlistedPerCompetition}`);

    if (interviews.enabled) list.push(`Interviews (${interviews.maxRoundsPerApplication || 1} rounds)`);
    if (analytics.advancedAnalytics) list.push('Advanced Analytics');
    if (analytics.leaderboardAccess) list.push('Leaderboard Access');
    if (branding.brandingCustomization) list.push('Custom Branding');
    if (ai.chatbotSupport) list.push('AI Chatbot Support');
    if (messaging.enabled) list.push('Messaging');
    if (support.prioritySupport) list.push('Priority Support');

    return list;
  }
}
