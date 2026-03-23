import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService, ModalConfig } from '../../../services/modal.service';
import { Subscription } from 'rxjs';
import { DatePicker } from '../ui/date-picker/date-picker';
import { TimePicker } from '../ui/time-picker/time-picker';

@Component({
  selector: 'app-custom-modal',
  standalone: true,
  imports: [CommonModule, DatePicker, TimePicker],
  templateUrl: './custom-modal.html',
  styleUrl: './custom-modal.css',
})
export class CustomModal implements OnInit, OnDestroy {
  state: { config: ModalConfig; resolve: (val: any) => void } | null = null;
  selectedDate: Date | null = null;
  selectedTime: string | null = null;
  private sub!: Subscription;

  constructor(private modalService: ModalService) {}

  ngOnInit() {
    this.sub = this.modalService.modalState$.subscribe((state: any) => {
      this.state = state;
      this.selectedDate = state?.config?.initialDate ?? null;
      this.selectedTime = state?.config?.initialTime ?? null;
    });
  }

  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  onConfirm() {
    if (this.state) {
      this.modalService.close(true, this.state.resolve);
    }
  }

  onCancel() {
    if (this.state) {
      this.modalService.close(false, this.state.resolve);
    }
  }

  onSchedule() {
    if (!this.state || !this.selectedDate || !this.selectedTime) {
      return;
    }

    const year = this.selectedDate.getFullYear();
    const month = `${this.selectedDate.getMonth() + 1}`.padStart(2, '0');
    const day = `${this.selectedDate.getDate()}`.padStart(2, '0');
    const date = `${year}-${month}-${day}`;
    this.modalService.close(
      { date, time: this.selectedTime },
      this.state.resolve,
    );
  }
}
