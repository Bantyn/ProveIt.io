import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../../../services/api.service';
import { SystemSettingsService } from '../../../../services/system-settings.service';

import { StarsBackground } from '../../../../features/components/ui/stars-background/stars-background';

@Component({
  selector: 'app-admin-maintenance',
  standalone: true,
  imports: [CommonModule, StarsBackground],
  templateUrl: './maintenance.html',
})
export class AdminMaintenance implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private systemSettings = inject(SystemSettingsService);

  settings: any = null;
  isAdminView = false;
  isSaving = false;

  ngOnInit() {
    this.isAdminView = this.router.url.startsWith('/admin');
    this.loadSettings();
  }

  loadSettings() {
    this.api.getSystemSettings().subscribe((settings) => {
      this.settings = settings;
    });
  }

  refreshStatus() {
    this.systemSettings.refresh().subscribe(() => {
      this.settings = this.systemSettings.currentSettings;
    });
  }

  toggleMaintenance(enabled: boolean) {
    this.isSaving = true;
    this.api.updateSystemSettings({
      ...this.settings,
      maintenanceMode: enabled,
    }).subscribe({
      next: (settings) => {
        this.settings = settings;
        this.systemSettings.applyLocalSettings(settings);
        this.isSaving = false;
      },
      error: () => {
        this.isSaving = false;
      },
    });
  }
}
