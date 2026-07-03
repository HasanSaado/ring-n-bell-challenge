import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';

import { Client } from '../../../core/clients/client.models';
import { ClientsApiService } from '../../../core/clients/clients-api.service';
import { OrganizationsApiService } from '../../../core/organizations/organizations-api.service';
import { UiButtonComponent } from '../../../shared/ui/button/ui-button';
import { UiCardComponent } from '../../../shared/ui/card/ui-card';
import { UiIconButtonComponent } from '../../../shared/ui/icon-button/ui-icon-button';

@Component({
  selector: 'app-organization-create',
  standalone: true,
  imports: [LucideArrowLeft, ReactiveFormsModule, UiButtonComponent, UiCardComponent, UiIconButtonComponent],
  templateUrl: './organization-create.html',
})
export class OrganizationCreate {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly organizationsApi = inject(OrganizationsApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly saving = signal(false);
  readonly clientLoading = signal(false);
  readonly clients = signal<Client[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly form = this.formBuilder.group({
    name: ['', [Validators.required]],
    adminId: ['', [Validators.required]],
    adminSearch: [''],
    country: ['Lebanon', [Validators.required]],
    timezone: ['Asia/Beirut', [Validators.required]],
    currency: ['USD', [Validators.required]],
    billingEmail: ['', [Validators.email]],
  });

  constructor() {
    this.form.controls.adminSearch.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((search) => this.searchClients(search));
  }

  selectClient(client: Client): void {
    this.form.controls.adminId.setValue(client.id);
    this.form.controls.adminSearch.setValue(client.email ? `${client.name} (${client.email})` : client.name, {
      emitEvent: false,
    });
    this.clients.set([]);
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.organizationsApi
      .createOrganization({
        name: value.name,
        adminId: value.adminId,
        country: value.country,
        timezone: value.timezone,
        currency: value.currency,
        billingEmail: value.billingEmail || undefined,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (organization) => {
          this.successMessage.set('Organization created.');
          void this.router.navigate(['/organizations', organization.id]);
        },
        error: (error: unknown) => this.errorMessage.set(this.getSubmitError(error)),
      });
  }

  private searchClients(search: string): void {
    const trimmedSearch = search.trim();

    if (!trimmedSearch) {
      this.clients.set([]);
      return;
    }

    this.clientLoading.set(true);
    this.clientsApi
      .listClients({ search: trimmedSearch })
      .pipe(finalize(() => this.clientLoading.set(false)))
      .subscribe({
        next: (clients) => this.clients.set(clients),
        error: () => this.clients.set([]),
      });
  }

  private getSubmitError(error: unknown): string {
    if (error instanceof HttpErrorResponse && typeof error.error === 'object' && error.error !== null) {
      if ('message' in error.error && typeof error.error.message === 'string') {
        return error.error.message;
      }
    }

    return 'Organization could not be created. Review the fields and try again.';
  }
}
