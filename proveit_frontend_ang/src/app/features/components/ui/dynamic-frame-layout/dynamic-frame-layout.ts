import { Component, Input, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Frame {
  id: number;
  video: string;
  title?: string;
  defaultPos: { x: number; y: number; w: number; h: number };
  corner?: string;
  edgeHorizontal?: string;
  edgeVertical?: string;
  mediaSize: number;
  borderThickness?: number;
  borderSize?: number;
}

@Component({
  selector: 'app-frame-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="relative w-full h-full overflow-hidden transition-all duration-300"
      [style.padding]="showFrame ? borderThickness + 'px' : '0'"
    >
      <div
        class="relative w-full h-full overflow-hidden rounded-xl border border-(--dd-blue)/20"
        [style.width]="showFrame ? borderSize + '%' : '100%'"
        [style.height]="showFrame ? borderSize + '%' : '100%'"
        [style.left]="showFrame ? (100 - borderSize) / 2 + '%' : '0'"
        [style.top]="showFrame ? (100 - borderSize) / 2 + '%' : '0'"
        style="transition: all 0.3s ease-in-out;"
      >
      <!-- Black Overlay with Text (Project Title) -->
      <div 
        class="absolute inset-0 bg-[var(--dd-blue-dark)] flex items-center justify-center p-8 text-center transition-all duration-300 z-10"
        [class.opacity-0]="isHovered"
        [class.pointer-events-none]="isHovered"
        [class.scale-95]="isHovered"
      >
        <h3 class="text-white dynamic-frame-title text-3xl transition-transform duration-500"
            [class.scale-110]="!isHovered">
          {{ title || 'ProveIt Project' }}
        </h3>
      </div>

      <!-- Video/Image Content -->
      <div
        class="w-full h-full overflow-hidden"
        [style.transform]="'scale(' + mediaSize + ')'"
        style="transform-origin: center; transition: transform 1s cubic-bezier(0.4, 0, 0.2, 1);"
      >
        @if (isVideo(video)) {
          <video
            #videoRef
            class="w-full h-full object-cover"
            [src]="video"
            loop
            muted
            autoplay
            playsInline
            [class.opacity-100]="isHovered"
            [class.opacity-0]="!isHovered"
            style="transition: opacity 0.5s ease-in-out;"
          ></video>
        } @else {
          <img
            [src]="video"
            class="w-full h-full object-cover"
            [class.opacity-100]="isHovered"
            [class.opacity-0]="!isHovered"
            style="transition: opacity 0.5s ease-in-out;"
            alt="Showcase Content"
          />
        }
      </div>

      <!-- Hover Overlay Gradient (Interactive State) -->
      <div 
        class="absolute inset-0 bg-linear-to-t from-black/60 to-transparent transition-opacity duration-300 pointer-events-none z-20"
        [class.opacity-0]="!isHovered"
        [class.opacity-100]="isHovered"
      ></div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class FrameItemComponent implements OnChanges {
  @Input() video: string = '';
  @Input() title?: string;
  @Input() corner?: string;
  @Input() edgeHorizontal?: string;
  @Input() edgeVertical?: string;
  @Input() mediaSize: number = 1;
  @Input() borderThickness: number = 0;
  @Input() borderSize: number = 100;
  @Input() showFrame: boolean = false;
  @Input() isHovered: boolean = false;

  @ViewChild('videoRef') videoRef!: ElementRef<HTMLVideoElement>;

  isVideo(url: string): boolean {
    return url.toLowerCase().endsWith('.mp4');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isHovered'] && !changes['isHovered'].firstChange) {
      this.handleVideoState();
    }
  }

  handleVideoState() {
    if (!this.videoRef) return;
    const video = this.videoRef.nativeElement;
    if (this.isHovered) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }
}

@Component({
  selector: 'app-dynamic-frame-layout',
  standalone: true,
  imports: [CommonModule, FrameItemComponent],
  template: `
    <div
      [className]="'relative w-full h-full ' + className"
      style="display: grid; transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);"
      [style.gridTemplateRows]="getRowSizes()"
      [style.gridTemplateColumns]="getColSizes()"
      [style.gap]="gapSize + 'px'"
    >
      @for (frame of frames; track frame.id) {
        <div
          class="relative h-full overflow-hidden transition-all duration-500"
          [style.gridRow]="getGridRow(frame)"
          [style.gridColumn]="getGridCol(frame)"
          [style.transformOrigin]="getTransformOrigin(frame.defaultPos.x, frame.defaultPos.y)"
          (mouseenter)="setHovered(frame)"
          (mouseleave)="clearHovered()"
        >
          <app-frame-item
            [video]="frame.video"
            [title]="frame.title"
            [mediaSize]="frame.mediaSize"
            [showFrame]="showFrames"
            [isHovered]="isFrameHovered(frame)"
          ></app-frame-item>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class DynamicFrameLayoutComponent {
  @Input() frames: Frame[] = [];
  @Input() className: string = '';
  @Input() showFrames: boolean = false;
  @Input() hoverSize: number = 6;
  @Input() gapSize: number = 4;

  hoveredRow: number | null = null;
  hoveredCol: number | null = null;

  setHovered(frame: Frame) {
    this.hoveredRow = Math.floor(frame.defaultPos.y / 4);
    this.hoveredCol = Math.floor(frame.defaultPos.x / 4);
  }

  clearHovered() {
    this.hoveredRow = null;
    this.hoveredCol = null;
  }

  isFrameHovered(frame: Frame): boolean {
    const row = Math.floor(frame.defaultPos.y / 4);
    const col = Math.floor(frame.defaultPos.x / 4);
    return this.hoveredRow === row && this.hoveredCol === col;
  }

  getRowSizes(): string {
    if (this.hoveredRow === null) return '4fr 4fr 4fr';
    const nonHoveredSize = (12 - this.hoverSize) / 2;
    return [0, 1, 2].map(r => r === this.hoveredRow ? `${this.hoverSize}fr` : `${nonHoveredSize}fr`).join(' ');
  }

  getColSizes(): string {
    if (this.hoveredCol === null) return '4fr 4fr 4fr';
    const nonHoveredSize = (12 - this.hoverSize) / 2;
    return [0, 1, 2].map(c => c === this.hoveredCol ? `${this.hoverSize}fr` : `${nonHoveredSize}fr`).join(' ');
  }

  getTransformOrigin(x: number, y: number): string {
    const vertical = y === 0 ? 'top' : y === 4 ? 'center' : 'bottom';
    const horizontal = x === 0 ? 'left' : x === 4 ? 'center' : 'right';
    return `${vertical} ${horizontal}`;
  }

  getGridRow(frame: Frame): string {
    return (Math.floor(frame.defaultPos.y / 4) + 1).toString();
  }

  getGridCol(frame: Frame): string {
    return (Math.floor(frame.defaultPos.x / 4) + 1).toString();
  }
}
