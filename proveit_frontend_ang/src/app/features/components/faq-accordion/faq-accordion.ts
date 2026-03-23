import { Component, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FaqItem {
  question: string;
  answer: string;
  meta: string;
}

@Component({
  selector: 'app-faq-accordion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faq-accordion.html',
  styleUrl: './faq-accordion.css',
})
export class FaqAccordion implements OnInit, OnChanges {
  @Input() searchQuery: string = '';
  @Input() items?: FaqItem[];

  activeIndex: number = -1;

  allFaqs: FaqItem[] = [
    {
      question: 'How do I create an account on ProveIt?',
      answer:
        'Simply click "Sign Up" on the homepage, fill in your details and choose whether you are a candidate or a company. Your account will be ready in under a minute.',
      meta: 'Getting Started',
    },
    {
      question: 'How does skill-based hiring work on ProveIt?',
      answer:
        'Companies post real-world challenges called competitions. Candidates apply and submit their solutions. Companies evaluate submissions directly, moving beyond resumes to see actual work.',
      meta: 'Platform',
    },
    {
      question: 'Can I apply to multiple competitions at the same time?',
      answer:
        'Yes! You can apply to as many competitions as you like simultaneously. Head to the Competitions page, browse open listings, and submit your application with just a few clicks.',
      meta: 'Candidates',
    },
    {
      question: 'How do companies post a competition?',
      answer:
        'After registering your company, navigate to your Company Dashboard and click "Post Competition". Fill in the challenge description, required skills, deadline, and prizes — then publish.',
      meta: 'Companies',
    },
    {
      question: 'Is my submitted work kept private?',
      answer:
        'Your submissions are only visible to the company that posted the competition and our platform moderators. We never share your work with third parties without your explicit consent.',
      meta: 'Privacy',
    },
    {
      question: 'How is scoring and evaluation handled?',
      answer:
        'Companies receive all submissions in their dashboard with structured evaluation tools. Scores are transparent — both companies and candidates can see the criteria used for ranking.',
      meta: 'Evaluation',
    },
    {
      question: 'What happens after I win a competition?',
      answer:
        'Winning candidates are notified immediately. The company may reach out for an interview, a project offer, or a full-time role. Your ProveIt profile is also updated to highlight your win.',
      meta: 'Results',
    },
    {
      question: 'How do I contact the ProveIt support team?',
      answer:
        'You can reach us via the Contact page at any time. Our team is available to help with account issues, platform guidance, or partnership inquiries.',
      meta: 'Support',
    },
  ];

  filteredFaqs: FaqItem[] = [...this.allFaqs];

  ngOnInit() {
    if (this.items && this.items.length > 0) {
      this.allFaqs = [...this.items];
      this.filteredFaqs = [...this.items];
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchQuery']) {
      this.filterFaqs();
      this.activeIndex = -1;
    }
  }

  filterFaqs(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredFaqs = [...this.allFaqs];
    } else {
      this.filteredFaqs = this.allFaqs.filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q) ||
          f.meta.toLowerCase().includes(q),
      );
    }
  }

  toggle(index: number): void {
    this.activeIndex = this.activeIndex === index ? -1 : index;
  }

  isOpen(index: number): boolean {
    return this.activeIndex === index;
  }

  trackByQuestion(_: number, item: FaqItem): string {
    return item.question;
  }
}
