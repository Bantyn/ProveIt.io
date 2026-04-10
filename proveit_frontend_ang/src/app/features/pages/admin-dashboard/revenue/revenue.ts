import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { ModalService } from '../../../../services/modal.service';
import {
  NgFor,
  NgClass,
  NgIf,
  TitleCasePipe,
  DecimalPipe,
} from '@angular/common';

@Component({
  selector: 'app-admin-revenue',
  standalone: true,
  imports: [NgFor, NgClass, NgIf, TitleCasePipe, DecimalPipe],
  templateUrl: './revenue.html',
})
export class AdminRevenue implements OnInit {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);
  private modal = inject(ModalService);

  transactions: any[] = [];
  stats: any = {
    totalRevenue: 0,
    activeSubscriptions: 0,
    refundsIssued: 0,
    totalTransactions: 0,
  };
  selectedRange: string = 'all';

  aggregatedData: any[] = [];

  ngOnInit() {
    this.fetchRevenueData(this.selectedRange);
  }

  onFilterChange(range: string) {
    this.selectedRange = range;
    this.fetchRevenueData(range);
  }

  fetchRevenueData(range: string = 'all') {
    this.api.getAdminStats(range).subscribe({
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

    // To show a breakdown for 'month' or 'year', we fetch a slightly larger range if needed
    // but for now, we'll use the range provided and group it.
    // If 'month' is selected, we fetch 'year' to show all months of the current year breakdown.
    // If 'year' is selected, we fetch 'all' to show all years breakdown.
    const apiRange = range === 'month' ? 'year' : (range === 'year' ? 'all' : 'all');

    this.api.getAdminPayments(apiRange).subscribe({
      next: (data) => {
        const rawPayments = data || [];
        this.transactions = rawPayments.map((p: any) => {
          const cid = String(p.companyId || 'NA');
          return {
            ...p,
            companyIdInitials: cid.slice(0, 2).toUpperCase(),
            description: p.description || 'Plan Upgrade',
            method: p.method || 'UPI',
            date: p.date || p.createdAt || 'N/A',
          };
        });

        if (range === 'month') {
          this.aggregatedData = this.groupDataByMonth(rawPayments);
        } else if (range === 'year') {
          this.aggregatedData = this.groupDataByYear(rawPayments);
        } else {
          this.aggregatedData = [];
        }

        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching admin payments:', err),
    });
  }

  groupDataByMonth(payments: any[]) {
    const groups: { [key: string]: number } = {};
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    
    payments.forEach(p => {
      const date = new Date(p.createdAt || p.date);
      if (isNaN(date.getTime())) return;
      const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      groups[key] = (groups[key] || 0) + (p.amount || 0);
    });

    return Object.keys(groups).map(label => ({ label, total: groups[label] }))
                 .sort((a,b) => new Date(b.label).getTime() - new Date(a.label).getTime());
  }

  groupDataByYear(payments: any[]) {
    const groups: { [key: string]: number } = {};
    payments.forEach(p => {
      const date = new Date(p.createdAt || p.date);
      if (isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}`;
      groups[key] = (groups[key] || 0) + (p.amount || 0);
    });

    return Object.keys(groups).map(label => ({ label, total: groups[label] }))
                 .sort((a,b) => b.label.localeCompare(a.label));
  }

  processRefund(transaction: any) {
    transaction.status = 'refunded';
    this.cdr.detectChanges();
  }
}
