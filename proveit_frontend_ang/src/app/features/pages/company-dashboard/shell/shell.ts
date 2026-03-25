import { Component } from '@angular/core';
import { DashboardLayout, NavItem } from '../../../components/dashboard-layout/dashboard-layout';

@Component({
  selector: 'app-company-shell',
  standalone: true,
  imports: [DashboardLayout],
  template: `
    <app-dashboard-layout
      role="company"
      [navItems]="navItems"
    >
    </app-dashboard-layout>
  `,
})
export class CompanyShell {
  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/company/dashboard/home', icon: 'bi-house' },
    { label: 'Competitions', route: '/company/dashboard/competitions', icon: 'bi-trophy-fill' },
    {
      label: 'Applications',
      route: '/company/dashboard/applications',
      icon: 'bi-file-earmark-person',
      badge: 3,
    },
    { label: 'Projects', route: '/company/dashboard/projects', icon: 'bi-folder' },
    {
      label: 'Pipeline',
      route: '/company/dashboard/pipeline',
      icon: 'bi-diagram-3-fill',
      requiredFeatureKey: 'pipeline.enabled',
    },
    { label: 'Interviews', route: '/company/dashboard/interviews', icon: 'bi-calendar' },
    { label: 'Billing', route: '/company/dashboard/billing', icon: 'bi-credit-card-fill' },
    { label: 'Reviews', route: '/company/dashboard/reviews', icon: 'bi-star-fill' },
    { label: 'Settings', route: '/company/dashboard/settings', icon: 'bi-gear-fill' },
  ];
}
