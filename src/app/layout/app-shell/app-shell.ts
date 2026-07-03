import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideBuilding2,
  LucideChevronRight,
  LucideLayoutDashboard,
  LucideListChecks,
  LucideLogOut,
  LucidePanelLeft,
  LucideStore,
  LucideUsersRound,
  LucideWorkflow,
} from '@lucide/angular';

import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: 'dashboard' | 'organizations' | 'branches' | 'venues' | 'clients' | 'setup';
}

@Component({
  selector: 'app-shell',
  imports: [
    LucideBuilding2,
    LucideChevronRight,
    LucideLayoutDashboard,
    LucideListChecks,
    LucideLogOut,
    LucidePanelLeft,
    LucideStore,
    LucideUsersRound,
    LucideWorkflow,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './app-shell.html',
})
export class AppShell {
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Organizations', path: '/organizations', icon: 'organizations' },
    { label: 'Branches', path: '/branches', icon: 'branches' },
    { label: 'Venues', path: '/venues', icon: 'venues' },
    { label: 'Clients', path: '/clients', icon: 'clients' },
    { label: 'Setup', path: '/setup', icon: 'setup' },
  ];

  signOut(): void {
    this.authService.signOut();
    void this.router.navigate(['/login']);
  }
}
