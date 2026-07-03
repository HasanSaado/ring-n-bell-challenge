import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  label: string;
  path: string;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.html',
})
export class AppShell {
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Organizations', path: '/organizations' },
    { label: 'Branches', path: '/branches' },
    { label: 'Venues', path: '/venues' },
    { label: 'Clients', path: '/clients' },
    { label: 'Setup', path: '/setup' },
  ];

  signOut(): void {
    this.authService.signOut();
    void this.router.navigate(['/login']);
  }
}
