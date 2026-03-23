import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgForOf, NgClass } from '@angular/common';

interface RatingItem {
  emoji: string;
  label: string;
}

const RATING_DATA: RatingItem[] = [
  { emoji: '😔', label: 'Terrible' },
  { emoji: '😕', label: 'Poor' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😍', label: 'Amazing' },
];

@Component({
  selector: 'app-emoji-rating',
  standalone: true,
  imports: [NgForOf, NgClass],
  templateUrl: './emoji-rating.html',
  styleUrl: './emoji-rating.css',
})
export class EmojiRating {
  @Input() initialRating: number = 0;
  @Output() ratingChange = new EventEmitter<number>();

  rating: number = 0;
  hoverRating: number = 0;
  readonly ratingData = RATING_DATA;

  get displayRating(): number {
    return this.hoverRating || this.rating;
  }

  get activeLabel(): string {
    const d = this.displayRating;
    return d > 0 ? RATING_DATA[d - 1].label : '';
  }

  ngOnInit() {
    this.rating = this.initialRating || 0;
  }

  handleClick(value: number): void {
    this.rating = value;
    this.ratingChange.emit(value);
  }

  setHover(value: number): void {
    this.hoverRating = value;
  }

  clearHover(): void {
    this.hoverRating = 0;
  }

  isActive(index: number): boolean {
    return index + 1 <= this.displayRating;
  }
}
