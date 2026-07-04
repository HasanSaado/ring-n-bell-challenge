import { Routes } from '@angular/router';

import { authChildGuard, authGuard, loginRedirectGuard } from './core/auth/auth.guard';
import { BranchList } from './features/branches/branch-list/branch-list';
import { ClientList } from './features/clients/client-list/client-list';
import { Dashboard } from './features/dashboard/dashboard';
import { Login } from './features/login/login';
import { OrganizationCreate } from './features/organizations/organization-create/organization-create';
import { OrganizationDetail } from './features/organizations/organization-detail/organization-detail';
import { OrganizationList } from './features/organizations/organization-list/organization-list';
import { VenueDetail } from './features/venues/venue-detail/venue-detail';
import { VenueList } from './features/venues/venue-list/venue-list';
import { AppShell } from './layout/app-shell/app-shell';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
    canActivate: [loginRedirectGuard],
  },
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    canActivateChild: [authChildGuard],
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'organizations', component: OrganizationList },
      { path: 'organizations/new', component: OrganizationCreate },
      { path: 'organizations/:id', component: OrganizationDetail },
      { path: 'branches', component: BranchList },
      { path: 'venues', component: VenueList },
      {
        path: 'venues/new',
        loadComponent: () => import('./features/venues/venue-create/venue-create').then((m) => m.VenueCreate),
      },
      { path: 'venues/:id', component: VenueDetail },
      { path: 'clients', component: ClientList },
      {
        path: 'setup',
        loadComponent: () => import('./features/setup/setup-wizard').then((m) => m.SetupWizard),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
