import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { NgFor, NgIf, NgClass, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-companies',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, TitleCasePipe, FormsModule],
  templateUrl: './companies.html',
})
export class AdminCompanies implements OnInit {
  companies: any[] = [];
  filter = 'all';
  filters = ['all', 'verified', 'pending', 'suspended'];
  searchTerm = '';

  constructor(public api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.api.getCompanies().subscribe({
      next: (data) => {
        this.companies = (data || []).map((c: any) => ({
          ...c,
          name: c.companyName || c.name || 'Company',
          status: c.verificationStatus || c.status || 'pending'
        }));
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.cdr.detectChanges();
      },
    });
  }

  updateStatus(company: any, status: string) {
    const originalStatus = company.status;
    company.status = status; // optimistic update
    
    const payload = { verificationStatus: status };
    
    this.api.updateCompany(company.id, payload).subscribe({
      next: () => {
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to update company status', err);
        company.status = originalStatus; // rollback
        this.cdr.detectChanges();
      }
    });
  }

  get filtered() {
    let list = this.filter === 'all'
      ? this.companies
      : this.companies.filter((c) => c.status === this.filter);
    
    if (this.searchTerm) {
      list = list.filter((c) => 
        c.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
        c.email?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        c.id?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    return list;
  }
}
