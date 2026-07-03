import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';
import { finalize } from 'rxjs';

import { Organization } from '../../../core/organizations/organization.models';
import { OrganizationsApiService } from '../../../core/organizations/organizations-api.service';
import { UiIconButtonComponent } from '../../../shared/ui/icon-button/ui-icon-button';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge';

@Component({
  selector: 'app-organization-detail',
  standalone: true,
  imports: [
    DatePipe,
    LucideArrowLeft,
    RouterLink,
    StatusBadgeComponent,
    UiIconButtonComponent,
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
