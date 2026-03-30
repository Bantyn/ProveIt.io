import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { ApiService } from '../../../services/api.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-competition-leaderboard',
  standalone: true,
  imports: [CommonModule, Navbar, Footer, RouterLink],
  templateUrl: './competition-leaderboard.html',
  styleUrls: ['./competition-leaderboard.css'],
})
export class CompetitionLeaderboard implements OnInit {
  competitionId: string | null = null;
  competition: any = null;
  leaderboard: any[] = [];
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit() {
    this.competitionId = this.route.snapshot.paramMap.get('id');
    if (!this.competitionId) {
      this.isLoading = false;
      return;
    }

    try {
      // Load competition details
      this.competition = await firstValueFrom(this.api.getCompetition(this.competitionId));

      // Load applications for this competition
      const apps: any[] = await firstValueFrom(this.api.getCompetitionApplications(this.competitionId));

      // Filter scored apps, sort by score desc
      this.leaderboard = apps
        .filter((a: any) => typeof a.score === 'number' && Number.isFinite(a.score))
        .sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0))
        .map((a: any, idx: number) => ({ ...a, leaderboardRank: idx + 1 }));

      // Enrich with profile images from user profiles
      await Promise.all(
        this.leaderboard.map(async (entry) => {
          if (entry.profileImage) return; // already has one
          if (!entry.userId) return;
          try {
            const user: any = await firstValueFrom(this.api.getUser(entry.userId));
            entry.profileImage = user?.profileImage || user?.profile?.profileImage || user?.candidateProfile?.profileImage || '';
          } catch {
            // Silently skip — will show initials fallback
          }
        }),
      );
    } catch (err) {
      console.error('Error loading leaderboard', err);
    }

    this.isLoading = false;
    this.cdr.detectChanges();
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name
      .split(/[\s@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }
}
