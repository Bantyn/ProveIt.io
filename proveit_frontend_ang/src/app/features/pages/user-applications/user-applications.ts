import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgClass, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { FluidDropdown, DropdownOption } from '../../components/ui/fluid-dropdown/fluid-dropdown';
import { ShaderHeroComponent } from '../../components/ui/shader-hero/shader-hero';

import { take } from 'rxjs/operators';

@Component({
  selector: 'app-user-applications',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    Navbar,
    Footer,
    NgClass,
    DatePipe,
    FormsModule,
    FluidDropdown,
    ShaderHeroComponent,
  ],
  templateUrl: './user-applications.html',
  styleUrl: './user-applications.css',
})
export class UserApplications implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  applications: any[] = [];
  loading = true;
  user: any = null;

  // Filters
  filters = {
    search: '',
    status: '',
    type: '',
  };

  availableStatuses: DropdownOption[] = [
    { value: 'Applied', label: 'Applied', icon: 'bi bi-send-fill' },
    { value: 'Under Review', label: 'Under Review', icon: 'bi bi-eye-fill' },
    { value: 'Accepted', label: 'Accepted', icon: 'bi bi-check-circle-fill' },
    { value: 'Submitted', label: 'Submitted', icon: 'bi bi-cloud-upload-fill' },
    { value: 'Under Evaluation', label: 'Under Evaluation', icon: 'bi bi-hourglass-split' },
    { value: 'Winner', label: 'Winner', icon: 'bi bi-trophy-fill' },
    { value: 'Interview Scheduled', label: 'Interview Scheduled', icon: 'bi bi-calendar-check-fill' },
    { value: 'Not Selected', label: 'Not Selected', icon: 'bi bi-x-circle-fill' },
    { value: 'Rejected', label: 'Rejected', icon: 'bi bi-x-octagon-fill' },
  ];
  availableTypes: DropdownOption[] = [
    { value: 'SKILL', label: 'Skill Competition', icon: 'bi bi-lightning-fill' },
    { value: 'HIRING', label: 'Hiring Challenge', icon: 'bi bi-briefcase-fill' },
  ];

  get filteredApplications() {
    return this.applications.filter((app) => {
      const matchesSearch =
        !this.filters.search ||
        app.competitionTitle?.toLowerCase().includes(this.filters.search.toLowerCase()) ||
        app.companyName?.toLowerCase().includes(this.filters.search.toLowerCase());

      const matchesStatus =
        !this.filters.status ||
        this.getStatusText(app.status).toLowerCase() === this.filters.status.toLowerCase() ||
        (this.filters.status.toLowerCase() === 'under review' &&
          (!app.status || app.status.toLowerCase() === 'pending'));

      const matchesType =
        !this.filters.type ||
        app.competitionType?.toLowerCase() === this.filters.type.toLowerCase();

      return matchesSearch && matchesStatus && matchesType;
    });
  }

  ngOnInit(): void {
    this.auth.user$.pipe(take(1)).subscribe((user) => {
      this.user = user;
      if (user) {
        this.loadApplications(user.uid);
      } else {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadApplications(userId: string) {
    this.api.getUserApplications(userId).subscribe({
      next: (apps) => {
        this.api.getCompetitions().subscribe({
          next: (comps) => {
            const compMap = new Map();
            comps.forEach((c) => compMap.set(c.id, c));

            this.applications = apps.map((app) => {
              const comp = compMap.get(app.competitionId) || {};
              const feedbackText =
                app.feedback &&
                app.feedback !== 'Project Automatically Submitted'
                  ? app.feedback
                  : app.projectSummary || '';

              return {
                ...app,
                feedback: feedbackText || 'Your submission summary will appear here once your project details are saved.',
                competitionTitle: comp.title || 'Unknown Competition',
                competitionImage: comp.img_url || comp.imageUrl || 'assets/placeholder-comp.png',
                competitionType: comp.competitionType || app.competitionType || 'SKILL',
                companyName: comp.companyName || 'Unknown Company',
              };
            });

            this.applications.sort((a, b) => {
              return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
            });
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error fetching comps', err);
            this.applications = apps;
            this.loading = false;
            this.cdr.detectChanges();
          },
        });
      },
      error: (err) => {
        console.error('Error fetching applications', err);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  getStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'accepted':
      case 'winner':
        return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'interview_scheduled':
        return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20';
      case 'applied':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'submitted':
        return 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20';
      case 'under_evaluation':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'not_selected':
      case 'rejected':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'under_review':
      default:
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    }
  }

  getStatusIconPulse(status: string): string {
    switch (status?.toLowerCase()) {
      case 'accepted':
      case 'winner':
        return 'bg-green-500';
      case 'interview_scheduled':
        return 'bg-cyan-500';
      case 'applied':
        return 'bg-blue-500';
      case 'submitted':
        return 'bg-indigo-500';
      case 'under_evaluation':
        return 'bg-orange-500';
      case 'not_selected':
      case 'rejected':
        return 'bg-red-500';
      case 'under_review':
      default:
        return 'bg-yellow-500';
    }
  }

  getStatusText(status: string): string {
    if (!status) return 'Under Review';
    const s = status.replace('_', ' ');
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  clearFilters() {
    this.filters = {
      search: '',
      status: '',
      type: '',
    };
  }

  setStatusFilter(status: string) {
    this.filters.status = status;
    this.cdr.detectChanges();
  }

  promptForSubmission(appId: string) {
    const link = prompt(
      'Please enter the URL for your work submission (GitHub, Google Drive, ZIP Link, etc):',
    );
    if (link && link.trim() !== '') {
      this.api
        .updateApplication(appId, { status: 'submitted', submissionLink: link.trim() })
        .subscribe({
          next: () => {
            this.loadApplications(this.user.uid);
            alert('Work submitted successfully!');
          },
          error: (err) => {
            console.error('Submission failed', err);
            alert('Failed to submit work. Please try again.');
          },
        });
    }
  }
}
