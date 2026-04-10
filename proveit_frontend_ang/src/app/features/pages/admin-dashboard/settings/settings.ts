import { Component, OnInit, inject } from '@angular/core';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../../services/api.service';
import { ThemeService } from '../../../../services/theme.service';
import { SystemSettingsService } from '../../../../services/system-settings.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, FormsModule, RouterLink],
  templateUrl: './settings.html',
})
export class AdminSettings implements OnInit {
  private api = inject(ApiService);
  public theme = inject(ThemeService);
  private systemSettings = inject(SystemSettingsService);

  settings: any = {};
  isSaving = false;
  saveState: 'idle' | 'success' | 'error' = 'idle';

  toggles = [
    {
      key: 'maintenanceMode',
      label: 'Maintenance Mode',
      desc: 'Temporarily redirect all non-admin traffic to the maintenance page.',
    },
    { key: 'registrationOpen', label: 'Open Registration', desc: 'Allow new user signups' },
    { key: 'aiAssistantEnabled', label: 'AI Assistant', desc: 'Enable AI coach for candidates' },
    {
      key: 'plagiarismCheckEnabled',
      label: 'Plagiarism Detection',
      desc: 'Run similarity checks on all submissions',
    },
  ];

  ngOnInit() {
    this.api.getSystemSettings().subscribe((settings) => {
      this.settings = { ...settings };
    });
  }

  toggle(key: string) {
    this.settings[key] = !this.settings[key];
  }

  loadDefaults() {
    this.settings = {
      maintenanceMode: false,
      registrationOpen: true,
      aiAssistantEnabled: true,
      plagiarismCheckEnabled: true,
      maxFileUploadMB: 50,
      defaultPlan: 'Free',
      supportEmail: 'support@proveit.io',
      platformVersion: '2.1.4',
    };
  }

  saveSettings() {
    this.isSaving = true;
    this.saveState = 'idle';

    this.api.updateSystemSettings(this.settings).subscribe({
      next: (settings) => {
        this.settings = { ...settings };
        this.systemSettings.applyLocalSettings(settings);
        this.isSaving = false;
        this.saveState = 'success';
      },
      error: (error) => {
        console.error(error);
        this.isSaving = false;
        this.saveState = 'error';
      },
    });
  }
}
