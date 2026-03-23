import { Component, Input, AfterViewInit, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';

@Component({
  selector: 'app-blur-text',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span #container class="inline-block {{ className }}">
      @for (char of chars; track $index) {
        <span class="char inline-block" [style.whiteSpace]="'pre'" style="opacity: 0; display: inline-block;">{{ char === ' ' ? '\u00A0' : char }}</span>
      }
    </span>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class BlurTextComponent implements AfterViewInit, OnChanges {
  @Input() text: string = '';
  @Input() className: string = '';
  @Input() delay: number = 0;

  @ViewChild('container') containerRef!: ElementRef<HTMLSpanElement>;

  chars: string[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['text']) {
      this.chars = this.text.split('');
    }
  }

  ngAfterViewInit(): void {
    this.animate();
  }

  animate(): void {
    if (!this.containerRef) return;

    const chars = this.containerRef.nativeElement.querySelectorAll('.char');

    gsap.set(chars, { opacity: 0, y: 10, filter: 'blur(8px)' });

    gsap.to(chars, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 0.3,
      ease: 'power2.out',
      stagger: 0.015,
      delay: this.delay,
      clearProps: 'filter',
    });
  }
}
