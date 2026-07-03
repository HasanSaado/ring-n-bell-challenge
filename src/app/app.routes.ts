import { Routes } from '@angular/router';

import { authChildGuard, authGuard, loginRedirectGuard } from './core/auth/auth.guard';
import { Dashboard } from './features/dashboard/dashboard';
import { Login } from './features/login/login';
import { Placeholder } from './features/placeholder/placeholder';
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
      { path: 'organizations', component: Placeholder, data: { title: 'Organizations' } },
      { path: 'branches', component: Placeholder, data: { title: 'Branches' } },
      { path: 'venues', component: Placeholder, data: { title: 'Venues' } },
      { path: 'clients', component: Placeholder, data: { title: 'Clients' } },
      { path: 'setup', component: Placeholder, data: { title: 'Setup' } },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
