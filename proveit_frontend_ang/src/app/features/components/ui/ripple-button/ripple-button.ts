import { Component, Input, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import gsap from 'gsap';

@Component({
  selector: 'app-ripple-button',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a [routerLink]="route"
       #button
       class="ripple-button relative inline-flex items-center justify-center overflow-hidden transition-all duration-300 bg-[var(--dd-blue)] text-white border border-[var(--dd-blue)]/30 rounded-4xl shadow-sm {{ className }}"
       (mouseenter)="onMouseEnter($event)"
       (mouseleave)="onMouseLeave()"
       (mousemove)="onMouseMove($event)">
      
      <!-- Content Layer -->
      <span #content class="relative z-20 flex items-center gap-2 pointer-events-none transition-colors duration-300 text-white">
        <ng-content></ng-content>
      </span>
      
      <!-- Ripple Layer -->
      <div #ripple class="ripple-element absolute rounded-full bg-white pointer-events-none z-10" 
           style="width: 100px; height: 100px; left: 0; top: 0; visibility: hidden; opacity: 0;">
      </div>
    </a>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
    
    .ripple-button {
      min-width: 12rem;
      cursor: pointer;
      text-decoration: none;
    }

    /* Ensure text color changes accurately */
    .ripple-button.is-rippled span {
      color: black !important;
    }
  `]
})
export class RippleButtonComponent {
  @Input() route: string = '';
  @Input() className: string = '';

  @ViewChild('button') buttonRef!: ElementRef<HTMLAnchorElement>;
  @ViewChild('ripple') rippleRef!: ElementRef<HTMLDivElement>;
  @ViewChild('content') contentRef!: ElementRef<HTMLSpanElement>;

  private isHovered = false;

  onMouseEnter(event: MouseEvent) {
    this.isHovered = true;
    const button = this.buttonRef.nativeElement;
    const ripple = this.rippleRef.nativeElement;
    const content = this.contentRef.nativeElement;
    const rect = button.getBoundingClientRect();
    
    // Calculate a size that definitely covers the button
    const size = Math.max(rect.width, rect.height) * 2.5;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Reset and Start Animation
    gsap.killTweensOf([ripple, content]);
    
    gsap.set(ripple, {
      width: size,
      height: size,
      left: x,
      top: y,
      xPercent: -50,
      yPercent: -50,
      scale: 0,
      opacity: 1,
      visibility: 'visible',
      backgroundColor: 'black'
    });

    // Expand Black Circle
    gsap.to(ripple, {
      scale: 1,
      duration: 0.6,
      ease: 'power3.out'
    });

    // Turn Text White
    gsap.to(content, {
      color: '#ffffff',
      duration: 0.3
    });
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isHovered) return;
    const button = this.buttonRef.nativeElement;
    const ripple = this.rippleRef.nativeElement;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Fluid movement following cursor
    gsap.to(ripple, {
      left: x,
      top: y,
      duration: 0.4,
      ease: 'power2.out'
    });
  }

  onMouseLeave() {
    this.isHovered = false;
    const ripple = this.rippleRef.nativeElement;
    const content = this.contentRef.nativeElement;

    // Shrink Circle and Restore Text
    gsap.to(ripple, {
      scale: 0,
      duration: 0.5,
      ease: 'power2.inOut',
      onComplete: () => {
        gsap.set(ripple, { visibility: 'hidden' });
      }
    });

    gsap.to(content, {
      color: '#0e352e',
      duration: 0.4
    });
  }
}
