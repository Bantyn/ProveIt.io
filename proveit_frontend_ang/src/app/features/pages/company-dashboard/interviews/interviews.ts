import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { ModalService } from '../../../../services/modal.service';
import { NgFor, NgClass, NgIf, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { MorphLoading } from '../../../../features/components/ui/morph-loading/morph-loading';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-company-interviews',
  standalone: true,
  imports: [NgFor, NgClass, NgIf, TitleCasePipe, FormsModule, MorphLoading],
  templateUrl: './interviews.html',
  styleUrl: './interviews.css',
})
export class CompanyInterviews implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  modalService = inject(ModalService);

  interviews: any[] = [];
  filter = 'all';
  filters = ['all', 'scheduled', 'completed'];
  searchTerm = '';
  sortKey = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';
  loading = false;

  ngOnInit() {
    this.auth.user$.pipe(take(1)).subscribe((user) => {
      if (user) {
        this.loading = true;
        this.api.getCompanyByOwnerId(user.uid).subscribe((company) => {
          if (company) {
            this.api.getCompanyInterviews(company.id).subscribe({
              next: (data) => {
                this.interviews = data;
                this.loading = false;
                this.cdr.detectChanges();
              },
              error: (err) => {
                console.error(err);
                this.loading = false;
                this.cdr.detectChanges();
              },
            });
          } else {
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  toggleSort(key: string) {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }
  }

  get filtered() {
    let list = [...this.interviews];

    if (this.filter !== 'all') {
      list = list.filter((i) => i.status === this.filter);
    }

    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      list = list.filter(
        (i) => i.candidateName?.toLowerCase().includes(s) || i.type?.toLowerCase().includes(s),
      );
    }

    list.sort((a, b) => {
      let valA = a[this.sortKey];
      let valB = b[this.sortKey];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }

  decide(interview: any, decision: string) {
    interview.decision = decision;
    interview.status = 'completed';
  }
  schedule() {
    this.modalService.alert('Schedule interview – Connect to backend', 'Work in progress');
  }
}
