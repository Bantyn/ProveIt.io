import { Component } from '@angular/core';
import { DummyDataService } from '../../../../services/dummy-data.service';
import { NgFor, NgClass } from '@angular/common';

@Component({
  selector: 'app-admin-ai-config',
  standalone: true,
  imports: [NgFor, NgClass],
  templateUrl: './ai-config.html',
  
})
export class AdminAiConfig {
  constructor(public data: DummyDataService) {}
  get limitHitCount() {
    return this.data.aiRateLimits.filter((r) => r.status === 'limit_hit').length;
  }
  get totalUsage() {
    return this.data.aiRateLimits.reduce((s, r) => s + r.totalUsage, 0);
  }
}
