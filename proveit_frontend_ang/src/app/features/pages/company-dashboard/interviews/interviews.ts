import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { ModalService } from '../../../../services/modal.service';
import { NgFor, NgClass, NgIf, TitleCasePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../services/auth.service';
import { MorphLoading } from '../../../../features/components/ui/morph-loading/morph-loading';
import { take } from 'rxjs/operators';
import { firstValueFrom, forkJoin } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-company-interviews',
  standalone: true,
  imports: [NgFor, NgClass, NgIf, TitleCasePipe, DatePipe, FormsModule, MorphLoading],
  templateUrl: './interviews.html',
  styleUrl: './interviews.css',
})
export class CompanyInterviews implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  modalService = inject(ModalService);
  private route = inject(ActivatedRoute);

  interviews: any[] = [];
  competitions: any[] = [];
  selectedCompetition: any = null;
  competitionSearchTerm = '';

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
            forkJoin({
              interviews: this.api.getCompanyInterviews(company.id),
              competitions: this.api.getCompanyCompetitions(company.id),
              applications: this.api.getCompanyApplications(company.id),
            }).subscribe({
              next: (data) => {
                const realInterviews = data.interviews || [];
                const allApps = data.applications || [];

                // Find applications with interview_scheduled status that have no matching interview
                const interviewedAppIds = new Set(realInterviews.map((i: any) => i.applicationId));
                const missingApps = allApps.filter(
                  (a: any) => a.status === 'interview_scheduled' && !interviewedAppIds.has(a.id)
                );

                // Create synthetic interview entries for missing ones
                const syntheticInterviews = missingApps.map((a: any) => ({
                  id: `app-${a.id}`,
                  applicationId: a.id,
                  companyId: company.id,
                  candidateId: a.userId || a.candidateId || '',
                  candidateName: a.candidateName || 'Unknown',
                  competitionId: a.competitionId || '',
                  competitionTitle: a.competitionTitle || '',
                  type: 'Final Interview',
                  date: a.interviewDate || '',
                  time: a.interviewTime || '',
                  meetingLink: a.meetingLink || '',
                  status: 'scheduled',
                  decision: null,
                  _synthetic: true,
                }));

                this.interviews = [...realInterviews, ...syntheticInterviews];

                // Build competition cards with interview counts
                this.competitions = (data.competitions || []).map((c: any) => {
                  const interviewCount = this.interviews.filter(
                    (i: any) => i.competitionId === c.id
                  ).length;
                  return { ...c, interviewCount };
                });

                this.loading = false;
                this.cdr.detectChanges();

                // Auto-select competition from query param
                const competitionParam = this.route.snapshot.queryParamMap.get('competition');
                if (competitionParam) {
                  const match = this.competitions.find((c: any) => c.id === competitionParam);
                  if (match) {
                    this.selectCompetition(match);
                  }
                }
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

  // ── Competition card helpers ──
  selectCompetition(competition: any) {
    this.selectedCompetition = competition;
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
    if (c.status) return c.status.toLowerCase();
    const now = new Date();
    if (c.endDate && new Date(c.endDate) < now) return 'closed';
    if (c.startDate && new Date(c.startDate) > now) return 'draft';
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
    let list = [...this.interviews];

    // Scope by selected competition
    if (this.selectedCompetition) {
      list = list.filter((i) => i.competitionId === this.selectedCompetition.id);
    }

    if (this.filter !== 'all') {
      list = list.filter((i) => i.status === this.filter);
    }

    if (this.searchTerm) {
      const s = this.searchTerm.toLowerCase();
      list = list.filter(
        (i) => (i.candidateName || '').toLowerCase().includes(s) || (i.type || '').toLowerCase().includes(s),
      );
    }

    list.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (this.sortKey === 'date') {
        valA = a.date || a.interviewDate || a.scheduledDate || '';
        valB = b.date || b.interviewDate || b.scheduledDate || '';
      } else {
        valA = a[this.sortKey] ?? '';
        valB = b[this.sortKey] ?? '';
      }

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

  async updateInterview(interview: any) {
    // Parse existing date to pass as initial value
    const existingDateStr = interview.date || interview.interviewDate || '';
    let existingDate: Date | null = null;
    if (existingDateStr) {
      const parsed = new Date(existingDateStr);
      if (!isNaN(parsed.getTime())) existingDate = parsed;
    }
    const existingTime = interview.time || interview.interviewTime || '';
    const existingLink = interview.meetingLink || '';

    const result = await this.modalService.scheduleInterview(
      'Update Interview',
      `Update the interview details for ${interview.candidateName || 'this candidate'}.`,
      existingDate,
      existingTime,
      existingLink,
    );

    if (!result) return;

    try {
      await firstValueFrom(
        this.api.updateInterview(interview.id, {
          date: result.date,
          time: result.time,
          meetingLink: result.meetingLink,
          updatedAt: new Date().toISOString(),
        }),
      );

      interview.date = result.date;
      interview.time = result.time;
      interview.meetingLink = result.meetingLink;
      this.cdr.detectChanges();
      await this.modalService.alert('Interview updated successfully.', 'Success', 'success');
    } catch (err) {
      console.error('Failed to update interview', err);
      await this.modalService.alert('Failed to update interview. Please try again.', 'Error', 'error');
    }
  }
}
