import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';

@Component({
  selector: 'app-text-rotate',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './text-rotate.html',
  styleUrl: './text-rotate.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextRotateComponent implements OnInit, OnChanges, OnDestroy {
  @Input() texts: string[] = [];
  @Input() rotationInterval = 2200;
  @Input() mainClassName = '';
  @Input() elementClassName = '';
  @Input() splitBy: 'characters' | 'words' = 'characters';

  currentIndex = 0;
  parts: string[] = [];

  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.resetRotation();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['texts'] || changes['rotationInterval'] || changes['splitBy']) {
      this.resetRotation();
    }
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  trackByIndex(index: number) {
    return `${this.currentIndex}-${index}`;
  }

  private updateParts() {
    const currentText = this.texts[this.currentIndex] || '';
    this.parts =
      this.splitBy === 'words'
        ? currentText.split(' ').map((part, index, arr) => (index < arr.length - 1 ? `${part} ` : part))
        : Array.from(currentText);
    this.cdr.markForCheck();
  }

  private resetRotation() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.currentIndex = 0;
    this.updateParts();

    if (this.texts.length > 1 && this.rotationInterval > 0) {
      this.intervalId = setInterval(() => {
        this.currentIndex = (this.currentIndex + 1) % this.texts.length;
        this.updateParts();
      }, this.rotationInterval);
    }
  }
}
