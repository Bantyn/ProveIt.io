import {
  Component,
  Input,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  NgZone,
} from '@angular/core';
import { NgIf } from '@angular/common';
import {
  ShaderMount,
  type ShaderMountUniforms,
  meshGradientFragmentShader,
  getShaderColorFromString,
  ShaderFitOptions,
} from '@paper-design/shaders';

@Component({
  selector: 'app-shader-hero',
  standalone: true,
  imports: [NgIf],
  templateUrl: './shader-hero.html',
  styleUrl: './shader-hero.css',
})
export class ShaderHeroComponent implements AfterViewInit, OnDestroy {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() minHeight = '650px';
  @Input() lightColors: string[] = [
    '#e8e0ff',
    '#7a6cf0',
    '#f6f4ff',
    '#a78bfa',
    '#c7b8ff',
  ];
  @Input() darkColors: string[] = [
    '#000000',
    '#8b5cf6',
    '#ffffff',
    '#1e1b4b',
    '#4c1d95',
  ];
  @Input() colors: string[] | null = null;
  @Input() speed = 0.12;

  @ViewChild('shaderContainer', { static: true })
  shaderContainerRef!: ElementRef<HTMLDivElement>;

  private shaderMount: ShaderMount | null = null;
  private observer: IntersectionObserver | null = null;
  private themeObserver: MutationObserver | null = null;
  private zone = NgZone;

  private get isDark(): boolean {
    return document.documentElement.classList.contains('dark');
  }

  private get activeColors(): string[] {
    if (this.colors) return this.colors;
    return this.isDark ? this.darkColors : this.lightColors;
  }

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit() {
    // Run shader init outside Angular zone so rAF doesn't trigger change detection
    this.ngZone.runOutsideAngular(() => {
      this.initShader();
      this.setupVisibilityObserver();
      this.setupThemeObserver();
    });
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    this.observer = null;
    this.themeObserver?.disconnect();
    this.themeObserver = null;
    this.shaderMount?.dispose();
    this.shaderMount = null;
  }

  private initShader() {
    const container = this.shaderContainerRef.nativeElement;
    if (!container) return;

    // Dispose previous instance if reinitializing
    this.shaderMount?.dispose();
    this.shaderMount = null;

    const colorVecs = this.activeColors.map((c) => getShaderColorFromString(c));
    while (colorVecs.length < 10) {
      colorVecs.push([0, 0, 0, 0]);
    }

    const uniforms: ShaderMountUniforms = {
      u_colors: colorVecs,
      u_colorsCount: this.activeColors.length,
      u_distortion: 0.25,
      u_swirl: 0.08,
      u_grainMixer: 0.06,
      u_grainOverlay: 0.04,
      u_fit: ShaderFitOptions['cover'],
      u_scale: 1,
      u_rotation: 0,
      u_originX: 0.5,
      u_originY: 0.5,
      u_offsetX: 0,
      u_offsetY: 0,
      u_worldWidth: 1,
      u_worldHeight: 1,
    };

    try {
      this.shaderMount = new ShaderMount(
        container,
        meshGradientFragmentShader,
        uniforms,
        { antialias: false, powerPreference: 'low-power' },
        this.speed,
        undefined,
        1,            // minPixelRatio (1x = no retina upscale)
        1280 * 720    // maxPixelCount (720p cap for huge perf gain)
      );
    } catch (e) {
      console.warn('WebGL shader init failed, using CSS fallback', e);
      container.style.background =
        this.isDark
          ? 'linear-gradient(135deg, #000000, #8b5cf6, #1e1b4b, #4c1d95)'
          : 'linear-gradient(135deg, #f6f4ff, #c7b8ff, #e8e0ff, #9a8cff)';
    }
  }

  /** Pause shader animation when scrolled out of view to save GPU */
  private setupVisibilityObserver() {
    const container = this.shaderContainerRef.nativeElement;
    if (!container || !this.shaderMount) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.shaderMount?.setSpeed(this.speed);
          } else {
            this.shaderMount?.setSpeed(0); // pauses animation loop
          }
        }
      },
      { threshold: 0.05 }
    );
    this.observer.observe(container);
  }

  /** Watch for theme toggling and reinitialize shader with matching colors */
  private setupThemeObserver() {
    this.themeObserver = new MutationObserver(() => {
      this.initShader();
      this.setupVisibilityObserver();
    });
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }
}
