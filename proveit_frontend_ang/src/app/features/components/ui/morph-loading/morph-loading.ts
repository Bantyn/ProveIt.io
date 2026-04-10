import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-morph-loading',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './morph-loading.html',
  styleUrls: ['./morph-loading.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MorphLoading {
  @Input() variant: 'morph' = 'morph';
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' = 'md';
  @Input() theme: 'default' | 'light' = 'default';
  @Input() classes: string = '';

  get containerSizeClass(): string {
    switch (this.size) {
      case 'xs':
        return 'w-6 h-6';
      case 'sm':
        return 'w-16 h-16';
      case 'lg':
        return 'w-32 h-32';
      case 'md':
      default:
        return 'w-24 h-24';
    }
  }

  get elementSizeClass(): string {
    switch (this.size) {
      case 'xs':
        return 'w-1.5 h-1.5';
      case 'sm':
        return 'w-2.5 h-2.5';
      case 'lg':
        return 'w-6 h-6';
      case 'md':
      default:
        return 'w-4 h-4';
    }
  }

  get themeClass(): string {
    if (this.theme === 'light') {
      return 'bg-white opacity-90 shadow-sm';
    }
    return 'bg-[var(--dd-blue)] shadow-md border border-[var(--dd-blue)]/10';
  }

  // Generate an array of numbers to map over
  get items(): number[] {
    return [0, 1, 2, 3];
  }
}
