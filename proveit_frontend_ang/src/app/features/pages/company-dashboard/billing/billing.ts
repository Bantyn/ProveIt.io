import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { DummyDataService } from '../../../../services/dummy-data.service';
import { NgFor, NgClass, NgIf, TitleCasePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { ApiService } from '../../../../services/api.service';
import { ModalService } from '../../../../services/modal.service';
import { MorphLoading } from '../../../../features/components/ui/morph-loading/morph-loading';
import { take } from 'rxjs/operators';
import {
  PricingTable,
  PricingFeature,
  PricingPlan,
  PlanLevel,
} from '../../../components/ui/pricing-table/pricing-table';

@Component({
  selector: 'app-company-billing',
  standalone: true,
  imports: [
    NgFor,
    NgClass,
    NgIf,
    TitleCasePipe,
    DecimalPipe,
    FormsModule,
    MorphLoading,
    PricingTable,
  ],
  templateUrl: './billing.html',
  styleUrl: './billing.css',
})
export class CompanyBilling implements OnInit {
  public data = inject(DummyDataService);
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);

  userId: string = '';
  userEmail: string = '';
  companyProfile: any = null;

  plans: any[] = [];
  payments: any[] = [];
  sub: any = {};
  current: any = {};

  // OTP Flow State
  showUpgradeConfirmModal = false;
  showOtpModal = false;
  verifying = false;
  requestingOtp = false;
  otpValue = '';
  selectedPlan: any = null;

  features: PricingFeature[] = [];

  pricingPlans: PricingPlan[] = [];

  handlePlanSelected(level: PlanLevel) {
    // Search for plan matching the level dynamically
    const matchedPlan = this.plans.find((p) => p.name.toLowerCase() === level.toLowerCase());
    
    if (matchedPlan) {
      this.upgrade(matchedPlan);
    } else {
      console.warn('No matching plan found for level:', level);
    }
  }

  ngOnInit() {
    // 1. Fetch plans dynamically from backend API
    this.api.getPlans().subscribe({
      next: (apiPlans) => {
        this.plans = apiPlans || [];

        // 2. Map backend plans to PricingPlan interface
        this.pricingPlans = this.plans.map((p) => ({
          id: p.id,
          name: p.name,
          level: p.name.toLowerCase() as PlanLevel,
          price: {
            monthly: p.priceMonthly ?? p.price ?? 0, // Admin uses priceMonthly, defaults use price
          },
          popular: p.popular || (p.name.toUpperCase() === 'GROWTH'),
          description: p.description || '',
        }));

        // 3. Populate features dynamically based on what's enabled in any plan
        this.buildDynamicFeatures();

        // 4. Sync current plan once user profile is loaded
        this.loadProfileAndSync();
      },
      error: (err) => {
        console.error('Error fetching plans:', err);
        this.cdr.detectChanges();
      }
    });
  }

  private buildDynamicFeatures() {
    // 1. Initial list of features we expect
    const standardFeatures = [
      { name: 'Monthly Competitions', key: 'competitions.maxCompetitionsPerMonth' },
      { name: 'Active Competitions', key: 'competitions.maxActiveCompetitions' },
      { name: 'Candidate Applications', key: 'competitions.maxApplicationsPerCompetition' },
      { name: 'Candidate Shortlisting', key: 'competitions.maxShortlistedPerCompetition' },
      { name: 'Interview Scheduling', key: 'interviews.enabled' },
      { name: 'Advanced Analytics', key: 'analytics.advancedAnalytics' },
      { name: 'Leaderboard Access', key: 'analytics.leaderboardAccess' },
      { name: 'Custom Branding', key: 'branding.brandingCustomization' },
      { name: 'AI Chatbot Support', key: 'ai.chatbotSupport' },
      { name: 'Hiring Pipeline', key: 'pipeline.enabled' },
      { name: 'Messaging (Candidates)', key: 'messaging.enabled' },
      { name: 'Priority Support', key: 'support.prioritySupport' },
    ];

    const dynamicFeatures: PricingFeature[] = [];

    standardFeatures.forEach(feat => {
      // Find FIRST plan that has this feature enabled
      const firstPlan = this.plans.find(p => {
        const keys = feat.key.split('.');
        let val = p.features;
        for (const k of keys) {
          val = val?.[k];
        }
        return !!val && val !== 0;
      });

      if (firstPlan) {
        dynamicFeatures.push({
          name: feat.name,
          included: firstPlan.name.toLowerCase()
        });
      }
    });

    // 2. Fallback if no features were found (ensures table is never empty)
    if (dynamicFeatures.length === 0) {
      this.features = [
        { name: 'Competitions Access', included: 'starter' },
        { name: 'Member Support', included: 'starter' },
        { name: 'Basic Analytics', included: 'starter' },
        { name: 'Advanced Tools', included: 'growth' },
        { name: 'Full Branding', included: 'elite' },
      ];
    } else {
      this.features = dynamicFeatures;
    }

    this.cdr.detectChanges();
  }

  private loadProfileAndSync() {
    this.auth.user$.pipe(take(1)).subscribe((user) => {
      if (user) {
        this.userId = user.uid;
        this.userEmail = user.email || '';

        this.api.getCompanyByOwnerId(this.userId).subscribe({
          next: (profile) => {
            if (profile) {
              this.companyProfile = profile;

              // Resolve active plan dynamically from the fetched plans
              const activePlanName = (profile.plan || 'Starter').toUpperCase();
              this.current =
                this.plans.find((p) => p.name.toUpperCase() === activePlanName) ||
                this.plans[0];

              // Fetch real subscription
              this.api.getCompanySubscription(profile.id).subscribe((sub) => {
                const start = sub?.startDate || profile.createdAt;
                const end = sub?.endDate || (profile.updatedAt
                    ? new Date(new Date(profile.updatedAt).setMonth(new Date(profile.updatedAt).getMonth() + 1)).toISOString()
                    : 'N/A');

                this.sub = {
                  ...(sub || {}),
                  status: sub?.status || 'ACTIVE',
                  startDate: start !== 'N/A' ? new Date(start).toLocaleDateString() : 'N/A',
                  endDate: end !== 'N/A' ? new Date(end).toLocaleDateString() : 'N/A',
                };
                this.cdr.detectChanges();
              });

              // Fetch real payments
              this.api.getCompanyPayments(profile.id).subscribe((payments) => {
                this.payments = (payments || []).map((p: any) => ({
                  ...p,
                  description: p.description || p.desc || p.planName || 'Plan Upgrade',
                  date: p.date || p.createdAt || p.updatedAt || 'N/A'
                }));
                this.cdr.detectChanges();
              });

              this.cdr.detectChanges();
            }
          },
          error: (err) => {
            console.error('Error fetching profile:', err);
            this.cdr.detectChanges();
          },
        });
      }
    });
  }

  upgrade(plan: any) {
    if (!this.userEmail) {
      this.modalService.alert('Error: User email not found', 'Email Error');
      return;
    }
    this.selectedPlan = plan;
    this.showUpgradeConfirmModal = true;
    this.cdr.detectChanges();
  }

  confirmUpgrade() {
    this.showUpgradeConfirmModal = false;
    this.requestingOtp = true;

    // Request OTP from backend
    this.api.requestPlanChangeOtp(this.userEmail).subscribe({
      next: () => {
        this.requestingOtp = false;
        this.otpValue = '';
        this.showOtpModal = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.requestingOtp = false;
        this.modalService.alert('Failed to request OTP: ' + err.message, 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  verifyOtpAndUpgrade() {
    if (!this.otpValue || this.otpValue.length !== 6) {
      this.modalService.alert('Please enter a valid 6-digit OTP.', 'Verification Failed');
      return;
    }
    if (!this.companyProfile?.id || !this.selectedPlan) return;

    this.verifying = true;

    const payload = {
      email: this.userEmail,
      otp: this.otpValue,
      companyId: this.companyProfile.id,
      newPlan: this.selectedPlan.name,
    };

    this.api.verifyPlanChangeOtp(payload).subscribe({
      next: (res) => {
        this.verifying = false;
        this.showOtpModal = false;

        // Update local UI state safely
        if (this.companyProfile) this.companyProfile.plan = res.newPlan;
        this.current = this.selectedPlan;

        // Re-fetch subscription and payments to update UI tables
        this.api.getCompanySubscription(this.companyProfile.id).subscribe((sub) => {
          if (sub) this.sub = sub;
          this.cdr.detectChanges();
        });
        this.api.getCompanyPayments(this.companyProfile.id).subscribe((payments) => {
          this.payments = (payments || []).map((p: any) => ({
            ...p,
            description: p.description || p.desc || p.planName || 'Plan Upgrade',
            date: p.date || p.createdAt || p.updatedAt || 'N/A'
          }));
          this.cdr.detectChanges();
        });

        this.modalService.alert(
          `Successfully upgraded to the ${res.newPlan} plan!`,
          'Upgrade Successful',
        );
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.verifying = false;
        this.modalService.alert(
          'OTP Verification Failed: ' + (err.error?.error || err.message),
          'Error',
        );
        this.cdr.detectChanges();
      },
    });
  }
}
