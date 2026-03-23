import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { cn } from '../../../../lib/utils';

export type PlanLevel = 'starter' | 'growth' | 'enterprise' | 'plus' | 'pro' | 'all' | string;

export interface PricingFeature {
  name: string;
  included: PlanLevel | null;
}

export interface PricingPlan {
  id?: string;
  name: string;
  level: PlanLevel;
  price: {
    monthly: number;
    yearly?: number;
  };
  popular?: boolean;
  description?: string;
}

@Component({
  selector: 'app-pricing-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pricing-table.html',
})
export class PricingTable implements OnInit, OnChanges {
  @Input() features: PricingFeature[] = [];
  @Input() plans: PricingPlan[] = [];
  @Input() defaultPlan: PlanLevel = 'growth';
  @Input() currentPlanId?: string = '';
  @Input() containerClassName?: string = '';
  @Input() buttonClassName?: string = '';

  @Output() targetPlanSelected = new EventEmitter<PlanLevel>();

  isYearly = false;
  selectedPlan: PlanLevel = 'growth';

  ngOnInit() {
    this.isYearly = false;
    this.syncSelectedPlan();
  }

  ngOnChanges() {
    this.syncSelectedPlan();
  }

  private syncSelectedPlan() {
    // Sync selected plan with current plan if applicable
    if (this.currentPlanId && this.plans && this.plans.length > 0) {
      const found = this.plans.find((p) => p.id === this.currentPlanId);
      if (found) {
        this.selectedPlan = found.level;
      } else {
        this.selectedPlan = this.defaultPlan;
      }
    } else {
      this.selectedPlan = this.selectedPlan || this.defaultPlan;
    }
  }

  handlePlanSelect(plan: PlanLevel) {
    this.selectedPlan = plan;
  }

  getSelectedPlanName() {
    return this.plans.find((p) => p.level === this.selectedPlan)?.name;
  }

  isCurrentSelected() {
    const p = this.plans.find((p) => p.level === this.selectedPlan);
    return p?.id === this.currentPlanId;
  }

  onUpgradeClick() {
    this.targetPlanSelected.emit(this.selectedPlan);
  }

  shouldShowCheck(included: string | null, level: string): boolean {
    if (included === 'all') return true;
    if (!included) return false;

    // Derived levels dynamically from input plans order
    const levels = this.plans.map(p => p.level.toLowerCase());
    const includedIndex = levels.indexOf(included.toLowerCase());
    const currentLevelIndex = levels.indexOf(level.toLowerCase());

    if (includedIndex === -1) return false;

    return currentLevelIndex >= includedIndex;
  }

  cn(...classes: any[]) {
    return cn(...classes);
  }
}
