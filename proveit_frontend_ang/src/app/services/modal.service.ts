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
  initialMeetingLink?: string;
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
      // Use setTimeout to push to next tick and avoid ExpressionChangedAfterItHasBeenCheckedError
      setTimeout(() => {
        this.zone.run(() => {
          this.modalStateSource.next({
            config: { title, message, confirmText: 'Got it!', showCancel: false, type },
            resolve,
          });
        });
      });
    });
  }

  // Replacement for window.confirm
  confirm(message: string, title: string = 'Confirm'): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
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
    });
  }

  scheduleInterview(
    title: string = 'Schedule Interview',
    message: string = 'Choose an interview date and time for the selected candidate.',
    initialDate?: Date | null,
    initialTime?: string,
    initialMeetingLink?: string,
  ): Promise<{ date: string; time: string; meetingLink: string } | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
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
              initialDate: initialDate ?? null,
              initialTime: initialTime ?? '',
              initialMeetingLink: initialMeetingLink ?? '',
            },
            resolve,
          });
        });
      });
    });
  }

  // Close from within the component
  close(result: any, resolveFn: (val: any) => void) {
    resolveFn(result);
    setTimeout(() => {
      this.zone.run(() => {
        this.modalStateSource.next(null);
      });
    });
  }
}
