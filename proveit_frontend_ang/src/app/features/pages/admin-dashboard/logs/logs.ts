import { Component } from '@angular/core';
import { DummyDataService } from '../../../../services/dummy-data.service';
import { NgFor, NgClass, NgIf, TitleCasePipe, SlicePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-logs',
  standalone: true,
  imports: [NgFor, NgClass, NgIf, TitleCasePipe, SlicePipe, DatePipe, FormsModule],
  templateUrl: './logs.html',
  
})
export class AdminLogs {
  constructor(public data: DummyDataService) {}
  filter = 'all';
  filters = ['all', 'info', 'warning', 'error'];
  searchTerm = '';
  get filtered() {
    let list = this.filter === 'all'
      ? this.data.activityLogs
      : this.data.activityLogs.filter((l) => l.severity === this.filter);
    
    if (this.searchTerm) {
      list = list.filter((l) => 
        l.action?.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
        l.description?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    return list;
  }
}
