import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { ApiService } from '../../../services/api.service';
import { MorphLoading } from '../../components/ui/morph-loading/morph-loading';

@Component({
  selector: 'app-leader',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, Navbar, Footer, MorphLoading],
  templateUrl: './leader.html',
})
export class LeaderPage implements OnInit {
  private api = inject(ApiService);
  
  winners: any[] = [];
  loading = true;

  ngOnInit() {
    this.api.getApplications().subscribe({
      next: (apps) => {
        // Filter those marked as 'winner'
        this.winners = apps.filter(a => a.status === 'winner').sort((a, b) => (b.score || 0) - (a.score || 0));
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }
}
