import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.initialize();
  return (
    auth.isAuthenticated() ||
    router.createUrlTree(
      ['/sign-in'],
      state.url ? { queryParams: { returnUrl: state.url } } : undefined,
    )
  );
};
