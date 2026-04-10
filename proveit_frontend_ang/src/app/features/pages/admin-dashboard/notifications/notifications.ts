import { Component } from '@angular/core';
import { DummyDataService } from '../../../../services/dummy-data.service';
import { NgFor, NgClass, NgIf } from '@angular/common';

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [NgFor, NgClass, NgIf],
  templateUrl: './notifications.html',
  
})
export class AdminNotifications {
  constructor(public data: DummyDataService) {}
  markAll() {
    this.data.notifications.forEach((n) => (n.status = 'read'));
  }
}
