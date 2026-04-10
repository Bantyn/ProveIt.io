import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { NgFor, NgClass, DatePipe } from '@angular/common';
import { StatsCard } from '../../../../features/components/ui/stats-card/stats-card';
import { AreaChart } from '../../../../features/components/ui/area-chart/area-chart';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [NgFor, NgClass, StatsCard, AreaChart, DatePipe],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class AdminOverview implements OnInit {
  stats: any[] = [];
  recentLogs: any[] = [];

  // Chart state
  chartLabels: string[] = [];
  revenueData: number[] = [];
  userData: number[] = [];

  constructor(
    public api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.fetchDashboardData();
  }

  fetchDashboardData() {
    // Fetch Global Stats
    this.api.getAdminStats().subscribe({
      next: (stats) => {
        this.updateStats(stats);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching admin stats:', err);
        this.cdr.detectChanges();
      }
    });

    // Fetch Recent Logs
    this.api.getAdminLogs().subscribe({
      next: (logs) => {
        this.recentLogs = (logs || []).slice(0, 10);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching admin logs:', err);
        this.cdr.detectChanges();
      }
    });

    // Fetch Analytics for Charts
    this.api.getAdminAnalytics().subscribe({
      next: (analytics) => {
        if (analytics) {
          // Map Monthly Revenue if available
          if (analytics.monthlyRevenue) {
            this.chartLabels = analytics.monthlyRevenue.map((m: any) => m.month);
            this.revenueData = analytics.monthlyRevenue.map((m: any) => m.revenue / 100000); // converting to Lakhs for display
          } else {
            this.chartLabels = analytics.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
            this.revenueData = analytics.revenueData || [];
          }

          // Map User Growth if available
          this.userData = analytics.userData || analytics.userGrowthData || [];
          
          // Force fallback labels if still empty
          if (this.chartLabels.length === 0) {
            this.chartLabels = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching admin analytics:', err);
        this.cdr.detectChanges();
      }
    });
  }

  updateStats(data: any) {
    this.stats = [
      {
        label: 'Total Users',
        value: (data.totalUsers || 0) - (data.totalCompanies || 0),
        icon: 'users',
        color: 'purple',
        change: '+' + (data.userGrowth || 0) + '%',
        subtext: 'Registered platform candidates'
      },
      {
        label: 'Partner Companies',
        value: data.totalCompanies,
        icon: 'building-2',
        color: 'indigo',
        change: '+12%', // Example change, could be dynamic if backend provides it
        subtext: 'Registered hiring partners'
      },
      {
        label: 'Active Subscriptions',
        value: data.activeSubscriptions,
        icon: 'wallet',
        color: 'blue',
        change: '+18%',
        subtext: 'Enterprise & Pro plans'
      },
      {
        label: 'Annual Revenue',
        value: data.totalRevenue,
        icon: 'coin',
        color: 'emerald',
        change: '+' + (data.revenueGrowth || 0) + '%',
        subtext: 'Combined platform earnings',
        unit: '₹'
      },
      {
        label: 'Total Competitions',
        value: data.totalCompetitions,
        icon: 'trophy',
        color: 'amber',
        change: '+9%',
        subtext: 'Live & past hackathons'
      },
      {
        label: 'Job Applications',
        value: data.totalApplications,
        icon: 'layers',
        color: 'rose',
        change: '+22%',
        subtext: 'Candidate submissions'
      },
    ];
  }
}
