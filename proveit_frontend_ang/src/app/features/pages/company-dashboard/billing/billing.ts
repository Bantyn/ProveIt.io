import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { DummyDataService } from '../../../../services/dummy-data.service';
import { NgIf } from '@angular/common';
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

declare var Razorpay: any;

@Component({
  selector: 'app-company-billing',
  standalone: true,
  imports: [
    NgIf,
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

  // Upgrade Flow State
  showUpgradeConfirmModal = false;
  processingPayment = false;
  selectedPlan: any = null;

  features: PricingFeature[] = [];
  pricingPlans: PricingPlan[] = [];

  handlePlanSelected(level: PlanLevel) {
    const matchedPlan = this.plans.find((p) => p.name.toLowerCase() === level.toLowerCase());
    if (matchedPlan) {
      this.upgrade(matchedPlan);
    } else {
      console.warn('No matching plan found for level:', level);
    }
  }

  ngOnInit() {
    this.api.getPlans().subscribe({
      next: (apiPlans) => {
        this.plans = apiPlans || [];

        this.pricingPlans = this.plans.map((p) => ({
          id: p.id,
          name: p.name,
          level: p.name.toLowerCase() as PlanLevel,
          price: {
            monthly: p.priceMonthly ?? p.price ?? 0,
          },
          popular: p.popular || (p.name.toUpperCase() === 'GROWTH'),
          description: p.description || '',
        }));

        this.buildDynamicFeatures();
        this.loadProfileAndSync();
      },
      error: (err) => {
        console.error('Error fetching plans:', err);
        this.cdr.detectChanges();
      }
    });
  }

  private buildDynamicFeatures() {
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

              const activePlanName = (profile.plan || 'Starter').toUpperCase();
              this.current =
                this.plans.find((p) => p.name.toUpperCase() === activePlanName) ||
                this.plans[0];

              this.api.getCompanySubscription(profile.id).subscribe((sub) => {
                const start = sub?.startDate || sub?.validFrom || profile.createdAt;
                const end = sub?.endDate || sub?.validTo || (profile.updatedAt
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

    // Free plans don't need payment
    const price = plan.priceMonthly ?? plan.price ?? 0;
    if (price === 0) {
      this.modalService.alert('This is a free plan. You are already on it or can switch directly.', 'Free Plan');
      return;
    }

    this.selectedPlan = plan;
    this.showUpgradeConfirmModal = true;
    this.cdr.detectChanges();
  }

  confirmUpgrade() {
    if (!this.selectedPlan || !this.companyProfile?.id) return;

    const amount = this.selectedPlan.priceMonthly ?? this.selectedPlan.price ?? 0;
    if (amount <= 0) return;

    this.showUpgradeConfirmModal = false;
    this.processingPayment = true;
    this.cdr.detectChanges();

    // Step 1: Create Razorpay order on backend
    this.api.createRazorpayOrder({
      amount,
      planName: this.selectedPlan.name,
      companyId: this.companyProfile.id,
      companyName: this.companyProfile.name || this.companyProfile.companyName,
    }).subscribe({
      next: (order) => {
        this.processingPayment = false;
        this.cdr.detectChanges();

        // Step 2: Open Razorpay checkout
        this.openRazorpayCheckout(order);
      },
      error: (err) => {
        this.processingPayment = false;
        this.cdr.detectChanges();
        console.error('Create order failed:', err);
        this.modalService.alert(
          'Failed to initiate payment. Please try again.\n' + (err.error?.error || err.message),
          'Payment Error'
        );
      },
    });
  }

  private openRazorpayCheckout(order: any) {
    const options = {
      key: order.keyId,
      amount: order.amount,
      currency: order.currency || 'INR',
      name: 'ProveIt.io',
      description: `${this.selectedPlan.name} Plan Subscription`,
      order_id: order.orderId,
      prefill: {
        email: this.userEmail,
        contact: '',
      },
      theme: {
        color: '#7a6cf0', // --dd-blue-dark
      },
      handler: (response: any) => {
        // Step 3: Verify payment on backend
        this.verifyPayment(response);
      },
      modal: {
        ondismiss: () => {
          this.modalService.alert('Payment was cancelled.', 'Payment Cancelled');
        },
      },
    };

    try {
      const rzp = new Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        console.error('Razorpay payment failed:', response.error);
        this.modalService.alert(
          `Payment failed: ${response.error.description || 'Unknown error'}`,
          'Payment Failed'
        );
      });
      rzp.open();
    } catch (err) {
      console.error('Razorpay open error:', err);
      this.modalService.alert(
        'Could not open payment gateway. Please check your internet connection and try again.',
        'Error'
      );
    }
  }

  private verifyPayment(response: any) {
    this.processingPayment = true;
    this.cdr.detectChanges();

    const amount = this.selectedPlan.priceMonthly ?? this.selectedPlan.price ?? 0;

    this.api.verifyRazorpayPayment({
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature,
      companyId: this.companyProfile.id,
      planName: this.selectedPlan.name,
      amount,
    }).subscribe({
      next: (res) => {
        this.processingPayment = false;

        // Update local UI state
        if (this.companyProfile) this.companyProfile.plan = res.newPlan;
        this.current = this.selectedPlan;

        // Re-fetch subscription and payments to update UI tables
        this.api.getCompanySubscription(this.companyProfile.id).subscribe((sub) => {
          if (sub) {
            this.sub = {
              ...sub,
              status: sub.status || 'ACTIVE',
              startDate: sub.validFrom ? new Date(sub.validFrom).toLocaleDateString() : 'N/A',
              endDate: sub.validTo ? new Date(sub.validTo).toLocaleDateString() : 'N/A',
            };
          }
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
          `Successfully upgraded to the ${res.newPlan} plan! Payment ID: ${res.paymentId}`,
          'Upgrade Successful',
        );
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.processingPayment = false;
        this.cdr.detectChanges();
        this.modalService.alert(
          'Payment was received but verification failed. Please contact support with your payment ID.\n' +
          (err.error?.error || err.message),
          'Verification Error',
        );
      },
    });
  }
}
