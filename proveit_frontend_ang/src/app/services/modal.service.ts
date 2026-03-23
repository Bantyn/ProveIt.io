import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';

export interface ModalConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  type?: 'info' | 'error' | 'success';
  mode?: 'alert' | 'confirm' | 'schedule';
  initialDate?: Date | null;
  initialTime?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private modalStateSource = new Subject<{
    config: ModalConfig;
    resolve: (val: any) => void;
  } | null>();
  modalState$ = this.modalStateSource.asObservable();

  constructor(private zone: NgZone) {}

  // Replacement for window.alert
  alert(
    message: string,
    title: string = 'Notice',
    type: 'info' | 'error' | 'success' = 'info',
  ): Promise<boolean> {
    return new Promise((resolve) => {
      // Always run inside Angular zone so change detection fires immediately
      this.zone.run(() => {
        this.modalStateSource.next({
          config: { title, message, confirmText: 'Got it!', showCancel: false, type },
          resolve,
        });
      });
    });
  }

  // Replacement for window.confirm
  confirm(message: string, title: string = 'Confirm'): Promise<boolean> {
    return new Promise((resolve) => {
      this.zone.run(() => {
        this.modalStateSource.next({
          config: {
            title,
            message,
            confirmText: 'Yes',
            cancelText: 'No, Not Yet',
            showCancel: true,
            mode: 'confirm',
          },
          resolve,
        });
      });
    });
  }

  scheduleInterview(
    title: string = 'Schedule Interview',
    message: string = 'Choose an interview date and time for the selected candidate.',
  ): Promise<{ date: string; time: string } | null> {
    return new Promise((resolve) => {
      this.zone.run(() => {
        this.modalStateSource.next({
          config: {
            title,
            message,
            confirmText: 'Schedule',
            cancelText: 'Cancel',
            showCancel: true,
            type: 'info',
            mode: 'schedule',
          },
          resolve,
        });
      });
    });
  }

  // Close from within the component
  close(result: any, resolveFn: (val: any) => void) {
    resolveFn(result);
    this.zone.run(() => {
      this.modalStateSource.next(null);
    });
  }
}
