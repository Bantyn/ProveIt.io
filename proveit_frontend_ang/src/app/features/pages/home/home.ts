import { Component, AfterViewInit, inject, signal, OnInit } from '@angular/core';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import gsap from 'gsap';
import { ScrollService } from '../../../services/scroll.service';
import { RippleButtonComponent } from '../../components/ui/ripple-button/ripple-button';
import { BouncyCardsFeaturesComponent } from '../../components/ui/bouncy-cards-features/bouncy-cards-features';
import { DynamicFrameLayoutComponent } from '../../components/ui/dynamic-frame-layout/dynamic-frame-layout';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    Navbar,
    Footer,
    RippleButtonComponent,
    BouncyCardsFeaturesComponent,
    DynamicFrameLayoutComponent,
    CommonModule,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, AfterViewInit {
  private scrollService = inject(ScrollService);
  private authService = inject(AuthService);

  isLoggedIn = signal(false);
  userName = signal('');

  heroLine1: string[] = [];
  heroLine2Part1: string[] = [];
  heroLine2Part2: string[] = [];

  demoFrames = [
    {
      id: 1,
      title: 'Fullstack Dev',
      video: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800',
      defaultPos: { x: 0, y: 0, w: 4, h: 4 },
      mediaSize: 1.2,
    },
    {
      id: 2,
      title: 'UI/UX Design',
      video: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=800',
      defaultPos: { x: 4, y: 0, w: 4, h: 4 },
      mediaSize: 1.1,
    },
    {
      id: 3,
      title: 'Backend Systems',
      video: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800',
      defaultPos: { x: 8, y: 0, w: 4, h: 4 },
      mediaSize: 1,
    },
    {
      id: 4,
      title: 'Team Workflow',
      video: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=800',
      defaultPos: { x: 0, y: 4, w: 4, h: 4 },
      mediaSize: 1.3,
    },
    {
      id: 5,
      title: 'Global Collab',
      video: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&q=80&w=800',
      defaultPos: { x: 4, y: 4, w: 4, h: 4 },
      mediaSize: 1,
    },
    {
      id: 6,
      title: 'Data Insights',
      video: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800',
      defaultPos: { x: 8, y: 4, w: 4, h: 4 },
      mediaSize: 1.2,
    },
    {
      id: 7,
      title: 'Remote Culture',
      video: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800',
      defaultPos: { x: 0, y: 8, w: 4, h: 4 },
      mediaSize: 1.1,
    },
    {
      id: 8,
      title: 'Cloud Infra',
      video: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800',
      defaultPos: { x: 4, y: 8, w: 4, h: 4 },
      mediaSize: 1.4,
    },
    {
      id: 9,
      title: 'AI Innovation',
      video: 'https://images.unsplash.com/photo-1517245327032-9e92f4a43c7a?auto=format&fit=crop&q=80&w=800',
      defaultPos: { x: 8, y: 8, w: 4, h: 4 },
      mediaSize: 1,
    },
  ];

  tl = gsap.timeline({
    onComplete: () => {
      const container = document.querySelector('.animationContainer');
      container?.classList.remove('landing-lock');
      container?.classList.add('landing-unlock');

      // Unlock scroll via service
      this.scrollService.unlock();
    },
  });

  private authResolved = false;
  private viewInitialized = false;
  private animationsPlayed = false;

  ngOnInit(): void {
    this.authService.user$.subscribe((user) => {
      if (user) {
        this.isLoggedIn.set(true);
        this.userName.set(user.displayName || 'Friend');
      } else {
        this.isLoggedIn.set(false);
      }
      this.setHeroContent();
      this.authResolved = true;
      this.checkAndPlayTextAnimations();
    });
  }

  setHeroContent() {
    this.heroLine1 = 'Skill-Based'.split('');
    this.heroLine2Part1 = 'Hiring'.split('');
    this.heroLine2Part2 = 'Platf'.split('');
  }

  ngAfterViewInit(): void {
    // Lock scroll via service
    this.scrollService.lock();

    this.tl.from('.screen', {
      height: '100%',
      duration: 1.8,
      ease: 'power3.out',
      stagger: 0.2,
    });

    gsap.from('.main', {
      filter: 'blur(50px)',
      opacity: 0,
      duration: 1,
      delay: 1,
      ease: 'power3.out',
    });

    gsap.from('.animate-shape', {
      opacity: 0,
      y: 24,
      duration: 2,
      ease: 'power3.out',
      stagger: 0.12,
    });

    this.viewInitialized = true;
    this.checkAndPlayTextAnimations();
  }

  private checkAndPlayTextAnimations() {
    if (this.authResolved && this.viewInitialized && !this.animationsPlayed) {
      this.animationsPlayed = true;
      setTimeout(() => {
        gsap.to('.animated-text span', {
          y: 0,
          filter: 'blur(0px)',
          duration: 0.5,
          delay: 1,
          ease: 'power3.out',
          stagger: 0.2,
        });
        gsap.to('.animated-text span:last-child', {
          x: 0,
          filter: 'blur(0px)',
          duration: 0.5,
          delay: 2.6,
          ease: 'power3.out',
        });

        gsap.to('.animated-text-2 span', {
          y: 0,
          filter: 'blur(0px)',
          duration: 0.3,
          delay: 2.5,
          ease: 'power3.out',
          stagger: 0.2,
        });

        gsap.to('.animated-text-2 span:last-child', {
          x: 0,
          filter: 'blur(0px)',
          duration: 0.3,
          delay: 2.6,
          ease: 'power3.out',
        });

        gsap.to('.animated-text-2 .gear-icon', {
          y: 0,
          x: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.5,
          delay: 3.6,
          ease: 'power3.out',
          onComplete: () => {
            this.initHorizontalScroll();
          },
        });

        setTimeout(() => {
          this.initHorizontalScroll();
        }, 5000);
      }, 50);
    }
  }

  private initHorizontalScroll(): void {
    const wrapper = document.querySelector('.horizontal-scroll-wrapper');
    const text = document.querySelector('.horizontal-scroll-text') as HTMLElement;

    if (!wrapper || !text) return;

    if (text.classList.contains('gsap-initialized')) return;
    text.classList.add('gsap-initialized');
    gsap.set(text, { display: 'inline-block', whiteSpace: 'nowrap', x: 0 });

    const getScrollAmount = () => {
      const textWidth = text.offsetWidth;
      const windowWidth = window.innerWidth;
      return -(textWidth - windowWidth + 200);
    };

    gsap.to(text, {
      x: getScrollAmount,
      ease: 'none',
      scrollTrigger: {
        trigger: wrapper,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    // Handle Resize & Final Measurement
    const refreshTrigger = () => {
      import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
        ScrollTrigger.refresh();
      });
    };

    setTimeout(refreshTrigger, 200);
    setTimeout(refreshTrigger, 2000);
  }
}
