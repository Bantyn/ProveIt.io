import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { NgFor, NgClass, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-applications',
  standalone: true,
  imports: [NgFor, NgClass, TitleCasePipe, FormsModule, RouterLink],
  templateUrl: './applications.html',
})
export class AdminApplications implements OnInit {
  public applications: any[] = [];
  filter = 'all';
  filters = ['all', 'under_review', 'shortlisted', 'hired', 'rejected'];
  searchTerm = '';
  private route = inject(ActivatedRoute);

  constructor(public api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    // Check for search query param
    const searchParam = this.route.snapshot.queryParamMap.get('search');
    if (searchParam) {
      this.searchTerm = searchParam;
    }
    this.api.getApplications().subscribe({
      next: (data) => {
        this.applications = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  get filtered() {
    return this.applications.filter((a) => {
      const matchFilter = this.filter === 'all' || a.status === this.filter;
      const matchSearch =
        !this.searchTerm ||
        a.candidateName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        a.id?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        a.competitionId?.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchFilter && matchSearch;
    });
  }

  filterByCompetition(query: string) {
    this.searchTerm = query;
    this.cdr.detectChanges();
  }

  updateStatus(application: any, status: string) {
    const originalStatus = application.status;
    application.status = status;

    this.api.updateApplication(application.id, { status }).subscribe({
      next: () => {
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        application.status = originalStatus;
        this.cdr.detectChanges();
      },
    });
  }
}
