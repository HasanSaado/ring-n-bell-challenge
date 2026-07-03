import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  LucideBriefcaseBusiness,
  LucideBuilding2,
  LucideMail,
  LucidePencil,
  LucidePhone,
  LucideRefreshCw,
  LucideSearch,
  LucideTrash2,
  LucideUsersRound,
} from '@lucide/angular';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';

import { Client, ClientListParams, ClientSortBy } from '../../../core/clients/client.models';
import { ClientsApiService } from '../../../core/clients/clients-api.service';
import { SortOrder } from '../../../core/organizations/organization.models';
import { UiButtonComponent } from '../../../shared/ui/button/ui-button';
import { UiCardComponent } from '../../../shared/ui/card/ui-card';
import { SortHeaderComponent } from '../../../shared/ui/sort-header/sort-header';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [
    DatePipe,
    LucideBriefcaseBusiness,
    LucideBuilding2,
    LucideMail,
    LucidePencil,
    LucidePhone,
    LucideRefreshCw,
    LucideSearch,
    LucideTrash2,
    LucideUsersRound,
    ReactiveFormsModule,
    SortHeaderComponent,
    StatusBadgeComponent,
    UiButtonComponent,
    UiCardComponent,
  ],
  templateUrl: './client-list.html',
})
export class ClientList {
  private readonly clientsApi = inject(ClientsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly clients = signal<Client[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly page = signal(1);
  readonly limit = signal(10);
  readonly total = signal(0);
  readonly sortBy = signal<ClientSortBy>('name');
  readonly sortOrder = signal<SortOrder>('asc');

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadClients();
      });

    this.loadClients();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.limit()));
  }

  get enabledOnPage(): number {
    return this.clients().filter((client) => this.isClientEnabled(client)).length;
  }

  get organizationCountOnPage(): number {
    return this.clients().reduce((total, client) => total + (client.organizationCount ?? 0), 0);
  }

  get venueCountOnPage(): number {
    return this.clients().reduce((total, client) => total + (client.venueCount ?? 0), 0);
  }

  get resultStart(): number {
    if (!this.total()) {
      return 0;
    }

    return (this.page() - 1) * this.limit() + 1;
  }

  get resultEnd(): number {
    return Math.min(this.page() * this.limit(), this.total());
  }

  getInitials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  getStatusLabel(client: Client): string {
    if (this.hasEnabledStatus(client)) {
      return this.isClientEnabled(client) ? 'Enabled' : 'Disabled';
    }

    return client.status || 'Unknown';
  }

  hasEnabledStatus(client: Client): boolean {
    return typeof client.enabled === 'boolean';
  }

  isClientEnabled(client: Client): boolean {
    return client.enabled === true;
  }

  getEmail(client: Client): string {
    return client.email || 'Not set';
  }

  getPhone(client: Client): string {
    return client.phone || 'Not set';
  }

  getCompany(client: Client): string {
    return client.company || 'Not set';
  }

  getOrganizationCount(client: Client): number | string {
    return client.organizationCount ?? 'Not available';
  }

  getVenueCount(client: Client): number | string {
    return client.venueCount ?? 'Not available';
  }

  getSalesName(client: Client): string {
    return client.salesName || client.salesId || 'Unassigned';
  }

  getCreatedAt(client: Client): string | null {
    return client.createdAt || null;
  }

  loadClients(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.clientsApi
      .listClientPage(this.buildParams())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.clients.set(response.items);
          this.total.set(response.total);
          this.page.set(response.page);
          this.limit.set(response.limit);
        },
        error: () => {
          this.errorMessage.set('Clients could not be loaded.');
        },
      });
  }

  setSort(sortBy: ClientSortBy): void {
    if (this.sortBy() === sortBy) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(sortBy);
      this.sortOrder.set('asc');
    }

    this.page.set(1);
    this.loadClients();
  }

  previousPage(): void {
    if (this.page() > 1) {
      this.page.update((page) => page - 1);
      this.loadClients();
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages) {
      this.page.update((page) => page + 1);
      this.loadClients();
    }
  }

  private buildParams(): ClientListParams {
    return {
      page: this.page(),
      limit: this.limit(),
      search: this.searchControl.value.trim() || undefined,
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
    };
  }
}
