import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { FaqAccordion } from '../../components/faq-accordion/faq-accordion';
import { ShaderHeroComponent } from '../../components/ui/shader-hero/shader-hero';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar, Footer, FaqAccordion, ShaderHeroComponent],
  templateUrl: './support.html',
  styleUrl: './support.css',
})
export class Support {
  searchQuery: string = '';

  onSearch(value: string): void {
    this.searchQuery = value;
  }
}
