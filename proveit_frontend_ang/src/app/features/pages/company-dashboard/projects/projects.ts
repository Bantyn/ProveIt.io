import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { NgFor, NgClass, NgIf, TitleCasePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { MorphLoading } from '../../../../features/components/ui/morph-loading/morph-loading';
import { forkJoin } from 'rxjs';
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
  competitions: any[] = [];
  selectedCompetition: any = null;
  filter = 'all';
  filters = ['all', 'reviewed', 'pending', 'flagged'];
  searchTerm = '';
  competitionSearchTerm = '';
  sortKey = 'submittedAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  loading = false;
  selected: any = null;

  ngOnInit() {
    this.auth.user$.pipe(take(1)).subscribe((user) => {
      if (user) {
        this.loading = true;
        this.api.getCompanyByOwnerId(user.uid).subscribe((company) => {
          if (company) {
            forkJoin({
              projects: this.api.getCompanyProjects(company.id),
              applications: this.api.getCompanyApplications(company.id),
              competitions: this.api.getCompanyCompetitions(company.id),
            }).subscribe({
              next: ({ projects, applications, competitions }) => {
                const applicationMap = new Map(
                  (applications || []).map((application: any) => [application.id, application]),
                );

                this.projects = (projects || []).map((project: any) => {
                  const linkedApplication = applicationMap.get(project.applicationId);
                  return {
                    ...project,
                    competitionId: linkedApplication?.competitionId,
                    applicationScore: this.parseNumericValue(
                      linkedApplication?.score ?? linkedApplication?.evaluation?.manualScore,
                    ),
                    applicationRank: this.parseNumericValue(linkedApplication?.rank),
                    applicationStatus: linkedApplication?.status || null,
                    evaluationNotes: linkedApplication?.evaluation?.notes || '',
                  };
                });

                // Build competition cards with project counts
                this.competitions = (competitions || []).map((c: any) => {
                  const projectCount = this.projects.filter((p: any) => p.competitionId === c.id).length;
                  const applicationCount = (applications || []).filter((a: any) => a.competitionId === c.id).length;
                  return { ...c, projectCount, applicationCount };
                }).sort((a: any, b: any) => {
                  const dateA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
                  const dateB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
                  return dateB - dateA;
                });

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

  selectCompetition(competition: any) {
    this.selectedCompetition = competition;
    this.filter = 'all';
    this.searchTerm = '';
  }

  backToCompetitions() {
    this.selectedCompetition = null;
    this.filter = 'all';
    this.searchTerm = '';
  }

  get filteredCompetitions() {
    if (!this.competitionSearchTerm) return this.competitions;
    const s = this.competitionSearchTerm.toLowerCase();
    return this.competitions.filter((c: any) =>
      (c.title || c.name || '').toLowerCase().includes(s)
    );
  }

  getCompetitionStatus(c: any): string {
    if (c.status) return c.status;
    if (c.endDate) {
      return new Date(c.endDate) < new Date() ? 'closed' : 'active';
    }
    return 'active';
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

    if (this.selectedCompetition) {
      list = list.filter((p) => p.competitionId === this.selectedCompetition.id);
    }

    if (this.filter !== 'all') {
      list = list.filter((p) => p.status === this.filter);
    }

    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      list = list.filter(
        (p) => 
          p.title?.toLowerCase().includes(s) || 
          p.submissionLink?.toLowerCase().includes(s) ||
          p.repoUrl?.toLowerCase().includes(s) ||
          p.liveUrl?.toLowerCase().includes(s) ||
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

  hasApplicationScore(value: any): boolean {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private parseNumericValue(value: any): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
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
