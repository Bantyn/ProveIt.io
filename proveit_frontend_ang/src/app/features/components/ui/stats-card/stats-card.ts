import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { CountUp } from 'countup.js';
import { cn } from '../../../../lib/utils';

@Component({
  selector: 'app-stats-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div
      [class]="cn(
        'flex w-full flex-col gap-4 rounded-3xl border border-neutral-200/50 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 text-card-foreground shadow-sm transition-all hover:shadow-xl hover:shadow-(--dd-blue)/5 hover:-translate-y-1',
        className
      )"
    >
      <!-- Header section with Icon and Title -->
      <div class="flex items-center gap-4">
        <div
          [class]="cn(
            'flex h-12 w-12 items-center justify-center rounded-2xl bg-(--dd-blue) text-white shadow-lg',
            iconContainerClassName
          )"
        >
          <lucide-icon [name]="icon" class="h-6 w-6"></lucide-icon>
        </div>
        <p class="text-xl font-semibold text-slate-900 dark:text-neutral-200  tracking-widest">{{ title }}</p>
      </div>

      <!-- Main metric section -->
      <div class="flex items-baseline gap-1">
        <h2
          #metricElement
          class="text-5xl font-bold tracking-tighter text-slate-900 dark:text-white"
          aria-live="polite"
          aria-atomic="true"
        >
          0
        </h2>
        <span *ngIf="metricUnit" class="text-2xl font-semibold text-neutral-400">
          {{ metricUnit }}
        </span>
      </div>

      <!-- Subtext section -->
      <p class="text-md text-neutral-400 m-0  tracking-wider">{{ subtext }}</p>
    </div>
  `
})
export class StatsCard implements AfterViewInit, OnChanges {
  @Input() icon: string = 'activity';
  @Input() title: string = '';
  @Input() metric: number = 0;
  @Input() metricUnit?: string;
  @Input() subtext: string = '';
  @Input() className: string = '';
  @Input() iconContainerClassName: string = '';
  @Input() decimals: number = 2;

  @ViewChild('metricElement') metricElement!: ElementRef;
  private countUp?: CountUp;

  cn = cn;

  ngAfterViewInit() {
    this.initCountUp();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['metric'] && !changes['metric'].firstChange) {
      this.countUp?.update(this.metric);
    }
  }

  private initCountUp() {
    this.countUp = new CountUp(this.metricElement.nativeElement, this.metric, {
      duration: 2,
      decimalPlaces: this.decimals,
      useEasing: true,
      useGrouping: true,
    });
    if (!this.countUp.error) {
      this.countUp.start();
    } else {
      console.error(this.countUp.error);
    }
  }
}
