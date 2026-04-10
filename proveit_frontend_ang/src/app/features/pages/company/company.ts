import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { NgForOf, NgIf, NgClass, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Footer } from '../../components/footer/footer';
import { ApiService } from '../../../services/api.service';
import { FluidDropdown, DropdownOption } from '../../components/ui/fluid-dropdown/fluid-dropdown';
import { FaqAccordion, FaqItem } from '../../components/faq-accordion/faq-accordion';
import { ShaderHeroComponent } from '../../components/ui/shader-hero/shader-hero';
import { TextRotateComponent } from '../../components/ui/text-rotate/text-rotate';
import { Navbar } from '../../components/navbar/navbar';

interface Filters {
  search: string;
  industry: string;
  location: string;
  size: string;
}

interface CompanyCard {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  location: string;
  size: string;
  industry: string;
  averageRating: number;
  reviewCount: number;
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
    Footer,
    RouterLink,
    FluidDropdown,
    FaqAccordion,
    ShaderHeroComponent,
    Navbar,
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
    { value: '1-10 Employees', label: '1-10 Employees', icon: 'bi bi-people-fill' },
    { value: '11-50 Employees', label: '11-50 Employees', icon: 'bi bi-people-fill' },
    { value: '51-200 Employees', label: '51-200 Employees', icon: 'bi bi-people-fill' },
    { value: '201-500 Employees', label: '201-500 Employees', icon: 'bi bi-people-fill' },
    { value: '500+ Employees', label: '500+ Employees', icon: 'bi bi-people-fill' },
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
      answer:
        'Create a company profile, post a skill-based competition, and invite candidates. You can then review their submissions and hire the best fits.',
      meta: 'Hiring',
    },
    {
      question: 'What kind of challenges can we post?',
      answer:
        'You can post technical coding challenges, design briefs, marketing case studies, or any project-based assessment relevant to your open roles.',
      meta: 'Challenges',
    },
    {
      question: 'How do we evaluate candidates?',
      answer:
        'Our platform provides a structured dashboard to review submissions, code repositories, and live demos, allowing you to score and shortlist candidates efficiently.',
      meta: 'Evaluation',
    },
  ];

  /* ================= COMPANIES ================= */
  companies: CompanyCard[] = [];
  isLoading = true;

  private subscription: any;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.isLoading = true;
    this.subscription = this.api.getCompanies().subscribe({
      next: (data) => {
        this.companies = (data || []).map((company) => this.toCompanyCard(company));
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
    return this.companies.filter((company) => {
      const searchTerm = this.filters.search.toLowerCase();

      return (
        (!this.filters.search ||
          company.name.toLowerCase().includes(searchTerm) ||
          company.description.toLowerCase().includes(searchTerm)) &&
        (!this.filters.industry || company.industry.includes(this.filters.industry)) &&
        (!this.filters.location || company.location.includes(this.filters.location)) &&
        (!this.filters.size || company.size === this.filters.size)
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

  private toCompanyCard(company: any): CompanyCard {
    return {
      id: company.id || company._id || '',
      name: company.companyName || company.name || 'Unknown Company',
      description: company.description || 'Verified organization on ProveIt.io.',
      logoUrl:
        company.logoUrl ||
        company.imageUrl ||
        company.profileImage ||
        'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop',
      location: company.location || 'Multiple Locations',
      size: company.size || 'Growing Team',
      industry: company.industry || 'General',
      averageRating: Number(company.averageRating || 0),
      reviewCount: Number(company.reviewCount || 0),
    };
  }
}
