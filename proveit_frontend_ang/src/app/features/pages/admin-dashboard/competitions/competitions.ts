import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { NgFor, NgClass, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-competitions',
  standalone: true,
  imports: [NgFor, NgClass, TitleCasePipe, FormsModule],
  templateUrl: './competitions.html',
  
})
export class AdminCompetitions implements OnInit {
  competitions: any[] = [];
  filter = 'all';
  filters = ['all', 'active', 'draft', 'completed', 'cancelled'];
  searchTerm = '';
  private router = inject(Router);

  constructor(public api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.api.getCompetitions().subscribe({
      next: (data: any[]) => {
        this.competitions = (data || []).map(c => ({
          ...c,
          displayCompanyName: c.companyName || c.companyId || 'Unknown',
          displaySkills: c.requiredSkills || c.skills || [],
          displayApplicants: c.applicants !== undefined ? c.applicants : 
                             c.applicantCount !== undefined ? c.applicantCount : 
                             c.applicantsCount !== undefined ? c.applicantsCount : 
                             c.applicationsCount !== undefined ? c.applicationsCount : 0,
          displayDeadline: c.projectInfo?.deadline ? new Date(c.projectInfo.deadline).toLocaleDateString() : 
                           c.deadline ? new Date(c.deadline).toLocaleDateString() : 'N/A'
        }));
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error(err);
        this.cdr.detectChanges();
      },
    });
  }

  get filtered() {
    let list = this.filter === 'all'
      ? this.competitions
      : this.competitions.filter((c) => c.status === this.filter);

    if (this.searchTerm) {
      list = list.filter((c) => 
        c.title?.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
        c.id?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        c.displayCompanyName?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    return list;
  }

  viewApplications(comp: any) {
    if (comp.displayApplicants > 0) {
      this.router.navigate(['/admin/applications'], { 
        queryParams: { search: comp.title || comp.id } 
      });
    }
  }

  updateCompetitionStatus(comp: any, status: string) {
    const originalStatus = comp.status;
    comp.status = status;

    this.api.updateCompetition(comp.id, { status }).subscribe({
      next: () => {
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error(err);
        comp.status = originalStatus;
        this.cdr.detectChanges();
      },
    });
  }
}
