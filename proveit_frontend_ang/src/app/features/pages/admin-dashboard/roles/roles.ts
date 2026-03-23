import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../../../services/api.service';
import { NgFor, NgClass, NgIf, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [NgFor, NgClass, NgIf, DecimalPipe, FormsModule],
  templateUrl: './roles.html',
})
export class AdminRoles implements OnInit {
  private api = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  roles: any[] = [];
  searchTerm = '';
  isSaving = false;
  selectedRoleId: string | null = null;
  form = {
    name: '',
    description: '',
    permissionsText: '',
  };

  ngOnInit() {
    this.loadRoles();
  }

  loadRoles() {
    this.api.getRoles().subscribe({
      next: (data) => {
        this.roles = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.cdr.detectChanges();
      },
    });
  }

  get filteredRoles() {
    return this.roles.filter((role) => {
      if (!this.searchTerm) return true;
      const search = this.searchTerm.toLowerCase();
      return (
        role.name?.toLowerCase().includes(search) ||
        role.description?.toLowerCase().includes(search) ||
        role.permissions?.some((permission: string) => permission.toLowerCase().includes(search))
      );
    });
  }

  startCreate() {
    this.selectedRoleId = null;
    this.form = {
      name: '',
      description: '',
      permissionsText: '',
    };
  }

  editRole(role: any) {
    this.selectedRoleId = role.id;
    this.form = {
      name: role.name || '',
      description: role.description || '',
      permissionsText: (role.permissions || []).join(', '),
    };
  }

  saveRole() {
    if (!this.form.name.trim()) {
      return;
    }

    this.isSaving = true;

    const payload = {
      name: this.form.name.trim(),
      description: this.form.description.trim(),
      permissions: this.form.permissionsText
        .split(',')
        .map((permission) => permission.trim())
        .filter(Boolean),
    };

    const request = this.selectedRoleId
      ? this.api.updateRole(this.selectedRoleId, payload)
      : this.api.createRole(payload);

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.startCreate();
        this.loadRoles();
      },
      error: (err) => {
        console.error(err);
        this.isSaving = false;
        this.cdr.detectChanges();
      },
    });
  }

  deleteRole(role: any) {
    if (role.isSystem) {
      return;
    }

    this.api.deleteRole(role.id).subscribe({
      next: () => {
        this.roles = this.roles.filter((item) => item.id !== role.id);
        if (this.selectedRoleId === role.id) {
          this.startCreate();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.cdr.detectChanges();
      },
    });
  }
}
