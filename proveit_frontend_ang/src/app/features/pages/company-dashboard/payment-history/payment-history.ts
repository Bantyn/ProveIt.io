import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { NgFor, NgClass, NgIf, TitleCasePipe, DecimalPipe } from '@angular/common';
import { AuthService } from '../../../../services/auth.service';
import { ApiService } from '../../../../services/api.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-company-payment-history',
  standalone: true,
  imports: [NgFor, NgClass, NgIf, TitleCasePipe, DecimalPipe],
  templateUrl: './payment-history.html',
})
export class CompanyPaymentHistory implements OnInit {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  payments: any[] = [];
  sub: any = {};
  companyProfile: any = null;

  ngOnInit() {
    this.auth.user$.pipe(take(1)).subscribe((user) => {
      if (user) {
        this.api.getCompanyByOwnerId(user.uid).subscribe({
          next: (profile) => {
            if (profile) {
              this.companyProfile = profile;

              this.api.getCompanySubscription(profile.id).subscribe((sub) => {
                const start = sub?.startDate || sub?.validFrom || profile.createdAt;
                const end = sub?.endDate || sub?.validTo || 'N/A';
                this.sub = {
                  ...(sub || {}),
                  status: sub?.status || 'ACTIVE',
                  planName: sub?.planName || profile.plan || 'Starter',
                  startDate: start !== 'N/A' ? new Date(start).toLocaleDateString() : 'N/A',
                  endDate: end !== 'N/A' ? new Date(end).toLocaleDateString() : 'N/A',
                };
                this.cdr.detectChanges();
              });

              this.api.getCompanyPayments(profile.id).subscribe((payments) => {
                this.payments = (payments || []).map((p: any) => ({
                  ...p,
                  description: p.description || p.desc || p.planName || 'Plan Upgrade',
                  date: p.date || p.createdAt || p.updatedAt || 'N/A',
                }));
                this.cdr.detectChanges();
              });
            }
          },
        });
      }
    });
  }
}
