import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  LucideArrowLeft,
  LucideCircleDollarSign,
  LucideClock3,
  LucideGlobe2,
  LucideLoaderCircle,
  LucideMapPin,
  LucidePlus,
  LucideSearch,
  LucideStore,
  LucideUserRound,
  LucideWorkflow,
} from '@lucide/angular';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';

import { Branch } from '../../../core/branches/branch.models';
import { BranchesApiService } from '../../../core/branches/branches-api.service';
import { Client } from '../../../core/clients/client.models';
import { ClientsApiService } from '../../../core/clients/clients-api.service';
import { Organization } from '../../../core/organizations/organization.models';
import { OrganizationsApiService } from '../../../core/organizations/organizations-api.service';
import { VenuesApiService } from '../../../core/venues/venues-api.service';
import { UiButtonComponent } from '../../../shared/ui/button/ui-button';
import { UiCardComponent } from '../../../shared/ui/card/ui-card';

type VenuePlacement = 'standalone' | 'organization';

@Component({
  selector: 'app-venue-create',
  standalone: true,
  imports: [
    LucideArrowLeft,
    LucideCircleDollarSign,
    LucideClock3,
    LucideGlobe2,
    LucideLoaderCircle,
    LucideMapPin,
    LucidePlus,
    LucideSearch,
    LucideStore,
    LucideUserRound,
    LucideWorkflow,
    ReactiveFormsModule,
    RouterModule,
    UiButtonComponent,
    UiCardComponent,
  ],
  templateUrl: './venue-create.html',
})
export class VenueCreate {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly venuesApi = inject(VenuesApiService);
  private readonly organizationsApi = inject(OrganizationsApiService);
  private readonly branchesApi = inject(BranchesApiService);
  private readonly clientsApi = inject(ClientsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly initialOrgId = this.route.snapshot.queryParamMap.get('orgId') ?? '';

  readonly saving = signal(false);
  readonly clientLoading = signal(false);
  readonly organizationLoading = signal(false);
  readonly branchLoading = signal(false);
  readonly clients = signal<Client[]>([]);
  readonly organizations = signal<Organization[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly typeOptions = ['restaurant', 'club', 'cafe', 'bar', 'hotel'];

  readonly form = this.formBuilder.group({
    placement: this.formBuilder.control<VenuePlacement>(this.initialOrgId ? 'organization' : 'standalone', [
      Validators.required,
    ]),
    name: ['', [Validators.required]],
    ownerId: ['', [Validators.required]],
    ownerSearch: [''],
    type: ['', [Validators.required]],
    orgId: [{ value: this.initialOrgId, disabled: !this.initialOrgId }],
    branchId: [{ value: '', disabled: !this.initialOrgId }],
    timezone: ['Asia/Beirut', [Validators.required]],
    currency: ['USD', [Validators.required]],
    city: [''],
    country: ['Lebanon'],
  });

  constructor() {
    this.form.controls.ownerSearch.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((search) => this.searchClients(search));

    this.form.controls.placement.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((placement) => this.applyPlacement(placement));

    this.form.controls.orgId.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((orgId) => this.loadBranches(orgId));

    this.loadOrganizations();
    this.applyPlacement(this.form.controls.placement.value);
  }

  get isOrganizationPlacement(): boolean {
    return this.form.controls.placement.value === 'organization';
  }

  get ownerRequiredError(): boolean {
    const control = this.form.controls.ownerId;
    return control.touched && control.hasError('required');
  }

  get nameRequiredError(): boolean {
    const control = this.form.controls.name;
    return control.touched && control.hasError('required');
  }

  get typeRequiredError(): boolean {
    const control = this.form.controls.type;
    return control.touched && control.hasError('required');
  }

  get orgRequiredError(): boolean {
    const control = this.form.controls.orgId;
    return control.touched && control.hasError('required');
  }

  get branchRequiredError(): boolean {
    const control = this.form.controls.branchId;
    return control.touched && control.hasError('required');
  }

  get showNoBranchesMessage(): boolean {
    return (
      this.isOrganizationPlacement &&
      Boolean(this.form.controls.orgId.value) &&
      !this.branchLoading() &&
      this.branches().length === 0
    );
  }

  selectClient(client: Client): void {
    this.form.controls.ownerId.setValue(client.id);
    this.form.controls.ownerSearch.setValue(client.email ? `${client.name} (${client.email})` : client.name, {
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
    const isOrganizationPlacement = value.placement === 'organization';

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.venuesApi
      .createVenue({
        name: value.name,
        owner: value.ownerId,
        type: value.type,
        orgId: isOrganizationPlacement ? value.orgId : null,
        branchId: isOrganizationPlacement ? value.branchId : null,
        timezone: value.timezone,
        currency: value.currency,
        city: value.city || undefined,
        country: value.country || undefined,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (venue) => {
          this.successMessage.set('Venue created.');
          void this.router.navigate(['/venues', venue.id]);
        },
        error: (error: unknown) => this.errorMessage.set(this.getSubmitError(error)),
      });
  }

  private applyPlacement(placement: VenuePlacement): void {
    const orgControl = this.form.controls.orgId;
    const branchControl = this.form.controls.branchId;

    if (placement === 'organization') {
      orgControl.enable({ emitEvent: false });
      branchControl.enable({ emitEvent: false });
      orgControl.setValidators([Validators.required]);
      branchControl.setValidators([Validators.required]);
      this.loadBranches(orgControl.value);
    } else {
      orgControl.reset('', { emitEvent: false });
      branchControl.reset('', { emitEvent: false });
      orgControl.clearValidators();
      branchControl.clearValidators();
      orgControl.disable({ emitEvent: false });
      branchControl.disable({ emitEvent: false });
      this.branches.set([]);
    }

    orgControl.updateValueAndValidity({ emitEvent: false });
    branchControl.updateValueAndValidity({ emitEvent: false });
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

  private loadOrganizations(): void {
    this.organizationLoading.set(true);

    this.organizationsApi
      .listOrganizations({
        page: 1,
        limit: 100,
        sortBy: 'name',
        sortOrder: 'asc',
      })
      .pipe(finalize(() => this.organizationLoading.set(false)))
      .subscribe({
        next: (response) => this.organizations.set(response.items),
        error: () => this.organizations.set([]),
      });
  }

  private loadBranches(orgId: string): void {
    this.form.controls.branchId.reset('', { emitEvent: false });

    if (!this.isOrganizationPlacement || !orgId) {
      this.branchLoading.set(false);
      this.branches.set([]);
      return;
    }

    this.branchLoading.set(true);
    const requestedOrgId = orgId;

    this.branchesApi
      .listBranches({
        page: 1,
        limit: 100,
        search: undefined,
        sortBy: 'name',
        sortOrder: 'asc',
        orgId,
      })
      .pipe(
        finalize(() => {
          if (this.form.controls.orgId.value === requestedOrgId) {
            this.branchLoading.set(false);
          }
        }),
      )
      .subscribe({
        next: (response) => {
          if (this.form.controls.orgId.value === requestedOrgId) {
            this.branches.set(response.items);
          }
        },
        error: () => {
          if (this.form.controls.orgId.value === requestedOrgId) {
            this.branches.set([]);
          }
        },
      });
  }

  private getSubmitError(error: unknown): string {
    if (error instanceof HttpErrorResponse && typeof error.error === 'object' && error.error !== null) {
      if ('message' in error.error && typeof error.error.message === 'string') {
        return error.error.message;
      }
    }

    return 'Venue could not be created. Review the fields and try again.';
  }
}
