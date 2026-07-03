import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';

import { AuthService } from './auth.service';

function requireAuth(): true | UrlTree {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isLoggedIn() ? true : router.createUrlTree(['/login']);
}

export const authGuard: CanActivateFn = () => requireAuth();

export const authChildGuard: CanActivateChildFn = () => requireAuth();

export const loginRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isLoggedIn() ? router.createUrlTree(['/dashboard']) : true;
};
