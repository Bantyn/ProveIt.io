import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { NgForOf, NgIf, NgClass, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { ApiService } from '../../../services/api.service';
import { FluidDropdown, DropdownOption } from '../../components/ui/fluid-dropdown/fluid-dropdown';
import { FaqAccordion, FaqItem } from '../../components/faq-accordion/faq-accordion';

interface Filters {
  search: string;
  industry: string;
  location: string;
  size: string;
}

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [
    NgForOf,
    NgIf,
    NgClass,
    DecimalPipe,
    FormsModule,
    Navbar,
    Footer,
    RouterLink,
    FluidDropdown,
    FaqAccordion,
  ],
  templateUrl: './company.html',
  styleUrl: './company.css',
})
export class Company implements OnInit, OnDestroy {
  /* ================= FILTER DATA ================= */
  industryOptions: DropdownOption[] = [
    { value: 'Technology', label: 'Technology', icon: 'bi bi-cpu-fill' },
    { value: 'Finance', label: 'Finance', icon: 'bi bi-bank2' },
    { value: 'Healthcare', label: 'Healthcare', icon: 'bi bi-heart-pulse-fill' },
    { value: 'Education', label: 'Education', icon: 'bi bi-book-fill' },
    { value: 'E-commerce', label: 'E-commerce', icon: 'bi bi-cart-fill' },
    { value: 'Manufacturing', label: 'Manufacturing', icon: 'bi bi-gear-fill' },
    { value: 'Consulting', label: 'Consulting', icon: 'bi bi-briefcase-fill' },
    {
      value: 'Media & Entertainment',
      label: 'Media & Entertainment',
      icon: 'bi bi-play-circle-fill',
    },
  ];

  locationOptions: DropdownOption[] = [
    { value: 'Remote', label: 'Remote', icon: 'bi bi-globe' },
    { value: 'Bangalore', label: 'Bangalore', icon: 'bi bi-geo-alt-fill' },
    { value: 'Mumbai', label: 'Mumbai', icon: 'bi bi-geo-alt-fill' },
    { value: 'Delhi', label: 'Delhi', icon: 'bi bi-geo-alt-fill' },
    { value: 'Pune', label: 'Pune', icon: 'bi bi-geo-alt-fill' },
    { value: 'Hyderabad', label: 'Hyderabad', icon: 'bi bi-geo-alt-fill' },
    { value: 'Chennai', label: 'Chennai', icon: 'bi bi-geo-alt-fill' },
  ];

  sizeOptions: DropdownOption[] = [
    { value: '1-10 Employees', label: '1–10 Employees', icon: 'bi bi-people-fill' },
    { value: '11-50 Employees', label: '11–50 Employees', icon: 'bi bi-people-fill' },
    { value: '51-200 Employees', label: '51–200 Employees', icon: 'bi bi-people-fill' },
    { value: '201-500 Employees', label: '201–500 Employees', icon: 'bi bi-people-fill' },
    { value: '500+ Employees', label: '500+ Employees', icon: 'bi bi-people-fill' },
  ];

  // keep for any legacy usages
  industries: string[] = [
    'Technology',
    'Finance',
    'Healthcare',
    'Education',
    'E-commerce',
    'Manufacturing',
    'Consulting',
    'Media & Entertainment',
  ];
  locations: string[] = ['Remote', 'Bangalore', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad', 'Chennai'];
  sizes: string[] = [
    '1-10 Employees',
    '11-50 Employees',
    '51-200 Employees',
    '201-500 Employees',
    '500+ Employees',
  ];

  filters: Filters = {
    search: '',
    industry: '',
    location: '',
    size: '',
  };

  howItWorksItems: FaqItem[] = [
    {
      question: 'How do companies hire on ProveIt?',
      answer: 'Create a company profile, post a skill-based competition, and invite candidates. You can then review their submissions and hire the best fits.',
      meta: 'Hiring'
    },
    {
      question: 'What kind of challenges can we post?',
      answer: 'You can post technical coding challenges, design briefs, marketing case studies, or any project-based assessment relevant to your open roles.',
      meta: 'Challenges'
    },
    {
      question: 'How do we evaluate candidates?',
      answer: 'Our platform provides a structured dashboard to review submissions, code repositories, and live demos, allowing you to score and shortlist candidates efficiently.',
      meta: 'Evaluation'
    }
  ];

  /* ================= COMPANIES ================= */
  companies: any[] = [];
  isLoading: boolean = true;

  private subscription: any;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.isLoading = true;
    this.subscription = this.api.getCompanies().subscribe({
      next: (data) => {
        this.companies = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to stream companies:', err);
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

  /* ================= FILTERED LIST ================= */
  get filteredCompanies() {
    return this.companies.filter((c) => {
      const cName = (c.companyName || c.name || '').toLowerCase();
      const cDesc = (c.description || '').toLowerCase();
      const searchTerms = this.filters.search.toLowerCase();

      return (
        (!this.filters.search || cName.includes(searchTerms) || cDesc.includes(searchTerms)) &&
        (!this.filters.industry || (c.industry && c.industry.includes(this.filters.industry))) &&
        (!this.filters.location || (c.location && c.location.includes(this.filters.location))) &&
        (!this.filters.size || c.size === this.filters.size)
      );
    });
  }

  /* ================= CLEAR ================= */
  clearFilters() {
    this.filters = {
      search: '',
      industry: '',
      location: '',
      size: '',
    };
  }
}
