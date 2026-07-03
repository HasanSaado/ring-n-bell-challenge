import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { DashboardApiService } from '../../core/dashboard/dashboard-api.service';
import { DashboardSummary } from '../../core/dashboard/dashboard.models';

interface KpiCard {
  label: string;
  value: number;
}

interface QuickLink {
  label: string;
  path: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, RouterLink],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly dashboardApi = inject(DashboardApiService);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly summary = signal<DashboardSummary | null>(null);

  readonly quickLinks: QuickLink[] = [
    { label: 'Setup', path: '/setup' },
    { label: 'Organizations', path: '/organizations' },
    { label: 'Venues', path: '/venues' },
    { label: 'Clients', path: '/clients' },
  ];

  readonly kpiCards = computed<KpiCard[]>(() => {
    const summary = this.summary();

    return [
      { label: 'Active organizations', value: summary?.cards.activeOrganizations ?? 0 },
      { label: 'Active venues', value: summary?.cards.activeVenues ?? 0 },
      { label: 'Trial venues', value: summary?.cards.trialVenues ?? 0 },
      { label: 'Renewals due soon', value: summary?.cards.renewalsDueSoon ?? 0 },
      { label: 'Offline devices', value: summary?.cards.offlineDevices ?? 0 },
    ];
  });

  constructor() {
    this.loadSummary();
  }

  loadSummary(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.dashboardApi
      .getSummary()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (summary) => this.summary.set(summary),
        error: () => this.errorMessage.set('Dashboard summary could not be loaded.'),
      });
  }

}
