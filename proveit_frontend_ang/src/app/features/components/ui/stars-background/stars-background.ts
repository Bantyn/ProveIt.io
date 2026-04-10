import { Component, Input, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../../services/theme.service';

@Component({
  selector: 'app-stars-background',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="stars-container" 
      (mousemove)="onMouseMove($event)">
      
      <div class="parallax-layer" [style.transform]="parallaxTransform()">
        <div class="star-layer layer-1" [style.box-shadow]="stars1Computed()"></div>
        <div class="star-layer layer-2" [style.box-shadow]="stars2Computed()"></div>
        <div class="star-layer layer-3" [style.box-shadow]="stars3Computed()"></div>
      </div>

      <div class="content-wrapper">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .stars-container {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 100vh;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .parallax-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      transition: transform 0.2s ease-out;
      pointer-events: none;
    }

    .star-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 2px;
      height: 2px;
      background: transparent;
      border-radius: 50%;
      transition: box-shadow 1s ease;
    }

    .layer-1 {
      width: 1px;
      height: 1px;
      animation: animScroll 80s linear infinite;
    }

    .layer-2 {
      width: 2px;
      height: 2px;
      animation: animScroll 120s linear infinite;
    }

    .layer-3 {
      width: 3px;
      height: 3px;
      animation: animScroll 160s linear infinite;
    }

    .star-layer::after {
      content: " ";
      position: absolute;
      top: 2000px;
      width: inherit;
      height: inherit;
      background: inherit;
      box-shadow: inherit;
    }

    @keyframes animScroll {
      from { transform: translateY(0); }
      to { transform: translateY(-2000px); }
    }

    .content-wrapper {
      position: relative;
      z-index: 10;
      width: 100%;
      height: 100%;
    }
  `]
})
export class StarsBackground implements OnInit {
  public theme = inject(ThemeService);
  
  @Input() factor: number = 0.05;

  private stars1: string[] = [];
  private stars2: string[] = [];
  private stars3: string[] = [];

  mouseX = signal(0);
  mouseY = signal(0);

  parallaxTransform = computed(() => {
    const x = this.mouseX() * this.factor;
    const y = this.mouseY() * this.factor;
    return `translate3d(${x}px, ${y}px, 0)`;
  });

  stars1Computed = computed(() => this.formatShadows(this.stars1));
  stars2Computed = computed(() => this.formatShadows(this.stars2));
  stars3Computed = computed(() => this.formatShadows(this.stars3));

  ngOnInit() {
    this.stars1 = this.generateStarPositions(800);
    this.stars2 = this.generateStarPositions(300);
    this.stars3 = this.generateStarPositions(100);
  }

  onMouseMove(e: MouseEvent) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    this.mouseX.set(centerX - e.clientX);
    this.mouseY.set(centerY - e.clientY);
  }

  private generateStarPositions(count: number): string[] {
    const positions: string[] = [];
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * 4000) - 2000;
      const y = Math.floor(Math.random() * 4000) - 2000;
      positions.push(`${x}px ${y}px`);
    }
    return positions;
  }

  private formatShadows(positions: string[]): string {
    const color = this.theme.isDark() ? 'var(--dd-white)' : 'var(--dd-blue)';
    return positions.map(pos => `${pos} ${color}`).join(', ');
  }
}
