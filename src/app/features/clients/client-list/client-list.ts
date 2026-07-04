import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideBriefcaseBusiness,
  LucideBuilding2,
  LucideMail,
  LucidePencil,
  LucidePhone,
  LucidePlus,
  LucideRefreshCw,
  LucideSearch,
  LucideTrash2,
  LucideUsersRound,
  LucideX,
} from '@lucide/angular';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';

import {
  Client,
  ClientListParams,
  ClientSortBy,
  CreateClientRequest,
  UpdateClientRequest,
} from '../../../core/clients/client.models';
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
    LucidePlus,
    LucideRefreshCw,
    LucideSearch,
    LucideTrash2,
    LucideUsersRound,
    LucideX,
    ReactiveFormsModule,
    SortHeaderComponent,
    StatusBadgeComponent,
    UiButtonComponent,
    UiCardComponent,
  ],
  templateUrl: './client-list.html',
})
export class ClientList {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly clientForm = this.formBuilder.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    company: [''],
    enabled: [true],
  });
  readonly clients = signal<Client[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly rowErrors = signal<Record<string, string>>({});
  readonly formMode = signal<'create' | 'edit' | null>(null);
  readonly editingClient = signal<Client | null>(null);
  readonly deleteTarget = signal<Client | null>(null);
  readonly formErrorMessage = signal<string | null>(null);
  readonly saving = signal(false);
  readonly deletingIds = signal<ReadonlySet<string>>(new Set<string>());

  readonly page = signal(1);
  readonly limit = signal(10);
  readonly total = signal(0);
  readonly sortBy = signal<ClientSortBy>('name');
  readonly sortOrder = signal<SortOrder>('asc');
  readonly openCreateClient = (): void => this.startCreateClient();
  readonly openEditClient = (client: Client): void => this.startEditClient(client);
  readonly closeClientForm = (): void => this.dismissClientForm();
  readonly submitClient = (): void => this.saveClient();
  readonly confirmDeleteClient = (client: Client): void => this.showDeleteConfirmation(client);
  readonly cancelDeleteClient = (): void => this.hideDeleteConfirmation();
  readonly deleteClient = (): void => this.destroyClient();
  readonly getRowError = (id: string): string | null => this.rowErrors()[id] ?? null;
  readonly isDeleting = (id: string): boolean => this.deletingIds().has(id);

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

  get formTitle(): string {
    return this.formMode() === 'edit' ? 'Edit client' : 'Create client';
  }

  get formSubmitLabel(): string {
    return this.formMode() === 'edit' ? 'Save changes' : 'Create client';
  }

  get nameRequiredError(): boolean {
    const control = this.clientForm.controls.name;
    return control.touched && control.hasError('required');
  }

  get emailRequiredError(): boolean {
    const control = this.clientForm.controls.email;
    return control.touched && control.hasError('required');
  }

  get emailFormatError(): boolean {
    const control = this.clientForm.controls.email;
    return control.touched && control.hasError('email');
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

  private startCreateClient(): void {
    this.formMode.set('create');
    this.editingClient.set(null);
    this.formErrorMessage.set(null);
    this.clientForm.reset({
      name: '',
      email: '',
      phone: '',
      company: '',
      enabled: true,
    });
  }

  private startEditClient(client: Client): void {
    this.formMode.set('edit');
    this.editingClient.set(client);
    this.formErrorMessage.set(null);
    this.clearRowError(client.id);
    this.clientForm.reset({
      name: client.name,
      email: this.getEmail(client) === 'Not set' ? '' : this.getEmail(client),
      phone: this.getPhone(client) === 'Not set' ? '' : this.getPhone(client),
      company: this.getCompany(client) === 'Not set' ? '' : this.getCompany(client),
      enabled: this.isClientEnabled(client),
    });
  }

  private dismissClientForm(): void {
    if (this.saving()) {
      return;
    }

    this.resetClientForm();
    this.formMode.set(null);
    this.editingClient.set(null);
    this.formErrorMessage.set(null);
  }

  private completeClientForm(): void {
    this.resetClientForm();
    this.formMode.set(null);
    this.editingClient.set(null);
    this.formErrorMessage.set(null);
  }

  private saveClient(): void {
    if (this.clientForm.invalid || this.saving()) {
      this.clientForm.markAllAsTouched();
      return;
    }

    const value = this.clientForm.getRawValue();
    const body: CreateClientRequest | UpdateClientRequest = {
      name: value.name,
      email: value.email,
      phone: value.phone || undefined,
      company: value.company || undefined,
      enabled: value.enabled,
    };
    const editingClient = this.editingClient();
    const request$ =
      this.formMode() === 'edit' && editingClient
        ? this.clientsApi.updateClient(editingClient.id, body)
        : this.clientsApi.createClient(body as CreateClientRequest);

    this.saving.set(true);
    this.formErrorMessage.set(null);

    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.completeClientForm();
        this.loadClients();
      },
      error: (error: unknown) => {
        this.formErrorMessage.set(this.getMutationError(error, 'Client could not be saved.'));
      },
    });
  }

  private showDeleteConfirmation(client: Client): void {
    this.clearRowError(client.id);
    this.deleteTarget.set(client);
  }

  private hideDeleteConfirmation(): void {
    if (this.deleteTarget() && this.deletingIds().has(this.deleteTarget()?.id ?? '')) {
      return;
    }

    this.deleteTarget.set(null);
  }

  private destroyClient(): void {
    const client = this.deleteTarget();

    if (!client || this.deletingIds().has(client.id)) {
      return;
    }

    this.setDeleting(client.id, true);
    this.clearRowError(client.id);

    this.clientsApi
      .deleteClient(client.id)
      .pipe(finalize(() => this.setDeleting(client.id, false)))
      .subscribe({
        next: () => {
          this.deleteTarget.set(null);

          if (this.clients().length <= 1 && this.page() > 1) {
            this.page.update((page) => page - 1);
          }

          this.loadClients();
        },
        error: (error: unknown) => {
          this.deleteTarget.set(null);
          this.setRowError(client.id, this.getDeleteError(error));
        },
      });
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

  private resetClientForm(): void {
    this.clientForm.reset({
      name: '',
      email: '',
      phone: '',
      company: '',
      enabled: true,
    });
  }

  private setDeleting(id: string, isDeleting: boolean): void {
    this.deletingIds.update((currentIds) => {
      const nextIds = new Set(currentIds);

      if (isDeleting) {
        nextIds.add(id);
      } else {
        nextIds.delete(id);
      }

      return nextIds;
    });
  }

  private setRowError(id: string, message: string): void {
    this.rowErrors.update((errors) => ({ ...errors, [id]: message }));
  }

  private clearRowError(id: string): void {
    this.rowErrors.update((errors) => {
      const nextErrors = { ...errors };
      delete nextErrors[id];
      return nextErrors;
    });
  }

  private getMutationError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && typeof error.error === 'object' && error.error !== null) {
      if ('message' in error.error && typeof error.error.message === 'string') {
        return error.error.message;
      }
    }

    return fallback;
  }

  private getDeleteError(error: unknown): string {
    if (this.isDependencyError(error)) {
      return 'Client cannot be deleted because it has dependent organizations or venues.';
    }

    return this.getMutationError(error, 'Client could not be deleted. Try again.');
  }

  private isDependencyError(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse) || typeof error.error !== 'object' || error.error === null) {
      return false;
    }

    const response = error.error as Record<string, unknown>;
    const code = response['code'] ?? response['error'];
    const message = response['message'];

    return (
      code === 'HAS_DEPENDENCIES' ||
      (typeof message === 'string' && message.toUpperCase().includes('HAS_DEPENDENCIES'))
    );
  }
}
