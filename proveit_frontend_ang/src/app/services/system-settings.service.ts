import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiService } from './api.service';

export interface SystemSettings {
  maintenanceMode: boolean;
  registrationOpen: boolean;
  aiAssistantEnabled: boolean;
  plagiarismCheckEnabled: boolean;
  maxFileUploadMB: number;
  defaultPlan: string;
  supportEmail: string;
  platformVersion: string;
  updatedAt?: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
  maintenanceMode: false,
  registrationOpen: true,
  aiAssistantEnabled: true,
  plagiarismCheckEnabled: true,
  maxFileUploadMB: 50,
  defaultPlan: 'Free',
  supportEmail: 'support@proveit.io',
  platformVersion: '2.1.4',
};

@Injectable({
  providedIn: 'root',
})
export class SystemSettingsService {
  private api = inject(ApiService);
  private readonly settingsSubject = new BehaviorSubject<SystemSettings>(DEFAULT_SETTINGS);

  readonly settings$ = this.settingsSubject.asObservable();

  get currentSettings(): SystemSettings {
    return this.settingsSubject.value;
  }

  refresh(): Observable<SystemSettings> {
    return this.api.getSystemSettings().pipe(
      tap((settings) => {
        this.settingsSubject.next({ ...DEFAULT_SETTINGS, ...settings });
      }),
    );
  }

  applyLocalSettings(settings: Partial<SystemSettings>) {
    this.settingsSubject.next({
      ...this.currentSettings,
      ...settings,
    });
  }
}
