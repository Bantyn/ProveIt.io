import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { NgFor, NgClass, NgIf, TitleCasePipe, UpperCasePipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-support',
  standalone: true,
  imports: [NgFor, NgClass, NgIf, TitleCasePipe, UpperCasePipe, DatePipe, FormsModule],
  templateUrl: './support.html',
})
export class AdminSupport implements OnInit {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  tickets: any[] = [];
  filter = 'all';
  filters = ['all', 'open', 'resolved'];
  searchTerm = '';
  isLoading = true;

  ngOnInit() {
    this.loadTickets();
  }

  loadTickets() {
    this.isLoading = true;
    this.api.getSupportTickets().subscribe({
      next: (data) => {
        this.tickets = (data || []).map((ticket: any) => ({
          ...ticket,
          status: ticket.status || 'open',
          priority: ticket.priority || 'medium',
          source: ticket.source || 'contact',
        }));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get filtered() {
    return this.tickets.filter((t) => {
      const matchFilter = this.filter === 'all' || t.status === this.filter;
      const search = this.searchTerm.toLowerCase();
      const matchSearch =
        !this.searchTerm ||
        t.name?.toLowerCase().includes(search) ||
        t.email?.toLowerCase().includes(search) ||
        t.subject?.toLowerCase().includes(search) ||
        t.message?.toLowerCase().includes(search);
      return matchFilter && matchSearch;
    });
  }

  updateStatus(ticket: any, status: 'open' | 'resolved') {
    const originalStatus = ticket.status;
    ticket.status = status;

    this.api.updateSupportTicket(ticket.id, { status }).subscribe({
      next: () => {
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        ticket.status = originalStatus;
        this.cdr.detectChanges();
      },
    });
  }

  replyTo(ticket: any) {
    window.location.href = `mailto:${ticket.email}?subject=${encodeURIComponent(
      `Re: ${ticket.subject || 'Support Request'}`,
    )}`;
  }
}
