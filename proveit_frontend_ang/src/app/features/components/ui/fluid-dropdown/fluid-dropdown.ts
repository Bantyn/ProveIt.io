import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  forwardRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface DropdownOption {
  value: any;
  label: string;
  /** Optional icon class (e.g. 'bi bi-geo-alt-fill') */
  icon?: string;
}

@Component({
  selector: 'app-fluid-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fluid-dropdown.html',
  styleUrls: ['./fluid-dropdown.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FluidDropdown),
      multi: true,
    },
  ],
})
export class FluidDropdown implements ControlValueAccessor {
  /** The list of options to display */
  @Input() options: DropdownOption[] = [];
  /** Placeholder text shown when no option is selected */
  @Input() placeholder = 'Select an option';
  /** Emits the selected value */
  @Output() valueChange = new EventEmitter<any>();

  isOpen = false;
  selectedValue: any = null;
  hoveredValue: any = null;
  isClosing = false;

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(
    private el: ElementRef,
    private cdr: ChangeDetectorRef,
  ) {}

  get selectedOption(): DropdownOption | undefined {
    return this.options.find((o) => o.value === this.selectedValue);
  }

  get displayLabel(): string {
    return this.selectedOption?.label ?? this.placeholder;
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    this.isClosing = false;
    this.cdr.markForCheck();
  }

  close() {
    this.isClosing = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.isOpen = false;
      this.isClosing = false;
      this.cdr.markForCheck();
    }, 200);
  }

  select(option: DropdownOption) {
    this.selectedValue = option.value;
    this.onChange(option.value);
    this.onTouched();
    this.valueChange.emit(option.value);
    this.close();
    this.cdr.markForCheck();
  }

  setHovered(value: string | null) {
    this.hoveredValue = value;
    this.cdr.markForCheck();
  }

  getHighlightIndex(): number {
    const activeValue = this.hoveredValue ?? this.selectedValue;
    const idx = this.options.findIndex((o) => o.value === activeValue);
    return idx >= 0 ? idx : 0;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent) {
    if (!this.el.nativeElement.contains(event.target) && this.isOpen) {
      this.close();
    }
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.isOpen) {
      this.close();
    }
  }

  // ControlValueAccessor
  writeValue(value: any): void {
    this.selectedValue = value;
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // can be implemented if needed
  }
}
