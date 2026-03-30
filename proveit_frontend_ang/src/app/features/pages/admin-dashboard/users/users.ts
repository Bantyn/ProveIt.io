import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { NgFor, NgClass, TitleCasePipe, SlicePipe, DatePipe, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [NgFor, NgClass, TitleCasePipe, SlicePipe, DatePipe, NgIf, FormsModule],
  templateUrl: './users.html',
})
export class AdminUsers implements OnInit {
  users: any[] = [];
  filter = 'all';
  filters = ['all', 'active', 'suspended', 'blocked'];
  searchTerm = '';
  isLoading = true;

  constructor(
    public api: ApiService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    this.api.getUsers().subscribe({
      next: (data) => {
        this.users = (data || []).map((u: any) => {
          const displayName = u.fullName || u.name || 'User';
          return {
            ...u,
            displayName,
            role: u.role || 'candidate',
            status: u.status || 'active',
            initials: this.getInitials(displayName),
          };
        });
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
    let list = this.users.filter((u) => {
      const role = u.role?.toLowerCase();
      return role !== 'admin' && role !== 'company';
    });

    if (this.filter !== 'all') {
      list = list.filter((u) => u.status === this.filter);
    }

    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      list = list.filter(
        (u) =>
          u.displayName?.toLowerCase().includes(search) ||
          u.email?.toLowerCase().includes(search) ||
          u.id?.toLowerCase().includes(search),
      );
    }

    return list;
  }

  updateStatus(user: any, status: string) {
    const originalStatus = user.status;
    user.status = status;

    this.api.updateUser(user.id, { status }).subscribe({
      next: () => {
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        user.status = originalStatus;
        this.cdr.detectChanges();
      },
    });
  }

  remove(user: any) {
    this.api.deleteUser(user.id).subscribe({
      next: () => {
        this.users = this.users.filter((x) => x.id !== user.id);
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err),
    });
  }

  private getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }
}
