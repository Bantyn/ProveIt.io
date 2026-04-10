import { Component, Input, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { RouterLink } from '@angular/router';
import { cn } from '../../../../lib/utils';
import gsap from 'gsap';

export interface Service {
  id?: string;
  number: string;
  title: string;
  description: string;
  imageUrl: string;
  gradient: string;
  link?: string | any[];
  status?: 'upcoming' | 'live' | 'past';
  timeRemaining?: string;
  winnerName?: string;
  topScore?: string;
}

@Component({
  selector: 'app-service-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink],
  template: `
    <div
      #card
      [class]="
        cn(
          'relative flex h-[500px] w-full flex-col items-center text-center justify-between overflow-hidden rounded-3xl p-8 bg-linear-to-br opacity-0 translate-y-8 cursor-pointer group transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl',
          gradient,
          className
        )
      "
    >
      <!-- Status Badge -->
      <div class="absolute right-6 top-6 z-20">
        <span
          *ngIf="status === 'live'"
          class="flex items-center gap-1.5 px-3 py-1 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full animate-pulse shadow-lg"
        >
          <span class="h-1.5 w-1.5 bg-white rounded-full"></span>
          Live Now 🔥
        </span>
        <span
          *ngIf="status === 'past'"
          class="flex items-center gap-1.5 px-3 py-1 bg-gray-800/80 text-white text-[10px] font-black uppercase tracking-widest rounded-full border border-white/20"
        >
          Completed 📜
        </span>
      </div>

      <!-- Header with Icon -->
      <div class="z-10 flex flex-col items-center pt-4">
        <span class="mb-4 text-[10px] font-black text-white/50 tracking-[0.3em] uppercase">
          #{{ number }}
        </span>
        <div
          class="relative h-28 w-28 overflow-hidden rounded-2xl border-4 border-white/20 shadow-2xl transition-transform duration-500 group-hover:rotate-3 group-hover:scale-110"
        >
          <img [src]="imageUrl" alt="icon" class="h-full w-full object-cover" />
        </div>
      </div>

      <!-- Main Info -->
      <div class="z-10 flex flex-col items-center px-2">
        <h3
          class="mb-2 text-2xl font-black uppercase tracking-tighter text-white drop-shadow-lg leading-tight"
        >
          {{ title }}
        </h3>

        <!-- Live Status Info -->
        <div *ngIf="status === 'live'" class="mb-4 flex flex-col items-center">
          <span class="text-[10px] font-bold text-white/60 uppercase tracking-widest">Ends in</span>
          <span class="text-lg font-black text-white tabular-nums">{{ timeRemaining }}</span>
        </div>

        <!-- Past Status Info -->
        <div
          *ngIf="status === 'past'"
          class="mb-4 p-3 bg-white/10 rounded-xl border border-white/10 backdrop-blur-sm w-full"
        >
          <div class="flex flex-col items-center gap-0.5">
            <span class="text-[9px] font-bold text-white/60 uppercase tracking-widest">Winner</span>
            <span class="text-sm font-black text-white">{{ winnerName }}</span>
          </div>
          <div class="mt-2 h-px w-8 bg-white/20 mx-auto"></div>
          <div class="mt-2 flex flex-col items-center gap-0.5">
            <span class="text-[9px] font-bold text-white/60 uppercase tracking-widest"
              >Top Score</span
            >
            <span class="text-sm font-black text-yellow-400">{{ topScore }}</span>
          </div>
        </div>

        <p
          class="text-[13px] font-medium text-white/80 line-clamp-3 leading-relaxed tracking-tight"
          *ngIf="status !== 'past'"
        >
          {{ description }}
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="z-10 w-full mt-6 space-y-2">
        <!-- Live Actions -->
        <div *ngIf="status === 'live'" class="flex flex-col gap-2">
          <button
            class="w-full py-3 bg-white text-black text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-black hover:text-white transition-all duration-300 shadow-xl active:scale-95"
          >
            Submit Solution
          </button>
          <button
            class="w-full py-3 bg-white/10 text-white text-[11px] font-black uppercase tracking-widest rounded-xl border border-white/20 hover:bg-white hover:text-black transition-all duration-300 backdrop-blur-md active:scale-95"
          >
            Leaderboard
          </button>
        </div>

        <!-- Past Actions -->
        <div *ngIf="status === 'past'" class="w-full">
          <button
            class="w-full py-4 bg-white text-black text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-black hover:text-white transition-all duration-300 shadow-xl active:scale-95"
          >
            View Results
          </button>
        </div>

        <!-- Upcoming / Default Action -->
        <div
          *ngIf="status !== 'live' && status !== 'past'"
          [routerLink]="link"
          class="flex items-center justify-center gap-2 py-4 text-[11px] font-black text-white uppercase tracking-[0.2em] group/btn"
        >
          <span>Join Challenge</span>
          <lucide-icon
            name="arrow-right"
            class="h-4 w-4 transition-transform group-hover/btn:translate-x-1"
          ></lucide-icon>
        </div>
      </div>

      <!-- Premium Shine -->
      <div
        class="absolute inset-0 z-0 bg-linear-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"
      ></div>

      <!-- Background Decorative Element -->
      <div
        class="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all duration-700"
      ></div>
    </div>
  `,
})
export class ServiceCardComponent implements AfterViewInit {
  @Input() number: string = '';
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() imageUrl: string = '';
  @Input() gradient: string = '';
  @Input() className: string = '';
  @Input() index: number = 0;
  @Input() link?: string | any[];

  @Input() status: 'upcoming' | 'live' | 'past' = 'upcoming';
  @Input() timeRemaining?: string;
  @Input() winnerName?: string;
  @Input() topScore?: string;

  @ViewChild('card') cardRef!: ElementRef;

  ngAfterViewInit() {
    gsap.to(this.cardRef.nativeElement, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      delay: this.index * 0.1,
      ease: 'power3.out',
    });
  }

  protected readonly cn = cn;
}
