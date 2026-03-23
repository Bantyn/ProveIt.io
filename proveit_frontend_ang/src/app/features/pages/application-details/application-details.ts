import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgIf, NgFor, NgClass, DatePipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { ModalService } from '../../../services/modal.service';
import { AuthService } from '../../../services/auth.service';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { MorphLoading } from '../../components/ui/morph-loading/morph-loading';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-application-details',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgFor,
    NgClass,
    DatePipe,
    TitleCasePipe,
    RouterLink,
    Navbar,
    Footer,
    MorphLoading,
  ],
  templateUrl: './application-details.html',
  styleUrl: './application-details.css',
})
export class ApplicationDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);

  application: any = null;
  candidate: any = null;
  competition: any = null;
  project: any = null;
  viewerRole: 'company' | 'candidate' = 'candidate';
  isLoading = true;
  error = '';
  activeTab = 'overview';

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.fetchDetails(id);
    } else {
      this.error = 'Invalid Application ID';
      this.isLoading = false;
    }
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  fetchDetails(id: string) {
    this.api.getApplication(id).subscribe({
      next: (app) => {
        this.application = app;

        // Fetch candidate details
        if (app.userId) {
          this.api.getUser(app.userId).subscribe({
            next: (user) => {
              this.candidate = user;
              this.cdr.detectChanges();
            },
            error: (err) => console.error('Error fetching candidate', err),
          });
        }

        // Fetch competition details
        if (app.competitionId) {
          this.api.getCompetition(app.competitionId).subscribe({
            next: (comp) => {
              this.competition = comp;

              this.auth.user$.subscribe((user) => {
                if (user && (comp.companyId === user.uid || comp.ownerId === user.uid)) {
                  this.viewerRole = 'company';
                } else {
                  this.viewerRole = 'candidate';
                }
                this.cdr.detectChanges();
              });

              this.cdr.detectChanges();
            },
            error: (err) => console.error('Error fetching competition', err),
          });
        }

        // Fetch project details
        if (app.projectId) {
          this.api.getProject(app.projectId).subscribe({
            next: (proj) => {
              this.project = proj;
              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error('Error fetching project by ID', err);
              // Fallback: try to fetch project by application ID if ID lookup failed
              this.fetchProjectByAppId(app.id || app._id);
            },
          });
        } else {
          // No projectId on application, try fetching by application ID
          this.fetchProjectByAppId(app.id || app._id);
        }

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching application', err);
        this.error = 'Application not found or access denied.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  updateStatus(status: string) {
    if (!this.application) return;
    this.api.updateApplication(this.application.id, { status }).subscribe({
      next: () => {
        this.application.status = status;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error updating status', err),
    });
  }

  async scheduleInterview() {
    if (!this.application || this.viewerRole !== 'company') return;

    const result = await this.modalService.scheduleInterview(
      'Schedule Interview',
      `Set the interview date and time for ${this.application.candidateName || 'this candidate'}.`,
    );

    if (!result) return;

    const interviewPayload = {
      applicationId: this.application.id,
      companyId: this.application.companyId || this.competition?.companyId,
      candidateId: this.application.userId,
      candidateName: this.application.candidateName,
      type: 'Final Interview',
      date: result.date,
      time: result.time,
      status: 'scheduled',
      decision: null,
    };

    try {
      const interview = await firstValueFrom(this.api.createInterview(interviewPayload));
      await firstValueFrom(
        this.api.updateApplication(this.application.id, {
          status: 'interview_scheduled',
          interviewId: interview.id,
          interviewDate: result.date,
          interviewTime: result.time,
        }),
      );

      this.application.status = 'interview_scheduled';
      this.application.interviewId = interview.id;
      this.application.interviewDate = result.date;
      this.application.interviewTime = result.time;
      this.cdr.detectChanges();
      await this.modalService.alert('Interview scheduled successfully.', 'Success', 'success');
    } catch (err) {
      console.error('Error scheduling interview', err);
      await this.modalService.alert(
        'Interview could not be scheduled. Please try again.',
        'Error',
        'error',
      );
    }
  }

  closeWindow() {
    window.close();
  }

  getStatusClass(status: string) {
    const s = status?.toLowerCase();
    switch (s) {
      case 'shortlisted':
      case 'winner':
      case 'accepted':
        return 'bg-green-50 text-green-600 border-green-100';
      case 'interview_scheduled':
        return 'bg-cyan-50 text-cyan-600 border-cyan-100';
      case 'under_review':
      case 'under_evaluation':
      case 'submitted':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'rejected':
      case 'not_selected':
        return 'bg-(--dd-red)/10 text-(--dd-red) border-(--dd-red)/20';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  }

  private fetchProjectByAppId(appId: string) {
    if (!appId) return;
    this.api.getCompanyProjects(this.application.companyId).subscribe({
      next: (projects) => {
        const found = projects.find((p: any) => p.applicationId === appId || p._id === appId);
        if (found) {
          this.project = found;
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error fetching company projects for fallback', err),
    });
  }
}
