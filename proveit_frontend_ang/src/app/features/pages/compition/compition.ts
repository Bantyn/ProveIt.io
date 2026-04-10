import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { NgIf, NgClass, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Footer } from '../../components/footer/footer';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { FluidDropdown, DropdownOption } from '../../components/ui/fluid-dropdown/fluid-dropdown';
import { FaqAccordion, FaqItem } from '../../components/faq-accordion/faq-accordion';
import { ShaderHeroComponent } from '../../components/ui/shader-hero/shader-hero';
import { TextRotateComponent } from '../../components/ui/text-rotate/text-rotate';
import { Navbar } from '../../components/navbar/navbar';
import { forkJoin } from 'rxjs';

interface Filters {
  search: string;
  projectType: string;
  difficulty: string;
  skill: string;
  view: 'all' | 'recently_viewed';
}

interface CompetitionCard {
  id: string;
  title: string;
  company: string;
  companyLogo: string;
  bannerImage: string;
  location: string;
  projectType: string;
  requiredSkills: string[];
  startDate: string | null;
  deadline: string | null;
  difficulty: string;
  maxCandidates: number | null;
}

interface CompanyLookup {
  id: string;
  name: string;
  logoUrl: string;
}

const RECENTLY_VIEWED_KEY = 'recently_viewed_competitions';
const MAX_RECENTLY_VIEWED = 10;

@Component({
  selector: 'app-compition',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Footer,
    RouterLink,
    FluidDropdown,
    FaqAccordion,
    ShaderHeroComponent,
    TextRotateComponent,
    Navbar,
  ],
  templateUrl: './compition.html',
  styleUrl: './compition.css',
})
export class Compition implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private api = inject(ApiService);

  /* ================= FILTER DATA ================= */
  projectTypeOptions: DropdownOption[] = [
    { value: 'Web Development', label: 'Web Development', icon: 'bi bi-browser-chrome' },
    { value: 'Backend Development', label: 'Backend Development', icon: 'bi bi-server' },
    { value: 'Full Stack', label: 'Full Stack', icon: 'bi bi-layers-fill' },
    { value: 'UI/UX Design', label: 'UI/UX Design', icon: 'bi bi-palette-fill' },
    { value: 'Artificial Intelligence', label: 'AI / ML', icon: 'bi bi-robot' },
    { value: 'Mobile Development', label: 'Mobile Dev', icon: 'bi bi-phone-fill' },
    { value: 'DevOps / Cloud', label: 'DevOps / Cloud', icon: 'bi bi-cloud-fill' },
    { value: 'Cyber Security', label: 'Cyber Security', icon: 'bi bi-shield-fill-check' },
    { value: 'Data Analysis', label: 'Data Analysis', icon: 'bi bi-bar-chart-fill' },
    { value: 'Product Management', label: 'Product Mgmt', icon: 'bi bi-kanban-fill' },
  ];

  difficultyOptions: DropdownOption[] = [
    { value: 'EASY', label: 'Easy', icon: 'bi bi-star' },
    { value: 'MEDIUM', label: 'Medium', icon: 'bi bi-star-half' },
    { value: 'HARD', label: 'Hard', icon: 'bi bi-stars' },
  ];

  skillOptions: DropdownOption[] = [
    { value: 'Angular', label: 'Angular', icon: 'bi bi-code-slash' },
    { value: 'React', label: 'React', icon: 'bi bi-code-slash' },
    { value: 'Node.js', label: 'Node.js', icon: 'bi bi-hdd-network' },
    { value: 'Python', label: 'Python', icon: 'bi bi-terminal' },
    { value: 'Java', label: 'Java', icon: 'bi bi-cup-hot' },
    { value: 'UI/UX', label: 'UI/UX', icon: 'bi bi-palette' },
    { value: 'Figma', label: 'Figma', icon: 'bi bi-vector-pen' },
  ];

  howItWorksItems: FaqItem[] = [
    {
      question: 'How do I participate in a competition?',
      answer: 'Browse the active competitions and click on one that matches your skills. Make sure your profile is complete before you start.',
      meta: 'Participation'
    },
    {
      question: 'What is the format of the competitions?',
      answer: 'Competitions are typically project-based. You will receive a brief and a set of requirements to build a solution within a specific timeframe.',
      meta: 'Format'
    },
    {
      question: 'Is there any fee to join?',
      answer: 'No, participating in competitions on ProveIt is completely free for candidates.',
      meta: 'Fees'
    }
  ];

  filters: Filters = {
    search: '',
    projectType: '',
    difficulty: '',
    skill: '',
    view: 'all',
  };

  /* ================= COMPETITIONS ================= */
  competitions: CompetitionCard[] = [];
  isLoading: boolean = true;
  recentlyViewedIds: string[] = [];

  private subscription: any;

  ngOnInit() {
    this.isLoading = true;
    // Load stored recently viewed IDs from localStorage
    try {
      const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
      this.recentlyViewedIds = stored ? JSON.parse(stored) : [];
    } catch {
      this.recentlyViewedIds = [];
    }

    this.subscription = forkJoin({
      competitions: this.api.getCompetitions(),
      companies: this.api.getCompanies(),
    }).subscribe({
      next: ({ competitions, companies }) => {
        const companyLookup = this.buildCompanyLookup(companies || []);
        this.competitions = (competitions || []).map((competition) =>
          this.toCompetitionCard(competition, companyLookup),
        );
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('SSE connection error or closed:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  /* ================= DATE CLASSIFICATION ================= */
  getStatus(competition: CompetitionCard): 'upcoming' | 'active' | 'completed' {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const startDate = competition.startDate ? new Date(competition.startDate) : null;
    const endDate = competition.deadline ? new Date(competition.deadline) : null;

    if (endDate) endDate.setHours(23, 59, 59, 999);
    if (startDate) startDate.setHours(0, 0, 0, 0);

    if (endDate && now > endDate) return 'completed';
    if (startDate && now < startDate) return 'upcoming';
    return 'active';
  }

  /* ================= RECENTLY VIEWED ================= */
  trackView(competitionId: string) {
    try {
      const ids = this.recentlyViewedIds.filter((id) => id !== competitionId);
      ids.unshift(competitionId);
      this.recentlyViewedIds = ids.slice(0, MAX_RECENTLY_VIEWED);
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(this.recentlyViewedIds));
    } catch {}
  }

  /* ================= BASE FILTERED LIST ================= */
  private get baseFiltered() {
    return this.competitions.filter(
      (c) =>
        (!this.filters.search ||
          c.title.toLowerCase().includes(this.filters.search.toLowerCase()) ||
          c.company.toLowerCase().includes(this.filters.search.toLowerCase()) ||
          c.requiredSkills.some((skill) =>
            skill.toLowerCase().includes(this.filters.search.toLowerCase()),
          )) &&
        (!this.filters.projectType || c.projectType === this.filters.projectType) &&
        (!this.filters.difficulty || c.difficulty === this.filters.difficulty) &&
        (!this.filters.skill || c.requiredSkills.includes(this.filters.skill)),
    );
  }

  canOpenCompetition(competition: CompetitionCard): boolean {
    return this.getStatus(competition) !== 'upcoming';
  }

  /* ================= CATEGORIZED GETTERS ================= */
  get upcomingCompetitions() {
    const list = this.baseFiltered.filter((c) => this.getStatus(c) === 'upcoming');
    if (this.filters.view === 'recently_viewed') {
      return list.filter((c) => this.recentlyViewedIds.includes(c.id));
    }
    return list;
  }

  get activeCompetitions() {
    const list = this.baseFiltered.filter((c) => this.getStatus(c) === 'active');
    if (this.filters.view === 'recently_viewed') {
      return list.filter((c) => this.recentlyViewedIds.includes(c.id));
    }
    return list;
  }

  get completedCompetitions() {
    const list = this.baseFiltered.filter((c) => this.getStatus(c) === 'completed');
    if (this.filters.view === 'recently_viewed') {
      return list.filter((c) => this.recentlyViewedIds.includes(c.id));
    }
    return list;
  }

  /* ================= CLEAR ================= */
  clearFilters() {
    this.filters = {
      search: '',
      projectType: '',
      difficulty: '',
      skill: '',
      view: 'all',
    };
  }

  private toCompetitionCard(
    competition: any,
    companyLookup: Map<string, CompanyLookup>,
  ): CompetitionCard {
    const companyName = competition.company || competition.companyName || 'Partner';
    const companyDetails =
      companyLookup.get(competition.companyId || '') ||
      companyLookup.get(companyName.toLowerCase()) ||
      null;

    return {
      id: competition.id || competition._id || '',
      title: competition.title || competition.name || 'Untitled Competition',
      company: companyDetails?.name || companyName,
      companyLogo:
        competition.companyLogo ||
        competition.logoUrl ||
        competition.company?.logoUrl ||
        companyDetails?.logoUrl ||
        'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop',
      bannerImage:
        competition.img_url ||
        competition.imageUrl ||
        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=60',
      location: competition.location || competition.projectInfo?.location || '',
      projectType:
        competition.projectType || competition.competitionType || competition.category || '',
      requiredSkills: competition.requiredSkills || competition.skillsRequired || [],
      startDate: competition.startDate || competition.projectInfo?.startDate || null,
      deadline: competition.endDate || competition.deadline || competition.projectInfo?.deadline || null,
      difficulty: competition.projectInfo?.difficulty || '',
      maxCandidates: competition.projectInfo?.maxCandidates || null,
    };
  }

  private buildCompanyLookup(companies: any[]): Map<string, CompanyLookup> {
    const lookup = new Map<string, CompanyLookup>();

    for (const company of companies) {
      const normalized: CompanyLookup = {
        id: company.id || company._id || '',
        name: company.companyName || company.name || 'Partner',
        logoUrl:
          company.logoUrl ||
          company.imageUrl ||
          company.profileImage ||
          'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop',
      };

      if (normalized.id) {
        lookup.set(normalized.id, normalized);
      }

      lookup.set(normalized.name.toLowerCase(), normalized);
    }

    return lookup;
  }
}
