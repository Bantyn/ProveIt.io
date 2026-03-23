import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ArrowRight } from 'lucide-angular';
import { cn } from '../../../../lib/utils';

@Component({
  selector: 'app-motion-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './motion-button.html',
})
export class MotionButtonComponent {
  @Input() label: string = 'Button';
  @Input() classes: string = '';
  @Input() variant: 'primary' | 'secondary' = 'primary';
  @Input() animate: boolean = true;
  @Input() delay: number = 0;

  @Output() onClick = new EventEmitter<void>();

  readonly arrowRight = ArrowRight;

  getMergedClasses() {
    return cn(
      'bg-transparent group relative h-auto w-60 cursor-pointer rounded-full border-none p-1 outline-none flex items-center',
      this.classes
    );
  }

  handleButtonClick() {
    this.onClick.emit();
  }
}
