import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { NgForOf, NgIf, NgClass, DatePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { FluidDropdown, DropdownOption } from '../../components/ui/fluid-dropdown/fluid-dropdown';
import { FaqAccordion, FaqItem } from '../../components/faq-accordion/faq-accordion';
import { ShaderHeroComponent } from '../../components/ui/shader-hero/shader-hero';

interface Filters {
  search: string;
  location: string;
  projectType: string;
  experience: string;
  view: 'all' | 'recently_viewed';
}

const RECENTLY_VIEWED_KEY = 'recently_viewed_competitions';
const MAX_RECENTLY_VIEWED = 10;

@Component({
  selector: 'app-compition',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Navbar,
    Footer,
    RouterLink,
    FluidDropdown,
    FaqAccordion,
    ShaderHeroComponent,
  ],
  templateUrl: './compition.html',
  styleUrl: './compition.css',
})
export class Compition implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private api = inject(ApiService);

  /* ================= FILTER DATA ================= */
  locationOptions: DropdownOption[] = [
    { value: 'Remote', label: 'Remote', icon: 'bi bi-globe' },
    { value: 'Bangalore', label: 'Bangalore', icon: 'bi bi-geo-alt-fill' },
    { value: 'Mumbai', label: 'Mumbai', icon: 'bi bi-geo-alt-fill' },
    { value: 'Delhi', label: 'Delhi', icon: 'bi bi-geo-alt-fill' },
    { value: 'Pune', label: 'Pune', icon: 'bi bi-geo-alt-fill' },
    { value: 'Hybrid', label: 'Hybrid', icon: 'bi bi-building' },
  ];

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

  experienceOptions: DropdownOption[] = [
    { value: 'Fresher', label: 'Fresher', icon: 'bi bi-mortarboard-fill' },
    { value: 'Junior', label: 'Junior', icon: 'bi bi-person-fill' },
    { value: 'Mid', label: 'Mid Level', icon: 'bi bi-person-badge-fill' },
    { value: 'Senior', label: 'Senior', icon: 'bi bi-award-fill' },
  ];

  skills: string[] = ['React', 'Angular', 'Node.js', 'Python', 'Java', 'UI/UX', 'Figma'];

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

  // keep legacy arrays for any remaining usages
  locations: string[] = ['Remote', 'Bangalore', 'Mumbai', 'Delhi', 'Pune', 'Hybrid'];
  projectTypes: string[] = [
    'Web Development',
    'Backend Development',
    'Full Stack',
    'UI/UX Design',
    'Artificial Intelligence',
    'Mobile Development',
    'DevOps / Cloud',
    'Cyber Security',
    'Data Analysis',
    'Product Management',
  ];

  filters: Filters = {
    search: '',
    location: '',
    projectType: '',
    experience: '',
    view: 'all',
  };

  /* ================= COMPETITIONS ================= */
  competitions: any[] = [];
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

    this.subscription = this.api.getCompetitions().subscribe({
      next: (data) => {
        this.competitions = data;
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
  getStatus(competition: any): 'upcoming' | 'active' | 'completed' {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const startDate = competition.startDate
      ? new Date(competition.startDate)
      : (competition.projectInfo?.startDate ? new Date(competition.projectInfo.startDate) : null);
    const endDate = competition.endDate
      ? new Date(competition.endDate)
      : (competition.projectInfo?.deadline ? new Date(competition.projectInfo.deadline) : null);

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
          (c.title && c.title.toLowerCase().includes(this.filters.search.toLowerCase())) ||
          (c.name && c.name.toLowerCase().includes(this.filters.search.toLowerCase())) ||
          (c.company && c.company.toLowerCase().includes(this.filters.search.toLowerCase()))) &&
        (!this.filters.location || c.location === this.filters.location) &&
        (!this.filters.projectType || c.projectType === this.filters.projectType) &&
        (!this.filters.experience || c.experienceLevel === this.filters.experience),
    );
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
      location: '',
      projectType: '',
      experience: '',
      view: 'all',
    };
  }
}
