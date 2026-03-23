import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { FaqAccordion } from '../../components/faq-accordion/faq-accordion';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [CommonModule, Navbar, Footer, FaqAccordion],
  templateUrl: './support.html',
  styleUrl: './support.css',
})
export class Support {
  searchQuery: string = '';

  onSearch(value: string): void {
    this.searchQuery = value;
  }
}
