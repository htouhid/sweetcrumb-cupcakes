import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.initialize();
  await auth.whenProfileReady();
  if (!auth.isAuthenticated()) return router.createUrlTree(['/sign-in']);
  return auth.isAdmin() || router.createUrlTree(['/']);
};
