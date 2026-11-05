import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const customerGuard: CanMatchFn = async (_route, segments) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.config.enabled) return true;
  await auth.initialize();
  auth.refreshAccount();
  return (
    auth.authenticated() ||
    router.createUrlTree(['/login'], {
      queryParams: { returnUrl: '/' + segments.map((segment) => segment.toString()).join('/') },
    })
  );
};
