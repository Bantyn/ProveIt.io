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
import { FormsModule } from '@angular/forms';

interface CalendarDay {
  date: Date;
  currentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isDisabled: boolean;
}

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './date-picker.html',
  styleUrl: './date-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatePicker implements OnInit {
  @Input() date: Date | null = null;
  @Input() placeholder = 'Pick a date';
  @Input() minDate: Date | null = null;
  @Input() maxDate: Date | null = null;
  @Output() dateChange = new EventEmitter<Date | null>();

  isOpen = false;

  viewYear!: number;
  viewMonth!: number; // 0-based

  readonly weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  readonly monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  constructor(
    private el: ElementRef,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    const ref = this.date ?? new Date();
    this.viewYear = ref.getFullYear();
    this.viewMonth = ref.getMonth();
  }

  // ─── Computed ─────────────────────────────────────────────
  get formattedDate(): string {
    if (!this.date) return '';
    return this.date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  get currentMonthLabel(): string {
    return `${this.monthNames[this.viewMonth]} ${this.viewYear}`;
  }

  get calendarDays(): CalendarDay[] {
    const days: CalendarDay[] = [];
    const firstDay = new Date(this.viewYear, this.viewMonth, 1);
    const lastDay = new Date(this.viewYear, this.viewMonth + 1, 0);

    // leading days from previous month
    const startDow = firstDay.getDay();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(this.viewYear, this.viewMonth, -i);
      days.push(this.buildDay(d, false));
    }

    // current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(this.buildDay(new Date(this.viewYear, this.viewMonth, d), true));
    }

    // trailing days to fill grid (always 6 rows = 42 cells)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push(this.buildDay(new Date(this.viewYear, this.viewMonth + 1, d), false));
    }

    return days;
  }

  private buildDay(date: Date, currentMonth: boolean): CalendarDay {
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const isSelected =
      !!this.date &&
      date.getDate() === this.date.getDate() &&
      date.getMonth() === this.date.getMonth() &&
      date.getFullYear() === this.date.getFullYear();

    let isDisabled = false;
    if (this.minDate && date < this.minDate) isDisabled = true;
    if (this.maxDate && date > this.maxDate) isDisabled = true;

    return { date, currentMonth, isToday, isSelected, isDisabled };
  }

  // ─── Navigation ───────────────────────────────────────────
  prevMonth() {
    if (this.viewMonth === 0) {
      this.viewMonth = 11;
      this.viewYear--;
    } else {
      this.viewMonth--;
    }
    this.cdr.markForCheck();
  }

  nextMonth() {
    if (this.viewMonth === 11) {
      this.viewMonth = 0;
      this.viewYear++;
    } else {
      this.viewMonth++;
    }
    this.cdr.markForCheck();
  }

  goToToday() {
    const today = new Date();
    this.viewYear = today.getFullYear();
    this.viewMonth = today.getMonth();
    this.selectDay({
      date: today,
      currentMonth: true,
      isToday: true,
      isSelected: false,
      isDisabled: false,
    });
  }

  // ─── Selection ─────────────────────────────────────────────
  selectDay(day: CalendarDay) {
    if (day.isDisabled) return;
    this.date = day.date;
    this.dateChange.emit(this.date);
    this.isOpen = false;
    this.cdr.markForCheck();
  }

  clearDate() {
    this.date = null;
    this.dateChange.emit(null);
    this.cdr.markForCheck();
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.date) {
      this.viewYear = this.date.getFullYear();
      this.viewMonth = this.date.getMonth();
    }
    this.cdr.markForCheck();
  }

  // ─── Close on outside click ───────────────────────────────
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
