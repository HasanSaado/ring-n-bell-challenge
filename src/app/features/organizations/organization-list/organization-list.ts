import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { LucideEye, LucidePower } from '@lucide/angular';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';

import { Organization, OrganizationListParams, SortOrder } from '../../../core/organizations/organization.models';
import { OrganizationsApiService } from '../../../core/organizations/organizations-api.service';
import { UiButtonComponent } from '../../../shared/ui/button/ui-button';
import { UiCardComponent } from '../../../shared/ui/card/ui-card';
import { UiIconButtonComponent } from '../../../shared/ui/icon-button/ui-icon-button';
import { SortHeaderComponent } from '../../../shared/ui/sort-header/sort-header';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge';

@Component({
  selector: 'app-organization-list',
  standalone: true,
  imports: [
    DatePipe,
    LucideEye,
    LucidePower,
    ReactiveFormsModule,
    SortHeaderComponent,
    StatusBadgeComponent,
    UiButtonComponent,
    UiCardComponent,
    UiIconButtonComponent,
  ],
  templateUrl: './organization-list.html',
})
export class OrganizationList {
  private readonly organizationsApi = inject(OrganizationsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly organizations = signal<Organization[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly rowErrors = signal<Record<string, string>>({});
  readonly updatingIds = signal<ReadonlySet<string>>(new Set<string>());

  readonly page = signal(1);
  readonly limit = signal(10);
  readonly total = signal(0);
  readonly sortBy = signal<OrganizationListParams['sortBy']>('name');
  readonly sortOrder = signal<SortOrder>('asc');

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadOrganizations();
      });

    this.loadOrganizations();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.limit()));
  }

  loadOrganizations(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.organizationsApi
      .listOrganizations(this.buildParams())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.organizations.set(response.items);
          this.total.set(response.total);
          this.page.set(response.page);
          this.limit.set(response.limit);
        },
        error: () => {
          this.errorMessage.set('Organizations could not be loaded.');
        },
      });
  }

  setSort(sortBy: OrganizationListParams['sortBy']): void {
    if (this.sortBy() === sortBy) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(sortBy);
      this.sortOrder.set('asc');
    }

    this.page.set(1);
    this.loadOrganizations();
  }

  previousPage(): void {
    if (this.page() > 1) {
      this.page.update((page) => page - 1);
      this.loadOrganizations();
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages) {
      this.page.update((page) => page + 1);
      this.loadOrganizations();
    }
  }

  toggleOrganization(organization: Organization): void {
    if (this.updatingIds().has(organization.id)) {
      return;
    }

    const nextIsActive = !organization.isActive;
    const previousOrganization = organization;
    const nextOrganization: Organization = {
      ...organization,
      isActive: nextIsActive,
      status: nextIsActive ? 'active' : 'inactive',
    };

    this.replaceOrganization(nextOrganization);
    this.clearRowError(organization.id);
    this.setUpdating(organization.id, true);

    this.organizationsApi
      .updateOrganization(organization.id, {
        isActive: nextOrganization.isActive,
        status: nextOrganization.status,
      })
      .pipe(finalize(() => this.setUpdating(organization.id, false)))
      .subscribe({
        next: (updatedOrganization) => this.replaceOrganization(updatedOrganization),
        error: () => {
          this.replaceOrganization(previousOrganization);
          this.setRowError(organization.id, 'Status update failed. The previous value was restored.');
        },
      });
  }

  private buildParams(): OrganizationListParams {
    return {
      page: this.page(),
      limit: this.limit(),
      search: this.searchControl.value.trim() || undefined,
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
    };
  }

  private replaceOrganization(organization: Organization): void {
    this.organizations.update((organizations) =>
      organizations.map((item) => (item.id === organization.id ? organization : item)),
    );
  }

  private setUpdating(id: string, isUpdating: boolean): void {
    this.updatingIds.update((currentIds) => {
      const nextIds = new Set(currentIds);

      if (isUpdating) {
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
}
