import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../environments/eniroment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private zone: NgZone,
  ) {}

  // ─── AUTHENTICATION ────────────────────────────────────────────────────────
  sendPasswordResetOtp(email: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/users/forgot-password`, { email });
  }

  verifyPasswordResetOtp(email: string, otp: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/users/verify-otp`, { email, otp });
  }

  resetPasswordWithOtp(email: string, otp: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/users/reset-password`, { email, otp, newPassword });
  }

  // ─── USERS ────────────────────────────────────────────────────────────────
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/users`);
  }

  getUser(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/users/${id}`);
  }

  createUser(user: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/users`, user);
  }

  updateUser(id: string, updates: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/users/${id}`, updates);
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/users/${id}`);
  }

  // ─── COMPANIES ────────────────────────────────────────────────────────────
  getCompanies(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/companies`);
  }

  streamCompanies(): Observable<any[]> {
    return new Observable((observer) => {
      const eventSource = new EventSource(`${this.baseUrl}/companies/stream`);

      eventSource.onmessage = (event) => {
        this.zone.run(() => {
          try {
            const data = JSON.parse(event.data);
            if (!data.type || data.type !== 'connected') {
              observer.next(data);
            }
          } catch (error) {
            console.error('Error parsing company stream data', error);
          }
        });
      };

      eventSource.onerror = (error) => {
        this.zone.run(() => {
          console.error('Company SSE Error (Connection might be down):', error);
          // Instead of silent failure, we could notify the observer or just log it
          // Native EventSource will attempt to reconnect automatically
        });
      };

      return () => {
        eventSource.close();
      };
    });
  }

  getCompany(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/companies/${id}`);
  }

  getCompanyByOwnerId(ownerId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/companies/owner/${ownerId}`);
  }

  createCompany(company: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/companies`, company);
  }

  updateCompany(id: string, updates: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/companies/${id}`, updates);
  }

  deleteCompany(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/companies/${id}`);
  }

  getCompanyDashboard(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/companies/${id}/dashboard`);
  }

  getCompanyReviews(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/companies/${id}/reviews`);
  }

  submitCompanyReview(id: string, review: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/companies/${id}/reviews`, review);
  }

  requestPlanChangeOtp(email: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/companies/request-plan-change-otp`, { email });
  }

  verifyPlanChangeOtp(payload: {
    email: string;
    otp: string;
    companyId: string;
    newPlan: any;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/companies/verify-plan-change-otp`, payload);
  }

  // ─── COMPETITIONS ─────────────────────────────────────────────────────────
  getCompetitions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/competitions`);
  }

  streamCompetitions(): Observable<any[]> {
    return new Observable((observer) => {
      const eventSource = new EventSource(`${this.baseUrl}/competitions/stream`);

      eventSource.onmessage = (event) => {
        this.zone.run(() => {
          try {
            const data = JSON.parse(event.data);
            if (!data.type || data.type !== 'connected') {
              observer.next(data);
            }
          } catch (error) {
            console.error('Error parsing competition stream data', error);
          }
        });
      };

      eventSource.onerror = (error) => {
        this.zone.run(() => {
          console.error('Competition SSE Error (Check if backend on port 5000 is running):', error);
        });
      };

      return () => {
        eventSource.close();
      };
    });
  }

  getCompetition(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/competitions/${id}`);
  }

  getCompanyCompetitions(companyId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/competitions/company/${companyId}`);
  }

  createCompetition(competition: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/competitions`, competition);
  }

  updateCompetition(id: string, updates: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/competitions/${id}`, updates);
  }

  deleteCompetition(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/competitions/${id}`);
  }

  // ─── APPLICATIONS ─────────────────────────────────────────────────────────
  getApplications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/applications`);
  }

  getApplication(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/applications/${id}`);
  }

  getUserApplications(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/applications/user/${userId}`);
  }

  getCompetitionApplications(competitionId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/applications/competition/${competitionId}`);
  }

  createApplication(application: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/applications`, application);
  }

  updateApplication(id: string, updates: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/applications/${id}`, updates);
  }

  deleteApplication(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/applications/${id}`);
  }

  getCompanyApplications(companyId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/applications/company/${companyId}`);
  }

  // ─── PROJECTS ─────────────────────────────────────────────────────────────
  getCompanyProjects(companyId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/projects/company/${companyId}`);
  }
  
  createProject(project: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/projects`, project);
  }

  getProject(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/projects/${id}`);
  }

  updateProject(id: string, updates: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/projects/${id}`, updates);
  }

  // ─── INTERVIEWS ───────────────────────────────────────────────────────────
  getCompanyInterviews(companyId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/interviews/company/${companyId}`);
  }

  createInterview(interview: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/interviews`, interview);
  }

  // ─── BILLING ──────────────────────────────────────────────────────────────
  getCompanySubscription(companyId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/billing/subscription/company/${companyId}`);
  }

  getCompanyPayments(companyId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/billing/payments/company/${companyId}`);
  }

  // ─── ADMIN ────────────────────────────────────────────────────────────────
  getAdminStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/admin/stats`);
  }

  getAdminLogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/logs`);
  }

  getAdminAnalytics(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/admin/analytics`);
  }

  getSupportTickets(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/support`);
  }

  createSupportTicket(ticket: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/admin/support`, ticket);
  }

  updateSupportTicket(id: string, updates: any): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/admin/support/${id}`, updates);
  }

  getFaqs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/faqs`);
  }

  getTestimonials(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/testimonials`);
  }

  getAdminNotifications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/notifications`);
  }

  getRoles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/roles`);
  }

  createRole(role: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/admin/roles`, role);
  }

  updateRole(id: string, role: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/admin/roles/${id}`, role);
  }

  deleteRole(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/admin/roles/${id}`);
  }

  getSystemSettings(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/admin/system-settings`);
  }

  updateSystemSettings(settings: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/admin/system-settings`, settings);
  }

  getAdminPayments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/payments`);
  }

  getAdminPlans(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/plans`);
  }

  updateAdminPlan(id: string, plan: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/admin/plans/${id}`, plan);
  }

  // Public endpoint — used by pricing page
  getPlans(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/plans`);
  }
}
