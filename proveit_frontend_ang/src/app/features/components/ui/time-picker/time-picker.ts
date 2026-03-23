import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-time-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './time-picker.html',
  styleUrl: './time-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimePicker implements OnInit {
  @Input() time: string | null = null;
  @Input() placeholder = 'Pick interview time';
  @Output() timeChange = new EventEmitter<string | null>();

  isOpen = false;
  selectedHour: number | null = null;
  selectedMinute: number | null = null;

  readonly hours = Array.from({ length: 24 }, (_, i) => i);
  readonly minutes = [0, 15, 30, 45];

  constructor(
    private el: ElementRef,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.syncFromValue();
  }

  get formattedTime(): string {
    if (this.selectedHour === null || this.selectedMinute === null) return '';
    const hour = this.selectedHour.toString().padStart(2, '0');
    const minute = this.selectedMinute.toString().padStart(2, '0');
    return `${hour}:${minute}`;
  }

  get displayText(): string {
    return this.formattedTime || this.placeholder;
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
    this.syncFromValue();
    this.cdr.markForCheck();
  }

  selectHour(hour: number) {
    this.selectedHour = hour;
    if (this.selectedMinute === null) {
      this.selectedMinute = 0;
    }
    this.emitValue();
  }

  selectMinute(minute: number) {
    this.selectedMinute = minute;
    if (this.selectedHour === null) {
      this.selectedHour = 9;
    }
    this.emitValue();
  }

  clearTime(event?: MouseEvent) {
    event?.stopPropagation();
    this.selectedHour = null;
    this.selectedMinute = null;
    this.time = null;
    this.timeChange.emit(null);
    this.cdr.markForCheck();
  }

  private syncFromValue() {
    if (!this.time) return;
    const [hour, minute] = this.time.split(':').map((part) => Number(part));
    if (!Number.isNaN(hour) && !Number.isNaN(minute)) {
      this.selectedHour = hour;
      this.selectedMinute = minute;
    }
  }

  private emitValue() {
    if (this.selectedHour === null || this.selectedMinute === null) return;
    const hour = this.selectedHour.toString().padStart(2, '0');
    const minute = this.selectedMinute.toString().padStart(2, '0');
    this.time = `${hour}:${minute}`;
    this.timeChange.emit(this.time);
    this.cdr.markForCheck();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent) {
    if (!this.el.nativeElement.contains(event.target)) {
      if (this.isOpen) {
        this.isOpen = false;
        this.cdr.markForCheck();
      }
    }
  }
}
