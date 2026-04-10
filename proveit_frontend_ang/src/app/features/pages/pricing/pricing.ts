import { Component, OnInit, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { ApiService } from '../../../services/api.service';
import { FaqAccordion, FaqItem } from '../../components/faq-accordion/faq-accordion';
import { ShaderHeroComponent } from '../../components/ui/shader-hero/shader-hero';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, Navbar, Footer, FaqAccordion, ShaderHeroComponent],
  templateUrl: './pricing.html',
  styleUrl: './pricing.css',
})
export class Pricing implements OnInit {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  plans: any[] = [];
  loading = true;

  howItWorksItems: FaqItem[] = [
    {
      question: 'How does the billing work?',
      answer: 'We offer flexible monthly and annual plans. You can upgrade, downgrade, or cancel your subscription at any time from your billing dashboard.',
      meta: 'Billing'
    },
    {
      question: 'Can I change my plan later?',
      answer: 'Yes, you can easily switch plans. Prorated charges or credits will be applied automatically if you upgrade or downgrade mid-cycle.',
      meta: 'Plans'
    },
    {
      question: 'Do you offer custom enterprise plans?',
      answer: 'Absolutely. If you have high-volume hiring needs, contact our sales team to build a custom Elite plan tailored to your organization.',
      meta: 'Enterprise'
    }
  ];

  ngOnInit() {
    this.api.getPlans().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.plans = (data || []).map((plan: any, i: number) => this.mapPlan(plan, i));
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.plans = this.fallbackPlans;
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  /** Convert DB plan structure → display-friendly object */
  mapPlan(plan: any, index: number) {
    const f = plan.features || {};
    const comps = f.competitions || {};
    const interviews = f.interviews || {};
    const analytics = f.analytics || {};
    const branding = f.branding || {};
    const ai = f.ai || {};
    const pipeline = f.pipeline || {};
    const msg = f.messaging || {};
    const support = f.support || {};

    const features: string[] = [];

    // Competitions
    if (comps.maxCompetitionsPerMonth >= 999999) features.push('Unlimited competitions/month');
    else if (comps.maxCompetitionsPerMonth) features.push(`${comps.maxCompetitionsPerMonth} competitions/month`);

    if (comps.maxActiveCompetitions >= 999999) features.push('Unlimited active competitions');
    else if (comps.maxActiveCompetitions) features.push(`Up to ${comps.maxActiveCompetitions} active competitions`);

    if (comps.maxApplicationsPerCompetition >= 999999) features.push('Unlimited candidates/competition');
    else if (comps.maxApplicationsPerCompetition) features.push(`${comps.maxApplicationsPerCompetition} candidates/competition`);

    if (comps.maxShortlistedPerCompetition >= 999999) features.push('Unlimited shortlisting');
    else if (comps.maxShortlistedPerCompetition) features.push(`Shortlist up to ${comps.maxShortlistedPerCompetition}`);

    // Interviews
    if (interviews.enabled) {
      features.push(`Interview rounds (${interviews.maxRoundsPerApplication || 1} max)`);
    }

    // Analytics
    if (analytics.advancedAnalytics) features.push('Advanced Analytics');
    if (analytics.leaderboardAccess) features.push('Leaderboard Access');

    // Branding & AI
    if (branding.brandingCustomization) features.push('Custom Branding');
    if (ai.chatbotSupport) features.push('AI Chatbot Support');
    if (pipeline.enabled) features.push('Hiring Pipeline');

    // Messaging
    if (msg.enabled) {
      const stage = msg.unlockStage === 'SHORTLISTED' ? 'shortlist' : msg.unlockStage === 'SUBMITTED' ? 'submission' : 'any';
      features.push(`Messaging (unlocks after ${stage})`);
      if (msg.maxActiveChats) features.push(`${msg.maxActiveChats} active chats`);
      if (msg.allowFileSharing) features.push('File sharing in chat');
    }

    // Support
    if (support.prioritySupport) features.push('Priority Support');

    const isMiddle = index === 1;
    const name = (plan.name || '').toUpperCase();
    const badges: Record<string, string> = {
      STARTER: 'For Individuals',
      GROWTH: 'Most Popular',
      ELITE: 'For Enterprises',
    };

    return {
      id: plan.id,
      name: plan.name,
      badge: badges[name] || plan.name,
      price: plan.priceMonthly ? `₹${plan.priceMonthly}` : 'Free',
      priceYearly: plan.priceYearly ? `₹${plan.priceYearly}` : null,
      period: '/ month',
      description: plan.description || 'Experience skill-based hiring.',
      buttonText: name === 'ELITE' ? 'Contact Sales' : 'Get Started',
      features,
      popular: isMiddle,
    };
  }

  // Static fallback if DB is unreachable
  fallbackPlans = [
    {
      name: 'Starter',
      badge: 'For Individuals',
      price: 'Free',
      period: '/ month',
      description: 'Perfect for getting started with skill verification.',
      buttonText: 'Get Started',
      features: ['2 competitions/month', '50 candidates/competition', 'Basic analytics'],
      popular: false,
    },
    {
      name: 'Growth',
      badge: 'Most Popular',
      price: '₹1200',
      period: '/ month',
      description: 'Scale your hiring with advanced tools.',
      buttonText: 'Get Started',
      features: ['10 competitions/month', '200 candidates/competition', 'Advanced Analytics', 'Leaderboard Access', 'Interviews'],
      popular: true,
    },
    {
      name: 'Elite',
      badge: 'For Enterprises',
      price: '₹2200',
      period: '/ month',
      description: 'Maximum power for large-scale talent acquisition.',
      buttonText: 'Contact Sales',
      features: ['Unlimited competitions', 'Unlimited candidates', 'Custom Branding', 'AI Chatbot', 'Priority Support'],
      popular: false,
    },
  ];
}
