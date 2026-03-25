import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../../../services/api.service';
import { ModalService } from '../../../../../services/modal.service';
import { MorphLoading } from '../../../../components/ui/morph-loading/morph-loading';
import {
  FluidDropdown,
  DropdownOption,
} from '../../../../components/ui/fluid-dropdown/fluid-dropdown';

@Component({
  selector: 'app-edit-plan',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, ReactiveFormsModule, RouterLink, FluidDropdown, MorphLoading],
  templateUrl: './edit-plan.html',
})
export class EditPlan implements OnInit {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
  private modal = inject(ModalService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  planId: string | null = null;
  loading = false;
  fetchingData = false;

  // Dropdown options
  messagingStageOptions: DropdownOption[] = [
    { value: 'NONE', label: 'Always Available', icon: 'bi bi-chat-dots-fill' },
    { value: 'SUBMITTED', label: 'After Submission', icon: 'bi bi-send-fill' },
    { value: 'SHORTLISTED', label: 'After Shortlisting', icon: 'bi bi-star-fill' },
  ];

  planNameOptions: DropdownOption[] = [
    { value: 'STARTER', label: 'Starter', icon: 'bi bi-rocket-takeoff' },
    { value: 'GROWTH', label: 'Growth', icon: 'bi bi-graph-up-arrow' },
    { value: 'ELITE', label: 'Elite', icon: 'bi bi-gem' },
  ];
  
  planStatusOptions: DropdownOption[] = [
    { value: true, label: 'Active', icon: 'bi bi-check-circle-fill' },
    { value: false, label: 'Inactive', icon: 'bi bi-x-circle-fill' }
  ];

  planForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    description: new FormControl(''),
    priceMonthly: new FormControl(0, [Validators.required, Validators.min(0)]),
    priceYearly: new FormControl(0),
    isActive: new FormControl(true),

    // Competitions
    maxCompetitionsPerMonth: new FormControl(2, [Validators.required, Validators.min(1)]),
    maxActiveCompetitions: new FormControl(1, [Validators.required, Validators.min(1)]),
    maxApplicationsPerCompetition: new FormControl(50, [Validators.required, Validators.min(1)]),
    maxShortlistedPerCompetition: new FormControl(5, [Validators.required, Validators.min(-1)]),

    // Interviews
    interviewsEnabled: new FormControl(false),
    maxRoundsPerApplication: new FormControl(1),

    // Feature toggles
    advancedAnalytics: new FormControl(false),
    leaderboardAccess: new FormControl(false),
    brandingCustomization: new FormControl(false),
    chatbotSupport: new FormControl(false),
    hiringPipelineEnabled: new FormControl(false),
    prioritySupport: new FormControl(false),

    // Messaging
    messagingEnabled: new FormControl(false),
    messagingUnlockStage: new FormControl('NONE'),
    maxActiveChats: new FormControl(0),
    allowFileSharing: new FormControl(false),
    maxAttachmentSizeMB: new FormControl(0),
  });

  ngOnInit() {
    this.planId = this.route.snapshot.paramMap.get('id');
    if (this.planId) {
      this.fetchingData = true;
      this.api.getAdminPlans().subscribe({
        next: (plans: any[]) => {
          const plan = (plans || []).find((p: any) => p.id === this.planId);
          if (plan) this.patchForm(plan);
          else this.modal.alert('Plan not found.', 'Error');
          this.fetchingData = false;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.fetchingData = false;
          this.modal.alert('Failed to load plan data.', 'Error');
          this.cdr.detectChanges();
        },
      });
    }
  }

  patchForm(plan: any) {
    const f = plan.features || {};
    const c = f.competitions || {};
    const i = f.interviews || {};
    const a = f.analytics || {};
    const b = f.branding || {};
    const ai = f.ai || {};
    const pipeline = f.pipeline || {};
    const m = f.messaging || {};
    const s = f.support || {};

    this.planForm.patchValue({
      name: plan.name || '',
      description: plan.description || '',
      priceMonthly: plan.priceMonthly ?? plan.price ?? 0,
      priceYearly: plan.priceYearly ?? 0,
      isActive: plan.isActive !== false,

      maxCompetitionsPerMonth: c.maxCompetitionsPerMonth ?? 2,
      maxActiveCompetitions: c.maxActiveCompetitions ?? 1,
      maxApplicationsPerCompetition: c.maxApplicationsPerCompetition ?? 50,
      maxShortlistedPerCompetition: c.maxShortlistedPerCompetition ?? 5,

      interviewsEnabled: i.enabled ?? false,
      maxRoundsPerApplication: i.maxRoundsPerApplication ?? 1,

      advancedAnalytics: a.advancedAnalytics ?? false,
      leaderboardAccess: a.leaderboardAccess ?? false,
      brandingCustomization: b.brandingCustomization ?? false,
      chatbotSupport: ai.chatbotSupport ?? false,
      hiringPipelineEnabled: pipeline.enabled ?? false,
      prioritySupport: s.prioritySupport ?? false,

      messagingEnabled: m.enabled ?? false,
      messagingUnlockStage: m.unlockStage ?? 'NONE',
      maxActiveChats: m.maxActiveChats ?? 0,
      allowFileSharing: m.allowFileSharing ?? false,
      maxAttachmentSizeMB: m.maxAttachmentSizeMB ?? 0,
    });
    this.cdr.detectChanges();
  }

  onSubmit() {
    if (this.planForm.invalid || !this.planId) {
      this.planForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const v = this.planForm.value;

    const payload = {
      name: v.name,
      description: v.description,
      priceMonthly: v.priceMonthly,
      priceYearly: v.priceYearly,
      isActive: v.isActive,
      features: {
        competitions: {
          maxCompetitionsPerMonth: v.maxCompetitionsPerMonth,
          maxActiveCompetitions: v.maxActiveCompetitions,
          maxApplicationsPerCompetition: v.maxApplicationsPerCompetition,
          maxShortlistedPerCompetition: v.maxShortlistedPerCompetition,
        },
        interviews: {
          enabled: v.interviewsEnabled,
          maxRoundsPerApplication: v.maxRoundsPerApplication,
        },
        analytics: {
          advancedAnalytics: v.advancedAnalytics,
          leaderboardAccess: v.leaderboardAccess,
        },
        branding: {
          brandingCustomization: v.brandingCustomization,
        },
        ai: {
          chatbotSupport: v.chatbotSupport,
        },
        pipeline: {
          enabled: v.hiringPipelineEnabled,
        },
        messaging: {
          enabled: v.messagingEnabled,
          unlockStage: v.messagingUnlockStage,
          maxActiveChats: v.maxActiveChats,
          allowFileSharing: v.allowFileSharing,
          maxAttachmentSizeMB: v.maxAttachmentSizeMB,
        },
        support: {
          prioritySupport: v.prioritySupport,
        },
      },
    };

    this.api.updateAdminPlan(this.planId, payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.cdr.detectChanges();
        this.router.navigate(['/admin/billing']);
        this.modal.alert('Plan updated successfully!', 'Success');
      },
      error: (err: any) => {
        this.loading = false;
        this.cdr.detectChanges();
        this.modal.alert('Failed to update plan: ' + err.message, 'Error');
      },
    });
  }
}
