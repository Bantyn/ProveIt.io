import { Component } from '@angular/core';
import { DashboardLayout, NavItem } from '../../../components/dashboard-layout/dashboard-layout';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [DashboardLayout],
  templateUrl: './shell.html',
})
export class AdminShell {
  navItems: NavItem[] = [
    { label: 'Overview', route: '/admin/overview', icon: 'bi-bar-chart-fill' },
    { label: 'Users', route: '/admin/users', icon: 'bi-people-fill' },
    { label: 'Companies', route: '/admin/companies', icon: 'bi-buildings' },
    { label: 'Plans', route: '/admin/plans', icon: 'bi-credit-card-fill' },
    { label: 'Revenue', route: '/admin/revenue', icon: 'bi-wallet-fill' },
    { label: 'System Settings', route: '/admin/settings', icon: 'bi-gear-fill' },
    { label: 'Maintenance', route: '/admin/maintenance', icon: 'bi-cpu-fill' },
    { label: 'Support', route: '/admin/support', icon: 'bi-chat-square-text-fill' },
  ];
}
