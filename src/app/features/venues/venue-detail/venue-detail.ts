import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  LucideArrowLeft,
  LucideBuilding2,
  LucideCalendarClock,
  LucideCircleDollarSign,
  LucideClock3,
  LucideGlobe2,
  LucideHash,
  LucideMapPin,
  LucideRefreshCw,
  LucideStore,
  LucideUserRound,
  LucideWorkflow,
} from '@lucide/angular';
import { finalize } from 'rxjs';

import { Organization } from '../../../core/organizations/organization.models';
import { OrganizationsApiService } from '../../../core/organizations/organizations-api.service';
import { Venue } from '../../../core/venues/venue.models';
import { VenuesApiService } from '../../../core/venues/venues-api.service';
import { UiButtonComponent } from '../../../shared/ui/button/ui-button';
import { UiCardComponent } from '../../../shared/ui/card/ui-card';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge';

@Component({
  selector: 'app-venue-detail',
  standalone: true,
  imports: [
    DatePipe,
    LucideArrowLeft,
    LucideBuilding2,
    LucideCalendarClock,
    LucideCircleDollarSign,
    LucideClock3,
    LucideGlobe2,
    LucideHash,
    LucideMapPin,
    LucideRefreshCw,
    LucideStore,
    LucideUserRound,
    LucideWorkflow,
    RouterModule,
    StatusBadgeComponent,
    UiButtonComponent,
    UiCardComponent,
  ],
  templateUrl: './venue-detail.html',
})
export class VenueDetail {
  private readonly venuesApi = inject(VenuesApiService);
  private readonly organizationsApi = inject(OrganizationsApiService);
  private readonly route = inject(ActivatedRoute);

  readonly venue = signal<Venue | null>(null);
  readonly organizations = signal<Organization[]>([]);
  readonly loading = signal(true);
  readonly organizationLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private readonly venueId = this.route.snapshot.paramMap.get('id') ?? '';

  constructor() {
    this.loadOrganizations();
    this.loadVenue();
  }

  loadVenue(): void {
    if (!this.venueId) {
      this.loading.set(false);
      this.venue.set(null);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.venuesApi
      .getVenue(this.venueId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (venue) => this.venue.set(venue),
        error: () => {
          this.venue.set(null);
          this.errorMessage.set('Venue could not be loaded.');
        },
      });
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

  getCity(venue: Venue): string {
    return venue.city || 'Not set';
  }

  getCountry(venue: Venue): string {
    return venue.country || 'Not set';
  }

  getLocation(venue: Venue): string {
    const parts = [venue.city, venue.country].filter((part): part is string => Boolean(part));
    return parts.length ? parts.join(', ') : 'Not set';
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

  private findOrganizationName(orgId?: string): string | undefined {
    if (!orgId) {
      return undefined;
    }

    return this.organizations().find((organization) => organization.id === orgId || organization.orgId === orgId)?.name;
  }
}
