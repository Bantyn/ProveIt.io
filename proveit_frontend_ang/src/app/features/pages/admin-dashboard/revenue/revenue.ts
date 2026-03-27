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

  ngOnInit() {
    this.fetchRevenueData();
  }

  fetchRevenueData() {
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
  }

  processRefund(transaction: any) {
    transaction.status = 'refunded';
    this.cdr.detectChanges();
  }
}
