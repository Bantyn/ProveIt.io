import {
  Component,
  Input,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChildren,
  QueryList,
  NgZone,
  OnDestroy,
} from '@angular/core';
import { NgIf, NgForOf, NgClass } from '@angular/common';
import { gsap } from 'gsap';

@Component({
  selector: 'app-shader-hero',
  standalone: true,
  imports: [NgForOf, NgClass],
  templateUrl: './shader-hero.html',
  styleUrl: './shader-hero.css',
})
export class ShaderHeroComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() badge: string = '✨ ProveIt.io';
  @Input() title1: string = 'Elevate Your';
  @Input() title2: string = 'Digital Vision';
  @Input() title: string = ''; // Legacy support
  @Input() subtitle: string = ''; // Legacy support
  @Input() description: string = 'Crafting exceptional digital experiences through innovative design and cutting-edge technology.';
  @Input() minHeight: string = '100vh';
  @Input() darkText: boolean = false;

  @ViewChildren('shape') shapes!: QueryList<ElementRef>;
  @ViewChildren('fadeUp') fadeUpElements!: QueryList<ElementRef>;

  shapesData = [
    {
      delay: 0.3,
      width: 600,
      height: 140,
      rotate: 12,
      gradient: 'from-indigo-500/[0.25] dark:from-indigo-500/[0.2]',
      className: 'left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]',
    },
    {
      delay: 0.5,
      width: 500,
      height: 120,
      rotate: -15,
      gradient: 'from-rose-500/[0.25] dark:from-rose-500/[0.2]',
      className: 'right-[-5%] md:right-[0%] top-[70%] md:top-[75%]',
    },
    {
      delay: 0.4,
      width: 300,
      height: 80,
      rotate: -8,
      gradient: 'from-violet-500/[0.25] dark:from-violet-500/[0.2]',
      className: 'left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]',
    },
    {
      delay: 0.6,
      width: 200,
      height: 60,
      rotate: 20,
      gradient: 'from-amber-500/[0.25] dark:from-amber-500/[0.2]',
      className: 'right-[15%] md:right-[20%] top-[10%] md:top-[15%]',
    },
    {
      delay: 0.7,
      width: 150,
      height: 40,
      rotate: -25,
      gradient: 'from-cyan-500/[0.25] dark:from-cyan-500/[0.2]',
      className: 'left-[20%] md:left-[25%] top-[5%] md:top-[10%]',
    },
  ];

  constructor(private ngZone: NgZone) {}

  ngOnInit() {
    // Handle legacy title/subtitle
    if (this.title) {
      this.title1 = this.title;
      this.title2 = '';
    }
    if (this.subtitle) {
      this.description = this.subtitle;
    }
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      // Use a small timeout to ensure DOM is fully ready for GSAP
      setTimeout(() => {
        this.initAnimations();
      }, 100);
    });
  }

  ngOnDestroy() {
    gsap.killTweensOf('.shape-inner');
    // Also kill tweens of the native elements
    this.shapes?.forEach(shape => gsap.killTweensOf(shape.nativeElement));
    this.fadeUpElements?.forEach(el => gsap.killTweensOf(el.nativeElement));
  }

  private initAnimations() {
    // 1. Shapes Entry Animation
    this.shapes.forEach((shapeRef, i) => {
      const data = this.shapesData[i];
      gsap.fromTo(
        shapeRef.nativeElement,
        {
          opacity: 0,
          y: -150,
          rotate: data.rotate - 15,
        },
        {
          opacity: 1,
          y: 0,
          rotate: data.rotate,
          duration: 2.4,
          delay: data.delay,
          ease: 'power3.out',
        }
      );

      // 2. Floating Animation
      const inner = shapeRef.nativeElement.querySelector('.shape-inner');
      if (inner) {
        gsap.to(inner, {
          y: 15,
          duration: 12,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: data.delay,
        });
      }
    });

    // 3. Content Fade Up
    this.fadeUpElements.forEach((elRef, i) => {
      gsap.fromTo(
        elRef.nativeElement,
        {
          opacity: 0,
          y: 30,
        },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          delay: 0.5 + i * 0.2,
          ease: 'power2.out',
        }
      );
    });
  }
}
