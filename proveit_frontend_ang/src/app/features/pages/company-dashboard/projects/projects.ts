import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { NgFor, NgClass, NgIf, TitleCasePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { MorphLoading } from '../../../../features/components/ui/morph-loading/morph-loading';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-company-projects',
  standalone: true,
  imports: [NgFor, NgClass, NgIf, TitleCasePipe, DatePipe, FormsModule, MorphLoading],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class CompanyProjects implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  projects: any[] = [];
  selected: any = null;
  filter = 'all';
  filters = ['all', 'reviewed', 'pending', 'flagged'];
  searchTerm = '';
  sortKey = 'submittedAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  loading = false;

  ngOnInit() {
    this.auth.user$.pipe(take(1)).subscribe((user) => {
      if (user) {
        this.loading = true;
        this.api.getCompanyByOwnerId(user.uid).subscribe((company) => {
          if (company) {
            this.api.getCompanyProjects(company.id).subscribe({
              next: (data) => {
                this.projects = data;
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
    let list = [...this.projects];

    if (this.filter !== 'all') {
      list = list.filter((p) => p.status === this.filter);
    }

    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      list = list.filter(
        (p) => 
          p.title?.toLowerCase().includes(s) || 
          p.repoUrl?.toLowerCase().includes(s) ||
          p.candidateName?.toLowerCase().includes(s)
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

  parsePlagiarism(val: string): number {
    return parseInt(val) || 0;
  }

  reviewProject(project: any, event?: MouseEvent) {
    event?.stopPropagation();
    this.selected = project;

    if (!project || project.status === 'reviewed') {
      return;
    }

    const previousStatus = project.status;
    project.status = 'reviewed';
    if (this.selected?.id === project.id) {
      this.selected.status = 'reviewed';
    }

    this.api.updateProject(project.id, { status: 'reviewed' }).subscribe({
      next: (updated) => {
        this.projects = this.projects.map((p) =>
          p.id === project.id ? { ...p, ...updated, status: 'reviewed' } : p
        );

        if (this.selected?.id === project.id) {
          this.selected = this.projects.find((p) => p.id === project.id) ?? updated;
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to update project status:', err);
        project.status = previousStatus;
        if (this.selected?.id === project.id) {
          this.selected.status = previousStatus;
        }
        this.cdr.detectChanges();
      },
    });
  }

  close() {
    this.selected = null;
  }
}
