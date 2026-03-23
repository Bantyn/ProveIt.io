import { Component, Input, Output, EventEmitter, Injectable, signal, computed, inject, HostBinding, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { cn } from '../../../lib/utils';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <a routerLink="/" class="flex items-center gap-3 px-1 py-1 no-underline group">
      <div class="h-7 w-8 bg-slate-900 dark:bg-white rounded-xl shrink-0 shadow-lg group-hover:rotate-6 transition-all duration-300 flex items-center justify-center overflow-hidden">
         <div class="w-full h-full bg-linear-to-br from-(--dd-blue) to-(--dd-blue-dark) opacity-80"></div>
      </div>
      <span class="font-bold text-slate-900 dark:text-white text-[19px] tracking-tight whitespace-nowrap transition-all duration-500"
            [class.opacity-0]="collapsed && !isMobile"
            [class.translate-x-[-20px]]="collapsed && !isMobile">
        ProveIt<span class="text-(--dd-blue)">.io</span>
      </span>
    </a>
  `
})
export class Logo {
  @Input() collapsed = false;
  @Input() isMobile = false;
}

@Component({
  selector: 'app-logo-icon',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <a routerLink="/" class="flex items-center px-1 py-1 no-underline group">
      <div class="h-7 w-8 bg-slate-900 dark:bg-white rounded-xl shrink-0 shadow-lg group-hover:rotate-12 transition-all duration-300 flex items-center justify-center overflow-hidden">
         <div class="w-full h-full bg-linear-to-br from-(--dd-blue) to-(--dd-blue-dark) opacity-80"></div>
      </div>
    </a>
  `
})
export class LogoIcon {}

/**
 * Service to manage sidebar state across nested components
 */
@Injectable()
export class SidebarService {
  private _open = signal(true);
  private _animate = signal(true);

  open = computed(() => this._open());
  animate = computed(() => this._animate());

  setOpen(value: boolean) {
    this._open.set(value);
  }

  setAnimate(value: boolean) {
    this._animate.set(value);
  }
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  providers: [SidebarService],
  template: `
    <div class="flex flex-col h-full relative" 
         (mouseenter)="onHover(true)" 
         (mouseleave)="onHover(false)">
        <ng-content></ng-content>
    </div>
  `,
  host: {
    'class': 'h-full flex-shrink-0 z-50'
  }
})
export class Sidebar {
  service = inject(SidebarService);
  
  @Input() set open(value: boolean) {
    this.service.setOpen(value);
  }
  @Input() set animate(value: boolean) {
    this.service.setAnimate(value);
  }
  @Output() openChange = new EventEmitter<boolean>();

  private isHovered = false;

  onHover(hovered: boolean) {
    this.isHovered = hovered;
    this.service.setOpen(hovered);
    this.openChange.emit(hovered);
  }
}

@Component({
  selector: 'app-sidebar-body',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, Logo],
  template: `
    <!-- Desktop Sidebar Container -->
    <div
      [class]="cn('h-screen flex-col hidden md:flex bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-r border-neutral-200/50 dark:border-neutral-800 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) overflow-hidden sticky top-0 left-0', className)"
      [style.width]="service.open() ? '280px' : '82px'"
    >
      <div class="flex flex-col h-full py-6 px-4">
          <ng-container [ngTemplateOutlet]="contentTpl"></ng-container>
      </div>
    </div>

    <!-- Mobile Sticky Header -->
    <div class="flex flex-row md:hidden items-center justify-between bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl w-full h-16 px-6 border-b border-neutral-200/50 dark:border-neutral-800 sticky top-0 z-60">
      <div class="flex justify-start">
         <app-logo [isMobile]="true"></app-logo>
      </div>
      <button (click)="toggleMobile()" class="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border-none bg-transparent cursor-pointer">
        <lucide-icon [name]="mobileOpen ? 'x' : 'menu'" class="text-neutral-800 dark:text-neutral-200"></lucide-icon>
      </button>
      
      <!-- Mobile Overlay Navigation -->
      <div *ngIf="mobileOpen" 
           class="fixed inset-0 h-screen w-full bg-white dark:bg-neutral-950 p-8 z-100 flex flex-col justify-between animate-in fade-in slide-in-from-right duration-300">
          <div class="flex justify-between items-center mb-8">
             <app-logo [isMobile]="true"></app-logo>
             <button (click)="toggleMobile()" class="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border-none bg-transparent cursor-pointer">
               <lucide-icon name="x"></lucide-icon>
            </button>
          </div>
          <div class="flex flex-col h-full overflow-y-auto pt-4">
             <ng-container [ngTemplateOutlet]="contentTpl"></ng-container>
          </div>
      </div>
    </div>

    <ng-template #contentTpl>
       <ng-content></ng-content>
    </ng-template>
  `,
  styles: [`
    @keyframes slide-in-left {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }
    .animate-slide-in-left {
      animation: slide-in-left 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
  `]
})
export class SidebarBody {
  service = inject(SidebarService);
  @Input() className = '';
  
  mobileOpen = false;
  cn = cn;

  toggleMobile() {
    this.mobileOpen = !this.mobileOpen;
    this.service.setOpen(this.mobileOpen);
    
    // Toggle body scroll lock
    if (this.mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
}

@Component({
  selector: 'app-sidebar-link',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <a [routerLink]="link.href" 
       routerLinkActive="bg-(--dd-blue) !text-white shadow-lg shadow-(--dd-blue)/20 active-link"
       [routerLinkActiveOptions]="{ exact: false }"
       class="flex items-center justify-start gap-4 group/sidebar px-3.5 py-3 rounded-2xl transition-all duration-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 cursor-pointer text-neutral-500 dark:text-neutral-400 no-underline relative overflow-hidden mb-1">
      
      <!-- Active Indicator (Subtle background glow) -->
      <div class="absolute inset-0 bg-linear-to-r from-(--dd-blue)/10 to-transparent opacity-0 group-hover/sidebar:opacity-100 transition-opacity"></div>
      
      <div class="shrink-0 w-6 h-6 flex items-center justify-center transition-all duration-300 group-hover/sidebar:scale-110 relative z-10">
           <lucide-icon [name]="link.icon" class="w-5 h-5"></lucide-icon>
      </div>
      
      <span 
        [class]="cn('text-[14px] font-semibold whitespace-nowrap transition-all duration-500 relative z-10', 
                   service.open() ? 'opacity-100 translate-x-0 static' : 'opacity-0 -translate-x-4 pointer-events-none absolute left-14')"
      >
        {{ link.label }}
      </span>

      <!-- Badge (Show only if open) -->
      <div *ngIf="link.badge && service.open()" 
           class="ml-auto bg-(--dd-blue-light)/30 text-(--dd-blue) dark:bg-(--dd-blue-dark)/30 dark:text-(--dd-blue-light) text-[10px] font-semibold rounded-full px-2 py-0.5 tracking-tighter relative z-10">
        {{ link.badge }}
      </div>

      <!-- Tooltip for collapsed mode -->
      <div *ngIf="!service.open()" 
           class="fixed left-20 bg-neutral-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/sidebar:opacity-100 pointer-events-none transition-opacity hidden md:block whitespace-nowrap z-[70]">
        {{ link.label }}
      </div>
    </a>
  `
})
export class SidebarLink {
  service = inject(SidebarService);
  @Input() link: { label: string; href: string; icon: string; badge?: number } = { label: '', href: '', icon: '' };
  cn = cn;
}
