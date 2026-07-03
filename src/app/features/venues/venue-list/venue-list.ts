import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  LucideChevronDown,
  LucideChevronUp,
  LucideChevronsUpDown,
  LucideEye,
  LucidePower,
  LucidePlus,
  LucideRefreshCw,
  LucideSearch,
  LucideStore,
} from '@lucide/angular';
import { RouterLink } from '@angular/router';
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
    LucidePower,
    LucidePlus,
    LucideRefreshCw,
    LucideSearch,
    LucideStore,
    ReactiveFormsModule,
    RouterLink,
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
  readonly rowErrors = signal<Record<string, string>>({});
  readonly updatingIds = signal<ReadonlySet<string>>(new Set<string>());

  readonly page = signal(1);
  readonly limit = signal(10);
  readonly total = signal(0);
  readonly sortBy = signal<VenueSortBy>('name');
  readonly sortOrder = signal<SortOrder>('asc');

  readonly loadVenues = (): void => this.fetchVenues();
  readonly setSort = (sortBy: VenueSortBy): void => this.applySort(sortBy);
  readonly previousPage = (): void => this.goToPreviousPage();
  readonly nextPage = (): void => this.goToNextPage();
  readonly getRowError = (id: string): string | null => this.rowErrors()[id] ?? null;
  readonly isUpdating = (id: string): boolean => this.updatingIds().has(id);

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

  getVenueTypeLabel(venue: Venue): string {
    return venue.category || venue.venueType;
  }

  isTrialStatus(venue: Venue): boolean {
    return venue.status === 'trial';
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

  getStatusButtonClasses(venue: Venue): string {
    const variantClasses = venue.isActive
      ? 'border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100'
      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950';

    return [
      'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55',
      variantClasses,
    ].join(' ');
  }

  toggleVenueStatus(venue: Venue): void {
    if (this.updatingIds().has(venue.id)) {
      return;
    }

    const nextIsActive = !venue.isActive;
    const previousVenue = venue;
    const nextVenue: Venue = {
      ...venue,
      isActive: nextIsActive,
      status: nextIsActive ? 'active' : 'inactive',
    };

    this.replaceVenue(nextVenue);
    this.clearRowError(venue.id);
    this.setUpdating(venue.id, true);

    this.venuesApi
      .updateVenue(venue.id, {
        active: nextVenue.isActive,
        status: nextVenue.status,
      })
      .pipe(finalize(() => this.setUpdating(venue.id, false)))
      .subscribe({
        next: (updatedVenue) => this.replaceVenue(updatedVenue),
        error: () => {
          this.replaceVenue(previousVenue);
          this.setRowError(venue.id, 'Status update failed. The previous value was restored.');
        },
      });
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

  private replaceVenue(venue: Venue): void {
    this.venues.update((venues) => venues.map((item) => (item.id === venue.id ? venue : item)));
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
