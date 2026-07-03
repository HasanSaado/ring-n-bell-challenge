import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  LucideArrowLeft,
  LucideBriefcaseBusiness,
  LucideBuilding2,
  LucideCalendarClock,
  LucideCircleDollarSign,
  LucideClock3,
  LucideGlobe2,
  LucideHash,
  LucideMail,
  LucideRefreshCw,
  LucideStore,
  LucideUserRound,
} from '@lucide/angular';
import { finalize } from 'rxjs';

import { Organization } from '../../../core/organizations/organization.models';
import { OrganizationsApiService } from '../../../core/organizations/organizations-api.service';
import { UiButtonComponent } from '../../../shared/ui/button/ui-button';
import { UiCardComponent } from '../../../shared/ui/card/ui-card';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge';

@Component({
  selector: 'app-organization-detail',
  standalone: true,
  imports: [
    DatePipe,
    LucideArrowLeft,
    LucideBriefcaseBusiness,
    LucideBuilding2,
    LucideCalendarClock,
    LucideCircleDollarSign,
    LucideClock3,
    LucideGlobe2,
    LucideHash,
    LucideMail,
    LucideRefreshCw,
    LucideStore,
    LucideUserRound,
    RouterModule,
    StatusBadgeComponent,
    UiButtonComponent,
    UiCardComponent,
  ],
  templateUrl: './organization-detail.html',
})
export class OrganizationDetail {
  private readonly organizationsApi = inject(OrganizationsApiService);
  private readonly route = inject(ActivatedRoute);

  readonly organization = signal<Organization | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  private readonly organizationId = this.route.snapshot.paramMap.get('id') ?? '';

  constructor() {
    this.loadOrganization();
  }

  loadOrganization(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.organizationsApi
      .getOrganization(this.organizationId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (organization) => this.organization.set(organization),
        error: () => this.errorMessage.set('Organization could not be loaded.'),
      });
  }
}
