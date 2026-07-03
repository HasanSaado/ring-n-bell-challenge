import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  LucideChevronDown,
  LucideChevronUp,
  LucideChevronsUpDown,
  LucideEye,
  LucideRefreshCw,
  LucideSearch,
  LucideStore,
} from '@lucide/angular';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';

import { Organization, SortOrder } from '../../../core/organizations/organization.models';
import { OrganizationsApiService } from '../../../core/organizations/organizations-api.service';
import { Venue, VenueListParams, VenueSortBy, VenueTypeFilter } from '../../../core/venues/venue.models';
import { VenuesApiService } from '../../../core/venues/venues-api.service';
import { UiButtonComponent } from '../../../shared/ui/button/ui-button';
import { UiCardComponent } from '../../../shared/ui/card/ui-card';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge';

@Component({
  selector: 'app-venue-list',
  standalone: true,
  imports: [
    DatePipe,
    LucideChevronDown,
    LucideChevronUp,
    LucideChevronsUpDown,
    LucideEye,
    LucideRefreshCw,
    LucideSearch,
    LucideStore,
    ReactiveFormsModule,
    StatusBadgeComponent,
    UiButtonComponent,
    UiCardComponent,
  ],
  templateUrl: './venue-list.html',
})
export class VenueList {
  private readonly venuesApi = inject(VenuesApiService);
  private readonly organizationsApi = inject(OrganizationsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly orgIdControl = new FormControl('', { nonNullable: true });
  readonly venueTypeControl = new FormControl<VenueTypeFilter>('all', { nonNullable: true });
  readonly venues = signal<Venue[]>([]);
  readonly organizations = signal<Organization[]>([]);
  readonly loading = signal(true);
  readonly organizationLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly page = signal(1);
  readonly limit = signal(10);
  readonly total = signal(0);
  readonly sortBy = signal<VenueSortBy>('name');
  readonly sortOrder = signal<SortOrder>('asc');

  readonly loadVenues = (): void => this.fetchVenues();
  readonly setSort = (sortBy: VenueSortBy): void => this.applySort(sortBy);
  readonly previousPage = (): void => this.goToPreviousPage();
  readonly nextPage = (): void => this.goToNextPage();

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.fetchVenues();
      });

    this.orgIdControl.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.page.set(1);
      this.fetchVenues();
    });

    this.venueTypeControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.fetchVenues();
      });

    this.loadOrganizations();
    this.fetchVenues();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.limit()));
  }

  get activeOnPage(): number {
    return this.venues().filter((venue) => venue.isActive).length;
  }

  get organizationVenueCountOnPage(): number {
    return this.venues().filter((venue) => venue.venueType === 'organization').length;
  }

  get standaloneVenueCountOnPage(): number {
    return this.venues().filter((venue) => venue.venueType === 'standalone').length;
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

  getOwner(venue: Venue): string {
    return venue.ownerName || venue.ownerEmail || venue.ownerId || 'Unassigned';
  }

  getOrganizationName(venue: Venue): string {
    return venue.organizationName || this.findOrganizationName(venue.orgId ?? venue.organizationId) || 'Standalone';
  }

  getBranchName(venue: Venue): string {
    return venue.branchName || venue.branchId || 'Not assigned';
  }

  isSortedBy(sortBy: VenueSortBy): boolean {
    return this.sortBy() === sortBy;
  }

  isAscending(sortBy: VenueSortBy): boolean {
    return this.isSortedBy(sortBy) && this.sortOrder() === 'asc';
  }

  isDescending(sortBy: VenueSortBy): boolean {
    return this.isSortedBy(sortBy) && this.sortOrder() === 'desc';
  }

  private fetchVenues(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.venuesApi
      .listVenues(this.buildParams())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.venues.set(response.items);
          this.total.set(response.total);
          this.page.set(response.page);
          this.limit.set(response.limit);
        },
        error: () => {
          this.errorMessage.set('Venues could not be loaded.');
        },
      });
  }

  private applySort(sortBy: VenueSortBy): void {
    if (this.sortBy() === sortBy) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(sortBy);
      this.sortOrder.set('asc');
    }

    this.page.set(1);
    this.fetchVenues();
  }

  private goToPreviousPage(): void {
    if (this.page() > 1) {
      this.page.update((page) => page - 1);
      this.fetchVenues();
    }
  }

  private goToNextPage(): void {
    if (this.page() < this.totalPages) {
      this.page.update((page) => page + 1);
      this.fetchVenues();
    }
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

  private buildParams(): VenueListParams {
    const venueType = this.venueTypeControl.value;

    return {
      page: this.page(),
      limit: this.limit(),
      search: this.searchControl.value.trim() || undefined,
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
      orgId: this.orgIdControl.value || undefined,
      venueType: venueType === 'all' ? undefined : venueType,
    };
  }

  private findOrganizationName(orgId?: string): string | undefined {
    if (!orgId) {
      return undefined;
    }

    return this.organizations().find((organization) => organization.id === orgId || organization.orgId === orgId)?.name;
  }
}
