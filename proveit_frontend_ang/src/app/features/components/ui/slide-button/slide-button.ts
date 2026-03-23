import {
  Component,
  ElementRef,
  HostListener,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, SendHorizontal, Loader2, Check, X } from 'lucide-angular';
import { cn } from '../../../../lib/utils';

export type SlideButtonStatus = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-slide-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './slide-button.html',
  styleUrls: ['./slide-button.css'],
})
export class SlideButtonComponent {
  @Input() className: string = '';
  @Input() text: string = 'Slide to Submit';
  @Output() onComplete = new EventEmitter<void>();

  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('handle') handleRef!: ElementRef<HTMLDivElement>;

  status: SlideButtonStatus = 'idle';
  isDragging = false;
  dragX = 0;
  maxDrag = 0;
  completed = false;

  readonly icons = {
    send: SendHorizontal,
    loading: Loader2,
    success: Check,
    error: X,
  };

  constructor(private cdr: ChangeDetectorRef) {}

  get progress(): number {
    return this.maxDrag > 0 ? (this.dragX / this.maxDrag) * 100 : 0;
  }

  get containerWidth(): string {
    return this.completed ? '8rem' : '12rem';
  }

  @HostListener('mousedown', ['$event'])
  @HostListener('touchstart', ['$event'])
  onStart(event: MouseEvent | TouchEvent) {
    if (this.completed || this.status === 'loading') return;
    this.isDragging = true;
    this.calculateBounds();
  }

  @HostListener('document:mousemove', ['$event'])
  @HostListener('document:touchmove', ['$event'])
  onMove(event: MouseEvent | TouchEvent) {
    if (!this.isDragging) return;

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    const handleHalfWidth = 20; // Approx half of handle size
    
    let newX = clientX - rect.left - handleHalfWidth;
    newX = Math.max(0, Math.min(newX, this.maxDrag));
    
    this.dragX = newX;
    this.cdr.detectChanges();
  }

  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onEnd() {
    if (!this.isDragging) return;
    this.isDragging = false;

    if (this.progress >= 90) {
      this.finish();
    } else {
      this.reset();
    }
  }

  private calculateBounds() {
    const container = this.containerRef.nativeElement.offsetWidth;
    const handle = this.handleRef.nativeElement.offsetWidth;
    this.maxDrag = container - handle - 8; // Adjust for padding
  }

  private finish() {
    this.completed = true;
    this.status = 'loading';
    this.dragX = this.maxDrag;
    this.cdr.detectChanges();

    // Emit event
    this.onComplete.emit();

    // Mock success for UI demo/initial state
    setTimeout(() => {
      this.status = 'success';
      this.cdr.detectChanges();
    }, 2000);
  }

  private reset() {
    this.dragX = 0;
    this.cdr.detectChanges();
  }

  // Exposed method for external status updates
  setStatus(newStatus: SlideButtonStatus) {
    this.status = newStatus;
    this.cdr.detectChanges();
  }
}
