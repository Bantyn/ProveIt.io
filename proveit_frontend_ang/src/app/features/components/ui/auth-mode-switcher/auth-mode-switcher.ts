import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';

export interface AuthModeOption {
  value: string;
  label: string;
  icon?: string;
}

@Component({
  selector: 'app-auth-mode-switcher',
  standalone: true,
  imports: [NgFor, NgClass, NgIf],
  templateUrl: './auth-mode-switcher.html',
  styleUrl: './auth-mode-switcher.css',
})
export class AuthModeSwitcher {
  @Input() options: AuthModeOption[] = [];
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  selectOption(value: string) {
    if (this.value === value) return;
    this.valueChange.emit(value);
  }

  getActiveIndex() {
    const index = this.options.findIndex((option) => option.value === this.value);
    return index < 0 ? 0 : index;
  }
}
